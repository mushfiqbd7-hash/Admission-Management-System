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
  Maximize2,
  Minimize2,
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
  if (!status) return '-';
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
    maxWidth: '100%',
    overflow: 'hidden',
  };

  switch (status) {
    case 'pending':
      return { ...base, background: 'var(--status-pending-bg)', color: 'var(--status-pending-text)', border: '1px solid var(--status-pending-border)' };
    case 'approved':
      return { ...base, background: 'var(--status-approved-bg)', color: 'var(--status-approved-text)', border: '1px solid var(--status-approved-border)' };
    case 'processing':
      return { ...base, background: 'var(--status-processing-bg)', color: 'var(--status-processing-text)', border: '1px solid var(--status-processing-border)' };
    case 'pre_admission':
      return { ...base, background: 'var(--status-pre-bg)', color: 'var(--status-pre-text)', border: '1px solid var(--status-pre-border)' };
    case 'admitted':
      return { ...base, background: 'var(--status-admitted-bg)', color: 'var(--status-admitted-text)', border: '1px solid var(--status-admitted-border)' };
    case 'rejected':
      return { ...base, background: 'var(--status-rejected-bg)', color: 'var(--status-rejected-text)', border: '1px solid var(--status-rejected-border)' };
    case 'revoked':
      return { ...base, background: 'var(--status-revoked-bg)', color: 'var(--status-revoked-text)', border: '1px solid var(--status-revoked-border)' };
    case 'draft':
      return { ...base, background: 'var(--ui-surface-subtle)', color: 'var(--ui-text-muted)', border: '1px solid var(--ui-border)' };
    default:
      return { ...base, background: 'var(--ui-surface-subtle)', color: 'var(--ui-text-body)', border: '1px solid var(--ui-border)' };
  }
}

