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
