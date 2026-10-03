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
import {
  cargarEstadoOfflineCompleto,
  guardarVentaAtomicaIndexedDB,
  guardarPullIndexedDB,
  actualizarColaIndexedDB,
  limpiarSincronizadasIndexedDB,
  limpiarCargaActivaIndexedDB,
  guardarClienteIndexedDB,
  guardarTerminalInfoIndexedDB,
  migrarDesdeLocalStorageSiExiste,
} from './mobileDb';

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

  // Cola de Operaciones Offline (operaciones_pendientes_queue en IndexedDB)
  colaOperaciones: OperacionSyncLocal[];

  // Estados de Conectividad, Hidratación y Sincronización
  isOnline: boolean;
  isSyncing: boolean;
  syncError: string | null;
  isLoadedFromDb: boolean;

  // Acciones
  setIsOnline: (online: boolean) => void;
  cargarDesdeIndexedDB: () => Promise<void>;
  inicializarTerminal: () => Promise<void>;
  vincularTerminal: (modelo?: string, trabajadorId?: string) => Promise<DispositivoMovil>;
  ejecutarPull: (forzarCompleto?: boolean) => Promise<void>;
  sincronizarPull: (forzarCompleto?: boolean) => Promise<void>;
  ejecutarPush: () => Promise<{ enviadas: number; aplicadas: number; observadas: number }>;
  sincronizarTodo: () => Promise<void>;

  // Registro de Operaciones Locales con Salvaguarda Atómica en IndexedDB
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

  limpiarHistorialSincronizado: () => Promise<void>;
}

