# AgroControl Pro – Dossier de Validación Final
## Para el Sr. Alipio — Propietario del Negocio
### Fecha: Septiembre 2026 | Sistema: AgroControl Pro v1.0

---

## 🎯 ¿Qué es este documento?

Este dossier le permite al propietario verificar que el sistema AgroControl Pro cumple exactamente lo que se prometió. Contiene preguntas de validación funcional organizadas por área del negocio. Para cada punto, el técnico demostrará en vivo y el propietario confirma con su firma.

---

## ÁREA 1 – Gestión de Productos e Inventario

### Preguntas de validación:

**P1.1** ¿Puede registrar un producto nuevo con su nombre, unidad de medida y precio de costo?
> ✅ Demostración: Registrar el producto "Fertilizante NPK 50kg" con precio de compra S/ 85.00.

**P1.2** ¿Puede registrar una compra (entrada al almacén) y ver cómo aumenta el stock?
> ✅ Demostración: Registrar compra de 20 sacos de "Fertilizante NPK". Verificar que el Kárdex registre la entrada.

**P1.3** ¿Puede ver el historial completo de movimientos de un producto (Kárdex)?
> ✅ Demostración: Abrir el Kárdex del "Fertilizante NPK" y mostrar entradas, salidas y saldo.

**P1.4** ¿Puede hacer una toma de inventario físico y registrar diferencias?
> ✅ Demostración: Crear un inventario físico, ingresar cantidades contadas, ver el reporte de diferencias.

| Punto | Conforme | Observaciones |
|---|---|---|
| P1.1 | ☐ Sí ☐ No | |
| P1.2 | ☐ Sí ☐ No | |
| P1.3 | ☐ Sí ☐ No | |
| P1.4 | ☐ Sí ☐ No | |

---

## ÁREA 2 – Ventas y Distribución (Repartidores)

### Preguntas de validación:

**P2.1** ¿Puede crear un reparto para un repartidor con los productos y cantidades del día?
> ✅ Demostración: Crear reparto para "Juan Pérez" con 10 sacos de fertilizante.

**P2.2** ¿El sistema descuenta automáticamente del almacén los productos despachados al repartidor?
> ✅ Demostración: Ver que el stock del almacén principal disminuye al despachar al repartidor.

**P2.3** ¿Al final del día, puede registrar cuánto vendió el repartidor, cuánto cobró y qué sobró?
> ✅ Demostración: Liquidar el reparto de "Juan Pérez": vendió 8 sacos, cobró S/ 520.00, devolvió 2 sacos.

**P2.4** ¿Los productos devueltos regresan al almacén automáticamente?
> ✅ Demostración: Verificar que los 2 sacos devueltos aparecen de nuevo en el stock.

**P2.5** ¿Puede ver un resumen de lo que cada repartidor vendió y cobró en el día?
> ✅ Demostración: Mostrar reporte de liquidación del día.

| Punto | Conforme | Observaciones |
|---|---|---|
| P2.1 | ☐ Sí ☐ No | |
| P2.2 | ☐ Sí ☐ No | |
| P2.3 | ☐ Sí ☐ No | |
| P2.4 | ☐ Sí ☐ No | |
| P2.5 | ☐ Sí ☐ No | |

---

## ÁREA 3 – Aplicación del Celular para Repartidores

### Preguntas de validación:

**P3.1** ¿El repartidor puede ver desde su celular los productos que lleva ese día?
> ✅ Demostración: Mostrar la lista de carga en el celular de un repartidor.

**P3.2** ¿El repartidor puede registrar una venta en el celular aunque no tenga señal?
> ✅ Demostración: Activar el modo avión en el celular, registrar una venta, desactivar modo avión y sincronizar.

**P3.3** ¿Al sincronizar, las ventas del celular aparecen en el sistema de la oficina?
> ✅ Demostración: Después de sincronizar, mostrar en la PC las ventas registradas en el celular.

**P3.4** ¿Si hay un problema con una venta del celular, el administrador puede revisarla y resolverla?
> ✅ Demostración: Mostrar el módulo de "Operaciones Observadas" y el proceso de aprobación/rechazo.

| Punto | Conforme | Observaciones |
|---|---|---|
| P3.1 | ☐ Sí ☐ No | |
| P3.2 | ☐ Sí ☐ No | |
| P3.3 | ☐ Sí ☐ No | |
| P3.4 | ☐ Sí ☐ No | |

---

## ÁREA 4 – Clientes y Cuentas por Cobrar

### Preguntas de validación:

**P4.1** ¿Puede registrar clientes con su nombre y dirección?
> ✅ Demostración: Crear el cliente "Agropecuaria El Sol S.R.L."

