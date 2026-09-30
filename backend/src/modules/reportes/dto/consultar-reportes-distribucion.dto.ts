import { IsOptional, IsString, IsNumber, IsBoolean, Min } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class ConsultarReporteRutasDto {
  @IsOptional()
  @IsString()
  fecha_desde?: string;

  @IsOptional()
  @IsString()
  fecha_hasta?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El vehiculo_id debe ser un UUID válido' })
  vehiculo_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El trabajador_id debe ser un UUID válido' })
  trabajador_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El conductor_id debe ser un UUID válido' })
  conductor_id?: string;

  @IsOptional()
  @IsString()
  formato?: 'json' | 'csv' = 'json';
}

export class ConsultarReporteIncidenciasDto {
  @IsOptional()
  @IsString()
  fecha_desde?: string;

  @IsOptional()
  @IsString()
  fecha_hasta?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El vehiculo_id debe ser un UUID válido' })
  vehiculo_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El trabajador_id debe ser un UUID válido' })
  trabajador_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El conductor_id debe ser un UUID válido' })
  conductor_id?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  solo_con_diferencias?: boolean;

  @IsOptional()
  @IsString()
  formato?: 'json' | 'csv' = 'json';
}

export class ConsultarAuditoriaDistribucionDto {
  @IsOptional()
  @IsString()
  entidad?: 'vehiculo' | 'carga_distribucion' | 'liquidacion';

  @IsOptional()
  @IsUUIDCustom({ message: 'El usuario_id debe ser un UUID válido' })
  usuario_id?: string;

  @IsOptional()
  @IsString()
  fecha_desde?: string;

  @IsOptional()
  @IsString()
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
