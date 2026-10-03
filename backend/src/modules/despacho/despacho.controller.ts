import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { DespachoService } from './despacho.service';
import { CrearProformaDto } from './dto/crear-proforma.dto';
import { CambiarEstadoProformaDto } from './dto/cambiar-estado-proforma.dto';
import { ConsultarProformasDto } from './dto/consultar-proformas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ClientIp } from '../auth/decorators/client-ip.decorator';

@Controller('despacho/proformas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DespachoController {
  constructor(private readonly despachoService: DespachoService) {}

  @Post()
  crearProforma(
    @Body() dto: CrearProformaDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.despachoService.crearProforma(dto, usuarioId, ipOrigen);
  }

  @Patch(':id/estado')
  cambiarEstado(
    @Param('id') id: string,
    @Body() dto: CambiarEstadoProformaDto,
    @CurrentUser('id') usuarioId: string,
    @CurrentUser('rol') userRol: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.despachoService.cambiarEstado(
      id,
      dto,
      usuarioId,
      userRol,
      ipOrigen,
    );
  }

  @Get()
  consultarProformas(
    @Query() dto: ConsultarProformasDto,
    @CurrentUser('id') usuarioId: string,
    @CurrentUser('rol') usuarioRol: string,
  ) {
    return this.despachoService.consultarProformas(dto, usuarioId, usuarioRol);
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.despachoService.buscarPorId(id);
  }

  @Get(':id/orden-despacho')
  obtenerOrdenDespacho(@Param('id') id: string) {
    return this.despachoService.obtenerOrdenDespacho(id);
  }
}
