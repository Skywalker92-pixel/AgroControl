import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { UsuariosService } from '../../usuarios/usuarios.service';

export interface JwtPayload {
  sub: string;
  username: string;
  rol: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly usuariosService: UsuariosService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret || jwtSecret.length < 16) {
      throw new Error('FATAL: JWT_SECRET no configurado en entorno');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    const usuario = await this.usuariosService.buscarPorId(payload.sub);

    if (!usuario) {
      throw new UnauthorizedException('El usuario asociado al token ya no existe.');
    }

    if (!usuario.activo) {
      throw new UnauthorizedException('La cuenta de usuario se encuentra inactiva.');
    }

    return usuario;
  }
}
