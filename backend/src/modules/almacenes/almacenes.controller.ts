import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AlmacenesService } from './almacenes.service';
import { CrearUbicacionDto } from './dto/crear-ubicacion.dto';
import { ActualizarUbicacionDto } from './dto/actualizar-ubicacion.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/roles/roles.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClientIp } from '../auth/decorators/client-ip.decorator';

@Controller('almacenes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AlmacenesController {
  constructor(private readonly almacenesService: AlmacenesService) {}

  @Post()
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  crear(
    @Body() dto: CrearUbicacionDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.almacenesService.crear(dto, usuarioId, ipOrigen);
  }

  @Get()
  listar(
    @Query('tipo') tipo?: string,
    @Query('padreId') padreId?: string,
    @Query('soloActivos') soloActivos?: string,
  ) {
    return this.almacenesService.listar(tipo, padreId, soloActivos === 'true');
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.almacenesService.buscarPorId(id);
  }

  @Put(':id')
  @Roles(RolUsuario.ADMINISTRADOR_PROPIETARIO, RolUsuario.ADMINISTRADOR_SECUNDARIO)
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarUbicacionDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.almacenesService.actualizar(id, dto, usuarioId, ipOrigen);
  }
}
