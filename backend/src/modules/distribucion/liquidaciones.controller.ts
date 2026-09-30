import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { LiquidacionesService } from './liquidaciones.service';
import { CrearLiquidacionDto } from './dto/crear-liquidacion.dto';
import { ConsultarLiquidacionesDto } from './dto/consultar-liquidaciones.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/roles/roles.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClientIp } from '../auth/decorators/client-ip.decorator';

@Controller('distribucion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LiquidacionesController {
  constructor(private readonly liquidacionesService: LiquidacionesService) {}

  @Post('liquidaciones')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  liquidarCarga(
    @Body() dto: CrearLiquidacionDto,
    @CurrentUser('id') usuarioId: string,
    @CurrentUser('rol') usuarioRol: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.liquidacionesService.liquidarCarga(
      dto,
      usuarioId,
      usuarioRol,
      ipOrigen,
    );
  }

  @Get('liquidaciones')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
    RolUsuario.VENDEDOR,
  )
  consultarLiquidaciones(
    @Query() dto: ConsultarLiquidacionesDto,
    @CurrentUser('id') usuarioId: string,
    @CurrentUser('rol') usuarioRol: string,
  ) {
    return this.liquidacionesService.consultarLiquidaciones(
      dto,
      usuarioId,
      usuarioRol,
    );
  }

  @Get('liquidaciones/carga/:cargaId')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
    RolUsuario.VENDEDOR,
  )
  buscarPorCargaId(
    @Param('cargaId') cargaId: string,
    @CurrentUser('id') usuarioId: string,
    @CurrentUser('rol') usuarioRol: string,
  ) {
    return this.liquidacionesService.buscarPorCargaId(
      cargaId,
      usuarioId,
      usuarioRol,
    );
  }

  @Get('liquidaciones/:id/acta')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
    RolUsuario.VENDEDOR,
  )
  obtenerActa(
    @Param('id') id: string,
    @CurrentUser('id') usuarioId: string,
    @CurrentUser('rol') usuarioRol: string,
  ) {
    return this.liquidacionesService.obtenerActa(id, usuarioId, usuarioRol);
  }

  @Get('liquidaciones/:id')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
    RolUsuario.VENDEDOR,
  )
  buscarPorId(
    @Param('id') id: string,
    @CurrentUser('id') usuarioId: string,
    @CurrentUser('rol') usuarioRol: string,
  ) {
    return this.liquidacionesService.buscarPorId(id, usuarioId, usuarioRol);
  }
}
