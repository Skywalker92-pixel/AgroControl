import { Module } from '@nestjs/common';
import { SincronizacionService } from './sincronizacion.service';
import { SincronizacionController } from './sincronizacion.controller';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AppVersionGuard } from './guards/app-version.guard';
import { DispositivoActivoGuard } from './guards/dispositivo-activo.guard';

@Module({
  imports: [PrismaModule, AuditoriaModule],
  controllers: [SincronizacionController],
  providers: [SincronizacionService, AppVersionGuard, DispositivoActivoGuard],
  exports: [SincronizacionService],
})
export class SincronizacionModule {}
