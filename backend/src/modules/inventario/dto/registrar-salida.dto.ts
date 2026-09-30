import { IsNotEmpty, IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class RegistrarSalidaDto {
  @IsNotEmpty({ message: 'El producto_id es obligatorio' })
  @IsUUIDCustom({ message: 'El producto_id debe ser un UUID válido' })
  producto_id: string;

  @IsNotEmpty({ message: 'La ubicacion_id es obligatoria' })
  @IsUUIDCustom({ message: 'La ubicacion_id debe ser un UUID válido' })
  ubicacion_id: string;

  @IsNotEmpty({ message: 'La cantidad_base es obligatoria' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'La cantidad_base debe ser numérica con máximo 3 decimales' })
  @IsPositive({ message: 'La cantidad_base de salida debe ser mayor a cero' })
  cantidad_base: number;

  @IsOptional()
  @IsString({ message: 'El documento_tipo debe ser texto' })
  documento_tipo?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El documento_id debe ser un UUID válido' })
  documento_id?: string;

  @IsOptional()
  @IsString({ message: 'El motivo debe ser texto' })
  motivo?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El dispositivo_id debe ser un UUID válido' })
  dispositivo_id?: string;
}
