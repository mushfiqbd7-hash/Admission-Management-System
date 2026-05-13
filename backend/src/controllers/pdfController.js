// src/controllers/pdfController.js
import { query } from '../config/database.js';

const STATUS_LABELS = {
  draft: 'Draft',
  pending: 'Pending Review',
  approved: 'Approved',
  revoked: 'Revoked',
  processing: 'Processing',
  pre_admission: 'Pre-Admission',
  admitted: 'Admitted',
  rejected: 'Rejected',
};
const DEGREE_LABELS = {
  language: 'Language Course', diploma: 'Diploma Degree',
  bachelor: "Bachelor's Degree", master: "Master's Degree", phd: 'PhD / Doctorate',
};

// Build HTML for PDF export (rendered client-side via print or returned as HTML)
export const exportStudentPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Permission: admin/staff can export any; student/agent only their own
    const isAdminOrStaff = ['admin', 'staff'].includes(req.user.role);
    if (!isAdminOrStaff) {
      const { rows: own } = await query('SELECT created_by FROM students WHERE id=$1', [id]);
      if (!own[0] || own[0].created_by !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    const [sRes, addrRes, passRes, finRes, docsRes] = await Promise.all([
      query('SELECT * FROM students WHERE id=$1', [id]),
      query('SELECT * FROM student_addresses WHERE student_id=$1', [id]),
      query('SELECT * FROM student_passport WHERE student_id=$1', [id]),
      query('SELECT * FROM student_financial WHERE student_id=$1', [id]),
      query('SELECT * FROM student_documents WHERE student_id=$1 ORDER BY doc_key', [id]),
    ]);

    if (!sRes.rows[0]) return res.status(404).json({ error: 'Student not found' });
    const s = sRes.rows[0];
    const passport = passRes.rows[0];
    const financial = finRes.rows[0];
    const perm = addrRes.rows.find(a => a.address_type === 'permanent');

    const fmt = (v) => v || '—';
    const fmtDate = (d) => d ? new Date(d).toISOString().split('T')[0] : '—';

    const docsList = [
      { key: 'passport', label: 'Passport', required: true },
      { key: 'visa-scan', label: 'Visa Scan Copy (if in another country)', required: false },
      { key: 'highest-edu-cert', label: 'Certificate of Highest Education', required: true },
      { key: 'transcript', label: 'Transcript of Highest Education', required: true },
      { key: 'reference-letters', label: 'Two Reference Letters', required: true },
      { key: 'bank-statement', label: 'Bank Statement', required: false },
      { key: 'guarantor-id', label: 'Valid ID Card or Passport Photo Page of Financial Guarantor', required: true },
      { key: 'criminal-record', label: 'Valid Certificate of Non-criminal Record', required: false },
      { key: 'photo', label: 'Photo', required: true },
      { key: 'study-plan', label: 'Study / Research Plan', required: false },
      { key: 'resume', label: 'Resume', required: true },
      { key: 'language-proficiency', label: 'Language Proficiency', required: false },
      { key: 'extra-curricular', label: 'Extra Curricular Certificate', required: false },
    ];

    const docsMap = {};
    docsRes.rows.forEach(d => { docsMap[d.doc_key] = d; });

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Student Application – ${s.given_name} ${s.family_name}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1a1a1a; background: white; }
  .page { padding: 25mm 20mm; max-width: 210mm; margin: 0 auto; }
  .header { background: #1F3A5F; color: white; padding: 16px 20px; border-radius: 6px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
  .header h1 { font-size: 16px; font-weight: bold; }
  .header p { font-size: 10px; opacity: 0.7; margin-top: 2px; }
  .header-right { text-align: right; font-size: 10px; }
  .section { margin-bottom: 16px; border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; }
  .section-title { background: #f3f4f6; padding: 8px 12px; font-weight: bold; font-size: 11px; color: #1F3A5F; border-bottom: 1px solid #e5e7eb; }
  .section-body { padding: 10px 12px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
  .field { }
  .field label { display: block; font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .field span { display: block; font-size: 11px; color: #111; font-weight: 500; }
  .status-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 10px; font-weight: bold; }
  .status-pending { background: #fef3c7; color: #92400e; }
  .status-approved { background: #d1fae5; color: #065f46; }
  .status-rejected { background: #fee2e2; color: #991b1b; }
  .status-draft { background: #f3f4f6; color: #374151; }
  .status-revoked { background: #f3f4f6; color: #374151; }
  .status-processing { background: #dbeafe; color: #1e40af; }
  .status-pre_admission { background: #ede9fe; color: #5b21b6; }
  .status-admitted { background: #d1fae5; color: #065f46; }
  .doc-table { width: 100%; border-collapse: collapse; }
  .doc-table th { background: #f9fafb; padding: 5px 8px; text-align: left; font-size: 9px; text-transform: uppercase; color: #6b7280; border-bottom: 1px solid #e5e7eb; }
  .doc-table td { padding: 5px 8px; border-bottom: 1px solid #f3f4f6; font-size: 10px; }
  .doc-check { color: #059669; font-weight: bold; }
  .doc-missing { color: #dc2626; }
  .required-badge { background: #fee2e2; color: #dc2626; padding: 1px 5px; border-radius: 3px; font-size: 9px; }
  .footer { margin-top: 20px; padding-top: 12px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; }
  .sig-block { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .sig-line { border-top: 1px solid #374151; margin-top: 30px; padding-top: 4px; font-size: 9px; color: #6b7280; }
  @media print { body { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <div>
      <h1>Student Admission Application</h1>
      <p>Student Admission Management System</p>
    </div>
    <div class="header-right">
      <div>Passport No: <strong>${fmt(s.passport_number)}</strong></div>
      <div>Status: <strong>${STATUS_LABELS[s.application_status] || s.application_status}</strong></div>
      <div>Generated: ${fmtDate(new Date().toISOString())}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Personal Information</div>
    <div class="section-body">
      <div class="grid">
        <div class="field"><label>Full Name</label><span>${fmt(s.given_name)} ${fmt(s.family_name)}</span></div>
        <div class="field"><label>Chinese Name</label><span>${fmt(s.chinese_name)}</span></div>
        <div class="field"><label>Date of Birth</label><span>${fmtDate(s.date_of_birth)}</span></div>
        <div class="field"><label>Gender</label><span style="text-transform:capitalize">${fmt(s.gender)}</span></div>
        <div class="field"><label>Nationality</label><span>${fmt(s.nationality)}</span></div>
        <div class="field"><label>Passport Number</label><span>${fmt(s.passport_number)}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Contact Information</div>
    <div class="section-body">
      <div class="grid">
        <div class="field"><label>Email Address</label><span>${fmt(s.email)}</span></div>
        <div class="field"><label>Mobile Number</label><span>${fmt(s.mobile)}</span></div>
        <div class="field"><label>WhatsApp Number</label><span>${fmt(s.whatsapp)}</span></div>
        <div class="field"><label>WeChat ID</label><span>${fmt(s.wechat_id)}</span></div>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Application Details</div>
    <div class="section-body">
      <div class="grid">
        <div class="field"><label>Target University</label><span>${fmt(s.target_university)}</span></div>
        <div class="field"><label>Intended Major</label><span>${fmt(s.intended_major)}</span></div>
        <div class="field"><label>Scholarship Type</label><span>${fmt(s.scholarship_type)}</span></div>
        <div class="field"><label>Degree Level</label><span>${s.degree_level ? DEGREE_LABELS[s.degree_level] : '—'}</span></div>
        <div class="field"><label>Start Term</label><span>${fmt(s.intended_start_term)}</span></div>
        <div class="field"><label>Application Status</label><span><span class="status-badge status-${s.application_status}">${STATUS_LABELS[s.application_status] || s.application_status || "-"}</span></span></div>
        <div class="field"><label>Priority</label><span style="text-transform:capitalize;${s.priority==='high'?'color:#dc2626;font-weight:bold':''}">${fmt(s.priority)}</span></div>
      </div>
    </div>
  </div>

  ${perm ? `
  <div class="section">
    <div class="section-title">Permanent Address</div>
    <div class="section-body">
      <div class="grid">
        <div class="field"><label>Country</label><span>${fmt(perm.country)}</span></div>
        <div class="field"><label>City</label><span>${fmt(perm.city)}</span></div>
        <div class="field"><label>Street Address</label><span>${fmt(perm.street_address)}</span></div>
        <div class="field"><label>State / Province</label><span>${fmt(perm.state_province)}</span></div>
        <div class="field"><label>Postal Code</label><span>${fmt(perm.postal_code)}</span></div>
      </div>
    </div>
  </div>
  ` : ''}

  ${passport ? `
  <div class="section">
    <div class="section-title">Passport & Visa Information</div>
    <div class="section-body">
      <div class="grid">
        <div class="field"><label>Passport Number</label><span>${fmt(passport.passport_number)}</span></div>
        <div class="field"><label>Issuing Country</label><span>${fmt(passport.issuing_country)}</span></div>
        <div class="field"><label>Issue Date</label><span>${fmtDate(passport.issue_date)}</span></div>
        <div class="field"><label>Expiry Date</label><span>${fmtDate(passport.expiry_date)}</span></div>
        <div class="field"><label>Place of Issue</label><span>${fmt(passport.place_of_issue)}</span></div>
        <div class="field"><label>Has China Visa</label><span>${passport.has_china_visa ? 'Yes' : 'No'}</span></div>
        ${passport.has_china_visa ? `
        <div class="field"><label>Visa Type</label><span>${fmt(passport.visa_type)}</span></div>
        <div class="field"><label>Visa Number</label><span>${fmt(passport.visa_number)}</span></div>
        <div class="field"><label>Visa Issue Date</label><span>${fmtDate(passport.visa_issue_date)}</span></div>
        <div class="field"><label>Visa Expiry Date</label><span>${fmtDate(passport.visa_expiry_date)}</span></div>
        ` : ''}
      </div>
    </div>
  </div>
  ` : ''}

  ${financial ? `
  <div class="section">
    <div class="section-title">Financial Supporter Information</div>
    <div class="section-body">
      <div class="grid">
        <div class="field"><label>Supporter Name</label><span>${fmt(financial.supporter_name)}</span></div>
        <div class="field"><label>Relationship</label><span style="text-transform:capitalize">${fmt(financial.relationship)}</span></div>
        <div class="field"><label>Occupation</label><span>${fmt(financial.occupation)}</span></div>
        <div class="field"><label>Annual Income</label><span>${financial.annual_income_amount ? `${financial.annual_income_currency || 'USD'} ${Number(financial.annual_income_amount).toLocaleString()}` : '—'}</span></div>
        <div class="field"><label>Phone</label><span>${fmt(financial.phone)}</span></div>
        <div class="field"><label>Email</label><span>${fmt(financial.email)}</span></div>
        <div class="field"><label>Bank Name</label><span>${fmt(financial.bank_name)}</span></div>
        <div class="field"><label>Account Holder</label><span>${fmt(financial.account_holder_name)}</span></div>
      </div>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">Documents Checklist</div>
    <div class="section-body">
      <table class="doc-table">
        <thead><tr><th>#</th><th>Document</th><th>Required</th><th>Status</th><th>File Name</th></tr></thead>
        <tbody>
          ${docsList.map((d, i) => {
            const uploaded = docsMap[d.key];
            return `<tr>
              <td>${i + 1}</td>
              <td>${d.label}</td>
              <td>${d.required ? '<span class="required-badge">Required</span>' : 'Optional'}</td>
              <td class="${uploaded ? 'doc-check' : 'doc-missing'}">${uploaded ? '✓ Uploaded' : '✗ Missing'}</td>
              <td>${uploaded ? uploaded.file_name || '—' : '—'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
  </div>

  <div class="sig-block">
    <div>
      <div class="sig-line">Applicant Signature & Date</div>
    </div>
    <div>
      <div class="sig-line">Authorised Staff Signature & Date</div>
    </div>
  </div>

  <div class="footer">
    <span>Generated by SAMS – Student Admission Management System</span>
    <span>${new Date().toISOString()}</span>
  </div>
</div>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="application_${s.passport_number || s.id}.html"`);
    res.send(html);
  } catch (err) {
    console.error('exportStudentPDF error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
};

// Bulk export – returns list of students as HTML table
export const exportAllStudents = async (req, res) => {
  try {
    const { status, priority } = req.query;
    let whereClause = '';
    const params = [];
    if (status) { params.push(status); whereClause += ` AND s.application_status = $${params.length}`; }
    if (priority) { params.push(priority); whereClause += ` AND s.priority = $${params.length}`; }

    const { rows } = await query(`
      SELECT s.*, u.full_name as assigned_to_name
      FROM students s LEFT JOIN users u ON s.assigned_to = u.id
      WHERE true ${whereClause}
      ORDER BY s.created_at DESC
    `, params);

    const STATUS_LABELS_MAP = {
      draft: 'Draft',
      pending: 'Pending Review',
      approved: 'Approved',
      revoked: 'Revoked',
      processing: 'Processing',
      pre_admission: 'Pre-Admission',
      admitted: 'Admitted',
      rejected: 'Rejected',
    };

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>SAMS – All Students Export</title>
<style>
  body{font-family:Arial,sans-serif;font-size:10px;padding:20px;}
  h1{font-size:16px;color:#1F3A5F;margin-bottom:4px;}
  p{font-size:10px;color:#6b7280;margin-bottom:16px;}
  table{width:100%;border-collapse:collapse;}
  th{background:#1F3A5F;color:white;padding:6px 8px;text-align:left;font-size:9px;text-transform:uppercase;}
  td{padding:5px 8px;border-bottom:1px solid #e5e7eb;font-size:10px;}
  tr:nth-child(even){background:#f9fafb;}
  .badge{display:inline-block;padding:1px 6px;border-radius:10px;font-size:9px;font-weight:bold;}
  @media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact;}}
</style></head><body>
<h1>Student Records Export</h1>
<p>Generated: ${new Date().toISOString()} &nbsp;|&nbsp; Total: ${rows.length} records</p>
<table>
<thead><tr>
  <th>#</th><th>Passport No</th><th>Name</th><th>Nationality</th>
  <th>University</th><th>Degree</th><th>Status</th><th>Priority</th><th>Created</th>
</tr></thead>
<tbody>
${rows.map((s, i) => `<tr>
  <td>${i+1}</td>
  <td><strong>${s.passport_number||'—'}</strong></td>
  <td>${s.given_name} ${s.family_name}</td>
  <td>${s.nationality||'—'}</td>
  <td>${s.target_university||'—'}</td>
  <td style="text-transform:capitalize">${s.degree_level||'—'}</td>
  <td>${STATUS_LABELS_MAP[s.application_status]||s.application_status}</td>
  <td style="${s.priority==='high'?'color:#dc2626;font-weight:bold':''}">${s.priority}</td>
  <td>${new Date(s.created_at).toISOString().split('T')[0]}</td>
</tr>`).join('')}
</tbody></table>
</body></html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', 'inline; filename="students_export.html"');
    res.send(html);
  } catch (err) {
    console.error('exportAllStudents error:', err);
    res.status(500).json({ error: 'Export failed' });
  }
};
