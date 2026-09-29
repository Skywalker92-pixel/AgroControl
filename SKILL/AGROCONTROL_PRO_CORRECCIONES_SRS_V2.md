# CORRECCIONES Y OBSERVACIONES AL SRS – AGROCONTROL PRO

## 1. Objetivo del documento

El presente documento consolida las principales correcciones, observaciones y ajustes identificados luego de contrastar:

- La **transcripción del levantamiento de requerimientos** realizado con el Sr. Alipio.
- La **Especificación de Requerimientos de Software (SRS) de AgroControl Pro**.

El propósito es evitar que el SRS trate como requisitos confirmados algunas funcionalidades que todavía corresponden a propuestas técnicas, supuestos de diseño o aspectos pendientes de validación con el cliente.

Este documento **no reemplaza el SRS**, sino que sirve como guía para preparar una versión corregida, trazable y validable.

---

# 2. Hallazgo principal

El SRS actual contiene una buena interpretación del negocio y una estructura técnica completa. Sin embargo, mezcla tres tipos de información:

1. **Requisitos expresamente solicitados por el cliente.**
2. **Soluciones propuestas durante la reunión y aceptadas verbalmente.**
3. **Decisiones técnicas, buenas prácticas o funcionalidades agregadas posteriormente por el equipo de desarrollo.**

Por ello, antes de considerar el SRS como versión definitiva, se recomienda clasificar cada requisito según su nivel de confirmación.

---

# 3. Estados recomendados para los requisitos

Cada requisito funcional y no funcional debería incorporar un campo denominado **Estado**.

| Estado | Descripción |
|---|---|
| **CONFIRMADO** | El cliente manifestó directamente la necesidad durante el levantamiento. |
| **ACEPTADO** | La funcionalidad fue propuesta por el desarrollador y el cliente mostró conformidad. |
| **PROPUESTO** | Es una recomendación técnica del equipo y todavía no fue validada expresamente por el cliente. |
| **POR VALIDAR** | Requiere una pregunta concreta en una próxima reunión. |
| **FUTURO** | Funcionalidad valiosa, pero recomendable para una segunda etapa o versión posterior. |

También se recomienda agregar una columna adicional:

> **Fuente / Evidencia:** Audio, minuto o sección de la transcripción donde se origina el requisito.

---

# 4. Correcciones generales al alcance

## 4.1. Definir claramente el alcance del MVP

El SRS incluye funcionalidades de alta complejidad, por ejemplo:

- Aplicativo móvil offline.
- Sincronización automática.
- GPS.
- Ticketera Bluetooth.
- Facturación electrónica SUNAT.
- Guía de Remisión Electrónica.
- Historial inmutable de precios.
- Gestión de crédito.
- Liquidación automática de vendedores.
- Reportes de rentabilidad.
- Seguridad de red avanzada.

No todas estas funciones deben asumirse automáticamente como parte del **MVP**.

### Corrección propuesta

Dividir el proyecto por fases.

### Fase 1 – Núcleo del negocio

- Catálogo de productos.
- Categorías.
- Almacenes.
- Ingresos de mercadería.
- Salidas de mercadería.
- Kárdex.
- Stock.
- Presentaciones y unidades.
- Proformas / órdenes de despacho.
- Traslados entre almacenes.
- Clientes.
- Usuarios.
- Reportes básicos.

### Fase 2 – Distribución

- Vendedores.
- Vehículos.
- Carga por vehículo.
- Retorno de mercadería.
- Liquidación.
- Bodega móvil.

### Fase 3 – Integraciones y automatización

- Aplicativo móvil offline.
- Facturación electrónica.
- SUNAT.
- Guía de Remisión Electrónica.
- GPS.
- Ticketera Bluetooth.
- Analítica comercial.

---

# 5. Correcciones sobre productos, empaques y unidades

## 5.1. No confundir producto, empaque y unidad de stock

El sistema debe distinguir claramente:

```text
Producto
    ↓
Unidad base
    ↓
Presentaciones / empaques
```

Ejemplo:

```text
Producto: Herbicida X
Unidad base: Botella
Presentación comercial: Caja de 12 botellas
```

El inventario podría mantenerse internamente en unidades base.

Ejemplo:

```text
10 cajas × 12 botellas = 120 unidades
```

Si el cliente vende:

```text
3 unidades
```

el stock pasa a:

```text
117 unidades
```

---

## 5.2. Revisar el requisito de “desagregación de cajas”

El SRS actual contempla una operación específica para abrir una caja y convertirla en unidades sueltas.

Esta lógica podría ser innecesariamente compleja si el negocio confirma que el inventario se manejará principalmente por unidad mínima.

### Versión recomendada

El sistema debe:

- Registrar la equivalencia de cada presentación.
- Permitir vender cajas completas.
- Permitir vender fracciones o unidades.
- Descontar siempre la cantidad equivalente de unidades base.

Ejemplo:

```text
1 caja = 12 unidades

Venta:
2 cajas + 3 unidades

Descuento real:
27 unidades
```

### Estado recomendado

**POR VALIDAR**

Debe confirmarse si el cliente necesita conocer físicamente cuántas cajas permanecen cerradas o si únicamente requiere el stock total por unidad.

---

# 6. Correcciones sobre categorías, almacenes y ubicaciones

## 6.1. No utilizar categorías como almacenes

Durante la conversación aparecen conceptos como:

