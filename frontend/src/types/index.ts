export type RolUsuario =
  | 'ADMINISTRADOR_PROPIETARIO'
  | 'ADMINISTRADOR_SECUNDARIO'
  | 'OPERADOR_ALMACEN'
  | 'VENDEDOR';

export interface Usuario {
  id: string;
  username: string;
  nombre_completo: string;
  email?: string;
  rol: RolUsuario;
  activo: boolean;
}

export interface AuthResponse {
  access_token: string;
  usuario: Usuario;
}

export interface Ubicacion {
  id: string;
  codigo: string;
  nombre: string;
  tipo: 'ALMACEN' | 'ZONA' | 'BODEGA_MOVIL';
  padre_id?: string | null;
  activo: boolean;
}

export interface Categoria {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
}

export interface Presentacion {
  id: string;
  producto_id: string;
  nombre: string;
  factor: number;
  activo: boolean;
}

export interface Producto {
  id: string;
  codigo_interno: string;
  codigo_barras?: string | null;
  nombre: string;
  descripcion?: string | null;
  unidad_base: string;
  categoria_id: string;
  categoria?: Categoria;
  presentacion?: Presentacion[];
  activo: boolean;
}

export interface ItemListaPrecio {
  id: string;
  lista_precio_id: string;
  producto_id: string;
  precio: number;
}

export interface ListaPrecio {
  id: string;
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  activo: boolean;
  items?: ItemListaPrecio[];
}

export interface Cliente {
  id: string;
  tipo_documento: string;
  numero_documento: string;
  razon_social: string;
  direccion?: string | null;
  telefono?: string | null;
  email?: string | null;
  lista_precio_id: string;
  lista_precio?: ListaPrecio;
  activo: boolean;
}

export interface StockItem {
  producto: {
    id: string;
    codigo_interno: string;
    nombre: string;
    unidad_base: string;
    activo: boolean;
  };
  ubicacion: {
    id: string;
    codigo: string;
    nombre: string;
    tipo: string;
    activo: boolean;
  };
  cantidad_fisica: number;
  cantidad_reservada: number;
  cantidad_disponible: number;
  actualizado_en: string;
}

export interface MovimientoKardex {
  id: string;
  fecha_operacion: string;
  tipo: string;
  cantidad_base: number;
  costo_unitario?: number | null;
  documento_tipo?: string | null;
  documento_id?: string | null;
  motivo?: string | null;
  producto: {
    id: string;
    codigo_interno: string;
    nombre: string;
    unidad_base: string;
  };
  ubicacion: {
    id: string;
    codigo: string;
    nombre: string;
    tipo: string;
  };
  usuario: {
    id: string;
    username: string;
    nombre_completo: string;
  };
}

export type EstadoProforma =
  | 'BORRADOR'
  | 'RESERVADO'
  | 'PREPARADO'
  | 'DESPACHADO'
  | 'ANULADO';

export interface ProformaItemDetalle {
  id: string;
  producto_id: string;
  presentacion_id?: string | null;
  cantidad_presentacion: number;
  cantidad_unidades_sueltas: number;
  cantidad_total_base: number;
  precio_unitario_base: number;
  subtotal: number;
  producto: Producto;
  presentacion?: Presentacion | null;
}

export interface Proforma {
  id: string;
  numero: string;
  cliente_id: string;
  lista_precio_id: string;
  ubicacion_id: string;
  estado: EstadoProforma;
  subtotal: number;
  igv: number;
  total: number;
  observaciones?: string | null;
  creado_en: string;
  cliente: Cliente;
  ubicacion: Ubicacion;
  usuario: Usuario;
  total_items?: number;
  proforma_detalle?: ProformaItemDetalle[];
}

