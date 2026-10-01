import { openDB, DBSchema, IDBPDatabase } from 'idb';
import {
  Categoria,
  Cliente,
  Producto,
  CargaActivaMovil,
  OperacionSyncLocal,
  DispositivoMovil,
} from '../types';

export interface CatalogoLocal {
  categorias: Categoria[];
  productos: Producto[];
  presentaciones: any[];
  listasPrecios: any[];
}

export interface AgroControlDBSchema extends DBSchema {
  catalogo: {
    key: string; // 'actual'
    value: CatalogoLocal;
  };
  clientes: {
    key: string; // cliente.id
    value: Cliente;
  };
  carga_activa: {
    key: string; // 'actual'
    value: CargaActivaMovil;
  };
  operaciones_pendientes_queue: {
    key: string; // operacion.id (UUID)
    value: OperacionSyncLocal;
  };
  metadata: {
    key: string; // 'device_id' | 'device_code' | 'device_info' | 'ultima_sync'
    value: any;
  };
}

const DB_NAME = 'agrocontrol_movil_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AgroControlDBSchema>> | null = null;

export function getMobileDB(): Promise<IDBPDatabase<AgroControlDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<AgroControlDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('catalogo')) {
          db.createObjectStore('catalogo');
        }
        if (!db.objectStoreNames.contains('clientes')) {
          db.createObjectStore('clientes', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('carga_activa')) {
          db.createObjectStore('carga_activa');
        }
        if (!db.objectStoreNames.contains('operaciones_pendientes_queue')) {
          db.createObjectStore('operaciones_pendientes_queue', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata');
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Migra datos legados desde localStorage hacia IndexedDB si existen
 * para evitar pérdida de datos en actualizaciones del cliente.
 */
export async function migrarDesdeLocalStorageSiExiste(): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return;

  try {
    const rawCola = localStorage.getItem('agrocontrol_movil_cola_operaciones');
    const rawCatalogo = localStorage.getItem('agrocontrol_movil_catalogo');
    const rawClientes = localStorage.getItem('agrocontrol_movil_clientes');
    const rawCarga = localStorage.getItem('agrocontrol_movil_carga_activa');
    const rawSync = localStorage.getItem('agrocontrol_movil_ultima_sync');
    const rawDeviceId = localStorage.getItem('agrocontrol_movil_device_id');
    const rawDeviceCode = localStorage.getItem('agrocontrol_movil_device_code');
    const rawDeviceInfo = localStorage.getItem('agrocontrol_movil_device_info');

    if (rawCola || rawCatalogo || rawClientes || rawCarga || rawSync) {
      const db = await getMobileDB();

      const count = await db.count('operaciones_pendientes_queue');
      if (count === 0 && rawCola) {
        const ops: OperacionSyncLocal[] = JSON.parse(rawCola);
        const tx = db.transaction('operaciones_pendientes_queue', 'readwrite');
        for (const op of ops) {
          await tx.objectStore('operaciones_pendientes_queue').put(op);
        }
        await tx.done;
      }

      if (rawCatalogo) {
        await db.put('catalogo', JSON.parse(rawCatalogo), 'actual');
      }

      if (rawClientes) {
        const clientesList: Cliente[] = JSON.parse(rawClientes);
        const tx = db.transaction('clientes', 'readwrite');
        for (const c of clientesList) {
          await tx.objectStore('clientes').put(c);
        }
        await tx.done;
      }

      if (rawCarga) {
        await db.put('carga_activa', JSON.parse(rawCarga), 'actual');
      }

      if (rawSync) {
        await db.put('metadata', rawSync, 'ultima_sync');
      }
      if (rawDeviceId) {
        await db.put('metadata', rawDeviceId, 'device_id');
      }
      if (rawDeviceCode) {
        await db.put('metadata', rawDeviceCode, 'device_code');
      }
      if (rawDeviceInfo) {
        await db.put('metadata', JSON.parse(rawDeviceInfo), 'device_info');
      }

      // Limpieza de claves obsoletas en localStorage
      localStorage.removeItem('agrocontrol_movil_cola_operaciones');
      localStorage.removeItem('agrocontrol_movil_catalogo');
      localStorage.removeItem('agrocontrol_movil_clientes');
      localStorage.removeItem('agrocontrol_movil_carga_activa');
      localStorage.removeItem('agrocontrol_movil_ultima_sync');
    }
  } catch (err) {
    console.warn('Migración de localStorage a IndexedDB no requerida o completada previamente:', err);
  }
}

/**
 * Carga todo el estado persistente offline desde IndexedDB
 */
export async function cargarEstadoOfflineCompleto() {
  const db = await getMobileDB();

  const [
    catalogo,
    clientes,
    cargaActiva,
    colaOperaciones,
    ultimaSync,
    deviceId,
    deviceCode,
    deviceInfo,
  ] = await Promise.all([
    db.get('catalogo', 'actual'),
    db.getAll('clientes'),
    db.get('carga_activa', 'actual'),
    db.getAll('operaciones_pendientes_queue'),
    db.get('metadata', 'ultima_sync'),
    db.get('metadata', 'device_id'),
    db.get('metadata', 'device_code'),
    db.get('metadata', 'device_info'),
  ]);

  // Ordenar cola con las operaciones más recientes primero
  const colaOrdenada = [...(colaOperaciones || [])].sort(
    (a, b) => new Date(b.fecha_operacion).getTime() - new Date(a.fecha_operacion).getTime(),
  );

  return {
    catalogo: catalogo || {
      categorias: [],
      productos: [],
      presentaciones: [],
      listasPrecios: [],
    },
    clientes: clientes || [],
    cargaActiva: cargaActiva || null,
    colaOperaciones: colaOrdenada,
    ultimaSync: (ultimaSync as string) || null,
    deviceId: (deviceId as string) || null,
    deviceCode: (deviceCode as string) || null,
    deviceInfo: (deviceInfo as DispositivoMovil) || null,
  };
}

/**
 * Persistencia atómica de Venta Local:
 * Descuenta stock en la bodega móvil de la carga activa y almacena la operación
 * en operaciones_pendientes_queue en una sola transacción readwrite ACID de IndexedDB.
 */
export async function guardarVentaAtomicaIndexedDB(
  cargaActualizada: CargaActivaMovil,
  nuevaOperacion: OperacionSyncLocal,
): Promise<void> {
  const db = await getMobileDB();
  const tx = db.transaction(['carga_activa', 'operaciones_pendientes_queue'], 'readwrite');
  await Promise.all([
    tx.objectStore('carga_activa').put(cargaActualizada, 'actual'),
    tx.objectStore('operaciones_pendientes_queue').put(nuevaOperacion),
    tx.done,
  ]);
}

/**
 * Persistencia atómica de la descarga del catálogo, clientes y carga activa
 */
export async function guardarPullIndexedDB(datos: {
  catalogo: CatalogoLocal;
  clientes: Cliente[];
  cargaActiva?: CargaActivaMovil | null;
  ultimaSync: string;
}): Promise<void> {
  const db = await getMobileDB();
  const stores: Array<'catalogo' | 'clientes' | 'carga_activa' | 'metadata'> = [
    'catalogo',
    'clientes',
    'metadata',
  ];
  if (datos.cargaActiva) {
    stores.push('carga_activa');
  }

  const tx = db.transaction(stores, 'readwrite');
  await tx.objectStore('catalogo').put(datos.catalogo, 'actual');

  const clientesStore = tx.objectStore('clientes');
  await clientesStore.clear();
  for (const c of datos.clientes) {
    await clientesStore.put(c);
  }

  if (datos.cargaActiva) {
    await tx.objectStore('carga_activa').put(datos.cargaActiva, 'actual');
  }

  await tx.objectStore('metadata').put(datos.ultimaSync, 'ultima_sync');
  await tx.done;
}

/**
 * Actualiza el estado de las operaciones de la cola tras una sincronización push
 */
export async function actualizarColaIndexedDB(operaciones: OperacionSyncLocal[]): Promise<void> {
  const db = await getMobileDB();
  const tx = db.transaction('operaciones_pendientes_queue', 'readwrite');
  const store = tx.objectStore('operaciones_pendientes_queue');
  for (const op of operaciones) {
    await store.put(op);
  }
  await tx.done;
}

/**
 * Limpia de IndexedDB las operaciones que ya fueron sincronizadas con el servidor
 */
export async function limpiarSincronizadasIndexedDB(): Promise<void> {
  const db = await getMobileDB();
  const tx = db.transaction('operaciones_pendientes_queue', 'readwrite');
  const store = tx.objectStore('operaciones_pendientes_queue');
  const allOps = await store.getAll();
  for (const op of allOps) {
    if (op.estado_local === 'SINCRONIZADA') {
      await store.delete(op.id);
    }
  }
  await tx.done;
}

/**
 * Guarda un cliente registrado rápidamente en ruta
 */
export async function guardarClienteIndexedDB(cliente: Cliente): Promise<void> {
  const db = await getMobileDB();
  await db.put('clientes', cliente);
}

/**
 * Guarda información del dispositivo terminal móvil en metadata
 */
export async function guardarTerminalInfoIndexedDB(dispositivo: DispositivoMovil): Promise<void> {
  const db = await getMobileDB();
  const tx = db.transaction('metadata', 'readwrite');
  await tx.objectStore('metadata').put(dispositivo.id, 'device_id');
  await tx.objectStore('metadata').put(dispositivo.codigo_dispositivo, 'device_code');
  await tx.objectStore('metadata').put(dispositivo, 'device_info');
  await tx.done;
}
