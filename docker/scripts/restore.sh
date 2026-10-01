#!/bin/sh
# ==============================================================================
# AGROCONTROL PRO - SCRIPT DE RESTAURACIÓN DE BASE DE DATOS (OBS-BKP-01)
# Archivo: restore.sh
# Uso: ./restore.sh /backups/agrocontrol_backup_YYYYMMDD_HHMMSS.sql.gz.enc
# ==============================================================================
set -e

BACKUP_FILE="$1"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-agrocontrol_backup_secure_key_2026}"

if [ -z "$BACKUP_FILE" ]; then
    echo "ERROR: Debe especificar la ruta del archivo de respaldo a restaurar."
    echo "Ejemplo: ./restore.sh /backups/agrocontrol_backup_20260929_160000.sql.gz.enc"
    exit 1
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "ERROR: El archivo de respaldo especificado no existe: $BACKUP_FILE"
    exit 1
fi

echo "=============================================================================="
echo "ADVERTENCIA: Esta operación sobreescribirá la base de datos ${DB_NAME} en ${DB_HOST}."
echo "Archivo: $BACKUP_FILE"
echo "=============================================================================="

export PGPASSWORD="${DB_PASSWORD}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Procesando y restaurando base de datos..."

case "$BACKUP_FILE" in
    *.enc)
        echo "Detectado archivo cifrado (.enc). Desencriptando con OpenSSL..."
        openssl enc -d -aes-256-cbc -pbkdf2 -pass "pass:${ENCRYPTION_KEY}" -in "$BACKUP_FILE" \
          | gunzip \
          | psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}"
        ;;
    *.gz)
        echo "Detectado archivo comprimido gzip (.gz)..."
        gunzip -c "$BACKUP_FILE" \
          | psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}"
        ;;
    *)
        echo "Detectado archivo SQL plano..."
        psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}" < "$BACKUP_FILE"
        ;;
esac

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restauración completada con éxito."
