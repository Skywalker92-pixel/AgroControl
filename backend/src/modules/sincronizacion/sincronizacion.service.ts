import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { RegistrarDispositivoDto } from './dto/registrar-dispositivo.dto';
import { SincronizacionPullDto } from './dto/sincronizacion-pull.dto';
import { SincronizacionPushDto, OperacionSyncDto } from './dto/sincronizacion-push.dto';
import { ConsultarOperacionesObservadasDto } from './dto/consultar-operaciones-observadas.dto';
import {
  ResolverOperacionObservadaDto,
  AccionResolucionOperacion,
} from './dto/resolver-operacion-observada.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class SincronizacionService {
  private readonly logger = new Logger(SincronizacionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * 1. Registro y Autorización de Dispositivos Móviles (RF-72).
   * Asocia terminales móviles (smartphones/tablets) a trabajadores autorizados.
   */
  async registrarDispositivo(
    dto: RegistrarDispositivoDto,
    usuarioId: string,
    usuarioRol: string,
    ipOrigen?: string,
  ) {
    const trabajadorAsignadoId = dto.trabajador_id || usuarioId;

    // Verificar si el trabajador asignado existe y es usuario activo
    const trabajador = await this.prisma.usuario.findUnique({
      where: { id: trabajadorAsignadoId },
    });
    if (!trabajador || !trabajador.activo) {
      throw new BadRequestException('El trabajador asignado al dispositivo no existe o está inactivo.');
    }

    // Verificar si ya existe por código único de dispositivo (IMEI, Android ID, etc.)
    const existente = await this.prisma.dispositivo_movil.findUnique({
      where: { codigo_dispositivo: dto.codigo_dispositivo },
    });

    if (existente) {
      // Si ya existe, actualizamos su información de terminal y mantenemos trazabilidad
      const actualizado = await this.prisma.dispositivo_movil.update({
        where: { id: existente.id },
        data: {
          modelo: dto.modelo || existente.modelo,
          sistema_operativo: dto.sistema_operativo || existente.sistema_operativo,
          version_app: dto.version_app || existente.version_app,
          trabajador_id: trabajadorAsignadoId,
          activo: dto.activo !== undefined ? dto.activo : existente.activo,
          autorizado: dto.autorizado !== undefined ? dto.autorizado : existente.autorizado,
          actualizado_en: new Date(),
        },
        include: {
          usuario: {
            select: { id: true, nombre_completo: true, username: true, rol: true },
          },
        },
      });

      await this.auditoriaService.registrarEvento({
        entidad: 'dispositivo_movil',
        registro_id: actualizado.id,
        accion: 'UPDATE',
        valor_anterior: existente,
        valor_nuevo: actualizado,
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
      });

      return {
        mensaje: 'Dispositivo móvil actualizado exitosamente.',
        dispositivo: actualizado,
      };
    }

    // Crear nuevo registro de dispositivo móvil
    const nuevo = await this.prisma.dispositivo_movil.create({
      data: {
        id: randomUUID(),
        codigo_dispositivo: dto.codigo_dispositivo,
        modelo: dto.modelo || 'Genérico',
        sistema_operativo: dto.sistema_operativo || 'Android',
        version_app: dto.version_app || '1.0.0',
        trabajador_id: trabajadorAsignadoId,
        activo: dto.activo !== undefined ? dto.activo : true,
        autorizado: dto.autorizado !== undefined ? dto.autorizado : true,
        creado_en: new Date(),
        actualizado_en: new Date(),
      },
      include: {
        usuario: {
          select: { id: true, nombre_completo: true, username: true, rol: true },
        },
      },
    });

    await this.auditoriaService.registrarEvento({
      entidad: 'dispositivo_movil',
      registro_id: nuevo.id,
      accion: 'INSERT',
      valor_nuevo: nuevo,
      usuario_id: usuarioId,
      ip_origen: ipOrigen,
    });

    return {
      mensaje: 'Dispositivo móvil registrado y autorizado exitosamente.',
      dispositivo: nuevo,
    };
  }

  /**
   * 2. Sincronización Descendente Incremental (PULL: PC -> Móvil).
   * Envía al terminal móvil únicamente los registros maestros actualizados desde 'ultima_sincronizacion'
   * y la carga de distribución activa asignada al vendedor.
   */
  async sincronizacionPull(
    dto: SincronizacionPullDto,
    usuarioId: string,
    usuarioRol: string,
  ) {
    const fechaFiltro = dto.ultima_sincronizacion
      ? new Date(dto.ultima_sincronizacion)
      : new Date(0);

    const timestampServidor = new Date();

    // Actualizar última sincronización en el dispositivo si se envía dispositivo_id o codigo
    if (dto.dispositivo_id) {
      await this.prisma.dispositivo_movil.updateMany({
        where: { id: dto.dispositivo_id },
        data: { ultima_sincronizacion: timestampServidor },
      });
    } else if (dto.codigo_dispositivo) {
      await this.prisma.dispositivo_movil.updateMany({
        where: { codigo_dispositivo: dto.codigo_dispositivo },
        data: { ultima_sincronizacion: timestampServidor },
      });
    }

    // 1. Categorías maestras actualizadas
    const categorias = await this.prisma.categoria.findMany({
      where: {
        actualizado_en: { gt: fechaFiltro },
        activo: true,
      },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        descripcion: true,
        actualizado_en: true,
      },
    });

    // 2. Productos activos con categoría y presentaciones
    const productos = await this.prisma.producto.findMany({
      where: {
        actualizado_en: { gt: fechaFiltro },
        activo: true,
      },
      include: {
        categoria: {
          select: { id: true, codigo: true, nombre: true },
        },
        presentacion: {
          where: { activo: true },
          select: { id: true, nombre: true, factor: true, activo: true, actualizado_en: true },
        },
      },
    });

    // 3. Presentaciones actualizadas
    const presentaciones = await this.prisma.presentacion.findMany({
      where: {
        actualizado_en: { gt: fechaFiltro },
        activo: true,
      },
    });

    // 4. Listas de precios y precios asignados
    const listasPrecios = await this.prisma.lista_precio.findMany({
      where: {
        actualizado_en: { gt: fechaFiltro },
        activo: true,
      },
      include: {
        precio_producto: {
          where: {
            actualizado_en: { gt: fechaFiltro },
          },
          select: {
            id: true,
            producto_id: true,
            precio: true,
            actualizado_en: true,
          },
        },
      },
    });

    // 5. Clientes activos
    const clientes = await this.prisma.cliente.findMany({
      where: {
        actualizado_en: { gt: fechaFiltro },
        activo: true,
      },
      include: {
        lista_precio: {
          select: { id: true, codigo: true, nombre: true },
        },
      },
    });

    // 6. Carga de distribución activa asignada al vendedor (estado EN_RUTA)
    const cargaActiva = await this.prisma.carga_distribucion.findFirst({
      where: {
        trabajador_id: usuarioId,
        estado: 'EN_RUTA',
      },
      include: {
        vehiculo: {
          select: { id: true, placa: true, marca: true, modelo: true, tipo_vehiculo: true },
        },
        bodega_movil: {
          select: { id: true, codigo: true, nombre: true },
        },
        almacen_origen: {
          select: { id: true, codigo: true, nombre: true },
        },
        carga_detalle: {
          include: {
            producto: {
              select: { id: true, codigo_interno: true, nombre: true, unidad_base: true },
            },
            presentacion: {
              select: { id: true, nombre: true, factor: true },
            },
          },
        },
      },
      orderBy: { creado_en: 'desc' },
    });

    // Formatear carga activa con saldo real en bodega móvil
    let cargaFormateada = null;
    if (cargaActiva) {
      // Obtener saldos reales en bodega móvil para cada producto de la carga
      const saldosBodega = await this.prisma.stock_saldo.findMany({
        where: {
          ubicacion_id: cargaActiva.bodega_movil_id,
          producto_id: { in: cargaActiva.carga_detalle.map((d) => d.producto_id) },
        },
      });
      const saldosMap = new Map(saldosBodega.map((s) => [s.producto_id, Number(s.cantidad_fisica)]));

      cargaFormateada = {
        id: cargaActiva.id,
        codigo: cargaActiva.codigo,
        estado: cargaActiva.estado,
        fecha_salida: cargaActiva.fecha_salida,
        vehiculo: cargaActiva.vehiculo,
        bodega_movil: cargaActiva.bodega_movil,
        almacen_origen: cargaActiva.almacen_origen,
        observaciones: cargaActiva.observaciones,
        items: cargaActiva.carga_detalle.map((det) => ({
          producto_id: det.producto_id,
          producto_codigo: det.producto.codigo_interno,
          producto_nombre: det.producto.nombre,
          unidad_base: det.producto.unidad_base,
          presentacion_id: det.presentacion_id,
          presentacion_nombre: det.presentacion?.nombre || null,
          presentacion_factor: det.presentacion ? Number(det.presentacion.factor) : 1,
          cantidad_cargada_total_base: Number(det.cantidad_total_base),
          cantidad_presentacion: Number(det.cantidad_presentacion),
          cantidad_sueltas: Number(det.cantidad_unidades_sueltas),
          stock_actual_bodega_movil: saldosMap.get(det.producto_id) ?? 0,
        })),
      };
    }

    return {
      timestamp_servidor: timestampServidor.toISOString(),
      es_incremental: Boolean(dto.ultima_sincronizacion),
      ultima_sincronizacion_recibida: dto.ultima_sincronizacion || null,
      totales: {
        categorias: categorias.length,
        productos: productos.length,
        presentaciones: presentaciones.length,
        listas_precios: listasPrecios.length,
        clientes: clientes.length,
        tiene_carga_activa: Boolean(cargaActiva),
      },
      datos: {
        categorias,
        productos,
        presentaciones,
        listas_precios: listasPrecios,
        clientes,
        carga_activa: cargaFormateada,
      },
    };
  }

  /**
   * 3. Sincronización Ascendente por Lotes (PUSH: Móvil -> PC).
   * Motor Idempotente con UUIDs de cliente, doble marca temporal y máquina de estados.
   * Reglas de Dominio:
   * 1. Idempotencia: Si la operación ya fue recibida, retorna su estado sin duplicar Kárdex ni registros.
   * 2. Máquina de Estados: RECIBIDA -> APLICADA (si cuadra en bodega móvil) u OBSERVADA (si hay faltante).
   * 3. No interrupción: Un error en un item NO aborta el lote completo del vendedor.
   */
  async sincronizacionPush(
    dto: SincronizacionPushDto,
    usuarioId: string,
    ipOrigen?: string,
  ) {
    if (!dto.operaciones || dto.operaciones.length === 0) {
      return {
        total_recibidas: 0,
        total_aplicadas: 0,
        total_observadas: 0,
        total_reintentos_ignorados: 0,
        timestamp_servidor: new Date().toISOString(),
        resultados: [],
      };
    }

    // Resolver dispositivo móvil emisor
    let dispositivoId = dto.dispositivo_id;
    if (!dispositivoId && dto.codigo_dispositivo) {
      const dev = await this.prisma.dispositivo_movil.findUnique({
        where: { codigo_dispositivo: dto.codigo_dispositivo },
      });
      if (dev) dispositivoId = dev.id;
    }

    if (!dispositivoId) {
      // Buscar el dispositivo habitual asignado al usuario
      const devUser = await this.prisma.dispositivo_movil.findFirst({
        where: { trabajador_id: usuarioId, activo: true },
      });
      if (devUser) {
        dispositivoId = devUser.id;
      } else {
        // Auto-registrar dispositivo genérico para el usuario
        const autoDev = await this.prisma.dispositivo_movil.create({
          data: {
            codigo_dispositivo: `DEV-AUTO-${usuarioId.slice(0, 8)}`,
            modelo: 'Terminal Móvil',
            trabajador_id: usuarioId,
            activo: true,
            autorizado: true,
          },
        });
        dispositivoId = autoDev.id;
      }
    }

    const timestampServidor = new Date();
    let totalAplicadas = 0;
    let totalObservadas = 0;
    let totalReintentosIgnorados = 0;
    const resultados: Array<{
      id: string;
      tipo_operacion: string;
      estado_sync: 'APLICADA' | 'OBSERVADA';
      motivo_observacion?: string | null;
      ya_procesado: boolean;
      mensaje?: string;
    }> = [];

    // Procesamiento ordenado e individual de cada operación dentro del batch
    for (const op of dto.operaciones) {
      // 1. REGLA DE IDEMPOTENCIA: Verificar existencia previa por UUID de cliente
      const opExistente = await this.prisma.operacion_sincronizada.findUnique({
        where: { id: op.id },
      });

      if (opExistente) {
        totalReintentosIgnorados++;
        resultados.push({
          id: op.id,
          tipo_operacion: op.tipo_operacion,
          estado_sync: opExistente.estado_sync as 'APLICADA' | 'OBSERVADA',
          motivo_observacion: opExistente.motivo_observacion,
          ya_procesado: true,
          mensaje: 'Operación previamente sincronizada. Reintento procesado de forma idempotente sin duplicidad.',
        });
        continue;
      }

      const fechaOperacionMovil = new Date(op.fecha_operacion);

      // 2. MÁQUINA DE ESTADOS Y VALIDACIÓN SEGÚN TIPO DE OPERACIÓN
      if (op.tipo_operacion === 'VENTA') {
        let estadoCalculado: 'APLICADA' | 'OBSERVADA' = 'APLICADA';
        let motivoObservacion: string | null = null;
        let cargaAsociada: any = null;

        // Validar que exista la carga y esté EN_RUTA
        if (!op.carga_distribucion_id) {
          estadoCalculado = 'OBSERVADA';
          motivoObservacion = 'La venta en ruta no especifica carga_distribucion_id.';
        } else {
          cargaAsociada = await this.prisma.carga_distribucion.findUnique({
            where: { id: op.carga_distribucion_id },
            include: { vehiculo: true, bodega_movil: true },
          });

          if (!cargaAsociada || cargaAsociada.estado !== 'EN_RUTA') {
            estadoCalculado = 'OBSERVADA';
            motivoObservacion = `La carga ${op.carga_distribucion_id} no existe o no está en estado EN_RUTA.`;
          }
        }

        // Si la carga es válida, validar disponibilidad en Bodega Móvil
        if (estadoCalculado === 'APLICADA' && cargaAsociada) {
          const detalles = op.detalles || [];
          for (const item of detalles) {
            const saldoBodega = await this.prisma.stock_saldo.findUnique({
              where: {
                producto_id_ubicacion_id: {
                  producto_id: item.producto_id,
                  ubicacion_id: cargaAsociada.bodega_movil_id,
                },
              },
            });

            const stockDisponible = saldoBodega ? Number(saldoBodega.cantidad_fisica) : 0;
            if (stockDisponible < item.cantidad) {
              estadoCalculado = 'OBSERVADA';
              motivoObservacion = `Stock insuficiente en bodega móvil para el producto ID ${item.producto_id}: disponible ${stockDisponible}, requerido ${item.cantidad}.`;
              break;
            }
          }
        }

        // Caso A: Venta OBSERVADA (Faltante físico o descalce)
        if (estadoCalculado === 'OBSERVADA') {
          await this.prisma.operacion_sincronizada.create({
            data: {
              id: op.id,
              dispositivo_id: dispositivoId,
              usuario_id: usuarioId,
              carga_distribucion_id: op.carga_distribucion_id || null,
              tipo_operacion: 'VENTA',
              estado_sync: 'OBSERVADA',
              datos_operacion: op as any,
              motivo_observacion: motivoObservacion,
              fecha_operacion: fechaOperacionMovil,
              fecha_registro: timestampServidor,
              ip_origen: ipOrigen || null,
            },
          });

          await this.auditoriaService.registrarEvento({
            entidad: 'operacion_sincronizada',
            registro_id: op.id,
            accion: 'INSERT',
            valor_nuevo: {
              tipo_operacion: 'VENTA',
              estado_sync: 'OBSERVADA',
              motivo: motivoObservacion,
              dispositivo_id: dispositivoId,
            },
            usuario_id: usuarioId,
            ip_origen: ipOrigen,
          });

          totalObservadas++;
          resultados.push({
            id: op.id,
            tipo_operacion: 'VENTA',
            estado_sync: 'OBSERVADA',
            motivo_observacion: motivoObservacion,
            ya_procesado: false,
            mensaje: 'Operación registrada en estado OBSERVADA por inconsistencia en bodega móvil.',
          });
        } else {
          // Caso B: Venta APLICADA (Atómica con descuento de bodega móvil y Kárdex)
          await this.prisma.$transaction(async (tx) => {
            // Guardar en bitácora de operaciones sincronizadas
            await tx.operacion_sincronizada.create({
              data: {
                id: op.id,
                dispositivo_id: dispositivoId,
                usuario_id: usuarioId,
                carga_distribucion_id: op.carga_distribucion_id,
                tipo_operacion: 'VENTA',
                estado_sync: 'APLICADA',
                datos_operacion: op as any,
                motivo_observacion: null,
                fecha_operacion: fechaOperacionMovil,
                fecha_registro: timestampServidor,
                ip_origen: ipOrigen || null,
              },
            });

            // Descontar inventario de bodega móvil y asentar Kárdex
            const detalles = op.detalles || [];
            for (const item of detalles) {
              await tx.movimiento_kardex.create({
                data: {
                  id: randomUUID(),
                  producto_id: item.producto_id,
                  ubicacion_id: cargaAsociada.bodega_movil_id,
                  tipo: 'VENTA_RUTA',
                  cantidad_base: -item.cantidad,
                  costo_unitario: item.precio_unitario || 0,
                  documento_tipo: 'VENTA_MOVIL',
                  documento_id: op.id,
                  motivo: `Venta móvil sincronizada - Carga ${cargaAsociada.codigo}`,
                  usuario_id: usuarioId,
                  dispositivo_id: dispositivoId,
                  fecha_operacion: fechaOperacionMovil,
                  fecha_registro: timestampServidor,
                },
              });

              await tx.$executeRaw`
                UPDATE stock_saldo
                SET cantidad_fisica = cantidad_fisica - ${item.cantidad},
                    actualizado_en = NOW()
                WHERE producto_id = ${item.producto_id}::uuid
                  AND ubicacion_id = ${cargaAsociada.bodega_movil_id}::uuid
              `;
            }
          });

          totalAplicadas++;
          resultados.push({
            id: op.id,
            tipo_operacion: 'VENTA',
            estado_sync: 'APLICADA',
            ya_procesado: false,
            mensaje: 'Venta aplicada correctamente al Kárdex y stock de la bodega móvil.',
          });
        }
      } else {
        // Operaciones de Cobro, Devolución, Sobrante o Pedido
        await this.prisma.operacion_sincronizada.create({
          data: {
            id: op.id,
            dispositivo_id: dispositivoId,
            usuario_id: usuarioId,
            carga_distribucion_id: op.carga_distribucion_id || null,
            tipo_operacion: op.tipo_operacion,
            estado_sync: 'APLICADA',
            datos_operacion: op as any,
            motivo_observacion: null,
            fecha_operacion: fechaOperacionMovil,
            fecha_registro: timestampServidor,
            ip_origen: ipOrigen || null,
          },
        });

        totalAplicadas++;
        resultados.push({
          id: op.id,
          tipo_operacion: op.tipo_operacion,
          estado_sync: 'APLICADA',
          ya_procesado: false,
          mensaje: `Operación ${op.tipo_operacion} registrada exitosamente.`,
        });
      }
    }

    // Actualizar timestamp de última sincronización en el dispositivo
    await this.prisma.dispositivo_movil.updateMany({
      where: { id: dispositivoId },
      data: { ultima_sincronizacion: timestampServidor },
    });

    return {
      total_recibidas: dto.operaciones.length,
      total_aplicadas: totalAplicadas,
      total_observadas: totalObservadas,
      total_reintentos_ignorados: totalReintentosIgnorados,
      timestamp_servidor: timestampServidor.toISOString(),
      resultados,
    };
  }

  /**
   * 4. Consulta Administrativa de Operaciones Observadas.
   * Filtra transacciones con discrepancias de saldo, descalces o errores de ruta.
   */
  async consultarOperacionesObservadas(dto: ConsultarOperacionesObservadasDto) {
    const estadoFiltro =
      dto.estado_sync === 'TODAS'
        ? undefined
        : dto.estado_sync || 'OBSERVADA';

    const where: Prisma.operacion_sincronizadaWhereInput = {
      estado_sync: estadoFiltro,
      dispositivo_id: dto.dispositivo_id || undefined,
      usuario_id: dto.usuario_id || undefined,
      carga_distribucion_id: dto.carga_distribucion_id || undefined,
      tipo_operacion: dto.tipo_operacion || undefined,
      fecha_operacion: {
        gte: dto.fecha_desde ? new Date(dto.fecha_desde) : undefined,
        lte: dto.fecha_hasta ? new Date(dto.fecha_hasta) : undefined,
      },
    };

    const operaciones = await this.prisma.operacion_sincronizada.findMany({
      where,
      include: {
        dispositivo_movil: {
          select: { id: true, codigo_dispositivo: true, modelo: true, version_app: true },
        },
        usuario: {
          select: { id: true, nombre_completo: true, username: true, rol: true },
        },
        usuario_operacion_sincronizada_usuario_resolutor_idTousuario: {
          select: { id: true, nombre_completo: true, username: true, rol: true },
        },
        carga_distribucion: {
          include: {
            vehiculo: { select: { placa: true, marca: true, modelo: true } },
            bodega_movil: { select: { id: true, codigo: true, nombre: true } },
            almacen_origen: { select: { id: true, codigo: true, nombre: true } },
          },
        },
      },
      orderBy: { fecha_registro: 'desc' },
      take: dto.limite ? Number(dto.limite) : 100,
    });

    const items = operaciones.map((op) => {
      const latenciaSegundos = Math.max(
        0,
        Math.round((op.fecha_registro.getTime() - op.fecha_operacion.getTime()) / 1000),
      );

      return {
        id: op.id,
        tipo_operacion: op.tipo_operacion,
        estado_sync: op.estado_sync,
        motivo_observacion: op.motivo_observacion,
        fecha_operacion: op.fecha_operacion,
        fecha_registro: op.fecha_registro,
        latencia_sincronizacion_segundos: latenciaSegundos,
        latencia_minutos: Number((latenciaSegundos / 60).toFixed(1)),
        ip_origen: op.ip_origen || '-',
        dispositivo: op.dispositivo_movil,
        vendedor: op.usuario,
        resolutor: op.usuario_operacion_sincronizada_usuario_resolutor_idTousuario,
        fecha_resolucion: op.fecha_resolucion,
        nota_resolucion: op.nota_resolucion,
        movimiento_ajuste_id: op.movimiento_ajuste_id,
        carga: op.carga_distribucion
          ? {
              id: op.carga_distribucion.id,
              codigo: op.carga_distribucion.codigo,
              estado: op.carga_distribucion.estado,
              vehiculo_placa: op.carga_distribucion.vehiculo.placa,
              bodega_movil: op.carga_distribucion.bodega_movil,
              almacen_origen: op.carga_distribucion.almacen_origen,
            }
          : null,
        datos: op.datos_operacion,
      };
    });

    return {
      total: items.length,
      resumen: {
        total_consultadas: items.length,
        estado_filtrado: estadoFiltro || 'TODAS',
        fecha_consulta: new Date(),
      },
      items,
    };
  }

  /**
   * 5. Obtener detalle completo de una Operación Observada por ID.
   */
  async obtenerOperacionObservadaPorId(id: string) {
    const op = await this.prisma.operacion_sincronizada.findUnique({
      where: { id },
      include: {
        dispositivo_movil: {
          select: { id: true, codigo_dispositivo: true, modelo: true, version_app: true },
        },
        usuario: {
          select: { id: true, nombre_completo: true, username: true, rol: true },
        },
        usuario_operacion_sincronizada_usuario_resolutor_idTousuario: {
          select: { id: true, nombre_completo: true, username: true, rol: true },
        },
        movimiento_kardex: {
          select: { id: true, tipo: true, cantidad_base: true, fecha_registro: true },
        },
        carga_distribucion: {
          include: {
            vehiculo: { select: { placa: true, marca: true, modelo: true } },
            bodega_movil: { select: { id: true, codigo: true, nombre: true } },
            almacen_origen: { select: { id: true, codigo: true, nombre: true } },
          },
        },
      },
    });

    if (!op) {
      throw new NotFoundException(`No se encontró la operación sincronizada con ID ${id}`);
    }

    const latenciaSegundos = Math.max(
      0,
      Math.round((op.fecha_registro.getTime() - op.fecha_operacion.getTime()) / 1000),
    );

    return {
      id: op.id,
      tipo_operacion: op.tipo_operacion,
      estado_sync: op.estado_sync,
      motivo_observacion: op.motivo_observacion,
      fecha_operacion: op.fecha_operacion,
      fecha_registro: op.fecha_registro,
      latencia_sincronizacion_segundos: latenciaSegundos,
      latencia_minutos: Number((latenciaSegundos / 60).toFixed(1)),
      ip_origen: op.ip_origen || '-',
      dispositivo: op.dispositivo_movil,
      vendedor: op.usuario,
      resolutor: op.usuario_operacion_sincronizada_usuario_resolutor_idTousuario,
      fecha_resolucion: op.fecha_resolucion,
      nota_resolucion: op.nota_resolucion,
      movimiento_ajuste_id: op.movimiento_ajuste_id,
      carga: op.carga_distribucion
        ? {
            id: op.carga_distribucion.id,
            codigo: op.carga_distribucion.codigo,
            estado: op.carga_distribucion.estado,
            vehiculo_placa: op.carga_distribucion.vehiculo.placa,
            bodega_movil: op.carga_distribucion.bodega_movil,
            almacen_origen: op.carga_distribucion.almacen_origen,
          }
        : null,
      datos: op.datos_operacion,
    };
  }

  /**
   * 6. Resolución Administrativa de Operaciones Observadas (HITO 13).
   * Aprobación con regularización atómica de Kárdex o rechazo justificado.
   */
  async resolverOperacionObservada(
    id: string,
    dto: ResolverOperacionObservadaDto,
    usuarioResolutorId: string,
    ipOrigen?: string,
  ) {
    const op = await this.prisma.operacion_sincronizada.findUnique({
      where: { id },
      include: {
        carga_distribucion: {
          include: { bodega_movil: true, almacen_origen: true },
        },
      },
    });

    if (!op) {
      throw new NotFoundException(`No se encontró la operación observada con ID ${id}`);
    }

    if (op.estado_sync !== 'OBSERVADA') {
      throw new BadRequestException(
        `La operación ya ha sido procesada previamente con estado: ${op.estado_sync}. No admite re-resolución.`,
      );
    }

    const timestampResolucion = new Date();

    // CASO 1: RECHAZO ADMINISTRATIVO
    if (dto.accion === AccionResolucionOperacion.RECHAZAR) {
      const operacionRechazada = await this.prisma.operacion_sincronizada.update({
        where: { id },
        data: {
          estado_sync: 'RESUELTA_RECHAZADA',
          usuario_resolutor_id: usuarioResolutorId,
          fecha_resolucion: timestampResolucion,
          nota_resolucion: dto.nota_resolucion,
          actualizado_en: timestampResolucion,
        },
        include: {
          dispositivo_movil: { select: { id: true, codigo_dispositivo: true } },
          usuario: { select: { id: true, nombre_completo: true, username: true } },
          usuario_operacion_sincronizada_usuario_resolutor_idTousuario: {
            select: { id: true, nombre_completo: true, username: true },
          },
        },
      });

      await this.auditoriaService.registrarEvento({
        entidad: 'operacion_sincronizada',
        registro_id: id,
        accion: 'UPDATE',
        valor_anterior: { estado_sync: op.estado_sync },
        valor_nuevo: {
          estado_sync: 'RESUELTA_RECHAZADA',
          nota_resolucion: dto.nota_resolucion,
          usuario_resolutor_id: usuarioResolutorId,
        },
        usuario_id: usuarioResolutorId,
        ip_origen: ipOrigen,
      });

      return {
        mensaje: 'Operación observada rechazada formalmente sin alteración de inventario.',
        operacion: operacionRechazada,
      };
    }

    // CASO 2: APROBACIÓN ADMINISTRATIVA CON REGULARIZACIÓN DE KÁRDEX
    const operacionAprobada = await this.prisma.$transaction(async (tx) => {
      let bodegaMovilId: string | null = null;

      if (op.carga_distribucion_id && op.carga_distribucion) {
        bodegaMovilId = op.carga_distribucion.bodega_movil_id;
      }

      if (!bodegaMovilId) {
        if (dto.almacen_regularizacion_id) {
          bodegaMovilId = dto.almacen_regularizacion_id;
        } else {
          const defaultUbicacion = await tx.ubicacion.findFirst({
            where: { activo: true, tipo: { in: ['BODEGA_MOVIL', 'TIENDA_PRINCIPAL'] } },
          });
          if (!defaultUbicacion) {
            throw new BadRequestException(
              'No se encontró una bodega o almacén válido para registrar la regularización.',
            );
          }
          bodegaMovilId = defaultUbicacion.id;
        }
      }

      const datosOp = (op.datos_operacion as any) || {};
      const detalles: any[] = datosOp.detalles || [];
      let ultimoMovimientoAjusteId: string | null = null;

      if (op.tipo_operacion === 'VENTA' && detalles.length > 0) {
        for (const item of detalles) {
          const productoId = item.producto_id;
          const cantidadRequerida = Number(item.cantidad);
          const precioUnitario = Number(item.precio_unitario || 0);

          const saldoBodega = await tx.stock_saldo.findUnique({
            where: {
              producto_id_ubicacion_id: {
                producto_id: productoId,
                ubicacion_id: bodegaMovilId,
              },
            },
          });

          const stockDisponible = saldoBodega ? Number(saldoBodega.cantidad_fisica) : 0;
          const deficit = Number((cantidadRequerida - stockDisponible).toFixed(3));

          // Regularizar déficit físico en bodega móvil
          if (deficit > 0) {
            const idAjuste = randomUUID();
            ultimoMovimientoAjusteId = idAjuste;

            if (dto.almacen_regularizacion_id && dto.almacen_regularizacion_id !== bodegaMovilId) {
              const saldoOrigen = await tx.stock_saldo.findUnique({
                where: {
                  producto_id_ubicacion_id: {
                    producto_id: productoId,
                    ubicacion_id: dto.almacen_regularizacion_id,
                  },
                },
              });

              const stockOrigenDisponible = saldoOrigen
                ? Number(saldoOrigen.cantidad_disponible)
                : 0;

              if (stockOrigenDisponible < deficit) {
                throw new BadRequestException(
                  `El almacén de regularización no dispone de stock suficiente para compensar el faltante. Requerido: ${deficit}, Disponible: ${stockOrigenDisponible}.`,
                );
              }

              // Salida por ajuste en almacén de origen
              await tx.movimiento_kardex.create({
                data: {
                  id: randomUUID(),
                  producto_id: productoId,
                  ubicacion_id: dto.almacen_regularizacion_id,
                  tipo: 'AJUSTE',
                  cantidad_base: -deficit,
                  costo_unitario: precioUnitario,
                  documento_tipo: 'VENTA_MOVIL',
                  documento_id: op.id,
                  motivo: `Salida compensatoria para venta observada ${op.id} - ${dto.nota_resolucion}`,
                  usuario_id: usuarioResolutorId,
                  fecha_operacion: timestampResolucion,
                  fecha_registro: timestampResolucion,
                },
              });

              await tx.$executeRaw`
                UPDATE stock_saldo
                SET cantidad_fisica = cantidad_fisica - ${deficit},
                    actualizado_en = NOW()
                WHERE producto_id = ${productoId}::uuid
                  AND ubicacion_id = ${dto.almacen_regularizacion_id}::uuid
              `;

              // Ingreso compensatorio en bodega móvil
              await tx.movimiento_kardex.create({
                data: {
                  id: idAjuste,
                  producto_id: productoId,
                  ubicacion_id: bodegaMovilId,
                  tipo: 'AJUSTE',
                  cantidad_base: deficit,
                  costo_unitario: precioUnitario,
                  documento_tipo: 'VENTA_MOVIL',
                  documento_id: op.id,
                  motivo: `Ingreso compensatorio regularizado - ${dto.nota_resolucion}`,
                  usuario_id: usuarioResolutorId,
                  fecha_operacion: timestampResolucion,
                  fecha_registro: timestampResolucion,
                },
              });

              await tx.$executeRaw`
                INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
                VALUES (${productoId}::uuid, ${bodegaMovilId}::uuid, ${deficit}, 0, NOW())
                ON CONFLICT (producto_id, ubicacion_id)
                DO UPDATE SET cantidad_fisica = stock_saldo.cantidad_fisica + ${deficit},
                              actualizado_en = NOW()
              `;
            } else {
              // Ajuste compensatorio directo en bodega móvil
              await tx.movimiento_kardex.create({
                data: {
                  id: idAjuste,
                  producto_id: productoId,
                  ubicacion_id: bodegaMovilId,
                  tipo: 'AJUSTE',
                  cantidad_base: deficit,
                  costo_unitario: precioUnitario,
                  documento_tipo: 'VENTA_MOVIL',
                  documento_id: op.id,
                  motivo: `Ajuste compensatorio directo por venta observada - ${dto.nota_resolucion}`,
                  usuario_id: usuarioResolutorId,
                  fecha_operacion: timestampResolucion,
                  fecha_registro: timestampResolucion,
                },
              });

              await tx.$executeRaw`
                INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
                VALUES (${productoId}::uuid, ${bodegaMovilId}::uuid, ${deficit}, 0, NOW())
                ON CONFLICT (producto_id, ubicacion_id)
                DO UPDATE SET cantidad_fisica = stock_saldo.cantidad_fisica + ${deficit},
                              actualizado_en = NOW()
              `;
            }
          }

          // Asentar VENTA_RUTA en bodega móvil
          await tx.movimiento_kardex.create({
            data: {
              id: randomUUID(),
              producto_id: productoId,
              ubicacion_id: bodegaMovilId,
              tipo: 'VENTA_RUTA',
              cantidad_base: -cantidadRequerida,
              costo_unitario: precioUnitario,
              documento_tipo: 'VENTA_MOVIL',
              documento_id: op.id,
              motivo: `Venta regularizada tras resolución de observación - ${dto.nota_resolucion}`,
              usuario_id: usuarioResolutorId,
              fecha_operacion: op.fecha_operacion,
              fecha_registro: timestampResolucion,
            },
          });

          await tx.$executeRaw`
            UPDATE stock_saldo
            SET cantidad_fisica = cantidad_fisica - ${cantidadRequerida},
                actualizado_en = NOW()
            WHERE producto_id = ${productoId}::uuid
              AND ubicacion_id = ${bodegaMovilId}::uuid
          `;
        }
      }

      // Actualizar estado de la operación sincronizada
      const opActualizada = await tx.operacion_sincronizada.update({
        where: { id },
        data: {
          estado_sync: 'RESUELTA_APROBADA',
          usuario_resolutor_id: usuarioResolutorId,
          fecha_resolucion: timestampResolucion,
          nota_resolucion: dto.nota_resolucion,
          movimiento_ajuste_id: ultimoMovimientoAjusteId,
          actualizado_en: timestampResolucion,
        },
        include: {
          dispositivo_movil: { select: { id: true, codigo_dispositivo: true } },
          usuario: { select: { id: true, nombre_completo: true, username: true } },
          usuario_operacion_sincronizada_usuario_resolutor_idTousuario: {
            select: { id: true, nombre_completo: true, username: true },
          },
        },
      });

      return opActualizada;
    });

    await this.auditoriaService.registrarEvento({
      entidad: 'operacion_sincronizada',
      registro_id: id,
      accion: 'UPDATE',
      valor_anterior: { estado_sync: op.estado_sync },
      valor_nuevo: {
        estado_sync: 'RESUELTA_APROBADA',
        nota_resolucion: dto.nota_resolucion,
        usuario_resolutor_id: usuarioResolutorId,
      },
      usuario_id: usuarioResolutorId,
      ip_origen: ipOrigen,
    });

    return {
      mensaje: 'Operación observada aprobada exitosamente y regularizada en Kárdex.',
      operacion: operacionAprobada,
    };
  }

  /**
   * Helper para exportar auditoría de operaciones observadas en formato CSV (RFC 4180).
   */
  convertirACSV(filas: any[]): string {
    if (filas.length === 0) return '';
    const columnas = [
      { header: 'ID Operación', key: 'id' },
      { header: 'Tipo Operación', key: 'tipo_operacion' },
      { header: 'Estado', key: 'estado_sync' },
      { header: 'Motivo Observación', key: 'motivo_observacion' },
      { header: 'Vendedor', key: 'vendedor_nombre' },
      { header: 'Dispositivo', key: 'dispositivo_codigo' },
      { header: 'Carga', key: 'carga_codigo' },
      { header: 'Fecha Móvil (Operación)', key: 'fecha_operacion' },
      { header: 'Fecha Central (Registro)', key: 'fecha_registro' },
      { header: 'Latencia (seg)', key: 'latencia_segundos' },
      { header: 'Resolutor', key: 'resolutor_nombre' },
      { header: 'Fecha Resolución', key: 'fecha_resolucion' },
      { header: 'Nota Resolución', key: 'nota_resolucion' },
    ];

    const encabezados = columnas.map((c) => `"${c.header}"`).join(',');
    const lineas = filas.map((fila) => {
      const flat = {
        id: fila.id,
        tipo_operacion: fila.tipo_operacion,
        estado_sync: fila.estado_sync,
        motivo_observacion: fila.motivo_observacion || '',
        vendedor_nombre: fila.vendedor?.nombre_completo || fila.vendedor?.username || '',
        dispositivo_codigo: fila.dispositivo?.codigo_dispositivo || '',
        carga_codigo: fila.carga?.codigo || '',
        fecha_operacion:
          fila.fecha_operacion instanceof Date
            ? fila.fecha_operacion.toISOString()
            : fila.fecha_operacion,
        fecha_registro:
          fila.fecha_registro instanceof Date
            ? fila.fecha_registro.toISOString()
            : fila.fecha_registro,
        latencia_segundos: fila.latencia_sincronizacion_segundos,
        resolutor_nombre:
          fila.resolutor?.nombre_completo || fila.resolutor?.username || '',
        fecha_resolucion:
          fila.fecha_resolucion instanceof Date
            ? fila.fecha_resolucion.toISOString()
            : fila.fecha_resolucion || '',
        nota_resolucion: fila.nota_resolucion || '',
      };

      return columnas
        .map((c) => {
          const val = (flat as any)[c.key];
          if (val === null || val === undefined) return '""';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',');
    });

    return [encabezados, ...lineas].join('\r\n');
  }
}
