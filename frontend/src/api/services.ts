import { apiClient } from './client';
import {
  AuthResponse,
  Categoria,
  Cliente,
  MovimientoKardex,
  OrdenDespacho,
  Producto,
  Proforma,
  RespuestaReporteConciliacion,
  RespuestaReporteDespachos,
  RespuestaReporteMenorStock,
  RespuestaReporteMovimientos,
  RespuestaReporteStock,
  StockItem,
  Ubicacion,
  Usuario,
  Vehiculo,
  CargaDistribucion,
  BodegaMovilActiva,
  Liquidacion,
  CrearLiquidacionPayload,
  ActaLiquidacion,
  RespuestaReporteRutas,
  RespuestaReporteIncidencias,
  RespuestaAuditoriaDistribucion,
  DispositivoMovil,
  RespuestaPullSync,
  RespuestaPushSync,
  OperacionObservadaItem,
  ResolverOperacionObservadaPayload,
  RespuestaResolverOperacion,
} from '../types';

export const authApi = {
  login: async (username: string, password: string): Promise<AuthResponse> => {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', {
      username,
      password,
    });
    return data;
  },
  perfil: async () => {
    const { data } = await apiClient.get('/auth/perfil');
    return data;
  },
};

export const ubicacionesApi = {
  listar: async (tipo?: string): Promise<Ubicacion[]> => {
    const { data } = await apiClient.get<Ubicacion[]>('/almacenes', {
      params: { tipo, soloActivos: true },
    });
    return data;
  },
  crear: async (datos: Partial<Ubicacion>): Promise<Ubicacion> => {
    const { data } = await apiClient.post<Ubicacion>('/almacenes', datos);
    return data;
  },
};

export const catalogoApi = {
  listarCategorias: async (): Promise<Categoria[]> => {
    const { data } = await apiClient.get<Categoria[]>('/categorias');
    return data;
  },
  listarProductos: async (categoriaId?: string): Promise<Producto[]> => {
    const { data } = await apiClient.get<Producto[]>('/productos', {
      params: { categoriaId, soloActivos: true },
    });
    return data;
  },
  crearProducto: async (datos: any): Promise<Producto> => {
    const { data } = await apiClient.post<Producto>('/productos', datos);
    return data;
  },
  crearPresentacion: async (
    productoId: string,
    datos: { nombre: string; factor: number },
  ) => {
    const { data } = await apiClient.post(
      `/productos/${productoId}/presentaciones`,
      datos,
    );
    return data;
  },
  listarListasPrecio: async () => {
    const { data } = await apiClient.get('/listas-precio');
    return data;
  },
  asignarPrecio: async (datos: {
    producto_id: string;
    lista_precio_id: string;
    precio: number;
  }) => {
    const { data } = await apiClient.post('/precios', datos);
    return data;
  },
  consultarPrecioCliente: async (clienteId: string, productoId: string) => {
    const { data } = await apiClient.get(
      `/precios/cliente/${clienteId}/producto/${productoId}`,
    );
    return data;
  },
};

export const stockApi = {
  consultar: async (ubicacionId?: string, productoId?: string): Promise<StockItem[]> => {
    const { data } = await apiClient.get<StockItem[]>('/stock', {
      params: { ubicacion_id: ubicacionId, producto_id: productoId },
    });
    return data;
  },
};

export const kardexApi = {
  consultar: async (params: any) => {
    const { data } = await apiClient.get('/kardex', { params });
    return data;
  },
  conciliar: async (productoId: string, ubicacionId: string) => {
    const { data } = await apiClient.get('/kardex/conciliacion', {
      params: { producto_id: productoId, ubicacion_id: ubicacionId },
    });
    return data;
  },
};

export const inventarioApi = {
  ingreso: async (datos: any) => {
    const { data } = await apiClient.post('/inventario/ingreso', datos);
    return data;
  },
  salida: async (datos: any) => {
    const { data } = await apiClient.post('/inventario/salida', datos);
    return data;
  },
  ajuste: async (datos: any) => {
    const { data } = await apiClient.post('/inventario/ajuste', datos);
    return data;
  },
  traslado: async (datos: any) => {
    const { data } = await apiClient.post('/inventario/traslado', datos);
    return data;
  },
  listarTraslados: async (params?: any) => {
    const { data } = await apiClient.get('/inventario/traslados', { params });
    return data;
  },
};

