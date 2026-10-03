import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Catalogo } from './pages/Catalogo';
import { StockKardex } from './pages/StockKardex';
import { Movimientos } from './pages/Movimientos';
import { Despacho } from './pages/Despacho';
import { Clientes } from './pages/Clientes';
import { Reportes } from './pages/Reportes';
import { Distribucion } from './pages/Distribucion';
import { OperacionesObservadas } from './pages/OperacionesObservadas';
import { DispositivosMoviles } from './pages/DispositivosMoviles';
import { Usuarios } from './pages/Usuarios';

// Módulos Móviles Offline-First (HITO 12 - MOD-M01 al MOD-M07)
import { MovilLayout } from './components/movil/MovilLayout';
import { MovilLogin } from './pages/movil/MovilLogin';
import { MiCarga } from './pages/movil/MiCarga';
import { ClientesMovil } from './pages/movil/ClientesMovil';
import { NuevaVenta } from './pages/movil/NuevaVenta';
import { CierreJornada } from './pages/movil/CierreJornada';
import { ColaSincronizacion } from './pages/movil/ColaSincronizacion';

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
      </BrowserRouter>
    </QueryClientProvider>
  );
};

export default App;
