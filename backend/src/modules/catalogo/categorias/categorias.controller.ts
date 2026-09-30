import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { CategoriasService } from './categorias.service';
import { CrearCategoriaDto } from './dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from './dto/actualizar-categoria.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolUsuario } from '../../auth/roles/roles.enum';

@Controller('categorias')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriasController {
  constructor(private readonly categoriasService: CategoriasService) {}

  @Post()
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  crear(@Body() dto: CrearCategoriaDto) {
    return this.categoriasService.crear(dto);
  }

  @Get()
  listar(@Query('soloActivos') soloActivos?: string) {
    return this.categoriasService.listar(soloActivos === 'true');
  }

  @Get(':id')
  buscarPorId(@Param('id') id: string) {
    return this.categoriasService.buscarPorId(id);
  }

  @Put(':id')
  @Roles(
    RolUsuario.ADMINISTRADOR_PROPIETARIO,
    RolUsuario.ADMINISTRADOR_SECUNDARIO,
    RolUsuario.OPERADOR_ALMACEN,
  )
  actualizar(@Param('id') id: string, @Body() dto: ActualizarCategoriaDto) {
    return this.categoriasService.actualizar(id, dto);
  }
}
