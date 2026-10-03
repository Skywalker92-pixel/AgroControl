import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import {
  CrearUsuarioDto,
  ActualizarUsuarioDto,
  CambiarRolDto,
  CambiarEstadoUsuarioDto,
  ResetPasswordDto,
} from './dto/usuarios.dto';
import { RolUsuario } from '../auth/roles/roles.enum';

@Injectable()
export class UsuariosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async buscarPorUsername(username: string) {
    return this.prisma.usuario.findUnique({
      where: { username },
    });
  }

  async buscarPorId(id: string) {
    return this.prisma.usuario.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        nombre_completo: true,
        email: true,
        rol: true,
        activo: true,
        creado_en: true,
        actualizado_en: true,
      },
    });
  }

  async listar() {
    return this.prisma.usuario.findMany({
      select: {
        id: true,
        username: true,
        nombre_completo: true,
        email: true,
        rol: true,
        activo: true,
        creado_en: true,
        actualizado_en: true,
      },
      orderBy: { creado_en: 'asc' },
    });
  }

  async listarTrabajadoresActivos() {
    return this.prisma.usuario.findMany({
      where: { activo: true },
      select: {
        id: true,
        username: true,
        nombre_completo: true,
        rol: true,
        activo: true,
      },
      orderBy: { nombre_completo: 'asc' },
    });
  }

  async crear(dto: CrearUsuarioDto, usuarioId?: string, ipOrigen?: string) {
    const existente = await this.prisma.usuario.findUnique({
      where: { username: dto.username },
    });

    if (existente) {
      throw new ConflictException(
        `El nombre de usuario '${dto.username}' ya está registrado.`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const nuevo = await this.prisma.usuario.create({
      data: {
        username: dto.username,
        password_hash: passwordHash,
        nombre_completo: dto.nombre_completo,
        email: dto.email || null,
        rol: dto.rol,
        activo: true,
      },
      select: {
        id: true,
        username: true,
        nombre_completo: true,
        email: true,
        rol: true,
        activo: true,
        creado_en: true,
      },
    });

    if (usuarioId) {
      await this.auditoriaService.registrarEvento({
        entidad: 'usuario',
        registro_id: nuevo.id,
        accion: 'INSERT',
        valor_nuevo: {
          username: nuevo.username,
          nombre_completo: nuevo.nombre_completo,
          rol: nuevo.rol,
        },
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
      });
    }

    return nuevo;
  }

  async actualizar(
    id: string,
    dto: ActualizarUsuarioDto,
    usuarioId?: string,
    ipOrigen?: string,
  ) {
    const usuario = await this.buscarPorId(id);
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID '${id}' no encontrado.`);
    }

    const actualizado = await this.prisma.usuario.update({
      where: { id },
      data: {
        nombre_completo: dto.nombre_completo ?? usuario.nombre_completo,
        email: dto.email !== undefined ? dto.email : usuario.email,
        actualizado_en: new Date(),
      },
      select: {
        id: true,
        username: true,
        nombre_completo: true,
        email: true,
        rol: true,
        activo: true,
        actualizado_en: true,
      },
    });

    if (usuarioId) {
      await this.auditoriaService.registrarEvento({
        entidad: 'usuario',
        registro_id: id,
        accion: 'UPDATE',
        valor_anterior: usuario,
        valor_nuevo: actualizado,
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
      });
    }

    return actualizado;
  }

  async cambiarRol(
    id: string,
    dto: CambiarRolDto,
    usuarioId?: string,
    ipOrigen?: string,
  ) {
    const usuario = await this.buscarPorId(id);
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID '${id}' no encontrado.`);
    }

    // Regla de salvaguarda: si era ADMINISTRADOR_PROPIETARIO, verificar que no sea el único
    if (
      usuario.rol === RolUsuario.ADMINISTRADOR_PROPIETARIO &&
      dto.rol !== RolUsuario.ADMINISTRADOR_PROPIETARIO
    ) {
      const totalPropietariosActivos = await this.prisma.usuario.count({
        where: {
          rol: RolUsuario.ADMINISTRADOR_PROPIETARIO,
          activo: true,
        },
      });

      if (totalPropietariosActivos <= 1) {
        throw new BadRequestException(
          'No se puede cambiar el rol del único Administrador Propietario activo del sistema.',
        );
      }
    }

    const actualizado = await this.prisma.usuario.update({
      where: { id },
      data: {
        rol: dto.rol,
        actualizado_en: new Date(),
      },
      select: {
        id: true,
        username: true,
        nombre_completo: true,
        rol: true,
        activo: true,
        actualizado_en: true,
      },
    });

    if (usuarioId) {
      await this.auditoriaService.registrarEvento({
        entidad: 'usuario',
        registro_id: id,
        accion: 'UPDATE',
        valor_anterior: { rol: usuario.rol },
        valor_nuevo: { rol: actualizado.rol },
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
      });
    }

    return actualizado;
  }

  async cambiarEstado(
    id: string,
    dto: CambiarEstadoUsuarioDto,
    usuarioId?: string,
    ipOrigen?: string,
  ) {
    const usuario = await this.buscarPorId(id);
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID '${id}' no encontrado.`);
    }

    // Regla de salvaguarda: no desactivar al último administrador propietario
    if (
      usuario.rol === RolUsuario.ADMINISTRADOR_PROPIETARIO &&
      dto.activo === false
    ) {
      const totalPropietariosActivos = await this.prisma.usuario.count({
        where: {
          rol: RolUsuario.ADMINISTRADOR_PROPIETARIO,
          activo: true,
        },
      });

      if (totalPropietariosActivos <= 1) {
        throw new BadRequestException(
          'No se puede desactivar al único Administrador Propietario activo del sistema.',
        );
      }
    }

    const actualizado = await this.prisma.usuario.update({
      where: { id },
      data: {
        activo: dto.activo,
        actualizado_en: new Date(),
      },
      select: {
        id: true,
        username: true,
        nombre_completo: true,
        rol: true,
        activo: true,
        actualizado_en: true,
      },
    });

    if (usuarioId) {
      await this.auditoriaService.registrarEvento({
        entidad: 'usuario',
        registro_id: id,
        accion: 'UPDATE',
        valor_anterior: { activo: usuario.activo },
        valor_nuevo: { activo: actualizado.activo },
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
      });
    }

    return actualizado;
  }

  async resetPassword(
    id: string,
    dto: ResetPasswordDto,
    usuarioId?: string,
    ipOrigen?: string,
  ) {
    const usuario = await this.buscarPorId(id);
    if (!usuario) {
      throw new NotFoundException(`Usuario con ID '${id}' no encontrado.`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    await this.prisma.usuario.update({
      where: { id },
      data: {
        password_hash: passwordHash,
        actualizado_en: new Date(),
      },
    });

    if (usuarioId) {
      await this.auditoriaService.registrarEvento({
        entidad: 'usuario',
        registro_id: id,
        accion: 'UPDATE',
        valor_nuevo: { timestamp: new Date().toISOString() },
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
      });
    }

    return {
      mensaje: `Contraseña para el usuario '${usuario.username}' restablecida exitosamente.`,
    };
  }
}
