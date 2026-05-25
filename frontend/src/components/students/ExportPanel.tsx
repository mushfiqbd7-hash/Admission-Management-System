// src/components/students/ExportPanel.tsx
import { useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api/client';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type StatusKey =
  | 'all'
  | 'approved'
  | 'rejected'
  | 'processing'
  | 'pre_admission'
  | 'admitted'
  | 'revoked';

type SelectedStatus = StatusKey | '';

type StatusConfig = {
  key: StatusKey;
  label: string;
  color: string;
  bg: string;
  dot: string;
};

type ExportPanelProps = {
  sourceRows?: any[];
};

const STATUSES: StatusConfig[] = [
  { key: 'all', label: 'Total', color: 'var(--btn-subtle-color)', bg: 'var(--accent-light)', dot: 'var(--btn-subtle-color)' },
  { key: 'approved', label: 'Approved', color: 'var(--status-approved-text)', bg: 'var(--status-approved-bg)', dot: 'var(--status-approved-text)' },
  { key: 'rejected', label: 'Rejected', color: 'var(--status-rejected-text)', bg: 'var(--status-rejected-bg)', dot: 'var(--status-rejected-text)' },
  { key: 'processing', label: 'Processing', color: 'var(--status-processing-text)', bg: 'var(--status-processing-bg)', dot: 'var(--status-processing-text)' },
  { key: 'pre_admission', label: 'Pre Admission', color: 'var(--status-pre-text)', bg: 'var(--status-pre-bg)', dot: 'var(--status-pre-text)' },
  { key: 'admitted', label: 'Admitted', color: 'var(--status-admitted-text)', bg: 'var(--status-admitted-bg)', dot: 'var(--status-admitted-text)' },
  { key: 'revoked', label: 'Revoked', color: 'var(--status-revoked-text)', bg: 'var(--status-revoked-bg)', dot: 'var(--status-revoked-text)' },
];

function statusLabel(s: string) {
  return STATUSES.find((x) => x.key === s)?.label || s || '-';
}

function getYear(d?: string) {
  if (!d) return '';
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? '' : String(date.getFullYear());
}

function getTerm(r: any): string {
  const raw = [r.intended_start_term, r.intake, r.intake_term, r.term]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (raw.includes('mar')) return 'March';
  if (raw.includes('sep')) return 'September';

  return '';
}

function normalize(v: any) {
  return String(v || '').trim().toLowerCase();
}

function safeParseArray(value: any) {
  if (Array.isArray(value)) return value;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

function getUniversityText(r: any) {
  // Prefer the workstation universities array (most complete, de-duplicated)
  const workstationArray = safeParseArray(r.universities)
    .map((u: any) => u?.university_name || u?.name || '')
    .filter(Boolean);

  if (workstationArray.length > 0) return workstationArray.join('; ');

  // Fall back to string-agg version (same data, different shape)
  if (r.workstation_universities) return String(r.workstation_universities);

  // Last resort: original application field
  return String(r.target_university || r.university || '');
}

// When a university filter is active, return ONLY the matching university name(s)
// so the exported file shows just the relevant university, not all of them.
function getExportUniversityText(r: any, universityFilter: string): string {
  const query = normalize(universityFilter);
  if (!query) return getUniversityText(r);

  const workstationArray = safeParseArray(r.universities)
    .map((u: any) => u?.university_name || u?.name || '')
    .filter(Boolean);

  if (workstationArray.length > 0) {
    const matched = workstationArray.filter((name: string) =>
      normalize(name).includes(query)
    );
    return matched.length > 0 ? matched.join('; ') : getUniversityText(r);
  }

  return getUniversityText(r);
}

// Check whether a student row has a given status in ANY of their universities
function rowHasStatus(r: any, status: StatusKey): boolean {
  if (status === 'all') return true;
  const unis = safeParseArray(r.universities);
  if (unis.length > 0) {
    return unis.some((u: any) => u?.status === status);
  }
  // Fallback for rows without the universities array
  return r.application_status === status;
}

function makeFilePart(value: string) {
  const clean = String(value || '')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^\w-]/g, '');

  return clean || 'All';
}

