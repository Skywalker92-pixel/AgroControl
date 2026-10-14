#!/bin/sh
# ==============================================================================
# AGROCONTROL PRO - BOOTSTRAP DE PRIMERA INSTALACIÓN (Docker initdb)
# ==============================================================================
# Se ejecuta UNA sola vez, cuando el volumen de PostgreSQL está vacío.
#
# 1. Si INITIAL_ADMIN_PASSWORD está definido, crea el administrador propietario
#    (INITIAL_ADMIN_USERNAME / INITIAL_ADMIN_NOMBRE) con hash bcrypt.
# 2. Solo si ENABLE_DEMO_SEED=true carga usuarios y datos FICTICIOS de demostración.
#    Por defecto es false: una instalación productiva nunca recibe cuentas demo.
# ==============================================================================
set -eu

PSQL="psql -v ON_ERROR_STOP=1 --username ${POSTGRES_USER} --dbname ${POSTGRES_DB}"

if [ -n "${INITIAL_ADMIN_PASSWORD:-}" ]; then
  echo "[AGROCONTROL INIT] Creando administrador inicial '${INITIAL_ADMIN_USERNAME:-propietario}'..."
  $PSQL \
    -v admin_username="${INITIAL_ADMIN_USERNAME:-propietario}" \
    -v admin_password="${INITIAL_ADMIN_PASSWORD}" \
    -v admin_nombre="${INITIAL_ADMIN_NOMBRE:-Administrador Propietario}" \
    -f /docker-entrypoint-bootstrap/001_admin_inicial.sql
else
  echo "[AGROCONTROL INIT] INITIAL_ADMIN_PASSWORD no definido: no se creó administrador inicial."
  echo "[AGROCONTROL INIT] Créelo luego con database/bootstrap/001_admin_inicial.sql"
fi

if [ "${ENABLE_DEMO_SEED:-false}" = "true" ]; then
  echo "[AGROCONTROL INIT] ENABLE_DEMO_SEED=true -> cargando datos FICTICIOS de demostración."
  $PSQL -f /docker-entrypoint-seeds/001_seed_usuarios_demo.sql
  $PSQL -f /docker-entrypoint-seeds/002_seed_demo_comercial.sql
else
  echo "[AGROCONTROL INIT] ENABLE_DEMO_SEED!=true -> sin datos ni cuentas de demostración."
fi
