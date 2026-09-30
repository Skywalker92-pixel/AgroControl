import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

/**
 * GET /api/health
 * Endpoint de monitoreo del sistema AgroControl Pro.
 * Accesible sin autenticación para diagnóstico rápido de infraestructura.
 * SKILL(4) §9 – Monitoreo básico proporcional a pequeña empresa.
 */
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  async check() {
    return this.healthService.getSystemHealth();
  }
}
