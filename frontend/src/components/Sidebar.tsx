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
  X
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const Sidebar: React.FC<{ onClose?: () => void }> = ({ onClose }) => {
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
    <aside className="w-[280px] bg-[#eef3ef] text-[#4a6352] flex flex-col flex-shrink-0 h-full relative z-20 shadow-[4px_0_24px_rgba(0,0,0,0.03)] border-r border-[#dce5df]/60">
      {/* Botón cerrar para móvil */}
      {onClose && (
        <button 
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 bg-[#dce5df] text-[#3b5e47] rounded-full hover:bg-[#c8d6ce]"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Logotipo del Sistema Central */}
      <div className="h-24 px-8 flex items-center gap-4 bg-transparent pt-4">
        <div className="w-11 h-11 rounded-[14px] bg-[#3b5e47] flex items-center justify-center text-white shadow-lg shadow-[#3b5e47]/30">
          <Sprout className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-black text-[#2d4735] text-[1.1rem] leading-none tracking-tight">
            AgroControl <span className="text-[#529363]">Pro</span>
          </h1>
          <span className="text-[10px] text-[#7a9382] font-bold tracking-wide mt-1 block">
            PC Local Comercial
          </span>
        </div>
      </div>

      {/* Menú de Navegación */}
      <nav className="flex-1 px-5 py-6 space-y-1.5 overflow-y-auto no-scrollbar">
        {navItems
          .filter((item) => usuario?.rol && item.roles.includes(usuario.rol))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3.5 rounded-full text-[13px] font-bold transition-all ${
                    isActive
                      ? 'bg-[#dce5df] text-[#2d4735] shadow-sm'
                      : 'text-[#5a7563] hover:text-[#2d4735] hover:bg-[#dce5df]/50'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon className={`w-[18px] h-[18px] flex-shrink-0 ${isActive ? 'text-[#3b5e47]' : 'text-[#7a9382]'}`} />
                    <span>{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
      </nav>

      {/* Botón de acceso directo a Terminal Móvil de Ruta */}
      <div className="px-6 py-4">
        <NavLink
          to="/movil"
          onClick={onClose}
          className="flex items-center gap-3 px-4 py-4 rounded-[1.5rem] text-xs font-bold bg-white border border-[#dce5df] text-[#2d4735] hover:shadow-md transition-all shadow-sm group relative overflow-hidden"
        >
          {/* Sutil fondo verde en el hover */}
          <div className="absolute inset-0 bg-[#f4f8f5] opacity-0 group-hover:opacity-100 transition-opacity"></div>
          
          <div className="relative z-10 w-9 h-9 rounded-xl bg-[#3b5e47] text-white flex items-center justify-center group-hover:scale-105 transition-transform shadow-md shadow-[#3b5e47]/20">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="relative z-10 min-w-0">
            <span className="block leading-tight text-[#2d4735] font-black">App Móvil Ruta</span>
            <span className="text-[9px] text-[#529363] font-bold uppercase tracking-widest mt-0.5 block">Modo Offline-First</span>
          </div>
        </NavLink>
      </div>

      {/* Footer del Sidebar */}
      <div className="p-6 bg-transparent text-[10px] text-[#7a9382]">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-[#529363]" />
          <span className="font-extrabold text-[#4a6352] uppercase tracking-wider">Única Fuente de Verdad</span>
        </div>
        <p className="leading-relaxed font-medium">
          Base de datos relacional local blindada con Kárdex inmutable y triple saldo.
        </p>
      </div>
    </aside>
  );
};