- Alimentos.
- Fertilizantes.
- Pesticidas.
- Fungicidas.
- Herbicidas.
- Agroquímicos.

Estos conceptos deberían manejarse principalmente como **categorías de productos**, no necesariamente como almacenes físicos.

### Estructura recomendada

```text
Almacén
    ↓
Zona / sección
    ↓
Categoría
    ↓
Producto
```

Ejemplo:

```text
Almacén 1
    └── Zona A
        └── Fertilizantes
            └── Urea
```

Esto permitirá reubicar físicamente un producto sin cambiar su categoría comercial.

---

## 6.2. Mantener soporte multialmacén

Este requerimiento sí tiene respaldo directo en el levantamiento.

El sistema debe poder gestionar:

- Almacén principal.
- Almacenes secundarios.
- Traslados entre almacenes.
- Desbordes temporales.
- Stock independiente por ubicación.
- Stock global de la empresa.

### Estado recomendado

**CONFIRMADO**

---

# 7. Correcciones sobre el Kárdex

El cliente solicita explícitamente:

- Control de ingreso.
- Control de salida.
- Existencias.
- Consulta de stock.
- Control total de la mercadería.

Por tanto, el Kárdex constituye uno de los componentes centrales del sistema.

## Corrección importante

El SRS especifica que el Kárdex utilizará:

> **Promedio Ponderado**

No se identificó una confirmación expresa del cliente sobre el método de valorización.

### Recomendación

Cambiar:

```text
RF-14: El sistema debe calcular y mostrar el Kárdex en tiempo real mediante el método de valoración Promedio Ponderado.
```

por:

```text
RF-14: El sistema debe calcular y mostrar el Kárdex en tiempo real, registrando los movimientos de entrada, salida, traslado y ajuste de inventario.

El método de valorización contable será definido con el cliente y/o su contador.
```

### Estado del método de valorización

**POR VALIDAR**

---

# 8. Correcciones sobre proformas y despacho

El flujo observado durante el levantamiento es:

```text
Pedido
    ↓
Registro del pedido
    ↓
Proforma / Orden de despacho
    ↓
Impresión
    ↓
Carga física
    ↓
Salida de mercadería
    ↓
Actualización del stock
```

Este proceso representa una regla de negocio importante.

## Regla propuesta

> La mercadería no debería salir físicamente del almacén sin un documento de despacho generado por el sistema.

### Estado recomendado

**CONFIRMADO / ACEPTADO**

---

## 8.1. Momento exacto de descuento del stock

Actualmente el SRS indica que el stock se descuenta inmediatamente al imprimir la orden.

Debe confirmarse si el descuento ocurre:

1. Al generar la proforma.
2. Al imprimir.
3. Al confirmar despacho.
4. Al entregar físicamente la mercadería.

### Recomendación

Utilizar estados:

```text
BORRADOR
RESERVADO
PREPARADO
DESPACHADO
ANULADO
```

Y distinguir:

```text
Stock físico
Stock reservado
Stock disponible
```

### Estado

**POR VALIDAR**

---

# 9. Correcciones sobre ventas mayoristas y minoristas

En la conversación el propietario señala que principalmente vende **por mayor**, aunque un cliente mayorista puede comprar:

- 3 unidades.
- 4 unidades.
- Media caja.
- Una caja completa.

Por tanto:

> **Cantidad comprada y tipo de cliente/precio no deben confundirse.**

Comprar tres unidades no convierte automáticamente una operación en venta minorista.

## Corrección propuesta

Separar:

```text
Presentación
Cantidad
Lista de precio
Tipo de cliente
```

Ejemplo:

```text
Cliente: Distribuidor Mayorista
Producto: Pesticida X
Cantidad: 3 unidades
Precio aplicado: Mayorista
```

---

# 10. Correcciones sobre vendedores y vehículos

El cliente señala que trabaja con **cuatro vendedores**.

Sin embargo, esto no implica necesariamente que existan cuatro vehículos.

## Requisito actual a corregir

En lugar de:

```text
El sistema debe gestionar los 4 vehículos de reparto.
```

utilizar:

```text
El sistema debe permitir registrar y administrar los vehículos empleados para la distribución de mercadería.
```

Datos sugeridos:

- Placa.
- Tipo de vehículo.
- Capacidad.
- Estado.
- Conductor.
- Observaciones.

### Cantidad de vehículos

**POR VALIDAR**

---

# 11. Correcciones sobre distribución en ruta

La conversación sí evidencia un proceso de distribución:

```text
Pedido
    ↓
Preparación
    ↓
Carga
    ↓
Vehículo
    ↓
Cliente
```

También existe diferencia entre:

- Pesticidas u otros productos livianos que pueden transportarse en camioneta.
- Sacos pesados que requieren camión.

Por tanto, un módulo de distribución tiene fundamento.

## Sin embargo

Funciones como:

- cálculo automático de peso;
- validación de tara;
- optimización de rutas;
- consolidación geográfica;

deben considerarse inicialmente como:

**PROPUESTAS**

salvo que sean confirmadas posteriormente.

---

# 12. Correcciones sobre aplicativo móvil offline

El concepto de aplicación móvil para vendedores puede aportar valor al negocio y está relacionado con la dinámica de ventas en campo.

Sin embargo, deben separarse dos decisiones:

### Necesidad de negocio

Registrar ventas realizadas fuera del establecimiento.

### Solución técnica

