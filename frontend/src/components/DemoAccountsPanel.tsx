import React from 'react';
import { FlaskConical } from 'lucide-react';

/**
 * Accesos rápidos a las cuentas FICTICIAS de database/seeds/001_seed_usuarios_demo.sql.
 *
 * Solo se carga (import dinámico) cuando import.meta.env.DEV es true y
 * VITE_ENABLE_DEMO_ACCOUNTS=true: en una build de producción el módulo ni
 * siquiera se genera. La contraseña no está en el código: se toma de
 * VITE_DEMO_PASSWORD (archivo .env.local del desarrollador).
 */
const CUENTAS_DEMO = [
  { username: 'demo.admin', etiqueta: 'Administrador', detalle: 'Propietario' },
  { username: 'demo.secundario', etiqueta: 'Admin. secundario', detalle: 'Administración' },
  { username: 'demo.almacen', etiqueta: 'Operador', detalle: 'Almacén y despacho' },
  { username: 'demo.vendedor', etiqueta: 'Vendedor', detalle: 'Ruta / proformas' },
];

interface DemoAccountsPanelProps {
  usernameActual: string;
  onSeleccionar: (username: string, password: string) => void;
  soloUsuarios?: string[];
  variante?: 'claro' | 'oscuro';
}

const DemoAccountsPanel: React.FC<DemoAccountsPanelProps> = ({
  usernameActual,
  onSeleccionar,
  soloUsuarios,
  variante = 'claro',
}) => {
  const password = import.meta.env.VITE_DEMO_PASSWORD || '';
  const cuentas = soloUsuarios
    ? CUENTAS_DEMO.filter((c) => soloUsuarios.includes(c.username))
    : CUENTAS_DEMO;
  const oscuro = variante === 'oscuro';

  return (
    <div
      className={`mt-6 rounded-xl border border-dashed p-3 ${
        oscuro ? 'border-amber-500/40 bg-amber-500/5' : 'border-amber-300 bg-amber-50/60'
      }`}
    >
      <div
        className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider mb-2 ${
          oscuro ? 'text-amber-300' : 'text-amber-800'
        }`}
      >
        <FlaskConical className="w-3.5 h-3.5" />
        Modo desarrollo · cuentas ficticias
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {cuentas.map((c) => (
          <button
            key={c.username}
            type="button"
            onClick={() => onSeleccionar(c.username, password)}
            className={`p-2 rounded-lg border text-left transition-colors ${
              usernameActual === c.username
                ? 'border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold'
                : oscuro
                  ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
                  : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="font-semibold">{c.etiqueta}</div>
            <div className={`text-[10px] ${oscuro ? 'text-slate-400' : 'text-slate-500'}`}>
              {c.detalle}
            </div>
          </button>
        ))}
      </div>
      {!password && (
        <p className={`mt-2 text-[10px] ${oscuro ? 'text-slate-400' : 'text-slate-500'}`}>
          Defina VITE_DEMO_PASSWORD en frontend/.env.local para autocompletar la contraseña.
        </p>
      )}
    </div>
  );
};

export default DemoAccountsPanel;
