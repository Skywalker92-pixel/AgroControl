import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Truck,
  Package,
  Layers,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  ShoppingCart,
  Warehouse,
  Calendar,
} from 'lucide-react';
import { useMobileStore } from '../../store/mobileStore';

export const MiCarga: React.FC = () => {
  const navigate = useNavigate();
  const { cargaActiva, ejecutarPull, isSyncing } = useMobileStore();

  const handleRefresh = async () => {
    try {
      await ejecutarPull();
    } catch (e: any) {
      alert(`No se pudo actualizar desde la central: ${e.message}`);
    }
  };

  if (!cargaActiva) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
          <Truck className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-white">Sin Carga Asignada en Ruta</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-xs leading-relaxed">
          No se ha detectado una carga de distribución activa en estado <span className="text-emerald-400 font-bold">EN RUTA</span> para su usuario.
        </p>
        <button
          onClick={handleRefresh}
          disabled={isSyncing}
          className="mt-6 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>Consultar Carga en la Central</span>
        </button>
      </div>
    );
  }

  const totalUnidadesDisponibles = cargaActiva.items.reduce(
    (acc, item) => acc + item.stock_actual_bodega_movil,
    0,
  );
  const totalUnidadesCargadas = cargaActiva.items.reduce(
    (acc, item) => acc + item.cantidad_cargada_total_base,
    0,
  );

  return (
    <div className="space-y-4">
      {/* ========================================================================= */}
      {/* 1. TARJETA RESUMEN DE VEHÍCULO Y RUTA                                      */}
      {/* ========================================================================= */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-black">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white tracking-tight">
                  {cargaActiva.vehiculo.placa}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {cargaActiva.estado}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {cargaActiva.vehiculo.marca} {cargaActiva.vehiculo.modelo}
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={isSyncing}
            className="p-2 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-slate-300 active:scale-95"
            title="Refrescar Carga"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="mt-3.5 pt-3 border-t border-slate-700/60 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Warehouse className="w-3 h-3 text-slate-400" /> Origen
            </span>
            <p className="text-slate-200 font-semibold truncate mt-0.5">
              {cargaActiva.almacen_origen.nombre}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-slate-400" /> Salida
            </span>
            <p className="text-slate-200 font-semibold mt-0.5">
              {new Date(cargaActiva.fecha_salida).toLocaleDateString('es-PE')}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Rápido de Stock a Bordo */}
      <div className="grid grid-cols-2 gap-2.5">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3">
          <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
            Total Inicial Cargado
          </span>
          <p className="text-xl font-black text-slate-200 mt-1 font-mono">
            {totalUnidadesCargadas.toLocaleString('es-PE')}
          </p>
        </div>
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-xl p-3">
          <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-400">
            Stock Actual a Bordo
          </span>
          <p className="text-xl font-black text-emerald-400 mt-1 font-mono">
            {totalUnidadesDisponibles.toLocaleString('es-PE')}
          </p>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. LISTADO DETALLADO DE MERCADERÍA DISPONIBLE                              */}
      {/* ========================================================================= */}
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-400">
            Productos en Bodega Móvil ({cargaActiva.items.length})
          </h3>
          <span className="text-[10px] text-emerald-400 font-semibold">
            Actualización local en vivo
          </span>
        </div>

        {cargaActiva.items.map((item) => {
          const factor = item.presentacion_factor || 1;
          const cajasDisponibles = Math.floor(item.stock_actual_bodega_movil / factor);
          const sueltasDisponibles = Number(
            (item.stock_actual_bodega_movil % factor).toFixed(3),
          );

          const porcentajeRestante =
            item.cantidad_cargada_total_base > 0
              ? Math.max(
                  0,
                  Math.min(
                    100,
                    (item.stock_actual_bodega_movil / item.cantidad_cargada_total_base) * 100,
                  ),
                )
              : 0;

          return (
            <div
              key={item.producto_id}
              className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-3.5 space-y-2.5 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                    {item.producto_codigo}
                  </span>
                  <h4 className="font-extrabold text-sm text-white mt-1 leading-snug">
                    {item.producto_nombre}
                  </h4>
                  {item.presentacion_nombre && (
                    <span className="inline-block text-[10px] font-semibold text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full mt-1">
                      {item.presentacion_nombre} (Factor: {factor})
                    </span>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-slate-400 font-medium">Disponible</div>
                  <div className="text-lg font-black text-emerald-400 font-mono">
                    {item.stock_actual_bodega_movil}{' '}
                    <span className="text-xs text-slate-400 font-sans">{item.unidad_base}</span>
                  </div>
                </div>
              </div>

              {/* Barra de progreso de consumo de stock */}
              <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    porcentajeRestante > 50
                      ? 'bg-emerald-500'
                      : porcentajeRestante > 20
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${porcentajeRestante}%` }}
                />
              </div>

              {/* Desglose de empaques */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
                <span>
                  Inicial:{' '}
                  <strong className="text-slate-300 font-mono">
                    {item.cantidad_cargada_total_base} {item.unidad_base}
                  </strong>
                </span>
                {item.presentacion_factor > 1 && (
                  <span>
                    Equiv:{' '}
                    <strong className="text-emerald-400 font-mono">
                      {cajasDisponibles} cajas + {sueltasDisponibles} {item.unidad_base}
                    </strong>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Botón flotante para Vender */}
      <div className="pt-2">
        <button
          onClick={() => navigate('/movil/venta')}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl text-base shadow-xl shadow-emerald-950 flex items-center justify-center gap-2 active:scale-98 transition-all"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Registrar Venta o Entrega en Ruta</span>
        </button>
      </div>
    </div>
  );
};
