import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';

@Injectable()
export class DispositivoActivoGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rawDeviceId =
      request.headers['x-device-id'] ||
      request.headers['X-Device-Id'];

    const deviceId = Array.isArray(rawDeviceId) ? rawDeviceId[0] : rawDeviceId;

    if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
      throw new BadRequestException('Cabecera X-Device-Id requerida');
    }

    const dispositivo = await this.prisma.dispositivo_movil.findUnique({
      where: { id: deviceId.trim() },
    });

    const user = request.user;
    const userId = user?.id || user?.sub;

    if (
      !dispositivo ||
      !dispositivo.activo ||
      !dispositivo.autorizado ||
      dispositivo.trabajador_id !== userId
    ) {
      throw new ForbiddenException(
        'Acceso denegado: El dispositivo móvil no se encuentra registrado, está inactivo, no está autorizado o no pertenece a este trabajador.',
      );
    }

    // Adjuntar dispositivo al objeto de solicitud para uso en controlador/servicio
    request.dispositivoMovil = dispositivo;
    return true;
  }
}
