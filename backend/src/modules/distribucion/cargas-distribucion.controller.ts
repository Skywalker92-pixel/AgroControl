import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CargasDistribucionService } from './cargas-distribucion.service';
import { CrearCargaDto } from './dto/crear-carga.dto';
import { ConsultarCargasDto } from './dto/consultar-cargas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/roles/roles.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClientIp } from '../auth/decorators/client-ip.decorator';

@Controller('distribucion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CargasDistribucionController {
  constructor(
    private readonly cargasService: CargasDistribucionService,
  ) {}

  @Post('cargas')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  crearCarga(
    @Body() dto: CrearCargaDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.cargasService.crearCarga(dto, usuarioId, ipOrigen);
  }

  @Patch('cargas/:id/despachar')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  despacharCarga(
    @Param('id') id: string,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.cargasService.despacharCarga(id, usuarioId, ipOrigen);
  }

  @Get('cargas')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
    RolUsuario.VENDEDOR,
  )
  consultarCargas(
    @Query() dto: ConsultarCargasDto,
    @CurrentUser('id') usuarioId: string,
    @CurrentUser('rol') userRol: string,
  ) {
    return this.cargasService.consultarCargas(dto, usuarioId, userRol);
  }

  @Get('cargas/:id')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
    RolUsuario.VENDEDOR,
  )
  buscarCargaPorId(
    @Param('id') id: string,
    @CurrentUser('id') usuarioId: string,
    @CurrentUser('rol') userRol: string,
  ) {
    return this.cargasService.buscarCargaPorId(id, usuarioId, userRol);
  }

  @Get('bodegas-moviles')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
    RolUsuario.VENDEDOR,
  )
  obtenerBodegasMoviles(
    @CurrentUser('id') usuarioId: string,
    @CurrentUser('rol') userRol: string,
  ) {
    return this.cargasService.obtenerBodegasMoviles(usuarioId, userRol);
  }
}
