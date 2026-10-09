import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Boxes,
  Layers,
  ClipboardList,
  ArrowLeftRight,
  Warehouse,
  CheckCircle2,
  Clock,
  Sprout
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
    <div className="space-y-6 md:space-y-8">
      {/* Banner de Bienvenida y Almacén Activo */}
      <div className="relative bg-[#1a3323] rounded-[2rem] md:rounded-[2.5rem] p-6 md:p-10 text-white shadow-[0_20px_40px_rgba(45,71,53,0.15)] flex flex-col md:flex-row justify-between items-start md:items-center gap-6 overflow-hidden min-h-[160px] md:min-h-[180px]">
        {/* Fondo de hojas */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1536882240095-0379873feb4e?q=80&w=1200&auto=format&fit=crop')] bg-cover bg-center opacity-70 mix-blend-overlay"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
        
        {/* Curva Orgánica en el borde derecho (simulando el recorte) */}
        <div className="absolute top-0 right-0 bottom-0 w-[40%] hidden md:block">
           <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full text-[#e8ede9] fill-current">
             <path d="M100,0 L100,100 L0,100 C60,80 80,20 20,0 Z"></path>
           </svg>
        </div>

        {/* Ramita decorativa sobre la curva */}
        <img 
          src="https://cdn-icons-png.flaticon.com/512/3233/3233483.png" 
          alt="Hoja decorativa" 
          className="absolute right-12 top-1/2 -translate-y-1/2 w-40 h-auto drop-shadow-2xl z-10 rotate-[-15deg] opacity-90 hidden md:block"
          style={{ filter: 'brightness(0.75) sepia(0.4) hue-rotate(60deg)' }}
        />

        <div className="relative z-10 max-w-2xl pt-2">
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-[0.2em] text-[#a8e0b9]">
              Panel Administrativo Central
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-[2.5rem] font-black tracking-tight mb-3 leading-none">
            Bienvenido, <br className="md:hidden" /> {usuario?.nombre_completo || usuario?.username}
          </h1>
          <p className="text-xs md:text-sm text-white/90 font-medium flex items-center gap-2">
            <Warehouse className="w-4 h-4 text-[#a8e0b9] flex-shrink-0" />
            <span className="truncate">
              Almacén: <strong className="text-white font-extrabold tracking-wide">{almacenActivo ? `${almacenActivo.nombre} (${almacenActivo.codigo})` : 'Todos'}</strong>
            </span>
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <Link
            to="/despacho"
            className="px-6 py-4 bg-[#21a559] hover:bg-[#1b8c4b] text-white font-bold rounded-full text-[13px] flex items-center justify-center md:justify-start gap-2.5 shadow-[0_8px_20px_rgba(33,165,89,0.4)] transition-all w-full sm:w-auto"
          >
            <ClipboardList className="w-4 h-4" />
            Nueva Proforma
          </Link>
          {!esVendedor && (
            <Link
              to="/movimientos"
              className="px-6 py-4 bg-[#eef3ef] hover:bg-[#dce5df] text-[#2d4735] font-bold rounded-full text-[13px] flex items-center justify-center md:justify-start gap-2.5 shadow-sm transition-all w-full sm:w-auto"
            >
              <ArrowLeftRight className="w-4 h-4 text-[#529363]" />
              Traslados
            </Link>
          )}
        </div>
      </div>

      {/* Tarjetas de Métricas Clave (Triple Saldo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
        <div className="bg-white p-6 md:p-7 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-[#dce5df]/50 relative overflow-hidden group hover:shadow-[0_15px_50px_rgba(0,0,0,0.06)] transition-shadow">
          <div className="absolute -bottom-6 -right-6 w-20 md:w-24 h-20 md:h-24 bg-[url('https://cdn-icons-png.flaticon.com/512/3233/3233483.png')] bg-contain bg-no-repeat opacity-5 group-hover:opacity-10 transition-opacity rotate-45" style={{ filter: 'grayscale(100%) sepia(100%) hue-rotate(60deg)' }}></div>
          <div className="flex items-center gap-3 text-[#7a9382] mb-3 md:mb-4 relative z-10">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-[12px] md:rounded-[14px] bg-[#eef3ef] flex items-center justify-center">
              <Boxes className="w-4 h-4 md:w-5 md:h-5 text-[#3b5e47]" />
            </div>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#4a6352] block">
              Catálogo Registrado
            </span>
          </div>
          <div className="relative z-10 pl-1">
            <div className="text-3xl md:text-4xl font-black text-[#2d4735] tracking-tight">
              {isLoading ? '...' : stats.totalProductos}
            </div>
            <span className="text-[10px] md:text-[11px] text-[#7a9382] font-semibold mt-1 block">
              Productos con unidad base
            </span>
          </div>
        </div>

        <div className="bg-white p-6 md:p-7 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-[#dce5df]/50 relative overflow-hidden group hover:shadow-[0_15px_50px_rgba(0,0,0,0.06)] transition-shadow">
          <div className="absolute -bottom-6 -right-6 w-20 md:w-24 h-20 md:h-24 bg-[url('https://cdn-icons-png.flaticon.com/512/3233/3233483.png')] bg-contain bg-no-repeat opacity-5 group-hover:opacity-10 transition-opacity rotate-45" style={{ filter: 'grayscale(100%) sepia(100%) hue-rotate(60deg)' }}></div>
          <div className="flex items-center gap-3 text-[#7a9382] mb-3 md:mb-4 relative z-10">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-[12px] md:rounded-[14px] bg-[#eef3ef] flex items-center justify-center">
              <Layers className="w-4 h-4 md:w-5 md:h-5 text-[#3b5e47]" />
            </div>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#4a6352] block">
              Stock Físico Total
            </span>
          </div>
          <div className="relative z-10 pl-1">
            <div className="text-3xl md:text-4xl font-black text-[#2d4735] tracking-tight">
              {isLoading ? '...' : stats.totalFisico.toFixed(2)}
            </div>
            <span className="text-[10px] md:text-[11px] text-[#7a9382] font-semibold mt-1 block">
              Existencias en almacén
            </span>
          </div>
        </div>

        <div className="bg-white p-6 md:p-7 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-[#dce5df]/50 relative overflow-hidden group hover:shadow-[0_15px_50px_rgba(0,0,0,0.06)] transition-shadow">
          <div className="absolute -bottom-6 -right-6 w-20 md:w-24 h-20 md:h-24 bg-[url('https://cdn-icons-png.flaticon.com/512/3233/3233483.png')] bg-contain bg-no-repeat opacity-5 group-hover:opacity-10 transition-opacity rotate-45" style={{ filter: 'grayscale(100%) sepia(100%) hue-rotate(60deg)' }}></div>
          <div className="flex items-center gap-3 text-[#7a9382] mb-3 md:mb-4 relative z-10">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-[12px] md:rounded-[14px] bg-[#eef3ef] flex items-center justify-center">
              <Clock className="w-4 h-4 md:w-5 md:h-5 text-[#3b5e47]" />
            </div>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#4a6352] block">
              Stock Reservado
            </span>
          </div>
          <div className="relative z-10 pl-1">
            <div className="text-3xl md:text-4xl font-black text-[#2d4735] tracking-tight">
              {isLoading ? '...' : stats.totalReservado.toFixed(2)}
            </div>
            <span className="text-[10px] md:text-[11px] text-[#7a9382] font-semibold mt-1 block">
              Comprometido por proformas
            </span>
          </div>
        </div>

        <div className="bg-[#f4f8f5] p-6 md:p-7 rounded-[1.5rem] md:rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.02)] border border-[#529363]/20 relative overflow-hidden group">
          <div className="absolute -bottom-6 -right-6 w-20 md:w-24 h-20 md:h-24 bg-[url('https://cdn-icons-png.flaticon.com/512/3233/3233483.png')] bg-contain bg-no-repeat opacity-[0.07] group-hover:opacity-15 transition-opacity rotate-45" style={{ filter: 'sepia(100%) hue-rotate(60deg)' }}></div>
          <div className="flex items-center gap-3 mb-3 md:mb-4 relative z-10">
            <div className="w-9 h-9 md:w-10 md:h-10 rounded-[12px] md:rounded-[14px] bg-white flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-4 h-4 md:w-5 md:h-5 text-[#529363]" />
            </div>
            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-[#3b5e47] block">
              Stock Disponible
            </span>
          </div>
          <div className="relative z-10 pl-1">
            <div className="text-3xl md:text-4xl font-black text-[#2d4735] tracking-tight">
              {isLoading ? '...' : stats.totalDisponible.toFixed(2)}
            </div>
            <span className="text-[10px] md:text-[11px] text-[#529363] font-bold mt-1 block">
              Libre para venta inmediata
            </span>
          </div>
        </div>
      </div>

      {/* Proformas Recientes */}
      <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] overflow-hidden relative p-2 md:p-4 pb-2 border border-[#dce5df]/50">
        {/* Hojas borrosas en la esquina inferior derecha del módulo */}
        <div className="absolute -bottom-20 -right-20 w-[400px] h-[400px] bg-[url('https://images.unsplash.com/photo-1597848212624-a19eb35e2651?q=80&w=600&auto=format&fit=crop')] bg-cover opacity-[0.12] blur-[20px] rounded-full z-0 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="px-4 md:px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <h3 className="font-black text-[#2d4735] text-base md:text-lg flex items-center gap-3">
              <div className="w-9 h-9 md:w-11 md:h-11 rounded-[12px] md:rounded-[14px] bg-[#eef3ef] flex items-center justify-center">
                <ClipboardList className="w-4 h-4 md:w-5 md:h-5 text-[#529363]" />
              </div>
              Últimas Proformas
            </h3>
            <Link
              to="/despacho"
              className="text-[11px] md:text-[12px] text-[#3b5e47] font-bold hover:bg-[#eef3ef] px-4 md:px-5 py-2.5 rounded-full transition-colors flex items-center gap-2"
            >
              Ver todas →
            </Link>
          </div>

          <div className="overflow-x-auto px-2 md:px-4 pb-4 md:pb-6 mt-2">
            <table className="w-full text-left text-[12px] md:text-[13px] text-[#4a6352] min-w-[600px]">
              <thead className="bg-[#f4f8f5] text-[#7a9382] font-black uppercase tracking-[0.15em] text-[9px] md:text-[10px]">
                <tr>
                  <th className="px-4 md:px-6 py-3 md:py-4 rounded-l-full">Número</th>
                  <th className="px-4 md:px-6 py-3 md:py-4">Cliente</th>
                  <th className="px-4 md:px-6 py-3 md:py-4">Almacén</th>
                  <th className="px-4 md:px-6 py-3 md:py-4">Estado</th>
                  <th className="px-4 md:px-6 py-3 md:py-4 text-right rounded-r-full">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#eef3ef]">
                {proformasRecientes.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 md:py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-[#98b0a0]">
                        <Sprout className="w-8 h-8 md:w-10 md:h-10 mb-3 opacity-50" />
                        <span className="font-semibold text-xs md:text-sm">No hay proformas registradas recientemente.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  proformasRecientes.map((p) => {
                    const estadoColors: Record<string, string> = {
                      BORRADOR: 'bg-[#eef3ef] text-[#4a6352]',
                      RESERVADO: 'bg-[#e5f0fa] text-[#2c659e]',
                      PREPARADO: 'bg-[#fbf4e6] text-[#b3862b]',
                      DESPACHADO: 'bg-[#e5eee8] text-[#3b5e47]',
                      ANULADO: 'bg-[#fbe8e8] text-[#c94545]',
                    };

                    return (
                      <tr key={p.id} className="hover:bg-[#f9fbf9] transition-colors group">
                        <td className="px-4 md:px-6 py-3 md:py-4 font-mono font-bold text-[#2d4735]">
                          {p.numero}
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4 font-bold text-[#4a6352] max-w-[150px] truncate">
                          {p.cliente?.razon_social || 'Cliente'}
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4 font-medium max-w-[100px] truncate">
                          {p.ubicacion?.nombre || 'Almacén'}
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4">
                          <span
                            className={`text-[9px] md:text-[10px] font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${
                              estadoColors[p.estado] || 'bg-[#eef3ef] text-[#7a9382]'
                            }`}
                          >
                            {p.estado}
                          </span>
                        </td>
                        <td className="px-4 md:px-6 py-3 md:py-4 text-right font-mono font-bold text-[#2d4735] text-[13px] md:text-[15px]">
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
    </div>
  );
};
