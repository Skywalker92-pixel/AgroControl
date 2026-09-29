---
name: agrocontrol-base-datos
description: Guía de rol Base de Datos para AgroControl Pro (inventario multialmacén, Kárdex, despacho y distribución agrícola). Úsala siempre que se diseñe o revise el modelo de datos, tablas, relaciones, índices, migraciones, consultas de stock o Kárdex, sincronización móvil-central o auditoría de AgroControl Pro, aunque no se diga "base de datos" explícitamente.
---

# AgroControl Pro – Rol Base de Datos

Diseñas y mantienes el modelo de datos de AgroControl Pro. La base de datos central, alojada en la PC del local, es la **única fuente oficial** de la información del negocio. Los celulares tienen copias locales temporales que se consolidan en ella.

## 1. Principios del modelo

1. **El Kárdex es un libro de solo inserción.** Los movimientos no se actualizan ni se borran; se compensan.
2. **Stock en unidad base.** Presentaciones (caja, saco) son factores de conversión.
3. **Sin borrados físicos** en datos de negocio: usa `activo` / `estado` y conserva el historial.
4. **Trazabilidad total:** cada registro de negocio sabe quién, cuándo, desde qué dispositivo y por qué documento.
5. **Lo POR VALIDAR va en columnas opcionales o tablas separadas**, nunca como restricción obligatoria que luego haya que romper.

## 2. Estado de los requisitos que afectan el modelo

| Tema | Estado | Decisión de modelo |
|---|---|---|
| Multialmacén, traslados, Kárdex, presentaciones | CONFIRMADO | Modelar completo. |
| Proforma / orden de despacho | CONFIRMADO | Modelar con estados. |
| Bodega móvil / liquidación | ACEPTADO (Fase 2) | Ubicación lógica tipo `BODEGA_MOVIL`. |
| Método de valorización | POR VALIDAR | Guardar costo unitario por movimiento; el cálculo es estrategia. |
| Lotes y vencimiento | POR VALIDAR | Tabla `lote` opcional; `lote_id` nullable. |
| Código de barras | POR VALIDAR | Columna nullable, índice único parcial. |
| Crédito / límite de crédito | POR VALIDAR | No agregar columnas de límite aún; tabla separada si se confirma. |
| SUNAT / GRE | POR VALIDAR / FUTURO | Esquema aparte, sin acoplar al núcleo. |
| GPS | FUTURO | No modelar. |

## 3. Entidades principales

```text
categoria ──< producto ──< presentacion
                 │
                 ├──< precio (por lista_precio)
                 │
ubicacion (ALMACEN | ZONA | BODEGA_MOVIL, jerárquica)
                 │
producto × ubicacion → stock_saldo (materializado)
                 │
movimiento_kardex (solo inserción) ── documento origen
                 │
proforma ──< proforma_detalle
carga_distribucion ──< carga_detalle ── trabajador, vehiculo
liquidacion
cliente ── lista_precio
usuario ── rol ──< permiso ; dispositivo
auditoria
```

## 4. Esquema de referencia

Ejemplo en PostgreSQL. El motor definitivo es decisión de arquitectura; adapta tipos si cambia.

```sql
CREATE TABLE producto (
  id              UUID PRIMARY KEY,
  codigo_interno  VARCHAR(30) NOT NULL UNIQUE,
  codigo_barras   VARCHAR(50),                -- POR VALIDAR
  nombre          VARCHAR(150) NOT NULL,
  categoria_id    UUID NOT NULL REFERENCES categoria(id),
  unidad_base     VARCHAR(20) NOT NULL,       -- botella, saco, unidad, kg
  activo          BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX ux_producto_barras ON producto(codigo_barras) WHERE codigo_barras IS NOT NULL;

CREATE TABLE presentacion (
  id           UUID PRIMARY KEY,
  producto_id  UUID NOT NULL REFERENCES producto(id),
  nombre       VARCHAR(50) NOT NULL,          -- 'Caja x12', 'Saco 50 kg'
  factor       NUMERIC(12,3) NOT NULL CHECK (factor > 0),
  UNIQUE (producto_id, nombre)
);

CREATE TABLE ubicacion (
  id         UUID PRIMARY KEY,
  tipo       VARCHAR(15) NOT NULL CHECK (tipo IN ('ALMACEN','ZONA','BODEGA_MOVIL')),
  padre_id   UUID REFERENCES ubicacion(id),
  nombre     VARCHAR(100) NOT NULL,
  vehiculo_id UUID,       -- para BODEGA_MOVIL
  trabajador_id UUID,     -- para BODEGA_MOVIL
  activo     BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE movimiento_kardex (
  id               UUID PRIMARY KEY,          -- generado en origen (idempotencia)
  producto_id      UUID NOT NULL REFERENCES producto(id),
  ubicacion_id     UUID NOT NULL REFERENCES ubicacion(id),
  tipo             VARCHAR(30) NOT NULL,      -- ENTRADA, SALIDA, TRASLADO_SALIDA, TRASLADO_ENTRADA,
                                              -- AJUSTE, ASIGNACION_DISTRIBUCION, VENTA_RUTA,
                                              -- RETORNO_DISTRIBUCION, ANULACION
  cantidad_base    NUMERIC(14,3) NOT NULL,    -- positiva entra, negativa sale
  costo_unitario   NUMERIC(14,4),             -- insumo para valorización
  documento_tipo   VARCHAR(30),
  documento_id     UUID,
  movimiento_ref_id UUID REFERENCES movimiento_kardex(id), -- par de traslado / anulación
  lote_id          UUID,                      -- POR VALIDAR
  motivo           VARCHAR(250),
  usuario_id       UUID NOT NULL,
  dispositivo_id   UUID,
  fecha_operacion  TIMESTAMPTZ NOT NULL,      -- hora en que ocurrió (dispositivo)
  fecha_registro   TIMESTAMPTZ NOT NULL DEFAULT now()  -- hora en que llegó a la central
);
CREATE INDEX ix_kardex_prod_ubic_fecha ON movimiento_kardex(producto_id, ubicacion_id, fecha_operacion);

CREATE TABLE stock_saldo (
  producto_id     UUID NOT NULL REFERENCES producto(id),
  ubicacion_id    UUID NOT NULL REFERENCES ubicacion(id),
  cantidad_fisica NUMERIC(14,3) NOT NULL DEFAULT 0,
  cantidad_reservada NUMERIC(14,3) NOT NULL DEFAULT 0,
  PRIMARY KEY (producto_id, ubicacion_id),
  CHECK (cantidad_fisica >= 0),
  CHECK (cantidad_reservada >= 0 AND cantidad_reservada <= cantidad_fisica)
);
-- Disponible = cantidad_fisica - cantidad_reservada (calculado, no almacenado)
```

