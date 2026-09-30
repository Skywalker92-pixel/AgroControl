import { IsOptional, IsString } from 'class-validator';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class SincronizacionPullDto {
  @IsOptional()
  @IsString({ message: 'La fecha de última sincronización debe ser una cadena ISO' })
  ultima_sincronizacion?: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El dispositivo_id debe ser un UUID válido' })
  dispositivo_id?: string;

  @IsOptional()
  @IsString({ message: 'El código de dispositivo debe ser texto' })
  codigo_dispositivo?: string;
}
