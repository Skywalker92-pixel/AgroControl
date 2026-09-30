import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CrearVehiculoDto } from './dto/crear-vehiculo.dto';
import { ActualizarVehiculoDto } from './dto/actualizar-vehiculo.dto';
import { ConsultarVehiculosDto } from './dto/consultar-vehiculos.dto';

@Injectable()
export class VehiculosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Registra un vehículo y aprovisiona atómicamente su Bodega Móvil lógica.
   * Regla de Negocio Hito 8:
   * Cada unidad de transporte debe tener vinculada una ubicación BODEGA_MOVIL
   * para recibir transferencias de mercadería antes de salir a ruta.
   */
  async crear(dto: CrearVehiculoDto, usuarioId?: string, ipOrigen?: string) {
    const placaNorm = dto.placa.trim().toUpperCase();

    // 1. Validar unicidad de placa
    const existe = await this.prisma.vehiculo.findUnique({
      where: { placa: placaNorm },
    });
    if (existe) {
      throw new ConflictException(
        `Ya existe un vehículo registrado con la placa '${placaNorm}'.`,
      );
    }

    // 2. Validar conductor habitual si fue proporcionado
    if (dto.conductor_habitual_id) {
      const conductor = await this.prisma.usuario.findUnique({
        where: { id: dto.conductor_habitual_id },
      });
      if (!conductor) {
        throw new NotFoundException(
          `El usuario conductor con ID '${dto.conductor_habitual_id}' no existe.`,
        );
      }
    }

    // 3. Creación atómica del vehículo y su bodega móvil lógica
    return this.prisma.$transaction(async (tx) => {
      const vehiculo = await tx.vehiculo.create({
        data: {
          placa: placaNorm,
          marca: dto.marca?.trim() || null,
          modelo: dto.modelo?.trim() || null,
          tipo_vehiculo: dto.tipo_vehiculo?.trim() || 'CAMIONETA',
          capacidad_kg: dto.capacidad_kg !== undefined ? dto.capacidad_kg : null,
          capacidad_volumen:
            dto.capacidad_volumen !== undefined ? dto.capacidad_volumen : null,
          conductor_habitual_id: dto.conductor_habitual_id || null,
          observaciones: dto.observaciones?.trim() || null,
          activo: true,
        },
      });

      // Crear código único para la bodega móvil: BM-{PLACA}
      const codigoBodega = `BM-${placaNorm}`;
      const nombreBodega = `Bodega Móvil - ${placaNorm}${
        dto.marca ? ` (${dto.marca.trim()})` : ''
      }`;

      // Asegurar que el código de ubicación sea único
      const bodegaExistente = await tx.ubicacion.findUnique({
        where: { codigo: codigoBodega },
      });

      let bodegaMovil;
      if (bodegaExistente) {
        // Si ya existiera, vincularla al vehículo
        bodegaMovil = await tx.ubicacion.update({
          where: { id: bodegaExistente.id },
          data: {
            vehiculo_id: vehiculo.id,
            trabajador_id: dto.conductor_habitual_id || null,
            activo: true,
          },
        });
      } else {
        bodegaMovil = await tx.ubicacion.create({
          data: {
            tipo: 'BODEGA_MOVIL',
            codigo: codigoBodega,
            nombre: nombreBodega,
            vehiculo_id: vehiculo.id,
            trabajador_id: dto.conductor_habitual_id || null,
            activo: true,
          },
        });
      }

      // Registrar auditoría
      await this.auditoriaService.registrarEvento({
        entidad: 'vehiculo',
        registro_id: vehiculo.id,
        accion: 'INSERT',
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
        valor_nuevo: {
          id: vehiculo.id,
          placa: vehiculo.placa,
          tipo_vehiculo: vehiculo.tipo_vehiculo,
          bodega_movil_id: bodegaMovil.id,
        },
      });

      return {
        ...vehiculo,
        bodega_movil: bodegaMovil,
      };
    });
  }

  /**
   * Listado de vehículos con filtros y relaciones completas.
   */
  async listar(dto: ConsultarVehiculosDto) {
    const where: any = {};

    if (dto.soloActivos !== undefined) {
      where.activo = dto.soloActivos;
    }

    if (dto.busqueda && dto.busqueda.trim().length > 0) {
      const q = dto.busqueda.trim();
      where.OR = [
        { placa: { contains: q, mode: 'insensitive' } },
        { marca: { contains: q, mode: 'insensitive' } },
        { modelo: { contains: q, mode: 'insensitive' } },
        { tipo_vehiculo: { contains: q, mode: 'insensitive' } },
        {
          conductor_habitual: {
            nombre_completo: { contains: q, mode: 'insensitive' },
          },
        },
      ];
    }

    const vehiculos = await this.prisma.vehiculo.findMany({
      where,
      include: {
        conductor_habitual: {
          select: {
            id: true,
            nombre_completo: true,
            username: true,
            rol: true,
            email: true,
          },
        },
        ubicacion: {
          where: { tipo: 'BODEGA_MOVIL' },
          select: {
            id: true,
            codigo: true,
            nombre: true,
            activo: true,
          },
        },
        carga_distribucion: {
          where: { estado: 'EN_RUTA' },
          take: 1,
          select: {
            id: true,
            codigo: true,
            fecha_salida: true,
            trabajador: {
              select: {
                id: true,
                nombre_completo: true,
              },
            },
          },
        },
      },
      orderBy: { placa: 'asc' },
    });

    return vehiculos.map((v) => ({
      ...v,
      bodega_movil: v.ubicacion[0] || null,
      carga_activa: v.carga_distribucion[0] || null,
    }));
  }

  /**
   * Obtiene el detalle de un vehículo por su ID.
   */
  async buscarPorId(id: string) {
    const vehiculo = await this.prisma.vehiculo.findUnique({
      where: { id },
      include: {
        conductor_habitual: {
          select: {
            id: true,
            nombre_completo: true,
            username: true,
            rol: true,
            email: true,
          },
        },
        ubicacion: {
          where: { tipo: 'BODEGA_MOVIL' },
        },
        carga_distribucion: {
          orderBy: { creado_en: 'desc' },
          take: 5,
          include: {
            trabajador: {
              select: { id: true, nombre_completo: true },
            },
          },
        },
      },
    });

    if (!vehiculo) {
      throw new NotFoundException(`El vehículo con ID '${id}' no existe.`);
    }

    return {
      ...vehiculo,
      bodega_movil: vehiculo.ubicacion[0] || null,
    };
  }

  /**
   * Actualiza los datos de un vehículo y sincroniza su bodega móvil.
   */
  async actualizar(
    id: string,
    dto: ActualizarVehiculoDto,
    usuarioId?: string,
    ipOrigen?: string,
  ) {
    const actual = await this.buscarPorId(id);

    let placaNorm = actual.placa;
    if (dto.placa && dto.placa.trim().toUpperCase() !== actual.placa) {
      placaNorm = dto.placa.trim().toUpperCase();
      const existe = await this.prisma.vehiculo.findUnique({
        where: { placa: placaNorm },
      });
      if (existe && existe.id !== id) {
        throw new ConflictException(
          `Ya existe otro vehículo con la placa '${placaNorm}'.`,
        );
      }
    }

    if (
      dto.conductor_habitual_id !== undefined &&
      dto.conductor_habitual_id !== null &&
      dto.conductor_habitual_id !== actual.conductor_habitual_id
    ) {
      const conductor = await this.prisma.usuario.findUnique({
        where: { id: dto.conductor_habitual_id },
      });
      if (!conductor) {
        throw new NotFoundException(
          `El usuario conductor con ID '${dto.conductor_habitual_id}' no existe.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.vehiculo.update({
        where: { id },
        data: {
          placa: placaNorm,
          marca: dto.marca !== undefined ? dto.marca?.trim() || null : undefined,
          modelo: dto.modelo !== undefined ? dto.modelo?.trim() || null : undefined,
          tipo_vehiculo:
            dto.tipo_vehiculo !== undefined ? dto.tipo_vehiculo?.trim() : undefined,
          capacidad_kg: dto.capacidad_kg !== undefined ? dto.capacidad_kg : undefined,
          capacidad_volumen:
            dto.capacidad_volumen !== undefined ? dto.capacidad_volumen : undefined,
          conductor_habitual_id:
            dto.conductor_habitual_id !== undefined
              ? dto.conductor_habitual_id
              : undefined,
          activo: dto.activo !== undefined ? dto.activo : undefined,
          observaciones:
            dto.observaciones !== undefined
              ? dto.observaciones?.trim() || null
              : undefined,
          actualizado_en: new Date(),
        },
      });

      // Sincronizar bodega móvil asociada
      if (actual.bodega_movil) {
        const nuevoCodigo = `BM-${placaNorm}`;
        const nuevoNombre = `Bodega Móvil - ${placaNorm}${
          actualizado.marca ? ` (${actualizado.marca})` : ''
        }`;

        await tx.ubicacion.update({
          where: { id: actual.bodega_movil.id },
          data: {
            codigo: nuevoCodigo,
            nombre: nuevoNombre,
            trabajador_id:
              dto.conductor_habitual_id !== undefined
                ? dto.conductor_habitual_id
                : actual.bodega_movil.trabajador_id,
            activo: dto.activo !== undefined ? dto.activo : undefined,
            actualizado_en: new Date(),
          },
        });
      }

      await this.auditoriaService.registrarEvento({
        entidad: 'vehiculo',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
        valor_anterior: actual,
        valor_nuevo: actualizado,
      });

      return this.buscarPorId(id);
    });
  }

  /**
   * Desactivación lógica (soft delete) del vehículo y su bodega móvil.
   */
  async eliminar(id: string, usuarioId?: string, ipOrigen?: string) {
    const vehiculo = await this.buscarPorId(id);

    // Validar que no tenga cargas activas EN_RUTA
    const cargaEnRuta = await this.prisma.carga_distribucion.findFirst({
      where: { vehiculo_id: id, estado: 'EN_RUTA' },
    });

    if (cargaEnRuta) {
      throw new BadRequestException(
        `No se puede desactivar el vehículo '${vehiculo.placa}' porque tiene la carga '${cargaEnRuta.codigo}' en ruta activa.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const desactivado = await tx.vehiculo.update({
        where: { id },
        data: { activo: false, actualizado_en: new Date() },
      });

      if (vehiculo.bodega_movil) {
        await tx.ubicacion.update({
          where: { id: vehiculo.bodega_movil.id },
          data: { activo: false, actualizado_en: new Date() },
        });
      }

      await this.auditoriaService.registrarEvento({
        entidad: 'vehiculo',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
        valor_anterior: { activo: true },
        valor_nuevo: { activo: false },
      });

      return {
        mensaje: `Vehículo con placa '${vehiculo.placa}' desactivado correctamente.`,
        vehiculo: desactivado,
      };
    });
  }
}
