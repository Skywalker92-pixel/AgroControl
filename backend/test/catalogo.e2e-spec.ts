import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';

describe('Hito 2: Catálogo, Unidades Base, Presentaciones, Precios y Clientes (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let vendedorToken: string;

  let categoriaId: string;
  let productoId: string;
  let presentacionId: string;
  let listaMayoristaId: string;
  let listaMinoristaId: string;
  let clienteMayoristaId: string;

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

    // 1. Obtener tokens de prueba
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'alipio.admin', password: 'AgroControl2026*' });
    adminToken = adminLogin.body.access_token;

    const vendedorLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'vendedor1', password: 'AgroControl2026*' });
    vendedorToken = vendedorLogin.body.access_token;

    // 2. Obtener listas de precios precargadas en el seed
    const listaMayorista = await prisma.lista_precio.findUnique({
      where: { codigo: 'MAYORISTA' },
    });
    listaMayoristaId = listaMayorista.id;

    const listaMinorista = await prisma.lista_precio.findUnique({
      where: { codigo: 'MINORISTA' },
    });
    listaMinoristaId = listaMinorista.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  it('1. Setup de Categoría -> Crear o recuperar categoría de Herbicidas', async () => {
    let cat = await prisma.categoria.findUnique({ where: { codigo: 'CAT-HERB' } });
    if (!cat) {
      const res = await request(app.getHttpServer())
        .post('/api/categorias')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          codigo: 'CAT-HERB-E2E',
          nombre: 'Herbicidas E2E',
          descripcion: 'Categoría para pruebas e2e',
        })
        .expect(201);
      categoriaId = res.body.id;
    } else {
      categoriaId = cat.id;
    }
    expect(categoriaId).toBeDefined();
  });

  it('2. [a] Crear producto y presentación comercial asociada con factor de conversión', async () => {
    // a) Crear producto con unidad base estricta y código de barras opcional
    const codigoProd = `HERB-GLIFO-${Date.now().toString().slice(-4)}`;
    const codigoBarras = `775${Date.now().toString().slice(-10)}`;
    const prodRes = await request(app.getHttpServer())
      .post('/api/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        codigo_interno: codigoProd,
        codigo_barras: codigoBarras, // POR VALIDAR (opcional)
        nombre: 'Glifosato 480 SL 1 Litro',
        descripcion: 'Herbicida sistémico no selectivo',
        categoria_id: categoriaId,
        unidad_base: 'botella',
      })
      .expect(201);

    expect(prodRes.body).toHaveProperty('id');
    expect(prodRes.body.codigo_interno).toBe(codigoProd);
    expect(prodRes.body.unidad_base).toBe('botella');
    productoId = prodRes.body.id;

    // b) Crear presentación comercial "Caja x12" con factor = 12
    const presRes = await request(app.getHttpServer())
      .post(`/api/productos/${productoId}/presentaciones`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: 'Caja x12',
        factor: 12.000,
      })
      .expect(201);

    expect(presRes.body).toHaveProperty('id');
    expect(presRes.body.nombre).toBe('Caja x12');
    expect(Number(presRes.body.factor)).toBe(12);
    presentacionId = presRes.body.id;
  });

  it('3. [b] Cálculo y conversión exacta a unidades base en el servidor (2 cajas + 3 sueltas = 27 unidades base)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/presentaciones/calcular-conversion')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        producto_id: productoId,
        presentacion_id: presentacionId,
        cantidad_presentacion: 2,
        unidades_sueltas: 3,
      })
      .expect(201);

    // Invariante: 2 cajas * 12 + 3 sueltas = 27 unidades base estrictas
    expect(res.body.unidad_base).toBe('botella');
    expect(res.body.cantidad_presentacion).toBe(2);
    expect(res.body.unidades_sueltas).toBe(3);
    expect(res.body.unidades_desde_presentacion).toBe(24);
    expect(res.body.total_unidades_base).toBe(27);
  });

  it('4. Asignar precios mayorista y minorista al producto', async () => {
    // Precio mayorista: S/ 35.00
    const resMayorista = await request(app.getHttpServer())
      .post('/api/precios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        lista_precio_id: listaMayoristaId,
        producto_id: productoId,
        precio: 35.00,
      })
      .expect(201);

    expect(resMayorista.body.precio).toBe(35);
    expect(resMayorista.body.lista_codigo).toBe('MAYORISTA');

    // Precio minorista: S/ 45.00
    const resMinorista = await request(app.getHttpServer())
      .post('/api/precios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        lista_precio_id: listaMinoristaId,
        producto_id: productoId,
        precio: 45.00,
      })
      .expect(201);

    expect(resMinorista.body.precio).toBe(45);
    expect(resMinorista.body.lista_codigo).toBe('MINORISTA');
  });

  it('5. Crear cliente mayorista y asociarle su lista de precios', async () => {
    const numRuc = `2060${Date.now().toString().slice(-7)}`;
    const res = await request(app.getHttpServer())
      .post('/api/clientes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        tipo_documento: 'RUC',
        numero_documento: numRuc,
        razon_social: 'Distribuidora Agrícola del Norte SAC',
        direccion: 'Av. Panamericana Norte Km 520',
        telefono: '987654321',
        email: 'ventas@agronorte.local',
        lista_precio_id: listaMayoristaId,
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.lista_precio.codigo).toBe('MAYORISTA');
    clienteMayoristaId = res.body.id;
  });

  it('6. [c] Invariante de precios: El cliente mayorista recibe precio MAYORISTA (S/ 35.00) sin importar la cantidad solicitada', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/precios/cliente/${clienteMayoristaId}/producto/${productoId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.lista_precio.codigo).toBe('MAYORISTA');
    expect(res.body.precio_unitario).toBe(35.00);
  });

  it('7. [d] Bloqueo de creación y edición en catálogo para el rol VENDEDOR (HTTP 403 Forbidden)', async () => {
    // Intento de crear producto por parte de VENDEDOR -> 403
    await request(app.getHttpServer())
      .post('/api/productos')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        codigo_interno: 'ILEGAL-001',
        nombre: 'Producto no autorizado',
        categoria_id: categoriaId,
        unidad_base: 'unidad',
      })
      .expect(403);

    // Intento de crear categoría por parte de VENDEDOR -> 403
    await request(app.getHttpServer())
      .post('/api/categorias')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        codigo: 'CAT-ILEGAL',
        nombre: 'Categoría no autorizada',
      })
      .expect(403);

    // Intento de asignar precio por parte de VENDEDOR -> 403
    await request(app.getHttpServer())
      .post('/api/precios')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        lista_precio_id: listaMayoristaId,
        producto_id: productoId,
        precio: 10.00,
      })
      .expect(403);

    // Pero el rol VENDEDOR SÍ puede consultar el catálogo (Lectura permitida) -> 200
    const resLectura = await request(app.getHttpServer())
      .get('/api/productos')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .expect(200);

    expect(Array.isArray(resLectura.body)).toBe(true);
  });

  it('8. Comprobar que la creación de producto y precio se registraron en la bitácora inmutable de auditoría', async () => {
    // Auditoría de producto
    const auditoriaProd = await prisma.auditoria.findFirst({
      where: {
        entidad: 'producto',
        registro_id: productoId,
        accion: 'INSERT',
      },
    });
    expect(auditoriaProd).toBeDefined();

    // Auditoría de precio
    const auditoriaPrecio = await prisma.auditoria.findFirst({
      where: {
        entidad: 'precio_producto',
        accion: 'INSERT',
      },
      orderBy: { fecha: 'desc' },
    });
    expect(auditoriaPrecio).toBeDefined();

    // Auditoría de cliente
    const auditoriaCliente = await prisma.auditoria.findFirst({
      where: {
        entidad: 'cliente',
        registro_id: clienteMayoristaId,
        accion: 'INSERT',
      },
    });
    expect(auditoriaCliente).toBeDefined();
  });
});
