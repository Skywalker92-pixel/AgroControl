-- ==============================================================================
-- AGROCONTROL PRO - SEED DE DATOS INICIALES (FASE 1: NÚCLEO)
-- Archivo: 001_seed_fase1.sql
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

-- 4. USUARIOS INICIALES CON LOS 4 ROLES DEL DOMINIO
-- Contraseña inicial para todos los usuarios de prueba: 'AgroControl2026*'
-- Hash verificado generado con bcrypt: $2a$10$57l7YcVhHxV6.8K4MmcypeKsiXKXoBxo/AUwChJBeI52lfv/KFFDW
INSERT INTO usuario (id, username, password_hash, nombre_completo, email, rol, activo)
VALUES 
    (
        'e0000000-0000-0000-0000-000000000001', 
        'alipio.admin', 
        '$2a$10$57l7YcVhHxV6.8K4MmcypeKsiXKXoBxo/AUwChJBeI52lfv/KFFDW', 
        'Sr. Alipio (Propietario)', 
        'alipio@agrocontrol.local', 
        'ADMINISTRADOR_PROPIETARIO', 
        TRUE
    ),
    (
        'e0000000-0000-0000-0000-000000000002', 
        'esposa.admin', 
        '$2a$10$57l7YcVhHxV6.8K4MmcypeKsiXKXoBxo/AUwChJBeI52lfv/KFFDW', 
        'Administradora Secundaria', 
        'administracion@agrocontrol.local', 
        'ADMINISTRADOR_SECUNDARIO', 
        TRUE
    ),
    (
        'e0000000-0000-0000-0000-000000000003', 
        'almacen1', 
        '$2a$10$57l7YcVhHxV6.8K4MmcypeKsiXKXoBxo/AUwChJBeI52lfv/KFFDW', 
        'Operador de Almacén Principal', 
        'almacen@agrocontrol.local', 
        'OPERADOR_ALMACEN', 
        TRUE
    ),
    (
        'e0000000-0000-0000-0000-000000000004', 
        'vendedor1', 
        '$2a$10$57l7YcVhHxV6.8K4MmcypeKsiXKXoBxo/AUwChJBeI52lfv/KFFDW', 
        'Vendedor en Ruta', 
        'vendedor1@agrocontrol.local', 
        'VENDEDOR', 
        TRUE
    )
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash;
