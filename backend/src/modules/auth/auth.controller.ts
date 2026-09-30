import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';
import { RolUsuario } from './roles/roles.enum';
import { CurrentUser } from './decorators/current-user.decorator';
import { ClientIp } from './decorators/client-ip.decorator';
import { AuditoriaService } from '../auditoria/auditoria.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Endpoint público de inicio de sesión.
   * POST /api/auth/login
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() loginDto: LoginDto,
    @ClientIp() ipOrigen: string,
  ) {
    return this.authService.login(loginDto, ipOrigen);
  }

  /**
   * Obtiene los datos del usuario autenticado.
   * GET /api/auth/perfil
   */
  @Get('perfil')
  @UseGuards(JwtAuthGuard)
  async obtenerPerfil(@CurrentUser() usuario: any) {
    return {
      id: usuario.id,
      username: usuario.username,
      nombre_completo: usuario.nombre_completo,
      email: usuario.email,
      rol: usuario.rol,
      activo: usuario.activo,
    };
  }

  /**
   * Endpoint de prueba exclusivo para Administradores (Propietario y Secundario).
   * GET /api/auth/admin-only
   */
  @Get('admin-only')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMINISTRADOR_PROPIETARIO, RolUsuario.ADMINISTRADOR_SECUNDARIO)
  async recursoSoloAdmin(@CurrentUser() usuario: any) {
    return {
      mensaje: 'Acceso autorizado exclusivamente para la administración.',
      ejecutado_por: usuario.username,
      rol: usuario.rol,
    };
  }

  /**
   * Consulta los últimos eventos de auditoría registrados para autenticación.
   * GET /api/auth/auditoria-logins
   */
  @Get('auditoria-logins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RolUsuario.ADMINISTRADOR_PROPIETARIO, RolUsuario.ADMINISTRADOR_SECUNDARIO)
  async consultarAuditoriaLogins() {
    return this.auditoriaService.obtenerHistorial('auth', 20);
  }
}
