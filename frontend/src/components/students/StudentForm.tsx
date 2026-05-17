// src/components/students/StudentForm.tsx — Phase 3
// ALL logic, mutations, buildPayload, handleSave, handleDocUpload, handleDeleteDoc,
// handleAddNote, handleSubmitConfirmed are 100% identical to original.
import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User, MapPin, FileText, BookOpen, Globe, Wallet,
  Languages, Briefcase, FolderCheck, ClipboardCheck,
  ChevronRight, ChevronLeft, Save, CheckCircle,
  Upload, Trash2, AlertCircle, Send, ShieldAlert, Eye,
} from 'lucide-react';
import { studentsApi, api } from '@/api/client';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';
import { FormSection, Grid2, FormField, Input, Select, Textarea } from '@/components/common/FormField';
import { ALL_COUNTRIES, ALL_CURRENCIES, DOCUMENTS_LIST } from '@/utils/constants';
import type { StudentDetail, ApplicationStatus } from '@/types';
import { STATUS_COLORS, STATUS_LABELS } from '@/types';

const SECTIONS = [
  { id:'personal',   label:'Personal Info',       icon: User          },
  { id:'address',    label:'Address',              icon: MapPin        },
  { id:'passport',   label:'Passport & Visa',      icon: FileText      },
  { id:'education',  label:'Education',            icon: BookOpen      },
  { id:'china',      label:'China Experience',     icon: Globe         },
  { id:'financial',  label:'Financial Supporter',  icon: Wallet        },
  { id:'language',   label:'Language Proficiency', icon: Languages     },
  { id:'work',       label:'Work Experience',      icon: Briefcase     },
  { id:'documents',  label:'Documents',            icon: FolderCheck   },
  { id:'review',     label:'Review & Submit',      icon: ClipboardCheck},
];

type EducationRow = {
  institution_name: string; country: string; degree_obtained: string;
  field_of_study: string; start_date: string; end_date: string;
  gpa: string; is_highest: boolean;
};
const emptyEducationRow = (isHighest = false): EducationRow => ({
  institution_name:'', country:'', degree_obtained:'', field_of_study:'',
  start_date:'', end_date:'', gpa:'', is_highest: isHighest,
});

interface Props { mode: 'create' | 'edit'; initialData?: StudentDetail; studentId?: string; }

// ── Shared radio pill component ──────────────────────────────
function RadioPill({ name, value, checked, label, onChange }: {
  name: string; value: string | boolean; checked: boolean; label: string; onChange: () => void;
}) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
        border: `2px solid ${checked ? 'var(--navy-600)' : 'var(--border-strong)'}`,
        background: checked ? 'var(--navy-600)' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s',
      }}>
        {checked && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
      </div>
      <input type="radio" name={name} style={{ display: 'none' }} onChange={onChange} />
      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{label}</span>
    </label>
  );
}

// ── Repeatable row card ──────────────────────────────────────
function RowCard({ title, onRemove, children }: { title: string; onRemove?: () => void; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy-600)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
        {onRemove && (
          <button type="button" onClick={onRemove}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 6, border: '1px solid #fecdd3', background: '#fff1f2', color: '#dc2626', fontSize: 11.5, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            <Trash2 size={12} /> Remove
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

// ── Add row button ────────────────────────────────────────────
function AddRowBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px dashed var(--navy-200)', borderRadius: 'var(--radius-md)', background: 'var(--navy-50)', color: 'var(--navy-500)', fontSize: 12.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)', transition: 'background 0.15s' }}>
      + {label}
    </button>
  );
}

