import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import {
  LOCAL_DEV_ORIGINS,
  validateEnvironment,
} from '../src/core/config/env.validation';

const PASSWORD_PRUEBAS = 'Demo-NoProduccion-2026';

/** Entorno de producción válido usado como base en las pruebas de configuración. */
const ENV_PRODUCCION_VALIDO: NodeJS.ProcessEnv = {
  NODE_ENV: 'production',
  JWT_SECRET: 'k9V2xQ7mL4pZ8rT1wY6nB3cF0hJ5sD2gA7eU4iO9',
  DATABASE_URL: 'postgresql://agro:Xq8vT2mR9pL4wZ7k@db.internal:5432/agrocontrol_db',
  CORS_ORIGINS: 'https://agrocontrol.ejemplo-cliente.test',
};

describe('Hardening: configuración, IDOR, dispositivos revocados e idempotencia (e2e)', () => {
  // ============================================================================
  // 1. FAIL-FAST DE CONFIGURACIÓN EN PRODUCCIÓN
  // ============================================================================
  describe('1. Validación de entorno (fail-fast)', () => {
    it('1.1 Acepta una configuración de producción válida y usa solo CORS_ORIGINS', () => {
      const res = validateEnvironment(ENV_PRODUCCION_VALIDO);
      expect(res.isProduction).toBe(true);
      expect(res.allowedOrigins).toEqual(['https://agrocontrol.ejemplo-cliente.test']);
    });

    it('1.2 CORS en producción no admite comodín (*)', () => {
      expect(() =>
        validateEnvironment({ ...ENV_PRODUCCION_VALIDO, CORS_ORIGINS: '*' }),
      ).toThrow(/comodines/);
      expect(() =>
        validateEnvironment({
          ...ENV_PRODUCCION_VALIDO,
          CORS_ORIGINS: 'https://a.test,https://*.vercel.app',
        }),
      ).toThrow(/comodines/);
    });

    it('1.3 CORS_ORIGINS es obligatorio en producción y debe contener orígenes exactos', () => {
      expect(() =>
        validateEnvironment({ ...ENV_PRODUCCION_VALIDO, CORS_ORIGINS: '' }),
      ).toThrow(/CORS_ORIGINS/);
      expect(() =>
        validateEnvironment({ ...ENV_PRODUCCION_VALIDO, CORS_ORIGINS: 'https://a.test/app' }),
      ).toThrow(/orígenes exactos/);
    });

    it('1.4 JWT_SECRET de demostración o de ejemplo se rechaza en producción', () => {
      for (const secreto of [
        'super_seguro_jwt_secret_agrocontrol_2026_pro_token',
        'CHANGE_ME_WITH_AT_LEAST_32_RANDOM_CHARACTERS',
        'demo_demo_demo_demo_demo_demo_demo_demo',
        'corto_pero_de_mas_de_16',
      ]) {
        expect(() =>
          validateEnvironment({ ...ENV_PRODUCCION_VALIDO, JWT_SECRET: secreto }),
        ).toThrow(/JWT_SECRET/);
      }
    });

    it('1.5 DATABASE_URL con contraseña de ejemplo o publicada se rechaza en producción', () => {
      for (const url of [
        'postgresql://agro:CHANGE_ME@db:5432/agro',
        'postgresql://agrocontrol_user:agrocontrol_secret_pass_2026@db:5432/agro',
        'postgresql://agro@db:5432/agro',
      ]) {
        expect(() =>
          validateEnvironment({ ...ENV_PRODUCCION_VALIDO, DATABASE_URL: url }),
        ).toThrow(/DATABASE_URL/);
      }
    });

    it('1.6 BACKUP_ENCRYPTION_KEY de ejemplo se rechaza en producción si está definida', () => {
      expect(() =>
        validateEnvironment({
          ...ENV_PRODUCCION_VALIDO,
          BACKUP_ENCRYPTION_KEY: 'CHANGE_ME_WITH_SECURE_RANDOM_VALUE',
        }),
      ).toThrow(/BACKUP_ENCRYPTION_KEY/);
    });

    it('1.7 En desarrollo se permiten los orígenes locales además de CORS_ORIGINS', () => {
      const res = validateEnvironment({
        NODE_ENV: 'development',
        JWT_SECRET: 'secreto_local_de_desarrollo_123',
        DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
        CORS_ORIGINS: 'http://192.168.1.50:8080',
      });
      expect(res.isProduction).toBe(false);
      expect(res.allowedOrigins).toEqual(
        expect.arrayContaining([...LOCAL_DEV_ORIGINS, 'http://192.168.1.50:8080']),
      );
    });
  });

  // ============================================================================
  // Pruebas de integración contra la API
  // ============================================================================
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let vendedorToken: string;
  let vendedor2Token: string;
  let vendedorId: string;

  let almacenId: string;
  let productoId: string;
  let clienteId: string;
  let bodegaMovilId: string;
  let cargaId: string;

  const ts = Date.now();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
    );
    await app.init();
    prisma = app.get<PrismaService>(PrismaService);

    // Segundo vendedor creado directamente para las pruebas de IDOR.
    await prisma.usuario.create({
      data: {
        username: `vendedor.idor.${ts}`,
        password_hash: await bcrypt.hash(PASSWORD_PRUEBAS, 10),
        nombre_completo: 'Vendedor IDOR Pruebas',
        rol: 'VENDEDOR',
        activo: true,
      },
    });

    const login = async (username: string) =>
      (
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ username, password: PASSWORD_PRUEBAS })
          .expect(200)
      ).body;

    adminToken = (await login('demo.admin')).access_token;
    const vend = await login('demo.vendedor');
    vendedorToken = vend.access_token;
    vendedorId = vend.usuario.id;
    vendedor2Token = (await login(`vendedor.idor.${ts}`)).access_token;

    // Catálogo y stock propios de esta suite.
    const lista = await prisma.lista_precio.findUnique({ where: { codigo: 'MAYORISTA' } });
    const cat = await prisma.categoria.create({
      data: { codigo: `CAT-SEC-${ts}`, nombre: `Categoría Seguridad ${ts}` },
    });
    const prod = await prisma.producto.create({
      data: {
        codigo_interno: `PROD-SEC-${ts}`,
        nombre: `Producto Seguridad ${ts}`,
        unidad_base: 'unidad',
        categoria_id: cat.id,
      },
    });
    productoId = prod.id;
    await prisma.precio_producto.create({
      data: { lista_precio_id: lista!.id, producto_id: productoId, precio: 10 },
    });

    const cliente = await prisma.cliente.create({
      data: {
        tipo_documento: 'RUC',
        numero_documento: `20${ts.toString().slice(-9)}`,
        razon_social: 'Cliente Demo Seguridad SAC',
        direccion: 'Dirección Demo',
        lista_precio_id: lista!.id,
      },
    });
    clienteId = cliente.id;

    const alm = await prisma.ubicacion.create({
      data: { tipo: 'ALMACEN', codigo: `ALM-SEC-${ts.toString().slice(-6)}`, nombre: 'Almacén Seguridad Demo' },
    });
    almacenId = alm.id;

    await request(app.getHttpServer())
      .post('/api/inventario/ingreso')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        producto_id: productoId,
        ubicacion_id: almacenId,
        cantidad_base: 200,
        costo_unitario: 5,
        motivo: 'Stock inicial suite de seguridad',
      })
      .expect(201);

    // Carga EN_RUTA asignada a demo.vendedor.
    const veh = await request(app.getHttpServer())
      .post('/api/distribucion/vehiculos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        placa: `SEC-${Math.floor(100 + Math.random() * 900)}`,
        marca: 'Demo',
        modelo: 'Demo',
        tipo_vehiculo: 'Furgón',
        capacidad_kg: 1000,
        conductor_habitual_id: vendedorId,
      })
      .expect(201);
    bodegaMovilId = veh.body.bodega_movil.id;

    const carga = await request(app.getHttpServer())
      .post('/api/distribucion/cargas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        almacen_origen_id: almacenId,
        vehiculo_id: veh.body.id,
        trabajador_id: vendedorId,
        fecha_salida: new Date().toISOString().split('T')[0],
        detalles: [{ producto_id: productoId, cantidad_presentacion: 0, cantidad_unidades_sueltas: 60 }],
      })
      .expect(201);
    cargaId = carga.body.id;

    await request(app.getHttpServer())
      .patch(`/api/distribucion/cargas/${cargaId}/despachar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  }, 60000);

  afterAll(async () => {
    await app.close();
  });

  const registrarDispositivoAutorizado = async (codigo: string): Promise<string> => {
    const res = await request(app.getHttpServer())
      .post('/api/sync/dispositivos/registrar')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        codigo_dispositivo: codigo,
        modelo: 'Terminal Android Demo',
        version_app: '1.0.0',
        trabajador_id: vendedorId,
        activo: true,
        autorizado: true,
      })
      .expect(201);
    return res.body.dispositivo.id;
  };

  const saldoBodega = async () =>
    Number(
      (
        await prisma.stock_saldo.findUnique({
          where: { producto_id_ubicacion_id: { producto_id: productoId, ubicacion_id: bodegaMovilId } },
        })
      )?.cantidad_fisica ?? 0,
    );

  const operacionVenta = (id: string, cantidad: number, extra: Record<string, unknown> = {}) => ({
    id,
    tipo_operacion: 'VENTA',
    carga_distribucion_id: cargaId,
    fecha_operacion: new Date().toISOString(),
    total: cantidad * 10,
    detalles: [{ producto_id: productoId, cantidad, precio_unitario: 10, subtotal: cantidad * 10 }],
    ...extra,
  });

  // ============================================================================
  // 2. IDOR EN PROFORMAS: UN VENDEDOR NO ACCEDE A DATOS DE OTRO VENDEDOR
  // ============================================================================
  describe('2. Proformas: aislamiento entre vendedores (IDOR)', () => {
    let proformaId: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/despacho/proformas')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          cliente_id: clienteId,
          ubicacion_id: almacenId,
          items: [{ producto_id: productoId, unidades_sueltas: 3 }],
        })
        .expect(201);
      proformaId = res.body.id;
    });

    it('2.1 El vendedor propietario consulta su proforma y su orden de despacho', async () => {
      await request(app.getHttpServer())
        .get(`/api/despacho/proformas/${proformaId}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);
      await request(app.getHttpServer())
        .get(`/api/despacho/proformas/${proformaId}/orden-despacho`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(200);
    });

    it('2.2 Otro vendedor recibe 403 al consultar la proforma ajena por ID', async () => {
      await request(app.getHttpServer())
        .get(`/api/despacho/proformas/${proformaId}`)
        .set('Authorization', `Bearer ${vendedor2Token}`)
        .expect(403);
      await request(app.getHttpServer())
        .get(`/api/despacho/proformas/${proformaId}/orden-despacho`)
        .set('Authorization', `Bearer ${vendedor2Token}`)
        .expect(403);
    });

    it('2.3 Otro vendedor no puede cambiar el estado (reservar/anular) de la proforma ajena', async () => {
      for (const nuevo_estado of ['RESERVADO', 'ANULADO']) {
        await request(app.getHttpServer())
          .patch(`/api/despacho/proformas/${proformaId}/estado`)
          .set('Authorization', `Bearer ${vendedor2Token}`)
          .send({ nuevo_estado })
          .expect(403);
      }
      const proforma = await prisma.proforma.findUnique({ where: { id: proformaId } });
      expect(proforma!.estado).toBe('BORRADOR');
    });

    it('2.4 El listado del otro vendedor no incluye la proforma ajena', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/despacho/proformas')
        .set('Authorization', `Bearer ${vendedor2Token}`)
        .expect(200);
      expect(res.body.items.map((p: any) => p.id)).not.toContain(proformaId);
    });

    it('2.5 El administrador sí accede a cualquier proforma', async () => {
      await request(app.getHttpServer())
        .get(`/api/despacho/proformas/${proformaId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });
  });

  // ============================================================================
  // 3. DISPOSITIVO REVOCADO NO SINCRONIZA
  // ============================================================================
  describe('3. Terminal revocada', () => {
    it('3.1 Tras la revocación, PULL y PUSH son rechazados y el Kárdex no cambia', async () => {
      const dispositivoId = await registrarDispositivoAutorizado(`DEV-REVOC-${ts}`);

      await request(app.getHttpServer())
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Device-Id', dispositivoId)
        .set('X-App-Version', '1.0.0')
        .expect(200);

      await request(app.getHttpServer())
        .patch(`/api/sync/dispositivos/${dispositivoId}/revocar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const ventaId = randomUUID();
      const kardexAntes = await prisma.movimiento_kardex.count({ where: { ubicacion_id: bodegaMovilId } });

      await request(app.getHttpServer())
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Device-Id', dispositivoId)
        .set('X-App-Version', '1.0.0')
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Device-Id', dispositivoId)
        .set('X-App-Version', '1.0.0')
        .send({ dispositivo_id: dispositivoId, operaciones: [operacionVenta(ventaId, 1)] })
        .expect(403);

      expect(await prisma.operacion_sincronizada.findUnique({ where: { id: ventaId } })).toBeNull();
      expect(await prisma.movimiento_kardex.count({ where: { ubicacion_id: bodegaMovilId } })).toBe(kardexAntes);
    });
  });

  // ============================================================================
  // 4. IDEMPOTENCIA Y CLIENTE NUEVO OFFLINE
  // ============================================================================
  describe('4. Sincronización idempotente', () => {
    let dispositivoId: string;

    beforeAll(async () => {
      dispositivoId = await registrarDispositivoAutorizado(`DEV-IDEM-${ts}`);
    });

    const push = (operaciones: unknown[]) =>
      request(app.getHttpServer())
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Device-Id', dispositivoId)
        .set('X-App-Version', '1.0.0')
        .send({ dispositivo_id: dispositivoId, operaciones });

    it('4.1 Mismo UUID repetido dentro del mismo lote afecta el Kárdex una sola vez', async () => {
      const ventaId = randomUUID();
      const saldoInicial = await saldoBodega();

      const res = await push([operacionVenta(ventaId, 2), operacionVenta(ventaId, 2)]).expect(201);

      expect(res.body.total_aplicadas).toBe(1);
      expect(res.body.total_reintentos_ignorados).toBe(1);
      expect(await prisma.movimiento_kardex.count({ where: { documento_id: ventaId } })).toBe(1);
      expect(await saldoBodega()).toBe(saldoInicial - 2);
    });

    it('4.2 Mismo UUID enviado en dos pushes concurrentes afecta el Kárdex una sola vez', async () => {
      const ventaId = randomUUID();
      const saldoInicial = await saldoBodega();

      const [r1, r2] = await Promise.all([
        push([operacionVenta(ventaId, 3)]),
        push([operacionVenta(ventaId, 3)]),
      ]);

      expect([r1.status, r2.status]).toEqual([201, 201]);
      const yaProcesados = [r1, r2].map((r) => r.body.resultados[0].ya_procesado).sort();
      expect(yaProcesados).toEqual([false, true]);
      expect(await prisma.movimiento_kardex.count({ where: { documento_id: ventaId } })).toBe(1);
      expect(await saldoBodega()).toBe(saldoInicial - 3);
    });

    it('4.3 Cliente nuevo offline mantiene la relación con su venta aunque llegue después en el lote', async () => {
      const clienteLocalId = randomUUID();
      const ventaId = randomUUID();
      const documento = `4${ts.toString().slice(-7)}`;

      // Orden "más reciente primero", como lo almacena la cola local del móvil.
      const res = await push([
        operacionVenta(ventaId, 1, { cliente_id: clienteLocalId }),
        {
          id: randomUUID(),
          tipo_operacion: 'CLIENTE_NUEVO',
          carga_distribucion_id: cargaId,
          cliente_id: clienteLocalId,
          fecha_operacion: new Date().toISOString(),
          datos: {
            cliente_local_id: clienteLocalId,
            tipo_documento: 'DNI',
            numero_documento: documento,
            razon_social: 'Cliente Demo Offline',
          },
        },
      ]).expect(201);

      expect(res.body.total_aplicadas).toBe(2);
      expect(res.body.total_observadas).toBe(0);

      const clienteServidor = await prisma.cliente.findUnique({
        where: { tipo_documento_numero_documento: { tipo_documento: 'DNI', numero_documento: documento } },
      });
      expect(clienteServidor).not.toBeNull();

      const venta = await prisma.operacion_sincronizada.findUnique({ where: { id: ventaId } });
      expect(venta!.estado_sync).toBe('APLICADA');
      expect((venta!.datos_operacion as any).cliente_id).toBe(clienteServidor!.id);
    });

    it('4.4 DEVOLUCION en ruta: Kárdex y saldo se aplican juntos y el reintento no los duplica', async () => {
      const devolucionId = randomUUID();
      const saldoInicial = await saldoBodega();
      const devolucion = {
        id: devolucionId,
        tipo_operacion: 'DEVOLUCION',
        carga_distribucion_id: cargaId,
        fecha_operacion: new Date().toISOString(),
        detalles: [{ producto_id: productoId, cantidad: 4, precio_unitario: 10, subtotal: 40 }],
      };

      const r1 = await push([devolucion]).expect(201);
      expect(r1.body.total_aplicadas).toBe(1);
      const r2 = await push([devolucion]).expect(201);
      expect(r2.body.total_reintentos_ignorados).toBe(1);

      const movimientos = await prisma.movimiento_kardex.findMany({ where: { documento_id: devolucionId } });
      expect(movimientos).toHaveLength(1);
      expect(movimientos[0].tipo).toBe('DEVOLUCION_RUTA');
      expect(Number(movimientos[0].cantidad_base)).toBe(4);
      expect(await saldoBodega()).toBe(saldoInicial + 4);
    });

    it('4.5 Conciliación: SUM(Kárdex) = stock_saldo en la bodega móvil tras los escenarios', async () => {
      const suma = await prisma.movimiento_kardex.aggregate({
        where: { producto_id: productoId, ubicacion_id: bodegaMovilId },
        _sum: { cantidad_base: true },
      });
      expect(Number(suma._sum.cantidad_base)).toBe(await saldoBodega());
    });
  });
});
