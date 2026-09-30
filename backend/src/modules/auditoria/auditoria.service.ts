import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';

export interface RegistrarEventoParams {
  entidad: string;
  registro_id?: string;
  accion: 'INSERT' | 'UPDATE' | 'DELETE' | 'ANULACION' | 'AJUSTE' | 'LOGIN';
  valor_anterior?: any;
  valor_nuevo?: any;
  usuario_id?: string;
  dispositivo_id?: string;
  ip_origen?: string;
}

@Injectable()
export class AuditoriaService {
  private readonly logger = new Logger(AuditoriaService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Inserta un registro inmutable en la bitácora de auditoría.
   */
  async registrarEvento(params: RegistrarEventoParams): Promise<void> {
    try {
      // Si no se proporciona registro_id (ej. intento fallido de login), usamos un UUID por defecto o genérico
      const registroId = params.registro_id || '00000000-0000-0000-0000-000000000000';

      await this.prisma.auditoria.create({
        data: {
          entidad: params.entidad,
          registro_id: registroId,
          accion: params.accion,
          valor_anterior: params.valor_anterior ? (params.valor_anterior as any) : undefined,
          valor_nuevo: params.valor_nuevo ? (params.valor_nuevo as any) : undefined,
          usuario_id: params.usuario_id || null,
          dispositivo_id: params.dispositivo_id || null,
          ip_origen: params.ip_origen || null,
        },
      });
    } catch (error) {
      // La auditoría nunca debe tumbar una transacción principal, pero sí debe registrarse en logs
      this.logger.error(`Error al persistir registro de auditoría: ${error.message}`, error.stack);
    }
  }

  /**
   * Obtiene eventos de auditoría filtrados por entidad o fecha.
   */
  async obtenerHistorial(entidad?: string, limite = 50) {
    return this.prisma.auditoria.findMany({
      where: entidad ? { entidad } : undefined,
      orderBy: { fecha: 'desc' },
      take: limite,
      include: {
        usuario: {
          select: {
            id: true,
            username: true,
            nombre_completo: true,
            rol: true,
          },
        },
      },
    });
  }
}
