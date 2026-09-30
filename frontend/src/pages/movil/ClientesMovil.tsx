import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Search,
  UserPlus,
  ShoppingCart,
  Phone,
  MapPin,
  Tag,
  Check,
  X,
  AlertCircle,
} from 'lucide-react';
import { useMobileStore } from '../../store/mobileStore';
import { Cliente } from '../../types';

export const ClientesMovil: React.FC = () => {
  const navigate = useNavigate();
  const { clientes, registrarClienteRapido } = useMobileStore();

  const [busqueda, setBusqueda] = useState('');
  const [modalNuevoCliente, setModalNuevoCliente] = useState(false);

  // Formulario nuevo cliente
  const [docIdentidad, setDocIdentidad] = useState('');
  const [razonSocial, setRazonSocial] = useState('');
  const [direccion, setDireccion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null);

  const clientesFiltrados = clientes.filter((c) => {
    const q = busqueda.toLowerCase().trim();
    if (!q) return true;
    return (
      c.razon_social.toLowerCase().includes(q) ||
      c.numero_documento.includes(q) ||
      (c.direccion && c.direccion.toLowerCase().includes(q))
    );
  });

  const handleCrearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docIdentidad || !razonSocial) {
      setErrorNuevo('Documento y Razón Social son obligatorios.');
      return;
    }

    setGuardando(true);
    setErrorNuevo(null);

    try {
      const nuevo = await registrarClienteRapido({
        numero_documento: docIdentidad.trim(),
        razon_social: razonSocial.trim(),
        direccion: direccion.trim() || 'En ruta',
        telefono: telefono.trim(),
      });

      setModalNuevoCliente(false);
      setDocIdentidad('');
      setRazonSocial('');
      setDireccion('');
      setTelefono('');

      // Opcional: iniciar venta directa con el nuevo cliente
      navigate(`/movil/venta?clienteId=${nuevo.id}`);
    } catch (err: any) {
      setErrorNuevo(err.message || 'Error al registrar cliente.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Cabecera y Buscador */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-black text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-emerald-400" />
            <span>Padrón de Clientes ({clientesFiltrados.length})</span>
          </h2>

          <button
            onClick={() => setModalNuevoCliente(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1.5 shadow-md active:scale-95 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nuevo en Ruta</span>
          </button>
        </div>

        {/* Input de Búsqueda Táctil */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, DNI o RUC..."
            className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl pl-10 pr-4 py-3 text-xs placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
          />
        </div>
      </div>

      {/* Listado de Clientes */}
      <div className="space-y-2.5">
        {clientesFiltrados.length === 0 ? (
          <div className="text-center py-10 bg-slate-800/40 rounded-2xl border border-slate-800 p-4">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400">No se encontraron clientes para "{busqueda}".</p>
            <button
              onClick={() => {
                setDocIdentidad(busqueda);
                setModalNuevoCliente(true);
              }}
              className="mt-3 text-xs text-emerald-400 font-bold underline"
            >
              Registrar "{busqueda}" como nuevo cliente
            </button>
          </div>
        ) : (
          clientesFiltrados.map((c) => (
            <div
              key={c.id}
              className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 flex items-center justify-between gap-3 shadow-md"
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-700">
                    {c.tipo_documento}: {c.numero_documento}
                  </span>
                  {c.lista_precio && (
                    <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/40 truncate">
                      {c.lista_precio.nombre}
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-sm text-white truncate leading-snug">
                  {c.razon_social}
                </h3>

                {c.direccion && (
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 shrink-0 text-slate-500" />
                    <span>{c.direccion}</span>
                  </p>
                )}
              </div>

              <button
                onClick={() => navigate(`/movil/venta?clienteId=${c.id}`)}
                className="bg-emerald-600/90 hover:bg-emerald-500 text-white font-bold p-3 rounded-xl flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-md shadow-emerald-950"
                title="Vender a este cliente"
              >
                <ShoppingCart className="w-5 h-5" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: REGISTRAR NUEVO CLIENTE EN RUTA                                    */}
      {/* ========================================================================= */}
      {modalNuevoCliente && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                <span>Nuevo Cliente en Ruta</span>
              </h3>
              <button
                onClick={() => setModalNuevoCliente(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorNuevo && (
              <div className="bg-rose-500/20 border border-rose-500/40 rounded-xl p-2.5 text-xs text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorNuevo}</span>
              </div>
            )}

            <form onSubmit={handleCrearCliente} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  DNI o RUC
                </label>
                <input
                  type="text"
                  required
                  value={docIdentidad}
                  onChange={(e) => setDocIdentidad(e.target.value)}
                  placeholder="Ej. 10456789012"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Nombre o Razón Social
                </label>
                <input
                  type="text"
                  required
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Ej. Fundo Santa Rosa SAC"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Dirección o Fundo (Opcional)
                </label>
                <input
                  type="text"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Ej. Sector El Valle Km 14"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Teléfono / WhatsApp (Opcional)
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="Ej. 987654321"
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={guardando}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950 active:scale-95 disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Guardar y Continuar a Venta</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
