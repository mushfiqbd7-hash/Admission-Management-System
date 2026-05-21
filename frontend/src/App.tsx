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
          .sams-toast-center[data-sonner-toaster] {
            position: fixed !important;
            inset: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            pointer-events: none !important;
            transform: none !important;
            z-index: 99999 !important;
          }

          .sams-toast-center[data-sonner-toaster]:has([data-sonner-toast])::before {
            content: '';
            position: fixed;
            inset: 0;
            z-index: 0;
            background: rgba(15, 23, 42, 0.34);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            pointer-events: none;
          }

          .sams-toast-center [data-sonner-toast] {
            position: relative !important;
            z-index: 1 !important;
            pointer-events: auto !important;
            width: min(390px, calc(100vw - 32px)) !important;
            min-height: 86px !important;
            padding: 18px 22px !important;
            border-radius: 22px !important;
            border: 1px solid #e2e8f0 !important;
            background: rgba(255, 255, 255, 0.98) !important;
            box-shadow:
              0 26px 70px rgba(15, 23, 42, 0.24),
              0 4px 14px rgba(15, 23, 42, 0.08) !important;
            backdrop-filter: blur(14px) saturate(160%) !important;
            -webkit-backdrop-filter: blur(14px) saturate(160%) !important;
            transform: none !important;
            display: flex !important;
            align-items: center !important;
            gap: 14px !important;
            overflow: hidden !important;
          }

          .sams-toast-center [data-sonner-toast]::before {
            display: none !important;
            content: none !important;
          }

          .sams-toast-center [data-sonner-toast][data-type='success'] {
            border-color: #bbf7d0 !important;
          }

          .sams-toast-center [data-sonner-toast][data-type='error'] {
            border-color: #fecaca !important;
          }

          .sams-toast-center [data-sonner-toast][data-type='warning'] {
            border-color: #fde68a !important;
          }

          .sams-toast-center [data-sonner-toast][data-type='info'] {
            border-color: #bfdbfe !important;
          }

          .sams-toast-center [data-icon] {
            width: 42px !important;
            height: 42px !important;
            min-width: 42px !important;
            margin: 0 !important;
            border-radius: 15px !important;
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            background: #eff6ff !important;
            color: #2563eb !important;
            border: 1px solid #bfdbfe !important;
            flex-shrink: 0 !important;
          }

          .sams-toast-center [data-sonner-toast][data-type='success'] [data-icon] {
            background: #ecfdf3 !important;
            color: #16a34a !important;
            border-color: #bbf7d0 !important;
          }

          .sams-toast-center [data-sonner-toast][data-type='error'] [data-icon] {
            background: #fef2f2 !important;
            color: #dc2626 !important;
            border-color: #fecaca !important;
          }

          .sams-toast-center [data-sonner-toast][data-type='warning'] [data-icon] {
            background: #fffbeb !important;
            color: #d97706 !important;
            border-color: #fde68a !important;
          }

          .sams-toast-center [data-sonner-toast][data-type='info'] [data-icon] {
            background: #eff6ff !important;
            color: #2563eb !important;
            border-color: #bfdbfe !important;
          }

          .sams-toast-center [data-content] {
            padding: 0 !important;
            min-width: 0 !important;
            display: flex !important;
            flex-direction: column !important;
            justify-content: center !important;
            gap: 3px !important;
          }

          .sams-toast-center [data-title] {
            margin: 0 !important;
            font-family: var(--font-ui), Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            font-size: 15px !important;
            font-weight: 900 !important;
            line-height: 1.25 !important;
            letter-spacing: -0.015em !important;
            color: #0f172a !important;
          }

          .sams-toast-center [data-description] {
            margin: 0 !important;
            font-family: var(--font-ui), Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            font-size: 12.5px !important;
            font-weight: 650 !important;
            line-height: 1.45 !important;
            color: #64748b !important;
          }

          .sams-toast-center [data-close-button] {
            display: none !important;
          }

          .sams-toast-center [data-button] {
            height: 34px !important;
            padding: 0 13px !important;
            border-radius: 12px !important;
            font-size: 12.5px !important;
            font-weight: 850 !important;
          }

          @media (max-width: 640px) {
            .sams-toast-center [data-sonner-toast] {
              width: calc(100vw - 28px) !important;
              min-height: 82px !important;
              padding: 16px 18px !important;
            }
          }
        `}</style>

        <Toaster
          className="sams-toast-center"
          position="top-center"
          richColors={false}
          closeButton={false}
          expand={false}
          visibleToasts={1}
          gap={10}
          toastOptions={{
            duration: 2600,
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