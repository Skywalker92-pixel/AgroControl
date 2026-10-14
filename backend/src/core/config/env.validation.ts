/**
 * Validación fail-fast de variables de entorno (OBS-SEC-01 / hardening repositorio público).
 *
 * En NODE_ENV=production se rechazan valores de ejemplo o publicados en el
 * repositorio para los secretos sensibles, y se exige una allowlist CORS
 * explícita sin comodines.
 */

/** Fragmentos que delatan un valor de ejemplo, por defecto o ya publicado. */
const PLACEHOLDER_FRAGMENTS = [
  'change_me',
  'changeme',
  'example',
  'demo',
  'default',
  'secret',
  'password',
  // Valores publicados en versiones anteriores de .env.example / CI.
  'agrocontrol_secret_pass',
  'super_seguro_jwt_secret',
  'agrocontrol2026backup',
];

/** Orígenes locales habilitados únicamente fuera de producción. */
export const LOCAL_DEV_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:4173',
  'http://localhost:8080',
  'http://localhost',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4173',
  'http://127.0.0.1:8080',
  'http://127.0.0.1',
];

export interface EnvValidationResult {
  isProduction: boolean;
  allowedOrigins: string[];
}

export function containsPlaceholder(value: string): boolean {
  const normalized = value.toLowerCase();
  return PLACEHOLDER_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function extractDatabasePassword(databaseUrl: string): string | null {
  try {
    const url = new URL(databaseUrl);
    return url.password ? decodeURIComponent(url.password) : null;
  } catch {
    return null;
  }
}

export function parseCorsOrigins(raw: string | undefined): string[] {
  return (raw || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

/**
 * Valida el entorno y devuelve la configuración derivada.
 * Lanza Error con prefijo "FATAL:" ante cualquier configuración insegura.
 */
export function validateEnvironment(
  env: NodeJS.ProcessEnv = process.env,
): EnvValidationResult {
  const isProduction = env.NODE_ENV === 'production';

  // ── JWT_SECRET ────────────────────────────────────────────────────────────
  const jwtSecret = env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 16) {
    throw new Error(
      'FATAL: JWT_SECRET no configurado o es demasiado corto (mínimo 16 caracteres)',
    );
  }
  if (isProduction) {
    if (jwtSecret.length < 32) {
      throw new Error(
        'FATAL: En producción JWT_SECRET debe tener al menos 32 caracteres aleatorios.',
      );
    }
    if (containsPlaceholder(jwtSecret)) {
      throw new Error(
        'FATAL: No se permite usar valores de JWT_SECRET de ejemplo o por defecto en producción.',
      );
    }
  }

  // ── DATABASE_URL ──────────────────────────────────────────────────────────
  const databaseUrl = env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('FATAL: DATABASE_URL no configurada en variables de entorno.');
  }
  if (isProduction) {
    const dbPassword = extractDatabasePassword(databaseUrl);
    if (!dbPassword || containsPlaceholder(dbPassword)) {
      throw new Error(
        'FATAL: DATABASE_URL no tiene contraseña o usa una contraseña de ejemplo en producción.',
      );
    }
  }

  // ── BACKUP_ENCRYPTION_KEY (opcional en la API; obligatoria en el servicio de backups) ──
  const backupKey = env.BACKUP_ENCRYPTION_KEY;
  if (isProduction && backupKey !== undefined && backupKey !== '') {
    if (backupKey.length < 32 || containsPlaceholder(backupKey)) {
      throw new Error(
        'FATAL: BACKUP_ENCRYPTION_KEY es de ejemplo o tiene menos de 32 caracteres en producción.',
      );
    }
  }

  // ── CORS_ORIGINS ──────────────────────────────────────────────────────────
  const envOrigins = parseCorsOrigins(env.CORS_ORIGINS);
  if (envOrigins.some((origin) => origin.includes('*'))) {
    throw new Error('FATAL: CORS_ORIGINS no admite comodines (*).');
  }
  for (const origin of envOrigins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`FATAL: CORS_ORIGINS contiene un origen inválido: '${origin}'.`);
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin) {
      throw new Error(
        `FATAL: CORS_ORIGINS debe contener orígenes exactos (esquema://host[:puerto]) sin ruta: '${origin}'.`,
      );
    }
  }
  if (isProduction && envOrigins.length === 0) {
    throw new Error(
      'FATAL: CORS_ORIGINS debe configurarse explícitamente y sin comodines (*) en producción.',
    );
  }

  const allowedOrigins = Array.from(
    new Set(isProduction ? envOrigins : [...LOCAL_DEV_ORIGINS, ...envOrigins]),
  );

  return { isProduction, allowedOrigins };
}
