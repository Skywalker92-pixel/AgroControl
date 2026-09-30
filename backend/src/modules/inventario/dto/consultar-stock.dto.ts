import { IsOptional, IsBoolean } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class ConsultarStockDto {
  @IsOptional()
  @IsUUIDCustom({ message: 'El producto_id debe ser un UUID válido' })
  producto_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'La ubicacion_id debe ser un UUID válido' })
  ubicacion_id?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true || value === '1')
  @IsBoolean()
  solo_con_stock?: boolean;
}
