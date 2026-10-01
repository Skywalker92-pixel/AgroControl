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
