// src/components/workstation/WorkStationPage.tsx
import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Eye,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Users,
  Plus,
  Trash2,
  Maximize2,
  Minimize2,
} from 'lucide-react';

import { api } from '@/api/client';
import { DEGREE_LABELS } from '@/types';
import type { Student } from '@/types';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import ExportPanel from '../students/ExportPanel';

type WSStatus =
  | 'approved'
  | 'processing'
  | 'pre_admission'
  | 'admitted'
  | 'rejected'
  | 'revoked';

type WSUniversity = {
  id: string;
  university_name: string;
  status: WSStatus;
  position?: number;
};

type WorkStudent = Student & {
  scholarship_type?: string;
  nationality?: string;
  submitted_by_name?: string;
  submitted_by_role?: string;

  payment_of_application?: string;
  application_incharge?: string;
  portal_email?: string;
  portal_password?: string;

  universities?: WSUniversity[];
};

const WS_STATUSES: {
  value: WSStatus;
  label: string;
  bg: string;
  color: string;
  border: string;
  dot: string;
}[] = [
  {
    value: 'approved',
    label: 'Approved',
    bg: '#f0fdf4',
    color: '#15803d',
    border: '#bbf7d0',
    dot: '#22c55e',
  },
  {
    value: 'processing',
    label: 'Processing',
    bg: '#eef2ff',
    color: '#4338ca',
    border: '#c7d2fe',
    dot: '#4f46e5',
  },
  {
    value: 'pre_admission',
    label: 'Pre-Admission',
    bg: '#ecfeff',
    color: '#0e7490',
    border: '#a5f3fc',
    dot: '#06b6d4',
  },
  {
    value: 'admitted',
    label: 'Admitted',
    bg: '#f0fdfa',
    color: '#0f766e',
    border: '#99f6e4',
    dot: '#14b8a6',
  },
  {
    value: 'rejected',
    label: 'Rejected',
    bg: '#fef2f2',
    color: '#dc2626',
    border: '#fecaca',
    dot: '#ef4444',
  },
  {
    value: 'revoked',
    label: 'Revoked',
    bg: '#fff7ed',
    color: '#c2410c',
    border: '#fed7aa',
    dot: '#fb923c',
  },
];

const wsStatusMap = Object.fromEntries(WS_STATUSES.map((s) => [s.value, s])) as Record<
  WSStatus,
  (typeof WS_STATUSES)[number]
>;

function normalizeStatus(status?: string): WSStatus {
  if (WS_STATUSES.some((s) => s.value === status)) return status as WSStatus;
  return 'approved';
}

function getSubmitter(s: WorkStudent) {
  if (s.submitted_by_name) return s.submitted_by_name;

  if (s.submitted_by_role) {
    return s.submitted_by_role.charAt(0).toUpperCase() + s.submitted_by_role.slice(1);
  }

  return '—';
}

function getDegreeLabel(value?: string) {
  if (!value) return '—';
  return (DEGREE_LABELS as Record<string, string>)[value] || value;
}

function TextInputCell({
  value,
  placeholder,
  onSave,
}: {
  value?: string;
  placeholder: string;
  onSave: (value: string) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState(value || '');
  const [saving, setSaving] = useState(false);

  return (
    <input
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={async () => {
        if ((value || '') === draft) return;

        setSaving(true);

        try {
          await onSave(draft);
        } finally {
          setSaving(false);
        }
      }}
      placeholder={saving ? 'Saving…' : placeholder}
      style={{
        ...inputStyle,
        opacity: saving ? 0.65 : 1,
      }}
    />
  );
}

function PagBtn({
  onClick,
  disabled,
  active,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        minWidth: 32,
        height: 32,
        padding: '0 10px',
        borderRadius: 10,
        border: `1px solid ${active ? '#2563eb' : '#e2e8f0'}`,
        background: active ? '#2563eb' : '#ffffff',
        color: active ? '#ffffff' : '#64748b',
        fontSize: 12,
        fontWeight: 800,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'inherit',
      }}
    >
      {children}
    </button>
  );
}

