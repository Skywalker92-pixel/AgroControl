import { IsNotEmpty, IsNumber, IsPositive, IsString, MaxLength } from 'class-validator';

export class CrearPresentacionDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la presentación es obligatorio (ej. Caja x12, Saco 50 kg)' })
  @MaxLength(50, { message: 'El nombre no debe exceder los 50 caracteres' })
  nombre: string;

  // Factor de conversión estricto > 0
  @IsNumber({ maxDecimalPlaces: 3 }, { message: 'El factor de conversión debe ser un número con hasta 3 decimales' })
  @IsPositive({ message: 'El factor de conversión debe ser estrictamente mayor a cero' })
  factor: number;
}
