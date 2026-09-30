import React from 'react';
import { Printer, X, FileCheck2, AlertTriangle, ShieldCheck, CheckCircle } from 'lucide-react';
import { ActaLiquidacion } from '../types';

interface ActaLiquidacionModalProps {
  acta: ActaLiquidacion | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ActaLiquidacionModal: React.FC<ActaLiquidacionModalProps> = ({
  acta,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !acta) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatearFecha = (fechaStr?: string | null) => {
    if (!fechaStr) return '-';
    try {
      const d = new Date(fechaStr);
      return d.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return fechaStr;
    }
  };

  const esObservada = acta.estado === 'OBSERVADA';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Cabecera del modal (no imprimible) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-800 text-white">
          <div className="flex items-center gap-2.5">
            <FileCheck2 className="w-5 h-5 text-emerald-400" />
            <div>
              <h2 className="font-semibold text-base leading-tight">
                Acta Oficial de Cierre y Liquidación de Ruta
              </h2>
              <span className="text-xs text-slate-300">
                Liquidación: <strong>{acta.codigo}</strong> | Carga:{' '}
                <strong>{acta.carga.codigo}</strong>
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir Acta (A4)
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Documento Impreso / Print-Friendly */}
        <div
          id="seccion-impresion-acta"
          className="p-8 overflow-y-auto bg-white text-slate-900 flex-1 space-y-5 text-sm"
        >
          {/* Encabezado comercial oficial */}
          <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                AGROCONTROL PRO
              </h1>
              <p className="text-xs font-semibold text-slate-700">
                Insumos Agrícolas, Semillas y Fertilizantes
              </p>
              <p className="text-xs text-slate-500">
                RUC: 20608945123 | Central Administrativa – Pisco, Ica, Perú
              </p>
            </div>
            <div className="text-right border-2 border-slate-900 p-3 rounded-lg bg-slate-50 shadow-sm min-w-[240px]">
              <span className="text-[10px] uppercase font-black text-slate-600 tracking-wider block">
                ACTA OFICIAL DE LIQUIDACIÓN
              </span>
              <span className="text-lg font-black font-mono text-emerald-800 block">
                {acta.codigo}
              </span>
              <div className="flex items-center justify-end gap-1.5 mt-1">
                <span className="text-[10px] text-slate-500">ESTADO:</span>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                    esObservada
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  {acta.estado}
                </span>
              </div>
            </div>
          </div>

          {/* Datos Logísticos y Operativos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-lg border border-slate-300 text-xs">
            <div>
              <p className="text-slate-500 font-medium">Carga de Distribución:</p>
              <p className="font-mono font-bold text-slate-900 text-sm">
                {acta.carga.codigo}
              </p>
              <p className="text-slate-600 mt-0.5">
                Salida: {formatearFecha(acta.carga.fecha_salida)}
              </p>
              <p className="text-slate-600">
                Cierre: {formatearFecha(acta.carga.fecha_cierre || acta.fecha_liquidacion)}
              </p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Conductor Responsable:</p>
              <p className="font-bold text-slate-900 text-sm">
                {acta.carga.conductor.nombre_completo}
              </p>
              <p className="text-slate-600 mt-0.5">
                Usuario: @{acta.carga.conductor.username}
              </p>
              <p className="text-slate-600">
                Vehículo:{' '}
                <strong className="font-mono text-emerald-700">
                  {acta.carga.vehiculo.placa}
                </strong>{' '}
                {acta.carga.vehiculo.marca ? `(${acta.carga.vehiculo.marca})` : ''}
              </p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Liquidado en Almacén:</p>
              <p className="font-bold text-slate-900">
                [{acta.carga.almacen_origen.codigo}] {acta.carga.almacen_origen.nombre}
              </p>
              <p className="text-slate-600 mt-0.5">
                Liquidador: <strong>{acta.liquidador.nombre_completo}</strong>
              </p>
              <p className="text-slate-600">
                Cargo / Rol: {acta.liquidador.rol}
              </p>
            </div>
          </div>

          {/* Alerta de Observación (si aplica) */}
          {esObservada && (
            <div className="p-3 bg-amber-50 border-l-4 border-amber-500 rounded text-xs text-amber-900 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">
                  Liquidación con Estado OBSERVADA por Discrepancias Físicas o Financieras
                </p>
                <p className="text-amber-800 mt-0.5">
                  Esta acta certifica diferencias entre la mercadería asignada inicialmente y los
                  reintegros/ventas registrados en ruta. Verifique las justificaciones detalladas a
                  continuación.
                </p>
              </div>
            </div>
          )}

