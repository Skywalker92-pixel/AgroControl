# AgroControl Pro

[![CI - AgroControl Quality & Deployment](https://github.com/Skywalker92-pixel/AgroControl/actions/workflows/ci.yml/badge.svg)](https://github.com/Skywalker92-pixel/AgroControl/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.0.0--rc1-blue.svg)](https://github.com/Skywalker92-pixel/AgroControl)
[![Status](https://img.shields.io/badge/status-Release%20Candidate%20(Preproducci%C3%B3n)-emerald.svg)](https://github.com/Skywalker92-pixel/AgroControl)
[![PWA](https://img.shields.io/badge/PWA-IndexedDB%20%2B%20Workbox-orange.svg)](https://github.com/Skywalker92-pixel/AgroControl)
[![License](https://img.shields.io/badge/license-Privado-lightgrey.svg)](https://github.com/Skywalker92-pixel/AgroControl)

**Sistema integral de gestión para distribuidoras agropecuarias**  
Control de inventario · Distribución en ruta · Sincronización offline · Auditoría completa

---

## Descripción

AgroControl Pro es un sistema de gestión diseñado para pequeñas y medianas distribuidoras agropecuarias que operan con personal de ventas y reparto en ruta. Permite controlar el inventario mediante Kárdex inmutable, gestionar cargas de distribución y liquidaciones, y sincronizar de forma bidireccional e idempotente las ventas realizadas en campo (sin cobertura celular) con la base de datos centrale.

El sistema consta de:
- **Aplicación administrativa en PC** (navegador web) — para el administrador, propietario y operadores de almacén.
- **Aplicación móvil offline-first (PWA)** — integrada en el cliente bajo `/movil`, instalable en terminales Android y navegadores móviles para vendedores en ruta.
- **API REST modular** (NestJS 10) — motor central de negocio con Rate Limiting, CORS estricto y RBAC.
- **Base de datos PostgreSQL 15** — fuente de verdad con Kárdex inmutable (triggers anti-tamper) y backups cifrados AES-256.

---

## Estado del Proyecto

**Estado:** Release Candidate (v1.0.0-rc1) - Preproducción  
**Versión:** 1.0.0-rc1  
**Fase:** Preproducción / Auditoría de Seguridad & Robustez Superada  
**Fecha de actualización:** Octubre 2026  
**Pipeline de CI:** [GitHub Actions Workflow](.github/workflows/ci.yml) (`ci.yml`) ejecutando validación automatizada de PostgreSQL 15, compilación cruzada y suite completa de pruebas E2E en cada push/PR a `main`.

---

## Hitos Completados

| Hito | Descripción | Estado |
|---|---|---|
| 01 | Estructura base del proyecto, Docker Compose y CI | ✅ Completado |
| 02 | Módulo de Catálogo (productos, unidades, categorías) | ✅ Completado |
| 03 | Módulo de Almacenes y Kárdex (inmutable, PEPS/PP) | ✅ Completado |
| 04 | Módulo de Inventario físico y conciliación | ✅ Completado |
| 05 | Módulo de Clientes y cuentas por cobrar | ✅ Completado |
| 06 | Módulo de Usuarios, roles y control de acceso | ✅ Completado |
| 07 | Módulo de Despacho (órdenes, salidas de almacén) | ✅ Completado |
| 08 | Módulo de Reportes (Kárdex, ventas, liquidaciones) | ✅ Completado |
| 09 | Módulo de Distribución (cargas, rutas y liquidaciones) | ✅ Completado |
| 10 | Auditoría, reportes de reparto y cierre de Fase 2 | ✅ Completado |
| 11 | Motor de sincronización idempotente (API) | ✅ Completado |
| 12 | Aplicativo móvil offline-first para vendedores (PWA) | ✅ Completado |
| 13 | Sincronización, conflictos y auditoría administrativa | ✅ Completado |
| 14 | Despliegue local, contingencia y cierre maestro | ✅ Completado |

---

## Arquitectura

```
D:\AgroControl\
├── .github/
│   └── workflows/
│       └── ci.yml           # Pipeline CI: PostgreSQL 15 + build + test E2E
├── backend/                 # API NestJS (Node.js 20)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/        # Autenticación JWT + Rate Limiting estricto (5 req/min)
│   │   │   ├── usuarios/    # Gestión de usuarios y control de acceso RBAC
│   │   │   ├── catalogo/    # Productos, unidades, categorías y precios
│   │   │   ├── almacenes/   # Almacenes, ubicaciones y stock físico
│   │   │   ├── kardex/      # Kárdex inmutable (triggers anti-tamper en BD)
│   │   │   ├── inventario/  # Tomas de inventario físico y conciliación
│   │   │   ├── clientes/    # Clientes y cuentas por cobrar
│   │   │   ├── despacho/    # Órdenes de despacho y salidas de almacén
│   │   │   ├── distribucion/# Cargas de distribución, liquidaciones y devoluciones
│   │   │   ├── reportes/    # Reportes comerciales, Kárdex y exportaciones CSV
│   │   │   ├── sincronizacion/ # Motor sync (Push/Pull) con Rate Limiting operativo (30 req/min)
│   │   │   ├── auditoria/   # Bitácora inmutable de auditoría del sistema
│   │   │   └── health/      # GET /api/health — monitoreo de BD, backups y cloud
│   │   └── core/
│   │       └── prisma/      # ORM Prisma y capa de persistencia transaccional
│   ├── prisma/
│   │   └── schema.prisma    # Modelo relacional completo
│   └── test/                # 11 suites completas de pruebas E2E (134 pruebas)
├── frontend/                # Cliente Web Unificado (PC + PWA Móvil) en React 18 + TS (Vite)
│   ├── public/              # Manifiesto PWA, iconos 192x192 / 512x512 y favicon
│   └── src/
│       ├── api/             # Capa de consumo API REST y sincronización
│       ├── components/      # Componentes UI de administración y módulo móvil
│       ├── pages/           # Vistas administrativas PC
│       │   └── movil/       # Módulo PWA Móvil Offline-First (/movil/*) para vendedores en ruta
│       ├── store/           # Zustand + mobileDb.ts (IndexedDB ACID con 'idb' para catálogo y cola)
│       └── types/           # Tipos de datos TypeScript compartidos
├── docker/
│   ├── docker-compose.yml   # Orquestación con auto-bootstrap en database/init
│   ├── Dockerfile.backend   # Imagen de producción backend
│   ├── Dockerfile.frontend  # Imagen de producción frontend con Nginx
│   ├── nginx/default.conf   # Configuración de proxy inverso
│   └── scripts/
│       ├── backup.sh        # Backup cifrado AES-256-CBC PBKDF2 (.sql.gz.enc)
│       ├── backup.bat       # Versión Windows de backup cifrado
│       ├── restore.sh       # Restauración con descifrado automático
│       └── restore.bat      # Versión Windows de restauración y descifrado
├── database/
│   ├── init/                # Scripts DDL y Seed (001 al 006) montados en docker-entrypoint-initdb.d
│   └── migrations/          # Migraciones SQL versionadas
├── backups/                 # Respaldos cifrados (excluido de git)
└── docs/                    # Documentación técnica, informe de auditoría y guías operativas
```

### Arquitectura Móvil Offline-First (PWA)

La aplicación móvil para vendedores en ruta está implementada como una **Progressive Web App (PWA) integrada en el cliente web bajo la ruta `/movil`**:
- **Shell Offline con Service Worker**: Configurado mediante `vite-plugin-pwa` y Workbox, con precaché de HTML, JavaScript, CSS e iconos para garantizar disponibilidad inmediata aun sin cobertura celular previa.
- **Persistencia Transaccional en IndexedDB**: Almacenamiento local mediante la librería `idb` organizado en object stores dedicados:
  * `catalogo`: Maestro de productos, categorías, presentaciones y listas de precios.
  * `clientes`: Directorio local de clientes sincronizados y clientes nuevos registrados en ruta.
  * `carga_activa`: Carga de distribución asignada al vendedor con stock dinámico de la bodega móvil.
  * `operaciones_pendientes_queue`: Cola transaccional de ventas locales pendientes de envío.
  * `metadata`: Identidad del terminal, device_id, device_code y timestamp de última sincronización.
- **Salvaguarda Atómica de Ventas**: Cada venta registrada en ruta ejecuta el descuento de stock de la bodega móvil y el encolado en `operaciones_pendientes_queue` dentro de una **única transacción readwrite ACID en IndexedDB**, garantizando que ninguna venta se pierda ni se corrompa el inventario local ante cierres inesperados de la aplicación.
- **Sincronización Idempotente**: Motor Push/Pull que opera en segundo plano cuando la conectividad se restablece, evitando duplicación mediante UUIDs generados en el dispositivo emisor.

---

## Integración Continua (CI)

El proyecto cuenta con un pipeline automatizado en **GitHub Actions** ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) configurado para ejecutarse en cada `push` o `pull_request` sobre la rama `main`:
1. **Contenedor PostgreSQL 15**: Inicialización de instancia limpia de base de datos con verificación de salud activa.
2. **Dependencias Determinísticas**: Ejecución de `npm ci` con caché en backend y frontend.
3. **Migraciones & Prisma**: Generación del cliente Prisma y aplicación secuencial de migraciones DDL.
4. **Compilación de Producción**: Verificación de compilación estricta en backend (`nest build`) y frontend (`vite build` con generación de Service Worker y manifiesto PWA).
5. **Suite Completa E2E**: Ejecución de las 11 suites de pruebas E2E del backend (`npm run test:e2e`), garantizando cero regresiones.

---

## Instalación Rápida

### Requisitos previos
- Windows 10/11 de 64 bits o Linux (Ubuntu 22.04+)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) con WSL2 o Docker Engine
- Git

### 1. Clonar el repositorio

```powershell
git clone https://github.com/Skywalker92-pixel/AgroControl.git D:\AgroControl
cd D:\AgroControl
```

### 2. Configurar variables de entorno

```powershell
Copy-Item .env.example .env
# Configurar contraseñas, secretos y clave de cifrado
notepad .env
```

### 3. Iniciar el sistema

```powershell
docker compose -f docker/docker-compose.yml --env-file .env up -d
```
> En la primera ejecución (instalación limpia), Docker ejecutará automáticamente las migraciones (`database/init/001_*.sql` a `005_*.sql`) y cargará los datos semilla iniciales (`006_seed_fase1.sql`).

### 4. Verificar estado

```powershell
# Ver contenedores activos
docker ps

# Verificar salud del sistema
curl http://localhost/api/health
```

Acceder a la aplicación web: **http://localhost**  
Acceder al módulo móvil en ruta: **http://localhost/movil**

---

## Monitoreo — `GET /api/health`

```json
{
  "status": "ok",
  "timestamp": "2026-10-01T04:30:00.000Z",
  "uptime_segundos": 86400,
  "base_datos": { "estado": "conectada", "latencia_ms": 3 },
  "backups": {
    "ultimo_backup": "2026-10-01T02:00:00.000Z",
    "horas_desde_ultimo": 2.5,
    "alerta": false,
    "archivos_encontrados": 14
  },
  "disco": { "libre_gb": 45, "total_gb": 240, "uso_porcentaje": 81, "alerta": false },
  "operaciones_observadas": { "total_pendientes": 0, "alerta": false },
  "conciliacion": { "estado": "ok", "detalle": "Sin discrepancias entre Kárdex y stock_saldo" }
}
```

> **Nota para entornos Cloud (Render/Supabase):** Si el backend se despliega en arquitecturas administradas donde el volumen de snapshots físicos no está montado localmente, el servicio reporta honestamente `backups.estado: "no_verificable_en_cloud"` delegando el respaldo a los snapshots automáticos de la infraestructura proveedora.

---

## Seguridad Endurecida

- **Secretos de Entorno**: Validación en arranque; falla de inicio si `JWT_SECRET` no cumple con la longitud mínima o no está configurado.
- **Rate Limiting**: `@nestjs/throttler` activo globalmente con límites estrictos de 5 req/min en login (`POST /api/auth/login`) y 30 req/min en sincronización (`POST /api/sync/push`).
- **CORS Allowlist**: Restricción estricta de dominios web permitidos vía `CORS_ORIGINS` y orígenes locales de desarrollo.
- **Protección contra IDOR en Sincronización**: Validación estricta que exige correspondencia entre el usuario autenticado en el token JWT, la carga en ruta y el dispositivo emisor antes de procesar operaciones.
- **Kárdex Inmutable**: Triggers a nivel de PostgreSQL que impiden operaciones `UPDATE` o `DELETE` sobre `movimiento_kardex`.
- **Cifrado de Backups**: Generación de respaldos simétricos con OpenSSL AES-256-CBC PBKDF2 (`.sql.gz.enc`).

---

## Pruebas Automatizadas

```powershell
cd backend

# Pruebas unitarias
npm run test

# Suite completa E2E (11 suites, 134 pruebas)
npm run test:e2e

# Cobertura
npm run test:cov
```

---

## Licencia

Uso privado — Proyecto desarrollado a medida para negocio agropecuario.  
© 2026 AgroControl Pro. Todos los derechos reservados.
