@echo off
REM ==============================================================================
REM AGROCONTROL PRO - EJECUTAR RESPALDO CIFRADO DESDE WINDOWS (HOST) (OBS-BKP-01)
REM ==============================================================================
echo [AGROCONTROL PRO] Iniciando copia de seguridad manual cifrada (OpenSSL AES-256-CBC)...
docker exec -t agrocontrol-backup /backup.sh
if %ERRORLEVEL% EQU 0 (
    echo [AGROCONTROL PRO] Copia de seguridad cifrada (.sql.gz.enc) finalizada con exito en ./backups
) else (
    echo [AGROCONTROL PRO] Error al ejecutar la copia de seguridad.
)
