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
  GraduationCap,
  LogOut,
  Search,
  Briefcase,
  Menu,
  X,
  Link2,
} from 'lucide-react';

import HeaderRealtimeActions from '@/components/layout/HeaderRealtimeActions';
import { useAuthStore } from '@/store/authStore';

export default function AppShell() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [topSearch, setTopSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarHover, setSidebarHover] = useState(false);

  const isAdmin = user?.role === 'admin';
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

  const pageMeta = useMemo(() => {
    if (location.pathname.startsWith('/students/new'))
      return { title: 'New Application', subtitle: 'Create and submit a new student admission application.' };
    if (location.pathname.startsWith('/students'))
      return { title: 'Applications', subtitle: 'Manage applications, track status, and review submissions.' };
    if (location.pathname.startsWith('/documents'))
      return { title: 'Documents', subtitle: 'Organize, review, and manage uploaded student documents.' };
    if (location.pathname.startsWith('/workstation'))
      return { title: 'Work Station', subtitle: 'Handle approved applications and manage processing workflow.' };
    if (location.pathname.startsWith('/inbox'))
      return { title: 'Messages', subtitle: 'Stay updated with inbox messages and system notifications.' };
    if (location.pathname.startsWith('/users'))
      return { title: 'User Management', subtitle: 'Manage system users, permissions, and roles.' };
    if (location.pathname.startsWith('/application-links'))
      return { title: 'Application Links', subtitle: 'Generate and manage shareable application invite links.' };
    if (location.pathname.startsWith('/settings'))
      return { title: 'Settings', subtitle: 'Configure platform preferences and system behavior.' };
    return { title: 'Dashboard', subtitle: 'Monitor applications, progress, and latest activity.' };
  }, [location.pathname]);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'New Application', path: '/students/new', icon: PlusCircle },
    { label: 'Applications', path: '/students', icon: FileText },
    { label: 'Documents', path: '/documents', icon: Folder },
    { label: 'Work Station', path: '/workstation', icon: Briefcase, adminStaff: true },
    { label: 'Messages', path: '/inbox', icon: MessageSquare },
    ...(isAdmin ? [{ label: 'User Management', path: '/users', icon: Users }] : []),
    ...(['admin', 'staff', 'agent'].includes(user?.role || '')
      ? [{ label: 'Application Links', path: '/application-links', icon: Link2 }]
      : []),
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleTopSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = topSearch.trim();
    if (q) {
      navigate(`/students?search=${encodeURIComponent(q)}&t=${Date.now()}`, { replace: false });
    } else {
      navigate('/students', { replace: false });
    }
    setTopSearch('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  const rawDisplayName = user?.full_name || (user as any)?.name || 'User';
  const displayName =
    user?.role === 'admin' && rawDisplayName === 'System Administrator'
      ? 'Admin'
      : rawDisplayName;

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <>
      <div className={`flex shrink-0 items-center ${collapsed ? 'justify-center px-3 py-5' : 'gap-3 px-6 py-6'}`}>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-blue-600">
          <GraduationCap size={24} />
        </div>
        <div className={collapsed ? 'hidden' : 'min-w-0'}>
          <div className="text-[20px] font-extrabold">Admission</div>
          <div className="text-[12px] text-slate-300">Management System</div>
        </div>
      </div>

      <nav className={`min-h-0 flex-1 space-y-1.5 overflow-y-auto ${collapsed ? 'px-3 pt-3' : 'px-4 pt-3'}`}>
        {navItems
          .filter((item) => {
          if ((item as any).adminStaff && !isAdminOrStaff) return false;
          if ((item as any).adminOnly && !isAdmin) return false;
          return true;
        })
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/students'}
                onClick={handleNavClick}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center rounded-xl py-[14px] text-[14px] font-semibold transition ${
                    collapsed ? 'justify-center px-0' : 'gap-3 px-4'
                  } ${
                    isActive
                      ? 'bg-[#0f5bff] text-white shadow-[0_10px_24px_rgba(15,91,255,0.28)]'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={20} />
                <span className={collapsed ? 'hidden' : ''}>{item.label}</span>
              </NavLink>
            );
          })}
      </nav>

      <div className={`shrink-0 border-t border-white/10 ${collapsed ? 'px-3 py-4' : 'px-5 py-5'}`}>
        <div className={`mb-4 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white font-extrabold text-slate-900">
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
              : displayName.charAt(0).toUpperCase()}
          </div>
          <div className={collapsed ? 'hidden' : 'min-w-0 flex-1'}>
            <div className="truncate text-[15px] font-extrabold">{displayName}</div>
            <div className="text-[12px] capitalize text-slate-300">{user?.role}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title={collapsed ? 'Sign Out' : undefined}
          className={`flex w-full items-center rounded-xl py-3 text-[14px] text-slate-300 transition hover:bg-white/10 hover:text-white ${
            collapsed ? 'justify-center px-0' : 'gap-3 px-4'
          }`}
        >
          <LogOut size={18} />
          <span className={collapsed ? 'hidden' : ''}>Sign Out</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="sams-app-font flex h-screen w-screen overflow-hidden bg-[#f4f7fb]">

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR — hover-expand desktop rail, mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex h-screen w-[260px] min-w-[260px] flex-col overflow-hidden bg-[#061a33] text-white transition-all duration-300 lg:relative lg:translate-x-0 ${
          sidebarHover ? 'lg:w-[260px] lg:min-w-[260px]' : 'lg:w-[84px] lg:min-w-[84px]'
        } ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        onMouseEnter={() => setSidebarHover(true)}
        onMouseLeave={() => setSidebarHover(false)}
      >
        {/* Close button mobile only */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 hover:text-white lg:hidden"
        >
          <X size={20} />
        </button>

        <SidebarContent collapsed={!sidebarHover} />
      </aside>

      {/* MAIN */}
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
        <header className="shrink-0 px-3 pb-3 pt-3 sm:px-5 sm:pt-4">
          <div className="flex h-[72px] items-center justify-between gap-3 rounded-[20px] border border-white/70 bg-[rgba(255,255,255,0.82)] px-4 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl sm:h-[88px] sm:gap-6 sm:rounded-[24px] sm:px-6">

            {/* Sidebar controls */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="shrink-0 rounded-xl p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              title="Open sidebar"
            >
              <Menu size={22} />
            </button>

            {/* Title */}
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[16px] font-extrabold leading-tight tracking-[-0.03em] text-slate-950 sm:text-[18px] md:text-[22px]">
                {pageMeta.title}
              </h1>
              <p className="mt-0.5 hidden truncate text-[12.5px] font-medium text-slate-500 sm:block md:text-[13.5px]">
                {pageMeta.subtitle}
              </p>
            </div>

            {/* Right side */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <form onSubmit={handleTopSearch} className="relative hidden lg:block">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  value={topSearch}
                  onChange={(e) => setTopSearch(e.target.value)}
                  placeholder="Search..."
                  className="h-[50px] w-[300px] rounded-2xl border border-slate-200/80 bg-white/80 pl-11 pr-4 text-[14px] text-slate-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 xl:w-[420px]"
                />
              </form>
              <HeaderRealtimeActions />
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-0 pb-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}


