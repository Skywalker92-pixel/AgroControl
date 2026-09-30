import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { IsUUIDCustom } from '../../../../core/decorators/is-uuid-custom.decorator';

export class AsignarPrecioDto {
  @IsUUIDCustom({ message: 'El lista_precio_id debe ser un UUID válido' })
  @IsNotEmpty({ message: 'La lista de precios es obligatoria' })
  lista_precio_id: string;

  @IsUUIDCustom({ message: 'El producto_id debe ser un UUID válido' })
  @IsNotEmpty({ message: 'El producto es obligatorio' })
  producto_id: string;

  @IsNumber({ maxDecimalPlaces: 4 }, { message: 'El precio debe ser un número con hasta 4 decimales' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  precio: number;
}
