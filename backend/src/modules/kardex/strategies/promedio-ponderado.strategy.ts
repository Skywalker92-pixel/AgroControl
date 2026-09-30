import { Injectable } from '@nestjs/common';
import { MetodoValorizacion, MovimientoHistorico } from './metodo-valorizacion.interface';

@Injectable()
export class PromedioPonderadoStrategy implements MetodoValorizacion {
  /**
   * Calcula el costo unitario promedio ponderado a partir de la secuencia histórica de movimientos.
   */
  calcularCosto(
    movimientosPrevios: MovimientoHistorico[],
    nuevoMovimiento: MovimientoHistorico,
  ): number {
    let stockAcumulado = 0;
    let costoTotalAcumulado = 0;

    for (const m of movimientosPrevios) {
      const cant = Number(m.cantidad_base);
      const costo = Number(m.costo_unitario || 0);

      if (cant > 0) {
        // Ingreso de mercadería
        costoTotalAcumulado += cant * costo;
        stockAcumulado += cant;
      } else {
        // Salida de mercadería: reduce proporcionalmente al costo promedio vigente
        const costoPromedioVigente = stockAcumulado > 0 ? costoTotalAcumulado / stockAcumulado : 0;
        const cantSalida = Math.abs(cant);
        costoTotalAcumulado -= cantSalida * costoPromedioVigente;
        stockAcumulado -= cantSalida;

        if (stockAcumulado <= 0) {
          stockAcumulado = 0;
          costoTotalAcumulado = 0;
        }
      }
    }

    const costoPromedioVigente = stockAcumulado > 0 ? costoTotalAcumulado / stockAcumulado : 0;
    const nuevaCantidad = Number(nuevoMovimiento.cantidad_base);
    const nuevoCosto = Number(
      nuevoMovimiento.costo_unitario !== undefined && nuevoMovimiento.costo_unitario !== null
        ? nuevoMovimiento.costo_unitario
        : costoPromedioVigente,
    );

    if (nuevaCantidad > 0) {
      // Para entradas: calcula nuevo promedio ponderado
      const nuevoStockTotal = stockAcumulado + nuevaCantidad;
      const nuevoCostoTotal = costoTotalAcumulado + nuevaCantidad * nuevoCosto;
      return nuevoStockTotal > 0 ? Number((nuevoCostoTotal / nuevoStockTotal).toFixed(4)) : nuevoCosto;
    } else {
      // Para salidas: se valúa al costo promedio ponderado vigente
      return Number(costoPromedioVigente.toFixed(4));
    }
  }
}
