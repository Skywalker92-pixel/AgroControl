/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API (vacío = proxy /api del mismo origen). */
  readonly VITE_API_URL?: string;
  /** Solo desarrollo: muestra accesos rápidos a cuentas ficticias de demostración. */
  readonly VITE_ENABLE_DEMO_ACCOUNTS?: string;
  /** Solo desarrollo: contraseña de las cuentas ficticias (no se versiona). */
  readonly VITE_DEMO_PASSWORD?: string;
  /** Datos del negocio impresos en actas y órdenes de despacho. */
  readonly VITE_EMPRESA_NOMBRE?: string;
  readonly VITE_EMPRESA_RUC?: string;
  readonly VITE_EMPRESA_DIRECCION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
