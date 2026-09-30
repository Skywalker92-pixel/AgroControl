import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  Layers,
  ClipboardList,
  ArrowLeftRight,
  TrendingUp,
  Warehouse,
  CheckCircle2,
  Clock,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { useWarehouseStore } from '../store/warehouseStore';
import { stockApi, despachoApi, catalogoApi } from '../api/services';

export const Dashboard: React.FC = () => {
  const { usuario } = useAuthStore();
  const { almacenActivo } = useWarehouseStore();

  const [stats, setStats] = useState({
    totalProductos: 0,
    totalFisico: 0,
    totalReservado: 0,
    totalDisponible: 0,
    proformasPendientes: 0,
  });
  const [proformasRecientes, setProformasRecientes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      setIsLoading(true);
      try {
        const [productos, stock, proformas] = await Promise.all([
          catalogoApi.listarProductos(),
          stockApi.consultar(almacenActivo?.id),
          despachoApi.listarProformas({ limit: 5 }),
        ]);

        const fisico = stock.reduce((acc, s) => acc + s.cantidad_fisica, 0);
        const reservado = stock.reduce((acc, s) => acc + s.cantidad_reservada, 0);
        const disponible = stock.reduce((acc, s) => acc + s.cantidad_disponible, 0);

        const pendientes = (proformas.items || []).filter(
          (p: any) => p.estado === 'RESERVADO' || p.estado === 'PREPARADO',
        ).length;

        setStats({
          totalProductos: productos.length,
          totalFisico: fisico,
          totalReservado: reservado,
          totalDisponible: disponible,
          proformasPendientes: pendientes,
        });

        setProformasRecientes(proformas.items || []);
      } catch (err) {
        console.error('Error al cargar dashboard:', err);
      } finally {
        setIsLoading(false);
      }
    };

    cargarDatos();
  }, [almacenActivo?.id]);

  const rol = usuario?.rol;
  const esVendedor = rol === 'VENDEDOR';

  return (
    <div className="space-y-6">
      {/* Banner de Bienvenida y Almacén Activo */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
              Panel Administrativo Central
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight">
            Bienvenido, {usuario?.nombre_completo || usuario?.username}
          </h1>
          <p className="text-xs text-slate-300 mt-1 flex items-center gap-1.5">
            <Warehouse className="w-4 h-4 text-emerald-400" />
            Almacén seleccionado:{' '}
            <strong className="text-white font-bold">
              {almacenActivo ? `${almacenActivo.nombre} (${almacenActivo.codigo})` : 'Todos'}
            </strong>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/despacho"
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-lg shadow-emerald-950/40 transition-all"
          >
            <ClipboardList className="w-4 h-4" />
            Nueva Proforma / Venta
          </Link>
          {!esVendedor && (
            <Link
              to="/movimientos"
              className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg text-xs flex items-center gap-2 transition-all"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Ingresos y Traslados
            </Link>
          )}
        </div>
      </div>

      {/* Tarjetas de Métricas Clave (Triple Saldo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Catálogo Registrado
            </span>
            <Boxes className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {isLoading ? '...' : stats.totalProductos}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Productos con unidad base
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Stock Físico Total
            </span>
            <Layers className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-2xl font-black text-blue-900 font-mono">
            {isLoading ? '...' : stats.totalFisico.toFixed(2)}
          </div>
          <span className="text-[11px] text-blue-700 font-medium mt-1 block">
            Existencias en almacén
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              Stock Reservado
            </span>
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-amber-900 font-mono">
            {isLoading ? '...' : stats.totalReservado.toFixed(2)}
          </div>
          <span className="text-[11px] text-amber-700 font-medium mt-1 block">
            Comprometido por proformas
          </span>
        </div>

        <div className="bg-white p-5 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Stock Disponible
            </span>
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-950 font-mono">
            {isLoading ? '...' : stats.totalDisponible.toFixed(2)}
          </div>
          <span className="text-[11px] text-emerald-700 font-semibold mt-1 block">
            Libre para venta inmediata
          </span>
        </div>
      </div>

      {/* Proformas Recientes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-emerald-600" />
            Últimas Proformas Registradas
          </h3>
          <Link
            to="/despacho"
            className="text-xs text-emerald-700 font-bold hover:underline"
          >
            Ver todas las proformas →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3">Almacén</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {proformasRecientes.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No hay proformas registradas recientemente.
                  </td>
                </tr>
              ) : (
                proformasRecientes.map((p) => {
                  const estadoColors: Record<string, string> = {
                    BORRADOR: 'bg-slate-100 text-slate-800 border-slate-200',
                    RESERVADO: 'bg-blue-100 text-blue-800 border-blue-200',
                    PREPARADO: 'bg-amber-100 text-amber-800 border-amber-200',
                    DESPACHADO: 'bg-emerald-100 text-emerald-800 border-emerald-200',
                    ANULADO: 'bg-rose-100 text-rose-800 border-rose-200',
                  };

                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {p.numero}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {p.cliente?.razon_social || 'Cliente'}
                      </td>
                      <td className="px-4 py-3">
                        {p.ubicacion?.nombre || 'Almacén'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                            estadoColors[p.estado] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {p.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">
                        S/ {Number(p.total).toFixed(2)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
