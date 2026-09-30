import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { KardexService } from './kardex.service';
import { ConsultarKardexDto } from './dto/consultar-kardex.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('kardex')
@UseGuards(JwtAuthGuard, RolesGuard)
export class KardexController {
  constructor(private readonly kardexService: KardexService) {}

  /**
   * Consulta paginada y filtrada del Kárdex (Libro de solo lectura).
   * GET /api/kardex
   */
  @Get()
  consultar(@Query() dto: ConsultarKardexDto) {
    return this.kardexService.consultar(dto);
  }

  /**
   * Consulta la conciliación matemática entre Kárdex y stock_saldo para un producto y ubicación.
   * GET /api/kardex/conciliacion?productoId=...&ubicacionId=...
   */
  @Get('conciliacion')
  conciliar(
    @Query('producto_id') producto_id?: string,
    @Query('productoId') productoId?: string,
    @Query('ubicacion_id') ubicacion_id?: string,
    @Query('ubicacionId') ubicacionId?: string,
  ) {
    const prod = producto_id || productoId;
    const ubic = ubicacion_id || ubicacionId;
    return this.kardexService.conciliar(prod, ubic);
  }
}
