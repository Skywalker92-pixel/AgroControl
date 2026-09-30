#!/bin/sh
# ==============================================================================
# AGROCONTROL PRO - SCRIPT DE RESTAURACIÓN DE BASE DE DATOS
# Archivo: restore.sh
# Uso: ./restore.sh /backups/agrocontrol_backup_YYYYMMDD_HHMMSS.sql.gz
# ==============================================================================
set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "ERROR: Debe especificar la ruta del archivo de respaldo a restaurar."
    echo "Ejemplo: ./restore.sh /backups/agrocontrol_backup_20260929_160000.sql.gz"
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

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Descomprimiendo y restaurando base de datos..."
gunzip -c "$BACKUP_FILE" | psql -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Restauración completada con éxito."
