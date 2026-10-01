-- ==============================================================================
-- AGROCONTROL PRO - SEED DATASET DE DEMOSTRACIÓN REALISTA PARA EL SR. ALIPIO
-- Archivo: database/seeds/002_seed_demo_alipio.sql
-- Dominio: Distribución de Insumos Agrícolas en Pisco e Ica, Perú
-- ==============================================================================
-- REGLA INVIOLABLE DE INTEGRIDAD DEL KÁRDEX:
-- Todo saldo en stock_saldo está respaldado estrictamente por la suma matemática
-- de los asientos en movimiento_kardex (cantidad_base), garantizando CERO
-- discrepancias matemáticas (CONCILIADO_OK / CONCILIACION_TOTAL_OK).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 0. EXTENSIÓN DE VALORES PERMITIDOS EN CHECK CONSTRAINT DEL KÁRDEX
-- ------------------------------------------------------------------------------
ALTER TABLE movimiento_kardex DROP CONSTRAINT IF EXISTS movimiento_kardex_tipo_check;
ALTER TABLE movimiento_kardex ADD CONSTRAINT movimiento_kardex_tipo_check CHECK (tipo IN (
    'ENTRADA',
    'ENTRADA_COMPRA',
    'INVENTARIO_INICIAL',
    'SALIDA',
    'TRASLADO_SALIDA',
    'TRASLADO_ENTRADA',
    'AJUSTE',
    'ASIGNACION_DISTRIBUCION',
    'VENTA_RUTA',
    'RETORNO_DISTRIBUCION',
    'ANULACION'
));

-- ------------------------------------------------------------------------------
-- 1. ALMACENES Y FLOTA
-- ------------------------------------------------------------------------------

-- 1.1 Almacenes Físicos
INSERT INTO ubicacion (id, tipo, codigo, nombre, padre_id, activo)
VALUES 
    (
        'a1000000-0000-0000-0000-000000000001', 
        'ALMACEN', 
        'ALM-PISCO-PPAL', 
        'Almacén Principal Pisco', 
        NULL, 
        TRUE
    ),
    (
        'a1000000-0000-0000-0000-000000000002', 
        'ALMACEN', 
        'DEP-SAN-CLEMENTE', 
        'Depósito San Clemente', 
        NULL, 
        TRUE
    )
ON CONFLICT (codigo) DO UPDATE 
SET nombre = EXCLUDED.nombre,
    activo = EXCLUDED.activo;

-- 1.2 Vehículo de Reparto Comercial
INSERT INTO vehiculo (id, placa, marca, modelo, tipo_vehiculo, capacidad_kg, capacidad_volumen, conductor_habitual_id, activo, observaciones)
VALUES (
    'fe100000-0000-0000-0000-000000000001',
    'V7X-842',
    'Hyundai',
    'Camión Hyundai HD78 4.5T',
    'CAMION',
    4500.00,
    25.00,
    'e0000000-0000-0000-0000-000000000004', -- vendedor1
    TRUE,
    'Unidad principal de distribución en ruta - Valle de Pisco'
)
ON CONFLICT (placa) DO UPDATE
SET marca = EXCLUDED.marca,
    modelo = EXCLUDED.modelo,
    conductor_habitual_id = EXCLUDED.conductor_habitual_id,
    activo = EXCLUDED.activo;

