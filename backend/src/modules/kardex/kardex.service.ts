import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { PromedioPonderadoStrategy } from './strategies/promedio-ponderado.strategy';
import { ConsultarKardexDto } from './dto/consultar-kardex.dto';
import { randomUUID } from 'crypto';

export interface RegistrarMovimientoParams {
  id?: string;
  producto_id: string;
  ubicacion_id: string;
  tipo:
    | 'ENTRADA'
    | 'ENTRADA_COMPRA'
    | 'INVENTARIO_INICIAL'
    | 'SALIDA'
    | 'TRASLADO_SALIDA'
    | 'TRASLADO_ENTRADA'
    | 'AJUSTE'
    | 'ASIGNACION_DISTRIBUCION'
    | 'VENTA_RUTA'
    | 'RETORNO_DISTRIBUCION'
    | 'ANULACION';
  cantidad_base: number; // Positiva para ingresos/ajustes positivos, negativa para salidas
  costo_unitario?: number | null;
  documento_tipo?: string;
  documento_id?: string;
  movimiento_ref_id?: string;
  lote_id?: string;
  motivo?: string;
  usuario_id: string;
  dispositivo_id?: string;
  fecha_operacion?: Date;
}

@Injectable()
export class KardexService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly valorizacionStrategy: PromedioPonderadoStrategy,
  ) {}

  /**
   * INVARIANTE INNEGOCIABLE DEL KÁRDEX:
   * Es un libro mayor de solo inserción. Se ejecuta dentro de la transacción activa (tx)
   * junto a la actualización atómica del saldo en stock_saldo.
   */
  async registrarMovimiento(
    tx: Prisma.TransactionClient,
    params: RegistrarMovimientoParams,
  ) {
    const id = params.id || randomUUID();

    // 1. Obtener movimientos previos para calcular o validar el costo unitario según la estrategia
    const previos = await tx.movimiento_kardex.findMany({
      where: {
        producto_id: params.producto_id,
        ubicacion_id: params.ubicacion_id,
      },
      select: {
        cantidad_base: true,
        costo_unitario: true,
        tipo: true,
      },
      orderBy: { fecha_operacion: 'asc' },
    });

    const movimientosHistoricos = previos.map((p) => ({
      cantidad_base: Number(p.cantidad_base),
      costo_unitario: p.costo_unitario ? Number(p.costo_unitario) : 0,
      tipo: p.tipo,
    }));

    const costoCalculado = this.valorizacionStrategy.calcularCosto(
      movimientosHistoricos,
      {
        cantidad_base: params.cantidad_base,
        costo_unitario: params.costo_unitario,
        tipo: params.tipo,
      },
    );

    const costoFinal = params.costo_unitario !== undefined && params.costo_unitario !== null
      ? params.costo_unitario
      : costoCalculado;

    // 2. Insertar movimiento en Kárdex (Append-Only)
    return tx.movimiento_kardex.create({
      data: {
        id,
        producto_id: params.producto_id,
        ubicacion_id: params.ubicacion_id,
        tipo: params.tipo,
        cantidad_base: new Prisma.Decimal(params.cantidad_base),
        costo_unitario: costoFinal !== null ? new Prisma.Decimal(costoFinal) : null,
        documento_tipo: params.documento_tipo || null,
        documento_id: params.documento_id || null,
        movimiento_ref_id: params.movimiento_ref_id || null,
        lote_id: params.lote_id || null,
        motivo: params.motivo?.trim() || null,
        usuario_id: params.usuario_id,
        dispositivo_id: params.dispositivo_id || null,
        fecha_operacion: params.fecha_operacion || new Date(),
      },
    });
  }

  /**
   * Consulta paginada y filtrada del Kárdex (Solo Lectura).
   */
  async consultar(dto: ConsultarKardexDto) {
    const page = Math.max(1, dto.page || 1);
    const limit = Math.min(100, Math.max(1, dto.limit || 50));
    const skip = (page - 1) * limit;

    const where: Prisma.movimiento_kardexWhereInput = {
      producto_id: dto.producto_id || undefined,
      ubicacion_id: dto.ubicacion_id || undefined,
      tipo: dto.tipo || undefined,
      fecha_operacion: {
        gte: dto.fecha_desde ? new Date(dto.fecha_desde) : undefined,
        lte: dto.fecha_hasta ? new Date(dto.fecha_hasta) : undefined,
      },
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
      items: items.map((m) => ({
        id: m.id,
        producto: m.producto,
        ubicacion: m.ubicacion,
        tipo: m.tipo,
        cantidad_base: Number(m.cantidad_base),
        costo_unitario: m.costo_unitario ? Number(m.costo_unitario) : null,
        documento_tipo: m.documento_tipo,
        documento_id: m.documento_id,
        motivo: m.motivo,
        usuario: m.usuario,
        fecha_operacion: m.fecha_operacion,
        fecha_registro: m.fecha_registro,
      })),
    };
  }

  /**
   * Conciliación matemática en tiempo real entre la suma de movimientos
   * del Kárdex y el saldo físico materializado en stock_saldo.
   */
  async conciliar(productoId: string, ubicacionId: string) {
    const aggregate = await this.prisma.movimiento_kardex.aggregate({
      where: {
        producto_id: productoId,
        ubicacion_id: ubicacionId,
      },
      _sum: {
        cantidad_base: true,
      },
    });

    const saldo = await this.prisma.stock_saldo.findUnique({
      where: {
        producto_id_ubicacion_id: {
          producto_id: productoId,
          ubicacion_id: ubicacionId,
        },
      },
    });

    const totalKardex = Number(aggregate._sum.cantidad_base || 0);
    const saldoFisico = Number(saldo?.cantidad_fisica || 0);
    const discrepancia = Number((saldoFisico - totalKardex).toFixed(3));

    return {
      producto_id: productoId,
      ubicacion_id: ubicacionId,
      total_kardex: totalKardex,
      saldo_fisico: saldoFisico,
      saldo_reservado: Number(saldo?.cantidad_reservada || 0),
      discrepancia,
      conciliado: discrepancia === 0,
    };
  }
}
