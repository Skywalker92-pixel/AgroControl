import {
  Controller,
  Get,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ReportesService } from './reportes.service';
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/roles/roles.enum';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('stock-almacen')
  async reporteStock(
    @Query() dto: ConsultarReporteStockDto,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.reporteStockAlmacen(dto);
    if (dto.formato === 'csv') {
      const csv = this.reportesService.convertirACSV(data.items, [
        { header: 'Código', key: 'codigo_interno' },
        { header: 'Producto', key: 'nombre' },
        { header: 'Categoría', key: 'categoria' },
        { header: 'Almacén', key: 'almacen_nombre' },
        { header: 'Físico', key: 'cantidad_fisica' },
        { header: 'Reservado', key: 'cantidad_reservada' },
        { header: 'Disponible', key: 'cantidad_disponible' },
        { header: 'Unidad', key: 'unidad_base' },
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="reporte_stock.csv"',
      );
      return res.send(csv);
    }
    return res.json(data);
  }

  @Get('movimientos-kardex')
  async reporteMovimientos(
    @Query() dto: ConsultarReporteMovimientosDto,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.reporteMovimientosKardex(dto);
    if (dto.formato === 'csv') {
      const csv = this.reportesService.convertirACSV(data.items, [
        { header: 'Fecha', key: 'fecha_operacion' },
        { header: 'Tipo', key: 'tipo' },
        { header: 'Código', key: 'codigo_producto' },
        { header: 'Producto', key: 'nombre_producto' },
        { header: 'Almacén', key: 'almacen' },
        { header: 'Cantidad', key: 'cantidad_base' },
        { header: 'Documento', key: 'documento_tipo' },
        { header: 'Motivo', key: 'motivo' },
        { header: 'Usuario', key: 'usuario' },
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="reporte_kardex.csv"',
      );
      return res.send(csv);
    }
    return res.json(data);
  }

  @Get('menor-stock')
  async reporteMenorStock(
    @Query() dto: ConsultarReporteMenorStockDto,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.reporteMenorStock(dto);
    if (dto.formato === 'csv') {
      const csv = this.reportesService.convertirACSV(data.items, [
        { header: 'Código', key: 'codigo_interno' },
        { header: 'Producto', key: 'nombre' },
        { header: 'Categoría', key: 'categoria' },
        { header: 'Almacén', key: 'almacen' },
        { header: 'Físico', key: 'cantidad_fisica' },
        { header: 'Disponible', key: 'cantidad_disponible' },
        { header: 'Alerta', key: 'estado_alerta' },
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="reporte_menor_stock.csv"',
      );
      return res.send(csv);
    }
    return res.json(data);
  }

  @Get('despachos')
  async reporteDespachos(
    @Query() dto: ConsultarReporteDespachosDto,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.reporteDespachos(dto);
    if (dto.formato === 'csv') {
      const csv = this.reportesService.convertirACSV(data.items, [
        { header: 'Número', key: 'numero' },
        { header: 'Fecha Despacho', key: 'fecha_despacho' },
        { header: 'Cliente', key: 'cliente' },
        { header: 'Almacén', key: 'almacen' },
        { header: 'Vendedor', key: 'vendedor' },
        { header: 'Unidades Base', key: 'total_unidades_base' },
        { header: 'Total Soles', key: 'total' },
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="reporte_despachos.csv"',
      );
      return res.send(csv);
    }
    return res.json(data);
  }

  @Get('conciliacion')
  async reporteConciliacion(
    @Query('ubicacion_id') ubicacionId: string,
    @Query('formato') formato: string,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.reporteConciliacionGeneral(ubicacionId);
    if (formato === 'csv') {
      const csv = this.reportesService.convertirACSV(data.items, [
        { header: 'Código', key: 'codigo_interno' },
        { header: 'Producto', key: 'nombre_producto' },
        { header: 'Almacén', key: 'almacen_nombre' },
        { header: 'Saldo Físico', key: 'saldo_fisico' },
        { header: 'Total Kárdex', key: 'total_kardex' },
        { header: 'Discrepancia', key: 'discrepancia' },
        { header: 'Estado Conciliación', key: 'estado' },
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="auditoria_conciliacion.csv"',
      );
      return res.send(csv);
    }
    return res.json(data);
  }

  @Get('distribucion/resumen-rutas')
  async reporteResumenRutas(
    @Query() dto: ConsultarReporteRutasDto,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.reporteResumenRutas(dto);
    if (dto.formato === 'csv') {
      const csv = this.reportesService.convertirACSV(data.rutas, [
        { header: 'Código Liquidación', key: 'codigo_liquidacion' },
        { header: 'Código Carga', key: 'codigo_carga' },
        { header: 'Fecha Liquidación', key: 'fecha_liquidacion' },
        { header: 'Conductor', key: 'conductor' },
        { header: 'Placa Vehículo', key: 'vehiculo_placa' },
        { header: 'Almacén Origen', key: 'almacen_origen' },
        { header: 'Total Cargado', key: 'total_cargado' },
        { header: 'Total Vendido', key: 'total_vendido' },
        { header: 'Total Retornado', key: 'total_retornado' },
        { header: 'Diferencia', key: 'total_diferencia' },
        { header: 'Efectividad (%)', key: 'efectividad_porcentaje' },
        { header: 'Total Vendido (S/)', key: 'total_vendido_soles' },
        { header: 'Total Cobrado (S/)', key: 'total_cobrado_soles' },
        { header: 'Diferencia Dinero (S/)', key: 'diferencia_dinero_soles' },
        { header: 'Estado', key: 'estado' },
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="reporte_resumen_rutas.csv"',
      );
      return res.send(csv);
    }
    return res.json(data);
  }

  @Get('distribucion/incidencias')
  async reporteIncidencias(
    @Query() dto: ConsultarReporteIncidenciasDto,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.reporteIncidenciasDistribucion(dto);
    if (dto.formato === 'csv') {
      const csv = this.reportesService.convertirACSV(data.items, [
        { header: 'Código Liquidación', key: 'codigo_liquidacion' },
        { header: 'Código Carga', key: 'codigo_carga' },
        { header: 'Fecha Liquidación', key: 'fecha_liquidacion' },
        { header: 'Conductor', key: 'conductor' },
        { header: 'Placa Vehículo', key: 'vehiculo_placa' },
        { header: 'Liquidador', key: 'liquidador' },
        { header: 'Tipo Incidencia', key: 'tipo_incidencia' },
        { header: 'Total Vendido (S/)', key: 'total_vendido' },
        { header: 'Total Cobrado (S/)', key: 'total_cobrado' },
        { header: 'Diferencia Dinero (S/)', key: 'diferencia_dinero' },
        { header: 'Saldo Pendiente (S/)', key: 'saldo_pendiente' },
        { header: 'Ítems Afectados', key: 'cantidad_items_afectados' },
        { header: 'Observaciones', key: 'observaciones' },
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="reporte_incidencias_distribucion.csv"',
      );
      return res.send(csv);
    }
    return res.json(data);
  }

  @Get('distribucion/auditoria')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  async reporteAuditoria(
    @Query() dto: ConsultarAuditoriaDistribucionDto,
    @Res() res: Response,
  ) {
    const data = await this.reportesService.reporteAuditoriaDistribucion(dto);
    if (dto.formato === 'csv') {
      const csv = this.reportesService.convertirACSV(data.items, [
        { header: 'Fecha', key: 'fecha' },
        { header: 'Entidad', key: 'entidad' },
        { header: 'Acción', key: 'accion' },
        { header: 'Descripción', key: 'descripcion' },
        { header: 'Usuario', key: 'usuario_nombre' },
        { header: 'Rol', key: 'usuario_rol' },
        { header: 'IP Origen', key: 'ip_origen' },
        { header: 'Registro ID', key: 'registro_id' },
      ]);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="reporte_auditoria_distribucion.csv"',
      );
      return res.send(csv);
    }
    return res.json(data);
  }
}