Aplicación Android offline con SQLite cifrado y sincronización automática.

La primera puede estar aceptada.

La segunda es una decisión arquitectónica.

## Redacción recomendada

```text
RF-MOV-01:
El sistema deberá permitir registrar operaciones comerciales realizadas por vendedores fuera del establecimiento.

RNF-MOV-01:
Cuando la operación comercial se realice en zonas sin conectividad, el sistema deberá disponer de un mecanismo que permita continuar registrando las operaciones y sincronizarlas posteriormente.
```

La tecnología específica:

```text
SQLite
cifrado
Android
```

debe ubicarse en la sección de arquitectura técnica.

---

# 13. Correcciones sobre inmutabilidad

El SRS actualmente utiliza expresiones como:

- “registro sellado criptográficamente”.
- “transacción inmutable”.
- “no modificable”.

Estas expresiones pueden ser excesivamente rígidas para una primera implementación.

## Recomendación

Utilizar:

```text
El sistema no permitirá que los vendedores eliminen o modifiquen directamente una venta confirmada.
```

En caso de error:

```text
Venta original
    ↓
Solicitud de anulación
    ↓
Autorización administrativa
    ↓
Registro de auditoría
```

De esta manera se mantiene trazabilidad sin impedir correcciones legítimas.

---

# 14. Correcciones sobre GPS

El registro de coordenadas GPS del punto de venta no aparece como una necesidad central del cliente.

### Estado recomendado

**PROPUESTO / FUTURO**

No debería considerarse obligatorio para el MVP.

---

# 15. Correcciones sobre código de barras y SKU

El SRS propone:

- SKU único.
- Código interno.
- Código de barras.

No existe evidencia suficiente para afirmar que el negocio utiliza actualmente códigos de barras.

## Corrección

Separar:

### Código interno

Recomendable y prácticamente obligatorio.

### Código de barras

**POR VALIDAR**

Posible pregunta:

> ¿Los productos que comercializa cuentan con códigos de barras y desea utilizar lector de códigos para realizar ventas o ingresos?

---

# 16. Correcciones sobre stock mínimo

El sistema propone alertas automáticas cuando un producto llegue a stock mínimo.

Es una funcionalidad útil, pero no se identifica como solicitud expresa.

### Estado

**PROPUESTO**

Puede incluirse en una segunda iteración del sistema.

---

# 17. Correcciones sobre lotes y fechas de vencimiento

Para productos como:

- Pesticidas.
- Herbicidas.
- Fungicidas.
- Alimentos balanceados.

puede ser relevante registrar:

- Número de lote.
- Fecha de fabricación.
- Fecha de vencimiento.

Sin embargo, debe confirmarse cómo trabaja actualmente el negocio.

### Estado

**POR VALIDAR**

Pregunta sugerida:

> ¿Necesita controlar los productos por lote y fecha de vencimiento o únicamente por cantidad disponible?

---

# 18. Correcciones sobre clientes y crédito

El SRS contempla:

- límites de crédito;
- clientes morosos;
- bloqueo de pedidos;
- autorización administrativa.

No existe suficiente información para considerar esas reglas como confirmadas.

### Estado recomendado

**POR VALIDAR**

Preguntas:

- ¿Realiza ventas al crédito?
- ¿Cómo registra actualmente las deudas?
- ¿Existe límite de crédito por cliente?
- ¿Quién autoriza una venta al crédito?
- ¿Cómo se registran pagos parciales?

---

# 19. Correcciones sobre facturación electrónica SUNAT

El cliente consulta si el sistema puede enlazarse con facturación.

La posibilidad fue explicada durante la reunión.

Sin embargo, esto no equivale necesariamente a una aprobación definitiva para la primera versión.

## Redacción recomendada

En lugar de:

```text
El sistema incorporará facturación electrónica SUNAT.
```

utilizar:

```text
El sistema deberá contemplar la posibilidad de integrar un módulo de facturación electrónica con SUNAT, sujeto a aprobación del cliente, definición del proveedor tecnológico y evaluación del costo del servicio.
```

### Estado

**POR VALIDAR**

---

# 20. Correcciones sobre Guía de Remisión Electrónica

La emisión de GRE es una funcionalidad relacionada con el transporte de mercadería.

No obstante, debe validarse:

- Si actualmente utilizan GRE.
- Quién las emite.
- Si las genera el contador.
- Qué proveedor utilizan.
- Si la integración deberá formar parte del sistema.

### Estado

**POR VALIDAR / FUTURO**

---

# 21. Correcciones sobre reportes

El SRS incluye reportes como:

- Rentabilidad por categoría.
- Rentabilidad por ruta.
- Comparación entre vendedores.
- Volumen despachado.

Algunos son útiles, pero no necesariamente forman parte del requerimiento inicial.

## Reportes mínimos recomendados para el MVP

- Stock actual.
- Stock por almacén.
- Movimientos de Kárdex.
- Ingresos.
- Salidas.
- Productos con menor stock.
- Ventas.
- Pedidos.
- Traslados entre almacenes.
- Historial de movimientos.

### Reportes avanzados

**PROPUESTOS / FUTUROS**

---

# 22. Correcciones sobre requisitos no funcionales

## RNF-01 – Tiempo de respuesta de 1.5 segundos

El valor exacto de 1.5 segundos no proviene del levantamiento.

### Corrección