**P4.2** ¿Puede ver cuánto debe cada cliente y registrar sus pagos?
> ✅ Demostración: Mostrar el estado de cuenta de un cliente con saldo pendiente y registrar un pago.

| Punto | Conforme | Observaciones |
|---|---|---|
| P4.1 | ☐ Sí ☐ No | |
| P4.2 | ☐ Sí ☐ No | |

---

## ÁREA 5 – Reportes

### Preguntas de validación:

**P5.1** ¿Puede ver un reporte de ventas del día, semana o mes?
> ✅ Demostración: Generar reporte de ventas del mes en curso.

**P5.2** ¿Los montos aparecen en soles (S/) y las fechas en formato día/mes/año?
> ✅ Demostración: Verificar formato en cualquier reporte impreso o exportado.

**P5.3** ¿Puede exportar reportes a Excel o PDF?
> ✅ Demostración: Exportar el reporte de Kárdex a CSV.

| Punto | Conforme | Observaciones |
|---|---|---|
| P5.1 | ☐ Sí ☐ No | |
| P5.2 | ☐ Sí ☐ No | |
| P5.3 | ☐ Sí ☐ No | |

---

## ÁREA 6 – Seguridad y Usuarios

### Preguntas de validación:

**P6.1** ¿Puede crear usuarios con diferentes roles (administrador, repartidor, bodeguero)?
> ✅ Demostración: Crear usuario "Maria García" con rol de Vendedor.

**P6.2** ¿Un usuario con rol de repartidor NO puede cambiar precios ni ver reportes financieros?
> ✅ Demostración: Iniciar sesión como repartidor y verificar que no tiene acceso a módulos restringidos.

**P6.3** ¿El sistema registra quién hizo qué y a qué hora (auditoría)?
> ✅ Demostración: Mostrar el log de auditoría con acciones recientes.

| Punto | Conforme | Observaciones |
|---|---|---|
| P6.1 | ☐ Sí ☐ No | |
| P6.2 | ☐ Sí ☐ No | |
| P6.3 | ☐ Sí ☐ No | |

---

## ÁREA 7 – Copias de Seguridad y Continuidad

### Preguntas de validación:

**P7.1** ¿El sistema hace una copia de seguridad automática todos los días?
> ✅ Demostración: Mostrar la carpeta `backups/` con archivos generados automáticamente.

**P7.2** ¿Si se formatea la PC, se puede recuperar el sistema y los datos?
> ✅ Demostración: Mostrar el manual de reinstalación y el resultado de la prueba de restauración documentada.

**P7.3** ¿Puede ver el estado del sistema en tiempo real (si funciona correctamente)?
> ✅ Demostración: Abrir `http://localhost/api/health` y mostrar el panel de salud del sistema.

| Punto | Conforme | Observaciones |
|---|---|---|
| P7.1 | ☐ Sí ☐ No | |
| P7.2 | ☐ Sí ☐ No | |
| P7.3 | ☐ Sí ☐ No | |

---

## ✋ PREGUNTAS PENDIENTES DE CONFIRMAR (por el propietario)

Estas preguntas quedaron como "pendiente de validar" durante el desarrollo. Sus respuestas determinan si se necesita configuración adicional:

| # | Pregunta | Respuesta del Sr. Alipio |
|---|---|---|
| Q1 | ¿Cuántas computadoras (además de la principal) usarán el sistema en el local? | |
| Q2 | ¿Cuántos celulares y repartidores usarán la app móvil? ¿Son celulares de la empresa o propios? | |
| Q3 | ¿El propietario necesita acceder al sistema desde fuera del local (casa, viajes)? | |
| Q4 | ¿La conexión a Internet del local es estable? ¿Tiene IP fija o cambia? | |
| Q5 | ¿Los repartidores necesitan sincronizar en ruta (sin regresar al local) o solo al regresar? | |

---

## 📋 ACTA DE CONFORMIDAD

Yo, **_________________________________**, propietario del negocio, declaro que he revisado y validado el sistema AgroControl Pro en las áreas descritas arriba y que los puntos marcados como conformes han sido demostrados satisfactoriamente.

**Fecha de validación:** _____ / _____ / 2026

**Firma del propietario:** ___________________________________

**Firma del técnico responsable:** ___________________________________

---

## 📌 FUNCIONALIDADES COMPROMETIDAS PARA VERSIONES FUTURAS

Las siguientes funcionalidades fueron identificadas durante el levantamiento pero están **fuera del alcance de esta versión**. Se documentan para referencia futura:

- Integración con SUNAT / Facturación Electrónica (GRE)
- Lectura de códigos de barras con cámara del celular
- Acceso seguro remoto del propietario desde fuera del local (requiere confirmar Q3 y Q4)
- Aplicación móvil disponible en la tienda Google Play (actualmente distribución directa APK)
