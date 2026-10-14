import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { RolUsuario } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: RolUsuario[];
}

/**
 * Guardia de navegación (solo UX). La autorización real la aplica el backend
 * en cada endpoint (JwtAuthGuard + RolesGuard).
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, usuario } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated || !usuario) {
    // La superficie móvil tiene su propio login (vendedores en ruta).
    const destino = location.pathname.startsWith('/movil') ? '/movil/login' : '/login';
    return <Navigate to={destino} replace />;
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
