import React, { useEffect, useState } from 'react';
import {
  Boxes,
  Plus,
  Search,
  Tag,
  Package,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { catalogoApi } from '../api/services';
import { Categoria, Producto, Presentacion } from '../types';

export const Catalogo: React.FC = () => {
  const { usuario } = useAuthStore();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [listasPrecio, setListasPrecio] = useState<any[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('');
  const [busqueda, setBusqueda] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Modales
  const [modalNuevoProducto, setModalNuevoProducto] = useState(false);
  const [modalNuevaPresentacion, setModalNuevaPresentacion] = useState(false);
  const [modalAsignarPrecio, setModalAsignarPrecio] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);

  // Formularios
  const [formProd, setFormProd] = useState({
    codigo_interno: '',
    nombre: '',
    unidad_base: 'litro',
    categoria_id: '',
    codigo_barras: '',
  });

  const [formPres, setFormPres] = useState({
    nombre: 'Caja x12',
    factor: 12,
  });

  const [formPrecio, setFormPrecio] = useState({
    lista_precio_id: '',
    precio: '',
  });

  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const esVendedor = usuario?.rol === 'VENDEDOR';
  const puedeGestionarPrecios =
    usuario?.rol === 'ADMINISTRADOR_PROPIETARIO' ||
    usuario?.rol === 'ADMINISTRADOR_SECUNDARIO';

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      const [cats, prods, listas] = await Promise.all([
        catalogoApi.listarCategorias(),
        catalogoApi.listarProductos(),
        catalogoApi.listarListasPrecio(),
      ]);
      setCategorias(cats);
      setProductos(prods);
      setListasPrecio(listas);
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  const handleCrearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensaje(null);
    try {
      await catalogoApi.crearProducto({
        codigo_interno: formProd.codigo_interno.trim().toUpperCase(),
        nombre: formProd.nombre.trim(),
        unidad_base: formProd.unidad_base,
        categoria_id: formProd.categoria_id,
        codigo_barras: formProd.codigo_barras?.trim() || undefined,
      });
      setMensaje({ tipo: 'ok', texto: 'Producto creado exitosamente' });
      setModalNuevoProducto(false);
      setFormProd({
        codigo_interno: '',
        nombre: '',
        unidad_base: 'litro',
        categoria_id: '',
        codigo_barras: '',
      });
      cargarDatos();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al crear producto.',
      });
    }
  };

  const handleCrearPresentacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoSeleccionado) return;
    setMensaje(null);
    try {
      await catalogoApi.crearPresentacion(productoSeleccionado.id, {
        nombre: formPres.nombre.trim(),
        factor: Number(formPres.factor),
      });
      setMensaje({ tipo: 'ok', texto: 'Presentación agregada exitosamente' });
      setModalNuevaPresentacion(false);
      cargarDatos();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al agregar presentación.',
      });
    }
  };

  const handleAsignarPrecio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productoSeleccionado) return;
    setMensaje(null);
    try {
      await catalogoApi.asignarPrecio({
        producto_id: productoSeleccionado.id,
        lista_precio_id: formPrecio.lista_precio_id,
        precio: parseFloat(formPrecio.precio),
      });
      setMensaje({ tipo: 'ok', texto: 'Precio asignado correctamente' });
      setModalAsignarPrecio(false);
      cargarDatos();
    } catch (err: any) {
      setMensaje({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al asignar precio.',
      });
    }
  };

  const productosFiltrados = productos.filter((p) => {
    const matchCat = categoriaSeleccionada
      ? p.categoria_id === categoriaSeleccionada
      : true;
    const matchBusqueda =
      p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.codigo_interno.toLowerCase().includes(busqueda.toLowerCase());
    return matchCat && matchBusqueda;
  });

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Boxes className="w-6 h-6 text-emerald-600" />
            Catálogo de Productos & Precios
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Gestión de unidades base, presentaciones comerciales y listas de precios
          </p>
        </div>

        {!esVendedor && (
          <button
            onClick={() => setModalNuevoProducto(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Nuevo Producto
          </button>
        )}
      </div>

      {mensaje && (
        <div
          className={`p-3.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
            mensaje.tipo === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {mensaje.tipo === 'ok' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600" />
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Buscar por código interno o nombre del producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        <div className="w-full sm:w-64">
          <select
            value={categoriaSeleccionada}
            onChange={(e) => setCategoriaSeleccionada(e.target.value)}
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Todas las Categorías</option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Producto</th>
                <th className="px-4 py-3">Categoría</th>
                <th className="px-4 py-3">Unidad Base</th>
                <th className="px-4 py-3">Presentaciones</th>
                {!esVendedor && <th className="px-4 py-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Cargando catálogo...
                  </td>
                </tr>
              ) : productosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No se encontraron productos coincidentes.
                  </td>
                </tr>
              ) : (
                productosFiltrados.map((prod) => (
                  <tr key={prod.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">
                      {prod.codigo_interno}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      {prod.nombre}
                      {prod.codigo_barras && (
                        <span className="block text-[10px] text-slate-400 font-mono">
                          Barras: {prod.codigo_barras}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {prod.categoria?.nombre || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-medium">
                        {prod.unidad_base}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {prod.presentacion && prod.presentacion.length > 0 ? (
                          prod.presentacion.map((pr) => (
                            <span
                              key={pr.id}
                              className="px-2 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-700 text-[10px] font-medium"
                            >
                              {pr.nombre} (x{Number(pr.factor)})
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Solo unidad base
                          </span>
                        )}
                      </div>
                    </td>
                    {!esVendedor && (
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setProductoSeleccionado(prod);
                            setModalNuevaPresentacion(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 transition-colors"
                        >
                          + Presentación
                        </button>
                        {puedeGestionarPrecios && (
                          <button
                            onClick={() => {
                              setProductoSeleccionado(prod);
                              setModalAsignarPrecio(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded border border-emerald-200 transition-colors"
                          >
                            $ Asignar Precio
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Nuevo Producto */}
      {modalNuevoProducto && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">Registrar Nuevo Producto</h3>
              <button onClick={() => setModalNuevoProducto(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCrearProducto} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código Interno *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. FERT-UREA-01"
                  value={formProd.codigo_interno}
                  onChange={(e) =>
                    setFormProd({ ...formProd, codigo_interno: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 uppercase"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Comercial *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Urea Granulada 46% N 50kg"
                  value={formProd.nombre}
                  onChange={(e) =>
                    setFormProd({ ...formProd, nombre: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoría *
                  </label>
                  <select
                    required
                    value={formProd.categoria_id}
                    onChange={(e) =>
                      setFormProd({ ...formProd, categoria_id: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    <option value="">Seleccione...</option>
                    {categorias.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Unidad Base *
                  </label>
                  <select
                    required
                    value={formProd.unidad_base}
                    onChange={(e) =>
                      setFormProd({ ...formProd, unidad_base: e.target.value })
                    }
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 bg-white"
                  >
                    <option value="litro">litro</option>
                    <option value="botella">botella</option>
                    <option value="saco">saco</option>
                    <option value="kg">kg</option>
                    <option value="gramo">gramo</option>
                    <option value="unidad">unidad</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Código de Barras (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ej. 7751234567890"
                  value={formProd.codigo_barras}
                  onChange={(e) =>
                    setFormProd({ ...formProd, codigo_barras: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNuevoProducto(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nueva Presentación */}
      {modalNuevaPresentacion && productoSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                Agregar Presentación a {productoSeleccionado.nombre}
              </h3>
              <button onClick={() => setModalNuevaPresentacion(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCrearPresentacion} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de Presentación (ej. Caja x12)
                </label>
                <input
                  type="text"
                  required
                  placeholder="Caja x12"
                  value={formPres.nombre}
                  onChange={(e) =>
                    setFormPres({ ...formPres, nombre: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Factor de Conversión ({productoSeleccionado.unidad_base}s por presentación)
                </label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  value={formPres.factor}
                  onChange={(e) =>
                    setFormPres({ ...formPres, factor: parseFloat(e.target.value) || 1 })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 font-bold"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalNuevaPresentacion(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded shadow"
                >
                  Agregar Presentación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Asignar Precio */}
      {modalAsignarPrecio && productoSeleccionado && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm">
                Asignar Precio a {productoSeleccionado.nombre}
              </h3>
              <button onClick={() => setModalAsignarPrecio(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleAsignarPrecio} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lista de Precio *
                </label>
                <select
                  required
                  value={formPrecio.lista_precio_id}
                  onChange={(e) =>
                    setFormPrecio({ ...formPrecio, lista_precio_id: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 bg-white"
                >
                  <option value="">Seleccione lista...</option>
                  {listasPrecio.map((lp) => (
                    <option key={lp.id} value={lp.id}>
                      {lp.nombre} ({lp.codigo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Precio Unitario en Soles (S/ por {productoSeleccionado.unidad_base})
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={formPrecio.precio}
                  onChange={(e) =>
                    setFormPrecio({ ...formPrecio, precio: e.target.value })
                  }
                  className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded focus:ring-1 focus:ring-emerald-500 font-mono font-bold"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalAsignarPrecio(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 border border-slate-300 rounded hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow"
                >
                  Guardar Precio
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