export interface OrdenDespacho {
  orden_despacho_id: string;
  numero_documento: string;
  fecha_emision: string;
  estado: EstadoProforma;
  almacen_origen: {
    id: string;
    codigo: string;
    nombre: string;
  };
  cliente: {
    id: string;
    razon_social: string;
    tipo_documento: string;
    numero_documento: string;
    telefono?: string;
    direccion?: string;
  };
  vendedor: {
    id: string;
    username: string;
    nombre_completo: string;
  };
  observaciones?: string;
  items: Array<{
    linea: number;
    producto: {
      id: string;
      codigo_interno: string;
      nombre: string;
      unidad_base: string;
    };
    presentacion?: {
      id: string;
      nombre: string;
      factor: number;
    } | null;
    descripcion_empaque: string;
    cantidad_total_base: number;
    precio_unitario: number;
    subtotal: number;
  }>;
  resumen_carga: {
    total_items: number;
    total_unidades_base: number;
    total_monetario: number;
  };
}

export interface ReporteStockItem {
  producto_id: string;
  codigo_interno: string;
  nombre: string;
  categoria: string;
  almacen_id: string;
  almacen_codigo: string;
  almacen_nombre: string;
  almacen_tipo: string;
  cantidad_fisica: number;
  cantidad_reservada: number;
  cantidad_disponible: number;
  unidad_base: string;
}

export interface RespuestaReporteStock {
  items: ReporteStockItem[];
  total_items: number;
  timestamp: string;
}

export interface ReporteMovimientoItem {
  id: string;
  fecha_operacion: string;
  tipo: string;
  cantidad_base: number;
  costo_unitario?: number | null;
  documento_tipo?: string | null;
  documento_id?: string | null;
  motivo?: string | null;
  codigo_producto: string;
  nombre_producto: string;
  unidad_base: string;
  almacen: string;
  usuario: string;
}

export interface RespuestaReporteMovimientos {
  items: ReporteMovimientoItem[];
  total_items: number;
  timestamp: string;
}

export interface ReporteMenorStockItem {
  producto_id: string;
  codigo_interno: string;
  nombre: string;
  categoria: string;
  unidad_base: string;
  almacen: string;
  cantidad_fisica: number;
  cantidad_reservada: number;
  cantidad_disponible: number;
  estado_alerta: string;
}

export interface RespuestaReporteMenorStock {
  items: ReporteMenorStockItem[];
  total_items: number;
  umbral_aplicado: number;
  timestamp: string;
}

export interface ReporteDespachoItem {
  id: string;
  numero: string;
  fecha_despacho: string;
  cliente: string;
  almacen: string;
  vendedor: string;
  total_items: number;
  total_unidades_base: number;
  subtotal: number;
  igv: number;
  total: number;
}

export interface RespuestaReporteDespachos {
  items: ReporteDespachoItem[];
  total_despachos: number;
  suma_total_soles: number;
  suma_unidades_base: number;
  timestamp: string;
}

export interface ReporteConciliacionItem {
  producto_id: string;
  codigo_interno: string;
  nombre_producto: string;
  ubicacion_id: string;
  almacen_nombre: string;
  saldo_fisico: number;
  total_kardex: number;
  discrepancia: number;
  estado: 'CONCILIADO_OK' | 'DISCREPANCIA_DETECTADA';
}

export interface RespuestaReporteConciliacion {
  items: ReporteConciliacionItem[];
  total_evaluados: number;
  total_conciliados: number;
  total_discrepancias: number;
  estado_global: 'CONCILIADO_OK' | 'DISCREPANCIA_DETECTADA';
  timestamp: string;
}

// ==============================================================================
// TIPOS DE FASE 2: DISTRIBUCIÓN Y BODEGA MÓVIL
// ==============================================================================

