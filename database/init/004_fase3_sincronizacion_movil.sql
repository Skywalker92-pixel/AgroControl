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
