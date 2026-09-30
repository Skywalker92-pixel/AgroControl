import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { InventarioService } from './inventario.service';
import { TrasladosService } from './traslados.service';
import { RegistrarIngresoDto } from './dto/registrar-ingreso.dto';
import { RegistrarSalidaDto } from './dto/registrar-salida.dto';
import { RegistrarAjusteDto } from './dto/registrar-ajuste.dto';
import { RegistrarTrasladoDto } from './dto/registrar-traslado.dto';
import { ConsultarStockDto } from './dto/consultar-stock.dto';
import { ConsultarTrasladosDto } from './dto/consultar-traslados.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolUsuario } from '../auth/roles/roles.enum';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClientIp } from '../auth/decorators/client-ip.decorator';

@Controller('inventario')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InventarioController {
  constructor(
    private readonly inventarioService: InventarioService,
    private readonly trasladosService: TrasladosService,
  ) {}

  @Post('ingreso')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  registrarIngreso(
    @Body() dto: RegistrarIngresoDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.inventarioService.registrarIngreso(dto, usuarioId, ipOrigen);
  }

  @Post('salida')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  registrarSalida(
    @Body() dto: RegistrarSalidaDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.inventarioService.registrarSalida(dto, usuarioId, ipOrigen);
  }

  @Post('ajuste')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  registrarAjuste(
    @Body() dto: RegistrarAjusteDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.inventarioService.registrarAjuste(dto, usuarioId, ipOrigen);
  }

  @Post('traslado')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  registrarTraslado(
    @Body() dto: RegistrarTrasladoDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.trasladosService.registrarTraslado(dto, usuarioId, ipOrigen);
  }

  @Get('traslados')
  consultarTraslados(@Query() dto: ConsultarTrasladosDto) {
    return this.trasladosService.consultarTraslados(dto);
  }

  @Get('stock')
  consultarStockInventario(@Query() dto: ConsultarStockDto) {
    return this.inventarioService.consultarStock(dto);
  }
}

@Controller('stock')
@UseGuards(JwtAuthGuard)
export class StockController {
  constructor(private readonly inventarioService: InventarioService) {}

  @Get()
  consultarStock(@Query() dto: ConsultarStockDto) {
    return this.inventarioService.consultarStock(dto);
  }
}
