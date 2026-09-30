import { IsNotEmpty, IsNumber, IsOptional, IsString, MinLength, NotEquals, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class RegistrarAjusteDto {
  @IsNotEmpty({ message: 'El producto_id es obligatorio' })
  @IsUUIDCustom({ message: 'El producto_id debe ser un UUID válido' })
  producto_id: string;

  @IsNotEmpty({ message: 'La ubicacion_id es obligatoria' })
  @IsUUIDCustom({ message: 'La ubicacion_id debe ser un UUID válido' })
  ubicacion_id: string;

  @IsNotEmpty({ message: 'La diferencia_base es obligatoria' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'La diferencia_base debe ser numérica con máximo 3 decimales' })
  @NotEquals(0, { message: 'La diferencia del ajuste no puede ser 0' })
  diferencia_base: number;

  @IsNotEmpty({ message: 'El motivo es obligatorio para registrar un ajuste de inventario' })
  @IsString({ message: 'El motivo debe ser texto' })
  @MinLength(3, { message: 'El motivo debe tener al menos 3 caracteres descriptivos' })
  motivo: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El costo_unitario debe tener máximo 4 decimales' })
  @Min(0, { message: 'El costo_unitario no puede ser negativo' })
  costo_unitario?: number;

  @IsOptional()
  @IsUUIDCustom({ message: 'El dispositivo_id debe ser un UUID válido' })
  dispositivo_id?: string;
}
