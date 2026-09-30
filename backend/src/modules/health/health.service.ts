import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../core/prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface HealthStatus {
  status: 'ok' | 'degradado' | 'critico';
  timestamp: string;
  uptime_segundos: number;
  base_datos: DbHealth;
  backups: BackupHealth;
  disco: DiskHealth;
  operaciones_observadas: ObservadasHealth;
  conciliacion: ConciliacionHealth;
}

interface DbHealth {
  estado: 'conectada' | 'desconectada';
  latencia_ms?: number;
  error?: string;
}

interface BackupHealth {
  ultimo_backup: string | null;
  horas_desde_ultimo: number | null;
  alerta: boolean;
  archivos_encontrados: number;
}

interface DiskHealth {
  libre_gb: number | null;
  total_gb: number | null;
  uso_porcentaje: number | null;
  alerta: boolean;
}

interface ObservadasHealth {
  total_pendientes: number;
  alerta: boolean;
}

interface ConciliacionHealth {
  estado: 'ok' | 'alerta';
  detalle: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  // Ruta de backups: montada en /backups dentro del contenedor o ../backups en host
  private readonly backupDir =
    process.env.BACKUP_DIR ||
    path.resolve(__dirname, '..', '..', '..', '..', '..', 'backups');

  constructor(private readonly prisma: PrismaService) {}

