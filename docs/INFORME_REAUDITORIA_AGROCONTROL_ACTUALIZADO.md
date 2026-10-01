# INFORME DE REVISIÓN TÉCNICA ACTUALIZADA – AGROCONTROL PRO

**Repositorio:** `Skywalker92-pixel/AgroControl`  
**Rama revisada:** `main`  
**Commit revisado:** `bfbd8e2a4fdcc2d8c660145e96b11df53c5fca07`  
**Fecha de revisión:** 30 de septiembre de 2026 / 01 de octubre de 2026 UTC  
**Tipo de revisión:** Reauditoría técnica posterior a correcciones P0, P1 y P2.

---

## 1. Resumen ejecutivo

Se realizó una segunda revisión técnica del repositorio AgroControl Pro, comparando el estado previamente auditado con la versión actual del branch `main`.

Desde la primera auditoría se incorporaron tres commits importantes:

- `00bc4a2` — correcciones de seguridad P0: IDOR, control de dispositivos y JWT.
- `0e23222` — correcciones P1: rate limiting, CORS, CI/CD, backups y bootstrap de base de datos.
- `bfbd8e2` — mejoras P2: PWA, IndexedDB y actualización de documentación.

La evolución del proyecto es positiva. Varios de los problemas críticos detectados inicialmente fueron efectivamente corregidos y existe ahora evidencia automatizada de compilación y pruebas.

El workflow de GitHub Actions correspondiente al commit actual finalizó correctamente y reportó:

```text
Test Suites: 11 passed, 11 total
Tests:       134 passed, 134 total
Snapshots:   0 total
Time:        14.539 s
```

El frontend también compiló correctamente mediante Vite.

Aun así, durante esta segunda revisión se identificaron nuevos casos de borde y algunos riesgos que permanecen parcialmente resueltos.

---

## 2. Estado general posterior a las actualizaciones

| Área | Estado anterior | Estado actual |
|---|---|---|
| IDOR en carga móvil | 🔴 Crítico | 🟢 Corregido |
| `X-Device-Id` opcional | 🔴 Crítico | 🟢 Corregido |
| Auto-registro `DEV-AUTO` | 🔴 Crítico | 🟢 Eliminado |
| JWT fallback interno | 🔴 Alto | 🟢 Corregido en NestJS |
| CORS | 🟡/🔴 | 🟢 Mejorado |
| Rate limiting | 🔴 Pendiente | 🟢 Implementado |
| `/usuarios` accesible ampliamente | 🟡 | 🟢 Corregido |
| Fresh install sin seeds | 🟡/🔴 | 🟢 Corregido |
| GitHub Actions | 🔴 Ausente | 🟢 Implementado |
| Pruebas verificables | 🟡 | 🟢 134/134 |
| IndexedDB | 🔴 Ausente | 🟢 Implementado |
| Service Worker / PWA | 🔴 Ausente | 🟢 Implementado |
| Backup cifrado | 🔴 No | 🟡 Implementado con observaciones |
| Restore documentado | 🟡 Plantilla | 🟡 Mejorado |
| JWT en localStorage | 🟡 | 🟡 Pendiente |
| Frontend testing | 🟡 | 🟡 Pendiente |
| Lint real en CI | 🟡 | 🟡 Pendiente |

---

# 3. Correcciones verificadas

## OBS-COR-01 – CI/CD mediante GitHub Actions

**Estado: 🟢 CORREGIDO**

Se agregó:

```text
.github/workflows/ci.yml
```

El pipeline actual ejecuta:

```text
Checkout
Node.js 20
PostgreSQL 15
Migraciones
Seed inicial
npm ci backend
Backend build
Pruebas E2E
npm ci frontend
Frontend build
```

### Evidencia verificada

```text
Test Suites: 11 passed, 11 total
Tests:       134 passed, 134 total
```

También se verificó:

```text
vite build
✓ built successfully
```

### Conclusión

Ahora existe evidencia automática por commit de que el sistema compila y que la suite E2E pasa correctamente.

---

## OBS-COR-02 – Protección contra IDOR en cargas

**Estado: 🟢 CORREGIDO**

La sincronización valida ahora que la carga utilizada por una operación:

