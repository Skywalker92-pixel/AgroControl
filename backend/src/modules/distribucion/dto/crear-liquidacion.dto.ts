import {
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class ItemLiquidacionDto {
  @IsNotEmpty({ message: 'El producto es obligatorio' })
  @IsUUIDCustom({ message: 'El producto_id debe ser un UUID válido' })
  producto_id: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El presentacion_id debe ser un UUID válido' })
  presentacion_id?: string;

  @IsNumber({}, { message: 'La cantidad vendida debe ser numérica' })
  @Min(0, { message: 'La cantidad vendida no puede ser negativa' })
  cantidad_vendida: number;

  @IsNumber({}, { message: 'La cantidad retornada debe ser numérica' })
  @Min(0, { message: 'La cantidad retornada no puede ser negativa' })
  cantidad_retornada: number;

  @IsOptional()
  @IsNumber({}, { message: 'La diferencia debe ser numérica' })
  diferencia?: number;

  @IsOptional()
  @IsString({ message: 'La justificación debe ser una cadena de texto' })
  justificacion?: string;

  @IsOptional()
  @IsNumber({}, { message: 'El precio unitario promedio debe ser numérico' })
  @Min(0, { message: 'El precio unitario promedio no puede ser negativo' })
  precio_unitario_promedio?: number;
}

export class CrearLiquidacionDto {
  @IsNotEmpty({ message: 'El identificador de la carga de distribución es obligatorio' })
  @IsUUIDCustom({ message: 'El carga_distribucion_id debe ser un UUID válido' })
  carga_distribucion_id: string;

  @IsNumber({}, { message: 'El total cobrado debe ser numérico' })
  @Min(0, { message: 'El total cobrado no puede ser negativo' })
  total_cobrado: number;

  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  observaciones?: string;

  @IsArray({ message: 'Los ítems de liquidación deben ser una lista' })
  @ValidateNested({ each: true })
  @Type(() => ItemLiquidacionDto)
  items: ItemLiquidacionDto[];
}
