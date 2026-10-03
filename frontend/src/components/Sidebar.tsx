import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Boxes,
  Layers,
  ArrowLeftRight,
  ClipboardList,
  Users,
  ShieldCheck,
  Sprout,
  FileText,
  Truck,
  Smartphone,
  ShieldAlert,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const Sidebar: React.FC = () => {
  const { usuario } = useAuthStore();

  const navItems = [
    {
      to: '/',
      label: 'Panel Principal',
      icon: LayoutDashboard,
      roles: [
        'ADMINISTRADOR_PROPIETARIO',
        'ADMINISTRADOR_SECUNDARIO',
        'OPERADOR_ALMACEN',
        'VENDEDOR',
      ],
    },
    {
      to: '/catalogo',
      label: 'Catálogo & Precios',
      icon: Boxes,
      roles: [
        'ADMINISTRADOR_PROPIETARIO',
        'ADMINISTRADOR_SECUNDARIO',
        'OPERADOR_ALMACEN',
        'VENDEDOR',
      ],
    },
    {
      to: '/stock',
      label: 'Stock & Kárdex',
      icon: Layers,
      roles: [
        'ADMINISTRADOR_PROPIETARIO',
        'ADMINISTRADOR_SECUNDARIO',
        'OPERADOR_ALMACEN',
        'VENDEDOR',
      ],
    },
    {
      to: '/movimientos',
      label: 'Movimientos (E/S/T/A)',
      icon: ArrowLeftRight,
      roles: [
        'ADMINISTRADOR_PROPIETARIO',
        'ADMINISTRADOR_SECUNDARIO',
        'OPERADOR_ALMACEN',
      ],
    },
    {
      to: '/despacho',
      label: 'Pedidos & Despacho',
      icon: ClipboardList,
      roles: [
        'ADMINISTRADOR_PROPIETARIO',
        'ADMINISTRADOR_SECUNDARIO',
        'OPERADOR_ALMACEN',
        'VENDEDOR',
      ],
    },
    {
      to: '/distribucion',
      label: 'Distribución (Ruta)',
      icon: Truck,
      roles: [
        'ADMINISTRADOR_PROPIETARIO',
        'ADMINISTRADOR_SECUNDARIO',
        'OPERADOR_ALMACEN',
        'VENDEDOR',
      ],
    },
    {
      to: '/clientes',
      label: 'Directorio de Clientes',
      icon: Users,
      roles: [
        'ADMINISTRADOR_PROPIETARIO',
        'ADMINISTRADOR_SECUNDARIO',
        'OPERADOR_ALMACEN',
        'VENDEDOR',
      ],
    },
    {
      to: '/reportes',
      label: 'Reportes & Conciliación',
      icon: FileText,
      roles: [
        'ADMINISTRADOR_PROPIETARIO',
        'ADMINISTRADOR_SECUNDARIO',
        'OPERADOR_ALMACEN',
        'VENDEDOR',
      ],
    },
    {
      to: '/operaciones-observadas',
      label: 'Operaciones Observadas',
      icon: ShieldAlert,
      roles: [
        'ADMINISTRADOR_PROPIETARIO',
        'ADMINISTRADOR_SECUNDARIO',
        'OPERADOR_ALMACEN',
      ],
    },
    {
      to: '/dispositivos',
      label: 'Terminales Móviles',
      icon: Smartphone,
      roles: [
        'ADMINISTRADOR_PROPIETARIO',
        'ADMINISTRADOR_SECUNDARIO',
      ],
    },
    {
      to: '/usuarios',
      label: 'Gestión de Usuarios',
      icon: ShieldCheck,
      roles: [
        'ADMINISTRADOR_PROPIETARIO',
        'ADMINISTRADOR_SECUNDARIO',
      ],
    },
  ];


  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-screen">
      {/* Logotipo del Sistema Central */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800 bg-slate-950">
        <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-900/50">
          <Sprout className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-extrabold text-white text-base leading-none tracking-tight">
            AgroControl <span className="text-emerald-400">Pro</span>
          </h1>
          <span className="text-[10px] text-slate-400 font-medium">
            PC Local Comercial
          </span>
        </div>
      </div>

      {/* Menú de Navegación */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => usuario?.rol && item.roles.includes(usuario.rol))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                  }`
                }
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
      </nav>

      {/* Botón de acceso directo a Terminal Móvil de Ruta */}
      <div className="px-3 py-2 border-t border-slate-800">
        <NavLink
          to="/movil"
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-bold bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 transition-all shadow-md group"
        >
          <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="block leading-tight text-white font-extrabold">App Móvil Ruta</span>
            <span className="text-[10px] text-emerald-400/80 font-mono">Modo Offline-First</span>
          </div>
        </NavLink>
      </div>

      {/* Footer del Sidebar */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/50 text-[11px] text-slate-500">
        <div className="flex items-center gap-2 mb-1 text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span className="font-semibold text-slate-300">Única Fuente de Verdad</span>
        </div>
        <p className="leading-tight">
          Base de datos relacional local blindada con Kárdex inmutable y triple saldo.
        </p>
      </div>
    </aside>
  );
};
