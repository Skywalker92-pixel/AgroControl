import { IsOptional, IsISO8601, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class ConsultarTrasladosDto {
  @IsOptional()
  @IsUUIDCustom({ message: 'El producto_id debe ser un UUID válido' })
  producto_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El origen_id debe ser un UUID válido' })
  origen_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El destino_id debe ser un UUID válido' })
  destino_id?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'La fecha_desde debe ser una fecha ISO válida' })
  fecha_desde?: string;

  @IsOptional()
  @IsISO8601({}, { message: 'La fecha_hasta debe ser una fecha ISO válida' })
  fecha_hasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}
