import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  ParseUUIDPipe,
  Body,
  Query,
  Res,
  UseGuards,
  Headers,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { SincronizacionService } from './sincronizacion.service';
import { RegistrarDispositivoDto } from './dto/registrar-dispositivo.dto';
import { SincronizacionPullDto } from './dto/sincronizacion-pull.dto';
import { SincronizacionPushDto } from './dto/sincronizacion-push.dto';
import { ConsultarOperacionesObservadasDto } from './dto/consultar-operaciones-observadas.dto';
import { ResolverOperacionObservadaDto } from './dto/resolver-operacion-observada.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/roles/roles.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClientIp } from '../auth/decorators/client-ip.decorator';
import { AppVersionGuard } from './guards/app-version.guard';
import { DispositivoActivoGuard } from './guards/dispositivo-activo.guard';

@Controller('sync')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SincronizacionController {
  constructor(private readonly sincronizacionService: SincronizacionService) {}

  /**
   * 1. Registro y Autorización de Terminales Móviles (RF-72).
   */
  @Post('dispositivos/registrar')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
    RolUsuario.VENDEDOR,
  )
  registrarDispositivo(
    @Body() dto: RegistrarDispositivoDto,
    @CurrentUser('id') usuarioId: string,
    @CurrentUser('rol') usuarioRol: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.sincronizacionService.registrarDispositivo(
      dto,
      usuarioId,
      usuarioRol,
      ipOrigen,
    );
  }

  /**
   * 1.1 Autorización de Terminales Móviles (OBS-SEC-02 / OBS-SEC-03).
   * Acción EXCLUSIVA para ADMINISTRADOR_PROPIETARIO y ADMINISTRADOR_SECUNDARIO.
   */
  @Patch('dispositivos/:id/autorizar')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
  )
  autorizarDispositivo(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.sincronizacionService.autorizarDispositivo(
      id,
      usuarioId,
      ipOrigen,
    );
  }

  /**
   * 2. Sincronización Descendente Incremental (PULL: PC -> Móvil).
   * Valida versión mínima requerida (426 Upgrade Required) y estado activo del terminal.
   */
  @Get('pull')
  @UseGuards(AppVersionGuard, DispositivoActivoGuard)
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
    RolUsuario.VENDEDOR,
  )
  sincronizacionPull(
    @Query() dto: SincronizacionPullDto,
    @CurrentUser('id') usuarioId: string,
    @CurrentUser('rol') usuarioRol: string,
  ) {
    return this.sincronizacionService.sincronizacionPull(
      dto,
      usuarioId,
      usuarioRol,
    );
  }

  /**
   * 3. Sincronización Ascendente por Lotes (PUSH: Móvil -> PC).
   * Motor Idempotente con UUIDs de cliente, doble timestamp y máquina de estados.
   * Rate limiting operativo: 30 peticiones por minuto por IP (OBS-SEC-06).
   */
  @Post('push')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @UseGuards(AppVersionGuard, DispositivoActivoGuard)
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
    RolUsuario.VENDEDOR,
  )
  sincronizacionPush(
    @Body() dto: SincronizacionPushDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
    @Headers('x-device-id') deviceIdHeader?: string,
  ) {
    return this.sincronizacionService.sincronizacionPush(
      dto,
      usuarioId,
      ipOrigen,
      deviceIdHeader,
    );
  }

  /**
   * 4. Auditoría de Operaciones Observadas.
   * Lista transacciones con discrepancias de saldo o descalces para revisión administrativa.
   */
  @Get('operaciones-observadas')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  async consultarOperacionesObservadas(
    @Query() dto: ConsultarOperacionesObservadasDto,
    @Res() res: Response,
  ) {
    const data = await this.sincronizacionService.consultarOperacionesObservadas(dto);

    if (dto.formato === 'csv') {
      const csv = this.sincronizacionService.convertirACSV(data.items);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        'attachment; filename="operaciones_observadas.csv"',
      );
      return res.send(csv);
    }

    return res.json(data);
  }

  /**
   * 5. Detalle de una Operación Observada por ID.
   */
  @Get('operaciones-observadas/:id')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  obtenerOperacionObservadaPorId(@Param('id', ParseUUIDPipe) id: string) {
    return this.sincronizacionService.obtenerOperacionObservadaPorId(id);
  }

  /**
   * 6. Resolución Administrativa de Operaciones Observadas (HITO 13).
   * Acción EXCLUSIVA para ADMINISTRADOR_PROPIETARIO y ADMINISTRADOR_SECUNDARIO.
   * Bloqueado para VENDEDOR y OPERADOR_ALMACEN con 403 Forbidden.
   */
  @Patch('operaciones-observadas/:id/resolver')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
  )
  resolverOperacionObservada(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolverOperacionObservadaDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.sincronizacionService.resolverOperacionObservada(
      id,
      dto,
      usuarioId,
      ipOrigen,
    );
  }
}
