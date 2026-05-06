// src/components/auth/ProtectedRoute.tsx
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import type { UserRole } from '@/types';

interface Props {
  requiredRoles?: UserRole[];
}

export default function ProtectedRoute({ requiredRoles }: Props) {
  const { isAuth, user } = useAuthStore();

  if (!isAuth || !user) return <Navigate to="/login" replace />;

  if (requiredRoles && !requiredRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