export interface Vehiculo {
  id: string;
  placa: string;
  marca?: string | null;
  modelo?: string | null;
  tipo_vehiculo?: string | null;
  capacidad_kg?: number | null;
  capacidad_volumen?: number | null;
  conductor_habitual_id?: string | null;
  activo: boolean;
  observaciones?: string | null;
  creado_en: string;
  actualizado_en: string;
  conductor_habitual?: {
    id: string;
    nombre_completo: string;
    username: string;
    rol: string;
    email?: string | null;
  } | null;
  bodega_movil?: {
    id: string;
    codigo: string;
    nombre: string;
    activo: boolean;
  } | null;
  carga_activa?: {
    id: string;
    codigo: string;
    fecha_salida: string;
    trabajador?: {
      id: string;
      nombre_completo: string;
    };
  } | null;
}

export interface CargaDetalle {
  id: string;
  carga_distribucion_id: string;
  producto_id: string;
  presentacion_id?: string | null;
  cantidad_presentacion: number | string;
  cantidad_unidades_sueltas: number | string;
  cantidad_total_base: number | string;
  observaciones?: string | null;
  producto: {
    id: string;
    codigo_interno: string;
    nombre: string;
    unidad_base: string;
  };
  presentacion?: {
    id: string;
    nombre: string;
    factor: number | string;
  } | null;
  stock_actual_bodega_movil?: number;
}

export interface CargaDistribucion {
  id: string;
  codigo: string;
  almacen_origen_id: string;
  vehiculo_id: string;
  trabajador_id: string;
  bodega_movil_id: string;
  estado: 'PENDIENTE' | 'EN_RUTA' | 'FINALIZADA';
  fecha_salida: string;
  fecha_cierre?: string | null;
  observaciones?: string | null;
  creado_por: string;
  despachado_por?: string | null;
  creado_en: string;
  actualizado_en: string;
  almacen_origen: {
    id: string;
    codigo: string;
    nombre: string;
  };
  vehiculo: {
    id: string;
    placa: string;
    marca?: string | null;
    modelo?: string | null;
  };
  trabajador: {
    id: string;
    nombre_completo: string;
    username: string;
    email?: string | null;
  };
  bodega_movil: {
    id: string;
    codigo: string;
    nombre: string;
  };
  usuario_creador?: {
    id: string;
    nombre_completo: string;
    username: string;
  };
  usuario_despachador?: {
    id: string;
    nombre_completo: string;
    username: string;
  } | null;
  carga_detalle: CargaDetalle[];
  liquidacion?: {
    id: string;
    codigo: string;
    estado: string;
  } | null;
}

export interface BodegaMovilActiva {
  bodega_movil_id: string;
  codigo: string;
  nombre: string;
  vehiculo: {
    id: string;
    placa: string;
    marca?: string | null;
    modelo?: string | null;
    tipo_vehiculo?: string | null;
    activo: boolean;
  } | null;
  trabajador: {
    id: string;
    nombre_completo: string;
    username: string;
    email?: string | null;
  } | null;
  carga_activa?: {
    id: string;
    codigo: string;
    fecha_salida: string;
    trabajador?: {
      id: string;
      nombre_completo: string;
    };
  } | null;
  total_items: number;
  existencias: Array<{
    producto_id: string;
    codigo_interno: string;
    nombre: string;
    categoria: string;
    unidad_base: string;
    cantidad_fisica: number;
    presentaciones_disponibles: Presentacion[];
  }>;
}

export interface LiquidacionDetalle {
  id: string;
  liquidacion_id: string;
  producto_id: string;
  presentacion_id?: string | null;
  cantidad_cargada: number | string;
  cantidad_vendida: number | string;
  cantidad_retornada: number | string;
  diferencia: number | string;
  justificacion?: string | null;
  precio_unitario_promedio: number | string;
  subtotal_vendido: number | string;
  producto: {
    id: string;
    codigo_interno: string;
    nombre: string;
    unidad_base: string;
  };
  presentacion?: {
    id: string;
    nombre: string;
    factor: number | string;
  } | null;
}

