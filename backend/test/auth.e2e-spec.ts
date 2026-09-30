import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';

describe('Hito 1: Auth, Roles (RBAC) y Auditoría (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let vendedorToken: string;

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
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. [a] POST /api/auth/login -> Login exitoso con el administrador del seed (alipio.admin)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'alipio.admin',
        password: 'AgroControl2026*',
      })
      .expect(200);

    expect(response.body).toHaveProperty('access_token');
    expect(response.body.token_type).toBe('Bearer');
    expect(response.body.usuario.username).toBe('alipio.admin');
    expect(response.body.usuario.rol).toBe('ADMINISTRADOR_PROPIETARIO');

    adminToken = response.body.access_token;
  });

  it('2. GET /api/auth/perfil -> Acceso a perfil con token JWT válido emitido localmente', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/perfil')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.username).toBe('alipio.admin');
    expect(response.body.rol).toBe('ADMINISTRADOR_PROPIETARIO');
    expect(response.body.activo).toBe(true);
  });

  it('3. [b] GET /api/auth/perfil -> Bloqueo de rutas protegidas ante token inválido o ausente (HTTP 401)', async () => {
    // Sin token
    await request(app.getHttpServer())
      .get('/api/auth/perfil')
      .expect(401);

    // Con token malformado/inválido
    await request(app.getHttpServer())
      .get('/api/auth/perfil')
      .set('Authorization', 'Bearer token_falso_invalido_xyz123')
      .expect(401);
  });

  it('4. GET /api/auth/admin-only -> Permite acceso autorizado a ADMINISTRADOR_PROPIETARIO', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(response.body.rol).toBe('ADMINISTRADOR_PROPIETARIO');
    expect(response.body.ejecutado_por).toBe('alipio.admin');
  });

  it('5. Login con rol VENDEDOR (vendedor1) y obtención de su token', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'vendedor1',
        password: 'AgroControl2026*',
      })
      .expect(200);

    expect(response.body.usuario.username).toBe('vendedor1');
    expect(response.body.usuario.rol).toBe('VENDEDOR');

    vendedorToken = response.body.access_token;
  });

  it('6. [c] GET /api/auth/admin-only -> Restricción de acceso para rol VENDEDOR con HTTP 403 Forbidden', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(403);

    expect(response.body.message).toContain('no tiene permisos suficientes');
  });

  it('7. [d] Comprobación de que los logins generaron eventos en la tabla auditoria', async () => {
    // Disparar intento fallido intencional para verificar registro de auditoría
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        username: 'alipio.admin',
        password: 'PasswordIncorrecta999',
      })
      .expect(401);

    // Consultar directamente la tabla auditoria con Prisma
    const eventosAuditoria = await prisma.auditoria.findMany({
      where: { entidad: 'auth', accion: 'LOGIN' },
      orderBy: { fecha: 'desc' },
      take: 10,
    });

    expect(eventosAuditoria.length).toBeGreaterThan(0);

    // Verificar que existe evento EXITOSO para alipio.admin
    const eventoExitosoAdmin = eventosAuditoria.find(
      (e) =>
        (e.valor_nuevo as any)?.resultado === 'EXITOSO' &&
        (e.valor_nuevo as any)?.username === 'alipio.admin',
    );
    expect(eventoExitosoAdmin).toBeDefined();

    // Verificar que existe evento EXITOSO para vendedor1
    const eventoExitosoVendedor = eventosAuditoria.find(
      (e) =>
        (e.valor_nuevo as any)?.resultado === 'EXITOSO' &&
        (e.valor_nuevo as any)?.username === 'vendedor1',
    );
    expect(eventoExitosoVendedor).toBeDefined();

    // Verificar que existe al menos un evento FALLIDO registrado con su motivo
    const eventoFallido = eventosAuditoria.find(
      (e) => (e.valor_nuevo as any)?.resultado === 'FALLIDO',
    );
    expect(eventoFallido).toBeDefined();
    expect((eventoFallido.valor_nuevo as any)?.motivo).toBe('PASSWORD_INCORRECTO');
  });
});
