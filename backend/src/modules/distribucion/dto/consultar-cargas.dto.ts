import { IsOptional, IsString, IsIn } from 'class-validator';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class ConsultarCargasDto {
  @IsOptional()
  @IsIn(['PENDIENTE', 'EN_RUTA', 'FINALIZADA'], {
    message: 'El estado debe ser PENDIENTE, EN_RUTA o FINALIZADA.',
  })
  estado?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El vehiculo_id debe ser un UUID válido.' })
  vehiculo_id?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El trabajador_id debe ser un UUID válido.' })
  trabajador_id?: string;

  @IsOptional()
  @IsString()
  fecha_desde?: string;

  @IsOptional()
  @IsString()
  fecha_hasta?: string;
}
