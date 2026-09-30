import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Injectable()
export class AppVersionGuard implements CanActivate {
  private readonly minVersion = '1.0.0';

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const appVersionHeader =
      request.headers['x-app-version'] || request.headers['X-App-Version'];

    if (!appVersionHeader) {
      // Si no se envía cabecera, se asume compatible a menos que se configure obligatoriedad
      return true;
    }

    const versionCliente = String(appVersionHeader).trim();
    if (this.compararVersiones(versionCliente, this.minVersion) < 0) {
      throw new HttpException(
        {
          statusCode: 426,
          error: 'Upgrade Required',
          message: `Versión de aplicación móvil obsoleta (${versionCliente}). Se requiere la versión ${this.minVersion} o superior para sincronizar de manera segura.`,
          version_minima: this.minVersion,
          version_cliente: versionCliente,
        },
        426,
      );
    }

    return true;
  }

  /**
   * Compara dos cadenas semver 'major.minor.patch'.
   * Retorna:
   *   < 0 si v1 < v2
   *   0 si v1 == v2
   *   > 0 si v1 > v2
   */
  private compararVersiones(v1: string, v2: string): number {
    const p1 = v1.replace(/[^0-9.]/g, '').split('.').map(Number);
    const p2 = v2.replace(/[^0-9.]/g, '').split('.').map(Number);

    for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
      const num1 = p1[i] || 0;
      const num2 = p2[i] || 0;
      if (num1 < num2) return -1;
      if (num1 > num2) return 1;
    }
    return 0;
  }
}
