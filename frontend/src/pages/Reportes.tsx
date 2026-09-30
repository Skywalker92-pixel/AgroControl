import React, { useEffect, useState } from 'react';
import {
  FileText,
  Download,
  Printer,
  Search,
  Filter,
  Warehouse,
  History,
  AlertTriangle,
  Truck,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Percent,
  User,
  Activity,
  DollarSign,
} from 'lucide-react';
import { reportesApi, catalogoApi, distribucionApi, usuariosApi } from '../api/services';
import { useWarehouseStore } from '../store/warehouseStore';
import {
  ReporteStockItem,
  ReporteMovimientoItem,
  ReporteMenorStockItem,
  ReporteDespachoItem,
  ReporteConciliacionItem,
  RespuestaReporteConciliacion,
  Categoria,
  RespuestaReporteRutas,
  RespuestaReporteIncidencias,
  RespuestaAuditoriaDistribucion,
  Vehiculo,
  Usuario,
} from '../types';

type TabTipo = 'stock' | 'menor-stock' | 'kardex' | 'despachos' | 'conciliacion' | 'reparto';

export const Reportes: React.FC = () => {
  const { almacenes } = useWarehouseStore();
  const [tabActiva, setTabActiva] = useState<TabTipo>('stock');
  const [isExporting, setIsExporting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [categorias, setCategorias] = useState<Categoria[]>([]);

  // Filtros globales y por pestaña
  const [almacenId, setAlmacenId] = useState<string>('');
  const [categoriaId, setCategoriaId] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  const [fechaDesde, setFechaDesde] = useState<string>('');
  const [fechaHasta, setFechaHasta] = useState<string>('');
  const [tipoMovimiento, setTipoMovimiento] = useState<string>('');
  const [umbralMenorStock, setUmbralMenorStock] = useState<number>(10);

  // Datos de cada reporte
  const [stockItems, setStockItems] = useState<ReporteStockItem[]>([]);
  const [totalStockItems, setTotalStockItems] = useState(0);

  const [menorStockItems, setMenorStockItems] = useState<ReporteMenorStockItem[]>([]);
  const [totalMenorStock, setTotalMenorStock] = useState(0);

  const [kardexItems, setKardexItems] = useState<ReporteMovimientoItem[]>([]);
  const [totalKardexItems, setTotalKardexItems] = useState(0);

  const [despachoItems, setDespachoItems] = useState<ReporteDespachoItem[]>([]);
  const [resumenDespachos, setResumenDespachos] = useState({
    total_despachos: 0,
    suma_total_soles: 0,
    suma_unidades_base: 0,
  });

  const [conciliacionData, setConciliacionData] = useState<RespuestaReporteConciliacion | null>(null);

  // Estados para Módulo de Reparto y Distribución (Hito 10)
  const [repartoSubTab, setRepartoSubTab] = useState<'rendimiento' | 'incidencias' | 'auditoria'>('rendimiento');
  const [repartoRutasData, setRepartoRutasData] = useState<RespuestaReporteRutas | null>(null);
  const [incidenciasData, setIncidenciasData] = useState<RespuestaReporteIncidencias | null>(null);
  const [auditoriaRepartoData, setAuditoriaRepartoData] = useState<RespuestaAuditoriaDistribucion | null>(null);
  const [vehiculosList, setVehiculosList] = useState<Vehiculo[]>([]);
  const [conductoresList, setConductoresList] = useState<Usuario[]>([]);
  const [filtroVehiculoId, setFiltroVehiculoId] = useState<string>('');
  const [filtroTrabajadorId, setFiltroTrabajadorId] = useState<string>('');

  // Cargar catálogos al inicio
  useEffect(() => {
    catalogoApi.listarCategorias().then(setCategorias).catch(console.error);
    distribucionApi.listarVehiculos().then(setVehiculosList).catch(console.error);
    usuariosApi.listar().then(setConductoresList).catch(console.error);
  }, []);

  // Cargar conciliación global fija para widget de salud
  const cargarResumenConciliacion = async () => {
    try {
      const data = await reportesApi.conciliacion();
      setConciliacionData(data);
    } catch (err) {
      console.error('Error al consultar conciliación:', err);
    }
  };

  useEffect(() => {
    cargarResumenConciliacion();
  }, []);

  // Cargar datos según la pestaña activa
  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      if (tabActiva === 'stock') {
        const res = await reportesApi.stockAlmacen({
          ubicacion_id: almacenId || undefined,
          categoria_id: categoriaId || undefined,
        });
        setStockItems(res.items);
        setTotalStockItems(res.total_items);
      } else if (tabActiva === 'menor-stock') {
        const res = await reportesApi.menorStock({
          ubicacion_id: almacenId || undefined,
          umbral: umbralMenorStock || 10,
        });
        setMenorStockItems(res.items);
        setTotalMenorStock(res.total_items);
      } else if (tabActiva === 'kardex') {
        const res = await reportesApi.movimientosKardex({
          ubicacion_id: almacenId || undefined,
          tipo: tipoMovimiento || undefined,
          fecha_desde: fechaDesde || undefined,
          fecha_hasta: fechaHasta || undefined,
          limit: 100,
        });
        setKardexItems(res.items);
        setTotalKardexItems(res.total_items);
      } else if (tabActiva === 'despachos') {
        const res = await reportesApi.despachos({
          ubicacion_id: almacenId || undefined,
          fecha_desde: fechaDesde || undefined,
          fecha_hasta: fechaHasta || undefined,
        });
        setDespachoItems(res.items);
        setResumenDespachos({
          total_despachos: res.total_despachos,
          suma_total_soles: res.suma_total_soles,
          suma_unidades_base: res.suma_unidades_base,
        });
      } else if (tabActiva === 'conciliacion') {
        const res = await reportesApi.conciliacion(almacenId || undefined);
        setConciliacionData(res);
      } else if (tabActiva === 'reparto') {
        const [rutas, incs, aud] = await Promise.all([
          reportesApi.resumenRutas({
            fecha_desde: fechaDesde || undefined,
            fecha_hasta: fechaHasta || undefined,
            vehiculo_id: filtroVehiculoId || undefined,
            trabajador_id: filtroTrabajadorId || undefined,
          }),
          reportesApi.incidenciasDistribucion({
            fecha_desde: fechaDesde || undefined,
            fecha_hasta: fechaHasta || undefined,
            vehiculo_id: filtroVehiculoId || undefined,
            trabajador_id: filtroTrabajadorId || undefined,
          }),
          reportesApi.auditoriaDistribucion({
            fecha_desde: fechaDesde || undefined,
            fecha_hasta: fechaHasta || undefined,
            usuario_id: filtroTrabajadorId || undefined,
            limite: 50,
          }),
        ]);
        setRepartoRutasData(rutas);
        setIncidenciasData(incs);
        setAuditoriaRepartoData(aud);
      }
    } catch (err) {
      console.error('Error al cargar reporte:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [
    tabActiva,
    almacenId,
    categoriaId,
    tipoMovimiento,
    fechaDesde,
    fechaHasta,
    umbralMenorStock,
    filtroVehiculoId,
    filtroTrabajadorId,
  ]);

  // Manejador de exportación CSV
  const exportarCSV = async () => {
    setIsExporting(true);
    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      if (tabActiva === 'stock') {
        await reportesApi.descargarCsv(
          'stock-almacen',
          { ubicacion_id: almacenId, categoria_id: categoriaId },
          `reporte_stock_${timestamp}.csv`,
        );
      } else if (tabActiva === 'menor-stock') {
        await reportesApi.descargarCsv(
          'menor-stock',
          { ubicacion_id: almacenId, umbral: umbralMenorStock },
          `reporte_menor_stock_${timestamp}.csv`,
        );
      } else if (tabActiva === 'kardex') {
        await reportesApi.descargarCsv(
          'movimientos-kardex',
          {
            ubicacion_id: almacenId,
            tipo: tipoMovimiento,
            fecha_desde: fechaDesde,
            fecha_hasta: fechaHasta,
          },
          `reporte_kardex_${timestamp}.csv`,
        );
      } else if (tabActiva === 'despachos') {
        await reportesApi.descargarCsv(
          'despachos',
          { ubicacion_id: almacenId, fecha_desde: fechaDesde, fecha_hasta: fechaHasta },
          `reporte_despachos_${timestamp}.csv`,
        );
      } else if (tabActiva === 'conciliacion') {
        await reportesApi.descargarCsv(
          'conciliacion',
          { ubicacion_id: almacenId },
          `reporte_conciliacion_${timestamp}.csv`,
        );
      } else if (tabActiva === 'reparto') {
        if (repartoSubTab === 'rendimiento') {
          await reportesApi.descargarCsv(
            'distribucion/resumen-rutas',
            {
              fecha_desde: fechaDesde || undefined,
              fecha_hasta: fechaHasta || undefined,
              vehiculo_id: filtroVehiculoId || undefined,
              trabajador_id: filtroTrabajadorId || undefined,
            },
            `reporte_rendimiento_reparto_${timestamp}.csv`,
          );
        } else if (repartoSubTab === 'incidencias') {
          await reportesApi.descargarCsv(
            'distribucion/incidencias',
            {
              fecha_desde: fechaDesde || undefined,
              fecha_hasta: fechaHasta || undefined,
              vehiculo_id: filtroVehiculoId || undefined,
              trabajador_id: filtroTrabajadorId || undefined,
            },
            `reporte_incidencias_distribucion_${timestamp}.csv`,
          );
        } else {
          await reportesApi.descargarCsv(
            'distribucion/auditoria',
            {
              fecha_desde: fechaDesde || undefined,
              fecha_hasta: fechaHasta || undefined,
              usuario_id: filtroTrabajadorId || undefined,
            },
            `reporte_auditoria_distribucion_${timestamp}.csv`,
          );
        }
      }
    } catch (err) {
      console.error('Error al exportar CSV:', err);
      alert('Error al descargar el archivo CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const imprimirReporte = () => {
    window.print();
  };

  const formatearFecha = (fechaStr: string) => {
    try {
      const d = new Date(fechaStr);
      return d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return fechaStr;
    }
  };

  const formatearFechaHora = (fechaStr: string) => {
    try {
      const d = new Date(fechaStr);
      return d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return fechaStr;
    }
  };

  // Filtrado en memoria por texto
  const stockFiltrado = stockItems.filter(
    (i) =>
      i.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      i.codigo_interno.toLowerCase().includes(busqueda.toLowerCase()) ||
      i.categoria.toLowerCase().includes(busqueda.toLowerCase()),
  );

  const kardexFiltrado = kardexItems.filter(
    (i) =>
      i.nombre_producto.toLowerCase().includes(busqueda.toLowerCase()) ||
      i.codigo_producto.toLowerCase().includes(busqueda.toLowerCase()) ||
      (i.motivo && i.motivo.toLowerCase().includes(busqueda.toLowerCase())),
  );

  const despachosFiltrados = despachoItems.filter(
    (i) =>
      i.numero.toLowerCase().includes(busqueda.toLowerCase()) ||
      i.cliente.toLowerCase().includes(busqueda.toLowerCase()) ||
      i.vendedor.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Cabecera Principal (Oculta en impresión) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-emerald-600" />
            Reportes Operativos & Conciliación Automática
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consultas tabulares consolidadas, auditoría matemática de Kárdex y exportación en tiempo real
          </p>
        </div>

        {/* Acciones Generales */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          {/* Widget Estado de Salud */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
              conciliacionData?.estado_global === 'CONCILIADO_OK'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {conciliacionData?.estado_global === 'CONCILIADO_OK' ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            ) : (
              <XCircle className="w-4 h-4 text-rose-600" />
            )}
            <span>
              {conciliacionData?.estado_global === 'CONCILIADO_OK'
                ? 'Inventario 100% Conciliado'
                : `${conciliacionData?.total_discrepancias || 0} Discrepancia(s)`}
            </span>
          </div>

          <button
            onClick={exportarCSV}
            disabled={isExporting || isLoading}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            title="Exportar a archivo CSV (abrible en Excel)"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? 'Exportando...' : 'Exportar CSV'}</span>
          </button>

          <button
            onClick={imprimirReporte}
            className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-lg text-xs font-bold shadow-sm transition-all"
            title="Imprimir vista de reporte"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir</span>
          </button>
        </div>
      </div>

      {/* Cabecera para Impresión Física */}
      <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
              AGROCONTROL PRO - REPORTE OFICIAL
            </h1>
            <p className="text-xs text-slate-600 font-medium">
              Local Principal - Sistema Administrativo Central | RUC: 20608945123
            </p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>Fecha de Emisión: {formatearFecha(new Date().toISOString())}</p>
            <p>Hora: {new Date().toLocaleTimeString('es-PE')}</p>
          </div>
        </div>
        <div className="mt-2 text-sm font-bold text-slate-800">
          REPORTE SELECCIONADO:{' '}
          {tabActiva === 'stock' && 'EXISTENCIAS DE STOCK POR ALMACÉN'}
          {tabActiva === 'menor-stock' && `PRODUCTOS CON MENOR STOCK (UMBRAL <= ${umbralMenorStock})`}
          {tabActiva === 'kardex' && 'MOVIMIENTOS HISTÓRICOS DE KÁRDEX'}
          {tabActiva === 'despachos' && 'DESPACHOS FÍSICOS COMPLETADOS'}
          {tabActiva === 'conciliacion' && 'AUDITORÍA DE CONCILIACIÓN MATEMÁTICA EN TIEMPO REAL'}
          {tabActiva === 'reparto' && 'RENDIMIENTO DE REPARTO, INCIDENCIAS Y TRAZABILIDAD (FASE 2)'}
        </div>
      </div>

      {/* Navegador de Pestañas (Oculto en impresión) */}
      <div className="flex border-b border-slate-200 overflow-x-auto print:hidden gap-1">
        <button
          onClick={() => setTabActiva('stock')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            tabActiva === 'stock'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          <span>Stock por Almacén</span>
        </button>

        <button
          onClick={() => setTabActiva('menor-stock')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            tabActiva === 'menor-stock'
              ? 'border-amber-600 text-amber-700 bg-amber-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>Menor Stock ({totalMenorStock})</span>
        </button>

        <button
          onClick={() => setTabActiva('kardex')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            tabActiva === 'kardex'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Kárdex Histórico</span>
        </button>

        <button
          onClick={() => setTabActiva('despachos')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            tabActiva === 'despachos'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>Despachos Realizados</span>
        </button>

        <button
          onClick={() => setTabActiva('conciliacion')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            tabActiva === 'conciliacion'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Auditoría de Conciliación</span>
        </button>

        <button
          onClick={() => setTabActiva('reparto')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            tabActiva === 'reparto'
              ? 'border-emerald-600 text-emerald-700 bg-emerald-50/50'
              : 'border-transparent text-slate-600 hover:text-slate-900 hover:border-slate-300'
          }`}
        >
          <Truck className="w-4 h-4 text-emerald-600" />
          <span>Rendimiento de Reparto</span>
        </button>
      </div>

      {/* Barra de Filtros Contextuales (Oculta en impresión) */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Almacén selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
            <Warehouse className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={almacenId}
              onChange={(e) => setAlmacenId(e.target.value)}
              className="bg-transparent text-xs text-slate-700 focus:outline-none font-medium cursor-pointer"
            >
              <option value="">Todos los Almacenes</option>
              {almacenes.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.nombre} ({a.codigo})
                </option>
              ))}
            </select>
          </div>

          {/* Categoría (si pestaña de Stock) */}
          {tabActiva === 'stock' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none font-medium cursor-pointer"
              >
                <option value="">Todas las Categorías</option>
                {categorias.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tipo de Movimiento (si pestaña Kárdex) */}
          {tabActiva === 'kardex' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={tipoMovimiento}
                onChange={(e) => setTipoMovimiento(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none font-medium cursor-pointer"
              >
                <option value="">Todos los Tipos</option>
                <option value="INGRESO_COMPRA">Ingreso por Compra</option>
                <option value="SALIDA_VENTA">Salida por Venta / Despacho</option>
                <option value="TRASLADO_SALIDA">Traslado (Salida)</option>
                <option value="TRASLADO_ENTRADA">Traslado (Entrada)</option>
                <option value="AJUSTE_POSITIVO">Ajuste Positivo</option>
                <option value="AJUSTE_NEGATIVO">Ajuste Negativo</option>
              </select>
            </div>
          )}

          {/* Sub-pestañas y Filtros específicos de Reparto (Fase 2 / Hito 10) */}
          {tabActiva === 'reparto' && (
            <>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button
                  type="button"
                  onClick={() => setRepartoSubTab('rendimiento')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    repartoSubTab === 'rendimiento'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Rendimiento Rutas
                </button>
                <button
                  type="button"
                  onClick={() => setRepartoSubTab('incidencias')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1 ${
                    repartoSubTab === 'incidencias'
                      ? 'bg-white text-amber-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>Incidencias</span>
                  {incidenciasData && incidenciasData.resumen.total_incidencias > 0 && (
                    <span className="px-1.5 py-0.2 bg-amber-500 text-white rounded-full text-[10px]">
                      {incidenciasData.resumen.total_incidencias}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setRepartoSubTab('auditoria')}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    repartoSubTab === 'auditoria'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Auditoría Eventos
                </button>
              </div>

              {/* Selector de Conductor en Reparto */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
                <User className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={filtroTrabajadorId}
                  onChange={(e) => setFiltroTrabajadorId(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="">Todos los Conductores</option>
                  {conductoresList
                    .filter((u) => u.rol === 'VENDEDOR')
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.nombre_completo}
                      </option>
                    ))}
                </select>
              </div>

              {/* Selector de Vehículo en Reparto */}
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
                <Truck className="w-3.5 h-3.5 text-slate-500" />
                <select
                  value={filtroVehiculoId}
                  onChange={(e) => setFiltroVehiculoId(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 focus:outline-none font-medium cursor-pointer"
                >
                  <option value="">Todos los Vehículos</option>
                  {vehiculosList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.placa} {v.marca ? `(${v.marca})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Fechas (si Kárdex, Despachos o Reparto) */}
          {(tabActiva === 'kardex' || tabActiva === 'despachos' || tabActiva === 'reparto') && (
            <>
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] text-slate-500">Desde:</span>
                <input
                  type="date"
                  value={fechaDesde}
                  onChange={(e) => setFechaDesde(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 focus:outline-none font-medium"
                />
              </div>

              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-[11px] text-slate-500">Hasta:</span>
                <input
                  type="date"
                  value={fechaHasta}
                  onChange={(e) => setFechaHasta(e.target.value)}
                  className="bg-transparent text-xs text-slate-700 focus:outline-none font-medium"
                />
              </div>
            </>
          )}

          {/* Umbral (si Menor Stock) */}
          {tabActiva === 'menor-stock' && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-[11px] text-slate-500">Stock menor o igual a:</span>
              <input
                type="number"
                min="1"
                value={umbralMenorStock}
                onChange={(e) => setUmbralMenorStock(Number(e.target.value))}
                className="w-16 bg-transparent text-xs text-slate-800 font-bold focus:outline-none"
              />
              <span className="text-[10px] text-slate-400">unidades</span>
            </div>
          )}

          {/* Buscador de texto */}
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por código, nombre o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <button
            onClick={() => cargarDatos()}
            className="p-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Refrescar reporte"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Contenido Dinámico de Cada Reporte */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-xl border border-slate-200">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto text-emerald-600 mb-2" />
          <p className="text-xs font-medium">Consultando registros y calculando saldos...</p>
        </div>
      ) : (
        <>
          {/* 1. REPORTE DE STOCK POR ALMACÉN */}
          {tabActiva === 'stock' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Código</th>
                        <th className="py-3 px-4">Producto</th>
                        <th className="py-3 px-4">Categoría</th>
                        <th className="py-3 px-4">Almacén</th>
                        <th className="py-3 px-4 text-right">Físico</th>
                        <th className="py-3 px-4 text-right">Reservado</th>
                        <th className="py-3 px-4 text-right">Disponible</th>
                        <th className="py-3 px-4 text-center">Unidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {stockFiltrado.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                            No se encontraron registros de stock con los filtros aplicados.
                          </td>
                        </tr>
                      ) : (
                        stockFiltrado.map((item, idx) => (
                          <tr key={`${item.producto_id}-${item.almacen_id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                              {item.codigo_interno}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-900">
                              {item.nombre}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[11px] font-medium">
                                {item.categoria}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-slate-700">
                              {item.almacen_nombre} ({item.almacen_tipo})
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-slate-800">
                              {Number(item.cantidad_fisica).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-medium text-amber-700">
                              {Number(item.cantidad_reservada) > 0 ? (
                                <span className="bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                                  {Number(item.cantidad_reservada).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                                </span>
                              ) : (
                                '0.00'
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-right font-black text-emerald-700">
                              {Number(item.cantidad_disponible).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-center font-bold text-slate-500 uppercase text-[10px]">
                              {item.unidad_base}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
                  <span>Total productos listados: <strong>{stockFiltrado.length}</strong></span>
                  <span className="text-[11px]">Invariante: Físico - Reservado = Disponible</span>
                </div>
              </div>
            </div>
          )}

          {/* 2. REPORTE DE PRODUCTOS CON MENOR STOCK */}
          {tabActiva === 'menor-stock' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  <div>
                    <h3 className="text-xs font-bold text-amber-900">
                      Alerta Temprana de Reposición
                    </h3>
                    <p className="text-[11px] text-amber-700">
                      Mostrando productos con stock disponible menor o igual a {umbralMenorStock} unidades base.
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-amber-900 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                    {totalMenorStock} producto(s) en alerta
                  </span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Código</th>
                        <th className="py-3 px-4">Producto</th>
                        <th className="py-3 px-4">Categoría</th>
                        <th className="py-3 px-4">Almacén</th>
                        <th className="py-3 px-4 text-right">Físico</th>
                        <th className="py-3 px-4 text-right">Disponible</th>
                        <th className="py-3 px-4 text-center">Unidad</th>
                        <th className="py-3 px-4 text-center">Estado Alerta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {menorStockItems.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                            Excelente: No hay productos con stock menor o igual a {umbralMenorStock}.
                          </td>
                        </tr>
                      ) : (
                        menorStockItems.map((item, idx) => (
                          <tr key={`${item.producto_id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                              {item.codigo_interno}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-900">
                              {item.nombre}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {item.categoria}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700">
                              {item.almacen}
                            </td>
                            <td className="py-2.5 px-4 text-right font-medium text-slate-700">
                              {Number(item.cantidad_fisica).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-black text-rose-600">
                              {Number(item.cantidad_disponible).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-center font-bold text-slate-500 uppercase text-[10px]">
                              {item.unidad_base}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {item.estado_alerta === 'CRITICO_SIN_STOCK' ? (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px] border border-rose-200">
                                  SIN STOCK
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px] border border-amber-200">
                                  STOCK BAJO
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
            </div>
          )}

          {/* 3. REPORTE DE MOVIMIENTOS HISTÓRICOS DE KÁRDEX */}
          {tabActiva === 'kardex' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Fecha y Hora</th>
                        <th className="py-3 px-4">Tipo Operación</th>
                        <th className="py-3 px-4">Código</th>
                        <th className="py-3 px-4">Producto</th>
                        <th className="py-3 px-4">Almacén</th>
                        <th className="py-3 px-4 text-right">Cantidad</th>
                        <th className="py-3 px-4">Documento</th>
                        <th className="py-3 px-4">Motivo / Detalle</th>
                        <th className="py-3 px-4">Usuario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {kardexFiltrado.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400 font-medium">
                            No se encontraron movimientos registrados en el período y filtros seleccionados.
                          </td>
                        </tr>
                      ) : (
                        kardexFiltrado.map((m) => {
                          const esEntrada = Number(m.cantidad_base) > 0;
                          return (
                            <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">
                                {formatearFechaHora(m.fecha_operacion)}
                              </td>
                              <td className="py-2.5 px-4">
                                <span
                                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                    esEntrada
                                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-800 border border-rose-200'
                                  }`}
                                >
                                  {esEntrada ? (
                                    <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <ArrowDownRight className="w-3 h-3 text-rose-600" />
                                  )}
                                  {m.tipo}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                                {m.codigo_producto}
                              </td>
                              <td className="py-2.5 px-4 font-medium text-slate-900">
                                {m.nombre_producto}
                              </td>
                              <td className="py-2.5 px-4 text-slate-700">
                                {m.almacen}
                              </td>
                              <td
                                className={`py-2.5 px-4 text-right font-black ${
                                  esEntrada ? 'text-emerald-700' : 'text-rose-700'
                                }`}
                              >
                                {esEntrada ? '+' : ''}
                                {Number(m.cantidad_base).toLocaleString('es-PE', { minimumFractionDigits: 2 })}{' '}
                                <span className="text-[10px] text-slate-400 font-normal">
                                  {m.unidad_base}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 font-mono text-slate-600 text-[11px]">
                                {m.documento_tipo || '-'}
                              </td>
                              <td className="py-2.5 px-4 text-slate-600 italic">
                                {m.motivo || '-'}
                              </td>
                              <td className="py-2.5 px-4 text-slate-700 text-[11px]">
                                {m.usuario}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 text-xs text-slate-500 flex justify-between items-center">
                  <span>Registros mostrados: <strong>{kardexFiltrado.length}</strong> (Libro Kárdex Inmutable)</span>
                  <span className="text-[11px]">Solo lectura e inserción transaccional protegida</span>
                </div>
              </div>
            </div>
          )}

          {/* 4. REPORTE DE DESPACHOS REALIZADOS */}
          {tabActiva === 'despachos' && (
            <div className="space-y-4">
              {/* Tarjetas de Resumen de Carga y Ventas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Despachos Completados</p>
                    <p className="text-xl font-black text-slate-900 mt-1">
                      {resumenDespachos.total_despachos}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                    <Truck className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Unidades Físicas Despachadas</p>
                    <p className="text-xl font-black text-slate-900 mt-1">
                      {Number(resumenDespachos.suma_unidades_base).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                    <Layers className="w-5 h-5" />
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-500">Total Facturado / Proformado</p>
                    <p className="text-xl font-black text-emerald-700 mt-1">
                      S/ {Number(resumenDespachos.suma_total_soles).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">N° Documento</th>
                        <th className="py-3 px-4">Fecha Despacho</th>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4">Almacén Origen</th>
                        <th className="py-3 px-4">Vendedor</th>
                        <th className="py-3 px-4 text-center">Ítems</th>
                        <th className="py-3 px-4 text-right">Cant. Base</th>
                        <th className="py-3 px-4 text-right">Total (S/)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {despachosFiltrados.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                            No se encontraron despachos en el rango seleccionado.
                          </td>
                        </tr>
                      ) : (
                        despachosFiltrados.map((d) => (
                          <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-emerald-700">
                              {d.numero}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600 font-mono text-[11px]">
                              {formatearFechaHora(d.fecha_despacho)}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-900">
                              {d.cliente}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700">
                              {d.almacen}
                            </td>
                            <td className="py-2.5 px-4 text-slate-600">
                              {d.vendedor}
                            </td>
                            <td className="py-2.5 px-4 text-center font-bold text-slate-700">
                              {d.total_items}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-slate-800">
                              {Number(d.total_unidades_base).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-black text-slate-900">
                              S/ {Number(d.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
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

          {/* 5. AUDITORÍA DE CONCILIACIÓN MATEMÁTICA */}
          {tabActiva === 'conciliacion' && conciliacionData && (
            <div className="space-y-4">
              {/* Tarjeta de Estado de Auditoría Global */}
              <div
                className={`p-5 rounded-xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                  conciliacionData.estado_global === 'CONCILIADO_OK'
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-rose-50/70 border-rose-200'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl ${
                      conciliacionData.estado_global === 'CONCILIADO_OK'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {conciliacionData.estado_global === 'CONCILIADO_OK' ? (
                      <ShieldCheck className="w-8 h-8" />
                    ) : (
                      <XCircle className="w-8 h-8" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2
                        className={`text-base font-black tracking-tight ${
                          conciliacionData.estado_global === 'CONCILIADO_OK'
                            ? 'text-emerald-900'
                            : 'text-rose-900'
                        }`}
                      >
                        {conciliacionData.estado_global === 'CONCILIADO_OK'
                          ? 'SISTEMA DE INVENTARIO ÍNTEGRO: 100% CONCILIADO'
                          : 'ALERTA: DISCREPANCIA DETECTADA EN INVENTARIO'}
                      </h2>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">
                      Fórmula de Auditoría en Tiempo Real:
                      <code className="mx-1 bg-white/80 px-1.5 py-0.5 rounded border text-[11px] font-mono">
                        stock_saldo.cantidad_fisica == SUM(movimiento_kardex.cantidad_base)
                      </code>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-white/90 px-3 py-2 rounded-lg border border-slate-200 text-center">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Evaluados</p>
                    <p className="text-sm font-black text-slate-800">{conciliacionData.total_evaluados}</p>
                  </div>
                  <div className="bg-white/90 px-3 py-2 rounded-lg border border-slate-200 text-center">
                    <p className="text-[10px] text-emerald-600 font-bold uppercase">Conciliados</p>
                    <p className="text-sm font-black text-emerald-700">{conciliacionData.total_conciliados}</p>
                  </div>
                  <div className="bg-white/90 px-3 py-2 rounded-lg border border-slate-200 text-center">
                    <p className="text-[10px] text-rose-600 font-bold uppercase">Discrepancias</p>
                    <p className="text-sm font-black text-rose-700">{conciliacionData.total_discrepancias}</p>
                  </div>
                </div>
              </div>

              {/* Tabla de Conciliación Detallada */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                        <th className="py-3 px-4">Código</th>
                        <th className="py-3 px-4">Producto</th>
                        <th className="py-3 px-4">Almacén</th>
                        <th className="py-3 px-4 text-right">Saldo Físico (stock_saldo)</th>
                        <th className="py-3 px-4 text-right">Total Kárdex (SUM kardex)</th>
                        <th className="py-3 px-4 text-right">Diferencia</th>
                        <th className="py-3 px-4 text-center">Estado Auditoría</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {conciliacionData.items.map((item, idx) => {
                        const esOk = item.estado === 'CONCILIADO_OK';
                        return (
                          <tr key={`${item.producto_id}-${item.ubicacion_id}-${idx}`} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-800">
                              {item.codigo_interno}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-900">
                              {item.nombre_producto}
                            </td>
                            <td className="py-2.5 px-4 text-slate-700">
                              {item.almacen_nombre}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                              {Number(item.saldo_fisico).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-slate-700">
                              {Number(item.total_kardex).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </td>
                            <td className={`py-2.5 px-4 text-right font-black ${esOk ? 'text-slate-400' : 'text-rose-600'}`}>
                              {Number(item.discrepancia).toFixed(2)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              {esOk ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold text-[10px] border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  CONCILIADO OK
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold text-[10px] border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  DISCREPANCIA
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ==================================================================== */}
          {/* PESTAÑA 6: RENDIMIENTO DE REPARTO, INCIDENCIAS Y AUDITORÍA (HITO 10)  */}
          {/* ==================================================================== */}
          {tabActiva === 'reparto' && repartoRutasData && (
            <div className="space-y-6">
              {/* Tarjetas de Métricas de Reparto (KPIs) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Cargas Realizadas
                    </span>
                    <Truck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-slate-900 mt-2 font-mono">
                    {repartoRutasData.resumen.total_liquidaciones}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    <strong className="text-emerald-700 font-semibold">{repartoRutasData.resumen.total_conciliadas} conciliadas</strong> / <strong className="text-amber-700 font-semibold">{repartoRutasData.resumen.total_observadas} observadas</strong>
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Total Vendido en Ruta
                    </span>
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                  </div>
                  <p className="text-2xl font-black text-emerald-700 mt-2 font-mono">
                    S/ {repartoRutasData.resumen.total_vendido_soles.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Cobrado en Caja: S/ {repartoRutasData.resumen.total_cobrado_soles.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Efectividad Global Venta
                    </span>
                    <Percent className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className="text-2xl font-black text-indigo-700 mt-2 font-mono">
                    {repartoRutasData.resumen.efectividad_global_porcentaje.toFixed(1)}%
                  </p>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full"
                      style={{ width: `${Math.min(100, Math.max(0, repartoRutasData.resumen.efectividad_global_porcentaje))}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {repartoRutasData.resumen.total_unidades_vendidas} de {repartoRutasData.resumen.total_unidades_cargadas} unidades
                  </p>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Incidencias de Cuadre
                    </span>
                    <AlertTriangle className={`w-4 h-4 ${incidenciasData && incidenciasData.resumen.total_incidencias > 0 ? 'text-amber-600' : 'text-slate-400'}`} />
                  </div>
                  <p className={`text-2xl font-black mt-2 font-mono ${incidenciasData && incidenciasData.resumen.total_incidencias > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
                    {incidenciasData ? incidenciasData.resumen.total_incidencias : 0}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Descalce Dinero: S/ {incidenciasData ? incidenciasData.resumen.total_descalce_dinero_soles.toFixed(2) : '0.00'}
                  </p>
                </div>
              </div>

              {/* VISTA 1: RENDIMIENTO POR CONDUCTOR Y VEHÍCULO */}
              {repartoSubTab === 'rendimiento' && (
                <div className="space-y-6">
                  {/* Tabla Agrupada por Conductor y Vehículo */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">
                          Rendimiento y Efectividad por Conductor / Vehículo
                        </h3>
                        <p className="text-xs text-slate-500">
                          Métricas acumuladas de cargas, porcentaje de efectividad de venta y montos recaudados
                        </p>
                      </div>
                      <span className="text-xs font-bold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                        {repartoRutasData.rendimiento.length} conductor(es) evaluado(s)
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                            <th className="py-3 px-4">Conductor</th>
                            <th className="py-3 px-4">Vehículo</th>
                            <th className="py-3 px-4 text-center">Cargas</th>
                            <th className="py-3 px-4 text-right">Cargado</th>
                            <th className="py-3 px-4 text-right">Vendido</th>
                            <th className="py-3 px-4 text-right">Retornado</th>
                            <th className="py-3 px-4 text-center w-36">Efectividad Venta</th>
                            <th className="py-3 px-4 text-right">Total Vendido (S/)</th>
                            <th className="py-3 px-4 text-right">Total Cobrado (S/)</th>
                            <th className="py-3 px-4 text-right">Diferencia (S/)</th>
                            <th className="py-3 px-4 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {repartoRutasData.rendimiento.length === 0 ? (
                            <tr>
                              <td colSpan={11} className="py-8 text-center text-slate-400 italic">
                                No se encontraron registros de liquidación de rutas con los filtros seleccionados.
                              </td>
                            </tr>
                          ) : (
                            repartoRutasData.rendimiento.map((r) => (
                              <tr key={`${r.conductor_id}-${r.vehiculo_id}`} className="hover:bg-slate-50 transition-colors">
                                <td className="py-3 px-4">
                                  <div className="font-bold text-slate-900">{r.conductor_nombre}</div>
                                  <div className="text-[11px] text-slate-400">@{r.conductor_username}</div>
                                </td>
                                <td className="py-3 px-4">
                                  <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                    {r.vehiculo_placa}
                                  </span>
                                  {r.vehiculo_marca && (
                                    <span className="text-[11px] text-slate-500 block mt-0.5">
                                      {r.vehiculo_marca} {r.vehiculo_modelo}
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-center font-bold text-slate-800">
                                  {r.cantidad_cargas}
                                </td>
                                <td className="py-3 px-4 text-right font-mono text-slate-700">
                                  {r.total_cargado_unidades.toFixed(3)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                                  {r.total_vendido_unidades.toFixed(3)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                                  {r.total_retornado_unidades.toFixed(3)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                                    <span>{r.efectividad_venta_porcentaje.toFixed(1)}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-1.5 rounded-full ${
                                        r.efectividad_venta_porcentaje >= 70
                                          ? 'bg-emerald-600'
                                          : r.efectividad_venta_porcentaje >= 40
                                          ? 'bg-amber-500'
                                          : 'bg-rose-500'
                                      }`}
                                      style={{ width: `${Math.min(100, Math.max(0, r.efectividad_venta_porcentaje))}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-slate-900 font-mono">
                                  S/ {r.total_vendido_soles.toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-right font-bold text-emerald-700 font-mono">
                                  S/ {r.total_cobrado_soles.toFixed(2)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold">
                                  <span className={r.diferencia_dinero_soles === 0 ? 'text-slate-700' : r.diferencia_dinero_soles < 0 ? 'text-rose-600' : 'text-emerald-700'}>
                                    S/ {r.diferencia_dinero_soles.toFixed(2)}
                                  </span>
                                </td>
                                <td className="py-3 px-4 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    {r.cargas_observadas > 0 ? (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                        {r.cargas_observadas} obs
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                        100% OK
                                      </span>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Detalle de Rutas y Liquidaciones Individuales */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">
                          Historial Detallado de Cargas y Rutas Liquidadas
                        </h4>
                        <p className="text-xs text-slate-500">
                          Listado cronológico de expediciones de distribución con balance físico y financiero
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-slate-500">
                        Total: {repartoRutasData.rutas.length} liquidaciones
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                            <th className="py-3 px-4">Liquidación / Carga</th>
                            <th className="py-3 px-4">Fecha</th>
                            <th className="py-3 px-4">Conductor</th>
                            <th className="py-3 px-4">Placa</th>
                            <th className="py-3 px-4 text-right">Cargado</th>
                            <th className="py-3 px-4 text-right">Vendido</th>
                            <th className="py-3 px-4 text-right">Retornado</th>
                            <th className="py-3 px-4 text-center">Efectividad</th>
                            <th className="py-3 px-4 text-right">Vendido (S/)</th>
                            <th className="py-3 px-4 text-right">Cobrado (S/)</th>
                            <th className="py-3 px-4 text-center">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {repartoRutasData.rutas.map((ruta) => (
                            <tr key={ruta.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-4">
                                <span className="font-mono font-bold text-slate-900 block">{ruta.codigo_liquidacion}</span>
                                <span className="text-[11px] text-slate-400 font-mono">Carga: {ruta.codigo_carga}</span>
                              </td>
                              <td className="py-2.5 px-4 text-slate-600">
                                {formatearFecha(ruta.fecha_liquidacion)}
                              </td>
                              <td className="py-2.5 px-4 font-semibold text-slate-900">
                                {ruta.conductor}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                  {ruta.vehiculo_placa}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono">{ruta.total_cargado.toFixed(3)}</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-900">{ruta.total_vendido.toFixed(3)}</td>
                              <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-700">{ruta.total_retornado.toFixed(3)}</td>
                              <td className="py-2.5 px-4 text-center font-bold font-mono text-slate-800">
                                {ruta.efectividad_porcentaje.toFixed(1)}%
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-900 font-mono">
                                S/ {ruta.total_vendido_soles.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-4 text-right font-bold text-emerald-700 font-mono">
                                S/ {ruta.total_cobrado_soles.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  ruta.estado === 'CONCILIADA'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                    : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  {ruta.estado}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* VISTA 2: REPORTE DE INCIDENCIAS DE LIQUIDACIÓN (OBSERVADAS) */}
              {repartoSubTab === 'incidencias' && incidenciasData && (
                <div className="space-y-4">
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-sm">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-amber-950 text-sm">
                          Liquidaciones Observadas por Descalce de Inventario o Dinero
                        </h3>
                        <p className="text-xs text-amber-800">
                          Muestra las liquidaciones donde la ecuación de ruta presentó faltantes, sobrantes o dinero no entregado, junto con su justificación administrativa.
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-black font-mono text-amber-900 bg-white px-3 py-1.5 rounded-lg border border-amber-200">
                      {incidenciasData.items.length} Incidencia(s)
                    </span>
                  </div>

                  {incidenciasData.items.length === 0 ? (
                    <div className="bg-white p-12 text-center rounded-xl border border-slate-200">
                      <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
                      <h4 className="font-bold text-slate-800 text-base">¡Sin incidencias observadas!</h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Todas las liquidaciones de distribución registradas se encuentran en estado CONCILIADA con cuadre exacto.
                      </p>
                    </div>
                  ) : (
                    incidenciasData.items.map((inc) => (
                      <div key={inc.id} className="bg-white rounded-xl border border-amber-200 shadow-sm overflow-hidden">
                        <div className="p-4 bg-amber-50/40 border-b border-amber-200 flex flex-wrap justify-between items-center gap-2">
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-900 text-sm">
                              {inc.codigo_liquidacion}
                            </span>
                            <span className="text-xs text-slate-500">
                              Carga: <strong className="font-mono text-slate-800">{inc.codigo_carga}</strong>
                            </span>
                            <span className="text-xs text-slate-500">
                              Fecha: {formatearFecha(inc.fecha_liquidacion)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-600">
                              Conductor: <strong>{inc.conductor}</strong>
                            </span>
                            <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {inc.vehiculo_placa}
                            </span>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-black text-[10px] rounded uppercase border border-amber-300">
                              {inc.tipo_incidencia}
                            </span>
                          </div>
                        </div>

                        {/* Desglose de dinero */}
                        <div className="px-4 py-3 bg-slate-50/70 border-b border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 block">Total Vendido</span>
                            <span className="font-bold text-slate-900">S/ {inc.total_vendido.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Total Cobrado (Caja)</span>
                            <span className="font-bold text-emerald-700">S/ {inc.total_cobrado.toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Descalce Dinero</span>
                            <span className={`font-bold ${inc.diferencia_dinero !== 0 ? 'text-rose-600' : 'text-slate-700'}`}>
                              S/ {inc.diferencia_dinero.toFixed(2)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400 block">Liquidador Responsable</span>
                            <span className="font-semibold text-slate-800">{inc.liquidador}</span>
                          </div>
                        </div>

                        {/* Tabla de ítems con discrepancia */}
                        <div className="p-4">
                          <h5 className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                            Discrepancias Físicas en Mercadería ({inc.items_con_incidencia.length} ítems):
                          </h5>
                          <table className="w-full text-left border-collapse text-xs border border-slate-200 rounded-lg overflow-hidden">
                            <thead>
                              <tr className="bg-slate-100 text-slate-700 border-b border-slate-200 font-semibold">
                                <th className="py-2 px-3">Insumo</th>
                                <th className="py-2 px-3 text-right">Cargado</th>
                                <th className="py-2 px-3 text-right">Vendido</th>
                                <th className="py-2 px-3 text-right">Retornado</th>
                                <th className="py-2 px-3 text-center">Diferencia</th>
                                <th className="py-2 px-3">Justificación Administrativa</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {inc.items_con_incidencia.map((det) => (
                                <tr key={det.producto_id} className="hover:bg-slate-50">
                                  <td className="py-2 px-3">
                                    <span className="font-bold text-slate-900 block">{det.nombre_producto}</span>
                                    <span className="font-mono text-[10px] text-slate-400">{det.codigo_interno}</span>
                                  </td>
                                  <td className="py-2 px-3 text-right font-mono">{det.cantidad_cargada.toFixed(3)} {det.unidad_base}</td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-slate-800">{det.cantidad_vendida.toFixed(3)}</td>
                                  <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">{det.cantidad_retornada.toFixed(3)}</td>
                                  <td className="py-2 px-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[11px] font-black ${det.tipo_diferencia === 'FALTANTE' ? 'bg-rose-100 text-rose-800' : 'bg-indigo-100 text-indigo-800'}`}>
                                      {det.diferencia > 0 ? '-' : '+'}{Math.abs(det.diferencia).toFixed(3)} ({det.tipo_diferencia})
                                    </span>
                                  </td>
                                  <td className="py-2 px-3 text-amber-900 font-semibold italic text-[11px]">
                                    "{det.justificacion}"
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* VISTA 3: BITÁCORA DE AUDITORÍA DE REPARTO */}
              {repartoSubTab === 'auditoria' && auditoriaRepartoData && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">
                        Bitácora de Trazabilidad y Auditoría de Distribución
                      </h3>
                      <p className="text-xs text-slate-500">
                        Registro inmutable de autorizaciones de salida a ruta, liquidaciones de inventario y modificaciones en flota
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-600 bg-white px-2.5 py-1 rounded border border-slate-200">
                      {auditoriaRepartoData.items.length} eventos registrados
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100/80 text-slate-700 border-b border-slate-200 font-bold uppercase tracking-wider text-[11px]">
                          <th className="py-3 px-4">Fecha y Hora</th>
                          <th className="py-3 px-4">Entidad</th>
                          <th className="py-3 px-4 text-center">Acción</th>
                          <th className="py-3 px-4">Descripción del Evento</th>
                          <th className="py-3 px-4">Usuario Autorizador</th>
                          <th className="py-3 px-4 text-center">Rol</th>
                          <th className="py-3 px-4 text-slate-400">IP Origen</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {auditoriaRepartoData.items.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                              No se encontraron eventos de auditoría para los filtros aplicados.
                            </td>
                          </tr>
                        ) : (
                          auditoriaRepartoData.items.map((ev) => (
                            <tr key={ev.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-4 font-mono text-slate-700 whitespace-nowrap">
                                {formatearFecha(ev.fecha)}
                              </td>
                              <td className="py-2.5 px-4">
                                <span className="font-mono text-[11px] font-bold text-slate-800 uppercase bg-slate-100 px-2 py-0.5 rounded">
                                  {ev.entidad}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  ev.accion === 'INSERT'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ev.accion === 'UPDATE'
                                    ? 'bg-indigo-100 text-indigo-800'
                                    : 'bg-rose-100 text-rose-800'
                                }`}>
                                  {ev.accion}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 font-semibold text-slate-900">
                                {ev.descripcion}
                              </td>
                              <td className="py-2.5 px-4 font-medium text-slate-800">
                                {ev.usuario_nombre}
                              </td>
                              <td className="py-2.5 px-4 text-center text-slate-600 text-[11px]">
                                {ev.usuario_rol}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                                {ev.ip_origen}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
