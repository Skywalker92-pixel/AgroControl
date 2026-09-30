import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';

@Injectable()
export class ProductosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async crear(dto: CrearProductoDto, usuarioId?: string, ipOrigen?: string) {
    // 1. Validar que la categoría exista
    const categoria = await this.prisma.categoria.findUnique({
      where: { id: dto.categoria_id },
    });

    if (!categoria) {
      throw new NotFoundException(`La categoría con ID '${dto.categoria_id}' no existe.`);
    }

    // 2. Validar unicidad del código interno
    const codigoInternoNormalizado = dto.codigo_interno.trim().toUpperCase();
    const existeCodigo = await this.prisma.producto.findUnique({
      where: { codigo_interno: codigoInternoNormalizado },
    });

    if (existeCodigo) {
      throw new ConflictException(`Ya existe un producto con el código interno '${dto.codigo_interno}'.`);
    }

    // 3. Validar unicidad de código de barras si se proporciona (POR VALIDAR)
    const codigoBarrasNormalizado = dto.codigo_barras?.trim() || null;
    if (codigoBarrasNormalizado) {
      const existeBarras = await this.prisma.producto.findFirst({
        where: { codigo_barras: codigoBarrasNormalizado },
      });

      if (existeBarras) {
        throw new ConflictException(`Ya existe un producto con el código de barras '${codigoBarrasNormalizado}'.`);
      }
    }

    // 4. Crear el producto en la base de datos
    const nuevoProducto = await this.prisma.producto.create({
      data: {
        codigo_interno: codigoInternoNormalizado,
        codigo_barras: codigoBarrasNormalizado,
        nombre: dto.nombre.trim(),
        descripcion: dto.descripcion?.trim() || null,
        categoria_id: dto.categoria_id,
        unidad_base: dto.unidad_base.toLowerCase(),
      },
      include: {
        categoria: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },
    });

    // 5. Registrar en la bitácora inmutable de auditoría
    await this.auditoriaService.registrarEvento({
      entidad: 'producto',
      registro_id: nuevoProducto.id,
      accion: 'INSERT',
      usuario_id: usuarioId,
      ip_origen: ipOrigen,
      valor_nuevo: {
        codigo_interno: nuevoProducto.codigo_interno,
        nombre: nuevoProducto.nombre,
        categoria_id: nuevoProducto.categoria_id,
        unidad_base: nuevoProducto.unidad_base,
      },
    });

    return nuevoProducto;
  }

  async listar(categoriaId?: string, busqueda?: string, soloActivos = false) {
    return this.prisma.producto.findMany({
      where: {
        categoria_id: categoriaId || undefined,
        activo: soloActivos ? true : undefined,
        OR: busqueda
          ? [
              { codigo_interno: { contains: busqueda, mode: 'insensitive' } },
              { nombre: { contains: busqueda, mode: 'insensitive' } },
              { codigo_barras: { contains: busqueda, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        categoria: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
        presentacion: {
          where: { activo: true },
          select: {
            id: true,
            nombre: true,
            factor: true,
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });
  }

  async buscarPorId(id: string) {
    const producto = await this.prisma.producto.findUnique({
      where: { id },
      include: {
        categoria: true,
        presentacion: {
          where: { activo: true },
        },
        precio_producto: {
          include: {
            lista_precio: true,
          },
        },
      },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID '${id}' no encontrado.`);
    }

    return producto;
  }

  async actualizar(id: string, dto: ActualizarProductoDto, usuarioId?: string, ipOrigen?: string) {
    const productoActual = await this.buscarPorId(id);

    if (dto.categoria_id) {
      const cat = await this.prisma.categoria.findUnique({
        where: { id: dto.categoria_id },
      });
      if (!cat) {
        throw new NotFoundException(`La categoría con ID '${dto.categoria_id}' no existe.`);
      }
    }

    if (dto.codigo_interno) {
      const codigoNorm = dto.codigo_interno.trim().toUpperCase();
      const duplicado = await this.prisma.producto.findFirst({
        where: {
          codigo_interno: codigoNorm,
          id: { not: id },
        },
      });
      if (duplicado) {
        throw new ConflictException(`Ya existe otro producto con el código interno '${dto.codigo_interno}'.`);
      }
    }

    if (dto.codigo_barras) {
      const barrasNorm = dto.codigo_barras.trim();
      const duplicadoBarras = await this.prisma.producto.findFirst({
        where: {
          codigo_barras: barrasNorm,
          id: { not: id },
        },
      });
      if (duplicadoBarras) {
        throw new ConflictException(`Ya existe otro producto con el código de barras '${dto.codigo_barras}'.`);
      }
    }

    const productoActualizado = await this.prisma.producto.update({
      where: { id },
      data: {
        codigo_interno: dto.codigo_interno ? dto.codigo_interno.trim().toUpperCase() : undefined,
        codigo_barras: dto.codigo_barras !== undefined ? dto.codigo_barras?.trim() || null : undefined,
        nombre: dto.nombre ? dto.nombre.trim() : undefined,
        descripcion: dto.descripcion !== undefined ? dto.descripcion?.trim() || null : undefined,
        categoria_id: dto.categoria_id || undefined,
        unidad_base: dto.unidad_base ? dto.unidad_base.toLowerCase() : undefined,
        activo: dto.activo !== undefined ? dto.activo : undefined,
      },
    });

    await this.auditoriaService.registrarEvento({
      entidad: 'producto',
      registro_id: id,
      accion: 'UPDATE',
      usuario_id: usuarioId,
      ip_origen: ipOrigen,
      valor_anterior: {
        nombre: productoActual.nombre,
        activo: productoActual.activo,
        unidad_base: productoActual.unidad_base,
      },
      valor_nuevo: {
        nombre: productoActualizado.nombre,
        activo: productoActualizado.activo,
        unidad_base: productoActualizado.unidad_base,
      },
    });

    return productoActualizado;
  }
}
