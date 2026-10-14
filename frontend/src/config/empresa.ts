/**
 * Datos del negocio impresos en documentos (actas, órdenes de despacho).
 * Se configuran por despliegue con variables VITE_EMPRESA_*; el repositorio
 * público no contiene datos reales de ningún cliente.
 */
export const EMPRESA = {
  nombre: import.meta.env.VITE_EMPRESA_NOMBRE || 'AGROCONTROL PRO',
  ruc: import.meta.env.VITE_EMPRESA_RUC || '',
  direccion: import.meta.env.VITE_EMPRESA_DIRECCION || '',
};

/** Línea "RUC: … | Dirección" omitiendo los datos no configurados. */
export const lineaIdentificacionEmpresa = (): string =>
  [EMPRESA.ruc && `RUC: ${EMPRESA.ruc}`, EMPRESA.direccion].filter(Boolean).join(' | ');
