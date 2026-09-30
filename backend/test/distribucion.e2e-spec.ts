import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';

describe('Hito 8: Vehículos, Carga de Distribución y Bodega Móvil Lógica (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let operadorToken: string;
  let vendedor1Token: string;
  let vendedor2Token: string;
  let vendedor1Id: string;
  let vendedor2Id: string;

  let almacenOrigenId: string;
  let categoriaId: string;
  let productoId: string;
  let presentacionCajaId: string;
  const factorCaja = 12; // 1 caja = 12 botellas/unidades base

  let vehiculoId: string;
  let vehiculoPlaca: string;
  let bodegaMovilId: string;
  let cargaId: string;

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

    const v1Login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'vendedor1', password: 'AgroControl2026*' });
    vendedor1Token = v1Login.body.access_token;
    
    // Consultar directamente los IDs de usuarios para que no dependan del payload de login
    const uVendedor1 = await prisma.usuario.findUnique({ where: { username: 'vendedor1' } });
    vendedor1Id = uVendedor1 ? uVendedor1.id : '';

    // Asegurar existencia de vendedor2
    let v2User = await prisma.usuario.findUnique({
      where: { username: 'vendedor2' },
    });
    if (!v2User) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('AgroControl2026*', 10);
      v2User = await prisma.usuario.create({
        data: {
          username: 'vendedor2',
          password_hash: hash,
          nombre_completo: 'Segundo Vendedor Ruta',
          email: 'vendedor2@agrocontrol.local',
          rol: 'VENDEDOR',
          activo: true,
        },
      });
    }
    vendedor2Id = v2User.id;

    const v2Login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'vendedor2', password: 'AgroControl2026*' });
    vendedor2Token = v2Login.body.access_token;

    // 2. Crear categoría y producto base
    let cat = await prisma.categoria.findFirst({ where: { activo: true } });
    if (!cat) {
      cat = await prisma.categoria.create({
        data: {
          codigo: `CAT-DIST-${Date.now().toString().slice(-4)}`,
          nombre: 'Fertilizantes y Pesticidas Distribución',
        },
      });
    }
    categoriaId = cat.id;

    const prod = await prisma.producto.create({
      data: {
        codigo_interno: `PROD-DIST-${Date.now().toString().slice(-6)}`,
        nombre: 'Fungicida Agrícola Sistémico 1L',
        unidad_base: 'botella',
        categoria_id: categoriaId,
      },
    });
    productoId = prod.id;

    const pres = await prisma.presentacion.create({
      data: {
        producto_id: productoId,
        nombre: 'Caja x12 Botellas',
        factor: factorCaja,
      },
    });
    presentacionCajaId = pres.id;

    // 3. Crear almacén físico central
    const alm = await prisma.ubicacion.create({
      data: {
        tipo: 'ALMACEN',
        codigo: `ALM-CENTRAL-${Date.now().toString().slice(-4)}`,
        nombre: 'Almacén Central Pisco',
      },
    });
    almacenOrigenId = alm.id;

    // 4. Ingresar 100 unidades base (botellas) al almacén central
    await request(app.getHttpServer())
      .post('/api/inventario/ingreso')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        producto_id: productoId,
        ubicacion_id: almacenOrigenId,
        cantidad_base: 100,
        costo_unitario: 25.5,
        motivo: 'Stock inicial para pruebas de distribución Hito 8',
      })
      .expect(201);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Modelado de Vehículos y Aprovisionamiento de Bodega Móvil Lógica', () => {
    it('1.1 Debe permitir a OPERADOR_ALMACEN registrar un vehículo con conductor habitual y aprovisionar automáticamente su BODEGA_MOVIL', async () => {
      vehiculoPlaca = `H8-${Date.now().toString().slice(-4)}`;

      const res = await request(app.getHttpServer())
        .post('/api/distribucion/vehiculos')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          placa: vehiculoPlaca,
          marca: 'Toyota',
          modelo: 'Hilux 4x4',
          tipo_vehiculo: 'CAMIONETA',
          capacidad_kg: 1000,
          capacidad_volumen: 4.5,
          conductor_habitual_id: vendedor1Id,
          observaciones: 'Unidad asignada a ruta norte',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.placa).toBe(vehiculoPlaca);
      expect(res.body.conductor_habitual_id).toBe(vendedor1Id);
      expect(res.body.bodega_movil).toBeDefined();
      expect(res.body.bodega_movil.tipo).toBe('BODEGA_MOVIL');
      expect(res.body.bodega_movil.codigo).toBe(`BM-${vehiculoPlaca}`);
      expect(res.body.bodega_movil.vehiculo_id).toBe(res.body.id);
      expect(res.body.bodega_movil.trabajador_id).toBe(vendedor1Id);

      vehiculoId = res.body.id;
      bodegaMovilId = res.body.bodega_movil.id;
    });

    it('1.2 Debe rechazar duplicidad de placa con HTTP 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post('/api/distribucion/vehiculos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          placa: vehiculoPlaca,
          marca: 'Nissan',
          modelo: 'Frontier',
        })
        .expect(409);
    });

    it('1.3 RBAC: VENDEDOR no puede crear vehículos (HTTP 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/distribucion/vehiculos')
        .set('Authorization', `Bearer ${vendedor1Token}`)
        .send({
          placa: `VEN-${Date.now().toString().slice(-4)}`,
          marca: 'Kia',
        })
        .expect(403);
    });

    it('1.4 Debe listar los vehículos incluyendo conductor y bodega móvil', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/distribucion/vehiculos')
        .set('Authorization', `Bearer ${vendedor1Token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const v = res.body.find((item: any) => item.id === vehiculoId);
      expect(v).toBeDefined();
      expect(v.placa).toBe(vehiculoPlaca);
      expect(v.conductor_habitual.id).toBe(vendedor1Id);
      expect(v.bodega_movil.codigo).toBe(`BM-${vehiculoPlaca}`);
    });
  });

  describe('2. Orden de Carga de Distribución (Captura Asistida y Validaciones)', () => {
    it('2.1 Debe registrar una orden de carga en estado PENDIENTE con cálculo asistido de empaques (2 cajas x12 + 6 botellas = 30 unidades)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/distribucion/cargas')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          almacen_origen_id: almacenOrigenId,
          vehiculo_id: vehiculoId,
          trabajador_id: vendedor1Id,
          observaciones: 'Carga matutina de fertilizantes y fungicidas',
          detalles: [
            {
              producto_id: productoId,
              presentacion_id: presentacionCajaId,
              cantidad_presentacion: 2, // 2 * 12 = 24
              cantidad_unidades_sueltas: 6, // 24 + 6 = 30 unidades base
            },
          ],
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.codigo).toMatch(/^CARGA-\d{8}-\d{4}$/);
      expect(res.body.estado).toBe('PENDIENTE');
      expect(res.body.almacen_origen_id).toBe(almacenOrigenId);
      expect(res.body.vehiculo_id).toBe(vehiculoId);
      expect(res.body.bodega_movil_id).toBe(bodegaMovilId);
      expect(res.body.carga_detalle).toHaveLength(1);
      expect(Number(res.body.carga_detalle[0].cantidad_total_base)).toBe(30);

      cargaId = res.body.id;
    });

    it('2.2 RBAC: VENDEDOR no puede crear órdenes de carga (HTTP 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/distribucion/cargas')
        .set('Authorization', `Bearer ${vendedor1Token}`)
        .send({
          almacen_origen_id: almacenOrigenId,
          vehiculo_id: vehiculoId,
          trabajador_id: vendedor1Id,
          detalles: [
            {
              producto_id: productoId,
              cantidad_total_base: 5,
            },
          ],
        })
        .expect(403);
    });

    it('2.3 Bloqueo de despacho si la cantidad requerida supera el stock disponible en origen (HTTP 400)', async () => {
      // Intentar crear y despachar una orden por 150 unidades cuando solo hay 100 disponibles
      const cargaExcesiva = await request(app.getHttpServer())
        .post('/api/distribucion/cargas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          almacen_origen_id: almacenOrigenId,
          vehiculo_id: vehiculoId,
          trabajador_id: vendedor1Id,
          detalles: [
            {
              producto_id: productoId,
              cantidad_total_base: 150, // Supera los 100 en almacén
            },
          ],
        })
        .expect(201);

      const resDespacho = await request(app.getHttpServer())
        .patch(`/api/distribucion/cargas/${cargaExcesiva.body.id}/despachar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);

      expect(resDespacho.body.message).toContain('insuficiente');
    });
  });

  describe('3. Despacho Atómico, Bloqueo Pesimista, Kárdex y Garantía de Invariantes', () => {
    let stockGlobalAntes: number;

    beforeAll(async () => {
      // Medir stock global antes del despacho
      const saldos = await prisma.stock_saldo.findMany({
        where: { producto_id: productoId },
      });
      stockGlobalAntes = saldos.reduce(
        (sum, s) => sum + Number(s.cantidad_fisica),
        0,
      );
      expect(stockGlobalAntes).toBe(100);
    });

    it('3.1 Debe despachar la carga pasando a EN_RUTA y realizando la transferencia atómica a BODEGA_MOVIL', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/distribucion/cargas/${cargaId}/despachar`)
        .set('Authorization', `Bearer ${operadorToken}`)
        .expect(200);

      expect(res.body.id).toBe(cargaId);
      expect(res.body.estado).toBe('EN_RUTA');
      expect(res.body.despachado_por).toBeDefined();

      // a) Verificar stock en Almacén Físico Origen (100 - 30 = 70)
      const saldoOrigen = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: almacenOrigenId,
          },
        },
      });
      expect(Number(saldoOrigen?.cantidad_fisica)).toBe(70);

      // b) Verificar stock en Bodega Móvil de Destino (0 + 30 = 30)
      const saldoBodega = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: bodegaMovilId,
          },
        },
      });
      expect(Number(saldoBodega?.cantidad_fisica)).toBe(30);

      // c) Verificar movimientos de Kárdex generados y enlazados
      const movimientos = await prisma.movimiento_kardex.findMany({
        where: {
          documento_tipo: 'CARGA_DISTRIBUCION',
          documento_id: cargaId,
        },
        orderBy: { fecha_registro: 'asc' },
      });

      expect(movimientos).toHaveLength(2);

      const movSalida = movimientos.find(
        (m) => m.ubicacion_id === almacenOrigenId,
      );
      const movEntrada = movimientos.find(
        (m) => m.ubicacion_id === bodegaMovilId,
      );

      expect(movSalida).toBeDefined();
      expect(movEntrada).toBeDefined();

      // Salida con cantidad negativa
      expect(movSalida?.tipo).toBe('ASIGNACION_DISTRIBUCION');
      expect(Number(movSalida?.cantidad_base)).toBe(-30);

      // Entrada con cantidad positiva y enlace referencial
      expect(movEntrada?.tipo).toBe('ASIGNACION_DISTRIBUCION');
      expect(Number(movEntrada?.cantidad_base)).toBe(30);
      expect(movEntrada?.movimiento_ref_id).toBe(movSalida?.id);
    });

    it('3.2 Invariante Innegociable: El Stock Global de la empresa permanece inalterado (100 = 70 + 30)', async () => {
      const saldos = await prisma.stock_saldo.findMany({
        where: { producto_id: productoId },
      });
      const stockGlobalDespues = saldos.reduce(
        (sum, s) => sum + Number(s.cantidad_fisica),
        0,
      );

      expect(stockGlobalDespues).toBe(stockGlobalAntes);
      expect(stockGlobalDespues).toBe(100);
    });

    it('3.3 Conciliación Matemática: Cero discrepancias en Almacén Origen y en Bodega Móvil', async () => {
      // Conciliación en Almacén Central (+100 inicial - 30 asignación = 70)
      const concOrigen = await request(app.getHttpServer())
        .get('/api/kardex/conciliacion')
        .query({
          producto_id: productoId,
          ubicacion_id: almacenOrigenId,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(concOrigen.body.total_kardex).toBe(70);
      expect(concOrigen.body.saldo_fisico).toBe(70);
      expect(concOrigen.body.discrepancia).toBe(0);
      expect(concOrigen.body.conciliado).toBe(true);

      // Conciliación en Bodega Móvil (+30 asignación = 30)
      const concBodega = await request(app.getHttpServer())
        .get('/api/kardex/conciliacion')
        .query({
          producto_id: productoId,
          ubicacion_id: bodegaMovilId,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(concBodega.body.total_kardex).toBe(30);
      expect(concBodega.body.saldo_fisico).toBe(30);
      expect(concBodega.body.discrepancia).toBe(0);
      expect(concBodega.body.conciliado).toBe(true);
    });

    it('3.4 Idempotencia y control de estado: No se puede despachar una carga que ya está EN_RUTA', async () => {
      await request(app.getHttpServer())
        .patch(`/api/distribucion/cargas/${cargaId}/despachar`)
        .set('Authorization', `Bearer ${operadorToken}`)
        .expect(400);
    });

    it('3.5 No se puede asignar una nueva carga a un vehículo que ya tiene una ruta EN_RUTA activa', async () => {
      await request(app.getHttpServer())
        .post('/api/distribucion/cargas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          almacen_origen_id: almacenOrigenId,
          vehiculo_id: vehiculoId,
          trabajador_id: vendedor1Id,
          detalles: [{ producto_id: productoId, cantidad_total_base: 5 }],
        })
        .expect(400);
    });
  });

  describe('4. Monitoreo de Bodegas Móviles Activas y Roles de Consulta', () => {
    it('4.1 Debe reportar las existencias físicas en tiempo real de cada Bodega Móvil (/api/distribucion/bodegas-moviles)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/distribucion/bodegas-moviles')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      const bm = res.body.find((b: any) => b.bodega_movil_id === bodegaMovilId);
      expect(bm).toBeDefined();
      expect(bm.vehiculo.placa).toBe(vehiculoPlaca);
      expect(bm.carga_activa).toBeDefined();
      expect(bm.carga_activa.id).toBe(cargaId);
      expect(bm.existencias).toHaveLength(1);
      expect(bm.existencias[0].producto_id).toBe(productoId);
      expect(bm.existencias[0].cantidad_fisica).toBe(30);
    });

    it('4.2 VENDEDOR: Consulta su propia carga asignada y vehículo en ruta', async () => {
      // Vendedor 1 consulta su carga
      const resV1 = await request(app.getHttpServer())
        .get('/api/distribucion/cargas')
        .set('Authorization', `Bearer ${vendedor1Token}`)
        .expect(200);

      expect(resV1.body.total).toBeGreaterThanOrEqual(1);
      const miCarga = resV1.body.items.find((c: any) => c.id === cargaId);
      expect(miCarga).toBeDefined();
      expect(miCarga.trabajador.id).toBe(vendedor1Id);

      // Vendedor 2 no debe ver la carga de Vendedor 1
      const resV2 = await request(app.getHttpServer())
        .get('/api/distribucion/cargas')
        .set('Authorization', `Bearer ${vendedor2Token}`)
        .expect(200);

      const cargaAjena = resV2.body.items.find((c: any) => c.id === cargaId);
      expect(cargaAjena).toBeUndefined();
    });

    it('4.3 VENDEDOR: Intento de consulta por ID de carga de otro vendedor arroja 403 Forbidden', async () => {
      await request(app.getHttpServer())
        .get(`/api/distribucion/cargas/${cargaId}`)
        .set('Authorization', `Bearer ${vendedor2Token}`)
        .expect(403);
    });

    it('4.4 Consulta de detalle completo de carga con stock actual del vehículo (/api/distribucion/cargas/:id)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/distribucion/cargas/${cargaId}`)
        .set('Authorization', `Bearer ${vendedor1Token}`)
        .expect(200);

      expect(res.body.id).toBe(cargaId);
      expect(res.body.carga_detalle).toHaveLength(1);
      expect(res.body.carga_detalle[0].stock_actual_bodega_movil).toBe(30);
    });

    it('4.5 No se puede desactivar un vehículo que tiene una carga EN_RUTA', async () => {
      await request(app.getHttpServer())
        .delete(`/api/distribucion/vehiculos/${vehiculoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});
