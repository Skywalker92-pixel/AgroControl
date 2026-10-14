import React, { lazy, Suspense, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sprout,
  Lock,
  User,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  BookLock,
  Truck,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { authApi } from '../api/services';

// Accesos rápidos a cuentas ficticias: solo en `vite dev` con VITE_ENABLE_DEMO_ACCOUNTS=true.
// En una build de producción la condición es `false` en tiempo de compilación y el
// módulo no se incluye.
const DemoAccountsPanel =
  import.meta.env.DEV && import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true'
    ? lazy(() => import('../components/DemoAccountsPanel'))
    : null;

const CAPACIDADES = [
  {
    icon: BookLock,
    titulo: 'Kárdex append-only',
    detalle: 'Movimientos protegidos por triggers de PostgreSQL y conciliación con saldos.',
  },
  {
    icon: Truck,
    titulo: 'Despacho, distribución y liquidación',
    detalle: 'Cargas por vehículo, bodegas móviles y cierre de ruta.',
  },
  {
    icon: Smartphone,
    titulo: 'Terminales móviles autorizadas',
    detalle: 'Sincronización idempotente con la PWA offline de los vendedores.',
  },
  {
    icon: ShieldCheck,
    titulo: 'Control de acceso por roles',
    detalle: 'Permisos validados en el servidor para cada operación.',
  },
];

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
      // No se registra el objeto de error: incluye el cuerpo de la petición (contraseña).
      setError(
        err.response?.data?.message ||
          'Credenciales incorrectas. Verifique su usuario y contraseña.',
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col lg:flex-row">
      {/* Panel institucional (escritorio) / cabecera compacta (tablet y móvil) */}
      <aside className="relative overflow-hidden bg-slate-950 text-white lg:w-[46%] xl:w-1/2 flex flex-col justify-between px-6 py-6 sm:px-10 lg:px-14 lg:py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(16,185,129,0.25),transparent_45%),radial-gradient(circle_at_85%_90%,rgba(5,150,105,0.18),transparent_40%)]"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.06] bg-[linear-gradient(rgba(255,255,255,1)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,1)_1px,transparent_1px)] bg-[size:48px_48px]"
        />

        <div className="relative flex items-center gap-3">
          <div className="w-11 h-11 bg-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-950/60">
            <Sprout className="w-6 h-6" />
          </div>
          <div>
            <div className="text-lg font-black tracking-tight leading-none">
              AgroControl <span className="text-emerald-400">Pro</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1">Sistema Administrativo Central</div>
          </div>
        </div>

        <div className="relative hidden lg:block my-10">
          <h1 className="text-3xl xl:text-4xl font-black tracking-tight leading-tight max-w-lg">
            Inventario, despacho y distribución en un solo lugar.
          </h1>
          <p className="mt-4 text-sm text-slate-400 max-w-md">
            Consola de gestión para la PC del local comercial: catálogo, stock, Kárdex, pedidos,
            rutas de reparto, liquidaciones y reportes.
          </p>

          <ul className="mt-10 grid gap-5 max-w-lg">
            {CAPACIDADES.map(({ icon: Icon, titulo, detalle }) => (
              <li key={titulo} className="flex items-start gap-3.5">
                <div className="w-9 h-9 shrink-0 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <Icon className="w-[18px] h-[18px] text-emerald-400" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{titulo}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{detalle}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="relative hidden lg:flex items-center gap-2 text-[11px] text-slate-500">
          <Monitor className="w-3.5 h-3.5" />
          <span>Versión 1.0.0-rc1 · Uso exclusivo del personal autorizado</span>
        </div>
      </aside>

      {/* Formulario de acceso */}
      <main className="flex-1 flex items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-300/40 border border-slate-200 p-6 sm:p-9">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Iniciar sesión</h2>
            <p className="text-sm text-slate-500 mt-1">
              Ingrese con su usuario asignado por el administrador.
            </p>

            {error && (
              <div
                role="alert"
                className="mt-6 p-3.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2.5 text-xs text-rose-800 font-medium"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label
                  htmlFor="login-usuario"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Usuario
                </label>
                <div className="relative">
                  <User className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-usuario"
                    type="text"
                    required
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5"
                >
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-5 h-5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="login-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-md shadow-emerald-900/20 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-50"
              >
                {isLoading ? (
                  'Verificando credenciales...'
                ) : (
                  <>
                    <span>Ingresar al sistema</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {DemoAccountsPanel && (
              <Suspense fallback={null}>
                <DemoAccountsPanel
                  usernameActual={username}
                  onSeleccionar={(u, p) => {
                    setUsername(u);
                    setPassword(p);
                  }}
                />
              </Suspense>
            )}
          </div>

          <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Acceso con control de roles (RBAC)
            </span>
            <Link
              to="/movil/login"
              className="flex items-center gap-1 font-semibold text-emerald-700 hover:text-emerald-800"
            >
              <Smartphone className="w-3.5 h-3.5" />
              Vendedores: módulo móvil
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
};
