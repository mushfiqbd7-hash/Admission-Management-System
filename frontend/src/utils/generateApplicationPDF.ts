// src/utils/generateApplicationPDF.ts
// Generates a professional PDF of a student application using jsPDF.
// No backend needed â€” runs entirely in the browser.

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DOCUMENTS_LIST } from '@/utils/constants';
import type { StudentDetail } from '@/types';
import { DEGREE_LABELS, STATUS_LABELS } from '@/types';
import { formatDate } from '@/utils/dateFormat';

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const fmt = (v: unknown): string => {
  if (v === null || v === undefined || v === '') return 'â€”';
  return String(v);
};

const fmtDate = (d: string | null | undefined): string => {
  if (!d) return 'â€”';
  return d.split('T')[0];
};

const sanitize = (s: string): string =>
  s.replace(/[/\\:*?"<>|]/g, '').replace(/\s+/g, '_').trim();

// â”€â”€ Brand colour â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const NAVY: [number, number, number] = [31, 58, 95];
const LIGHT_GRAY: [number, number, number] = [245, 246, 249];
const MID_GRAY: [number, number, number] = [156, 163, 175];
const DARK: [number, number, number] = [17, 24, 39];
const WHITE: [number, number, number] = [255, 255, 255];

// â”€â”€ Main export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export function generateApplicationPDF(data: StudentDetail): void {
  const s    = data.student;
  const p    = data.passport;
  const f    = data.financial;
  const addr = data.addresses ?? [];
  const edu  = (data.education as Array<Record<string, unknown>>) ?? [];
  const lang = (data.languages as Array<Record<string, unknown>>) ?? [];
  const work = (data.work as Array<Record<string, unknown>>) ?? [];
  const china = data.china as Record<string, unknown> | null;
  const docsMap = Object.fromEntries(
    (data.documents ?? []).map(d => [d.doc_key, d])
  );

  const permAddr = addr.find(a => a.address_type === 'permanent');
  const currAddr = addr.find(a => a.address_type === 'current');

  // â”€â”€ Filename â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const passport  = sanitize(s.passport_number || 'NoPassport');
  const name      = sanitize(`${s.given_name || ''} ${s.family_name || ''}`.trim());
  const major     = sanitize(s.intended_major || 'NoMajor');
  const filename  = `${passport}-${name}-${major}.pdf`;

  // â”€â”€ PDF setup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginL = 15;
  const marginR = 15;
  const contentW = pageW - marginL - marginR;
  let y = 0;

  // â”€â”€ Page header (drawn on every page via header hook) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addPageHeader = () => {
    // Navy bar
    doc.setFillColor(...NAVY);
    doc.rect(0, 0, pageW, 22, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Student Admission Application', marginL, 10);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Student Admission Management System', marginL, 16);
    // Right side info
    doc.setFontSize(8);
    doc.text(`Passport: ${fmt(s.passport_number)}`, pageW - marginR, 9, { align: 'right' });
    doc.text(`Status: ${STATUS_LABELS[s.application_status] ?? s.application_status}`, pageW - marginR, 14, { align: 'right' });
    doc.text(`Date: ${formatDate(new Date())}`, pageW - marginR, 19, { align: 'right' });
    // Reset text colour
    doc.setTextColor(...DARK);
  };

  // â”€â”€ Section heading helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addSection = (title: string): number => {
    // If near bottom, new page
    if (y > pageH - 40) {
      doc.addPage();
      addPageHeader();
      y = 28;
    }
    doc.setFillColor(...NAVY);
    doc.rect(marginL, y, contentW, 7, 'F');
    doc.setTextColor(...WHITE);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(title, marginL + 3, y + 5);
    doc.setTextColor(...DARK);
    y += 9;
    return y;
  };

  // â”€â”€ Two-column field row helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const col = contentW / 2 - 2;

  const addFields = (fields: [string, string][]) => {
    doc.setFontSize(8);
    for (let i = 0; i < fields.length; i += 2) {
      if (y > pageH - 20) {
        doc.addPage();
        addPageHeader();
        y = 28;
      }
      const left  = fields[i];
      const right = fields[i + 1];
      const rowH  = 9;

      // Left field
      doc.setFillColor(...LIGHT_GRAY);
      doc.rect(marginL, y, col, rowH, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...MID_GRAY);
      doc.setFontSize(7);
      doc.text(left[0].toUpperCase(), marginL + 2, y + 3.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...DARK);
      doc.setFontSize(8.5);
      doc.text(left[1], marginL + 2, y + 7.5);

      // Right field
      if (right) {
        const rx = marginL + col + 4;
        doc.setFillColor(...LIGHT_GRAY);
        doc.rect(rx, y, col, rowH, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...MID_GRAY);
        doc.setFontSize(7);
        doc.text(right[0].toUpperCase(), rx + 2, y + 3.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...DARK);
        doc.setFontSize(8.5);
        doc.text(fmt(right[1]), rx + 2, y + 7.5);
      }

      y += rowH + 1;
    }
    y += 3;
  };

  // â”€â”€ Single full-width text field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const addFullField = (label: string, value: string) => {
    if (y > pageH - 20) { doc.addPage(); addPageHeader(); y = 28; }
    doc.setFillColor(...LIGHT_GRAY);
    doc.rect(marginL, y, contentW, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...MID_GRAY);
    doc.setFontSize(7);
    doc.text(label.toUpperCase(), marginL + 2, y + 3.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    doc.setFontSize(8.5);
    doc.text(value, marginL + 2, y + 7.5);
    y += 10;
  };

  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  // BUILD PDF
  // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
  addPageHeader();
  y = 28;

  // â”€â”€ Application summary banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (s.application_number) {
    doc.setFillColor(239, 246, 255);
    doc.rect(marginL, y, contentW, 8, 'F');
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text(`Application No: ${s.application_number}`, marginL + 3, y + 5.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...DARK);
    y += 10;
  }

  // â”€â”€ 1. Personal Info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  addSection('1. Personal Information');
  addFields([
    ['Full Name',       `${fmt(s.given_name)} ${fmt(s.family_name)}`],
    ['Chinese Name',    fmt(s.chinese_name)],
    ['Date of Birth',   fmtDate(s.date_of_birth)],
    ['Gender',          s.gender ? s.gender.charAt(0).toUpperCase() + s.gender.slice(1) : 'â€”'],
    ['Nationality',     fmt(s.nationality)],
    ['Passport No.',    fmt(s.passport_number)],
    ['Email',           fmt(s.email)],
    ['Mobile',          fmt(s.mobile)],
    ['WhatsApp',        fmt(s.whatsapp)],
    ['WeChat ID',       fmt(s.wechat_id)],
  ]);

  // â”€â”€ 2. Address â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  addSection('2. Address');
  if (permAddr) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('Permanent Address', marginL, y);
    doc.setTextColor(...DARK);
    y += 4;
    addFields([
      ['Country',        fmt(permAddr.country)],
      ['City',           fmt(permAddr.city)],
      ['Street Address', fmt(permAddr.street_address)],
      ['State/Province', fmt(permAddr.state_province)],
      ['Postal Code',    fmt(permAddr.postal_code)],
      ['', ''],
    ]);
  }
  if (currAddr) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...NAVY);
    doc.text('Current Address', marginL, y);
    doc.setTextColor(...DARK);
    y += 4;
    addFields([
      ['Country',        fmt(currAddr.country)],
      ['City',           fmt(currAddr.city)],
      ['Street Address', fmt(currAddr.street_address)],
      ['State/Province', fmt(currAddr.state_province)],
      ['Postal Code',    fmt(currAddr.postal_code)],
      ['', ''],
    ]);
  }
  if (!permAddr && !currAddr) {
    doc.setFontSize(8); doc.setTextColor(...MID_GRAY);
    doc.text('No address information recorded.', marginL, y); y += 6;
    doc.setTextColor(...DARK);
  }

  // â”€â”€ 3. Passport & Visa â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  addSection('3. Passport & Visa');
  if (p) {
    addFields([
      ['Passport Number', fmt(p.passport_number)],
      ['Issuing Country', fmt(p.issuing_country)],
      ['Issue Date',      fmtDate(p.issue_date)],
      ['Expiry Date',     fmtDate(p.expiry_date)],
      ['Place of Issue',  fmt(p.place_of_issue)],
      ['Has China Visa',  p.has_china_visa ? 'Yes' : 'No'],
    ]);
    if (p.has_china_visa) {
      addFields([
        ['Visa Type',       fmt(p.visa_type)],
        ['Visa Number',     fmt(p.visa_number)],
        ['Visa Issue Date', fmtDate(p.visa_issue_date)],
        ['Visa Expiry Date',fmtDate(p.visa_expiry_date)],
      ]);
    }
  } else {
    doc.setFontSize(8); doc.setTextColor(...MID_GRAY);
    doc.text('No passport information recorded.', marginL, y); y += 6;
    doc.setTextColor(...DARK);
  }

  // â”€â”€ 4. Education â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  addSection('4. Education');
  if (edu.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR },
      head: [['Institution', 'Country', 'Degree', 'Field of Study', 'Start', 'End', 'GPA']],
      body: edu.map(e => [
        fmt(e.institution_name), fmt(e.country), fmt(e.degree_obtained),
        fmt(e.field_of_study),
        fmtDate(e.start_date as string), fmtDate(e.end_date as string),
        fmt(e.gpa),
      ]),
      headStyles: { fillColor: NAVY, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5 },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      theme: 'grid',
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  } else {
    doc.setFontSize(8); doc.setTextColor(...MID_GRAY);
    doc.text('No education records.', marginL, y); y += 6;
    doc.setTextColor(...DARK);
  }

  // â”€â”€ 5. China Experience â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  addSection('5. China Experience');
  if (china && china.has_experience) {
    addFields([
      ['Has China Experience', 'Yes'],
      ['University / Institution', fmt(china.university_name as string)],
      ['City',          fmt(china.city as string)],
      ['Program / Major', fmt(china.program_major as string)],
      ['Start Date',    fmtDate(china.start_date as string)],
      ['End Date',      fmtDate(china.end_date as string)],
    ]);
  } else {
    addFields([['Has China Experience', 'No'], ['', '']]);
  }

  // â”€â”€ 6. Financial Supporter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  addSection('6. Financial Supporter');
  if (f) {
    addFields([
      ['Supporter Name',    fmt(f.supporter_name)],
      ['Relationship',      fmt(f.relationship)],
      ['Occupation',        fmt(f.occupation)],
      ['Annual Income',     f.annual_income_amount
        ? `${f.annual_income_currency || 'USD'} ${Number(f.annual_income_amount).toLocaleString()}`
        : 'â€”'],
      ['Phone',             fmt(f.phone)],
      ['Email',             fmt(f.email)],
      ['Bank Name',         fmt(f.bank_name)],
      ['Account Holder',    fmt(f.account_holder_name)],
      ['Current Balance',   f.current_balance ? `${f.annual_income_currency || 'USD'} ${Number(f.current_balance).toLocaleString()}` : 'â€”'],
      ['', ''],
    ]);
  } else {
    doc.setFontSize(8); doc.setTextColor(...MID_GRAY);
    doc.text('No financial supporter information recorded.', marginL, y); y += 6;
    doc.setTextColor(...DARK);
  }

  // â”€â”€ 7. Language Proficiency â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  addSection('7. Language Proficiency');
  if (lang.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR },
      head: [['Language', 'Test Name', 'Score', 'Test Date']],
      body: lang.map(l => [
        fmt(l.language), fmt(l.test_name), fmt(l.score), fmtDate(l.test_date as string),
      ]),
      headStyles: { fillColor: NAVY, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5 },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      theme: 'grid',
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  } else {
    doc.setFontSize(8); doc.setTextColor(...MID_GRAY);
    doc.text('No language proficiency records.', marginL, y); y += 6;
    doc.setTextColor(...DARK);
  }

  // â”€â”€ 8. Work Experience â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  addSection('8. Work Experience');
  if (work.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: marginL, right: marginR },
      head: [['Employer', 'Position', 'Start', 'End', 'Description']],
      body: work.map(w => [
        fmt(w.employer), fmt(w.position),
        fmtDate(w.start_date as string), fmtDate(w.end_date as string),
        fmt(w.description),
      ]),
      headStyles: { fillColor: NAVY, fontSize: 7, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7.5 },
      alternateRowStyles: { fillColor: LIGHT_GRAY },
      columnStyles: { 4: { cellWidth: 55 } },
      theme: 'grid',
    });
    y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4;
  } else {
    doc.setFontSize(8); doc.setTextColor(...MID_GRAY);
    doc.text('No work experience records.', marginL, y); y += 6;
    doc.setTextColor(...DARK);
  }

  // â”€â”€ 9. Application Details â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  addSection('9. Application Details');
  addFields([
    ['Target University', fmt(s.target_university)],
    ['Intended Major',    fmt(s.intended_major)],
    ['Scholarship Type', fmt((s as unknown as {scholarship_type?:string}).scholarship_type)],
    ['Degree Level',      s.degree_level ? DEGREE_LABELS[s.degree_level] : 'â€”'],
    ['Start Term',        fmt(s.intended_start_term)],
    ['Status',            STATUS_LABELS[s.application_status] ?? s.application_status],
    ['Priority',          s.priority ? s.priority.charAt(0).toUpperCase() + s.priority.slice(1) : 'â€”'],
  ]);

  // â”€â”€ 10. Documents Checklist â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  addSection('10. Documents Checklist');
  const docRows = DOCUMENTS_LIST.map(doc => {
    const uploaded = docsMap[doc.key];
    return [
      uploaded ? 'âœ“' : '',
      doc.label,
      doc.required ? 'Required' : 'Optional',
    ];
  });

  autoTable(doc, {
    startY: y,
    margin: { left: marginL, right: marginR },
    head: [['', 'Document', 'Type']],
    body: docRows,
    headStyles: { fillColor: NAVY, fontSize: 7, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8 },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fontStyle: 'bold', textColor: [5, 150, 105] },
      1: { cellWidth: 145 },
      2: { cellWidth: 22 },
    },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    theme: 'grid',
    didParseCell: (hookData) => {
      // Bold required label in red
      if (hookData.column.index === 2 && hookData.cell.raw === 'Required') {
        hookData.cell.styles.textColor = [220, 38, 38];
        hookData.cell.styles.fontStyle = 'bold';
      }
    },
  });

  y = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // â”€â”€ Signature block â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (y > pageH - 35) { doc.addPage(); addPageHeader(); y = 28; }
  const sigY = y + 20;
  doc.setDrawColor(...MID_GRAY);
  doc.line(marginL, sigY, marginL + 70, sigY);
  doc.line(marginL + 90, sigY, marginL + 160, sigY);
  doc.setFontSize(7.5);
  doc.setTextColor(...MID_GRAY);
  doc.text('Applicant Signature & Date', marginL, sigY + 5);
  doc.text('Authorised Staff Signature & Date', marginL + 90, sigY + 5);

  // â”€â”€ Footer on every page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(...MID_GRAY);
    doc.text(
      `Generated by SAMS â€“ Student Admission Management System   |   ${formatDate(new Date())}`,
      marginL, pageH - 6
    );
    doc.text(`Page ${i} of ${totalPages}`, pageW - marginR, pageH - 6, { align: 'right' });
  }

  // â”€â”€ Save â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  doc.save(filename);
}

