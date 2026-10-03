import React, { useEffect, useState } from 'react';
import {
  Users,
  UserPlus,
  Search,
  KeyRound,
  Shield,
  CheckCircle2,
  AlertTriangle,
  X,
  Lock,
  Power,
  Edit2,
  Mail,
  UserCheck,
} from 'lucide-react';
import { usuariosApi } from '../api/services';
import { Usuario, RolUsuario } from '../types';
import { useAuthStore } from '../store/authStore';

const ROLES_DISPONIBLES: { valor: RolUsuario; etiqueta: string; color: string }[] = [
  { valor: 'ADMINISTRADOR_PROPIETARIO', etiqueta: 'Admin Propietario', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { valor: 'ADMINISTRADOR_SECUNDARIO', etiqueta: 'Admin Secundario', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { valor: 'OPERADOR_ALMACEN', etiqueta: 'Operador de Almacén', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { valor: 'VENDEDOR', etiqueta: 'Vendedor en Ruta', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
];

export const Usuarios: React.FC = () => {
  const usuarioActual = useAuthStore((state) => state.usuario);

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [busqueda, setBusqueda] = useState('');
  const [filtroRol, setFiltroRol] = useState<string>('TODOS');
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  // Modales
  const [modalNuevo, setModalNuevo] = useState(false);
  const [modalEditar, setModalEditar] = useState<Usuario | null>(null);
  const [modalPassword, setModalPassword] = useState<Usuario | null>(null);

  // Formulario nuevo usuario
  const [formNuevo, setFormNuevo] = useState({
    username: '',
    password: '',
    nombre_completo: '',
    email: '',
    rol: 'VENDEDOR' as RolUsuario,
  });

  // Formulario edición
  const [formEditar, setFormEditar] = useState({
    nombre_completo: '',
    email: '',
    rol: 'VENDEDOR' as RolUsuario,
  });

  // Formulario reset password
  const [nuevaPassword, setNuevaPassword] = useState('');

  const cargarUsuarios = async () => {
    setIsLoading(true);
    try {
      const data = await usuariosApi.listar();
      setUsuarios(data || []);
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al cargar usuarios.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    try {
      await usuariosApi.crear({
        username: formNuevo.username.trim(),
        password: formNuevo.password,
        nombre_completo: formNuevo.nombre_completo.trim(),
        email: formNuevo.email.trim() || undefined,
        rol: formNuevo.rol,
      });

      setFeedback({
        tipo: 'ok',
        texto: `Usuario '${formNuevo.username}' creado exitosamente.`,
      });
      setModalNuevo(false);
      setFormNuevo({
        username: '',
        password: '',
        nombre_completo: '',
        email: '',
        rol: 'VENDEDOR',
      });
      cargarUsuarios();
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al crear usuario.',
      });
    }
  };

  const handleGuardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEditar) return;
    setFeedback(null);

    try {
      await usuariosApi.actualizar(modalEditar.id, {
        nombre_completo: formEditar.nombre_completo.trim(),
        email: formEditar.email.trim() || null,
      });

      if (formEditar.rol !== modalEditar.rol) {
        await usuariosApi.cambiarRol(modalEditar.id, formEditar.rol);
      }

      setFeedback({
        tipo: 'ok',
        texto: `Usuario '${modalEditar.username}' actualizado correctamente.`,
      });
      setModalEditar(null);
      cargarUsuarios();
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al actualizar usuario.',
      });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalPassword) return;
    setFeedback(null);

    try {
      await usuariosApi.resetPassword(modalPassword.id, nuevaPassword);
      setFeedback({
        tipo: 'ok',
        texto: `Contraseña restablecida exitosamente para '${modalPassword.username}'.`,
      });
      setModalPassword(null);
      setNuevaPassword('');
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al restablecer contraseña.',
      });
    }
  };

  const handleAlternarEstado = async (u: Usuario) => {
    if (u.id === usuarioActual?.id && u.activo) {
      if (!window.confirm('¿Está seguro de desactivar su propia cuenta? Perderá acceso inmediato al sistema.')) {
        return;
      }
    }
    setFeedback(null);
    try {
      await usuariosApi.cambiarEstado(u.id, !u.activo);
      setFeedback({
        tipo: 'ok',
        texto: `Usuario '${u.username}' ${!u.activo ? 'activado' : 'desactivado'} exitosamente.`,
      });
      cargarUsuarios();
    } catch (err: any) {
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al cambiar estado del usuario.',
      });
    }
  };

  const usuariosFiltrados = usuarios.filter((u) => {
    const matchRol = filtroRol === 'TODOS' || u.rol === filtroRol;
    const q = busqueda.toLowerCase().trim();
    const matchBusqueda =
      !q ||
      u.nombre_completo.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      (u.email && u.email.toLowerCase().includes(q));
    return matchRol && matchBusqueda;
  });

  return (
    <div className="space-y-6">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-indigo-600" />
            Gestión Central de Usuarios
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Administración de cuentas, roles de acceso y contraseñas (OBS-USR-01)
          </p>
        </div>

        <button
          onClick={() => {
            setModalNuevo(true);
            setFeedback(null);
          }}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs flex items-center gap-2 shadow-sm transition-all self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          Nuevo Usuario
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
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{feedback.texto}</span>
        </div>
      )}

      {/* Filtros y Buscador */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFiltroRol('TODOS')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              filtroRol === 'TODOS'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            Todos ({usuarios.length})
          </button>
          {ROLES_DISPONIBLES.map((r) => (
            <button
              key={r.valor}
              onClick={() => setFiltroRol(r.valor)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                filtroRol === r.valor
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {r.etiqueta}
            </button>
          ))}
        </div>

        <div className="relative sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por usuario o nombre..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white"
          />
        </div>
      </div>

      {/* Tabla de Usuarios */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-4 py-3">Usuario</th>
                <th className="px-4 py-3">Nombre Completo</th>
                <th className="px-4 py-3">Correo Electrónico</th>
                <th className="px-4 py-3">Rol del Sistema</th>
                <th className="px-4 py-3 text-center">Estado</th>
                <th className="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Cargando usuarios...
                  </td>
                </tr>
              ) : usuariosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    No se encontraron usuarios registrados.
                  </td>
                </tr>
              ) : (
                usuariosFiltrados.map((u) => {
                  const rolInfo = ROLES_DISPONIBLES.find((r) => r.valor === u.rol);
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">
                        {u.username}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {u.nombre_completo}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {u.email ? (
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3 text-slate-400" />
                            {u.email}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Sin correo</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border inline-flex items-center gap-1 ${
                            rolInfo?.color || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <Shield className="w-3 h-3" />
                          {rolInfo?.etiqueta || u.rol}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            u.activo
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          {u.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setModalEditar(u);
                            setFormEditar({
                              nombre_completo: u.nombre_completo,
                              email: u.email || '',
                              rol: u.rol,
                            });
                          }}
                          className="px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 rounded border border-slate-200 inline-flex items-center gap-1 transition-colors"
                        >
                          <Edit2 className="w-3 h-3 text-slate-500" />
                          Editar
                        </button>

                        <button
                          onClick={() => {
                            setModalPassword(u);
                            setNuevaPassword('');
                          }}
                          className="px-2 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded border border-indigo-200 inline-flex items-center gap-1 transition-colors"
                        >
                          <KeyRound className="w-3 h-3 text-indigo-600" />
                          Contraseña
                        </button>

                        <button
                          onClick={() => handleAlternarEstado(u)}
                          className={`px-2 py-1 text-[11px] font-medium rounded border transition-colors inline-flex items-center gap-1 ${
                            u.activo
                              ? 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200'
                              : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                          }`}
                        >
                          <Power className="w-3 h-3" />
                          {u.activo ? 'Desactivar' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Nuevo Usuario */}
      {modalNuevo && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-indigo-600" />
                Registrar Nuevo Usuario
              </h3>
              <button onClick={() => setModalNuevo(false)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleCrearUsuario} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nombre de Usuario *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. jperez"
                  value={formNuevo.username}
                  onChange={(e) => setFormNuevo({ ...formNuevo, username: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Contraseña Inicial * (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={formNuevo.password}
                  onChange={(e) => setFormNuevo({ ...formNuevo, password: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="ej. Juan Pérez"
                  value={formNuevo.nombre_completo}
                  onChange={(e) => setFormNuevo({ ...formNuevo, nombre_completo: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  placeholder="ej. jperez@agrocontrol.pe"
                  value={formNuevo.email}
                  onChange={(e) => setFormNuevo({ ...formNuevo, email: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Rol del Sistema *
                </label>
                <select
                  value={formNuevo.rol}
                  onChange={(e) => setFormNuevo({ ...formNuevo, rol: e.target.value as RolUsuario })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-semibold"
                >
                  {ROLES_DISPONIBLES.map((r) => (
                    <option key={r.valor} value={r.valor}>
                      {r.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalNuevo(false)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-colors"
                >
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Editar Usuario */}
      {modalEditar && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-indigo-600" />
                Editar Usuario: <span className="font-mono text-indigo-700">{modalEditar.username}</span>
              </h3>
              <button onClick={() => setModalEditar(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleGuardarEdicion} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={formEditar.nombre_completo}
                  onChange={(e) => setFormEditar({ ...formEditar, nombre_completo: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={formEditar.email}
                  onChange={(e) => setFormEditar({ ...formEditar, email: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Rol del Sistema *
                </label>
                <select
                  value={formEditar.rol}
                  onChange={(e) => setFormEditar({ ...formEditar, rol: e.target.value as RolUsuario })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 bg-white font-semibold"
                >
                  {ROLES_DISPONIBLES.map((r) => (
                    <option key={r.valor} value={r.valor}>
                      {r.etiqueta}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalEditar(null)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-colors"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Restablecer Contraseña */}
      {modalPassword && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full border border-slate-200 overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-indigo-600" />
                Restablecer Contraseña
              </h3>
              <button onClick={() => setModalPassword(null)}>
                <X className="w-4 h-4 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleResetPassword} className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">
                Ingrese una nueva contraseña para el usuario{' '}
                <strong className="font-mono text-slate-900">{modalPassword.username}</strong>:
              </p>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">
                  Nueva Contraseña (mínimo 6 caracteres)
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="••••••••"
                  value={nuevaPassword}
                  onChange={(e) => setNuevaPassword(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalPassword(null)}
                  className="px-3.5 py-1.5 border border-slate-300 text-slate-600 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow transition-colors"
                >
                  Actualizar Contraseña
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
