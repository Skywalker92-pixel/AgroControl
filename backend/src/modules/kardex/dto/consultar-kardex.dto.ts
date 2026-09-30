import { IsDateString, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class ConsultarKardexDto {
  @IsUUIDCustom({ message: 'El producto_id debe ser un UUID válido' })
  @IsOptional()
  producto_id?: string;

  @IsUUIDCustom({ message: 'El ubicacion_id debe ser un UUID válido' })
  @IsOptional()
  ubicacion_id?: string;

  @IsString({ message: 'El tipo de movimiento debe ser una cadena de texto' })
  @IsOptional()
  tipo?: string;

  @IsDateString({}, { message: 'La fecha_desde debe tener formato ISO válido' })
  @IsOptional()
  fecha_desde?: string;

  @IsDateString({}, { message: 'La fecha_hasta debe tener formato ISO válido' })
  @IsOptional()
  fecha_hasta?: string;

  @Type(() => Number)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsOptional()
  limit?: number = 50;
}
