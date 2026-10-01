import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import { AuditoriaService } from '../auditoria/auditoria.service';
import { KardexService } from '../kardex/kardex.service';
import { CrearCargaDto } from './dto/crear-carga.dto';
import { ConsultarCargasDto } from './dto/consultar-cargas.dto';
import { randomUUID } from 'crypto';

interface SaldoBloqueado {
  ubicacion_id: string;
  cantidad_fisica: Prisma.Decimal | number | string;
  cantidad_reservada: Prisma.Decimal | number | string;
}

@Injectable()
export class CargasDistribucionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly kardexService: KardexService,
    private readonly auditoriaService: AuditoriaService,
  ) {}

  /**
   * Registra una orden de carga en estado PENDIENTE.
   * Reglas de Negocio:
   * 1. Almacén de origen debe ser ALMACEN o ZONA.
   * 2. El vehículo debe existir, estar activo y contar con su BODEGA_MOVIL.
   * 3. No permite crear una carga si el vehículo ya tiene una ruta EN_RUTA activa.
   * 4. Valida y calcula las cantidades base a partir de las presentaciones comerciales.
   */
  async crearCarga(dto: CrearCargaDto, usuarioId: string, ipOrigen?: string) {
    // 1. Validar almacén de origen
    const almacen = await this.prisma.ubicacion.findUnique({
      where: { id: dto.almacen_origen_id },
    });
    if (!almacen || (almacen.tipo !== 'ALMACEN' && almacen.tipo !== 'ZONA')) {
      throw new BadRequestException(
        'El almacén físico de origen seleccionado no es válido.',
      );
    }

    // 2. Validar vehículo y obtener su bodega móvil
    const vehiculo = await this.prisma.vehiculo.findUnique({
      where: { id: dto.vehiculo_id },
      include: {
        ubicacion: { where: { tipo: 'BODEGA_MOVIL' } },
      },
    });
    if (!vehiculo) {
      throw new NotFoundException(`El vehículo con ID '${dto.vehiculo_id}' no existe.`);
    }
    if (!vehiculo.activo) {
      throw new BadRequestException(
        `El vehículo con placa '${vehiculo.placa}' se encuentra inactivo.`,
      );
    }

    let bodegaMovil = vehiculo.ubicacion[0];
    if (!bodegaMovil) {
      // Si por alguna razón no existiera, provisionarla de inmediato
      bodegaMovil = await this.prisma.ubicacion.create({
        data: {
          tipo: 'BODEGA_MOVIL',
          codigo: `BM-${vehiculo.placa}`,
          nombre: `Bodega Móvil - ${vehiculo.placa}`,
          vehiculo_id: vehiculo.id,
          trabajador_id: dto.trabajador_id,
          activo: true,
        },
      });
    }

    // 3. Validar conductor / trabajador responsable
    const trabajador = await this.prisma.usuario.findUnique({
      where: { id: dto.trabajador_id },
    });
    if (!trabajador || !trabajador.activo) {
      throw new BadRequestException(
        'El trabajador responsable no existe o no está activo.',
      );
    }

    // 4. Validar que no haya una carga previa EN_RUTA para este vehículo
    const cargaEnRuta = await this.prisma.carga_distribucion.findFirst({
      where: { vehiculo_id: dto.vehiculo_id, estado: 'EN_RUTA' },
    });
    if (cargaEnRuta) {
      throw new BadRequestException(
        `El vehículo '${vehiculo.placa}' ya se encuentra en ruta con la carga '${cargaEnRuta.codigo}'. Debe finalizar la ruta antes de programar una nueva carga.`,
      );
    }

    // 5. Validar y procesar detalles de carga
    const itemsProcesados = [];
    for (const d of dto.detalles) {
      const producto = await this.prisma.producto.findUnique({
        where: { id: d.producto_id },
      });
      if (!producto || !producto.activo) {
        throw new BadRequestException(
          `El producto con ID '${d.producto_id}' no existe o no está activo.`,
        );
      }

      let factor = 1;
      if (d.presentacion_id) {
        const pres = await this.prisma.presentacion.findUnique({
          where: { id: d.presentacion_id },
        });
        if (!pres || pres.producto_id !== d.producto_id || !pres.activo) {
          throw new BadRequestException(
            `La presentación comercial seleccionada no pertenece al producto '${producto.nombre}'.`,
          );
        }
        factor = Number(pres.factor);
      }

      const cantPres = Number(d.cantidad_presentacion || 0);
      const cantSueltas = Number(d.cantidad_unidades_sueltas || 0);

      let cantidadTotalBase = 0;
      if (d.cantidad_total_base && d.cantidad_total_base > 0) {
        cantidadTotalBase = Number(d.cantidad_total_base);
      } else {
        cantidadTotalBase = Number((cantPres * factor + cantSueltas).toFixed(3));
      }

      if (cantidadTotalBase <= 0) {
        throw new BadRequestException(
          `La cantidad total base para el producto '${producto.nombre}' debe ser mayor a 0.`,
        );
      }

      itemsProcesados.push({
        producto_id: d.producto_id,
        presentacion_id: d.presentacion_id || null,
        cantidad_presentacion: cantPres,
        cantidad_unidades_sueltas: cantSueltas,
        cantidad_total_base: cantidadTotalBase,
        observaciones: d.observaciones?.trim() || null,
      });
    }

    // 6. Generar correlativo determinista para la carga: CARGA-YYYYMMDD-XXXX
    const fechaSalida = dto.fecha_salida ? new Date(dto.fecha_salida) : new Date();
    const prefixFecha = fechaSalida.toISOString().slice(0, 10).replace(/-/g, '');
    const countHoy = await this.prisma.carga_distribucion.count({
      where: { codigo: { startsWith: `CARGA-${prefixFecha}` } },
    });
    const codigoCarga = `CARGA-${prefixFecha}-${String(countHoy + 1).padStart(4, '0')}`;

    // 7. Persistir orden de carga en transacción
    return this.prisma.$transaction(async (tx) => {
      const nuevaCarga = await tx.carga_distribucion.create({
        data: {
          codigo: codigoCarga,
          almacen_origen_id: dto.almacen_origen_id,
          vehiculo_id: dto.vehiculo_id,
          trabajador_id: dto.trabajador_id,
          bodega_movil_id: bodegaMovil.id,
          estado: 'PENDIENTE',
          fecha_salida: fechaSalida,
          observaciones: dto.observaciones?.trim() || null,
          creado_por: usuarioId,
          carga_detalle: {
            create: itemsProcesados,
          },
        },
        include: {
          almacen_origen: { select: { id: true, codigo: true, nombre: true } },
          vehiculo: { select: { id: true, placa: true, marca: true, modelo: true } },
          trabajador: {
            select: { id: true, nombre_completo: true, username: true },
          },
          bodega_movil: { select: { id: true, codigo: true, nombre: true } },
          carga_detalle: {
            include: {
              producto: {
                select: {
                  id: true,
                  codigo_interno: true,
                  nombre: true,
                  unidad_base: true,
                },
              },
              presentacion: { select: { id: true, nombre: true, factor: true } },
            },
          },
        },
      });

      await this.auditoriaService.registrarEvento({
        entidad: 'carga_distribucion',
        registro_id: nuevaCarga.id,
        accion: 'INSERT',
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
        valor_nuevo: {
          id: nuevaCarga.id,
          codigo: nuevaCarga.codigo,
          vehiculo: vehiculo.placa,
          items: itemsProcesados.length,
        },
      });

      return nuevaCarga;
    });
  }

  /**
   * Despacha una carga de distribución pasando a EN_RUTA y ejecutando
   * la transferencia atómica de mercadería hacia la BODEGA_MOVIL.
   * Reglas de Dominio Innegociables:
   * 1. Bloqueo pesimista (FOR UPDATE) sobre stock_saldo en el almacén de origen.
   * 2. Valida que cantidad a cargar no exceda cantidad_disponible.
   * 3. Decrementa stock físico en almacén origen e incrementa en BODEGA_MOVIL.
   * 4. Registra doble asiento de Kárdex enlazado con tipo ASIGNACION_DISTRIBUCION.
   * 5. Invariante: Stock Global de la empresa se mantiene inalterado.
   */
  async despacharCarga(id: string, usuarioId: string, ipOrigen?: string) {
    const carga = await this.prisma.carga_distribucion.findUnique({
        where: { id },
      include: {
        carga_detalle: {
          include: {
            producto: true,
          },
        },
        vehiculo: true,
        almacen_origen: true,
        bodega_movil: true,
      },
    });

    if (!carga) {
      throw new NotFoundException(`La carga de distribución con ID '${id}' no existe.`);
    }

    if (carga.estado === 'EN_RUTA') {
      throw new BadRequestException(
        `La carga '${carga.codigo}' ya fue despachada y se encuentra EN_RUTA.`,
      );
    }

    if (carga.estado === 'FINALIZADA') {
      throw new BadRequestException(
        `La carga '${carga.codigo}' ya fue finalizada previamente.`,
      );
    }

    if (carga.estado !== 'PENDIENTE') {
      throw new BadRequestException(
        `Solo es posible despachar cargas en estado PENDIENTE. Estado actual: ${carga.estado}`,
      );
    }

    // Validar que no exista otra carga EN_RUTA para el mismo vehículo
    const otraEnRuta = await this.prisma.carga_distribucion.findFirst({
      where: {
        vehiculo_id: carga.vehiculo_id,
        estado: 'EN_RUTA',
        id: { not: id },
      },
    });
    if (otraEnRuta) {
      throw new BadRequestException(
        `El vehículo '${carga.vehiculo.placa}' ya tiene otra carga activa en ruta (${otraEnRuta.codigo}).`,
      );
    }

    // Ejecución de la transferencia atómica
    return this.prisma.$transaction(async (tx) => {
      const fechaOperacion = new Date();

      for (const item of carga.carga_detalle) {
        const prodId = item.producto_id;
        const cantRequerida = Number(item.cantidad_total_base);

        // a) Asegurar que existan filas en stock_saldo para almacén origen y bodega móvil
        await tx.$executeRaw`
          INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
          VALUES (${prodId}::uuid, ${carga.almacen_origen_id}::uuid, 0, 0, NOW())
          ON CONFLICT (producto_id, ubicacion_id) DO NOTHING
        `;
        await tx.$executeRaw`
          INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
          VALUES (${prodId}::uuid, ${carga.bodega_movil_id}::uuid, 0, 0, NOW())
          ON CONFLICT (producto_id, ubicacion_id) DO NOTHING
        `;

        // b) Bloqueo pesimista ordenado de saldos para evitar deadlocks
        const [primeraUbicacion, segundaUbicacion] = [
          carga.almacen_origen_id,
          carga.bodega_movil_id,
        ].sort();

        const saldos = await tx.$queryRaw<SaldoBloqueado[]>`
          SELECT ubicacion_id, cantidad_fisica, cantidad_reservada
          FROM stock_saldo
          WHERE producto_id = ${prodId}::uuid 
            AND ubicacion_id IN (${primeraUbicacion}::uuid, ${segundaUbicacion}::uuid)
          ORDER BY ubicacion_id ASC
          FOR UPDATE
        `;

        const saldoOrigen = saldos.find((s) => s.ubicacion_id === carga.almacen_origen_id);
        const saldoBodega = saldos.find((s) => s.ubicacion_id === carga.bodega_movil_id);

        if (!saldoOrigen || !saldoBodega) {
          throw new BadRequestException(
            `Error al bloquear inventarios para el producto '${item.producto.nombre}'.`,
          );
        }

        const fisicaOrigen = Number(saldoOrigen.cantidad_fisica);
        const reservadaOrigen = Number(saldoOrigen.cantidad_reservada);
        const disponibleOrigen = Number((fisicaOrigen - reservadaOrigen).toFixed(3));

        const fisicaBodega = Number(saldoBodega.cantidad_fisica);

        // c) Validación estricta de saldo disponible en el almacén de origen
        if (cantRequerida > disponibleOrigen) {
          throw new BadRequestException(
            `Stock disponible insuficiente en '${carga.almacen_origen.nombre}' para el producto '${item.producto.nombre}'. Disponible: ${disponibleOrigen}, Solicitado: ${cantRequerida}`,
          );
        }

        const nuevaFisicaOrigen = Number((fisicaOrigen - cantRequerida).toFixed(3));
        const nuevaFisicaBodega = Number((fisicaBodega + cantRequerida).toFixed(3));

        if (nuevaFisicaOrigen < 0) {
          throw new BadRequestException(
            `El stock físico en origen no puede quedar negativo para '${item.producto.nombre}'.`,
          );
        }

        // d) Descontar del almacén físico origen
        await tx.$executeRaw`
          UPDATE stock_saldo
          SET cantidad_fisica = ${nuevaFisicaOrigen}::numeric,
              actualizado_en = NOW()
          WHERE producto_id = ${prodId}::uuid AND ubicacion_id = ${carga.almacen_origen_id}::uuid
        `;

        // e) Incrementar en la bodega móvil de destino
        await tx.$executeRaw`
          UPDATE stock_saldo
          SET cantidad_fisica = ${nuevaFisicaBodega}::numeric,
              actualizado_en = NOW()
          WHERE producto_id = ${prodId}::uuid AND ubicacion_id = ${carga.bodega_movil_id}::uuid
        `;

        // f) Registrar asientos en Kárdex enlazados por movimiento_ref_id
        const salidaId = randomUUID();
        const entradaId = randomUUID();

        // 1. Salida de origen (ASIGNACION_DISTRIBUCION con cantidad negativa)
        await this.kardexService.registrarMovimiento(tx, {
          id: salidaId,
          producto_id: prodId,
          ubicacion_id: carga.almacen_origen_id,
          tipo: 'ASIGNACION_DISTRIBUCION',
          cantidad_base: -cantRequerida,
          documento_tipo: 'CARGA_DISTRIBUCION',
          documento_id: carga.id,
          motivo: `Carga a ruta - Vehículo ${carga.vehiculo.placa} (${carga.codigo})`,
          usuario_id: usuarioId,
          fecha_operacion: fechaOperacion,
        });

        // 2. Entrada a Bodega Móvil (ASIGNACION_DISTRIBUCION positiva, con enlace a salida)
        await this.kardexService.registrarMovimiento(tx, {
          id: entradaId,
          producto_id: prodId,
          ubicacion_id: carga.bodega_movil_id,
          tipo: 'ASIGNACION_DISTRIBUCION',
          cantidad_base: cantRequerida,
          documento_tipo: 'CARGA_DISTRIBUCION',
          documento_id: carga.id,
          movimiento_ref_id: salidaId,
          motivo: `Recepción en bodega móvil - Vehículo ${carga.vehiculo.placa} (${carga.codigo})`,
          usuario_id: usuarioId,
          fecha_operacion: fechaOperacion,
        });
      }

      // g) Actualizar estado de la carga a EN_RUTA
      const cargaActualizada = await tx.carga_distribucion.update({
        where: { id },
        data: {
          estado: 'EN_RUTA',
          despachado_por: usuarioId,
          actualizado_en: new Date(),
        },
        include: {
          almacen_origen: { select: { id: true, codigo: true, nombre: true } },
          vehiculo: { select: { id: true, placa: true, marca: true, modelo: true } },
          trabajador: {
            select: { id: true, nombre_completo: true, username: true },
          },
          bodega_movil: { select: { id: true, codigo: true, nombre: true } },
          carga_detalle: {
            include: {
              producto: {
                select: {
                  id: true,
                  codigo_interno: true,
                  nombre: true,
                  unidad_base: true,
                },
              },
              presentacion: { select: { id: true, nombre: true, factor: true } },
            },
          },
        },
      });

      // h) Auditoría
      await this.auditoriaService.registrarEvento({
        entidad: 'carga_distribucion',
        registro_id: id,
        accion: 'UPDATE',
        usuario_id: usuarioId,
        ip_origen: ipOrigen,
        valor_anterior: { estado: 'PENDIENTE' },
        valor_nuevo: {
          estado: 'EN_RUTA',
          despachado_por: usuarioId,
          fecha: fechaOperacion,
        },
      });

        return cargaActualizada;
      });
  }

  /**
   * Listado de cargas con filtros por estado, fecha, vehículo y trabajador.
   * Si el usuario es VENDEDOR, solo consulta sus propias cargas asignadas.
   */
  async consultarCargas(
    dto: ConsultarCargasDto,
    usuarioId?: string,
    userRol?: string,
  ) {
    const where: any = {};

    if (userRol === 'VENDEDOR') {
      where.trabajador_id = usuarioId;
    } else if (dto.trabajador_id) {
      where.trabajador_id = dto.trabajador_id;
    }

    if (dto.estado) {
      where.estado = dto.estado;
    }

    if (dto.vehiculo_id) {
      where.vehiculo_id = dto.vehiculo_id;
    }

    if (dto.fecha_desde || dto.fecha_hasta) {
      where.fecha_salida = {};
      if (dto.fecha_desde) {
        where.fecha_salida.gte = new Date(dto.fecha_desde);
      }
      if (dto.fecha_hasta) {
        const hasta = new Date(dto.fecha_hasta);
        hasta.setHours(23, 59, 59, 999);
        where.fecha_salida.lte = hasta;
      }
    }

    const cargas = await this.prisma.carga_distribucion.findMany({
      where,
      include: {
        almacen_origen: { select: { id: true, codigo: true, nombre: true } },
        vehiculo: { select: { id: true, placa: true, marca: true, modelo: true } },
        trabajador: {
          select: { id: true, nombre_completo: true, username: true, email: true },
        },
        bodega_movil: { select: { id: true, codigo: true, nombre: true } },
        usuario_creador: {
          select: { id: true, nombre_completo: true, username: true },
        },
        usuario_despachador: {
          select: { id: true, nombre_completo: true, username: true },
        },
        carga_detalle: {
          include: {
            producto: {
              select: {
                id: true,
                codigo_interno: true,
                nombre: true,
                unidad_base: true,
              },
            },
            presentacion: { select: { id: true, nombre: true, factor: true } },
          },
        },
      },
      orderBy: { creado_en: 'desc' },
    });

    return {
      total: cargas.length,
      items: cargas,
    };
  }

  /**
   * Obtiene el detalle completo de una carga y el stock actual en el vehículo.
   */
  async buscarCargaPorId(id: string, usuarioId?: string, userRol?: string) {
    const carga = await this.prisma.carga_distribucion.findUnique({
      where: { id },
      include: {
        almacen_origen: { select: { id: true, codigo: true, nombre: true } },
        vehiculo: { select: { id: true, placa: true, marca: true, modelo: true } },
        trabajador: {
          select: { id: true, nombre_completo: true, username: true, email: true },
        },
        bodega_movil: { select: { id: true, codigo: true, nombre: true } },
        usuario_creador: {
          select: { id: true, nombre_completo: true, username: true },
        },
        usuario_despachador: {
          select: { id: true, nombre_completo: true, username: true },
        },
        carga_detalle: {
          include: {
            producto: {
              select: {
                id: true,
                codigo_interno: true,
                nombre: true,
                unidad_base: true,
              },
            },
            presentacion: { select: { id: true, nombre: true, factor: true } },
          },
        },
      },
    });

    if (!carga) {
      throw new NotFoundException(`La orden de carga con ID '${id}' no existe.`);
    }

    if (userRol === 'VENDEDOR' && carga.trabajador_id !== usuarioId) {
      throw new ForbiddenException(
        'No tiene permisos para consultar cargas asignadas a otros trabajadores.',
      );
    }

    // Consultar stock físico actual en la Bodega Móvil para los productos de la carga
    const productosIds = carga.carga_detalle.map((d) => d.producto_id);
    const saldosBodega = await this.prisma.stock_saldo.findMany({
      where: {
        ubicacion_id: carga.bodega_movil_id,
        producto_id: { in: productosIds },
      },
    });

    const saldosMap = new Map(
      saldosBodega.map((s) => [s.producto_id, Number(s.cantidad_fisica)]),
    );

    const detallesConStock = carga.carga_detalle.map((d) => ({
      ...d,
      stock_actual_bodega_movil: saldosMap.get(d.producto_id) || 0,
    }));

    return {
      ...carga,
      carga_detalle: detallesConStock,
    };
  }

  /**
   * Consulta las existencias actuales consolidadas por Bodega Móvil / Vehículo / Repartidor.
   */
  async obtenerBodegasMoviles(usuarioId?: string, userRol?: string) {
    const whereUbicacion: any = {
      tipo: 'BODEGA_MOVIL',
      activo: true,
    };

    if (userRol === 'VENDEDOR') {
      whereUbicacion.trabajador_id = usuarioId;
    }

    const bodegas = await this.prisma.ubicacion.findMany({
      where: whereUbicacion,
      include: {
        vehiculo: {
          include: {
            conductor_habitual: {
              select: { id: true, nombre_completo: true, username: true },
            },
          },
        },
        trabajador: {
          select: { id: true, nombre_completo: true, username: true, email: true },
        },
        cargas_bodega_movil: {
          where: { estado: 'EN_RUTA' },
          take: 1,
          select: {
            id: true,
            codigo: true,
            fecha_salida: true,
            trabajador: {
              select: { id: true, nombre_completo: true },
            },
          },
        },
      },
      orderBy: { nombre: 'asc' },
    });

    // Para cada bodega móvil, consultar sus saldos con cantidad_fisica > 0
    const resultados = [];
    for (const b of bodegas) {
      const saldos = await this.prisma.stock_saldo.findMany({
        where: {
          ubicacion_id: b.id,
          cantidad_fisica: { gt: 0 },
        },
        include: {
          producto: {
            include: {
              categoria: { select: { id: true, nombre: true } },
              presentacion: {
                where: { activo: true },
                select: { id: true, nombre: true, factor: true },
              },
            },
          },
        },
      });

      const existencias = saldos.map((s) => ({
        producto_id: s.producto_id,
        codigo_interno: s.producto.codigo_interno,
        nombre: s.producto.nombre,
        categoria: s.producto.categoria.nombre,
        unidad_base: s.producto.unidad_base,
        cantidad_fisica: Number(s.cantidad_fisica),
        presentaciones_disponibles: s.producto.presentacion,
      }));

      resultados.push({
        bodega_movil_id: b.id,
        codigo: b.codigo,
        nombre: b.nombre,
        vehiculo: b.vehiculo
          ? {
              id: b.vehiculo.id,
              placa: b.vehiculo.placa,
              marca: b.vehiculo.marca,
              modelo: b.vehiculo.modelo,
              tipo_vehiculo: b.vehiculo.tipo_vehiculo,
              activo: b.vehiculo.activo,
            }
          : null,
        trabajador: b.trabajador || b.vehiculo?.conductor_habitual || null,
        carga_activa: b.cargas_bodega_movil[0] || null,
        total_items: existencias.length,
        existencias,
      });
    }

    return resultados;
  }
}
