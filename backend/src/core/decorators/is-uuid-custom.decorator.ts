import { Matches } from 'class-validator';

export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const IsUUIDCustom = (validationOptions?: { message?: string }) =>
  Matches(UUID_REGEX, {
    message: validationOptions?.message || 'El identificador debe ser un UUID válido',
  });
