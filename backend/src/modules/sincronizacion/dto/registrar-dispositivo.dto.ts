import { IsNotEmpty, IsOptional, IsString, IsBoolean, MinLength } from 'class-validator';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class RegistrarDispositivoDto {
  @IsNotEmpty({ message: 'El código de dispositivo es obligatorio' })
  @IsString({ message: 'El código de dispositivo debe ser texto' })
  @MinLength(3, { message: 'El código de dispositivo debe tener al menos 3 caracteres' })
  codigo_dispositivo: string;

  @IsOptional()
  @IsString({ message: 'El modelo debe ser texto' })
  modelo?: string;

  @IsOptional()
  @IsString({ message: 'El sistema operativo debe ser texto' })
  sistema_operativo?: string = 'Android';

  @IsOptional()
  @IsString({ message: 'La versión de la aplicación debe ser texto' })
  version_app?: string = '1.0.0';

  @IsOptional()
  @IsUUIDCustom({ message: 'El trabajador_id debe ser un UUID válido' })
  trabajador_id?: string;

  @IsOptional()
  @IsBoolean({ message: 'El campo activo debe ser booleano' })
  activo?: boolean = true;

  @IsOptional()
  @IsBoolean({ message: 'El campo autorizado debe ser booleano' })
  autorizado?: boolean;
}