```text
El sistema deberá ofrecer tiempos de respuesta adecuados para las operaciones de consulta, búsqueda y registro realizadas durante la operación cotidiana del negocio.
```

El valor cuantitativo se podrá definir posteriormente mediante pruebas de rendimiento.

---

## RNF-02 – Disponibilidad 99.5 %

No fue solicitado expresamente.

### Estado

**PROPUESTO**

---

## RNF-03 – SQLite

No debería formar parte directamente del requisito.

### Corrección

El requisito debe expresar la capacidad:

```text
El aplicativo deberá continuar operando cuando no exista conectividad.
```

La tecnología puede definirse en arquitectura:

```text
SQLite
Room
IndexedDB
Realm
etc.
```

---

## RNF-04 – Sellado criptográfico

Puede reemplazarse por:

```text
Las operaciones confirmadas por vendedores no podrán ser modificadas o eliminadas sin autorización administrativa y deberán conservar historial de auditoría.
```

---

## RNF-05 – Filtrado MAC / ACL

Mover a:

> **Arquitectura y Seguridad de Infraestructura**

No necesariamente al SRS contractual.

---

## RNF-06 – WireGuard / OpenVPN

El requisito debería ser:

```text
El propietario deberá poder acceder remotamente al sistema mediante un mecanismo seguro de autenticación y comunicación cifrada.
```

La tecnología concreta se definirá en arquitectura.

---

## RNF-09 – Dos backups obligatorios

La necesidad de respaldo es correcta.

Sin embargo, el mecanismo exacto debe considerarse propuesta técnica.

### Requisito

```text
El sistema deberá realizar copias de seguridad automáticas y permitir su restauración.
```

---

# 23. Corrección sobre roles

El SRS define:

- Superadministrador.
- Almacenero.
- Cajero.
- Vendedor.

Debe validarse si todos esos roles existen realmente.

Durante el levantamiento se observa participación de:

- Propietario.
- Esposa.
- Vendedores.
- Trabajadores de carga.

### Propuesta inicial

```text
Administrador / Propietario
Administrador secundario
Vendedor
Operador de almacén
```

Otros roles deberán agregarse conforme se valide la organización.

---

# 24. Matriz inicial de clasificación recomendada

| Requisito / Función | Estado recomendado |
|---|---|
| Kárdex | CONFIRMADO |
| Control de stock | CONFIRMADO |
| Ingreso de mercadería | CONFIRMADO |
| Salida de mercadería | CONFIRMADO |
| Multialmacén | CONFIRMADO |
| Traslado entre almacenes | CONFIRMADO |
| Categorías de productos | CONFIRMADO |
| Venta por unidad | CONFIRMADO |
| Venta por caja | CONFIRMADO |
| Sacos como presentación | CONFIRMADO |
| Proforma / orden de despacho | CONFIRMADO |
| Impresión de documento de carga | CONFIRMADO |
| Catálogo de clientes | ACEPTADO |
| Aplicativo móvil | ACEPTADO / POR VALIDAR ALCANCE |
| Operación offline | ACEPTADO / PROPUESTO TÉCNICO |
| Sincronización automática | PROPUESTO |
| GPS | FUTURO |
| Ticket Bluetooth | PROPUESTO |
| Código de barras | POR VALIDAR |
| Stock mínimo | PROPUESTO |
| Lotes | POR VALIDAR |
| Fecha de vencimiento | POR VALIDAR |
| Crédito de clientes | POR VALIDAR |
| Límites de crédito | POR VALIDAR |
| Facturación electrónica SUNAT | POR VALIDAR |
| Nota de crédito electrónica | POR VALIDAR |
| GRE | POR VALIDAR / FUTURO |
| Promedio ponderado | POR VALIDAR |
| Rentabilidad por producto | PROPUESTO |
| Comparación de vendedores | PROPUESTO |
| GPS de entregas | FUTURO |
| VPN específica | PROPUESTO TÉCNICO |
| Filtrado MAC | PROPUESTO TÉCNICO |
| Backup automático | PROPUESTO / RECOMENDADO |
| Auditoría de operaciones | PROPUESTO / RECOMENDADO |

---

# 25. Nueva estructura recomendada para cada requisito

Ejemplo:

```markdown
### RF-15 – Traslado entre almacenes

**Descripción:**  
El sistema debe permitir trasladar mercadería entre almacenes cuando el almacén principal no disponga de espacio suficiente.

**Estado:** CONFIRMADO

**Prioridad:** ALTA

**Fuente:** Audio de levantamiento – conversación sobre desborde físico del almacén.

**Actor:** Administrador / Operador de almacén.

**Criterio de aceptación:**

- Seleccionar almacén origen.
- Seleccionar almacén destino.
- Seleccionar producto.
- Indicar cantidad.
- Confirmar movimiento.
- Descontar cantidad del origen.
- Incrementar cantidad en destino.
- Mantener sin cambios el stock global de la empresa.
- Registrar fecha, usuario y motivo.
```

Esta estructura mejora considerablemente la trazabilidad.

---

# 26. Preguntas para la próxima reunión con el cliente

## Inventario

1. ¿Necesita conocer cajas cerradas y unidades sueltas por separado?
2. ¿Los sacos se venden únicamente completos?
3. ¿Algún producto se vende por kilogramo?
4. ¿Manejan fechas de vencimiento?
5. ¿Manejan lotes?
6. ¿Realizan inventarios físicos periódicos?

## Precios

