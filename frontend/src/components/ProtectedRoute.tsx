import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { RolUsuario } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: RolUsuario[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, usuario } = useAuthStore();

  if (!isAuthenticated || !usuario) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(usuario.rol)) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800">Acceso Restringido</h2>
        <p className="text-sm text-slate-600 mt-2">
          Tu rol ({usuario.rol}) no tiene permisos para acceder a esta pantalla.
        </p>
      </div>
    );
  }

  return <Outlet />;
};
