// src/components/auth/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

interface Props {
  requiredRoles?: UserRole[];
}

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', minHeight: 200 }}>
      <div style={{
        width: 24, height: 24, border: '2px solid var(--btn-subtle-border)',
        borderTopColor: 'var(--accent)', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

export default function ProtectedRoute({ requiredRoles }: Props) {
  const { isAuth, user, isHydrated } = useAuthStore();

  if (!isHydrated) return <PageLoader />;
  if (!isAuth || !user) return <Navigate to="/login" replace />;

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
