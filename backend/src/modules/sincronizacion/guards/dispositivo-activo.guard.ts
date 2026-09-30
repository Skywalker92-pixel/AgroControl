import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class DispositivoActivoGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const deviceId =
      request.headers['x-device-id'] ||
      request.headers['X-Device-Id'] ||
      request.body?.dispositivo_id ||
      request.query?.dispositivo_id;

    if (!deviceId) {
      // Si no se envía identificador de dispositivo, continúa a validación de usuario
      return true;
    }

    const dispositivo = await this.prisma.dispositivo_movil.findUnique({
      where: { id: String(deviceId) },
    });

    if (!dispositivo) {
      throw new NotFoundException(
        `Dispositivo móvil con ID '${deviceId}' no se encuentra registrado en el sistema.`,
      );
    }

    if (!dispositivo.activo || !dispositivo.autorizado) {
      throw new ForbiddenException(
        `Acceso denegado: El dispositivo móvil '${dispositivo.codigo_dispositivo}' se encuentra inactivo o no autorizado.`,
      );
    }

    // Adjuntar dispositivo al objeto de solicitud para uso en controlador/servicio
    request.dispositivoMovil = dispositivo;
    return true;
  }
}
