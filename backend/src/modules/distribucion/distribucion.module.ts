import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { KardexModule } from '../kardex/kardex.module';
import { VehiculosService } from './vehiculos.service';
import { VehiculosController } from './vehiculos.controller';
import { CargasDistribucionService } from './cargas-distribucion.service';
import { CargasDistribucionController } from './cargas-distribucion.controller';
import { LiquidacionesService } from './liquidaciones.service';
import { LiquidacionesController } from './liquidaciones.controller';

@Module({
  imports: [PrismaModule, AuditoriaModule, KardexModule],
  controllers: [
    VehiculosController,
    CargasDistribucionController,
    LiquidacionesController,
  ],
  providers: [
    VehiculosService,
    CargasDistribucionService,
    LiquidacionesService,
  ],
  exports: [
    VehiculosService,
    CargasDistribucionService,
    LiquidacionesService,
  ],
})
export class DistribucionModule {}
