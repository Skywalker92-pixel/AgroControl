-- ==============================================================================
-- AGROCONTROL PRO - MIGRACIÓN 006: TIPOS PERMITIDOS EN SINCRONIZACIÓN Y KÁRDEX
-- Archivo: 006_fase3_tipos_sync_y_kardex.sql
-- ==============================================================================
-- Corrige restricciones CHECK que no incluían tipos que el backend ya emite:
--
-- 1. operacion_sincronizada.tipo_operacion no admitía 'CLIENTE_NUEVO'
--    (alta de clientes en ruta, OBS-MOB-03): el PUSH respondía 500 y bloqueaba
--    el lote completo del vendedor.
-- 2. movimiento_kardex.tipo no admitía 'DEVOLUCION_RUTA' ni 'SOBRANTE_RUTA'
--    (operaciones DEVOLUCION / SOBRANTE de la sincronización móvil).
--    Se incluyen además 'ENTRADA_COMPRA' e 'INVENTARIO_INICIAL', usados por el
--    seed de demostración, para que ningún seed tenga que alterar el esquema.
--
-- Solo amplía los valores permitidos: no modifica ni elimina filas existentes,
-- por lo que respeta la inmutabilidad del Kárdex (los triggers de bloqueo de
-- UPDATE/DELETE sobre movimiento_kardex no se ven afectados).
-- Idempotente: puede ejecutarse más de una vez.
-- ==============================================================================

BEGIN;

ALTER TABLE operacion_sincronizada
    DROP CONSTRAINT IF EXISTS operacion_sincronizada_tipo_operacion_check;
ALTER TABLE operacion_sincronizada
    ADD CONSTRAINT operacion_sincronizada_tipo_operacion_check
    CHECK (tipo_operacion IN ('VENTA', 'COBRO', 'DEVOLUCION', 'SOBRANTE', 'PEDIDO', 'CLIENTE_NUEVO'));

ALTER TABLE movimiento_kardex
    DROP CONSTRAINT IF EXISTS movimiento_kardex_tipo_check;
ALTER TABLE movimiento_kardex
    ADD CONSTRAINT movimiento_kardex_tipo_check
    CHECK (tipo IN (
        'ENTRADA',
        'ENTRADA_COMPRA',
        'INVENTARIO_INICIAL',
        'SALIDA',
        'TRASLADO_SALIDA',
        'TRASLADO_ENTRADA',
        'AJUSTE',
        'ASIGNACION_DISTRIBUCION',
        'VENTA_RUTA',
        'DEVOLUCION_RUTA',
        'SOBRANTE_RUTA',
        'RETORNO_DISTRIBUCION',
        'ANULACION'
    ));

COMMIT;
