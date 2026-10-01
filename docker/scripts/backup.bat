@echo off
REM ==============================================================================
REM AGROCONTROL PRO - EJECUTAR RESPALDO CIFRADO DESDE WINDOWS (HOST) (OBS-BKP-01)
REM ==============================================================================
if "%BACKUP_ENCRYPTION_KEY%"=="" (
    echo [AGROCONTROL PRO] ERROR CRITICO: La variable de entorno BACKUP_ENCRYPTION_KEY no esta configurada o esta vacia.
    echo Abortando respaldo para evitar generar archivos desprotegidos.
    exit /b 1
)

docker exec -e BACKUP_ENCRYPTION_KEY="%BACKUP_ENCRYPTION_KEY%" -t agrocontrol-backup /backup.sh
if %ERRORLEVEL% EQU 0 (
    echo [AGROCONTROL PRO] Copia de seguridad cifrada (.sql.gz.enc) finalizada con exito en ./backups
) else (
    echo [AGROCONTROL PRO] Error al ejecutar la copia de seguridad.
    exit /b 1
)
