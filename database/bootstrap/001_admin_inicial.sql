-- ==============================================================================
-- AGROCONTROL PRO - CREACIÓN DEL ADMINISTRADOR INICIAL (PRODUCCIÓN)
-- Archivo: database/bootstrap/001_admin_inicial.sql
-- ==============================================================================
-- Crea la cuenta ADMINISTRADOR_PROPIETARIO inicial con una contraseña elegida
-- por el operador. La contraseña se hashea con bcrypt (pgcrypto, compatible con
-- bcryptjs del backend) y nunca se guarda en el repositorio.
--
-- Uso (psql):
--   psql "$DATABASE_URL" \
--     -v admin_username='propietario' \
--     -v admin_password='<contraseña-robusta>' \
--     -v admin_nombre='Nombre del Propietario' \
--     -f database/bootstrap/001_admin_inicial.sql
--
-- Es idempotente: si el usuario ya existe NO modifica su contraseña.
-- ==============================================================================

\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

SELECT (length(:'admin_password') >= 12) AS password_ok \gset
\if :password_ok
\else
  DO $$ BEGIN RAISE EXCEPTION 'admin_password debe tener al menos 12 caracteres'; END $$;
\endif

INSERT INTO usuario (username, password_hash, nombre_completo, rol, activo)
VALUES (
    :'admin_username',
    crypt(:'admin_password', gen_salt('bf', 10)),
    :'admin_nombre',
    'ADMINISTRADOR_PROPIETARIO',
    TRUE
)
ON CONFLICT (username) DO NOTHING;
