import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsuariosService } from '../usuarios/usuarios.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usuariosService: UsuariosService,
    private readonly jwtService: JwtService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Autentica al usuario, emite el token JWT y audita el intento (exitoso o fallido).
   */
  async login(loginDto: LoginDto, ipOrigen: string) {
    const { username, password } = loginDto;

    const usuario = await this.usuariosService.buscarPorUsername(username);

    // 1. Caso: Usuario no encontrado
    if (!usuario) {
      await this.auditoriaService.registrarEvento({
        entidad: 'auth',
        accion: 'LOGIN',
        ip_origen: ipOrigen,
        valor_nuevo: {
          resultado: 'FALLIDO',
          motivo: 'USUARIO_NO_EXISTE',
          username,
        },
      });

      throw new UnauthorizedException('Credenciales inválidas.');
    }

    // 2. Caso: Cuenta inactiva
    if (!usuario.activo) {
      await this.auditoriaService.registrarEvento({
        entidad: 'auth',
        registro_id: usuario.id,
        usuario_id: usuario.id,
        accion: 'LOGIN',
        ip_origen: ipOrigen,
        valor_nuevo: {
          resultado: 'FALLIDO',
          motivo: 'CUENTA_INACTIVA',
          username,
        },
      });

      throw new UnauthorizedException('La cuenta de usuario se encuentra deshabilitada.');
    }

    // 3. Caso: Contraseña incorrecta
    const passwordValido = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValido) {
      await this.auditoriaService.registrarEvento({
        entidad: 'auth',
        registro_id: usuario.id,
        usuario_id: usuario.id,
        accion: 'LOGIN',
        ip_origen: ipOrigen,
        valor_nuevo: {
          resultado: 'FALLIDO',
          motivo: 'PASSWORD_INCORRECTO',
          username,
        },
      });

      throw new UnauthorizedException('Credenciales inválidas.');
    }

    // 4. Caso: Autenticación exitosa
    const payload = {
      sub: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
    };

    const accessToken = this.jwtService.sign(payload);

    await this.auditoriaService.registrarEvento({
      entidad: 'auth',
      registro_id: usuario.id,
      usuario_id: usuario.id,
      accion: 'LOGIN',
      ip_origen: ipOrigen,
      valor_nuevo: {
        resultado: 'EXITOSO',
        username: usuario.username,
        rol: usuario.rol,
      },
    });

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      usuario: {
        id: usuario.id,
        username: usuario.username,
        nombre_completo: usuario.nombre_completo,
        email: usuario.email,
        rol: usuario.rol,
      },
    };
  }
}