function normalizeRow(row: any) {
  return {
    ...row,
    id: row.id || row.student_id || row.application_number,
    application_status: row.application_status || row.status || '',
    target_university: row.target_university || row.university || '',
    intended_start_term: row.intended_start_term || row.intake || row.intake_term || '',
    created_at: row.created_at || row.created_date || new Date().toISOString(),
  };
}

function mergeRows(groups: any[][]) {
  const map = new Map<string, any>();

  groups.flat().forEach((raw) => {
    if (!raw) return;

    const row = normalizeRow(raw);
    const key = String(row.id || row.application_number || Math.random());

    const existing = map.get(key) || {};

    map.set(key, {
      ...existing,
      ...row,
      universities: row.universities || existing.universities || [],
      workstation_universities:
        row.workstation_universities || existing.workstation_universities || '',
    });
  });

  return Array.from(map.values());
}

function hasCriteria(
  selectedStatus: SelectedStatus,
  university: string,
  year: string,
  term: string
) {
  return (
    selectedStatus !== '' ||
    university.trim() !== '' ||
    year !== 'all' ||
    term !== 'all'
  );
}

function baseFilterRows(rows: any[], university: string, year: string, term: string) {
  const universityQuery = normalize(university);

  return rows.filter((r) => {
    const universityText = normalize(getUniversityText(r));

    const matchUniversity =
      !universityQuery || universityText.includes(universityQuery);

    const matchYear = year === 'all' || getYear(r.created_at) === year;

    const matchTerm = term === 'all' || getTerm(r) === term;

    return matchUniversity && matchYear && matchTerm;
  });
}

function finalFilterRows(
  rows: any[],
  selectedStatus: SelectedStatus,
  university: string,
  year: string,
  term: string
) {
  const baseRows = baseFilterRows(rows, university, year, term);

  if (!selectedStatus || selectedStatus === 'all') {
    return baseRows;
  }

  // Match students who have AT LEAST ONE university with the selected status
  return baseRows.filter((r) => rowHasStatus(r, selectedStatus));
}

function doExcel(
  rows: any[],
  selectedStatus: SelectedStatus,
  university: string,
  year: string,
  term: string
) {
  if (!hasCriteria(selectedStatus, university, year, term)) {
    toast.error('Choose at least one filter or report type first');
    return;
  }

  const toastId = toast.loading('Generating Excel...');
  const data = finalFilterRows(rows, selectedStatus, university, year, term);
  if (!data.length) {
    toast.dismiss(toastId);
    toast.error('No records match the selected filters');
    return;
  }

  const esc = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;

  const headers = [
    'App No.',
    'Student Name',
    'Passport No.',
    'Nationality',
    'University',
    'Program',
    'Degree',
    'Intake Term',
    'Year',
    'Status',
    'Priority',
    'Submitted By',
    'Date',
  ];

  const csv = [
    headers.map(esc).join(','),
    ...data.map((r) =>
      [
        esc(r.application_number),
        esc(`${r.given_name || ''} ${r.family_name || ''}`.trim()),
        esc(r.passport_number),
        esc(r.nationality),
        esc(getExportUniversityText(r, university)),
        esc(r.intended_major),
        esc(r.degree_level),
        esc(r.intended_start_term),
        esc(getYear(r.created_at)),
        esc(statusLabel(r.application_status)),
        esc(r.priority),
        esc(r.submitted_by_name || r.submitted_by_role || ''),
        esc(new Date(r.created_at).toLocaleDateString('en-CA')),
      ].join(',')
    ),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csv], {
    type: 'text/csv;charset=utf-8;',
  });

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');

  const label = selectedStatus ? statusLabel(selectedStatus) : 'Filtered';

  a.href = url;
  a.download = `SAMS_${makeFilePart(label)}_${makeFilePart(
    university || 'AllUniversities'
  )}_${year !== 'all' ? year : 'AllYears'}_${
    term !== 'all' ? term : 'AllIntakes'
  }_${new Date().toISOString().slice(0, 10)}.csv`;

  a.click();
  URL.revokeObjectURL(url);

  toast.dismiss(toastId);
toast.success(`Excel exported - ${data.length} records`);
}