7. ¿Cuántos tipos de precio existen?
8. ¿Hay precio mayorista?
9. ¿Hay precio minorista?
10. ¿El vendedor puede modificar un precio?

## Clientes

11. ¿Realizan ventas al crédito?
12. ¿Cómo controlan actualmente las deudas?
13. ¿Necesitan límites de crédito?
14. ¿Aceptan pagos parciales?

## Vendedores

15. ¿Los vendedores llevan mercadería propia durante el día?
16. ¿Cada vendedor utiliza un vehículo?
17. ¿Un vehículo puede ser utilizado por diferentes vendedores?
18. ¿Qué información debe registrar el vendedor durante una venta?
19. ¿Qué ocurre con los productos sobrantes al finalizar el día?

## Facturación

20. ¿Desea integrar facturación electrónica desde la primera versión?
21. ¿Actualmente utiliza algún sistema de facturación?
22. ¿Quién emite las facturas y boletas?
23. ¿Qué funciones mantiene actualmente el contador?

## Infraestructura

24. ¿Cuántas computadoras utilizarán el sistema?
25. ¿Cuántos celulares utilizarán los vendedores?
26. ¿El propietario necesita ingresar al sistema cuando está fuera del negocio?
27. ¿Dispone de conexión estable a Internet?

---

# 27. Recomendación para la versión 1.1 del SRS

La siguiente versión del SRS debería incorporar para cada requisito:

```text
Código
Nombre
Descripción
Actor
Prioridad
Estado
Fuente
Regla de negocio relacionada
Criterios de aceptación
Dependencias
Observaciones
```

Ejemplo:

```text
Código: RF-15
Nombre: Traslado entre almacenes
Prioridad: Alta
Estado: Confirmado
Fuente: Audio de levantamiento
```

---

# 28. Priorización recomendada

Se recomienda emplear la metodología **MoSCoW**.

## MUST – Obligatorio

- Kárdex.
- Productos.
- Categorías.
- Stock.
- Ingresos.
- Salidas.
- Almacenes.
- Traslados.
- Unidades y empaques.
- Pedidos.
- Proformas.
- Despachos.
- Usuarios.
- Auditoría básica.

## SHOULD – Importante

- Clientes.
- Stock mínimo.
- Liquidación de vendedores.
- Retorno de mercadería.
- Reportes.
- Backup automático.

## COULD – Deseable

- App móvil.
- Modo offline.
- Ticket Bluetooth.
- Código de barras.
- GPS.

## WON'T – Por ahora / futura versión

- Optimización de rutas.
- Analítica avanzada.
- Predicción de demanda.
- Automatizaciones comerciales avanzadas.

La clasificación final deberá ser validada con el cliente.

---

# 29. Conclusión

El documento SRS de **AgroControl Pro** constituye una buena base para el desarrollo del sistema, pero antes de considerarlo definitivo se recomienda realizar una segunda iteración de especificación.

La principal corrección consiste en diferenciar claramente:

```text
NECESIDAD DEL CLIENTE
        ↓
REQUISITO
        ↓
PROPUESTA DE SOLUCIÓN
        ↓
DECISIÓN ARQUITECTÓNICA
        ↓
TECNOLOGÍA
```

Ejemplo:

```text
Necesidad:
El vendedor debe trabajar donde no hay Internet.

Requisito:
El sistema debe permitir registrar ventas sin conectividad.

Arquitectura:
Aplicación móvil offline-first.

Tecnología posible:
Android + SQLite + API de sincronización.
```

Esto evitará que una decisión técnica específica se convierta prematuramente en una obligación contractual.

La versión corregida del SRS debería identificar de forma explícita cuáles requisitos están:

- CONFIRMADOS.
- ACEPTADOS.
- PROPUESTOS.
- POR VALIDAR.
- PLANIFICADOS PARA FUTURO.

Con esta modificación, AgroControl Pro dispondrá de una especificación mucho más precisa, trazable y adecuada para desarrollar el sistema por iteraciones y validar cada módulo con el cliente antes de su implementación.
---

# 30. Corrección adicional: Arquitectura operativa PC local + dispositivos móviles

Durante la definición del sistema se establece que **AgroControl Pro tendrá dos componentes operativos principales que trabajarán de manera integrada**:

1. **Sistema principal alojado y controlado desde una PC ubicada en el local comercial.**
2. **Componente móvil utilizado por los trabajadores responsables de la distribución y ventas en campo.**

Esta arquitectura debe incorporarse de forma explícita en el SRS porque afecta el diseño funcional, la infraestructura, la seguridad, la sincronización de información y los permisos de usuario.

---

## 30.1. PC del local como sistema principal

La **PC ubicada en el local comercial** será el punto central de operación y administración del sistema.

En esta computadora se alojará o ejecutará el **sistema principal de AgroControl Pro**, desde donde se realizará el control general del negocio.

### Funciones principales de la PC

Desde la PC se deberá poder administrar:

- Productos.
- Categorías.
- Presentaciones y unidades de medida.
- Almacenes.
- Stock.
- Kárdex.
- Entradas de mercadería.
- Salidas de mercadería.
- Traslados entre almacenes.
- Clientes.
- Pedidos.
- Proformas.
- Órdenes de despacho.
- Vendedores.
- Trabajadores.
- Vehículos.
- Cargas de distribución.
- Retorno de mercadería.
- Liquidaciones.
- Precios.
- Usuarios y permisos.
- Reportes.
- Auditoría.
- Configuración general del sistema.

