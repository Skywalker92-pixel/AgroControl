import React, { useEffect, useState, useMemo } from 'react';
import {
  Truck,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  Layers,
  Eye,
  RefreshCw,
  UserCheck,
  Calendar,
  Warehouse,
  ShieldCheck,
  Package,
  Trash2,
  X,
  FileSpreadsheet,
  ArrowRight,
  Info,
  Check,
  Edit2,
  DollarSign,
  FileText,
  RotateCcw,
  CheckSquare,
  AlertOctagon,
  Printer,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useWarehouseStore } from '../store/warehouseStore';
import {
  distribucionApi,
  liquidacionesApi,
  usuariosApi,
  ubicacionesApi,
  catalogoApi,
  stockApi,
} from '../api/services';
import {
  Vehiculo,
  CargaDistribucion,
  BodegaMovilActiva,
  Liquidacion,
  Usuario,
  Ubicacion,
  Producto,
  StockItem,
  ActaLiquidacion,
} from '../types';
import { QuantityInput } from '../components/QuantityInput';
import { ConfirmModal } from '../components/ConfirmModal';
import { ActaLiquidacionModal } from '../components/ActaLiquidacionModal';

export const Distribucion: React.FC = () => {
  const { usuario } = useAuthStore();
  const { almacenActivo } = useWarehouseStore();

  const esAdminUOperador =
    usuario?.rol === 'ADMINISTRADOR_PROPIETARIO' ||
    usuario?.rol === 'ADMINISTRADOR_SECUNDARIO' ||
    usuario?.rol === 'OPERADOR_ALMACEN';

  // Tabs
  const [tabActiva, setTabActiva] = useState<
    'cargas' | 'liquidaciones' | 'bodegas_moviles' | 'vehiculos'
  >('cargas');

  // Estados de datos
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [cargas, setCargas] = useState<CargaDistribucion[]>([]);
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([]);
  const [bodegasMoviles, setBodegasMoviles] = useState<BodegaMovilActiva[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [almacenes, setAlmacenes] = useState<Ubicacion[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [saldosAlmacen, setSaldosAlmacen] = useState<StockItem[]>([]);

  // Estados de carga
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mensaje de feedback
  const [feedback, setFeedback] = useState<{
    tipo: 'ok' | 'error';
    texto: string;
  } | null>(null);

  // Filtros de Vehículos
  const [busquedaVehiculo, setBusquedaVehiculo] = useState('');
  const [filtroEstadoVehiculo, setFiltroEstadoVehiculo] = useState<
    'TODOS' | 'ACTIVOS' | 'INACTIVOS'
  >('TODOS');

  // Filtros de Cargas
  const [filtroEstadoCarga, setFiltroEstadoCarga] = useState<string>('');
  const [filtroVehiculoCarga, setFiltroVehiculoCarga] = useState<string>('');
  const [busquedaCarga, setBusquedaCarga] = useState('');

  // Filtros de Liquidaciones
  const [filtroEstadoLiquidacion, setFiltroEstadoLiquidacion] = useState<string>('');
  const [filtroTrabajadorLiquidacion, setFiltroTrabajadorLiquidacion] = useState<string>('');
  const [busquedaLiquidacion, setBusquedaLiquidacion] = useState('');

  // Modales Vehículo & Carga
  const [modalVehiculoOpen, setModalVehiculoOpen] = useState(false);
  const [vehiculoEnEdicion, setVehiculoEnEdicion] = useState<Vehiculo | null>(null);

  const [modalNuevaCargaOpen, setModalNuevaCargaOpen] = useState(false);
  const [cargaDetalleModalOpen, setCargaDetalleModalOpen] = useState(false);
  const [cargaSeleccionada, setCargaSeleccionada] = useState<CargaDistribucion | null>(null);

  // Modal de confirmación para despacho
  const [modalDespachoConfirm, setModalDespachoConfirm] = useState<{
    isOpen: boolean;
    cargaId: string;
    codigoCarga: string;
    vehiculoPlaca: string;
  }>({
    isOpen: false,
    cargaId: '',
    codigoCarga: '',
    vehiculoPlaca: '',
  });
  const [isDespachando, setIsDespachando] = useState(false);

  // ============================================================================
  // ESTADOS PARA LIQUIDACIÓN (HITO 9)
  // ============================================================================
  const [modalLiquidarOpen, setModalLiquidarOpen] = useState(false);
  const [cargaALiquidar, setCargaALiquidar] = useState<CargaDistribucion | null>(null);
  const [itemsLiquidacionForm, setItemsLiquidacionForm] = useState<
    Array<{
      producto_id: string;
      producto_nombre: string;
      codigo_interno: string;
      unidad_base: string;
      presentacion_id?: string | null;
      presentacion_nombre?: string;
      cantidad_cargada: number;
      cantidad_vendida: number;
      cantidad_retornada: number;
      diferencia: number;
      justificacion: string;
      precio_unitario: number;
      subtotal: number;
    }>
  >([]);
  const [totalCobradoInput, setTotalCobradoInput] = useState<string>('0');
  const [obsLiquidacionInput, setObsLiquidacionInput] = useState<string>('');
  const [isLiquidando, setIsLiquidando] = useState(false);
  const [modalConfirmLiquidar, setModalConfirmLiquidar] = useState(false);

  // Modal Detalle de Liquidación Realizada
  const [modalDetalleLiqOpen, setModalDetalleLiqOpen] = useState(false);
  const [liquidacionSeleccionada, setLiquidacionSeleccionada] = useState<Liquidacion | null>(null);

  // Modal Acta Oficial de Liquidación (Hito 10)
  const [modalActaOpen, setModalActaOpen] = useState(false);
  const [actaSeleccionada, setActaSeleccionada] = useState<ActaLiquidacion | null>(null);
  const [isLoadingActa, setIsLoadingActa] = useState(false);

  // Formulario de Vehículo
  const [formVehiculo, setFormVehiculo] = useState({
    placa: '',
    marca: '',
    modelo: '',
    tipo_vehiculo: 'Furgón',
    capacidad_kg: '',
    capacidad_volumen: '',
    conductor_habitual_id: '',
    activo: true,
    observaciones: '',
  });

  // Formulario de Nueva Carga
  const [formCarga, setFormCarga] = useState({
    almacen_origen_id: '',
    vehiculo_id: '',
    trabajador_id: '',
    fecha_salida: new Date().toISOString().split('T')[0],
    observaciones: '',
  });

  // Ítems de la nueva carga
  const [itemsCarga, setItemsCarga] = useState<
    Array<{
      producto_id: string;
      producto_nombre: string;
      codigo_interno: string;
      unidad_base: string;
      presentacion_id?: string;
      presentacion_nombre?: string;
      factor: number;
      cantidad_presentacion: number;
      cantidad_unidades_sueltas: number;
      cantidad_total_base: number;
      stock_disponible_origen: number;
      observaciones?: string;
    }>
  >([]);

  // Ítem en edición para agregar a la carga
  const [itemActualProdId, setItemActualProdId] = useState('');
  const [itemActualPresId, setItemActualPresId] = useState<string | undefined>();
  const [itemActualCajas, setItemActualCajas] = useState(0);
  const [itemActualSueltas, setItemActualSueltas] = useState(0);
  const [itemActualObs, setItemActualObs] = useState('');

  // ============================================================================
  // CARGA DE DATOS INICIALES
  // ============================================================================
  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const [vData, cData, liqData, bData, uData, almsData, prodsData] = await Promise.all([
        distribucionApi.listarVehiculos(),
        distribucionApi.listarCargas(),
        liquidacionesApi.listar().catch(() => ({ total: 0, items: [] })),
        distribucionApi.obtenerBodegasMoviles(),
        usuariosApi.listar().catch(() => []),
        ubicacionesApi.listar().catch(() => []),
        catalogoApi.listarProductos().catch(() => []),
      ]);

      setVehiculos(vData || []);
      setCargas(cData?.items || []);
      setLiquidaciones(liqData?.items || []);
      setBodegasMoviles(bData || []);
      setUsuarios(uData || []);
      setAlmacenes((almsData || []).filter((u: Ubicacion) => u.tipo === 'ALMACEN'));
      setProductos(prodsData || []);

      if (!formCarga.almacen_origen_id) {
        const almInicial =
          almacenActivo?.id ||
          almsData?.find((u: Ubicacion) => u.tipo === 'ALMACEN')?.id ||
          '';
        setFormCarga((prev) => ({ ...prev, almacen_origen_id: almInicial }));
      }
    } catch (err: any) {
      console.error('Error al cargar datos de distribución:', err);
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al conectar con el servidor',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Cargar saldos de almacén cuando cambia el almacén origen seleccionado
  useEffect(() => {
    if (formCarga.almacen_origen_id) {
      stockApi
        .consultar(formCarga.almacen_origen_id)
        .then((saldos) => setSaldosAlmacen(saldos || []))
        .catch((err) => {
          console.error('Error al cargar saldos del almacén origen:', err);
          setSaldosAlmacen([]);
        });
    } else {
      setSaldosAlmacen([]);
    }
  }, [formCarga.almacen_origen_id]);

  const handleVehiculoChange = (vehiculoId: string) => {
    const veh = vehiculos.find((v) => v.id === vehiculoId);
    setFormCarga((prev) => ({
      ...prev,
      vehiculo_id: vehiculoId,
      trabajador_id: veh?.conductor_habitual_id || prev.trabajador_id,
    }));
  };

  const productoSeleccionado = useMemo(() => {
    return productos.find((p) => p.id === itemActualProdId);
  }, [productos, itemActualProdId]);

  const presentacionesProducto = useMemo(() => {
    return productoSeleccionado?.presentacion || [];
  }, [productoSeleccionado]);

  const stockDisponibleItemActual = useMemo(() => {
    if (!itemActualProdId) return undefined;
    const itemSaldo = saldosAlmacen.find((s) => s.producto.id === itemActualProdId);
    return itemSaldo ? Number(itemSaldo.cantidad_disponible) : 0;
  }, [saldosAlmacen, itemActualProdId]);

  const totalBaseItemActual = useMemo(() => {
    const pres = presentacionesProducto.find((p) => p.id === itemActualPresId);
    const factor = pres ? Number(pres.factor) : 1;
    return itemActualCajas * factor + itemActualSueltas;
  }, [presentacionesProducto, itemActualPresId, itemActualCajas, itemActualSueltas]);

  const handleSelectProducto = (prodId: string) => {
    setItemActualProdId(prodId);
    setItemActualPresId(undefined);
    setItemActualCajas(0);
    setItemActualSueltas(0);
    setItemActualObs('');
  };

  const handleAgregarItemCarga = () => {
    if (!productoSeleccionado) {
      setFeedback({ tipo: 'error', texto: 'Seleccione un producto para agregar.' });
      return;
    }
    if (totalBaseItemActual <= 0) {
      setFeedback({ tipo: 'error', texto: 'La cantidad a cargar debe ser mayor a 0.' });
      return;
    }

    const stockDisp = stockDisponibleItemActual ?? 0;
    if (totalBaseItemActual > stockDisp) {
      setFeedback({
        tipo: 'error',
        texto: `Stock insuficiente en almacén de origen. Disponible: ${stockDisp} ${productoSeleccionado.unidad_base}, Solicitado: ${totalBaseItemActual}.`,
      });
      return;
    }

    const yaExiste = itemsCarga.some(
      (item) =>
        item.producto_id === productoSeleccionado.id &&
        item.presentacion_id === itemActualPresId,
    );
    if (yaExiste) {
      setFeedback({
        tipo: 'error',
        texto: 'Este producto con la misma presentación ya fue agregado a la lista. Edítelo o elimínelo primero.',
      });
      return;
    }

    const pres = presentacionesProducto.find((p) => p.id === itemActualPresId);

    setItemsCarga((prev) => [
      ...prev,
      {
        producto_id: productoSeleccionado.id,
        producto_nombre: productoSeleccionado.nombre,
        codigo_interno: productoSeleccionado.codigo_interno,
        unidad_base: productoSeleccionado.unidad_base,
        presentacion_id: itemActualPresId,
        presentacion_nombre: pres?.nombre,
        factor: pres ? Number(pres.factor) : 1,
        cantidad_presentacion: itemActualCajas,
        cantidad_unidades_sueltas: itemActualSueltas,
        cantidad_total_base: totalBaseItemActual,
        stock_disponible_origen: stockDisp,
        observaciones: itemActualObs || undefined,
      },
    ]);

    setItemActualProdId('');
    setItemActualPresId(undefined);
    setItemActualCajas(0);
    setItemActualSueltas(0);
    setItemActualObs('');
    setFeedback(null);
  };

  const handleEliminarItemCarga = (index: number) => {
    setItemsCarga((prev) => prev.filter((_, i) => i !== index));
  };

  const handleGuardarCarga = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formCarga.almacen_origen_id) {
      setFeedback({ tipo: 'error', texto: 'Debe seleccionar un almacén de origen.' });
      return;
    }
    if (!formCarga.vehiculo_id) {
      setFeedback({ tipo: 'error', texto: 'Debe seleccionar un vehículo de transporte.' });
      return;
    }
    if (!formCarga.trabajador_id) {
      setFeedback({ tipo: 'error', texto: 'Debe asignar un conductor/trabajador responsable.' });
      return;
    }
    if (itemsCarga.length === 0) {
      setFeedback({ tipo: 'error', texto: 'Debe agregar al menos un producto a la carga.' });
      return;
    }

    try {
      const payload = {
        almacen_origen_id: formCarga.almacen_origen_id,
        vehiculo_id: formCarga.vehiculo_id,
        trabajador_id: formCarga.trabajador_id,
        fecha_salida: formCarga.fecha_salida,
        observaciones: formCarga.observaciones || undefined,
        detalles: itemsCarga.map((item) => ({
          producto_id: item.producto_id,
          presentacion_id: item.presentacion_id,
          cantidad_presentacion: item.cantidad_presentacion,
          cantidad_unidades_sueltas: item.cantidad_unidades_sueltas,
          observaciones: item.observaciones,
        })),
      };

      const nuevaCarga = await distribucionApi.crearCarga(payload);
      setFeedback({
        tipo: 'ok',
        texto: `Carga ${nuevaCarga.codigo} creada exitosamente en estado PENDIENTE. Lista para despacho.`,
      });
      setModalNuevaCargaOpen(false);
      setItemsCarga([]);
      cargarDatos();
    } catch (err: any) {
      console.error('Error al crear carga:', err);
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al registrar la carga de distribución.',
      });
    }
  };

  const handleConfirmarDespacho = async () => {
    if (!modalDespachoConfirm.cargaId) return;
    setIsDespachando(true);
    try {
      const cargaDespachada = await distribucionApi.despacharCarga(modalDespachoConfirm.cargaId);
      setFeedback({
        tipo: 'ok',
        texto: `¡Carga ${cargaDespachada.codigo} DESPACHADA A RUTA con éxito! Stock transferido a Bodega Móvil con movimientos Kárdex vinculados.`,
      });
      setModalDespachoConfirm({ isOpen: false, cargaId: '', codigoCarga: '', vehiculoPlaca: '' });
      if (cargaDetalleModalOpen) {
        setCargaDetalleModalOpen(false);
      }
      cargarDatos();
    } catch (err: any) {
      console.error('Error al despachar carga:', err);
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al ejecutar despacho atómico.',
      });
    } finally {
      setIsDespachando(false);
    }
  };

  const handleVerDetalleCarga = async (cargaId: string) => {
    try {
      const c = await distribucionApi.buscarCargaPorId(cargaId);
      setCargaSeleccionada(c);
      setCargaDetalleModalOpen(true);
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: 'Error al consultar detalle de la carga seleccionada.',
      });
    }
  };

  // ============================================================================
  // LÓGICA DE LIQUIDACIÓN DE RUTA (HITO 9)
  // ============================================================================
  const handleAbrirModalLiquidar = async (carga: CargaDistribucion) => {
    try {
      const c = await distribucionApi.buscarCargaPorId(carga.id);
      setCargaALiquidar(c);

      // Precargar los ítems en el formulario comparativo
      const itemsForm = (c.carga_detalle || []).map((det) => {
        const cantCargada = Number(det.cantidad_total_base);
        return {
          producto_id: det.producto_id,
          producto_nombre: det.producto.nombre,
          codigo_interno: det.producto.codigo_interno,
          unidad_base: det.producto.unidad_base,
          presentacion_id: det.presentacion_id,
          presentacion_nombre: det.presentacion?.nombre,
          cantidad_cargada: cantCargada,
          // Por defecto inicializamos con todo vendido (o editable por el operador)
          cantidad_vendida: cantCargada,
          cantidad_retornada: 0,
          diferencia: 0,
          justificacion: '',
          precio_unitario: 0,
          subtotal: 0,
        };
      });

      setItemsLiquidacionForm(itemsForm);
      setTotalCobradoInput('0');
      setObsLiquidacionInput('');
      setModalLiquidarOpen(true);
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: 'Error al inicializar la liquidación de la carga seleccionada.',
      });
    }
  };

  // Actualizar valores reactivos en la fila de liquidación
  const handleItemLiqChange = (
    index: number,
    field: 'cantidad_vendida' | 'cantidad_retornada' | 'precio_unitario' | 'justificacion',
    valor: any,
  ) => {
    setItemsLiquidacionForm((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };

      if (field === 'cantidad_vendida') {
        item.cantidad_vendida = Math.max(0, parseFloat(valor) || 0);
      } else if (field === 'cantidad_retornada') {
        item.cantidad_retornada = Math.max(0, parseFloat(valor) || 0);
      } else if (field === 'precio_unitario') {
        item.precio_unitario = Math.max(0, parseFloat(valor) || 0);
      } else if (field === 'justificacion') {
        item.justificacion = valor;
      }

      // Ecuación Fundamental: Diferencia = Carga Inicial - (Vendido + Retornado)
      item.diferencia = Number(
        (item.cantidad_cargada - (item.cantidad_vendida + item.cantidad_retornada)).toFixed(3),
      );
      item.subtotal = Number((item.cantidad_vendida * item.precio_unitario).toFixed(2));

      updated[index] = item;
      return updated;
    });
  };

  // Atajos rápidos para conveniencia del operador
  const handleRetornarTodoItem = (index: number) => {
    setItemsLiquidacionForm((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.cantidad_retornada = item.cantidad_cargada;
      item.cantidad_vendida = 0;
      item.diferencia = 0;
      item.justificacion = '';
      item.subtotal = 0;
      updated[index] = item;
      return updated;
    });
  };

  const handleVenderTodoItem = (index: number) => {
    setItemsLiquidacionForm((prev) => {
      const updated = [...prev];
      const item = { ...updated[index] };
      item.cantidad_vendida = item.cantidad_cargada;
      item.cantidad_retornada = 0;
      item.diferencia = 0;
      item.justificacion = '';
      item.subtotal = Number((item.cantidad_vendida * item.precio_unitario).toFixed(2));
      updated[index] = item;
      return updated;
    });
  };

  // Cálculos totales reactivos de la liquidación
  const totalVendidoCalculado = useMemo(() => {
    return itemsLiquidacionForm.reduce((sum, item) => sum + item.subtotal, 0);
  }, [itemsLiquidacionForm]);

  const totalCobradoNum = parseFloat(totalCobradoInput) || 0;
  const diferenciaDineroCalculada = Number((totalCobradoNum - totalVendidoCalculado).toFixed(2));

  const hayDiferenciasFisicasEnLiq = useMemo(() => {
    return itemsLiquidacionForm.some((item) => Math.abs(item.diferencia) > 0.0001);
  }, [itemsLiquidacionForm]);

  const faltanJustificaciones = useMemo(() => {
    return itemsLiquidacionForm.some(
      (item) => Math.abs(item.diferencia) > 0.0001 && (!item.justificacion || item.justificacion.trim().length < 5),
    );
  }, [itemsLiquidacionForm]);

  const estadoLiquidacionPrevisto: 'CONCILIADA' | 'OBSERVADA' =
    Math.abs(diferenciaDineroCalculada) < 0.01 && !hayDiferenciasFisicasEnLiq
      ? 'CONCILIADA'
      : 'OBSERVADA';

  // Ejecución de la liquidación atómica
  const handleEjecutarLiquidacion = async () => {
    if (!cargaALiquidar) return;
    if (faltanJustificaciones) {
      setFeedback({
        tipo: 'error',
        texto: 'Existen diferencias de inventario sin justificación administrativa (mínimo 5 caracteres).',
      });
      return;
    }

    setIsLiquidando(true);
    try {
      const payload = {
        carga_distribucion_id: cargaALiquidar.id,
        total_cobrado: totalCobradoNum,
        observaciones: obsLiquidacionInput.trim() || undefined,
        items: itemsLiquidacionForm.map((item) => ({
          producto_id: item.producto_id,
          presentacion_id: item.presentacion_id || undefined,
          cantidad_vendida: item.cantidad_vendida,
          cantidad_retornada: item.cantidad_retornada,
          diferencia: item.diferencia,
          justificacion: item.justificacion ? item.justificacion.trim() : undefined,
          precio_unitario_promedio: item.precio_unitario,
        })),
      };

      const res = await liquidacionesApi.liquidarCarga(payload);
      setFeedback({
        tipo: 'ok',
        texto: `¡Liquidación ${res.codigo} registrada con éxito (${res.estado})! Stock de ruta saldado a 0 y retornos reintegrados a almacén central.`,
      });

      setModalConfirmLiquidar(false);
      setModalLiquidarOpen(false);
      setCargaALiquidar(null);
      cargarDatos();
    } catch (err: any) {
      console.error('Error al ejecutar liquidación:', err);
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al ejecutar la liquidación.',
      });
    } finally {
      setIsLiquidando(false);
    }
  };

  const handleVerDetalleLiquidacion = async (liqId: string) => {
    try {
      const l = await liquidacionesApi.buscarPorId(liqId);
      setLiquidacionSeleccionada(l);
      setModalDetalleLiqOpen(true);
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: 'Error al consultar la liquidación seleccionada.',
      });
    }
  };

  const handleImprimirActa = async (liqId: string) => {
    try {
      setIsLoadingActa(true);
      const acta = await liquidacionesApi.obtenerActa(liqId);
      setActaSeleccionada(acta);
      setModalActaOpen(true);
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al emitir el acta oficial de liquidación.',
      });
    } finally {
      setIsLoadingActa(false);
    }
  };

  // Guardar Vehículo
  const handleGuardarVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formVehiculo.placa.trim()) {
      setFeedback({ tipo: 'error', texto: 'La placa del vehículo es obligatoria.' });
      return;
    }

    try {
      const payload: Partial<Vehiculo> = {
        placa: formVehiculo.placa.toUpperCase().trim(),
        marca: formVehiculo.marca.trim() || undefined,
        modelo: formVehiculo.modelo.trim() || undefined,
        tipo_vehiculo: formVehiculo.tipo_vehiculo.trim() || undefined,
        capacidad_kg: formVehiculo.capacidad_kg ? parseFloat(formVehiculo.capacidad_kg) : undefined,
        capacidad_volumen: formVehiculo.capacidad_volumen ? parseFloat(formVehiculo.capacidad_volumen) : undefined,
        conductor_habitual_id: formVehiculo.conductor_habitual_id || undefined,
        activo: formVehiculo.activo,
        observaciones: formVehiculo.observaciones.trim() || undefined,
      };

      if (vehiculoEnEdicion) {
        await distribucionApi.actualizarVehiculo(vehiculoEnEdicion.id, payload);
        setFeedback({ tipo: 'ok', texto: `Vehículo ${payload.placa} actualizado exitosamente.` });
      } else {
        const nuevo = await distribucionApi.crearVehiculo(payload);
        setFeedback({
          tipo: 'ok',
          texto: `Vehículo ${nuevo.placa} registrado exitosamente con Bodega Móvil provisional.`,
        });
      }

      setModalVehiculoOpen(false);
      setVehiculoEnEdicion(null);
      cargarDatos();
    } catch (err: any) {
      console.error('Error al guardar vehículo:', err);
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al guardar vehículo.',
      });
    }
  };

  const handleAbrirNuevoVehiculo = () => {
    setVehiculoEnEdicion(null);
    setFormVehiculo({
      placa: '',
      marca: '',
      modelo: '',
      tipo_vehiculo: 'Furgón',
      capacidad_kg: '',
      capacidad_volumen: '',
      conductor_habitual_id: '',
      activo: true,
      observaciones: '',
    });
    setModalVehiculoOpen(true);
  };

  const handleAbrirEditarVehiculo = (veh: Vehiculo) => {
    setVehiculoEnEdicion(veh);
    setFormVehiculo({
      placa: veh.placa,
      marca: veh.marca || '',
      modelo: veh.modelo || '',
      tipo_vehiculo: veh.tipo_vehiculo || 'Furgón',
      capacidad_kg: veh.capacidad_kg ? veh.capacidad_kg.toString() : '',
      capacidad_volumen: veh.capacidad_volumen ? veh.capacidad_volumen.toString() : '',
      conductor_habitual_id: veh.conductor_habitual_id || '',
      activo: veh.activo,
      observaciones: veh.observaciones || '',
    });
    setModalVehiculoOpen(true);
  };

  // Filtros aplicados a Vehículos
  const vehiculosFiltrados = useMemo(() => {
    return vehiculos.filter((v) => {
      const matchBusqueda =
        v.placa.toLowerCase().includes(busquedaVehiculo.toLowerCase()) ||
        (v.marca && v.marca.toLowerCase().includes(busquedaVehiculo.toLowerCase())) ||
        (v.modelo && v.modelo.toLowerCase().includes(busquedaVehiculo.toLowerCase())) ||
        (v.conductor_habitual?.nombre_completo &&
          v.conductor_habitual.nombre_completo.toLowerCase().includes(busquedaVehiculo.toLowerCase()));

      const matchEstado =
        filtroEstadoVehiculo === 'TODOS' ||
        (filtroEstadoVehiculo === 'ACTIVOS' && v.activo) ||
        (filtroEstadoVehiculo === 'INACTIVOS' && !v.activo);

      return matchBusqueda && matchEstado;
    });
  }, [vehiculos, busquedaVehiculo, filtroEstadoVehiculo]);

  // Filtros aplicados a Cargas
  const cargasFiltradas = useMemo(() => {
    return cargas.filter((c) => {
      const matchEstado = !filtroEstadoCarga || c.estado === filtroEstadoCarga;
      const matchVehiculo = !filtroVehiculoCarga || c.vehiculo_id === filtroVehiculoCarga;
      const matchBusqueda =
        !busquedaCarga ||
        c.codigo.toLowerCase().includes(busquedaCarga.toLowerCase()) ||
        c.trabajador.nombre_completo.toLowerCase().includes(busquedaCarga.toLowerCase()) ||
        c.vehiculo.placa.toLowerCase().includes(busquedaCarga.toLowerCase()) ||
        c.almacen_origen.nombre.toLowerCase().includes(busquedaCarga.toLowerCase());

      return matchEstado && matchVehiculo && matchBusqueda;
    });
  }, [cargas, filtroEstadoCarga, filtroVehiculoCarga, busquedaCarga]);

  // Filtros aplicados a Liquidaciones
  const liquidacionesFiltradas = useMemo(() => {
    return liquidaciones.filter((l) => {
      const matchEstado = !filtroEstadoLiquidacion || l.estado === filtroEstadoLiquidacion;
      const matchTrabajador =
        !filtroTrabajadorLiquidacion ||
        l.carga_distribucion.trabajador.id === filtroTrabajadorLiquidacion;
      const matchBusqueda =
        !busquedaLiquidacion ||
        l.codigo.toLowerCase().includes(busquedaLiquidacion.toLowerCase()) ||
        l.carga_distribucion.codigo.toLowerCase().includes(busquedaLiquidacion.toLowerCase()) ||
        l.carga_distribucion.vehiculo.placa.toLowerCase().includes(busquedaLiquidacion.toLowerCase()) ||
        l.carga_distribucion.trabajador.nombre_completo
          .toLowerCase()
          .includes(busquedaLiquidacion.toLowerCase());

      return matchEstado && matchTrabajador && matchBusqueda;
    });
  }, [liquidaciones, filtroEstadoLiquidacion, filtroTrabajadorLiquidacion, busquedaLiquidacion]);

  // Cargas que actualmente están EN_RUTA y listas para liquidación
  const cargasEnRutaDisponibles = useMemo(() => {
    return cargas.filter((c) => c.estado === 'EN_RUTA');
  }, [cargas]);

  return (
    <div className="space-y-6 pb-12">
      {/* ==================================================================== */}
      {/* HEADER DEL MÓDULO                                                   */}
      {/* ==================================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/30">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Distribución en Ruta & Liquidación de Vendedores
              </h1>
              <p className="text-sm text-slate-500">
                Flota, asignación matutina, despacho atómico, retornos de mercadería y liquidación de cuentas (Hito 8 y 9).
              </p>
            </div>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              setIsRefreshing(true);
              cargarDatos();
            }}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span>Refrescar</span>
          </button>

          {esAdminUOperador && (
            <>
              {cargasEnRutaDisponibles.length > 0 && (
                <button
                  onClick={() => handleAbrirModalLiquidar(cargasEnRutaDisponibles[0])}
                  className="flex items-center gap-2 px-3.5 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-300 rounded-lg hover:bg-emerald-100 transition-colors shadow-sm"
                >
                  <DollarSign className="w-4 h-4" />
                  <span>Liquidar Carga en Ruta</span>
                </button>
              )}

              <button
                onClick={() => {
                  setModalNuevaCargaOpen(true);
                  setItemsCarga([]);
                }}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-900/20"
              >
                <Plus className="w-4 h-4" />
                <span>Nueva Carga de Ruta</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* ==================================================================== */}
      {/* BANNER DE INVARIANTE DE INVENTARIO Y REGLA DE LIQUIDACIÓN            */}
      {/* ==================================================================== */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start gap-3.5 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-emerald-900 leading-relaxed">
          <p className="font-semibold text-emerald-950 text-sm mb-0.5">
            Ecuación Fundamental de Ruta & Invariante de Liquidación (RF-80)
          </p>
          <p>
            Al retornar del reparto, la liquidación valida estrictamente:{' '}
            <strong className="underline">Carga Inicial = Cantidad Vendida + Cantidad Retornada + Diferencia</strong>.
            Las unidades vendidas se descargan del móvil mediante <code>VENTA_RUTA</code> y las retornadas se reintegran físicamente al almacén con <code>RETORNO_DISTRIBUCION</code> enlazado.
            El saldo de la bodega móvil queda en cero y toda diferencia exige justificación administrativa obligatoria.
          </p>
        </div>
      </div>

      {/* FEEDBACK NOTIFICACIÓN */}
      {feedback && (
        <div
          className={`flex items-center justify-between p-4 rounded-xl border text-sm font-medium animate-fadeIn ${
            feedback.tipo === 'ok'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-rose-50 text-rose-900 border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.tipo === 'ok' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span>{feedback.texto}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="p-1 hover:bg-black/5 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* NAVEGACIÓN POR PESTAÑAS (4 TABS)                                     */}
      {/* ==================================================================== */}
      <div className="flex border-b border-slate-200 bg-white px-4 rounded-t-xl overflow-x-auto">
        <button
          onClick={() => setTabActiva('cargas')}
          className={`flex items-center gap-2 py-3.5 px-4 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            tabActiva === 'cargas'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>Cargas de Distribución</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {cargas.length}
          </span>
        </button>

        <button
          onClick={() => setTabActiva('liquidaciones')}
          className={`flex items-center gap-2 py-3.5 px-4 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            tabActiva === 'liquidaciones'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Liquidaciones de Ruta</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold">
            {liquidaciones.length}
          </span>
        </button>

        <button
          onClick={() => setTabActiva('bodegas_moviles')}
          className={`flex items-center gap-2 py-3.5 px-4 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            tabActiva === 'bodegas_moviles'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Bodegas Móviles en Ruta</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {bodegasMoviles.filter((b) => b.carga_activa).length} en ruta
          </span>
        </button>

        <button
          onClick={() => setTabActiva('vehiculos')}
          className={`flex items-center gap-2 py-3.5 px-4 font-semibold text-sm border-b-2 transition-all whitespace-nowrap ${
            tabActiva === 'vehiculos'
              ? 'border-emerald-600 text-emerald-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Flota de Vehículos</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
            {vehiculos.length}
          </span>
        </button>
      </div>

      {/* ==================================================================== */}
      {/* CONTENIDO TAB 1: CARGAS DE DISTRIBUCIÓN                              */}
      {/* ==================================================================== */}
      {tabActiva === 'cargas' && (
        <div className="space-y-4">
          {/* Filtros de Cargas */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por código, conductor o placa..."
                value={busquedaCarga}
                onChange={(e) => setBusquedaCarga(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <select
                value={filtroEstadoCarga}
                onChange={(e) => setFiltroEstadoCarga(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Todos los Estados</option>
                <option value="PENDIENTE">PENDIENTE (Por Despachar)</option>
                <option value="EN_RUTA">EN RUTA (Despachado)</option>
                <option value="FINALIZADA">FINALIZADA (Liquidada)</option>
              </select>
            </div>

            <div>
              <select
                value={filtroVehiculoCarga}
                onChange={(e) => setFiltroVehiculoCarga(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Todos los Vehículos</option>
                {vehiculos.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.placa} {v.marca ? `- ${v.marca}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Tabla de Cargas */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Código / Fecha</th>
                    <th className="py-3.5 px-4">Origen & Destino</th>
                    <th className="py-3.5 px-4">Conductor Asignado</th>
                    <th className="py-3.5 px-4 text-center">Ítems / Unidades</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Cargando cargas de distribución...
                      </td>
                    </tr>
                  ) : cargasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No se encontraron cargas de distribución con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    cargasFiltradas.map((c) => {
                      const totalUnidades = (c.carga_detalle || []).reduce(
                        (sum, item) => sum + Number(item.cantidad_total_base),
                        0,
                      );

                      return (
                        <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-mono font-bold text-slate-900 block">
                              {c.codigo}
                            </span>
                            <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              {new Date(c.fecha_salida).toLocaleDateString()}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 text-xs text-slate-700">
                              <span className="font-semibold text-slate-900">
                                {c.almacen_origen.nombre}
                              </span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                {c.vehiculo.placa}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 block mt-0.5">
                              Bodega Móvil: {c.bodega_movil.codigo}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-medium text-slate-900">
                              {c.trabajador.nombre_completo}
                            </div>
                            <span className="text-xs text-slate-400 font-mono">
                              @{c.trabajador.username}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <span className="font-semibold text-slate-800">
                              {c.carga_detalle?.length || 0} SKUs
                            </span>
                            <span className="text-xs text-slate-500 block">
                              {totalUnidades.toFixed(2)} unidades
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            {c.estado === 'PENDIENTE' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                                <Clock className="w-3.5 h-3.5" />
                                PENDIENTE
                              </span>
                            )}
                            {c.estado === 'EN_RUTA' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200 animate-pulse">
                                <Truck className="w-3.5 h-3.5" />
                                EN RUTA
                              </span>
                            )}
                            {c.estado === 'FINALIZADA' && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                FINALIZADA
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-right space-x-2">
                            <button
                              onClick={() => handleVerDetalleCarga(c.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                              title="Ver detalle de la carga"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detalle</span>
                            </button>

                            {esAdminUOperador && c.estado === 'PENDIENTE' && (
                              <button
                                onClick={() =>
                                  setModalDespachoConfirm({
                                    isOpen: true,
                                    cargaId: c.id,
                                    codigoCarga: c.codigo,
                                    vehiculoPlaca: c.vehiculo.placa,
                                  })
                                }
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm"
                                title="Despachar atómicamente a ruta"
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>Despachar</span>
                              </button>
                            )}

                            {esAdminUOperador && c.estado === 'EN_RUTA' && (
                              <button
                                onClick={() => handleAbrirModalLiquidar(c)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-sm"
                                title="Liquidar ruta y retornar mercadería"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Liquidar</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CONTENIDO TAB 2: LIQUIDACIONES DE RUTA (HITO 9)                      */}
      {/* ==================================================================== */}
      {tabActiva === 'liquidaciones' && (
        <div className="space-y-4">
          {/* Métricas y resumen financiero de liquidaciones */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium block">
                  Total Liquidaciones
                </span>
                <span className="text-2xl font-bold text-slate-900">
                  {liquidaciones.length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                <FileText className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-emerald-600 font-medium block">
                  Conciliadas (Cuadre OK)
                </span>
                <span className="text-2xl font-bold text-emerald-700">
                  {liquidaciones.filter((l) => l.estado === 'CONCILIADA').length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-amber-600 font-medium block">
                  Observadas (Diferencias)
                </span>
                <span className="text-2xl font-bold text-amber-700">
                  {liquidaciones.filter((l) => l.estado === 'OBSERVADA').length}
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 border border-amber-200">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 font-medium block">
                  Total Recaudado en Ruta
                </span>
                <span className="text-2xl font-bold text-slate-900">
                  S/{' '}
                  {liquidaciones
                    .reduce((sum, l) => sum + Number(l.total_cobrado), 0)
                    .toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-900/20">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filtros de Liquidaciones */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative sm:col-span-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar por código de liquidación, carga, vehículo o conductor..."
                value={busquedaLiquidacion}
                onChange={(e) => setBusquedaLiquidacion(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>

            <div>
              <select
                value={filtroEstadoLiquidacion}
                onChange={(e) => setFiltroEstadoLiquidacion(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Todos los Estados</option>
                <option value="CONCILIADA">CONCILIADA (Cuadre OK)</option>
                <option value="OBSERVADA">OBSERVADA (Con diferencias)</option>
              </select>
            </div>

            <div>
              <select
                value={filtroTrabajadorLiquidacion}
                onChange={(e) => setFiltroTrabajadorLiquidacion(e.target.value)}
                className="w-full py-2 px-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="">Todos los Conductores</option>
                {usuarios
                  .filter((u) => u.rol === 'VENDEDOR' || u.rol === 'OPERADOR_ALMACEN')
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.nombre_completo}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {/* Tabla de Liquidaciones */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Código / Fecha</th>
                    <th className="py-3.5 px-4">Carga & Vehículo</th>
                    <th className="py-3.5 px-4">Conductor Responsable</th>
                    <th className="py-3.5 px-4 text-right">Vendido / Cobrado</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        Cargando historial de liquidaciones...
                      </td>
                    </tr>
                  ) : liquidacionesFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No se encontraron liquidaciones registradas con los filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    liquidacionesFiltradas.map((l) => (
                      <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-slate-900 block">
                            {l.codigo}
                          </span>
                          <span className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(l.fecha_liquidacion).toLocaleDateString()}{' '}
                            {new Date(l.fecha_liquidacion).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <span className="font-mono font-semibold text-slate-900">
                              {l.carga_distribucion.codigo}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                              {l.carga_distribucion.vehiculo.placa}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">
                            Almacén: {l.carga_distribucion.almacen_origen.nombre}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900">
                            {l.carga_distribucion.trabajador.nombre_completo}
                          </div>
                          <span className="text-xs text-slate-400">
                            Liquidador: @{l.usuario_liquidador.username}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-slate-900">
                            S/ {Number(l.total_cobrado).toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-500">
                            Vendido: S/ {Number(l.total_vendido).toFixed(2)}
                            {Number(l.diferencia_dinero) !== 0 && (
                              <span
                                className={`ml-1 font-bold ${
                                  Number(l.diferencia_dinero) < 0
                                    ? 'text-rose-600'
                                    : 'text-emerald-600'
                                }`}
                              >
                                ({Number(l.diferencia_dinero) > 0 ? '+' : ''}
                                {Number(l.diferencia_dinero).toFixed(2)})
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {l.estado === 'CONCILIADA' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              CONCILIADA
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              OBSERVADA
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleImprimirActa(l.id)}
                              disabled={isLoadingActa}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 rounded-lg hover:bg-emerald-100 transition-colors border border-emerald-200"
                              title="Imprimir Acta Oficial de Liquidación"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Acta</span>
                            </button>
                            <button
                              onClick={() => handleVerDetalleLiquidacion(l.id)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                              title="Ver desglose comparativo de la liquidación"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detalle</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CONTENIDO TAB 3: BODEGAS MÓVILES EN RUTA (MONITOREO EN VIVO)          */}
      {/* ==================================================================== */}
      {tabActiva === 'bodegas_moviles' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-600" />
              <span>Inventario Físico a Bordo en Unidades Móviles</span>
            </h2>
            <span className="text-xs text-slate-500 font-medium">
              Actualizado en tiempo real según movimientos de Kárdex
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {bodegasMoviles.length === 0 ? (
              <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
                No hay unidades con bodegas móviles registradas en el sistema.
              </div>
            ) : (
              bodegasMoviles.map((bm) => {
                const tieneCarga = !!bm.carga_activa;
                const totalFisico = bm.existencias.reduce(
                  (sum, e) => sum + Number(e.cantidad_fisica),
                  0,
                );

                return (
                  <div
                    key={bm.bodega_movil_id}
                    className={`bg-white rounded-xl border transition-all p-5 flex flex-col justify-between shadow-sm ${
                      tieneCarga
                        ? 'border-emerald-300 ring-1 ring-emerald-200'
                        : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Cabecera de la tarjeta */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3 mb-3">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                              tieneCarga
                                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            <Truck className="w-5 h-5" />
                          </div>
                          <div>
                            <span className="font-mono font-bold text-base text-slate-900 leading-none block">
                              {bm.vehiculo?.placa || 'SIN PLACA'}
                            </span>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              {bm.vehiculo?.marca} {bm.vehiculo?.modelo}
                            </span>
                          </div>
                        </div>

                        {tieneCarga ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
                            EN RUTA
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
                            EN BASE
                          </span>
                        )}
                      </div>

                      {/* Detalles de asignación y conductor */}
                      <div className="space-y-1.5 text-xs text-slate-600 mb-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Bodega Móvil:</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {bm.codigo}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Responsable:</span>
                          <span className="font-medium text-slate-800">
                            {bm.trabajador?.nombre_completo || 'No asignado'}
                          </span>
                        </div>
                        {tieneCarga && (
                          <div className="flex justify-between pt-1 border-t border-slate-200">
                            <span className="text-slate-400">Carga Activa:</span>
                            <span className="font-mono font-bold text-emerald-700">
                              {bm.carga_activa?.codigo}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Existencias a bordo */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                            Existencias a Bordo ({bm.total_items} SKUs)
                          </span>
                          <span className="text-xs font-bold text-slate-700">
                            Total: {totalFisico.toFixed(2)}
                          </span>
                        </div>

                        {bm.existencias.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-3 text-center">
                            Bodega móvil vacía (sin stock transferido).
                          </p>
                        ) : (
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {bm.existencias.map((ex) => (
                              <div
                                key={ex.producto_id}
                                className="flex items-center justify-between p-2 rounded bg-white border border-slate-200 text-xs hover:border-slate-300"
                              >
                                <div className="truncate mr-2">
                                  <span className="font-semibold text-slate-800 block truncate">
                                    {ex.nombre}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    SKU: {ex.codigo_interno}
                                  </span>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className="font-bold text-emerald-700 block">
                                    {Number(ex.cantidad_fisica).toFixed(2)}
                                  </span>
                                  <span className="text-[10px] text-slate-500 uppercase">
                                    {ex.unidad_base}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {tieneCarga && (
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <button
                          onClick={() => handleVerDetalleCarga(bm.carga_activa!.id)}
                          className="text-xs text-slate-600 hover:text-slate-800 font-medium flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Carga</span>
                        </button>

                        {esAdminUOperador && (
                          <button
                            onClick={() => {
                              const cargaObj = cargas.find((c) => c.id === bm.carga_activa!.id);
                              if (cargaObj) handleAbrirModalLiquidar(cargaObj);
                            }}
                            className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Liquidar Ruta</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CONTENIDO TAB 4: FLOTA DE VEHÍCULOS                                  */}
      {/* ==================================================================== */}
      {tabActiva === 'vehiculos' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por placa, marca o conductor..."
                  value={busquedaVehiculo}
                  onChange={(e) => setBusquedaVehiculo(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <select
                value={filtroEstadoVehiculo}
                onChange={(e) => setFiltroEstadoVehiculo(e.target.value as any)}
                className="py-2 px-3 border border-slate-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="TODOS">Todos los Estados</option>
                <option value="ACTIVOS">Solo Activos</option>
                <option value="INACTIVOS">Solo Inactivos</option>
              </select>
            </div>

            {esAdminUOperador && (
              <button
                onClick={handleAbrirNuevoVehiculo}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Nuevo Vehículo</span>
              </button>
            )}
          </div>

          {/* Tabla de Vehículos */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Placa / Tipo</th>
                    <th className="py-3.5 px-4">Marca & Modelo</th>
                    <th className="py-3.5 px-4">Capacidad (Kg / m³)</th>
                    <th className="py-3.5 px-4">Bodega Móvil Lógica</th>
                    <th className="py-3.5 px-4">Conductor Habitual</th>
                    <th className="py-3.5 px-4 text-center">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400">
                        Cargando catálogo de vehículos...
                      </td>
                    </tr>
                  ) : vehiculosFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No se encontraron vehículos registrados.
                      </td>
                    </tr>
                  ) : (
                    vehiculosFiltrados.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-extrabold text-base text-slate-900 block">
                            {v.placa}
                          </span>
                          <span className="text-xs text-slate-400 block">
                            {v.tipo_vehiculo || 'No especificado'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-slate-800 block">
                            {v.marca || '—'}
                          </span>
                          <span className="text-xs text-slate-500">
                            {v.modelo || '—'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-xs text-slate-700">
                          <div>
                            <span className="font-semibold">
                              {v.capacidad_kg ? `${v.capacidad_kg} kg` : '—'}
                            </span>
                          </div>
                          <div className="text-slate-400">
                            {v.capacidad_volumen ? `${v.capacidad_volumen} m³` : '—'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {v.bodega_movil ? (
                            <div>
                              <span className="font-mono font-bold text-xs text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                {v.bodega_movil.codigo}
                              </span>
                              <span className="text-[11px] text-slate-400 block mt-0.5">
                                {v.bodega_movil.nombre}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">No asignada</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          {v.conductor_habitual ? (
                            <div>
                              <span className="font-medium text-slate-900 block">
                                {v.conductor_habitual.nombre_completo}
                              </span>
                              <span className="text-xs text-slate-400 font-mono">
                                @{v.conductor_habitual.username}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 italic">Sin conductor asignado</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          {v.activo ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                              ACTIVO
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-500">
                              INACTIVO
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          {esAdminUOperador && (
                            <button
                              onClick={() => handleAbrirEditarVehiculo(v)}
                              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                              title="Editar vehículo"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL ASISTIDO DE LIQUIDACIÓN DE RUTA (HITO 9 / RF-80)               */}
      {/* ==================================================================== */}
      {modalLiquidarOpen && cargaALiquidar && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            {/* Header del modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Liquidación de Ruta: {cargaALiquidar.codigo}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Conductor: <strong>{cargaALiquidar.trabajador.nombre_completo}</strong> | Vehículo:{' '}
                    <strong>{cargaALiquidar.vehiculo.placa}</strong> | Almacén Origen:{' '}
                    <strong>{cargaALiquidar.almacen_origen.nombre}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalLiquidarOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido scrolleable */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm">
              {/* Banner de la Ecuación Fundamental */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 flex items-center justify-between">
                <div>
                  <span className="font-bold text-slate-900 block mb-0.5">
                    Ecuación Fundamental de Inventario en Ruta:
                  </span>
                  <span>
                    Carga Inicial = Vendido + Retornado al Almacén + Diferencia (Faltante / Sobrante)
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-500 block">Estado Resultante:</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      estadoLiquidacionPrevisto === 'CONCILIADA'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {estadoLiquidacionPrevisto}
                  </span>
                </div>
              </div>

              {/* Tabla Comparativa de Productos */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Cuadre Físico por Producto (Ecuación de Ruta)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-700 uppercase">
                          <th className="py-2.5 px-3">Producto / Presentación</th>
                          <th className="py-2.5 px-3 text-center">Carga Inicial</th>
                          <th className="py-2.5 px-3 text-center">Vendido (Base)</th>
                          <th className="py-2.5 px-3 text-center">Retorno Almacén</th>
                          <th className="py-2.5 px-3 text-center">Diferencia</th>
                          <th className="py-2.5 px-3 text-right">Precio Unit. (S/)</th>
                          <th className="py-2.5 px-3 text-right">Subtotal (S/)</th>
                          <th className="py-2.5 px-3 text-center">Atajos</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {itemsLiquidacionForm.map((item, idx) => {
                          const hayDif = Math.abs(item.diferencia) > 0.0001;
                          const justifInvalida = hayDif && item.justificacion.trim().length < 5;

                          return (
                            <React.Fragment key={idx}>
                              <tr className={`hover:bg-slate-50 ${hayDif ? 'bg-amber-50/40' : ''}`}>
                                <td className="py-2.5 px-3">
                                  <span className="font-semibold text-slate-900 block">
                                    {item.producto_nombre}
                                  </span>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    SKU: {item.codigo_interno}{' '}
                                    {item.presentacion_nombre ? `| ${item.presentacion_nombre}` : ''}
                                  </span>
                                </td>

                                <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                                  {item.cantidad_cargada.toFixed(3)} {item.unidad_base}
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.cantidad_vendida || ''}
                                    onChange={(e) =>
                                      handleItemLiqChange(idx, 'cantidad_vendida', e.target.value)
                                    }
                                    className="w-20 p-1 text-center font-semibold border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                                  />
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.cantidad_retornada || ''}
                                    onChange={(e) =>
                                      handleItemLiqChange(idx, 'cantidad_retornada', e.target.value)
                                    }
                                    className="w-20 p-1 text-center font-semibold border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                                  />
                                </td>

                                <td className="py-2.5 px-3 text-center">
                                  {!hayDif ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                                      <Check className="w-3 h-3" /> Cuadrado
                                    </span>
                                  ) : item.diferencia > 0 ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800">
                                      Faltante (-{item.diferencia.toFixed(3)})
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-indigo-100 text-indigo-800">
                                      Sobrante (+{Math.abs(item.diferencia).toFixed(3)})
                                    </span>
                                  )}
                                </td>

                                <td className="py-2.5 px-3 text-right">
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.precio_unitario || ''}
                                    onChange={(e) =>
                                      handleItemLiqChange(idx, 'precio_unitario', e.target.value)
                                    }
                                    className="w-20 p-1 text-right font-semibold border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                                  />
                                </td>

                                <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                                  S/ {item.subtotal.toFixed(2)}
                                </td>

                                <td className="py-2.5 px-3 text-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => handleVenderTodoItem(idx)}
                                    className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                                    title="Todo vendido"
                                  >
                                    V. Todo
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRetornarTodoItem(idx)}
                                    className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded"
                                    title="Todo retornado"
                                  >
                                    Ret. Todo
                                  </button>
                                </td>
                              </tr>

                              {/* Fila adicional para justificación obligatoria si hay diferencia */}
                              {hayDif && (
                                <tr className="bg-amber-50/60 border-b border-amber-200">
                                  <td colSpan={8} className="px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                                      <span className="text-[11px] font-bold text-amber-900 whitespace-nowrap">
                                        Justificación Administrativa Obligatoria:
                                      </span>
                                      <input
                                        type="text"
                                        placeholder="Ingrese el motivo de la merma, rotura o sobrante (mínimo 5 caracteres)..."
                                        value={item.justificacion}
                                        onChange={(e) =>
                                          handleItemLiqChange(idx, 'justificacion', e.target.value)
                                        }
                                        className={`flex-1 p-1.5 text-xs bg-white border rounded focus:ring-1 ${
                                          justifInvalida
                                            ? 'border-rose-400 focus:ring-rose-500 text-rose-900'
                                            : 'border-amber-300 focus:ring-emerald-500'
                                        }`}
                                      />
                                      {justifInvalida && (
                                        <span className="text-[10px] font-semibold text-rose-600">
                                          (Mínimo 5 caracteres)
                                        </span>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Sección de Resumen Financiero y Cuadre de Cobranza */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    <span>Cuadre Financiero de Dinero en Caja</span>
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-xs text-slate-500 block mb-1">
                        Total Vendido Calculado (S/)
                      </span>
                      <div className="text-lg font-bold text-slate-900 bg-white p-2 rounded-lg border border-slate-200">
                        S/ {totalVendidoCalculado.toFixed(2)}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-700 block mb-1">
                        Dinero Entregado por Vendedor (S/) *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={totalCobradoInput}
                        onChange={(e) => setTotalCobradoInput(e.target.value)}
                        className="w-full text-lg font-bold text-slate-900 bg-white p-2 rounded-lg border border-slate-300 focus:ring-1 focus:ring-emerald-500"
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <div
                      className={`p-2.5 rounded-lg border flex items-center justify-between text-xs ${
                        Math.abs(diferenciaDineroCalculada) < 0.01
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : diferenciaDineroCalculada < 0
                          ? 'bg-rose-50 border-rose-200 text-rose-900'
                          : 'bg-indigo-50 border-indigo-200 text-indigo-900'
                      }`}
                    >
                      <span className="font-semibold">Diferencia Dinero Entregado vs Vendido:</span>
                      <span className="font-bold text-sm">
                        {diferenciaDineroCalculada > 0 ? '+' : ''}
                        S/ {diferenciaDineroCalculada.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                    Observaciones Administrativas de la Liquidación
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Comentarios sobre el cierre de ruta, cobranza en efectivo o depósito bancario..."
                    value={obsLiquidacionInput}
                    onChange={(e) => setObsLiquidacionInput(e.target.value)}
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Footer con acciones */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                La liquidación devolverá el stock sobrante al almacén físico de origen y cerrará la ruta.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalLiquidarOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => setModalConfirmLiquidar(true)}
                  disabled={faltanJustificaciones || isLiquidando}
                  className="px-5 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Procesar Liquidación Atómica</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL DETALLE DE LIQUIDACIÓN REALIZADA (HISTÓRICO)                  */}
      {/* ==================================================================== */}
      {modalDetalleLiqOpen && liquidacionSeleccionada && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Liquidación: {liquidacionSeleccionada.codigo}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Carga: <strong>{liquidacionSeleccionada.carga_distribucion.codigo}</strong> | Fecha:{' '}
                    {new Date(liquidacionSeleccionada.fecha_liquidacion).toLocaleString()}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setModalDetalleLiqOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm">
              {/* Tarjetas de cabecera */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block">Vehículo / Placa:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {liquidacionSeleccionada.carga_distribucion.vehiculo.placa}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Conductor Responsable:</span>
                  <span className="font-semibold text-slate-800">
                    {liquidacionSeleccionada.carga_distribucion.trabajador.nombre_completo}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Almacén Destino Retorno:</span>
                  <span className="font-semibold text-slate-800">
                    {liquidacionSeleccionada.carga_distribucion.almacen_origen.nombre}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Estado de Cuadre:</span>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold ${
                      liquidacionSeleccionada.estado === 'CONCILIADA'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {liquidacionSeleccionada.estado}
                  </span>
                </div>
              </div>

              {/* Resumen financiero */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-white border border-slate-200 rounded-xl text-center text-xs">
                <div>
                  <span className="text-slate-400 block mb-0.5">Total Vendido</span>
                  <span className="font-bold text-base text-slate-900">
                    S/ {Number(liquidacionSeleccionada.total_vendido).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Total Cobrado (Caja)</span>
                  <span className="font-bold text-base text-emerald-700">
                    S/ {Number(liquidacionSeleccionada.total_cobrado).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block mb-0.5">Diferencia Dinero</span>
                  <span
                    className={`font-bold text-base ${
                      Number(liquidacionSeleccionada.diferencia_dinero) === 0
                        ? 'text-slate-700'
                        : Number(liquidacionSeleccionada.diferencia_dinero) < 0
                        ? 'text-rose-600'
                        : 'text-indigo-600'
                    }`}
                  >
                    S/ {Number(liquidacionSeleccionada.diferencia_dinero).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Tabla de ítems liquidados */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Desglose de Mercadería y Ecuación de Ruta
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase">
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3 text-center">Cargado</th>
                        <th className="py-2.5 px-3 text-center">Vendido</th>
                        <th className="py-2.5 px-3 text-center">Retornado</th>
                        <th className="py-2.5 px-3 text-center">Diferencia</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {liquidacionSeleccionada.liquidacion_detalle.map((det) => (
                        <tr key={det.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900 block">
                              {det.producto.nombre}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {det.producto.codigo_interno}
                            </span>
                            {det.justificacion && (
                              <span className="text-[11px] text-amber-800 italic block mt-0.5">
                                Motivo: {det.justificacion}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center font-medium">
                            {Number(det.cantidad_cargada).toFixed(3)} {det.producto.unidad_base}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-800">
                            {Number(det.cantidad_vendida).toFixed(3)}
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-emerald-700">
                            {Number(det.cantidad_retornada).toFixed(3)}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {Number(det.diferencia) === 0 ? (
                              <span className="text-emerald-700 font-bold">0.000</span>
                            ) : (
                              <span className="text-rose-600 font-bold">
                                {Number(det.diferencia) > 0 ? '-' : '+'}
                                {Math.abs(Number(det.diferencia)).toFixed(3)}
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            S/ {Number(det.subtotal_vendido).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setModalDetalleLiqOpen(false);
                  handleImprimirActa(liquidacionSeleccionada.id);
                }}
                disabled={isLoadingActa}
                className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir Acta Oficial (A4)</span>
              </button>
              <button
                type="button"
                onClick={() => setModalDetalleLiqOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: NUEVA CARGA DE DISTRIBUCIÓN                                   */}
      {/* ==================================================================== */}
      {modalNuevaCargaOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Preparar Nueva Carga de Ruta
                  </h3>
                  <p className="text-xs text-slate-500">
                    Asignación matutina a bodega móvil del vehículo (Transferencia temporal)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setModalNuevaCargaOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Almacén de Origen *
                  </label>
                  <select
                    value={formCarga.almacen_origen_id}
                    onChange={(e) =>
                      setFormCarga((prev) => ({ ...prev, almacen_origen_id: e.target.value }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-500 font-medium"
                    required
                  >
                    <option value="">Seleccione Almacén</option>
                    {almacenes.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nombre} ({a.codigo})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Vehículo de Ruta *
                  </label>
                  <select
                    value={formCarga.vehiculo_id}
                    onChange={(e) => handleVehiculoChange(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-500 font-medium"
                    required
                  >
                    <option value="">Seleccione Vehículo</option>
                    {vehiculos
                      .filter((v) => v.activo)
                      .map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.placa} {v.marca ? `(${v.marca})` : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Conductor Responsable *
                  </label>
                  <select
                    value={formCarga.trabajador_id}
                    onChange={(e) =>
                      setFormCarga((prev) => ({ ...prev, trabajador_id: e.target.value }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-500 font-medium"
                    required
                  >
                    <option value="">Seleccione Conductor</option>
                    {usuarios
                      .filter((u) => u.activo)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nombre_completo} ({u.rol})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Fecha de Salida *
                  </label>
                  <input
                    type="date"
                    value={formCarga.fecha_salida}
                    onChange={(e) =>
                      setFormCarga((prev) => ({ ...prev, fecha_salida: e.target.value }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-500 font-medium"
                    required
                  />
                </div>

                <div className="sm:col-span-2 md:col-span-4">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Observaciones de la Carga
                  </label>
                  <input
                    type="text"
                    placeholder="Instrucciones especiales para la ruta..."
                    value={formCarga.observaciones}
                    onChange={(e) =>
                      setFormCarga((prev) => ({ ...prev, observaciones: e.target.value }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Selector Asistido */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-emerald-600" />
                    <span>Agregar Producto a la Carga</span>
                  </h4>
                  {stockDisponibleItemActual !== undefined && (
                    <span className="text-xs bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                      Disponible en Almacén: {stockDisponibleItemActual.toFixed(3)}{' '}
                      {productoSeleccionado?.unidad_base}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-600 block mb-1">
                      Producto *
                    </label>
                    <select
                      value={itemActualProdId}
                      onChange={(e) => handleSelectProducto(e.target.value)}
                      className="w-full p-2.5 border border-slate-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-emerald-500"
                    >
                      <option value="">Seleccione un producto...</option>
                      {productos.map((p) => (
                        <option key={p.id} value={p.id}>
                          [{p.codigo_interno}] {p.nombre} ({p.unidad_base})
                        </option>
                      ))}
                    </select>
                  </div>

                  {productoSeleccionado && (
                    <div className="space-y-3">
                      <QuantityInput
                        presentaciones={presentacionesProducto}
                        selectedPresentacionId={itemActualPresId}
                        onSelectPresentacion={setItemActualPresId}
                        cantidadPresentacion={itemActualCajas}
                        onChangeCantidadPresentacion={setItemActualCajas}
                        unidadesSueltas={itemActualSueltas}
                        onChangeUnidadesSueltas={setItemActualSueltas}
                        unidadBase={productoSeleccionado.unidad_base}
                        stockDisponible={stockDisponibleItemActual}
                      />

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={handleAgregarItemCarga}
                          className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm flex items-center gap-1.5"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Agregar a la Carga</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Lista de productos cargados */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Productos Cargados ({itemsCarga.length} SKUs)
                  </h4>
                  <span className="text-xs font-bold text-slate-800">
                    Total Base:{' '}
                    {itemsCarga
                      .reduce((sum, item) => sum + item.cantidad_total_base, 0)
                      .toFixed(2)}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase">
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3 text-center">Presentación</th>
                        <th className="py-2.5 px-3 text-center">Bultos / Sueltas</th>
                        <th className="py-2.5 px-3 text-right">Total Base</th>
                        <th className="py-2.5 px-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {itemsCarga.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400 italic">
                            No se han agregado productos a la carga aún.
                          </td>
                        </tr>
                      ) : (
                        itemsCarga.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-slate-800 block">
                                {item.producto_nombre}
                              </span>
                              <span className="font-mono text-[10px] text-slate-400">
                                {item.codigo_interno}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {item.presentacion_nombre ? (
                                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                  {item.presentacion_nombre} (x{item.factor})
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">Directo</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="font-medium text-slate-700">
                                {item.cantidad_presentacion > 0
                                  ? `${item.cantidad_presentacion} bultos + `
                                  : ''}
                                {item.cantidad_unidades_sueltas} sueltas
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-emerald-800">
                              {item.cantidad_total_base.toFixed(3)} {item.unidad_base}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleEliminarItemCarga(idx)}
                                className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Al guardar, la carga quedará en estado <strong>PENDIENTE</strong> para su despacho físico.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalNuevaCargaOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleGuardarCarga}
                  disabled={itemsCarga.length === 0}
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  Guardar Carga (PENDIENTE)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: DETALLE DE CARGA & DESPACHO                                   */}
      {/* ==================================================================== */}
      {cargaDetalleModalOpen && cargaSeleccionada && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-base">
                    Detalle de Carga: {cargaSeleccionada.codigo}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Estado actual:{' '}
                    <strong className="text-emerald-700">{cargaSeleccionada.estado}</strong>
                  </span>
                </div>
              </div>
              <button
                onClick={() => setCargaDetalleModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-sm">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block">Almacén Origen:</span>
                  <span className="font-semibold text-slate-800">
                    {cargaSeleccionada.almacen_origen.nombre}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Vehículo / Placa:</span>
                  <span className="font-mono font-bold text-emerald-700">
                    {cargaSeleccionada.vehiculo.placa}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Conductor Responsable:</span>
                  <span className="font-semibold text-slate-800">
                    {cargaSeleccionada.trabajador.nombre_completo}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block">Fecha Salida:</span>
                  <span className="font-semibold text-slate-800">
                    {new Date(cargaSeleccionada.fecha_salida).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">
                  Productos y Cantidades
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600 uppercase">
                        <th className="py-2.5 px-3">Producto</th>
                        <th className="py-2.5 px-3 text-center">Presentación</th>
                        <th className="py-2.5 px-3 text-center">Desglose</th>
                        <th className="py-2.5 px-3 text-right">Total Base Despachado</th>
                        {cargaSeleccionada.estado === 'EN_RUTA' && (
                          <th className="py-2.5 px-3 text-right text-emerald-700">
                            Stock Actual a Bordo
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {cargaSeleccionada.carga_detalle.map((det) => (
                        <tr key={det.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3">
                            <span className="font-semibold text-slate-900 block">
                              {det.producto.nombre}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {det.producto.codigo_interno}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {det.presentacion ? (
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                                {det.presentacion.nombre} (x{det.presentacion.factor})
                              </span>
                            ) : (
                              <span className="text-slate-400 italic">Directo</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-600">
                            {Number(det.cantidad_presentacion) > 0
                              ? `${det.cantidad_presentacion} bultos + `
                              : ''}
                            {det.cantidad_unidades_sueltas} sueltas
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {Number(det.cantidad_total_base).toFixed(3)}{' '}
                            {det.producto.unidad_base}
                          </td>
                          {cargaSeleccionada.estado === 'EN_RUTA' && (
                            <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">
                              {det.stock_actual_bodega_movil !== undefined
                                ? `${Number(det.stock_actual_bodega_movil).toFixed(3)} ${det.producto.unidad_base}`
                                : '—'}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCargaDetalleModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
              >
                Cerrar
              </button>

              <div className="flex gap-2">
                {esAdminUOperador && cargaSeleccionada.estado === 'PENDIENTE' && (
                  <button
                    type="button"
                    onClick={() => {
                      setModalDespachoConfirm({
                        isOpen: true,
                        cargaId: cargaSeleccionada.id,
                        codigoCarga: cargaSeleccionada.codigo,
                        vehiculoPlaca: cargaSeleccionada.vehiculo.placa,
                      });
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 transition-colors shadow-md flex items-center gap-1.5"
                  >
                    <Truck className="w-4 h-4" />
                    <span>Despachar a Ruta Ahora</span>
                  </button>
                )}

                {esAdminUOperador && cargaSeleccionada.estado === 'EN_RUTA' && (
                  <button
                    type="button"
                    onClick={() => {
                      setCargaDetalleModalOpen(false);
                      handleAbrirModalLiquidar(cargaSeleccionada);
                    }}
                    className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition-colors shadow-md flex items-center gap-1.5"
                  >
                    <DollarSign className="w-4 h-4" />
                    <span>Liquidar Esta Carga</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: REGISTRAR / EDITAR VEHÍCULO                                   */}
      {/* ==================================================================== */}
      {modalVehiculoOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-md">
                  <Truck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  {vehiculoEnEdicion ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo'}
                </h3>
              </div>
              <button
                onClick={() => setModalVehiculoOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGuardarVehiculo} className="p-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Placa del Vehículo *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    placeholder="ABC-123"
                    value={formVehiculo.placa}
                    onChange={(e) =>
                      setFormVehiculo((prev) => ({ ...prev, placa: e.target.value.toUpperCase() }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono font-bold focus:ring-1 focus:ring-emerald-500 uppercase"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Tipo de Vehículo
                  </label>
                  <select
                    value={formVehiculo.tipo_vehiculo}
                    onChange={(e) =>
                      setFormVehiculo((prev) => ({ ...prev, tipo_vehiculo: e.target.value }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="Furgón">Furgón</option>
                    <option value="Camioneta">Camioneta</option>
                    <option value="Camión">Camión</option>
                    <option value="Moto">Moto Furgón</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Marca
                  </label>
                  <input
                    type="text"
                    placeholder="Toyota, Hyundai..."
                    value={formVehiculo.marca}
                    onChange={(e) =>
                      setFormVehiculo((prev) => ({ ...prev, marca: e.target.value }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Modelo
                  </label>
                  <input
                    type="text"
                    placeholder="Hilux, H100..."
                    value={formVehiculo.modelo}
                    onChange={(e) =>
                      setFormVehiculo((prev) => ({ ...prev, modelo: e.target.value }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Capacidad (Kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="1500"
                    value={formVehiculo.capacidad_kg}
                    onChange={(e) =>
                      setFormVehiculo((prev) => ({ ...prev, capacidad_kg: e.target.value }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Capacidad Volumen (m³)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="8.5"
                    value={formVehiculo.capacidad_volumen}
                    onChange={(e) =>
                      setFormVehiculo((prev) => ({ ...prev, capacidad_volumen: e.target.value }))
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Conductor Habitual
                </label>
                <select
                  value={formVehiculo.conductor_habitual_id}
                  onChange={(e) =>
                    setFormVehiculo((prev) => ({ ...prev, conductor_habitual_id: e.target.value }))
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm bg-white focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Sin conductor habitual</option>
                  {usuarios
                    .filter((u) => u.activo)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre_completo} ({u.rol})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Observaciones
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles sobre el vehículo o seguro..."
                  value={formVehiculo.observaciones}
                  onChange={(e) =>
                    setFormVehiculo((prev) => ({ ...prev, observaciones: e.target.value }))
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="vehiculoActivo"
                  checked={formVehiculo.activo}
                  onChange={(e) =>
                    setFormVehiculo((prev) => ({ ...prev, activo: e.target.checked }))
                  }
                  className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                />
                <label htmlFor="vehiculoActivo" className="text-xs font-medium text-slate-700">
                  Vehículo activo para asignación de rutas
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalVehiculoOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors shadow-sm"
                >
                  {vehiculoEnEdicion ? 'Guardar Cambios' : 'Registrar Vehículo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* CONFIRM MODAL: DESPACHO ATÓMICO A RUTA                               */}
      {/* ==================================================================== */}
      <ConfirmModal
        isOpen={modalDespachoConfirm.isOpen}
        onClose={() =>
          setModalDespachoConfirm({ isOpen: false, cargaId: '', codigoCarga: '', vehiculoPlaca: '' })
        }
        onConfirm={handleConfirmarDespacho}
        title="¿Despachar Carga a Ruta?"
        message={`Esta acción ejecutará la transferencia atómica de existencias para la carga ${modalDespachoConfirm.codigoCarga} hacia la Bodega Móvil del vehículo ${modalDespachoConfirm.vehiculoPlaca}. Se descontará el stock físico del almacén de origen y se acreditará a la unidad de transporte mediante movimientos Kárdex inmutables de tipo ASIGNACION_DISTRIBUCION. El estado de la carga cambiará a EN RUTA.`}
        confirmText="Confirmar y Despachar"
        cancelText="Volver"
        isLoading={isDespachando}
      />

      {/* ==================================================================== */}
      {/* CONFIRM MODAL: LIQUIDACIÓN ATÓMICA DE RUTA                           */}
      {/* ==================================================================== */}
      <ConfirmModal
        isOpen={modalConfirmLiquidar}
        onClose={() => setModalConfirmLiquidar(false)}
        onConfirm={handleEjecutarLiquidacion}
        title="¿Confirmar Liquidación de Ruta?"
        message={`Esta operación cerrará la carga de distribución ${cargaALiquidar?.codigo}. Las unidades vendidas se descargarán con movimiento VENTA_RUTA, las retornadas se reintegrarán físicamente al almacén ${cargaALiquidar?.almacen_origen.nombre} con RETORNO_DISTRIBUCION, y la Bodega Móvil del vehículo quedará en saldo cero. Estado resultante: ${estadoLiquidacionPrevisto}.`}
        confirmText="Liquidar y Reintegrar Stock"
        cancelText="Revisar"
        isLoading={isLiquidando}
      />

      {/* ==================================================================== */}
      {/* MODAL: ACTA OFICIAL DE CIERRE Y LIQUIDACIÓN DE RUTA (HITO 10)         */}
      {/* ==================================================================== */}
      <ActaLiquidacionModal
        acta={actaSeleccionada}
        isOpen={modalActaOpen}
        onClose={() => setModalActaOpen(false)}
      />
    </div>
  );
};

export default Distribucion;