export default function StudentForm({ mode, initialData, studentId }: Props) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const canManageStatus = user?.role === 'admin' || user?.role === 'staff';

  const [step, setStep] = useState(0);
  const [savedId, setSavedId] = useState<string | null>(studentId || null);

  // ── Form state (identical to original) ───────────────────
  const s = initialData?.student;
  const p = initialData?.passport;
  const f = initialData?.financial;
  const permAddr = initialData?.addresses?.find(a => a.address_type === 'permanent');
  const currAddr = initialData?.addresses?.find(a => a.address_type === 'current');

  const [personal, setPersonal] = useState({
    family_name: s?.family_name || '', given_name: s?.given_name || '',
    chinese_name: s?.chinese_name || '', date_of_birth: s?.date_of_birth?.split('T')[0] || '',
    gender: s?.gender || '', nationality: s?.nationality || '',
    email: s?.email || '', mobile: s?.mobile || '',
    whatsapp: s?.whatsapp || '', wechat_id: s?.wechat_id || '',
    target_university: s?.target_university || '', intended_major: s?.intended_major || '',
    scholarship_type: (s as unknown as { scholarship_type?: string })?.scholarship_type || '',
    degree_level: s?.degree_level || '', intended_start_term: s?.intended_start_term || '',
    priority: s?.priority || 'normal',
  });

  const [permAddress, setPermAddress] = useState({ country: permAddr?.country||'', street_address: permAddr?.street_address||'', city: permAddr?.city||'', state_province: permAddr?.state_province||'', postal_code: permAddr?.postal_code||'' });
  const [sameAddress, setSameAddress] = useState(!currAddr);
  const [currAddress, setCurrAddress] = useState({ country: currAddr?.country||'', street_address: currAddr?.street_address||'', city: currAddr?.city||'', state_province: currAddr?.state_province||'', postal_code: currAddr?.postal_code||'' });

  const [passport, setPassport] = useState({
    passport_number: p?.passport_number||s?.passport_number||'', issuing_country: p?.issuing_country||'',
    issue_date: p?.issue_date?.split('T')[0]||'', expiry_date: p?.expiry_date?.split('T')[0]||'',
    place_of_issue: p?.place_of_issue||'', has_china_visa: p?.has_china_visa||false,
    visa_type: p?.visa_type||'', visa_number: p?.visa_number||'',
    visa_issue_date: p?.visa_issue_date?.split('T')[0]||'', visa_expiry_date: p?.visa_expiry_date?.split('T')[0]||'',
  });

  const [educationRows, setEducationRows] = useState<EducationRow[]>(
    (initialData?.education as Array<Record<string,unknown>>)?.length
      ? (initialData?.education as Array<Record<string,unknown>>).map(e => ({
          institution_name: String(e.institution_name||''), country: String(e.country||''),
          degree_obtained: String(e.degree_obtained||''), field_of_study: String(e.field_of_study||''),
          start_date: e.start_date ? String(e.start_date).split('T')[0] : '',
          end_date: e.end_date ? String(e.end_date).split('T')[0] : '',
          gpa: e.gpa ? String(e.gpa) : '', is_highest: Boolean(e.is_highest),
        }))
      : [emptyEducationRow(true)]
  );

  const chinaData = initialData?.china as Record<string,unknown>|null;
  const [china, setChina] = useState({
    has_experience: (chinaData?.has_experience as boolean)||false,
    university_name: (chinaData?.university_name as string)||'',
    city: (chinaData?.city as string)||'',
    start_date: chinaData?.start_date ? (chinaData.start_date as string).split('T')[0] : '',
    end_date: chinaData?.end_date ? (chinaData.end_date as string).split('T')[0] : '',
    program_major: (chinaData?.program_major as string)||'',
  });

  const [financial, setFinancial] = useState({
    supporter_name: f?.supporter_name||'', relationship: f?.relationship||'',
    occupation: f?.occupation||'', annual_income_amount: f?.annual_income_amount||'',
    annual_income_currency: f?.annual_income_currency||'USD', phone: f?.phone||'',
    email: f?.email||'', bank_name: f?.bank_name||'',
    account_holder_name: f?.account_holder_name||'', current_balance: f?.current_balance||'',
  });

  const [langRows, setLangRows] = useState(
    (initialData?.languages as Array<Record<string,string>>)?.length
      ? initialData?.languages as Array<Record<string,string>>
      : [{ language:'', test_name:'', score:'', test_date:'' }]
  );
  const [workRows, setWorkRows] = useState(
    (initialData?.work as Array<Record<string,string>>)?.length
      ? initialData?.work as Array<Record<string,string>>
      : [{ employer:'', position:'', start_date:'', end_date:'', description:'' }]
  );

  const [uploadedDocs, setUploadedDocs] = useState<Record<string,{ id?: string; file_name:string; uploaded_at:string }>>(
    Object.fromEntries((initialData?.documents||[]).map(d => [d.doc_key, { id: d.id, file_name: d.file_name||'', uploaded_at: d.uploaded_at||'' }]))
  );
  const [uploadingKey, setUploadingKey] = useState<string|null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement|null>>({});
  const [notes, setNotes] = useState('');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [status, setStatus] = useState<ApplicationStatus>(s?.application_status || 'pending');

  // ── Mutations (identical to original) ────────────────────
  const createMutation = useMutation({
    mutationFn: (data: unknown) => studentsApi.create(data),
    onSuccess: (res) => {
      setSavedId(res.data.student.id);
      toast.success('Student record created!');
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: (err: unknown) => {
      const data = (err as { response?: { data?: { detail?: string; error?: string } } })?.response?.data;
      toast.error(data?.detail || data?.error || 'Failed to create student', { duration: 8000 });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: unknown }) => studentsApi.update(id, data),
    onSuccess: () => {
      toast.success('Student updated!');
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['student', savedId] });
    },
    onError: () => toast.error('Failed to update student'),
  });

  // ── buildPayload ──────────────────────────────────────────────────────────
  // `statusOverride` lets callers (Save Draft, Next, auto-save on close)
  // force application_status to 'draft' regardless of the role-default.
  const buildPayload = (statusOverride?: ApplicationStatus) => ({
    ...personal,
    passport_number: passport.passport_number,
    application_status: statusOverride
      ? statusOverride
      : canManageStatus ? status : 'pending',
    addresses: [
      { address_type: 'permanent', ...permAddress },
      ...(sameAddress ? [] : [{ address_type: 'current', ...currAddress }]),
    ],
    passport, china, financial,
    education: educationRows
      .filter(row => row.institution_name.trim() || row.country.trim() || row.degree_obtained.trim() || row.field_of_study.trim())
      .map(row => ({ ...row, gpa: row.gpa ? Number(row.gpa) : null })),
  });

  // Submit path: uses role-default status (pending for applicants/agents).
  const handleSave = async () => {
    const payload = buildPayload();
    if (mode === 'create' && !savedId) await createMutation.mutateAsync(payload);
    else if (savedId) await updateMutation.mutateAsync({ id: savedId, data: payload });
  };

  // Save Draft button: force application_status='draft' so the record shows
  // up in Applications as Draft regardless of who is filling the form.
  // Returns the saved id so callers can chain (e.g. document upload).
  const submittedRef = useRef(false);
  const handleSaveDraft = async (silent = false): Promise<string | null> => {
    const payload = buildPayload('draft');
    try {
      if (mode === 'create' && !savedId) {
        const res = await createMutation.mutateAsync(payload);
        return (res as { data: { student: { id: string } } }).data.student.id;
      } else if (savedId) {
        await updateMutation.mutateAsync({ id: savedId, data: payload });
        return savedId;
      }
    } catch (err) {
      if (!silent) throw err;
    }
    return savedId;
  };

  // Next button: silently persist a draft before advancing. Failure here
  // shouldn't block navigation — the user is mid-form and we don't want
  // backend validation to trap them on the current step.
  const handleNext = async () => {
    try { await handleSaveDraft(true); } catch { /* swallow — advance anyway */ }
    setStep(s => s + 1);
  };

  // ── Auto-save draft on tab close / unmount ────────────────────────────────
  // Keep a ref to the latest "build draft payload" closure so the listener
  // installed once below always sees current form state.
  const draftSnapshotRef = useRef<() => unknown>(() => buildPayload('draft'));
  useEffect(() => {
    draftSnapshotRef.current = () => buildPayload('draft');
  });

  useEffect(() => {
    const fireAutoSave = () => {
      // Skip when the form is essentially empty and never saved before — no
      // point creating an empty Draft record. Also skip after a successful
      // submission so we don't overwrite a 'pending' record with 'draft'.
      if (submittedRef.current) return;
      const hasAnyData =
        !!savedId ||
        !!personal.family_name.trim() ||
        !!personal.given_name.trim() ||
        !!personal.email.trim();
      if (!hasAnyData) return;

      const token = localStorage.getItem('accessToken');
      if (!token) return;
      const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
      const url = savedId ? `${apiBase}/students/${savedId}` : `${apiBase}/students`;
      const method = savedId ? 'PUT' : 'POST';
      try {
        // `keepalive` lets the request complete after the page unloads.
        fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(draftSnapshotRef.current()),
          keepalive: true,
          credentials: 'include',
        }).catch(() => { /* silent — best effort */ });
      } catch { /* silent */ }
    };

    const onBeforeUnload = () => fireAutoSave();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      // Also save when this component unmounts due to in-app navigation.
      fireAutoSave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Per-file cap for client-side rejection (also enforced by the backend).
  const MAX_DOC_BYTES = Math.floor(1.5 * 1024 * 1024); // 1.5 MB

  const handleDocUpload = async (docKey: string, docLabel: string, isRequired: boolean, file: File) => {
    if (file.size > MAX_DOC_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      toast.error(`File too large (${sizeMb} MB). Maximum allowed is 1.5 MB.`);
      return;
    }

    // If the record hasn't been saved yet, silently save it as a Draft first
    // so we have an id to attach the document to.
    let targetId = savedId;
    if (!targetId) {
      try {
        targetId = await handleSaveDraft(true);
      } catch {
        toast.error('Could not save draft before upload. Please try again.');
        return;
      }
      if (!targetId) {
        toast.error('Could not save draft before upload. Fill at least Name and Email, then retry.');
        return;
      }
    }

    setUploadingKey(docKey);
    try {
      const fd = new FormData();
      fd.append('file', file); fd.append('doc_key', docKey);
      fd.append('doc_label', docLabel); fd.append('is_required', String(isRequired));
      const res = await api.post(`/students/${targetId}/documents`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      const uploaded = res.data.document;
      setUploadedDocs(prev => ({ ...prev, [docKey]: { id: uploaded.id, file_name: uploaded.file_name || file.name, uploaded_at: uploaded.uploaded_at || new Date().toISOString() } }));
      toast.success(`${docLabel} uploaded`);
    } catch { toast.error('Upload failed'); } finally { setUploadingKey(null); }
  };

  const handleViewDoc = async (docKey: string) => {
    if (!savedId) return;

    const viewer = window.open('', '_blank', 'noopener,noreferrer');
    if (viewer) {
      viewer.document.title = 'Loading document...';
      viewer.document.body.innerHTML = '<p style="font-family: system-ui, sans-serif; padding: 24px;">Loading document...</p>';
    }

    try {
      let docId = uploadedDocs[docKey]?.id;

      if (!docId) {
        const docsRes = await api.get(`/students/${savedId}/documents`);
        const doc = docsRes.data.documents.find((d: { doc_key: string; id: string }) => d.doc_key === docKey);
        docId = doc?.id;
        if (doc) {
          setUploadedDocs(prev => ({ ...prev, [docKey]: { ...prev[docKey], id: doc.id } }));
        }
      }

      if (!docId) {
        toast.error('Document is not available to view yet');
        return;
      }

      const res = await api.get(`/students/${savedId}/documents/${docId}/file`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(res.data);
      if (viewer) {
        viewer.location.href = url;
      } else {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000);
    } catch {
      if (viewer) viewer.close();
      toast.error('Could not open document');
    }
  };

  const handleDeleteDoc = async (docKey: string) => {
    if (!savedId) return;
    try {
      const docsRes = await api.get(`/students/${savedId}/documents`);
      const doc = docsRes.data.documents.find((d: { doc_key: string; id: string }) => d.doc_key === docKey);
      if (doc) {
        await api.delete(`/students/${savedId}/documents/${doc.id}`);
        setUploadedDocs(prev => { const n = { ...prev }; delete n[docKey]; return n; });
        toast.success('Document removed');
      }
    } catch { toast.error('Failed to remove document'); }
  };

  const handleAddNote = async () => {
    if (!notes.trim() || !savedId) return;
    try { await studentsApi.addNote(savedId, notes); toast.success('Note added'); setNotes(''); }
    catch { toast.error('Failed to add note'); }
  };

  const handleFinish = () => setShowSubmitModal(true);
  const handleSubmitConfirmed = async () => {
    setShowSubmitModal(false);
    await handleSave();
    submittedRef.current = true; // prevent auto-save from overwriting on unmount
    navigate('/students');
  };

  const P = (k: keyof typeof personal) => ({
    value: personal[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement>) =>
      setPersonal(prev => ({ ...prev, [k]: e.target.value })),
  });

  const isMutating = createMutation.isPending || updateMutation.isPending;

  // ── Section rendering ─────────────────────────────────────
  const renderSection = () => {
    switch (SECTIONS[step].id) {

      case 'personal': return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormSection title="Basic Information">
            <Grid2>
              <FormField label="Family Name" required><Input placeholder="Family / Last name" {...P('family_name')} /></FormField>
              <FormField label="Given Name" required><Input placeholder="Given / First name" {...P('given_name')} /></FormField>
              <FormField label="Chinese Name"><Input placeholder="中文姓名" {...P('chinese_name')} /></FormField>
              <FormField label="Date of Birth" required><Input type="date" {...P('date_of_birth')} /></FormField>
              <FormField label="Gender" required>
                <div style={{ display: 'flex', gap: 20, paddingTop: 6 }}>
                  <RadioPill name="gender" value="male"   checked={personal.gender==='male'}   label="Male"   onChange={() => setPersonal(p => ({...p, gender:'male'}))} />
                  <RadioPill name="gender" value="female" checked={personal.gender==='female'} label="Female" onChange={() => setPersonal(p => ({...p, gender:'female'}))} />
                </div>
              </FormField>
              <FormField label="Nationality" required><Input placeholder="e.g. Pakistani" {...P('nationality')} /></FormField>
            </Grid2>
          </FormSection>
          <FormSection title="Contact Information">
            <Grid2>
              <FormField label="Email Address" required><Input type="email" placeholder="student@example.com" {...P('email')} /></FormField>
              <FormField label="Mobile Number" required><Input type="tel" placeholder="+92 300 1234567" {...P('mobile')} /></FormField>
              <FormField label="WhatsApp"><Input type="tel" placeholder="+92 300 1234567" {...P('whatsapp')} /></FormField>
              <FormField label="WeChat ID"><Input placeholder="WeChat ID" {...P('wechat_id')} /></FormField>
            </Grid2>
          </FormSection>
          <FormSection title="Application Details">
            <Grid2>
              <FormField label="Target University" required><Input placeholder="University name" {...P('target_university')} /></FormField>
              <FormField label="Intended Major"><Input placeholder="e.g. Computer Science" {...P('intended_major')} /></FormField>
              <FormField label="Scholarship Type"><Input placeholder="e.g. CSC, University Scholarship" {...P('scholarship_type')} /></FormField>
              <FormField label="Degree Level" required>
                <Select {...P('degree_level')}>
                  <option value="">Select degree</option>
                  <option value="language">Language Course</option>
                  <option value="diploma">Diploma</option>
                  <option value="bachelor">Bachelor's</option>
                  <option value="master">Master's</option>
                  <option value="phd">PhD / Doctorate</option>
                </Select>
              </FormField>
              <FormField label="Intended Start Term">
                <Select {...P('intended_start_term')}>
                  <option value="">Select term</option>
                  <option value="March">March</option>
                  <option value="September">September</option>
                </Select>
              </FormField>
              <FormField label="Priority">
                <Select {...P('priority')}>
                  <option value="normal">Normal</option>
                  <option value="high">High</option>
                </Select>
              </FormField>
            </Grid2>
          </FormSection>
        </div>
      );

      case 'address': return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormSection title="Permanent Address">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <FormField label="Country" required>
                <Select value={permAddress.country} onChange={e => setPermAddress(p => ({...p, country: e.target.value}))}>
                  <option value="">Select country</option>
                  {ALL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </FormField>
              <FormField label="Street Address" required>
                <Textarea rows={2} placeholder="Full street address" value={permAddress.street_address} onChange={e => setPermAddress(p => ({...p, street_address: e.target.value}))} />
              </FormField>
              <Grid2>
                <FormField label="City" required><Input placeholder="City" value={permAddress.city} onChange={e => setPermAddress(p => ({...p, city: e.target.value}))} /></FormField>
                <FormField label="State / Province"><Input placeholder="State" value={permAddress.state_province} onChange={e => setPermAddress(p => ({...p, state_province: e.target.value}))} /></FormField>
                <FormField label="Postal Code"><Input placeholder="Postal code" value={permAddress.postal_code} onChange={e => setPermAddress(p => ({...p, postal_code: e.target.value}))} /></FormField>
              </Grid2>
            </div>
          </FormSection>
          <FormSection title="Current / Mailing Address">
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 14 }}>
              <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${sameAddress ? 'var(--navy-600)' : 'var(--border-strong)'}`, background: sameAddress ? 'var(--navy-600)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
                onClick={() => setSameAddress(v => !v)}>
                {sameAddress && <CheckCircle size={10} color="#fff" />}
              </div>
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Same as permanent address</span>
            </label>
            {!sameAddress && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <FormField label="Country" required>
                  <Select value={currAddress.country} onChange={e => setCurrAddress(p => ({...p, country: e.target.value}))}>
                    <option value="">Select country</option>
                    {ALL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </FormField>
                <FormField label="Street Address" required>
                  <Textarea rows={2} placeholder="Full street address" value={currAddress.street_address} onChange={e => setCurrAddress(p => ({...p, street_address: e.target.value}))} />
                </FormField>
                <Grid2>
                  <FormField label="City" required><Input placeholder="City" value={currAddress.city} onChange={e => setCurrAddress(p => ({...p, city: e.target.value}))} /></FormField>
                  <FormField label="Postal Code"><Input placeholder="Postal code" value={currAddress.postal_code} onChange={e => setCurrAddress(p => ({...p, postal_code: e.target.value}))} /></FormField>
                </Grid2>
              </div>
            )}
          </FormSection>
        </div>
      );

      case 'passport': return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormSection title="Passport Information">
            <Grid2>
              <FormField label="Passport Number" required><Input placeholder="e.g. AB1234567" value={passport.passport_number} onChange={e => setPassport(p => ({...p, passport_number: e.target.value}))} /></FormField>
              <FormField label="Issuing Country" required>
                <Select value={passport.issuing_country} onChange={e => setPassport(p => ({...p, issuing_country: e.target.value}))}>
                  <option value="">Select country</option>
                  {ALL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                </Select>
              </FormField>
              <FormField label="Issue Date" required><Input type="date" value={passport.issue_date} onChange={e => setPassport(p => ({...p, issue_date: e.target.value}))} /></FormField>
              <FormField label="Expiry Date" required><Input type="date" value={passport.expiry_date} onChange={e => setPassport(p => ({...p, expiry_date: e.target.value}))} /></FormField>
              <FormField label="Place of Issue"><Input placeholder="City, Country" value={passport.place_of_issue} onChange={e => setPassport(p => ({...p, place_of_issue: e.target.value}))} /></FormField>
            </Grid2>
          </FormSection>
          <FormSection title="China Visa">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <FormField label="Do you currently have a China visa?" required>
                <div style={{ display: 'flex', gap: 20, paddingTop: 4 }}>
                  <RadioPill name="hasVisa" value="yes" checked={passport.has_china_visa === true}  label="Yes" onChange={() => setPassport(p => ({...p, has_china_visa: true}))} />
                  <RadioPill name="hasVisa" value="no"  checked={passport.has_china_visa === false} label="No"  onChange={() => setPassport(p => ({...p, has_china_visa: false}))} />
                </div>
              </FormField>
              {passport.has_china_visa && (
                <div style={{ paddingLeft: 14, borderLeft: '3px solid var(--navy-100)' }}>
                  <Grid2>
                    <FormField label="Visa Type" required>
                      <Select value={passport.visa_type} onChange={e => setPassport(p => ({...p, visa_type: e.target.value}))}>
                        <option value="">Select type</option>
                        <option value="X1">X1 – Long-term Study</option>
                        <option value="X2">X2 – Short-term Study</option>
                        <option value="F">F – Non-commercial Visit</option>
                        <option value="M">M – Business</option>
                        <option value="Tourist">Tourist</option>
                      </Select>
                    </FormField>
                    <FormField label="Visa Number" required><Input placeholder="Visa number" value={passport.visa_number} onChange={e => setPassport(p => ({...p, visa_number: e.target.value}))} /></FormField>
                    <FormField label="Issue Date" required><Input type="date" value={passport.visa_issue_date} onChange={e => setPassport(p => ({...p, visa_issue_date: e.target.value}))} /></FormField>
                    <FormField label="Expiry Date" required><Input type="date" value={passport.visa_expiry_date} onChange={e => setPassport(p => ({...p, visa_expiry_date: e.target.value}))} /></FormField>
                  </Grid2>
                </div>
              )}
            </div>
          </FormSection>
        </div>
      );

      case 'education': return (
        <FormSection title="Education Background">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <p style={{ fontSize: 12.5, color: 'var(--text-tertiary)', margin: 0 }}>
              Enter highest and any previous education. List the most recent first.
            </p>
            {educationRows.map((row, i) => (
              <RowCard key={i} title={`Education Experience #${i + 1}`}
                onRemove={educationRows.length > 1 ? () => setEducationRows(r => r.filter((_,j) => j !== i)) : undefined}>
                <Grid2>
                  <FormField label="Institution Name" required><Input placeholder="University / School" value={row.institution_name} onChange={e => setEducationRows(r => r.map((x,j) => j===i ? {...x, institution_name: e.target.value} : x))} /></FormField>
                  <FormField label="Country">
                    <Select value={row.country} onChange={e => setEducationRows(r => r.map((x,j) => j===i ? {...x, country: e.target.value} : x))}>
                      <option value="">Select country</option>
                      {ALL_COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                  </FormField>
                  <FormField label="Degree Obtained"><Input placeholder="e.g. Bachelor of Science" value={row.degree_obtained} onChange={e => setEducationRows(r => r.map((x,j) => j===i ? {...x, degree_obtained: e.target.value} : x))} /></FormField>
                  <FormField label="Field of Study"><Input placeholder="e.g. Computer Science" value={row.field_of_study} onChange={e => setEducationRows(r => r.map((x,j) => j===i ? {...x, field_of_study: e.target.value} : x))} /></FormField>
                  <FormField label="Start Date"><Input type="date" value={row.start_date} onChange={e => setEducationRows(r => r.map((x,j) => j===i ? {...x, start_date: e.target.value} : x))} /></FormField>
                  <FormField label="End Date"><Input type="date" value={row.end_date} onChange={e => setEducationRows(r => r.map((x,j) => j===i ? {...x, end_date: e.target.value} : x))} /></FormField>
                  <FormField label="GPA / Grade"><Input type="number" step="0.01" placeholder="e.g. 3.80" value={row.gpa} onChange={e => setEducationRows(r => r.map((x,j) => j===i ? {...x, gpa: e.target.value} : x))} /></FormField>
                  <FormField label="Highest Education">
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', paddingTop: 6 }}>
                      <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${row.is_highest ? 'var(--navy-600)' : 'var(--border-strong)'}`, background: row.is_highest ? 'var(--navy-600)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s', cursor: 'pointer' }}
                        onClick={() => setEducationRows(r => r.map((x,j) => ({...x, is_highest: j===i ? !x.is_highest : false})))}>
                        {row.is_highest && <CheckCircle size={10} color="#fff" />}
                      </div>
                      <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>Mark as highest</span>
                    </label>
                  </FormField>
                </Grid2>
              </RowCard>
            ))}
            <AddRowBtn label="Add Education Experience" onClick={() => setEducationRows(r => [...r, emptyEducationRow(false)])} />
          </div>
        </FormSection>
      );

      case 'china': return (
        <FormSection title="Previous China Study Experience">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <FormField label="Have you previously studied in China?" required>
              <div style={{ display: 'flex', gap: 20, paddingTop: 4 }}>
                <RadioPill name="chinaExp" value="yes" checked={china.has_experience === true}  label="Yes" onChange={() => setChina(p => ({...p, has_experience: true}))} />
                <RadioPill name="chinaExp" value="no"  checked={china.has_experience === false} label="No"  onChange={() => setChina(p => ({...p, has_experience: false}))} />
              </div>
            </FormField>
            {china.has_experience && (
              <div style={{ paddingLeft: 14, borderLeft: '3px solid var(--navy-100)' }}>
                <Grid2>
                  <FormField label="University Name" required><Input placeholder="University name" value={china.university_name} onChange={e => setChina(p => ({...p, university_name: e.target.value}))} /></FormField>
                  <FormField label="City" required><Input placeholder="City in China" value={china.city} onChange={e => setChina(p => ({...p, city: e.target.value}))} /></FormField>
                  <FormField label="Start Date" required><Input type="date" value={china.start_date} onChange={e => setChina(p => ({...p, start_date: e.target.value}))} /></FormField>
                  <FormField label="End Date" required><Input type="date" value={china.end_date} onChange={e => setChina(p => ({...p, end_date: e.target.value}))} /></FormField>
                  <FormField label="Program / Major"><Input placeholder="e.g. Chinese Language" value={china.program_major} onChange={e => setChina(p => ({...p, program_major: e.target.value}))} /></FormField>
                </Grid2>
              </div>
            )}
          </div>
        </FormSection>
      );

      case 'financial': return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormSection title="Financial Supporter">
            <Grid2>
              <FormField label="Supporter Name" required><Input placeholder="Full name" value={financial.supporter_name} onChange={e => setFinancial(p=>({...p,supporter_name:e.target.value}))} /></FormField>
              <FormField label="Relationship" required>
                <Select value={financial.relationship} onChange={e => setFinancial(p=>({...p,relationship:e.target.value}))}>
                  <option value="">Select</option>
                  <option value="father">Father</option><option value="mother">Mother</option>
                  <option value="guardian">Legal Guardian</option><option value="self">Self</option><option value="other">Other</option>
                </Select>
              </FormField>
              <FormField label="Occupation" required><Input placeholder="Current occupation" value={financial.occupation} onChange={e => setFinancial(p=>({...p,occupation:e.target.value}))} /></FormField>
              <FormField label="Annual Income" required>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Select style={{ width: 130 }} value={financial.annual_income_currency} onChange={e => setFinancial(p=>({...p,annual_income_currency:e.target.value}))}>
                    {ALL_CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} – {c.name}</option>)}
                  </Select>
                  <Input type="number" placeholder="Amount" value={String(financial.annual_income_amount)} onChange={e => setFinancial(p=>({...p,annual_income_amount:e.target.value}))} />
                </div>
              </FormField>
              <FormField label="Phone" required><Input placeholder="+1 234 567 8900" value={financial.phone} onChange={e => setFinancial(p=>({...p,phone:e.target.value}))} /></FormField>
              <FormField label="Email" required><Input type="email" placeholder="supporter@example.com" value={financial.email} onChange={e => setFinancial(p=>({...p,email:e.target.value}))} /></FormField>
            </Grid2>
          </FormSection>
          <FormSection title="Bank Account">
            <Grid2>
              <FormField label="Bank Name"><Input placeholder="Bank name" value={financial.bank_name} onChange={e => setFinancial(p=>({...p,bank_name:e.target.value}))} /></FormField>
              <FormField label="Account Holder"><Input placeholder="Account holder name" value={financial.account_holder_name} onChange={e => setFinancial(p=>({...p,account_holder_name:e.target.value}))} /></FormField>
              <FormField label="Current Balance"><Input type="number" placeholder="Approximate balance" value={String(financial.current_balance)} onChange={e => setFinancial(p=>({...p,current_balance:e.target.value}))} /></FormField>
            </Grid2>
          </FormSection>
        </div>
      );

      case 'language': return (
        <FormSection title="Language Proficiency">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {langRows.map((row, i) => (
              <RowCard key={i} title={`Language #${i+1}`}
                onRemove={langRows.length > 1 ? () => setLangRows(r => r.filter((_,j) => j!==i)) : undefined}>
                <Grid2>
                  <FormField label="Language"><Input placeholder="e.g. English, Chinese" value={row.language} onChange={e => setLangRows(r => r.map((x,j) => j===i ? {...x, language: e.target.value} : x))} /></FormField>
                  <FormField label="Test Name"><Input placeholder="e.g. IELTS, HSK, TOEFL" value={row.test_name} onChange={e => setLangRows(r => r.map((x,j) => j===i ? {...x, test_name: e.target.value} : x))} /></FormField>
                  <FormField label="Score / Band"><Input placeholder="e.g. 7.0" value={row.score} onChange={e => setLangRows(r => r.map((x,j) => j===i ? {...x, score: e.target.value} : x))} /></FormField>
                  <FormField label="Test Date"><Input type="date" value={row.test_date} onChange={e => setLangRows(r => r.map((x,j) => j===i ? {...x, test_date: e.target.value} : x))} /></FormField>
                </Grid2>
              </RowCard>
            ))}
            <AddRowBtn label="Add Language" onClick={() => setLangRows(r => [...r, {language:'',test_name:'',score:'',test_date:''}])} />
          </div>
        </FormSection>
      );

      case 'work': return (
        <FormSection title="Work Experience">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {workRows.map((row, i) => (
              <RowCard key={i} title={`Experience #${i+1}`}
                onRemove={workRows.length > 1 ? () => setWorkRows(r => r.filter((_,j) => j!==i)) : undefined}>
                <Grid2>
                  <FormField label="Employer"><Input placeholder="Company / Organisation" value={row.employer} onChange={e => setWorkRows(r => r.map((x,j) => j===i ? {...x, employer: e.target.value} : x))} /></FormField>
                  <FormField label="Position"><Input placeholder="Job title" value={row.position} onChange={e => setWorkRows(r => r.map((x,j) => j===i ? {...x, position: e.target.value} : x))} /></FormField>
                  <FormField label="Start Date"><Input type="date" value={row.start_date} onChange={e => setWorkRows(r => r.map((x,j) => j===i ? {...x, start_date: e.target.value} : x))} /></FormField>
                  <FormField label="End Date"><Input type="date" value={row.end_date} onChange={e => setWorkRows(r => r.map((x,j) => j===i ? {...x, end_date: e.target.value} : x))} /></FormField>
                </Grid2>
                <div style={{ marginTop: 10 }}>
                  <FormField label="Description"><Textarea rows={2} placeholder="Brief role description" value={row.description} onChange={e => setWorkRows(r => r.map((x,j) => j===i ? {...x, description: e.target.value} : x))} /></FormField>
                </div>
              </RowCard>
            ))}
            <AddRowBtn label="Add Experience" onClick={() => setWorkRows(r => [...r, {employer:'',position:'',start_date:'',end_date:'',description:''}])} />
          </div>
        </FormSection>
      );

      case 'documents': return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 'var(--radius-md)', padding: '12px 16px' }}>
            <AlertCircle size={15} style={{ color: '#1d4ed8', flexShrink: 0, marginTop: 1 }} />
            <p style={{ margin: 0, fontSize: 12.5, color: '#1e40af' }}>
              <strong>Maximum file size:</strong> 1.5 MB per document. Accepted formats: PDF, JPG, PNG, DOC, DOCX.
            </p>
          </div>
          <FormSection title={`Documents Checklist — ${Object.keys(uploadedDocs).length}/${DOCUMENTS_LIST.length} uploaded`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {DOCUMENTS_LIST.map((doc, idx) => {
                const uploaded = uploadedDocs[doc.key];
                const isUp = uploadingKey === doc.key;
                return (
                  <div key={doc.key} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 8, border: `1px solid ${uploaded ? '#86efac' : 'var(--border)'}`,
                    background: uploaded ? '#f0fdf4' : 'var(--surface)',
                    transition: 'background 0.15s',
                  }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: uploaded ? '#16a34a' : 'var(--gray-100)', border: `1px solid ${uploaded ? '#16a34a' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {uploaded && <CheckCircle size={11} color="#fff" />}
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', width: 22, textAlign: 'right', flexShrink: 0 }}>{idx+1}.</span>
                    <span style={{ flex: 1, fontSize: 13, color: uploaded ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: uploaded ? 500 : 400 }}>
                      {doc.label}
                      {doc.required && <span style={{ marginLeft: 6, fontSize: 10.5, color: '#dc2626', fontWeight: 600 }}>Required</span>}
                    </span>
                    {uploaded && <span style={{ fontSize: 11.5, color: '#16a34a', maxWidth: 130, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uploaded.file_name}</span>}
                    <input type="file" style={{ display: 'none' }} ref={el => { fileRefs.current[doc.key] = el; }}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      onChange={e => { const file = e.target.files?.[0]; if (file) handleDocUpload(doc.key, doc.label, doc.required, file); e.target.value = ''; }} />
                    <button disabled={isUp}
                      onClick={() => fileRefs.current[doc.key]?.click()}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)', border: '1px solid', opacity: isUp ? 0.5 : 1, transition: 'all 0.15s', background: uploaded ? '#dcfce7' : 'var(--navy-600)', color: uploaded ? '#15803d' : '#fff', borderColor: uploaded ? '#86efac' : 'var(--navy-600)' }}>
                      {isUp ? <span style={{ width: 11, height: 11, border: '2px solid currentColor', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', display: 'inline-block' }} /> : <Upload size={11} />}
                      {uploaded ? 'Replace' : 'Upload'}
                    </button>
                    {uploaded && (
                      <button type="button" onClick={() => handleViewDoc(doc.key)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#1d4ed8', fontSize: 11.5, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)', flexShrink: 0 }}>
                        <Eye size={11} />
                        View
                      </button>
                    )}
                    {uploaded && (
                      <button onClick={() => handleDeleteDoc(doc.key)}
                        style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #fecdd3', background: '#fff1f2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </FormSection>
        </div>
      );

      case 'review': return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <FormSection title="Application Summary">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 18 }}>
              {[
                { label: 'Passport No.', value: passport.passport_number || '—', mono: true },
                { label: 'Student Name', value: `${personal.given_name} ${personal.family_name}`.trim() || '—' },
                { label: 'University',   value: personal.target_university || '—' },
              ].map(({ label, value, mono }) => (
                <div key={label} style={{ background: 'var(--surface-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginBottom: 5, fontWeight: 500 }}>{label}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--navy-600)', fontFamily: mono ? 'var(--font-mono)' : undefined }}>{value}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Email', personal.email], ['Mobile', personal.mobile],
                ['Nationality', personal.nationality], ['Degree Level', personal.degree_level],
                ['Scholarship Type', personal.scholarship_type], ['Start Term', personal.intended_start_term],
                ['Documents', `${Object.keys(uploadedDocs).length} / ${DOCUMENTS_LIST.length} uploaded`],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                  <span style={{ width: 140, color: 'var(--text-tertiary)', flexShrink: 0, fontWeight: 500 }}>{l}:</span>
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{v || '—'}</span>
                </div>
              ))}
            </div>
          </FormSection>

          <FormSection title="Application Status">
            {canManageStatus ? (
              <FormField label="Set Status" required>
                <Select value={status} onChange={e => setStatus(e.target.value as ApplicationStatus)}>
                  <option value="draft">Draft</option><option value="pending">Pending</option>
                  <option value="approved">Approved</option><option value="revoked">Revoked</option>
                  <option value="processing">Processing</option><option value="pre_admission">Pre Admission</option>
                  <option value="admitted">Admitted</option><option value="rejected">Rejected</option>
                </Select>
              </FormField>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0' }}>
                <span style={{ fontSize: 12.5, color: 'var(--text-tertiary)', width: 120, flexShrink: 0 }}>Current Status:</span>
                <span className={STATUS_COLORS[status as keyof typeof STATUS_COLORS] || 'badge badge-draft'}>
                  {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
                </span>
              </div>
            )}
          </FormSection>

          {canManageStatus && (
            <FormSection title="Application Notes">
              <Textarea rows={4} placeholder="Add a note (visible to all roles)…" value={notes} onChange={e => setNotes(e.target.value)} />
              {savedId && (
                <button onClick={handleAddNote} className="btn-ghost" style={{ marginTop: 10, fontSize: 12.5 }}>
                  Add Note
                </button>
              )}
            </FormSection>
          )}
        </div>
      );

      default: return null;
    }
  };

  return (
    <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>

      {/* ── Step sidebar ──────────────────────────────────── */}
      <div style={{ width: 196, background: 'var(--surface)', borderRight: '1px solid var(--border)', flexShrink: 0, overflowY: 'auto', padding: '14px 10px' }}>
        <p style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10, padding: '0 6px' }}>
          Sections
        </p>
        {SECTIONS.map((sec, i) => {
          const Icon = sec.icon;
          const isActive = i === step;
          const isDone = savedId && i < step;
          return (
            <button key={sec.id} onClick={() => setStep(i)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
                borderRadius: 7, border: 'none', cursor: 'pointer', marginBottom: 2, textAlign: 'left',
                fontFamily: 'var(--font-ui)', fontSize: 12.5, fontWeight: isActive ? 600 : 400,
                background: isActive ? 'var(--navy-600)' : 'transparent',
                color: isActive ? '#fff' : isDone ? 'var(--text-secondary)' : 'var(--text-tertiary)',
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--surface-sunken)'; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              {isDone
                ? <CheckCircle size={14} style={{ flexShrink: 0, color: '#16a34a' }} />
                : <Icon size={14} style={{ flexShrink: 0 }} />
              }
              <span>{sec.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Main area ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Section header */}
        <div style={{ padding: '16px 24px 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            {(() => { const Icon = SECTIONS[step].icon; return <Icon size={16} style={{ color: 'var(--navy-500)' }} />; })()}
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>
              {SECTIONS[step].label}
            </h2>
          </div>
          <p style={{ margin: '0 0 16px 26px', fontSize: 12, color: 'var(--text-tertiary)' }}>
            Step {step + 1} of {SECTIONS.length}
          </p>
        </div>

        {/* Scrollable form body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 24px 24px' }}>
          {renderSection()}
        </div>

        {/* Nav bar */}
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--surface)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <button disabled={step === 0} onClick={() => setStep(s => s - 1)} className="btn-ghost" style={{ gap: 6 }}>
            <ChevronLeft size={14} /> Previous
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={() => { handleSaveDraft().catch(() => {}); }} disabled={isMutating} className="btn-ghost" style={{ gap: 6 }}>
              <Save size={13} />
              {isMutating ? 'Saving…' : 'Save Draft'}
            </button>
            {step < SECTIONS.length - 1 ? (
              <button onClick={handleNext} disabled={isMutating} className="btn-primary" style={{ gap: 6 }}>
                Next <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={handleFinish} disabled={isMutating}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)', opacity: isMutating ? 0.6 : 1, transition: 'background 0.15s' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#15803d'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#16a34a'; }}>
                <Send size={13} />
                {isMutating ? 'Submitting…' : 'Submit Application'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Submit modal (identical logic) ────────────────── */}
      {showSubmitModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: 440, padding: '28px 28px 24px', boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>
              <div style={{ width: 54, height: 54, borderRadius: '50%', background: '#fef9ec', border: '2px solid #f5d98a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ShieldAlert size={26} style={{ color: '#d97706' }} />
              </div>
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'center' }}>Submit Application?</h3>
            <p style={{ margin: '0 0 18px', fontSize: 12.5, color: 'var(--text-tertiary)', textAlign: 'center' }}>Please review the following before submitting</p>

            <div style={{ background: '#fef9ec', border: '1px solid #f5d98a', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                'Once submitted, you cannot edit this application unless it is returned with a "Revoked" status.',
                'Ensure all required documents are uploaded and all information is accurate.',
                'Your application will be reviewed by the admissions team. You will be notified of status updates.',
              ].map((txt, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlertCircle size={13} style={{ color: '#d97706', flexShrink: 0, marginTop: 1 }} />
                  <p style={{ margin: 0, fontSize: 12, color: '#92620a', lineHeight: 1.5 }}>{txt}</p>
                </div>
              ))}
            </div>

            <p style={{ margin: '0 0 20px', fontSize: 12.5, color: 'var(--text-secondary)', textAlign: 'center', lineHeight: 1.6 }}>
              By clicking <strong>Confirm & Submit</strong>, you confirm all information is true, accurate, and complete.
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn-ghost" style={{ flex: 1 }} onClick={() => setShowSubmitModal(false)}>
                Go Back
              </button>
              <button onClick={handleSubmitConfirmed} disabled={isMutating}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 14px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-ui)', opacity: isMutating ? 0.6 : 1 }}>
                <Send size={13} />
                {isMutating ? 'Submitting…' : 'Confirm & Submit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