- exista;
- esté en estado `EN_RUTA`;
- pertenezca al usuario autenticado.

Lógica observada:

```typescript
if (!carga || carga.estado !== 'EN_RUTA' || carga.trabajador_id !== usuarioId) {
  throw new ForbiddenException(
    'No está autorizado para registrar ventas sobre una carga asignada a otro trabajador',
  );
}
```

### Conclusión

La autorización horizontal en operaciones de carga fue endurecida correctamente.

---

## OBS-COR-03 – `X-Device-Id` obligatorio

**Estado: 🟢 CORREGIDO**

Actualmente:

```typescript
if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
  throw new BadRequestException('Cabecera X-Device-Id requerida');
}
```

Además se valida que el dispositivo:

```text
exista
+
esté activo
+
esté autorizado
+
pertenezca al usuario autenticado
```

### Conclusión

La protección de terminales móviles mejoró de forma significativa.

---

## OBS-COR-04 – Eliminación del dispositivo automático `DEV-AUTO`

**Estado: 🟢 CORREGIDO**

No se encontró la lógica anterior que creaba automáticamente un terminal autorizado cuando no se proporcionaba dispositivo.

### Conclusión

La autorización de terminal ya no puede omitirse de esa manera.

---

## OBS-COR-05 – Restricción del endpoint `/usuarios`

**Estado: 🟢 CORREGIDO**

El endpoint ahora utiliza:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
```

y restringe acceso a:

```text
ADMINISTRADOR_PROPIETARIO
ADMINISTRADOR_SECUNDARIO
```

---

## OBS-COR-06 – Rate limiting

**Estado: 🟢 CORREGIDO**

Se agregó `@nestjs/throttler`.

Límites relevantes observados:

```text
Login:
5 solicitudes por minuto

Sincronización PUSH:
30 solicitudes por minuto
```

---

## OBS-COR-07 – CORS con allowlist

**Estado: 🟢 CORREGIDO**

El backend ya no utiliza `origin: true` de manera completamente permisiva. Ahora construye una lista de orígenes permitidos mediante `CORS_ORIGINS` más orígenes locales de desarrollo.

---

## OBS-COR-08 – Fail-fast de JWT dentro del backend

**Estado: 🟢 CORREGIDO EN APLICACIÓN**

`main.ts`, `AuthModule` y `JwtStrategy` validan que exista un secreto JWT suficientemente largo.

```typescript
if (!jwtSecret || jwtSecret.length < 16) {
  throw new Error('FATAL: JWT_SECRET no configurado en entorno');
}
```

**Observación:** Docker todavía reduce parcialmente el valor de esta medida. Ver `OBS-SEC-NEW-03`.

---

## OBS-COR-09 – Fresh install con seed

**Estado: 🟢 CORREGIDO**

Docker ahora monta `database/init/` sobre `/docker-entrypoint-initdb.d` e incluye scripts de esquema, migraciones y seed.

---

## OBS-COR-10 – Implementación real de PWA

**Estado: 🟢 CORREGIDO**

El frontend integra `vite-plugin-pwa` con Workbox, manifest, Service Worker, iconos y precaché del shell.

---

## OBS-COR-11 – IndexedDB

**Estado: 🟢 CORREGIDO**

Se agregó `frontend/src/store/mobileDb.ts` utilizando `idb`.

Stores observados:

```text
catalogo
clientes
carga_activa
operaciones_pendientes_queue
metadata
```

Las ventas locales se almacenan transaccionalmente junto con la actualización de la carga.

---

# 4. Nuevas observaciones de seguridad

## OBS-SEC-NEW-01 – `OPERADOR_ALMACEN` puede potencialmente autoautorizar terminales

**Severidad: 🔴 ALTA**

El endpoint `POST /api/sync/dispositivos/registrar` permite administradores, operadores de almacén y vendedores.

La lógica especial solo diferencia:

```typescript
const esVendedor = usuarioRol === RolUsuario.VENDEDOR;
```

Para usuarios que no son vendedores:

```typescript
const nuevoAutorizado = esVendedor
  ? false
  : (dto.autorizado !== undefined ? dto.autorizado : true);
