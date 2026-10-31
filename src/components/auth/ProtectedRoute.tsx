import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { session, checkSessionValid } = useAuthStore();
  const location = useLocation();

  const isValid = checkSessionValid();

  if (!session || !isValid) {
    // 8. Sistem menendang (redirect) pengguna kembali ke halaman login jika belum login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
