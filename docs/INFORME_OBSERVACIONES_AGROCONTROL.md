# INFORME TÉCNICO DE OBSERVACIONES – AGROCONTROL PRO

**Repositorio analizado:** `Skywalker92-pixel/AgroControl`  
**Rama:** `main`  
**Fecha de revisión:** 30 de septiembre de 2026  
**Tipo de revisión:** Arquitectura, código, seguridad, base de datos, sincronización móvil, despliegue, pruebas, respaldos y documentación.

---

## 1. Resumen ejecutivo

AgroControl Pro presenta una arquitectura sólida para un sistema de gestión agropecuaria orientado a inventario, distribución, ventas en ruta, sincronización móvil y auditoría. El proyecto cuenta con un backend modular en NestJS, base de datos PostgreSQL administrada mediante Prisma, frontend en React + TypeScript, despliegue mediante Docker y una capa de sincronización para operaciones móviles.

La revisión muestra que el sistema tiene un nivel de implementación considerable y que varias decisiones técnicas son adecuadas, especialmente la separación por módulos, el uso de JWT y RBAC, la existencia de pruebas E2E, la estrategia de Kárdex inmutable y el uso de transacciones para operaciones críticas.

Sin embargo, también se encontraron observaciones que impiden considerar el sistema completamente endurecido para producción pública. Los principales riesgos están concentrados en la autorización de dispositivos móviles, validación de cargas durante la sincronización, uso de credenciales predeterminadas, instalación inicial, respaldo y recuperación, falta de CI verificable, diferencias entre la documentación y la implementación real de la funcionalidad offline, y algunas configuraciones de seguridad web.

---

## 2. Arquitectura observada

La estructura general del repositorio es:

```text
AgroControl/
├── backend/
│   ├── src/
│   │   ├── core/
│   │   └── modules/
│   │       ├── almacenes/
│   │       ├── auditoria/
│   │       ├── auth/
│   │       ├── catalogo/
│   │       ├── clientes/
│   │       ├── despacho/
│   │       ├── distribucion/
│   │       ├── health/
│   │       ├── inventario/
│   │       ├── kardex/
│   │       ├── reportes/
│   │       ├── sincronizacion/
│   │       └── usuarios/
│   ├── prisma/
│   └── test/
│
├── frontend/
│   └── src/
│       ├── api/
│       ├── components/
│       ├── pages/
│       │   └── movil/
│       ├── store/
│       └── types/
│
├── database/
│   ├── migrations/
│   ├── seeds/
│   ├── queries_verificacion/
│   └── init_supabase_cloud.sql
│
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── docker-compose.yml
│   └── scripts/
│
├── docs/
└── SKILL/
```

### Tecnologías principales

- Backend: NestJS 10 + Node.js 20.
- ORM: Prisma 5.
- Base de datos: PostgreSQL.
- Frontend: React 18 + TypeScript + Vite.
- Estado frontend: Zustand.
- Peticiones HTTP: Axios.
- UI: Tailwind CSS.
- Contenedores: Docker y Docker Compose.
- Autenticación: JWT + Passport.
- Hash de contraseñas: bcryptjs.
- Pruebas backend: Jest + Supertest.
- Despliegue web: preparado para Vercel.
- Backend cloud: preparado para Render.
- Base de datos cloud: preparada para Supabase.

---

## 3. Fortalezas identificadas

### 3.1 Arquitectura modular

El backend está organizado por dominios funcionales y no como un único módulo monolítico. Esta separación facilita mantenimiento, pruebas, escalabilidad del código y asignación de responsabilidades.

### 3.2 Kárdex inmutable

Una de las decisiones técnicas más importantes es la implementación de un Kárdex append-only.

La migración crea un trigger en PostgreSQL que impide realizar `UPDATE` o `DELETE` sobre `movimiento_kardex`.

Esto protege la trazabilidad del inventario incluso si una capa superior de la aplicación intenta modificar movimientos históricos.

### 3.3 Uso de transacciones

Las operaciones críticas, especialmente aquellas que afectan Kárdex y stock durante sincronización, utilizan transacciones de Prisma.

Esto reduce el riesgo de dejar datos parcialmente procesados cuando ocurre un error.