  async getSystemHealth(): Promise<HealthStatus> {
    const [dbHealth, backupHealth, diskHealth, observadasHealth, conciliacionHealth] =
      await Promise.allSettled([
        this.checkDatabase(),
        this.checkBackups(),
        this.checkDisk(),
        this.checkOperacionesObservadas(),
        this.checkConciliacion(),
      ]);

    const db = this.unwrap(dbHealth, { estado: 'desconectada', error: 'Error interno' } as DbHealth);
    const backups = this.unwrap(backupHealth, { ultimo_backup: null, horas_desde_ultimo: null, alerta: true, archivos_encontrados: 0 });
    const disco = this.unwrap(diskHealth, { libre_gb: null, total_gb: null, uso_porcentaje: null, alerta: true });
    const observadas = this.unwrap(observadasHealth, { total_pendientes: -1, alerta: true });
    const conciliacion = this.unwrap(conciliacionHealth, { estado: 'alerta' as const, detalle: 'No se pudo verificar' });

    // Determinar estado global
    const esCritico =
      db.estado === 'desconectada' ||
      disco.alerta ||
      conciliacion.estado === 'alerta';

    const esDegradado =
      backups.alerta ||
      observadas.alerta;

    const status: 'ok' | 'degradado' | 'critico' = esCritico
      ? 'critico'
      : esDegradado
        ? 'degradado'
        : 'ok';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime_segundos: Math.floor((Date.now() - this.startTime) / 1000),
      base_datos: db,
      backups,
      disco,
      operaciones_observadas: observadas,
      conciliacion,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. BASE DE DATOS
  // ──────────────────────────────────────────────────────────────────────────
  private async checkDatabase(): Promise<DbHealth> {
    const inicio = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        estado: 'conectada',
        latencia_ms: Date.now() - inicio,
      };
    } catch (error) {
      this.logger.error('Health: BD no responde', error);
      return {
        estado: 'desconectada',
        error: error instanceof Error ? error.message : 'Error desconocido',
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. BACKUPS (SKILL §5 – backup diario, retención 14 días)
  // ──────────────────────────────────────────────────────────────────────────
  private async checkBackups(): Promise<BackupHealth> {
    try {
      if (!fs.existsSync(this.backupDir)) {
        return { ultimo_backup: null, horas_desde_ultimo: null, alerta: true, archivos_encontrados: 0 };
      }

      const archivos = fs
        .readdirSync(this.backupDir)
        .filter((f) => f.endsWith('.sql.gz') || f.endsWith('.sql'))
        .map((f) => ({
          nombre: f,
          mtime: fs.statSync(path.join(this.backupDir, f)).mtime,
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      if (archivos.length === 0) {
        return { ultimo_backup: null, horas_desde_ultimo: null, alerta: true, archivos_encontrados: 0 };
      }

      const ultimo = archivos[0];
      const horasDesdeUltimo = (Date.now() - ultimo.mtime.getTime()) / (1000 * 60 * 60);
      // Alerta si el backup tiene más de 26 horas (más de 1 día sin backup)
      const alerta = horasDesdeUltimo > 26;

      return {
        ultimo_backup: ultimo.mtime.toISOString(),
        horas_desde_ultimo: Math.round(horasDesdeUltimo * 10) / 10,
        alerta,
        archivos_encontrados: archivos.length,
      };
    } catch (error) {
      this.logger.error('Health: error revisando backups', error);
      return { ultimo_backup: null, horas_desde_ultimo: null, alerta: true, archivos_encontrados: 0 };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. ESPACIO EN DISCO
  // ──────────────────────────────────────────────────────────────────────────
  private async checkDisk(): Promise<DiskHealth> {
    try {
      // En Linux (contenedor Docker) usamos el sistema de archivos raíz
      // En Windows (desarrollo) usamos os.tmpdir() como referencia aproximada
      const { execSync } = await import('child_process');
      const isLinux = os.platform() === 'linux';

      if (isLinux) {
        const raw = execSync("df -BG / | tail -1 | awk '{print $2, $4}'")
          .toString()
          .trim();
        const [totalStr, libreStr] = raw.split(' ');
        const total = parseInt(totalStr);
        const libre = parseInt(libreStr);
        const usoPorcentaje = Math.round(((total - libre) / total) * 100);
        // Alerta si quedan menos de 2 GB libres
        return {
          libre_gb: libre,
          total_gb: total,
          uso_porcentaje: usoPorcentaje,
          alerta: libre < 2,
        };
      }

      // Fallback Windows
      return { libre_gb: null, total_gb: null, uso_porcentaje: null, alerta: false };
    } catch {
      return { libre_gb: null, total_gb: null, uso_porcentaje: null, alerta: false };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. OPERACIONES OBSERVADAS PENDIENTES
  // ──────────────────────────────────────────────────────────────────────────
  private async checkOperacionesObservadas(): Promise<ObservadasHealth> {
    try {
      const total = await this.prisma.operacion_sincronizada.count({
        where: { estado_sync: 'OBSERVADA' },
      });
      // Alerta si hay más de 0 operaciones pendientes de revisión administrativa
      return { total_pendientes: total, alerta: total > 0 };
    } catch (error) {
      this.logger.error('Health: error contando operaciones observadas', error);
      return { total_pendientes: -1, alerta: false };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. CONCILIACIÓN MATEMÁTICA (Kárdex vs stock_saldo)
  //    Verifica que no haya discrepancias entre el Kárdex y los saldos actuales.
  //    SKILL(5) §7 – Integridad del Kárdex inmutable.
  // ──────────────────────────────────────────────────────────────────────────
  private async checkConciliacion(): Promise<ConciliacionHealth> {
    try {
      // Consulta de conciliación: detecta productos/almacenes con saldo != suma del Kárdex
      const discrepancias = await this.prisma.$queryRaw<{ cantidad: bigint }[]>`
        SELECT COUNT(*) AS cantidad
        FROM (
          SELECT
            ss.producto_id,
            ss.almacen_id,
            ss.cantidad_disponible AS saldo_registrado,
            COALESCE(SUM(mk.cantidad_movimiento), 0) AS saldo_kardex
          FROM stock_saldo ss
          LEFT JOIN movimiento_kardex mk
            ON mk.producto_id = ss.producto_id
           AND mk.almacen_id  = ss.almacen_id
          GROUP BY ss.producto_id, ss.almacen_id, ss.cantidad_disponible
          HAVING ABS(ss.cantidad_disponible - COALESCE(SUM(mk.cantidad_movimiento), 0)) > 0.001
        ) sub
      `;

      const cantidad = Number(discrepancias[0]?.cantidad ?? 0);

      if (cantidad === 0) {
        return { estado: 'ok', detalle: 'Sin discrepancias entre Kárdex y stock_saldo' };
      }

      return {
        estado: 'alerta',
        detalle: `${cantidad} producto(s)/almacén(es) con discrepancia entre Kárdex y saldo`,
      };
    } catch (error) {
      this.logger.error('Health: error en conciliación', error);
      return { estado: 'alerta', detalle: 'No se pudo ejecutar la conciliación' };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Utilidad: extraer valor de PromiseSettledResult
  // ──────────────────────────────────────────────────────────────────────────
  private unwrap<T>(result: PromiseSettledResult<T>, fallback: T): T {
    return result.status === 'fulfilled' ? result.value : fallback;
  }
}
