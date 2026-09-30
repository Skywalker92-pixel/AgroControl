import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsUUIDCustom } from '../../../../core/decorators/is-uuid-custom.decorator';

export const UNIDADES_BASE_VALIDAS = ['botella', 'saco', 'unidad', 'kg', 'litro', 'gramo'] as const;
export type UnidadBase = typeof UNIDADES_BASE_VALIDAS[number];

export class CrearProductoDto {
  @IsString({ message: 'El código interno debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código interno es obligatorio' })
  @MaxLength(30, { message: 'El código interno no debe exceder los 30 caracteres' })
  codigo_interno: string;

  // POR VALIDAR: Campo opcional/nullable, sin obligatoriedad
  @IsString({ message: 'El código de barras debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(50, { message: 'El código de barras no debe exceder los 50 caracteres' })
  codigo_barras?: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del producto es obligatorio' })
  @MaxLength(150, { message: 'El nombre no debe exceder los 150 caracteres' })
  nombre: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  descripcion?: string;

  @IsUUIDCustom({ message: 'El ID de categoría debe ser un UUID válido' })
  @IsNotEmpty({ message: 'La categoría es obligatoria' })
  categoria_id: string;

  @IsString({ message: 'La unidad base debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La unidad base es obligatoria' })
  @IsIn(UNIDADES_BASE_VALIDAS, {
    message: `La unidad base debe ser una de las permitidas: ${UNIDADES_BASE_VALIDAS.join(', ')}`,
  })
  unidad_base: UnidadBase;
}