export const despachoApi = {
  crearProforma: async (datos: any): Promise<Proforma> => {
    const { data } = await apiClient.post<Proforma>('/despacho/proformas', datos);
    return data;
  },
  cambiarEstado: async (id: string, nuevoEstado: string, motivo?: string): Promise<Proforma> => {
    const { data } = await apiClient.patch<Proforma>(`/despacho/proformas/${id}/estado`, {
      nuevo_estado: nuevoEstado,
      motivo,
    });
    return data;
  },
  listarProformas: async (params?: any) => {
    const { data } = await apiClient.get('/despacho/proformas', { params });
    return data;
  },
  buscarPorId: async (id: string): Promise<Proforma> => {
    const { data } = await apiClient.get<Proforma>(`/despacho/proformas/${id}`);
    return data;
  },
  obtenerOrdenDespacho: async (id: string): Promise<OrdenDespacho> => {
    const { data } = await apiClient.get<OrdenDespacho>(
      `/despacho/proformas/${id}/orden-despacho`,
    );
    return data;
  },
};

export const clientesApi = {
  listar: async (): Promise<Cliente[]> => {
    const { data } = await apiClient.get<Cliente[]>('/clientes');
    return data;
  },
  crear: async (datos: any): Promise<Cliente> => {
    const { data } = await apiClient.post<Cliente>('/clientes', datos);
    return data;
  },
};

