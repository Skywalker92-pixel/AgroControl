import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { CrearLiquidacionDto } from './dto/crear-liquidacion.dto';
import { ConsultarLiquidacionesDto } from './dto/consultar-liquidaciones.dto';
import { randomUUID } from 'crypto';

interface SaldoBloqueado {
  ubicacion_id: string;
  cantidad_fisica: Prisma.Decimal | number | string;
  cantidad_reservada: Prisma.Decimal | number | string;
}

@Injectable()
export class LiquidacionesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Ejecuta la liquidación atómica física y financiera de una carga en ruta.
   * Reglas de Dominio Innegociables (Hito 9 / RF-80 / SKILL 3 y 5):
   * 1. Rol administrativo exclusivo (ADMINISTRADOR_PROPIETARIO, ADMINISTRADOR_SECUNDARIO, OPERADOR_ALMACEN).
   * 2. La carga debe estar estrictamente en estado EN_RUTA.
   * 3. Ecuación fundamental: Carga Inicial = Vendido + Retornado + Diferencia.
   * 4. Toda diferencia != 0 exige justificación administrativa (min 5 caracteres).
   * 5. En una sola transacción interactiva con bloqueo pesimista:
   *    - Descuenta lo vendido de BODEGA_MOVIL con Kárdex VENTA_RUTA.
   *    - Reintegra lo retornado de BODEGA_MOVIL a almacén de origen con Kárdex RETORNO_DISTRIBUCION enlazado.
   *    - Registra ajuste compensatorio en BODEGA_MOVIL para las diferencias.
   *    - El stock en BODEGA_MOVIL queda en cero (o saldo neto exacto).
   *    - Cambia estado de la carga a FINALIZADA con fecha_cierre.
   * 6. Cuadre monetario: Total Vendido (S/) vs Total Dinero Entregado.
   *    - Si coincide y sin discrepancias físicas: CONCILIADA.
   *    - Si hay diferencia en dinero o existencias: OBSERVADA.
   */
  async liquidarCarga(
    dto: CrearLiquidacionDto,
    usuarioId: string,
    usuarioRol: string,
    ipOrigen?: string,
  ) {
    // 1. Control de acceso estricto por rol (RBAC)
    const rolesPermitidos = [
      'ADMINISTRADOR_PROPIETARIO',
      'ADMINISTRADOR_SECUNDARIO',
      'OPERADOR_ALMACEN',
    ];
    if (!rolesPermitidos.includes(usuarioRol)) {
      throw new ForbiddenException(
        'Acceso denegado: Solo el personal administrativo del establecimiento comercial puede liquidar cargas de ruta.',
      );
    }

    // 2. Validar existencia y estado de la carga
    const carga = await this.prisma.carga_distribucion.findUnique({
      where: { id: dto.carga_distribucion_id },
      include: {
        carga_detalle: {
          include: {
            producto: true,
            presentacion: true,
          },
        },
        vehiculo: true,
        almacen_origen: true,
        bodega_movil: true,
        trabajador: true,
        liquidacion: true,
      },
    });

    if (!carga) {
      throw new NotFoundException(
        `La carga de distribución con ID '${dto.carga_distribucion_id}' no existe.`,
      );
    }

    if (carga.liquidacion) {
      throw new BadRequestException(
        `La carga '${carga.codigo}' ya fue liquidada previamente con el código '${carga.liquidacion.codigo}'.`,
      );
    }

    if (carga.estado !== 'EN_RUTA') {
      throw new BadRequestException(
        `Solo es posible liquidar cargas que se encuentren en estado EN_RUTA. Estado actual: ${carga.estado}`,
      );
    }

    // 3. Validación de ítems y cumplimiento de la ecuación de ruta
    const itemsValidados: Array<{
      producto_id: string;
      producto_nombre: string;
      presentacion_id?: string | null;
      cantidad_cargada: number;
      cantidad_vendida: number;
      cantidad_retornada: number;
      diferencia: number;
      justificacion?: string | null;
      precio_unitario_promedio: number;
      subtotal_vendido: number;
    }> = [];

    let totalVendidoCalculado = 0;
    let hayDiferenciasFisicas = false;

    for (const detalleCarga of carga.carga_detalle) {
      const prodId = detalleCarga.producto_id;
      const cantCargada = Number(detalleCarga.cantidad_total_base);

      // Buscar ítem reportado en el DTO
      const itemDto = dto.items.find(
        (i) =>
          i.producto_id === prodId &&
          (i.presentacion_id === detalleCarga.presentacion_id ||
            (!i.presentacion_id && !detalleCarga.presentacion_id)),
      ) || dto.items.find((i) => i.producto_id === prodId);

      if (!itemDto) {
        throw new BadRequestException(
          `Debe reportar la liquidación para el producto '${detalleCarga.producto.nombre}' ([${detalleCarga.producto.codigo_interno}]).`,
        );
      }

      const vendida = Number(itemDto.cantidad_vendida);
      const retornada = Number(itemDto.cantidad_retornada);

      if (vendida < 0 || retornada < 0) {
        throw new BadRequestException(
          `Las cantidades vendidas y retornadas no pueden ser negativas para '${detalleCarga.producto.nombre}'.`,
        );
      }

      // Ecuación Fundamental: Diferencia = Carga Inicial - (Vendido + Retornado)
      const diferenciaCalculada = Number((cantCargada - (vendida + retornada)).toFixed(3));

      // Si existe diferencia (faltante o sobrante), se exige justificación
      if (Math.abs(diferenciaCalculada) > 0.0001) {
        hayDiferenciasFisicas = true;
        const justif = (itemDto.justificacion || '').trim();
        if (!justif || justif.length < 5) {
          throw new BadRequestException(
            `Se exige una justificación administrativa de al menos 5 caracteres para la diferencia de ${diferenciaCalculada} unidades en el producto '${detalleCarga.producto.nombre}'.`,
          );
        }
      }

      const precioUnitario = Number(itemDto.precio_unitario_promedio || 0);
      const subtotalVendido = Number((vendida * precioUnitario).toFixed(2));
      totalVendidoCalculado += subtotalVendido;

      itemsValidados.push({
        producto_id: prodId,
        producto_nombre: detalleCarga.producto.nombre,
        presentacion_id: detalleCarga.presentacion_id,
        cantidad_cargada: cantCargada,
        cantidad_vendida: vendida,
        cantidad_retornada: retornada,
        diferencia: diferenciaCalculada,
        justificacion: itemDto.justificacion?.trim() || null,
        precio_unitario_promedio: precioUnitario,
        subtotal_vendido: subtotalVendido,
      });
    }

    const totalCobrado = Number(dto.total_cobrado);
    const diferenciaDinero = Number((totalCobrado - totalVendidoCalculado).toFixed(2));

    // Determinar estado de la liquidación: CONCILIADA u OBSERVADA
    // Es CONCILIADA si no hay diferencia en dinero y tampoco diferencias físicas no cuadradas.
    const estadoLiquidacion: 'CONCILIADA' | 'OBSERVADA' =
      Math.abs(diferenciaDinero) < 0.01 && !hayDiferenciasFisicas
        ? 'CONCILIADA'
        : 'OBSERVADA';

    // 4. Ejecución de la transacción interactiva atómica
    return this.prisma.$transaction(async (tx) => {
      const fechaOperacion = new Date();
      const liquidacionId = randomUUID();

      // a) Generar código secuencial de liquidación: LIQ-YYYYMMDD-XXX
      const hoyStr = fechaOperacion.toISOString().slice(0, 10).replace(/-/g, '');
      const prefijo = `LIQ-${hoyStr}-`;

      const totalHoy = await tx.liquidacion.count({
        where: {
          codigo: { startsWith: prefijo },
        },
      });
      const correlativo = String(totalHoy + 1).padStart(3, '0');
      const codigoLiquidacion = `${prefijo}${correlativo}`;

      // b) Bloqueo pesimista determinístico sobre stock_saldo para almacén origen y bodega móvil
      const [loc1, loc2] = [carga.almacen_origen_id, carga.bodega_movil_id].sort();

      for (const item of itemsValidados) {
        const prodId = item.producto_id;

        // Asegurar que existan los registros en stock_saldo
        await tx.$executeRaw`
          INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
          VALUES (${prodId}::uuid, ${loc1}::uuid, 0, 0, NOW())
          ON CONFLICT (producto_id, ubicacion_id) DO NOTHING
        `;
        await tx.$executeRaw`
          INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
          VALUES (${prodId}::uuid, ${loc2}::uuid, 0, 0, NOW())
          ON CONFLICT (producto_id, ubicacion_id) DO NOTHING
        `;

        // Bloqueo SELECT ... FOR UPDATE ordenado
        const saldos = await tx.$queryRaw<SaldoBloqueado[]>`
          SELECT ubicacion_id, cantidad_fisica, cantidad_reservada
          FROM stock_saldo
          WHERE producto_id = ${prodId}::uuid
            AND ubicacion_id IN (${loc1}::uuid, ${loc2}::uuid)
          ORDER BY ubicacion_id ASC
          FOR UPDATE
        `;

        const saldoBodega = saldos.find((s) => s.ubicacion_id === carga.bodega_movil_id);
        const saldoOrigen = saldos.find((s) => s.ubicacion_id === carga.almacen_origen_id);

        if (!saldoBodega || !saldoOrigen) {
          throw new BadRequestException(
            `Error al bloquear inventarios para el producto '${item.producto_nombre}'.`,
          );
        }

        // i. Para las unidades vendidas en ruta (VENTA_RUTA)
        if (item.cantidad_vendida > 0) {
          const movVentaId = randomUUID();
          await tx.movimiento_kardex.create({
            data: {
              id: movVentaId,
              producto_id: prodId,
              ubicacion_id: carga.bodega_movil_id,
              tipo: 'VENTA_RUTA',
              cantidad_base: -item.cantidad_vendida,
              costo_unitario: item.precio_unitario_promedio,
              documento_tipo: 'LIQUIDACION',
              documento_id: liquidacionId,
              motivo: `Venta en ruta liquidada - Carga ${carga.codigo}`,
              usuario_id: usuarioId,
              fecha_operacion: fechaOperacion,
            },
          });

          await tx.$executeRaw`
            UPDATE stock_saldo
            SET cantidad_fisica = cantidad_fisica - ${item.cantidad_vendida},
                actualizado_en = NOW()
            WHERE producto_id = ${prodId}::uuid AND ubicacion_id = ${carga.bodega_movil_id}::uuid
          `;
        }

        // ii. Para las unidades que retornan al almacén central (RETORNO_DISTRIBUCION)
        if (item.cantidad_retornada > 0) {
          const movRetornoSalidaId = randomUUID();
          const movRetornoEntradaId = randomUUID();

          // Salida de la Bodega Móvil
          await tx.movimiento_kardex.create({
            data: {
              id: movRetornoSalidaId,
              producto_id: prodId,
              ubicacion_id: carga.bodega_movil_id,
              tipo: 'RETORNO_DISTRIBUCION',
              cantidad_base: -item.cantidad_retornada,
              costo_unitario: item.precio_unitario_promedio,
              documento_tipo: 'LIQUIDACION',
              documento_id: liquidacionId,
              motivo: `Retorno de distribución al almacén central - Carga ${carga.codigo}`,
              usuario_id: usuarioId,
              fecha_operacion: fechaOperacion,
            },
          });

          // Entrada al Almacén Físico de Origen
          await tx.movimiento_kardex.create({
            data: {
              id: movRetornoEntradaId,
              producto_id: prodId,
              ubicacion_id: carga.almacen_origen_id,
              tipo: 'RETORNO_DISTRIBUCION',
              cantidad_base: item.cantidad_retornada,
              costo_unitario: item.precio_unitario_promedio,
              documento_tipo: 'LIQUIDACION',
              documento_id: liquidacionId,
              movimiento_ref_id: movRetornoSalidaId,
              motivo: `Retorno de distribución desde vehículo ${carga.vehiculo.placa} - Carga ${carga.codigo}`,
              usuario_id: usuarioId,
              fecha_operacion: fechaOperacion,
            },
          });

          // Descontar de bodega móvil e incrementar en almacén físico
          await tx.$executeRaw`
            UPDATE stock_saldo
            SET cantidad_fisica = cantidad_fisica - ${item.cantidad_retornada},
                actualizado_en = NOW()
            WHERE producto_id = ${prodId}::uuid AND ubicacion_id = ${carga.bodega_movil_id}::uuid
          `;

          await tx.$executeRaw`
            UPDATE stock_saldo
            SET cantidad_fisica = cantidad_fisica + ${item.cantidad_retornada},
                actualizado_en = NOW()
            WHERE producto_id = ${prodId}::uuid AND ubicacion_id = ${carga.almacen_origen_id}::uuid
          `;
        }

        // iii. Para las diferencias / mermas / sobrantes
        if (Math.abs(item.diferencia) > 0.0001) {
          const movAjusteId = randomUUID();
          // Si diferencia > 0: faltante (salida compensatoria de la bodega móvil)
          // Si diferencia < 0: sobrante (entrada compensatoria a la bodega móvil)
          const cantidadAjuste = -item.diferencia;

          await tx.movimiento_kardex.create({
            data: {
              id: movAjusteId,
              producto_id: prodId,
              ubicacion_id: carga.bodega_movil_id,
              tipo: 'AJUSTE',
              cantidad_base: cantidadAjuste,
              costo_unitario: item.precio_unitario_promedio,
              documento_tipo: 'LIQUIDACION',
              documento_id: liquidacionId,
              motivo: `Ajuste por diferencia en liquidación: ${item.justificacion}`,
              usuario_id: usuarioId,
              fecha_operacion: fechaOperacion,
            },
          });

          await tx.$executeRaw`
            UPDATE stock_saldo
            SET cantidad_fisica = cantidad_fisica + ${cantidadAjuste},
                actualizado_en = NOW()
            WHERE producto_id = ${prodId}::uuid AND ubicacion_id = ${carga.bodega_movil_id}::uuid
          `;
        }
      }

      // c) Actualizar estado de la carga de distribución a FINALIZADA
      await tx.carga_distribucion.update({
        where: { id: carga.id },
        data: {
          estado: 'FINALIZADA',
          fecha_cierre: fechaOperacion,
          actualizado_en: fechaOperacion,
        },
      });

      // d) Registrar cabecera y detalle de la liquidación
      const nuevaLiquidacion = await tx.liquidacion.create({
        data: {
          id: liquidacionId,
          codigo: codigoLiquidacion,
          carga_distribucion_id: carga.id,
          fecha_liquidacion: fechaOperacion,
          usuario_liquidador_id: usuarioId,
          total_vendido: totalVendidoCalculado,
          total_cobrado: totalCobrado,
          diferencia_dinero: diferenciaDinero,
          estado: estadoLiquidacion,
          observaciones: dto.observaciones?.trim() || null,
          liquidacion_detalle: {
            create: itemsValidados.map((iv) => ({
              producto_id: iv.producto_id,
              presentacion_id: iv.presentacion_id || undefined,
              cantidad_cargada: iv.cantidad_cargada,
              cantidad_vendida: iv.cantidad_vendida,
              cantidad_retornada: iv.cantidad_retornada,
              diferencia: iv.diferencia,
              justificacion: iv.justificacion,
              precio_unitario_promedio: iv.precio_unitario_promedio,
              subtotal_vendido: iv.subtotal_vendido,
            })),
          },
        },
        include: {
          carga_distribucion: {
            include: {
              vehiculo: true,
              trabajador: {
                select: { id: true, nombre_completo: true, username: true, rol: true },
              },
              almacen_origen: true,
              bodega_movil: true,
            },
          },
          usuario_liquidador: {
            select: { id: true, nombre_completo: true, username: true, rol: true },
          },
          liquidacion_detalle: {
            include: {
              producto: true,
              presentacion: true,
            },
          },
        },
      });

      // e) Registro de auditoría administrativa
      await this.auditoriaService.registrarEvento({
        entidad: 'liquidacion',
        registro_id: nuevaLiquidacion.id,
        accion: 'INSERT',
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
        valor_nuevo: {
          id: nuevaLiquidacion.id,
          codigo: nuevaLiquidacion.codigo,
          carga_codigo: carga.codigo,
          vehiculo: carga.vehiculo.placa,
          trabajador: carga.trabajador.username,
          estado: nuevaLiquidacion.estado,
          total_vendido: totalVendidoCalculado,
          total_cobrado: totalCobrado,
          diferencia_dinero: diferenciaDinero,
        },
      });

      return nuevaLiquidacion;
    });
  }

  /**
   * Consulta el listado histórico de liquidaciones con filtros por estado, fechas y trabajador.
   * Si el usuario consultante tiene rol VENDEDOR, se limita estrictamente a ver solo sus liquidaciones.
   */
  async consultarLiquidaciones(
    dto: ConsultarLiquidacionesDto,
    usuarioId: string,
    usuarioRol: string,
  ) {
    const where: Prisma.liquidacionWhereInput = {};

    if (dto.estado) {
      where.estado = dto.estado;
    }

    // Restricción RBAC: Vendedor solo puede consultar sus propias liquidaciones
    const cargaWhere: Prisma.carga_distribucionWhereInput = {};
    if (usuarioRol === 'VENDEDOR') {
      cargaWhere.trabajador_id = usuarioId;
    } else {
      if (dto.trabajador_id) {
        cargaWhere.trabajador_id = dto.trabajador_id;
      }
      if (dto.vehiculo_id) {
        cargaWhere.vehiculo_id = dto.vehiculo_id;
      }
    }

    if (Object.keys(cargaWhere).length > 0) {
      where.carga_distribucion = { is: cargaWhere };
    }

    if (dto.fecha_desde || dto.fecha_hasta) {
      where.fecha_liquidacion = {};
      if (dto.fecha_desde) {
        where.fecha_liquidacion.gte = new Date(dto.fecha_desde);
      }
      if (dto.fecha_hasta) {
        where.fecha_liquidacion.lte = new Date(dto.fecha_hasta);
      }
    }

    const [total, items] = await Promise.all([
      this.prisma.liquidacion.count({ where }),
      this.prisma.liquidacion.findMany({
        where,
        include: {
          carga_distribucion: {
            include: {
              vehiculo: true,
              trabajador: {
                select: { id: true, nombre_completo: true, username: true, rol: true },
              },
              almacen_origen: true,
              bodega_movil: true,
            },
          },
          usuario_liquidador: {
            select: { id: true, nombre_completo: true, username: true, rol: true },
          },
          liquidacion_detalle: {
            include: {
              producto: true,
              presentacion: true,
            },
          },
        },
        orderBy: { fecha_liquidacion: 'desc' },
        take: dto.limit || 50,
        skip: dto.offset || 0,
      }),
    ]);

    return { total, items };
  }

  /**
   * Obtiene el detalle comparativo completo de una liquidación por su ID.
   */
  async buscarPorId(id: string, usuarioId: string, usuarioRol: string) {
    const liquidacion = await this.prisma.liquidacion.findUnique({
      where: { id },
      include: {
        carga_distribucion: {
          include: {
            vehiculo: true,
            trabajador: {
              select: { id: true, nombre_completo: true, username: true, rol: true },
            },
            almacen_origen: true,
            bodega_movil: true,
          },
        },
        usuario_liquidador: {
          select: { id: true, nombre_completo: true, username: true, rol: true },
        },
        liquidacion_detalle: {
          include: {
            producto: true,
            presentacion: true,
          },
        },
      },
    });

    if (!liquidacion) {
      throw new NotFoundException(`La liquidación con ID '${id}' no existe.`);
    }

    // Validación RBAC para vendedor
    if (
      usuarioRol === 'VENDEDOR' &&
      liquidacion.carga_distribucion.trabajador_id !== usuarioId
    ) {
      throw new ForbiddenException(
        'Acceso denegado: No está autorizado para visualizar liquidaciones de otros trabajadores.',
      );
    }

    return liquidacion;
  }

  /**
   * Obtiene la liquidación asociada a una carga de distribución específica.
   */
  async buscarPorCargaId(cargaId: string, usuarioId: string, usuarioRol: string) {
    const liquidacion = await this.prisma.liquidacion.findUnique({
      where: { carga_distribucion_id: cargaId },
      include: {
        carga_distribucion: {
          include: {
            vehiculo: true,
            trabajador: {
              select: { id: true, nombre_completo: true, username: true, rol: true },
            },
            almacen_origen: true,
            bodega_movil: true,
          },
        },
        usuario_liquidador: {
          select: { id: true, nombre_completo: true, username: true, rol: true },
        },
        liquidacion_detalle: {
          include: {
            producto: true,
            presentacion: true,
          },
        },
      },
    });

    if (!liquidacion) {
      throw new NotFoundException(
        `No se encontró liquidación para la carga de distribución con ID '${cargaId}'.`,
      );
    }

    if (
      usuarioRol === 'VENDEDOR' &&
      liquidacion.carga_distribucion.trabajador_id !== usuarioId
    ) {
      throw new ForbiddenException(
        'Acceso denegado: No está autorizado para visualizar esta liquidación.',
      );
    }

    return liquidacion;
  }

  /**
   * Genera el DTO optimizado para la emisión y formalización del Acta Física de Liquidación (Hito 10 / RF-80).
   * Contiene códigos, conductor, vehículo, almacén, tabla comparativa de mercadería (cargado, vendido, retornado, diferencia, justificación),
   * desglose monetario (total vendido, total cobrado, diferencia/saldo pendiente) y casilleros obligatorios de firmas.
   */
  async obtenerActa(id: string, usuarioId: string, usuarioRol: string) {
    const liquidacion = await this.prisma.liquidacion.findUnique({
      where: { id },
      include: {
        carga_distribucion: {
          include: {
            vehiculo: true,
            trabajador: {
              select: { id: true, nombre_completo: true, username: true, rol: true },
            },
            almacen_origen: true,
            bodega_movil: true,
          },
        },
        usuario_liquidador: {
          select: { id: true, nombre_completo: true, username: true, rol: true },
        },
        liquidacion_detalle: {
          include: {
            producto: true,
            presentacion: true,
          },
          orderBy: {
            producto: { nombre: 'asc' },
          },
        },
      },
    });

    if (!liquidacion) {
      throw new NotFoundException(`La liquidación con ID '${id}' no existe.`);
    }

    // RBAC: Si es VENDEDOR, solo puede acceder al acta de su propia carga
    if (
      usuarioRol === 'VENDEDOR' &&
      liquidacion.carga_distribucion.trabajador_id !== usuarioId
    ) {
      throw new ForbiddenException(
        'Acceso denegado: No está autorizado para visualizar el acta de liquidación de otros trabajadores.',
      );
    }

    let sumCargado = 0;
    let sumVendido = 0;
    let sumRetornado = 0;
    let sumDiferencia = 0;

    const items = liquidacion.liquidacion_detalle.map((det, index) => {
      const cargado = Number(det.cantidad_cargada);
      const vendido = Number(det.cantidad_vendida);
      const retornado = Number(det.cantidad_retornada);
      const diferencia = Number(det.diferencia);
      const precioUnit = Number(det.precio_unitario_promedio);
      const subtotal = Number(det.subtotal_vendido);

      sumCargado += cargado;
      sumVendido += vendido;
      sumRetornado += retornado;
      sumDiferencia += diferencia;

      return {
        linea: index + 1,
        producto_id: det.producto_id,
        codigo_interno: det.producto.codigo_interno,
        nombre_producto: det.producto.nombre,
        unidad_base: det.producto.unidad_base,
        presentacion: det.presentacion?.nombre || null,
        cantidad_cargada: Number(cargado.toFixed(3)),
        cantidad_vendida: Number(vendido.toFixed(3)),
        cantidad_retornada: Number(retornado.toFixed(3)),
        diferencia: Number(diferencia.toFixed(3)),
        justificacion: det.justificacion || null,
        precio_unitario: Number(precioUnit.toFixed(4)),
        subtotal: Number(subtotal.toFixed(2)),
      };
    });

    const totalVendido = Number(liquidacion.total_vendido);
    const totalCobrado = Number(liquidacion.total_cobrado);
    const diferenciaDinero = Number(liquidacion.diferencia_dinero);
    const saldoPendiente = Math.max(0, Number((totalVendido - totalCobrado).toFixed(2)));

    return {
      id: liquidacion.id,
      codigo: liquidacion.codigo,
      fecha_liquidacion: liquidacion.fecha_liquidacion,
      estado: liquidacion.estado,
      observaciones: liquidacion.observaciones || null,
      carga: {
        id: liquidacion.carga_distribucion.id,
        codigo: liquidacion.carga_distribucion.codigo,
        fecha_salida: liquidacion.carga_distribucion.fecha_salida,
        fecha_cierre: liquidacion.carga_distribucion.fecha_cierre,
        observaciones: liquidacion.carga_distribucion.observaciones || null,
        vehiculo: {
          id: liquidacion.carga_distribucion.vehiculo.id,
          placa: liquidacion.carga_distribucion.vehiculo.placa,
          marca: liquidacion.carga_distribucion.vehiculo.marca || null,
          modelo: liquidacion.carga_distribucion.vehiculo.modelo || null,
          tipo_vehiculo: liquidacion.carga_distribucion.vehiculo.tipo_vehiculo || 'CAMIONETA',
        },
        conductor: {
          id: liquidacion.carga_distribucion.trabajador.id,
          nombre_completo: liquidacion.carga_distribucion.trabajador.nombre_completo,
          username: liquidacion.carga_distribucion.trabajador.username,
        },
        almacen_origen: {
          id: liquidacion.carga_distribucion.almacen_origen.id,
          codigo: liquidacion.carga_distribucion.almacen_origen.codigo,
          nombre: liquidacion.carga_distribucion.almacen_origen.nombre,
        },
        bodega_movil: {
          id: liquidacion.carga_distribucion.bodega_movil.id,
          codigo: liquidacion.carga_distribucion.bodega_movil.codigo,
          nombre: liquidacion.carga_distribucion.bodega_movil.nombre,
        },
      },
      liquidador: {
        id: liquidacion.usuario_liquidador.id,
        nombre_completo: liquidacion.usuario_liquidador.nombre_completo,
        username: liquidacion.usuario_liquidador.username,
        rol: liquidacion.usuario_liquidador.rol,
      },
      monetario: {
        total_vendido: Number(totalVendido.toFixed(2)),
        total_cobrado: Number(totalCobrado.toFixed(2)),
        diferencia_dinero: Number(diferenciaDinero.toFixed(2)),
        saldo_pendiente: Number(saldoPendiente.toFixed(2)),
      },
      resumen_unidades: {
        total_cargado: Number(sumCargado.toFixed(3)),
        total_vendido: Number(sumVendido.toFixed(3)),
        total_retornado: Number(sumRetornado.toFixed(3)),
        total_diferencia: Number(sumDiferencia.toFixed(3)),
      },
      items,
      firmas: {
        conductor: {
          titulo: 'Conductor Responsable de Carga',
          leyenda: 'Recibí y Entregué Conforme',
          nombre: liquidacion.carga_distribucion.trabajador.nombre_completo,
          cargo: 'Vendedor / Conductor Repartidor',
        },
        liquidador: {
          titulo: 'Responsable de Liquidación',
          leyenda: 'Liquidado y Verificado en Almacén Comercial',
          nombre: liquidacion.usuario_liquidador.nombre_completo,
          cargo: liquidacion.usuario_liquidador.rol,
        },
      },
    };
  }
}

