-- ==============================================================================
-- AGROCONTROL PRO - MIGRACIÓN INICIAL DDL (FASE 1: NÚCLEO)
-- Archivo: 001_initial_schema_fase1.sql
-- ==============================================================================

-- Habilitar extensión para generación de identificadores UUID v4
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ------------------------------------------------------------------------------
-- 1. TABLA: categoria
-- Clasificación comercial (Fertilizantes, Herbicidas, Pesticidas, etc.)
-- NOTA: Separada conceptualmente de la ubicación física en almacén.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 2. TABLA: producto
-- El stock se calcula y persiste estrictamente en unidad_base.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS producto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_interno VARCHAR(30) NOT NULL UNIQUE,
    codigo_barras VARCHAR(50), -- POR VALIDAR: Campo opcional/nullable
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT,
    categoria_id UUID NOT NULL REFERENCES categoria(id) ON DELETE RESTRICT,
    unidad_base VARCHAR(20) NOT NULL CHECK (unidad_base IN ('botella', 'saco', 'unidad', 'kg', 'litro', 'gramo')),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice único parcial para código de barras (solo aplica cuando no es nulo)
CREATE UNIQUE INDEX IF NOT EXISTS ux_producto_barras 
    ON producto(codigo_barras) 
    WHERE codigo_barras IS NOT NULL;

CREATE INDEX IF NOT EXISTS ix_producto_categoria ON producto(categoria_id);
CREATE INDEX IF NOT EXISTS ix_producto_activo ON producto(activo);

-- ------------------------------------------------------------------------------
-- 3. TABLA: presentacion
-- Empaques comerciales (Caja x12, Saco 50 kg). Factor de conversión a unidad_base.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS presentacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    producto_id UUID NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
    nombre VARCHAR(50) NOT NULL,
    factor NUMERIC(12,3) NOT NULL CHECK (factor > 0),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_producto_presentacion UNIQUE (producto_id, nombre)
);

CREATE INDEX IF NOT EXISTS ix_presentacion_producto ON presentacion(producto_id);

-- ------------------------------------------------------------------------------
-- 4. TABLA: ubicacion
-- Estructura física y lógica: Almacenes físicos y Zonas internas.
-- (BODEGA_MOVIL reservada para Fase 2).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ubicacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(15) NOT NULL CHECK (tipo IN ('ALMACEN', 'ZONA', 'BODEGA_MOVIL')),
    padre_id UUID REFERENCES ubicacion(id) ON DELETE RESTRICT,
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    vehiculo_id UUID,      -- Campo nullable para Fase 2 (Distribución)
    trabajador_id UUID,    -- Campo nullable para Fase 2 (Distribución)
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_ubicacion_padre ON ubicacion(padre_id);
CREATE INDEX IF NOT EXISTS ix_ubicacion_tipo ON ubicacion(tipo);

-- ------------------------------------------------------------------------------
-- 5. TABLA: lista_precio
-- Define listas comerciales (Mayorista, Minorista, Distribuidor).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lista_precio (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(30) NOT NULL UNIQUE,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 6. TABLA: precio_producto
-- Precios por producto y lista. El precio lo determina el tipo de cliente / lista.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS precio_producto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lista_precio_id UUID NOT NULL REFERENCES lista_precio(id) ON DELETE RESTRICT,
    producto_id UUID NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
    precio NUMERIC(14,4) NOT NULL CHECK (precio >= 0),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_lista_producto UNIQUE (lista_precio_id, producto_id)
);

CREATE INDEX IF NOT EXISTS ix_precio_producto_lista ON precio_producto(lista_precio_id);
CREATE INDEX IF NOT EXISTS ix_precio_producto_prod ON precio_producto(producto_id);

