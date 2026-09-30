// ==============================================================================
// AGROCONTROL PRO - PATRÓN STRATEGY: MÉTODO DE VALORIZACIÓN DE KÁRDEX
// ==============================================================================
// Punto POR VALIDAR con el contador del cliente.
// Se define una interfaz intercambiable para desacoplar el cálculo contable
// (Promedio Ponderado, PEPS, etc.) del libro mayor inmutable.
// ==============================================================================

export interface MovimientoHistorico {
  cantidad_base: number;
  costo_unitario?: number | null;
  tipo: string;
}

export interface MetodoValorizacion {
  calcularCosto(
    movimientosPrevios: MovimientoHistorico[],
    nuevoMovimiento: MovimientoHistorico,
  ): number;
}
