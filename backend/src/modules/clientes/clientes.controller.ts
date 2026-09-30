import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ClientesService } from './clientes.service';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/roles/roles.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClientIp } from '../auth/decorators/client-ip.decorator';

@Controller('clientes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ClientesController {
  constructor(private readonly clientesService: ClientesService) {}

  @Post()
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.VENDEDOR,
  )
  crear(
    @Body() dto: CrearClienteDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.clientesService.crear(dto, usuarioId, ipOrigen);
  }

  @Get()
  listar(
    @Query('busqueda') busqueda?: string,
    @Query('soloActivos') soloActivos?: string,
  ) {
    return this.clientesService.listar(busqueda, soloActivos === 'true');
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.clientesService.buscarPorId(id);
  }

  @Put(':id')
  @Roles(RolUsuario.ADMINISTRADOR_PROPIETARIO, RolUsuario.ADMINISTRADOR_SECUNDARIO)
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarClienteDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.clientesService.actualizar(id, dto, usuarioId, ipOrigen);
  }
}
