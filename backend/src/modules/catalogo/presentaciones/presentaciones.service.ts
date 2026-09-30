import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { CrearPresentacionDto } from './dto/crear-presentacion.dto';
import { CalcularConversionDto } from './dto/calcular-conversion.dto';

@Injectable()
export class PresentacionesService {
  constructor(private readonly prisma: PrismaService) {}

  async crear(productoId: string, dto: CrearPresentacionDto) {
    // 1. Validar existencia del producto
    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });

    if (!producto) {
      throw new NotFoundException(`El producto con ID '${productoId}' no existe.`);
    }

    // 2. Validar que no exista una presentación con el mismo nombre para este producto
    const nombreNormalizado = dto.nombre.trim();
    const existe = await this.prisma.presentacion.findFirst({
      where: {
        producto_id: productoId,
        nombre: { equals: nombreNormalizado, mode: 'insensitive' },
      },
    });

    if (existe) {
      throw new ConflictException(
        `Ya existe la presentación '${nombreNormalizado}' para el producto '${producto.nombre}'.`,
      );
    }

    // 3. Crear presentación
    return this.prisma.presentacion.create({
      data: {
        producto_id: productoId,
        nombre: nombreNormalizado,
        factor: dto.factor,
      },
    });
  }

  async listarPorProducto(productoId: string) {
    return this.prisma.presentacion.findMany({
      where: {
        producto_id: productoId,
        activo: true,
      },
      orderBy: { factor: 'asc' },
    });
  }

  async buscarPorId(id: string) {
    const presentacion = await this.prisma.presentacion.findUnique({
      where: { id },
      include: {
        producto: true,
      },
    });

    if (!presentacion) {
      throw new NotFoundException(`Presentación con ID '${id}' no encontrada.`);
    }

    return presentacion;
  }

  /**
   * INVARIANTE DEL DOMINIO:
   * El cálculo de unidades base a partir de empaques comerciales (cajas, sacos)
   * se realiza y valida estrictamente en el servidor.
   * Ejemplo: 2 cajas x12 + 3 unidades sueltas = 27 unidades base.
   */
  async calcularConversion(dto: CalcularConversionDto) {
    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.producto_id },
    });

    if (!producto) {
      throw new NotFoundException(`El producto con ID '${dto.producto_id}' no existe.`);
    }

    let factor = 1;
    let presentacionNombre = 'Unidad Base Directa';
    const cantPresentacion = dto.cantidad_presentacion || 0;
    const unidadesSueltas = dto.unidades_sueltas || 0;

    if (dto.presentacion_id) {
      const presentacion = await this.prisma.presentacion.findUnique({
        where: { id: dto.presentacion_id },
      });

      if (!presentacion) {
        throw new NotFoundException(`La presentación con ID '${dto.presentacion_id}' no existe.`);
      }

      if (presentacion.producto_id !== dto.producto_id) {
        throw new BadRequestException('La presentación indicada no corresponde al producto especificado.');
      }

      factor = Number(presentacion.factor);
      presentacionNombre = presentacion.nombre;
    }

    const unidadesDesdePresentacion = cantPresentacion * factor;
    const totalUnidadesBase = unidadesDesdePresentacion + unidadesSueltas;

    return {
      producto_id: producto.id,
      codigo_interno: producto.codigo_interno,
      nombre_producto: producto.nombre,
      unidad_base: producto.unidad_base,
      presentacion: dto.presentacion_id
        ? {
            id: dto.presentacion_id,
            nombre: presentacionNombre,
            factor,
          }
        : null,
      cantidad_presentacion: cantPresentacion,
      unidades_sueltas: unidadesSueltas,
      unidades_desde_presentacion: unidadesDesdePresentacion,
      total_unidades_base: Number(totalUnidadesBase.toFixed(3)),
    };
  }
}
