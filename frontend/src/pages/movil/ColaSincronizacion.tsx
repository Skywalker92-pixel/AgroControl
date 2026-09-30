import React, { useState } from 'react';
import {
  RefreshCw,
  Send,
  DownloadCloud,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Smartphone,
  Trash2,
  Wifi,
  WifiOff,
  ChevronDown,
  ChevronUp,
  FileText,
  DollarSign,
} from 'lucide-react';
import { useMobileStore } from '../../store/mobileStore';
import { OperacionSyncLocal } from '../../types';

export const ColaSincronizacion: React.FC = () => {
  const {
    codigoDispositivo,
    dispositivoId,
    dispositivo,
    ultimaSincronizacion,
    colaOperaciones,
    isOnline,
    isSyncing,
    syncError,
    ejecutarPull,
    ejecutarPush,
    sincronizarTodo,
    limpiarHistorialSincronizado,
  } = useMobileStore();

  const [filtroEstado, setFiltroEstado] = useState<
    'TODAS' | 'PENDIENTE' | 'SINCRONIZADA' | 'OBSERVADA'
  >('TODAS');
  const [expandidaId, setExpandidaId] = useState<string | null>(null);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  const pendientes = colaOperaciones.filter((op) => op.estado_local === 'PENDIENTE');
  const sincronizadas = colaOperaciones.filter((op) => op.estado_local === 'SINCRONIZADA');
  const observadas = colaOperaciones.filter((op) => op.estado_local === 'OBSERVADA');

  const operacionesFiltradas = colaOperaciones.filter((op) => {
    if (filtroEstado === 'TODAS') return true;
    return op.estado_local === filtroEstado;
  });

  const handlePush = async () => {
    setMensajeExito(null);
    try {
      const res = await ejecutarPush();
      setMensajeExito(
        `Lote enviado: ${res.enviadas} transacciones enviadas (${res.aplicadas} aplicadas en central, ${res.observadas} observadas).`,
      );
    } catch (e: any) {
      // Error handled by store syncError
    }
  };

  const handlePull = async (completo = false) => {
    setMensajeExito(null);
    try {
      await ejecutarPull(completo);
      setMensajeExito('Catálogo maestro y carga descargados exitosamente.');
    } catch (e: any) {
      // Error handled by store
    }
  };

  const handleSincronizarTodo = async () => {
    setMensajeExito(null);
    try {
      await sincronizarTodo();
      setMensajeExito('Sincronización bidireccional (Push + Pull) finalizada con éxito.');
    } catch (e: any) {
      // Error handled by store
    }
  };

  return (
    <div className="space-y-4 pb-16">
      {/* ========================================================================= */}
      {/* 1. ESTADO DEL TERMINAL Y CONECTIVIDAD                                      */}
      {/* ========================================================================= */}
      <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="text-sm font-black text-white">{codigoDispositivo}</h2>
              <p className="text-[10px] text-slate-400 font-mono">
                {dispositivoId ? `ID: ${dispositivoId.substring(0, 18)}...` : 'No registrado en central'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-300 border-emerald-500/30 bg-emerald-950/60 px-2 py-0.5 rounded-full">
                <Wifi className="w-3 h-3 text-emerald-400" /> Conectado
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-300 border-rose-500/30 bg-rose-950/60 px-2 py-0.5 rounded-full">
                <WifiOff className="w-3 h-3 text-rose-400" /> Sin Conexión
              </span>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-[11px] text-slate-400">
          <span>Última sincronización:</span>
          <span className="font-semibold text-slate-200">
            {ultimaSincronizacion
              ? new Date(ultimaSincronizacion).toLocaleTimeString('es-PE', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                })
              : 'Nunca'}
          </span>
        </div>
      </div>

      {/* Alertas */}
      {syncError && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{syncError}</span>
        </div>
      )}

      {mensajeExito && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{mensajeExito}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. BOTONES DE ACCIÓN DE SINCRONIZACIÓN                                     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handlePull(false)}
          disabled={isSyncing || !isOnline}
          className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 p-3 rounded-xl text-left space-y-1 active:scale-95 transition-all"
        >
          <div className="flex items-center justify-between text-cyan-400">
            <DownloadCloud className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-[10px] font-bold uppercase tracking-wider">PULL</span>
          </div>
          <p className="text-xs font-black text-white">Descargar Catálogo</p>
          <span className="text-[10px] text-slate-400 block">Precios, clientes, carga</span>
        </button>

        <button
          onClick={handlePush}
          disabled={isSyncing || !isOnline || pendientes.length === 0}
          className="bg-emerald-950/60 hover:bg-emerald-900/60 disabled:opacity-40 border border-emerald-800/80 p-3 rounded-xl text-left space-y-1 active:scale-95 transition-all"
        >
          <div className="flex items-center justify-between text-emerald-400">
            <Send className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span className="text-[10px] font-black uppercase tracking-wider">
              {pendientes.length} PUSH
            </span>
          </div>
          <p className="text-xs font-black text-white">Enviar Ventas</p>
          <span className="text-[10px] text-emerald-300 block">Subir cola a central</span>
        </button>
      </div>

      <button
        onClick={handleSincronizarTodo}
        disabled={isSyncing || !isOnline}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 shadow-lg shadow-emerald-950 active:scale-95 transition-all"
      >
        <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
        <span>{isSyncing ? 'Procesando Transacciones...' : 'Sincronizar Todo Ahora (Push + Pull)'}</span>
      </button>

      {/* ========================================================================= */}
      {/* 3. MONITOR DE COLA LOCAL DE OPERACIONES                                    */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-300">
            Transacciones Locales ({colaOperaciones.length})
          </h3>

          {sincronizadas.length > 0 && (
            <button
              onClick={limpiarHistorialSincronizado}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 font-semibold"
            >
              <Trash2 className="w-3 h-3" />
              <span>Limpiar completadas</span>
            </button>
          )}
        </div>

        {/* Pestañas de Filtro */}
        <div className="flex gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 text-[11px]">
          <button
            onClick={() => setFiltroEstado('TODAS')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              filtroEstado === 'TODAS'
                ? 'bg-slate-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas ({colaOperaciones.length})
          </button>
          <button
            onClick={() => setFiltroEstado('PENDIENTE')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              filtroEstado === 'PENDIENTE'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Pend ({pendientes.length})
          </button>
          <button
            onClick={() => setFiltroEstado('SINCRONIZADA')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              filtroEstado === 'SINCRONIZADA'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sync ({sincronizadas.length})
          </button>
          <button
            onClick={() => setFiltroEstado('OBSERVADA')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-all ${
              filtroEstado === 'OBSERVADA'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Obs ({observadas.length})
          </button>
        </div>

        {/* Lista de Operaciones */}
        {operacionesFiltradas.length === 0 ? (
          <div className="text-center py-8 bg-slate-800/40 rounded-2xl border border-slate-800 p-4">
            <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">
              No hay transacciones en este estado.
            </p>
          </div>
        ) : (
          operacionesFiltradas.map((op) => {
            const isExpanded = expandidaId === op.id;

            return (
              <div
                key={op.id}
                className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 space-y-2 shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {op.estado_local === 'PENDIENTE' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        <Clock className="w-3 h-3" /> PENDIENTE
                      </span>
                    )}
                    {op.estado_local === 'SINCRONIZADA' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" /> APLICADA
                      </span>
                    )}
                    {op.estado_local === 'OBSERVADA' && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        <AlertTriangle className="w-3 h-3" /> OBSERVADA
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(op.fecha_operacion).toLocaleTimeString('es-PE', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <span className="text-xs font-black text-emerald-400">
                    S/ {op.total.toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="min-w-0 pr-2">
                    <h4 className="font-extrabold text-xs text-white truncate">
                      {op.cliente_nombre}
                    </h4>
                    <span className="text-[10px] text-slate-400">
                      Pago: <strong className="text-slate-300">{op.metodo_pago}</strong> • {op.detalles.length} ítems
                    </span>
                  </div>

                  <button
                    onClick={() => setExpandidaId(isExpanded ? null : op.id)}
                    className="p-1 rounded-lg bg-slate-700/60 text-slate-300"
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Motivo de Observación si falló en servidor */}
                {op.estado_local === 'OBSERVADA' && op.motivo_observacion && (
                  <div className="p-2 bg-rose-950/50 border border-rose-800/60 rounded-xl text-[11px] text-rose-300">
                    <strong>Motivo de rechazo central:</strong> {op.motivo_observacion}
                  </div>
                )}

                {/* Detalle Desplegable */}
                {isExpanded && (
                  <div className="pt-2 border-t border-slate-700/60 space-y-1.5 text-[11px] bg-slate-900/60 p-2.5 rounded-xl">
                    <p className="text-[10px] text-slate-400 font-mono truncate">
                      UUID: {op.id}
                    </p>
                    <div className="space-y-1 pt-1">
                      {op.detalles.map((d, i) => (
                        <div key={i} className="flex justify-between text-slate-300">
                          <span className="truncate pr-2">
                            {d.cantidad} un x {d.producto_nombre}
                          </span>
                          <span className="font-bold shrink-0">
                            S/ {d.subtotal.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                    {op.observaciones && (
                      <p className="text-[10px] text-slate-400 pt-1 italic">
                        Obs: "{op.observaciones}"
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