-- 1.3 Ubicación Lógica: Bodega Móvil sobre el Vehículo
INSERT INTO ubicacion (id, tipo, codigo, nombre, padre_id, vehiculo_id, trabajador_id, activo)
VALUES (
    'a1000000-0000-0000-0000-000000000003',
    'BODEGA_MOVIL',
    'BM-V7X-842',
    'Bodega Móvil Camión V7X-842',
    'a1000000-0000-0000-0000-000000000001', -- Perteneciente al Almacén Principal Pisco
    'fe100000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000004', -- vendedor1
    TRUE
)
ON CONFLICT (codigo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    vehiculo_id = EXCLUDED.vehiculo_id,
    trabajador_id = EXCLUDED.trabajador_id,
    activo = EXCLUDED.activo;

-- 1.4 Dispositivo Móvil Autorizado para el Vendedor (PWA Offline)
INSERT INTO dispositivo_movil (id, codigo_dispositivo, modelo, sistema_operativo, version_app, trabajador_id, activo, autorizado)
VALUES (
    'de100000-0000-0000-0000-000000000001',
    'TERM-ALIP-001',
    'Samsung Galaxy A54 Enterprise',
    'Android 14',
    '1.0.0',
    'e0000000-0000-0000-0000-000000000004', -- vendedor1
    TRUE,
    TRUE
)
ON CONFLICT (codigo_dispositivo) DO UPDATE
SET trabajador_id = EXCLUDED.trabajador_id,
    activo = EXCLUDED.activo,
    autorizado = EXCLUDED.autorizado;

-- ------------------------------------------------------------------------------
-- 2. CATÁLOGO COMERCIAL
-- ------------------------------------------------------------------------------

-- 2.1 Categorías Comerciales Específicas
INSERT INTO categoria (id, codigo, nombre, descripcion, activo)
VALUES 
    (
        'ca100000-0000-0000-0000-000000000001',
        'CAT-FERT-GRAN',
        'Fertilizantes Granulados',
        'Nutrientes edáficos de aplicación al suelo en sacos de alta graduación',
        TRUE
    ),
    (
        'ca100000-0000-0000-0000-000000000002',
        'CAT-PROT-CULT',
        'Protección de Cultivos (Fungicidas/Insecticidas)',
        'Fitosanitarios preventivos y curativos para control de plagas y enfermedades',
        TRUE
    ),
    (
        'ca100000-0000-0000-0000-000000000003',
        'CAT-NUTR-FOLI',
        'Nutrición Foliar y Bioestimulantes',
        'Enraizantes, bioestimulantes antiestrés y micronutrientes foliares',
        TRUE
    )
ON CONFLICT (codigo) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    activo = EXCLUDED.activo;

-- 2.2 Productos Insumos Agrícolas (Unidad Base: kg / litro)
INSERT INTO producto (id, codigo_interno, codigo_barras, nombre, descripcion, categoria_id, unidad_base, activo)
VALUES 
    (
        'ba100000-0000-0000-0000-000000000001',
        'PROD-UREA-46',
        '7751234000011',
        'Urea Granulada 46% N',
        'Fertilizante nitrogenado concentrado de alta solubilidad para desarrollo vegetativo foliar',
        'ca100000-0000-0000-0000-000000000001',
        'kg',
        TRUE
    ),
    (
        'ba100000-0000-0000-0000-000000000002',
        'PROD-DAP-1846',
        '7751234000028',
        'Fosfato Diamónico 18-46-0',
        'Fertilizante fosfatado con nitrógeno amoniacal ideal para enraizamiento e inicio de ciclo',
        'ca100000-0000-0000-0000-000000000001',
        'kg',
        TRUE
    ),
    (
        'ba100000-0000-0000-0000-000000000003',
        'PROD-MANCO-80',
        '7751234000035',
        'Mancozeb 80% WP',
        'Fungicida protector de contacto multisitio para control de tizón y alternaria en hortalizas',
        'ca100000-0000-0000-0000-000000000002',
        'kg',
        TRUE
    ),
    (
        'ba100000-0000-0000-0000-000000000004',
        'PROD-CIPER-25',
        '7751234000042',
        'Cipermetrina 25% EC',
        'Insecticida piretroide de choque y volteo rápido para control de gusano cogollero y polilla',
        'ca100000-0000-0000-0000-000000000002',
        'litro',
        TRUE
    ),
    (
        'ba100000-0000-0000-0000-000000000005',
        'PROD-BIOEST-RAD',
        '7751234000059',
        'Bioestimulante Radicular 1L',
        'Concentrado bioestimulante con auxinas y extracto de algas para arraigo y masa radicular',
        'ca100000-0000-0000-0000-000000000003',
        'litro',
        TRUE
    ),
    (
        'ba100000-0000-0000-0000-000000000006',
        'PROD-GLIFO-480',
        '7751234000066',
        'Glifosato 480 SL',
        'Herbicida sistémico total no selectivo para control post-emergente de malezas perennes',
        'ca100000-0000-0000-0000-000000000002',
        'litro',
        TRUE
    )
ON CONFLICT (codigo_interno) DO UPDATE
SET nombre = EXCLUDED.nombre,
    descripcion = EXCLUDED.descripcion,
    unidad_base = EXCLUDED.unidad_base,
    activo = EXCLUDED.activo;

-- 2.3 Presentaciones Comerciales (Factores de Conversión a Unidad Base)
INSERT INTO presentacion (id, producto_id, nombre, factor, activo)
VALUES 
    -- Urea Granulada (Base: kg) -> Saco 50 kg
    ('bb100000-0000-0000-0000-000000000001', 'ba100000-0000-0000-0000-000000000001', 'Saco 50 kg', 50.000, TRUE),
    -- Fosfato Diamónico (Base: kg) -> Saco 50 kg
    ('bb100000-0000-0000-0000-000000000002', 'ba100000-0000-0000-0000-000000000002', 'Saco 50 kg', 50.000, TRUE),
    -- Mancozeb 80% (Base: kg) -> Bolsa 1 kg y Caja x 20 kg
    ('bb100000-0000-0000-0000-000000000003', 'ba100000-0000-0000-0000-000000000003', 'Bolsa 1 kg', 1.000, TRUE),
    ('bb100000-0000-0000-0000-000000000004', 'ba100000-0000-0000-0000-000000000003', 'Caja x 20 kg', 20.000, TRUE),
    -- Cipermetrina 25% (Base: litro) -> Frasco 1 L y Caja x 12 L
    ('bb100000-0000-0000-0000-000000000005', 'ba100000-0000-0000-0000-000000000004', 'Frasco 1 L', 1.000, TRUE),
    ('bb100000-0000-0000-0000-000000000006', 'ba100000-0000-0000-0000-000000000004', 'Caja x 12 L', 12.000, TRUE),
    -- Bioestimulante (Base: litro) -> Envase 1 L y Caja x 12 L
    ('bb100000-0000-0000-0000-000000000007', 'ba100000-0000-0000-0000-000000000005', 'Envase 1 L', 1.000, TRUE),
    ('bb100000-0000-0000-0000-000000000008', 'ba100000-0000-0000-0000-000000000005', 'Caja x 12 L', 12.000, TRUE),
    -- Glifosato 480 SL (Base: litro) -> Galón 4 L y Bidón 20 L
    ('bb100000-0000-0000-0000-000000000009', 'ba100000-0000-0000-0000-000000000006', 'Galón 4 L', 4.000, TRUE),
    ('bb100000-0000-0000-0000-000000000010', 'ba100000-0000-0000-0000-000000000006', 'Bidón 20 L', 20.000, TRUE)
ON CONFLICT (producto_id, nombre) DO UPDATE
SET factor = EXCLUDED.factor,
    activo = EXCLUDED.activo;

-- 2.4 Precios por Producto y Lista de Precios (Valor en Soles por Unidad Base)
-- Lista Mayorista: b0000000-0000-0000-0000-000000000001
-- Lista Minorista: b0000000-0000-0000-0000-000000000002
INSERT INTO precio_producto (lista_precio_id, producto_id, precio)
VALUES 
    -- Urea Granulada (Base: kg) -> Mayorista: S/ 2.50/kg (S/ 125 saco), Minorista: S/ 2.80/kg (S/ 140 saco)
    ('b0000000-0000-0000-0000-000000000001', 'ba100000-0000-0000-0000-000000000001', 2.5000),
    ('b0000000-0000-0000-0000-000000000002', 'ba100000-0000-0000-0000-000000000001', 2.8000),
    -- Fosfato Diamónico (Base: kg) -> Mayorista: S/ 3.80/kg (S/ 190 saco), Minorista: S/ 4.20/kg (S/ 210 saco)
    ('b0000000-0000-0000-0000-000000000001', 'ba100000-0000-0000-0000-000000000002', 3.8000),
    ('b0000000-0000-0000-0000-000000000002', 'ba100000-0000-0000-0000-000000000002', 4.2000),
    -- Mancozeb 80% (Base: kg) -> Mayorista: S/ 38.00/kg (S/ 760 caja 20kg), Minorista: S/ 45.00/kg (S/ 45 bolsa 1kg)
    ('b0000000-0000-0000-0000-000000000001', 'ba100000-0000-0000-0000-000000000003', 38.0000),
    ('b0000000-0000-0000-0000-000000000002', 'ba100000-0000-0000-0000-000000000003', 45.0000),
    -- Cipermetrina 25% (Base: L) -> Mayorista: S/ 48.00/L (S/ 576 caja 12L), Minorista: S/ 58.00/L (S/ 58 frasco 1L)
    ('b0000000-0000-0000-0000-000000000001', 'ba100000-0000-0000-0000-000000000004', 48.0000),
    ('b0000000-0000-0000-0000-000000000002', 'ba100000-0000-0000-0000-000000000004', 58.0000),
    -- Bioestimulante (Base: L) -> Mayorista: S/ 68.00/L (S/ 816 caja 12L), Minorista: S/ 80.00/L (S/ 80 frasco 1L)
    ('b0000000-0000-0000-0000-000000000001', 'ba100000-0000-0000-0000-000000000005', 68.0000),
    ('b0000000-0000-0000-0000-000000000002', 'ba100000-0000-0000-0000-000000000005', 80.0000),
    -- Glifosato 480 SL (Base: L) -> Mayorista: S/ 26.00/L (S/ 104 galón, S/ 520 bidón), Minorista: S/ 32.00/L (S/ 128 galón)
    ('b0000000-0000-0000-0000-000000000001', 'ba100000-0000-0000-0000-000000000006', 26.0000),
    ('b0000000-0000-0000-0000-000000000002', 'ba100000-0000-0000-0000-000000000006', 32.0000)
ON CONFLICT (lista_precio_id, producto_id) DO UPDATE
SET precio = EXCLUDED.precio,
    actualizado_en = NOW();

-- ------------------------------------------------------------------------------
-- 3. CLIENTES REALISTAS DEL VALLE DE PISCO
-- ------------------------------------------------------------------------------
INSERT INTO cliente (id, tipo_documento, numero_documento, razon_social, direccion, telefono, email, lista_precio_id, activo)
VALUES 
    (
        'c1100000-0000-0000-0000-000000000001',
        'RUC',
        '20601234567',
        'Fundo Santa Rosa S.A.C.',
        'Carretera Panamericana Sur Km 234, Pisco, Ica',
        '956123456',
        'compras@fundosantarosa.pe',
        'b0000000-0000-0000-0000-000000000001', -- Mayorista
        TRUE
    ),
    (
        'c1100000-0000-0000-0000-000000000002',
        'RUC',
        '20549876543',
        'Agrícola Don Hernán S.R.L.',
        'Valle de Pisco Bajo - Sector La Huaca, Pisco',
        '987654321',
        'administracion@agricoladonhernan.com',
        'b0000000-0000-0000-0000-000000000001', -- Mayorista
        TRUE
    ),
    (
        'c1100000-0000-0000-0000-000000000003',
        'DNI',
        '41234567',
        'Marcelino Flores Quispe (Parcela Los Olivos)',
        'Caserío Montalbán S/N, San Clemente, Pisco',
        '945678123',
        'marcelino.flores@gmail.com',
        'b0000000-0000-0000-0000-000000000002', -- Minorista
        TRUE
    ),
    (
        'c1100000-0000-0000-0000-000000000004',
        'RUC',
        '10423456789',
        'Fundo Los Frutales (García Ramos Alberto)',
        'Sector Cabeza de Toro, Humay, Pisco',
        '978123987',
        'ventas@fundolosfrutales.pe',
        'b0000000-0000-0000-0000-000000000001', -- Mayorista
        TRUE
    )
ON CONFLICT (tipo_documento, numero_documento) DO UPDATE
SET razon_social = EXCLUDED.razon_social,
    direccion = EXCLUDED.direccion,
    telefono = EXCLUDED.telefono,
    email = EXCLUDED.email,
    lista_precio_id = EXCLUDED.lista_precio_id,
    activo = EXCLUDED.activo;

-- ------------------------------------------------------------------------------
-- 4. STOCK INICIAL Y MOVIMIENTOS DE KÁRDEX
-- ------------------------------------------------------------------------------
-- REGLA DE ORO: Cada kilo/litro ingresado en stock_saldo TIENE un registro
-- previo correspondiente en movimiento_kardex con tipo 'INVENTARIO_INICIAL'.
-- ------------------------------------------------------------------------------

-- 4.1 Asientos de Kárdex: Stock Inicial en Almacén Principal Pisco
INSERT INTO movimiento_kardex (
    id, producto_id, ubicacion_id, tipo, cantidad_base, costo_unitario,
    documento_tipo, documento_id, movimiento_ref_id, lote_id, motivo,
    usuario_id, dispositivo_id, fecha_operacion, fecha_registro
)
VALUES 
    -- Urea Granulada: 200 sacos x 50kg = 10,000 kg a S/ 2.10/kg
    (
        'ee100000-0000-0000-0000-000000000001',
        'ba100000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        'INVENTARIO_INICIAL',
        10000.000,
        2.1000,
        'INVENTARIO_INICIAL',
        NULL,
        NULL,
        NULL,
        'Carga de inventario inicial - Almacén Principal Pisco',
        'e0000000-0000-0000-0000-000000000001', -- alipio.admin
        NULL,
        '2026-10-01 06:00:00-05',
        '2026-10-01 06:00:00-05'
    ),
    -- Fosfato Diamónico: 150 sacos x 50kg = 7,500 kg a S/ 3.20/kg
    (
        'ee100000-0000-0000-0000-000000000002',
        'ba100000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000001',
        'INVENTARIO_INICIAL',
        7500.000,
        3.2000,
        'INVENTARIO_INICIAL',
        NULL,
        NULL,
        NULL,
        'Carga de inventario inicial - Almacén Principal Pisco',
        'e0000000-0000-0000-0000-000000000001',
        NULL,
        '2026-10-01 06:00:00-05',
        '2026-10-01 06:00:00-05'
    ),
    -- Mancozeb 80%: 40 cajas x 20kg = 800 kg a S/ 32.00/kg
    (
        'ee100000-0000-0000-0000-000000000003',
        'ba100000-0000-0000-0000-000000000003',
        'a1000000-0000-0000-0000-000000000001',
        'INVENTARIO_INICIAL',
        800.000,
        32.0000,
        'INVENTARIO_INICIAL',
        NULL,
        NULL,
        NULL,
        'Carga de inventario inicial - Almacén Principal Pisco',
        'e0000000-0000-0000-0000-000000000001',
        NULL,
        '2026-10-01 06:00:00-05',
        '2026-10-01 06:00:00-05'
    ),
    -- Cipermetrina 25%: 50 cajas x 12L = 600 L a S/ 40.00/L
    (
        'ee100000-0000-0000-0000-000000000004',
        'ba100000-0000-0000-0000-000000000004',
        'a1000000-0000-0000-0000-000000000001',
        'INVENTARIO_INICIAL',
        600.000,
        40.0000,
        'INVENTARIO_INICIAL',
        NULL,
        NULL,
        NULL,
        'Carga de inventario inicial - Almacén Principal Pisco',
        'e0000000-0000-0000-0000-000000000001',
        NULL,
        '2026-10-01 06:00:00-05',
        '2026-10-01 06:00:00-05'
    ),
    -- Bioestimulante Radicular: 40 cajas x 12L = 480 L a S/ 55.00/L
    (
        'ee100000-0000-0000-0000-000000000005',
        'ba100000-0000-0000-0000-000000000005',
        'a1000000-0000-0000-0000-000000000001',
        'INVENTARIO_INICIAL',
        480.000,
        55.0000,
        'INVENTARIO_INICIAL',
        NULL,
        NULL,
        NULL,
        'Carga de inventario inicial - Almacén Principal Pisco',
        'e0000000-0000-0000-0000-000000000001',
        NULL,
        '2026-10-01 06:00:00-05',
        '2026-10-01 06:00:00-05'
    ),
    -- Glifosato 480 SL: 30 bidones x 20L = 600 L a S/ 22.00/L
    (
        'ee100000-0000-0000-0000-000000000006',
        'ba100000-0000-0000-0000-000000000006',
        'a1000000-0000-0000-0000-000000000001',
        'INVENTARIO_INICIAL',
        600.000,
        22.0000,
        'INVENTARIO_INICIAL',
        NULL,
        NULL,
        NULL,
        'Carga de inventario inicial - Almacén Principal Pisco',
        'e0000000-0000-0000-0000-000000000001',
        NULL,
        '2026-10-01 06:00:00-05',
        '2026-10-01 06:00:00-05'
    )
ON CONFLICT (id) DO NOTHING;

-- 4.2 Asientos de Kárdex: Stock Inicial en Depósito San Clemente
INSERT INTO movimiento_kardex (
    id, producto_id, ubicacion_id, tipo, cantidad_base, costo_unitario,
    documento_tipo, documento_id, movimiento_ref_id, lote_id, motivo,
    usuario_id, dispositivo_id, fecha_operacion, fecha_registro
)
VALUES 
    -- Urea Granulada: 50 sacos x 50kg = 2,500 kg
    (
        'ee100000-0000-0000-0000-000000000007',
        'ba100000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000002',
        'INVENTARIO_INICIAL',
        2500.000,
        2.1000,
        'INVENTARIO_INICIAL',
        NULL,
        NULL,
        NULL,
        'Carga de inventario inicial - Depósito San Clemente',
        'e0000000-0000-0000-0000-000000000001',
        NULL,
        '2026-10-01 06:00:00-05',
        '2026-10-01 06:00:00-05'
    ),
    -- Fosfato Diamónico: 30 sacos x 50kg = 1,500 kg
    (
        'ee100000-0000-0000-0000-000000000008',
        'ba100000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000002',
        'INVENTARIO_INICIAL',
        1500.000,
        3.2000,
        'INVENTARIO_INICIAL',
        NULL,
        NULL,
        NULL,
        'Carga de inventario inicial - Depósito San Clemente',
        'e0000000-0000-0000-0000-000000000001',
        NULL,
        '2026-10-01 06:00:00-05',
        '2026-10-01 06:00:00-05'
    ),
    -- Mancozeb 80%: 10 cajas x 20kg = 200 kg
    (
        'ee100000-0000-0000-0000-000000000009',
        'ba100000-0000-0000-0000-000000000003',
        'a1000000-0000-0000-0000-000000000002',
        'INVENTARIO_INICIAL',
        200.000,
        32.0000,
        'INVENTARIO_INICIAL',
        NULL,
        NULL,
        NULL,
        'Carga de inventario inicial - Depósito San Clemente',
        'e0000000-0000-0000-0000-000000000001',
        NULL,
        '2026-10-01 06:00:00-05',
        '2026-10-01 06:00:00-05'
    ),
    -- Cipermetrina 25%: 15 cajas x 12L = 180 L
    (
        'ee100000-0000-0000-0000-000000000010',
        'ba100000-0000-0000-0000-000000000004',
        'a1000000-0000-0000-0000-000000000002',
        'INVENTARIO_INICIAL',
        180.000,
        40.0000,
        'INVENTARIO_INICIAL',
        NULL,
        NULL,
        NULL,
        'Carga de inventario inicial - Depósito San Clemente',
        'e0000000-0000-0000-0000-000000000001',
        NULL,
        '2026-10-01 06:00:00-05',
        '2026-10-01 06:00:00-05'
    ),
    -- Bioestimulante Radicular: 10 cajas x 12L = 120 L
    (
        'ee100000-0000-0000-0000-000000000011',
        'ba100000-0000-0000-0000-000000000005',
        'a1000000-0000-0000-0000-000000000002',
        'INVENTARIO_INICIAL',
        120.000,
        55.0000,
        'INVENTARIO_INICIAL',
        NULL,
        NULL,
        NULL,
        'Carga de inventario inicial - Depósito San Clemente',
        'e0000000-0000-0000-0000-000000000001',
        NULL,
        '2026-10-01 06:00:00-05',
        '2026-10-01 06:00:00-05'
    ),
    -- Glifosato 480 SL: 10 bidones x 20L = 200 L
    (
        'ee100000-0000-0000-0000-000000000012',
        'ba100000-0000-0000-0000-000000000006',
        'a1000000-0000-0000-0000-000000000002',
        'INVENTARIO_INICIAL',
        200.000,
        22.0000,
        'INVENTARIO_INICIAL',
        NULL,
        NULL,
        NULL,
        'Carga de inventario inicial - Depósito San Clemente',
        'e0000000-0000-0000-0000-000000000001',
        NULL,
        '2026-10-01 06:00:00-05',
        '2026-10-01 06:00:00-05'
    )
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 5. CARGA DE DISTRIBUCIÓN MATUTINA ACTIVA (EN RUTA)
-- ------------------------------------------------------------------------------
-- Código: 'CARGA-20261001-001'
-- Conductor: vendedor1 (e0000000-0000-0000-0000-000000000004)
-- Vehículo: Camión V7X-842
-- Origen: Almacén Principal Pisco
-- Destino lógico: Bodega Móvil BM-V7X-842
-- ------------------------------------------------------------------------------

-- Finalizar cualquier carga previa residual de pruebas para vendedor1
UPDATE carga_distribucion 
SET estado = 'FINALIZADA', fecha_cierre = NOW() 
WHERE trabajador_id = 'e0000000-0000-0000-0000-000000000004' 
  AND codigo != 'CARGA-20261001-001'
  AND estado = 'EN_RUTA';

INSERT INTO carga_distribucion (
    id, codigo, almacen_origen_id, vehiculo_id, trabajador_id, bodega_movil_id,
    estado, fecha_salida, fecha_cierre, observaciones,
    creado_por, despachado_por, creado_en, actualizado_en
)
VALUES (
    'da100000-0000-0000-0000-000000000001',
    'CARGA-20261001-001',
    'a1000000-0000-0000-0000-000000000001', -- Almacén Principal Pisco
    'fe100000-0000-0000-0000-000000000001', -- Vehículo V7X-842
    'e0000000-0000-0000-0000-000000000004', -- vendedor1
    'a1000000-0000-0000-0000-000000000003', -- Bodega Móvil BM-V7X-842
    'EN_RUTA',
    NOW(),
    NULL,
    'Despacho matutino Ruta Valle de Pisco - Demostración Comercial Sr. Alipio',
    'e0000000-0000-0000-0000-000000000001', -- Creado por Sr. Alipio
    'e0000000-0000-0000-0000-000000000003', -- Despachado por almacen1
    NOW(),
    NOW()
)
ON CONFLICT (codigo) DO UPDATE
SET estado = EXCLUDED.estado,
    despachado_por = EXCLUDED.despachado_por,
    creado_en = NOW(),
    actualizado_en = NOW();

-- 5.1 Detalle de Mercadería Cargada en el Camión
INSERT INTO carga_detalle (
    id, carga_distribucion_id, producto_id, presentacion_id,
    cantidad_presentacion, cantidad_unidades_sueltas, cantidad_total_base, observaciones
)
VALUES 
    -- 30 sacos de Urea 46% = 1,500 kg
    (
        'db100000-0000-0000-0000-000000000001',
        'da100000-0000-0000-0000-000000000001',
        'ba100000-0000-0000-0000-000000000001',
        'bb100000-0000-0000-0000-000000000001', -- Saco 50 kg
        30.000,
        0.000,
        1500.000,
        '30 sacos para entrega a Fundo Santa Rosa y clientes de ruta'
    ),
    -- 15 sacos de Fosfato Diamónico = 750 kg
    (
        'db100000-0000-0000-0000-000000000002',
        'da100000-0000-0000-0000-000000000001',
        'ba100000-0000-0000-0000-000000000002',
        'bb100000-0000-0000-0000-000000000002', -- Saco 50 kg
        15.000,
        0.000,
        750.000,
        '15 sacos requeridos para siembra de papa y hortalizas'
    ),
    -- 5 cajas de Cipermetrina 25% (12x1L) = 60 L
    (
        'db100000-0000-0000-0000-000000000003',
        'da100000-0000-0000-0000-000000000001',
        'ba100000-0000-0000-0000-000000000004',
        'bb100000-0000-0000-0000-000000000006', -- Caja x 12 L
        5.000,
        0.000,
        60.000,
        '5 cajas cerradas de 12 litros c/u'
    ),
    -- 5 cajas de Bioestimulante Radicular (12x1L) = 60 L
    (
        'db100000-0000-0000-0000-000000000004',
        'da100000-0000-0000-0000-000000000001',
        'ba100000-0000-0000-0000-000000000005',
        'bb100000-0000-0000-0000-000000000008', -- Caja x 12 L
        5.000,
        0.000,
        60.000,
        '5 cajas cerradas de 12 litros c/u'
    )
ON CONFLICT (id) DO NOTHING;

-- 5.2 Asientos de Kárdex: Despacho Atómico de Carga a Ruta (ASIGNACION_DISTRIBUCION)
-- Descuenta del Almacén Principal Pisco (-) y Acredita en Bodega Móvil (+)

-- SALIDAS del Almacén Principal Pisco:
INSERT INTO movimiento_kardex (
    id, producto_id, ubicacion_id, tipo, cantidad_base, costo_unitario,
    documento_tipo, documento_id, movimiento_ref_id, lote_id, motivo,
    usuario_id, dispositivo_id, fecha_operacion, fecha_registro
)
VALUES 
    -- Salida Urea: -1500 kg
    (
        'ee100000-0000-0000-0000-000000000013',
        'ba100000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000001',
        'ASIGNACION_DISTRIBUCION',
        -1500.000,
        2.1000,
        'CARGA_DISTRIBUCION',
        'da100000-0000-0000-0000-000000000001',
        NULL,
        NULL,
        'Carga a ruta - Vehículo V7X-842 (CARGA-20261001-001)',
        'e0000000-0000-0000-0000-000000000003', -- almacen1
        NULL,
        '2026-10-01 07:45:00-05',
        '2026-10-01 07:45:00-05'
    ),
    -- Salida Fosfato: -750 kg
    (
        'ee100000-0000-0000-0000-000000000014',
        'ba100000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000001',
        'ASIGNACION_DISTRIBUCION',
        -750.000,
        3.2000,
        'CARGA_DISTRIBUCION',
        'da100000-0000-0000-0000-000000000001',
        NULL,
        NULL,
        'Carga a ruta - Vehículo V7X-842 (CARGA-20261001-001)',
        'e0000000-0000-0000-0000-000000000003',
        NULL,
        '2026-10-01 07:45:00-05',
        '2026-10-01 07:45:00-05'
    ),
    -- Salida Cipermetrina: -60 L
    (
        'ee100000-0000-0000-0000-000000000015',
        'ba100000-0000-0000-0000-000000000004',
        'a1000000-0000-0000-0000-000000000001',
        'ASIGNACION_DISTRIBUCION',
        -60.000,
        40.0000,
        'CARGA_DISTRIBUCION',
        'da100000-0000-0000-0000-000000000001',
        NULL,
        NULL,
        'Carga a ruta - Vehículo V7X-842 (CARGA-20261001-001)',
        'e0000000-0000-0000-0000-000000000003',
        NULL,
        '2026-10-01 07:45:00-05',
        '2026-10-01 07:45:00-05'
    ),
    -- Salida Bioestimulante: -60 L
    (
        'ee100000-0000-0000-0000-000000000016',
        'ba100000-0000-0000-0000-000000000005',
        'a1000000-0000-0000-0000-000000000001',
        'ASIGNACION_DISTRIBUCION',
        -60.000,
        55.0000,
        'CARGA_DISTRIBUCION',
        'da100000-0000-0000-0000-000000000001',
        NULL,
        NULL,
        'Carga a ruta - Vehículo V7X-842 (CARGA-20261001-001)',
        'e0000000-0000-0000-0000-000000000003',
        NULL,
        '2026-10-01 07:45:00-05',
        '2026-10-01 07:45:00-05'
    )
ON CONFLICT (id) DO NOTHING;

-- ENTRADAS a Bodega Móvil BM-V7X-842 (enlazadas con movimiento_ref_id):
INSERT INTO movimiento_kardex (
    id, producto_id, ubicacion_id, tipo, cantidad_base, costo_unitario,
    documento_tipo, documento_id, movimiento_ref_id, lote_id, motivo,
    usuario_id, dispositivo_id, fecha_operacion, fecha_registro
)
VALUES 
    -- Entrada Urea en Bodega Móvil: +1500 kg
    (
        'ee100000-0000-0000-0000-000000000017',
        'ba100000-0000-0000-0000-000000000001',
        'a1000000-0000-0000-0000-000000000003',
        'ASIGNACION_DISTRIBUCION',
        1500.000,
        2.1000,
        'CARGA_DISTRIBUCION',
        'da100000-0000-0000-0000-000000000001',
        'ee100000-0000-0000-0000-000000000013', -- Enlace con salida de almacén
        NULL,
        'Recepción en bodega móvil - Carga CARGA-20261001-001',
        'e0000000-0000-0000-0000-000000000003',
        NULL,
        '2026-10-01 07:45:00-05',
        '2026-10-01 07:45:00-05'
    ),
    -- Entrada Fosfato en Bodega Móvil: +750 kg
    (
        'ee100000-0000-0000-0000-000000000018',
        'ba100000-0000-0000-0000-000000000002',
        'a1000000-0000-0000-0000-000000000003',
        'ASIGNACION_DISTRIBUCION',
        750.000,
        3.2000,
        'CARGA_DISTRIBUCION',
        'da100000-0000-0000-0000-000000000001',
        'ee100000-0000-0000-0000-000000000014',
        NULL,
        'Recepción en bodega móvil - Carga CARGA-20261001-001',
        'e0000000-0000-0000-0000-000000000003',
        NULL,
        '2026-10-01 07:45:00-05',
        '2026-10-01 07:45:00-05'
    ),
    -- Entrada Cipermetrina en Bodega Móvil: +60 L
    (
        'ee100000-0000-0000-0000-000000000019',
        'ba100000-0000-0000-0000-000000000004',
        'a1000000-0000-0000-0000-000000000003',
        'ASIGNACION_DISTRIBUCION',
        60.000,
        40.0000,
        'CARGA_DISTRIBUCION',
        'da100000-0000-0000-0000-000000000001',
        'ee100000-0000-0000-0000-000000000015',
        NULL,
        'Recepción en bodega móvil - Carga CARGA-20261001-001',
        'e0000000-0000-0000-0000-000000000003',
        NULL,
        '2026-10-01 07:45:00-05',
        '2026-10-01 07:45:00-05'
    ),
    -- Entrada Bioestimulante en Bodega Móvil: +60 L
    (
        'ee100000-0000-0000-0000-000000000020',
        'ba100000-0000-0000-0000-000000000005',
        'a1000000-0000-0000-0000-000000000003',
        'ASIGNACION_DISTRIBUCION',
        60.000,
        55.0000,
        'CARGA_DISTRIBUCION',
        'da100000-0000-0000-0000-000000000001',
        'ee100000-0000-0000-0000-000000000016',
        NULL,
        'Recepción en bodega móvil - Carga CARGA-20261001-001',
        'e0000000-0000-0000-0000-000000000003',
        NULL,
        '2026-10-01 07:45:00-05',
        '2026-10-01 07:45:00-05'
    )
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 6. ACTUALIZACIÓN SINCRONIZADA DE STOCK_SALDO
-- ------------------------------------------------------------------------------
-- El saldo físico materializado es idéntico a la suma algebraica de Kárdex:
-- Almacén Principal Pisco:
--   Urea:           10,000 - 1,500 = 8,500 kg
--   Fosfato DAP:     7,500 -   750 = 6,750 kg
--   Mancozeb 80%:      800 -     0 =   800 kg
--   Cipermetrina:      600 -    60 =   540 L
--   Bioestimulante:    480 -    60 =   420 L
--   Glifosato:         600 -     0 =   600 L
-- Depósito San Clemente:
--   Urea:           2,500 kg
--   Fosfato DAP:    1,500 kg
--   Mancozeb 80%:     200 kg
--   Cipermetrina:     180 L
--   Bioestimulante:   120 L
--   Glifosato:        200 L
-- Bodega Móvil BM-V7X-842:
--   Urea:           1,500 kg
--   Fosfato DAP:      750 kg
--   Cipermetrina:      60 L
--   Bioestimulante:    60 L
-- ------------------------------------------------------------------------------

INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
VALUES 
    -- Almacén Principal Pisco
    ('ba100000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 8500.000, 0.000, NOW()),
    ('ba100000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 6750.000, 0.000, NOW()),
    ('ba100000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001',  800.000, 0.000, NOW()),
    ('ba100000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001',  540.000, 0.000, NOW()),
    ('ba100000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000001',  420.000, 0.000, NOW()),
    ('ba100000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000001',  600.000, 0.000, NOW()),

    -- Depósito San Clemente
    ('ba100000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000002', 2500.000, 0.000, NOW()),
    ('ba100000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 1500.000, 0.000, NOW()),
    ('ba100000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000002',  200.000, 0.000, NOW()),
    ('ba100000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000002',  180.000, 0.000, NOW()),
    ('ba100000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002',  120.000, 0.000, NOW()),
    ('ba100000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002',  200.000, 0.000, NOW()),

    -- Bodega Móvil BM-V7X-842 (Stock en ruta disponible para venta móvil)
    ('ba100000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000003', 1500.000, 0.000, NOW()),
    ('ba100000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000003',  750.000, 0.000, NOW()),
    ('ba100000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000003',   60.000, 0.000, NOW()),
    ('ba100000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000003',   60.000, 0.000, NOW())
ON CONFLICT (producto_id, ubicacion_id) DO UPDATE
SET cantidad_fisica = EXCLUDED.cantidad_fisica,
    cantidad_reservada = EXCLUDED.cantidad_reservada,
    actualizado_en = EXCLUDED.actualizado_en;

COMMIT;
