import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export const TIPOS_UBICACION_FASE1 = ['ALMACEN', 'ZONA'] as const;
export type TipoUbicacionFase1 = typeof TIPOS_UBICACION_FASE1[number];

export class CrearUbicacionDto {
  @IsString({ message: 'El tipo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El tipo de ubicación es obligatorio' })
  @IsIn(TIPOS_UBICACION_FASE1, {
    message: `El tipo de ubicación en Fase 1 debe ser uno de: ${TIPOS_UBICACION_FASE1.join(', ')}`,
  })
  tipo: TipoUbicacionFase1;

  @IsString({ message: 'El código debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código de ubicación es obligatorio' })
  @MaxLength(30, { message: 'El código no debe exceder los 30 caracteres' })
  codigo: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la ubicación es obligatorio' })
  @MaxLength(100, { message: 'El nombre no debe exceder los 100 caracteres' })
  nombre: string;

  // Si el tipo es 'ZONA', padre_id hace referencia al ALMACEN padre
  @IsUUIDCustom({ message: 'El padre_id debe ser un UUID válido' })
  @IsOptional()
  padre_id?: string;
}
