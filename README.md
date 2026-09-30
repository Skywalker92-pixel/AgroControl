# AgroControl Pro

**Sistema integral de gestión para distribuidoras agropecuarias**  
Control de inventario · Distribución en ruta · Sincronización offline · Auditoría completa

---

## Descripción

AgroControl Pro es un sistema de gestión diseñado para pequeñas distribuidoras agropecuarias que operan con vendedores en ruta. Permite controlar el inventario mediante Kárdex inmutable, gestionar repartos y liquidaciones, y sincronizar las ventas realizadas en campo (sin conexión) con la base de datos central.

El sistema consta de:
- **Aplicación administrativa en PC** (navegador web) — para el administrador/propietario
- **Aplicación móvil offline-first** (PWA para Android) — para vendedores en ruta
- **API REST** (NestJS) — motor central de negocio
- **Base de datos PostgreSQL** — única fuente de verdad con Kárdex inmutable

---

## Estado del Proyecto

**Versión:** 1.0.0  
**Fase:** Producción (todos los hitos completados)  
**Fecha de cierre:** Septiembre 2026

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
| 09 | Módulo de Distribución (repartos, hojas de ruta) | ✅ Completado |
| 10 | Auditoría, reportes de reparto y cierre de Fase 2 | ✅ Completado |
| 11 | Motor de sincronización idempotente (API) | ✅ Completado |
| 12 | Aplicativo móvil offline-first para vendedores | ✅ Completado |
| 13 | Sincronización, conflictos y auditoría administrativa | ✅ Completado |
| 14 | Despliegue local, contingencia y cierre maestro | ✅ Completado |

---

## Arquitectura

```
D:\AgroControl\
├── backend/                 # API NestJS (Node.js 20)
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/        # Autenticación JWT
│   │   │   ├── usuarios/    # Gestión de usuarios y roles
│   │   │   ├── catalogo/    # Productos, unidades, categorías
│   │   │   ├── almacenes/   # Almacenes y ubicaciones
│   │   │   ├── kardex/      # Kárdex inmutable (PEPS / Promedio Ponderado)
│   │   │   ├── inventario/  # Tomas de inventario físico
│   │   │   ├── clientes/    # Clientes y cuentas por cobrar
│   │   │   ├── despacho/    # Órdenes y salidas
│   │   │   ├── distribucion/# Repartos, liquidaciones y retornos
│   │   │   ├── reportes/    # Reportes y exportaciones CSV
│   │   │   ├── sincronizacion/ # Motor sync + resolución de conflictos
│   │   │   ├── auditoria/   # Log de auditoría del sistema
│   │   │   └── health/      # GET /api/health — monitoreo
│   │   └── core/
│   │       └── prisma/      # ORM y cliente de base de datos
│   └── prisma/
│       └── schema.prisma    # Modelo de datos completo
├── frontend/                # SPA React + TypeScript (Vite)
│   └── src/
│       ├── pages/           # Una página por módulo
│       ├── components/      # Componentes reutilizables
│       ├── api/services.ts  # Capa de acceso a la API
│       └── types/           # Tipos TypeScript compartidos
├── mobile/                  # PWA offline-first (React + Workbox)
│   └── src/
│       ├── stores/          # Estado local con IndexedDB
│       ├── pages/           # Pantallas del vendedor en ruta
│       └── sync/            # Motor de sincronización cliente
├── docker/
│   ├── docker-compose.yml   # Orquestación completa
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── nginx/default.conf
│   └── scripts/
│       ├── backup.sh        # Backup automático diario (pg_dump)
│       └── restore.bat      # Restauración en Windows
├── database/
│   └── migrations/          # Migraciones SQL versionadas
├── backups/                 # Respaldos automáticos (excluido de git)
└── docs/
    ├── manual_reinstalacion.md        # Manual para operadores
    ├── preguntas_validacion_cliente.md # Dossier para el Sr. Alipio
    ├── prueba_restauracion.md         # Registro de prueba de backup
    └── red_acceso_remoto.md           # Guía de red y acceso remoto
```

---

## Instalación Rápida

### Requisitos previos
- Windows 10/11 de 64 bits
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) con WSL2
- Git

### 1. Clonar el repositorio

```powershell
git clone https://github.com/<usuario>/agrocontrol.git D:\AgroControl
cd D:\AgroControl
```

### 2. Configurar variables de entorno

```powershell
Copy-Item .env.example .env
# Editar .env con las contraseñas del entorno
notepad .env
```

### 3. Iniciar el sistema

