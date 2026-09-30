import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { CrearProductoDto } from './dto/crear-producto.dto';
import { ActualizarProductoDto } from './dto/actualizar-producto.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '../../auth/roles/roles.enum';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { ClientIp } from '../../auth/decorators/client-ip.decorator';

@Controller('productos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductosController {
  constructor(private readonly productosService: ProductosService) {}

  @Post()
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  crear(
    @Body() dto: CrearProductoDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.productosService.crear(dto, usuarioId, ipOrigen);
  }

  @Get()
  listar(
    @Query('categoriaId') categoriaId?: string,
    @Query('busqueda') busqueda?: string,
    @Query('soloActivos') soloActivos?: string,
  ) {
    return this.productosService.listar(categoriaId, busqueda, soloActivos === 'true');
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.productosService.buscarPorId(id);
  }

  @Put(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  actualizar(
    @Param('id') id: string,
    @Body() dto: ActualizarProductoDto,
    @CurrentUser('id') usuarioId: string,
    @ClientIp() ipOrigen: string,
  ) {
    return this.productosService.actualizar(id, dto, usuarioId, ipOrigen);
  }
}