export const reportesApi = {
  stockAlmacen: async (params?: any): Promise<RespuestaReporteStock> => {
    const { data } = await apiClient.get<RespuestaReporteStock>('/reportes/stock-almacen', {
      params,
    });
    return data;
  },
  movimientosKardex: async (params?: any): Promise<RespuestaReporteMovimientos> => {
    const { data } = await apiClient.get<RespuestaReporteMovimientos>('/reportes/movimientos-kardex', {
      params,
    });
    return data;
  },
  menorStock: async (params?: any): Promise<RespuestaReporteMenorStock> => {
    const { data } = await apiClient.get<RespuestaReporteMenorStock>('/reportes/menor-stock', {
      params,
    });
    return data;
  },
  despachos: async (params?: any): Promise<RespuestaReporteDespachos> => {
    const { data } = await apiClient.get<RespuestaReporteDespachos>('/reportes/despachos', {
      params,
    });
    return data;
  },
  conciliacion: async (ubicacionId?: string): Promise<RespuestaReporteConciliacion> => {
    const { data } = await apiClient.get<RespuestaReporteConciliacion>('/reportes/conciliacion', {
      params: { ubicacion_id: ubicacionId },
    });
    return data;
  },
  resumenRutas: async (params?: any): Promise<RespuestaReporteRutas> => {
    const { data } = await apiClient.get<RespuestaReporteRutas>('/reportes/distribucion/resumen-rutas', {
      params,
    });
    return data;
  },
  incidenciasDistribucion: async (params?: any): Promise<RespuestaReporteIncidencias> => {
    const { data } = await apiClient.get<RespuestaReporteIncidencias>('/reportes/distribucion/incidencias', {
      params,
    });
    return data;
  },
  auditoriaDistribucion: async (params?: any): Promise<RespuestaAuditoriaDistribucion> => {
    const { data } = await apiClient.get<RespuestaAuditoriaDistribucion>('/reportes/distribucion/auditoria', {
      params,
    });
    return data;
  },
  descargarCsv: async (endpoint: string, params: any = {}, nombreArchivo: string = 'reporte.csv') => {
    const response = await apiClient.get(`/reportes/${endpoint}`, {
      params: { ...params, formato: 'csv' },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data], { type: 'text/csv;charset=utf-8;' }));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', nombreArchivo);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};

export const usuariosApi = {
  listar: async (): Promise<Usuario[]> => {
    const { data } = await apiClient.get<Usuario[]>('/usuarios');
    return data;
  },
  listarTrabajadoresActivos: async (): Promise<Usuario[]> => {
    const { data } = await apiClient.get<Usuario[]>('/usuarios/trabajadores-activos');
    return data;
  },
  crear: async (datos: any): Promise<Usuario> => {
    const { data } = await apiClient.post<Usuario>('/usuarios', datos);
    return data;
  },
  actualizar: async (id: string, datos: any): Promise<Usuario> => {
    const { data } = await apiClient.patch<Usuario>(`/usuarios/${id}`, datos);
    return data;
  },
  cambiarRol: async (id: string, rol: string): Promise<Usuario> => {
    const { data } = await apiClient.patch<Usuario>(`/usuarios/${id}/rol`, { rol });
    return data;
  },
  cambiarEstado: async (id: string, activo: boolean): Promise<Usuario> => {
    const { data } = await apiClient.patch<Usuario>(`/usuarios/${id}/estado`, { activo });
    return data;
  },
  resetPassword: async (id: string, password: string): Promise<{ mensaje: string }> => {
    const { data } = await apiClient.post<{ mensaje: string }>(
      `/usuarios/${id}/reset-password`,
      { password },
    );
    return data;
  },
};

export const distribucionApi = {
  listarVehiculos: async (params?: { soloActivos?: boolean; busqueda?: string }): Promise<Vehiculo[]> => {
    const { data } = await apiClient.get<Vehiculo[]>('/distribucion/vehiculos', { params });
    return data;
  },
  crearVehiculo: async (datos: Partial<Vehiculo>): Promise<Vehiculo> => {
    const { data } = await apiClient.post<Vehiculo>('/distribucion/vehiculos', datos);
    return data;
  },
  buscarVehiculoPorId: async (id: string): Promise<Vehiculo> => {
    const { data } = await apiClient.get<Vehiculo>(`/distribucion/vehiculos/${id}`);
    return data;
  },
  actualizarVehiculo: async (id: string, datos: Partial<Vehiculo>): Promise<Vehiculo> => {
    const { data } = await apiClient.patch<Vehiculo>(`/distribucion/vehiculos/${id}`, datos);
    return data;
  },
  eliminarVehiculo: async (id: string): Promise<{ mensaje: string; vehiculo: Vehiculo }> => {
    const { data } = await apiClient.delete<{ mensaje: string; vehiculo: Vehiculo }>(
      `/distribucion/vehiculos/${id}`,
    );
    return data;
  },
  crearCarga: async (datos: any): Promise<CargaDistribucion> => {
    const { data } = await apiClient.post<CargaDistribucion>('/distribucion/cargas', datos);
    return data;
  },
  despacharCarga: async (id: string): Promise<CargaDistribucion> => {
    const { data } = await apiClient.patch<CargaDistribucion>(
      `/distribucion/cargas/${id}/despachar`,
    );
    return data;
  },
  listarCargas: async (params?: any): Promise<{ total: number; items: CargaDistribucion[] }> => {
    const { data } = await apiClient.get<{ total: number; items: CargaDistribucion[] }>(
      '/distribucion/cargas',
      { params },
    );
    return data;
  },
  buscarCargaPorId: async (id: string): Promise<CargaDistribucion> => {
    const { data } = await apiClient.get<CargaDistribucion>(`/distribucion/cargas/${id}`);
    return data;
  },
  obtenerBodegasMoviles: async (): Promise<BodegaMovilActiva[]> => {
    const { data } = await apiClient.get<BodegaMovilActiva[]>('/distribucion/bodegas-moviles');
    return data;
  },
};

export const liquidacionesApi = {
  liquidarCarga: async (datos: CrearLiquidacionPayload): Promise<Liquidacion> => {
    const { data } = await apiClient.post<Liquidacion>('/distribucion/liquidaciones', datos);
    return data;
  },
  listar: async (params?: any): Promise<{ total: number; items: Liquidacion[] }> => {
    const { data } = await apiClient.get<{ total: number; items: Liquidacion[] }>(
      '/distribucion/liquidaciones',
      { params },
    );
    return data;
  },
  buscarPorId: async (id: string): Promise<Liquidacion> => {
    const { data } = await apiClient.get<Liquidacion>(`/distribucion/liquidaciones/${id}`);
    return data;
  },
  buscarPorCargaId: async (cargaId: string): Promise<Liquidacion> => {
    const { data } = await apiClient.get<Liquidacion>(
      `/distribucion/liquidaciones/carga/${cargaId}`,
    );
    return data;
  },
  obtenerActa: async (id: string): Promise<ActaLiquidacion> => {
    const { data } = await apiClient.get<ActaLiquidacion>(
      `/distribucion/liquidaciones/${id}/acta`,
    );
    return data;
  },
};

export const syncApi = {
  listarDispositivos: async (params?: {
    estado?: string;
    busqueda?: string;
  }): Promise<DispositivoMovil[]> => {
    const { data } = await apiClient.get<DispositivoMovil[]>('/sync/dispositivos', { params });
    return data;
  },
  autorizarDispositivo: async (
    id: string,
  ): Promise<{ mensaje: string; dispositivo: DispositivoMovil }> => {
    const { data } = await apiClient.patch(`/sync/dispositivos/${id}/autorizar`);
    return data;
  },
  revocarDispositivo: async (
    id: string,
  ): Promise<{ mensaje: string; dispositivo: DispositivoMovil }> => {
    const { data } = await apiClient.patch(`/sync/dispositivos/${id}/revocar`);
    return data;
  },
  alternarEstadoDispositivo: async (
    id: string,
    activo: boolean,
  ): Promise<{ mensaje: string; dispositivo: DispositivoMovil }> => {
    const { data } = await apiClient.patch(`/sync/dispositivos/${id}/estado`, { activo });
    return data;
  },
  registrarDispositivo: async (
    datos: Partial<DispositivoMovil>,
  ): Promise<{ mensaje: string; dispositivo: DispositivoMovil }> => {
    const { data } = await apiClient.post('/sync/dispositivos/registrar', datos);
    return data;
  },
  pull: async (
    params?: { ultima_sincronizacion?: string; dispositivo_id?: string; codigo_dispositivo?: string },
    deviceId?: string,
  ): Promise<RespuestaPullSync> => {
    const headers: Record<string, string> = {
      'X-App-Version': '1.0.0',
    };
    if (deviceId) {
      headers['X-Device-Id'] = deviceId;
    }
    const { data } = await apiClient.get<RespuestaPullSync>('/sync/pull', {
      params,
      headers,
    });
    return data;
  },
  push: async (
    payload: { dispositivo_id?: string; codigo_dispositivo?: string; operaciones: any[] },
    deviceId?: string,
  ): Promise<RespuestaPushSync> => {
    const headers: Record<string, string> = {
      'X-App-Version': '1.0.0',
    };
    if (deviceId) {
      headers['X-Device-Id'] = deviceId;
    }
    const { data } = await apiClient.post<RespuestaPushSync>('/sync/push', payload, {
      headers,
    });
    return data;
  },
  operacionesObservadas: async (
    params?: any,
  ): Promise<{ total: number; resumen: any; items: OperacionObservadaItem[] }> => {
    const { data } = await apiClient.get('/sync/operaciones-observadas', {
      params,
    });
    return data;
  },
  obtenerOperacionObservadaPorId: async (id: string): Promise<OperacionObservadaItem> => {
    const { data } = await apiClient.get<OperacionObservadaItem>(
      `/sync/operaciones-observadas/${id}`,
    );
    return data;
  },
  resolverOperacionObservada: async (
    id: string,
    payload: ResolverOperacionObservadaPayload,
  ): Promise<RespuestaResolverOperacion> => {
    const { data } = await apiClient.patch<RespuestaResolverOperacion>(
      `/sync/operaciones-observadas/${id}/resolver`,
      payload,
    );
    return data;
  },
  descargarCsvOperacionesObservadas: async (params?: any): Promise<Blob> => {
    const { data } = await apiClient.get('/sync/operaciones-observadas', {
      params: { ...params, formato: 'csv' },
      responseType: 'blob',
    });
    return data;
  },
};

export const almacenesApi = {
  listar: async (params?: { tipo?: string; padreId?: string; soloActivos?: boolean }): Promise<Ubicacion[]> => {
    const { data } = await apiClient.get<Ubicacion[]>('/almacenes', { params });
    return data;
  },
};



