// src/components/students/StudentDetailPage.tsx
import { useState, type ReactNode } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Pencil,
  Printer,
  Download,
  Eye,
  CheckCircle,
  AlertCircle,
  FileText,
  MessageSquare,
  Send,
  FolderOpen,
  User,
  Phone,
  GraduationCap,
  BookOpen,
  Globe,
  Briefcase,
  Wallet,
  MapPin,
} from 'lucide-react';
import { studentsApi, api } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { STATUS_LABELS, STATUS_COLORS, DEGREE_LABELS } from '@/types';
import type { StudentDetail, ApplicationStatus } from '@/types';
import { toast } from 'sonner';
import { DOCUMENTS_LIST } from '@/utils/constants';
import { formatDate, formatDateOrNull, formatDateTime } from '@/utils/dateFormat';
import { generateApplicationPDF } from '@/utils/generateApplicationPDF';

function calcAge(dob?: string | null): number | null {
  if (!dob) return null;

  const birth = new Date(dob);
  if (isNaN(birth.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();

  if (
    today.getMonth() < birth.getMonth() ||
    (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return age;
}

function fmt(v: unknown) {
  return v !== null && v !== undefined && v !== '' ? String(v) : null;
}

function fmtDate(v: unknown) {
  return formatDateOrNull(v);
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="grid grid-cols-[160px_1fr] gap-4 border-b border-[var(--border)] py-2 last:border-0">
      <div className="text-[12px] font-medium text-[var(--text-tertiary)]">{label}</div>
      <div
        className={`text-[13px] font-semibold ${
          value ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
        } ${mono ? 'font-mono' : ''}`}
      >
        {value || '-'}
      </div>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: any;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--sh-card)]">
      <div className="flex items-center gap-2 border-b border-[var(--border)] bg-[var(--surface-raised)] px-5 py-4">
        {Icon && <Icon size={16} className="text-[var(--btn-subtle-color)]" />}
        <h3 className="m-0 text-[14px] font-black text-[var(--text-primary)]">{title}</h3>
      </div>

      <div className="px-5 py-3">{children}</div>
    </div>
  );
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const canManageApplication = user?.role === 'admin' || user?.role === 'staff';
  const canManageNotes = canManageApplication;

  const [note, setNote] = useState('');
  const [tab, setTab] = useState<'overview' | 'documents' | 'notes'>('overview');

  const { data, isLoading } = useQuery<StudentDetail>({
    queryKey: ['student', id],
    queryFn: () => studentsApi.get(id!).then((r) => r.data),
    enabled: !!id,
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => studentsApi.updateStatus(id!, status),
    onSuccess: () => {
      toast.success('Status updated');
      qc.invalidateQueries({ queryKey: ['student', id] });
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['workstation-students'] });
      qc.invalidateQueries({ queryKey: ['workstation-export-records'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  const noteMutation = useMutation({
    mutationFn: (n: string) => studentsApi.addNote(id!, n),
    onSuccess: () => {
      toast.success('Note added');
      setNote('');
      qc.invalidateQueries({ queryKey: ['student', id] });
    },
    onError: () => toast.error('Failed to add note'),
  });

  const handleExportDocs = async () => {
    try {
      const res = await api.get(`/students/${id}/documents/export`, {
        responseType: 'blob',
      });

      const disposition = res.headers['content-disposition'] || '';
      const match = disposition.match(/filename="?([^";\r\n]+)"?/i);
      const filename = match?.[1]?.trim() || `documents_${id}.zip`;

      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const link = document.createElement('a');

      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status === 404) toast.info('No documents uploaded yet');
      else toast.error('Export failed');
    }
  };

  const handleViewDoc = async (docId: string) => {
    if (!id || !docId) return;

    const token = localStorage.getItem('accessToken');
    if (!token) {
      toast.error('Please log in again to view this document');
      return;
    }

    const viewer = window.open('', '_blank');

    if (viewer) {
      viewer.document.title = 'Loading document...';
      viewer.document.body.innerHTML =
        '<p style="font-family: system-ui, sans-serif; padding: 24px;">Loading document...</p>';
    }

    const apiBase = (import.meta.env.VITE_API_URL as string | undefined) || '/api';
    const url = `${apiBase}/students/${id}/documents/${docId}/file?token=${encodeURIComponent(token)}`;

    if (viewer) viewer.location.href = url;
    else window.open(url, '_blank');
  };

  const handlePrint = () => {
    if (!data) return;

    try {
      generateApplicationPDF(data);
    } catch {
      toast.error('Failed to generate PDF');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        {/* Skeleton header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)', minHeight: 76 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(90deg, var(--surface-hover) 25%, var(--surface-raised) 50%, var(--surface-hover) 75%)', animation: 'shimmer 1.6s ease-in-out infinite', backgroundSize: '200% 100%' }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 22, width: 220, borderRadius: 8, background: 'var(--surface-hover)', marginBottom: 8, animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />
            <div style={{ height: 14, width: 160, borderRadius: 6, background: 'linear-gradient(90deg, var(--surface-hover) 25%, var(--surface-raised) 50%, var(--surface-hover) 75%)', animation: 'shimmer 1.6s ease-in-out infinite', backgroundSize: '200% 100%' }} />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[88, 72, 64].map((w, i) => (
              <div key={i} style={{ height: 40, width: w, borderRadius: 12, background: 'linear-gradient(90deg, var(--surface-hover) 25%, var(--surface-raised) 50%, var(--surface-hover) 75%)', animation: 'shimmer 1.6s ease-in-out infinite', backgroundSize: '200% 100%' }} />
            ))}
          </div>
        </div>
        {/* Skeleton tabs */}
        <div style={{ display: 'flex', gap: 4, padding: '0 24px', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
          {[80, 120, 90].map((w, i) => (
            <div key={i} style={{ height: 44, width: w, margin: '8px 4px', borderRadius: 8, background: 'linear-gradient(90deg, var(--surface-hover) 25%, var(--surface-raised) 50%, var(--surface-hover) 75%)', animation: 'shimmer 1.6s ease-in-out infinite', backgroundSize: '200% 100%' }} />
          ))}
        </div>
        {/* Skeleton content grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 1280 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 16, border: '1px solid var(--border)', overflow: 'hidden', background: 'var(--surface)' }}>
                <div style={{ height: 52, background: 'var(--surface-raised)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 20px', gap: 10 }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: 'linear-gradient(90deg, var(--surface-hover) 25%, var(--surface-raised) 50%, var(--surface-hover) 75%)', animation: 'shimmer 1.6s ease-in-out infinite', backgroundSize: '200% 100%' }} />
                  <div style={{ height: 14, width: 120, borderRadius: 6, background: 'linear-gradient(90deg, var(--surface-hover) 25%, var(--surface-raised) 50%, var(--surface-hover) 75%)', animation: 'shimmer 1.6s ease-in-out infinite', backgroundSize: '200% 100%' }} />
                </div>
                <div style={{ padding: '12px 20px' }}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <div key={j} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, padding: '10px 0', borderBottom: j < 4 ? '1px solid var(--border)' : 'none' }}>
                      <div style={{ height: 12, width: 80 + j * 10, borderRadius: 4, background: 'linear-gradient(90deg, var(--surface-hover) 25%, var(--surface-raised) 50%, var(--surface-hover) 75%)', animation: 'shimmer 1.6s ease-in-out infinite', backgroundSize: '200% 100%' }} />
                      <div style={{ height: 13, width: 100 + j * 20, borderRadius: 4, background: 'linear-gradient(90deg, var(--surface-hover) 25%, var(--surface-raised) 50%, var(--surface-hover) 75%)', animation: 'shimmer 1.6s ease-in-out infinite', backgroundSize: '200% 100%' }} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 300, gap: 12 }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: 'var(--btn-danger-soft-bg)', border: '1px solid var(--btn-danger-soft-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertCircle size={24} style={{ color: 'var(--btn-danger-soft-color)' }} />
        </div>
        <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>Student not found</div>
        <div style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>This record may have been deleted or you don&apos;t have access.</div>
      </div>
    );
  }

  const s = data.student as typeof data.student & {
    application_number?: string;
    scholarship_type?: string;
  };

  const p = data.passport;
  const f = data.financial;
  const permAddr = data.addresses?.find((a) => a.address_type === 'permanent');
  const currAddr = data.addresses?.find((a) => a.address_type === 'current');
  const docsMap = Object.fromEntries((data.documents || []).map((d) => [d.doc_key, d]));
  const uploadedCount = (data.documents || []).length;

  const edu = (data.education as Array<Record<string, unknown>>) || [];
  const lang = (data.languages as Array<Record<string, unknown>>) || [];
  const work = (data.work as Array<Record<string, unknown>>) || [];
  const china = data.china as Record<string, unknown> | null;

  const age = calcAge(s.date_of_birth);

  const dobDisplay = s.date_of_birth
    ? `${formatDate(s.date_of_birth)}${age !== null ? ` (${age})` : ''}`
    : null;

  const canEditApplication =
    canManageApplication ||
    s.application_status === 'draft' ||
    s.application_status === 'revoked';

  const tabs = [
    { id: 'overview', label: 'Overview', Icon: FileText },
    {
      id: 'documents',
      label: `Documents (${uploadedCount}/${DOCUMENTS_LIST.length})`,
      Icon: FolderOpen,
    },
    { id: 'notes', label: `Notes (${data.notes?.length || 0})`, Icon: MessageSquare },
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      <div className="flex min-h-[76px] items-center gap-4 border-b border-[var(--border)] bg-[var(--surface)] px-6">
        <button
          onClick={() => navigate(-1)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <h1 className="m-0 text-[22px] font-black tracking-[-0.03em] text-[var(--text-primary)]">
              {s.given_name} {s.family_name}
            </h1>

            <span className={STATUS_COLORS[s.application_status]}>
              {STATUS_LABELS[s.application_status]}
            </span>

            {s.priority === 'high' && (
              <span className="inline-flex items-center gap-1 text-[12px] font-bold text-[var(--btn-danger-soft-color)]">
                <AlertCircle size={13} /> High Priority
              </span>
            )}
          </div>

          <div className="mt-1 text-[13px] text-[var(--text-tertiary)]">
            App No:{' '}
            <span className="font-mono font-bold text-[var(--btn-subtle-color)]">
              {s.application_number || '-'}
            </span>
            <span className="mx-2">·</span>
            Passport No.:{' '}
            <span className="font-mono font-bold">{s.passport_number || '-'}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canManageApplication && (
            <>
              <select
                value={s.application_status}
                onChange={(e) => statusMutation.mutate(e.target.value)}
                disabled={statusMutation.isPending}
                className="h-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] px-3 text-[13px] font-bold"
              >
                {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map((k) => (
                  <option key={k} value={k}>
                    {STATUS_LABELS[k]}
                  </option>
                ))}
              </select>

              <button
                onClick={handleExportDocs}
                className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-bold text-[var(--text-primary)]"
              >
                <Download size={15} /> Export
              </button>
            </>
          )}

          {canEditApplication && (
            <button
              onClick={() => navigate(`/students/${id}/edit`)}
              className="flex h-10 items-center gap-2 rounded-xl [background:var(--btn-primary-bg)] px-4 text-[13px] font-bold text-[var(--btn-primary-color)]"
            >
              <Pencil size={15} /> Edit
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex h-10 items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[13px] font-bold text-[var(--text-primary)]"
          >
            <Printer size={15} /> Print
          </button>
        </div>
      </div>

      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        padding: '0 24px',
        gap: 2,
        position: 'relative',
      }}>
        {tabs.map(({ id: tid, label, Icon }) => {
          const isActive = tab === tid;
          return (
            <button
              key={tid}
              onClick={() => setTab(tid as typeof tab)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '14px 16px',
                fontSize: 13,
                fontWeight: isActive ? 800 : 600,
                color: isActive ? 'var(--btn-subtle-color)' : 'var(--text-tertiary)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                fontFamily: 'inherit',
                transition: 'color 160ms ease',
                letterSpacing: '-0.01em',
              }}
            >
              <Icon size={15} />
              {label}
              <span style={{
                position: 'absolute',
                bottom: -1,
                left: 0,
                right: 0,
                height: 2,
                borderRadius: '2px 2px 0 0',
                background: 'var(--accent)',
                opacity: isActive ? 1 : 0,
                transform: isActive ? 'scaleX(1)' : 'scaleX(0)',
                transition: 'opacity 180ms ease, transform 200ms cubic-bezier(0.34,1.56,0.64,1)',
                transformOrigin: 'center',
              }} />
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'overview' && (
          <div className="grid max-w-[1280px] grid-cols-2 gap-5">
            <Section title="Application Details" icon={FileText}>
              <InfoRow label="Application No." value={s.application_number} mono />
              <InfoRow label="Status" value={STATUS_LABELS[s.application_status]} />
              <InfoRow label="Target University" value={s.target_university} />
              <InfoRow label="Intended Major" value={s.intended_major} />
              <InfoRow label="Scholarship Type" value={s.scholarship_type} />
              <InfoRow
                label="Degree Level"
                value={s.degree_level ? DEGREE_LABELS[s.degree_level] : null}
              />
              <InfoRow label="Start Term" value={s.intended_start_term} />
              <InfoRow
                label="Priority"
                value={
                  s.priority
                    ? s.priority.charAt(0).toUpperCase() + s.priority.slice(1)
                    : null
                }
              />
              <InfoRow label="Submitted" value={formatDate(s.created_at)} />
            </Section>

            <Section title="Personal Information" icon={User}>
              <InfoRow label="Full Name" value={`${s.given_name} ${s.family_name}`} />
              <InfoRow label="Chinese Name" value={s.chinese_name} />
              <InfoRow label="Date of Birth" value={dobDisplay} />
              <InfoRow
                label="Gender"
                value={s.gender ? s.gender.charAt(0).toUpperCase() + s.gender.slice(1) : null}
              />
              <InfoRow label="Nationality" value={s.nationality} />
              <InfoRow label="Passport No." value={s.passport_number} mono />
            </Section>

            <Section title="Contact Information" icon={Phone}>
              <InfoRow label="Email" value={s.email} />
              <InfoRow label="Mobile" value={s.mobile} />
              <InfoRow label="WhatsApp" value={s.whatsapp} />
              <InfoRow label="WeChat ID" value={s.wechat_id} />
            </Section>

            {permAddr && (
              <Section title="Permanent Address" icon={MapPin}>
                <InfoRow label="Country" value={permAddr.country} />
                <InfoRow label="City" value={permAddr.city} />
                <InfoRow label="State/Province" value={permAddr.state_province} />
                <InfoRow label="Street" value={permAddr.street_address} />
                <InfoRow label="Postal Code" value={permAddr.postal_code} />
              </Section>
            )}

            {currAddr && (
              <Section title="Current Address" icon={MapPin}>
                <InfoRow label="Country" value={currAddr.country} />
                <InfoRow label="City" value={currAddr.city} />
                <InfoRow label="State/Province" value={currAddr.state_province} />
                <InfoRow label="Street" value={currAddr.street_address} />
                <InfoRow label="Postal Code" value={currAddr.postal_code} />
              </Section>
            )}

            {edu.length > 0 && (
              <Section title="Education Background" icon={GraduationCap}>
                {edu.map((e, i) => (
                  <div key={i} className={i > 0 ? 'mt-2 border-t border-[var(--border)] pt-2' : ''}>
                    <InfoRow label="Institution" value={fmt(e.institution_name)} />
                    <InfoRow label="Country" value={fmt(e.country)} />
                    <InfoRow label="Degree" value={fmt(e.degree_obtained)} />
                    <InfoRow label="Field of Study" value={fmt(e.field_of_study)} />
                    <InfoRow
                      label="Period"
                      value={[fmtDate(e.start_date), fmtDate(e.end_date)].filter(Boolean).join(' - ')}
                    />
                    {e.gpa ? <InfoRow label="GPA" value={fmt(e.gpa)} /> : null}
                  </div>
                ))}
              </Section>
            )}

            {p && (
              <Section title="Passport & Visa" icon={BookOpen}>
                <InfoRow label="Passport Number" value={p.passport_number} mono />
                <InfoRow label="Issuing Country" value={p.issuing_country} />
                <InfoRow label="Issue Date" value={fmtDate(p.issue_date)} />
                <InfoRow label="Expiry Date" value={fmtDate(p.expiry_date)} />
                <InfoRow label="Place of Issue" value={p.place_of_issue} />
                <InfoRow label="Has China Visa" value={p.has_china_visa ? 'Yes' : 'No'} />
                {p.has_china_visa && (
                  <>
                    <InfoRow label="Visa Type" value={p.visa_type} />
                    <InfoRow label="Visa Number" value={p.visa_number} mono />
                    <InfoRow label="Visa Issue Date" value={fmtDate(p.visa_issue_date)} />
                    <InfoRow label="Visa Expiry Date" value={fmtDate(p.visa_expiry_date)} />
                  </>
                )}
              </Section>
            )}

            {f && (
              <Section title="Financial Supporter" icon={Wallet}>
                <InfoRow label="Name" value={f.supporter_name} />
                <InfoRow label="Relationship" value={f.relationship} />
                <InfoRow label="Occupation" value={f.occupation} />
                <InfoRow
                  label="Annual Income"
                  value={
                    f.annual_income_amount
                      ? `${f.annual_income_currency} ${Number(
                          f.annual_income_amount
                        ).toLocaleString()}`
                      : null
                  }
                />
                <InfoRow label="Phone" value={f.phone} />
                <InfoRow label="Email" value={f.email} />
                <InfoRow label="Bank" value={f.bank_name} />
              </Section>
            )}

            {china && Boolean(china.has_experience) && (
              <Section title="China Experience" icon={Globe}>
                <InfoRow label="Institution" value={fmt(china.university_name)} />
                <InfoRow label="City" value={fmt(china.city)} />
                <InfoRow label="Program" value={fmt(china.program_major)} />
                <InfoRow
                  label="Period"
                  value={[fmtDate(china.start_date), fmtDate(china.end_date)]
                    .filter(Boolean)
                    .join(' - ')}
                />
              </Section>
            )}

            {lang.length > 0 && (
              <Section title="Language Proficiency" icon={Globe}>
                {lang.map((l, i) => (
                  <div key={i} className={i > 0 ? 'mt-2 border-t border-[var(--border)] pt-2' : ''}>
                    <InfoRow label="Language" value={fmt(l.language)} />
                    <InfoRow label="Test" value={fmt(l.test_name)} />
                    <InfoRow label="Score" value={fmt(l.score)} />
                    <InfoRow label="Test Date" value={fmtDate(l.test_date)} />
                  </div>
                ))}
              </Section>
            )}

            {work.length > 0 && (
              <Section title="Work Experience" icon={Briefcase}>
                {work.map((w, i) => (
                  <div key={i} className={i > 0 ? 'mt-2 border-t border-[var(--border)] pt-2' : ''}>
                    <InfoRow label="Employer" value={fmt(w.employer)} />
                    <InfoRow label="Position" value={fmt(w.position)} />
                    <InfoRow
                      label="Period"
                      value={[fmtDate(w.start_date), fmtDate(w.end_date)]
                        .filter(Boolean)
                        .join(' - ')}
                    />
                    {w.description ? <InfoRow label="Description" value={fmt(w.description)} /> : null}
                  </div>
                ))}
              </Section>
            )}
          </div>
        )}

        {tab === 'documents' && (
          <div className="max-w-[820px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--sh-card)]">
            <div className="flex items-center justify-between border-b border-[var(--border)] bg-[var(--surface-raised)] px-5 py-4">
              <div>
                <div className="text-[14px] font-black text-[var(--text-primary)]">
                  {uploadedCount} of {DOCUMENTS_LIST.length} documents uploaded
                </div>
                <div className="mt-1 text-[12px] text-[var(--text-tertiary)]">
                  Uploaded documents are checked. Missing documents remain blank.
                </div>
              </div>

              {canManageApplication && uploadedCount > 0 && (
                <button
                  onClick={handleExportDocs}
                  className="flex h-10 items-center gap-2 rounded-xl [background:var(--btn-primary-bg)] px-4 text-[13px] font-bold text-[var(--btn-primary-color)]"
                >
                  <Download size={15} /> Download ZIP
                </button>
              )}
            </div>

            <div className="p-4">
              {DOCUMENTS_LIST.map((doc, i) => {
                const uploaded = docsMap[doc.key];

                return (
                  <div
                    key={doc.key}
                    className={`mb-2 flex items-center gap-3 rounded-xl border px-4 py-3 ${
                      uploaded
                        ? 'border-green-200 bg-green-50'
                        : 'border-[var(--border)] bg-[var(--surface)]'
                    }`}
                  >
                    <div
                      className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                        uploaded
                          ? 'border-green-600 bg-green-600'
                          : 'border-[var(--border)] bg-[var(--surface)]'
                      }`}
                    >
                      {uploaded && <CheckCircle size={13} color="var(--btn-success-color)" />}
                    </div>

                    <div className="w-7 text-right text-[12px] text-[var(--text-tertiary)]">
                      {i + 1}.
                    </div>

                    <div className="flex-1 text-[13px] font-bold text-[var(--text-primary)]">
                      {doc.label}
                      {doc.required && (
                        <span className="ml-2 text-[11px] font-black text-red-600">
                          Required
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 max-w-[280px] truncate text-right text-[12px] font-semibold text-[var(--text-tertiary)]">
                      {uploaded ? uploaded.file_name : 'Not uploaded'}
                    </div>

                    {uploaded && (
                      <button
                        type="button"
                        onClick={() => handleViewDoc(uploaded.id!)}
                        className="flex h-9 shrink-0 items-center gap-2 rounded-xl border border-[var(--btn-subtle-border)] bg-[var(--btn-subtle-bg)] px-3 text-[12px] font-black text-[var(--btn-subtle-color)]"
                      >
                        <Eye size={14} />
                        View
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {tab === 'notes' && (
          <div className="max-w-[720px]">
            {canManageNotes && (
              <div className="mb-5 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-card)]">
                <div className="mb-3 text-[13px] font-black uppercase tracking-wide text-[var(--text-tertiary)]">
                  Add Application Note
                </div>

                <textarea
                  rows={4}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Write an application note..."
                  className="mb-3 w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] p-4 text-[13px] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[rgba(96,165,250,0.28)]"
                />

                <div className="flex justify-end">
                  <button
                    onClick={() => noteMutation.mutate(note)}
                    disabled={!note.trim() || noteMutation.isPending}
                    className="flex h-10 items-center gap-2 rounded-xl [background:var(--btn-primary-bg)] px-4 text-[13px] font-bold text-[var(--btn-primary-color)] disabled:opacity-50"
                  >
                    <Send size={15} />
                    {noteMutation.isPending ? 'Adding...' : 'Add Note'}
                  </button>
                </div>
              </div>
            )}

            {data.notes?.length === 0 && (
              <div className="py-12 text-center text-[13px] text-[var(--text-tertiary)]">
                No notes yet.
              </div>
            )}

            {data.notes?.map((n) => (
              <div
                key={n.id}
                className="mb-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--sh-card)]"
              >
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--btn-primary-bg)] text-[11px] font-black text-[var(--btn-primary-color)]">
                      {(n.author || 'A').charAt(0).toUpperCase()}
                    </div>

                    <div className="text-[13px] font-black text-[var(--text-primary)]">
                      {n.author || 'Admin/Staff'}
                    </div>
                  </div>

                  <div className="font-mono text-[11px] text-[var(--text-tertiary)]">
                    {formatDateTime(n.created_at)}
                  </div>
                </div>

                <p className="m-0 whitespace-pre-wrap text-[13px] leading-7 text-[var(--text-secondary)]">
                  {n.note}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
