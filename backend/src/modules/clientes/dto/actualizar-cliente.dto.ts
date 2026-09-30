import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { TIPOS_DOCUMENTO_VALIDOS, TipoDocumento } from './crear-cliente.dto';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export class ActualizarClienteDto {
  @IsString({ message: 'El tipo de documento debe ser una cadena de texto' })
  @IsOptional()
  @IsIn(TIPOS_DOCUMENTO_VALIDOS, {
    message: `El tipo de documento debe ser uno de: ${TIPOS_DOCUMENTO_VALIDOS.join(', ')}`,
  })
  tipo_documento?: TipoDocumento;

  @IsString({ message: 'El número de documento debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(20, { message: 'El número de documento no debe exceder los 20 caracteres' })
  numero_documento?: string;

  @IsString({ message: 'La razón social o nombre debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(200, { message: 'La razón social no debe exceder los 200 caracteres' })
  razon_social?: string;

  @IsString({ message: 'La dirección debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(250, { message: 'La dirección no debe exceder los 250 caracteres' })
  direccion?: string;

  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(30, { message: 'El teléfono no debe exceder los 30 caracteres' })
  telefono?: string;

  @IsEmail({}, { message: 'El formato de correo electrónico es inválido' })
  @IsOptional()
  email?: string;

  @IsUUIDCustom({ message: 'El lista_precio_id debe ser un UUID válido' })
  @IsOptional()
  lista_precio_id?: string;

  @IsBoolean({ message: 'El estado activo debe ser un valor booleano' })
  @IsOptional()
  activo?: boolean;
}
