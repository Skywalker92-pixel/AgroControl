import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class ConsultarReporteStockDto {
  @IsOptional()
  @IsUUIDCustom({ message: 'La ubicacion_id debe ser un UUID válido' })
  ubicacion_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'La categoria_id debe ser un UUID válido' })
  categoria_id?: string;

  @IsOptional()
  @IsString()
  formato?: 'json' | 'csv' = 'json';
}

export class ConsultarReporteMovimientosDto {
  @IsOptional()
  @IsUUIDCustom({ message: 'El producto_id debe ser un UUID válido' })
  producto_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'La ubicacion_id debe ser un UUID válido' })
  ubicacion_id?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsOptional()
  @IsString()
  fecha_desde?: string;

  @IsOptional()
  @IsString()
  fecha_hasta?: string;

  @IsOptional()
  @IsString()
  formato?: 'json' | 'csv' = 'json';
}

export class ConsultarReporteMenorStockDto {
  @IsOptional()
  @IsUUIDCustom({ message: 'La ubicacion_id debe ser un UUID válido' })
  ubicacion_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  umbral?: number = 20;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  formato?: 'json' | 'csv' = 'json';
}

export class ConsultarReporteDespachosDto {
  @IsOptional()
  @IsUUIDCustom({ message: 'La ubicacion_id debe ser un UUID válido' })
  ubicacion_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El cliente_id debe ser un UUID válido' })
  cliente_id?: string;

  @IsOptional()
  @IsString()
  fecha_desde?: string;

  @IsOptional()
  @IsString()
  fecha_hasta?: string;

  @IsOptional()
  @IsString()
  formato?: 'json' | 'csv' = 'json';
}
