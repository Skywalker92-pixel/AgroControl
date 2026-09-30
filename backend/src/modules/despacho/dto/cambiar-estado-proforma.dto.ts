import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export enum EstadoProforma {
  BORRADOR = 'BORRADOR',
  RESERVADO = 'RESERVADO',
  PREPARADO = 'PREPARADO',
  DESPACHADO = 'DESPACHADO',
  ANULADO = 'ANULADO',
}

export class CambiarEstadoProformaDto {
  @IsNotEmpty({ message: 'El nuevo_estado es obligatorio' })
  @IsEnum(EstadoProforma, {
    message: 'El nuevo_estado debe ser RESERVADO, PREPARADO, DESPACHADO o ANULADO',
  })
  nuevo_estado: EstadoProforma;

  @IsOptional()
  @IsString({ message: 'El motivo debe ser texto' })
  motivo?: string;
}