```

### Riesgo

Un `OPERADOR_ALMACEN` puede quedar tratado como usuario con privilegio suficiente para configurar:

```text
autorizado = true
activo = true
trabajador_id = otro usuario
```

### Recomendación

Definir explícitamente un rol administrador y permitir únicamente a esos roles modificar autorización, activación o asignación a terceros.

---

## OBS-SEC-NEW-02 – Un vendedor puede reactivar un dispositivo deshabilitado

**Severidad: 🔴 ALTA**

Para dispositivos existentes:

```typescript
const activo = esVendedor
  ? true
  : (dto.activo !== undefined ? dto.activo : existente.activo);
```

### Escenario

```text
Administrador:
activo = false
autorizado = true

Vendedor vuelve a registrar el terminal

Resultado posible:
activo = true
autorizado = true
```

### Recomendación

Para vendedores conservar estrictamente:

```typescript
const activo = existente.activo;
const autorizado = existente.autorizado;
```

---

## OBS-SEC-NEW-03 – Docker mantiene secretos públicos por defecto

**Severidad: 🔴 ALTA**

Aunque NestJS implementa fail-fast, Docker contiene valores predeterminados para `JWT_SECRET`, `DB_PASSWORD` y `BACKUP_ENCRYPTION_KEY`.

### Riesgo

Una instalación puede iniciar utilizando secretos públicamente conocidos.

### Recomendación

Usar variables obligatorias:

```yaml
JWT_SECRET: ${JWT_SECRET:?JWT_SECRET requerido}
DB_PASSWORD: ${DB_PASSWORD:?DB_PASSWORD requerido}
BACKUP_ENCRYPTION_KEY: ${BACKUP_ENCRYPTION_KEY:?BACKUP_ENCRYPTION_KEY requerido}
```

---

## OBS-SEC-NEW-04 – Clave predeterminada de cifrado de backups

**Severidad: 🔴 ALTA**

El script permite:

```bash
ENCRYPTION_KEY="${BACKUP_ENCRYPTION_KEY:-agrocontrol_backup_secure_key_2026}"
```

### Riesgo

El backup está cifrado técnicamente, pero puede terminar protegido por una contraseña pública conocida.

### Recomendación

Eliminar completamente el fallback y exigir una clave aleatoria fuerte configurada externamente.

---

# 5. Observaciones de sincronización móvil

## OBS-MOB-NEW-01 – Carga móvil antigua puede mantenerse después del cierre

**Severidad: 🔴 ALTA FUNCIONAL**

El frontend utiliza:

```typescript
const cargaActualizada =
  respuesta.datos.carga_activa || get().cargaActiva;
