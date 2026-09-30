import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { IsUUIDCustom } from '../../../../core/decorators/is-uuid-custom.decorator';

export class CalcularConversionDto {
  @IsUUIDCustom({ message: 'El producto_id debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El ID del producto es obligatorio' })
  producto_id: string;

  @IsUUIDCustom({ message: 'El presentacion_id debe ser un UUID válido' })
  @IsOptional()
  presentacion_id?: string;

  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'La cantidad en presentación debe ser numérica' })
  @Min(0, { message: 'La cantidad en presentación no puede ser negativa' })
  @IsOptional()
  cantidad_presentacion?: number;

  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'Las unidades sueltas deben ser numéricas' })
  @Min(0, { message: 'Las unidades sueltas no pueden ser negativas' })
  @IsOptional()
  unidades_sueltas?: number;
}