export interface Liquidacion {
  id: string;
  codigo: string;
  carga_distribucion_id: string;
  fecha_liquidacion: string;
  usuario_liquidador_id: string;
  total_vendido: number | string;
  total_cobrado: number | string;
  diferencia_dinero: number | string;
  estado: 'CONCILIADA' | 'OBSERVADA';
  observaciones?: string | null;
  creado_en: string;
  actualizado_en: string;
  carga_distribucion: CargaDistribucion;
  usuario_liquidador: {
    id: string;
    nombre_completo: string;
    username: string;
    rol: string;
  };
  liquidacion_detalle: LiquidacionDetalle[];
}

export interface ItemLiquidacionPayload {
  producto_id: string;
  presentacion_id?: string;
  cantidad_vendida: number;
  cantidad_retornada: number;
  diferencia?: number;
  justificacion?: string;
  precio_unitario_promedio?: number;
}

export interface CrearLiquidacionPayload {
  carga_distribucion_id: string;
  total_cobrado: number;
  observaciones?: string;
  items: ItemLiquidacionPayload[];
}

// ============================================================================
// HITO 10: TIPOS PARA ACTA, REPORTES DE DISTRIBUCIÓN Y AUDITORÍA
// ============================================================================

export interface ActaLiquidacionItem {
  linea: number;
  producto_id: string;
  codigo_interno: string;
  nombre_producto: string;
  unidad_base: string;
  presentacion?: string | null;
  cantidad_cargada: number;
  cantidad_vendida: number;
  cantidad_retornada: number;
  diferencia: number;
  justificacion?: string | null;
  precio_unitario: number;
  subtotal: number;
}

export interface ActaLiquidacion {
  id: string;
  codigo: string;
  fecha_liquidacion: string;
  estado: 'CONCILIADA' | 'OBSERVADA';
  observaciones?: string | null;
  carga: {
    id: string;
    codigo: string;
    fecha_salida: string;
    fecha_cierre?: string | null;
    observaciones?: string | null;
    vehiculo: {
      id: string;
      placa: string;
      marca?: string | null;
      modelo?: string | null;
      tipo_vehiculo?: string | null;
    };
    conductor: {
      id: string;
      nombre_completo: string;
      username: string;
    };
    almacen_origen: {
      id: string;
      codigo: string;
      nombre: string;
    };
    bodega_movil: {
      id: string;
      codigo: string;
      nombre: string;
    };
  };
  liquidador: {
    id: string;
    nombre_completo: string;
    username: string;
    rol: string;
  };
  monetario: {
    total_vendido: number;
    total_cobrado: number;
    diferencia_dinero: number;
    saldo_pendiente: number;
  };
  resumen_unidades: {
    total_cargado: number;
    total_vendido: number;
    total_retornado: number;
    total_diferencia: number;
  };
  items: ActaLiquidacionItem[];
  firmas: {
    conductor: {
      titulo: string;
      leyenda: string;
      nombre: string;
      cargo: string;
    };
    liquidador: {
      titulo: string;
      leyenda: string;
      nombre: string;
      cargo: string;
    };
  };
}

export interface RendimientoConductorItem {
  conductor_id: string;
  conductor_nombre: string;
  conductor_username: string;
  vehiculo_id: string;
  vehiculo_placa: string;
  vehiculo_marca: string;
  vehiculo_modelo: string;
  cantidad_cargas: number;
  total_cargado_unidades: number;
  total_vendido_unidades: number;
  total_retornado_unidades: number;
  total_diferencia_unidades: number;
  total_vendido_soles: number;
  total_cobrado_soles: number;
  diferencia_dinero_soles: number;
  efectividad_venta_porcentaje: number;
  cargas_conciliadas: number;
  cargas_observadas: number;
}

export interface RutaLiquidadaItem {
  id: string;
  codigo_liquidacion: string;
  codigo_carga: string;
  fecha_liquidacion: string;
  conductor: string;
  vehiculo_placa: string;
  almacen_origen: string;
  total_cargado: number;
  total_vendido: number;
  total_retornado: number;
  total_diferencia: number;
  efectividad_porcentaje: number;
  total_vendido_soles: number;
  total_cobrado_soles: number;
  diferencia_dinero_soles: number;
  estado: string;
  observaciones?: string | null;
}