```

### Escenario

```text
1. Vendedor tiene carga A.
2. Administración liquida/cierra la carga.
3. Backend responde carga_activa = null.
4. Frontend conserva get().cargaActiva.
5. La carga antigua permanece localmente.
```

Además, `guardarPullIndexedDB()` solo escribe `carga_activa` cuando existe un objeto, por lo que tampoco elimina la carga anterior.

### Riesgo

El móvil puede seguir operando localmente sobre una carga cerrada. El backend probablemente rechazará el PUSH, pero el vendedor ya pudo generar operaciones offline inválidas.

### Recomendación

Diferenciar explícitamente:

```text
undefined = no hay cambio
null      = borrar carga activa
objeto    = reemplazar carga
```

---

## OBS-MOB-NEW-02 – Idempotencia evaluada después de validar la carga

**Severidad: 🟡 MEDIA**

Actualmente primero se valida la carga y después se consulta si la operación ya existe.

### Escenario

```text
1. Venta UUID-X se sincroniza correctamente.
2. La carga se liquida/cierra.
3. El móvil reintenta UUID-X.
4. El backend ve que la carga ya no está EN_RUTA.
5. Puede responder 403 antes de reconocer que UUID-X ya fue procesada.
```

### Recomendación

Orden recomendado:

```text
1. Buscar UUID de operación.
2. Si ya existe, devolver estado idempotente.
3. Si es nueva, validar dispositivo.
4. Validar carga.
5. Procesar.
```

---

## OBS-MOB-NEW-03 – Operaciones no `VENTA` se marcan `APLICADA` sin lógica de dominio equivalente

**Severidad: 🟠 ALTA FUNCIONAL POTENCIAL**

Se observó que tipos como:

```text
COBRO
DEVOLUCION
SOBRANTE
PEDIDO
```

se almacenan como `APLICADA`, pero en esa ruta no se observó una lógica equivalente para afectar deuda, reintegrar inventario, ajustar stock o crear un pedido comercial real.

### Recomendación

Definir si esos tipos son:

```text
A. solo eventos de bitácora
B. operaciones reales de negocio
```

Si son operaciones reales, implementar efectos transaccionales específicos.

---

# 6. Observaciones de backups y recuperación

## OBS-BKP-NEW-01 – El cifrado existe, pero depende de una clave insegura por defecto

**Estado: 🟡 PARCIALMENTE CORREGIDO**

El backup ahora usa:

```bash
pg_dump | gzip | openssl enc -aes-256-cbc -salt -pbkdf2
```

La parte pendiente es hacer obligatoria una clave externa no pública.

---

## OBS-BKP-NEW-02 – Health en cloud es más honesto pero no degrada el sistema

**Severidad: 🟡 MEDIA**

Ahora el health devuelve:

```text
estado: no_verificable_en_cloud
ultimo_backup: null
```

Esto es mejor que simular un backup exitoso. Sin embargo, `alerta: false` puede hacer que el estado global siga apareciendo saludable.

### Recomendación

Introducir estados:

```text
OK
ALERTA
DESCONOCIDO
```

y hacer que `DESCONOCIDO` produzca al menos estado global `degradado`.

---

## OBS-BKP-NEW-03 – Documento de restauración mejorado, pero la evidencia no es reproducible desde GitHub

**Severidad: 🟡 MEDIA**

`docs/prueba_restauracion.md` fue actualizado con nombres correctos del esquema y métricas de restore.

Sin embargo, desde el repositorio no puede verificarse directamente que la restauración reportada haya ocurrido.

### Recomendación

Guardar un artefacto de auditoría no sensible con:

```text
commit SHA
fecha
PostgreSQL version
hash SHA-256 real
duración
resultado
conteo de registros
conciliación Kardex
```

---

# 7. Observaciones de QA y CI

## OBS-QA-NEW-01 – El workflow se llama “Build, Lint & Test” pero no ejecuta lint

**Severidad: 🟡 MEDIA**

El pipeline actual no ejecuta `npm run lint`.

### Recomendación

Agregar un paso explícito de lint al workflow.

---

## OBS-QA-NEW-02 – ESLint y Prettier siguen sin dependencias directas completas

**Severidad: 🟡 MEDIA**

`backend/package.json` contiene scripts `lint` y `format`, pero no se observaron las herramientas de lint/format declaradas de forma completa como dependencias directas.

### Recomendación

Agregar explícitamente:

```text
eslint
prettier
@typescript-eslint/parser
@typescript-eslint/eslint-plugin
eslint-config-prettier
```

---

## OBS-QA-NEW-03 – Frontend continúa sin pruebas automáticas

**Severidad: 🟡 MEDIA**

`frontend/package.json` no tiene scripts de `test`, `lint` o `test:e2e`.

### Recomendación

Agregar:

```text
Vitest
React Testing Library
Playwright
```

Casos prioritarios:

```text
login
venta móvil
cola offline
PULL
PUSH
cambio de carga
reconexión
carga cerrada
idempotencia
```

---

# 8. Observaciones de hardening web

## OBS-WEB-01 – JWT continúa almacenándose en localStorage

**Severidad: 🟡 MEDIA**

Actualmente:

```typescript
localStorage.setItem('agrocontrol_token', token);
```

### Riesgo

Una vulnerabilidad XSS podría acceder al token.

### Recomendación

Evaluar cookies `HttpOnly`, `Secure`, `SameSite` o acompañar el esquema actual con una CSP estricta y medidas fuertes contra XSS.

---

## OBS-WEB-02 – No se observó Helmet

**Severidad: 🟡 MEDIA**

No se encontró uso de `helmet`.

### Recomendación

Agregarlo y ajustar los headers según las necesidades de PWA y frontend.

---

## OBS-WEB-03 – Nginx sin headers de seguridad explícitos

**Severidad: 🟡 MEDIA**

La configuración actual no incluye de manera evidente:

```text
Content-Security-Policy
X-Content-Type-Options
Referrer-Policy
Permissions-Policy
```

### Recomendación

Agregar headers compatibles con la aplicación y Service Worker.

---

# 9. Observación adicional sobre health endpoint

## OBS-OPS-01 – Health continúa siendo público y bastante detallado

**Severidad: 🟡 MEDIA**

`GET /api/health` sigue disponible sin autenticación y expone información operacional como latencia de BD, backups, disco, operaciones observadas, conciliación Kardex y uptime.

### Recomendación

Separar:

```text
GET /api/health/live
```

para una respuesta pública mínima, y:

```text
GET /api/health/details
```

protegido para administradores o monitorización interna.

---

# 10. Priorización recomendada

## P0 – Antes de liberar versión final

1. Bloquear autoautorización de dispositivos por `OPERADOR_ALMACEN`.
2. Evitar que `VENDEDOR` reactive dispositivos deshabilitados.
3. Eliminar secretos predeterminados de Docker.
4. Eliminar fallback de `BACKUP_ENCRYPTION_KEY`.
5. Corregir carga móvil obsoleta cuando el servidor devuelve `null`.

## P1 – Alta prioridad

1. Mejorar idempotencia para reintentos tardíos.
2. Definir lógica real para `COBRO`, `DEVOLUCION`, `SOBRANTE` y `PEDIDO`.
3. Hacer que `no_verificable_en_cloud` degrade el health.
4. Agregar evidencia reproducible de restore.
5. Agregar Helmet y headers de seguridad.

## P2 – Calidad

1. Agregar lint real a CI.
2. Agregar dependencias directas ESLint/Prettier.
3. Agregar pruebas frontend.
4. Mejorar gestión de JWT.
5. Separar health público y health administrativo.

---

# 11. Nueva valoración técnica

| Componente | Estado actual |
|---|---|
| Arquitectura | 🟢 Buena |
| Backend | 🟢 Sólido |
| Base de datos | 🟢 Buena |
| Kárdex | 🟢 Muy buena base |
| RBAC general | 🟢 Mejorado |
| Protección IDOR | 🟢 Corregida |
| CI/CD | 🟢 Funcional |
| E2E | 🟢 134/134 |
| Docker bootstrap | 🟢 Corregido |
| PWA | 🟢 Implementada |
| IndexedDB | 🟢 Implementado |
| CORS | 🟢 Mejorado |
| Rate limiting | 🟢 Implementado |
| Dispositivos móviles | 🟡 Requiere cierre de casos de borde |
| Backups | 🟡 Cifrados, pero requiere clave segura obligatoria |
| Seguridad web | 🟡 Requiere hardening |
| Frontend QA | 🟡 Pendiente |
| Sincronización no-VENTA | 🟡 Requiere definición funcional |
| Preparación para producción | 🟡/🟢 Release Candidate |

---

# 12. Conclusión

La segunda revisión confirma que AgroControl Pro ha mejorado considerablemente respecto del estado anterior.

Los cambios más importantes ya implementados son:

```text
✓ protección anti-IDOR
✓ Device ID obligatorio
✓ eliminación de auto-registro DEV-AUTO
✓ rate limiting
✓ CORS allowlist
✓ CI con GitHub Actions
✓ 134 pruebas E2E exitosas
✓ bootstrap completo de PostgreSQL
✓ IndexedDB
✓ PWA con Workbox
✓ backups cifrados
✓ documentación actualizada
```

El sistema puede considerarse actualmente un **Release Candidate técnicamente avanzado**, pero todavía se recomienda cerrar los nuevos hallazgos críticos relacionados con autorización de terminales, secretos predeterminados y persistencia de cargas móviles obsoletas antes de etiquetar una versión final de producción `1.0.0`.

La prioridad inmediata debería ser:

```text
AUTORIZACIÓN DE DISPOSITIVOS
          +
GESTIÓN SEGURA DE SECRETOS
          +
CONSISTENCIA DE CARGA OFFLINE
          +
IDEMPOTENCIA
          +
QA FRONTEND
```

Una vez corregidos estos puntos y validada nuevamente la suite de CI, AgroControl Pro estaría mucho más cerca de una versión estable de producción.

---

**Fin del informe de revisión actualizada.**
