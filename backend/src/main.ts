import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Prefijo global requerido por directrices de API
  app.setGlobalPrefix('api');

  // Habilitar CORS para consumo desde la SPA de la PC local y LAN
  app.enableCors({
    origin: true,
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
  await app.listen(port);

  logger.log(`==================================================================`);
  logger.log(` AgroControl Pro API escuchando en: http://localhost:${port}/api `);
  logger.log(` Base de datos conectada: PostgreSQL (agrocontrol_db)              `);
  logger.log(` Entorno: ${process.env.NODE_ENV || 'development'}                `);
  logger.log(`==================================================================`);
}

bootstrap();
