import { Module } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { TrasladosService } from './traslados.service';
import { InventarioController, StockController } from './inventario.controller';
import { KardexModule } from '../kardex/kardex.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';

@Module({
  imports: [KardexModule, AuditoriaModule],
  controllers: [InventarioController, StockController],
  providers: [InventarioService, TrasladosService],
  exports: [InventarioService, TrasladosService],
})
export class InventarioModule {}
