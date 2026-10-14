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

if [ -z "${BACKUP_ENCRYPTION_KEY}" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR CRÍTICO: BACKUP_ENCRYPTION_KEY no configurado o vacío. Abortando respaldo para evitar generar archivos desprotegidos."
    exit 1
fi
case "${BACKUP_ENCRYPTION_KEY}" in
    *CHANGE_ME*|*changeme*|*example*)
        echo "ERROR CRÍTICO: BACKUP_ENCRYPTION_KEY contiene un valor de ejemplo. Configure una clave aleatoria propia."
        exit 1
        ;;
esac
if [ "${#BACKUP_ENCRYPTION_KEY}" -lt 32 ]; then
    echo "ERROR CRÍTICO: BACKUP_ENCRYPTION_KEY debe tener al menos 32 caracteres."
    exit 1
fi
# La clave se lee desde el entorno (-pass env:) para no exponerla en la lista de procesos.
export BACKUP_ENCRYPTION_KEY

mkdir -p "$BACKUP_PATH"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando respaldo cifrado de la base de datos ${DB_NAME} en ${DB_HOST}..."

export PGPASSWORD="${DB_PASSWORD}"

pg_dump -h "${DB_HOST}" -p "${DB_PORT:-5432}" -U "${DB_USER}" -d "${DB_NAME}" --no-owner --clean --if-exists \
  | gzip \
  | openssl enc -aes-256-cbc -salt -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY > "${BACKUP_PATH}/${FILENAME}"

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
