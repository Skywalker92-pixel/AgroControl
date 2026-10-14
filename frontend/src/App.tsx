import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProtectedRoute } from './components/ProtectedRoute';

/**
 * Carga diferida por ruta (code splitting). Cada pantalla se descarga solo al
 * visitarla: un vendedor en /movil no descarga los módulos administrativos de PC.
 * El Service Worker sigue precacheando todos los chunks, por lo que la
 * navegación offline de la PWA no se ve afectada.
 */
const lazyNamed = <K extends string>(
  loader: () => Promise<Record<K, React.ComponentType<any>>>,
  name: K,
) => lazy(() => loader().then((m) => ({ default: m[name] })));

// Superficie PC: administración y control comercial central
const Layout = lazyNamed(() => import('./components/Layout'), 'Layout');
const Login = lazyNamed(() => import('./pages/Login'), 'Login');
const Dashboard = lazyNamed(() => import('./pages/Dashboard'), 'Dashboard');
const Catalogo = lazyNamed(() => import('./pages/Catalogo'), 'Catalogo');
const StockKardex = lazyNamed(() => import('./pages/StockKardex'), 'StockKardex');
const Movimientos = lazyNamed(() => import('./pages/Movimientos'), 'Movimientos');
const Despacho = lazyNamed(() => import('./pages/Despacho'), 'Despacho');
const Clientes = lazyNamed(() => import('./pages/Clientes'), 'Clientes');
const Reportes = lazyNamed(() => import('./pages/Reportes'), 'Reportes');
const Distribucion = lazyNamed(() => import('./pages/Distribucion'), 'Distribucion');
const OperacionesObservadas = lazyNamed(
  () => import('./pages/OperacionesObservadas'),
  'OperacionesObservadas',
);
const DispositivosMoviles = lazyNamed(
  () => import('./pages/DispositivosMoviles'),
  'DispositivosMoviles',
);
const Usuarios = lazyNamed(() => import('./pages/Usuarios'), 'Usuarios');

// Módulos Móviles Offline-First (HITO 12 - MOD-M01 al MOD-M07)
const MovilLayout = lazyNamed(() => import('./components/movil/MovilLayout'), 'MovilLayout');
const MovilLogin = lazyNamed(() => import('./pages/movil/MovilLogin'), 'MovilLogin');
const MiCarga = lazyNamed(() => import('./pages/movil/MiCarga'), 'MiCarga');
const ClientesMovil = lazyNamed(() => import('./pages/movil/ClientesMovil'), 'ClientesMovil');
const NuevaVenta = lazyNamed(() => import('./pages/movil/NuevaVenta'), 'NuevaVenta');
const CierreJornada = lazyNamed(() => import('./pages/movil/CierreJornada'), 'CierreJornada');
const ColaSincronizacion = lazyNamed(
  () => import('./pages/movil/ColaSincronizacion'),
  'ColaSincronizacion',
);

const CargandoModulo: React.FC = () => (
  <div className="min-h-[50vh] flex items-center justify-center" role="status" aria-live="polite">
    <span className="w-6 h-6 border-2 border-emerald-500/30 border-t-emerald-600 rounded-full animate-spin" />
    <span className="sr-only">Cargando módulo…</span>
  </div>
);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<CargandoModulo />}>
        <Routes>
          {/* Autenticación Web Central y Móvil */}
          <Route path="/login" element={<Login />} />
          <Route path="/movil/login" element={<MovilLogin />} />

          {/* ================================================================= */}
          {/* SUPERFICIE MÓVIL: VENDEDORES Y REPARTIDORES EN RUTA (HITO 12)       */}
          {/* ================================================================= */}
          <Route
            path="/movil"
            element={
              <ProtectedRoute
                allowedRoles={[
                  'VENDEDOR',
                  'ADMINISTRADOR_PROPIETARIO',
                  'ADMINISTRADOR_SECUNDARIO',
                ]}
              />
            }
          >
            <Route element={<MovilLayout />}>
              <Route index element={<Navigate to="/movil/carga" replace />} />
              <Route path="carga" element={<MiCarga />} />
              <Route path="clientes" element={<ClientesMovil />} />
              <Route path="venta" element={<NuevaVenta />} />
              <Route path="cierre" element={<CierreJornada />} />
              <Route path="sincronizacion" element={<ColaSincronizacion />} />
            </Route>
          </Route>

          {/* ================================================================= */}
          {/* SUPERFICIE PC: ADMINISTRACIÓN Y CONTROL COMERCIAL CENTRAL           */}
          {/* ================================================================= */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/catalogo" element={<Catalogo />} />
              <Route path="/stock" element={<StockKardex />} />
              <Route
                path="/movimientos"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      'ADMINISTRADOR_PROPIETARIO',
                      'ADMINISTRADOR_SECUNDARIO',
                      'OPERADOR_ALMACEN',
                    ]}
                  />
                }
              >
                <Route index element={<Movimientos />} />
              </Route>
              <Route path="/despacho" element={<Despacho />} />
              <Route path="/distribucion" element={<Distribucion />} />
              <Route path="/clientes" element={<Clientes />} />
              <Route path="/reportes" element={<Reportes />} />
              <Route
                path="/operaciones-observadas"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      'ADMINISTRADOR_PROPIETARIO',
                      'ADMINISTRADOR_SECUNDARIO',
                      'OPERADOR_ALMACEN',
                    ]}
                  />
                }
              >
                <Route index element={<OperacionesObservadas />} />
              </Route>
              <Route
                path="/dispositivos"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      'ADMINISTRADOR_PROPIETARIO',
                      'ADMINISTRADOR_SECUNDARIO',
                    ]}
                  />
                }
              >
                <Route index element={<DispositivosMoviles />} />
              </Route>
              <Route
                path="/usuarios"
                element={
                  <ProtectedRoute
                    allowedRoles={[
                      'ADMINISTRADOR_PROPIETARIO',
                      'ADMINISTRADOR_SECUNDARIO',
                    ]}
                  />
                }
              >
                <Route index element={<Usuarios />} />
              </Route>
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
