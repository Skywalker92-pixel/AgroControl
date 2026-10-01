import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Health and Observability Check (OBS-OPS-01 & OBS-BKP-NEW-02) (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let vendedorToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();

    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'alipio.admin', password: 'AgroControl2026*' });
    adminToken = adminLogin.body.access_token;

    const v1Login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'vendedor1', password: 'AgroControl2026*' });
    vendedorToken = v1Login.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /api/health debe ser público, ligero y responder únicamente status y timestamp', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health')
      .expect(200);

    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.base_datos).toBeUndefined(); // No debe exponer detalles sensibles
    expect(res.body.disco).toBeUndefined();
    expect(res.body.backups).toBeUndefined();
  });

  it('2. GET /api/health/details debe requerir autenticación (401 Unauthorized sin token)', async () => {
    await request(app.getHttpServer())
      .get('/api/health/details')
      .expect(401);
  });

  it('3. GET /api/health/details debe bloquear al rol VENDEDOR (403 Forbidden)', async () => {
    await request(app.getHttpServer())
      .get('/api/health/details')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(403);
  });

  it('4. GET /api/health/details debe permitir acceso al ADMINISTRADOR con diagnóstico completo', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/health/details')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.status).toBeDefined();
    expect(res.body.timestamp).toBeDefined();
    expect(res.body.uptime_segundos).toBeDefined();
    expect(res.body.base_datos).toBeDefined();
    expect(res.body.base_datos.estado).toBe('conectada');
    expect(res.body.backups).toBeDefined();
    expect(res.body.disco).toBeDefined();
    expect(res.body.operaciones_observadas).toBeDefined();
    expect(res.body.conciliacion).toBeDefined();
  });
});
