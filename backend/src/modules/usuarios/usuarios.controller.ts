import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/roles/roles.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClientIp } from '../auth/decorators/client-ip.decorator';
import {
  CrearUsuarioDto,
  ActualizarUsuarioDto,
  CambiarRolDto,
  CambiarEstadoUsuarioDto,
  ResetPasswordDto,
} from './dto/usuarios.dto';

@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  @Get()
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
  )
  listar() {
    return this.usuariosService.listar();
  }

  @Get('trabajadores-activos')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  listarTrabajadoresActivos() {
    return this.usuariosService.listarTrabajadoresActivos();
  }

  @Post()
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
  )
  crear(
    @Body() dto: CrearUsuarioDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.usuariosService.crear(dto, usuarioId, ipOrigen);
  }

  @Patch(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
  )
  actualizar(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ActualizarUsuarioDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.usuariosService.actualizar(id, dto, usuarioId, ipOrigen);
  }

  @Patch(':id/rol')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
  )
  cambiarRol(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarRolDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.usuariosService.cambiarRol(id, dto, usuarioId, ipOrigen);
  }

  @Patch(':id/estado')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
  )
  cambiarEstado(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CambiarEstadoUsuarioDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.usuariosService.cambiarEstado(id, dto, usuarioId, ipOrigen);
  }

  @Post(':id/reset-password')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
  )
  resetPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.usuariosService.resetPassword(id, dto, usuarioId, ipOrigen);
  }
}
