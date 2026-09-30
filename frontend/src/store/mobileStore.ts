import { create } from 'zustand';
import {
  Categoria,
  Cliente,
  Producto,
  CargaActivaMovil,
  OperacionSyncLocal,
  DetalleOperacionSync,
  DispositivoMovil,
} from '../types';
import { syncApi, clientesApi } from '../api/services';

const STORAGE_KEYS = {
  DEVICE_ID: 'agrocontrol_movil_device_id',
  DEVICE_CODE: 'agrocontrol_movil_device_code',
  DEVICE_INFO: 'agrocontrol_movil_device_info',
  CATALOGO: 'agrocontrol_movil_catalogo',
  CLIENTES: 'agrocontrol_movil_clientes',
  CARGA_ACTIVA: 'agrocontrol_movil_carga_activa',
  COLA_OPERACIONES: 'agrocontrol_movil_cola_operaciones',
  ULTIMA_SYNC: 'agrocontrol_movil_ultima_sync',
};

// Generador de UUID para clientes sin crypto.randomUUID (compatibilidad amplia)
export const generarUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

interface MobileState {
  // Identidad del Terminal
  codigoDispositivo: string;
  dispositivoId: string | null;
  dispositivo: DispositivoMovil | null;

  // Catálogos Maestros Offline
  categorias: Categoria[];
  productos: Producto[];
  presentaciones: any[];
  listasPrecios: any[];
  clientes: Cliente[];
  cargaActiva: CargaActivaMovil | null;
  ultimaSincronizacion: string | null;

  // Cola de Operaciones Offline
  colaOperaciones: OperacionSyncLocal[];

  // Estados de Conectividad y Sincronización
  isOnline: boolean;
  isSyncing: boolean;
  syncError: string | null;

  // Acciones
  setIsOnline: (online: boolean) => void;
  inicializarTerminal: () => Promise<void>;
  vincularTerminal: (modelo?: string, trabajadorId?: string) => Promise<DispositivoMovil>;
  ejecutarPull: (forzarCompleto?: boolean) => Promise<void>;
  ejecutarPush: () => Promise<{ enviadas: number; aplicadas: number; observadas: number }>;
  sincronizarTodo: () => Promise<void>;

  // Registro de Operaciones Locales (Nunca pierdas una venta)
  registrarVentaLocal: (params: {
    clienteId: string;
    clienteNombre: string;
    detalles: DetalleOperacionSync[];
    metodoPago: 'EFECTIVO' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA' | 'PENDIENTE';
    montoCobrado: number;
    observaciones?: string;
  }) => Promise<OperacionSyncLocal>;

  registrarClienteRapido: (datos: {
    numero_documento: string;
    razon_social: string;
    direccion?: string;
    telefono?: string;
  }) => Promise<Cliente>;

  limpiarHistorialSincronizado: () => void;
}

