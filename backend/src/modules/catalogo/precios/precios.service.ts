import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../core/prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { AsignarPrecioDto } from './dto/asignar-precio.dto';

@Injectable()
export class PreciosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async listarListasPrecio() {
    return this.prisma.lista_precio.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    });
  }

  async asignarPrecio(dto: AsignarPrecioDto, usuarioId?: string, ipOrigen?: string) {
    // 1. Validar existencia de la lista de precio
    const lista = await this.prisma.lista_precio.findUnique({
      where: { id: dto.lista_precio_id },
    });
    if (!lista) {
      throw new NotFoundException(`La lista de precio con ID '${dto.lista_precio_id}' no existe.`);
    }

    // 2. Validar existencia del producto
    const producto = await this.prisma.producto.findUnique({
      where: { id: dto.producto_id },
    });
    if (!producto) {
      throw new NotFoundException(`El producto con ID '${dto.producto_id}' no existe.`);
    }

    // 3. Upsert de precio_producto
    const precioPrevio = await this.prisma.precio_producto.findUnique({
      where: {
        lista_precio_id_producto_id: {
          lista_precio_id: dto.lista_precio_id,
          producto_id: dto.producto_id,
        },
      },
    });

    const precioGuardado = await this.prisma.precio_producto.upsert({
      where: {
        lista_precio_id_producto_id: {
          lista_precio_id: dto.lista_precio_id,
          producto_id: dto.producto_id,
        },
      },
      create: {
        lista_precio_id: dto.lista_precio_id,
        producto_id: dto.producto_id,
        precio: dto.precio,
      },
      update: {
        precio: dto.precio,
      },
      include: {
        lista_precio: true,
        producto: true,
      },
    });

    // 4. Auditoría
    await this.auditoriaService.registrarEvento({
      entidad: 'precio_producto',
      registro_id: precioGuardado.id,
      accion: precioPrevio ? 'UPDATE' : 'INSERT',
      usuario_id: usuarioId,
      ip_origen: ipOrigen,
      valor_anterior: precioPrevio ? { precio: Number(precioPrevio.precio) } : undefined,
      valor_nuevo: {
        lista_precio: lista.codigo,
        producto: producto.codigo_interno,
        precio: dto.precio,
      },
    });

    return {
      id: precioGuardado.id,
      lista_precio_id: precioGuardado.lista_precio_id,
      lista_codigo: lista.codigo,
      producto_id: precioGuardado.producto_id,
      producto_codigo: producto.codigo_interno,
      precio: Number(precioGuardado.precio),
    };
  }

  async obtenerPreciosPorProducto(productoId: string) {
    const precios = await this.prisma.precio_producto.findMany({
      where: { producto_id: productoId },
      include: {
        lista_precio: true,
      },
    });

    return precios.map((p) => ({
      id: p.id,
      lista_precio_id: p.lista_precio_id,
      lista_codigo: p.lista_precio.codigo,
      lista_nombre: p.lista_precio.nombre,
      precio: Number(p.precio),
    }));
  }

  /**
   * INVARIANTE DEL DOMINIO:
   * El precio lo determina el tipo de cliente / lista de precios,
   * jamás el volumen o cantidad comprada.
   */
  async obtenerPrecioParaCliente(productoId: string, clienteId: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        lista_precio: true,
      },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID '${clienteId}' no encontrado.`);
    }

    const producto = await this.prisma.producto.findUnique({
      where: { id: productoId },
    });

    if (!producto) {
      throw new NotFoundException(`Producto con ID '${productoId}' no encontrado.`);
    }

    const precioConfigurado = await this.prisma.precio_producto.findUnique({
      where: {
        lista_precio_id_producto_id: {
          lista_precio_id: cliente.lista_precio_id,
          producto_id: productoId,
        },
      },
    });

    if (!precioConfigurado) {
      throw new NotFoundException(
        `El producto '${producto.nombre}' no tiene precio asignado en la lista '${cliente.lista_precio.nombre}' del cliente.`,
      );
    }

    return {
      producto_id: producto.id,
      producto_codigo: producto.codigo_interno,
      producto_nombre: producto.nombre,
      unidad_base: producto.unidad_base,
      cliente_id: cliente.id,
      cliente_nombre: cliente.razon_social,
      lista_precio: {
        id: cliente.lista_precio.id,
        codigo: cliente.lista_precio.codigo,
        nombre: cliente.lista_precio.nombre,
      },
      precio_unitario: Number(precioConfigurado.precio),
    };
  }
}
