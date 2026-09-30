import { IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { IsUUIDCustom } from '../../../core/decorators/is-uuid-custom.decorator';

export enum AccionResolucionOperacion {
  APROBAR = 'APROBAR',
  RECHAZAR = 'RECHAZAR',
}

export class ResolverOperacionObservadaDto {
  @IsNotEmpty({ message: 'La acción de resolución es obligatoria (APROBAR o RECHAZAR).' })
  @IsEnum(AccionResolucionOperacion, {
    message: 'La acción de resolución debe ser APROBAR o RECHAZAR.',
  })
  accion: AccionResolucionOperacion;

  @IsNotEmpty({ message: 'La justificación o nota de resolución es obligatoria.' })
  @IsString({ message: 'La nota de resolución debe ser una cadena de texto.' })
  @MinLength(5, { message: 'La nota de resolución debe contener al menos 5 caracteres justificatorios.' })
  nota_resolucion: string;

  @IsOptional()
  @IsUUIDCustom({ message: 'El ID del almacén de regularización debe ser un UUID válido.' })
  almacen_regularizacion_id?: string;
}
