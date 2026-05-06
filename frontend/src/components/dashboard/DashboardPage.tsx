// src/components/dashboard/DashboardPage.tsx
import { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  GraduationCap,
  Search,
  Eye,
  Bell,
  FileText,
  ChevronRight,
  ChevronLeft,
  Users,
  TrendingUp,
  Activity,
  X,
  Plus,
} from 'lucide-react';
import { studentsApi, messagesApi } from '@/api/client';
import { STATUS_LABELS } from '@/types';
import type { Student, Notification } from '@/types';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

type StatsView = {
  total?: string | number;
  pending?: string | number;
  approved?: string | number;
  rejected?: string | number;
  processing?: string | number;
  pre_admission?: string | number;
  admitted?: string | number;
  revoked?: string | number;
  high_priority?: string | number;
};

interface StatsResponse {
  stats: StatsView;
  recent: Student[];
}

const n = (v: unknown) => Number(v ?? 0);

const timeAgo = (dt?: string) => {
  if (!dt) return '';

  const diff = Date.now() - new Date(dt).getTime();
  const m = Math.floor(diff / 60000);

  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;

  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;

  return `${Math.floor(h / 24)}d ago`;
};

const statusStyle = (
  s: string
): { bg: string; text: string; dot: string; border: string } =>
  ({
    pending: {
      bg: '#fff7ed',
      text: '#c2410c',
      dot: '#f97316',
      border: '#fed7aa',
    },
    processing: {
      bg: '#eef2ff',
      text: '#4338ca',
      dot: '#6366f1',
      border: '#c7d2fe',
    },
    pre_admission: {
      bg: '#ecfeff',
      text: '#0e7490',
      dot: '#06b6d4',
      border: '#a5f3fc',
    },
    approved: {
      bg: '#f0fdf4',
      text: '#15803d',
      dot: '#22c55e',
      border: '#bbf7d0',
    },
    admitted: {
      bg: '#f0fdfa',
      text: '#0f766e',
      dot: '#14b8a6',
      border: '#99f6e4',
    },
    rejected: {
      bg: '#fef2f2',
      text: '#dc2626',
      dot: '#ef4444',
      border: '#fecaca',
    },
    revoked: {
      bg: '#fff7ed',
      text: '#c2410c',
      dot: '#fb923c',
      border: '#fed7aa',
    },
    draft: {
      bg: '#f8fafc',
      text: '#64748b',
      dot: '#94a3b8',
      border: '#e2e8f0',
    },
  })[s] || {
    bg: '#f8fafc',
    text: '#334155',
    dot: '#94a3b8',
    border: '#e2e8f0',
  };

const getSubmitter = (s: Student) => {
  const r = s as Student & {
    submitted_by_role?: string;
    submitted_by_name?: string;
  };

  if (r.submitted_by_name) return r.submitted_by_name;

  if (r.submitted_by_role) {
    return r.submitted_by_role.charAt(0).toUpperCase() + r.submitted_by_role.slice(1);
  }

  return '—';
};

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
  onClick,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>;
  color: string;
  bg: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={statCardStyle}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 18px 36px rgba(15,23,42,0.09)';
        e.currentTarget.style.borderColor = '#cbd5e1';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 10px 24px rgba(15,23,42,0.055)';
        e.currentTarget.style.borderColor = '#e5eaf2';
      }}
    >
      <div
        style={{
          ...statGlowStyle,
          background: color,
        }}
      />

      <div style={statCardInnerStyle}>
        <div style={statCardTopStyle}>
          <div
            style={{
              ...statIconBoxStyle,
              background: bg,
            }}
          >
            <Icon size={18} style={{ color }} />
          </div>

          <div style={statChevronBoxStyle}>
            <ChevronRight size={15} style={{ color: '#b8c3d4' }} />
          </div>
        </div>

        <div style={statValueBlockStyle}>
          <div style={statNumberStyle}>{value}</div>
        </div>

        <div style={statFooterStyle}>
          <span style={statLabelStyle}>{label}</span>
          <span
            style={{
              ...statAccentPillStyle,
              background: color,
            }}
          />
        </div>
      </div>
    </button>
  );
}

