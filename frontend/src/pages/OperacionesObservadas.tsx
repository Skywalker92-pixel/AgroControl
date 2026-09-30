import React, { useEffect, useState, useMemo } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Download,
  Smartphone,
  Truck,
  User,
  Package,
  DollarSign,
  FileText,
  Warehouse,
  ShieldAlert,
  ArrowRight,
  Eye,
  Check,
  X,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { syncApi, almacenesApi } from '../api/services';
import {
  OperacionObservadaItem,
  Ubicacion,
  ResolverOperacionObservadaPayload,
} from '../types';
import { useAuthStore } from '../store/authStore';

export const OperacionesObservadas: React.FC = () => {
  const { usuario } = useAuthStore();
  const esAdmin =
    usuario?.rol === 'ADMINISTRADOR_PROPIETARIO' ||
    usuario?.rol === 'ADMINISTRADOR_SECUNDARIO';

  // Estados de datos
  const [operaciones, setOperaciones] = useState<OperacionObservadaItem[]>([]);
  const [almacenes, setAlmacenes] = useState<Ubicacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Filtros
  const [filtroEstado, setFiltroEstado] = useState<
    'OBSERVADA' | 'RESUELTA_APROBADA' | 'RESUELTA_RECHAZADA' | 'TODAS'
  >('OBSERVADA');
  const [busqueda, setBusqueda] = useState('');

  // Modal de resolución
  const [operacionSeleccionada, setOperacionSeleccionada] =
    useState<OperacionObservadaItem | null>(null);
  const [accionModal, setAccionModal] = useState<'APROBAR' | 'RECHAZAR'>('APROBAR');
  const [notaResolucion, setNotaResolucion] = useState('');
  const [almacenRegularizacionId, setAlmacenRegularizacionId] = useState<string>('');
  const [procesandoResolucion, setProcesandoResolucion] = useState(false);
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Modal de solo detalle/auditoría
  const [operacionDetalle, setOperacionDetalle] = useState<OperacionObservadaItem | null>(
    null,
  );

  // Cargar operaciones
  const cargarOperaciones = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await syncApi.operacionesObservadas({
        estado_sync: filtroEstado,
      });
      setOperaciones(data.items);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Error al cargar las operaciones sincronizadas.',
      );
    } finally {
      setCargando(false);
    }
  };

  // Cargar almacenes para regularización
  useEffect(() => {
    cargarOperaciones();
  }, [filtroEstado]);

  useEffect(() => {
    const fetchAlmacenes = async () => {
      try {
        const alms = await almacenesApi.listar({ soloActivos: true });
        setAlmacenes(alms.filter((a) => a.tipo === 'ALMACEN'));
      } catch (e) {
        console.warn('No se pudieron cargar los almacenes para regularización:', e);
      }
    };
    fetchAlmacenes();
  }, []);

  // Filtrado local por texto
  const operacionesFiltradas = useMemo(() => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return operaciones;
    return operaciones.filter((op) => {
      const matchId = op.id.toLowerCase().includes(q);
      const matchVendedor = op.vendedor?.nombre_completo.toLowerCase().includes(q) || false;
      const matchDevice = op.dispositivo?.codigo_dispositivo.toLowerCase().includes(q) || false;
      const matchCarga = op.carga?.codigo.toLowerCase().includes(q) || false;
      const matchPlaca = op.carga?.vehiculo_placa.toLowerCase().includes(q) || false;
      const matchMotivo = op.motivo_observacion?.toLowerCase().includes(q) || false;
      return matchId || matchVendedor || matchDevice || matchCarga || matchPlaca || matchMotivo;
    });
  }, [operaciones, busqueda]);

  // Contadores
  const totalObservadas = useMemo(
    () => operaciones.filter((o) => o.estado_sync === 'OBSERVADA').length,
    [operaciones],
  );
  const totalAprobadas = useMemo(
    () => operaciones.filter((o) => o.estado_sync === 'RESUELTA_APROBADA').length,
    [operaciones],
  );
  const totalRechazadas = useMemo(
    () => operaciones.filter((o) => o.estado_sync === 'RESUELTA_RECHAZADA').length,
    [operaciones],
  );

  // Manejador de resolución
  const handleEjecutarResolucion = async () => {
    if (!operacionSeleccionada) return;
    if (notaResolucion.trim().length < 5) {
      setErrorModal('La justificación administrativa debe contener al menos 5 caracteres obligatorios.');
      return;
    }

    setProcesandoResolucion(true);
    setErrorModal(null);

    try {
      const payload: ResolverOperacionObservadaPayload = {
        accion: accionModal,
        nota_resolucion: notaResolucion.trim(),
        almacen_regularizacion_id:
          accionModal === 'APROBAR' && almacenRegularizacionId ? almacenRegularizacionId : undefined,
      };

      const res = await syncApi.resolverOperacionObservada(operacionSeleccionada.id, payload);
      setMensajeExito(res.mensaje);
      setOperacionSeleccionada(null);
      setNotaResolucion('');
      setAlmacenRegularizacionId('');
      cargarOperaciones();
    } catch (err: any) {
      setErrorModal(
        err.response?.data?.message || 'Error al procesar la resolución administrativa.',
      );
    } finally {
      setProcesandoResolucion(false);
    }
  };

  // Exportar a CSV
  const handleExportarCsv = async () => {
    try {
      const blob = await syncApi.descargarCsvOperacionesObservadas({
        estado_sync: filtroEstado,
      });
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv;charset=utf-8;' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `operaciones_observadas_${filtroEstado}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (e: any) {
      alert('Error al exportar reporte CSV: ' + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* ========================================================================= */}
      {/* 1. CABECERA & CONTADORES DE AUDITORÍA                                      */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              Gestión de Conflictos & Operaciones Observadas
            </h1>
            <span className="text-xs font-bold uppercase px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              HITO 13 • Fase 3
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Auditoría administrativa de transacciones sincronizadas con descalce de stock o inconsistencias de ruta.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportarCsv}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            title="Exportar a archivo CSV (RFC 4180)"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Exportar CSV</span>
          </button>

          <button
            onClick={cargarOperaciones}
            disabled={cargando}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm transition-all active:scale-95"
            title="Actualizar datos"
          >
            <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Banner de Feedback Exitoso */}
      {mensajeExito && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center justify-between text-emerald-800 text-sm shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-semibold">{mensajeExito}</span>
          </div>
          <button
            onClick={() => setMensajeExito(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Alerta de Error */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Tarjetas de Resumen Rápido */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-black">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block uppercase">
              Observadas Pendientes
            </span>
            <span className="text-2xl font-black text-amber-600">
              {filtroEstado === 'OBSERVADA' ? operaciones.length : totalObservadas}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-black">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block uppercase">
              Resueltas Aprobadas
            </span>
            <span className="text-2xl font-black text-emerald-600">
              {filtroEstado === 'RESUELTA_APROBADA' ? operaciones.length : totalAprobadas}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 border border-slate-200 flex items-center justify-center font-black">
            <XCircle className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block uppercase">
              Resueltas Rechazadas
            </span>
            <span className="text-2xl font-black text-slate-700">
              {filtroEstado === 'RESUELTA_RECHAZADA' ? operaciones.length : totalRechazadas}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-black">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs font-bold text-slate-500 block uppercase">
              Latencia Móvil Promedio
            </span>
            <span className="text-2xl font-black text-blue-600">
              {operaciones.length > 0
                ? (
                    operaciones.reduce(
                      (acc, o) => acc + (o.latencia_minutos || 0),
                      0,
                    ) / operaciones.length
                  ).toFixed(1)
                : '0.0'}{' '}
              <span className="text-xs font-semibold text-slate-400">min</span>
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BARRA DE FILTROS & BÚSQUEDA                                             */}
      {/* ========================================================================= */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Pestañas de Filtro por Estado */}
        <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold text-slate-600">
          {[
            { id: 'OBSERVADA', label: 'Pendientes (Observadas)', color: 'text-amber-700' },
            { id: 'RESUELTA_APROBADA', label: 'Aprobadas', color: 'text-emerald-700' },
            { id: 'RESUELTA_RECHAZADA', label: 'Rechazadas', color: 'text-slate-700' },
            { id: 'TODAS', label: 'Todas las Transacciones', color: 'text-slate-800' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFiltroEstado(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                filtroEstado === tab.id
                  ? 'bg-white text-slate-900 shadow-sm font-extrabold'
                  : 'hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Búsqueda Táctil */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por vendedor, terminal, carga, placa..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-none transition-all"
          />
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TABLA DE OPERACIONES OBSERVADAS                                         */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Estado / Folio</th>
                <th className="py-3 px-4">Vendedor & Terminal</th>
                <th className="py-3 px-4">Carga & Vehículo</th>
                <th className="py-3 px-4">Tiempos & Latencia (RNF-13)</th>
                <th className="py-3 px-4 text-right">Monto (S/)</th>
                <th className="py-3 px-4">Motivo de Observación</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cargando ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    <span>Cargando transacciones observadas...</span>
                  </td>
                </tr>
              ) : operacionesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-bold text-slate-700">Cero discrepancias pendientes</p>
                    <p className="text-[11px] mt-0.5">
                      No se encontraron operaciones observadas bajo los criterios seleccionados.
                    </p>
                  </td>
                </tr>
              ) : (
                operacionesFiltradas.map((op) => {
                  const esPendiente = op.estado_sync === 'OBSERVADA';
                  const esAprobada = op.estado_sync === 'RESUELTA_APROBADA';
                  const esRechazada = op.estado_sync === 'RESUELTA_RECHAZADA';
                  const totalOp = Number(op.datos?.total || 0);

                  return (
                    <tr
                      key={op.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        esPendiente ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      {/* Estado y Folio */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          {esPendiente && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                              <AlertTriangle className="w-3 h-3" /> OBSERVADA
                            </span>
                          )}
                          {esAprobada && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> RESUELTA APROBADA
                            </span>
                          )}
                          {esRechazada && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-slate-200 text-slate-700 border border-slate-300">
                              <XCircle className="w-3 h-3" /> RECHAZADA
                            </span>
                          )}
                          <p className="font-mono text-[10px] text-slate-400 truncate max-w-[130px]">
                            {op.id}
                          </p>
                        </div>
                      </td>

                      {/* Vendedor y Dispositivo */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900">
                            {op.vendedor?.nombre_completo || 'Desconocido'}
                          </p>
                          <p className="text-[11px] text-slate-500 flex items-center gap-1">
                            <Smartphone className="w-3 h-3 text-slate-400" />
                            <span className="font-mono">{op.dispositivo?.codigo_dispositivo}</span>
                          </p>
                        </div>
                      </td>

                      {/* Carga y Vehículo */}
                      <td className="py-3.5 px-4">
                        {op.carga ? (
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-800 font-mono">
                              {op.carga.codigo}
                            </span>
                            <p className="text-[11px] text-slate-500 flex items-center gap-1">
                              <Truck className="w-3 h-3 text-slate-400" />
                              <span>{op.carga.vehiculo_placa}</span>
                            </p>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Sin carga asociada</span>
                        )}
                      </td>

                      {/* Tiempos y Latencia RNF-13 */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-slate-700">
                            <span className="font-semibold">Campo:</span>
                            <span>{new Date(op.fecha_operacion).toLocaleTimeString()}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-500 text-[10px]">
                            <span>Recepción:</span>
                            <span>{new Date(op.fecha_registro).toLocaleTimeString()}</span>
                          </div>
                          <span className="inline-block mt-0.5 px-2 py-0.2 rounded font-mono text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Latencia: {op.latencia_minutos || 0} min ({op.latencia_sincronizacion_segundos}s)
                          </span>
                        </div>
                      </td>

                      {/* Monto */}
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-black text-sm text-slate-900">
                          S/ {totalOp.toFixed(2)}
                        </span>
                        <p className="text-[10px] text-slate-400">
                          {op.datos?.metadatos?.metodo_pago || 'VENTA'}
                        </p>
                      </td>

                      {/* Motivo */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                          <p className="line-clamp-2">{op.motivo_observacion || 'Inconsistencia en bodega móvil.'}</p>
                          {op.nota_resolucion && (
                            <p className="mt-1 pt-1 border-t border-slate-200 text-[10px] text-emerald-700 italic">
                              <strong>Resolución:</strong> "{op.nota_resolucion}"
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-center">
                        {esPendiente ? (
                          esAdmin ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => {
                                  setOperacionSeleccionada(op);
                                  setAccionModal('APROBAR');
                                  setNotaResolucion('');
                                  setErrorModal(null);
                                }}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                                title="Aprobar con regularización de stock"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Aprobar</span>
                              </button>
                              <button
                                onClick={() => {
                                  setOperacionSeleccionada(op);
                                  setAccionModal('RECHAZAR');
                                  setNotaResolucion('');
                                  setErrorModal(null);
                                }}
                                className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm active:scale-95 transition-all"
                                title="Rechazar operación"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Rechazar</span>
                              </button>
                            </div>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-semibold italic">
                              Requiere Administrador
                            </span>
                          )
                        ) : (
                          <button
                            onClick={() => setOperacionDetalle(op)}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-xs flex items-center gap-1.5 mx-auto transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Auditoría</span>
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

      {/* ========================================================================= */}
      {/* 4. MODAL INTERACTIVO DE RESOLUCIÓN ADMINISTRATIVA                          */}
      {/* ========================================================================= */}
      {operacionSeleccionada && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Cabecera Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${
                    accionModal === 'APROBAR'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}
                >
                  {accionModal === 'APROBAR' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : (
                    <XCircle className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 leading-tight">
                    {accionModal === 'APROBAR'
                      ? 'Aprobar Operación con Regularización de Inventario'
                      : 'Desestimar / Rechazar Operación Observada'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Folio: {operacionSeleccionada.id}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setOperacionSeleccionada(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error en Modal */}
            {errorModal && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorModal}</span>
              </div>
            )}

            {/* Motivo Original de Observación */}
            <div className="p-3.5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-1">
              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" /> Motivo de Descalce Sincronizado:
              </span>
              <p className="text-xs text-amber-900 font-semibold leading-relaxed">
                {operacionSeleccionada.motivo_observacion}
              </p>
            </div>

            {/* Desglose de Productos Vendidos */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                Ítems de la Operación en Campo
              </h4>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-3">Producto</th>
                      <th className="py-2 px-3 text-center">Cantidad</th>
                      <th className="py-2 px-3 text-right">Precio Unit.</th>
                      <th className="py-2 px-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(operacionSeleccionada.datos?.detalles || []).map((d: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-semibold text-slate-800">
                          {d.producto_nombre || d.producto_id}
                        </td>
                        <td className="py-2 px-3 text-center font-bold text-slate-900">
                          {d.cantidad} un
                        </td>
                        <td className="py-2 px-3 text-right text-slate-600">
                          S/ {Number(d.precio_unitario || 0).toFixed(2)}
                        </td>
                        <td className="py-2 px-3 text-right font-black text-slate-900">
                          S/ {Number(d.subtotal || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Selector de Almacén Regularizador (Solo para APROBAR) */}
            {accionModal === 'APROBAR' && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Warehouse className="w-4 h-4 text-emerald-600" />
                  <span>Almacén de Regularización (Compensación de Stock):</span>
                </label>
                <select
                  value={almacenRegularizacionId}
                  onChange={(e) => setAlmacenRegularizacionId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">Ajuste Directo en Bodega Móvil</option>
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.nombre} ({a.codigo})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Si selecciona un almacén central, el déficit se debitará de dicho almacén para alimentar la bodega móvil mediante movimiento auditado.
                </p>
              </div>
            )}

            {/* Campo Obligatorio: Nota o Justificación Administrativa */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span>Justificación Administrativa Obligatoria:</span>
                <span className="text-[10px] text-slate-400">Mínimo 5 caracteres</span>
              </label>
              <textarea
                rows={3}
                value={notaResolucion}
                onChange={(e) => setNotaResolucion(e.target.value)}
                placeholder={
                  accionModal === 'APROBAR'
                    ? 'Ej: Se convalidó la venta con el cliente y se autoriza regularización de stock...'
                    : 'Ej: Se rechaza por duplicidad involuntaria generada al reenviar desde el dispositivo...'
                }
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
              />
            </div>

            {/* Botones de Confirmación */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setOperacionSeleccionada(null)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-800"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleEjecutarResolucion}
                disabled={procesandoResolucion || notaResolucion.trim().length < 5}
                className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-md active:scale-95 transition-all flex items-center gap-2 ${
                  accionModal === 'APROBAR'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'
                    : 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20'
                } disabled:opacity-40`}
              >
                <Check className="w-4 h-4" />
                <span>
                  {procesandoResolucion
                    ? 'Procesando en Kárdex...'
                    : accionModal === 'APROBAR'
                    ? 'Confirmar y Regularizar Kárdex'
                    : 'Confirmar Rechazo'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL DE AUDITORÍA Y TRAZABILIDAD (OPERACIÓN YA RESUELTA)                */}
      {/* ========================================================================= */}
      {operacionDetalle && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-black text-slate-900">
                  Auditoría de Operación Sincronizada
                </h3>
              </div>
              <button
                onClick={() => setOperacionDetalle(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">Estado:</span>
                  <span className="font-extrabold text-slate-800">{operacionDetalle.estado_sync}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block font-bold uppercase">Monto Total:</span>
                  <span className="font-extrabold text-slate-800">
                    S/ {Number(operacionDetalle.datos?.total || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 font-bold block mb-1">Motivo Inicial de Observación:</span>
                <p className="p-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">
                  {operacionDetalle.motivo_observacion}
                </p>
              </div>

              {operacionDetalle.nota_resolucion && (
                <div>
                  <span className="text-slate-500 font-bold block mb-1">Nota Administrativa de Resolución:</span>
                  <p className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 border border-emerald-200">
                    "{operacionDetalle.nota_resolucion}"
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-600">
                <div>
                  <span className="font-bold">Resolutor:</span>{' '}
                  {operacionDetalle.resolutor?.nombre_completo || 'Administrador'}
                </div>
                <div>
                  <span className="font-bold">Fecha Resolución:</span>{' '}
                  {operacionDetalle.fecha_resolucion
                    ? new Date(operacionDetalle.fecha_resolucion).toLocaleString()
                    : '-'}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setOperacionDetalle(null)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
