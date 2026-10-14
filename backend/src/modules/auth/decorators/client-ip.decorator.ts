import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * IP de origen del cliente para auditoría.
 * Usa request.ip, que Express deriva de X-Forwarded-For solo cuando la petición
 * llega a través de un proxy de confianza (configuración `trust proxy` en main.ts).
 * Leer X-Forwarded-For directamente permitiría a cualquier cliente falsear su IP.
 */
export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.ip || request.socket?.remoteAddress || '127.0.0.1';
  },
);
