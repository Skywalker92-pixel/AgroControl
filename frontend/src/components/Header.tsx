import React, { useEffect } from 'react';
import { Warehouse, LogOut, User, Bell, ChevronDown } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useWarehouseStore } from '../store/warehouseStore';
import { ubicacionesApi } from '../api/services';

export const Header: React.FC = () => {
  const { usuario, logout } = useAuthStore();
  const { almacenActivo, almacenes, setAlmacenActivo, setAlmacenes } =
    useWarehouseStore();

  useEffect(() => {
    // Cargar almacenes físicos disponibles
    ubicacionesApi.listar().then((data) => {
      setAlmacenes(data);
    }).catch((err) => {
      console.error('Error al cargar almacenes:', err);
    });
  }, [setAlmacenes]);

  const rolLabels: Record<string, { label: string; color: string }> = {
    ADMINISTRADOR_PROPIETARIO: {
      label: 'Propietario / Admin',
      color: 'bg-purple-100 text-purple-800 border-purple-200',
    },
    ADMINISTRADOR_SECUNDARIO: {
      label: 'Admin Secundario',
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200',
    },
    OPERADOR_ALMACEN: {
      label: 'Operador Almacén',
      color: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    VENDEDOR: {
      label: 'Vendedor',
      color: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    },
  };

  const rolInfo = usuario?.rol
    ? rolLabels[usuario.rol] || { label: usuario.rol, color: 'bg-slate-100 text-slate-800' }
    : { label: '', color: '' };

  return (
    <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      {/* Selector de Almacén Activo de Trabajo (Persistente) */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-lg px-3 py-1.5 shadow-sm">
          <Warehouse className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-slate-500 leading-none">
              Almacén Activo de Trabajo
            </span>
            <select
              value={almacenActivo?.id || ''}
              onChange={(e) => {
                const sel = almacenes.find((a) => a.id === e.target.value);
                if (sel) setAlmacenActivo(sel);
              }}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-4"
            >
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.codigo}] {a.nombre} {a.tipo === 'ZONA' ? '(Zona)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {almacenActivo && (
          <span className="hidden md:inline-flex text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium border border-emerald-200">
            Operando en: <strong>{almacenActivo.nombre}</strong>
          </span>
        )}
      </div>

      {/* Usuario, Rol y Salida */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="text-sm font-bold text-slate-900 leading-tight">
              {usuario?.nombre_completo || usuario?.username}
            </p>
            <span
              className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border mt-0.5 ${rolInfo.color}`}
            >
              {rolInfo.label}
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center text-slate-700 shadow-inner">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <button
          onClick={logout}
          title="Cerrar sesión"
          className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
