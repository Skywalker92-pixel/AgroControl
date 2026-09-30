import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';

describe('Hito 5: Pedidos, Proformas y Despacho con Triple Saldo (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let operadorToken: string;
  let vendedorToken: string;

  let almacenId: string;
  let categoriaId: string;
  let productoId: string;
  let presentacionCajaId: string;
  let listaMayoristaId: string;
  let clienteId: string;

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

    // 2. Obtener lista mayorista
    const lista = await prisma.lista_precio.findUnique({
      where: { codigo: 'MAYORISTA' },
    });
    listaMayoristaId = lista.id;

    // 3. Crear cliente mayorista
    const cliente = await prisma.cliente.create({
      data: {
        tipo_documento: 'RUC',
        numero_documento: `20${Date.now().toString().slice(-9)}`,
        razon_social: 'Agrícola Valle Hermoso SAC',
        direccion: 'Valle de Pisco Km 15',
        telefono: '956123456',
        lista_precio_id: listaMayoristaId,
      },
    });
    clienteId = cliente.id;

    // 4. Crear almacén físico
    const alm = await prisma.ubicacion.create({
      data: {
        tipo: 'ALMACEN',
        codigo: `ALM-DESP-${Date.now().toString().slice(-4)}`,
        nombre: 'Almacén de Despacho Principal',
      },
    });
    almacenId = alm.id;

    // 5. Crear categoría y producto base
    let cat = await prisma.categoria.findFirst({ where: { activo: true } });
    if (!cat) {
      cat = await prisma.categoria.create({
        data: {
          codigo: `CAT-DESP-${Date.now().toString().slice(-4)}`,
          nombre: 'Fertilizantes Foliares',
        },
      });
    }
    categoriaId = cat.id;

    const prod = await prisma.producto.create({
      data: {
        codigo_interno: `BIO-RAD-${Date.now().toString().slice(-6)}`,
        nombre: 'Bioestimulante Radicular 1L',
        unidad_base: 'litro',
        categoria_id: categoriaId,
      },
    });
    productoId = prod.id;

    // 6. Crear presentación comercial (Caja x12 botellas de 1L)
    const pres = await prisma.presentacion.create({
      data: {
        producto_id: productoId,
        nombre: 'Caja x12',
        factor: 12.0,
      },
    });
    presentacionCajaId = pres.id;

    // 7. Asignar precio en lista mayorista (S/. 35.00 por litro)
    await prisma.precio_producto.create({
      data: {
        lista_precio_id: listaMayoristaId,
        producto_id: productoId,
        precio: 35.0,
      },
    });

    // 8. Cargar stock inicial en almacén de despacho (100 litros)
    await request(app.getHttpServer())
      .post('/api/inventario/ingreso')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        producto_id: productoId,
        ubicacion_id: almacenId,
        cantidad_base: 100,
        costo_unitario: 22.0,
        motivo: 'Stock inicial para pruebas de pedidos y despacho',
      })
      .expect(201);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('1. Creación en BORRADOR y Validación de Cantidades y Precios', () => {
    let proformaBorradorId: string;

    it('1.1 [a] Creación en BORRADOR no altera cantidad_reservada ni cantidad_fisica', async () => {
      // Venta de 2 Cajas x12 + 1 unidad suelta = 25 litros
      // Precio: 25 litros * S/. 35.00 = S/. 875.00 + IGV (18%) = S/. 1,032.50
      const res = await request(app.getHttpServer())
        .post('/api/despacho/proformas')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          cliente_id: clienteId,
          ubicacion_id: almacenId,
          observaciones: 'Pedido para entrega urgente en fundo',
          items: [
            {
              producto_id: productoId,
              presentacion_id: presentacionCajaId,
              cantidad_presentacion: 2,
              unidades_sueltas: 1,
            },
          ],
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.numero).toContain('PROF-');
      expect(res.body.estado).toBe('BORRADOR');
      expect(Number(res.body.subtotal)).toBe(875.0);
      expect(Number(res.body.igv)).toBe(157.5);
      expect(Number(res.body.total)).toBe(1032.5);

      proformaBorradorId = res.body.id;

      // Invariante: En BORRADOR el stock_saldo permanece intacto
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

    it('1.2 [c] Bloqueo al intentar reservar si la cantidad solicitada supera el stock disponible', async () => {
      // Crear proforma que pide 120 litros (disponible es 100)
      const resCrear = await request(app.getHttpServer())
        .post('/api/despacho/proformas')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          cliente_id: clienteId,
          ubicacion_id: almacenId,
          items: [
            {
              producto_id: productoId,
              cantidad_total_base: 120,
            },
          ],
        })
        .expect(201);

      const sobregiradaId = resCrear.body.id;

      // Intentar pasar a RESERVADO
      const resReserva = await request(app.getHttpServer())
        .patch(`/api/despacho/proformas/${sobregiradaId}/estado`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ nuevo_estado: 'RESERVADO' })
        .expect(400);

      expect(resReserva.body.message).toContain('Stock insuficiente para reservar');

      // Verificar que el saldo sigue en 100 disponible y 0 reservado
      const saldoDb = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: almacenId,
          },
        },
      });
      expect(Number(saldoDb.cantidad_reservada)).toBe(0);
      expect(Number(saldoDb.cantidad_disponible)).toBe(100);
    });
  });

  describe('2. Transición a RESERVADO y Manejo del Triple Saldo', () => {
    let proformaPrincipalId: string;

    it('2.1 [b] Transición a RESERVADO incrementa cantidad_reservada y reduce cantidad_disponible', async () => {
      // Crear proforma de 25 litros
      const resCrear = await request(app.getHttpServer())
        .post('/api/despacho/proformas')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          cliente_id: clienteId,
          ubicacion_id: almacenId,
          items: [
            {
              producto_id: productoId,
              presentacion_id: presentacionCajaId,
              cantidad_presentacion: 2,
              unidades_sueltas: 1,
            },
          ],
        })
        .expect(201);

      proformaPrincipalId = resCrear.body.id;

      // Transición a RESERVADO por el vendedor
      const res = await request(app.getHttpServer())
        .patch(`/api/despacho/proformas/${proformaPrincipalId}/estado`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ nuevo_estado: 'RESERVADO' })
        .expect(200);

      expect(res.body.estado).toBe('RESERVADO');

      // Verificar triple saldo en stock_saldo:
      // Física = 100, Reservada = 25, Disponible = 75
      const saldoDb = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: almacenId,
          },
        },
      });

      expect(Number(saldoDb.cantidad_fisica)).toBe(100);
      expect(Number(saldoDb.cantidad_reservada)).toBe(25);
      expect(Number(saldoDb.cantidad_disponible)).toBe(75);

      // Verificar que Kárdex NO tiene movimientos de salida por la reserva
      const movimientosSalida = await prisma.movimiento_kardex.findMany({
        where: {
          producto_id: productoId,
          ubicacion_id: almacenId,
          tipo: 'SALIDA',
        },
      });
      expect(movimientosSalida.length).toBe(0);
    });

    it('2.2 [d] Anulación desde RESERVADO libera la reserva y restablece el disponible a su valor original', async () => {
      // Crear una segunda proforma y reservarla por 30 litros
      const resCrear = await request(app.getHttpServer())
        .post('/api/despacho/proformas')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          cliente_id: clienteId,
          ubicacion_id: almacenId,
          items: [
            {
              producto_id: productoId,
              cantidad_total_base: 30,
            },
          ],
        })
        .expect(201);

      const proforma2Id = resCrear.body.id;

      await request(app.getHttpServer())
        .patch(`/api/despacho/proformas/${proforma2Id}/estado`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ nuevo_estado: 'RESERVADO' })
        .expect(200);

      // Reservada total ahora = 25 + 30 = 55. Disponible = 45
      let saldoDb = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: almacenId,
          },
        },
      });
      expect(Number(saldoDb.cantidad_reservada)).toBe(55);
      expect(Number(saldoDb.cantidad_disponible)).toBe(45);

      // Ahora anulamos la segunda proforma
      await request(app.getHttpServer())
        .patch(`/api/despacho/proformas/${proforma2Id}/estado`)
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          nuevo_estado: 'ANULADO',
          motivo: 'Cliente desistió de la compra por falta de liquidez',
        })
        .expect(200);

      // La reserva debe haberse liberado: reservada vuelve a 25 y disponible a 75
      saldoDb = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: almacenId,
          },
        },
      });
      expect(Number(saldoDb.cantidad_fisica)).toBe(100);
      expect(Number(saldoDb.cantidad_reservada)).toBe(25);
      expect(Number(saldoDb.cantidad_disponible)).toBe(75);
    });
  });

  describe('3. Máquina de Estados, Roles y Despacho Físico', () => {
    let proformaDespachoId: string;

    beforeAll(async () => {
      // Crear y reservar proforma de 25 litros para el flujo completo
      const res = await request(app.getHttpServer())
        .post('/api/despacho/proformas')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          cliente_id: clienteId,
          ubicacion_id: almacenId,
          estado_inicial: 'RESERVADO',
          items: [
            {
              producto_id: productoId,
              presentacion_id: presentacionCajaId,
              cantidad_presentacion: 2,
              unidades_sueltas: 1,
            },
          ],
        })
        .expect(201);

      proformaDespachoId = res.body.id;
    });

    it('3.1 Vendedor no puede pasar a PREPARADO ni a DESPACHADO (RBAC 403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .patch(`/api/despacho/proformas/${proformaDespachoId}/estado`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ nuevo_estado: 'PREPARADO' })
        .expect(403);

      await request(app.getHttpServer())
        .patch(`/api/despacho/proformas/${proformaDespachoId}/estado`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({ nuevo_estado: 'DESPACHADO' })
        .expect(403);
    });

    it('3.2 Operador de almacén pasa a PREPARADO manteniendo la reserva activa', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/despacho/proformas/${proformaDespachoId}/estado`)
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({ nuevo_estado: 'PREPARADO' })
        .expect(200);

      expect(res.body.estado).toBe('PREPARADO');

      // Stock: la reserva sigue activa
      const saldoDb = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: almacenId,
          },
        },
      });
      // 25 de la proforma principal anterior + 25 de esta = 50 reservada
      expect(Number(saldoDb.cantidad_reservada)).toBe(50);
      expect(Number(saldoDb.cantidad_disponible)).toBe(50);
      expect(Number(saldoDb.cantidad_fisica)).toBe(100);
    });

    it('3.3 Emisión de la Orden de Despacho formateada para el personal de carga', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/despacho/proformas/${proformaDespachoId}/orden-despacho`)
        .set('Authorization', `Bearer ${operadorToken}`)
        .expect(200);

      expect(res.body.numero_documento).toContain('PROF-');
      expect(res.body.cliente.razon_social).toBe('Agrícola Valle Hermoso SAC');
      expect(res.body.almacen_origen.id).toBe(almacenId);
      expect(res.body.items.length).toBe(1);
      expect(res.body.items[0].descripcion_empaque).toContain('2 Caja x12 + 1 litro(s) suelta(s)');
      expect(res.body.items[0].cantidad_total_base).toBe(25);
      expect(res.body.resumen_carga.total_unidades_base).toBe(25);
    });

    it('3.4 [e] Flujo completo hasta DESPACHADO: descuenta física, libera reserva y registra Kárdex', async () => {
      // Estado PREPARADO -> DESPACHADO
      const res = await request(app.getHttpServer())
        .patch(`/api/despacho/proformas/${proformaDespachoId}/estado`)
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({ nuevo_estado: 'DESPACHADO' })
        .expect(200);

      expect(res.body.estado).toBe('DESPACHADO');

      // Verificar en stock_saldo:
      // Físico decrementa 25: 100 - 25 = 75
      // Reservado decrementa 25: 50 - 25 = 25
      // Disponible: 75 - 25 = 50
      const saldoDb = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: almacenId,
          },
        },
      });

      expect(Number(saldoDb.cantidad_fisica)).toBe(75);
      expect(Number(saldoDb.cantidad_reservada)).toBe(25);
      expect(Number(saldoDb.cantidad_disponible)).toBe(50);

      // Verificar que se creó el movimiento SALIDA en movimiento_kardex
      const movimientoKardex = await prisma.movimiento_kardex.findFirst({
        where: {
          producto_id: productoId,
          ubicacion_id: almacenId,
          tipo: 'SALIDA',
          documento_id: proformaDespachoId,
        },
      });

      expect(movimientoKardex).toBeDefined();
      expect(movimientoKardex.tipo).toBe('SALIDA');
      expect(Number(movimientoKardex.cantidad_base)).toBe(-25);
      expect(movimientoKardex.documento_tipo).toBe('ORDEN_DESPACHO');
      expect(movimientoKardex.motivo).toContain('Despacho de mercadería proforma');
    });

    it('3.5 [f] Conciliación matemática exacta tras el despacho físico', async () => {
      // Conciliación en tiempo real:
      // Movimientos Kárdex: +100 (Ingreso inicial) - 25 (Despacho) = 75
      // Saldo físico: 75
      const concRes = await request(app.getHttpServer())
        .get('/api/kardex/conciliacion')
        .query({
          producto_id: productoId,
          ubicacion_id: almacenId,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(concRes.body.total_kardex).toBe(75);
      expect(concRes.body.saldo_fisico).toBe(75);
      expect(concRes.body.discrepancia).toBe(0);
      expect(concRes.body.conciliado).toBe(true);
    });

    it('3.6 Rechaza anulación directa de una proforma ya DESPACHADA', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/despacho/proformas/${proformaDespachoId}/estado`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ nuevo_estado: 'ANULADO' })
        .expect(400);

      expect(res.body.message).toContain('DESPACHADO no puede modificarse o anularse directamente');
    });
  });
});
