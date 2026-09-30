import React, { useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Truck,
  Users,
  ShoppingCart,
  CheckCircle2,
  RefreshCw,
  Wifi,
  WifiOff,
  LogOut,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useMobileStore } from '../../store/mobileStore';
import { useAuthStore } from '../../store/authStore';

export const MovilLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, logout } = useAuthStore();
  const {
    cargaActiva,
    colaOperaciones,
    isOnline,
    isSyncing,
    syncError,
    setIsOnline,
    sincronizarTodo,
    inicializarTerminal,
  } = useMobileStore();

  // Escuchar cambios de conectividad de red del navegador
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      sincronizarTodo().catch(() => {});
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Inicializar terminal y cargar datos
    inicializarTerminal();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const operacionesPendientes = colaOperaciones.filter((op) => op.estado_local === 'PENDIENTE');
  const operacionesObservadas = colaOperaciones.filter((op) => op.estado_local === 'OBSERVADA');

  const handleSincronizar = async () => {
    if (isSyncing) return;
    try {
      await sincronizarTodo();
    } catch (err: any) {
      console.warn('Error al sincronizar:', err.message);
    }
  };

  const handleLogout = () => {
    if (operacionesPendientes.length > 0) {
      const confirmar = window.confirm(
        `Tiene ${operacionesPendientes.length} operación(es) pendiente(s) de sincronizar en este dispositivo. ¿Está seguro de cerrar sesión?`,
      );
      if (!confirmar) return;
    }
    logout();
    navigate('/movil/login');
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between max-w-md mx-auto shadow-2xl relative select-none">
      {/* ========================================================================= */}
      {/* 1. CABECERA MÓVIL PERMANENTE CON INDICADOR DE SINCRONIZACIÓN               */}
      {/* ========================================================================= */}
      <header className="bg-slate-950 border-b border-slate-800 px-4 py-3 sticky top-0 z-40 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-emerald-900/50">
              AC
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-tight text-white">AgroControl</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Ruta
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate max-w-[130px] font-medium">
                {usuario?.nombre_completo || 'Vendedor en Ruta'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón de Sincronización Manual */}
            <button
              onClick={handleSincronizar}
              disabled={isSyncing}
              className={`p-2 rounded-xl transition-all ${
                isSyncing
                  ? 'bg-emerald-500 text-slate-950 animate-spin'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 active:scale-95'
              }`}
              title="Sincronizar con servidor central"
            >
              <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </button>

            {/* Salir */}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 active:scale-95 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de Estado de Sincronización y Conectividad */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            {isOnline ? (
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <Wifi className="w-3.5 h-3.5" /> En línea
              </span>
            ) : (
              <span className="flex items-center gap-1 text-rose-400 font-semibold">
                <span className="inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                <WifiOff className="w-3.5 h-3.5" /> Sin señal (Offline)
              </span>
            )}

            {cargaActiva?.vehiculo && (
              <span className="text-[11px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                {cargaActiva.vehiculo.placa}
              </span>
            )}
          </div>

          <button
            onClick={() => navigate('/movil/sincronizacion')}
            className="flex items-center gap-1 font-bold text-xs"
          >
            {operacionesPendientes.length > 0 ? (
              <span className="bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full flex items-center gap-1 font-black animate-pulse">
                <AlertTriangle className="w-3 h-3" />
                {operacionesPendientes.length} pendiente(s)
              </span>
            ) : operacionesObservadas.length > 0 ? (
              <span className="bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded-full border border-rose-500/30 flex items-center gap-1">
                {operacionesObservadas.length} observada(s)
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Sincronizado
              </span>
            )}
          </button>
        </div>

        {syncError && (
          <div className="mt-2 bg-rose-500/20 border border-rose-500/40 rounded-lg p-2 text-rose-300 text-xs flex items-center justify-between">
            <span className="truncate">{syncError}</span>
            <button
              onClick={handleSincronizar}
              className="text-[10px] uppercase font-bold underline ml-2"
            >
              Reintentar
            </button>
          </div>
        )}
      </header>

      {/* ========================================================================= */}
      {/* 2. ÁREA DE CONTENIDO DINÁMICO                                             */}
      {/* ========================================================================= */}
      <main className="flex-1 p-4 pb-24 overflow-y-auto">
        <Outlet />
      </main>

      {/* ========================================================================= */}
      {/* 3. BARRA DE NAVEGACIÓN INFERIOR (TOUCH SCREEN - BOTONES GRANDES)           */}
      {/* ========================================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-slate-950/95 backdrop-blur-md border-t border-slate-800 z-50 px-2 py-1.5 flex items-center justify-around shadow-2xl">
        <NavLink
          to="/movil/carga"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              isActive
                ? 'text-emerald-400 bg-emerald-500/10 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <Truck className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Mi Carga</span>
        </NavLink>

        <NavLink
          to="/movil/clientes"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              isActive
                ? 'text-emerald-400 bg-emerald-500/10 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <Users className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Clientes</span>
        </NavLink>

        <NavLink
          to="/movil/venta"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all -mt-4 shadow-lg ${
              isActive
                ? 'bg-emerald-500 text-slate-950 font-black shadow-emerald-500/40 ring-4 ring-slate-900'
                : 'bg-emerald-600 text-white font-bold shadow-emerald-950 ring-4 ring-slate-900'
            }`
          }
        >
          <ShoppingCart className="w-6 h-6 mb-0.5" />
          <span className="text-[11px] uppercase tracking-wider font-black">Vender</span>
        </NavLink>

        <NavLink
          to="/movil/cierre"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all ${
              isActive
                ? 'text-emerald-400 bg-emerald-500/10 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <RotateCcw className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] tracking-tight">Cierre</span>
        </NavLink>

        <NavLink
          to="/movil/sincronizacion"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center py-1.5 px-2 rounded-xl transition-all relative ${
              isActive
                ? 'text-emerald-400 bg-emerald-500/10 font-bold scale-105'
                : 'text-slate-400 hover:text-slate-200'
            }`
          }
        >
          <div className="relative">
            <RefreshCw className="w-5 h-5 mb-0.5" />
            {operacionesPendientes.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-amber-500 text-slate-950 font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center">
                {operacionesPendientes.length}
              </span>
            )}
          </div>
          <span className="text-[10px] tracking-tight">Sincro</span>
        </NavLink>
      </nav>
    </div>
  );
};