### 3.4 Sincronización idempotente

Las operaciones móviles utilizan UUID generados por el cliente.

El backend consulta si una operación ya fue procesada antes de ejecutarla nuevamente, lo que evita duplicar ventas o movimientos durante reintentos de sincronización.

### 3.5 Separación de timestamps

El sistema diferencia entre:

- `fecha_operacion`: momento real de la operación.
- `fecha_registro`: momento en que el servidor recibió o persistió la operación.

Esta separación es apropiada en sistemas offline-first.

### 3.6 Auditoría

El sistema almacena eventos de autenticación y otras acciones relevantes en una tabla de auditoría.

Existe seguimiento de:

- usuario;
- acción;
- IP;
- entidad;
- valor anterior;
- valor nuevo;
- fecha.

### 3.7 Pruebas E2E

Se encontraron pruebas para:

- autenticación;
- catálogo;
- Kárdex;
- despacho;
- distribución;
- liquidaciones;
- reportes;
- sincronización;
- conflictos;
- traslados.

La existencia de estas pruebas es un punto positivo del proyecto.

---

# 4. Observaciones de seguridad

## OBS-SEC-01 – Credenciales predeterminadas visibles

**Severidad: CRÍTICA**

En `.env.example`, Docker y parte del backend existen valores predeterminados como:

```text
DB_PASSWORD=agrocontrol_secret_pass_2026
JWT_SECRET=super_seguro_jwt_secret_agrocontrol_2026_pro_token
```

Además, el seed contiene usuarios conocidos y una contraseña inicial común.

### Riesgo

Si estos valores llegan a utilizarse sin ser reemplazados en producción, un atacante que revise el repositorio puede conocer:

- clave JWT;
- contraseña de PostgreSQL;
- nombres de usuarios iniciales;
- contraseña inicial.

### Recomendación

- No usar secretos predeterminados en producción.
- Hacer que el backend falle al iniciar si `JWT_SECRET` no está configurado.
- Eliminar fallbacks inseguros.
- Rotar las claves de cualquier despliegue ya existente.
- Obligar a cambiar contraseñas iniciales.

---

## OBS-SEC-02 – Vendedores pueden registrar o autorizar dispositivos

**Severidad: CRÍTICA**

El endpoint de registro de dispositivos permite el rol `VENDEDOR`.

El DTO también permite enviar:

```text
trabajador_id
activo
autorizado
```

### Riesgo

Un vendedor podría intentar:

- registrar un nuevo dispositivo;
- indicar otro trabajador;
- marcar un dispositivo como autorizado;
- modificar el estado de autorización de un dispositivo existente.

Esto rompe la separación entre quien solicita acceso y quien lo autoriza.

### Recomendación

Implementar un flujo:

```text
VENDEDOR
   ↓
Solicita vinculación
   ↓
PENDIENTE
   ↓
ADMINISTRADOR
   ↓
AUTORIZA
```

El frontend móvil nunca debería decidir `autorizado=true`.

---

## OBS-SEC-03 – El guard de dispositivo puede omitirse

**Severidad: CRÍTICA**

El guard permite continuar cuando no se envía identificador de dispositivo.

Además, el backend puede auto-crear un dispositivo con:

```text
activo = true
autorizado = true
```

### Riesgo

El control de terminales autorizados puede ser eludido.

### Recomendación

- Hacer obligatorio `X-Device-Id` en los endpoints móviles.
- Eliminar el auto-registro en sincronización.
- Verificar que el dispositivo:
  - exista;
  - esté activo;
  - esté autorizado;
  - pertenezca al usuario autenticado.

---

## OBS-SEC-04 – Falta validación de propiedad de la carga en PUSH

**Severidad: CRÍTICA**

Durante una venta sincronizada, el backend comprueba que una carga exista y esté `EN_RUTA`.

No se observó una validación explícita equivalente a:

```typescript
carga.trabajador_id === usuarioId
```

### Riesgo

Un vendedor podría intentar enviar el identificador de una carga perteneciente a otro trabajador.

Este comportamiento es equivalente a un riesgo de autorización horizontal o IDOR.

### Recomendación

Antes de procesar una operación:

```text
1. Obtener carga.
2. Verificar que exista.
3. Verificar que esté EN_RUTA.
4. Verificar carga.trabajador_id == JWT.sub.
5. Verificar dispositivo.trabajador_id == JWT.sub.
6. Procesar operación.
```

---

## OBS-SEC-05 – CORS demasiado permisivo

**Severidad: MEDIA**

El backend utiliza:

```typescript
origin: true
credentials: true
```

### Riesgo

Permite solicitudes desde orígenes no restringidos.

### Recomendación

Usar una allowlist:

```text
https://agrocontrol.midominio.com
http://localhost:5173
```

y diferentes configuraciones según entorno.

---

## OBS-SEC-06 – Ausencia de rate limiting

**Severidad: ALTA**

No se encontró implementación evidente de:

- `@nestjs/throttler`;
- rate limiting;
- bloqueo temporal de login;
- protección contra brute force.

### Riesgo

Un atacante puede realizar muchos intentos consecutivos de autenticación.

### Recomendación

Aplicar rate limiting especialmente en:

```text
POST /api/auth/login
POST /api/sync/push
```

---

## OBS-SEC-07 – JWT guardado en localStorage

**Severidad: MEDIA**

El frontend guarda el JWT en:

```text
localStorage
```

### Riesgo

Si la aplicación presenta una vulnerabilidad XSS, el token puede ser leído por JavaScript malicioso.

### Recomendación

Evaluar:

- cookies `HttpOnly`;
- `Secure`;
- `SameSite`;
- CSP;
- reducción del tiempo de vida del token.

---

## OBS-SEC-08 – Endpoint de usuarios demasiado accesible

**Severidad: MEDIA**

`GET /usuarios` requiere autenticación pero no restringe el rol.

### Riesgo

Un vendedor podría consultar información de otros usuarios:

- username;
- nombre;
- correo;
- rol;
- estado.

### Recomendación

Restringir el endpoint a administradores u operadores que realmente lo necesiten.

Si el frontend solo requiere una lista de vendedores para asignación, crear un endpoint específico con información mínima.

---

# 5. Observaciones de aplicación móvil y modo offline

## OBS-MOB-01 – El README describe una PWA diferente a la implementación real

**Severidad: ALTA**

El README declara una estructura:

```text
mobile/
React + Workbox
IndexedDB
```

Pero la implementación móvil real está integrada en:

```text
frontend/src/pages/movil/
frontend/src/components/movil/
frontend/src/store/mobileStore.ts
```

### Observación

No se encontraron implementaciones reales de:

- Workbox;
- service worker;
- IndexedDB;
- carpeta independiente `mobile/`.

### Conclusión

Actualmente el sistema se parece más a:

> Aplicación web móvil con persistencia local y cola de sincronización.

No a una PWA offline-first completa.

---

## OBS-MOB-02 – Uso de localStorage para datos operativos

**Severidad: ALTA**

La cola offline, productos, clientes y carga activa se almacenan en `localStorage`.

### Riesgos

- capacidad limitada;
- operaciones síncronas;
- menor robustez para grandes catálogos;
- mayor riesgo de pérdida o corrupción;
- peor comportamiento con datos complejos;
- no es la opción ideal para una cola transaccional.

### Recomendación

Migrar a IndexedDB mediante:

- Dexie.js;
- idb;
- implementación IndexedDB nativa.

---

## OBS-MOB-03 – Falta Service Worker

**Severidad: ALTA**

No se encontró un Service Worker que cachee:

- HTML;
- JS;
- CSS;
- iconos;
- shell de la aplicación.

### Riesgo

Si el usuario pierde la conexión antes de cargar la aplicación, puede no ser capaz de abrirla.

### Recomendación

Implementar:

```text
vite-plugin-pwa
o
Workbox
```

junto con una estrategia de cache apropiada.

---

# 6. Observaciones de base de datos

## OBS-DB-01 – Buena protección del Kárdex

**Severidad: POSITIVA**

El Kárdex tiene protección de inmutabilidad mediante trigger.

Se recomienda conservar esta decisión.

---

## OBS-DB-02 – Separación correcta entre movimientos y saldo

**Severidad: POSITIVA**

Existe:

