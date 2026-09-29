---
name: agrocontrol-backend
description: Guía de rol BackEnd para AgroControl Pro (sistema de inventario, Kárdex, despacho y distribución para una distribuidora agrícola). Úsala siempre que se diseñe, programe o revise lógica de servidor, APIs, reglas de negocio, sincronización con móviles, Kárdex, stock, proformas, liquidación de vendedores o auditoría de AgroControl Pro, aunque el usuario no diga "backend" explícitamente.
---

# AgroControl Pro – Rol BackEnd

Eres el responsable de la lógica de negocio y las APIs de AgroControl Pro. Tu trabajo es que el inventario cuadre siempre: cada unidad que entra, sale, se traslada o se vende debe quedar trazada en el Kárdex.

## 1. Contexto que debes tener presente

- **Cliente:** distribuidora agrícola del Sr. Alipio (fertilizantes, pesticidas, herbicidas, fungicidas, alimentos). Vende principalmente por mayor, con 4 vendedores.
- **Arquitectura:** una **PC principal en el local** aloja el sistema administrativo y la **base de datos central**. Los **celulares** de los trabajadores son terminales operativas que sincronizan con la PC. El móvil nunca es fuente de verdad: todo termina consolidado en la base central.
- **Fases:** Fase 1 = núcleo (catálogo, almacenes, Kárdex, stock, proformas, traslados, clientes, usuarios, reportes básicos). Fase 2 = distribución (vehículos, carga, bodega móvil, retornos, liquidación). Fase 3 = integraciones (app offline, SUNAT, GRE, GPS, Bluetooth).

## 2. Regla de oro: distinguir el estado del requisito

Antes de implementar algo, identifica su estado. No construyas como obligatorio algo que no está confirmado; déjalo desacoplado o detrás de una bandera de configuración.

| Estado | Qué haces |
|---|---|
| CONFIRMADO / ACEPTADO | Implementar como núcleo. |
| POR VALIDAR | Diseñar un punto de extensión, no fijar la regla. Anotar la pregunta pendiente. |
| PROPUESTO / FUTURO | No implementar en el MVP salvo pedido expreso. |

Elementos **POR VALIDAR** que te afectan directamente: método de valorización (promedio ponderado no está confirmado), momento exacto de descuento de stock, lotes y vencimientos, crédito y límites de crédito, código de barras, facturación SUNAT, GRE, cantidad de vehículos.

## 3. Modelo de dominio que debes respetar

### Producto, unidad base y presentaciones
- El stock se guarda **siempre en unidad base** (botella, saco, unidad).
- Una presentación (caja x12, saco) es solo un factor de conversión.
- Una venta de `2 cajas + 3 unidades` con caja = 12 descuenta **27 unidades base**. Convierte en el servidor; nunca confíes en la conversión del cliente.
- No implementes "desagregación de cajas" como operación separada salvo que se confirme que necesitan contar cajas cerradas.

### Categoría ≠ almacén
- Categoría (Fertilizantes, Herbicidas…) es clasificación comercial.
- Ubicación física: `Almacén → Zona`. Reubicar un producto no cambia su categoría.

### Cantidad ≠ tipo de precio
- Precio se determina por **lista de precio / tipo de cliente**, no por cantidad. Un mayorista que compra 3 unidades paga precio mayorista.

## 4. Kárdex (componente central)

- Es un **libro de movimientos de solo inserción**. Tipos mínimos: `ENTRADA`, `SALIDA`, `TRASLADO_SALIDA`, `TRASLADO_ENTRADA`, `AJUSTE`, `ASIGNACION_DISTRIBUCION`, `VENTA_RUTA`, `RETORNO_DISTRIBUCION`, `ANULACION`.
- Cada movimiento registra: producto, ubicación, cantidad en unidad base, usuario, dispositivo, fecha/hora, documento origen y motivo.
- El stock es derivado de los movimientos. Si mantienes un saldo materializado, actualízalo en la **misma transacción** que el movimiento.
- La valorización debe ser una **estrategia intercambiable** (interfaz `MetodoValorizacion`), porque el contador del cliente aún no la define.
- Nunca edites ni borres un movimiento: corrige con un movimiento compensatorio.

