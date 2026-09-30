import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class CrearProformaItemDto {
  @IsNotEmpty({ message: 'El producto_id es obligatorio' })
  @IsUUIDCustom({ message: 'El producto_id debe ser un UUID válido' })
  producto_id: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El presentacion_id debe ser un UUID válido' })
  presentacion_id?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'La cantidad_presentacion debe ser numérica' },
  )
  @Min(0, { message: 'La cantidad_presentacion no puede ser negativa' })
  cantidad_presentacion?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'Las unidades_sueltas deben ser numéricas' },
  )
  @Min(0, { message: 'Las unidades_sueltas no pueden ser negativas' })
  unidades_sueltas?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 3 },
    { message: 'La cantidad_total_base debe ser numérica' },
  )
  @Min(0, { message: 'La cantidad_total_base no puede ser negativa' })
  cantidad_total_base?: number;
}

export class CrearProformaDto {
  @IsNotEmpty({ message: 'El cliente_id es obligatorio' })
  @IsUUIDCustom({ message: 'El cliente_id debe ser un UUID válido' })
  cliente_id: string;

  @IsNotEmpty({ message: 'La ubicacion_id (almacén de despacho) es obligatoria' })
  @IsUUIDCustom({ message: 'La ubicacion_id debe ser un UUID válido' })
  ubicacion_id: string;

  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  observaciones?: string;

  @IsOptional()
  @IsEnum(['BORRADOR', 'RESERVADO'], {
    message: 'El estado inicial solo puede ser BORRADOR o RESERVADO',
  })
  estado_inicial?: 'BORRADOR' | 'RESERVADO' = 'BORRADOR';

  @IsArray({ message: 'Los items deben ser un arreglo' })
  @ArrayMinSize(1, { message: 'La proforma debe contener al menos un producto' })
  @ValidateNested({ each: true })
  @Type(() => CrearProformaItemDto)
  items: CrearProformaItemDto[];
}
