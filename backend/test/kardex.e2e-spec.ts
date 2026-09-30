import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';

describe('Hito 3: Ubicaciones Físicas, Motor de Kárdex Inmutable y Control de Stock (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let operadorToken: string;
  let vendedorToken: string;

  let almacenId: string;
  let zonaId: string;
  let categoriaId: string;
  let productoId: string;

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

    // 1. Obtener tokens de autenticación
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'alipio.admin', password: 'AgroControl2026*' });
    adminToken = adminLogin.body.access_token;

    const opLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'almacen1', password: 'AgroControl2026*' });
    operadorToken = opLogin.body.access_token;

    const venLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'vendedor1', password: 'AgroControl2026*' });
    vendedorToken = venLogin.body.access_token;

    // 2. Crear categoría y producto base para las pruebas
    let cat = await prisma.categoria.findFirst({ where: { activo: true } });
    if (!cat) {
      cat = await prisma.categoria.create({
        data: {
          codigo: `CAT-KARDEX-${Date.now().toString().slice(-4)}`,
          nombre: 'Categoría para Pruebas Kárdex',
        },
      });
    }
    categoriaId = cat.id;

    const prod = await prisma.producto.create({
      data: {
        codigo_interno: `FERT-UREA-${Date.now().toString().slice(-6)}`,
        nombre: 'Urea Granulada 46% N 50kg',
        unidad_base: 'saco',
        categoria_id: categoriaId,
      },
    });
    productoId = prod.id;
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('1. Módulo Ubicaciones (Almacén vs. Zona)', () => {
    it('1.1 Debe crear un ALMACEN principal físico exitosamente', async () => {
      const codigoAlmacen = `ALM-CENTRAL-${Date.now().toString().slice(-4)}`;
      const res = await request(app.getHttpServer())
        .post('/api/almacenes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'ALMACEN',
          codigo: codigoAlmacen,
          nombre: 'Almacén Central Pisco',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.tipo).toBe('ALMACEN');
      expect(res.body.codigo).toBe(codigoAlmacen);
      almacenId = res.body.id;
    });

    it('1.2 Debe rechazar la creación de una ZONA sin especificar almacén padre', async () => {
      await request(app.getHttpServer())
        .post('/api/almacenes')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tipo: 'ZONA',
          codigo: `ZONA-EST-${Date.now().toString().slice(-4)}`,
          nombre: 'Estante A sin padre',
        })
        .expect(400);
    });

    it('1.3 Debe permitir crear una ZONA vinculada a su ALMACEN padre', async () => {
      const codigoZona = `ZONA-PAS-${Date.now().toString().slice(-4)}`;
      const res = await request(app.getHttpServer())
        .post('/api/almacenes')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          tipo: 'ZONA',
          codigo: codigoZona,
          nombre: 'Pasillo 1 - Fertilizantes',
          padre_id: almacenId,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.tipo).toBe('ZONA');
      expect(res.body.padre_id).toBe(almacenId);
      zonaId = res.body.id;
    });
  });

  describe('2. Entradas de Mercadería e Invariantes del Kárdex', () => {
    it('2.1 [a] Registro exitoso de ENTRADA con incremento de stock_saldo.cantidad_fisica', async () => {
      const cantidadIngreso = 100; // 100 sacos
      const costoUnitario = 85.5; // S/. 85.50 por saco

      const res = await request(app.getHttpServer())
        .post('/api/inventario/ingreso')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          producto_id: productoId,
          ubicacion_id: almacenId,
          cantidad_base: cantidadIngreso,
          costo_unitario: costoUnitario,
          documento_tipo: 'FACTURA_COMPRA',
          motivo: 'Compra inicial a proveedor Molinos & Cía',
        })
        .expect(201);

      expect(res.body.movimiento_id).toBeDefined();
      expect(res.body.saldo.cantidad_fisica).toBe(100);
      expect(res.body.saldo.cantidad_reservada).toBe(0);
      expect(res.body.saldo.cantidad_disponible).toBe(100);

      // Verificar en base de datos el saldo materializado
      const saldoDb = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: almacenId,
          },
        },
      });

      expect(Number(saldoDb.cantidad_fisica)).toBe(100);
      expect(Number(saldoDb.cantidad_reservada)).toBe(0);
      expect(Number(saldoDb.cantidad_disponible)).toBe(100);
    });

    it('2.2 Realizar un segundo ingreso y verificar acumulación y valorización ponderada', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventario/ingreso')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          producto_id: productoId,
          ubicacion_id: almacenId,
          cantidad_base: 50,
          costo_unitario: 90.0,
          documento_tipo: 'GUIA_REMISION',
          motivo: 'Segundo lote de compra',
        })
        .expect(201);

      expect(res.body.saldo.cantidad_fisica).toBe(150);
      expect(res.body.saldo.cantidad_disponible).toBe(150);
    });
  });

  describe('3. Bloqueo de Salidas y Validación de Disponibilidad', () => {
    it('3.1 [b] Bloqueo de SALIDA si la cantidad solicitada supera el stock disponible', async () => {
      // Stock físico actual = 150. Solicitamos 200. Debe ser rechazado con 400 Bad Request.
      const res = await request(app.getHttpServer())
        .post('/api/inventario/salida')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          producto_id: productoId,
          ubicacion_id: almacenId,
          cantidad_base: 200,
          motivo: 'Intento de retiro superior al saldo',
        })
        .expect(400);

      expect(res.body.message).toContain('Stock insuficiente');

      // Verificar que el saldo no cambió
      const saldoDb = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: almacenId,
          },
        },
      });
      expect(Number(saldoDb.cantidad_fisica)).toBe(150);
    });

    it('3.2 Registro exitoso de SALIDA dentro del margen disponible', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventario/salida')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          producto_id: productoId,
          ubicacion_id: almacenId,
          cantidad_base: 30,
          motivo: 'Merma por saco roto durante manipuleo',
        })
        .expect(201);

      expect(res.body.saldo.cantidad_fisica).toBe(120);
      expect(res.body.saldo.cantidad_disponible).toBe(120);
    });
  });

  describe('4. Ajustes de Inventario y Obligatoriedad del Motivo', () => {
    it('4.1 [c] Registro de AJUSTE: rechaza la petición si falta el motivo', async () => {
      // Petición sin campo motivo
      await request(app.getHttpServer())
        .post('/api/inventario/ajuste')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          producto_id: productoId,
          ubicacion_id: almacenId,
          diferencia_base: -5,
        })
        .expect(400);

      // Petición con motivo vacío o espacios
      await request(app.getHttpServer())
        .post('/api/inventario/ajuste')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          producto_id: productoId,
          ubicacion_id: almacenId,
          diferencia_base: -5,
          motivo: '   ',
        })
        .expect(400);
    });

    it('4.2 Registro exitoso de AJUSTE físico compensatorio con motivo válido', async () => {
      // Stock actual: 120. Se cuenta en físico 115 (diferencia: -5)
      const res = await request(app.getHttpServer())
        .post('/api/inventario/ajuste')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          producto_id: productoId,
          ubicacion_id: almacenId,
          diferencia_base: -5,
          motivo: 'Ajuste de inventario físico mensual: faltante por humedad',
        })
        .expect(201);

      expect(res.body.saldo.cantidad_fisica).toBe(115);
      expect(res.body.saldo.cantidad_disponible).toBe(115);
    });

    it('4.3 Vendedor no tiene permisos para realizar ingresos o ajustes (RBAC)', async () => {
      await request(app.getHttpServer())
        .post('/api/inventario/ingreso')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          producto_id: productoId,
          ubicacion_id: almacenId,
          cantidad_base: 10,
        })
        .expect(403);

      await request(app.getHttpServer())
        .post('/api/inventario/ajuste')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          producto_id: productoId,
          ubicacion_id: almacenId,
          diferencia_base: 5,
          motivo: 'Intento no autorizado de ajuste',
        })
        .expect(403);
    });
  });

  describe('5. Conciliación Matemática e Inmutabilidad del Kárdex', () => {
    it('5.1 [d] Conciliación matemática exacta: SUM(kardex) == stock_saldo.cantidad_fisica', async () => {
      // Consulta al endpoint de conciliación
      const res = await request(app.getHttpServer())
        .get('/api/kardex/conciliacion')
        .query({
          producto_id: productoId,
          ubicacion_id: almacenId,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Movimientos realizados:
      // +100 (Ingreso 1)
      // +50  (Ingreso 2)
      // -30  (Salida)
      // -5   (Ajuste negativo)
      // Total esperado = 115
      expect(res.body.total_kardex).toBe(115);
      expect(res.body.saldo_fisico).toBe(115);
      expect(res.body.discrepancia).toBe(0);
      expect(res.body.conciliado).toBe(true);
    });

    it('5.2 Consulta paginada y filtrada del Kárdex (GET /api/kardex)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/kardex')
        .query({
          producto_id: productoId,
          ubicacion_id: almacenId,
          page: 1,
          limit: 10,
        })
        .set('Authorization', `Bearer ${operadorToken}`)
        .expect(200);

      expect(res.body.total).toBe(4);
      expect(res.body.items.length).toBe(4);
      // Validar que cada movimiento contiene datos del usuario y ubicación
      expect(res.body.items[0].usuario.username).toBeDefined();
      expect(res.body.items[0].ubicacion.codigo).toBeDefined();
    });

    it('5.3 Consulta de saldos de stock (GET /api/stock)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/stock')
        .query({
          producto_id: productoId,
          ubicacion_id: almacenId,
        })
        .set('Authorization', `Bearer ${vendedorToken}`) // Vendedor puede consultar stock
        .expect(200);

      expect(res.body.length).toBe(1);
      expect(res.body[0].cantidad_fisica).toBe(115);
      expect(res.body[0].cantidad_reservada).toBe(0);
      expect(res.body[0].cantidad_disponible).toBe(115);
    });

    it('5.4 [e] Comprobación de que la base de datos aborta cualquier intento de UPDATE o DELETE en el Kárdex', async () => {
      // Obtener un movimiento de Kárdex existente
      const movimiento = await prisma.movimiento_kardex.findFirst({
        where: {
          producto_id: productoId,
          ubicacion_id: almacenId,
        },
      });

      expect(movimiento).toBeDefined();

      // Intento 1: Ejecutar UPDATE físico sobre movimiento_kardex
      // Debe lanzar una excepción disparada por trg_no_update_delete_kardex
      let errorUpdate: any = null;
      try {
        await prisma.$executeRaw`
          UPDATE movimiento_kardex
          SET cantidad_base = 999
          WHERE id = ${movimiento.id}::uuid
        `;
      } catch (err) {
        errorUpdate = err;
      }

      expect(errorUpdate).not.toBeNull();
      expect(errorUpdate.message).toContain('VIOLACIÓN DE INVARIANTE: El Kárdex es un libro de solo inserción');

      // Intento 2: Ejecutar DELETE físico sobre movimiento_kardex
      // Debe lanzar la misma excepción disparada por trg_no_update_delete_kardex
      let errorDelete: any = null;
      try {
        await prisma.$executeRaw`
          DELETE FROM movimiento_kardex
          WHERE id = ${movimiento.id}::uuid
        `;
      } catch (err) {
        errorDelete = err;
      }

      expect(errorDelete).not.toBeNull();
      expect(errorDelete.message).toContain('VIOLACIÓN DE INVARIANTE: El Kárdex es un libro de solo inserción');

      // Verificar que el registro sigue intacto
      const movimientoVerificado = await prisma.movimiento_kardex.findUnique({
        where: { id: movimiento.id },
      });
      expect(movimientoVerificado).toBeDefined();
      expect(Number(movimientoVerificado.cantidad_base)).toBe(Number(movimiento.cantidad_base));
    });
  });
});
