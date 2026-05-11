import type { LucideIcon } from 'lucide-react';
// src/components/users/UsersPage.tsx
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bot,
  Eye,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Shield,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';

import { usersApi } from '@/api/client';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'sonner';
import type { User as UserType, UserRole } from '@/types';

type ExtUser = UserType & {
  is_active?: boolean;
  last_login?: string;
  created_at?: string;
};

interface UserForm {
  email: string;
  password: string;
  full_name: string;
  role: UserRole;
}

interface EditForm {
  full_name: string;
  role: UserRole;
  password: string;
}

const ROLE_OPTIONS: UserRole[] = ['admin', 'staff', 'agent', 'student'];

function getInitials(name?: string) {
  const clean = String(name || 'User').trim();

  return clean
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return 'Never';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Never';

  return date.toLocaleDateString('en-CA');
}

function roleTheme(role?: string) {
  switch (role) {
    case 'admin':
      return { bg: '#fff1f2', color: '#be123c', border: '#fda4af', soft: '#fff1f2' };
    case 'staff':
      return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe', soft: '#eff6ff' };
    case 'agent':
      return { bg: '#faf5ff', color: '#7e22ce', border: '#d8b4fe', soft: '#faf5ff' };
    case 'student':
      return { bg: '#f0fdf4', color: '#15803d', border: '#86efac', soft: '#f0fdf4' };
    default:
      return { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', soft: '#f8fafc' };
  }
}

function RoleIcon({ role }: { role?: string }) {
  const theme = roleTheme(role);

  if (role === 'admin') return <Shield size={14} style={{ color: theme.color }} />;
  if (role === 'agent') return <Bot size={14} style={{ color: theme.color }} />;
  if (role === 'student') return <GraduationCap size={14} style={{ color: theme.color }} />;
  if (role === 'staff') return <User size={14} style={{ color: theme.color }} />;

  return <Eye size={14} style={{ color: theme.color }} />;
}

function RoleChip({ role }: { role?: string }) {
  const theme = roleTheme(role);

  return (
    <span
      style={{
        height: 28,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '0 11px',
        borderRadius: 999,
        border: `1px solid ${theme.border}`,
        background: theme.bg,
        color: theme.color,
        fontSize: 12,
        fontWeight: 950,
        textTransform: 'capitalize',
        whiteSpace: 'nowrap',
      }}
    >
      <RoleIcon role={role} />
      {role || 'viewer'}
    </span>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      style={{
        width: 46,
        height: 26,
        borderRadius: 999,
        border: 'none',
        background: checked ? '#16a34a' : '#cbd5e1',
        padding: 3,
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.18s ease',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 4,
          left: checked ? 24 : 4,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 3px 8px rgba(15,23,42,0.18)',
          transition: 'all 0.18s ease',
        }}
      />
    </button>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  bg,
}: {
  label: string;
  value: number;
  icon: LucideIcon;
  color: string;
  bg: string;
}) {
  return (
    <div style={statCardStyle}>
      <div style={{ ...statIconBoxStyle, background: bg }}>
        <Icon size={19} style={{ color }} />
      </div>

      <div style={{ flex: 1 }}>
        <div style={statLabelStyle}>{label}</div>
        <div style={statValueStyle}>{value}</div>
      </div>

      <div style={{ ...statLineStyle, background: color }} />
    </div>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <label style={fieldLabelStyle}>{children}</label>;
}

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div style={modalOverlayStyle}>
      <div style={modalCardStyle}>
        <div style={modalHeaderStyle}>
          <div>
            <div style={modalTitleStyle}>{title}</div>
            {subtitle && <div style={modalSubtitleStyle}>{subtitle}</div>}
          </div>

          <button onClick={onClose} style={modalCloseBtnStyle}>
            <X size={16} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}

function ActionButton({
  title,
  onClick,
  children,
  tone = 'blue',
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  tone?: 'blue' | 'red';
}) {
  const theme =
    tone === 'red'
      ? { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' }
      : { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };

  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 34,
        height: 34,
        borderRadius: 12,
        border: `1px solid ${theme.border}`,
        background: theme.bg,
        color: theme.color,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

export default function UsersPage() {
  const qc = useQueryClient();
  const { user: currentUser } = useAuthStore();

  const isAdmin = currentUser?.role === 'admin';

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');

  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<ExtUser | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [form, setForm] = useState<UserForm>({
    email: '',
    password: '',
    full_name: '',
    role: 'staff',
  });

  const [editForm, setEditForm] = useState<EditForm>({
    full_name: '',
    role: 'staff',
    password: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then((r) => r.data.users as ExtUser[]),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });

  const createMutation = useMutation({
    mutationFn: (d: UserForm) => usersApi.create(d),
    onSuccess: () => {
      toast.success('User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      setShowModal(false);
      setForm({ email: '', password: '', full_name: '', role: 'staff' });
    },
    onError: (err: unknown) => {
      toast.error(
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
          'Failed to create user'
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Partial<EditForm & { is_active: boolean }>;
    }) => usersApi.update(id, data),
    onSuccess: () => {
      toast.success('Account updated');
      qc.invalidateQueries({ queryKey: ['users'] });
      setEditUser(null);
    },
    onError: () => toast.error('Failed to update account'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => {
      toast.success('User deleted');
      qc.invalidateQueries({ queryKey: ['users'] });
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete user'),
  });

  const allUsers = data || [];

  const users = useMemo(() => {
    const q = search.trim().toLowerCase();

    return allUsers.filter((u) => {
      const matchesSearch =
        !q ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.role?.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'all' || u.role === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [allUsers, search, roleFilter]);

  const counts = {
    total: allUsers.length,
    admin: allUsers.filter((u) => u.role === 'admin').length,
    staff: allUsers.filter((u) => u.role === 'staff').length,
    agent: allUsers.filter((u) => u.role === 'agent').length,
    student: allUsers.filter((u) => u.role === 'student').length,
  };

  const openCreate = () => {
    setForm({ email: '', password: '', full_name: '', role: 'staff' });
    setShowModal(true);
  };

  const openEdit = (u: ExtUser) => {
    setEditForm({
      full_name: u.full_name || '',
      role: u.role,
      password: '',
    });

    setEditUser(u);
  };

  const submitCreate = () => {
    if (!form.full_name.trim() || !form.email.trim() || !form.password.trim()) {
      toast.error('Please fill all required fields');
      return;
    }

    createMutation.mutate(form);
  };

  const submitEdit = () => {
    if (!editUser) return;

    if (!editForm.full_name.trim()) {
      toast.error('Full name is required');
      return;
    }

    const payload: Partial<EditForm> = {
      full_name: editForm.full_name.trim(),
      role: editForm.role,
    };

    if (editForm.password.trim()) {
      payload.password = editForm.password.trim();
    }

    updateMutation.mutate({
      id: editUser.id,
      data: payload,
    });
  };

  return (
    <div style={pageStyle}>
      {/* Duplicate inner header removed */}

      <div style={topBarStyle}>
        <div style={statsGridStyle}>
          <StatCard label="Total Users" value={counts.total} icon={Users} color="#2563eb" bg="#eff6ff" />
          <StatCard label="Admins" value={counts.admin} icon={Shield} color="#be123c" bg="#fff1f2" />
          <StatCard label="Staff" value={counts.staff} icon={User} color="#1d4ed8" bg="#eff6ff" />
          <StatCard label="Agents" value={counts.agent} icon={Bot} color="#7e22ce" bg="#faf5ff" />
          <StatCard label="Students" value={counts.student} icon={GraduationCap} color="#15803d" bg="#f0fdf4" />
        </div>

        {isAdmin && (
          <button onClick={openCreate} style={addUserBtnStyle}>
            <Plus size={16} />
            Add User
          </button>
        )}
      </div>

      <div style={tableCardStyle}>
        <div style={filterBarStyle}>
          <div style={searchWrapStyle}>
            <Search size={16} style={searchIconStyle} />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, or role..."
              style={searchInputStyle}
            />

            {search && (
              <button onClick={() => setSearch('')} style={clearSearchBtnStyle}>
                <X size={14} />
              </button>
            )}
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={roleSelectStyle}
          >
            <option value="all">All Roles</option>
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                {[
                  ['Name', '30%'],
                  ['Email', '24%'],
                  ['Role', '15%'],
                  ['Status', '15%'],
                  ['Last Login', '11%'],
                  ['Actions', '5%'],
                ].map(([label, width]) => (
                  <th key={label} style={{ ...thStyle, width }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} style={tdStyle}>
                        <div
                          style={{
                            height: 13,
                            width: j === 0 ? 150 : j === 1 ? 190 : 80,
                            borderRadius: 999,
                            background: '#e2e8f0',
                          }}
                        />
                      </td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div style={emptyStateStyle}>
                      <div style={emptyIconStyle}>
                        <Users size={34} style={{ color: '#94a3b8' }} />
                      </div>

                      <div style={emptyTitleStyle}>No users found</div>

                      <div style={emptySubtitleStyle}>
                        Try adjusting your search or role filter.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const active = u.is_active !== false;
                  const isSelf = u.id === currentUser?.id;

                  return (
                    <tr key={u.id} style={rowStyle}>
                      <td style={firstTdStyle}>
                        <div style={nameCellStyle}>
                          <div style={avatarStyle}>{getInitials(u.full_name)}</div>

                          <div style={{ minWidth: 0 }}>
                            <div style={nameTextStyle}>{u.full_name || 'Unnamed User'}</div>
                            <div style={idTextStyle}>ID: {u.id?.slice(0, 8) || 'Ã¢â‚¬â€'}</div>
                          </div>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <div style={emailTextStyle}>{u.email}</div>
                      </td>

                      <td style={tdStyle}>
                        <RoleChip role={u.role} />
                      </td>

                      <td style={tdStyle}>
                        <div style={statusWrapStyle}>
                          {isAdmin && !isSelf ? (
                            <Toggle
                              checked={active}
                              onChange={() =>
                                updateMutation.mutate({
                                  id: u.id,
                                  data: { is_active: !active },
                                })
                              }
                            />
                          ) : (
                            <span style={readOnlyToggleStyle} />
                          )}

                          <span style={active ? activeTextStyle : inactiveTextStyle}>
                            {active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>

                      <td style={tdStyle}>
                        <span style={dateTextStyle}>{formatDate(u.last_login)}</span>
                      </td>

                      <td style={lastTdStyle}>
                        <div style={actionsWrapStyle}>
                          {isAdmin && (
                            <>
                              <ActionButton title="Edit user" onClick={() => openEdit(u)}>
                                <Pencil size={15} />
                              </ActionButton>

                              {!isSelf && (
                                <ActionButton
                                  title="Delete user"
                                  onClick={() => setDeleteId(u.id)}
                                  tone="red"
                                >
                                  <Trash2 size={15} />
                                </ActionButton>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <Modal
          title="Add New User"
          subtitle="Create a new system account."
          onClose={() => setShowModal(false)}
        >
          <div style={modalBodyStyle}>
            <div>
              <FieldLabel>Full Name *</FieldLabel>
              <input
                value={form.full_name}
                onChange={(e) => setForm((p) => ({ ...p, full_name: e.target.value }))}
                placeholder="Enter full name"
                style={inputStyle}
              />
            </div>

            <div>
              <FieldLabel>Email *</FieldLabel>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                placeholder="Enter email address"
                style={inputStyle}
              />
            </div>

            <div>
              <FieldLabel>Password *</FieldLabel>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                placeholder="Create password"
                style={inputStyle}
              />
            </div>

            <div>
              <FieldLabel>Role *</FieldLabel>
              <select
                value={form.role}
                onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))}
                style={inputStyle}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={modalFooterStyle}>
            <button onClick={() => setShowModal(false)} style={secondaryBtnStyle}>
              Cancel
            </button>

            <button
              onClick={submitCreate}
              disabled={createMutation.isPending}
              style={{
                ...primaryBtnStyle,
                opacity: createMutation.isPending ? 0.65 : 1,
                cursor: createMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {createMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </Modal>
      )}

      {editUser && (
        <Modal
          title="Edit User"
          subtitle="Update account details and role."
          onClose={() => setEditUser(null)}
        >
          <div style={modalBodyStyle}>
            <div>
              <FieldLabel>Full Name *</FieldLabel>
              <input
                value={editForm.full_name}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, full_name: e.target.value }))
                }
                placeholder="Enter full name"
                style={inputStyle}
              />
            </div>

            <div>
              <FieldLabel>Role *</FieldLabel>
              <select
                value={editForm.role}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, role: e.target.value as UserRole }))
                }
                style={inputStyle}
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role} value={role}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <FieldLabel>New Password</FieldLabel>
              <input
                type="password"
                value={editForm.password}
                onChange={(e) =>
                  setEditForm((p) => ({ ...p, password: e.target.value }))
                }
                placeholder="Leave blank to keep current password"
                style={inputStyle}
              />
            </div>
          </div>

          <div style={modalFooterStyle}>
            <button onClick={() => setEditUser(null)} style={secondaryBtnStyle}>
              Cancel
            </button>

            <button
              onClick={submitEdit}
              disabled={updateMutation.isPending}
              style={{
                ...primaryBtnStyle,
                opacity: updateMutation.isPending ? 0.65 : 1,
                cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </Modal>
      )}

      {deleteId && (
        <Modal
          title="Delete User"
          subtitle="This action cannot be undone."
          onClose={() => setDeleteId(null)}
        >
          <p style={deleteTextStyle}>
            Are you sure you want to delete this user account? The account will be removed
            permanently from the system.
          </p>

          <div style={modalFooterStyle}>
            <button onClick={() => setDeleteId(null)} style={secondaryBtnStyle}>
              Cancel
            </button>

            <button
              onClick={() => deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
              style={{
                ...dangerBtnStyle,
                opacity: deleteMutation.isPending ? 0.65 : 1,
                cursor: deleteMutation.isPending ? 'not-allowed' : 'pointer',
              }}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ Styles Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ */

const pageStyle: CSSProperties = {
  height: '100%',
  minHeight: 0,
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  padding: '18px 24px 22px',
  background:
    'radial-gradient(circle at top left, rgba(37,99,235,0.055), transparent 34%), linear-gradient(180deg, #f8fafc 0%, #eef3f9 100%)',
};

const topBarStyle: CSSProperties = {
  flexShrink: 0,
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) auto',
  gap: 16,
  alignItems: 'center',
};

const statsGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
  gap: 14,
};

const statCardStyle: CSSProperties = {
  minHeight: 104,
  borderRadius: 22,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  boxShadow: '0 14px 34px rgba(15,23,42,0.055)',
  padding: 16,
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  alignItems: 'center',
  gap: 13,
};

const statIconBoxStyle: CSSProperties = {
  width: 42,
  height: 42,
  borderRadius: 15,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
};

const statLabelStyle: CSSProperties = {
  fontSize: 12,
  fontWeight: 950,
  color: '#64748b',
};

const statValueStyle: CSSProperties = {
  marginTop: 7,
  fontSize: 26,
  fontWeight: 950,
  color: '#0f172a',
  letterSpacing: '-0.05em',
  lineHeight: 1,
};

const statLineStyle: CSSProperties = {
  position: 'absolute',
  left: 16,
  right: 16,
  bottom: 14,
  height: 4,
  borderRadius: 999,
};

const addUserBtnStyle: CSSProperties = {
  height: 46,
  padding: '0 18px',
  borderRadius: 15,
  border: 'none',
  background: '#2563eb',
  color: '#ffffff',
  fontSize: 13.5,
  fontWeight: 950,
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  boxShadow: '0 14px 28px rgba(37,99,235,0.24)',
  whiteSpace: 'nowrap',
};

const tableCardStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'hidden',
  borderRadius: 24,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
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
  gridTemplateColumns: 'minmax(260px, 1fr) 150px',
  gap: 12,
  alignItems: 'center',
};

const searchWrapStyle: CSSProperties = {
  position: 'relative',
  minWidth: 0,
};

const searchIconStyle: CSSProperties = {
  position: 'absolute',
  left: 14,
  top: '50%',
  transform: 'translateY(-50%)',
  color: '#94a3b8',
  pointerEvents: 'none',
};

const searchInputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  borderRadius: 15,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  padding: '0 40px',
  outline: 'none',
  fontSize: 13.5,
  fontWeight: 700,
  color: '#334155',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const clearSearchBtnStyle: CSSProperties = {
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

const roleSelectStyle: CSSProperties = {
  height: 44,
  borderRadius: 15,
  border: '1px solid #cbd5e1',
  background: '#ffffff',
  padding: '0 13px',
  outline: 'none',
  fontSize: 13,
  fontWeight: 850,
  color: '#334155',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const tableWrapStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
};

const tableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'separate',
  borderSpacing: 0,
};

const thStyle: CSSProperties = {
  position: 'sticky',
  top: 0,
  zIndex: 4,
  padding: '15px 24px',
  background: '#f8fafc',
  borderBottom: '1px solid #e8edf4',
  textAlign: 'left',
  fontSize: 11,
  fontWeight: 950,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  whiteSpace: 'nowrap',
};

const rowStyle: CSSProperties = {
  background: '#ffffff',
};

const tdStyle: CSSProperties = {
  padding: '17px 24px',
  borderBottom: '1px solid #eef2f7',
  verticalAlign: 'middle',
};

const firstTdStyle: CSSProperties = {
  ...tdStyle,
};

const lastTdStyle: CSSProperties = {
  ...tdStyle,
};

const nameCellStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 13,
  minWidth: 0,
};

const avatarStyle: CSSProperties = {
  width: 46,
  height: 46,
  borderRadius: 16,
  background: '#061a33',
  color: '#ffffff',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 14,
  fontWeight: 950,
  flexShrink: 0,
  boxShadow: '0 10px 20px rgba(6,26,51,0.18)',
};

const nameTextStyle: CSSProperties = {
  fontSize: 13.5,
  fontWeight: 950,
  color: '#0f172a',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const idTextStyle: CSSProperties = {
  marginTop: 3,
  fontSize: 11.5,
  fontWeight: 700,
  color: '#94a3b8',
  fontFamily: 'DM Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
};

const emailTextStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 750,
  color: '#475569',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const statusWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
};

const activeTextStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 950,
  color: '#16a34a',
};

const inactiveTextStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 950,
  color: '#94a3b8',
};

const readOnlyToggleStyle: CSSProperties = {
  width: 46,
  height: 26,
  borderRadius: 999,
  background: '#16a34a',
  display: 'inline-block',
  flexShrink: 0,
};

const dateTextStyle: CSSProperties = {
  fontSize: 12.5,
  fontWeight: 750,
  color: '#64748b',
  whiteSpace: 'nowrap',
};

const actionsWrapStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const emptyStateStyle: CSSProperties = {
  padding: '80px 20px',
  textAlign: 'center',
};

const emptyIconStyle: CSSProperties = {
  width: 74,
  height: 74,
  borderRadius: 24,
  background: '#f8fafc',
  border: '1px solid #e2e8f0',
  margin: '0 auto 16px',
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

const modalOverlayStyle: CSSProperties = {
  position: 'fixed',
  inset: 0,
  zIndex: 100,
  background: 'rgba(15,23,42,0.45)',
  backdropFilter: 'blur(6px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 20,
};

const modalCardStyle: CSSProperties = {
  width: 470,
  maxWidth: '100%',
  borderRadius: 24,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  boxShadow: '0 28px 80px rgba(15,23,42,0.24)',
  overflow: 'hidden',
};

const modalHeaderStyle: CSSProperties = {
  padding: '20px 22px',
  borderBottom: '1px solid #e8edf4',
  background: '#fbfdff',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 16,
};

const modalTitleStyle: CSSProperties = {
  fontSize: 17,
  fontWeight: 950,
  color: '#0f172a',
  letterSpacing: '-0.035em',
};

const modalSubtitleStyle: CSSProperties = {
  marginTop: 4,
  fontSize: 12.5,
  fontWeight: 700,
  color: '#94a3b8',
};

const modalCloseBtnStyle: CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
  border: '1px solid #e2e8f0',
  background: '#ffffff',
  color: '#64748b',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
};

const modalBodyStyle: CSSProperties = {
  padding: 22,
  display: 'flex',
  flexDirection: 'column',
  gap: 15,
};

const fieldLabelStyle: CSSProperties = {
  display: 'block',
  marginBottom: 7,
  fontSize: 12.5,
  fontWeight: 900,
  color: '#475569',
};

const inputStyle: CSSProperties = {
  width: '100%',
  height: 44,
  borderRadius: 14,
  border: '1px solid #dbe3ef',
  background: '#ffffff',
  padding: '0 14px',
  outline: 'none',
  fontSize: 13.5,
  fontWeight: 700,
  color: '#334155',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

const modalFooterStyle: CSSProperties = {
  padding: '16px 22px',
  borderTop: '1px solid #e8edf4',
  background: '#fbfdff',
  display: 'flex',
  gap: 10,
};

const secondaryBtnStyle: CSSProperties = {
  height: 42,
  flex: 1,
  borderRadius: 14,
  border: '1px solid #dbe3ef',
  background: '#ffffff',
  color: '#475569',
  fontSize: 13,
  fontWeight: 900,
  cursor: 'pointer',
  fontFamily: 'inherit',
};

const primaryBtnStyle: CSSProperties = {
  height: 42,
  flex: 1.4,
  borderRadius: 14,
  border: 'none',
  background: '#2563eb',
  color: '#ffffff',
  fontSize: 13,
  fontWeight: 950,
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 12px 24px rgba(37,99,235,0.22)',
};

const dangerBtnStyle: CSSProperties = {
  ...primaryBtnStyle,
  background: '#dc2626',
  boxShadow: '0 12px 24px rgba(220,38,38,0.22)',
};

const deleteTextStyle: CSSProperties = {
  margin: 0,
  padding: '22px 22px 4px',
  fontSize: 13.5,
  fontWeight: 650,
  color: '#475569',
  lineHeight: 1.7,
};