export interface RespuestaReporteRutas {
  resumen: {
    total_liquidaciones: number;
    total_conductores_activos: number;
    total_vehiculos_activos: number;
    total_unidades_cargadas: number;
    total_unidades_vendidas: number;
    total_unidades_retornadas: number;
    total_unidades_diferencia: number;
    efectividad_global_porcentaje: number;
    total_vendido_soles: number;
    total_cobrado_soles: number;
    diferencia_dinero_soles: number;
    total_conciliadas: number;
    total_observadas: number;
  };
  rendimiento: RendimientoConductorItem[];
  rutas: RutaLiquidadaItem[];
}

export interface IncidenciaItemDetalle {
  producto_id: string;
  codigo_interno: string;
  nombre_producto: string;
  unidad_base: string;
  presentacion?: string | null;
  cantidad_cargada: number;
  cantidad_vendida: number;
  cantidad_retornada: number;
  diferencia: number;
  tipo_diferencia: 'FALTANTE' | 'SOBRANTE' | 'CUADRADO';
  justificacion: string;
  precio_unitario: number;
  subtotal_vendido: number;
}

export interface IncidenciaLiquidacionItem {
  id: string;
  codigo_liquidacion: string;
  codigo_carga: string;
  fecha_liquidacion: string;
  conductor: string;
  conductor_id: string;
  vehiculo_placa: string;
  vehiculo_id: string;
  almacen_origen: string;
  liquidador: string;
  liquidador_rol: string;
  total_vendido: number;
  total_cobrado: number;
  diferencia_dinero: number;
  saldo_pendiente: number;
  tipo_incidencia: 'DIFERENCIA_FISICA' | 'DESCALCE_DINERO' | 'DISCREPANCIA_MIXTA';
  observaciones?: string | null;
  cantidad_items_afectados: number;
  items_con_incidencia: IncidenciaItemDetalle[];
}

export interface RespuestaReporteIncidencias {
  resumen: {
    total_incidencias: number;
    total_descalce_dinero_soles: number;
    total_unidades_afectadas: number;
    fecha_emision: string;
  };
  items: IncidenciaLiquidacionItem[];
}

export interface AuditoriaDistribucionItem {
  id: string;
  fecha: string;
  entidad: string;
  registro_id: string;
  accion: string;
  descripcion: string;
  usuario_id?: string | null;
  usuario_nombre: string;
  usuario_rol: string;
  ip_origen: string;
  valor_anterior?: any;
  valor_nuevo?: any;
}

export interface RespuestaAuditoriaDistribucion {
  total: number;
  items: AuditoriaDistribucionItem[];
}

// ==============================================================================
// TIPOS DE SINCRONIZACIÓN Y MODO MÓVIL OFFLINE (FASE 3 / HITO 12)
// ==============================================================================

export interface DispositivoMovil {
  id: string;
  codigo_dispositivo: string;
  modelo?: string | null;
  sistema_operativo?: string | null;
  version_app?: string | null;
  trabajador_id?: string | null;
  activo: boolean;
  autorizado: boolean;
  ultima_sincronizacion?: string | null;
  creado_en?: string;
  usuario?: {
    id: string;
    nombre_completo: string;
    username: string;
    rol: string;
  } | null;
}

export interface ItemCargaMovil {
  producto_id: string;
  producto_codigo: string;
  producto_nombre: string;
  unidad_base: string;
  presentacion_id?: string | null;
  presentacion_nombre?: string | null;
  presentacion_factor: number;
  factor_conversion?: number;
  precio_referencial?: number;
  cantidad_cargada_total_base: number;
  cantidad_presentacion: number;
  cantidad_sueltas: number;
  stock_actual_bodega_movil: number;
}

