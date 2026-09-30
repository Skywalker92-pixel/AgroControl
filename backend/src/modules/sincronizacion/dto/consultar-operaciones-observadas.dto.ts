import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class ConsultarOperacionesObservadasDto {
  @IsOptional()
  @IsUUIDCustom({ message: 'El dispositivo_id debe ser un UUID válido' })
  dispositivo_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El usuario_id debe ser un UUID válido' })
  usuario_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El carga_distribucion_id debe ser un UUID válido' })
  carga_distribucion_id?: string;

  @IsOptional()
  @IsString({ message: 'El tipo de operación debe ser texto' })
  tipo_operacion?: string;

  @IsOptional()
  @IsString({ message: 'El estado de sincronización debe ser texto' })
  estado_sync?: string;

  @IsOptional()
  @IsString({ message: 'La fecha desde debe ser texto' })
  fecha_desde?: string;

  @IsOptional()
  @IsString({ message: 'La fecha hasta debe ser texto' })
  fecha_hasta?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limite?: number = 50;

  @IsOptional()
  @IsString()
  formato?: 'json' | 'csv' = 'json';
}
