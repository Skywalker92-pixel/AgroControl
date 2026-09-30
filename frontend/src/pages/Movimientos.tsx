import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  PlusCircle,
  Truck,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Warehouse,
  ShieldAlert,
} from 'lucide-react';
import { useWarehouseStore } from '../store/warehouseStore';
import { catalogoApi, inventarioApi, stockApi } from '../api/services';
import { Producto, Ubicacion } from '../types';
import { QuantityInput } from '../components/QuantityInput';
import { ConfirmModal } from '../components/ConfirmModal';

export const Movimientos: React.FC = () => {
  const { almacenActivo, almacenes } = useWarehouseStore();
  const [tipoOperacion, setTipoOperacion] = useState<'ingreso' | 'traslado' | 'ajuste'>('ingreso');

  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoId, setProductoId] = useState('');
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null);

  // Cantidades asistidas
  const [selectedPresentacionId, setSelectedPresentacionId] = useState<string | undefined>();
  const [cantidadPresentacion, setCantidadPresentacion] = useState<number>(0);
  const [unidadesSueltas, setUnidadesSueltas] = useState<number>(0);
  const [costoUnitario, setCostoUnitario] = useState<string>('');
  const [motivo, setMotivo] = useState<string>('');
  const [documentoTipo, setDocumentoTipo] = useState<string>('FACTURA_COMPRA');

  // Para Traslados
  const [origenId, setOrigenId] = useState<string>('');
  const [destinoId, setDestinoId] = useState<string>('');
  const [disponibleOrigen, setDisponibleOrigen] = useState<number | undefined>();

  // Para Ajustes
  const [diferenciaBase, setDiferenciaBase] = useState<number>(0);

  // Estados de control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  useEffect(() => {
    catalogoApi.listarProductos().then(setProductos).catch(console.error);
    if (almacenActivo) {
      setOrigenId(almacenActivo.id);
    }
  }, [almacenActivo]);

  useEffect(() => {
    const prod = productos.find((p) => p.id === productoId) || null;
    setSelectedProducto(prod);
    setSelectedPresentacionId(undefined);
    setCantidadPresentacion(0);
    setUnidadesSueltas(0);
  }, [productoId, productos]);

  // Consultar disponibilidad en origen para traslados
  useEffect(() => {
    if (productoId && origenId) {
      stockApi.consultar(origenId, productoId).then((data) => {
        if (data.length > 0) {
          setDisponibleOrigen(data[0].cantidad_disponible);
        } else {
          setDisponibleOrigen(0);
        }
      }).catch(() => setDisponibleOrigen(0));
    } else {
      setDisponibleOrigen(undefined);
    }
  }, [productoId, origenId]);

  const factor = selectedProducto?.presentacion?.find((p) => p.id === selectedPresentacionId)?.factor || 1;
  const totalBase = (cantidadPresentacion * Number(factor)) + unidadesSueltas;

  const handleAbrirConfirmacion = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (!productoId) {
      setFeedback({ tipo: 'error', texto: 'Seleccione un producto.' });
      return;
    }

    if (tipoOperacion === 'traslado') {
      if (origenId === destinoId) {
        setFeedback({ tipo: 'error', texto: 'El almacén de origen y destino no pueden ser el mismo.' });
        return;
      }
      if (!destinoId) {
        setFeedback({ tipo: 'error', texto: 'Seleccione un almacén de destino.' });
        return;
      }
      if (totalBase <= 0) {
        setFeedback({ tipo: 'error', texto: 'La cantidad a trasladar debe ser mayor a cero.' });
        return;
      }
      if (!motivo || motivo.trim().length < 3) {
        setFeedback({ tipo: 'error', texto: 'El motivo del traslado es obligatorio (mínimo 3 caracteres).' });
        return;
      }
      if (disponibleOrigen !== undefined && totalBase > disponibleOrigen) {
        setFeedback({ tipo: 'error', texto: `Stock insuficiente en origen. Disponible: ${disponibleOrigen}.` });
        return;
      }
    } else if (tipoOperacion === 'ingreso') {
      if (totalBase <= 0) {
        setFeedback({ tipo: 'error', texto: 'La cantidad a ingresar debe ser mayor a cero.' });
        return;
      }
    } else if (tipoOperacion === 'ajuste') {
      if (diferenciaBase === 0) {
        setFeedback({ tipo: 'error', texto: 'La diferencia de ajuste no puede ser 0.' });
        return;
      }
      if (!motivo || motivo.trim().length < 3) {
        setFeedback({ tipo: 'error', texto: 'El motivo del ajuste físico es estrictamente obligatorio.' });
        return;
      }
    }

    setIsModalOpen(true);
  };

  const handleEjecutarOperacion = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    try {
      if (tipoOperacion === 'ingreso') {
        const res = await inventarioApi.ingreso({
          producto_id: productoId,
          ubicacion_id: origenId || almacenActivo?.id,
          cantidad_base: totalBase,
          costo_unitario: costoUnitario ? parseFloat(costoUnitario) : undefined,
          documento_tipo: documentoTipo,
          motivo: motivo || undefined,
        });
        setFeedback({
          tipo: 'ok',
          texto: `Ingreso registrado. Nuevo saldo físico: ${res.saldo?.cantidad_fisica} unidades base.`,
        });
      } else if (tipoOperacion === 'traslado') {
        const res = await inventarioApi.traslado({
          producto_id: productoId,
          origen_id: origenId,
          destino_id: destinoId,
          cantidad_base: totalBase,
          motivo: motivo.trim(),
        });
        setFeedback({
          tipo: 'ok',
          texto: `Traslado ejecutado con delta cero. Origen: ${res.origen?.cantidad_fisica} | Destino: ${res.destino?.cantidad_fisica}.`,
        });
      } else if (tipoOperacion === 'ajuste') {
        const res = await inventarioApi.ajuste({
          producto_id: productoId,
          ubicacion_id: origenId || almacenActivo?.id,
          diferencia_base: diferenciaBase,
          motivo: motivo.trim(),
        });
        setFeedback({
          tipo: 'ok',
          texto: `Ajuste registrado. Saldo corregido a: ${res.saldo?.cantidad_fisica} unidades base.`,
        });
      }

      // Limpiar formulario
      setCantidadPresentacion(0);
      setUnidadesSueltas(0);
      setDiferenciaBase(0);
      setMotivo('');
      setCostoUnitario('');
      setIsModalOpen(false);
    } catch (err: any) {
      console.error('Error al ejecutar operación:', err);
      setFeedback({
        tipo: 'error',
        texto: err.response?.data?.message || 'Error al procesar la operación.',
      });
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Cabecera */}
      <div>
        <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-emerald-600" />
          Movimientos de Inventario Físico
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Operaciones atómicas con bloqueo pesimista y actualización inmediata del Kárdex
        </p>
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

      {/* Selector de Tipo de Movimiento */}
      <div className="grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => {
            setTipoOperacion('ingreso');
            setFeedback(null);
          }}
          className={`p-4 rounded-xl border text-left flex flex-col gap-1 transition-all ${
            tipoOperacion === 'ingreso'
              ? 'border-emerald-500 bg-emerald-50/50 shadow-sm text-emerald-950 ring-1 ring-emerald-500'
              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            <PlusCircle className="w-4 h-4 text-emerald-600" />
            Ingreso (Compra)
          </div>
          <span className="text-[11px] text-slate-500">
            Aumenta existencias físicas con o sin factura
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTipoOperacion('traslado');
            setFeedback(null);
          }}
          className={`p-4 rounded-xl border text-left flex flex-col gap-1 transition-all ${
            tipoOperacion === 'traslado'
              ? 'border-indigo-500 bg-indigo-50/50 shadow-sm text-indigo-950 ring-1 ring-indigo-500'
              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            <Truck className="w-4 h-4 text-indigo-600" />
            Traslado Físico
          </div>
          <span className="text-[11px] text-slate-500">
            Mueve stock entre almacenes con delta global cero
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setTipoOperacion('ajuste');
            setFeedback(null);
          }}
          className={`p-4 rounded-xl border text-left flex flex-col gap-1 transition-all ${
            tipoOperacion === 'ajuste'
              ? 'border-amber-500 bg-amber-50/50 shadow-sm text-amber-950 ring-1 ring-amber-500'
              : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
          }`}
        >
          <div className="flex items-center gap-2 font-bold text-sm">
            <Sliders className="w-4 h-4 text-amber-600" />
            Ajuste de Inventario
          </div>
          <span className="text-[11px] text-slate-500">
            Corrección por conteo físico con motivo obligatorio
          </span>
        </button>
      </div>

      {/* Formulario Principal */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <form onSubmit={handleAbrirConfirmacion} className="space-y-5">
          {/* Selección de Producto */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
              Producto a Movilizar *
            </label>
            <select
              required
              value={productoId}
              onChange={(e) => setProductoId(e.target.value)}
              className="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">Seleccione producto...</option>
              {productos.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.codigo_interno}] {p.nombre} ({p.unidad_base})
                </option>
              ))}
            </select>
          </div>

          {/* Selección de Almacén Origen y Destino */}
          {tipoOperacion === 'traslado' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Almacén de Origen (Descuenta) *
                </label>
                <select
                  required
                  value={origenId}
                  onChange={(e) => setOrigenId(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Seleccione origen...</option>
                  {almacenes.map((a) => (
                    <option key={a.id} value={a.id}>
                      [{a.codigo}] {a.nombre}
                    </option>
                  ))}
                </select>
                {disponibleOrigen !== undefined && (
                  <span className="text-[11px] text-slate-500 mt-1 block">
                    Stock disponible en este almacén:{' '}
                    <strong className="text-slate-800 font-mono">
                      {disponibleOrigen} {selectedProducto?.unidad_base || 'unidades'}
                    </strong>
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Almacén de Destino (Incrementa) *
                </label>
                <select
                  required
                  value={destinoId}
                  onChange={(e) => setDestinoId(e.target.value)}
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="">Seleccione destino...</option>
                  {almacenes
                    .filter((a) => a.id !== origenId)
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        [{a.codigo}] {a.nombre}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Almacén donde se Ejecuta la Operación *
              </label>
              <select
                required
                value={origenId}
                onChange={(e) => setOrigenId(e.target.value)}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-lg bg-white"
              >
                {almacenes.map((a) => (
                  <option key={a.id} value={a.id}>
                    [{a.codigo}] {a.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Captura de Cantidades (Cajas + Sueltas) */}
          {tipoOperacion !== 'ajuste' && (
            <QuantityInput
              presentaciones={selectedProducto?.presentacion || []}
              selectedPresentacionId={selectedPresentacionId}
              onSelectPresentacion={setSelectedPresentacionId}
              cantidadPresentacion={cantidadPresentacion}
              onChangeCantidadPresentacion={setCantidadPresentacion}
              unidadesSueltas={unidadesSueltas}
              onChangeUnidadesSueltas={setUnidadesSueltas}
              unidadBase={selectedProducto?.unidad_base || 'unidad'}
              stockDisponible={tipoOperacion === 'traslado' ? disponibleOrigen : undefined}
            />
          )}

          {/* Formulario específico para Ajustes */}
          {tipoOperacion === 'ajuste' && (
            <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <Sliders className="w-4 h-4 text-amber-700" />
                Diferencia Compensatoria a Registrar
              </div>
              <p className="text-[11px] text-amber-800 leading-tight">
                Ingrese valor positivo si el conteo físico supera el saldo del sistema (+X).
                Ingrese valor negativo si hay un faltante (-X).
              </p>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Diferencia en {selectedProducto?.unidad_base || 'unidades base'} (+ / -) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="ej. -5 o +10"
                  value={diferenciaBase || ''}
                  onChange={(e) => setDiferenciaBase(parseFloat(e.target.value) || 0)}
                  className="w-full p-2 text-sm font-mono font-bold border border-slate-300 rounded-lg text-slate-900 bg-white"
                />
              </div>
            </div>
          )}

          {/* Metadatos Adicionales */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tipoOperacion === 'ingreso' && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Costo Unitario (S/ por {selectedProducto?.unidad_base || 'unidad'})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Opcional"
                    value={costoUnitario}
                    onChange={(e) => setCostoUnitario(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Documento de Referencia
                  </label>
                  <select
                    value={documentoTipo}
                    onChange={(e) => setDocumentoTipo(e.target.value)}
                    className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="FACTURA_COMPRA">Factura de Compra</option>
                    <option value="GUIA_REMISION">Guía de Remisión Proveedor</option>
                    <option value="INGRESO_MANUAL">Ingreso Manual / Conteo</option>
                  </select>
                </div>
              </>
            )}

            <div className={tipoOperacion === 'ingreso' ? 'col-span-2' : 'col-span-2'}>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo / Justificación {tipoOperacion !== 'ingreso' ? '*' : '(Opcional)'}
              </label>
              <input
                type="text"
                required={tipoOperacion !== 'ingreso'}
                placeholder={
                  tipoOperacion === 'traslado'
                    ? 'ej. Reabastecimiento por falta de espacio en almacén principal'
                    : tipoOperacion === 'ajuste'
                    ? 'ej. Ajuste físico por rotura de saco o merma por humedad'
                    : 'ej. Recepción de compra a Molinos & Cía'
                }
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                className="w-full p-2 text-xs border border-slate-300 rounded-lg"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs shadow-md shadow-emerald-900/20 transition-all flex items-center gap-2"
            >
              <span>Continuar y Confirmar Operación</span>
            </button>
          </div>
        </form>
      </div>

      {/* Modal de Confirmación Explícita */}
      <ConfirmModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirm={handleEjecutarOperacion}
        isLoading={isSubmitting}
        title={
          tipoOperacion === 'ingreso'
            ? 'Confirmar Ingreso de Mercadería'
            : tipoOperacion === 'traslado'
            ? 'Confirmar Traslado Físico entre Almacenes'
            : 'Confirmar Ajuste Físico de Inventario'
        }
        message={
          tipoOperacion === 'ingreso'
            ? `Se registrará el ingreso de ${totalBase} ${selectedProducto?.unidad_base}(s) de '${selectedProducto?.nombre}' en el almacén seleccionado.`
            : tipoOperacion === 'traslado'
            ? `Se trasladarán ${totalBase} ${selectedProducto?.unidad_base}(s) de '${selectedProducto?.nombre}' desde el almacén origen al almacén destino. El stock consolidado no sufrirá cambio alguno (Delta Cero).`
            : `Se aplicará una corrección de ${diferenciaBase} ${selectedProducto?.unidad_base}(s) al stock físico de '${selectedProducto?.nombre}'. Motivo: "${motivo}".`
        }
        confirmText="Sí, Ejecutar y Guardar"
      />
    </div>
  );
};