export interface CargaActivaMovil {
  id: string;
  codigo: string;
  estado: string;
  fecha_salida: string;
  vehiculo: {
    id: string;
    placa: string;
    marca?: string | null;
    modelo?: string | null;
    tipo_vehiculo?: string | null;
  };
  chofer?: {
    id: string;
    nombre: string;
  } | null;
  bodega_movil: {
    id: string;
    codigo: string;
    nombre: string;
  };
  almacen_origen: {
    id: string;
    codigo: string;
    nombre: string;
  };
  observaciones?: string | null;
  items: ItemCargaMovil[];
}

export interface RespuestaPullSync {
  timestamp_servidor: string;
  es_incremental: boolean;
  ultima_sincronizacion_recibida?: string | null;
  totales: {
    categorias: number;
    productos: number;
    presentaciones: number;
    listas_precios: number;
    clientes: number;
    tiene_carga_activa: boolean;
  };
  datos: {
    categorias: Categoria[];
    productos: Producto[];
    presentaciones: any[];
    listas_precios: any[];
    clientes: Cliente[];
    carga_activa: CargaActivaMovil | null;
  };
}

export interface DetalleOperacionSync {
  producto_id: string;
  producto_nombre: string;
  presentacion_id?: string | null;
  presentacion_nombre?: string | null;
  factor?: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  cajas_equivalentes?: number;
  sueltas_equivalentes?: number;
}

export interface OperacionSyncLocal {
  id: string; // UUID generado en el móvil para idempotencia
  tipo_operacion: 'VENTA' | 'COBRO' | 'DEVOLUCION' | 'SOBRANTE' | 'PEDIDO';
  carga_distribucion_id: string;
  cliente_id?: string;
  cliente_nombre?: string;
  fecha_operacion: string; // Timestamp ISO del dispositivo
  total: number;
  detalles: DetalleOperacionSync[];
  metodo_pago?: 'EFECTIVO' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA' | 'PENDIENTE';
  monto_cobrado?: number;
  observaciones?: string;
  estado_local: 'PENDIENTE' | 'SINCRONIZADA' | 'ERROR' | 'OBSERVADA';
  motivo_observacion?: string | null;
  fecha_sincronizacion?: string;
}

export interface RespuestaPushSync {
  total_recibidas: number;
  total_aplicadas: number;
  total_observadas: number;
  total_reintentos_ignorados: number;
  timestamp_servidor: string;
  resultados: Array<{
    id: string;
    tipo_operacion: string;
    estado_sync: 'APLICADA' | 'OBSERVADA';
    motivo_observacion?: string | null;
    ya_procesado: boolean;
    mensaje?: string;
  }>;
}

export interface OperacionObservadaItem {
  id: string;
  tipo_operacion: string;
  estado_sync: string;
  motivo_observacion?: string | null;
  fecha_operacion: string;
  fecha_registro: string;
  latencia_sincronizacion_segundos: number;
  latencia_minutos?: number;
  ip_origen: string;
  dispositivo?: {
    id: string;
    codigo_dispositivo: string;
    modelo?: string;
    version_app?: string;
  };
  vendedor?: {
    id: string;
    nombre_completo: string;
    username: string;
    rol: string;
  };
  resolutor?: {
    id: string;
    nombre_completo: string;
    username: string;
    rol?: string;
  } | null;
  fecha_resolucion?: string | null;
  nota_resolucion?: string | null;
  movimiento_ajuste_id?: string | null;
  carga?: {
    id: string;
    codigo: string;
    estado: string;
    vehiculo_placa: string;
    bodega_movil?: { id: string; codigo: string; nombre: string };
    almacen_origen?: { id: string; codigo: string; nombre: string };
  } | null;
  datos: any;
}

export interface ResolverOperacionObservadaPayload {
  accion: 'APROBAR' | 'RECHAZAR';
  nota_resolucion: string;
  almacen_regularizacion_id?: string;
}

export interface RespuestaResolverOperacion {
  mensaje: string;
  operacion: OperacionObservadaItem;
}



