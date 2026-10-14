-- ==============================================================================
-- AGROCONTROL PRO - SEED DE DATOS BASE (REFERENCIA)
-- Archivo: 000_seed_base.sql
-- ==============================================================================
-- Datos de referencia mínimos y genéricos (ubicaciones iniciales, categorías y
-- listas de precio). NO crea usuarios: es seguro para producción.
-- El administrador inicial se crea con database/bootstrap/001_admin_inicial.sql
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

