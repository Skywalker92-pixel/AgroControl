import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle,
  Truck,
  Package,
  DollarSign,
  Smartphone,
  CreditCard,
  Clock,
  ArrowRight,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  Calendar,
  Layers,
} from 'lucide-react';
import { useMobileStore } from '../../store/mobileStore';

export const CierreJornada: React.FC = () => {
  const navigate = useNavigate();
  const {
    cargaActiva,
    colaOperaciones,
    isOnline,
    isSyncing,
    sincronizarTodo,
    ultimaSincronizacion,
  } = useMobileStore();

  if (!cargaActiva) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
          <Truck className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-black text-white">Sin Jornada Activa</h2>
        <p className="text-xs text-slate-400 mt-2 max-w-xs">
          No cuenta con una carga de distribución activa para consolidar el cierre de jornada.
        </p>
        <button
          onClick={() => navigate('/movil/carga')}
          className="mt-6 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold"
        >
          Ir a Mi Carga
        </button>
      </div>
    );
  }

  // Operaciones de la jornada actual
  const operacionesJornada = colaOperaciones.filter(
    (op) => op.carga_distribucion_id === cargaActiva.id,
  );

  // Totales financieros
  const totalVendido = operacionesJornada.reduce((acc, op) => acc + op.total, 0);

  const totalEfectivo = operacionesJornada
    .filter((op) => op.metodo_pago === 'EFECTIVO')
    .reduce((acc, op) => acc + (op.monto_cobrado || 0), 0);

  const totalDigital = operacionesJornada
    .filter((op) => Boolean(op.metodo_pago && ['YAPE', 'PLIN', 'TRANSFERENCIA'].includes(op.metodo_pago)))
    .reduce((acc, op) => acc + (op.monto_cobrado || 0), 0);

  const totalPendiente = operacionesJornada
    .filter((op) => op.metodo_pago === 'PENDIENTE')
    .reduce((acc, op) => acc + (op.total - (op.monto_cobrado || 0)), 0);

  // Estados de sincronización
  const totalOperaciones = operacionesJornada.length;
  const operacionesPendientesSync = operacionesJornada.filter(
    (op) => op.estado_local === 'PENDIENTE',
  ).length;
  const operacionesSincronizadas = operacionesJornada.filter(
    (op) => op.estado_local === 'SINCRONIZADA',
  ).length;
  const operacionesObservadas = operacionesJornada.filter(
    (op) => op.estado_local === 'OBSERVADA',
  ).length;

  const handleSincronizar = async () => {
    try {
      await sincronizarTodo();
    } catch (e: any) {
      alert(`Error de sincronización: ${e.message}`);
    }
  };

  return (
    <div className="space-y-4 pb-16">
      {/* ========================================================================= */}
      {/* 1. CABECERA: RESUMEN DE LA JORNADA                                         */}
      {/* ========================================================================= */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
              MOD-M06: Cierre del Día
            </span>
            <h2 className="text-base font-black text-white mt-1.5 flex items-center gap-2">
              <Truck className="w-4 h-4 text-emerald-400" />
              <span>{cargaActiva.vehiculo.placa}</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Chofer/Ruta: {cargaActiva.chofer?.nombre || 'Vendedor en Ruta'}
            </p>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block">
              Ventas Totales
            </span>
            <span className="text-lg font-black text-emerald-400">
              S/ {totalVendido.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. ARQUEO DE CAJA / COBRANZAS EN RUTA                                      */}
      {/* ========================================================================= */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-emerald-400" />
          <span>Dinero Recaudado para Liquidar</span>
        </h3>

        <div className="grid grid-cols-3 gap-2">
          {/* Efectivo Físico */}
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-400" /> Efectivo
            </span>
            <p className="text-sm font-black text-white mt-1">
              S/ {totalEfectivo.toFixed(2)}
            </p>
            <span className="text-[9px] text-slate-500">Entrega en mano</span>
          </div>

          {/* Digitales (Yape/Plin/Transferencia) */}
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-cyan-400" /> Digital
            </span>
            <p className="text-sm font-black text-white mt-1">
              S/ {totalDigital.toFixed(2)}
            </p>
            <span className="text-[9px] text-slate-500">Yape / Bancos</span>
          </div>

          {/* Cuentas por Cobrar (Crédito) */}
          <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60">
            <span className="text-[10px] uppercase font-bold text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Crédito
            </span>
            <p className="text-sm font-black text-amber-300 mt-1">
              S/ {totalPendiente.toFixed(2)}
            </p>
            <span className="text-[9px] text-slate-500">Por cobrar</span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. SOBRANTES FÍSICOS A DEVOLVER AL ALMACÉN CENTRAL                         */}
      {/* ========================================================================= */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Package className="w-4 h-4 text-emerald-400" />
            <span>Sobrantes Físicos para Almacén</span>
          </h3>
          <span className="text-[10px] text-slate-400">Stock en Vehículo</span>
        </div>

        <div className="space-y-2">
          {cargaActiva.items.map((item) => {
            const vendidas = item.cantidad_cargada_total_base - item.stock_actual_bodega_movil;
            const sobrante = item.stock_actual_bodega_movil;
            const factor = item.presentacion_factor || item.factor_conversion || 1;

            return (
              <div
                key={item.producto_id}
                className="bg-slate-900/80 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs"
              >
                <div className="min-w-0 pr-2">
                  <h4 className="font-extrabold text-white truncate">
                    {item.producto_nombre}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
                    <span>Cargado: {item.cantidad_cargada_total_base} un</span>
                    <span>•</span>
                    <span className="text-emerald-400">Vendido: {vendidas} un</span>
                  </div>
                </div>

                <div className="text-right shrink-0 bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-700">
                  <span className="text-[10px] font-bold text-slate-400 block">
                    Devolver:
                  </span>
                  <span className="text-xs font-black text-amber-400">
                    {sobrante} un
                  </span>
                  {factor > 1 && (
                    <span className="text-[9px] text-slate-500 block">
                      ({Math.floor(sobrante / factor)} cajas + {sobrante % factor} un)
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. ESTADO DE SINCRONIZACIÓN CON LA CENTRAL                                 */}
      {/* ========================================================================= */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span>Estado de Sincronización ({totalOperaciones} ventas)</span>
          </h3>

          <button
            onClick={() => navigate('/movil/sincronizacion')}
            className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1"
          >
            <span>Ver Detalle</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className="text-emerald-400 font-black text-sm block">
              {operacionesSincronizadas}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">En Servidor</span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className={`font-black text-sm block ${operacionesPendientesSync > 0 ? 'text-amber-400' : 'text-slate-500'}`}>
              {operacionesPendientesSync}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">Pendientes</span>
          </div>

          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
            <span className={`font-black text-sm block ${operacionesObservadas > 0 ? 'text-rose-400' : 'text-slate-500'}`}>
              {operacionesObservadas}
            </span>
            <span className="text-[10px] text-slate-400 font-semibold">Observadas</span>
          </div>
        </div>

        {/* Botón Acción Sincronizar */}
        <button
          onClick={handleSincronizar}
          disabled={isSyncing || (!isOnline && operacionesPendientesSync > 0)}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 active:scale-95 transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>
            {isSyncing
              ? 'Sincronizando con PC Central...'
              : operacionesPendientesSync > 0
              ? `Sincronizar ${operacionesPendientesSync} Ventas Pendientes`
              : 'Verificar Sincronización con Central'}
          </span>
        </button>

        {!isOnline && operacionesPendientesSync > 0 && (
          <p className="text-[11px] text-amber-300 text-center flex items-center justify-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>Conéctese a WiFi o datos móviles para liquidar con la PC central.</span>
          </p>
        )}
      </div>

      {/* Nota de Procedimiento de Liquidación */}
      <div className="p-3 bg-slate-900/80 rounded-2xl border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
        <p className="leading-relaxed">
          Al llegar a la base central, entregue el efectivo físico recaudado (
          <strong className="text-white">S/ {totalEfectivo.toFixed(2)}</strong>) y los productos sobrantes
          para la validación final del liquidador en el sistema central.
        </p>
      </div>
    </div>
  );
};
