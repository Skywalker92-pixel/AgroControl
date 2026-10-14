# AgroControl Pro

Sistema de gestión de inventario, despacho y distribución en ruta para comercializadoras de insumos agrícolas, con módulo móvil *offline-first* para vendedores.

[![CI](https://github.com/Skywalker92-pixel/AgroControl/actions/workflows/ci.yml/badge.svg)](https://github.com/Skywalker92-pixel/AgroControl/actions/workflows/ci.yml)
![Versión](https://img.shields.io/badge/versión-1.0.0--rc1-blue.svg?style=flat-square)
![Estado](https://img.shields.io/badge/estado-release%20candidate-orange.svg?style=flat-square)

> **Estado:** `1.0.0-rc1` (Release Candidate). El sistema aún no ha completado la aceptación en un entorno productivo real.

---

## Qué incluye

**Consola administrativa (PC del local comercial)**

- **Catálogo:** productos con unidad base, presentaciones con factor de conversión (p. ej. unidad base `litro`, "Caja x12" = factor 12) y listas de precio. El stock se guarda siempre en unidad base; no se duplica inventario por presentación.
- **Inventario y Kárdex:** ingresos, salidas, ajustes y traslados entre almacenes y zonas. El Kárdex es *append-only*: un trigger de PostgreSQL (`trg_no_update_delete_kardex`) rechaza `UPDATE` y `DELETE` sobre `movimiento_kardex`; las correcciones se registran como movimientos compensatorios o ajustes.
- **Conciliación:** verificación de que `SUM(movimiento_kardex.cantidad_base) = stock_saldo.cantidad_fisica` por producto y ubicación (endpoint, reporte y consulta SQL en `database/queries_verificacion/`).
- **Pedidos y despacho:** proformas con estados `BORRADOR → RESERVADO → PREPARADO → DESPACHADO` (o `ANULADO`), reserva de stock y orden de despacho imprimible.
- **Distribución:** vehículos con bodega móvil, cargas por vendedor, liquidación al cierre de ruta y acta de liquidación.
- **Terminales móviles:** registro, autorización, revocación y activación/desactivación de dispositivos, con auditoría de cada cambio.
- **Operaciones observadas:** revisión y resolución por un administrador de ventas sincronizadas con inconsistencias (p. ej. faltante en bodega móvil).
- **Reportes** de stock, movimientos, despachos, rutas e incidencias, con exportación CSV.
- **Usuarios y auditoría:** gestión de usuarios y bitácora de eventos (usuario, acción, entidad, registro, fecha, IP, valor anterior/nuevo).

**Módulo móvil (PWA, `/movil`)**

- Instalable como PWA; *service worker* (Workbox) con precaché de la aplicación.
- Datos locales en **IndexedDB** (catálogo, clientes, carga activa, cola de operaciones pendientes, metadatos), con migración automática desde `localStorage` heredado.
- Una venta offline actualiza el stock local de la bodega móvil y encola la operación **en una única transacción IndexedDB**.
- Sincronización PULL/PUSH **idempotente**: cada operación lleva un UUID generado en el dispositivo; reenviarla (incluso de forma concurrente) no vuelve a afectar el Kárdex.
- Alta de clientes en ruta; las ventas posteriores conservan la relación con el cliente al sincronizar.

### Roles

| Rol | Alcance |
|---|---|
| `ADMINISTRADOR_PROPIETARIO` | Acceso completo, usuarios, dispositivos, resolución de operaciones observadas. |
| `ADMINISTRADOR_SECUNDARIO` | Gestión operativa y administrativa. |
| `OPERADOR_ALMACEN` | Inventario, movimientos y despacho; sin administración de usuarios ni dispositivos. |
| `VENDEDOR` | Módulo móvil y proformas propias; solo opera sobre su carga y sus propias proformas. |

La autorización se aplica en el **backend** (`JwtAuthGuard` + `RolesGuard` y reglas de propiedad en los servicios). Ocultar opciones en la interfaz es solo una ayuda de navegación.

---

## Arquitectura

```
 PC del local (navegador)            Vendedor (PWA /movil)
        │                                   │  IndexedDB + Service Worker
        └──────────────┬────────────────────┘
                       │ HTTPS · JSON · JWT
            ┌──────────▼──────────┐
            │  API NestJS (/api)  │  Helmet · CORS allowlist · rate limiting
            └──────────┬──────────┘
                       │ Prisma
            ┌──────────▼──────────┐
            │   PostgreSQL 15     │  Triggers de inmutabilidad del Kárdex
            └─────────────────────┘
```

| Capa | Tecnología |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS 3, Zustand, TanStack Query, `idb`, `vite-plugin-pwa` |
| Backend | NestJS 10, Node.js 24 LTS, Prisma 5, Passport JWT, Helmet, `@nestjs/throttler`, `class-validator` |
| Base de datos | PostgreSQL 15 (migraciones SQL en `database/migrations/`) |
| Infraestructura | Docker Compose (PostgreSQL, API, Nginx, servicio de backups) |

Valorización del Kárdex: **promedio ponderado** (existe una interfaz de estrategia para incorporar otros métodos; PEPS no está implementado).

---

## Entornos

| Entorno | Uso | Base de datos | Usuarios |
|---|---|---|---|
| `development` | `npm run start:dev` / `npm run dev` | PostgreSQL local o Docker | Seeds ficticios opcionales |
| `test` | CI y `npm run test:e2e` | PostgreSQL efímero | `001_seed_usuarios_demo.sql` (ficticio) |
| `production-local` | Docker Compose en la PC/servidor del local | Volumen Docker | Administrador inicial vía bootstrap |
| `production-cloud` | Vercel (frontend) + Render (API) + Supabase (PostgreSQL) | Supabase | Administrador inicial vía bootstrap |

Con `NODE_ENV=production` la API **no arranca** si `JWT_SECRET`, la contraseña de `DATABASE_URL` o `BACKUP_ENCRYPTION_KEY` contienen valores de ejemplo, si `JWT_SECRET` tiene menos de 32 caracteres o si `CORS_ORIGINS` está vacío o contiene `*`.

### Producción local (Docker Compose)

```bash
git clone https://github.com/Skywalker92-pixel/AgroControl.git
cd AgroControl
cp .env.example .env
# Edite .env: DB_PASSWORD, DATABASE_URL, JWT_SECRET, BACKUP_ENCRYPTION_KEY,
# CORS_ORIGINS (URL desde la que se abrirá la web), NODE_ENV=production
# e INITIAL_ADMIN_PASSWORD (solo para el primer arranque).
docker compose -f docker/docker-compose.yml --env-file .env up -d --build
```

En el primer arranque PostgreSQL aplica las migraciones, carga datos base (ubicación inicial, categorías, listas de precio) y crea el administrador propietario indicado en `INITIAL_ADMIN_*`. **No se crean cuentas de demostración** salvo que se defina `ENABLE_DEMO_SEED=true`. Después del primer arranque elimine `INITIAL_ADMIN_PASSWORD` del `.env`.

- Consola administrativa: `http://<host>:8080/login` (puerto `HOST_WEB_PORT`)
- Módulo móvil: `http://<host>:8080/movil/login`
- Health check: `http://<host>:8080/api/health`

### Producción en la nube (Vercel + Render + Supabase)

1. **Supabase:** en una base nueva ejecute `database/init_supabase_cloud.sql` (migraciones + datos base, sin usuarios). En una base existente aplique solo las migraciones nuevas (p. ej. `006_fase3_tipos_sync_y_kardex.sql`). Cree el administrador con `database/bootstrap/001_admin_inicial.sql`.
2. **Render (API):** *Build command* `npm ci --include=dev && npm run build`, *start command* `npm run start:prod`. Variables: `NODE_ENV=production`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGINS=https://<su-frontend>.vercel.app`, `TRUST_PROXY=1`, `BACKUPS_CLOUD_MANAGED=true`.
3. **Vercel (frontend):** raíz `frontend/`, variable `VITE_API_URL=https://<su-api>.onrender.com/api`.

Los secretos se configuran en cada plataforma; ningún archivo del repositorio debe contenerlos.

### Desarrollo local

```bash
# Backend (requiere PostgreSQL con migraciones y seeds aplicados)
cd backend && npm ci && npm run start:dev

# Frontend (proxy /api -> http://localhost:3000)
cd frontend && npm ci && npm run dev
```

Para mostrar accesos rápidos a las cuentas ficticias **solo en `npm run dev`**, defina en `frontend/.env.local`: `VITE_ENABLE_DEMO_ACCOUNTS=true` y `VITE_DEMO_PASSWORD=<contraseña del seed>`. Estos accesos no existen en `npm run build`.

---

## Datos de demostración

Los datos incluidos en seeds y ejemplos son ficticios y existen únicamente para pruebas y demostraciones. No representan clientes, trabajadores, vehículos ni operaciones reales.

| Archivo | Contenido | ¿Producción? |
|---|---|---|
| `database/seeds/000_seed_base.sql` | Ubicación inicial, categorías, listas de precio | Sí |
| `database/seeds/001_seed_usuarios_demo.sql` | Usuarios `demo.admin`, `demo.secundario`, `demo.almacen`, `demo.vendedor` con contraseña pública | **No** |
| `database/seeds/002_seed_demo_comercial.sql` | Catálogo, clientes, vehículo `DEM-001`, terminal `DEMO-001`, stock y una carga en ruta | **No** |

---

## Calidad y pruebas

```bash
cd backend
npm run lint        # ESLint, 0 warnings permitidos
npm run build
npm run test:e2e    # requiere PostgreSQL con migraciones y seeds 000 + 001

cd ../frontend
npm run typecheck
npm run build
```

La batería E2E (13 suites, 158 pruebas) cubre autenticación y RBAC, catálogo, Kárdex (incluido el rechazo de `UPDATE`/`DELETE`), traslados, despacho, distribución, sincronización e idempotencia, conflictos de sincronización, liquidación, reportes, health y aislamiento entre vendedores.

El pipeline de GitHub Actions (`.github/workflows/ci.yml`) ejecuta migraciones y seeds de prueba, `npm audit --omit=dev --audit-level=high` en backend y frontend, lint, build, E2E, typecheck y build de la PWA.

---

## Seguridad

- Kárdex *append-only* protegido mediante triggers de PostgreSQL.
- RBAC validado en el servidor; reglas de propiedad para el rol `VENDEDOR` (proformas, cargas, liquidaciones, sincronización).
- Terminales móviles autorizadas por un administrador; un dispositivo revocado o inactivo no puede sincronizar.
- Sincronización idempotente por UUID de operación.
- Helmet (CSP restrictiva en la API), CORS por *allowlist*, rate limiting en login y sincronización.
- Backups `pg_dump` comprimidos y cifrados con AES-256-CBC (OpenSSL, PBKDF2); la clave no se versiona y el script falla si no está configurada.
- `/api/health` público devuelve solo `status` y `timestamp`; el diagnóstico detallado (`/api/health/details`) requiere rol administrador.

Para reportar una vulnerabilidad consulte [`.github/SECURITY.md`](.github/SECURITY.md). Para contribuir, [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

## Licencia

El paquete está marcado como `UNLICENSED`. **La decisión de licenciamiento está pendiente del propietario del repositorio**; mientras tanto no se concede ninguna licencia de uso, copia o distribución.
