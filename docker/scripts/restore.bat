@echo off
REM ==============================================================================
REM AGROCONTROL PRO - EJECUTAR RESTAURACION DESDE WINDOWS (HOST)
REM Uso: restore.bat nombre_archivo_en_backups.sql.gz
REM ==============================================================================
if "%~1"=="" (
    echo [ERROR] Debe indicar el nombre del archivo de backup.
    echo Ejemplo: restore.bat agrocontrol_backup_20260929_160000.sql.gz
    exit /b 1
)

echo [ADVERTENCIA] Restaurando respaldo: %~1
docker exec -t agrocontrol-backup /restore.sh /backups/%~1
if %ERRORLEVEL% EQU 0 (
    echo [AGROCONTROL PRO] Base de datos restaurada correctamente.
) else (
    echo [AGROCONTROL PRO] Error al restaurar la base de datos.
)
