import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, Smartphone, ShieldCheck, Lock, User, AlertCircle, ArrowRight } from 'lucide-react';
import { authApi } from '../../api/services';
import { useAuthStore } from '../../store/authStore';
import { useMobileStore } from '../../store/mobileStore';

export const MovilLogin: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const { codigoDispositivo, vincularTerminal, ejecutarPull } = useMobileStore();

  const [username, setUsername] = useState('vendedor1');
  const [password, setPassword] = useState('AgroControl2026*');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await authApi.login(username, password);
      login(data.access_token, data.usuario);

      // Vincular terminal y descargar catálogo en background
      try {
        await vincularTerminal('Terminal Android Móvil', data.usuario.id);
        await ejecutarPull();
      } catch (syncErr: any) {
        console.warn('Vinculación o descarga en línea postergada:', syncErr.message);
      }

      navigate('/movil/carga');
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          'Error al iniciar sesión. Verifique sus credenciales o conectividad.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-6 py-12 max-w-md mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-xl shadow-emerald-900/60 mb-4 ring-4 ring-emerald-500/20">
          <Truck className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-white">AgroControl Móvil</h1>
        <p className="text-sm text-slate-400 mt-1 font-medium">
          Módulo de Vendedores y Reparto en Ruta (MOD-M01)
        </p>

        <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 px-3 py-1 rounded-full text-xs font-mono text-emerald-400 mt-3">
          <Smartphone className="w-3.5 h-3.5" />
          <span>{codigoDispositivo}</span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-rose-500/20 border border-rose-500/40 rounded-2xl p-3.5 text-xs text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Usuario de Ruta
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <User className="w-5 h-5" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="Ej. vendedor1"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-5 h-5" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-white rounded-2xl pl-11 pr-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-2xl text-base shadow-lg shadow-emerald-900/40 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Ingresando a Ruta...
              </span>
            ) : (
              <>
                <span>Iniciar Jornada en Ruta</span>
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-5 pt-4 border-t border-slate-800/80 text-center">
          <button
            type="button"
            onClick={() => {
              setUsername('vendedor1');
              setPassword('AgroControl2026*');
            }}
            className="text-xs text-slate-400 hover:text-emerald-400 font-medium underline"
          >
            Usar cuenta de demostración: vendedor1
          </button>
        </div>
      </div>

      <div className="text-center mt-6">
        <button
          onClick={() => navigate('/')}
          className="text-xs text-slate-400 hover:text-slate-300 flex items-center justify-center gap-1 mx-auto"
        >
          <span>Ir a la consola de administración en PC</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