```text
movimiento_kardex
stock_saldo
```

El sistema usa el Kárdex como registro histórico y `stock_saldo` como representación actual.

Es una buena práctica siempre que exista conciliación periódica.

---

## OBS-DB-03 – Conciliación de Kárdex incluida

**Severidad: POSITIVA**

Existe lógica para comparar:

```text
SUM(movimiento_kardex.cantidad_base)
vs
stock_saldo.cantidad_fisica
```

Esto permite detectar diferencias.

---

# 7. Observaciones de instalación y Docker

## OBS-DEP-01 – Fresh install no ejecuta seeds

**Severidad: ALTA**

Docker monta:

```text
database/migrations/
```

en:

```text
/docker-entrypoint-initdb.d
```

pero el seed se encuentra en:

```text
database/seeds/001_seed_fase1.sql
```

### Riesgo

Una instalación completamente nueva puede crear:

```text
BD       OK
tablas   OK
API      OK
frontend OK
usuarios NO
```

y el administrador no podrá iniciar sesión.

### Recomendación

Crear una estrategia clara de bootstrap.

Por ejemplo:

```text
database/init/
001_schema.sql
002_distribucion.sql
003_sync.sql
900_seed_initial_admin.sql
```

o ejecutar explícitamente el seed mediante un comando de inicialización.

---

## OBS-DEP-02 – Diferenciar instalación nueva y restauración

**Severidad: MEDIA**

Los documentos mezclan parcialmente dos situaciones diferentes:

1. nueva instalación;
2. restauración desde backup.

### Recomendación

Crear:

```text
docs/INSTALACION_NUEVA.md
docs/RECUPERACION_DESDE_BACKUP.md
```

---

## OBS-DEP-03 – Docker backend ejecuta usuario sin privilegios

**Severidad: POSITIVA**

El contenedor backend utiliza un usuario no-root.

Es una buena práctica y debe mantenerse.

---

# 8. Observaciones de respaldos y recuperación

## OBS-BKP-01 – Backup comprimido, no cifrado

**Severidad: ALTA**

El script hace:

```bash
pg_dump | gzip
```

### Observación

`gzip` comprime datos pero no los cifra.

Sin embargo, la documentación afirma que los backups externos están cifrados.

### Riesgo

Si se roba:

```text
agrocontrol_backup_YYYYMMDD.sql.gz
```

el contenido puede ser descomprimido sin contraseña.

### Recomendación

Aplicar cifrado real:

```text
pg_dump → gzip → age/gpg → archivo cifrado
```

---

## OBS-BKP-02 – Health check de cloud asume backup correcto

**Severidad: ALTA**

El health check considera los backups correctos cuando:

```text
DATABASE_URL contiene supabase
o
RENDER=true
```

y devuelve una fecha actual simulada.

### Riesgo

Puede mostrar:

```text
backup OK
```

sin haber consultado realmente el estado del proveedor.

### Recomendación

Consultar:

- API del proveedor;
- snapshot real;
- fecha real del último backup.

Si no es posible verificarlo, indicar:

```text
estado: desconocido
```

en lugar de `ok`.

---

## OBS-BKP-03 – Documento de restauración no demuestra una prueba ejecutada

**Severidad: ALTA**

`docs/prueba_restauracion.md` contiene campos en blanco:

```text
Resultado obtenido: ________
Duración: ________
Hash SHA-256: ________
```

### Observación

El documento funciona como plantilla, no como evidencia de una restauración ejecutada.

### Recomendación

Realizar una restauración real y registrar:

- fecha;
- backup utilizado;
- SHA-256;
- tamaño;
- duración;
- cantidad de registros;
- prueba de login;
- conciliación Kárdex;
- RTO.

---

## OBS-BKP-04 – Consultas del documento de restauración están desactualizadas

**Severidad: ALTA**

El documento hace referencia a conceptos como:

```text
reparto
venta_repartidor
almacen_id
cantidad_movimiento
```

que no coinciden completamente con el esquema actual.

### Recomendación

Actualizar las consultas al esquema real:

```text
carga_distribucion
operacion_sincronizada
ubicacion_id
cantidad_base
```

---

# 9. Observaciones sobre pruebas y calidad

