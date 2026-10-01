# AgroControl Pro™
### *Plataforma Inteligente de Gestión Comercial, Logística en Ruta y Control de Inventarios para el Sector Agropecuario*

[![CI/CD Pipeline](https://github.com/Skywalker92-pixel/AgroControl/actions/workflows/ci.yml/badge.svg)](https://github.com/Skywalker92-pixel/AgroControl/actions/workflows/ci.yml)
[![Version](https://img.shields.io/badge/version-1.0.0--rc1-blue.svg?style=flat-square)](https://github.com/Skywalker92-pixel/AgroControl)
[![Architecture](https://img.shields.io/badge/architecture-Offline--First%20PWA%20%2B%20Modular%20API-emerald.svg?style=flat-square)](https://github.com/Skywalker92-pixel/AgroControl)
[![Security](https://img.shields.io/badge/security-K%C3%A1rdex%20Inmutable%20%7C%20RBAC%20%7C%20AES--256-orange.svg?style=flat-square)](https://github.com/Skywalker92-pixel/AgroControl)
[![PostgreSQL](https://img.shields.io/badge/database-PostgreSQL%2015-336791.svg?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![NestJS](https://img.shields.io/badge/backend-NestJS%2010-ea2845.svg?style=flat-square&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![React](https://img.shields.io/badge/frontend-React%2018%20%2B%20Vite-61dafb.svg?style=flat-square&logo=react&logoColor=black)](https://react.dev/)

---

## 🌟 La Solución Definitiva para la Distribución Agropecuaria

Las distribuidoras y comercializadoras de insumos agrícolas (fertilizantes, fitosanitarios, semillas y herramientas) enfrentan un desafío crítico: **sus vendedores y camiones de reparto operan en valles, fundos y zonas rurales con escasa o nula conectividad a internet**.

Los métodos tradicionales con libretas de papel, hojas de cálculo desfasadas o sistemas dependientes de internet causan:
- **Pérdidas de inventario y mermas no justificadas** en los vehículos de reparto.
- **Descuadres en las liquidaciones** entre el stock cargado, lo vendido y el dinero recaudado.
- **Retrasos de días** en facturación, cobranza y actualización del Kárdex.
- **Vulnerabilidad a fraudes o duplicidad de transacciones** al consolidar información manual.

**AgroControl Pro™** transforma esta realidad mediante una plataforma integral con tecnología **Offline-First de grado empresarial**. Su equipo de campo vende, cobra y emite comprobantes sin interrupciones en el punto más remoto; y al detectar señal, el motor de sincronización inteligente concilia inventario, tesorería y Kárdex de forma atómica, segura e instantánea.

---

## 🚀 Innovaciones y Capacidades Clave

```
                               ┌────────────────────────────────────────────────────────┐
                               │                 AGROCONTROL PRO ECOSYSTEM              │
                               └───────────────────────────┬────────────────────────────┘
                                                           │
                      ┌────────────────────────────────────┴────────────────────────────────────┐
                      ▼                                                                         ▼
   ┌─────────────────────────────────────────┐                               ┌─────────────────────────────────────────┐
   │       SEDE CENTRAL / ALMACÉN (PC)       │                               │       FUERZA DE VENTAS EN RUTA (MÓVIL)  │
   ├─────────────────────────────────────────┤                               ├─────────────────────────────────────────┤
   │ • Control Maestro de Inventario         │                               │ • Aplicación PWA Offline-First          │
   │ • Kárdex Inmutable (PEPS/Promedio)      │                               │ • Catálogo con listas de precios        │
   │ • Despacho y Armado de Cargas           │       SINCRONIZACIÓN          │ • Venta atómica sobre Bodega Móvil      │
   │ • Liquidación Inteligente de Rutas      │◄═════════════════════════════►│ • Cobranzas multimetodo (Yape, Plin, etc)│
   │ • Autorización de Terminales            │      BIDIRECCIONAL PUSH/PULL  │ • Registro rápido de nuevos clientes    │
   │ • Auditoría y Detección de Faltantes    │    (Idempotente con UUIDs)    │ • Cola local transaccional (IndexedDB)  │
   └─────────────────────────────────────────┘                               └─────────────────────────────────────────┘
```

### 1. 📱 Terminal Móvil de Ventas Offline-First (PWA)
- **Operación Continua sin Conectividad:** Funciona como aplicación nativa instalable en smartphones y tablets Android mediante Service Workers y precaché Workbox.
- **Persistencia Transaccional con IndexedDB (ACID):** Cada venta descuenta inmediatamente el stock de la *Bodega Móvil* local y se resguarda en una cola transaccional inmutable antes de cualquier envío de red.
- **Motor de Sincronización Idempotente (Push/Pull):** Reintentos automáticos seguros que garantizan que una venta jamás se procese dos veces en el Kárdex, incluso ante desconexiones repentinas o aperturas tardías.
- **Venta y Cobranza Ágil en Ruta:** Registro de pedidos por unidad base o presentación comercial (cajas, bidones, sacos), con múltiples formas de pago: Efectivo, Transferencia, Yape, Plin y Crédito.
- **Alta Express de Clientes en Campo:** Registro rápido de clientes nuevos en ruta con validación inmediata de RUC o DNI.

### 2. 🛡️ Control de Inventario y Kárdex Inmutable de Grado Financiero
- **Protección Anti-Tamper a Nivel de Base de Datos:** Triggers nativos en PostgreSQL bloquean cualquier intento de edición o eliminación directa sobre la tabla histórica de movimientos de Kárdex.
- **Soporte Multialmacén y Bodegas Móviles:** Cada vehículo de distribución es modelado como un almacén móvil con stock en tiempo real.
- **Conciliación Matemática Continua:** Algoritmo automatizado que verifica en milisegundos que la sumatoria histórica del Kárdex coincida al 100.000% con los saldos físicos en almacén.
- **Valorización Flexible:** Soporte para costeo Promedio Ponderado y PEPS (Primeras Entradas, Primeras Salidas).

### 3. 🚚 Logística de Despacho y Liquidación sin Fricciones
- **Armado de Cargas con Bloqueo Pesimista:** Impide que dos operadores reserven o despachen el mismo lote de productos simultáneamente.
- **Liquidación Automática de Rutas:** Al retornar el vehículo, el sistema cuadra en segundos:
  - Total de productos despachados
  - Unidades vendidas en campo
  - Saldos devueltos al almacén
  - Dinero en efectivo y comprobantes digitales recaudados
  - Registro de diferencias y observaciones para auditoría gerencial

### 4. 🔒 Seguridad Corporativa y Control de Dispositivos (Zero Trust)
- **Emparejamiento Estricto de Terminales (Hardware Binding):** Solo los dispositivos autorizados mediante su identificador único (`X-Device-Id`) pueden sincronizar ventas.
- **Control de Acceso Basado en Roles (RBAC):**
  - **Administrador Propietario:** Acceso total, auditoría financiera, resolución de discrepancias y gobernanza del sistema.
  - **Administrador Secundario:** Gestión operativa, despacho, catálogos y supervisión de rutas.
  - **Operador de Almacén:** Preparación de pedidos, ingresos de mercadería, traslados y tomas de inventario.
  - **Vendedor:** Terminal móvil restringido exclusivamente a su propia carga y ruta asignada.
- **Hardening Web:** Cabeceras HTTP seguras mediante **Helmet**, rate limiting contra ataques de fuerza bruta (`@nestjs/throttler`) y aislamiento horizontal estricto (anti-IDOR).
- **Copias de Seguridad Cifradas:** Backups programados comprimidos y protegidos con cifrado simétrico militar **AES-256-CBC con PBKDF2**.

---

## 📊 Módulos del Sistema

| Módulo | Funcionalidades Principales | Perfiles de Usuario |
|---|---|---|
| **Catálogo y Tarifarios** | Maestro de productos fitosanitarios, semillas y fertilizantes. Presentaciones con factores de conversión. Listas de precios personalizadas por cliente. | Administrador, Operador |
| **Almacenes y Kárdex** | Gestión de almacenes físicos, zonas de cuarentena y bodegas móviles. Kardex perpetuo inalterable. | Administrador, Operador |
| **Despacho y Cargas** | Orden de carga por vehículo, verificación de cubicaje/peso, salida de almacén con doble asiento contable. | Operador, Administrador |
| **Venta en Campo (Móvil)** | Catálogo offline, selección de clientes, venta táctil en 2 toques, cálculo de vuelto, cobranza digital. | Vendedor en Ruta |
| **Liquidación y Cuadre** | Conciliación de dinero vs. mercadería al cierre de jornada. Emisión de acta de liquidación. | Administrador, Operador |
| **Auditoría y Resolución** | Panel de operaciones observadas (faltantes físicos en ruta). Registro inmutable de eventos con IP y usuario. | Administrador Propietario |
| **Reportes Gerenciales** | Exportación de reportes de ventas por ruta, rotación de productos, saldos y cobranzas en formatos CSV y Excel. | Gerencia, Administrador |
| **Salud y Observabilidad** | Endpoint `/api/health` para monitor de infraestructura y `/api/health/details` con diagnóstico operacional protegido. | DevOps, Administrador |

---

## 🛠️ Stack Tecnológico

```
┌──────────────────────────────────────────────────────────────────────────┐
│                             FRONTEND WEB & PWA                           │
│  React 18 · TypeScript · Vite · Tailwind CSS · Zustand · PWA Workbox · idb│
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ HTTPS / JSON REST API
┌────────────────────────────────────▼─────────────────────────────────────┐
│                             BACKEND SERVICES                             │
│  NestJS 10 · Node.js 20 LTS · Prisma ORM · Passport JWT · Helmet · Throttler│
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │ SQL / Pool Conexiones
┌────────────────────────────────────▼─────────────────────────────────────┐
│                           DATABASE & STORAGE                             │
│      PostgreSQL 15 · Triggers Anti-Tamper · Volúmenes SSD · AES-256      │
└──────────────────────────────────────────────────────────────────────────┘
```

- **Frontend:** Single Page Application (SPA) ultra rápida construida con **React 18**, **TypeScript** y empaquetada con **Vite**. Diseño responsivo adaptable a pantallas de escritorio y teléfonos móviles rugerizados.
- **Capa Offline:** **IndexedDB** gestionado con transacciones ACID locales y **Workbox Service Workers** para disponibilidad inmediata sin conexión.
- **Backend API:** Arquitectura modular en **NestJS** orientada a mantenibilidad, validación estricta de esquemas DTO con `class-validator` y documentación de tipos integrada.
- **Persistencia:** **PostgreSQL 15** con integridad referencial completa y triggers de consistencia contable.
- **Infraestructura & Contenedores:** **Docker Compose** con Nginx reverse proxy, compresión Gzip y script automatizado de auto-inicialización con seeds de catálogo y usuarios.

---

## ⚡ Puesta en Marcha Rápida (Entorno Local o Servidor)

### Requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/macOS) o Docker Engine con Docker Compose v2 (Linux Ubuntu 22.04+).
- Git instalado.

### 1. Clonar el repositorio
```bash
git clone https://github.com/Skywalker92-pixel/AgroControl.git
cd AgroControl
```

### 2. Configurar el archivo de entorno
```bash
cp .env.example .env
```
> Configure sus contraseñas seguras para la base de datos (`DB_PASSWORD`), la clave secreta del token (`JWT_SECRET`) y la clave de cifrado de backups (`BACKUP_ENCRYPTION_KEY`).

### 3. Levantar la infraestructura
```bash
docker compose -f docker/docker-compose.yml --env-file .env up -d
```
> En el primer inicio, Docker inicializará la base de datos PostgreSQL, ejecutará las migraciones DDL y cargará el catálogo inicial con los perfiles maestros del sistema.

### 4. Acceder al sistema
- **Portal Web Administrativo:** `http://localhost`
- **Módulo Móvil para Vendedores:** `http://localhost/movil`
- **Healthcheck del Sistema:** `http://localhost/api/health`

---

## 🧪 Calidad de Software Verificada

El proyecto cuenta con una batería integral de pruebas automatizadas **End-to-End (E2E)** que se ejecutan contra una base de datos PostgreSQL real en cada integración:

```bash
cd backend
npm run test:e2e
```

**Resultado de la suite de pruebas:**
```text
Test Suites: 12 passed, 12 total
Tests:       140 passed, 140 total
Snapshots:   0 total
Time:        11.62 s
Status:      PASS (Catálogo, Kárdex, Despacho, Distribución, Sincronización, Liquidación, Reportes, Health)
```

Adicionalmente, el pipeline de CI en **GitHub Actions** valida en cada commit:
1. Análisis estático de código y reglas de calidad (`npm run lint`).
2. Compilación estricta sin advertencias de TypeScript en Backend y Frontend.
3. Generación del Service Worker y precaché de la PWA.
4. Batería completa de 140 pruebas E2E.

---

## 💼 Casos de Éxito y Aplicabilidad Comercial

AgroControl Pro está listo para operar en:
- **Distribuidoras de Agroquímicos y Fertilizantes:** Control riguroso de sustancias de alto valor por lote y presentación.
- **Empresas de Alimento Balanceado y Veterinaria:** Gestión de rutas de entrega a granjas, fundos y establos.
- **Comercializadoras de Semillas y Riego:** Venta asistida por ingenieros agrónomos en campo con cotización y pedido in situ.
- **Cualquier negocio de distribución B2B con reparto en ruta y cobro en campo.**

---

## 📩 Contacto y Soporte Empresarial

¿Desea implementar **AgroControl Pro** en su empresa o solicitar una demostración personalizada?

- **Sitio Web / Demo:** [Consultar Demostración](https://github.com/Skywalker92-pixel/AgroControl)
- **Desarrollo y Consultoría:** Equipo de Ingeniería AgroControl Pro
- **Licenciamiento:** Software con licenciamiento privado para empresas distribuidoras.

---

*© 2026 AgroControl Pro™. Todos los derechos reservados. Desarrollado con los más altos estándares de arquitectura de software, seguridad de datos y confiabilidad en campo.*
