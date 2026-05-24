// src/components/layout/AppShell.tsx
import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Folder,
  MessageSquare,
  Users,
  Settings,
  LogOut,
  Search,
  Briefcase,
  Menu,
  X,
  Link2,
} from 'lucide-react';

import HeaderRealtimeActions from '@/components/layout/HeaderRealtimeActions';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { useAuthStore } from '@/store/authStore';

const WORKSPACE_ITEMS = [
  { label: 'Dashboard',       path: '/dashboard',         icon: LayoutDashboard },
  { label: 'New Application', path: '/students/new',      icon: PlusCircle },
  { label: 'Applications',    path: '/students',          icon: FileText },
  { label: 'Documents',       path: '/documents',         icon: Folder },
  { label: 'Work Station',    path: '/workstation',       icon: Briefcase, adminStaff: true },
  { label: 'Messages',        path: '/inbox',             icon: MessageSquare },
];

const ADMIN_ITEMS = [
  { label: 'User Management',   path: '/users',             icon: Users,   adminOnly: true },
  { label: 'Application Links', path: '/application-links', icon: Link2,   agentPlus: true },
  { label: 'Settings',          path: '/settings',          icon: Settings },
];

function NavItem({ label, path, icon: Icon, end: forceEnd }: {
  label: string; path: string; icon: React.ElementType; end?: boolean;
}) {
  return (
    <NavLink
      to={path}
      end={forceEnd ?? path === '/students'}
      title={label}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        marginBottom: 2,
        borderRadius: 9,
        border: 'none',
        background: isActive
          ? 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)'
          : 'transparent',
        color: isActive ? '#fff' : 'rgba(255,255,255,0.62)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        textDecoration: 'none',
        fontSize: 13.5,
        fontWeight: isActive ? 600 : 500,
        letterSpacing: '-0.01em',
        boxShadow: isActive
          ? '0 1px 0 rgba(255,255,255,0.18) inset, 0 6px 16px -6px rgba(37,99,235,0.55), 0 2px 4px rgba(37,99,235,0.20)'
          : 'none',
        transition: 'background 140ms ease, color 140ms ease, box-shadow 140ms ease',
      })}
      className="sams-nav-item"
    >
      <Icon size={16} strokeWidth={1.8} />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {label}
      </span>
    </NavLink>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '6px 10px',
      fontSize: 10.5,
      fontWeight: 700,
      color: 'rgba(255,255,255,0.32)',
      letterSpacing: '0.09em',
      textTransform: 'uppercase',
      marginTop: 18,
      marginBottom: 2,
    }}>
      {children}
    </div>
  );
}

