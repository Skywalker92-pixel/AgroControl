import React, { useEffect, useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  RefreshCw,
  Power,
  ShieldCheck,
  ShieldAlert,
  Clock,
  User,
} from 'lucide-react';
import { syncApi } from '../api/services';
import { DispositivoMovil } from '../types';

export const DispositivosMoviles: React.FC = () => {
  const [dispositivos, setDispositivos] = useState<DispositivoMovil[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'PENDIENTE' | 'AUTORIZADO' | 'INACTIVO'>('TODOS');
  const [busqueda, setBusqueda] = useState('');
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const data = await syncApi.listarDispositivos({
        estado: filtroEstado === 'TODOS' ? undefined : filtroEstado,
        busqueda: busqueda.trim() || undefined,
      });
      setDispositivos(data || []);
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al cargar terminales móviles.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroEstado]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    cargarDatos();
  };

  const handleAutorizar = async (id: string, codigo: string) => {
    setFeedback(null);
    try {
      await syncApi.autorizarDispositivo(id);
      setFeedback({
        tipo: 'ok',
        texto: `Terminal '${codigo}' autorizada exitosamente. Ahora puede sincronizar datos.`,
      });
      cargarDatos();
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al autorizar terminal.',
      });
    }
  };

  const handleRevocar = async (id: string, codigo: string) => {
    if (!window.confirm(`¿Está seguro de revocar la autorización de la terminal '${codigo}'? No podrá sincronizar hasta nueva aprobación.`)) {
      return;
    }
    setFeedback(null);
    try {
      await syncApi.revocarDispositivo(id);
      setFeedback({
        tipo: 'ok',
        texto: `Autorización de la terminal '${codigo}' revocada exitosamente.`,
      });
      cargarDatos();
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al revocar terminal.',
      });
    }
  };

  const handleAlternarEstado = async (id: string, estadoActual: boolean, codigo: string) => {
    setFeedback(null);
    try {
      await syncApi.alternarEstadoDispositivo(id, !estadoActual);
      setFeedback({
        tipo: 'ok',
        texto: `Terminal '${codigo}' ${!estadoActual ? 'activada' : 'desactivada'} correctamente.`,
      });
      cargarDatos();
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al cambiar estado de la terminal.',
      });
    }
  };

  const formatearFecha = (fechaStr?: string | null) => {
    if (!fechaStr) return 'Nunca';
    const f = new Date(fechaStr);
    return f.toLocaleString('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-indigo-600" />
            Administración de Terminales Móviles
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Autorización, auditoría y control de acceso de dispositivos Android en ruta (OBS-MOB-01)
          </p>
        </div>

        <button
          onClick={cargarDatos}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
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
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.texto}</span>
        </div>
      )}

      {/* Filtros y Buscador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['TODOS', 'PENDIENTE', 'AUTORIZADO', 'INACTIVO'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFiltroEstado(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filtroEstado === tab
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab === 'TODOS'
                ? 'Todos'
                : tab === 'PENDIENTE'
                ? 'Pendientes'
                : tab === 'AUTORIZADO'
                ? 'Autorizados'
                : 'Inactivos'}
            </button>
          ))}
        </div>

        <form onSubmit={handleBuscar} className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por código o modelo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
          />
        </form>
      </div>

      {/* Tabla de Dispositivos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Código Terminal</th>
                <th className="px-4 py-3">Vendedor / Usuario</th>
                <th className="px-4 py-3">Modelo / OS</th>
                <th className="px-4 py-3">Versión App</th>
                <th className="px-4 py-3 text-center">Estado Autorización</th>
                <th className="px-4 py-3 text-center">Activo</th>
                <th className="px-4 py-3">Última Sync</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    Cargando terminales móviles...
                  </td>
                </tr>
              ) : dispositivos.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    No se encontraron terminales registradas con los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                dispositivos.map((dev) => (
                  <tr key={dev.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 flex items-center gap-1.5">
                      <Smartphone className="w-3.5 h-3.5 text-indigo-500" />
                      {dev.codigo_dispositivo}
                    </td>
                    <td className="px-4 py-3">
                      {dev.usuario ? (
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">{dev.usuario.nombre_completo}</span>
                          <span className="text-[10px] text-slate-400 font-mono">({dev.usuario.rol})</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">No asignado</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {dev.modelo || 'Genérico'} ({dev.sistema_operativo || 'Android'})
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px] font-semibold text-slate-700">
                      v{dev.version_app || '1.0.0'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${
                          dev.autorizado
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}
                      >
                        {dev.autorizado ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-emerald-600" />
                            AUTORIZADO
                          </>
                        ) : (
                          <>
                            <ShieldAlert className="w-3 h-3 text-amber-600" />
                            PENDIENTE
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                          dev.activo
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-rose-50 text-rose-700'
                        }`}
                      >
                        {dev.activo ? 'Sí' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatearFecha(dev.ultima_sincronizacion)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                      {!dev.autorizado ? (
                        <button
                          onClick={() => handleAutorizar(dev.id, dev.codigo_dispositivo)}
                          className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm inline-flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          Autorizar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRevocar(dev.id, dev.codigo_dispositivo)}
                          className="px-2 py-1 text-[11px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 inline-flex items-center gap-1 transition-colors"
                        >
                          <XCircle className="w-3 h-3" />
                          Revocar
                        </button>
                      )}

                      <button
                        onClick={() => handleAlternarEstado(dev.id, dev.activo, dev.codigo_dispositivo)}
                        className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors inline-flex items-center gap-1 ${
                          dev.activo
                            ? 'text-slate-600 bg-slate-50 hover:bg-slate-100 border-slate-200'
                            : 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200 font-bold'
                        }`}
                      >
                        <Power className="w-3 h-3" />
                        {dev.activo ? 'Desactivar' : 'Activar'}
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
  );
};