function doPDF(
  rows: any[],
  selectedStatus: SelectedStatus,
  university: string,
  year: string,
  term: string
) {
  if (!hasCriteria(selectedStatus, university, year, term)) {
    toast.error('Choose at least one filter or report type first');
    return;
  }

  const toastId = toast.loading('Generating PDF...');
  const data = finalFilterRows(rows, selectedStatus, university, year, term);
  if (!data.length) {
    toast.dismiss(toastId);
    toast.error('No records match the selected filters');
    return;
  }

  const activeStatus =
    STATUSES.find((x) => x.key === selectedStatus) || STATUSES[0];

  const hex2rgb = (h: string): [number, number, number] => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];

  const rgb = hex2rgb(activeStatus.color);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const universityLabel = university.trim() || 'All Universities';
  const yearLabel = year !== 'all' ? year : 'All Years';
  const termLabel = term !== 'all' ? term : 'All Intakes';
  const statusText = selectedStatus ? activeStatus.label : 'Filtered Records';

  doc.setFillColor(...rgb);
  doc.rect(0, 0, 297, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SAMS - Student Admission Management System', 14, 11);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`${statusText} · ${universityLabel} · ${yearLabel} · ${termLabel}`, 14, 19);

  doc.text(
    `Generated: ${new Date().toLocaleString()} | ${data.length} records`,
    297 - 14,
    19,
    { align: 'right' }
  );

  autoTable(doc, {
    startY: 32,
    head: [
      [
        'App No.',
        'Student Name',
        'Passport',
        'Nationality',
        'University',
        'Program',
        'Degree',
        'Intake',
        'Year',
        'Status',
        'Priority',
        'Submitted By',
        'Date',
      ],
    ],
    body: data.map((r) => [
      r.application_number || '-',
      `${r.given_name || ''} ${r.family_name || ''}`.trim() || '-',
      r.passport_number || '-',
      r.nationality || '-',
      getExportUniversityText(r, university) || '-',
      r.intended_major || '-',
      r.degree_level || '-',
      r.intended_start_term || '-',
      getYear(r.created_at) || '-',
      statusLabel(r.application_status || '-'),
      r.priority || '-',
      r.submitted_by_name || r.submitted_by_role || '-',
      new Date(r.created_at).toLocaleDateString('en-CA'),
    ]),
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    bodyStyles: {
      fontSize: 7,
      textColor: [30, 41, 59],
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: {
      left: 14,
      right: 14,
    },
  });

  const totalPages = (doc as any).internal.getNumberOfPages();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(`Page ${i} of ${totalPages} | SAMS Confidential`, 297 / 2, 206, {
      align: 'center',
    });
  }

  const fileName = `SAMS_${makeFilePart(statusText)}_${makeFilePart(
    university || 'AllUniversities'
  )}_${year !== 'all' ? year : 'AllYears'}_${
    term !== 'all' ? term : 'AllIntakes'
  }_${new Date().toISOString().slice(0, 10)}.pdf`;

  doc.save(fileName);
  toast.dismiss(toastId);
  toast.success(`PDF exported - ${data.length} records`);
}

