import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

/**
 * Hashes bcrypt de contraseñas de demostración que han sido publicadas en el
 * repositorio (seeds). Cualquier cuenta activa que los use en producción es
 * accesible para cualquiera que lea el código fuente.
 */
export const HASHES_DEMO_PUBLICADOS = [
  // Contraseña demo histórica (seeds anteriores a chore/public-hardening).
  '$2a$10$57l7YcVhHxV6.8K4MmcypeKsiXKXoBxo/AUwChJBeI52lfv/KFFDW',
  // database/seeds/001_seed_usuarios_demo.sql
  '$2a$10$bb5UYndPOimEVuyJ/2h2bOCtQUxwBT3WKQXw9sEHXpJT6oO70SwiC',
];

@Injectable()
export class CredencialesPublicasCheck implements OnApplicationBootstrap {
  private readonly logger = new Logger('SeguridadCredenciales');

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    if (process.env.NODE_ENV !== 'production') return;

    try {
      const expuestas = await this.prisma.usuario.count({
        where: { activo: true, password_hash: { in: HASHES_DEMO_PUBLICADOS } },
      });
      if (expuestas > 0) {
        this.logger.error(
          `${expuestas} cuenta(s) activa(s) usan una contraseña de demostración publicada en el repositorio. ` +
            'Cambie esas contraseñas o desactive las cuentas inmediatamente.',
        );
      }
    } catch {
      this.logger.warn('No se pudo verificar el uso de contraseñas de demostración.');
    }
  }
}
