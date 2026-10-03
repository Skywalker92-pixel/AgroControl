import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, MaxLength } from 'class-validator';
import { RolUsuario } from '../../auth/roles/roles.enum';

export class CrearUsuarioDto {
  @IsString({ message: 'El nombre de usuario debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de usuario es obligatorio' })
  @MinLength(3, { message: 'El nombre de usuario debe tener al menos 3 caracteres' })
  @MaxLength(50, { message: 'El nombre de usuario no debe exceder 50 caracteres' })
  username: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;

  @IsString({ message: 'El nombre completo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  @MaxLength(150, { message: 'El nombre completo no debe exceder 150 caracteres' })
  nombre_completo: string;

  @IsEmail({}, { message: 'El formato de correo electrónico no es válido' })
  @IsOptional()
  email?: string;

  @IsEnum(RolUsuario, { message: 'El rol especificado no es válido' })
  @IsNotEmpty({ message: 'El rol de usuario es obligatorio' })
  rol: RolUsuario;
}

export class ActualizarUsuarioDto {
  @IsString({ message: 'El nombre completo debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(150, { message: 'El nombre completo no debe exceder 150 caracteres' })
  nombre_completo?: string;

  @IsEmail({}, { message: 'El formato de correo electrónico no es válido' })
  @IsOptional()
  email?: string;
}

export class CambiarRolDto {
  @IsEnum(RolUsuario, { message: 'El rol especificado no es válido' })
  @IsNotEmpty({ message: 'El nuevo rol es obligatorio' })
  rol: RolUsuario;
}

export class CambiarEstadoUsuarioDto {
  @IsNotEmpty({ message: 'El estado activo es obligatorio' })
  activo: boolean;
}

export class ResetPasswordDto {
  @IsString({ message: 'La nueva contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria' })
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}
