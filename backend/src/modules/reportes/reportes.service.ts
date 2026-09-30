import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/prisma/prisma.service';
import {
  ConsultarReporteStockDto,
  ConsultarReporteMovimientosDto,
  ConsultarReporteMenorStockDto,
  ConsultarReporteDespachosDto,
} from './dto/consultar-reportes.dto';
import {
  ConsultarReporteRutasDto,
  ConsultarReporteIncidenciasDto,
  ConsultarAuditoriaDistribucionDto,
} from './dto/consultar-reportes-distribucion.dto';

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 1. Reporte de Existencias Físicas, Reservadas y Disponibles por Almacén y Categoría.
   */
  async reporteStockAlmacen(dto: ConsultarReporteStockDto) {
    const where: Prisma.stock_saldoWhereInput = {
      ubicacion_id: dto.ubicacion_id || undefined,
      producto: dto.categoria_id
        ? { categoria_id: dto.categoria_id }
        : undefined,
    };

    const saldos = await this.prisma.stock_saldo.findMany({
      where,
      include: {
        producto: {
          include: { categoria: true },
        },
        ubicacion: true,
      },
      orderBy: [{ ubicacion: { nombre: 'asc' } }, { producto: { nombre: 'asc' } }],
    });

    let totalFisico = 0;
    let totalReservado = 0;
    let totalDisponible = 0;

    const items = saldos.map((s) => {
      const fisica = Number(s.cantidad_fisica);
      const reservada = Number(s.cantidad_reservada);
      const disponible = Number((fisica - reservada).toFixed(3));

      totalFisico += fisica;
      totalReservado += reservada;
      totalDisponible += disponible;

      return {
        producto_id: s.producto_id,
        codigo_interno: s.producto.codigo_interno,
        nombre: s.producto.nombre,
        categoria: s.producto.categoria.nombre,
        unidad_base: s.producto.unidad_base,
        almacen_id: s.ubicacion_id,
        almacen_codigo: s.ubicacion.codigo,
        almacen_nombre: s.ubicacion.nombre,
        cantidad_fisica: fisica,
        cantidad_reservada: reservada,
        cantidad_disponible: disponible,
        actualizado_en: s.actualizado_en,
      };
    });

    return {
      resumen: {
        total_registros: items.length,
        total_fisico: Number(totalFisico.toFixed(3)),
        total_reservado: Number(totalReservado.toFixed(3)),
        total_disponible: Number(totalDisponible.toFixed(3)),
      },
      items,
    };
  }

  /**
   * 2. Reporte Histórico de Movimientos de Kárdex.
   */
  async reporteMovimientosKardex(dto: ConsultarReporteMovimientosDto) {
    const where: Prisma.movimiento_kardexWhereInput = {
      producto_id: dto.producto_id || undefined,
      ubicacion_id: dto.ubicacion_id || undefined,
      tipo: dto.tipo || undefined,
      fecha_operacion: {
        gte: dto.fecha_desde ? new Date(dto.fecha_desde) : undefined,
        lte: dto.fecha_hasta ? new Date(dto.fecha_hasta) : undefined,
      },
    };

    const movimientos = await this.prisma.movimiento_kardex.findMany({
      where,
      include: {
        producto: true,
        ubicacion: true,
        usuario: {
          select: { id: true, username: true, nombre_completo: true },
        },
      },
      orderBy: { fecha_operacion: 'desc' },
      take: 200,
    });

    const items = movimientos.map((m) => ({
      id: m.id,
      fecha_operacion: m.fecha_operacion,
      tipo: m.tipo,
      codigo_producto: m.producto.codigo_interno,
      nombre_producto: m.producto.nombre,
      unidad_base: m.producto.unidad_base,
      almacen: m.ubicacion.nombre,
      cantidad_base: Number(m.cantidad_base),
      costo_unitario: m.costo_unitario ? Number(m.costo_unitario) : null,
      documento_tipo: m.documento_tipo,
      documento_id: m.documento_id,
      motivo: m.motivo,
      usuario: m.usuario.nombre_completo || m.usuario.username,
    }));

    return {
      total: items.length,
      items,
    };
  }

  /**
   * 3. Reporte de Productos con Menor Stock Disponible (Alerta de Quiebre/Reposición).
   */
  async reporteMenorStock(dto: ConsultarReporteMenorStockDto) {
    const umbral = dto.umbral !== undefined ? Number(dto.umbral) : 20;
    const limit = dto.limit ? Number(dto.limit) : 50;

    const saldos = await this.prisma.stock_saldo.findMany({
      where: {
        ubicacion_id: dto.ubicacion_id || undefined,
        cantidad_disponible: { lte: new Prisma.Decimal(umbral) },
      },
      include: {
        producto: { include: { categoria: true } },
        ubicacion: true,
      },
      orderBy: { cantidad_disponible: 'asc' },
      take: limit,
    });

    const items = saldos.map((s) => ({
      producto_id: s.producto_id,
      codigo_interno: s.producto.codigo_interno,
      nombre: s.producto.nombre,
      categoria: s.producto.categoria.nombre,
      unidad_base: s.producto.unidad_base,
      almacen: s.ubicacion.nombre,
      cantidad_fisica: Number(s.cantidad_fisica),
      cantidad_reservada: Number(s.cantidad_reservada),
      cantidad_disponible: Number(s.cantidad_disponible),
      estado_alerta: Number(s.cantidad_disponible) <= 0 ? 'CRITICO_SIN_STOCK' : 'BAJO_STOCK',
    }));

    return {
      umbral_evaluado: umbral,
      total_alertas: items.length,
      items,
    };
  }

  /**
   * 4. Reporte de Despachos y Salidas Físicas Completadas.
   */
  async reporteDespachos(dto: ConsultarReporteDespachosDto) {
    const where: Prisma.proformaWhereInput = {
      estado: 'DESPACHADO',
      ubicacion_id: dto.ubicacion_id || undefined,
      cliente_id: dto.cliente_id || undefined,
      actualizado_en: {
        gte: dto.fecha_desde ? new Date(dto.fecha_desde) : undefined,
        lte: dto.fecha_hasta ? new Date(dto.fecha_hasta) : undefined,
      },
    };

    const despachos = await this.prisma.proforma.findMany({
      where,
      include: {
        cliente: true,
        ubicacion: true,
        usuario: { select: { id: true, nombre_completo: true, username: true } },
        proforma_detalle: {
          include: { producto: true, presentacion: true },
        },
      },
      orderBy: { actualizado_en: 'desc' },
    });

    let montoTotal = 0;
    let totalUnidades = 0;

    const items = despachos.map((d) => {
      const subtotal = Number(d.subtotal);
      const total = Number(d.total);
      montoTotal += total;

      const unidadesEnProforma = d.proforma_detalle.reduce(
        (acc, it) => acc + Number(it.cantidad_total_base),
        0,
      );
      totalUnidades += unidadesEnProforma;

      return {
        id: d.id,
        numero: d.numero,
        fecha_despacho: d.actualizado_en,
        cliente: d.cliente.razon_social,
        documento_cliente: `${d.cliente.tipo_documento}: ${d.cliente.numero_documento}`,
        almacen: d.ubicacion.nombre,
        vendedor: d.usuario.nombre_completo || d.usuario.username,
        total_items: d.proforma_detalle.length,
        total_unidades_base: Number(unidadesEnProforma.toFixed(3)),
        subtotal,
        total,
      };
    });

    return {
      resumen: {
        total_despachos: items.length,
        monto_total_soles: Number(montoTotal.toFixed(2)),
        total_unidades_base: Number(totalUnidades.toFixed(3)),
      },
      items,
    };
  }

  /**
   * 5. Servicio de Conciliación Matemática Global en Tiempo Real:
   * Verifica la invariante: stock_saldo.cantidad_fisica == SUM(movimiento_kardex.cantidad_base)
   * para cada producto y ubicación en toda la base de datos.
   */
  async reporteConciliacionGeneral(ubicacionId?: string) {
    // 1. Obtener todos los saldos existentes
    const saldos = await this.prisma.stock_saldo.findMany({
      where: ubicacionId ? { ubicacion_id: ubicacionId } : undefined,
      include: {
        producto: true,
        ubicacion: true,
      },
    });

    // 2. Obtener sumatorias acumuladas en Kárdex
    const kardexSum = await this.prisma.movimiento_kardex.groupBy({
      by: ['producto_id', 'ubicacion_id'],
      where: ubicacionId ? { ubicacion_id: ubicacionId } : undefined,
      _sum: {
        cantidad_base: true,
      },
    });

    const kardexMap = new Map<string, number>();
    for (const k of kardexSum) {
      const key = `${k.producto_id}_${k.ubicacion_id}`;
      kardexMap.set(key, Number(k._sum.cantidad_base || 0));
    }

    let conciliadosOk = 0;
    let discrepanciasDetectadas = 0;

    const items = saldos.map((s) => {
      const key = `${s.producto_id}_${s.ubicacion_id}`;
      const totalKardex = kardexMap.get(key) || 0;
      const saldoFisico = Number(s.cantidad_fisica);
      const discrepancia = Number((saldoFisico - totalKardex).toFixed(3));
      const estaConciliado = discrepancia === 0;

      if (estaConciliado) {
        conciliadosOk++;
      } else {
        discrepanciasDetectadas++;
      }

      return {
        producto_id: s.producto_id,
        codigo_interno: s.producto.codigo_interno,
        nombre_producto: s.producto.nombre,
        unidad_base: s.producto.unidad_base,
        almacen_id: s.ubicacion_id,
        almacen_codigo: s.ubicacion.codigo,
        almacen_nombre: s.ubicacion.nombre,
        saldo_fisico: saldoFisico,
        total_kardex: totalKardex,
        saldo_reservado: Number(s.cantidad_reservada),
        discrepancia,
        estado: estaConciliado ? 'CONCILIADO_OK' : 'DISCREPANCIA_DETECTADA',
      };
    });

    return {
      resumen: {
        total_evaluados: items.length,
        total_conciliados: conciliadosOk,
        total_discrepancias: discrepanciasDetectadas,
        estado_general:
          discrepanciasDetectadas === 0
            ? 'CONCILIACION_TOTAL_OK'
            : 'DISCREPANCIAS_DETECTADAS',
        fecha_auditoria: new Date(),
      },
      items,
    };
  }

  /**
   * 6. Reporte de Rendimiento de Reparto y Rutas (Fase 2 / Hito 10):
   * Agrega métricas de cargas realizadas, unidades cargadas, vendidas, retornadas y efectividad de venta por conductor y vehículo.
   */
  async reporteResumenRutas(dto: ConsultarReporteRutasDto) {
    const where: Prisma.liquidacionWhereInput = {
      fecha_liquidacion: {
        gte: dto.fecha_desde ? new Date(dto.fecha_desde) : undefined,
        lte: dto.fecha_hasta ? new Date(dto.fecha_hasta) : undefined,
      },
      carga_distribucion: {
        vehiculo_id: dto.vehiculo_id || undefined,
        trabajador_id: dto.trabajador_id || dto.conductor_id || undefined,
      },
    };

    const liquidaciones = await this.prisma.liquidacion.findMany({
      where,
      include: {
        carga_distribucion: {
          include: {
            vehiculo: true,
            trabajador: {
              select: { id: true, nombre_completo: true, username: true },
            },
            almacen_origen: true,
          },
        },
        liquidacion_detalle: {
          include: {
            producto: true,
          },
        },
        usuario_liquidador: {
          select: { id: true, nombre_completo: true, username: true },
        },
      },
      orderBy: { fecha_liquidacion: 'desc' },
    });

    // Agrupación por Conductor y Vehículo
    const agrupadoMap = new Map<
      string,
      {
        conductor_id: string;
        conductor_nombre: string;
        conductor_username: string;
        vehiculo_id: string;
        vehiculo_placa: string;
        vehiculo_marca: string;
        vehiculo_modelo: string;
        cantidad_cargas: number;
        total_cargado_unidades: number;
        total_vendido_unidades: number;
        total_retornado_unidades: number;
        total_diferencia_unidades: number;
        total_vendido_soles: number;
        total_cobrado_soles: number;
        diferencia_dinero_soles: number;
        cargas_conciliadas: number;
        cargas_observadas: number;
      }
    >();

    let sumCargado = 0;
    let sumVendido = 0;
    let sumRetornado = 0;
    let sumDiferencia = 0;
    let sumVendidoSoles = 0;
    let sumCobradoSoles = 0;
    let sumDiferenciaDinero = 0;
    let countConciliadas = 0;
    let countObservadas = 0;

    const detalleRutas = liquidaciones.map((l) => {
      const vSol = Number(l.total_vendido);
      const cSol = Number(l.total_cobrado);
      const dSol = Number(l.diferencia_dinero);

      sumVendidoSoles += vSol;
      sumCobradoSoles += cSol;
      sumDiferenciaDinero += dSol;

      if (l.estado === 'CONCILIADA') countConciliadas++;
      else countObservadas++;

      let rutaCargado = 0;
      let rutaVendido = 0;
      let rutaRetornado = 0;
      let rutaDiferencia = 0;

      for (const det of l.liquidacion_detalle) {
        rutaCargado += Number(det.cantidad_cargada);
        rutaVendido += Number(det.cantidad_vendida);
        rutaRetornado += Number(det.cantidad_retornada);
        rutaDiferencia += Number(det.diferencia);
      }

      sumCargado += rutaCargado;
      sumVendido += rutaVendido;
      sumRetornado += rutaRetornado;
      sumDiferencia += rutaDiferencia;

      const efectividadRuta =
        rutaCargado > 0 ? Number(((rutaVendido / rutaCargado) * 100).toFixed(2)) : 0;

      // Agrupación
      const grupoKey = `${l.carga_distribucion.trabajador.id}_${l.carga_distribucion.vehiculo.id}`;
      const grupo = agrupadoMap.get(grupoKey) || {
        conductor_id: l.carga_distribucion.trabajador.id,
        conductor_nombre: l.carga_distribucion.trabajador.nombre_completo,
        conductor_username: l.carga_distribucion.trabajador.username,
        vehiculo_id: l.carga_distribucion.vehiculo.id,
        vehiculo_placa: l.carga_distribucion.vehiculo.placa,
        vehiculo_marca: l.carga_distribucion.vehiculo.marca || '',
        vehiculo_modelo: l.carga_distribucion.vehiculo.modelo || '',
        cantidad_cargas: 0,
        total_cargado_unidades: 0,
        total_vendido_unidades: 0,
        total_retornado_unidades: 0,
        total_diferencia_unidades: 0,
        total_vendido_soles: 0,
        total_cobrado_soles: 0,
        diferencia_dinero_soles: 0,
        cargas_conciliadas: 0,
        cargas_observadas: 0,
      };

      grupo.cantidad_cargas += 1;
      grupo.total_cargado_unidades += rutaCargado;
      grupo.total_vendido_unidades += rutaVendido;
      grupo.total_retornado_unidades += rutaRetornado;
      grupo.total_diferencia_unidades += rutaDiferencia;
      grupo.total_vendido_soles += vSol;
      grupo.total_cobrado_soles += cSol;
      grupo.diferencia_dinero_soles += dSol;
      if (l.estado === 'CONCILIADA') grupo.cargas_conciliadas += 1;
      else grupo.cargas_observadas += 1;

      agrupadoMap.set(grupoKey, grupo);

      return {
        id: l.id,
        codigo_liquidacion: l.codigo,
        codigo_carga: l.carga_distribucion.codigo,
        fecha_liquidacion: l.fecha_liquidacion,
        conductor: l.carga_distribucion.trabajador.nombre_completo,
        vehiculo_placa: l.carga_distribucion.vehiculo.placa,
        almacen_origen: l.carga_distribucion.almacen_origen.nombre,
        total_cargado: Number(rutaCargado.toFixed(3)),
        total_vendido: Number(rutaVendido.toFixed(3)),
        total_retornado: Number(rutaRetornado.toFixed(3)),
        total_diferencia: Number(rutaDiferencia.toFixed(3)),
        efectividad_porcentaje: efectividadRuta,
        total_vendido_soles: vSol,
        total_cobrado_soles: cSol,
        diferencia_dinero_soles: dSol,
        estado: l.estado,
        observaciones: l.observaciones || null,
      };
    });

    const rendimientoPorConductor = Array.from(agrupadoMap.values()).map((g) => ({
      ...g,
      total_cargado_unidades: Number(g.total_cargado_unidades.toFixed(3)),
      total_vendido_unidades: Number(g.total_vendido_unidades.toFixed(3)),
      total_retornado_unidades: Number(g.total_retornado_unidades.toFixed(3)),
      total_diferencia_unidades: Number(g.total_diferencia_unidades.toFixed(3)),
      total_vendido_soles: Number(g.total_vendido_soles.toFixed(2)),
      total_cobrado_soles: Number(g.total_cobrado_soles.toFixed(2)),
      diferencia_dinero_soles: Number(g.diferencia_dinero_soles.toFixed(2)),
      efectividad_venta_porcentaje:
        g.total_cargado_unidades > 0
          ? Number(((g.total_vendido_unidades / g.total_cargado_unidades) * 100).toFixed(2))
          : 0,
      efectividad_venta_pct:
        g.total_cargado_unidades > 0
          ? Number(((g.total_vendido_unidades / g.total_cargado_unidades) * 100).toFixed(2))
          : 0,
    }));

    const efectividadGlobal =
      sumCargado > 0 ? Number(((sumVendido / sumCargado) * 100).toFixed(2)) : 0;

    return {
      resumen: {
        total_liquidaciones: liquidaciones.length,
        total_conductores_activos: new Set(
          liquidaciones.map((l) => l.carga_distribucion.trabajador.id),
        ).size,
        total_vehiculos_activos: new Set(
          liquidaciones.map((l) => l.carga_distribucion.vehiculo.id),
        ).size,
        total_unidades_cargadas: Number(sumCargado.toFixed(3)),
        total_unidades_vendidas: Number(sumVendido.toFixed(3)),
        total_unidades_retornadas: Number(sumRetornado.toFixed(3)),
        total_unidades_diferencia: Number(sumDiferencia.toFixed(3)),
        efectividad_global_porcentaje: efectividadGlobal,
        total_vendido_soles: Number(sumVendidoSoles.toFixed(2)),
        total_cobrado_soles: Number(sumCobradoSoles.toFixed(2)),
        diferencia_dinero_soles: Number(sumDiferenciaDinero.toFixed(2)),
        total_conciliadas: countConciliadas,
        total_observadas: countObservadas,
      },
      rendimiento: rendimientoPorConductor,
      rutas: detalleRutas,
    };
  }

  /**
   * 7. Reporte de Incidencias de Liquidación (Fase 2 / Hito 10):
   * Filtra exclusivamente liquidaciones en estado OBSERVADA, detallando diferencias de inventario,
   * descalces monetarios y justificaciones registradas.
   */
  async reporteIncidenciasDistribucion(dto: ConsultarReporteIncidenciasDto) {
    const where: Prisma.liquidacionWhereInput = {
      estado: 'OBSERVADA',
      fecha_liquidacion: {
        gte: dto.fecha_desde ? new Date(dto.fecha_desde) : undefined,
        lte: dto.fecha_hasta ? new Date(dto.fecha_hasta) : undefined,
      },
      carga_distribucion: {
        vehiculo_id: dto.vehiculo_id || undefined,
        trabajador_id: dto.trabajador_id || dto.conductor_id || undefined,
      },
    };

    const liquidaciones = await this.prisma.liquidacion.findMany({
      where,
      include: {
        carga_distribucion: {
          include: {
            vehiculo: true,
            trabajador: {
              select: { id: true, nombre_completo: true, username: true },
            },
            almacen_origen: true,
          },
        },
        liquidacion_detalle: {
          include: {
            producto: true,
            presentacion: true,
          },
        },
        usuario_liquidador: {
          select: { id: true, nombre_completo: true, username: true, rol: true },
        },
      },
      orderBy: { fecha_liquidacion: 'desc' },
    });

    let totalDescalceDinero = 0;
    let totalDiferenciaStock = 0;

    const items = liquidaciones.map((liq) => {
      const totalVendido = Number(liq.total_vendido);
      const totalCobrado = Number(liq.total_cobrado);
      const diferenciaDinero = Number(liq.diferencia_dinero);
      totalDescalceDinero += Math.abs(diferenciaDinero);

      const itemsConDiferencia = liq.liquidacion_detalle
        .filter(
          (det) =>
            Math.abs(Number(det.diferencia)) > 0.0001 ||
            (det.justificacion && det.justificacion.trim().length > 0),
        )
        .map((det) => {
          const dif = Number(det.diferencia);
          totalDiferenciaStock += Math.abs(dif);
          return {
            producto_id: det.producto_id,
            codigo_interno: det.producto.codigo_interno,
            nombre_producto: det.producto.nombre,
            unidad_base: det.producto.unidad_base,
            presentacion: det.presentacion?.nombre || null,
            cantidad_cargada: Number(det.cantidad_cargada),
            cantidad_vendida: Number(det.cantidad_vendida),
            cantidad_retornada: Number(det.cantidad_retornada),
            diferencia: dif,
            tipo_diferencia: dif > 0 ? 'FALTANTE' : dif < 0 ? 'SOBRANTE' : 'CUADRADO',
            justificacion: det.justificacion || 'Sin justificación registrada',
            precio_unitario: Number(det.precio_unitario_promedio),
            subtotal_vendido: Number(det.subtotal_vendido),
          };
        });

      const tieneDiferenciaFisica = itemsConDiferencia.length > 0;
      const tieneDescalceDinero = Math.abs(diferenciaDinero) > 0.01;

      let tipoIncidencia: 'DIFERENCIA_FISICA' | 'DESCALCE_DINERO' | 'DISCREPANCIA_MIXTA' =
        'DIFERENCIA_FISICA';
      if (tieneDiferenciaFisica && tieneDescalceDinero) {
        tipoIncidencia = 'DISCREPANCIA_MIXTA';
      } else if (tieneDescalceDinero) {
        tipoIncidencia = 'DESCALCE_DINERO';
      }

      return {
        id: liq.id,
        codigo_liquidacion: liq.codigo,
        codigo_carga: liq.carga_distribucion.codigo,
        fecha_liquidacion: liq.fecha_liquidacion,
        conductor: liq.carga_distribucion.trabajador.nombre_completo,
        conductor_id: liq.carga_distribucion.trabajador.id,
        vehiculo_placa: liq.carga_distribucion.vehiculo.placa,
        vehiculo_id: liq.carga_distribucion.vehiculo.id,
        almacen_origen: liq.carga_distribucion.almacen_origen.nombre,
        liquidador: liq.usuario_liquidador.nombre_completo,
        liquidador_rol: liq.usuario_liquidador.rol,
        total_vendido: totalVendido,
        total_cobrado: totalCobrado,
        diferencia_dinero: diferenciaDinero,
        saldo_pendiente: Math.max(0, Number((totalVendido - totalCobrado).toFixed(2))),
        tipo_incidencia: tipoIncidencia,
        observaciones: liq.observaciones || null,
        cantidad_items_afectados: itemsConDiferencia.length,
        items_con_incidencia: itemsConDiferencia,
      };
    });

    const itemsFiltrados = dto.solo_con_diferencias
      ? items.filter((liq) => liq.cantidad_items_afectados > 0 || Math.abs(liq.diferencia_dinero) > 0.01)
      : items;

    return {
      resumen: {
        total_incidencias: itemsFiltrados.length,
        total_descalce_dinero_soles: Number(totalDescalceDinero.toFixed(2)),
        total_unidades_afectadas: Number(totalDiferenciaStock.toFixed(3)),
        fecha_emision: new Date(),
      },
      items: itemsFiltrados,
    };
  }

  /**
   * 8. Auditoría de Eventos de Distribución (Fase 2 / Hito 10):
   * Filtra eventos de las entidades vehiculo, carga_distribucion y liquidacion
   * para trazabilidad histórica de quién autorizó la salida y quién liquidó la mercadería.
   */
  async reporteAuditoriaDistribucion(dto: ConsultarAuditoriaDistribucionDto) {
    const entidadesPermitidas = ['vehiculo', 'carga_distribucion', 'liquidacion'];
    const entidadFiltro = dto.entidad && entidadesPermitidas.includes(dto.entidad)
      ? dto.entidad
      : { in: entidadesPermitidas };

    const where: Prisma.auditoriaWhereInput = {
      entidad: entidadFiltro,
      usuario_id: dto.usuario_id || undefined,
      fecha: {
        gte: dto.fecha_desde ? new Date(dto.fecha_desde) : undefined,
        lte: dto.fecha_hasta ? new Date(dto.fecha_hasta) : undefined,
      },
    };

    const eventos = await this.prisma.auditoria.findMany({
      where,
      include: {
        usuario: {
          select: {
            id: true,
            username: true,
            nombre_completo: true,
            rol: true,
          },
        },
      },
      orderBy: { fecha: 'desc' },
      take: dto.limite ? Number(dto.limite) : 50,
    });

    const items = eventos.map((ev) => {
      let descripcion = `${ev.accion} en ${ev.entidad}`;
      const nuevo = ev.valor_nuevo as any;
      const anterior = ev.valor_anterior as any;

      if (ev.entidad === 'carga_distribucion') {
        if (ev.accion === 'INSERT') {
          descripcion = `Registro y programación de carga (${nuevo?.codigo || ev.registro_id})`;
        } else if (ev.accion === 'UPDATE' && nuevo?.estado === 'EN_RUTA') {
          descripcion = `Autorización de salida a ruta de carga (${nuevo?.codigo || ev.registro_id})`;
        } else if (ev.accion === 'UPDATE' && nuevo?.estado === 'FINALIZADA') {
          descripcion = `Cierre formal de carga de distribución (${nuevo?.codigo || ev.registro_id})`;
        }
      } else if (ev.entidad === 'liquidacion') {
        if (ev.accion === 'INSERT') {
          descripcion = `Liquidación oficial de ruta (${nuevo?.codigo || ev.registro_id}) - Estado: ${nuevo?.estado || 'PROCESADA'}`;
        }
      } else if (ev.entidad === 'vehiculo') {
        if (ev.accion === 'INSERT') {
          descripcion = `Alta de vehículo en flota (Placa: ${nuevo?.placa || ''})`;
        } else if (ev.accion === 'UPDATE') {
          descripcion = `Modificación de vehículo (Placa: ${nuevo?.placa || anterior?.placa || ''})`;
        } else if (ev.accion === 'DELETE') {
          descripcion = `Baja lógica de vehículo (Placa: ${anterior?.placa || ''})`;
        }
      }

      return {
        id: ev.id,
        fecha: ev.fecha,
        entidad: ev.entidad,
        registro_id: ev.registro_id,
        accion: ev.accion,
        descripcion,
        usuario_id: ev.usuario_id,
        usuario_nombre: ev.usuario?.nombre_completo || ev.usuario?.username || 'Sistema',
        usuario_rol: ev.usuario?.rol || '-',
        ip_origen: ev.ip_origen || '-',
        valor_anterior: ev.valor_anterior,
        valor_nuevo: ev.valor_nuevo,
      };
    });

    return {
      total: items.length,
      items,
    };
  }

  /**
   * Helper para generar CSV formateado compatible con Excel.
   */
  convertirACSV(filas: any[], columnas: Array<{ header: string; key: string }>): string {
    if (filas.length === 0) return '';

    const encabezados = columnas.map((c) => `"${c.header}"`).join(',');
    const lineas = filas.map((fila) =>
      columnas
        .map((c) => {
          let val = fila[c.key];
          if (val === null || val === undefined) return '""';
          if (val instanceof Date) val = val.toISOString();
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(','),
    );

    return [encabezados, ...lineas].join('\r\n');
  }
}
