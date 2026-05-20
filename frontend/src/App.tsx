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
        <Toaster
          position="top-center"
          offset="50vh"
          toastOptions={{
            style: {
              fontFamily: 'var(--font-ui)',
              fontSize: 13,
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.72)',
              background: 'rgba(255,255,255,0.94)',
              boxShadow: '0 28px 80px rgba(15,23,42,0.24), 0 8px 22px rgba(15,23,42,0.12)',
              backdropFilter: 'blur(18px)',
              transform: 'translateY(-50%)',
            },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