### Rol arquitectónico

La PC funcionará como:

```text
PC DEL LOCAL
      ↓
SISTEMA PRINCIPAL AGROCONTROL PRO
      ↓
BASE DE DATOS CENTRAL
      ↓
CONTROL DE INVENTARIO, VENTAS Y DISTRIBUCIÓN
```

La información registrada desde los dispositivos móviles deberá terminar consolidándose en esta base de datos central.

### Estado

**CONFIRMADO**

---

# 31. Dispositivos móviles para distribución

Los dispositivos móviles —principalmente celulares— constituirán una extensión del sistema principal.

Serán utilizados por los trabajadores encargados de:

- Reparto.
- Distribución.
- Venta en ruta.
- Entrega de pedidos.
- Registro de cobranza.
- Registro de devoluciones o sobrantes.

Los trabajadores **no administrarán todo el sistema** desde el celular.

Su acceso estará limitado a las funciones necesarias para ejecutar sus actividades de distribución.

---

## 31.1. Funciones del módulo móvil

El módulo móvil debería permitir, según el rol del trabajador:

- Iniciar sesión.
- Identificar al trabajador.
- Consultar la mercadería asignada.
- Consultar pedidos asignados.
- Consultar clientes.
- Visualizar productos autorizados.
- Registrar entrega de mercadería.
- Registrar una venta en ruta.
- Registrar cantidad vendida.
- Registrar forma de pago.
- Registrar cobranza.
- Consultar el stock asignado al vehículo o vendedor.
- Registrar mercadería sobrante.
- Registrar devolución.
- Confirmar una entrega.
- Sincronizar información con el sistema principal.

### Restricción recomendada

Los trabajadores no deberían poder desde el móvil:

- Crear usuarios administradores.
- Modificar configuraciones globales.
- Modificar el Kárdex histórico.
- Eliminar ventas confirmadas.
- Alterar libremente los precios autorizados.
- Modificar existencias del almacén principal.
- Cambiar información financiera sensible sin autorización.

### Estado

**CONFIRMADO EN CONCEPTO / ALCANCE DETALLADO POR VALIDAR**

---

# 32. Flujo general del sistema

La arquitectura funcional puede representarse inicialmente de la siguiente manera:

```text
                   ┌───────────────────────────────┐
                   │        LOCAL COMERCIAL        │
                   │                               │
                   │   ┌───────────────────────┐   │
                   │   │      PC PRINCIPAL     │   │
                   │   │    AGROCONTROL PRO    │   │
                   │   └───────────┬───────────┘   │
                   │               │               │
                   │   ┌───────────▼───────────┐   │
                   │   │ BASE DE DATOS CENTRAL │   │
                   │   └───────────┬───────────┘   │
                   └───────────────┼───────────────┘
                                   │
                         SINCRONIZACIÓN DE DATOS
                                   │
             ┌─────────────────────┼─────────────────────┐
             │                     │                     │
       ┌─────▼─────┐         ┌─────▼─────┐         ┌─────▼─────┐
       │ CELULAR 1 │         │ CELULAR 2 │   ...   │ CELULAR N │
       │ Vendedor  │         │ Repartidor│         │ Trabajador│
       └───────────┘         └───────────┘         └───────────┘
             │                     │                     │
             └─────────────────────┴─────────────────────┘
                                   │
                       DISTRIBUCIÓN / VENTA EN RUTA
```

---

# 33. Flujo operacional propuesto

## 33.1. Preparación en el local

```text
PC PRINCIPAL
    ↓
Registrar / recibir pedido
    ↓
Consultar stock
    ↓
Preparar proforma u orden de despacho
    ↓
Asignar mercadería a trabajador / vehículo
    ↓
Generar carga de distribución
    ↓
Enviar información necesaria al dispositivo móvil
```

---

## 33.2. Trabajo del vendedor o distribuidor

```text
CELULAR DEL TRABAJADOR
    ↓
Iniciar sesión
    ↓
Consultar carga asignada
    ↓
Consultar clientes / pedidos
    ↓
Realizar distribución
    ↓
Registrar venta o entrega
    ↓
Registrar pago
    ↓
Actualizar stock móvil
    ↓
Guardar operación
```

---

## 33.3. Retorno al establecimiento

```text
TRABAJADOR REGRESA
    ↓
Dispositivo móvil se sincroniza
    ↓
PC PRINCIPAL recibe movimientos
    ↓
Se comparan:
    - carga inicial
    - ventas
    - entregas
    - cobranzas
    - sobrantes
    - devoluciones
    ↓
Liquidación del trabajador
    ↓
Actualización del Kárdex central
```

---

# 34. Concepto de inventario central y bodega móvil

Para evitar inconsistencias, se recomienda modelar el inventario en dos niveles.

## Inventario central

Corresponde a los productos almacenados físicamente en los almacenes del negocio.

Ejemplo:

```text
ALMACÉN PRINCIPAL
Urea              200 sacos
Herbicida X       120 unidades
Coricerdo          80 unidades
```

## Inventario de distribución

Cuando la mercadería se entrega a un trabajador o vehículo para una ruta, el sistema puede transferir temporalmente dicha mercadería a una ubicación lógica.

Ejemplo:

```text
BODEGA MÓVIL
Vehículo ABC-123

Herbicida X       20 unidades
Fungicida Y       15 unidades
Pesticida Z       30 unidades
```

