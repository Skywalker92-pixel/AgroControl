import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  MapPin,
  Tag,
} from 'lucide-react';
import { clientesApi, catalogoApi } from '../api/services';
import { Cliente } from '../types';

export const Clientes: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [listasPrecio, setListasPrecio] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [modalNuevo, setModalNuevo] = useState(false);
  const [formCliente, setFormCliente] = useState({
    tipo_documento: 'RUC',
    numero_documento: '',
    razon_social: '',
    direccion: '',
    telefono: '',
    email: '',
    lista_precio_id: '',
  });

  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const [clis, listas] = await Promise.all([
        clientesApi.listar(),
        catalogoApi.listarListasPrecio(),
      ]);
      setClientes(clis);
      setListasPrecio(listas);
      if (listas.length > 0 && !formCliente.lista_precio_id) {
        setFormCliente((prev) => ({ ...prev, lista_precio_id: listas[0].id }));
      }
    } catch (err) {
      console.error('Error al cargar clientes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleCrearCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    try {
      await clientesApi.crear({
        tipo_documento: formCliente.tipo_documento,
        numero_documento: formCliente.numero_documento.trim(),
        razon_social: formCliente.razon_social.trim(),
        direccion: formCliente.direccion.trim() || undefined,
        telefono: formCliente.telefono.trim() || undefined,
        email: formCliente.email.trim() || undefined,
        lista_precio_id: formCliente.lista_precio_id,
      });

      setFeedback({ tipo: 'ok', texto: 'Cliente registrado exitosamente.' });
      setModalNuevo(false);
      setFormCliente({
        tipo_documento: 'RUC',
        numero_documento: '',
        razon_social: '',
        direccion: '',
        telefono: '',
        email: '',
        lista_precio_id: listasPrecio[0]?.id || '',
      });
      cargarDatos();
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al registrar cliente.',
      });
    }
  };

  const clientesFiltrados = clientes.filter(
    (c) =>
      c.razon_social.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.numero_documento.toLowerCase().includes(busqueda.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-emerald-600" />
            Directorio de Clientes
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro y asignación de tipo de cliente / lista de precios (Mayorista o Minorista)
          </p>
        </div>

        <button
          onClick={() => {
            setModalNuevo(true);
            setFeedback(null);
          }}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Nuevo Cliente
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            feedback.tipo === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {feedback.tipo === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{feedback.texto}</span>
        </div>
      )}

      {/* Búsqueda */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por RUC/DNI o Razón Social..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full text-xs text-slate-800 focus:outline-none"
        />
      </div>

      {/* Tabla de Clientes */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Documento</th>
                <th className="px-4 py-3">Razón Social / Nombre</th>
                <th className="px-4 py-3">Lista de Precios</th>
                <th className="px-4 py-3">Contacto</th>
                <th className="px-4 py-3">Dirección</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Cargando clientes...
                  </td>
                </tr>
              ) : clientesFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No se encontraron clientes registrados.
                  </td>
                </tr>
              ) : (
                clientesFiltrados.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <span className="text-[10px] text-slate-400 block font-sans">
                        {c.tipo_documento}
                      </span>
                      {c.numero_documento}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {c.razon_social}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                          c.lista_precio?.codigo === 'MAYORISTA'
                            ? 'bg-indigo-50 text-indigo-800 border border-indigo-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        {c.lista_precio?.nombre || 'General'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {c.telefono ? (
                        <div className="flex items-center gap-1 font-mono">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {c.telefono}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-xs truncate">
                      {c.direccion ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{c.direccion}</span>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Nuevo Cliente */}
      {modalNuevo && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="font-bold text-slate-800 text-sm">Registrar Nuevo Cliente</h3>
              <button onClick={() => setModalNuevo(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCrearCliente} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Tipo Doc *
                  </label>
                  <select
                    value={formCliente.tipo_documento}
                    onChange={(e) =>
                      setFormCliente({ ...formCliente, tipo_documento: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded bg-white font-bold"
                  >
                    <option value="RUC">RUC</option>
                    <option value="DNI">DNI</option>
                    <option value="CE">CE</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-slate-700 font-semibold mb-1">
                    Número de Documento *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ej. 20123456789"
                    value={formCliente.numero_documento}
                    onChange={(e) =>
                      setFormCliente({ ...formCliente, numero_documento: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Razón Social / Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Agrícola San Isidro SAC"
                  value={formCliente.razon_social}
                  onChange={(e) =>
                    setFormCliente({ ...formCliente, razon_social: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Lista de Precios Asignada *
                </label>
                <select
                  required
                  value={formCliente.lista_precio_id}
                  onChange={(e) =>
                    setFormCliente({ ...formCliente, lista_precio_id: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded bg-white font-semibold text-emerald-800"
                >
                  {listasPrecio.map((lp) => (
                    <option key={lp.id} value={lp.id}>
                      {lp.nombre} ({lp.codigo})
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-500 mt-0.5 block">
                  Determina automáticamente los precios que se aplicarán en sus proformas.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  placeholder="ej. Carretera Panamericana Sur Km 230"
                  value={formCliente.direccion}
                  onChange={(e) =>
                    setFormCliente({ ...formCliente, direccion: e.target.value })
                  }
                  className="w-full p-2 border border-slate-300 rounded"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    placeholder="ej. 956123456"
                    value={formCliente.telefono}
                    onChange={(e) =>
                      setFormCliente({ ...formCliente, telefono: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-semibold mb-1">
                    Correo Electrónico
                  </label>
                  <input
                    type="email"
                    placeholder="contacto@empresa.pe"
                    value={formCliente.email}
                    onChange={(e) =>
                      setFormCliente({ ...formCliente, email: e.target.value })
                    }
                    className="w-full p-2 border border-slate-300 rounded"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNuevo(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded shadow"
                >
                  Guardar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
