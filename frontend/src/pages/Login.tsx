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
    <div className="min-h-screen bg-[#dce5df] flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      
      {/* Hojas borrosas en el fondo para ambientar el mockup */}
      <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-[url('https://images.unsplash.com/photo-1536882240095-0379873feb4e?q=80&w=600&auto=format&fit=crop')] bg-cover opacity-40 blur-xl rounded-full z-0"></div>
      <div className="absolute -bottom-10 -right-20 w-96 h-96 bg-[url('https://images.unsplash.com/photo-1597848212624-a19eb35e2651?q=80&w=600&auto=format&fit=crop')] bg-cover opacity-40 blur-2xl rounded-full z-0"></div>

      {/* Contenedor Mockup Móvil */}
      <div className="relative z-10 w-full max-w-[420px] h-[850px] max-h-[90vh] bg-white rounded-[3rem] shadow-[0_20px_50px_rgba(45,71,53,0.3)] overflow-hidden border-[6px] border-white flex flex-col ring-1 ring-black/5">
        
        {/* Muesca del celular (Notch) */}
        <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-50">
          <div className="w-40 h-6 bg-white rounded-b-3xl shadow-sm"></div>
        </div>

        {/* Encabezado con imagen de hojas y curva */}
        <div className="relative h-72 flex-shrink-0 bg-emerald-950">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1536882240095-0379873feb4e?q=80&w=800&auto=format&fit=crop')] bg-cover bg-center opacity-75 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/30 to-transparent"></div>
          
          <div className="relative z-10 flex flex-col items-center justify-center h-full pt-8 pb-12">
            <div className="w-16 h-16 bg-[#529363] rounded-[1.25rem] flex items-center justify-center text-white shadow-lg mb-4">
              <Sprout className="w-8 h-8" />
            </div>
            <h1 className="text-[1.7rem] font-black text-white tracking-tight leading-none">
              AgroControl <span className="text-[#a8e0b9]">Pro</span>
            </h1>
            <p className="text-[11px] text-white/90 mt-2 font-medium tracking-wide">
              Sistema Administrativo Central – PC del Local Comercial
            </p>
          </div>

          {/* Curva SVG en la parte inferior del encabezado */}
          <div className="absolute bottom-0 inset-x-0 text-white translate-y-[2px]">
            <svg viewBox="0 0 1440 320" className="w-full h-auto block" preserveAspectRatio="none" fill="currentColor" style={{ transform: 'scaleY(1.3)', transformOrigin: 'bottom' }}>
              <path d="M0,192L80,181.3C160,171,320,149,480,165.3C640,181,800,235,960,256C1120,277,1280,267,1360,261.3L1440,256L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
            </svg>
          </div>

          {/* Ramita con hojas en la derecha superpuesta a la curva */}
          <img 
            src="https://cdn-icons-png.flaticon.com/512/3233/3233483.png" 
            alt="Hoja" 
            className="absolute right-[-10px] bottom-4 w-24 h-auto drop-shadow-xl z-20 rotate-[15deg] opacity-90"
            style={{ filter: 'brightness(0.6) sepia(0.6) hue-rotate(60deg)' }}
          />
        </div>

        {/* Contenido desplazable */}
        <div className="flex-1 overflow-y-auto px-8 pt-4 pb-6 no-scrollbar relative z-10 flex flex-col bg-white">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 rounded-2xl flex items-center gap-2 text-xs text-rose-800 font-medium">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-[#4a6352] mb-2 ml-4">
                Usuario del Sistema
              </label>
              <div className="relative">
                <User className="w-[18px] h-[18px] text-[#3b5e47] absolute left-5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="ej. alipio.admin"
                  className="w-full pl-14 pr-5 py-3.5 text-[15px] font-semibold text-[#2d4735] bg-[#eef3ef] rounded-full focus:outline-none focus:ring-2 focus:ring-[#529363]/40 transition-shadow placeholder-[#98b0a0]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-[0.15em] text-[#4a6352] mb-2 ml-4">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="w-[18px] h-[18px] text-[#3b5e47] absolute left-5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-14 pr-5 py-3.5 text-[15px] font-semibold text-[#2d4735] bg-[#eef3ef] rounded-full focus:outline-none focus:ring-2 focus:ring-[#529363]/40 transition-shadow placeholder-[#98b0a0]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 mt-4 bg-[#3b5e47] hover:bg-[#2d4735] text-white font-bold rounded-full shadow-[0_8px_20px_rgba(59,94,71,0.25)] flex items-center justify-center gap-2 text-[15px] transition-all disabled:opacity-50 active:translate-y-1 active:shadow-md"
            >
              {isLoading ? (
                'Iniciando sesión...'
              ) : (
                <>
                  <span>Ingresar al Sistema</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Accesos rápidos */}
          <div className="mt-8 mb-4">
            <span className="text-[10px] font-bold text-[#7a9382] uppercase tracking-wider block mb-4 ml-1">
              Usuarios Preconfigurados (Habilitados en Base de Datos):
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                type="button"
                onClick={() => seleccionarUsuarioRapido('alipio.admin')}
                className={`p-2.5 rounded-[1.25rem] text-left transition-all flex items-center gap-2.5 ${
                  username === 'alipio.admin'
                    ? 'border border-[#529363] bg-[#e5eee8]'
                    : 'border border-transparent bg-[#f3f7f4] hover:bg-[#ebf2ed]'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-[#dce5df] flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-[#3b5e47]" />
                </div>
                <div className="overflow-hidden">
                  <div className={`font-bold truncate ${username === 'alipio.admin' ? 'text-[#2d4735]' : 'text-[#4a6352]'}`}>Sr. Alipio</div>
                  <div className="text-[9px] text-[#7a9382] font-medium mt-0.5 truncate">Propietario / Admin</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => seleccionarUsuarioRapido('esposa.admin')}
                className={`p-2.5 rounded-[1.25rem] text-left transition-all flex items-center gap-2.5 ${
                  username === 'esposa.admin'
                    ? 'border border-[#529363] bg-[#e5eee8]'
                    : 'border border-transparent bg-[#f3f7f4] hover:bg-[#ebf2ed]'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-[#dce5df] flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-[#3b5e47]" />
                </div>
                <div className="overflow-hidden">
                  <div className={`font-bold truncate ${username === 'esposa.admin' ? 'text-[#2d4735]' : 'text-[#4a6352]'}`}>Esposa</div>
                  <div className="text-[9px] text-[#7a9382] font-medium mt-0.5 truncate">Admin Secundario</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => seleccionarUsuarioRapido('almacen1')}
                className={`p-2.5 rounded-[1.25rem] text-left transition-all flex items-center gap-2.5 ${
                  username === 'almacen1'
                    ? 'border border-[#529363] bg-[#e5eee8]'
                    : 'border border-transparent bg-[#f3f7f4] hover:bg-[#ebf2ed]'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-[#dce5df] flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-[#3b5e47]" />
                </div>
                <div className="overflow-hidden">
                  <div className={`font-bold truncate ${username === 'almacen1' ? 'text-[#2d4735]' : 'text-[#4a6352]'}`}>Operario Almacén</div>
                  <div className="text-[9px] text-[#7a9382] font-medium mt-0.5 truncate">Carga y Despacho</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => seleccionarUsuarioRapido('vendedor1')}
                className={`p-2.5 rounded-[1.25rem] text-left transition-all flex items-center gap-2.5 ${
                  username === 'vendedor1'
                    ? 'border border-[#529363] bg-[#e5eee8]'
                    : 'border border-transparent bg-[#f3f7f4] hover:bg-[#ebf2ed]'
                }`}
              >
                <div className="w-7 h-7 rounded-full bg-[#dce5df] flex items-center justify-center flex-shrink-0">
                  <User className="w-3.5 h-3.5 text-[#3b5e47]" />
                </div>
                <div className="overflow-hidden">
                  <div className={`font-bold truncate ${username === 'vendedor1' ? 'text-[#2d4735]' : 'text-[#4a6352]'}`}>Vendedor</div>
                  <div className="text-[9px] text-[#7a9382] font-medium mt-0.5 truncate">Proformas / Pedidos</div>
                </div>
              </button>
            </div>
          </div>
          
          <div className="flex-1"></div>
          
          {/* Footer (fondo curvado o enmarcado) */}
          <div className="mt-8 -mx-8 -mb-6 bg-[#f0f4f1] px-8 py-5 flex items-center justify-center gap-2 rounded-t-[2.5rem]">
            <ShieldCheck className="w-4 h-4 text-[#529363]" />
            <span className="text-[10px] text-[#7a9382] font-semibold">Seguridad RBAC activa con tokens JWT emitidos en la PC local</span>
          </div>

        </div>
      </div>
      
      {/* Estilos adicionales para esconder la scrollbar pero mantener scroll */}
      <style dangerouslySetInnerHTML={{__html: `
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
};
