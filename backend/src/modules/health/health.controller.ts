import { Controller, Get, UseGuards } from '@nestjs/common';
import { HealthService } from './health.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/roles/roles.enum';

/**
 * Health Check Controller
 * OBS-OPS-01:
 * - GET /api/health: Endpoint público ligero ({ status: 'ok', timestamp: ... })
 * - GET /api/health/details: Endpoint protegido para administradores con diagnóstico operacional completo
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  /**
   * Endpoint público ligero para comprobaciones de liveness/readiness de infraestructura.
   */
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Diagnóstico operacional completo del sistema.
   * Restringido a administradores para evitar exposición innecesaria de infraestructura.
   */
  @Get('details')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
  )
  getDetails() {
    return this.healthService.getSystemHealth();
  }
}