export default function WorkStationPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { user } = useAuthStore();

  const canManage = user?.role === 'admin' || user?.role === 'staff';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | WSStatus>('all');
  const [page, setPage] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullScreen(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const pageSize = 20;

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['workstation-students', page, search, statusFilter],
    queryFn: () =>
      api
        .get('/workstation/students', {
          params: {
            page,
            limit: pageSize,
            search,
            status: statusFilter === 'all' ? '' : statusFilter,
          },
        })
        .then((r) => r.data),
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ['workstation-students'] });
    qc.invalidateQueries({ queryKey: ['workstation-export-records'] });
    qc.invalidateQueries({ queryKey: ['students'] });
    qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
  };

  const updateRecordMutation = useMutation({
    mutationFn: ({ studentId, patch }: { studentId: string; patch: Record<string, string> }) =>
      api.put(`/workstation/${studentId}/record`, patch),
    onSuccess: refresh,
    onError: () => toast.error('Failed to save Work Station field'),
  });

  const createUniversityMutation = useMutation({
    mutationFn: ({ studentId, primaryStatus }: { studentId: string; primaryStatus: WSStatus }) =>
      api.post(`/workstation/${studentId}/universities`, {
        university_name: '',
        status: primaryStatus,
      }),
    onSuccess: () => {
      toast.success('University row added');
      refresh();
    },
    onError: () => toast.error('Failed to add university'),
  });

  const updateUniversityMutation = useMutation({
    mutationFn: ({
      studentId,
      universityId,
      patch,
    }: {
      studentId: string;
      universityId: string;
      patch: Record<string, string>;
    }) => api.put(`/workstation/${studentId}/universities/${universityId}`, patch),
    onSuccess: (_res, variables) => {
      if (variables.patch.status) {
        toast.success('Application status updated');
      }

      refresh();

      if (
        variables.patch.status &&
        statusFilter !== 'all' &&
        statusFilter !== variables.patch.status
      ) {
        setStatusFilter('all');
      }
    },
    onError: () => toast.error('Failed to update university row'),
  });

  const deleteUniversityMutation = useMutation({
    mutationFn: ({ studentId, universityId }: { studentId: string; universityId: string }) =>
      api.delete(`/workstation/${studentId}/universities/${universityId}`),
    onSuccess: () => {
      toast.success('University row removed');
      refresh();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.error || 'Failed to remove university');
    },
  });

  const allStudents: WorkStudent[] = data?.data || [];
  const total = data?.pagination?.total || 0;
  const totalPages = Math.max(1, data?.pagination?.totalPages || 1);
  const safePage = Math.min(page, totalPages);

  const stats = data?.stats || {
    approved: 0,
    processing: 0,
    pre_admission: 0,
    admitted: 0,
    rejected: 0,
    revoked: 0,
  };

  if (!canManage) {
    return (
      <div style={restrictedStyle}>
        <AlertCircle size={42} style={{ color: '#fca5a5', marginBottom: 16 }} />
        <div style={{ fontSize: 17, fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>
          Access Restricted
        </div>
        <div style={{ fontSize: 13, color: '#94a3b8' }}>
          Work Station is available for Admin and Staff only.
        </div>
      </div>
    );
  }

  return (
    <div style={isFullScreen ? fullScreenStyle : pageStyle}>
      {/* Status quick filters */}
      <div style={statusPanelStyle}>
        <div style={statusGridStyle}>
          {WS_STATUSES.map((stat) => {
            const active = statusFilter === stat.value;
            const count = stats?.[stat.value] ?? 0;

            return (
              <button
                key={stat.value}
                onClick={() => {
                  setStatusFilter(active ? 'all' : stat.value);
                  setPage(1);
                }}
                style={{
                  ...statusCardStyle,
                  background: active ? stat.bg : '#ffffff',
                  borderColor: active ? stat.dot : '#e5eaf2',
                  boxShadow: active
                    ? `0 0 0 3px ${stat.dot}22, 0 10px 22px rgba(15,23,42,0.07)`
                    : '0 8px 18px rgba(15,23,42,0.04)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                      <span style={{ ...statusDotStyle, background: stat.dot }} />
                      <span style={{ ...statusLabelStyle, color: stat.color }}>{stat.label}</span>
                    </div>

                    <div style={{ fontSize: 24, fontWeight: 950, color: stat.color, lineHeight: 1 }}>
                      {count}
                    </div>
                  </div>

                  {isFetching && active && (
                    <RefreshCw
                      size={14}
                      style={{ color: stat.dot, animation: 'spin 1s linear infinite' }}
                    />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Export Reports */}
      <div style={exportWrapStyle}>
        <ExportPanel sourceRows={allStudents} />
      </div>

      {/* Filters */}
      <div style={filterBarStyle}>
        <div style={searchBoxStyle}>
          <Search
            size={14}
            style={{
              position: 'absolute',
              left: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#cbd5e1',
              pointerEvents: 'none',
            }}
          />

          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search student, passport, app no, university…"
            style={searchInputStyle}
          />

          {search && (
            <button
              onClick={() => {
                setSearch('');
                setPage(1);
              }}
              style={clearSearchBtnStyle}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {statusFilter !== 'all' && (
          <div style={activeFilterStyle}>
            {wsStatusMap[statusFilter].label}
            <button onClick={() => setStatusFilter('all')} style={activeFilterClearBtnStyle}>
              <X size={11} />
            </button>
          </div>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={recordsTextStyle}>
            {allStudents.length} visible · {total} workstation records
          </span>
          <button
            style={fullScreenBtnStyle}
            onClick={() => setIsFullScreen((v) => !v)}
            title={isFullScreen ? 'Exit full screen (Esc)' : 'Full screen'}
          >
            {isFullScreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            {isFullScreen ? 'Exit' : 'Full Screen'}
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={isFullScreen ? tableWrapFullStyle : tableWrapStyle}>
        <table style={tableStyle}>
          <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
            <tr>
              {[
                ['No.', 64],
                ['Submitted By', 150],
                ['App No.', 160],
                ['Degree', 145],
                ['Passport No.', 150],
                ['Nationality', 135],
                ['Student', 180],
                ['Intended Major', 190],
                ['Scholarship Type', 175],
                ['Payment of Application', 210],
                ['Application Incharge', 210],
                ['University Applied', 310],
                ['Application Status', 220],
                ['Portal Email', 260],
                ['Portal Password', 230],
                ['Actions', 110],
              ].map(([label, width]) => (
                <th key={label as string} style={{ ...thStyle, width: width as number }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              Array.from({ length: 6 }).map((_, rowIndex) => (
                <tr key={rowIndex}>
                  {Array.from({ length: 16 }).map((_, cellIndex) => (
                    <td key={cellIndex} style={bodyTdStyle}>
                      <div
                        style={{
                          height: 13,
                          width: cellIndex === 11 ? 180 : cellIndex === 13 ? 170 : 86,
                          background: '#e2e8f0',
                          borderRadius: 8,
                          opacity: 0.65,
                        }}
                      />
                    </td>
                  ))}
                </tr>
              ))
            ) : allStudents.length === 0 ? (
              <tr>
                <td colSpan={16} style={emptyTdStyle}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                    <div style={emptyIconBoxStyle}>
                      <Users size={32} style={{ color: '#22c55e' }} />
                    </div>

                    <div style={{ fontSize: 16, fontWeight: 900, color: '#334155' }}>
                      {search
                        ? 'No workstation records match your search'
                        : statusFilter !== 'all'
                        ? `No applications with "${wsStatusMap[statusFilter].label}" status`
                        : 'No approved or processing applications yet'}
                    </div>

                    <div style={{ fontSize: 13, color: '#94a3b8' }}>
                      Approved applications will appear here first, then stay here when their status changes.
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              allStudents.map((student, index) => {
                const universities = student.universities?.length
                  ? student.universities
                  : [
                      {
                        id: `${student.id}-fallback`,
                        university_name: '',
                        status: normalizeStatus(student.application_status),
                      },
                    ];

                return (
                  <tr key={student.id} style={rowStyle}>
                    <td style={firstTdStyle}>{(safePage - 1) * pageSize + index + 1}</td>

                    <td style={centerTdStyle}>
                      <div style={mainTextStyle}>{getSubmitter(student)}</div>
                    </td>

                    <td style={centerTdStyle}>
                      <span style={appNoStyle}>{student.application_number || '—'}</span>
                    </td>

                    <td style={centerTdStyle}>
                      <div style={mainTextStyle}>{getDegreeLabel(student.degree_level)}</div>
                    </td>

                    <td style={centerTdStyle}>
                      <div style={mutedTextStyle}>{student.passport_number || '—'}</div>
                    </td>

                    <td style={centerTdStyle}>
                      <div style={mutedTextStyle}>{student.nationality || '—'}</div>
                    </td>

                    <td style={centerTdStyle}>
                      <div style={studentTextStyle}>
                        {student.given_name} {student.family_name}
                      </div>
                    </td>

                    <td style={centerTdStyle}>
                      <div style={mutedTextStyle}>{student.intended_major || '—'}</div>
                    </td>

                    <td style={centerTdStyle}>
                      <div style={mutedTextStyle}>{student.scholarship_type || '—'}</div>
                    </td>

                    <td style={centerTdStyle}>
                      <TextInputCell
                        value={student.payment_of_application || ''}
                        placeholder="Payment info…"
                        onSave={(value) =>
                          updateRecordMutation.mutateAsync({
                            studentId: student.id,
                            patch: { payment_of_application: value },
                          })
                        }
                      />
                    </td>

                    <td style={centerTdStyle}>
                      <TextInputCell
                        value={student.application_incharge || ''}
                        placeholder="Incharge name…"
                        onSave={(value) =>
                          updateRecordMutation.mutateAsync({
                            studentId: student.id,
                            patch: { application_incharge: value },
                          })
                        }
                      />
                    </td>

                    <td style={stackTdStyle}>
                      <div style={universityStackStyle}>
                        {universities.map((university, uniIndex) => (
                          <div key={university.id} style={universityInputRowStyle}>
                            <span style={universityNoStyle}>{uniIndex + 1}</span>

                            <TextInputCell
                              value={university.university_name || ''}
                              placeholder="University name"
                              onSave={(value) =>
                                updateUniversityMutation.mutateAsync({
                                  studentId: student.id,
                                  universityId: university.id,
                                  patch: { university_name: value },
                                })
                              }
                            />

                            {universities.length > 1 && (
                              <button
                                onClick={() =>
                                  deleteUniversityMutation.mutate({
                                    studentId: student.id,
                                    universityId: university.id,
                                  })
                                }
                                style={deleteMiniBtnStyle}
                                title="Remove university"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        ))}

                        <button
                          onClick={() => createUniversityMutation.mutate({
                            studentId: student.id,
                            primaryStatus: normalizeStatus(universities[0]?.status),
                          })}
                          style={addUniversityBtnStyle}
                        >
                          <Plus size={13} />
                          Add University
                        </button>
                      </div>
                    </td>

                    <td style={stackTdStyle}>
                      <div style={universityStackStyle}>
                        {universities.map((university) => {
                          const st = wsStatusMap[normalizeStatus(university.status)];

                          return (
                            <select
                              key={university.id}
                              value={normalizeStatus(university.status)}
                              onChange={(e) =>
                                updateUniversityMutation.mutate({
                                  studentId: student.id,
                                  universityId: university.id,
                                  patch: { status: e.target.value },
                                })
                              }
                              style={{
                                ...selectStatusStyle,
                                background: st.bg,
                                color: st.color,
                                borderColor: st.border,
                              }}
                            >
                              {WS_STATUSES.map((status) => (
                                <option key={status.value} value={status.value}>
                                  {status.label}
                                </option>
                              ))}
                            </select>
                          );
                        })}
                      </div>
                    </td>

                    <td style={centerTdStyle}>
                      <TextInputCell
                        value={student.portal_email || ''}
                        placeholder="Portal email"
                        onSave={(value) =>
                          updateRecordMutation.mutateAsync({
                            studentId: student.id,
                            patch: { portal_email: value },
                          })
                        }
                      />
                    </td>

                    <td style={centerTdStyle}>
                      <TextInputCell
                        value={student.portal_password || ''}
                        placeholder="Portal password"
                        onSave={(value) =>
                          updateRecordMutation.mutateAsync({
                            studentId: student.id,
                            patch: { portal_password: value },
                          })
                        }
                      />
                    </td>

                    <td style={lastTdStyle}>
                      <button onClick={() => navigate(`/students/${student.id}`)} style={viewBtnStyle}>
                        <Eye size={14} />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div style={footerStyle}>
        <span style={{ fontSize: 12.5, color: '#64748b', fontWeight: 700 }}>
          {allStudents.length} visible · {total} workstation records
        </span>

        {totalPages > 1 && (
          <div style={{ display: 'flex', gap: 6 }}>
            <PagBtn disabled={safePage === 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
              <ChevronLeft size={14} />
            </PagBtn>

            {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => {
              const p = i + 1;

              return (
                <PagBtn key={p} active={p === safePage} onClick={() => setPage(p)}>
                  {p}
                </PagBtn>
              );
            })}

            <PagBtn
              disabled={safePage === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              <ChevronRight size={14} />
            </PagBtn>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Styles ───────────────────────── */

const pageStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  background:
    'radial-gradient(circle at top left, rgba(37,99,235,0.06), transparent 32%), linear-gradient(180deg, #f7f9fc 0%, #eef3f9 100%)',
};

const restrictedStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  height: '100%',
  padding: 40,
};

const statusPanelStyle: CSSProperties = {
  background: 'transparent',
  padding: '14px 24px 0',
  flexShrink: 0,
};

const statusGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
  gap: 10,
};

const statusCardStyle: CSSProperties = {
  minHeight: 82,
  padding: '13px 14px',
  borderRadius: 18,
  cursor: 'pointer',
  border: '1px solid #e5eaf2',
  fontFamily: 'inherit',
  textAlign: 'left',
  transition: 'all 0.16s ease',
};

const statusDotStyle: CSSProperties = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  display: 'inline-block',
  flexShrink: 0,
};

const statusLabelStyle: CSSProperties = {
  fontSize: 10.5,
  fontWeight: 900,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

const exportWrapStyle: CSSProperties = {
  padding: '14px 24px 0',
  flexShrink: 0,
};

const filterBarStyle: CSSProperties = {
  margin: '14px 24px 0',
  background: 'rgba(255,255,255,0.92)',
  border: '1px solid #e5eaf2',
  borderRadius: 18,
  padding: '10px 12px',
  flexShrink: 0,
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  boxShadow: '0 10px 24px rgba(15,23,42,0.05)',
};

const searchBoxStyle: CSSProperties = {
  position: 'relative',
  maxWidth: 420,
  flex: 1,
};

const searchInputStyle: CSSProperties = {
  width: '100%',
  height: 40,
  paddingLeft: 36,
  paddingRight: 34,
  fontSize: 13,
  border: '1px solid #dbe3ef',
  borderRadius: 13,
  outline: 'none',
  fontFamily: 'inherit',
  color: '#334155',
  background: '#ffffff',
  boxSizing: 'border-box',
};

const clearSearchBtnStyle: CSSProperties = {
  position: 'absolute',
  right: 9,
  top: '50%',
  transform: 'translateY(-50%)',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#94a3b8',
  display: 'flex',
  padding: 0,
};

const activeFilterStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  padding: '7px 11px',
  background: '#f0fdf4',
  border: '1px solid #86efac',
  borderRadius: 999,
  fontSize: 12,
  color: '#15803d',
  fontWeight: 800,
};

const activeFilterClearBtnStyle: CSSProperties = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  color: '#22c55e',
  display: 'flex',
  padding: 0,
};

const recordsTextStyle: CSSProperties = {
  fontSize: 12,
  color: '#64748b',
  fontWeight: 700,
};

const tableWrapStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: '14px 24px 0',
};

const tableStyle: CSSProperties = {
  borderCollapse: 'separate',
  borderSpacing: '0 10px',
  fontSize: 12.5,
  minWidth: 2770,
  width: '100%',
};

const fullScreenStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  padding: '14px 24px',
  background:
    'radial-gradient(circle at top left, rgba(37,99,235,0.06), transparent 32%), linear-gradient(180deg, #f7f9fc 0%, #eef3f9 100%)',
};

const tableWrapFullStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: '14px 0 0',
};

const fullScreenBtnStyle: CSSProperties = {
  height: 38,
  padding: '0 14px',
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#475569',
  fontSize: 12.5,
  fontWeight: 700,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  boxShadow: '0 2px 8px rgba(15,23,42,0.07)',
  flexShrink: 0,
};

const thStyle: CSSProperties = {
  padding: '12px 14px',
  textAlign: 'left',
  fontSize: 10.5,
  fontWeight: 900,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
  background: '#f8fafc',
  borderTop: '1px solid #e2e8f0',
  borderBottom: '1px solid #e2e8f0',
};

const rowStyle: CSSProperties = {
  background: '#ffffff',
  boxShadow: '0 8px 22px rgba(15, 23, 42, 0.05)',
  borderRadius: 18,
};

const bodyTdStyle: CSSProperties = {
  padding: '14px 14px',
  borderTop: '1px solid #e8edf4',
  borderBottom: '1px solid #e8edf4',
  background: '#ffffff',
};

const centerTdStyle: CSSProperties = {
  ...bodyTdStyle,
  verticalAlign: 'middle',
};

const stackTdStyle: CSSProperties = {
  ...bodyTdStyle,
  verticalAlign: 'top',
};

const firstTdStyle: CSSProperties = {
  ...centerTdStyle,
  borderTopLeftRadius: 18,
  borderBottomLeftRadius: 18,
  borderLeft: '1px solid #e8edf4',
  color: '#94a3b8',
  fontWeight: 900,
  textAlign: 'center',
};

const lastTdStyle: CSSProperties = {
  ...centerTdStyle,
  borderTopRightRadius: 18,
  borderBottomRightRadius: 18,
  borderRight: '1px solid #e8edf4',
};

const appNoStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  width: 'fit-content',
  maxWidth: '100%',
  fontSize: 11.5,
  fontFamily: 'DM Mono, monospace',
  fontWeight: 900,
  color: '#1d4ed8',
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  padding: '5px 9px',
  borderRadius: 999,
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const mainTextStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 900,
  color: '#334155',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const studentTextStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: '#0f172a',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const mutedTextStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 700,
  color: '#64748b',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const inputStyle: CSSProperties = {
  width: '100%',
  height: 36,
  borderRadius: 11,
  border: '1px solid #dbe3ef',
  background: '#ffffff',
  padding: '0 10px',
  fontSize: 12.5,
  fontWeight: 700,
  color: '#334155',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const selectStatusStyle: CSSProperties = {
  width: '100%',
  height: 36,
  borderRadius: 999,
  border: '1px solid #dbe3ef',
  padding: '0 10px',
  fontSize: 12,
  fontWeight: 900,
  outline: 'none',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const universityStackStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 8,
};

const universityInputRowStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '24px minmax(0, 1fr) 28px',
  gap: 6,
  alignItems: 'center',
};

const universityNoStyle: CSSProperties = {
  width: 24,
  height: 24,
  borderRadius: 8,
  background: '#eff6ff',
  color: '#1d4ed8',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 11,
  fontWeight: 900,
};

const deleteMiniBtnStyle: CSSProperties = {
  width: 28,
  height: 28,
  borderRadius: 9,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#dc2626',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
};

const addUniversityBtnStyle: CSSProperties = {
  width: 'fit-content',
  height: 32,
  borderRadius: 10,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1d4ed8',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '0 11px',
  fontSize: 12,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const viewBtnStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  height: 34,
  minWidth: 82,
  padding: '0 13px',
  borderRadius: 11,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 12.5,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
};

const emptyTdStyle: CSSProperties = {
  padding: '80px 20px',
  textAlign: 'center',
  background: '#ffffff',
  borderRadius: 18,
  border: '1px solid #e8edf4',
};

const emptyIconBoxStyle: CSSProperties = {
  width: 68,
  height: 68,
  borderRadius: 22,
  background: '#ecfdf5',
  border: '1px solid #bbf7d0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const footerStyle: CSSProperties = {
  padding: '12px 24px 16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 12,
  flexShrink: 0,
};