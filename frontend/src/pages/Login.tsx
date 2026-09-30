import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sprout, Lock, User, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/services';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [username, setUsername] = useState('alipio.admin');
  const [password, setPassword] = useState('AgroControl2026*');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const res = await authApi.login(username, password);
      login(res.access_token, res.usuario);
      navigate('/');
    } catch (err: any) {
      console.error('Error al iniciar sesión:', err);
      setError(
        err.response?.data?.message ||
          'Credenciales incorrectas. Verifique su usuario y contraseña.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const seleccionarUsuarioRapido = (user: string) => {
    setUsername(user);
    setPassword('AgroControl2026*');
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        {/* Cabecera con Logotipo */}
        <div className="bg-slate-950 p-8 text-center border-b border-slate-800">
          <div className="w-14 h-14 bg-emerald-600 rounded-xl mx-auto flex items-center justify-center text-white shadow-xl shadow-emerald-950/60 mb-3">
            <Sprout className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            AgroControl <span className="text-emerald-400">Pro</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Sistema Administrativo Central – PC del Local Comercial
          </p>
        </div>

        {/* Formulario */}
        <div className="p-8">
          {error && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-xs text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Usuario del Sistema
              </label>
              <div className="relative">
                <User className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. alipio.admin"
                  className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md shadow-emerald-900/30 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
            >
              {isLoading ? (
                'Iniciando sesión...'
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Accesos rápidos locales para demostración y cambio de rol */}
          <div className="mt-8 pt-5 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2 text-center">
              Usuarios Preconfigurados (Habilitados en Base de Datos):
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => seleccionarUsuarioRapido('alipio.admin')}
                className={`p-2 rounded border text-left transition-colors ${
                  username === 'alipio.admin'
                    ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-semibold">Sr. Alipio</div>
                <div className="text-[10px] text-slate-500">Propietario / Admin</div>
              </button>
              <button
                type="button"
                onClick={() => seleccionarUsuarioRapido('esposa.admin')}
                className={`p-2 rounded border text-left transition-colors ${
                  username === 'esposa.admin'
                    ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-semibold">Esposa</div>
                <div className="text-[10px] text-slate-500">Admin Secundario</div>
              </button>
              <button
                type="button"
                onClick={() => seleccionarUsuarioRapido('almacen1')}
                className={`p-2 rounded border text-left transition-colors ${
                  username === 'almacen1'
                    ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-semibold">Operario Almacén</div>
                <div className="text-[10px] text-slate-500">Carga y Despacho</div>
              </button>
              <button
                type="button"
                onClick={() => seleccionarUsuarioRapido('vendedor1')}
                className={`p-2 rounded border text-left transition-colors ${
                  username === 'vendedor1'
                    ? 'border-emerald-500 bg-emerald-50 font-bold text-emerald-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-semibold">Vendedor</div>
                <div className="text-[10px] text-slate-500">Proformas / Pedidos</div>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-slate-50 px-6 py-3 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Seguridad RBAC activa con tokens JWT emitidos en la PC local</span>
        </div>
      </div>
    </div>
  );
};