export default function AppShell() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [topSearch, setTopSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAdmin        = user?.role === 'admin';
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';
  const isAgentPlus    = ['admin', 'staff', 'agent'].includes(user?.role || '');

  const pageMeta = useMemo(() => {
    if (location.pathname.startsWith('/students/new'))
      return { title: 'New Application',   subtitle: 'Create and submit a new student admission application.' };
    if (location.pathname.startsWith('/students'))
      return { title: 'Applications',      subtitle: 'Manage applications, track status, and review submissions.' };
    if (location.pathname.startsWith('/documents'))
      return { title: 'Documents',         subtitle: 'Organize, review, and manage uploaded student documents.' };
    if (location.pathname.startsWith('/workstation'))
      return { title: 'Work Station',      subtitle: 'Handle approved applications and manage processing workflow.' };
    if (location.pathname.startsWith('/inbox'))
      return { title: 'Messages',          subtitle: 'Stay updated with inbox messages and system notifications.' };
    if (location.pathname.startsWith('/users'))
      return { title: 'User Management',   subtitle: 'Manage system users, permissions, and roles.' };
    if (location.pathname.startsWith('/application-links'))
      return { title: 'Application Links', subtitle: 'Generate and manage shareable application invite links.' };
    if (location.pathname.startsWith('/settings'))
      return { title: 'Settings',          subtitle: 'Configure platform preferences and system behavior.' };
    return   { title: 'Dashboard',         subtitle: 'Monitor applications, progress, and latest activity.' };
  }, [location.pathname]);

  const handleTopSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = topSearch.trim();
    navigate(q ? `/students?search=${encodeURIComponent(q)}&t=${Date.now()}` : '/students', { replace: false });
    setTopSearch('');
  };

  const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

  const rawDisplayName = user?.full_name || (user as any)?.name || 'User';
  const displayName = user?.role === 'admin' && rawDisplayName === 'System Administrator'
    ? 'Admin' : rawDisplayName;

  const Sidebar = () => (
    <aside style={{
      width: 248, minWidth: 248, height: '100%', flexShrink: 0,
      background: 'linear-gradient(180deg, #081428 0%, #050e1f 100%)',
      color: '#fff', display: 'flex', flexDirection: 'column',
      position: 'relative',
      borderRight: '1px solid rgba(255,255,255,0.04)',
      overflowY: 'auto', overflowX: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: -100, left: -40, right: -40, height: 240,
        background: 'radial-gradient(ellipse at 50% 50%, rgba(59,130,246,0.22), transparent 65%)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      <div style={{
        padding: '20px 16px 16px', flexShrink: 0, position: 'relative', zIndex: 1,
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em',
            boxShadow: '0 1px 0 rgba(255,255,255,0.30) inset, 0 6px 14px -4px rgba(37,99,235,0.50)',
          }}>
            A
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.02em', color: '#fff' }}>
              Admission
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 }}>
              Management System
            </div>
          </div>
        </div>
      </div>

      <nav
        style={{ flex: 1, padding: '6px 10px 12px', overflowY: 'auto', position: 'relative', zIndex: 1 }}
        onClick={() => setMobileOpen(false)}
      >
        <SectionLabel>Workspace</SectionLabel>
        {WORKSPACE_ITEMS.filter(item => {
          if ((item as any).adminStaff && !isAdminOrStaff) return false;
          return true;
        }).map(item => (
          <NavItem key={item.path} label={item.label} path={item.path} icon={item.icon} />
        ))}

        {(isAdmin || isAgentPlus) && (
          <>
            <SectionLabel>Admin</SectionLabel>
            {ADMIN_ITEMS.filter(item => {
              if ((item as any).adminOnly && !isAdmin) return false;
              if ((item as any).agentPlus && !isAgentPlus) return false;
              return true;
            }).map(item => (
              <NavItem key={item.path} label={item.label} path={item.path} icon={item.icon} />
            ))}
          </>
        )}
      </nav>

      <div style={{
        padding: '12px 14px', borderTop: '1px solid rgba(255,255,255,0.07)', flexShrink: 0,
        background: 'linear-gradient(180deg, transparent, rgba(0,0,0,0.30))',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, fontWeight: 700, color: '#fff', overflow: 'hidden',
            boxShadow: '0 0 0 2px rgba(59,130,246,0.45)',
          }}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : displayName.charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {displayName}
            </div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.42)', textTransform: 'capitalize', marginTop: 1 }}>
              {user?.role}
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            style={{
              width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'transparent', border: 'none', borderRadius: 8,
              color: 'rgba(255,255,255,0.40)', cursor: 'pointer',
              transition: 'background 120ms ease, color 120ms ease',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.40)'; }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>
    </aside>
  );

  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden',
      background: 'var(--canvas-mesh, #f4f7fb)',
      backgroundAttachment: 'fixed',
    }}>
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 40,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
          }}
        />
      )}

      <div className="hidden lg:flex" style={{ height: '100%', flexShrink: 0 }}>
        <Sidebar />
      </div>

      <div style={{
        position: 'fixed', inset: 0, zIndex: 50,
        pointerEvents: mobileOpen ? 'auto' : 'none',
      }}>
        <div style={{
          position: 'absolute', left: 0, top: 0, bottom: 0, width: 248,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 280ms cubic-bezier(0.22,1,0.36,1)',
        }}>
          <Sidebar />
          {mobileOpen && (
            <button
              onClick={() => setMobileOpen(false)}
              style={{
                position: 'absolute', top: 14, right: -44,
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(0,0,0,0.55)', border: 'none',
                color: '#fff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
        <header style={{ flexShrink: 0, padding: '14px 20px 0' }}>
          <div style={{
            height: 64, padding: '0 20px', borderRadius: 16,
            background: 'var(--surface-soft, rgba(255,255,255,0.82))',
            backdropFilter: 'blur(24px) saturate(180%)',
            WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            border: '1px solid rgba(15,23,42,0.06)',
            boxShadow: 'var(--sh-header)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
          }}>
            <button
              onClick={() => setMobileOpen(true)}
              className="flex lg:hidden"
              style={{
                flexShrink: 0, borderRadius: 10, padding: 8,
                background: 'transparent', border: 'none', cursor: 'pointer', color: '#475569',
              }}
            >
              <Menu size={22} />
            </button>

            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{
                margin: 0, fontSize: 18, fontWeight: 700,
                letterSpacing: '-0.025em', color: '#0a0e1a',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {pageMeta.title}
              </h1>
              <p style={{
                margin: '2px 0 0', fontSize: 12.5, color: '#64748b',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {pageMeta.subtitle}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <form onSubmit={handleTopSearch} className="hidden lg:block" style={{ position: 'relative' }}>
                <Search style={{
                  position: 'absolute', left: 14, top: '50%',
                  transform: 'translateY(-50%)', color: '#94a3b8',
                }} size={16} />
                <input
                  value={topSearch}
                  onChange={(e) => setTopSearch(e.target.value)}
                  placeholder="Search applications..."
                  style={{
                    height: 40, width: 280, paddingLeft: 40, paddingRight: 14,
                    borderRadius: 12, border: '1px solid #e3eaf3',
                    background: '#fff', fontSize: 13.5, color: '#334155',
                    outline: 'none', fontFamily: 'inherit',
                  }}
                />
              </form>
              <ThemeToggle />
              <HeaderRealtimeActions />
            </div>
          </div>
        </header>

        <main style={{ flex: 1, minWidth: 0, overflowY: 'auto', overflowX: 'hidden' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}