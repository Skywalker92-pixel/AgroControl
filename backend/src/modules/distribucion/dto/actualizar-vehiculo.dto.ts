import { IsOptional, IsString, IsNumber, Min, IsBoolean, MaxLength } from 'class-validator';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class ActualizarVehiculoDto {
  @IsString()
  @IsOptional()
  @MaxLength(20)
  placa?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  marca?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  modelo?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50)
  tipo_vehiculo?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  capacidad_kg?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  capacidad_volumen?: number;

  @IsUUIDCustom({ message: 'El ID del conductor habitual debe ser un UUID válido.' })
  @IsOptional()
  conductor_habitual_id?: string | null;

  @IsBoolean()
  @IsOptional()
  activo?: boolean;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