Esto permite conocer:

- Cuánto queda en el almacén.
- Cuánto salió a distribución.
- Qué trabajador tiene la mercadería.
- Qué vehículo transporta los productos.
- Cuánto fue vendido.
- Cuánto debe regresar.

---

# 35. Regla de negocio recomendada para la distribución

Cuando se asigne mercadería a un trabajador:

```text
Stock almacén central
        ↓
Transferencia a distribución
        ↓
Stock móvil / bodega móvil
```

No debería considerarse inmediatamente como una venta.

La venta ocurre cuando el trabajador registra que el producto fue efectivamente vendido o entregado al cliente.

Ejemplo:

```text
Almacén:
100 unidades

Se entregan 20 unidades al vendedor.

Almacén:
80 unidades

Bodega móvil:
20 unidades
```

El trabajador vende:

```text
15 unidades
```

Resultado:

```text
Almacén central:
80 unidades

Bodega móvil:
5 unidades

Vendidas:
15 unidades
```

Al retornar:

```text
5 unidades → regresan al almacén
```

Resultado final:

```text
Almacén:
85 unidades

Vendidas:
15 unidades
```

Esta lógica mantiene la trazabilidad completa del inventario.

---

# 36. Sincronización entre PC y celulares

El sistema deberá definir un mecanismo de sincronización entre el sistema principal y los dispositivos móviles.

## Desde la PC hacia los móviles

La PC podrá enviar:

- Usuarios autorizados.
- Clientes.
- Productos.
- Precios.
- Pedidos.
- Stock asignado.
- Rutas.
- Vehículos.
- Carga inicial.

## Desde los móviles hacia la PC

Los dispositivos podrán enviar:

- Ventas.
- Entregas.
- Cobros.
- Productos devueltos.
- Mercadería sobrante.
- Nuevos pedidos.
- Observaciones.
- Hora de operación.

---

# 37. Operación con y sin Internet

Dado que parte de la distribución puede realizarse en lugares con conectividad limitada, se recomienda una arquitectura tipo:

```text
OFFLINE FIRST
```

Esto significa:

```text
Hay Internet
    ↓
Sincroniza normalmente

No hay Internet
    ↓
La aplicación continúa trabajando
    ↓
Guarda los datos localmente
    ↓
Cuando vuelve la conectividad
    ↓
Sincroniza automáticamente
```

### Requisito recomendado

```text
RF-MOV-02:
El componente móvil deberá permitir registrar las operaciones esenciales de distribución aun cuando temporalmente no exista conectividad con el sistema principal.
```

### Requisito de sincronización

```text
RF-MOV-03:
El componente móvil deberá sincronizar las operaciones pendientes con el sistema central una vez que exista conectividad disponible.
```

### Estado

**ACEPTADO / IMPLEMENTACIÓN TÉCNICA POR DEFINIR**

---

# 38. Arquitectura conceptual actualizada

La arquitectura sugerida para AgroControl Pro queda definida de la siguiente manera:

```text
                        AGROCONTROL PRO
                              │
               ┌──────────────┴──────────────┐
               │                             │
               ▼                             ▼
      SISTEMA ADMINISTRATIVO          SISTEMA MÓVIL
          PC PRINCIPAL                DISTRIBUCIÓN
               │                             │
               │                             │
     Inventario / Kárdex               Vendedores
     Compras                           Repartidores
     Pedidos                           Entregas
     Clientes                          Ventas en ruta
     Almacenes                         Cobros
     Proformas                         Devoluciones
     Despachos                         Stock móvil
     Usuarios                          Pedidos
     Reportes
               │                             │
               └──────────────┬──────────────┘
                              │
                       SINCRONIZACIÓN
                              │
                              ▼
                     BASE DE DATOS CENTRAL
```

---

# 39. Responsabilidades por plataforma

| Funcionalidad | PC principal | Celular |
|---|:---:|:---:|
| Administrar productos | ✅ | ❌ |
| Administrar almacenes | ✅ | ❌ |
| Consultar stock general | ✅ | Limitado |
| Registrar compras | ✅ | ❌ |
| Registrar ingresos | ✅ | ❌ |
| Crear pedidos | ✅ | ✅ |
| Crear proformas | ✅ | Opcional |
| Preparar despacho | ✅ | ❌ |
| Asignar mercadería a vehículo | ✅ | ❌ |
| Consultar carga asignada | ✅ | ✅ |
| Registrar venta en ruta | ✅ | ✅ |
| Registrar cobranza | ✅ | ✅ |
| Registrar sobrantes | ✅ | ✅ |
| Registrar devoluciones | ✅ | ✅ |
| Liquidar vendedor | ✅ | Consulta |
| Modificar precios | ✅ | ❌ |
| Administrar usuarios | ✅ | ❌ |
| Reportes | ✅ | Limitado |
| Auditoría | ✅ | ❌ |

---

# 40. Correcciones al alcance funcional del SRS

Se recomienda reorganizar los módulos de la siguiente manera:

## SISTEMA PRINCIPAL – PC

### MOD-01
Catálogo de Productos

### MOD-02
Almacenes, Stock y Kárdex

### MOD-03
Compras e Ingresos

### MOD-04
Pedidos, Proformas y Despacho

### MOD-05
Clientes

### MOD-06
Distribución y Vehículos

### MOD-07
Liquidación y Retornos

