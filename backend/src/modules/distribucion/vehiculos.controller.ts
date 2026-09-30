import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { VehiculosService } from './vehiculos.service';
import { CrearVehiculoDto } from './dto/crear-vehiculo.dto';
import { ActualizarVehiculoDto } from './dto/actualizar-vehiculo.dto';
import { ConsultarVehiculosDto } from './dto/consultar-vehiculos.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/roles/roles.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClientIp } from '../auth/decorators/client-ip.decorator';

@Controller('distribucion/vehiculos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VehiculosController {
  constructor(private readonly vehiculosService: VehiculosService) {}

  @Post()
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  crear(
    @Body() dto: CrearVehiculoDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.vehiculosService.crear(dto, usuarioId, ipOrigen);
  }

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
    RolUsuario.VENDEDOR,
  )
  listar(@Query() dto: ConsultarVehiculosDto) {
    return this.vehiculosService.listar(dto);
  }

  @Get(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
    RolUsuario.VENDEDOR,
  )
  buscarPorId(@Param('id') id: string) {
    return this.vehiculosService.buscarPorId(id);
  }

  @Patch(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarVehiculoDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.vehiculosService.actualizar(id, dto, usuarioId, ipOrigen);
  }

  @Delete(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  eliminar(
    @Param('id') id: string,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.vehiculosService.eliminar(id, usuarioId, ipOrigen);
  }
}
