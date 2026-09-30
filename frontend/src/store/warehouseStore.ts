import { create } from 'zustand';
import { Ubicacion } from '../types';

interface WarehouseState {
  almacenActivo: Ubicacion | null;
  almacenes: Ubicacion[];
  setAlmacenActivo: (almacen: Ubicacion) => void;
  setAlmacenes: (almacenes: Ubicacion[]) => void;
}

export const useWarehouseStore = create<WarehouseState>((set) => {
  const almacenGuardado = localStorage.getItem('agrocontrol_almacen_activo');
  let almacenInicial: Ubicacion | null = null;
  if (almacenGuardado) {
    try {
      almacenInicial = JSON.parse(almacenGuardado);
    } catch {
      almacenInicial = null;
    }
  }

  return {
    almacenActivo: almacenInicial,
    almacenes: [],
    setAlmacenActivo: (almacen) => {
      localStorage.setItem('agrocontrol_almacen_activo', JSON.stringify(almacen));
      set({ almacenActivo: almacen });
    },
    setAlmacenes: (almacenes) => {
      set((state) => {
        // Si no hay almacén activo o el activo ya no está en la lista, seleccionar el primero
        let activo = state.almacenActivo;
        if (!activo || !almacenes.some((a) => a.id === activo?.id)) {
          activo = almacenes.find((a) => a.tipo === 'ALMACEN') || almacenes[0] || null;
          if (activo) {
            localStorage.setItem('agrocontrol_almacen_activo', JSON.stringify(activo));
          }
        }
        return { almacenes, almacenActivo: activo };
      });
    },
  };
});