```powershell
docker compose -f docker/docker-compose.yml --env-file .env up -d
```

### 4. Verificar estado

```powershell
# Ver contenedores activos
docker ps

# Verificar salud del sistema
curl http://localhost/api/health
```

Acceder a la aplicación: **http://localhost**

> Para reinstalación completa o recuperación de datos, ver [`docs/manual_reinstalacion.md`](docs/manual_reinstalacion.md).

---

## Endpoints Principales

| Grupo | Base | Descripción |
|---|---|---|
| Salud | `GET /api/health` | Monitoreo del sistema (sin auth) |
| Auth | `POST /api/auth/login` | Inicio de sesión |
| Catálogo | `/api/catalogo/*` | Productos, unidades, categorías |
| Almacenes | `/api/almacenes/*` | Almacenes y stock |
| Kárdex | `/api/kardex/*` | Movimientos inmutables |
| Distribución | `/api/distribucion/*` | Repartos y liquidaciones |
| Sincronización | `/api/sincronizacion/*` | Motor offline ↔ central |
| Reportes | `/api/reportes/*` | Exportaciones CSV/JSON |

---

## Monitoreo — `GET /api/health`

```json
{
  "status": "ok",
  "timestamp": "2026-09-30T18:00:00.000Z",
  "uptime_segundos": 86400,
  "base_datos": { "estado": "conectada", "latencia_ms": 3 },
  "backups": { "ultimo_backup": "2026-09-30T02:00:00.000Z", "horas_desde_ultimo": 16, "alerta": false, "archivos_encontrados": 14 },
  "disco": { "libre_gb": 45, "total_gb": 240, "uso_porcentaje": 81, "alerta": false },
  "operaciones_observadas": { "total_pendientes": 0, "alerta": false },
  "conciliacion": { "estado": "ok", "detalle": "Sin discrepancias entre Kárdex y stock_saldo" }
}
```

**Estados posibles:** `ok` · `degradado` (backup atrasado u operaciones pendientes) · `critico` (BD desconectada, disco lleno o discrepancias en Kárdex)

---

## Seguridad

- Variables sensibles en `.env` (excluido de git)
- Autenticación JWT con expiración configurable (por defecto 8h)
- Roles: `ADMINISTRADOR`, `VENDEDOR`, `BODEGUERO`
- Kárdex inmutable: sin `UPDATE` ni `DELETE` sobre `movimiento_kardex`
- Usuario de BD con privilegios mínimos (sin `DELETE` en Kárdex)
- Backups cifrados para almacenamiento fuera del local

---

## Copias de Seguridad

El servicio `agrocontrol-backup` ejecuta `pg_dump` automáticamente todos los días a las 2:00 AM (configurable con `CRON_SCHEDULE` en `.env`).

- **Retención:** 14 días (configurable con `BACKUP_RETENTION_DAYS`)
- **Ubicación:** `D:\AgroControl\backups\`
- **Formato:** `agrocontrol_backup_YYYYMMDD_HHMMSS.sql.gz`
- **Alerta:** `/api/health` reporta `alerta: true` si el backup tiene más de 26 horas

Para restaurar: ver [`docs/manual_reinstalacion.md`](docs/manual_reinstalacion.md).  
Para verificar una restauración: ver [`docs/prueba_restauracion.md`](docs/prueba_restauracion.md).

---

## Variables de Entorno

Ver [``.env.example``](.env.example) para la lista completa. Variables principales:

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `DB_NAME` | Nombre de la base de datos | `agrocontrol_db` |
| `DB_USER` | Usuario de PostgreSQL | `agrocontrol_user` |
| `DB_PASSWORD` | Contraseña de PostgreSQL | *(cambiar en producción)* |
| `JWT_SECRET` | Clave secreta JWT | *(cambiar en producción)* |
| `JWT_EXPIRES_IN` | Expiración del token | `8h` |
| `CRON_SCHEDULE` | Horario de backup | `0 2 * * *` |
| `BACKUP_RETENTION_DAYS` | Días de retención | `14` |

---

## Pruebas

```powershell
cd backend

# Pruebas unitarias
npm run test

# Pruebas E2E (requiere base de datos de pruebas)
npm run test:e2e

# Cobertura
npm run test:cov
```

Las pruebas incluyen validación de invariantes del Kárdex, sincronización idempotente y resolución de conflictos.

---

## Licencia

Uso privado — Proyecto desarrollado a medida para negocio agropecuario.  
© 2026 AgroControl Pro. Todos los derechos reservados.
