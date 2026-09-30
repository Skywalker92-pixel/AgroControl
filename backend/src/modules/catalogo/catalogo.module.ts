import { Module } from '@nestjs/common';
import { CategoriasService } from './categorias/categorias.service';
import { CategoriasController } from './categorias/categorias.controller';
import { ProductosService } from './productos/productos.service';
import { ProductosController } from './productos/productos.controller';
import { PresentacionesService } from './presentaciones/presentaciones.service';
import { PresentacionesController } from './presentaciones/presentaciones.controller';
import { PreciosService } from './precios/precios.service';
import { PreciosController } from './precios/precios.controller';

@Module({
  controllers: [
    CategoriasController,
    ProductosController,
    PresentacionesController,
    PreciosController,
  ],
  providers: [
    CategoriasService,
    ProductosService,
    PresentacionesService,
    PreciosService,
  ],
  exports: [
    CategoriasService,
    ProductosService,
    PresentacionesService,
    PreciosService,
  ],
})
export class CatalogoModule {}
