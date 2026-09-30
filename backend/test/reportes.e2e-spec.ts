import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';

describe('Hito 7: Reportes Básicos, Conciliación Automática y Cierre de Fase 1 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let operadorToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Tokens de autenticación
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'alipio.admin', password: 'AgroControl2026*' });
    adminToken = adminLogin.body.access_token;

    const opLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'almacen1', password: 'AgroControl2026*' });
    operadorToken = opLogin.body.access_token;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('1. Reporte de Existencias por Almacén', () => {
    it('1.1 Debe retornar existencias con resumen de triple saldo consolidado', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/stock-almacen')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.resumen).toBeDefined();
      expect(res.body.resumen.total_fisico).toBeGreaterThanOrEqual(0);
      expect(res.body.resumen.total_reservado).toBeGreaterThanOrEqual(0);
      expect(res.body.resumen.total_disponible).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.body.items)).toBe(true);

      if (res.body.items.length > 0) {
        const item = res.body.items[0];
        expect(item.codigo_interno).toBeDefined();
        expect(item.nombre).toBeDefined();
        expect(item.cantidad_fisica).toBeDefined();
        expect(item.cantidad_disponible).toBeDefined();
      }
    });

    it('1.2 Debe permitir exportar reporte de existencias a formato CSV', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/stock-almacen')
        .query({ formato: 'csv' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('"Código","Producto","Categoría"');
    });
  });

  describe('2. Reporte de Movimientos de Kárdex Histórico', () => {
    it('2.1 Debe retornar el histórico de movimientos ordenados cronológicamente', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/movimientos-kardex')
        .set('Authorization', `Bearer ${operadorToken}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.body.items)).toBe(true);

      if (res.body.items.length > 0) {
        const mov = res.body.items[0];
        expect(mov.tipo).toBeDefined();
        expect(mov.cantidad_base).toBeDefined();
        expect(mov.codigo_producto).toBeDefined();
        expect(mov.almacen).toBeDefined();
      }
    });

    it('2.2 Debe permitir exportar reporte de Kárdex a CSV', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/movimientos-kardex')
        .query({ formato: 'csv' })
        .set('Authorization', `Bearer ${operadorToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('"Fecha","Tipo","Código","Producto"');
    });
  });

  describe('3. Reporte de Productos con Menor Stock', () => {
    it('3.1 Debe retornar productos ordenados por stock disponible ascendente', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/menor-stock')
        .query({ umbral: 50, limit: 10 })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.umbral_evaluado).toBe(50);
      expect(Array.isArray(res.body.items)).toBe(true);

      if (res.body.items.length > 1) {
        const primero = res.body.items[0].cantidad_disponible;
        const segundo = res.body.items[1].cantidad_disponible;
        expect(primero).toBeLessThanOrEqual(segundo);
      }
    });
  });

  describe('4. Reporte de Despachos Completados', () => {
    it('4.1 Debe retornar los despachos físicos ejecutados con desglose monetario', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/despachos')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.resumen).toBeDefined();
      expect(res.body.resumen.total_despachos).toBeGreaterThanOrEqual(0);
      expect(res.body.resumen.monto_total_soles).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(res.body.items)).toBe(true);
    });
  });

  describe('5. Auditoría y Conciliación Matemática Global en Tiempo Real', () => {
    it('5.1 La conciliación general de toda la empresa debe reportar CERO discrepancias (100% Conciliado)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/conciliacion')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.resumen).toBeDefined();
      expect(res.body.resumen.total_evaluados).toBeGreaterThanOrEqual(1);

      // Invariante innegociable de la Fase 1: Delta cero y conciliación total
      expect(res.body.resumen.total_discrepancias).toBe(0);
      expect(res.body.resumen.estado_general).toBe('CONCILIACION_TOTAL_OK');

      // Validar cada par producto-almacén individualmente
      res.body.items.forEach((item: any) => {
        expect(item.discrepancia).toBe(0);
        expect(item.estado).toBe('CONCILIADO_OK');
        expect(item.saldo_fisico).toBe(item.total_kardex);
      });
    });

    it('5.2 Debe permitir exportar la auditoría matemática a CSV', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/conciliacion')
        .query({ formato: 'csv' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('"Código","Producto","Almacén","Saldo Físico","Total Kárdex","Discrepancia"');
    });
  });
});
