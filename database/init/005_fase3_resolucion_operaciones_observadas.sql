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
