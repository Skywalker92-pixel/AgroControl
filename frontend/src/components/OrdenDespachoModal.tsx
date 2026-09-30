import React from 'react';
import { Printer, X, CheckCircle, Package } from 'lucide-react';
import { OrdenDespacho } from '../types';

interface OrdenDespachoModalProps {
  orden: OrdenDespacho | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrdenDespachoModal: React.FC<OrdenDespachoModalProps> = ({
  orden,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !orden) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatearFecha = (fechaStr: string) => {
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Cabecera del modal (no imprimible) */}
        <div className="no-print flex items-center justify-between px-6 py-4 bg-slate-800 text-white">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-base">
              Vista Previa de Orden de Despacho
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir Documento
            </button>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Documento Impreso / Print-Friendly */}
        <div
          id="seccion-impresion-orden"
          className="p-8 overflow-y-auto bg-white text-slate-900 flex-1 space-y-6 text-sm"
        >
          {/* Encabezado comercial */}
          <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start">
            <div>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
                AGROCONTROL PRO
              </h1>
              <p className="text-xs text-slate-600 font-medium">
                Venta y Distribución de Insumos Agrícolas
              </p>
              <p className="text-xs text-slate-500">
                Local Comercial Principal – Pisco, Ica, Perú
              </p>
            </div>
            <div className="text-right border border-slate-300 p-2.5 rounded-lg bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                ORDEN DE DESPACHO
              </span>
              <span className="text-base font-black font-mono text-emerald-700">
                {orden.numero_documento}
              </span>
              <span className="text-[11px] text-slate-600 block mt-0.5">
                Estado: <strong className="uppercase">{orden.estado}</strong>
              </span>
            </div>
          </div>

          {/* Datos del Cliente y Despacho */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs">
            <div>
              <p className="text-slate-500 font-medium">Cliente / Razón Social:</p>
              <p className="text-sm font-bold text-slate-900">
                {orden.cliente.razon_social}
              </p>
              <p className="text-slate-600 mt-1">
                {orden.cliente.tipo_documento}: {orden.cliente.numero_documento}
              </p>
              <p className="text-slate-600">
                Dirección: {orden.cliente.direccion || 'No especificada'}
              </p>
            </div>
            <div>
              <p className="text-slate-500 font-medium">Almacén de Despacho:</p>
              <p className="text-sm font-bold text-slate-900">
                [{orden.almacen_origen.codigo}] {orden.almacen_origen.nombre}
              </p>
              <p className="text-slate-600 mt-1">
                Fecha Emisión: {formatearFecha(orden.fecha_emision)}
              </p>
              <p className="text-slate-600">
                Vendedor: {orden.vendedor.nombre_completo}
              </p>
            </div>
          </div>

          {orden.observaciones && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
              <strong>Observaciones de Carga:</strong> {orden.observaciones}
            </div>
          )}

          {/* Tabla de Mercadería para el personal de carga */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Detalle de Mercadería a Cargar
            </h4>
            <table className="w-full border-collapse border border-slate-300 text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-800">
                  <th className="border border-slate-300 px-2 py-1.5 text-center w-8">
                    #
                  </th>
                  <th className="border border-slate-300 px-2 py-1.5 text-left w-24">
                    Código
                  </th>
                  <th className="border border-slate-300 px-3 py-1.5 text-left">
                    Producto
                  </th>
                  <th className="border border-slate-300 px-3 py-1.5 text-left">
                    Detalle de Empaque
                  </th>
                  <th className="border border-slate-300 px-3 py-1.5 text-right w-28">
                    Total Unidades Base
                  </th>
                </tr>
              </thead>
              <tbody>
                {orden.items.map((it) => (
                  <tr key={it.linea} className="hover:bg-slate-50">
                    <td className="border border-slate-300 px-2 py-2 text-center font-medium">
                      {it.linea}
                    </td>
                    <td className="border border-slate-300 px-2 py-2 font-mono text-[11px] text-slate-700">
                      {it.producto.codigo_interno}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 font-semibold text-slate-900">
                      {it.producto.nombre}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-slate-800 font-medium">
                      {it.descripcion_empaque}
                    </td>
                    <td className="border border-slate-300 px-3 py-2 text-right font-black text-slate-900 font-mono text-sm">
                      {it.cantidad_total_base.toFixed(3)} {it.producto.unidad_base}(s)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Resumen Total */}
          <div className="flex justify-between items-center border-t-2 border-slate-800 pt-3">
            <span className="text-xs text-slate-600">
              Total de ítems: <strong>{orden.resumen_carga.total_items}</strong>
            </span>
            <div className="text-right">
              <span className="text-xs text-slate-500 mr-2">
                Carga Total Consolidada:
              </span>
              <span className="text-base font-black font-mono text-emerald-800">
                {orden.resumen_carga.total_unidades_base.toFixed(3)} unidades base
              </span>
            </div>
          </div>

          {/* Sección de Firmas de Recepción Física */}
          <div className="grid grid-cols-2 gap-12 pt-16 mt-8">
            <div className="text-center border-t border-slate-400 pt-2">
              <p className="text-xs font-semibold text-slate-800">
                Despachado por (Almacén)
              </p>
              <p className="text-[10px] text-slate-500">Nombre, Firma y Fecha</p>
            </div>
            <div className="text-center border-t border-slate-400 pt-2">
              <p className="text-xs font-semibold text-slate-800">
                Recibido Conforme (Transportista / Cliente)
              </p>
              <p className="text-[10px] text-slate-500">Nombre, DNI y Firma</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
