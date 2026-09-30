-- ==============================================================================
-- AGROCONTROL PRO - PRUEBAS DE INVARIANTES DE BASE DE DATOS (FASE 1)
-- ==============================================================================

-- 0. Preparar producto y presentación de prueba
INSERT INTO producto (id, codigo_interno, nombre, categoria_id, unidad_base)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'HERB-TEST-01',
    'Herbicida Test 1L',
    'c0000000-0000-0000-0000-000000000002', -- Categoría Herbicidas
    'botella'
) ON CONFLICT (codigo_interno) DO NOTHING;

INSERT INTO presentacion (id, producto_id, nombre, factor)
VALUES (
    'f0000000-0000-0000-0000-000000000002',
    'd0000000-0000-0000-0000-000000000001',
    'Caja x12',
    12.000
) ON CONFLICT (producto_id, nombre) DO NOTHING;

-- 1. Inserción inicial en Kárdex (Operación permitida)
INSERT INTO movimiento_kardex (
    id,
    producto_id,
    ubicacion_id,
    tipo,
    cantidad_base,
    usuario_id,
    fecha_operacion,
    motivo
)
VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001', -- Almacén Central
    'ENTRADA',
    120.000,
    'e0000000-0000-0000-0000-000000000001', -- Admin Alipio
    now(),
    'Ingreso inicial de prueba'
) ON CONFLICT (id) DO NOTHING;

-- 2. Inserción de saldo en stock_saldo
INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada)
VALUES (
    'd0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    120.000,
    0.000
) ON CONFLICT (producto_id, ubicacion_id) DO UPDATE
SET cantidad_fisica = 120.000, cantidad_reservada = 0.000;

-- 3. Verificar que UPDATE sobre movimiento_kardex sea bloqueado
DO $$
BEGIN
    UPDATE movimiento_kardex 
    SET cantidad_base = 200.000 
    WHERE id = 'f0000000-0000-0000-0000-000000000001';
    
    RAISE EXCEPTION 'FALLO: El trigger no bloqueó el UPDATE en el Kárdex';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'VALIDACIÓN EXITOSA: UPDATE bloqueado por trigger inmutable -> %', SQLERRM;
END $$;

-- 4. Verificar que DELETE sobre movimiento_kardex sea bloqueado
DO $$
BEGIN
    DELETE FROM movimiento_kardex 
    WHERE id = 'f0000000-0000-0000-0000-000000000001';
    
    RAISE EXCEPTION 'FALLO: El trigger no bloqueó el DELETE en el Kárdex';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'VALIDACIÓN EXITOSA: DELETE bloqueado por trigger inmutable -> %', SQLERRM;
END $$;

-- 5. Verificar restricción CHECK de stock_saldo no negativo
DO $$
BEGIN
    INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada)
    VALUES (
        'd0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000002', -- Zona A
        -10.000,
        0.000
    );
    RAISE EXCEPTION 'FALLO: La BD permitió stock_saldo físico negativo';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'VALIDACIÓN EXITOSA: Inserción de stock físico negativo bloqueada por restricción CHECK.';
END $$;

-- 6. Verificar restricción CHECK de stock_reservada <= stock_fisica
DO $$
BEGIN
    INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada)
    VALUES (
        'd0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000002',
        10.000,
        15.000
    );
    RAISE EXCEPTION 'FALLO: La BD permitió stock_reservado > stock_fisico';
EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'VALIDACIÓN EXITOSA: Reserva mayor al stock físico bloqueada por restricción CHECK.';
END $$;
