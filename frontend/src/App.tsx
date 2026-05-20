// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { Suspense, lazy, Component } from 'react';
import type { ReactNode } from 'react';

import ProtectedRoute from '@/components/auth/ProtectedRoute';
import AppShell from '@/components/layout/AppShell';
import LoginPage from '@/components/auth/LoginPage';
import RegisterPage from '@/components/auth/RegisterPage';
import VerifyEmailPage from '@/components/auth/VerifyEmailPage';
import { useAuthStore } from '@/store/authStore';

const DashboardPage = lazy(() => import('@/components/dashboard/DashboardPage'));
const StudentsPage = lazy(() => import('@/components/students/StudentsPage'));
const NewStudentPage = lazy(() => import('@/components/students/NewStudentPage'));
const EditStudentPage = lazy(() => import('@/components/students/EditStudentPage'));
const StudentDetail = lazy(() => import('@/components/students/StudentDetailPage'));
const UsersPage = lazy(() => import('@/components/users/UsersPage'));
const SettingsPage = lazy(() => import('@/components/settings/SettingsPage'));
const AuditLogPage = lazy(() => import('@/components/settings/AuditLogPage'));
const InboxPage = lazy(() => import('@/components/inbox/InboxPage'));
const DocumentsPage = lazy(() => import('@/components/documents/DocumentsPage'));
const WorkStationPage = lazy(() => import('@/components/workstation/WorkStationPage'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});

function PageLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minHeight: 200,
      }}
    >
      <div
        style={{
          width: 24,
          height: 24,
          border: '2px solid var(--navy-100)',
          borderTopColor: 'var(--navy-600)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
    </div>
  );
}

