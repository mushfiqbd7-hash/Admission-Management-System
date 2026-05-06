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
} from 'lucide-react';

import HeaderRealtimeActions from '@/components/layout/HeaderRealtimeActions';
import { useAuthStore } from '@/store/authStore';

export default function AppShell() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [topSearch, setTopSearch] = useState('');

  const isAdmin = user?.role === 'admin';
  const isAdminOrStaff = user?.role === 'admin' || user?.role === 'staff';

  const hideHeader = false;

  const pageMeta = useMemo(() => {
    if (location.pathname.startsWith('/students/new')) {
      return {
        title: 'New Application',
        subtitle: 'Create and submit a new student admission application.',
      };
    }

    if (location.pathname.startsWith('/students')) {
      return {
        title: 'Applications',
        subtitle: 'Manage applications, track status, and review submissions.',
      };
    }

    if (location.pathname.startsWith('/documents')) {
      return {
        title: 'Documents',
        subtitle: 'Organize, review, and manage uploaded student documents.',
      };
    }

    if (location.pathname.startsWith('/workstation')) {
      return {
        title: 'Work Station',
        subtitle: 'Handle approved applications and manage processing workflow.',
      };
    }

    if (location.pathname.startsWith('/inbox')) {
      return {
        title: 'Messages',
        subtitle: 'Stay updated with inbox messages and system notifications.',
      };
    }

    if (location.pathname.startsWith('/users')) {
      return {
        title: 'User Management',
        subtitle: 'Manage system users, permissions, and roles.',
      };
    }

    if (location.pathname.startsWith('/settings')) {
      return {
        title: 'Settings',
        subtitle: 'Configure platform preferences and system behavior.',
      };
    }

    return {
      title: 'Dashboard',
      subtitle: 'Monitor applications, progress, and latest activity.',
    };
  }, [location.pathname]);

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'New Application', path: '/students/new', icon: PlusCircle },
    { label: 'Applications', path: '/students', icon: FileText },
    { label: 'Documents', path: '/documents', icon: Folder },
    {
      label: 'Work Station',
      path: '/workstation',
      icon: Briefcase,
      adminStaff: true,
    },
    { label: 'Messages', path: '/inbox', icon: MessageSquare },
    ...(isAdmin
      ? [{ label: 'User Management', path: '/users', icon: Users }]
      : []),
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleTopSearch = (e: React.FormEvent) => {
    e.preventDefault();

    const q = topSearch.trim();

    navigate(q ? `/students?search=${encodeURIComponent(q)}` : '/students');
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const displayName = user?.full_name || (user as any)?.name || 'User';

  return (
    <div className="sams-app-font flex h-screen w-screen overflow-hidden bg-[#f4f7fb]">
      {/* SIDEBAR */}
      <aside className="flex h-screen w-[260px] min-w-[260px] max-w-[260px] shrink-0 flex-col overflow-hidden bg-[#061a33] text-white">
        <div className="flex shrink-0 items-center gap-3 px-6 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-blue-600">
            <GraduationCap size={24} />
          </div>

          <div>
            <div className="text-[20px] font-extrabold">Admission</div>
            <div className="text-[12px] text-slate-300">
              Management System
            </div>
          </div>
        </div>

        <nav className="min-h-0 flex-1 space-y-1.5 overflow-hidden px-4 pt-3">
          {navItems
            .filter((item) => !(item as any).adminStaff || isAdminOrStaff)
            .map((item) => {
              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/students'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-xl px-4 py-[14px] text-[14px] font-semibold transition ${
                      isActive
                        ? 'bg-[#0f5bff] text-white shadow-[0_10px_24px_rgba(15,91,255,0.28)]'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
        </nav>

        <div className="shrink-0 border-t border-white/10 px-5 py-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white font-extrabold text-slate-900">
              {displayName.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-extrabold">
                {displayName}
              </div>
              <div className="text-[12px] capitalize text-slate-300">
                {user?.role}
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-[14px] text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex h-screen min-w-0 flex-1 flex-col overflow-hidden bg-transparent">
        {!hideHeader && (
          <header className="shrink-0 px-5 pb-3 pt-4">
            <div className="flex h-[88px] items-center justify-between gap-6 rounded-[24px] border border-white/70 bg-[rgba(255,255,255,0.82)] px-6 shadow-[0_12px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl">
              {/* Left side */}
              <div className="min-w-0 flex-1">
                <h1 className="text-[18px] font-extrabold leading-tight tracking-[-0.03em] text-slate-950 md:text-[22px]">
                  {pageMeta.title}
                </h1>

                <p className="mt-1 truncate text-[12.5px] font-medium text-slate-500 md:text-[13.5px]">
                  {pageMeta.subtitle}
                </p>
              </div>

              {/* Right side */}
              <div className="flex shrink-0 items-center gap-3">
                <form onSubmit={handleTopSearch} className="relative hidden lg:block">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                    size={18}
                  />

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
        )}

        <main className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-0 pb-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}