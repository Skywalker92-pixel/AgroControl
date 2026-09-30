import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

@Injectable()
export class UsuariosService {
  constructor(private readonly prisma: PrismaService) {}

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
      },
      orderBy: { creado_en: 'asc' },
    });
  }
}