const S = (Component: React.ComponentType) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
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
  if (user?.role !== 'admin' && user?.role !== 'staff') {
    return <Navigate to="/dashboard" replace />;
  }

  return S(component);
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: 'var(--surface-sunken)',
            fontFamily: 'var(--font-ui)',
          }}
        >
          <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>

          <div
            style={{
              fontSize: 16,
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBottom: 8,
            }}
          >
            Something went wrong
          </div>

          <div
            style={{
              fontSize: 13,
              color: 'var(--text-tertiary)',
              marginBottom: 20,
            }}
          >
            An unexpected error occurred. Please refresh the page.
          </div>

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '8px 20px',
              background: 'var(--navy-600)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
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
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />

            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={S(DashboardPage)} />
                <Route path="/students" element={S(StudentsPage)} />
                <Route path="/students/new" element={S(NewStudentPage)} />
                <Route path="/students/:id" element={S(StudentDetail)} />
                <Route path="/students/:id/edit" element={S(EditStudentPage)} />
                <Route path="/users" element={<AdminRoute component={UsersPage} />} />
                <Route path="/settings" element={S(SettingsPage)} />
                <Route path="/audit-log" element={<AdminRoute component={AuditLogPage} />} />
                <Route path="/inbox" element={S(InboxPage)} />
                <Route path="/documents" element={S(DocumentsPage)} />
                <Route
                  path="/workstation"
                  element={<AdminStaffRoute component={WorkStationPage} />}
                />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>

        <style>{`
          .sams-toast-premium[data-sonner-toaster] {
            z-index: 99999 !important;
            --normal-bg: #ffffff;
            --normal-border: #e2e8f0;
            --normal-text: #0f172a;
            --success-bg: #ffffff;
            --success-border: #bbf7d0;
            --success-text: #0f172a;
            --error-bg: #ffffff;
            --error-border: #fecaca;
            --error-text: #0f172a;
            --warning-bg: #ffffff;
            --warning-border: #fde68a;
            --warning-text: #0f172a;
          }

          .sams-toast-premium [data-sonner-toast] {
            width: 370px !important;
            min-height: 76px !important;
            padding: 15px 16px !important;
            border-radius: 20px !important;
            border: 1px solid #e2e8f0 !important;
            background: rgba(255, 255, 255, 0.98) !important;
            box-shadow:
              0 22px 48px rgba(15, 23, 42, 0.16),
              0 2px 8px rgba(15, 23, 42, 0.06) !important;
            backdrop-filter: blur(16px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(16px) saturate(160%) !important;
            display: flex !important;
            align-items: center !important;
            gap: 12px !important;
            overflow: hidden !important;
          }

          .sams-toast-premium [data-sonner-toast]::before {
            content: '';
            position: absolute;
            left: 0;
            top: 14px;
            bottom: 14px;
            width: 4px;
            border-radius: 999px;
            background: #2563eb;
          }

          .sams-toast-premium [data-sonner-toast][data-type='success'] {
            border-color: #bbf7d0 !important;
          }

          .sams-toast-premium [data-sonner-toast][data-type='success']::before {
            background: #16a34a;
          }

          .sams-toast-premium [data-sonner-toast][data-type='error'] {
            border-color: #fecaca !important;
          }

          .sams-toast-premium [data-sonner-toast][data-type='error']::before {
            background: #dc2626;
          }

          .sams-toast-premium [data-sonner-toast][data-type='warning'] {
            border-color: #fde68a !important;
          }

          .sams-toast-premium [data-sonner-toast][data-type='warning']::before {
            background: #d97706;
          }

          .sams-toast-premium [data-sonner-toast][data-type='info'] {
            border-color: #bfdbfe !important;
          }

          .sams-toast-premium [data-sonner-toast][data-type='info']::before {
            background: #2563eb;
          }

          .sams-toast-premium [data-icon] {
            width: 40px !important;
            height: 40px !important;
            min-width: 40px !important;
            margin: 0 !important;
            border-radius: 14px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #eff6ff !important;
            border: 1px solid #bfdbfe !important;
            color: #2563eb !important;
            flex-shrink: 0 !important;
          }

          .sams-toast-premium [data-sonner-toast][data-type='success'] [data-icon] {
            background: #ecfdf3 !important;
            border-color: #bbf7d0 !important;
            color: #16a34a !important;
          }

          .sams-toast-premium [data-sonner-toast][data-type='error'] [data-icon] {
            background: #fef2f2 !important;
            border-color: #fecaca !important;
            color: #dc2626 !important;
          }

          .sams-toast-premium [data-sonner-toast][data-type='warning'] [data-icon] {
            background: #fffbeb !important;
            border-color: #fde68a !important;
            color: #d97706 !important;
          }

          .sams-toast-premium [data-sonner-toast][data-type='info'] [data-icon] {
            background: #eff6ff !important;
            border-color: #bfdbfe !important;
            color: #2563eb !important;
          }

          .sams-toast-premium [data-content] {
            padding: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            gap: 2px !important;
            min-width: 0 !important;
          }

          .sams-toast-premium [data-title] {
            margin: 0 !important;
            font-family: var(--font-ui), Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            font-size: 14.5px !important;
            font-weight: 900 !important;
            line-height: 1.25 !important;
            letter-spacing: -0.015em !important;
            color: #0f172a !important;
          }

          .sams-toast-premium [data-description] {
            margin: 1px 0 0 !important;
            font-family: var(--font-ui), Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            font-size: 12.5px !important;
            font-weight: 650 !important;
            line-height: 1.45 !important;
            color: #64748b !important;
          }

          .sams-toast-premium [data-close-button] {
            width: 28px !important;
            height: 28px !important;
            right: 10px !important;
            top: 10px !important;
            border-radius: 10px !important;
            border: 1px solid #e2e8f0 !important;
            background: #ffffff !important;
            color: #64748b !important;
            box-shadow: 0 4px 10px rgba(15, 23, 42, 0.08) !important;
          }

          .sams-toast-premium [data-close-button]:hover {
            background: #f8fafc !important;
            color: #0f172a !important;
          }

          .sams-toast-premium [data-button] {
            height: 34px !important;
            padding: 0 13px !important;
            border-radius: 12px !important;
            font-size: 12.5px !important;
            font-weight: 850 !important;
          }

          @media (max-width: 640px) {
            .sams-toast-premium [data-sonner-toast] {
              width: calc(100vw - 28px) !important;
              min-height: 72px !important;
            }
          }
        `}</style>

        <Toaster
          className="sams-toast-premium"
          position="top-right"
          richColors={false}
          closeButton
          expand={false}
          visibleToasts={4}
          gap={10}
          offset={18}
          toastOptions={{
            duration: 2800,
            style: {
              fontFamily:
                "var(--font-ui), Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            },
          }}
        />
      </QueryClientProvider>
    </ErrorBoundary>
  );
}