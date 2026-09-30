import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ShoppingCart,
  Users,
  Search,
  Package,
  Plus,
  Minus,
  Trash2,
  DollarSign,
  CreditCard,
  Smartphone,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Truck,
  FileText,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useMobileStore } from '../../store/mobileStore';
import { DetalleOperacionSync, OperacionSyncLocal } from '../../types';

export const NuevaVenta: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedClienteId = searchParams.get('clienteId');

  const {
    clientes,
    cargaActiva,
    registrarVentaLocal,
    isSyncing,
  } = useMobileStore();

  // 1. ESTADO: Cliente seleccionado
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<string>(
    preselectedClienteId || '',
  );
  const [busquedaCliente, setBusquedaCliente] = useState('');
  const [mostrarSelectorClientes, setMostrarSelectorClientes] = useState(false);

  // 2. ESTADO: Carrito de ítems seleccionados (clave = producto_id)
  // Guarda: cantidad_paquetes (cajas), cantidad_sueltas (unidades)
  interface LineaCarrito {
    producto_id: string;
    producto_nombre: string;
    presentacion_id?: string;
    presentacion_nombre?: string;
    factor_conversion: number;
    precio_unitario: number;
    cantidad_cajas: number;
    cantidad_sueltas: number;
    cantidad_total_base: number;
    subtotal: number;
  }
  const [carrito, setCarrito] = useState<{ [productoId: string]: LineaCarrito }>({});

  // 3. ESTADO: Método de Pago y Cobranza
  const [metodoPago, setMetodoPago] = useState<
    'EFECTIVO' | 'YAPE' | 'PLIN' | 'TRANSFERENCIA' | 'PENDIENTE'
  >('EFECTIVO');
  const [montoRecibido, setMontoRecibido] = useState<string>('');
  const [observaciones, setObservaciones] = useState<string>('');

  // 4. ESTADO: Feedback y modal de éxito
  const [guardando, setGuardando] = useState(false);
  const [errorVenta, setErrorVenta] = useState<string | null>(null);
  const [ventaConfirmada, setVentaConfirmada] = useState<OperacionSyncLocal | null>(null);

  // Si cambia el preselectedClienteId en la URL, actualizar estado
  useEffect(() => {
    if (preselectedClienteId) {
      setClienteSeleccionadoId(preselectedClienteId);
    }
  }, [preselectedClienteId]);

  // Cliente activo
  const clienteActivo = useMemo(() => {
    return clientes.find((c) => c.id === clienteSeleccionadoId) || null;
  }, [clientes, clienteSeleccionadoId]);

  // Lista filtrada de clientes para el modal selector
  const clientesFiltrados = useMemo(() => {
    const q = busquedaCliente.toLowerCase().trim();
    if (!q) return clientes.slice(0, 15);
    return clientes
      .filter(
        (c) =>
          c.razon_social.toLowerCase().includes(q) ||
          c.numero_documento.includes(q),
      )
      .slice(0, 20);
  }, [clientes, busquedaCliente]);

  // 5. OBTENER PRECIO AUTORIZADO SEGÚN CLIENTE
  // Regla: No editable libremente por el vendedor (SKILL 2 Secc 4 y 7)
  const obtenerPrecioProducto = (productoId: string, precioBase: number): number => {
    if (!clienteActivo || !clienteActivo.lista_precio || !clienteActivo.lista_precio.items) {
      return precioBase;
    }
    const itemPrecio = clienteActivo.lista_precio.items.find(
      (ip: any) => ip.producto_id === productoId,
    );
    return itemPrecio ? Number(itemPrecio.precio) : precioBase;
  };

  // 6. PRODUCTOS DISPONIBLES EN BODEGA MÓVIL
  const itemsEnCarga = useMemo(() => {
    if (!cargaActiva || !cargaActiva.items) return [];
    return cargaActiva.items.map((item) => {
      const precioAutorizado = obtenerPrecioProducto(
        item.producto_id,
        item.precio_referencial || 10,
      );
      return {
        ...item,
        precio_autorizado: precioAutorizado,
      };
    });
  }, [cargaActiva, clienteActivo]);

  // Manejador de incremento / decremento
  const actualizarCantidad = (
    itemCarga: (typeof itemsEnCarga)[0],
    tipo: 'cajas' | 'sueltas',
    delta: number,
  ) => {
    setErrorVenta(null);
    const id = itemCarga.producto_id;
    const factor = itemCarga.presentacion_factor || itemCarga.factor_conversion || 1;
    const current = carrito[id] || {
      producto_id: itemCarga.producto_id,
      producto_nombre: itemCarga.producto_nombre,
      presentacion_id: itemCarga.presentacion_id,
      presentacion_nombre: itemCarga.presentacion_nombre,
      factor_conversion: factor,
      precio_unitario: itemCarga.precio_autorizado,
      cantidad_cajas: 0,
      cantidad_sueltas: 0,
      cantidad_total_base: 0,
      subtotal: 0,
    };

    let newCajas = current.cantidad_cajas;
    let newSueltas = current.cantidad_sueltas;

    if (tipo === 'cajas') {
      newCajas = Math.max(0, newCajas + delta);
    } else {
      newSueltas = Math.max(0, newSueltas + delta);
    }

    const totalBase = newCajas * factor + newSueltas;

    // Validar contra stock local en bodega móvil
    if (totalBase > itemCarga.stock_actual_bodega_movil) {
      setErrorVenta(
        `No puede agregar ${totalBase} unidades de '${itemCarga.producto_nombre}'. Stock en vehículo: ${itemCarga.stock_actual_bodega_movil}`,
      );
      return;
    }

    if (totalBase === 0) {
      const nuevoCarrito = { ...carrito };
      delete nuevoCarrito[id];
      setCarrito(nuevoCarrito);
    } else {
      const subtotal = Number((totalBase * itemCarga.precio_autorizado).toFixed(2));
      setCarrito({
        ...carrito,
        [id]: {
          ...current,
          cantidad_cajas: newCajas,
          cantidad_sueltas: newSueltas,
          cantidad_total_base: totalBase,
          subtotal,
        },
      });
    }
  };

  // Totales
  const lineasCarrito = Object.values(carrito);
  const totalVenta = Number(
    lineasCarrito.reduce((acc, l) => acc + l.subtotal, 0).toFixed(2),
  );
  const totalUnidades = lineasCarrito.reduce((acc, l) => acc + l.cantidad_total_base, 0);

  // Vuelto calculado para efectivo
  const montoRecibidoNum = parseFloat(montoRecibido) || totalVenta;
  const vuelto =
    metodoPago === 'EFECTIVO' && montoRecibidoNum >= totalVenta
      ? Number((montoRecibidoNum - totalVenta).toFixed(2))
      : 0;

  // 7. CONFIRMACIÓN Y SALVAGUARDA DE LA VENTA OFFLINE
  const handleConfirmarVenta = async () => {
    if (!clienteActivo) {
      setErrorVenta('Debe seleccionar un cliente para registrar la venta.');
      return;
    }
    if (lineasCarrito.length === 0) {
      setErrorVenta('El carrito de compras está vacío. Agregue al menos un producto.');
      return;
    }
    if (!cargaActiva) {
      setErrorVenta('No existe una carga de vehículo activa para registrar operaciones.');
      return;
    }

    setGuardando(true);
    setErrorVenta(null);

    try {
      const detalles: DetalleOperacionSync[] = lineasCarrito.map((l) => ({
        producto_id: l.producto_id,
        producto_nombre: l.producto_nombre,
        presentacion_id: l.presentacion_id,
        presentacion_nombre: l.presentacion_nombre,
        cantidad: l.cantidad_total_base,
        precio_unitario: l.precio_unitario,
        subtotal: l.subtotal,
      }));

      const montoCobrado =
        metodoPago === 'PENDIENTE'
          ? 0
          : metodoPago === 'EFECTIVO'
          ? totalVenta
          : totalVenta;

      const operacionCreada = await registrarVentaLocal({
        clienteId: clienteActivo.id,
        clienteNombre: clienteActivo.razon_social,
        detalles,
        metodoPago,
        montoCobrado,
        observaciones: observaciones.trim() || undefined,
      });

      // Limpiar formulario y desplegar comprobante digital
      setVentaConfirmada(operacionCreada);
      setCarrito({});
      setObservaciones('');
      setMontoRecibido('');
    } catch (err: any) {
      setErrorVenta(err.message || 'Error al guardar la venta');
    } finally {
      setGuardando(false);
    }
  };

  // =========================================================================
  // VISTA: PANTALLA DE COMPROBANTE / VENTA GUARDADA CON ÉXITO
  // =========================================================================
  if (ventaConfirmada) {
    return (
      <div className="space-y-4">
        <div className="bg-slate-800/90 border border-emerald-500/50 rounded-3xl p-5 text-center shadow-2xl space-y-4">
          <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto border-2 border-emerald-500/40">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-800">
              Venta Guardada con Éxito
            </span>
            <h2 className="text-xl font-black text-white mt-1">
              S/ {ventaConfirmada.total.toFixed(2)}
            </h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              ID Local: {ventaConfirmada.id.substring(0, 13)}...
            </p>
          </div>

          {/* Ticket Resumen */}
          <div className="bg-slate-900/90 rounded-2xl p-4 text-left border border-slate-700/60 space-y-2.5 text-xs">
            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Cliente:</span>
              <span className="font-bold text-white text-right max-w-[200px] truncate">
                {ventaConfirmada.cliente_nombre}
              </span>
            </div>

            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Medio de Pago:</span>
              <span className="font-bold text-emerald-400">{ventaConfirmada.metodo_pago}</span>
            </div>

            <div className="flex justify-between border-b border-slate-800 pb-2">
              <span className="text-slate-400">Total Cobrado:</span>
              <span className="font-bold text-white">
                S/ {(ventaConfirmada.monto_cobrado || 0).toFixed(2)}
              </span>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Ítems Entregados:</span>
              {ventaConfirmada.detalles.map((d, idx) => (
                <div key={idx} className="flex justify-between text-[11px] text-slate-300">
                  <span className="truncate pr-2">
                    {d.cantidad} un x {d.producto_nombre}
                  </span>
                  <span className="font-bold shrink-0">S/ {d.subtotal.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Salvaguarda Offline Notice */}
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl flex items-center gap-2.5 text-left">
            <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
            <p className="text-[11px] text-emerald-200">
              Stock descontado de la bodega móvil local. Transacción encolada para sincronización segura.
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              onClick={() => {
                setVentaConfirmada(null);
                setClienteSeleccionadoId('');
              }}
              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold active:scale-95 transition-all shadow-lg shadow-emerald-950"
            >
              Nueva Venta
            </button>
            <button
              onClick={() => navigate('/movil/sincronizacion')}
              className="py-3 px-4 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-bold active:scale-95 transition-all"
            >
              Ver en Cola
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VISTA PRINCIPAL: FORMULARIO TÁCTIL DE VENTA
  // =========================================================================
  return (
    <div className="space-y-4 pb-20">
      {/* ========================================================================= */}
      {/* 1. SELECCIÓN DE CLIENTE                                                   */}
      {/* ========================================================================= */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-emerald-400" />
            <span>Cliente en Ruta</span>
          </span>

          <button
            onClick={() => setMostrarSelectorClientes(true)}
            className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
          >
            <span>{clienteActivo ? 'Cambiar' : 'Seleccionar'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {clienteActivo ? (
          <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-700/60 flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <h4 className="text-sm font-extrabold text-white truncate">
                {clienteActivo.razon_social}
              </h4>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                {clienteActivo.tipo_documento}: {clienteActivo.numero_documento}
              </p>
            </div>
            {clienteActivo.lista_precio && (
              <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800 shrink-0">
                {clienteActivo.lista_precio.nombre}
              </span>
            )}
          </div>
        ) : (
          <button
            onClick={() => setMostrarSelectorClientes(true)}
            className="w-full py-3 bg-slate-900/60 hover:bg-slate-900 border border-dashed border-slate-700 rounded-xl text-xs text-slate-300 font-bold flex items-center justify-center gap-2"
          >
            <Users className="w-4 h-4 text-emerald-400" />
            <span>Toca para Elegir Cliente</span>
          </button>
        )}
      </div>

      {/* Alerta de Error */}
      {errorVenta && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorVenta}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. CATÁLOGO DISPONIBLE EN EL VEHÍCULO (BODEGA MÓVIL)                       */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-emerald-400" />
            <span>Mercadería en Bodega Móvil ({itemsEnCarga.length})</span>
          </h3>
          <span className="text-[10px] text-slate-400">Precios autorizados S/</span>
        </div>

        {itemsEnCarga.length === 0 ? (
          <div className="text-center py-8 bg-slate-800/40 rounded-2xl border border-slate-800 p-4">
            <Truck className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">
              No hay productos con stock a bordo del vehículo asignado.
            </p>
          </div>
        ) : (
          itemsEnCarga.map((item) => {
            const lineaEnCarrito = carrito[item.producto_id];
            const stockRestante = item.stock_actual_bodega_movil;
            const factor = item.presentacion_factor || item.factor_conversion || 1;
            const tienePresentacion = factor > 1;

            return (
              <div
                key={item.producto_id}
                className={`bg-slate-800/90 border rounded-2xl p-3.5 space-y-3 transition-all ${
                  lineaEnCarrito
                    ? 'border-emerald-500/60 bg-slate-800'
                    : 'border-slate-700/80'
                }`}
              >
                {/* Cabecera del Producto */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="font-extrabold text-sm text-white leading-tight">
                      {item.producto_nombre}
                    </h4>
                    <div className="flex items-center gap-2 mt-1">
                      {item.presentacion_nombre && (
                        <span className="text-[10px] font-semibold text-slate-300 bg-slate-700 px-1.5 py-0.5 rounded">
                          {item.presentacion_nombre}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        Disp: <strong className="text-emerald-400">{stockRestante} un</strong>
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-sm font-black text-emerald-400">
                      S/ {item.precio_autorizado.toFixed(2)}
                    </span>
                    <p className="text-[9px] text-slate-500">c/unidad base</p>
                  </div>
                </div>

                {/* Controles Táctiles de Cantidad */}
                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between gap-2">
                  {tienePresentacion ? (
                    // MODO PAQUETE / CAJA
                    <div className="flex-1 flex items-center justify-between bg-slate-900/80 rounded-xl px-2.5 py-1.5 border border-slate-800">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 block">
                          Cajas (x{factor}):
                        </span>
                        <span className="text-xs font-black text-white">
                          {lineaEnCarrito?.cantidad_cajas || 0}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => actualizarCantidad(item, 'cajas', -1)}
                          disabled={!lineaEnCarrito || lineaEnCarrito.cantidad_cajas <= 0}
                          className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center font-bold active:scale-90"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => actualizarCantidad(item, 'cajas', 1)}
                          disabled={stockRestante < factor}
                          className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white flex items-center justify-center font-bold active:scale-90"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {/* MODO SUELTAS / UNIDADES */}
                  <div className="flex-1 flex items-center justify-between bg-slate-900/80 rounded-xl px-2.5 py-1.5 border border-slate-800">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">
                        Unidades:
                      </span>
                      <span className="text-xs font-black text-white">
                        {lineaEnCarrito?.cantidad_sueltas || 0}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => actualizarCantidad(item, 'sueltas', -1)}
                        disabled={!lineaEnCarrito || lineaEnCarrito.cantidad_sueltas <= 0}
                        className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white flex items-center justify-center font-bold active:scale-90"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => actualizarCantidad(item, 'sueltas', 1)}
                        disabled={stockRestante <= 0}
                        className="w-8 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 text-white flex items-center justify-center font-bold active:scale-90"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subtotal Línea */}
                {lineaEnCarrito && (
                  <div className="flex justify-between items-center bg-emerald-950/30 px-3 py-1.5 rounded-lg border border-emerald-900/40 text-xs">
                    <span className="text-emerald-300 font-semibold">
                      Total: {lineaEnCarrito.cantidad_total_base} un
                    </span>
                    <span className="text-emerald-400 font-black">
                      Subtotal: S/ {lineaEnCarrito.subtotal.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* 3. MOD-M05: REGISTRO DE COBRANZA Y PAGO                                    */}
      {/* ========================================================================= */}
      {lineasCarrito.length > 0 && (
        <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3.5">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span>Medio de Pago y Cobranza</span>
          </h3>

          {/* Selector de Medios de Pago */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'EFECTIVO', label: 'Efectivo', icon: DollarSign },
              { id: 'YAPE', label: 'Yape', icon: Smartphone },
              { id: 'PLIN', label: 'Plin', icon: Smartphone },
              { id: 'TRANSFERENCIA', label: 'Transferencia', icon: CreditCard },
              { id: 'PENDIENTE', label: 'Pendiente / Crédito', icon: Clock },
            ].map((p) => {
              const Icon = p.icon;
              const isSelected = metodoPago === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setMetodoPago(p.id as any)}
                  className={`p-2.5 rounded-xl border text-center flex flex-col items-center gap-1 transition-all ${
                    isSelected
                      ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300 font-black'
                      : 'bg-slate-900/60 border-slate-700 text-slate-400 font-semibold'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-[10px] truncate">{p.label}</span>
                </button>
              );
            })}
          </div>

          {/* Monto Recibido y Vuelto para Efectivo */}
          {metodoPago === 'EFECTIVO' && (
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Paga con (S/):</span>
                <input
                  type="number"
                  step="0.10"
                  value={montoRecibido}
                  onChange={(e) => setMontoRecibido(e.target.value)}
                  placeholder={`Ej: ${Math.ceil(totalVenta)}`}
                  className="w-28 text-right bg-slate-800 border border-slate-700 text-white rounded-lg px-2.5 py-1 text-xs font-bold focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {vuelto > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-slate-800 text-xs">
                  <span className="text-slate-400 font-bold">Vuelto a entregar:</span>
                  <span className="text-amber-400 font-black text-sm">
                    S/ {vuelto.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Observaciones */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 block mb-1">
              Observaciones (opcional)
            </label>
            <input
              type="text"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              placeholder="Nro operación, referencia de entrega..."
              className="w-full bg-slate-900/80 border border-slate-700 text-white rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. BARRA FIJA INFERIOR: RESUMEN Y BOTÓN CONFIRMAR                         */}
      {/* ========================================================================= */}
      {lineasCarrito.length > 0 && (
        <div className="fixed bottom-14 left-0 right-0 max-w-md mx-auto px-4 z-30">
          <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400 block">
                Total a Cobrar ({totalUnidades} un)
              </span>
              <span className="text-lg font-black text-white tracking-tight">
                S/ {totalVenta.toFixed(2)}
              </span>
            </div>

            <button
              onClick={handleConfirmarVenta}
              disabled={guardando || !clienteActivo}
              className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold px-5 py-3 rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-950 active:scale-95 transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{guardando ? 'Guardando...' : 'Confirmar Venta'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL SELECTOR DE CLIENTE                                                 */}
      {/* ========================================================================= */}
      {mostrarSelectorClientes && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm max-h-[85vh] flex flex-col p-4 space-y-3 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-emerald-400" />
                <span>Seleccionar Cliente</span>
              </h3>
              <button
                onClick={() => setMostrarSelectorClientes(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                Cerrar
              </button>
            </div>

            {/* Input búsqueda */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={busquedaCliente}
                onChange={(e) => setBusquedaCliente(e.target.value)}
                placeholder="Buscar cliente por nombre o DNI..."
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {/* Lista Scrollable */}
            <div className="overflow-y-auto space-y-2 flex-1 max-h-72 pr-1">
              {clientesFiltrados.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    setClienteSeleccionadoId(c.id);
                    setMostrarSelectorClientes(false);
                  }}
                  className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                    c.id === clienteSeleccionadoId
                      ? 'bg-emerald-950/50 border-emerald-500'
                      : 'bg-slate-800/70 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <p className="font-extrabold text-xs text-white truncate">
                    {c.razon_social}
                  </p>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                    <span>
                      {c.tipo_documento}: {c.numero_documento}
                    </span>
                    {c.lista_precio && (
                      <span className="text-emerald-400 font-semibold">
                        {c.lista_precio.nombre}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            {/* Registrar Nuevo */}
            <button
              onClick={() => {
                setMostrarSelectorClientes(false);
                navigate('/movil/clientes');
              }}
              className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <span>+ Registrar Nuevo Cliente en Ruta</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