Proforma:
```sql
CREATE TABLE proforma (
  id          UUID PRIMARY KEY,
  numero      VARCHAR(20) NOT NULL UNIQUE,
  cliente_id  UUID NOT NULL REFERENCES cliente(id),
  lista_precio_id UUID NOT NULL,
  estado      VARCHAR(15) NOT NULL CHECK (estado IN ('BORRADOR','RESERVADO','PREPARADO','DESPACHADO','ANULADO')),
  creado_por  UUID NOT NULL,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## 5. Invariantes que la base debe garantizar

- `stock_saldo` y `movimiento_kardex` se escriben en la **misma transacción**.
- `stock_saldo.cantidad_fisica` = suma de `cantidad_base` de los movimientos para ese producto y ubicación. Provee una consulta de conciliación y úsala en pruebas.
- **Traslado:** dos movimientos (`TRASLADO_SALIDA` y `TRASLADO_ENTRADA`) enlazados por `movimiento_ref_id`, con suma cero. Stock global de la empresa sin cambios.
- **Asignación a distribución:** mueve stock del almacén a la ubicación `BODEGA_MOVIL`; no es venta.
- **Liquidación:** `carga inicial = vendido + retornado + diferencia`; guarda la diferencia y su justificación.
- Usa `NUMERIC`, nunca `FLOAT`, para cantidades y dinero.

## 6. Sincronización móvil ↔ central

- Claves primarias UUID generadas en el dispositivo → reinsertar el mismo registro no duplica (`INSERT ... ON CONFLICT DO NOTHING`).
- Tablas que vienen del móvil llevan: `dispositivo_id`, `usuario_id`, `fecha_operacion`, `fecha_registro`, `estado_sync` (`RECIBIDA`, `APLICADA`, `OBSERVADA`).
- Para enviar datos al móvil, cada tabla maestra tiene `actualizado_en` indexado para sincronización incremental.
- La base local del móvil guarda solo lo necesario: su carga, clientes, productos y precios autorizados, y sus operaciones pendientes. El motor local (SQLite, Room, Realm…) es decisión de arquitectura.

## 7. Auditoría y anulaciones

- Tabla `auditoria`: entidad, id, acción, valor_anterior (JSON), valor_nuevo (JSON), usuario, dispositivo, fecha.
- Ventas confirmadas no se editan. Anulación = registro en `solicitud_anulacion` (estado, solicitante, aprobador) + movimiento `ANULACION` que revierte el Kárdex.
- Considera revocar `UPDATE`/`DELETE` sobre `movimiento_kardex` al usuario de la aplicación.

## 8. Rendimiento y mantenimiento

- Índices por (producto, ubicación, fecha) en Kárdex; por estado en proformas; por `actualizado_en` en maestras.
- Migraciones versionadas (Flyway, Liquibase, Alembic, Prisma… según el stack), nunca cambios manuales en producción.
- Datos de prueba realistas: fertilizantes en sacos, herbicidas en cajas x12, varios almacenes, 4 vendedores.

## 9. Formato al entregar trabajo

```text
Cambio: tabla/índice/migración
Requisito(s): RF-xx – Estado
Motivo:
DDL:
Invariantes afectadas y cómo se garantizan:
Impacto en sincronización móvil:
Pendientes por validar con el cliente:
```

Si un campo depende de algo POR VALIDAR, déjalo nullable o en tabla aparte y dilo explícitamente.