## OBS-QA-01 – Existe una suite E2E importante

**Severidad: POSITIVA**

El proyecto cuenta con pruebas E2E para buena parte del negocio.

Esto es un activo importante del sistema.

---

## OBS-QA-02 – No existe GitHub Actions

**Severidad: ALTA**

No se encontró:

```text
.github/workflows/
```

### Riesgo

El repositorio puede recibir un commit que:

- no compile;
- rompa pruebas;
- introduzca errores;
- falle en Prisma.

sin ser detectado automáticamente.

### Recomendación

Crear:

```text
.github/workflows/ci.yml
```

con:

```text
npm ci
npm run build
npm run test
npm run test:e2e
npm run lint
```

---

## OBS-QA-03 – No se puede certificar el número de pruebas exitosas

**Severidad: MEDIA**

El README menciona una suite de pruebas, pero sin un pipeline CI no existe evidencia automática por commit de que todas estén pasando.

### Recomendación

Agregar badge de CI:

```text
Build: passing
Tests: passing
```

solo si GitHub Actions lo confirma.

---

## OBS-QA-04 – Scripts de lint y format sin dependencias evidentes

**Severidad: MEDIA**

`backend/package.json` contiene:

```text
npm run lint
npm run format
```

pero no se observaron `eslint` y `prettier` entre las dependencias revisadas.

### Riesgo

Los scripts podrían fallar en una instalación limpia.

### Recomendación

Agregar y configurar explícitamente:

```text
eslint
@typescript-eslint/*
prettier
eslint-config-prettier
```

---

## OBS-QA-05 – Frontend sin pruebas automáticas

**Severidad: MEDIA**

El frontend no incluye scripts claros de:

```text
test
test:e2e
lint
```

### Recomendación

Agregar:

- Vitest;
- React Testing Library;
- Playwright o Cypress.

---

# 10. Observaciones de documentación

## OBS-DOC-01 – README no representa exactamente el repositorio

**Severidad: MEDIA**

El README describe:

```text
mobile/
Workbox
IndexedDB
```

pero la estructura real es diferente.

### Recomendación

Actualizar el README para que represente el código actual.

---

## OBS-DOC-02 – Estado “Producción” demasiado optimista

**Severidad: ALTA**

El README declara:

```text
Fase: Producción
Todos los hitos completados
```

pero todavía existen observaciones de:

- autorización;
- CI;
- backups;
- PWA;
- hardening;
- instalación inicial.

### Recomendación

Utilizar un estado más preciso:

```text
Release Candidate / Preproducción
```

hasta cerrar los riesgos críticos y altos.

---

# 11. Priorización recomendada

## Prioridad P0 – Antes de producción

Corregir inmediatamente:

1. secretos y contraseñas predeterminados;
2. autorización de dispositivos;
3. auto-registro automático de terminales;
4. validación de carga perteneciente al vendedor;
5. rotación de credenciales existentes.

---

## Prioridad P1 – Alta

Corregir:

1. Docker fresh install;
2. cifrado real de backups;
3. health check de backup;
4. prueba de restauración;
5. CI/CD;
6. rate limiting;
7. CORS.

---

## Prioridad P2 – Media

Mejorar:

1. IndexedDB;
2. Service Worker;
3. Workbox;
4. frontend testing;
5. control de acceso a `/usuarios`;
6. almacenamiento del JWT;
7. documentación.

---

# 12. Propuesta de arquitectura móvil mejorada

```text
┌──────────────────────────────┐
│        Aplicación móvil      │
│ React + PWA                  │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│        IndexedDB             │
│                              │
│ catálogo                     │
│ clientes                     │
│ carga activa                 │
│ ventas                       │
│ cola de sincronización       │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│      Sync Manager            │
│                              │
│ retry                        │
│ idempotencia                 │
│ timestamps                   │
│ estados                      │
└──────────────┬───────────────┘
               │ HTTPS
               ▼
┌──────────────────────────────┐
│       API NestJS             │
│ JWT + Device Guard + RBAC    │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│      PostgreSQL              │
│                              │
│ Kárdex                       │
│ stock                        │
│ operaciones sync             │
│ auditoría                    │
└──────────────────────────────┘
```