### MOD-08
Caja / Facturación

### MOD-09
Usuarios, Seguridad y Auditoría

### MOD-10
Reportes

---

## SISTEMA MÓVIL – CELULARES

### MOD-M01
Autenticación del Trabajador

### MOD-M02
Carga y Stock Asignado

### MOD-M03
Pedidos y Clientes

### MOD-M04
Venta / Entrega en Ruta

### MOD-M05
Cobranza

### MOD-M06
Devoluciones y Sobrantes

### MOD-M07
Sincronización

---

# 41. Nuevos requisitos funcionales sugeridos

## RF-71 – Gestión de terminal principal

El sistema deberá disponer de una aplicación principal operativa desde la PC del establecimiento comercial para realizar la administración general del negocio.

**Estado:** CONFIRMADO

---

## RF-72 – Registro de dispositivos móviles

El sistema deberá permitir asociar dispositivos móviles autorizados a los trabajadores encargados de distribución.

**Estado:** PROPUESTO / POR VALIDAR

---

## RF-73 – Asignación de usuario móvil

Cada trabajador deberá autenticarse con una cuenta individual antes de acceder al módulo móvil.

**Estado:** RECOMENDADO

---

## RF-74 – Asignación de mercadería a trabajador o vehículo

El sistema principal deberá permitir asignar mercadería a un trabajador o vehículo antes de iniciar la distribución.

**Estado:** CONFIRMADO / ACEPTADO

---

## RF-75 – Inventario móvil

El sistema deberá mantener un saldo temporal de la mercadería asignada a cada trabajador o vehículo.

**Estado:** ACEPTADO

---

## RF-76 – Registro de operaciones en ruta

El módulo móvil deberá permitir registrar ventas, entregas, cobranzas, devoluciones y sobrantes realizados durante la distribución.

**Estado:** ACEPTADO

---

## RF-77 – Sincronización de movimientos

El módulo móvil deberá transmitir al sistema principal las operaciones realizadas durante la ruta.

**Estado:** ACEPTADO

---

## RF-78 – Trabajo temporal sin conectividad

El módulo móvil deberá permitir continuar registrando operaciones esenciales cuando no exista conectividad temporal.

**Estado:** ACEPTADO / PROPUESTA TÉCNICA

---

## RF-79 – Consolidación central

La PC principal deberá consolidar la información proveniente de todos los dispositivos móviles autorizados.

**Estado:** CONFIRMADO POR ARQUITECTURA

---

## RF-80 – Liquidación de distribución

El sistema principal deberá comparar la mercadería inicialmente asignada con las ventas registradas y la mercadería retornada para efectuar la liquidación del trabajador.

**Estado:** CONFIRMADO / ACEPTADO

---

# 42. Requisitos no funcionales adicionales

## RNF-11 – Arquitectura centralizada

La información oficial del negocio deberá consolidarse en una base de datos central administrada por el sistema principal.

---

## RNF-12 – Sincronización confiable

Las operaciones creadas desde los dispositivos móviles no deberán perderse durante interrupciones temporales de conectividad.

---

## RNF-13 – Identificación de origen

Cada operación sincronizada deberá registrar:

- trabajador;
- dispositivo;
- fecha;
- hora;
- tipo de operación.

---

## RNF-14 – Seguridad por roles

Las funciones disponibles en la PC y en los dispositivos móviles deberán depender de los permisos asignados al usuario.

---

## RNF-15 – Control central

Las operaciones administrativas críticas deberán realizarse únicamente desde cuentas autorizadas del sistema principal.

---

# 43. Regla arquitectónica principal

A partir de esta corrección, debe quedar explícito que:

> **La PC del establecimiento constituye el núcleo administrativo y de control de AgroControl Pro, mientras que los celulares constituyen terminales operativas destinadas principalmente a las actividades de distribución realizadas por los trabajadores.**

Los dispositivos móviles no reemplazan al sistema principal.

Funcionan como una extensión del sistema central.

La arquitectura deberá garantizar:

```text
CONTROL CENTRAL EN LA PC
           +
OPERACIÓN DISTRIBUIDA EN MÓVILES
           +
SINCRONIZACIÓN DE INFORMACIÓN
           =
AGROCONTROL PRO
```

---

# 44. Conclusión actualizada

Con esta corrección, AgroControl Pro debe entenderse como un sistema compuesto por dos entornos complementarios:

### Entorno administrativo

```text
PC DEL LOCAL
```

Responsable del:

- control;
- administración;
- inventario;
- Kárdex;
- configuración;
- despacho;
- liquidación;
- reportes.

### Entorno operativo

```text
CELULARES DE LOS TRABAJADORES
```

Responsable principalmente de:

- distribución;
- ventas en ruta;
- entregas;
- cobranzas;
- devoluciones;
- sincronización.

El flujo general del sistema será:

```text
PC PRINCIPAL
      ↓
PLANIFICACIÓN Y ASIGNACIÓN
      ↓
CELULARES DE TRABAJADORES
      ↓
DISTRIBUCIÓN / VENTAS
      ↓
SINCRONIZACIÓN
      ↓
PC PRINCIPAL
      ↓
CONTROL, KÁRDEX Y LIQUIDACIÓN
```

Esta arquitectura deberá reflejarse tanto en la siguiente versión del SRS como en los futuros diagramas de arquitectura, casos de uso, modelo de base de datos y diseño de interfaces del sistema.
