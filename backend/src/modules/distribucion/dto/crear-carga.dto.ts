import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class DetalleCargaItemDto {
  @IsNotEmpty({ message: 'El ID de producto es obligatorio.' })
  @IsUUIDCustom({ message: 'El ID de producto debe ser un UUID válido.' })
  producto_id: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El ID de presentación debe ser un UUID válido.' })
  presentacion_id?: string;

  @IsNumber({}, { message: 'La cantidad en presentación debe ser un número.' })
  @Min(0, { message: 'La cantidad en presentación no puede ser negativa.' })
  @IsOptional()
  cantidad_presentacion?: number;

  @IsNumber({}, { message: 'La cantidad en unidades sueltas debe ser un número.' })
  @Min(0, { message: 'La cantidad en unidades sueltas no puede ser negativa.' })
  @IsOptional()
  cantidad_unidades_sueltas?: number;

  @IsNumber({}, { message: 'La cantidad total base debe ser un número.' })
  @Min(0.001, { message: 'La cantidad total base debe ser mayor a 0.' })
  @IsOptional()
  cantidad_total_base?: number;

  @IsString()
  @IsOptional()
  observaciones?: string;
}

export class CrearCargaDto {
  @IsNotEmpty({ message: 'El almacén de origen es obligatorio.' })
  @IsUUIDCustom({ message: 'El almacén de origen debe ser un UUID válido.' })
  almacen_origen_id: string;

  @IsNotEmpty({ message: 'El vehículo es obligatorio.' })
  @IsUUIDCustom({ message: 'El vehículo debe ser un UUID válido.' })
  vehiculo_id: string;

  @IsNotEmpty({ message: 'El trabajador responsable es obligatorio.' })
  @IsUUIDCustom({ message: 'El trabajador debe ser un UUID válido.' })
  trabajador_id: string;

  @IsString()
  @IsOptional()
  fecha_salida?: string;

  @IsString()
  @IsOptional()
  observaciones?: string;

  @IsArray({ message: 'Los detalles de carga deben ser un arreglo.' })
  @ArrayMinSize(1, { message: 'Debe incluir al menos un producto en la orden de carga.' })
  @ValidateNested({ each: true })
  @Type(() => DetalleCargaItemDto)
  detalles: DetalleCargaItemDto[];
}
