-- ==============================================================================
-- AGROCONTROL PRO - SEED DE USUARIOS DE DEMOSTRACIÓN / PRUEBAS
-- Archivo: 001_seed_usuarios_demo.sql
-- ==============================================================================
-- DATOS FICTICIOS PARA DEMOSTRACIÓN
-- NO CORRESPONDEN A INFORMACIÓN REAL DE CLIENTES
--
-- USO EXCLUSIVO: pruebas automatizadas (CI / E2E) y demostraciones locales.
-- NUNCA ejecutar en una base de datos de producción: la contraseña es pública.
-- En Docker solo se carga si ENABLE_DEMO_SEED=true.
--
-- Contraseña de todas las cuentas: Demo-NoProduccion-2026
-- ==============================================================================

INSERT INTO usuario (id, username, password_hash, nombre_completo, email, rol, activo)
VALUES
    (
        'e0000000-0000-0000-0000-000000000001',
        'demo.admin',
        '$2a$10$bb5UYndPOimEVuyJ/2h2bOCtQUxwBT3WKQXw9sEHXpJT6oO70SwiC',
        'Administrador Demo (Propietario)',
        'demo.admin@example.com',
        'ADMINISTRADOR_PROPIETARIO',
        TRUE
    ),
    (
        'e0000000-0000-0000-0000-000000000002',
        'demo.secundario',
        '$2a$10$bb5UYndPOimEVuyJ/2h2bOCtQUxwBT3WKQXw9sEHXpJT6oO70SwiC',
        'Administrador Secundario Demo',
        'demo.secundario@example.com',
        'ADMINISTRADOR_SECUNDARIO',
        TRUE
    ),
    (
        'e0000000-0000-0000-0000-000000000003',
        'demo.almacen',
        '$2a$10$bb5UYndPOimEVuyJ/2h2bOCtQUxwBT3WKQXw9sEHXpJT6oO70SwiC',
        'Operador de Almacén Demo',
        'demo.almacen@example.com',
        'OPERADOR_ALMACEN',
        TRUE
    ),
    (
        'e0000000-0000-0000-0000-000000000004',
        'demo.vendedor',
        '$2a$10$bb5UYndPOimEVuyJ/2h2bOCtQUxwBT3WKQXw9sEHXpJT6oO70SwiC',
        'Vendedor en Ruta Demo',
        'demo.vendedor@example.com',
        'VENDEDOR',
        TRUE
    )
-- DO NOTHING: nunca sobrescribe cuentas existentes (evita resetear contraseñas
-- si este archivo se ejecuta por error sobre una base con usuarios reales).
ON CONFLICT DO NOTHING;
