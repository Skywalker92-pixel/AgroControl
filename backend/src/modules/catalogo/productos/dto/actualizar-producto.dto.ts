import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { UNIDADES_BASE_VALIDAS, UnidadBase } from './crear-producto.dto';
import { IsUUIDCustom } from '../../../../core/decorators/is-uuid-custom.decorator';

export class ActualizarProductoDto {
  @IsString({ message: 'El código interno debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(30, { message: 'El código interno no debe exceder los 30 caracteres' })
  codigo_interno?: string;

  @IsString({ message: 'El código de barras debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(50, { message: 'El código de barras no debe exceder los 50 caracteres' })
  codigo_barras?: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(150, { message: 'El nombre no debe exceder los 150 caracteres' })
  nombre?: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  descripcion?: string;

  @IsUUIDCustom({ message: 'El ID de categoría debe ser un UUID válido' })
  @IsOptional()
  categoria_id?: string;

  @IsString({ message: 'La unidad base debe ser una cadena de texto' })
  @IsOptional()
  @IsIn(UNIDADES_BASE_VALIDAS, {
    message: `La unidad base debe ser una de las permitidas: ${UNIDADES_BASE_VALIDAS.join(', ')}`,
  })
  unidad_base?: UnidadBase;

  @IsBoolean({ message: 'El estado activo debe ser un valor booleano' })
  @IsOptional()
  activo?: boolean;
}
