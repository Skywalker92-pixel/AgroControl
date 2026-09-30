import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { KardexService } from '../kardex/kardex.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import {
  CrearProformaDto,
} from './dto/crear-proforma.dto';
import {
  CambiarEstadoProformaDto,
  EstadoProforma,
} from './dto/cambiar-estado-proforma.dto';
import { ConsultarProformasDto } from './dto/consultar-proformas.dto';
import { RolUsuario } from '../auth/roles/roles.enum';

interface SaldoBloqueado {
  producto_id: string;
  ubicacion_id: string;
  cantidad_fisica: Prisma.Decimal | number | string;
  cantidad_reservada: Prisma.Decimal | number | string;
}

@Injectable()
export class DespachoService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kardexService: KardexService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Crea una proforma comercial con cálculo de cantidades base y precios en el servidor.
   * Regla de Negocio: La lista de precios proviene exclusivamente del tipo de cliente asignado.
   */
  async crearProforma(
    dto: CrearProformaDto,
    usuarioId: string,
    ipOrigen?: string,
  ) {
    // 1. Validar cliente y su lista de precios asociada
    const cliente = await this.prisma.cliente.findUnique({
      where: { id: dto.cliente_id },
      include: { lista_precio: true },
    });
    if (!cliente) {
      throw new NotFoundException(`El cliente con ID '${dto.cliente_id}' no existe.`);
    }
    if (!cliente.activo) {
      throw new BadRequestException(`El cliente '${cliente.razon_social}' está inactivo.`);
    }
    if (!cliente.lista_precio || !cliente.lista_precio.activo) {
      throw new BadRequestException('El cliente no tiene una lista de precios activa asignada.');
    }

    // 2. Validar almacén de despacho
    const ubicacion = await this.prisma.ubicacion.findUnique({
      where: { id: dto.ubicacion_id },
    });
    if (!ubicacion) {
      throw new NotFoundException(`El almacén con ID '${dto.ubicacion_id}' no existe.`);
    }
    if (!ubicacion.activo) {
      throw new BadRequestException(`El almacén '${ubicacion.nombre}' está inactivo.`);
    }
    if (ubicacion.tipo === 'BODEGA_MOVIL') {
      throw new BadRequestException('El despacho físico en Fase 1 no puede originarse desde una BODEGA_MOVIL.');
    }

    // 3. Procesar y validar cada ítem calculando cantidad base y precio
    const itemsCalculados = [];
    let subtotalGeneral = 0;

    for (const item of dto.items) {
      const producto = await this.prisma.producto.findUnique({
        where: { id: item.producto_id },
      });
      if (!producto || !producto.activo) {
        throw new BadRequestException(
          `El producto '${item.producto_id}' no existe o no está activo.`,
        );
      }

      let factorConversion = 1;
      let presentacion = null;

      if (item.presentacion_id) {
        presentacion = await this.prisma.presentacion.findUnique({
          where: { id: item.presentacion_id },
        });
        if (!presentacion || presentacion.producto_id !== producto.id || !presentacion.activo) {
          throw new BadRequestException(
            `La presentación comercial seleccionada no es válida para el producto '${producto.nombre}'.`,
          );
        }
        factorConversion = Number(presentacion.factor);
      }

      const cajas = item.cantidad_presentacion || 0;
      const sueltas = item.unidades_sueltas || 0;
      let totalBase = 0;

      if (item.cantidad_total_base && item.cantidad_total_base > 0 && !item.presentacion_id) {
        totalBase = Number(item.cantidad_total_base);
      } else {
        totalBase = Number(((cajas * factorConversion) + sueltas).toFixed(3));
      }

      if (totalBase <= 0) {
        throw new BadRequestException(
          `La cantidad a despachar del producto '${producto.nombre}' debe ser mayor a cero.`,
        );
      }

      // Resolver precio según la lista del cliente (sin alteración manual del vendedor)
      const precioProducto = await this.prisma.precio_producto.findUnique({
        where: {
          lista_precio_id_producto_id: {
            lista_precio_id: cliente.lista_precio_id,
            producto_id: producto.id,
          },
        },
      });

      if (!precioProducto) {
        throw new BadRequestException(
          `El producto '${producto.nombre}' no tiene precio asignado en la lista '${cliente.lista_precio.nombre}'.`,
        );
      }

      const precioUnitario = Number(precioProducto.precio);
      const subtotalItem = Number((totalBase * precioUnitario).toFixed(4));
      subtotalGeneral += subtotalItem;

      itemsCalculados.push({
        producto_id: producto.id,
        presentacion_id: presentacion ? presentacion.id : null,
        cantidad_presentacion: new Prisma.Decimal(cajas),
        cantidad_unidades_sueltas: new Prisma.Decimal(sueltas),
        cantidad_total_base: new Prisma.Decimal(totalBase),
        precio_unitario_base: new Prisma.Decimal(precioUnitario),
        subtotal: new Prisma.Decimal(subtotalItem),
        producto_nombre: producto.nombre,
      });
    }

    const subtotalFinal = Number(subtotalGeneral.toFixed(4));
    const igvFinal = Number((subtotalFinal * 0.18).toFixed(4));
    const totalFinal = Number((subtotalFinal + igvFinal).toFixed(4));

    // 4. Generar número de correlativo único
    const numeroProforma = `PROF-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const estadoInicial = dto.estado_inicial || EstadoProforma.BORRADOR;

    return this.prisma.$transaction(async (tx) => {
      // Crear registro de proforma
      const proforma = await tx.proforma.create({
        data: {
          numero: numeroProforma,
          cliente_id: dto.cliente_id,
          lista_precio_id: cliente.lista_precio_id,
          ubicacion_id: dto.ubicacion_id,
          estado: EstadoProforma.BORRADOR,
          subtotal: new Prisma.Decimal(subtotalFinal),
          igv: new Prisma.Decimal(igvFinal),
          total: new Prisma.Decimal(totalFinal),
          observaciones: dto.observaciones?.trim() || null,
          creado_por: usuarioId,
          proforma_detalle: {
            create: itemsCalculados.map((it) => ({
              producto_id: it.producto_id,
              presentacion_id: it.presentacion_id,
              cantidad_presentacion: it.cantidad_presentacion,
              cantidad_unidades_sueltas: it.cantidad_unidades_sueltas,
              cantidad_total_base: it.cantidad_total_base,
              precio_unitario_base: it.precio_unitario_base,
              subtotal: it.subtotal,
            })),
          },
        },
        include: {
          proforma_detalle: {
            include: { producto: true, presentacion: true },
          },
          cliente: true,
          ubicacion: true,
        },
      });

      // Si se solicitó reservar de inmediato
      if (estadoInicial === EstadoProforma.RESERVADO) {
        await this.ejecutarReserva(tx, proforma, usuarioId, ipOrigen);
      }

      await this.auditoriaService.registrarEvento({
        entidad: 'proforma',
        registro_id: proforma.id,
        accion: 'INSERT',
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
        valor_nuevo: {
          numero: proforma.numero,
          cliente_id: proforma.cliente_id,
          total: totalFinal,
          estado: estadoInicial,
        },
      });

      return this.buscarPorId(proforma.id, tx);
    });
  }

  /**
   * Máquina de estados estricta de la proforma:
   * BORRADOR ──► RESERVADO ──► PREPARADO ──► DESPACHADO
   *      │             │              │
   *      └─────────────┴──────────────┴────► ANULADO
   */
  async cambiarEstado(
    proformaId: string,
    dto: CambiarEstadoProformaDto,
    usuarioId: string,
    userRol: string,
    ipOrigen?: string,
  ) {
    const proforma = await this.prisma.proforma.findUnique({
      where: { id: proformaId },
      include: {
        proforma_detalle: {
          include: { producto: true },
        },
      },
    });

    if (!proforma) {
      throw new NotFoundException(`La proforma con ID '${proformaId}' no existe.`);
    }

    const estadoActual = proforma.estado as EstadoProforma;
    const nuevoEstado = dto.nuevo_estado;

    if (estadoActual === nuevoEstado) {
      return proforma;
    }

    // Regla de dominio: PROFORMA DESPACHADA no se puede anular o modificar por endpoint simple
    if (estadoActual === EstadoProforma.DESPACHADO) {
      throw new BadRequestException(
        'Una proforma en estado DESPACHADO no puede modificarse o anularse directamente. Requiere el flujo formal de anulación administrativa.',
      );
    }

    if (estadoActual === EstadoProforma.ANULADO) {
      throw new BadRequestException('Una proforma en estado ANULADO no puede cambiar de estado.');
    }

    // Validar transiciones permitidas
    this.validarTransicionEstado(estadoActual, nuevoEstado);

    // Validar permisos RBAC según el nuevo estado
    this.validarPermisoRol(nuevoEstado, userRol, estadoActual);

    return this.prisma.$transaction(async (tx) => {
      if (nuevoEstado === EstadoProforma.RESERVADO) {
        // Pasar a RESERVADO: Bloqueo pesimista e incremento de cantidad_reservada
        await this.ejecutarReserva(tx, proforma, usuarioId, ipOrigen);
      } else if (nuevoEstado === EstadoProforma.PREPARADO) {
        // Pasar a PREPARADO: El stock reservado se mantiene intacto mientras se prepara la carga
        await tx.proforma.update({
          where: { id: proforma.id },
          data: { estado: EstadoProforma.PREPARADO, actualizado_en: new Date() },
        });
      } else if (nuevoEstado === EstadoProforma.DESPACHADO) {
        // Pasar a DESPACHADO: Salida física de almacén, descuento de física y de reservada, Kárdex SALIDA
        await this.ejecutarDespacho(tx, proforma, usuarioId, ipOrigen);
      } else if (nuevoEstado === EstadoProforma.ANULADO) {
        // Pasar a ANULADO: Liberar reservas si estaban reservadas/preparadas
        await this.ejecutarAnulacion(tx, proforma, usuarioId, ipOrigen);
      }

      await this.auditoriaService.registrarEvento({
        entidad: 'proforma',
        registro_id: proforma.id,
        accion: 'UPDATE',
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
        valor_anterior: { estado: estadoActual },
        valor_nuevo: {
          estado: nuevoEstado,
          motivo: dto.motivo || null,
        },
      });

      return this.buscarPorId(proforma.id, tx);
    });
  }

  /**
   * Ejecuta la reserva lógica de stock:
   * Valida disponibilidad (fisica - reservada) y suma cantidad_reservada.
   */
  private async ejecutarReserva(
    tx: Prisma.TransactionClient,
    proforma: any,
    usuarioId: string,
    ipOrigen?: string,
  ) {
    for (const item of proforma.proforma_detalle) {
      const cantidadBase = Number(item.cantidad_total_base);

      // 1. Asegurar existencia de la fila de saldo
      await tx.$executeRaw`
        INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
        VALUES (${item.producto_id}::uuid, ${proforma.ubicacion_id}::uuid, 0, 0, NOW())
        ON CONFLICT (producto_id, ubicacion_id) DO NOTHING
      `;

      // 2. Bloqueo pesimista
      const saldos = await tx.$queryRaw<SaldoBloqueado[]>`
        SELECT producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada
        FROM stock_saldo
        WHERE producto_id = ${item.producto_id}::uuid AND ubicacion_id = ${proforma.ubicacion_id}::uuid
        FOR UPDATE
      `;

      const saldo = saldos[0];
      const fisica = Number(saldo.cantidad_fisica);
      const reservada = Number(saldo.cantidad_reservada);
      const disponible = Number((fisica - reservada).toFixed(3));

      if (cantidadBase > disponible) {
        throw new BadRequestException(
          `Stock insuficiente para reservar el producto '${item.producto?.nombre || item.producto_id}'. Disponible: ${disponible}, Solicitado: ${cantidadBase}`,
        );
      }

      const nuevaReservada = Number((reservada + cantidadBase).toFixed(3));

      // 3. Actualizar reserva en stock_saldo
      await tx.$executeRaw`
        UPDATE stock_saldo
        SET cantidad_reservada = ${nuevaReservada}::numeric,
            actualizado_en = NOW()
        WHERE producto_id = ${item.producto_id}::uuid AND ubicacion_id = ${proforma.ubicacion_id}::uuid
      `;
    }

    await tx.proforma.update({
      where: { id: proforma.id },
      data: { estado: EstadoProforma.RESERVADO, actualizado_en: new Date() },
    });
  }

  /**
   * Ejecuta el despacho físico de mercadería:
   * - Decrementa cantidad_fisica y cantidad_reservada.
   * - Registra movimiento de SALIDA en movimiento_kardex (inmutable).
   */
  private async ejecutarDespacho(
    tx: Prisma.TransactionClient,
    proforma: any,
    usuarioId: string,
    ipOrigen?: string,
  ) {
    for (const item of proforma.proforma_detalle) {
      const cantidadBase = Number(item.cantidad_total_base);

      // 1. Bloqueo pesimista
      const saldos = await tx.$queryRaw<SaldoBloqueado[]>`
        SELECT producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada
        FROM stock_saldo
        WHERE producto_id = ${item.producto_id}::uuid AND ubicacion_id = ${proforma.ubicacion_id}::uuid
        FOR UPDATE
      `;

      const saldo = saldos[0];
      const fisica = Number(saldo.cantidad_fisica);
      const reservada = Number(saldo.cantidad_reservada);

      const nuevaFisica = Number((fisica - cantidadBase).toFixed(3));
      const nuevaReservada = Number(Math.max(0, reservada - cantidadBase).toFixed(3));

      if (nuevaFisica < 0) {
        throw new BadRequestException(
          `Error crítico: La cantidad física resultante para '${item.producto?.nombre}' sería negativa.`,
        );
      }

      // 2. Actualizar saldo físico y liberar la reserva
      await tx.$executeRaw`
        UPDATE stock_saldo
        SET cantidad_fisica = ${nuevaFisica}::numeric,
            cantidad_reservada = ${nuevaReservada}::numeric,
            actualizado_en = NOW()
        WHERE producto_id = ${item.producto_id}::uuid AND ubicacion_id = ${proforma.ubicacion_id}::uuid
      `;

      // 3. Registrar movimiento de SALIDA en el libro Kárdex (Append-Only)
      await this.kardexService.registrarMovimiento(tx, {
        producto_id: item.producto_id,
        ubicacion_id: proforma.ubicacion_id,
        tipo: 'SALIDA',
        cantidad_base: -cantidadBase,
        documento_tipo: 'ORDEN_DESPACHO',
        documento_id: proforma.id,
        motivo: `Despacho de mercadería proforma ${proforma.numero}`,
        usuario_id: usuarioId,
        fecha_operacion: new Date(),
      });
    }

    await tx.proforma.update({
      where: { id: proforma.id },
      data: { estado: EstadoProforma.DESPACHADO, actualizado_en: new Date() },
    });
  }

  /**
   * Ejecuta la anulación liberando la reserva si aplicaba.
   */
  private async ejecutarAnulacion(
    tx: Prisma.TransactionClient,
    proforma: any,
    usuarioId: string,
    ipOrigen?: string,
  ) {
    const estadoPrevio = proforma.estado as EstadoProforma;

    // Si estaba RESERVADO o PREPARADO, se liberan las unidades reservadas
    if (estadoPrevio === EstadoProforma.RESERVADO || estadoPrevio === EstadoProforma.PREPARADO) {
      for (const item of proforma.proforma_detalle) {
        const cantidadBase = Number(item.cantidad_total_base);

        const saldos = await tx.$queryRaw<SaldoBloqueado[]>`
          SELECT producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada
          FROM stock_saldo
          WHERE producto_id = ${item.producto_id}::uuid AND ubicacion_id = ${proforma.ubicacion_id}::uuid
          FOR UPDATE
        `;

        if (saldos.length > 0) {
          const reservada = Number(saldos[0].cantidad_reservada);
          const nuevaReservada = Number(Math.max(0, reservada - cantidadBase).toFixed(3));

          await tx.$executeRaw`
            UPDATE stock_saldo
            SET cantidad_reservada = ${nuevaReservada}::numeric,
                actualizado_en = NOW()
            WHERE producto_id = ${item.producto_id}::uuid AND ubicacion_id = ${proforma.ubicacion_id}::uuid
          `;
        }
      }
    }

    await tx.proforma.update({
      where: { id: proforma.id },
      data: { estado: EstadoProforma.ANULADO, actualizado_en: new Date() },
    });
  }

  /**
   * Emite el DTO formateado para la impresión de la Orden de Despacho física.
   * Diseñado específicamente para el personal de carga en almacén.
   */
  async obtenerOrdenDespacho(proformaId: string) {
    const proforma = await this.buscarPorId(proformaId);

    const itemsFormateados = proforma.proforma_detalle.map((det: any, index: number) => {
      const factor = det.presentacion ? Number(det.presentacion.factor) : 1;
      const cajas = Number(det.cantidad_presentacion);
      const sueltas = Number(det.cantidad_unidades_sueltas);
      const totalBase = Number(det.cantidad_total_base);
      const unidadBase = det.producto.unidad_base;

      let descripcionEmpaque = '';
      if (det.presentacion) {
        const partes = [];
        if (cajas > 0) {
          partes.push(`${cajas} ${det.presentacion.nombre}`);
        }
        if (sueltas > 0) {
          partes.push(`${sueltas} ${unidadBase}(s) suelta(s)`);
        }
        descripcionEmpaque = partes.join(' + ');
      } else {
        descripcionEmpaque = `${totalBase} ${unidadBase}(s)`;
      }

      return {
        linea: index + 1,
        producto: {
          id: det.producto.id,
          codigo_interno: det.producto.codigo_interno,
          nombre: det.producto.nombre,
          unidad_base: unidadBase,
        },
        presentacion: det.presentacion
          ? {
              id: det.presentacion.id,
              nombre: det.presentacion.nombre,
              factor,
            }
          : null,
        descripcion_empaque: descripcionEmpaque,
        cantidad_total_base: totalBase,
        precio_unitario: Number(det.precio_unitario_base),
        subtotal: Number(det.subtotal),
      };
    });

    const totalUnidadesBase = itemsFormateados.reduce(
      (acc: number, it: any) => acc + it.cantidad_total_base,
      0,
    );

    return {
      orden_despacho_id: proforma.id,
      numero_documento: proforma.numero,
      fecha_emision: proforma.creado_en,
      estado: proforma.estado,
      almacen_origen: {
        id: proforma.ubicacion.id,
        codigo: proforma.ubicacion.codigo,
        nombre: proforma.ubicacion.nombre,
      },
      cliente: {
        id: proforma.cliente.id,
        razon_social: proforma.cliente.razon_social,
        tipo_documento: proforma.cliente.tipo_documento,
        numero_documento: proforma.cliente.numero_documento,
        telefono: proforma.cliente.telefono,
        direccion: proforma.cliente.direccion,
      },
      vendedor: {
        id: proforma.usuario.id,
        username: proforma.usuario.username,
        nombre_completo: proforma.usuario.nombre_completo,
      },
      observaciones: proforma.observaciones,
      items: itemsFormateados,
      resumen_carga: {
        total_items: itemsFormateados.length,
        total_unidades_base: Number(totalUnidadesBase.toFixed(3)),
        total_monetario: Number(proforma.total),
      },
    };
  }

  async consultarProformas(dto: ConsultarProformasDto) {
    const page = Math.max(1, dto.page || 1);
    const limit = Math.min(100, Math.max(1, dto.limit || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.proformaWhereInput = {
      cliente_id: dto.cliente_id || undefined,
      ubicacion_id: dto.ubicacion_id || undefined,
      estado: dto.estado || undefined,
      creado_en: {
        gte: dto.fecha_desde ? new Date(dto.fecha_desde) : undefined,
        lte: dto.fecha_hasta ? new Date(dto.fecha_hasta) : undefined,
      },
    };

    const [total, items] = await Promise.all([
      this.prisma.proforma.count({ where }),
      this.prisma.proforma.findMany({
        where,
        include: {
          cliente: {
            select: {
              id: true,
              razon_social: true,
              numero_documento: true,
              tipo_documento: true,
            },
          },
          ubicacion: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
            },
          },
          usuario: {
            select: {
              id: true,
              username: true,
              nombre_completo: true,
            },
          },
          proforma_detalle: {
            include: {
              producto: {
                select: {
                  id: true,
                  codigo_interno: true,
                  nombre: true,
                  unidad_base: true,
                },
              },
            },
          },
        },
        orderBy: { creado_en: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      pagina: page,
      limite: limit,
      total_paginas: Math.ceil(total / limit),
      items: items.map((p) => ({
        id: p.id,
        numero: p.numero,
        estado: p.estado,
        cliente: p.cliente,
        ubicacion: p.ubicacion,
        usuario: p.usuario,
        total_items: p.proforma_detalle.length,
        subtotal: Number(p.subtotal),
        igv: Number(p.igv),
        total: Number(p.total),
        creado_en: p.creado_en,
      })),
    };
  }

  async buscarPorId(id: string, customPrisma?: Prisma.TransactionClient) {
    const client = customPrisma || this.prisma;
    const proforma = await client.proforma.findUnique({
      where: { id },
      include: {
        cliente: true,
        lista_precio: true,
        ubicacion: true,
        usuario: {
          select: {
            id: true,
            username: true,
            nombre_completo: true,
          },
        },
        proforma_detalle: {
          include: {
            producto: true,
            presentacion: true,
          },
        },
      },
    });

    if (!proforma) {
      throw new NotFoundException(`Proforma con ID '${id}' no encontrada.`);
    }

    return proforma;
  }

  private validarTransicionEstado(actual: EstadoProforma, nuevo: EstadoProforma) {
    const permitidas: Record<EstadoProforma, EstadoProforma[]> = {
      [EstadoProforma.BORRADOR]: [EstadoProforma.RESERVADO, EstadoProforma.ANULADO],
      [EstadoProforma.RESERVADO]: [
        EstadoProforma.PREPARADO,
        EstadoProforma.DESPACHADO,
        EstadoProforma.ANULADO,
      ],
      [EstadoProforma.PREPARADO]: [EstadoProforma.DESPACHADO, EstadoProforma.ANULADO],
      [EstadoProforma.DESPACHADO]: [],
      [EstadoProforma.ANULADO]: [],
    };

    const validas = permitidas[actual] || [];
    if (!validas.includes(nuevo)) {
      throw new BadRequestException(
        `Transición no permitida: no se puede pasar una proforma de '${actual}' a '${nuevo}'.`,
      );
    }
  }

  private validarPermisoRol(nuevoEstado: EstadoProforma, rol: string, estadoActual: EstadoProforma) {
    if (nuevoEstado === EstadoProforma.PREPARADO || nuevoEstado === EstadoProforma.DESPACHADO) {
      const rolesAutorizados = [
        RolUsuario.ADMINISTRADOR_PROPIETARIO,
        RolUsuario.ADMINISTRADOR_SECUNDARIO,
        RolUsuario.OPERADOR_ALMACEN,
      ];
      if (!rolesAutorizados.includes(rol as RolUsuario)) {
        throw new ForbiddenException(
          `El rol '${rol}' no tiene permisos para cambiar el estado a '${nuevoEstado}'. Solo el personal de almacén y administradores pueden procesar la carga y el despacho.`,
        );
      }
    }
  }
}
