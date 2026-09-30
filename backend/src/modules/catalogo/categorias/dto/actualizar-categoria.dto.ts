import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ActualizarCategoriaDto {
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(30, { message: 'El código no debe exceder los 30 caracteres' })
  codigo?: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsOptional()
  @MaxLength(100, { message: 'El nombre no debe exceder los 100 caracteres' })
  nombre?: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  descripcion?: string;

  @IsBoolean({ message: 'El estado activo debe ser un valor booleano' })
  @IsOptional()
  activo?: boolean;
}
