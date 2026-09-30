import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { PreciosService } from './precios.service';
import { AsignarPrecioDto } from './dto/asignar-precio.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '../../auth/roles/roles.enum';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ClientIp } from '../../auth/decorators/client-ip.decorator';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class PreciosController {
  constructor(private readonly preciosService: PreciosService) {}

  @Get('listas-precio')
  listarListasPrecio() {
    return this.preciosService.listarListasPrecio();
  }

  @Post('precios')
  @Roles(RolUsuario.ADMINISTRADOR_PROPIETARIO, RolUsuario.ADMINISTRADOR_SECUNDARIO)
  asignarPrecio(
    @Body() dto: AsignarPrecioDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.preciosService.asignarPrecio(dto, usuarioId, ipOrigen);
  }

  @Get('precios/producto/:productoId')
  obtenerPreciosPorProducto(@Param('productoId') productoId: string) {
    return this.preciosService.obtenerPreciosPorProducto(productoId);
  }

  /**
   * Resuelve el precio oficial para un cliente de acuerdo a su lista asignada,
   * sin importar el volumen o la cantidad comprada.
   * GET /api/precios/cliente/:clienteId/producto/:productoId
   */
  @Get('precios/cliente/:clienteId/producto/:productoId')
  obtenerPrecioParaCliente(
    @Param('productoId') productoId: string,
    @Param('clienteId') clienteId: string,
  ) {
    return this.preciosService.obtenerPrecioParaCliente(productoId, clienteId);
  }
}