function statusDot(status?: string): CSSProperties {
  const color =
    status === 'pending'
      ? 'var(--status-pending-text)'
      : status === 'approved'
      ? 'var(--status-approved-text)'
      : status === 'processing'
      ? 'var(--status-processing-text)'
      : status === 'pre_admission'
      ? 'var(--status-pre-text)'
      : status === 'admitted'
      ? 'var(--status-admitted-text)'
      : status === 'rejected'
      ? 'var(--status-rejected-text)'
      : status === 'revoked'
      ? 'var(--status-revoked-text)'
      : 'var(--ui-text-subtle)';

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
      ? { color: 'var(--btn-danger-soft-color)', bg: 'var(--btn-danger-soft-bg)', border: 'var(--btn-danger-soft-border)' }
      : tone === 'amber'
      ? { color: 'var(--status-pending-text)', bg: 'var(--status-pending-bg)', border: 'var(--status-pending-border)' }
      : { color: 'var(--btn-subtle-color)', bg: 'var(--btn-subtle-bg)', border: 'var(--btn-subtle-border)' };

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
        border: '1px solid var(--ui-border-strong)',
        background: 'var(--surface)',
        color: 'var(--ui-text-body)',
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
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [status, setStatus] = useState(params.get('status') || '');
  const [priority, setPriority] = useState(params.get('priority') || '');
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullScreen(false);
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    setSearch(params.get('search') || '');
    setStatus(params.get('status') || '');
    setPriority(params.get('priority') || '');
    setPage(1);
  }, [params]);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const queryParams = {
    search: debouncedSearch.trim(),
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
  const limit = data?.pagination?.limit ?? 20;
  const students = data?.data ?? [];
  const colCount = canSeeAll ? 10 : 9;

  return (
    <div style={isFullScreen ? fullScreenStyle : pageStyle}>
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {canSeeAll && (
            <button
              style={fullScreenBtnStyle}
              onClick={() => setIsFullScreen((v) => !v)}
              title={isFullScreen ? 'Exit full screen (Esc)' : 'Full screen'}
            >
              {isFullScreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              {isFullScreen ? 'Exit' : 'Full Screen'}
            </button>
          )}

          <button style={addBtnStyle} onClick={() => navigate('/students/new')}>
            <Plus size={16} />
            {canSeeAll ? 'Add Student' : 'New Application'}
          </button>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={filterBarStyle}>
          <div style={searchBoxStyle}>
            <Search
              size={15}
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ui-text-subtle)',
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

        {hasFilters && (
          <div style={activeFilterBarStyle}>
            <Filter size={14} style={{ color: 'var(--ui-text-muted)' }} />

            <span style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--ui-text-muted)' }}>
              Active filters:
            </span>

            {search && <span style={filterChipStyle}>Search: {search}</span>}

            {status && <span style={filterChipStyle}>Status: {statusLabel(status)}</span>}

            {priority && <span style={filterChipStyle}>Priority: {priority}</span>}
          </div>
        )}

        <div style={isFullScreen ? tableWrapFullStyle : tableWrapStyle}>
          <table style={isFullScreen ? tableFullStyle : tableStyle}>
            <thead>
              <tr>
                {[
                  ['App No.', 150],
                  ...(canSeeAll ? [['Submitted By', 185]] : []),
                  ['Passport No.', 130],
                  ['Student', 200],
                  ['Nationality', 125],
                  ['University', 190],
                  ['Degree', 150],
                  ['Status', 150],
                  ['Priority', 110],
                  ['Actions', 190],
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
                            background: 'var(--ui-border)',
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

                  const canDeleteRow = canSeeAll || student.application_status === 'draft';

                  return (
                    <tr key={student.id} style={rowStyle}>
                      <td style={firstTdStyle}>
                        <span style={appNoStyle}>{student.application_number || '-'}</span>
                      </td>

                      {canSeeAll && (
                        <td style={bodyTdStyle}>
                          <div style={strongTextStyle}>{sAny.submitted_by_name || '-'}</div>

                          {sAny.submitted_by_role && (
                            <div style={smallMutedStyle}>
                              {sAny.submitted_by_role.charAt(0).toUpperCase() + sAny.submitted_by_role.slice(1)}
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
                        <span style={monoTextStyle}>{student.passport_number || '-'}</span>
                      </td>

                      <td style={bodyTdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, overflow: 'hidden' }}>
                          <div style={studentAvatarStyle}>
                            <UserRound size={15} />
                          </div>

                          <div style={{ minWidth: 0, overflow: 'hidden', flex: 1 }}>
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
                        <span style={normalTextStyle}>{student.nationality || '-'}</span>
                      </td>

                      <td style={bodyTdStyle}>
                        <div style={lineClampStyle} title={student.target_university || '-'}>
                          {student.target_university || '-'}
                        </div>
                      </td>

                      <td style={bodyTdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <GraduationCap size={15} style={{ color: 'var(--ui-text-subtle)', flexShrink: 0 }} />

                          <span style={normalTextStyle}>
                            {student.degree_level ? DEGREE_LABELS[student.degree_level] : '-'}
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

                          {canDeleteRow && (
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
                <FileText size={34} style={{ color: 'var(--ui-text-subtle)' }} />
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

        {data && totalPages > 1 && (
          <div style={paginationStyle}>
            <div style={paginationTextStyle}>
              Showing {(page - 1) * limit + 1}-{Math.min(page * limit, total)} of{' '}
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

      {deleteId && (
        <div style={modalOverlayStyle}>
          <div style={modalCardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
              <div style={deleteIconStyle}>
                <Trash2 size={20} style={{ color: 'var(--btn-danger-soft-color)' }} />
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

const pageStyle: CSSProperties = {
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  padding: '18px 24px 22px',
  background:
    'radial-gradient(circle at top left, rgba(37,99,235,0.055), transparent 34%), linear-gradient(180deg, var(--ui-surface-subtle) 0%, var(--surface-muted) 100%)',
};

const headerCardStyle: CSSProperties = {
  flexShrink: 0,
  marginBottom: 16,
  padding: '20px 22px',
  borderRadius: 24,
  border: '1px solid var(--ui-border)',
  background: 'var(--surface-soft)',
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
  border: '1px solid var(--status-processing-border)',
  background: 'var(--accent-light)',
  color: 'var(--btn-subtle-color)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const pageTitleStyle: CSSProperties = {
  fontSize: 22,
  fontWeight: 950,
  color: 'var(--text-primary)',
  letterSpacing: '-0.045em',
};

const pageSubtitleStyle: CSSProperties = {
  marginTop: 4,
  display: 'flex',
  alignItems: 'center',
  gap: 7,
  fontSize: 13,
  fontWeight: 750,
  color: 'var(--ui-text-muted)',
};

const addBtnStyle: CSSProperties = {
  height: 44,
  padding: '0 18px',
  borderRadius: 14,
  border: 'none',
  background: 'var(--btn-primary-bg)',
  color: 'var(--btn-primary-color)',
  fontSize: 13.5,
  fontWeight: 950,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  boxShadow: 'var(--btn-primary-shadow)',
  whiteSpace: 'nowrap',
};

const cardStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  borderRadius: 24,
  border: '1px solid var(--ui-border)',
  background: 'var(--surface)',
  boxShadow: '0 18px 42px rgba(15,23,42,0.055)',
  display: 'flex',
  flexDirection: 'column',
};

const filterBarStyle: CSSProperties = {
  flexShrink: 0,
  padding: 16,
  borderBottom: '1px solid var(--ui-border-soft)',
  background: 'var(--surface)',
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
  border: '1px solid var(--ui-border-strong)',
  background: 'var(--surface)',
  padding: '0 38px 0 40px',
  outline: 'none',
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--ui-text-strong)',
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
  color: 'var(--ui-text-subtle)',
  cursor: 'pointer',
  display: 'inline-flex',
  padding: 0,
};

const selectStyle: CSSProperties = {
  width: '100%',
  height: 42,
  borderRadius: 14,
  border: '1px solid var(--ui-border-strong)',
  background: 'var(--surface)',
  padding: '0 13px',
  outline: 'none',
  fontSize: 13,
  fontWeight: 800,
  color: 'var(--ui-text-strong)',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const clearFilterBtnStyle: CSSProperties = {
  height: 42,
  padding: '0 14px',
  borderRadius: 14,
  border: '1px solid var(--status-rejected-border)',
  background: 'var(--status-rejected-bg)',
  color: 'var(--btn-danger-soft-color)',
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
  background: 'var(--ui-surface-subtle)',
  borderBottom: '1px solid var(--ui-border-soft)',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const filterChipStyle: CSSProperties = {
  height: 26,
  borderRadius: 999,
  border: '1px solid var(--status-processing-border)',
  background: 'var(--accent-light)',
  color: 'var(--btn-subtle-color)',
  display: 'inline-flex',
  alignItems: 'center',
  padding: '0 10px',
  fontSize: 12,
  fontWeight: 900,
};

const tableWrapStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overflowX: 'hidden',
  padding: '0 12px 12px',
};

const tableStyle: CSSProperties = {
  width: '100%',
  tableLayout: 'fixed',
  borderCollapse: 'separate',
  borderSpacing: '0 10px',
  fontSize: 13,
};

const fullScreenStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 9999,
  display: 'flex',
  flexDirection: 'column',
  padding: '18px 24px 22px',
  background: 'radial-gradient(circle at top left, rgba(37,99,235,0.055), transparent 34%), linear-gradient(180deg, var(--ui-surface-subtle) 0%, var(--surface-muted) 100%)',
};

const fullScreenBtnStyle: CSSProperties = {
  height: 44,
  padding: '0 16px',
  borderRadius: 14,
  border: '1px solid var(--ui-border)',
  background: 'var(--surface)',
  color: 'var(--ui-text-body)',
  fontSize: 13.5,
  fontWeight: 650,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  boxShadow: '0 2px 8px rgba(15,23,42,0.08)',
};

const tableWrapFullStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  padding: '0 12px 12px',
};

const tableFullStyle: CSSProperties = {
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
  background: 'var(--ui-surface-subtle)',
  borderTop: '1px solid var(--ui-border)',
  borderBottom: '1px solid var(--ui-border)',
  padding: '13px 14px',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 950,
  color: 'var(--ui-text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.065em',
  whiteSpace: 'nowrap',
};

const rowStyle: CSSProperties = {
  background: 'var(--surface)',
  boxShadow: '0 8px 20px rgba(15,23,42,0.04)',
};

const bodyTdStyle: CSSProperties = {
  padding: '16px 14px',
  background: 'var(--surface)',
  borderTop: '1px solid var(--ui-border-soft)',
  borderBottom: '1px solid var(--ui-border-soft)',
  verticalAlign: 'middle',
};

const firstTdStyle: CSSProperties = {
  ...bodyTdStyle,
  borderTopLeftRadius: 18,
  borderBottomLeftRadius: 18,
  borderLeft: '1px solid var(--ui-border-soft)',
};

const lastTdStyle: CSSProperties = {
  ...bodyTdStyle,
  borderTopRightRadius: 18,
  borderBottomRightRadius: 18,
  borderRight: '1px solid var(--ui-border-soft)',
};

const appNoStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  maxWidth: '100%',
  overflow: 'hidden',
  padding: '5px 9px',
  borderRadius: 999,
  border: '1px solid var(--status-processing-border)',
  background: 'var(--accent-light)',
  color: 'var(--btn-subtle-color)',
  fontSize: 11.5,
  fontWeight: 950,
  fontFamily: 'Inter, sans-serif',
  whiteSpace: 'nowrap',
  textOverflow: 'ellipsis',
};

const strongTextStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 900,
  color: 'var(--text-primary)',
  lineHeight: 1.35,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const smallMutedStyle: CSSProperties = {
  marginTop: 2,
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--ui-text-subtle)',
  lineHeight: 1.35,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '100%',
};

const monoTextStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 800,
  color: 'var(--ui-text-body)',
  fontFamily: 'Inter, sans-serif',
  whiteSpace: 'nowrap',
};

const normalTextStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 750,
  color: 'var(--ui-text-body)',
  lineHeight: 1.45,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  maxWidth: '100%',
};

const studentAvatarStyle: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 12,
  border: '1px solid var(--ui-border)',
  background: 'var(--ui-surface-subtle)',
  color: 'var(--ui-text-muted)',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const studentNameStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 950,
  color: 'var(--text-primary)',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const lineClampStyle: CSSProperties = {
  maxWidth: '100%',
  fontSize: 12.5,
  fontWeight: 750,
  color: 'var(--ui-text-body)',
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
  border: '1px solid var(--status-rejected-border)',
  background: 'var(--status-rejected-bg)',
  color: 'var(--btn-danger-soft-color)',
  fontSize: 12,
  fontWeight: 950,
  whiteSpace: 'nowrap',
  maxWidth: '100%',
  overflow: 'hidden',
};

const priorityNormalStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  height: 28,
  padding: '0 10px',
  borderRadius: 999,
  border: '1px solid var(--ui-border)',
  background: 'var(--ui-surface-subtle)',
  color: 'var(--ui-text-muted)',
  fontSize: 12,
  fontWeight: 850,
  whiteSpace: 'nowrap',
  maxWidth: '100%',
  overflow: 'hidden',
};

const actionsWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-start',
  gap: 5,
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
  border: '1px solid var(--ui-border)',
  background: 'var(--ui-surface-subtle)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const emptyTitleStyle: CSSProperties = {
  fontSize: 17,
  fontWeight: 950,
  color: 'var(--text-primary)',
};

const emptySubtitleStyle: CSSProperties = {
  marginTop: 7,
  fontSize: 13,
  fontWeight: 700,
  color: 'var(--ui-text-subtle)',
};

const emptyActionStyle: CSSProperties = {
  marginTop: 16,
  height: 38,
  padding: '0 15px',
  borderRadius: 13,
  border: '1px solid var(--status-processing-border)',
  background: 'var(--accent-light)',
  color: 'var(--btn-subtle-color)',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const paginationStyle: CSSProperties = {
  flexShrink: 0,
  padding: '13px 16px',
  borderTop: '1px solid var(--ui-border-soft)',
  background: 'var(--surface)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 14,
};

const paginationTextStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 750,
  color: 'var(--ui-text-muted)',
};

const pageNumberStyle: CSSProperties = {
  minWidth: 78,
  height: 34,
  padding: '0 12px',
  borderRadius: 11,
  border: '1px solid var(--ui-border-strong)',
  background: 'var(--ui-surface-subtle)',
  color: 'var(--ui-text-strong)',
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
  border: '1px solid var(--ui-border)',
  background: 'var(--surface)',
  padding: 24,
  boxShadow: '0 24px 60px rgba(15,23,42,0.22)',
};

const deleteIconStyle: CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 16,
  background: 'var(--status-rejected-bg)',
  border: '1px solid var(--status-rejected-border)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const modalTitleStyle: CSSProperties = {
  fontSize: 17,
  fontWeight: 950,
  color: 'var(--text-primary)',
};

const modalSubtitleStyle: CSSProperties = {
  marginTop: 3,
  fontSize: 12.5,
  fontWeight: 750,
  color: 'var(--ui-text-subtle)',
};

const modalTextStyle: CSSProperties = {
  margin: '0 0 22px',
  fontSize: 13.5,
  fontWeight: 650,
  color: 'var(--ui-text-body)',
  lineHeight: 1.7,
};

const cancelBtnStyle: CSSProperties = {
  flex: 1,
  height: 42,
  borderRadius: 14,
  border: '1px solid var(--ui-border)',
  background: 'var(--surface)',
  color: 'var(--ui-text-body)',
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
  background: 'var(--btn-danger-bg)',
  color: 'var(--btn-danger-color)',
  fontSize: 13,
  fontWeight: 950,
  cursor: 'pointer',
  fontFamily: 'inherit',
};
