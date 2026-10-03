import {
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class DetalleOperacionSyncDto {
  @IsNotEmpty({ message: 'El producto_id es obligatorio' })
  @IsUUIDCustom({ message: 'El producto_id debe ser un UUID válido' })
  producto_id: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El presentacion_id debe ser un UUID válido' })
  presentacion_id?: string;

  @IsNumber({}, { message: 'La cantidad debe ser numérica' })
  @Min(0.001, { message: 'La cantidad debe ser mayor a cero' })
  cantidad: number;

  @IsOptional()
  @IsNumber({}, { message: 'El precio unitario debe ser numérico' })
  @Min(0, { message: 'El precio unitario no puede ser negativo' })
  precio_unitario?: number = 0;

  @IsOptional()
  @IsNumber({}, { message: 'El subtotal debe ser numérico' })
  @Min(0, { message: 'El subtotal no puede ser negativo' })
  subtotal?: number = 0;

  @IsOptional()
  @IsString({ message: 'La observación del detalle debe ser texto' })
  observacion?: string;
}

export class OperacionSyncDto {
  @IsNotEmpty({ message: 'El ID de la operación es obligatorio para garantizar idempotencia' })
  @IsUUIDCustom({ message: 'El ID debe ser un UUID generado por el cliente' })
  id: string;

  @IsNotEmpty({ message: 'El tipo de operación es obligatorio' })
  @IsIn(['VENTA', 'COBRO', 'DEVOLUCION', 'SOBRANTE', 'PEDIDO', 'CLIENTE_NUEVO'], {
    message: 'El tipo de operación debe ser VENTA, COBRO, DEVOLUCION, SOBRANTE, PEDIDO o CLIENTE_NUEVO',
  })
  tipo_operacion: 'VENTA' | 'COBRO' | 'DEVOLUCION' | 'SOBRANTE' | 'PEDIDO' | 'CLIENTE_NUEVO';

  @IsOptional()
  @IsUUIDCustom({ message: 'El carga_distribucion_id debe ser un UUID válido' })
  carga_distribucion_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El cliente_id debe ser un UUID válido' })
  cliente_id?: string;

  @IsNotEmpty({ message: 'La fecha de operación del dispositivo es obligatoria' })
  @IsString({ message: 'La fecha de operación debe ser una cadena ISO válida' })
  fecha_operacion: string;

  @IsOptional()
  @IsNumber({}, { message: 'El monto total debe ser numérico' })
  @Min(0, { message: 'El monto total no puede ser negativo' })
  total?: number = 0;

  @IsOptional()
  @IsArray({ message: 'Los detalles deben ser una lista' })
  @ValidateNested({ each: true })
  @Type(() => DetalleOperacionSyncDto)
  detalles?: DetalleOperacionSyncDto[] = [];

  @IsOptional()
  @IsString({ message: 'Las observaciones deben ser texto' })
  observaciones?: string;

  @IsOptional()
  datos?: Record<string, any>;

  @IsOptional()
  metadatos?: Record<string, any>;
}

export class SincronizacionPushDto {
  @IsOptional()
  @IsUUIDCustom({ message: 'El dispositivo_id debe ser un UUID válido' })
  dispositivo_id?: string;

  @IsOptional()
  @IsString({ message: 'El código de dispositivo debe ser texto' })
  codigo_dispositivo?: string;

  @IsArray({ message: 'Las operaciones deben enviarse en formato de lista (batch)' })
  @ValidateNested({ each: true })
  @Type(() => OperacionSyncDto)
  operaciones: OperacionSyncDto[];
}