export const useMobileStore = create<MobileState>((set, get) => {
  // Inicialización de código de dispositivo sincronizado en fallback
  const initCodigoDispositivo = (() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return 'TERM-ANDRO-1001';
    }
    let code = localStorage.getItem('agrocontrol_movil_device_code');
    if (!code) {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      code = `TERM-ANDRO-${randomSuffix}`;
      localStorage.setItem('agrocontrol_movil_device_code', code);
    }
    return code;
  })();

  const initDeviceId =
    typeof window !== 'undefined' && window.localStorage
      ? localStorage.getItem('agrocontrol_movil_device_id')
      : null;

  return {
    codigoDispositivo: initCodigoDispositivo,
    dispositivoId: initDeviceId,
    dispositivo: null,

    categorias: [],
    productos: [],
    presentaciones: [],
    listasPrecios: [],
    clientes: [],
    cargaActiva: null,
    ultimaSincronizacion: null,

    colaOperaciones: [],

    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    syncError: null,
    isLoadedFromDb: false,

    setIsOnline: (online) => set({ isOnline: online }),

    /**
     * Hidrata el estado en memoria desde las tablas de IndexedDB
     */
    cargarDesdeIndexedDB: async () => {
      try {
        await migrarDesdeLocalStorageSiExiste();
        const estadoDb = await cargarEstadoOfflineCompleto();

        set({
          categorias: estadoDb.catalogo.categorias || [],
          productos: estadoDb.catalogo.productos || [],
          presentaciones: estadoDb.catalogo.presentaciones || [],
          listasPrecios: estadoDb.catalogo.listasPrecios || [],
          clientes: estadoDb.clientes || [],
          cargaActiva: estadoDb.cargaActiva || null,
          colaOperaciones: estadoDb.colaOperaciones || [],
          ultimaSincronizacion: estadoDb.ultimaSync || null,
          dispositivoId: estadoDb.deviceId || get().dispositivoId,
          codigoDispositivo: estadoDb.deviceCode || get().codigoDispositivo,
          dispositivo: estadoDb.deviceInfo || get().dispositivo,
          isLoadedFromDb: true,
        });
      } catch (err: any) {
        console.error('Error al cargar datos desde IndexedDB:', err);
      }
    },

    inicializarTerminal: async () => {
      // 1. Cargar datos transaccionales desde IndexedDB
      await get().cargarDesdeIndexedDB();

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
          version_app: '1.0.0-rc1',
          trabajador_id: trabajadorId,
          activo: true,
          autorizado: true,
        });

        const dev = res.dispositivo;

        // Persistir en IndexedDB y fallback local
        await guardarTerminalInfoIndexedDB(dev);
        if (typeof window !== 'undefined' && window.localStorage) {
          localStorage.setItem('agrocontrol_movil_device_id', dev.id);
          localStorage.setItem('agrocontrol_movil_device_code', dev.codigo_dispositivo);
        }

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

        const catalogoActualizado = {
          categorias: nuevasCategorias,
          productos: nuevosProductos,
          presentaciones: nuevasPresentaciones,
          listasPrecios: nuevasListas,
        };

        // OBS-MOB-NEW-01: Verificación explícita de carga_activa
        let cargaActualizada: CargaActivaMovil | null = null;
        if (respuesta.datos.carga_activa === null) {
          // La carga fue liquidada o el vendedor no tiene ruta activa:
          // Limpia el registro en IndexedDB y el estado en memoria sin hacer fallback a get().cargaActiva
          await limpiarCargaActivaIndexedDB();
          cargaActualizada = null;
        } else if (respuesta.datos.carga_activa !== undefined) {
          cargaActualizada = respuesta.datos.carga_activa;
        } else {
          cargaActualizada = get().cargaActiva;
        }

        // Guardar de forma transaccional en IndexedDB
        await guardarPullIndexedDB({
          catalogo: catalogoActualizado,
          clientes: nuevosClientes,
          cargaActiva: cargaActualizada,
          ultimaSync: respuesta.timestamp_servidor,
        });

        set({
          categorias: nuevasCategorias,
          productos: nuevosProductos,
          presentaciones: nuevasPresentaciones,
          listasPrecios: nuevasListas,
          clientes: nuevosClientes,
          cargaActiva: cargaActualizada,
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

    sincronizarPull: async (forzarCompleto = false) => {
      return get().ejecutarPull(forzarCompleto);
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
            carga_distribucion_id: op.carga_distribucion_id || undefined,
            cliente_id: op.cliente_id || undefined,
            fecha_operacion: op.fecha_operacion,
            total: op.total || 0,
            datos: (op as any).payload || (op as any).datos,
            detalles: (op.detalles || []).map((d) => ({
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

        // Actualizar clientes locales si el servidor devolvió un ID definitivo
        let clientesLocales = get().clientes;
        res.resultados.forEach((r: any) => {
          if (r.tipo_operacion === 'CLIENTE_NUEVO' && r.cliente_id && r.cliente_local_id) {
            clientesLocales = clientesLocales.map((c) =>
              c.id === r.cliente_local_id ? { ...c, id: r.cliente_id } : c,
            );
          }
        });

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

        // Actualizar cola en IndexedDB (operaciones_pendientes_queue)
        await actualizarColaIndexedDB(colaActualizada);

        set({
          clientes: clientesLocales,
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

      // 2. SALVAGUARDA LOCAL ATÓMICA EN INDEXEDDB
      // Escribe la carga actualizada y la nueva operación en operaciones_pendientes_queue
      // dentro de una única transacción readwrite ACID antes de intentar cualquier sincronización de red.
      await guardarVentaAtomicaIndexedDB(cargaActualizada, nuevaOperacion);

      const colaActualizada = [nuevaOperacion, ...colaOperaciones];

      set({
        cargaActiva: cargaActualizada,
        colaOperaciones: colaActualizada,
      });

      // 3. INTENTO DE SINCRONIZACIÓN EN SEGUNDO PLANO (SI HAY CONEXIÓN)
      if (isOnline) {
        setTimeout(() => {
          ejecutarPush().catch((err) => {
            console.log('Operación salvaguardada en IndexedDB. Sincronización diferida:', err.message);
          });
        }, 100);
      }

      return nuevaOperacion;
    },

    registrarClienteRapido: async ({ numero_documento, razon_social, direccion, telefono }) => {
      const { clientes, listasPrecios, colaOperaciones, isOnline, ejecutarPush } = get();

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

      // Guardar en IndexedDB
      await guardarClienteIndexedDB(nuevoCliente);

      // Encolar operación de sincronización explícita CLIENTE_NUEVO (OBS-MOB-03)
      const opCliente: OperacionSyncLocal = {
        id: generarUUID(),
        tipo_operacion: 'CLIENTE_NUEVO' as any,
        carga_distribucion_id: get().cargaActiva?.id || '',
        cliente_id: nuevoCliente.id,
        fecha_operacion: new Date().toISOString(),
        total: 0,
        detalles: [],
        observaciones: `Cliente nuevo registrado en ruta: ${razon_social}`,
        estado_local: 'PENDIENTE',
        reintentos: 0,
        creado_en: new Date().toISOString(),
        payload: {
          cliente_local_id: nuevoCliente.id,
          tipo_documento: nuevoCliente.tipo_documento,
          numero_documento: nuevoCliente.numero_documento,
          razon_social: nuevoCliente.razon_social,
          direccion: nuevoCliente.direccion,
          telefono: nuevoCliente.telefono,
          lista_precio_id: nuevoCliente.lista_precio_id,
        },
      } as any;

      const colaActualizada = [opCliente, ...colaOperaciones];
      const clientesActualizados = [nuevoCliente, ...clientes];

      set({
        clientes: clientesActualizados,
        colaOperaciones: colaActualizada,
      });

      await actualizarColaIndexedDB(colaActualizada);

      // Si hay conexión, intentar sincronizar de inmediato
      if (isOnline) {
        setTimeout(() => {
          ejecutarPush().catch((err) => {
            console.log('Cliente encolado localmente. Sincronización diferida:', err.message);
          });
        }, 100);
      }

      return nuevoCliente;
    },

    limpiarHistorialSincronizado: async () => {
      await limpiarSincronizadasIndexedDB();
      const { colaOperaciones } = get();
      const soloPendientesUObservadas = colaOperaciones.filter(
        (op) => op.estado_local !== 'SINCRONIZADA',
      );
      set({ colaOperaciones: soloPendientesUObservadas });
    },
  };
});

// Inicialización asíncrona inmediata al cargar el módulo
if (typeof window !== 'undefined') {
  useMobileStore.getState().cargarDesdeIndexedDB().catch((e) => {
    console.warn('Inicialización de IndexedDB diferida:', e);
  });
}

// Helper para mezclar arreglos por propiedad id
function mezclarPorId<T extends { id: string }>(existentes: T[], nuevos: T[]): T[] {
  const mapa = new Map<string, T>(existentes.map((e) => [e.id, e]));
  for (const n of nuevos) {
    mapa.set(n.id, n);
  }
  return Array.from(mapa.values());
}
