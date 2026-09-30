import { Module } from '@nestjs/common';
import { KardexService } from './kardex.service';
import { KardexController } from './kardex.controller';
import { PromedioPonderadoStrategy } from './strategies/promedio-ponderado.strategy';

@Module({
  controllers: [KardexController],
  providers: [KardexService, PromedioPonderadoStrategy],
  exports: [KardexService, PromedioPonderadoStrategy],
})
export class KardexModule {}
