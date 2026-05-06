// src/components/students/StudentsPage.tsx
import { useState, useEffect, type CSSProperties, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Eye,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  X,
  FileText,
  UserRound,
  GraduationCap,
  Filter,
} from 'lucide-react';

import { studentsApi } from '@/api/client';
import { STATUS_LABELS, DEGREE_LABELS } from '@/types';
import type { Student, ApplicationStatus } from '@/types';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/authStore';

type StudentExtra = Student & {
  submitted_by_name?: string;
  submitted_by_role?: string;
  submitted_by_email?: string;
};

function statusLabel(status?: string) {
  if (!status) return '—';
  return STATUS_LABELS[status as ApplicationStatus] || status.replace(/_/g, ' ');
}

function statusStyle(status?: string): CSSProperties {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    height: 28,
    padding: '0 11px',
    borderRadius: 999,
    fontSize: 12,
    fontWeight: 900,
    whiteSpace: 'nowrap',
    textTransform: 'capitalize',
  };

  switch (status) {
    case 'pending':
      return { ...base, background: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' };
    case 'approved':
      return { ...base, background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' };
    case 'processing':
      return { ...base, background: '#eef2ff', color: '#4338ca', border: '1px solid #c7d2fe' };
    case 'pre_admission':
      return { ...base, background: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff' };
    case 'admitted':
      return { ...base, background: '#f0fdfa', color: '#0f766e', border: '1px solid #99f6e4' };
    case 'rejected':
      return { ...base, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' };
    case 'revoked':
      return { ...base, background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' };
    case 'draft':
      return { ...base, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' };
    default:
      return { ...base, background: '#f8fafc', color: '#475569', border: '1px solid #e2e8f0' };
  }
}

function statusDot(status?: string): CSSProperties {
  const color =
    status === 'pending'
      ? '#f59e0b'
      : status === 'approved'
      ? '#16a34a'
      : status === 'processing'
      ? '#4f46e5'
      : status === 'pre_admission'
      ? '#9333ea'
      : status === 'admitted'
      ? '#0f766e'
      : status === 'rejected'
      ? '#ef4444'
      : status === 'revoked'
      ? '#ea580c'
      : '#94a3b8';

  return {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: color,
    flexShrink: 0,
  };
}

function PriorityBadge({ priority }: { priority?: string }) {
  if (priority === 'high') {
    return (
      <span style={priorityHighStyle}>
        <AlertCircle size={12} />
        High
      </span>
    );
  }

  return <span style={priorityNormalStyle}>Normal</span>;
}

function ActionBtn({
  onClick,
  title,
  children,
  tone = 'blue',
}: {
  onClick: () => void;
  title: string;
  children: ReactNode;
  tone?: 'blue' | 'amber' | 'red';
}) {
  const toneStyle =
    tone === 'red'
      ? { color: '#dc2626', bg: '#fef2f2', border: '#fecaca' }
      : tone === 'amber'
      ? { color: '#b45309', bg: '#fffbeb', border: '#fde68a' }
      : { color: '#1d4ed8', bg: '#eff6ff', border: '#bfdbfe' };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      title={title}
      style={{
        width: 34,
        height: 34,
        borderRadius: 11,
        border: `1px solid ${toneStyle.border}`,
        background: toneStyle.bg,
        color: toneStyle.color,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'transform 0.12s ease, box-shadow 0.12s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)';
        e.currentTarget.style.boxShadow = '0 8px 18px rgba(15,23,42,0.10)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {children}
    </button>
  );
}

function PageButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        height: 34,
        minWidth: 34,
        borderRadius: 11,
        border: '1px solid #dbe3ef',
        background: '#ffffff',
        color: '#475569',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {children}
    </button>
  );
}

export default function StudentsPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [params, setParams] = useSearchParams();
  const { user } = useAuthStore();

  const canSeeAll = user?.role === 'admin' || user?.role === 'staff';

  const [search, setSearch] = useState(params.get('search') || '');
  const [status, setStatus] = useState(params.get('status') || '');
  const [priority, setPriority] = useState(params.get('priority') || '');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  useEffect(() => {
    setSearch(params.get('search') || '');
    setStatus(params.get('status') || '');
    setPriority(params.get('priority') || '');
    setPage(1);
  }, [params]);

  const queryParams = {
    search: search.trim(),
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    page,
    limit: 20,
    sort: 'created_at',
    order: 'desc',
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['students', queryParams],
    queryFn: () => studentsApi.list(queryParams).then((r) => r.data),
    staleTime: 10_000,
  });

  useEffect(() => {
    if (
      !isLoading &&
      data?.pagination?.total &&
      (data?.data?.length ?? 0) === 0 &&
      page > 1
    ) {
      setPage(1);
    }
  }, [isLoading, data, page]);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => studentsApi.delete(id),
    onSuccess: () => {
      toast.success('Student deleted');
      qc.invalidateQueries({ queryKey: ['students'] });
      qc.invalidateQueries({ queryKey: ['dashboard-stats'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete student'),
  });

  const clearFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setPage(1);
    setParams({});
  };

  const hasFilters = Boolean(search || status || priority);
  const total = data?.pagination?.total ?? 0;
  const totalPages = data?.pagination?.totalPages ?? 1;
  const students = data?.data ?? [];
  const colCount = canSeeAll ? 10 : 9;

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={headerCardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={headerIconStyle}>
            <FileText size={22} />
          </div>

          <div>
            <div style={pageTitleStyle}>{canSeeAll ? 'Student Records' : 'My Applications'}</div>

            <div style={pageSubtitleStyle}>
              {isFetching && (
                <RefreshCw size={12} style={{ animation: 'spin 1s linear infinite' }} />
              )}

              {total > 0
                ? canSeeAll
                  ? `${total.toLocaleString()} record${total !== 1 ? 's' : ''}`
                  : `${total} application${total !== 1 ? 's' : ''} submitted by you`
                : 'No records found'}
            </div>
          </div>
        </div>

        <button style={addBtnStyle} onClick={() => navigate('/students/new')}>
          <Plus size={16} />
          {canSeeAll ? 'Add Student' : 'New Application'}
        </button>
      </div>

      {/* Main card */}
      <div style={cardStyle}>
        {/* Filter bar */}
        <div style={filterBarStyle}>
          <div style={searchBoxStyle}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            />

            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              onKeyDown={(e) => e.key === 'Enter' && setPage(1)}
              placeholder="Search by name, passport, email, university..."
              style={searchInputStyle}
            />

            {search && (
              <button
                onClick={() => {
                  setSearch('');
                  setPage(1);
                }}
                style={clearSearchStyle}
              >
                <X size={14} />
              </button>
            )}
          </div>

          <select
            style={selectStyle}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Statuses</option>
            {(Object.keys(STATUS_LABELS) as ApplicationStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>

          <select
            style={selectStyle}
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Priority</option>
            <option value="high">High</option>
            <option value="normal">Normal</option>
          </select>

          {hasFilters && (
            <button onClick={clearFilters} style={clearFilterBtnStyle}>
              <X size={14} />
              Clear
            </button>
          )}
        </div>

        {/* Active filters */}
        {hasFilters && (
          <div style={activeFilterBarStyle}>
            <Filter size={14} style={{ color: '#64748b' }} />
            <span style={{ fontSize: 12.5, fontWeight: 800, color: '#64748b' }}>
              Active filters:
            </span>

            {search && <span style={filterChipStyle}>Search: {search}</span>}

            {status && (
              <span style={filterChipStyle}>Status: {statusLabel(status)}</span>
            )}

            {priority && (
              <span style={filterChipStyle}>Priority: {priority}</span>
            )}
          </div>
        )}

        {/* Table */}
        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {[
                  ['App No.', 145],
                  ...(canSeeAll ? [['Submitted By', 190]] : []),
                  ['Passport No.', 140],
                  ['Student', 210],
                  ['Nationality', 145],
                  ['University', 180],
                  ['Degree', 165],
                  ['Status', 165],
                  ['Priority', 125],
                  ['Actions', 120],
                ].map(([label, width]) => (
                  <th key={label as string} style={{ ...thStyle, width: width as number }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: colCount }).map((_, j) => (
                      <td key={j} style={bodyTdStyle}>
                        <div
                          style={{
                            height: 14,
                            width: j === 3 ? 130 : j === 5 ? 110 : 86,
                            background: '#e2e8f0',
                            borderRadius: 999,
                            opacity: 0.75,
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                students.map((student: Student) => {
                  const sAny = student as StudentExtra;

                  const canEditRow =
                    canSeeAll ||
                    student.application_status === 'draft' ||
                    student.application_status === 'revoked';

                  return (
                    <tr key={student.id} style={rowStyle}>
                      <td style={firstTdStyle}>
                        <span style={appNoStyle}>{student.application_number || '—'}</span>
                      </td>

                      {canSeeAll && (
                        <td style={bodyTdStyle}>
                          <div style={strongTextStyle}>{sAny.submitted_by_name || '—'}</div>

                          {sAny.submitted_by_role && (
                            <div style={smallMutedStyle}>
                              {sAny.submitted_by_role}
                            </div>
                          )}

                          {sAny.submitted_by_email && (
                            <div style={smallMutedStyle}>
                              {sAny.submitted_by_email}
                            </div>
                          )}
                        </td>
                      )}

                      <td style={bodyTdStyle}>
                        <span style={monoTextStyle}>{student.passport_number || '—'}</span>
                      </td>

                      <td style={bodyTdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={studentAvatarStyle}>
                            <UserRound size={15} />
                          </div>

                          <div style={{ minWidth: 0 }}>
                            <div style={studentNameStyle}>
                              {student.given_name} {student.family_name}
                            </div>

                            {student.email && (
                              <div style={smallMutedStyle}>{student.email}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      <td style={bodyTdStyle}>
                        <span style={normalTextStyle}>{student.nationality || '—'}</span>
                      </td>

                      <td style={bodyTdStyle}>
                        <div style={lineClampStyle} title={student.target_university || '—'}>
                          {student.target_university || '—'}
                        </div>
                      </td>

                      <td style={bodyTdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <GraduationCap size={15} style={{ color: '#94a3b8', flexShrink: 0 }} />
                          <span style={normalTextStyle}>
                            {student.degree_level ? DEGREE_LABELS[student.degree_level] : '—'}
                          </span>
                        </div>
                      </td>

                      <td style={bodyTdStyle}>
                        <span style={statusStyle(student.application_status)}>
                          <span style={statusDot(student.application_status)} />
                          {statusLabel(student.application_status)}
                        </span>
                      </td>

                      <td style={bodyTdStyle}>
                        <PriorityBadge priority={student.priority} />
                      </td>

                      <td style={lastTdStyle}>
                        <div style={actionsWrapStyle}>
                          <ActionBtn
                            onClick={() => navigate(`/students/${student.id}`)}
                            title="View"
                            tone="blue"
                          >
                            <Eye size={15} />
                          </ActionBtn>

                          {canEditRow && (
                            <ActionBtn
                              onClick={() => navigate(`/students/${student.id}/edit`)}
                              title="Edit"
                              tone="amber"
                            >
                              <Pencil size={15} />
                            </ActionBtn>
                          )}

                          {canSeeAll && (
                            <ActionBtn
                              onClick={() => setDeleteId(student.id)}
                              title="Delete"
                              tone="red"
                            >
                              <Trash2 size={15} />
                            </ActionBtn>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {!isLoading && students.length === 0 && (
            <div style={emptyStateStyle}>
              <div style={emptyIconStyle}>
                <FileText size={34} style={{ color: '#94a3b8' }} />
              </div>

              <div style={emptyTitleStyle}>No records found</div>

              <div style={emptySubtitleStyle}>
                {hasFilters
                  ? 'No applications match your current filters.'
                  : 'New student applications will appear here after submission.'}
              </div>

              {hasFilters && (
                <button onClick={clearFilters} style={emptyActionStyle}>
                  Clear filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Pagination */}
        {data && totalPages > 1 && (
          <div style={paginationStyle}>
            <div style={paginationTextStyle}>
              Showing {(page - 1) * 20 + 1}–{Math.min(page * 20, total)} of{' '}
              {total.toLocaleString()} records
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <PageButton disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft size={16} />
              </PageButton>

              <div style={pageNumberStyle}>
                {page} / {totalPages}
              </div>

              <PageButton
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight size={16} />
              </PageButton>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteId && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div style={deleteIconStyle}>
                <Trash2 size={20} style={{ color: '#dc2626' }} />
              </div>

              <div>
                <div style={modalTitleStyle}>Delete Student</div>
                <div style={modalSubtitleStyle}>This action cannot be undone.</div>
              </div>
            </div>

            <p style={modalTextStyle}>
              Are you sure you want to permanently delete this student record and all associated
              application data?
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button style={cancelBtnStyle} onClick={() => setDeleteId(null)}>
                Cancel
              </button>

              <button
                onClick={() => deleteMutation.mutate(deleteId)}
                disabled={deleteMutation.isPending}
                style={{
                  ...confirmDeleteBtnStyle,
                  opacity: deleteMutation.isPending ? 0.65 : 1,
                  cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
                }}
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Styles ───────────────────────── */

const pageStyle: CSSProperties = {
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  padding: '18px 24px 22px',
  background:
    'radial-gradient(circle at top left, rgba(37,99,235,0.055), transparent 34%), linear-gradient(180deg, #f8fafc 0%, #eef3f9 100%)',
};

const headerCardStyle: CSSProperties = {
  flexShrink: 0,
  marginBottom: 16,
  padding: '20px 22px',
  borderRadius: 24,
  border: '1px solid #e2e8f0',
  background: 'rgba(255,255,255,0.94)',
  boxShadow: '0 18px 42px rgba(15,23,42,0.055)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 18,
};

const headerIconStyle: CSSProperties = {
  width: 52,
  height: 52,
  borderRadius: 17,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#2563eb',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const pageTitleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 950,
  color: '#0f172a',
  letterSpacing: '-0.045em',
};

const pageSubtitleStyle: CSSProperties = {
  marginTop: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  fontSize: 13,
  fontWeight: 750,
  color: '#64748b',
};

const addBtnStyle: CSSProperties = {
  height: 44,
  padding: '0 18px',
  borderRadius: 14,
  border: 'none',
  background: '#1e3a5f',
  color: '#ffffff',
  fontSize: 13.5,
  fontWeight: 950,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  boxShadow: '0 14px 26px rgba(30,58,95,0.22)',
  whiteSpace: 'nowrap',
};

const cardStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  borderRadius: 24,
  border: '1px solid #e2e8f0',
  background: 'rgba(255,255,255,0.96)',
  boxShadow: '0 18px 42px rgba(15,23,42,0.055)',
  display: 'flex',
  flexDirection: 'column',
};

const filterBarStyle: CSSProperties = {
  flexShrink: 0,
  padding: 16,
  borderBottom: '1px solid #e8edf4',
  background: '#ffffff',
  display: 'grid',
  gridTemplateColumns: 'minmax(260px, 1fr) 170px 150px auto',
  gap: 12,
  alignItems: 'center',
};

const searchBoxStyle: CSSProperties = {
  position: 'relative',
  minWidth: 0,
};

const searchInputStyle: CSSProperties = {
  width: '100%',
  height: 42,
  borderRadius: 14,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  padding: '0 38px 0 40px',
  outline: 'none',
  fontSize: 13,
  fontWeight: 700,
  color: '#334155',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const clearSearchStyle: CSSProperties = {
  position: 'absolute',
  right: 12,
  top: '50%',
  transform: 'translateY(-50%)',
  border: 'none',
  background: 'transparent',
  color: '#94a3b8',
  cursor: 'pointer',
  display: 'inline-flex',
  padding: 0,
};

const selectStyle: CSSProperties = {
  width: '100%',
  height: 42,
  borderRadius: 14,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  padding: '0 13px',
  outline: 'none',
  fontSize: 13,
  fontWeight: 800,
  color: '#334155',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const clearFilterBtnStyle: CSSProperties = {
  height: 42,
  padding: '0 14px',
  borderRadius: 14,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#dc2626',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  whiteSpace: 'nowrap',
};

const activeFilterBarStyle: CSSProperties = {
  flexShrink: 0,
  padding: '10px 16px',
  background: '#f8fafc',
  borderBottom: '1px solid #e8edf4',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const filterChipStyle: CSSProperties = {
  height: 26,
  borderRadius: 999,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1d4ed8',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0 10px',
  fontSize: 12,
  fontWeight: 900,
};

const tableWrapStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: '0 12px 12px',
};

const tableStyle: CSSProperties = {
  width: '100%',
  minWidth: 1480,
  borderCollapse: 'separate',
  borderSpacing: '0 10px',
  fontSize: 13,
};

const thStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 5,
  background: '#f8fafc',
  borderTop: '1px solid #e2e8f0',
  borderBottom: '1px solid #e2e8f0',
  padding: '13px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 950,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.065em',
  whiteSpace: 'nowrap',
};

const rowStyle: CSSProperties = {
  background: '#ffffff',
  boxShadow: '0 8px 20px rgba(15,23,42,0.04)',
};

const bodyTdStyle: CSSProperties = {
  padding: '16px 14px',
  background: '#ffffff',
  borderTop: '1px solid #e8edf4',
  borderBottom: '1px solid #e8edf4',
  verticalAlign: 'middle',
};

const firstTdStyle: CSSProperties = {
  ...bodyTdStyle,
  borderTopLeftRadius: 18,
  borderBottomLeftRadius: 18,
  borderLeft: '1px solid #e8edf4',
};

const lastTdStyle: CSSProperties = {
  ...bodyTdStyle,
  borderTopRightRadius: 18,
  borderBottomRightRadius: 18,
  borderRight: '1px solid #e8edf4',
};

const appNoStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  maxWidth: '100%',
  padding: '5px 9px',
  borderRadius: 999,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 11.5,
  fontWeight: 950,
  fontFamily: 'DM Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  whiteSpace: 'nowrap',
};

const strongTextStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: '#0f172a',
  lineHeight: 1.35,
};

const smallMutedStyle: CSSProperties = {
  marginTop: 2,
  fontSize: 11.5,
  fontWeight: 700,
  color: '#94a3b8',
  lineHeight: 1.35,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const monoTextStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 800,
  color: '#475569',
  fontFamily: 'DM Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  whiteSpace: 'nowrap',
};

const normalTextStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 750,
  color: '#475569',
  lineHeight: 1.45,
};

const studentAvatarStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#64748b',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const studentNameStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 950,
  color: '#0f172a',
  whiteSpace: 'nowrap',
};

const lineClampStyle: CSSProperties = {
  maxWidth: 170,
  fontSize: 12.5,
  fontWeight: 750,
  color: '#475569',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const priorityHighStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#dc2626',
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: 'nowrap',
};

const priorityNormalStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  color: '#64748b',
  fontSize: 12,
  fontWeight: 850,
  whiteSpace: 'nowrap',
};

const actionsWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 7,
};

const emptyStateStyle: CSSProperties = {
  padding: '80px 20px',
  textAlign: 'center',
};

const emptyIconStyle: CSSProperties = {
  width: 74,
  height: 74,
  margin: '0 auto 16px',
  borderRadius: 24,
  border: '1px solid #e2e8f0',
  background: '#f8fafc',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const emptyTitleStyle: CSSProperties = {
  fontSize: 17,
  fontWeight: 950,
  color: '#0f172a',
};

const emptySubtitleStyle: CSSProperties = {
  marginTop: 7,
  fontSize: 13,
  fontWeight: 700,
  color: '#94a3b8',
};

const emptyActionStyle: CSSProperties = {
  marginTop: 16,
  height: 38,
  padding: '0 15px',
  borderRadius: 13,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const paginationStyle: CSSProperties = {
  flexShrink: 0,
  padding: '13px 16px',
  borderTop: '1px solid #e8edf4',
  background: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 14,
};

const paginationTextStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 750,
  color: '#64748b',
};

const pageNumberStyle: CSSProperties = {
  minWidth: 78,
  height: 34,
  padding: '0 12px',
  borderRadius: 11,
  border: '1px solid #dbe3ef',
  background: '#f8fafc',
  color: '#334155',
  fontSize: 12.5,
  fontWeight: 900,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(15,23,42,0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 100,
  backdropFilter: 'blur(5px)',
};

const modalCardStyle: CSSProperties = {
  width: 410,
  borderRadius: 24,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  padding: 24,
  boxShadow: '0 24px 60px rgba(15,23,42,0.22)',
};

const deleteIconStyle: CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 16,
  background: '#fef2f2',
  border: '1px solid #fecaca',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const modalTitleStyle: CSSProperties = {
  fontSize: 17,
  fontWeight: 950,
  color: '#0f172a',
};

const modalSubtitleStyle: CSSProperties = {
  marginTop: 3,
  fontSize: 12.5,
  fontWeight: 750,
  color: '#94a3b8',
};

const modalTextStyle: CSSProperties = {
  margin: '0 0 22px',
  fontSize: 13.5,
  fontWeight: 650,
  color: '#475569',
  lineHeight: 1.7,
};

const cancelBtnStyle: CSSProperties = {
  flex: 1,
  height: 42,
  borderRadius: 14,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#475569',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const confirmDeleteBtnStyle: CSSProperties = {
  flex: 1,
  height: 42,
  borderRadius: 14,
  border: 'none',
  background: '#dc2626',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 950,
  cursor: 'pointer',
  fontFamily: 'inherit',
};