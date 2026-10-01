#!/bin/sh
# ==============================================================================
# AGROCONTROL PRO - SCRIPT DE RESPALDO AUTOMATIZADO CON CIFRADO (OBS-BKP-01)
# Archivo: backup.sh
# ==============================================================================
set -e

BACKUP_PATH="${BACKUP_DIR:-/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
FILENAME="agrocontrol_backup_${TIMESTAMP}.sql.gz.enc"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-agrocontrol_backup_secure_key_2026}"

mkdir -p "$BACKUP_PATH"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando respaldo cifrado de la base de datos ${DB_NAME} en ${DB_HOST}..."

export PGPASSWORD="${DB_PASSWORD}"

pg_dump -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}" --no-owner --clean --if-exists \
  | gzip \
  | openssl enc -aes-256-cbc -salt -pbkdf2 -pass "pass:${ENCRYPTION_KEY}" > "${BACKUP_PATH}/${FILENAME}"

if [ -s "${BACKUP_PATH}/${FILENAME}" ]; then
    FILESIZE=$(ls -lh "${BACKUP_PATH}/${FILENAME}" | awk '{print $5}')
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Respaldo cifrado generado con éxito: ${FILENAME} (${FILESIZE})"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR CRÍTICO: El archivo de respaldo está vacío o falló pg_dump."
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Limpiando respaldos con más de ${RETENTION_DAYS} días de antigüedad..."
find "$BACKUP_PATH" \( -name "agrocontrol_backup_*.sql.gz" -o -name "agrocontrol_backup_*.sql.gz.enc" \) -type f -mtime +"$RETENTION_DAYS" -exec rm -f {} \;

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Proceso de respaldo cifrado completado satisfactoriamente."
