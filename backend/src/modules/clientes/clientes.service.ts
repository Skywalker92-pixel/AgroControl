import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CrearClienteDto } from './dto/crear-cliente.dto';
import { ActualizarClienteDto } from './dto/actualizar-cliente.dto';

@Injectable()
export class ClientesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  async crear(dto: CrearClienteDto, usuarioId?: string, ipOrigen?: string) {
    // 1. Validar lista de precio asignada
    const lista = await this.prisma.lista_precio.findUnique({
      where: { id: dto.lista_precio_id },
    });
    if (!lista) {
      throw new NotFoundException(`La lista de precios con ID '${dto.lista_precio_id}' no existe.`);
    }

    // 2. Validar que no exista cliente con mismo documento
    const numDocNormalizado = dto.numero_documento.trim();
    const existeDoc = await this.prisma.cliente.findUnique({
      where: {
        tipo_documento_numero_documento: {
          tipo_documento: dto.tipo_documento,
          numero_documento: numDocNormalizado,
        },
      },
    });

    if (existeDoc) {
      throw new ConflictException(
        `Ya existe un cliente con el documento ${dto.tipo_documento} ${numDocNormalizado}.`,
      );
    }

    // 3. Crear cliente
    const nuevoCliente = await this.prisma.cliente.create({
      data: {
        tipo_documento: dto.tipo_documento,
        numero_documento: numDocNormalizado,
        razon_social: dto.razon_social.trim(),
        direccion: dto.direccion?.trim() || null,
        telefono: dto.telefono?.trim() || null,
        email: dto.email?.trim() || null,
        lista_precio_id: dto.lista_precio_id,
      },
      include: {
        lista_precio: true,
      },
    });

    // 4. Auditoría
    await this.auditoriaService.registrarEvento({
      entidad: 'cliente',
      registro_id: nuevoCliente.id,
      accion: 'INSERT',
      usuario_id: usuarioId,
      ip_origen: ipOrigen,
      valor_nuevo: {
        documento: `${nuevoCliente.tipo_documento} ${nuevoCliente.numero_documento}`,
        razon_social: nuevoCliente.razon_social,
        lista_precio: nuevoCliente.lista_precio.codigo,
      },
    });

    return nuevoCliente;
  }

  async listar(busqueda?: string, soloActivos = false) {
    return this.prisma.cliente.findMany({
      where: {
        activo: soloActivos ? true : undefined,
        OR: busqueda
          ? [
              { numero_documento: { contains: busqueda, mode: 'insensitive' } },
              { razon_social: { contains: busqueda, mode: 'insensitive' } },
              { telefono: { contains: busqueda, mode: 'insensitive' } },
            ]
          : undefined,
      },
      include: {
        lista_precio: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
          },
        },
      },
      orderBy: { razon_social: 'asc' },
    });
  }

  async buscarPorId(id: string) {
    const cliente = await this.prisma.cliente.findUnique({
      where: { id },
      include: {
        lista_precio: true,
      },
    });

    if (!cliente) {
      throw new NotFoundException(`Cliente con ID '${id}' no encontrado.`);
    }

    return cliente;
  }

  async actualizar(id: string, dto: ActualizarClienteDto, usuarioId?: string, ipOrigen?: string) {
    const clienteActual = await this.buscarPorId(id);

    if (dto.lista_precio_id) {
      const lista = await this.prisma.lista_precio.findUnique({
        where: { id: dto.lista_precio_id },
      });
      if (!lista) {
        throw new NotFoundException(`La lista de precios con ID '${dto.lista_precio_id}' no existe.`);
      }
    }

    if (dto.numero_documento || dto.tipo_documento) {
      const tipoDoc = dto.tipo_documento || (clienteActual.tipo_documento as any);
      const numDoc = dto.numero_documento ? dto.numero_documento.trim() : clienteActual.numero_documento;

      const duplicado = await this.prisma.cliente.findFirst({
        where: {
          tipo_documento: tipoDoc,
          numero_documento: numDoc,
          id: { not: id },
        },
      });

      if (duplicado) {
        throw new ConflictException(
          `Ya existe otro cliente con el documento ${tipoDoc} ${numDoc}.`,
        );
      }
    }

    const clienteActualizado = await this.prisma.cliente.update({
      where: { id },
      data: {
        tipo_documento: dto.tipo_documento || undefined,
        numero_documento: dto.numero_documento ? dto.numero_documento.trim() : undefined,
        razon_social: dto.razon_social ? dto.razon_social.trim() : undefined,
        direccion: dto.direccion !== undefined ? dto.direccion?.trim() || null : undefined,
        telefono: dto.telefono !== undefined ? dto.telefono?.trim() || null : undefined,
        email: dto.email !== undefined ? dto.email?.trim() || null : undefined,
        lista_precio_id: dto.lista_precio_id || undefined,
        activo: dto.activo !== undefined ? dto.activo : undefined,
      },
      include: {
        lista_precio: true,
      },
    });

    await this.auditoriaService.registrarEvento({
      entidad: 'cliente',
      registro_id: id,
      accion: 'UPDATE',
      usuario_id: usuarioId,
      ip_origen: ipOrigen,
      valor_anterior: {
        razon_social: clienteActual.razon_social,
        lista_precio: clienteActual.lista_precio.codigo,
        activo: clienteActual.activo,
      },
      valor_nuevo: {
        razon_social: clienteActualizado.razon_social,
        lista_precio: clienteActualizado.lista_precio.codigo,
        activo: clienteActualizado.activo,
      },
    });

    return clienteActualizado;
  }
}