-- ------------------------------------------------------------------------------
-- 7. TABLA: cliente
-- Clientes del negocio, asociados directamente a una lista de precios.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cliente (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo_documento VARCHAR(10) NOT NULL DEFAULT 'DNI' CHECK (tipo_documento IN ('DNI', 'RUC', 'CE', 'OTRO')),
    numero_documento VARCHAR(20) NOT NULL,
    razon_social VARCHAR(200) NOT NULL,
    direccion VARCHAR(250),
    telefono VARCHAR(30),
    email VARCHAR(100),
    lista_precio_id UUID NOT NULL REFERENCES lista_precio(id) ON DELETE RESTRICT,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_cliente_doc UNIQUE (tipo_documento, numero_documento)
);

CREATE INDEX IF NOT EXISTS ix_cliente_doc ON cliente(numero_documento);
CREATE INDEX IF NOT EXISTS ix_cliente_lista_precio ON cliente(lista_precio_id);

-- ------------------------------------------------------------------------------
-- 8. TABLA: usuario
-- Cuentas de usuario con los 4 roles autorizados para Fase 1.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuario (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    nombre_completo VARCHAR(150) NOT NULL,
    email VARCHAR(100),
    rol VARCHAR(30) NOT NULL CHECK (rol IN (
        'ADMINISTRADOR_PROPIETARIO',
        'ADMINISTRADOR_SECUNDARIO',
        'OPERADOR_ALMACEN',
        'VENDEDOR'
    )),
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------------------------
-- 9. TABLA: stock_saldo
-- Saldo materializado por producto y ubicación física.
-- Garantiza los tres saldos: Físico, Reservado y Disponible.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stock_saldo (
    producto_id UUID NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
    ubicacion_id UUID NOT NULL REFERENCES ubicacion(id) ON DELETE RESTRICT,
    cantidad_fisica NUMERIC(14,3) NOT NULL DEFAULT 0,
    cantidad_reservada NUMERIC(14,3) NOT NULL DEFAULT 0,
    -- Columna generada calculada: Disponible = Físico - Reservado
    cantidad_disponible NUMERIC(14,3) GENERATED ALWAYS AS (cantidad_fisica - cantidad_reservada) STORED,
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (producto_id, ubicacion_id),
    CONSTRAINT chk_stock_fisica_no_negativo CHECK (cantidad_fisica >= 0),
    CONSTRAINT chk_stock_reservada_valida CHECK (cantidad_reservada >= 0 AND cantidad_reservada <= cantidad_fisica)
);

CREATE INDEX IF NOT EXISTS ix_stock_saldo_ubicacion ON stock_saldo(ubicacion_id);

-- ------------------------------------------------------------------------------
-- 10. TABLA: movimiento_kardex
-- Libro mayor de inventario. LIBRO DE SOLO INSERCIÓN (APPEND-ONLY).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS movimiento_kardex (
    id UUID PRIMARY KEY, -- Clave generada por el cliente/app para idempotencia
    producto_id UUID NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
    ubicacion_id UUID NOT NULL REFERENCES ubicacion(id) ON DELETE RESTRICT,
    tipo VARCHAR(30) NOT NULL CHECK (tipo IN (
        'ENTRADA',
        'SALIDA',
        'TRASLADO_SALIDA',
        'TRASLADO_ENTRADA',
        'AJUSTE',
        'ASIGNACION_DISTRIBUCION',
        'VENTA_RUTA',
        'RETORNO_DISTRIBUCION',
        'ANULACION'
    )),
    cantidad_base NUMERIC(14,3) NOT NULL, -- Positiva entra, negativa sale
    costo_unitario NUMERIC(14,4),         -- Insumo para valorización intercambiable
    documento_tipo VARCHAR(30),           -- PROFORMA, GUIA, FACTURA_COMPRA, AJUSTE
    documento_id UUID,
    movimiento_ref_id UUID REFERENCES movimiento_kardex(id) ON DELETE RESTRICT, -- Enlace para traslados o anulaciones
    lote_id UUID,                         -- POR VALIDAR: Nullable
    motivo VARCHAR(250),                  -- Obligatorio en ajustes y traslados
    usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    dispositivo_id UUID,                  -- ID del dispositivo emisor
    fecha_operacion TIMESTAMPTZ NOT NULL, -- Hora en que ocurrió físicamente
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now() -- Hora en que se registró en la PC central
);

CREATE INDEX IF NOT EXISTS ix_kardex_prod_ubic_fecha 
    ON movimiento_kardex(producto_id, ubicacion_id, fecha_operacion);
CREATE INDEX IF NOT EXISTS ix_kardex_doc 
    ON movimiento_kardex(documento_tipo, documento_id);
CREATE INDEX IF NOT EXISTS ix_kardex_ref 
    ON movimiento_kardex(movimiento_ref_id);

-- ------------------------------------------------------------------------------
-- TRIGGER DE INMUTABILIDAD DEL KÁRDEX
-- Impide de forma absoluta operaciones de UPDATE o DELETE sobre movimiento_kardex
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION trg_kardex_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'VIOLACIÓN DE INVARIANTE: El Kárdex es un libro de solo inserción. No se permiten operaciones de UPDATE o DELETE sobre movimiento_kardex.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_no_update_delete_kardex ON movimiento_kardex;
CREATE TRIGGER trg_no_update_delete_kardex
BEFORE UPDATE OR DELETE ON movimiento_kardex
FOR EACH ROW EXECUTE FUNCTION trg_kardex_immutable();

-- ------------------------------------------------------------------------------
-- 11. TABLA: proforma y proforma_detalle
-- Flujo de despacho de mercadería con control de reservas.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proforma (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero VARCHAR(20) NOT NULL UNIQUE,
    cliente_id UUID NOT NULL REFERENCES cliente(id) ON DELETE RESTRICT,
    lista_precio_id UUID NOT NULL REFERENCES lista_precio(id) ON DELETE RESTRICT,
    ubicacion_id UUID NOT NULL REFERENCES ubicacion(id) ON DELETE RESTRICT,
    estado VARCHAR(15) NOT NULL CHECK (estado IN ('BORRADOR', 'RESERVADO', 'PREPARADO', 'DESPACHADO', 'ANULADO')),
    subtotal NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    igv NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (igv >= 0),
    total NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (total >= 0),
    observaciones TEXT,
    creado_por UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_proforma_estado ON proforma(estado);
CREATE INDEX IF NOT EXISTS ix_proforma_cliente ON proforma(cliente_id);
CREATE INDEX IF NOT EXISTS ix_proforma_ubicacion ON proforma(ubicacion_id);

CREATE TABLE IF NOT EXISTS proforma_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    proforma_id UUID NOT NULL REFERENCES proforma(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
    presentacion_id UUID REFERENCES presentacion(id) ON DELETE RESTRICT,
    cantidad_presentacion NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (cantidad_presentacion >= 0),
    cantidad_unidades_sueltas NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (cantidad_unidades_sueltas >= 0),
    cantidad_total_base NUMERIC(14,3) NOT NULL CHECK (cantidad_total_base > 0),
    precio_unitario_base NUMERIC(14,4) NOT NULL CHECK (precio_unitario_base >= 0),
    subtotal NUMERIC(14,4) NOT NULL CHECK (subtotal >= 0)
);

CREATE INDEX IF NOT EXISTS ix_proforma_detalle_proforma ON proforma_detalle(proforma_id);
CREATE INDEX IF NOT EXISTS ix_proforma_detalle_producto ON proforma_detalle(producto_id);

-- ------------------------------------------------------------------------------
-- 12. TABLA: auditoria
-- Trazabilidad y bitácora inmutable de eventos del sistema.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entidad VARCHAR(50) NOT NULL,
    registro_id UUID NOT NULL,
    accion VARCHAR(20) NOT NULL CHECK (accion IN ('INSERT', 'UPDATE', 'DELETE', 'ANULACION', 'AJUSTE', 'LOGIN')),
    valor_anterior JSONB,
    valor_nuevo JSONB,
    usuario_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
    dispositivo_id UUID,
    ip_origen VARCHAR(45),
    fecha TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_auditoria_entidad_registro ON auditoria(entidad, registro_id);
CREATE INDEX IF NOT EXISTS ix_auditoria_fecha ON auditoria(fecha);
CREATE INDEX IF NOT EXISTS ix_auditoria_usuario ON auditoria(usuario_id);
-- ==============================================================================
-- AGROCONTROL PRO - MIGRACIÓN FASE 2: DISTRIBUCIÓN Y LIQUIDACIÓN
-- Archivo: 002_fase2_distribucion.sql
-- Hito 8: Vehículos, Carga de Distribución y Bodega Móvil Lógica
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLA: vehiculo
-- Registro y administración de unidades de transporte de reparto.
-- Cantidad no fija (POR VALIDAR según SRS V2 Sección 10).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehiculo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    placa VARCHAR(20) NOT NULL UNIQUE,
    marca VARCHAR(50),
    modelo VARCHAR(50),
    tipo_vehiculo VARCHAR(50) DEFAULT 'CAMIONETA',
    capacidad_kg NUMERIC(12,2) CHECK (capacidad_kg >= 0),
    capacidad_volumen NUMERIC(12,2) CHECK (capacidad_volumen >= 0),
    conductor_habitual_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_vehiculo_placa ON vehiculo(placa);
CREATE INDEX IF NOT EXISTS ix_vehiculo_activo ON vehiculo(activo);
CREATE INDEX IF NOT EXISTS ix_vehiculo_conductor ON vehiculo(conductor_habitual_id);

-- ------------------------------------------------------------------------------
-- 2. RELACIONES EN TABLA: ubicacion (para Bodega Móvil)
-- Asegurar llaves foráneas para vehiculo_id y trabajador_id
-- ------------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ubicacion_vehiculo'
    ) THEN
        ALTER TABLE ubicacion 
        ADD CONSTRAINT fk_ubicacion_vehiculo 
        FOREIGN KEY (vehiculo_id) REFERENCES vehiculo(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ubicacion_trabajador'
    ) THEN
        ALTER TABLE ubicacion 
        ADD CONSTRAINT fk_ubicacion_trabajador 
        FOREIGN KEY (trabajador_id) REFERENCES usuario(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS ix_ubicacion_vehiculo ON ubicacion(vehiculo_id);
CREATE INDEX IF NOT EXISTS ix_ubicacion_trabajador ON ubicacion(trabajador_id);

-- ------------------------------------------------------------------------------
-- 3. TABLA: carga_distribucion
-- Orden de carga para ruta de distribución. Estados: PENDIENTE, EN_RUTA, FINALIZADA.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carga_distribucion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(30) NOT NULL UNIQUE,
    almacen_origen_id UUID NOT NULL REFERENCES ubicacion(id) ON DELETE RESTRICT,
    vehiculo_id UUID NOT NULL REFERENCES vehiculo(id) ON DELETE RESTRICT,
    trabajador_id UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    bodega_movil_id UUID NOT NULL REFERENCES ubicacion(id) ON DELETE RESTRICT,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE', 'EN_RUTA', 'FINALIZADA')),
    fecha_salida TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_cierre TIMESTAMPTZ,
    observaciones TEXT,
    creado_por UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    despachado_por UUID REFERENCES usuario(id) ON DELETE SET NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_carga_estado ON carga_distribucion(estado);
CREATE INDEX IF NOT EXISTS ix_carga_vehiculo ON carga_distribucion(vehiculo_id);
CREATE INDEX IF NOT EXISTS ix_carga_trabajador ON carga_distribucion(trabajador_id);
CREATE INDEX IF NOT EXISTS ix_carga_fecha_salida ON carga_distribucion(fecha_salida);
CREATE INDEX IF NOT EXISTS ix_carga_bodega_movil ON carga_distribucion(bodega_movil_id);

-- ------------------------------------------------------------------------------
-- 4. TABLA: carga_detalle
-- Detalle de productos asignados en unidades base con cálculo de empaques.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS carga_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    carga_distribucion_id UUID NOT NULL REFERENCES carga_distribucion(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
    presentacion_id UUID REFERENCES presentacion(id) ON DELETE RESTRICT,
    cantidad_presentacion NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (cantidad_presentacion >= 0),
    cantidad_unidades_sueltas NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (cantidad_unidades_sueltas >= 0),
    cantidad_total_base NUMERIC(14,3) NOT NULL CHECK (cantidad_total_base > 0),
    observaciones TEXT
);

CREATE INDEX IF NOT EXISTS ix_carga_detalle_carga ON carga_detalle(carga_distribucion_id);
CREATE INDEX IF NOT EXISTS ix_carga_detalle_producto ON carga_detalle(producto_id);
-- ==============================================================================
-- AGROCONTROL PRO - MIGRACIÓN FASE 2: DISTRIBUCIÓN Y LIQUIDACIÓN
-- Archivo: 003_fase2_liquidacion.sql
-- Hito 9: Retornos de Mercadería y Módulo de Liquidación de Vendedores
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLA: liquidacion
-- Registro de la liquidación física y financiera de una carga en ruta.
-- Relación 1:1 con carga_distribucion.
-- Estados: CONCILIADA (cuadre perfecto) u OBSERVADA (diferencias justificadas / deuda).
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS liquidacion (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(30) NOT NULL UNIQUE,
    carga_distribucion_id UUID NOT NULL UNIQUE REFERENCES carga_distribucion(id) ON DELETE RESTRICT,
    fecha_liquidacion TIMESTAMPTZ NOT NULL DEFAULT now(),
    usuario_liquidador_id UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    total_vendido NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_vendido >= 0),
    total_cobrado NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (total_cobrado >= 0),
    diferencia_dinero NUMERIC(14,2) NOT NULL DEFAULT 0,
    estado VARCHAR(20) NOT NULL CHECK (estado IN ('CONCILIADA', 'OBSERVADA')),
    observaciones TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_liquidacion_carga ON liquidacion(carga_distribucion_id);
CREATE INDEX IF NOT EXISTS ix_liquidacion_estado ON liquidacion(estado);
CREATE INDEX IF NOT EXISTS ix_liquidacion_fecha ON liquidacion(fecha_liquidacion);
CREATE INDEX IF NOT EXISTS ix_liquidacion_usuario ON liquidacion(usuario_liquidador_id);

-- ------------------------------------------------------------------------------
-- 2. TABLA: liquidacion_detalle
-- Detalle comparativo por producto para la ecuación fundamental de ruta:
-- Carga Inicial = Cantidad Vendida + Cantidad Retornada + Diferencia
-- Si diferencia != 0 se exige justificación administrativa obligatoria.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS liquidacion_detalle (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    liquidacion_id UUID NOT NULL REFERENCES liquidacion(id) ON DELETE CASCADE,
    producto_id UUID NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
    presentacion_id UUID REFERENCES presentacion(id) ON DELETE RESTRICT,
    cantidad_cargada NUMERIC(14,3) NOT NULL CHECK (cantidad_cargada >= 0),
    cantidad_vendida NUMERIC(14,3) NOT NULL CHECK (cantidad_vendida >= 0),
    cantidad_retornada NUMERIC(14,3) NOT NULL CHECK (cantidad_retornada >= 0),
    diferencia NUMERIC(14,3) NOT NULL DEFAULT 0,
    justificacion TEXT,
    precio_unitario_promedio NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (precio_unitario_promedio >= 0),
    subtotal_vendido NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (subtotal_vendido >= 0)
);

CREATE INDEX IF NOT EXISTS ix_liq_detalle_liq ON liquidacion_detalle(liquidacion_id);
CREATE INDEX IF NOT EXISTS ix_liq_detalle_prod ON liquidacion_detalle(producto_id);

-- Invariante a nivel de base de datos para justificación obligatoria cuando diferencia != 0
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ck_liq_detalle_justificacion'
    ) THEN
        ALTER TABLE liquidacion_detalle 
        ADD CONSTRAINT ck_liq_detalle_justificacion 
        CHECK (
            diferencia = 0 OR (justificacion IS NOT NULL AND length(trim(justificacion)) >= 5)
        );
    END IF;
END $$;
-- ==============================================================================
-- AGROCONTROL PRO - MIGRACIÓN FASE 3: MOVILIDAD, MODO OFFLINE E INTEGRACIONES
-- Archivo: 004_fase3_sincronizacion_movil.sql
-- Hito 11: Infraestructura de Red Híbrida y Motor de Sincronización Idempotente (API)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLA: dispositivo_movil (RF-72: Registro y Autorización de Terminales Móviles)
-- Registra los smartphones y tablets autorizados para operar en ruta y sincronizar.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS dispositivo_movil (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_dispositivo VARCHAR(50) NOT NULL UNIQUE,
    modelo VARCHAR(100),
    sistema_operativo VARCHAR(50) DEFAULT 'Android',
    version_app VARCHAR(20) DEFAULT '1.0.0',
    trabajador_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    autorizado BOOLEAN NOT NULL DEFAULT TRUE,
    ultima_sincronizacion TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_dispositivo_codigo ON dispositivo_movil(codigo_dispositivo);
CREATE INDEX IF NOT EXISTS ix_dispositivo_trabajador ON dispositivo_movil(trabajador_id);
CREATE INDEX IF NOT EXISTS ix_dispositivo_activo ON dispositivo_movil(activo, autorizado);
CREATE INDEX IF NOT EXISTS ix_dispositivo_actualizado_en ON dispositivo_movil(actualizado_en);

-- ------------------------------------------------------------------------------
-- 2. TABLA: operacion_sincronizada (RF-77 / RF-79: Motor de Sincronización Idempotente)
-- Almacena cada transacción recibida desde los terminales móviles con su UUID de origen.
-- Máquina de estados: RECIBIDA -> APLICADA u OBSERVADA.
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS operacion_sincronizada (
    id UUID PRIMARY KEY, -- UUID generado en el dispositivo móvil para idempotencia
    dispositivo_id UUID NOT NULL REFERENCES dispositivo_movil(id) ON DELETE RESTRICT,
    usuario_id UUID NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    carga_distribucion_id UUID REFERENCES carga_distribucion(id) ON DELETE SET NULL,
    tipo_operacion VARCHAR(30) NOT NULL CHECK (tipo_operacion IN ('VENTA', 'COBRO', 'DEVOLUCION', 'SOBRANTE', 'PEDIDO')),
    estado_sync VARCHAR(20) NOT NULL DEFAULT 'RECIBIDA' CHECK (estado_sync IN ('RECIBIDA', 'APLICADA', 'OBSERVADA')),
    datos_operacion JSONB NOT NULL,
    motivo_observacion TEXT,
    fecha_operacion TIMESTAMPTZ NOT NULL, -- Timestamp del dispositivo móvil al momento de la venta
    fecha_registro TIMESTAMPTZ NOT NULL DEFAULT now(), -- Timestamp del servidor central al registrarse
    ip_origen VARCHAR(45),
    creado_en TIMESTAMPTZ NOT NULL DEFAULT now(),
    actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ix_operacion_sync_dispositivo ON operacion_sincronizada(dispositivo_id);
CREATE INDEX IF NOT EXISTS ix_operacion_sync_usuario ON operacion_sincronizada(usuario_id);
CREATE INDEX IF NOT EXISTS ix_operacion_sync_carga ON operacion_sincronizada(carga_distribucion_id);
CREATE INDEX IF NOT EXISTS ix_operacion_sync_estado ON operacion_sincronizada(estado_sync);
CREATE INDEX IF NOT EXISTS ix_operacion_sync_fecha_op ON operacion_sincronizada(fecha_operacion);
CREATE INDEX IF NOT EXISTS ix_operacion_sync_fecha_reg ON operacion_sincronizada(fecha_registro);
CREATE INDEX IF NOT EXISTS ix_operacion_sync_actualizado_en ON operacion_sincronizada(actualizado_en);

-- ------------------------------------------------------------------------------
-- 3. ÍNDICES DE SINCRONIZACIÓN INCREMENTAL (PULL) EN TABLAS MAESTRAS
-- Optimiza consultas filtradas por actualizado_en > ultima_sincronizacion
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS ix_producto_actualizado_en ON producto(actualizado_en);
CREATE INDEX IF NOT EXISTS ix_presentacion_actualizado_en ON presentacion(actualizado_en);
CREATE INDEX IF NOT EXISTS ix_categoria_actualizado_en ON categoria(actualizado_en);
CREATE INDEX IF NOT EXISTS ix_cliente_actualizado_en ON cliente(actualizado_en);
CREATE INDEX IF NOT EXISTS ix_lista_precio_actualizado_en ON lista_precio(actualizado_en);
CREATE INDEX IF NOT EXISTS ix_precio_producto_actualizado_en ON precio_producto(actualizado_en);
CREATE INDEX IF NOT EXISTS ix_carga_distribucion_actualizado_en ON carga_distribucion(actualizado_en);
-- ------------------------------------------------------------------------------
-- MIGRACIÓN 005: RESOLUCIÓN Y AUDITORÍA DE OPERACIONES OBSERVADAS (HITO 13)
-- ------------------------------------------------------------------------------

-- 1. Ampliar estado_sync y actualizar Check Constraint
ALTER TABLE operacion_sincronizada 
    ALTER COLUMN estado_sync TYPE VARCHAR(30);

ALTER TABLE operacion_sincronizada 
    DROP CONSTRAINT IF EXISTS operacion_sincronizada_estado_sync_check;

ALTER TABLE operacion_sincronizada 
    ADD CONSTRAINT operacion_sincronizada_estado_sync_check 
    CHECK (estado_sync IN ('RECIBIDA', 'APLICADA', 'OBSERVADA', 'RESUELTA_APROBADA', 'RESUELTA_RECHAZADA'));

-- 2. Nuevos campos para auditoría de resolución administrativa
ALTER TABLE operacion_sincronizada
    ADD COLUMN IF NOT EXISTS usuario_resolutor_id UUID REFERENCES usuario(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS fecha_resolucion TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS nota_resolucion TEXT,
    ADD COLUMN IF NOT EXISTS movimiento_ajuste_id UUID REFERENCES movimiento_kardex(id) ON DELETE SET NULL;

-- 3. Índices para agilizar consultas administrativas y filtros
CREATE INDEX IF NOT EXISTS ix_operacion_sync_resolutor ON operacion_sincronizada(usuario_resolutor_id);
CREATE INDEX IF NOT EXISTS ix_operacion_sync_fecha_resolucion ON operacion_sincronizada(fecha_resolucion);
-- ==============================================================================
-- AGROCONTROL PRO - SEED DE DATOS INICIALES (FASE 1: NÚCLEO)
-- Archivo: 001_seed_fase1.sql
-- ==============================================================================

-- 1. ALMACÉN PRINCIPAL Y ZONA DE ALMACENAMIENTO INICIAL
INSERT INTO ubicacion (id, tipo, codigo, nombre, padre_id, activo)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'ALMACEN', 'ALM-CENTRAL', 'Almacén Central (Local Comercial)', NULL, TRUE)
ON CONFLICT (codigo) DO NOTHING;

INSERT INTO ubicacion (id, tipo, codigo, nombre, padre_id, activo)
VALUES 
    ('a0000000-0000-0000-0000-000000000002', 'ZONA', 'ZONA-A', 'Zona A (Fertilizantes y Sacos)', 'a0000000-0000-0000-0000-000000000001', TRUE),
    ('a0000000-0000-0000-0000-000000000003', 'ZONA', 'ZONA-B', 'Zona B (Agroquímicos y Botellas)', 'a0000000-0000-0000-0000-000000000001', TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- 2. CATEGORÍAS COMERCIALES CONFIRMADAS
INSERT INTO categoria (id, codigo, nombre, descripcion, activo)
VALUES 
    ('c0000000-0000-0000-0000-000000000001', 'CAT-FERT', 'Fertilizantes', 'Urea, abonos y nutrientes para suelo', TRUE),
    ('c0000000-0000-0000-0000-000000000002', 'CAT-HERB', 'Herbicidas', 'Control de malezas y hierbas invasoras', TRUE),
    ('c0000000-0000-0000-0000-000000000003', 'CAT-PEST', 'Pesticidas / Insecticidas', 'Control de plagas e insectos', TRUE),
    ('c0000000-0000-0000-0000-000000000004', 'CAT-FUNG', 'Fungicidas', 'Prevención y control de hongos fitopatógenos', TRUE),
    ('c0000000-0000-0000-0000-000000000005', 'CAT-ALIM', 'Alimentos Balanceados', 'Nutrición animal y concentrados', TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- 3. LISTAS DE PRECIOS BASE
INSERT INTO lista_precio (id, codigo, nombre, descripcion, activo)
VALUES 
    ('b0000000-0000-0000-0000-000000000001', 'MAYORISTA', 'Lista Mayorista', 'Precio aplicable a compras por mayor y distribuidores', TRUE),
    ('b0000000-0000-0000-0000-000000000002', 'MINORISTA', 'Lista Minorista', 'Precio de venta al público en mostrador', TRUE)
ON CONFLICT (codigo) DO NOTHING;

-- 4. USUARIOS INICIALES CON LOS 4 ROLES DEL DOMINIO
-- Contraseña inicial para todos los usuarios de prueba: 'AgroControl2026*'
-- Hash verificado generado con bcrypt: $2a$10$57l7YcVhHxV6.8K4MmcypeKsiXKXoBxo/AUwChJBeI52lfv/KFFDW
INSERT INTO usuario (id, username, password_hash, nombre_completo, email, rol, activo)
VALUES 
    (
        'e0000000-0000-0000-0000-000000000001', 
        'alipio.admin', 
        '$2a$10$57l7YcVhHxV6.8K4MmcypeKsiXKXoBxo/AUwChJBeI52lfv/KFFDW', 
        'Sr. Alipio (Propietario)', 
        'alipio@agrocontrol.local', 
        'ADMINISTRADOR_PROPIETARIO', 
        TRUE
    ),
    (
        'e0000000-0000-0000-0000-000000000002', 
        'esposa.admin', 
        '$2a$10$57l7YcVhHxV6.8K4MmcypeKsiXKXoBxo/AUwChJBeI52lfv/KFFDW', 
        'Administradora Secundaria', 
        'administracion@agrocontrol.local', 
        'ADMINISTRADOR_SECUNDARIO', 
        TRUE
    ),
    (
        'e0000000-0000-0000-0000-000000000003', 
        'almacen1', 
        '$2a$10$57l7YcVhHxV6.8K4MmcypeKsiXKXoBxo/AUwChJBeI52lfv/KFFDW', 
        'Operador de Almacén Principal', 
        'almacen@agrocontrol.local', 
        'OPERADOR_ALMACEN', 
        TRUE
    ),
    (
        'e0000000-0000-0000-0000-000000000004', 
        'vendedor1', 
        '$2a$10$57l7YcVhHxV6.8K4MmcypeKsiXKXoBxo/AUwChJBeI52lfv/KFFDW', 
        'Vendedor en Ruta', 
        'vendedor1@agrocontrol.local', 
        'VENDEDOR', 
        TRUE
    )
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash;
