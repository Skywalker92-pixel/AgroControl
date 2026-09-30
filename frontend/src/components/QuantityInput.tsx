import React from 'react';
import { Package, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Presentacion } from '../types';

interface QuantityInputProps {
  presentaciones?: Presentacion[];
  selectedPresentacionId?: string;
  onSelectPresentacion: (presentacionId: string | undefined) => void;
  cantidadPresentacion: number;
  onChangeCantidadPresentacion: (val: number) => void;
  unidadesSueltas: number;
  onChangeUnidadesSueltas: (val: number) => void;
  unidadBase: string;
  stockDisponible?: number;
}

export const QuantityInput: React.FC<QuantityInputProps> = ({
  presentaciones = [],
  selectedPresentacionId,
  onSelectPresentacion,
  cantidadPresentacion,
  onChangeCantidadPresentacion,
  unidadesSueltas,
  onChangeUnidadesSueltas,
  unidadBase,
  stockDisponible,
}) => {
  const presentacionActiva = presentaciones.find(
    (p) => p.id === selectedPresentacionId,
  );
  const factor = presentacionActiva ? Number(presentacionActiva.factor) : 1;
  const totalBase = (cantidadPresentacion * factor) + unidadesSueltas;
  const tieneExceso =
    stockDisponible !== undefined && totalBase > stockDisponible;

  return (
    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
          <Package className="w-4 h-4 text-emerald-600" />
          Captura Asistida de Cantidades
        </label>
        {presentaciones.length > 0 && (
          <select
            value={selectedPresentacionId || ''}
            onChange={(e) => onSelectPresentacion(e.target.value || undefined)}
            className="text-xs font-medium bg-white border border-slate-300 rounded px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">Sin presentación (unidades directas)</option>
            {presentaciones.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre} (Factor: {Number(p.factor)})
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {presentacionActiva ? (
          <div>
            <span className="text-xs text-slate-500 block mb-1">
              {presentacionActiva.nombre}
            </span>
            <input
              type="number"
              min="0"
              step="1"
              value={cantidadPresentacion || ''}
              onChange={(e) =>
                onChangeCantidadPresentacion(Math.max(0, parseInt(e.target.value) || 0))
              }
              placeholder="0"
              className="w-full text-base font-semibold text-center border border-slate-300 rounded-md py-1.5 bg-white text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        ) : null}

        <div className={presentacionActiva ? '' : 'col-span-2'}>
          <span className="text-xs text-slate-500 block mb-1">
            {presentacionActiva
              ? `${unidadBase}(s) suelta(s)`
              : `Total ${unidadBase}(s)`}
          </span>
          <input
            type="number"
            min="0"
            step="any"
            value={unidadesSueltas || ''}
            onChange={(e) =>
              onChangeUnidadesSueltas(Math.max(0, parseFloat(e.target.value) || 0))
            }
            placeholder="0"
            className="w-full text-base font-semibold text-center border border-slate-300 rounded-md py-1.5 bg-white text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Resumen reactivo de unidades */}
      <div
        className={`flex items-center justify-between text-xs px-2.5 py-1.5 rounded-md ${
          tieneExceso
            ? 'bg-rose-50 text-rose-800 border border-rose-200'
            : 'bg-emerald-50 text-emerald-900 border border-emerald-200'
        }`}
      >
        <div className="flex items-center gap-1.5 font-medium">
          {tieneExceso ? (
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          )}
          <span>
            Total:{' '}
            <strong className="text-sm font-bold">
              {totalBase.toFixed(3)}
            </strong>{' '}
            {unidadBase}(s)
          </span>
        </div>
        {stockDisponible !== undefined && (
          <span
            className={`font-semibold ${
              tieneExceso ? 'text-rose-700 underline' : 'text-slate-600'
            }`}
          >
            Disponible: {stockDisponible.toFixed(3)} {unidadBase}(s)
          </span>
        )}
      </div>

      {tieneExceso && (
        <p className="text-[11px] text-rose-600 font-medium animate-pulse">
          ⚠️ La cantidad solicitada ({totalBase}) excede el saldo disponible (
          {stockDisponible}) en este almacén.
        </p>
      )}
    </div>
  );
};
