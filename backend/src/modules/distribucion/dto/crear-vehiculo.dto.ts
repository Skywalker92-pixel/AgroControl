import { IsNotEmpty, IsOptional, IsString, IsNumber, Min, MaxLength } from 'class-validator';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class CrearVehiculoDto {
  @IsString()
  @IsNotEmpty({ message: 'La placa del vehículo es obligatoria.' })
  @MaxLength(20, { message: 'La placa no debe exceder 20 caracteres.' })
  placa: string;

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
  @Min(0, { message: 'La capacidad en kg debe ser positiva o cero.' })
  capacidad_kg?: number;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: 'La capacidad en volumen debe ser positiva o cero.' })
  capacidad_volumen?: number;

  @IsUUIDCustom({ message: 'El ID del conductor habitual debe ser un UUID válido.' })
  @IsOptional()
  conductor_habitual_id?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;
}
