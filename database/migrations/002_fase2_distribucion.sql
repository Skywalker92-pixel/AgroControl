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
