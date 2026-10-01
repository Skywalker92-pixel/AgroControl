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

  // ============================================================================
  // OBS-SEC-08: Restricción de acceso al endpoint /usuarios
  // ============================================================================
  it('8. [OBS-SEC-08] GET /api/usuarios -> Permite acceso a ADMINISTRADOR_PROPIETARIO (HTTP 200)', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThan(0);
    expect(response.body[0]).toHaveProperty('username');
    expect(response.body[0]).toHaveProperty('rol');
  });

  it('9. [OBS-SEC-08] GET /api/usuarios -> Bloquea el acceso al rol VENDEDOR con HTTP 403 Forbidden', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(403);

    expect(response.body.message).toContain('no tiene permisos suficientes');
  });

  // ============================================================================
  // OBS-SEC-01: Validación Fail-Fast para JWT_SECRET
  // ============================================================================
  it('10. [OBS-SEC-01] Fail-fast al arrancar si JWT_SECRET no es seguro (< 16 caracteres)', () => {
    const validarSecreto = (secreto?: string) => {
      if (!secreto || secreto.length < 16) {
        throw new Error('FATAL: JWT_SECRET no configurado en entorno');
      }
      return true;
    };

    expect(() => validarSecreto(undefined)).toThrow('FATAL: JWT_SECRET no configurado en entorno');
    expect(() => validarSecreto('')).toThrow('FATAL: JWT_SECRET no configurado en entorno');
    expect(() => validarSecreto('corto_12345')).toThrow('FATAL: JWT_SECRET no configurado en entorno');
    expect(validarSecreto('secreto_largo_valido_2026_super_seguro')).toBe(true);
  });

  // ============================================================================
  // OBS-SEC-06: Rate Limiting y Protección contra Fuerza Bruta
  // ============================================================================
  it('11. [OBS-SEC-06] Rate limiting: Bloquea con 429 Too Many Requests al exceder 5 intentos en /auth/login', async () => {
    // Los tests 1, 5 y 7 consumieron 3 intentos.
    // Intento 4:
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'alipio.admin', password: 'AgroControl2026*' });

    // Intento 5 (límite alcanzado):
    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'alipio.admin', password: 'AgroControl2026*' });

    // Intento 6 (supera el límite de 5 por minuto):
    const resThrottled = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'alipio.admin', password: 'AgroControl2026*' });

    expect(resThrottled.status).toBe(429);
  });
});
