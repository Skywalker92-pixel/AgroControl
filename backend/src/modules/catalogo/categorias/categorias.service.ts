import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CrearCategoriaDto } from './dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from './dto/actualizar-categoria.dto';

@Injectable()
export class CategoriasService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(dto: CrearCategoriaDto) {
    const existe = await this.prisma.categoria.findUnique({
      where: { codigo: dto.codigo },
    });

    if (existe) {
      throw new ConflictException(`Ya existe una categoría con el código '${dto.codigo}'.`);
    }

    return this.prisma.categoria.create({
      data: {
        codigo: dto.codigo.trim().toUpperCase(),
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
      },
    });
  }

  async listar(soloActivos = false) {
    return this.prisma.categoria.findMany({
      where: soloActivos ? { activo: true } : undefined,
      orderBy: { nombre: 'asc' },
    });
  }

  async buscarPorId(id: string) {
    const categoria = await this.prisma.categoria.findUnique({
      where: { id },
      include: {
        producto: {
          select: {
            id: true,
            codigo_interno: true,
            nombre: true,
            unidad_base: true,
            activo: true,
          },
        },
      },
    });

    if (!categoria) {
      throw new NotFoundException(`Categoría con ID '${id}' no encontrada.`);
    }

    return categoria;
  }

  async actualizar(id: string, dto: ActualizarCategoriaDto) {
    await this.buscarPorId(id);

    if (dto.codigo) {
      const duplicado = await this.prisma.categoria.findFirst({
        where: {
          codigo: dto.codigo.trim().toUpperCase(),
          id: { not: id },
        },
      });

      if (duplicado) {
        throw new ConflictException(`Ya existe otra categoría con el código '${dto.codigo}'.`);
      }
    }

    return this.prisma.categoria.update({
      where: { id },
      data: {
        codigo: dto.codigo ? dto.codigo.trim().toUpperCase() : undefined,
        nombre: dto.nombre ? dto.nombre.trim() : undefined,
        descripcion: dto.descripcion !== undefined ? dto.descripcion?.trim() || null : undefined,
        activo: dto.activo !== undefined ? dto.activo : undefined,
      },
    });
  }
}
