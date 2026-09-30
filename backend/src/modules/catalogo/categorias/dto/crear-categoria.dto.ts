import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearCategoriaDto {
  @IsString({ message: 'El código debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El código de categoría es obligatorio' })
  @MaxLength(30, { message: 'El código no debe exceder los 30 caracteres' })
  codigo: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de categoría es obligatorio' })
  @MaxLength(100, { message: 'El nombre no debe exceder los 100 caracteres' })
  nombre: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  descripcion?: string;
}