function Panel({
  title,
  subtitle,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ComponentType<{ size: number; style?: React.CSSProperties }>;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div style={panelStyle}>
      <div style={panelHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          <div style={panelIconStyle}>
            <Icon size={16} style={{ color: '#2563eb' }} />
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={panelTitleStyle}>{title}</div>
            {subtitle && <div style={panelSubtitleStyle}>{subtitle}</div>}
          </div>
        </div>

        {action && <div style={{ flexShrink: 0 }}>{action}</div>}
      </div>

      {children}
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={emptyStateStyle}>
      <div style={emptyIconStyle}>
        <FileText size={18} style={{ color: '#cbd5e1' }} />
      </div>
      <div style={{ fontSize: 12 }}>{text}</div>
    </div>
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
        minWidth: 28,
        height: 28,
        padding: '0 8px',
        borderRadius: 9,
        border: `1px solid ${active ? '#2563eb' : '#e2e8f0'}`,
        background: active ? '#2563eb' : '#ffffff',
        color: active ? '#ffffff' : '#64748b',
        fontSize: 11.5,
        fontWeight: 800,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const canSeeAdminDashboard = user?.role === 'admin' || user?.role === 'staff';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [submittedByFilter, setSubmittedByFilter] = useState('all');
  const [intakeFilter, setIntakeFilter] = useState('all');
  const [page, setPage] = useState(1);

  const pageSize = 3;

  const { data, isLoading } = useQuery<StatsResponse>({
    queryKey: ['dashboard-stats'],
    queryFn: () => studentsApi.getStats().then((r) => r.data),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const { data: notifData = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => messagesApi.notifications().then((r) => r.data),
    refetchInterval: 15000,
    refetchOnWindowFocus: true,
  });

  const stats = data?.stats;

  const statCards = [
    {
      label: 'Total',
      value: n(stats?.total),
      icon: FileText,
      color: '#2563eb',
      bg: '#eff6ff',
      filter: null,
    },
    {
      label: 'Pending',
      value: n(stats?.pending),
      icon: Clock,
      color: '#f97316',
      bg: '#fff7ed',
      filter: 'pending',
    },
    {
      label: 'Approved',
      value: n(stats?.approved),
      icon: CheckCircle,
      color: '#16a34a',
      bg: '#f0fdf4',
      filter: 'approved',
    },
    {
      label: 'Rejected',
      value: n(stats?.rejected),
      icon: XCircle,
      color: '#dc2626',
      bg: '#fef2f2',
      filter: 'rejected',
    },
    {
      label: 'Processing',
      value: n(stats?.processing),
      icon: Loader2,
      color: '#4f46e5',
      bg: '#eef2ff',
      filter: 'processing',
    },
    {
      label: 'Pre Admission',
      value: n(stats?.pre_admission),
      icon: Users,
      color: '#0891b2',
      bg: '#ecfeff',
      filter: 'pre_admission',
    },
    {
      label: 'Admitted',
      value: n(stats?.admitted),
      icon: GraduationCap,
      color: '#0f766e',
      bg: '#f0fdfa',
      filter: 'admitted',
    },
  ];

  const filteredRows = useMemo(() => {
    const rows = data?.recent || [];
    const q = search.trim().toLowerCase();

    return rows.filter((s) => {
      const row = s as Student & {
        submitted_by_role?: string;
        submitted_by_name?: string;
      };

      const name = `${s.given_name || ''} ${s.family_name || ''}`.toLowerCase();
      const role = String(row.submitted_by_role || '').toLowerCase();
      const submitter = String(row.submitted_by_name || '').toLowerCase();
      const intake = String(s.intended_start_term || '').toLowerCase();

      const matchSearch =
        !q ||
        name.includes(q) ||
        String(s.application_number || '').toLowerCase().includes(q) ||
        String(s.passport_number || '').toLowerCase().includes(q) ||
        String(s.target_university || '').toLowerCase().includes(q) ||
        String(s.intended_major || '').toLowerCase().includes(q) ||
        role.includes(q) ||
        submitter.includes(q);

      const matchStatus = statusFilter === 'all' || s.application_status === statusFilter;
      const matchBy = submittedByFilter === 'all' || role === submittedByFilter;
      const matchIntake = intakeFilter === 'all' || intake === intakeFilter.toLowerCase();

      return matchSearch && matchStatus && matchBy && matchIntake;
    });
  }, [data?.recent, search, statusFilter, submittedByFilter, intakeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const recentActivity = (data?.recent || []).slice(0, 2);
  const dashNotifs = notifData.slice(0, 2);
  const unreadNotifs = notifData.filter((item) => !item.is_read).length;

  const hasFilters =
    search || statusFilter !== 'all' || submittedByFilter !== 'all' || intakeFilter !== 'all';

  return (
    <div style={dashboardPageStyle}>
      <div style={dashboardSoftGlowStyle} />

      {/* Stats */}
      <div style={statsGridStyle}>
        {statCards.map((item) => (
          <StatCard
            key={item.label}
            label={item.label}
            value={isLoading ? '—' : item.value}
            icon={item.icon}
            color={item.color}
            bg={item.bg}
            onClick={() => navigate(item.filter ? `/students?status=${item.filter}` : '/students')}
          />
        ))}
      </div>

      {/* Main */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'hidden',
          display: 'grid',
          gridTemplateColumns: canSeeAdminDashboard ? 'minmax(0, 1fr) 360px' : '1fr',
          gap: 14,
          alignItems: 'start',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Applications */}
        <Panel
          title="Applications"
          subtitle={`${filteredRows.length} record${filteredRows.length !== 1 ? 's' : ''} visible`}
          icon={TrendingUp}
          action={
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {hasFilters && (
                <button
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('all');
                    setSubmittedByFilter('all');
                    setIntakeFilter('all');
                    setPage(1);
                  }}
                  style={clearBtn}
                >
                  <X size={12} />
                  Clear
                </button>
              )}

              <button onClick={() => navigate('/students/new')} style={newApplicationBtn}>
                <Plus size={14} />
                New Application
              </button>
            </div>
          }
        >
          {/* Filters */}
          <div style={filterGridStyle}>
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: 13,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#cbd5e1',
                }}
              />

              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search applications..."
                style={searchInputStyle}
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={selectStyle}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="processing">Processing</option>
              <option value="pre_admission">Pre Admission</option>
              <option value="admitted">Admitted</option>
              <option value="rejected">Rejected</option>
              <option value="revoked">Revoked</option>
            </select>

            <select
              value={submittedByFilter}
              onChange={(e) => {
                setSubmittedByFilter(e.target.value);
                setPage(1);
              }}
              style={selectStyle}
            >
              <option value="all">Submitted By</option>
              <option value="student">Student</option>
              <option value="agent">Agent</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>

            <select
              value={intakeFilter}
              onChange={(e) => {
                setIntakeFilter(e.target.value);
                setPage(1);
              }}
              style={selectStyle}
            >
              <option value="all">All Intakes</option>
              <option value="March">March</option>
              <option value="September">September</option>
            </select>
          </div>

          {/* Table */}
          <div style={{ width: '100%', overflow: 'hidden' }}>
            <table style={tableStyle}>
              <colgroup>
                <col style={{ width: '16%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '16%' }} />
                <col style={{ width: '14%' }} />
              </colgroup>

              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['App No.', 'Submitted By', 'Student', 'University', 'Status', 'Action'].map(
                    (h) => (
                      <th key={h} style={thStyle}>
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 6 }).map((_, j) => (
                        <td key={j} style={tdStyle}>
                          <div
                            style={{
                              height: 12,
                              width: j === 2 ? 100 : 72,
                              background: '#eef2f7',
                              borderRadius: 8,
                            }}
                          />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState text="No applications found." />
                    </td>
                  </tr>
                ) : (
                  pageRows.map((s) => {
                    const st = statusStyle(s.application_status);

                    return (
                      <tr
                        key={s.id}
                        style={{
                          borderBottom: '1px solid #eef2f7',
                          transition: 'background 0.12s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fbfdff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <td style={tdStyle}>
                          <span style={appNoBadgeStyle}>{s.application_number || '—'}</span>
                        </td>

                        <td style={tdStyle}>
                          <div style={textStrongStyle}>{getSubmitter(s)}</div>
                        </td>

                        <td style={tdStyle}>
                          <div style={studentNameStyle}>
                            {s.given_name} {s.family_name}
                          </div>
                          {s.email && <div style={smallMutedLineStyle}>{s.email}</div>}
                        </td>

                        <td style={tdStyle}>
                          <div style={mutedTruncateStyle}>{s.target_university || '—'}</div>
                        </td>

                        <td style={tdStyle}>
                          <span
                            style={{
                              ...statusBadgeStyle,
                              background: st.bg,
                              color: st.text,
                              border: `1px solid ${st.border}`,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: st.dot,
                                flexShrink: 0,
                              }}
                            />
                            {STATUS_LABELS[s.application_status] || s.application_status}
                          </span>
                        </td>

                        <td style={actionTdStyle}>
                          <button onClick={() => navigate(`/students/${s.id}`)} style={viewBtn}>
                            <Eye size={12} />
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
          <div style={tableFooterStyle}>
            <span style={{ fontSize: 11.5, color: '#94a3b8', fontWeight: 800 }}>
              {filteredRows.length === 0
                ? '0 entries'
                : `${(safePage - 1) * pageSize + 1}–${Math.min(
                    safePage * pageSize,
                    filteredRows.length
                  )} of ${filteredRows.length}`}
            </span>

            {totalPages > 1 && (
              <div style={{ display: 'flex', gap: 5 }}>
                <PagBtn
                  disabled={safePage === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft size={13} />
                </PagBtn>

                {Array.from({ length: Math.min(totalPages, 4) }).map((_, i) => {
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
                  <ChevronRight size={13} />
                </PagBtn>
              </div>
            )}
          </div>
        </Panel>

        {/* Right column */}
        {canSeeAdminDashboard && (
          <div style={rightColumnStyle}>
            <Panel
              title="Recent Activity"
              subtitle="Latest 2 updates"
              icon={Activity}
              action={
                <button onClick={() => navigate('/students')} style={linkBtn}>
                  View All <ChevronRight size={13} />
                </button>
              }
            >
              <div style={{ padding: '6px 0' }}>
                {recentActivity.length === 0 ? (
                  <EmptyState text="No recent activity." />
                ) : (
                  recentActivity.map((s) => {
                    const st = statusStyle(s.application_status);

                    return (
                      <button
                        key={s.id}
                        onClick={() => navigate(`/students/${s.id}`)}
                        style={sideItemBtnStyle}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#fbfdff';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                          <div style={sideIconStyle}>
                            <FileText size={14} style={{ color: '#2563eb' }} />
                          </div>

                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={sideTitleStyle}>
                              {s.given_name} {s.family_name}
                            </div>

                            <div style={sideAppNoStyle}>{s.application_number || '—'}</div>

                            <span
                              style={{
                                marginTop: 6,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 4,
                                fontSize: 10.5,
                                fontWeight: 900,
                                color: st.text,
                                background: st.bg,
                                border: `1px solid ${st.border}`,
                                padding: '2px 8px',
                                borderRadius: 999,
                              }}
                            >
                              <span
                                style={{
                                  width: 5,
                                  height: 5,
                                  borderRadius: '50%',
                                  background: st.dot,
                                }}
                              />
                              {STATUS_LABELS[s.application_status] || s.application_status}
                            </span>
                          </div>

                          <div style={sideTimeStyle}>{timeAgo(s.created_at)}</div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </Panel>

            <Panel
              title="Notifications"
              subtitle={`${unreadNotifs} unread · latest 2 shown`}
              icon={Bell}
              action={
                <button onClick={() => navigate('/inbox?tab=notifications')} style={linkBtn}>
                  View All <ChevronRight size={13} />
                </button>
              }
            >
              <div style={{ padding: '6px 0' }}>
                {dashNotifs.length === 0 ? (
                  <EmptyState text="No notifications yet." />
                ) : (
                  dashNotifs.map((item) => (
                    <button
                      key={item.id}
                      onClick={() =>
                        navigate(
                          item.link ||
                            (item.application_id ? `/students/${item.application_id}` : '/inbox')
                        )
                      }
                      style={{
                        ...sideItemBtnStyle,
                        background: item.is_read ? 'transparent' : '#f8fbff',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                        <span
                          style={{
                            width: 7,
                            height: 7,
                            borderRadius: '50%',
                            background: item.is_read ? '#cbd5e1' : '#2563eb',
                            marginTop: 6,
                            flexShrink: 0,
                          }}
                        />

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={notificationMessageStyle}>{item.message}</div>

                          {item.application_id && (
                            <div style={sideAppNoStyle}>{item.application_id}</div>
                          )}
                        </div>

                        <div style={sideTimeStyle}>{timeAgo(item.created_at)}</div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Styles ───────────────────────── */

const dashboardPageStyle: React.CSSProperties = {
  position: 'relative',
  height: '100%',
  minHeight: 0,
  background:
    'radial-gradient(circle at top left, rgba(37,99,235,0.08), transparent 34%), linear-gradient(180deg, #f7f9fc 0%, #eef3f9 100%)',
  padding: '14px 16px 16px',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const dashboardSoftGlowStyle: React.CSSProperties = {
  position: 'absolute',
  top: -120,
  right: 80,
  width: 360,
  height: 220,
  borderRadius: '50%',
  background: 'rgba(37, 99, 235, 0.08)',
  filter: 'blur(45px)',
  pointerEvents: 'none',
};

const statsGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
  gap: 12,
  marginBottom: 16,
  flexShrink: 0,
  position: 'relative',
  zIndex: 1,
};

const statCardStyle: React.CSSProperties = {
  position: 'relative',
  background:
    'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,250,252,0.96) 100%)',
  border: '1px solid #e5eaf2',
  borderRadius: 20,
  padding: 0,
  height: 132,
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 10px 24px rgba(15,23,42,0.055)',
  transition: 'transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease',
  overflow: 'hidden',
  backdropFilter: 'blur(12px)',
};

const statGlowStyle: React.CSSProperties = {
  position: 'absolute',
  right: -42,
  top: -46,
  width: 104,
  height: 104,
  borderRadius: '50%',
  opacity: 0.1,
  filter: 'blur(4px)',
};

const statCardInnerStyle: React.CSSProperties = {
  position: 'relative',
  zIndex: 1,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
  padding: '16px 16px 14px',
};

const statCardTopStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const statIconBoxStyle: React.CSSProperties = {
  width: 40,
  height: 40,
  borderRadius: 14,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.72)',
  flexShrink: 0,
};

const statChevronBoxStyle: React.CSSProperties = {
  width: 30,
  height: 30,
  borderRadius: 11,
  background: '#f8fafc',
  border: '1px solid #edf2f7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const statValueBlockStyle: React.CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  paddingTop: 8,
  paddingBottom: 4,
};

const statNumberStyle: React.CSSProperties = {
  fontSize: 36,
  lineHeight: 1,
  fontWeight: 950,
  color: '#0f172a',
  letterSpacing: '-0.06em',
};

const statFooterStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 8,
  minHeight: 20,
};

const statLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 900,
  color: '#8b9ab2',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  lineHeight: 1,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const statAccentPillStyle: React.CSSProperties = {
  width: 24,
  height: 4,
  borderRadius: 999,
  opacity: 0.78,
  flexShrink: 0,
};

const panelStyle: React.CSSProperties = {
  minHeight: 0,
  background: 'rgba(255,255,255,0.92)',
  border: '1px solid #e5eaf2',
  borderRadius: 22,
  overflow: 'hidden',
  boxShadow: '0 16px 38px rgba(15,23,42,0.075)',
  display: 'flex',
  flexDirection: 'column',
  backdropFilter: 'blur(14px)',
};

const panelHeaderStyle: React.CSSProperties = {
  padding: '16px 18px',
  borderBottom: '1px solid #edf2f7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  flexShrink: 0,
};

const panelIconStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
  background: '#eff6ff',
  border: '1px solid #dbeafe',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const panelTitleStyle: React.CSSProperties = {
  fontSize: 15,
  fontWeight: 900,
  color: '#0f172a',
};

const panelSubtitleStyle: React.CSSProperties = {
  fontSize: 11.5,
  color: '#94a3b8',
  marginTop: 2,
};

const filterGridStyle: React.CSSProperties = {
  padding: 12,
  background: '#fbfdff',
  borderBottom: '1px solid #edf2f7',
  display: 'grid',
  gridTemplateColumns: 'minmax(220px, 1fr) 145px 155px 145px',
  gap: 10,
  flexShrink: 0,
};

const searchInputStyle: React.CSSProperties = {
  width: '100%',
  height: 42,
  paddingLeft: 39,
  paddingRight: 12,
  borderRadius: 14,
  border: '1px solid #dbe3ef',
  outline: 'none',
  background: '#ffffff',
  fontSize: 13,
  color: '#334155',
  fontFamily: 'inherit',
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  height: 42,
  borderRadius: 14,
  border: '1px solid #dbe3ef',
  background: '#ffffff',
  padding: '0 12px',
  outline: 'none',
  fontSize: 12.5,
  color: '#334155',
  fontFamily: 'inherit',
  cursor: 'pointer',
};

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
};

const thStyle: React.CSSProperties = {
  padding: '11px 14px',
  textAlign: 'left',
  fontSize: 10.5,
  fontWeight: 900,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  borderBottom: '1px solid #e8edf4',
  whiteSpace: 'nowrap',
};

const tdStyle: React.CSSProperties = {
  padding: '12px 12px',
  verticalAlign: 'middle',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const actionTdStyle: React.CSSProperties = {
  padding: '10px 12px',
  verticalAlign: 'middle',
  overflow: 'visible',
  whiteSpace: 'nowrap',
};

const clearBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#dc2626',
  borderRadius: 10,
  padding: '7px 10px',
  fontSize: 12,
  fontWeight: 800,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const newApplicationBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 7,
  border: 'none',
  background: 'linear-gradient(135deg, #1e3a5f 0%, #1d4ed8 100%)',
  color: '#ffffff',
  borderRadius: 14,
  padding: '10px 16px',
  fontSize: 12.5,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 10px 22px rgba(30,58,95,0.22)',
  whiteSpace: 'nowrap',
};

const appNoBadgeStyle: React.CSSProperties = {
  fontFamily: 'DM Mono, monospace',
  fontSize: 11,
  fontWeight: 900,
  color: '#1d4ed8',
  background: '#eff6ff',
  border: '1px solid #bfdbfe',
  borderRadius: 9,
  padding: '5px 8px',
  whiteSpace: 'nowrap',
  display: 'inline-block',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const textStrongStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 800,
  color: '#334155',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const studentNameStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 900,
  color: '#0f172a',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const smallMutedLineStyle: React.CSSProperties = {
  fontSize: 10.5,
  color: '#94a3b8',
  marginTop: 2,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const mutedTruncateStyle: React.CSSProperties = {
  fontSize: 12,
  color: '#64748b',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const statusBadgeStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '5px 10px',
  borderRadius: 999,
  fontSize: 11,
  fontWeight: 900,
  whiteSpace: 'nowrap',
  maxWidth: '100%',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const viewBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  minWidth: 72,
  height: 32,
  padding: '0 10px',
  borderRadius: 10,
  border: '1px solid #bfdbfe',
  background: '#eff6ff',
  color: '#1d4ed8',
  fontSize: 11.5,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
};

const tableFooterStyle: React.CSSProperties = {
  padding: '12px 14px',
  borderTop: '1px solid #edf2f7',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 10,
  flexShrink: 0,
};

const rightColumnStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 14,
  minHeight: 0,
  overflow: 'hidden',
};

const emptyStateStyle: React.CSSProperties = {
  padding: '22px 16px',
  textAlign: 'center',
  color: '#94a3b8',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 8,
};

const emptyIconStyle: React.CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 14,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const linkBtn: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 3,
  border: 'none',
  background: 'transparent',
  color: '#2563eb',
  fontSize: 11.5,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
};

const sideItemBtnStyle: React.CSSProperties = {
  width: '100%',
  border: 'none',
  background: 'transparent',
  padding: '12px 16px',
  textAlign: 'left',
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const sideIconStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
  background: '#eff6ff',
  border: '1px solid #dbeafe',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const sideTitleStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 900,
  color: '#0f172a',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const sideAppNoStyle: React.CSSProperties = {
  fontSize: 10.5,
  fontFamily: 'DM Mono, monospace',
  color: '#2563eb',
  marginTop: 3,
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const notificationMessageStyle: React.CSSProperties = {
  fontSize: 12.5,
  fontWeight: 800,
  color: '#334155',
  lineHeight: 1.4,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const sideTimeStyle: React.CSSProperties = {
  fontSize: 10.5,
  color: '#cbd5e1',
  flexShrink: 0,
  paddingLeft: 8,
};