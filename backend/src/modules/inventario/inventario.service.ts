import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { KardexService } from '../kardex/kardex.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { RegistrarIngresoDto } from './dto/registrar-ingreso.dto';
import { RegistrarSalidaDto } from './dto/registrar-salida.dto';
import { RegistrarAjusteDto } from './dto/registrar-ajuste.dto';
import { ConsultarStockDto } from './dto/consultar-stock.dto';

interface SaldoBloqueado {
  cantidad_fisica: Prisma.Decimal | number | string;
  cantidad_reservada: Prisma.Decimal | number | string;
}

@Injectable()
export class InventarioService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kardexService: KardexService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Registro atómico de ENTRADA en almacén (compra / recepción).
   * Incrementa stock_saldo.cantidad_fisica y registra movimiento_kardex positivo.
   */
  async registrarIngreso(
    dto: RegistrarIngresoDto,
    usuarioId: string,
    ipOrigen?: string,
  ) {
    await this.validarProductoYUbicacion(dto.producto_id, dto.ubicacion_id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Asegurar existencia del registro de saldo
      await tx.$executeRaw`
        INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
        VALUES (${dto.producto_id}::uuid, ${dto.ubicacion_id}::uuid, 0, 0, NOW())
        ON CONFLICT (producto_id, ubicacion_id) DO NOTHING
      `;

      // 2. Bloqueo pesimista de la fila de saldo para evitar condiciones de carrera
      const saldos = await tx.$queryRaw<SaldoBloqueado[]>`
        SELECT cantidad_fisica, cantidad_reservada
        FROM stock_saldo
        WHERE producto_id = ${dto.producto_id}::uuid AND ubicacion_id = ${dto.ubicacion_id}::uuid
        FOR UPDATE
      `;

      const saldoActual = saldos[0];
      const fisicaActual = Number(saldoActual.cantidad_fisica);
      const reservadaActual = Number(saldoActual.cantidad_reservada);
      const nuevaFisica = Number((fisicaActual + dto.cantidad_base).toFixed(3));

      // 3. Actualizar stock_saldo
      await tx.$executeRaw`
        UPDATE stock_saldo
        SET cantidad_fisica = ${nuevaFisica}::numeric,
            actualizado_en = NOW()
        WHERE producto_id = ${dto.producto_id}::uuid AND ubicacion_id = ${dto.ubicacion_id}::uuid
      `;

      // 4. Registrar en Kárdex (Libro append-only inmutable)
      const movimiento = await this.kardexService.registrarMovimiento(tx, {
        producto_id: dto.producto_id,
        ubicacion_id: dto.ubicacion_id,
        tipo: 'ENTRADA',
        cantidad_base: dto.cantidad_base,
        costo_unitario: dto.costo_unitario,
        documento_tipo: dto.documento_tipo || 'INGRESO_MANUAL',
        documento_id: dto.documento_id,
        motivo: dto.motivo,
        usuario_id: usuarioId,
        dispositivo_id: dto.dispositivo_id,
      });

      // 5. Auditoría
      await this.auditoriaService.registrarEvento({
        entidad: 'stock_saldo',
        registro_id: movimiento.id,
        accion: 'UPDATE',
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
        valor_anterior: { cantidad_fisica: fisicaActual },
        valor_nuevo: {
          producto_id: dto.producto_id,
          ubicacion_id: dto.ubicacion_id,
          cantidad_fisica: nuevaFisica,
          tipo_operacion: 'ENTRADA',
        },
      });

      return {
        mensaje: 'Ingreso registrado correctamente en inventario y Kárdex',
        movimiento_id: movimiento.id,
        saldo: {
          producto_id: dto.producto_id,
          ubicacion_id: dto.ubicacion_id,
          cantidad_fisica: nuevaFisica,
          cantidad_reservada: reservadaActual,
          cantidad_disponible: Number((nuevaFisica - reservadaActual).toFixed(3)),
        },
      };
    });
  }

  /**
   * Registro atómico de SALIDA de almacén (merma / salida manual).
   * Valida disponibilidad estricta, decrementa física y registra movimiento negativo.
   */
  async registrarSalida(
    dto: RegistrarSalidaDto,
    usuarioId: string,
    ipOrigen?: string,
  ) {
    await this.validarProductoYUbicacion(dto.producto_id, dto.ubicacion_id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Asegurar existencia de la fila
      await tx.$executeRaw`
        INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
        VALUES (${dto.producto_id}::uuid, ${dto.ubicacion_id}::uuid, 0, 0, NOW())
        ON CONFLICT (producto_id, ubicacion_id) DO NOTHING
      `;

      // 2. Bloqueo pesimista
      const saldos = await tx.$queryRaw<SaldoBloqueado[]>`
        SELECT cantidad_fisica, cantidad_reservada
        FROM stock_saldo
        WHERE producto_id = ${dto.producto_id}::uuid AND ubicacion_id = ${dto.ubicacion_id}::uuid
        FOR UPDATE
      `;

      const saldoActual = saldos[0];
      const fisicaActual = Number(saldoActual.cantidad_fisica);
      const reservadaActual = Number(saldoActual.cantidad_reservada);
      const disponibleActual = Number((fisicaActual - reservadaActual).toFixed(3));

      // 3. Regla de dominio: Validar saldo disponible antes de salida
      if (dto.cantidad_base > disponibleActual) {
        throw new BadRequestException(
          `Stock insuficiente para realizar la salida. Disponible: ${disponibleActual}, Solicitado: ${dto.cantidad_base}`,
        );
      }

      const nuevaFisica = Number((fisicaActual - dto.cantidad_base).toFixed(3));
      if (nuevaFisica < 0) {
        throw new BadRequestException('El stock físico no puede quedar en negativo.');
      }

      // 4. Actualizar stock_saldo
      await tx.$executeRaw`
        UPDATE stock_saldo
        SET cantidad_fisica = ${nuevaFisica}::numeric,
            actualizado_en = NOW()
        WHERE producto_id = ${dto.producto_id}::uuid AND ubicacion_id = ${dto.ubicacion_id}::uuid
      `;

      // 5. Registrar en Kárdex (cantidad_base negativa para salida)
      const movimiento = await this.kardexService.registrarMovimiento(tx, {
        producto_id: dto.producto_id,
        ubicacion_id: dto.ubicacion_id,
        tipo: 'SALIDA',
        cantidad_base: -dto.cantidad_base,
        documento_tipo: dto.documento_tipo || 'SALIDA_MANUAL',
        documento_id: dto.documento_id,
        motivo: dto.motivo,
        usuario_id: usuarioId,
        dispositivo_id: dto.dispositivo_id,
      });

      // 6. Auditoría
      await this.auditoriaService.registrarEvento({
        entidad: 'stock_saldo',
        registro_id: movimiento.id,
        accion: 'UPDATE',
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
        valor_anterior: { cantidad_fisica: fisicaActual },
        valor_nuevo: {
          producto_id: dto.producto_id,
          ubicacion_id: dto.ubicacion_id,
          cantidad_fisica: nuevaFisica,
          tipo_operacion: 'SALIDA',
        },
      });

      return {
        mensaje: 'Salida registrada correctamente en inventario y Kárdex',
        movimiento_id: movimiento.id,
        saldo: {
          producto_id: dto.producto_id,
          ubicacion_id: dto.ubicacion_id,
          cantidad_fisica: nuevaFisica,
          cantidad_reservada: reservadaActual,
          cantidad_disponible: Number((nuevaFisica - reservadaActual).toFixed(3)),
        },
      };
    });
  }

  /**
   * Registro atómico de AJUSTE físico de inventario.
   * Exige OBLIGATORIAMENTE un motivo descriptivo.
   * Puede ser compensatorio positivo o negativo.
   */
  async registrarAjuste(
    dto: RegistrarAjusteDto,
    usuarioId: string,
    ipOrigen?: string,
  ) {
    if (!dto.motivo || dto.motivo.trim().length === 0) {
      throw new BadRequestException('El motivo es obligatorio para registrar un ajuste de inventario.');
    }

    await this.validarProductoYUbicacion(dto.producto_id, dto.ubicacion_id);

    return this.prisma.$transaction(async (tx) => {
      // 1. Asegurar existencia de la fila
      await tx.$executeRaw`
        INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
        VALUES (${dto.producto_id}::uuid, ${dto.ubicacion_id}::uuid, 0, 0, NOW())
        ON CONFLICT (producto_id, ubicacion_id) DO NOTHING
      `;

      // 2. Bloqueo pesimista
      const saldos = await tx.$queryRaw<SaldoBloqueado[]>`
        SELECT cantidad_fisica, cantidad_reservada
        FROM stock_saldo
        WHERE producto_id = ${dto.producto_id}::uuid AND ubicacion_id = ${dto.ubicacion_id}::uuid
        FOR UPDATE
      `;

      const saldoActual = saldos[0];
      const fisicaActual = Number(saldoActual.cantidad_fisica);
      const reservadaActual = Number(saldoActual.cantidad_reservada);
      const disponibleActual = Number((fisicaActual - reservadaActual).toFixed(3));

      // Si el ajuste es negativo, validar que no exceda el disponible
      if (dto.diferencia_base < 0 && Math.abs(dto.diferencia_base) > disponibleActual) {
        throw new BadRequestException(
          `No se puede reducir el stock en ${Math.abs(dto.diferencia_base)} unidades porque el saldo disponible es ${disponibleActual}.`,
        );
      }

      const nuevaFisica = Number((fisicaActual + dto.diferencia_base).toFixed(3));
      if (nuevaFisica < 0) {
        throw new BadRequestException('El stock físico resultante del ajuste no puede ser negativo.');
      }

      // 3. Actualizar stock_saldo
      await tx.$executeRaw`
        UPDATE stock_saldo
        SET cantidad_fisica = ${nuevaFisica}::numeric,
            actualizado_en = NOW()
        WHERE producto_id = ${dto.producto_id}::uuid AND ubicacion_id = ${dto.ubicacion_id}::uuid
      `;

      // 4. Registrar en Kárdex (diferencia con su signo)
      const movimiento = await this.kardexService.registrarMovimiento(tx, {
        producto_id: dto.producto_id,
        ubicacion_id: dto.ubicacion_id,
        tipo: 'AJUSTE',
        cantidad_base: dto.diferencia_base,
        costo_unitario: dto.costo_unitario,
        documento_tipo: 'AJUSTE_INVENTARIO',
        motivo: dto.motivo.trim(),
        usuario_id: usuarioId,
        dispositivo_id: dto.dispositivo_id,
      });

      // 5. Auditoría
      await this.auditoriaService.registrarEvento({
        entidad: 'stock_saldo',
        registro_id: movimiento.id,
        accion: 'UPDATE',
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
        valor_anterior: { cantidad_fisica: fisicaActual },
        valor_nuevo: {
          producto_id: dto.producto_id,
          ubicacion_id: dto.ubicacion_id,
          cantidad_fisica: nuevaFisica,
          diferencia: dto.diferencia_base,
          motivo: dto.motivo.trim(),
        },
      });

      return {
        mensaje: 'Ajuste de inventario registrado correctamente',
        movimiento_id: movimiento.id,
        saldo: {
          producto_id: dto.producto_id,
          ubicacion_id: dto.ubicacion_id,
          cantidad_fisica: nuevaFisica,
          cantidad_reservada: reservadaActual,
          cantidad_disponible: Number((nuevaFisica - reservadaActual).toFixed(3)),
        },
      };
    });
  }

  /**
   * Consulta de saldos por almacén y producto (físico, reservado y disponible).
   */
  async consultarStock(dto: ConsultarStockDto) {
    const where: Prisma.stock_saldoWhereInput = {
      producto_id: dto.producto_id || undefined,
      ubicacion_id: dto.ubicacion_id || undefined,
      cantidad_fisica: dto.solo_con_stock ? { gt: 0 } : undefined,
    };

    const saldos = await this.prisma.stock_saldo.findMany({
      where,
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
        ubicacion: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            tipo: true,
            activo: true,
          },
        },
      },
      orderBy: [{ ubicacion_id: 'asc' }, { producto_id: 'asc' }],
    });

    return saldos.map((s) => {
      const fisica = Number(s.cantidad_fisica);
      const reservada = Number(s.cantidad_reservada);
      const disponible = Number((fisica - reservada).toFixed(3));

      return {
        producto: s.producto,
        ubicacion: s.ubicacion,
        cantidad_fisica: fisica,
        cantidad_reservada: reservada,
        cantidad_disponible: disponible,
        actualizado_en: s.actualizado_en,
      };
    });
  }

  private async validarProductoYUbicacion(productoId: string, ubicacionId: string) {
    const [producto, ubicacion] = await Promise.all([
      this.prisma.producto.findUnique({ where: { id: productoId } }),
      this.prisma.ubicacion.findUnique({ where: { id: ubicacionId } }),
    ]);

    if (!producto) {
      throw new NotFoundException(`El producto con ID '${productoId}' no existe.`);
    }
    if (!producto.activo) {
      throw new BadRequestException(`El producto '${producto.nombre}' está inactivo.`);
    }
    if (!ubicacion) {
      throw new NotFoundException(`La ubicación con ID '${ubicacionId}' no existe.`);
    }
    if (!ubicacion.activo) {
      throw new BadRequestException(`La ubicación '${ubicacion.nombre}' está inactiva.`);
    }
  }
}