export default function ExportPanel({ sourceRows = [] }: ExportPanelProps) {
  const [open, setOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<SelectedStatus>('');
  const [university, setUniversity] = useState('');
  const [year, setYear] = useState('all');
  const [term, setTerm] = useState('all');

  const { data: exportData, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['workstation-export-records'],
    queryFn: async () => {
      try {
        const res = await api.get('/workstation/export');
        const apiRows = res.data?.rows || [];

        if (Array.isArray(apiRows)) {
          return apiRows.map(normalizeRow);
        }
      } catch {
        return [];
      }

      return [];
    },
    enabled: open,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const apiRows = Array.isArray(exportData) ? exportData : [];

  const rows = useMemo(() => {
    // apiRows (full export) takes priority over sourceRows (current page only).
    // Process sourceRows first so apiRows overwrite them on conflict.
    const visibleRows = Array.isArray(sourceRows) ? sourceRows : [];
    return apiRows.length > 0
      ? mergeRows([visibleRows, apiRows])  // apiRows win (processed last)
      : mergeRows([visibleRows]);          // fall back to page data if API not loaded yet
  }, [sourceRows, apiRows]);

  const loading = isLoading || isFetching;
  const criteriaActive = hasCriteria(selectedStatus, university, year, term);

  const years = useMemo(
    () =>
      Array.from(new Set(rows.map((r) => getYear(r.created_at)).filter(Boolean))).sort(
        (a, b) => Number(b) - Number(a)
      ),
    [rows]
  );

  const baseRows = useMemo(() => {
    if (!criteriaActive) return [];
    return baseFilterRows(rows, university, year, term);
  }, [rows, university, year, term, criteriaActive]);

  const counts = useMemo(() => {
    const out: Record<string, number> = {
      all: 0,
      approved: 0,
      rejected: 0,
      processing: 0,
      pre_admission: 0,
      admitted: 0,
      revoked: 0,
    };

    if (!criteriaActive) return out;

    out.all = baseRows.length;

    // Count each student under every status they have across all universities
    baseRows.forEach((r) => {
      Object.keys(out).forEach((st) => {
        if (st !== 'all' && rowHasStatus(r, st as StatusKey)) {
          out[st] += 1;
        }
      });
    });

    return out;
  }, [baseRows, criteriaActive]);

  const filteredRows = useMemo(() => {
    if (!criteriaActive) return [];
    return finalFilterRows(rows, selectedStatus, university, year, term);
  }, [rows, selectedStatus, university, year, term, criteriaActive]);

  const filteredCount = filteredRows.length;

  const activeStatus = selectedStatus
    ? STATUSES.find((s) => s.key === selectedStatus)
    : null;

  const resetFilters = () => {
    setSelectedStatus('');
    setUniversity('');
    setYear('all');
    setTerm('all');
  };

  return (
    <div style={{ marginBottom: 16 }}>
      {!open && (
        <button
          onClick={() => {
            setOpen(true);
            setTimeout(() => refetch(), 0);
          }}
          style={closedButtonStyle}
        >
          <DownloadIcon />
          Export Reports
          <ChevronIcon open={false} />
        </button>
      )}

      {open && (
        <div style={panelStyle}>
          <div style={headerStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={reportIconBoxStyle}>
                <ReportIcon />
              </div>

              <div>
                <div style={titleStyle}>Export Reports</div>
                <div style={subtitleStyle}>
                  Use any filter, then export all matching data or select a specific report card.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {loading && (
                <span style={{ fontSize: 12, color: 'var(--ui-text-muted)', fontWeight: 700 }}>
                  Loading data…
                </span>
              )}

              <div style={selectedPillStyle}>{filteredCount} selected</div>

              <button onClick={() => setOpen(false)} style={closeBtnStyle}>
                Close
                <ChevronIcon open />
              </button>
            </div>
          </div>

          <div style={{ padding: '0 22px 20px' }}>
            <div style={statusGridStyle}>
              {STATUSES.map((st) => {
                const active = selectedStatus === st.key;
                const count = counts[st.key] ?? 0;

                return (
                  <button
                    key={st.key}
                    onClick={() => setSelectedStatus(active ? '' : st.key)}
                    style={{
                      ...statusCardStyle,
                      borderColor: active ? '#93c5fd' : 'var(--ui-border)',
                      background: active ? 'var(--accent-light)' : 'var(--surface)',
                      boxShadow: active
                        ? '0 10px 22px rgba(37,99,235,0.10)'
                        : '0 8px 18px rgba(15,23,42,0.035)',
                    }}
                  >
                    <div style={statusTopStyle}>
                      <span style={{ ...statusDotStyle, background: st.dot }} />
                      <span style={statusNameStyle}>{st.label}</span>
                    </div>

                    <div style={statusCountStyle}>{loading ? '…' : count}</div>
                  </button>
                );
              })}
            </div>

            <div style={filtersGridStyle}>
              <div>
                <FilterLabel icon={<SearchMiniIcon />} label="University" />
                <input
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="Type university name..."
                  style={filterInputStyle}
                />
              </div>

              <div>
                <FilterLabel icon={<CalendarIcon />} label="Year" />
                <select
                  value={year}
                  onChange={(e) => setYear(e.target.value)}
                  style={filterSelectStyle}
                >
                  <option value="all">All Years</option>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <FilterLabel icon={<FilterIcon />} label="Intake" />
                <select
                  value={term}
                  onChange={(e) => setTerm(e.target.value)}
                  style={filterSelectStyle}
                >
                  <option value="all">All Intakes</option>
                  <option value="March">March</option>
                  <option value="September">September</option>
                </select>
              </div>

              <div style={recordsReadyStyle}>
                <DownloadIcon />
                {criteriaActive ? `${filteredCount} records ready` : 'Choose filter'}
              </div>

              {criteriaActive && (
                <button onClick={resetFilters} style={resetBtnStyle}>
                  Reset
                </button>
              )}

              <div style={exportButtonsWrapStyle}>
                <button
                  onClick={() => doExcel(rows, selectedStatus, university, year, term)}
                  disabled={!criteriaActive || loading || filteredCount === 0}
                  style={{
                    ...exportBtnStyle,
                    border: '1px solid var(--status-approved-border)',
                    background: 'var(--status-approved-bg)',
                    color: '#15803d',
                    opacity: !criteriaActive || loading || filteredCount === 0 ? 0.5 : 1,
                    cursor:
                      !criteriaActive || loading || filteredCount === 0
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  <ExcelIcon />
                  Excel
                </button>

                <button
                  onClick={() => doPDF(rows, selectedStatus, university, year, term)}
                  disabled={!criteriaActive || loading || filteredCount === 0}
                  style={{
                    ...exportBtnStyle,
                    border: '1px solid var(--status-processing-border)',
                    background: 'var(--accent-light)',
                    color: 'var(--btn-subtle-color)',
                    opacity: !criteriaActive || loading || filteredCount === 0 ? 0.5 : 1,
                    cursor:
                      !criteriaActive || loading || filteredCount === 0
                        ? 'not-allowed'
                        : 'pointer',
                  }}
                >
                  <PdfIcon />
                  PDF
                </button>
              </div>
            </div>

            <div style={activeTextStyle}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: activeStatus?.dot || 'var(--btn-subtle-color)',
                  flexShrink: 0,
                }}
              />

              {criteriaActive ? (
                <>
                  Exporting{' '}
                  {selectedStatus ? (
                    <strong style={{ color: activeStatus?.color }}>{activeStatus?.label}</strong>
                  ) : (
                    <strong>all matching records</strong>
                  )}
                  {university.trim() && (
                    <>
                      {' '}for <strong>{university.trim()}</strong>
                    </>
                  )}
                  {year !== 'all' && (
                    <>
                      {' '}· <strong>{year}</strong>
                    </>
                  )}
                  {term !== 'all' && (
                    <>
                      {' '}· <strong>{term}</strong>
                    </>
                  )}
                </>
              ) : (
                <>Choose a university, year, intake, or report card to prepare export data.</>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div style={filterLabelStyle}>
      {icon}
      {label}
    </div>
  );
}

const closedButtonStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '9px 18px',
  borderRadius: 12,
  cursor: 'pointer',
  border: '1px solid var(--status-processing-border)',
  background: 'var(--accent-light)',
  color: 'var(--btn-subtle-color)',
  fontSize: 13,
  fontWeight: 900,
  fontFamily: 'inherit',
  boxShadow: '0 10px 24px rgba(37,99,235,0.08)',
};

const panelStyle: CSSProperties = {
  background: 'var(--surface-soft)',
  border: '1px solid var(--ui-border)',
  borderRadius: 22,
  boxShadow: '0 18px 44px rgba(15,23,42,0.08)',
  overflow: 'hidden',
};

const headerStyle: CSSProperties = {
  padding: '22px 22px 18px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 16,
};

const reportIconBoxStyle: CSSProperties = {
  width: 48,
  height: 48,
  borderRadius: 16,
  background: 'var(--accent-light)',
  border: '1px solid var(--status-processing-border)',
  color: 'var(--btn-subtle-color)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const titleStyle: CSSProperties = {
  fontSize: 17,
  fontWeight: 950,
  color: 'var(--text-primary)',
  letterSpacing: '-0.03em',
};

const subtitleStyle: CSSProperties = {
  fontSize: 13,
  color: 'var(--ui-text-subtle)',
  fontWeight: 700,
  marginTop: 3,
};

const selectedPillStyle: CSSProperties = {
  height: 38,
  minWidth: 92,
  padding: '0 14px',
  borderRadius: 999,
  background: 'var(--ui-surface-subtle)',
  border: '1px solid var(--ui-border-strong)',
  color: 'var(--ui-text-body)',
  fontSize: 13,
  fontWeight: 900,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const closeBtnStyle: CSSProperties = {
  height: 40,
  padding: '0 18px',
  borderRadius: 14,
  border: 'none',
  background: 'var(--text-primary)',
  color: 'var(--text-on-accent)',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
};

const statusGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: 12,
  paddingBottom: 18,
  borderBottom: '1px solid var(--ui-border-soft)',
};

const statusCardStyle: CSSProperties = {
  minHeight: 76,
  padding: '13px 14px',
  borderRadius: 14,
  border: '1px solid var(--ui-border)',
  background: 'var(--surface)',
  cursor: 'pointer',
  textAlign: 'left',
  fontFamily: 'inherit',
  transition: 'all 0.15s ease',
};

const statusTopStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  marginBottom: 7,
};

const statusDotStyle: CSSProperties = {
  width: 10,
  height: 10,
  borderRadius: '50%',
  flexShrink: 0,
};

const statusNameStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 950,
  color: 'var(--ui-text-strong)',
  whiteSpace: 'nowrap',
};

const statusCountStyle: CSSProperties = {
  fontSize: 18,
  fontWeight: 950,
  color: 'var(--ui-text-strong)',
  lineHeight: 1,
};

const filtersGridStyle: CSSProperties = {
  paddingTop: 18,
  display: 'grid',
  gridTemplateColumns: 'minmax(240px, 1.2fr) 190px 190px minmax(180px, auto) auto auto',
  gap: 12,
  alignItems: 'end',
};

const filterLabelStyle: CSSProperties = {
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  color: 'var(--ui-text-muted)',
  fontSize: 12.5,
  fontWeight: 900,
};

const filterInputStyle: CSSProperties = {
  width: '100%',
  height: 50,
  borderRadius: 14,
  border: '1px solid var(--ui-border-strong)',
  background: 'var(--surface)',
  padding: '0 15px',
  color: 'var(--ui-text-strong)',
  outline: 'none',
  fontSize: 13.5,
  fontWeight: 700,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const filterSelectStyle: CSSProperties = {
  width: '100%',
  height: 50,
  borderRadius: 14,
  border: '1px solid var(--ui-border-strong)',
  background: 'var(--surface)',
  padding: '0 15px',
  color: 'var(--ui-text-strong)',
  outline: 'none',
  fontSize: 13.5,
  fontWeight: 800,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const recordsReadyStyle: CSSProperties = {
  height: 50,
  borderRadius: 14,
  border: '1px solid var(--status-processing-border)',
  background: 'var(--accent-light)',
  color: 'var(--btn-subtle-color)',
  padding: '0 16px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 9,
  fontSize: 14,
  fontWeight: 950,
  whiteSpace: 'nowrap',
};

const resetBtnStyle: CSSProperties = {
  height: 50,
  padding: '0 16px',
  borderRadius: 14,
  border: '1px solid var(--status-rejected-border)',
  background: 'var(--status-rejected-bg)',
  color: 'var(--btn-danger-soft-color)',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
};

const exportButtonsWrapStyle: CSSProperties = {
  marginLeft: 'auto',
  display: 'flex',
  alignItems: 'center',
  gap: 12,
};

const exportBtnStyle: CSSProperties = {
  height: 50,
  minWidth: 92,
  borderRadius: 14,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  padding: '0 17px',
  fontSize: 14,
  fontWeight: 950,
  fontFamily: 'inherit',
};

const activeTextStyle: CSSProperties = {
  marginTop: 14,
  minHeight: 22,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  color: 'var(--ui-text-muted)',
  fontSize: 12.5,
  fontWeight: 700,
};

function ReportIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19V5" />
      <path d="M20 19H4" />
      <path d="M8 16v-5" />
      <path d="M12 16V8" />
      <path d="M16 16v-7" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        transform: open ? 'rotate(180deg)' : 'none',
        transition: 'transform 0.18s',
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function SearchMiniIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 3H2l8 9.5V20l4 2v-9.5L22 3z" />
    </svg>
  );
}

function ExcelIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
      <path d="M8 9h2" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 13h6" />
      <path d="M9 17h6" />
      <path d="M9 9h1" />
    </svg>
  );
}
