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
  estado?: string;
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
  discrepancias?: number;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

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
    const conciliacion = this.unwrap(conciliacionHealth, { estado: 'alerta' as const, detalle: 'No se pudo verificar', discrepancias: -1 });

    // Determinar estado global
    const esCritico =
      db.estado === 'desconectada' ||
      disco.alerta ||
      conciliacion.estado === 'alerta';

    const esDegradado =
      backups.alerta ||
      backups.estado === 'no_verificable_en_cloud' ||
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
  // 2. DETECCIÓN DE BACKUPS
  // ──────────────────────────────────────────────────────────────────────────
  private getBackupDir(): string {
    const candidates = [
      process.env.BACKUPS_DIR,
      process.env.BACKUP_DIR,
      '/app/backups',
      '/backups',
      path.resolve(process.cwd(), 'backups'),
      path.resolve(process.cwd(), '..', 'backups'),
      path.resolve(__dirname, '..', '..', '..', '..', 'backups'),
      path.resolve(__dirname, '..', '..', '..', '..', '..', 'backups'),
    ].filter(Boolean) as string[];

    for (const dir of candidates) {
      try {
        if (fs.existsSync(dir)) {
          return dir;
        }
      } catch {
        // Continuar buscando
      }
    }
    return process.env.BACKUPS_DIR || '/app/backups';
  }

  private async checkBackups(): Promise<BackupHealth> {
    try {
      // En despliegues cloud (Render / Supabase), si no se puede acceder físicamente a los snapshots de backups,
      // se reporta el estado como 'no_verificable_en_cloud' en lugar de simular un estado ficticio (OBS-BKP-02).
      if (
        process.env.BACKUPS_CLOUD_MANAGED === 'true' ||
        process.env.DATABASE_URL?.includes('supabase') ||
        process.env.RENDER === 'true'
      ) {
        return {
          estado: 'no_verificable_en_cloud',
          ultimo_backup: null,
          horas_desde_ultimo: null,
          alerta: true,
          archivos_encontrados: 0,
        };
      }

      const backupDir = this.getBackupDir();
      if (!fs.existsSync(backupDir)) {
        return { estado: 'sin_directorio', ultimo_backup: null, horas_desde_ultimo: null, alerta: true, archivos_encontrados: 0 };
      }

      const archivos = fs
        .readdirSync(backupDir)
        .filter((f) => f.endsWith('.sql.gz.enc') || f.endsWith('.sql.gz') || f.endsWith('.sql'))
        .map((f) => {
          const filePath = path.join(backupDir, f);
          const stat = fs.statSync(filePath);
          return {
            nombre: f,
            mtime: stat.mtime,
            size: stat.size,
          };
        })
        .filter((f) => f.size > 100) // Descartar archivos dummy o vacíos (< 100 bytes)
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      if (archivos.length === 0) {
        return { ultimo_backup: null, horas_desde_ultimo: null, alerta: true, archivos_encontrados: 0 };
      }

      const ultimo = archivos[0];
      const horasDesdeUltimo = (Date.now() - ultimo.mtime.getTime()) / (1000 * 60 * 60);
      // Alerta si el backup tiene más de 26 horas
      const alerta = horasDesdeUltimo > 26;

      return {
        estado: 'local_ok',
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
        return {
          libre_gb: libre,
          total_gb: total,
          uso_porcentaje: usoPorcentaje,
          alerta: libre < 2,
        };
      }

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
      return { total_pendientes: total, alerta: total > 0 };
    } catch (error) {
      this.logger.error('Health: error contando operaciones observadas', error);
      return { total_pendientes: -1, alerta: false };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. CONCILIACIÓN MATEMÁTICA (Kárdex vs stock_saldo)
  //    Sigue la lógica exacta de conciliar_kardex_saldo.sql
  // ──────────────────────────────────────────────────────────────────────────
  private async checkConciliacion(): Promise<ConciliacionHealth> {
    try {
      const resultado = await this.prisma.$queryRaw<Array<{ total_discrepancias: number | bigint | string }>>`
        WITH kardex_calculado AS (
            SELECT 
                producto_id,
                ubicacion_id,
                COALESCE(SUM(cantidad_base), 0) AS total_kardex_calculado
            FROM movimiento_kardex
            GROUP BY producto_id, ubicacion_id
        ),
        saldo_actual AS (
            SELECT 
                producto_id,
                ubicacion_id,
                cantidad_fisica
            FROM stock_saldo
        )
        SELECT CAST(COUNT(*) AS INTEGER) AS total_discrepancias
        FROM producto p
        CROSS JOIN ubicacion u
        LEFT JOIN kardex_calculado kc ON kc.producto_id = p.id AND kc.ubicacion_id = u.id
        LEFT JOIN saldo_actual sa ON sa.producto_id = p.id AND sa.ubicacion_id = u.id
        WHERE u.tipo IN ('ALMACEN', 'ZONA')
          AND (kc.total_kardex_calculado IS NOT NULL OR sa.cantidad_fisica IS NOT NULL)
          AND ABS(COALESCE(sa.cantidad_fisica, 0) - COALESCE(kc.total_kardex_calculado, 0)) > 0.0001;
      `;

      const totalDiscrepancias = Number(resultado[0]?.total_discrepancias ?? 0);

      if (totalDiscrepancias === 0) {
        return {
          estado: 'ok',
          detalle: 'Sin discrepancias entre Kárdex y stock_saldo',
          discrepancias: 0,
        };
      }

      return {
        estado: 'alerta',
        detalle: `${totalDiscrepancias} producto(s)/ubicación(es) con discrepancia entre Kárdex y saldo`,
        discrepancias: totalDiscrepancias,
      };
    } catch (error) {
      this.logger.error('Health: error en conciliación', error);
      return {
        estado: 'alerta',
        detalle: 'No se pudo ejecutar la conciliación',
        discrepancias: -1,
      };
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Utilidad: extraer valor de PromiseSettledResult
  // ──────────────────────────────────────────────────────────────────────────
  private unwrap<T>(result: PromiseSettledResult<T>, fallback: T): T {
    return result.status === 'fulfilled' ? result.value : fallback;
  }
}
