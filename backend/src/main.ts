import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger, ForbiddenException } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { validateEnvironment } from './core/config/env.validation';

/**
 * Valor por defecto de `trust proxy`: confía solo en proxies de red privada
 * (Nginx en Docker, LAN). Así request.ip refleja al cliente real detrás del
 * proxy, pero un cliente público directo no puede falsear X-Forwarded-For.
 * En PaaS (p. ej. Render) configure TRUST_PROXY=1.
 */
const DEFAULT_TRUST_PROXY = 'loopback, linklocal, uniquelocal';

function parseTrustProxy(raw: string | undefined): boolean | number | string {
  if (!raw) return DEFAULT_TRUST_PROXY;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (/^\d+$/.test(raw)) return Number(raw);
  return raw;
}

async function bootstrap() {
  // Fail-fast: rechaza secretos de ejemplo y CORS inseguro en producción.
  const { isProduction, allowedOrigins } = validateEnvironment(process.env);

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', parseTrustProxy(process.env.TRUST_PROXY));

  // Cabeceras de seguridad HTTP (OBS-WEB-02).
  // La API solo devuelve JSON/CSV: no necesita cargar recursos ni ser embebida.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: {
          defaultSrc: ["'none'"],
          frameAncestors: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'none'"],
        },
      },
      hsts: isProduction ? undefined : false,
    }),
  );

  // Prefijo global requerido por directrices de API
  app.setGlobalPrefix('api');

  // CORS con allowlist estricta (OBS-SEC-05). En producción solo CORS_ORIGINS.
  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin cabecera Origin (apps móviles nativas, CLI, curl, SSR)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // 403 explícito (antes: Error genérico -> 500 con stack trace en el log).
        callback(
          new ForbiddenException(`Acceso bloqueado por política CORS: origen '${origin}' no autorizado.`),
        );
      }
    },
    credentials: true,
  });

  // Tubería de validación global con saneamiento de DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');

  logger.log(`AgroControl Pro API escuchando en el puerto ${port} (prefijo /api)`);
  logger.log(`Entorno: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`Orígenes CORS permitidos: ${allowedOrigins.length}`);
}

bootstrap();
