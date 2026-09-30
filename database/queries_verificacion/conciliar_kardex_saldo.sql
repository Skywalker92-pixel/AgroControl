-- ==============================================================================
-- AGROCONTROL PRO - CONSULTA DE CONCILIACIÓN MATEMÁTICA KÁRDEX VS STOCK_SALDO
-- Archivo: conciliar_kardex_saldo.sql
-- ==============================================================================
-- Invariante: La cantidad_fisica en stock_saldo DEBE ser exactamente igual
-- a la suma algebraica de cantidad_base en movimiento_kardex para cada producto y ubicación.
-- ==============================================================================

WITH kardex_calculado AS (
    SELECT 
        producto_id,
        ubicacion_id,
        COALESCE(SUM(cantidad_base), 0) AS total_kardex_calculado,
        COUNT(id) AS total_movimientos
    FROM movimiento_kardex
    GROUP BY producto_id, ubicacion_id
),
saldo_actual AS (
    SELECT 
        producto_id,
        ubicacion_id,
        cantidad_fisica,
        cantidad_reservada,
        cantidad_disponible
    FROM stock_saldo
)
SELECT 
    p.codigo_interno,
    p.nombre AS producto,
    u.codigo AS ubicacion_codigo,
    u.nombre AS ubicacion_nombre,
    COALESCE(kc.total_kardex_calculado, 0) AS total_kardex,
    COALESCE(sa.cantidad_fisica, 0) AS stock_saldo_fisico,
    COALESCE(sa.cantidad_reservada, 0) AS stock_saldo_reservado,
    COALESCE(sa.cantidad_disponible, 0) AS stock_saldo_disponible,
    (COALESCE(sa.cantidad_fisica, 0) - COALESCE(kc.total_kardex_calculado, 0)) AS discrepancia,
    CASE 
        WHEN (COALESCE(sa.cantidad_fisica, 0) - COALESCE(kc.total_kardex_calculado, 0)) = 0 THEN 'CONCILIADO_OK'
        ELSE 'ERROR_DESCUADRE_KARDEX'
    END AS estado_conciliacion
FROM producto p
CROSS JOIN ubicacion u
LEFT JOIN kardex_calculado kc ON kc.producto_id = p.id AND kc.ubicacion_id = u.id
LEFT JOIN saldo_actual sa ON sa.producto_id = p.id AND sa.ubicacion_id = u.id
WHERE u.tipo IN ('ALMACEN', 'ZONA')
  AND (kc.total_kardex_calculado IS NOT NULL OR sa.cantidad_fisica IS NOT NULL)
ORDER BY p.codigo_interno, u.codigo;
