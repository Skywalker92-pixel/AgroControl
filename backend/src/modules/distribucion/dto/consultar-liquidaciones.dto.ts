import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class ConsultarLiquidacionesDto {
  @IsOptional()
  @IsIn(['CONCILIADA', 'OBSERVADA'], {
    message: 'El estado debe ser CONCILIADA u OBSERVADA',
  })
  estado?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El trabajador_id debe ser un UUID válido' })
  trabajador_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El vehiculo_id debe ser un UUID válido' })
  vehiculo_id?: string;

  @IsOptional()
  @IsString({ message: 'La fecha desde debe ser una cadena válida' })
  fecha_desde?: string;

  @IsOptional()
  @IsString({ message: 'La fecha hasta debe ser una cadena válida' })
  fecha_hasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number = 0;
}
