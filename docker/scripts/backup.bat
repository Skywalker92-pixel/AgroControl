@echo off
REM ==============================================================================
REM AGROCONTROL PRO - EJECUTAR RESPALDO DESDE WINDOWS (HOST)
REM ==============================================================================
echo [AGROCONTROL PRO] Iniciando copia de seguridad manual...
docker exec -t agrocontrol-backup /backup.sh
if %ERRORLEVEL% EQU 0 (
    echo [AGROCONTROL PRO] Copia de seguridad finalizada con exito en la carpeta ./backups
) else (
    echo [AGROCONTROL PRO] Error al ejecutar la copia de seguridad.
)
