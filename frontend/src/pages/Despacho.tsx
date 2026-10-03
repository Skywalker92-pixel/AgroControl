import React, { useEffect, useState } from 'react';
import {
  ClipboardList,
  Plus,
  Printer,
  CheckCircle2,
  Clock,
  PackageCheck,
  Ban,
  Search,
  Filter,
  AlertCircle,
  X,
  PlusCircle,
  Trash2,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useWarehouseStore } from '../store/warehouseStore';
import { despachoApi, clientesApi, catalogoApi, stockApi } from '../api/services';
import {
  Proforma,
  Cliente,
  Producto,
  EstadoProforma,
  OrdenDespacho,
} from '../types';
import { QuantityInput } from '../components/QuantityInput';
import { ConfirmModal } from '../components/ConfirmModal';
import { OrdenDespachoModal } from '../components/OrdenDespachoModal';

export const Despacho: React.FC = () => {
  const { usuario } = useAuthStore();
  const { almacenActivo } = useWarehouseStore();

  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');

  // Modales
  const [modalNuevaProforma, setModalNuevaProforma] = useState(false);
  const [ordenDespachoSeleccionada, setOrdenDespachoSeleccionada] =
    useState<OrdenDespacho | null>(null);
  const [modalOrdenOpen, setModalOrdenOpen] = useState(false);

  // Confirmación de cambio de estado
  const [modalConfirmState, setModalConfirmState] = useState<{
    isOpen: boolean;
    proformaId: string;
    nuevoEstado: EstadoProforma;
    titulo: string;
    mensaje: string;
  }>({
    isOpen: false,
    proformaId: '',
    nuevoEstado: 'RESERVADO',
    titulo: '',
    mensaje: '',
  });

  // Estado del Formulario de Nueva Proforma
  const [clienteId, setClienteId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [estadoInicial, setEstadoInicial] = useState<'BORRADOR' | 'RESERVADO'>('BORRADOR');
  const [itemsProforma, setItemsProforma] = useState<
    Array<{
      producto_id: string;
      presentacion_id?: string;
      cantidad_presentacion: number;
      unidades_sueltas: number;
      precio_unitario?: number;
      subtotal?: number;
    }>
  >([]);

  // Item en edición
  const [itemActualProdId, setItemActualProdId] = useState('');
  const [itemActualPresId, setItemActualPresId] = useState<string | undefined>();
  const [itemActualCajas, setItemActualCajas] = useState(0);
  const [itemActualSueltas, setItemActualSueltas] = useState(0);
  const [precioSugerido, setPrecioSugerido] = useState<number | undefined>();
  const [errorPrecio, setErrorPrecio] = useState<string | null>(null);
  const [stockDispItem, setStockDispItem] = useState<number | undefined>();

  const [feedback, setFeedback] = useState<{
    tipo: 'ok' | 'error';
    texto: string;
  } | null>(null);

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const [profs, clis, prods] = await Promise.all([
        despachoApi.listarProformas({
          estado: filtroEstado || undefined,
          ubicacion_id: almacenActivo?.id || undefined,
        }),
        clientesApi.listar(),
        catalogoApi.listarProductos(),
      ]);
      setProformas(profs.items || []);
      setClientes(clis);
      setProductos(prods);
    } catch (err) {
      console.error('Error al cargar proformas:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado, almacenActivo?.id]);

  // Al cambiar cliente o producto en el modal de nueva proforma, resolver precio y stock
  const clienteActivoObj = clientes.find((c) => c.id === clienteId);
  const productoActivoObj = productos.find((p) => p.id === itemActualProdId);

  useEffect(() => {
    if (clienteId && itemActualProdId) {
      setErrorPrecio(null);
      catalogoApi
        .consultarPrecioCliente(clienteId, itemActualProdId)
        .then((data) => {
          setPrecioSugerido(Number(data.precio_unitario));
          setErrorPrecio(null);
        })
        .catch((err) => {
          setPrecioSugerido(undefined);
          const msg =
            err.response?.data?.message ||
            'Este producto no tiene un precio configurado para la lista de precios del cliente seleccionado.';
          setErrorPrecio(msg);
        });

      stockApi
        .consultar(almacenActivo?.id, itemActualProdId)
        .then((data) => {
          setStockDispItem(data[0]?.cantidad_disponible || 0);
        })
        .catch(() => setStockDispItem(0));
    } else {
      setPrecioSugerido(undefined);
      setErrorPrecio(null);
      setStockDispItem(undefined);
    }
  }, [clienteId, itemActualProdId, almacenActivo?.id]);

  const handleAgregarItem = () => {
    if (!itemActualProdId) return;

    const factor =
      productoActivoObj?.presentacion?.find((p) => p.id === itemActualPresId)
        ?.factor || 1;
    const totalBase = (itemActualCajas * Number(factor)) + itemActualSueltas;

    if (totalBase <= 0) {
      setFeedback({
        tipo: 'error',
        texto: 'La cantidad a despachar debe ser mayor a cero.',
      });
      return;
    }

    const subtotal = Number((totalBase * (precioSugerido || 0)).toFixed(4));

    setItemsProforma([
      ...itemsProforma,
      {
        producto_id: itemActualProdId,
        presentacion_id: itemActualPresId,
        cantidad_presentacion: itemActualCajas,
        unidades_sueltas: itemActualSueltas,
        precio_unitario: precioSugerido,
        subtotal,
      },
    ]);

    // Limpiar item
    setItemActualProdId('');
    setItemActualPresId(undefined);
    setItemActualCajas(0);
    setItemActualSueltas(0);
    setPrecioSugerido(undefined);
  };

  const handleEliminarItem = (index: number) => {
    setItemsProforma(itemsProforma.filter((_, idx) => idx !== index));
  };

  const handleGuardarProforma = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!clienteId) {
      setFeedback({ tipo: 'error', texto: 'Seleccione un cliente.' });
      return;
    }
    if (itemsProforma.length === 0) {
      setFeedback({ tipo: 'error', texto: 'Agregue al menos un producto a la proforma.' });
      return;
    }

    try {
      const res = await despachoApi.crearProforma({
        cliente_id: clienteId,
        ubicacion_id: almacenActivo?.id,
        observaciones,
        estado_inicial: estadoInicial,
        items: itemsProforma.map((it) => ({
          producto_id: it.producto_id,
          presentacion_id: it.presentacion_id || undefined,
          cantidad_presentacion: it.cantidad_presentacion || 0,
          unidades_sueltas: it.unidades_sueltas || 0,
        })),
      });

      setFeedback({
        tipo: 'ok',
        texto: `Proforma ${res.numero} creada exitosamente en estado ${res.estado}.`,
      });
      setModalNuevaProforma(false);
      setItemsProforma([]);
      setClienteId('');
      setObservaciones('');
      cargarDatos();
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al guardar proforma.',
      });
    }
  };

  const solicitarCambioEstado = (
    proforma: Proforma,
    nuevoEstado: EstadoProforma,
  ) => {
    const titulos: Record<EstadoProforma, string> = {
      RESERVADO: 'Reservar Mercadería',
      PREPARADO: 'Marcar Carga como Preparada',
      DESPACHADO: 'Confirmar Salida Física (Despachado)',
      ANULADO: 'Anular Proforma',
      BORRADOR: 'Borrador',
    };

    const mensajes: Record<EstadoProforma, string> = {
      RESERVADO: `¿Desea reservar el stock para la proforma ${proforma.numero}? Se incrementará la cantidad reservada y se reducirá el disponible.`,
      PREPARADO: `¿Desea cambiar la proforma ${proforma.numero} a estado PREPARADO? Indica que el personal está armando la carga física.`,
      DESPACHADO: `¿Confirma la salida física de mercadería para la proforma ${proforma.numero}? Se descontará el stock físico y se registrará la SALIDA en el libro Kárdex.`,
      ANULADO: `¿Está seguro de anular la proforma ${proforma.numero}? Se liberará cualquier reserva activa de stock.`,
      BORRADOR: '',
    };

    setModalConfirmState({
      isOpen: true,
      proformaId: proforma.id,
      nuevoEstado,
      titulo: titulos[nuevoEstado] || 'Cambio de Estado',
      mensaje: mensajes[nuevoEstado] || '',
    });
  };

  const handleEjecutarCambioEstado = async () => {
    try {
      await despachoApi.cambiarEstado(
        modalConfirmState.proformaId,
        modalConfirmState.nuevoEstado,
      );
      setFeedback({
        tipo: 'ok',
        texto: `Proforma actualizada a estado ${modalConfirmState.nuevoEstado} exitosamente.`,
      });
      setModalConfirmState({ ...modalConfirmState, isOpen: false });
      cargarDatos();
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al cambiar estado.',
      });
      setModalConfirmState({ ...modalConfirmState, isOpen: false });
    }
  };

  const handleAbrirOrdenDespacho = async (id: string) => {
    try {
      const orden = await despachoApi.obtenerOrdenDespacho(id);
      setOrdenDespachoSeleccionada(orden);
      setModalOrdenOpen(true);
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: 'Error al obtener la orden de despacho para impresión.',
      });
    }
  };

  const rol = usuario?.rol;
  const esVendedor = rol === 'VENDEDOR';

  const estadoBadgeClass: Record<string, string> = {
    BORRADOR: 'bg-slate-100 text-slate-700 border-slate-300',
    RESERVADO: 'bg-blue-100 text-blue-800 border-blue-300',
    PREPARADO: 'bg-amber-100 text-amber-800 border-amber-300',
    DESPACHADO: 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold',
    ANULADO: 'bg-rose-100 text-rose-800 border-rose-300 line-through',
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-emerald-600" />
            Pedidos, Proformas & Despacho
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Flujo de despacho: Borrador → Reservado → Preparado → Despachado (Sin salida física sin documento)
          </p>
        </div>

        <button
          onClick={() => {
            setModalNuevaProforma(true);
            setItemsProforma([]);
            setFeedback(null);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Nueva Proforma / Venta
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            feedback.tipo === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.tipo === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{feedback.texto}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="w-full sm:w-56">
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
          >
            <option value="">Todos los Estados</option>
            <option value="BORRADOR">BORRADOR</option>
            <option value="RESERVADO">RESERVADO</option>
            <option value="PREPARADO">PREPARADO</option>
            <option value="DESPACHADO">DESPACHADO</option>
            <option value="ANULADO">ANULADO</option>
          </select>
        </div>

        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por número o cliente..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none"
          />
        </div>
      </div>

      {/* Tabla de Proformas */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Almacén</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-center">Orden Despacho</th>
                <th className="px-4 py-3 text-right">Acciones de Flujo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Cargando pedidos...
                  </td>
                </tr>
              ) : proformas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No se encontraron proformas registradas.
                  </td>
                </tr>
              ) : (
                proformas.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {p.numero}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      {p.cliente?.razon_social || 'Cliente'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {p.ubicacion?.nombre}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                          estadoBadgeClass[p.estado] || 'bg-slate-100'
                        }`}
                      >
                        {p.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                      S/ {Number(p.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleAbrirOrdenDespacho(p.id)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 inline-flex items-center gap-1 shadow-sm transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-600" />
                        Ver / Imprimir
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      {/* Transiciones según el estado actual */}
                      {p.estado === 'BORRADOR' && (
                        <>
                          <button
                            onClick={() => solicitarCambioEstado(p, 'RESERVADO')}
                            className="px-2.5 py-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200"
                          >
                            Reservar
                          </button>
                          <button
                            onClick={() => solicitarCambioEstado(p, 'ANULADO')}
                            className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded"
                          >
                            Anular
                          </button>
                        </>
                      )}

                      {p.estado === 'RESERVADO' && (
                        <>
                          {!esVendedor && (
                            <>
                              <button
                                onClick={() => solicitarCambioEstado(p, 'PREPARADO')}
                                className="px-2.5 py-1 text-[11px] font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 rounded border border-amber-200"
                              >
                                Preparar
                              </button>
                              <button
                                onClick={() => solicitarCambioEstado(p, 'DESPACHADO')}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow"
                              >
                                Despachar
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => solicitarCambioEstado(p, 'ANULADO')}
                            className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded"
                          >
                            Anular
                          </button>
                        </>
                      )}

                      {p.estado === 'PREPARADO' && !esVendedor && (
                        <>
                          <button
                            onClick={() => solicitarCambioEstado(p, 'DESPACHADO')}
                            className="px-3 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow flex-inline items-center gap-1"
                          >
                            Confirmar Despacho
                          </button>
                          <button
                            onClick={() => solicitarCambioEstado(p, 'ANULADO')}
                            className="px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 rounded"
                          >
                            Anular
                          </button>
                        </>
                      )}

                      {p.estado === 'DESPACHADO' && (
                        <span className="text-[11px] font-semibold text-emerald-700 italic">
                          Despachado ✓
                        </span>
                      )}

                      {p.estado === 'ANULADO' && (
                        <span className="text-[11px] font-semibold text-rose-500 italic">
                          Anulado
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Nueva Proforma */}
      {modalNuevaProforma && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">
                  Crear Nueva Proforma de Venta
                </h3>
                <p className="text-[11px] text-slate-500">
                  Precios asignados automáticamente según el tipo de cliente
                </p>
              </div>
              <button onClick={() => setModalNuevaProforma(false)}>
                <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Selección de Cliente */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Cliente *
                </label>
                <select
                  required
                  value={clienteId}
                  onChange={(e) => setClienteId(e.target.value)}
                  className="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Seleccione cliente...</option>
                  {clientes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.razon_social} ({c.tipo_documento}: {c.numero_documento})
                    </option>
                  ))}
                </select>
                {clienteActivoObj?.lista_precio && (
                  <span className="text-[11px] text-indigo-700 font-semibold mt-1 block">
                    Lista de precios aplicada:{' '}
                    <strong>{clienteActivoObj.lista_precio.nombre}</strong> (
                    {clienteActivoObj.lista_precio.codigo})
                  </span>
                )}
              </div>

              {/* Agregar Ítems */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                  Agregar Producto a la Proforma
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Producto *
                    </label>
                    <select
                      value={itemActualProdId}
                      onChange={(e) => setItemActualProdId(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded bg-white text-xs"
                    >
                      <option value="">Seleccione producto...</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nombre} ({p.unidad_base})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-semibold mb-1">
                      Precio Unitario (por {productoActivoObj?.unidad_base || 'unidad'})
                    </label>
                    <input
                      type="text"
                      disabled
                      value={
                        precioSugerido !== undefined
                          ? `S/ ${precioSugerido.toFixed(2)}`
                          : 'Seleccione cliente y producto'
                      }
                      className="w-full p-2 border border-slate-200 rounded bg-slate-100 font-mono font-bold text-slate-700 text-xs"
                    />
                  </div>
                </div>

                {/* Asistente de Cantidades (Cajas + Sueltas) */}
                {productoActivoObj && (
                  <QuantityInput
                    presentaciones={productoActivoObj.presentacion || []}
                    selectedPresentacionId={itemActualPresId}
                    onSelectPresentacion={setItemActualPresId}
                    cantidadPresentacion={itemActualCajas}
                    onChangeCantidadPresentacion={setItemActualCajas}
                    unidadesSueltas={itemActualSueltas}
                    onChangeUnidadesSueltas={setItemActualSueltas}
                    unidadBase={productoActivoObj.unidad_base}
                    stockDisponible={stockDispItem}
                  />
                )}

                {/* Mensaje informativo si el producto no tiene precio asignado */}
                {clienteId && itemActualProdId && precioSugerido === undefined && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-semibold">
                        {errorPrecio || 'Este producto no tiene un precio asignado en la lista de precios del cliente seleccionado.'}
                      </p>
                      <p className="text-[11px] text-amber-700">
                        El botón para añadir ítems permanecerá inhabilitado hasta que se configure el precio en el catálogo.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={handleAgregarItem}
                    disabled={!itemActualProdId || precioSugerido === undefined}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded text-xs flex items-center gap-1.5 shadow disabled:opacity-40"
                  >
                    <PlusCircle className="w-4 h-4" />
                    Añadir Ítem
                  </button>
                </div>
              </div>

              {/* Tabla de Ítems añadidos */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-2">
                  Detalle de la Proforma ({itemsProforma.length} ítems)
                </h4>
                {itemsProforma.length === 0 ? (
                  <p className="text-center py-4 text-slate-400 italic bg-white border border-dashed border-slate-300 rounded-lg">
                    Aún no ha añadido productos a esta proforma.
                  </p>
                ) : (
                  <table className="w-full border-collapse border border-slate-200 text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700">
                        <th className="border border-slate-200 px-3 py-1.5 text-left">
                          Producto
                        </th>
                        <th className="border border-slate-200 px-3 py-1.5 text-right">
                          Cant. Base
                        </th>
                        <th className="border border-slate-200 px-3 py-1.5 text-right">
                          P. Unit
                        </th>
                        <th className="border border-slate-200 px-3 py-1.5 text-right">
                          Subtotal
                        </th>
                        <th className="border border-slate-200 px-2 py-1.5 text-center w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsProforma.map((it, idx) => {
                        const prod = productos.find((p) => p.id === it.producto_id);
                        return (
                          <tr key={idx}>
                            <td className="border border-slate-200 px-3 py-1.5 font-medium">
                              {prod?.nombre}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono font-bold">
                              {it.cantidad_presentacion > 0
                                ? `${it.cantidad_presentacion} caja(s) + `
                                : ''}
                              {it.unidades_sueltas || 0}{' '}
                              {prod?.unidad_base}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono">
                              S/ {it.precio_unitario?.toFixed(2)}
                            </td>
                            <td className="border border-slate-200 px-3 py-1.5 text-right font-mono font-bold text-slate-900">
                              S/ {it.subtotal?.toFixed(2)}
                            </td>
                            <td className="border border-slate-200 px-2 py-1.5 text-center">
                              <button
                                type="button"
                                onClick={() => handleEliminarItem(idx)}
                                className="text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Observaciones y Estado Inicial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Observaciones de Entrega
                  </label>
                  <input
                    type="text"
                    placeholder="ej. Entregar por la tarde en almacén cliente"
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded text-xs"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-semibold mb-1">
                    Guardar como:
                  </label>
                  <select
                    value={estadoInicial}
                    onChange={(e) =>
                      setEstadoInicial(e.target.value as 'BORRADOR' | 'RESERVADO')
                    }
                    className="w-full p-2 border border-slate-300 rounded text-xs bg-white font-bold"
                  >
                    <option value="BORRADOR">BORRADOR (Sin reservar stock aún)</option>
                    <option value="RESERVADO">
                      RESERVADO (Bloquear stock de inmediato)
                    </option>
                  </select>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <div className="text-xs text-slate-600">
                Almacén: <strong>{almacenActivo?.nombre}</strong>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalNuevaProforma(false)}
                  className="px-4 py-2 border border-slate-300 rounded text-xs text-slate-700 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGuardarProforma}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs shadow"
                >
                  Guardar Proforma
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación de Cambio de Estado */}
      <ConfirmModal
        isOpen={modalConfirmState.isOpen}
        onClose={() => setModalConfirmState({ ...modalConfirmState, isOpen: false })}
        onConfirm={handleEjecutarCambioEstado}
        title={modalConfirmState.titulo}
        message={modalConfirmState.mensaje}
        isDestructive={modalConfirmState.nuevoEstado === 'ANULADO'}
        confirmText="Confirmar Acción"
      />

      {/* Modal de Impresión de Orden de Despacho */}
      <OrdenDespachoModal
        isOpen={modalOrdenOpen}
        onClose={() => setModalOrdenOpen(false)}
        orden={ordenDespachoSeleccionada}
      />
    </div>
  );
};
