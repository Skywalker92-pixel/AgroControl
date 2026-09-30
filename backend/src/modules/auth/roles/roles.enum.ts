// ==============================================================================
// AGROCONTROL PRO - ROLES DE USUARIO AUTORIZADOS (FASE 1: NÚCLEO)
// ==============================================================================
// Regla: Solo implementar los 4 roles confirmados del levantamiento.
// Cajero y Superadministrador quedan excluidos hasta ser validados.
// ==============================================================================

export enum RolUsuario {
  ADMINISTRADOR_PROPIETARIO = 'ADMINISTRADOR_PROPIETARIO',
  ADMINISTRADOR_SECUNDARIO = 'ADMINISTRADOR_SECUNDARIO',
  OPERADOR_ALMACEN = 'OPERADOR_ALMACEN',
  VENDEDOR = 'VENDEDOR',
}