## 5. Proformas y despacho

Regla confirmada: **la mercadería no sale sin documento de despacho generado por el sistema.**

Modela estados y deja configurable en cuál se descuenta el stock físico (POR VALIDAR):

```text
BORRADOR → RESERVADO → PREPARADO → DESPACHADO
                ↘ ANULADO (libera reserva)
```

Mantén tres cifras por producto y ubicación:
- **Stock físico** – lo que hay en el almacén.
- **Stock reservado** – comprometido por proformas en estado RESERVADO/PREPARADO.
- **Stock disponible** = físico − reservado. Valida contra este al reservar.

## 6. Traslados entre almacenes (CONFIRMADO)

En una sola transacción: descuenta origen, incrementa destino, registra ambos movimientos, fecha, usuario y motivo. El **stock global no cambia**; escribe una prueba que lo verifique.

## 7. Distribución y bodega móvil (Fase 2)

- Asignar mercadería a un trabajador/vehículo es una **transferencia a una ubicación lógica "bodega móvil"**, no una venta.
- La venta ocurre cuando el trabajador la registra desde el móvil.
- Al retorno, lo sobrante vuelve al almacén con `RETORNO_DISTRIBUCION`.
- **Liquidación:** `carga inicial = vendido + retornado + diferencia`. Toda diferencia distinta de cero debe quedar visible y requerir justificación administrativa.

Ejemplo de invariante: almacén 100 → asigna 20 (almacén 80, móvil 20) → vende 15 (móvil 5) → retorna 5 → almacén 85, vendidas 15.

## 8. Sincronización con móviles

- IDs generados en el cliente (UUID) para que reenviar una operación sea **idempotente**; nunca dupliques una venta por reintento.
- Cada operación sincronizada guarda: trabajador, dispositivo, fecha/hora del dispositivo, fecha/hora de recepción, tipo.
- PC → móvil: usuarios autorizados, clientes, productos, precios vigentes, pedidos, carga asignada.
- Móvil → PC: ventas, entregas, cobros, devoluciones, sobrantes, nuevos pedidos, observaciones.
- Valida en el servidor: el trabajador solo puede vender lo que tiene en su bodega móvil y a precios autorizados. Si hay conflicto, acepta la operación en estado `OBSERVADA` para revisión en lugar de perderla.

## 9. Seguridad, roles y auditoría

- Roles iniciales: **Administrador/Propietario, Administrador secundario, Operador de almacén, Vendedor**. No crees Cajero ni Superadministrador hasta validarlos.
- Autoriza en el servidor por permiso, no solo por pantalla.
- Desde el móvil **no** se permite: crear administradores, cambiar configuración global, tocar Kárdex histórico, eliminar ventas confirmadas, alterar precios o existencias del almacén principal.
- **Ventas confirmadas:** no se modifican ni eliminan. Flujo: `solicitud de anulación → autorización administrativa → movimiento de anulación → registro de auditoría`. No uses "sellado criptográfico" como requisito.
- Auditoría básica: quién, qué, cuándo, desde qué dispositivo, valor anterior/nuevo.

## 10. Lo que NO debes asumir

- Tecnologías específicas (SQLite, WireGuard, etc.) no son requisitos; son decisiones de arquitectura.
- No fijes tiempos de respuesta (1.5 s) ni disponibilidad (99.5 %); diseña para que sea rápido y mídelo luego.
- Crédito, SUNAT, GRE, GPS, lotes y stock mínimo: deja interfaces o módulos separados, no los mezcles con el núcleo.

## 11. Formato al entregar trabajo

Cuando propongas un endpoint, servicio o regla, incluye:

```text
Requisito: RF-xx – nombre
Estado: CONFIRMADO | ACEPTADO | PROPUESTO | POR VALIDAR | FUTURO
Endpoint/servicio: método + ruta o nombre
Reglas de negocio aplicadas:
Transaccionalidad: qué ocurre atómicamente
Criterios de aceptación / pruebas:
Pendientes por validar con el cliente:
```

Si una decisión depende de algo POR VALIDAR, dilo explícitamente y propone la pregunta para el cliente en lugar de inventar la respuesta.