          {acta.observaciones && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-700">
              <strong className="text-slate-900">Observaciones Generales de la Liquidación:</strong>{' '}
              {acta.observaciones}
            </div>
          )}

          {/* Tabla Comparativa de Liquidación */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-700" />
                Conciliación Física de Mercadería (Ecuación de Ruta: Carga = Venta + Retorno + Dif.)
              </h3>
            </div>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-900 border-b border-slate-300">
                  <th className="border border-slate-300 px-2 py-2 text-center w-8">#</th>
                  <th className="border border-slate-300 px-2 py-2 text-left w-20">Código</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">Insumo Agrícola</th>
                  <th className="border border-slate-300 px-2 py-2 text-center w-16">Unidad</th>
                  <th className="border border-slate-300 px-2 py-2 text-right w-18">Cargado</th>
                  <th className="border border-slate-300 px-2 py-2 text-right w-18">Vendido</th>
                  <th className="border border-slate-300 px-2 py-2 text-right w-18">Retornado</th>
                  <th className="border border-slate-300 px-2 py-2 text-right w-18">Diferencia</th>
                  <th className="border border-slate-300 px-3 py-2 text-left">Justificación / Motivo</th>
                  <th className="border border-slate-300 px-2 py-2 text-right w-20">Subtotal S/</th>
                </tr>
              </thead>
              <tbody>
                {acta.items.map((it) => {
                  const tieneDiscrepancia = Math.abs(it.diferencia) > 0.0001;
                  return (
                    <tr
                      key={it.linea}
                      className={tieneDiscrepancia ? 'bg-amber-50/60' : 'hover:bg-slate-50'}
                    >
                      <td className="border border-slate-300 px-2 py-2 text-center font-medium">
                        {it.linea}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 font-mono text-[11px] text-slate-700">
                        {it.codigo_interno}
                      </td>
                      <td className="border border-slate-300 px-3 py-2">
                        <span className="font-bold text-slate-900 block leading-tight">
                          {it.nombre_producto}
                        </span>
                        {it.presentacion && (
                          <span className="text-[10px] text-slate-500 block mt-0.5">
                            Pres: {it.presentacion}
                          </span>
                        )}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-center text-slate-600 font-medium">
                        {it.unidad_base}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-right font-semibold text-slate-800 font-mono">
                        {it.cantidad_cargada.toFixed(3)}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-right font-bold text-slate-900 font-mono">
                        {it.cantidad_vendida.toFixed(3)}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-right font-bold text-emerald-800 font-mono">
                        {it.cantidad_retornada.toFixed(3)}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-right font-mono">
                        {tieneDiscrepancia ? (
                          <span className="font-black text-rose-700">
                            {it.diferencia > 0 ? '-' : '+'}
                            {Math.abs(it.diferencia).toFixed(3)}
                          </span>
                        ) : (
                          <span className="font-semibold text-emerald-700">0.000</span>
                        )}
                      </td>
                      <td className="border border-slate-300 px-3 py-2 text-[11px]">
                        {it.justificacion ? (
                          <span className="text-amber-900 font-semibold italic">
                            {it.justificacion}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Conforme</span>
                        )}
                      </td>
                      <td className="border border-slate-300 px-2 py-2 text-right font-bold text-slate-900 font-mono">
                        {it.subtotal.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-800 text-slate-900">
                  <td colSpan={4} className="border border-slate-300 px-3 py-2 text-left uppercase text-[11px]">
                    Totales Físicos Consolidados ({acta.items.length} ítems):
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right font-mono">
                    {acta.resumen_unidades.total_cargado.toFixed(3)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right font-mono">
                    {acta.resumen_unidades.total_vendido.toFixed(3)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right font-mono text-emerald-800">
                    {acta.resumen_unidades.total_retornado.toFixed(3)}
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right font-mono">
                    {Math.abs(acta.resumen_unidades.total_diferencia) > 0.0001 ? (
                      <span className="text-rose-700 font-black">
                        {acta.resumen_unidades.total_diferencia > 0 ? '-' : '+'}
                        {Math.abs(acta.resumen_unidades.total_diferencia).toFixed(3)}
                      </span>
                    ) : (
                      <span className="text-emerald-800">0.000</span>
                    )}
                  </td>
                  <td className="border border-slate-300 px-3 py-2 text-[11px] text-slate-600">
                    Suma Unidades Base
                  </td>
                  <td className="border border-slate-300 px-2 py-2 text-right font-mono text-emerald-900 font-black">
                    S/ {acta.monetario.total_vendido.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Desglose Monetario Oficial */}
          <div className="bg-slate-50 border-2 border-slate-300 p-4 rounded-lg">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              Conciliación Financiera de Venta y Cobranza en Ruta
            </h4>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Total Vendido
                </span>
                <span className="text-lg font-black text-slate-900 font-mono">
                  S/ {acta.monetario.total_vendido.toFixed(2)}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Total Recaudado / Cobrado
                </span>
                <span className="text-lg font-black text-emerald-700 font-mono">
                  S/ {acta.monetario.total_cobrado.toFixed(2)}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Diferencia Dinero
                </span>
                <span
                  className={`text-lg font-black font-mono ${
                    acta.monetario.diferencia_dinero === 0
                      ? 'text-slate-800'
                      : acta.monetario.diferencia_dinero < 0
                      ? 'text-rose-600'
                      : 'text-indigo-600'
                  }`}
                >
                  S/ {acta.monetario.diferencia_dinero.toFixed(2)}
                </span>
              </div>
              <div className="bg-white p-2.5 rounded border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">
                  Saldo Pendiente
                </span>
                <span
                  className={`text-lg font-black font-mono ${
                    acta.monetario.saldo_pendiente > 0 ? 'text-amber-700' : 'text-slate-700'
                  }`}
                >
                  S/ {acta.monetario.saldo_pendiente.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Casilleros Oficiales de Firmas (Requisito Innegociable) */}
          <div className="pt-12 mt-6">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400 text-center mb-8">
              Certificación y Firmas de Conformidad Administrativa
            </p>
            <div className="grid grid-cols-2 gap-16 px-4">
              <div className="text-center border-t-2 border-slate-800 pt-2.5">
                <p className="text-xs font-bold text-slate-900 uppercase">
                  {acta.firmas.conductor.nombre}
                </p>
                <p className="text-[11px] font-semibold text-slate-700">
                  {acta.firmas.conductor.titulo}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  "{acta.firmas.conductor.leyenda}"
                </p>
                <p className="text-[9px] text-slate-400 mt-4">
                  DNI: _________________ | Firma y Huella Digital
                </p>
              </div>
              <div className="text-center border-t-2 border-slate-800 pt-2.5">
                <p className="text-xs font-bold text-slate-900 uppercase">
                  {acta.firmas.liquidador.nombre}
                </p>
                <p className="text-[11px] font-semibold text-slate-700">
                  {acta.firmas.liquidador.titulo}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 italic">
                  "{acta.firmas.liquidador.leyenda}"
                </p>
                <p className="text-[9px] text-slate-400 mt-4">
                  Rol: {acta.firmas.liquidador.cargo} | Firma y Sello de Almacén
                </p>
              </div>
            </div>
            <div className="text-center mt-8 text-[9px] text-slate-400">
              Acta generada automáticamente por AgroControl Pro – Sistema de Kárdex y Distribución Agrícola.
              {new Date().toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
