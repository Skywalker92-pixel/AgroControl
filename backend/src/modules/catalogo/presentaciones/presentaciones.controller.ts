import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PresentacionesService } from './presentaciones.service';
import { CrearPresentacionDto } from './dto/crear-presentacion.dto';
import { CalcularConversionDto } from './dto/calcular-conversion.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '../../auth/roles/roles.enum';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PresentacionesController {
  constructor(private readonly presentacionesService: PresentacionesService) {}

  @Post('productos/:productoId/presentaciones')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  crear(
    @Param('productoId') productoId: string,
    @Body() dto: CrearPresentacionDto,
  ) {
    return this.presentacionesService.crear(productoId, dto);
  }

  @Get('productos/:productoId/presentaciones')
  listarPorProducto(@Param('productoId') productoId: string) {
    return this.presentacionesService.listarPorProducto(productoId);
  }

  /**
   * Helper del servidor para calcular con total precisión la equivalencia
   * en unidad base a partir de empaques comerciales y unidades sueltas.
   * POST /api/presentaciones/calcular-conversion
   */
  @Post('presentaciones/calcular-conversion')
  calcularConversion(@Body() dto: CalcularConversionDto) {
    return this.presentacionesService.calcularConversion(dto);
  }
}
