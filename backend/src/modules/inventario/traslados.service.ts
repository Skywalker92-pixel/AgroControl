import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { KardexService } from '../kardex/kardex.service';
import { RegistrarTrasladoDto } from './dto/registrar-traslado.dto';
import { ConsultarTrasladosDto } from './dto/consultar-traslados.dto';
import { randomUUID } from 'crypto';

interface SaldoBloqueado {
  ubicacion_id: string;
  cantidad_fisica: Prisma.Decimal | number | string;
  cantidad_reservada: Prisma.Decimal | number | string;
}

@Injectable()
export class TrasladosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kardexService: KardexService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Ejecuta un traslado atómico de mercadería entre dos almacenes físicos.
   * Reglas Innegociables:
   * 1. Transacción interactiva única con bloqueo pesimista ordenado de origen y destino.
   * 2. Doble movimiento en Kárdex: TRASLADO_SALIDA (-X) y TRASLADO_ENTRADA (+X) enlazados.
   * 3. Delta cero: El stock global de la empresa no sufre variación alguna.
   * 4. Motivo obligatorio y verificación estricta de saldo disponible en origen.
   */
  async registrarTraslado(
    dto: RegistrarTrasladoDto,
    usuarioId: string,
    ipOrigen?: string,
  ) {
    // 1. Validaciones de negocio previas
    if (dto.origen_id === dto.destino_id) {
      throw new BadRequestException(
        'El almacén de origen y destino no pueden ser el mismo.',
      );
    }

    if (!dto.motivo || dto.motivo.trim().length === 0) {
      throw new BadRequestException(
        'El motivo del traslado es obligatorio.',
      );
    }

    await this.validarProductoYUbicaciones(
      dto.producto_id,
      dto.origen_id,
      dto.destino_id,
    );

    // 2. Orden determinista de bloqueo para prevenir deadlocks
    const [primeraUbicacion, segundaUbicacion] = [
      dto.origen_id,
      dto.destino_id,
    ].sort();

    return this.prisma.$transaction(async (tx) => {
      // a) Asegurar que existan filas en stock_saldo para ambas ubicaciones
      await tx.$executeRaw`
        INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
        VALUES (${dto.producto_id}::uuid, ${primeraUbicacion}::uuid, 0, 0, NOW())
        ON CONFLICT (producto_id, ubicacion_id) DO NOTHING
      `;
      await tx.$executeRaw`
        INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
        VALUES (${dto.producto_id}::uuid, ${segundaUbicacion}::uuid, 0, 0, NOW())
        ON CONFLICT (producto_id, ubicacion_id) DO NOTHING
      `;

      // b) Bloqueo pesimista ordenado de ambas filas
      const saldos = await tx.$queryRaw<SaldoBloqueado[]>`
        SELECT ubicacion_id, cantidad_fisica, cantidad_reservada
        FROM stock_saldo
        WHERE producto_id = ${dto.producto_id}::uuid 
          AND ubicacion_id IN (${dto.origen_id}::uuid, ${dto.destino_id}::uuid)
        ORDER BY ubicacion_id ASC
        FOR UPDATE
      `;

      const saldoOrigen = saldos.find((s) => s.ubicacion_id === dto.origen_id);
      const saldoDestino = saldos.find((s) => s.ubicacion_id === dto.destino_id);

      if (!saldoOrigen || !saldoDestino) {
        throw new BadRequestException('Error al bloquear saldos para el traslado.');
      }

      const fisicaOrigen = Number(saldoOrigen.cantidad_fisica);
      const reservadaOrigen = Number(saldoOrigen.cantidad_reservada);
      const disponibleOrigen = Number((fisicaOrigen - reservadaOrigen).toFixed(3));

      const fisicaDestino = Number(saldoDestino.cantidad_fisica);
      const reservadaDestino = Number(saldoDestino.cantidad_reservada);

      // c) Validar disponibilidad estricta en el almacén de origen
      if (dto.cantidad_base > disponibleOrigen) {
        throw new BadRequestException(
          `Stock disponible insuficiente en el almacén de origen. Disponible: ${disponibleOrigen}, Solicitado para traslado: ${dto.cantidad_base}`,
        );
      }

      const nuevaFisicaOrigen = Number((fisicaOrigen - dto.cantidad_base).toFixed(3));
      const nuevaFisicaDestino = Number((fisicaDestino + dto.cantidad_base).toFixed(3));

      if (nuevaFisicaOrigen < 0) {
        throw new BadRequestException('El stock físico en origen no puede quedar negativo.');
      }

      // d) Actualizar saldo en origen (descuento)
      await tx.$executeRaw`
        UPDATE stock_saldo
        SET cantidad_fisica = ${nuevaFisicaOrigen}::numeric,
            actualizado_en = NOW()
        WHERE producto_id = ${dto.producto_id}::uuid AND ubicacion_id = ${dto.origen_id}::uuid
      `;

      // e) Actualizar saldo en destino (incremento)
      await tx.$executeRaw`
        UPDATE stock_saldo
        SET cantidad_fisica = ${nuevaFisicaDestino}::numeric,
            actualizado_en = NOW()
        WHERE producto_id = ${dto.producto_id}::uuid AND ubicacion_id = ${dto.destino_id}::uuid
      `;

      // f) Generar doble movimiento en Kárdex enlazados por movimiento_ref_id
      const salidaId = randomUUID();
      const entradaId = randomUUID();
      const fechaOperacion = new Date();
      const docTipo = dto.documento_tipo || 'GUIA_TRASLADO_INTERNO';

      // Movimiento 1: TRASLADO_SALIDA (origen, cantidad negativa)
      await this.kardexService.registrarMovimiento(tx, {
        id: salidaId,
        producto_id: dto.producto_id,
        ubicacion_id: dto.origen_id,
        tipo: 'TRASLADO_SALIDA',
        cantidad_base: -dto.cantidad_base,
        documento_tipo: docTipo,
        documento_id: dto.documento_id,
        motivo: dto.motivo.trim(),
        usuario_id: usuarioId,
        dispositivo_id: dto.dispositivo_id,
        fecha_operacion: fechaOperacion,
      });

      // Movimiento 2: TRASLADO_ENTRADA (destino, cantidad positiva, enlace al movimiento de salida)
      await this.kardexService.registrarMovimiento(tx, {
        id: entradaId,
        producto_id: dto.producto_id,
        ubicacion_id: dto.destino_id,
        tipo: 'TRASLADO_ENTRADA',
        cantidad_base: dto.cantidad_base,
        documento_tipo: docTipo,
        documento_id: dto.documento_id,
        movimiento_ref_id: salidaId, // Enlace de trazabilidad
        motivo: dto.motivo.trim(),
        usuario_id: usuarioId,
        dispositivo_id: dto.dispositivo_id,
        fecha_operacion: fechaOperacion,
      });

      // g) Registrar evento de auditoría
      await this.auditoriaService.registrarEvento({
        entidad: 'traslado',
        registro_id: salidaId,
        accion: 'INSERT',
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
        valor_nuevo: {
          traslado_id: salidaId,
          movimiento_salida_id: salidaId,
          movimiento_entrada_id: entradaId,
          producto_id: dto.producto_id,
          origen_id: dto.origen_id,
          destino_id: dto.destino_id,
          cantidad_base: dto.cantidad_base,
          motivo: dto.motivo.trim(),
        },
      });

      return {
        mensaje: 'Traslado entre almacenes ejecutado exitosamente',
        traslado_id: salidaId,
        movimiento_salida_id: salidaId,
        movimiento_entrada_id: entradaId,
        producto_id: dto.producto_id,
        cantidad_base: dto.cantidad_base,
        origen: {
          id: dto.origen_id,
          cantidad_fisica: nuevaFisicaOrigen,
          cantidad_disponible: Number((nuevaFisicaOrigen - reservadaOrigen).toFixed(3)),
        },
        destino: {
          id: dto.destino_id,
          cantidad_fisica: nuevaFisicaDestino,
          cantidad_disponible: Number((nuevaFisicaDestino - reservadaDestino).toFixed(3)),
        },
        delta_global: 0,
      };
    });
  }

  /**
   * Consulta paginada y filtrada del historial de traslados entre almacenes.
   */
  async consultarTraslados(dto: ConsultarTrasladosDto) {
    const page = Math.max(1, dto.page || 1);
    const limit = Math.min(100, Math.max(1, dto.limit || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.movimiento_kardexWhereInput = {
      tipo: 'TRASLADO_SALIDA',
      producto_id: dto.producto_id || undefined,
      ubicacion_id: dto.origen_id || undefined,
      fecha_operacion: {
        gte: dto.fecha_desde ? new Date(dto.fecha_desde) : undefined,
        lte: dto.fecha_hasta ? new Date(dto.fecha_hasta) : undefined,
      },
      other_movimiento_kardex: dto.destino_id
        ? { some: { ubicacion_id: dto.destino_id } }
        : undefined,
    };

    const [total, items] = await Promise.all([
      this.prisma.movimiento_kardex.count({ where }),
      this.prisma.movimiento_kardex.findMany({
        where,
        include: {
          producto: {
            select: {
              id: true,
              codigo_interno: true,
              nombre: true,
              unidad_base: true,
            },
          },
          ubicacion: {
            select: {
              id: true,
              codigo: true,
              nombre: true,
              tipo: true,
            },
          },
          usuario: {
            select: {
              id: true,
              username: true,
              nombre_completo: true,
            },
          },
          other_movimiento_kardex: {
            select: {
              id: true,
              cantidad_base: true,
              fecha_operacion: true,
              ubicacion: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  tipo: true,
                },
              },
            },
          },
        },
        orderBy: { fecha_operacion: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      total,
      pagina: page,
      limite: limit,
      total_paginas: Math.ceil(total / limit),
      items: items.map((m) => {
        const entrada = m.other_movimiento_kardex[0];
        return {
          id: m.id,
          fecha_operacion: m.fecha_operacion,
          producto: m.producto,
          origen: m.ubicacion,
          destino: entrada ? entrada.ubicacion : null,
          cantidad_base: Math.abs(Number(m.cantidad_base)),
          motivo: m.motivo,
          documento_tipo: m.documento_tipo,
          documento_id: m.documento_id,
          usuario: m.usuario,
          movimiento_salida_id: m.id,
          movimiento_entrada_id: entrada ? entrada.id : null,
        };
      }),
    };
  }

  private async validarProductoYUbicaciones(
    productoId: string,
    origenId: string,
    destinoId: string,
  ) {
    const [producto, origen, destino] = await Promise.all([
      this.prisma.producto.findUnique({ where: { id: productoId } }),
      this.prisma.ubicacion.findUnique({ where: { id: origenId } }),
      this.prisma.ubicacion.findUnique({ where: { id: destinoId } }),
    ]);

    if (!producto) {
      throw new NotFoundException(`El producto con ID '${productoId}' no existe.`);
    }
    if (!producto.activo) {
      throw new BadRequestException(`El producto '${producto.nombre}' está inactivo.`);
    }

    if (!origen) {
      throw new NotFoundException(`El almacén de origen con ID '${origenId}' no existe.`);
    }
    if (!origen.activo) {
      throw new BadRequestException(`El almacén de origen '${origen.nombre}' está inactivo.`);
    }
    if (origen.tipo === 'BODEGA_MOVIL') {
      throw new BadRequestException(
        'El almacén de origen no puede ser una BODEGA_MOVIL en traslados físicos de Fase 1.',
      );
    }

    if (!destino) {
      throw new NotFoundException(`El almacén de destino con ID '${destinoId}' no existe.`);
    }
    if (!destino.activo) {
      throw new BadRequestException(`El almacén de destino '${destino.nombre}' está inactivo.`);
    }
    if (destino.tipo === 'BODEGA_MOVIL') {
      throw new BadRequestException(
        'El almacén de destino no puede ser una BODEGA_MOVIL en traslados físicos de Fase 1.',
      );
    }
  }
}
