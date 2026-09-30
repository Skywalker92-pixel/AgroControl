import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CrearUbicacionDto } from './dto/crear-ubicacion.dto';
import { ActualizarUbicacionDto } from './dto/actualizar-ubicacion.dto';

@Injectable()
export class AlmacenesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async crear(dto: CrearUbicacionDto, usuarioId?: string, ipOrigen?: string) {
    // 1. Validar jerarquía: ZONA requiere padre ALMACEN
    if (dto.tipo === 'ZONA') {
      if (!dto.padre_id) {
        throw new BadRequestException('Una ZONA debe pertenecer obligatoriamente a un ALMACEN padre.');
      }
      const padre = await this.prisma.ubicacion.findUnique({
        where: { id: dto.padre_id },
      });
      if (!padre) {
        throw new NotFoundException(`El almacén padre con ID '${dto.padre_id}' no existe.`);
      }
      if (padre.tipo !== 'ALMACEN') {
        throw new BadRequestException('La ubicación padre de una ZONA debe ser de tipo ALMACEN.');
      }
    } else if (dto.tipo === 'ALMACEN') {
      if (dto.padre_id) {
        throw new BadRequestException('Un ALMACEN principal no debe tener ubicación padre.');
      }
    }

    // 2. Validar unicidad del código
    const codigoNorm = dto.codigo.trim().toUpperCase();
    const existe = await this.prisma.ubicacion.findUnique({
      where: { codigo: codigoNorm },
    });
    if (existe) {
      throw new ConflictException(`Ya existe una ubicación con el código '${dto.codigo}'.`);
    }

    // 3. Crear ubicación
    const nuevaUbicacion = await this.prisma.ubicacion.create({
      data: {
        tipo: dto.tipo,
        codigo: codigoNorm,
        nombre: dto.nombre.trim(),
        padre_id: dto.tipo === 'ZONA' ? dto.padre_id : null,
      },
      include: {
        ubicacion: true, // Padre si aplica
      },
    });

    // 4. Auditoría
    await this.auditoriaService.registrarEvento({
      entidad: 'ubicacion',
      registro_id: nuevaUbicacion.id,
      accion: 'INSERT',
      usuario_id: usuarioId,
      ip_origen: ipOrigen,
      valor_nuevo: {
        tipo: nuevaUbicacion.tipo,
        codigo: nuevaUbicacion.codigo,
        nombre: nuevaUbicacion.nombre,
      },
    });

    return nuevaUbicacion;
  }

  async listar(tipo?: string, padreId?: string, soloActivos = false) {
    return this.prisma.ubicacion.findMany({
      where: {
        tipo: tipo || undefined,
        padre_id: padreId || undefined,
        activo: soloActivos ? true : undefined,
      },
      include: {
        other_ubicacion: {
          where: { activo: true },
          select: {
            id: true,
            codigo: true,
            nombre: true,
            tipo: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async buscarPorId(id: string) {
    const ubicacion = await this.prisma.ubicacion.findUnique({
      where: { id },
      include: {
        ubicacion: true,
        other_ubicacion: true,
      },
    });

    if (!ubicacion) {
      throw new NotFoundException(`Ubicación con ID '${id}' no encontrada.`);
    }

    return ubicacion;
  }

  async actualizar(id: string, dto: ActualizarUbicacionDto, usuarioId?: string, ipOrigen?: string) {
    const actual = await this.buscarPorId(id);

    if (dto.codigo) {
      const codigoNorm = dto.codigo.trim().toUpperCase();
      const duplicado = await this.prisma.ubicacion.findFirst({
        where: {
          codigo: codigoNorm,
          id: { not: id },
        },
      });
      if (duplicado) {
        throw new ConflictException(`Ya existe otra ubicación con el código '${dto.codigo}'.`);
      }
    }

    if (dto.padre_id) {
      const padre = await this.prisma.ubicacion.findUnique({
        where: { id: dto.padre_id },
      });
      if (!padre || padre.tipo !== 'ALMACEN') {
        throw new BadRequestException('La ubicación padre debe ser un ALMACEN válido.');
      }
    }

    const actualizada = await this.prisma.ubicacion.update({
      where: { id },
      data: {
        codigo: dto.codigo ? dto.codigo.trim().toUpperCase() : undefined,
        nombre: dto.nombre ? dto.nombre.trim() : undefined,
        padre_id: dto.padre_id !== undefined ? dto.padre_id : undefined,
        activo: dto.activo !== undefined ? dto.activo : undefined,
      },
    });

    await this.auditoriaService.registrarEvento({
      entidad: 'ubicacion',
      registro_id: id,
      accion: 'UPDATE',
      usuario_id: usuarioId,
      ip_origen: ipOrigen,
      valor_anterior: {
        codigo: actual.codigo,
        nombre: actual.nombre,
        activo: actual.activo,
      },
      valor_nuevo: {
        codigo: actualizada.codigo,
        nombre: actualizada.nombre,
        activo: actualizada.activo,
      },
    });

    return actualizada;
  }
}
