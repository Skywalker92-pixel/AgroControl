import React, { useEffect } from 'react';
import { Warehouse, LogOut, User, ChevronDown, Menu } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useWarehouseStore } from '../store/warehouseStore';
import { ubicacionesApi } from '../api/services';

export const Header: React.FC<{ onMenuClick?: () => void }> = ({ onMenuClick }) => {
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
      color: 'bg-transparent text-[#7a9382]',
    },
    ADMINISTRADOR_SECUNDARIO: {
      label: 'Admin Secundario',
      color: 'bg-transparent text-[#7a9382]',
    },
    OPERADOR_ALMACEN: {
      label: 'Operador Almacén',
      color: 'bg-transparent text-[#7a9382]',
    },
    VENDEDOR: {
      label: 'Vendedor',
      color: 'bg-transparent text-[#7a9382]',
    },
  };

  const rolInfo = usuario?.rol
    ? rolLabels[usuario.rol] || { label: usuario.rol, color: 'text-[#7a9382]' }
    : { label: '', color: '' };

  return (
    <header className="bg-transparent lg:h-24 px-4 lg:px-8 flex flex-col lg:flex-row items-stretch lg:items-center justify-between sticky top-0 z-30 pt-4 pb-2 gap-4">
      
      {/* Fila superior en móvil: Hamburguesa + Usuario resumido */}
      <div className="w-full flex items-center justify-between lg:hidden">
        <button 
          onClick={onMenuClick}
          className="p-3 bg-white rounded-full shadow-[0_4px_15px_rgba(0,0,0,0.02)] text-[#3b5e47] border border-[#dce5df] hover:bg-[#eef3ef]"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-3 bg-white border border-[#dce5df] rounded-full pl-5 pr-2 py-1.5 shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
           <span className="text-xs font-black text-[#2d4735]">{usuario?.username}</span>
           <div className="w-8 h-8 rounded-full bg-[#eef3ef] flex items-center justify-center text-[#3b5e47]">
            <User className="w-4 h-4" />
          </div>
          <div className="h-6 w-[1px] bg-[#dce5df]" />
          <button onClick={logout} className="p-2 text-[#7a9382] hover:text-rose-600 rounded-full">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Selector de Almacén Activo de Trabajo (Persistente) */}
      <div className="flex w-full lg:w-auto items-center gap-4">
        <div className="flex-1 lg:flex-none flex items-center gap-3 bg-white border border-[#dce5df] rounded-[1.5rem] px-5 py-2.5 shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
          <Warehouse className="w-5 h-5 text-[#529363] flex-shrink-0" />
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-[9px] uppercase font-extrabold text-[#7a9382] tracking-[0.15em] leading-none mb-1 truncate">
              Almacén Activo de Trabajo
            </span>
            <select
              value={almacenActivo?.id || ''}
              onChange={(e) => {
                const sel = almacenes.find((a) => a.id === e.target.value);
                if (sel) setAlmacenActivo(sel);
              }}
              className="bg-transparent text-[13px] font-black text-[#2d4735] focus:outline-none cursor-pointer pr-4 appearance-none w-full truncate"
            >
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>
                  [{a.codigo}] {a.nombre} {a.tipo === 'ZONA' ? '(Zona)' : ''}
                </option>
              ))}
            </select>
          </div>
          <ChevronDown className="w-4 h-4 text-[#7a9382] ml-1 flex-shrink-0" />
        </div>

        {almacenActivo && (
          <span className="hidden md:inline-flex items-center gap-2 text-[11px] px-4 py-3 bg-[#dce5df]/70 text-[#3b5e47] rounded-full font-bold">
            Operando en: <span className="text-[#2d4735]">{almacenActivo.nombre}</span>
          </span>
        )}
      </div>

      {/* Usuario, Rol y Salida en Desktop */}
      <div className="hidden lg:flex items-center gap-5 bg-white border border-[#dce5df] rounded-full pl-6 pr-2 py-2 shadow-[0_4px_15px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-3 text-right">
          <div>
            <p className="text-[13px] font-black text-[#2d4735] leading-none mb-1">
              {usuario?.nombre_completo || usuario?.username}
            </p>
            <span className={`text-[10px] font-bold ${rolInfo.color}`}>
              {rolInfo.label}
            </span>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#eef3ef] flex items-center justify-center text-[#3b5e47]">
            <User className="w-5 h-5" />
          </div>
        </div>

        <div className="h-7 w-[1px] bg-[#dce5df]" />

        <button
          onClick={logout}
          title="Cerrar sesión"
          className="p-2.5 text-[#7a9382] hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
};