export const useMobileStore = create<MobileState>((set, get) => {
  // Inicializar estado persistente desde localStorage
  const initCodigoDispositivo = (() => {
    let code = localStorage.getItem(STORAGE_KEYS.DEVICE_CODE);
    if (!code) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      code = `TERM-ANDRO-${randomSuffix}`;
      localStorage.setItem(STORAGE_KEYS.DEVICE_CODE, code);
    }
    return code;
  })();

  const initDeviceId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
  const initDeviceInfo = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DEVICE_INFO);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const initClientes = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CLIENTES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();

  const initCatalogo = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CATALOGO);
      return raw
        ? JSON.parse(raw)
        : { categorias: [], productos: [], presentaciones: [], listasPrecios: [] };
    } catch {
      return { categorias: [], productos: [], presentaciones: [], listasPrecios: [] };
    }
  })();

  const initCargaActiva = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CARGA_ACTIVA);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  })();

  const initCola = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.COLA_OPERACIONES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  })();

  const initUltimaSync = localStorage.getItem(STORAGE_KEYS.ULTIMA_SYNC);

  return {
    codigoDispositivo: initCodigoDispositivo,
    dispositivoId: initDeviceId,
    dispositivo: initDeviceInfo,

    categorias: initCatalogo.categorias,
    productos: initCatalogo.productos,
    presentaciones: initCatalogo.presentaciones,
    listasPrecios: initCatalogo.listasPrecios,
    clientes: initClientes,
    cargaActiva: initCargaActiva,
    ultimaSincronizacion: initUltimaSync,

    colaOperaciones: initCola,

    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    syncError: null,

    setIsOnline: (online) => set({ isOnline: online }),

    inicializarTerminal: async () => {
      const { dispositivoId, vincularTerminal, ejecutarPull, isOnline } = get();
      if (!dispositivoId) {
        try {
          await vincularTerminal();
        } catch (err: any) {
          console.warn('Registro de terminal postergado por modo offline:', err.message);
        }
      }
      if (isOnline) {
        try {
          await ejecutarPull();
        } catch (err: any) {
          console.warn('Descarga inicial postergada por falta de red:', err.message);
        }
      }
    },

    vincularTerminal: async (modelo = 'Terminal Móvil Android', trabajadorId) => {
      const { codigoDispositivo } = get();
      try {
        const res = await syncApi.registrarDispositivo({
          codigo_dispositivo: codigoDispositivo,
          modelo,
          sistema_operativo: 'Android 14',
          version_app: '1.0.0',
          trabajador_id: trabajadorId,
          activo: true,
          autorizado: true,
        });

        const dev = res.dispositivo;
        localStorage.setItem(STORAGE_KEYS.DEVICE_ID, dev.id);
        localStorage.setItem(STORAGE_KEYS.DEVICE_INFO, JSON.stringify(dev));
        set({ dispositivoId: dev.id, dispositivo: dev });
        return dev;
      } catch (error: any) {
        console.error('Error al registrar terminal:', error);
        throw error;
      }
    },

    ejecutarPull: async (forzarCompleto = false) => {
      const { ultimaSincronizacion, dispositivoId, codigoDispositivo } = get();
      set({ isSyncing: true, syncError: null });

      try {
        const timestampFiltro = forzarCompleto ? undefined : ultimaSincronizacion || undefined;
        const respuesta = await syncApi.pull(
          {
            ultima_sincronizacion: timestampFiltro,
            dispositivo_id: dispositivoId || undefined,
            codigo_dispositivo: codigoDispositivo,
          },
          dispositivoId || undefined,
        );

        const nuevasCategorias = forzarCompleto
          ? respuesta.datos.categorias
          : mezclarPorId(get().categorias, respuesta.datos.categorias);

        const nuevosProductos = forzarCompleto
          ? respuesta.datos.productos
          : mezclarPorId(get().productos, respuesta.datos.productos);

        const nuevasPresentaciones = forzarCompleto
          ? respuesta.datos.presentaciones
          : mezclarPorId(get().presentaciones, respuesta.datos.presentaciones);

        const nuevasListas = forzarCompleto
          ? respuesta.datos.listas_precios
          : mezclarPorId(get().listasPrecios, respuesta.datos.listas_precios);

        const nuevosClientes = forzarCompleto
          ? respuesta.datos.clientes
          : mezclarPorId(get().clientes, respuesta.datos.clientes);

        // Guardar en Storage Local
        const catalogoGuardar = {
          categorias: nuevasCategorias,
          productos: nuevosProductos,
          presentaciones: nuevasPresentaciones,
          listasPrecios: nuevasListas,
        };
        localStorage.setItem(STORAGE_KEYS.CATALOGO, JSON.stringify(catalogoGuardar));
        localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(nuevosClientes));
        localStorage.setItem(STORAGE_KEYS.ULTIMA_SYNC, respuesta.timestamp_servidor);

        if (respuesta.datos.carga_activa) {
          localStorage.setItem(
            STORAGE_KEYS.CARGA_ACTIVA,
            JSON.stringify(respuesta.datos.carga_activa),
          );
        }

        set({
          categorias: nuevasCategorias,
          productos: nuevosProductos,
          presentaciones: nuevasPresentaciones,
          listasPrecios: nuevasListas,
          clientes: nuevosClientes,
          cargaActiva: respuesta.datos.carga_activa || get().cargaActiva,
          ultimaSincronizacion: respuesta.timestamp_servidor,
          isSyncing: false,
          syncError: null,
        });
      } catch (error: any) {
        const msg = error.response?.data?.message || error.message || 'Error al descargar datos';
        set({ isSyncing: false, syncError: msg });
        throw error;
      }
    },

    ejecutarPush: async () => {
      const { colaOperaciones, dispositivoId, codigoDispositivo } = get();
      const pendientes = colaOperaciones.filter((op) => op.estado_local === 'PENDIENTE');

      if (pendientes.length === 0) {
        return { enviadas: 0, aplicadas: 0, observadas: 0 };
      }

      set({ isSyncing: true, syncError: null });

      try {
        const payload = {
          dispositivo_id: dispositivoId || undefined,
          codigo_dispositivo: codigoDispositivo,
          operaciones: pendientes.map((op) => ({
            id: op.id,
            tipo_operacion: op.tipo_operacion,
            carga_distribucion_id: op.carga_distribucion_id,
            cliente_id: op.cliente_id,
            fecha_operacion: op.fecha_operacion,
            total: op.total,
            detalles: op.detalles.map((d) => ({
              producto_id: d.producto_id,
              presentacion_id: d.presentacion_id || undefined,
              cantidad: d.cantidad,
              precio_unitario: d.precio_unitario,
              subtotal: d.subtotal,
            })),
            observaciones: op.observaciones,
            metadatos: {
              metodo_pago: op.metodo_pago,
              monto_cobrado: op.monto_cobrado,
              cliente_nombre: op.cliente_nombre,
            },
          })),
        };

        const res = await syncApi.push(payload, dispositivoId || undefined);

        // Mapear resultados a la cola local
        const mapaResultados = new Map(res.resultados.map((r) => [r.id, r]));
        const timestampNow = new Date().toISOString();

        const colaActualizada = colaOperaciones.map((op) => {
          const resultado = mapaResultados.get(op.id);
          if (resultado) {
            return {
              ...op,
              estado_local:
                resultado.estado_sync === 'APLICADA'
                  ? ('SINCRONIZADA' as const)
                  : ('OBSERVADA' as const),
              motivo_observacion: resultado.motivo_observacion || null,
              fecha_sincronizacion: timestampNow,
            };
          }
          return op;
        });

        localStorage.setItem(STORAGE_KEYS.COLA_OPERACIONES, JSON.stringify(colaActualizada));
        set({
          colaOperaciones: colaActualizada,
          isSyncing: false,
          syncError: null,
        });

        return {
          enviadas: pendientes.length,
          aplicadas: res.total_aplicadas,
          observadas: res.total_observadas,
        };
      } catch (error: any) {
        const msg = error.response?.data?.message || error.message || 'Error al enviar operaciones';
        set({ isSyncing: false, syncError: msg });
        throw error;
      }
    },

    sincronizarTodo: async () => {
      const { ejecutarPush, ejecutarPull } = get();
      // 1. Enviar transacciones pendientes (push)
      try {
        await ejecutarPush();
      } catch (e) {
        console.warn('Push no completado, intentando pull:', e);
      }
      // 2. Descargar actualizaciones maestras (pull)
      await ejecutarPull();
    },

    registrarVentaLocal: async ({
      clienteId,
      clienteNombre,
      detalles,
      metodoPago,
      montoCobrado,
      observaciones,
    }) => {
      const { cargaActiva, colaOperaciones, isOnline, ejecutarPush } = get();

      if (!cargaActiva) {
        throw new Error('No cuenta con una carga de distribución activa asignada para operar en ruta.');
      }

      // Validar disponibilidad de stock en la Bodega Móvil local
      for (const d of detalles) {
        const itemEnCarga = cargaActiva.items.find((i) => i.producto_id === d.producto_id);
        const stockDisponible = itemEnCarga ? itemEnCarga.stock_actual_bodega_movil : 0;
        if (d.cantidad > stockDisponible) {
          throw new Error(
            `Stock insuficiente en bodega móvil para '${d.producto_nombre}'. Disponible: ${stockDisponible} unidades, Solicitado: ${d.cantidad}`,
          );
        }
      }

      const totalVenta = Number(detalles.reduce((acc, d) => acc + d.subtotal, 0).toFixed(2));
      const operacionId = generarUUID();
      const fechaOperacion = new Date().toISOString();

      const nuevaOperacion: OperacionSyncLocal = {
        id: operacionId,
        tipo_operacion: 'VENTA',
        carga_distribucion_id: cargaActiva.id,
        cliente_id: clienteId,
        cliente_nombre: clienteNombre,
        fecha_operacion: fechaOperacion,
        total: totalVenta,
        detalles,
        metodo_pago: metodoPago,
        monto_cobrado: montoCobrado,
        observaciones,
        estado_local: 'PENDIENTE',
      };

      // 1. DESCUENTO ATÓMICO EN LA BODEGA MÓVIL LOCAL
      const cargaActualizada: CargaActivaMovil = {
        ...cargaActiva,
        items: cargaActiva.items.map((item) => {
          const det = detalles.find((d) => d.producto_id === item.producto_id);
          if (det) {
            return {
              ...item,
              stock_actual_bodega_movil: Number(
                (item.stock_actual_bodega_movil - det.cantidad).toFixed(3),
              ),
            };
          }
          return item;
        }),
      };

      // 2. SALVAGUARDA LOCAL: Guardar en cola antes de cualquier intento de red
      const colaActualizada = [nuevaOperacion, ...colaOperaciones];

      localStorage.setItem(STORAGE_KEYS.CARGA_ACTIVA, JSON.stringify(cargaActualizada));
      localStorage.setItem(STORAGE_KEYS.COLA_OPERACIONES, JSON.stringify(colaActualizada));

      set({
        cargaActiva: cargaActualizada,
        colaOperaciones: colaActualizada,
      });

      // 3. INTENTO DE SINCRONIZACIÓN EN SEGUNDO PLANO (SI HAY CONEXIÓN)
      if (isOnline) {
        setTimeout(() => {
          ejecutarPush().catch((err) => {
            console.log('Operación guardada localmente. Sincronización diferida:', err.message);
          });
        }, 100);
      }

      return nuevaOperacion;
    },

    registrarClienteRapido: async ({ numero_documento, razon_social, direccion, telefono }) => {
      const { clientes, listasPrecios } = get();

      // Lista de precio por defecto (PRIMERA DISPONIBLE O DEFAULT)
      const listaDefectoId = listasPrecios[0]?.id || '00000000-0000-0000-0000-000000000001';

      const nuevoCliente: Cliente = {
        id: generarUUID(),
        tipo_documento: numero_documento.length === 11 ? 'RUC' : 'DNI',
        numero_documento,
        razon_social,
        direccion: direccion || 'En ruta',
        telefono: telefono || '',
        lista_precio_id: listaDefectoId,
        activo: true,
      };

      const clientesActualizados = [nuevoCliente, ...clientes];
      localStorage.setItem(STORAGE_KEYS.CLIENTES, JSON.stringify(clientesActualizados));
      set({ clientes: clientesActualizados });

      // Si hay conexión, intentar registrar en central en background
      if (get().isOnline) {
        clientesApi.crear(nuevoCliente).catch((err) => {
          console.warn('Cliente creado localmente, sincronización posterior:', err.message);
        });
      }

      return nuevoCliente;
    },

    limpiarHistorialSincronizado: () => {
      const { colaOperaciones } = get();
      const soloPendientesUObservadas = colaOperaciones.filter(
        (op) => op.estado_local !== 'SINCRONIZADA',
      );
      localStorage.setItem(
        STORAGE_KEYS.COLA_OPERACIONES,
        JSON.stringify(soloPendientesUObservadas),
      );
      set({ colaOperaciones: soloPendientesUObservadas });
    },
  };
});

// Helper para mezclar arreglos por propiedad id
function mezclarPorId<T extends { id: string }>(existentes: T[], nuevos: T[]): T[] {
  const mapa = new Map<string, T>(existentes.map((e) => [e.id, e]));
  for (const n of nuevos) {
    mapa.set(n.id, n);
  }
  return Array.from(mapa.values());
}
