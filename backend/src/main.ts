import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const isProduction = process.env.NODE_ENV === 'production';

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.length < 16) {
    throw new Error('FATAL: JWT_SECRET no configurado o es demasiado corto (mínimo 16 caracteres)');
  }
  if (isProduction && (jwtSecret.includes('agrocontrol_secret_pass') || jwtSecret.includes('super_seguro_jwt_secret'))) {
    throw new Error('FATAL: No se permite usar valores de JWT_SECRET por defecto de prueba en entorno de producción.');
  }

  if (!process.env.DATABASE_URL) {
    throw new Error('FATAL: DATABASE_URL no configurada en variables de entorno.');
  }

  if (isProduction && (!process.env.CORS_ORIGINS || process.env.CORS_ORIGINS.includes('*'))) {
    throw new Error('FATAL: CORS_ORIGINS debe configurarse explícitamente y sin comodines (*) en producción.');
  }

  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Cabeceras de seguridad HTTP (OBS-WEB-02)
  app.use(helmet({ contentSecurityPolicy: false }));

  // Prefijo global requerido por directrices de API
  app.setGlobalPrefix('api');

  // Configuración de CORS con Allowlist seguro (OBS-SEC-05)
  const localOrigins = [
    'http://localhost:5173',
    'http://localhost:80',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:80',
    'http://127.0.0.1:3000',
  ];

  const envOrigins = (process.env.CORS_ORIGINS || 'https://agro-control-eight.vercel.app')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const allowedOrigins = Array.from(
    new Set(isProduction ? envOrigins : [...localOrigins, ...envOrigins]),
  );

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin cabecera Origin (apps móviles nativas, CLI, curl, SSR)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Acceso bloqueado por política CORS: origen '${origin}' no autorizado.`));
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

  logger.log(`==================================================================`);
  logger.log(` AgroControl Pro API escuchando en: http://localhost:${port}/api `);
  logger.log(` Base de datos conectada: PostgreSQL (agrocontrol_db)              `);
  logger.log(` Entorno: ${process.env.NODE_ENV || 'development'}                `);
  logger.log(`==================================================================`);
}

bootstrap();
