import { Module } from '@nestjs/common';
import { DespachoService } from './despacho.service';
import { DespachoController } from './despacho.controller';
import { KardexModule } from '../kardex/kardex.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [KardexModule, AuditoriaModule],
  controllers: [DespachoController],
  providers: [DespachoService],
  exports: [DespachoService],
})
export class DespachoModule {}
