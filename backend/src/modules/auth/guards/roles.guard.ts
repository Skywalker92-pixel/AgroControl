import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolUsuario } from '../roles/roles.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RolUsuario[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.rol) {
      throw new ForbiddenException('Acceso denegado: Usuario no autenticado o sin rol asignado.');
    }

    const hasRole = requiredRoles.includes(user.rol as RolUsuario);

    if (!hasRole) {
      throw new ForbiddenException(
        `Acceso denegado: El rol '${user.rol}' no tiene permisos suficientes para realizar esta acción.`
      );
    }

    return true;
  }
}
