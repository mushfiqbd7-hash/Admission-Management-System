// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Suspense, lazy, Component } from 'react';
import type { ReactNode } from 'react';

import ProtectedRoute    from '@/components/auth/ProtectedRoute';
import AppShell          from '@/components/layout/AppShell';
import LoginPage         from '@/components/auth/LoginPage';
import RegisterPage      from '@/components/auth/RegisterPage';
import VerifyEmailPage   from '@/components/auth/VerifyEmailPage';
import { useAuthStore }  from '@/store/authStore';

const DashboardPage   = lazy(() => import('@/components/dashboard/DashboardPage'));
const StudentsPage    = lazy(() => import('@/components/students/StudentsPage'));
const NewStudentPage  = lazy(() => import('@/components/students/NewStudentPage'));
const EditStudentPage = lazy(() => import('@/components/students/EditStudentPage'));
const StudentDetail   = lazy(() => import('@/components/students/StudentDetailPage'));
const UsersPage       = lazy(() => import('@/components/users/UsersPage'));
const SettingsPage    = lazy(() => import('@/components/settings/SettingsPage'));
const AuditLogPage    = lazy(() => import('@/components/settings/AuditLogPage'));
const InboxPage       = lazy(() => import('@/components/inbox/InboxPage'));
const DocumentsPage   = lazy(() => import('@/components/documents/DocumentsPage'));
const WorkStationPage = lazy(() => import('@/components/workstation/WorkStationPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
      <div style={{
        width: 24, height: 24, border: '2px solid var(--navy-100)',
        borderTopColor: 'var(--navy-600)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

const S = (Component: React.ComponentType) => (
  <Suspense fallback={<PageLoader />}><Component /></Suspense>
);

function AdminRoute({ component }: { component: React.ComponentType }) {
  const { user, isHydrated } = useAuthStore();
  if (!isHydrated) return <PageLoader />;
  if (user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return S(component);
}

function AdminStaffRoute({ component }: { component: React.ComponentType }) {
  const { user, isHydrated } = useAuthStore();
  if (!isHydrated) return <PageLoader />;
  if (user?.role !== 'admin' && user?.role !== 'staff') return <Navigate to="/dashboard" replace />;
  return S(component);
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--surface-sunken)', fontFamily: 'var(--font-ui)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>Something went wrong</div>
          <div style={{ fontSize: 13, color: 'var(--text-tertiary)', marginBottom: 20 }}>An unexpected error occurred. Please refresh the page.</div>
          <button onClick={() => window.location.reload()}
            style={{ padding: '8px 20px', background: 'var(--navy-600)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>
            Refresh Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            <Route path="/login"        element={<LoginPage />} />
            <Route path="/register"     element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard"         element={S(DashboardPage)} />
                <Route path="/students"          element={S(StudentsPage)} />
                <Route path="/students/new"      element={S(NewStudentPage)} />
                <Route path="/students/:id"      element={S(StudentDetail)} />
                <Route path="/students/:id/edit" element={S(EditStudentPage)} />
                <Route path="/users"             element={<AdminRoute component={UsersPage} />} />
                <Route path="/settings"          element={S(SettingsPage)} />
                <Route path="/audit-log" element={<AdminRoute component={AuditLogPage} />} />
		<Route path="/inbox"             element={S(InboxPage)} />
                <Route path="/documents"         element={S(DocumentsPage)} />
                <Route path="/workstation"       element={<AdminStaffRoute component={WorkStationPage} />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
        <style>{`
          .sams-toast-center[data-sonner-toaster]:has([data-sonner-toast])::before {
            content: '';
            position: fixed;
            inset: 0;
            z-index: 0;
            background: rgba(15, 23, 42, 0.45);
            backdrop-filter: blur(5px);
            pointer-events: none;
          }

          .sams-toast-center [data-sonner-toast] {
            position: relative;
            z-index: 1;
            width: min(410px, calc(100vw - 32px));
            min-height: 118px;
            padding: 24px;
            align-items: flex-start;
            gap: 14px;
          }

          .sams-toast-center [data-title] {
            font-size: 17px;
            font-weight: 950;
            line-height: 1.25;
            letter-spacing: 0;
            color: #0f172a;
          }

          .sams-toast-center [data-description] {
            margin-top: 3px;
            font-size: 12.5px;
            font-weight: 750;
            line-height: 1.55;
            color: #94a3b8;
          }

          .sams-toast-center [data-icon] {
            width: 46px;
            height: 46px;
            margin-top: 0;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border-radius: 16px;
            background: #eff6ff;
            color: #2563eb;
            border: 1px solid #bfdbfe;
            flex-shrink: 0;
          }

          .sams-toast-center [data-type='success'] [data-icon] {
            background: #f0fdf4;
            color: #16a34a;
            border-color: #bbf7d0;
          }

          .sams-toast-center [data-type='error'] [data-icon] {
            background: #fff1f2;
            color: #dc2626;
            border-color: #fecdd3;
          }

          .sams-toast-center [data-button] {
            height: 42px;
            min-width: 128px;
            border-radius: 14px;
            font-size: 13px;
            font-weight: 900;
          }

          .sams-toast-center [data-content] {
            padding-top: 2px;
          }
        `}</style>
        <Toaster
          className="sams-toast-center"
          position="top-center"
          offset="50vh"
          visibleToasts={1}
          toastOptions={{
            style: {
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              borderRadius: 24,
              border: '1px solid #e2e8f0',
              background: '#ffffff',
              boxShadow: '0 24px 60px rgba(15,23,42,0.22)',
              transform: 'translateY(-50%)',
            },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
