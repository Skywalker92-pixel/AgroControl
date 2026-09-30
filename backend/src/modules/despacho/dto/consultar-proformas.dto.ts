import { IsOptional, IsISO8601, IsInt, Min, Max, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class ConsultarProformasDto {
  @IsOptional()
  @IsUUIDCustom({ message: 'El cliente_id debe ser un UUID válido' })
  cliente_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'La ubicacion_id debe ser un UUID válido' })
  ubicacion_id?: string;

  @IsOptional()
  @IsString({ message: 'El estado debe ser texto' })
  estado?: string;

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
