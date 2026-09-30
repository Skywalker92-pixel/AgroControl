# AgroControl Pro – Registro Formal de Prueba de Restauración
## Referencia: SKILL(4) §5 — "Un backup que nunca se restauró no cuenta"

---

## Datos de la Prueba

| Campo | Valor |
|---|---|
| **Fecha de ejecución** | 30/09/2026 |
| **Responsable** | Técnico de AgroControl Pro |
| **Objetivo** | Verificar que un backup `.sql.gz` puede restaurarse en un entorno limpio y el sistema queda operativo |
| **Entorno de prueba** | Contenedor Docker aislado en la misma PC (puerto 5434 para no interferir con producción) |

---

## Artefacto Usado

| Campo | Valor |
|---|---|
| **Archivo** | `agrocontrol_backup_YYYYMMDD_HHMMSS.sql.gz` (reemplazar con nombre real) |
| **Origen** | Carpeta `D:\AgroControl\backups\` |
| **Tamaño** | Ver tamaño real del archivo |
| **Hash SHA-256** | Verificar con: `Get-FileHash .\backups\<archivo>.sql.gz -Algorithm SHA256` |

---

## Procedimiento Ejecutado

### Paso 1: Levantar entorno de prueba aislado

```powershell
# Crear contenedor PostgreSQL de prueba (puerto diferente: 5434)
docker run -d `
  --name agrocontrol-db-test `
  -e POSTGRES_DB=agrocontrol_test `
  -e POSTGRES_USER=agrocontrol_user `
  -e POSTGRES_PASSWORD=agrocontrol_test_pass `
  -p 5434:5432 `
  postgres:15-alpine

# Esperar que esté listo
Start-Sleep -Seconds 10
docker exec agrocontrol-db-test pg_isready -U agrocontrol_user -d agrocontrol_test
```

**Resultado esperado:** `agrocontrol_test - accepting connections`
**Resultado obtenido:** ______________________________________

---

### Paso 2: Restaurar el backup

```powershell
# Restaurar el archivo de backup en el contenedor de prueba
$backupFile = "agrocontrol_backup_YYYYMMDD_HHMMSS.sql.gz"
$backupPath = "D:\AgroControl\backups\$backupFile"

# Descomprimir y restaurar
Get-Content $backupPath -Raw | docker exec -i agrocontrol-db-test `
  psql -U agrocontrol_user -d agrocontrol_test
```

**Tiempo de inicio:** ______________________
**Tiempo de finalización:** ______________________
**Duración total:** ______________________ minutos

**Resultado esperado:** Sin mensajes de error; finaliza con `-- PostgreSQL database dump complete`
**Resultado obtenido:** ______________________________________

---

### Paso 3: Verificación de integridad de datos

```powershell
# Contar registros en tablas principales
docker exec -it agrocontrol-db-test psql -U agrocontrol_user -d agrocontrol_test -c "
  SELECT
    (SELECT COUNT(*) FROM producto) AS productos,
    (SELECT COUNT(*) FROM movimiento_kardex) AS movimientos_kardex,
    (SELECT COUNT(*) FROM reparto) AS repartos,
    (SELECT COUNT(*) FROM venta_repartidor) AS ventas,
    (SELECT COUNT(*) FROM usuario) AS usuarios;
"
```

| Tabla | Registros Esperados | Registros Restaurados | ¿Conforme? |
|---|---|---|---|
| `producto` | _______ | _______ | ☐ Sí ☐ No |
| `movimiento_kardex` | _______ | _______ | ☐ Sí ☐ No |
| `reparto` | _______ | _______ | ☐ Sí ☐ No |
| `venta_repartidor` | _______ | _______ | ☐ Sí ☐ No |
| `usuario` | _______ | _______ | ☐ Sí ☐ No |

---

### Paso 4: Verificación de conciliación Kárdex vs Stock

```sql
-- Ejecutar en el entorno de prueba
SELECT
  ss.producto_id,
  ss.almacen_id,
  ss.cantidad_disponible AS saldo_en_stock,
  COALESCE(SUM(mk.cantidad_movimiento), 0) AS suma_kardex,
  ABS(ss.cantidad_disponible - COALESCE(SUM(mk.cantidad_movimiento), 0)) AS diferencia
FROM stock_saldo ss
LEFT JOIN movimiento_kardex mk
  ON mk.producto_id = ss.producto_id
 AND mk.almacen_id  = ss.almacen_id
GROUP BY ss.producto_id, ss.almacen_id, ss.cantidad_disponible
HAVING ABS(ss.cantidad_disponible - COALESCE(SUM(mk.cantidad_movimiento), 0)) > 0.001;
```

**Resultado esperado:** 0 filas (sin discrepancias)
**Resultado obtenido:** _______ filas | ☐ Sin discrepancias ☐ Con discrepancias

---

### Paso 5: Limpieza del entorno de prueba

```powershell
docker stop agrocontrol-db-test
docker rm agrocontrol-db-test
```

---

## Resultado Final

| Métrica | Valor |
|---|---|
| **¿La restauración fue exitosa?** | ☐ Sí ☐ No |
| **Tiempo total de restauración** | _______ minutos |
| **Tiempo total de verificación** | _______ minutos |
| **Tiempo de recuperación completo (RTO)** | _______ minutos |
| **Integridad de datos** | ☐ 100% conforme ☐ Con observaciones |
| **Conciliación Kárdex** | ☐ Sin discrepancias ☐ Con discrepancias |

### Observaciones adicionales:
```
_______________________________________________________________
_______________________________________________________________
_______________________________________________________________
```

---

## Próxima Prueba Programada

**Fecha:** _____ / _____ / _______ (recomendado: mensual)

---

## Firmas

**Técnico responsable:** ___________________________________  
**Fecha:** _____ / _____ / 2026

---

> **Referencia normativa:** SKILL(4) §5 — Regla 3-2-1 adaptada: "Verificación automática: si el backup falla, alerta visible al propietario. Prueba de restauración mensual en un entorno aparte. Un backup que nunca se restauró no cuenta."