---

# 13. Flujo recomendado de autorización de terminal

```text
VENDEDOR
   │
   │ solicita vinculación
   ▼
DISPOSITIVO PENDIENTE
   │
   │ revisión
   ▼
ADMINISTRADOR
   │
   ├── RECHAZAR
   │
   └── AUTORIZAR
          │
          ▼
DISPOSITIVO AUTORIZADO
          │
          ▼
LOGIN
          │
          ▼
JWT + DEVICE ID
          │
          ▼
SYNC
```

El vendedor no debe ser capaz de cambiar directamente:

```text
activo
autorizado
trabajador_id
```

de un dispositivo existente.

---

# 14. Flujo seguro para sincronización de venta

```text
POST /api/sync/push
        │
        ▼
JWT válido
        │
        ▼
usuario activo
        │
        ▼
Device ID obligatorio
        │
        ▼
dispositivo activo
        │
        ▼
dispositivo autorizado
        │
        ▼
dispositivo.trabajador_id == usuario.id
        │
        ▼
obtener carga
        │
        ▼
carga.estado == EN_RUTA
        │
        ▼
carga.trabajador_id == usuario.id
        │
        ▼
validar stock
        │
        ▼
transacción BD
        │
   ┌────┴────────┐
   ▼             ▼
operacion     Kárdex
sync
   │             │
   └────┬────────┘
        ▼
actualizar stock
        │
        ▼
RESPUESTA
```

---

# 15. Roadmap técnico propuesto

## Etapa 1 – Seguridad

- eliminar fallbacks inseguros;
- rotar secretos;
- implementar rate limiting;
- restringir CORS;
- corregir RBAC de dispositivos;
- corregir autorización horizontal.

## Etapa 2 – Calidad

- GitHub Actions;
- lint;
- pruebas unitarias;
- pruebas frontend;
- análisis estático;
- cobertura mínima.

## Etapa 3 – Móvil

- IndexedDB;
- Workbox;
- Service Worker;
- manifest PWA;
- cache offline;
- actualización segura de versiones.

## Etapa 4 – Operaciones

- backup cifrado;
- copia externa;
- restauración mensual;
- métricas de RTO/RPO;
- monitoreo verdadero.

## Etapa 5 – Observabilidad

- logs estructurados;
- correlación de requests;
- métricas;
- alertas;
- panel operativo.

---

# 16. Conclusiones

AgroControl Pro posee una base técnica considerable y una arquitectura funcional para inventario, distribución y ventas en ruta. El sistema ha superado claramente la etapa de simple prototipo.

Las mejores decisiones observadas son:

- backend modular;
- Kárdex inmutable;
- uso de PostgreSQL;
- transacciones;
- idempotencia;
- auditoría;
- separación de timestamps;
- pruebas E2E;
- contenedores Docker.

Sin embargo, la prioridad del proyecto ya no debería ser únicamente agregar nuevas funcionalidades.

La siguiente etapa debe concentrarse en:

```text
SEGURIDAD
    +
CALIDAD
    +
RECUPERACIÓN
    +
OBSERVABILIDAD
    +
CONSISTENCIA DOCUMENTAL
```

Antes de considerar el sistema listo para una producción pública estable se recomienda cerrar todos los hallazgos críticos y altos indicados en este informe.

---

# 17. Estado resumido

| Componente | Estado |
|---|---|
| Arquitectura | 🟢 Buena |
| Backend | 🟢 Desarrollado |
| Base de datos | 🟢 Buena |
| Kárdex | 🟢 Muy buena base |
| Frontend | 🟢 Funcional |
| Aplicación móvil | 🟡 Requiere mejorar offline/PWA |
| Sincronización | 🟡 Buena base con riesgos críticos |
| Seguridad | 🔴 Requiere correcciones |
| Docker | 🟡 Requiere mejorar bootstrap |
| Backups | 🟡 Implementados pero no completamente verificados |
| CI/CD | 🔴 Pendiente |
| QA | 🟡 Backend avanzado, frontend limitado |
| Documentación | 🟡 Amplia pero inconsistente |
| Preparación para producción | 🟡 Preproducción / Release Candidate recomendado |

---

**Fin del informe.**
