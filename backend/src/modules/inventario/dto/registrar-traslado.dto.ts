import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class RegistrarTrasladoDto {
  @IsNotEmpty({ message: 'El producto_id es obligatorio' })
  @IsUUIDCustom({ message: 'El producto_id debe ser un UUID válido' })
  producto_id: string;

  @IsNotEmpty({ message: 'El origen_id es obligatorio' })
  @IsUUIDCustom({ message: 'El origen_id debe ser un UUID válido' })
  origen_id: string;

  @IsNotEmpty({ message: 'El destino_id es obligatorio' })
  @IsUUIDCustom({ message: 'El destino_id debe ser un UUID válido' })
  destino_id: string;

  @IsNotEmpty({ message: 'La cantidad_base es obligatoria' })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'La cantidad_base debe ser numérica con máximo 3 decimales' },
  )
  @IsPositive({ message: 'La cantidad_base a trasladar debe ser mayor a cero' })
  cantidad_base: number;

  @IsNotEmpty({ message: 'El motivo del traslado es obligatorio' })
  @IsString({ message: 'El motivo debe ser texto' })
  @MinLength(3, { message: 'El motivo debe tener al menos 3 caracteres descriptivos' })
  motivo: string;

  @IsOptional()
  @IsString({ message: 'El documento_tipo debe ser texto' })
  documento_tipo?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El documento_id debe ser un UUID válido' })
  documento_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El dispositivo_id debe ser un UUID válido' })
  dispositivo_id?: string;
}
