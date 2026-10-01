import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/roles/roles.enum';

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
}
