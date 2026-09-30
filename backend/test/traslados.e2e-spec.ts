import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';

describe('Hito 4: Traslados Atómicos entre Almacenes Físicos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let operadorToken: string;
  let vendedorToken: string;

  let almacenOrigenId: string;
  let almacenDestinoId: string;
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
          codigo: `CAT-TRAS-${Date.now().toString().slice(-4)}`,
          nombre: 'Categoría para Traslados',
        },
      });
    }
    categoriaId = cat.id;

    const prod = await prisma.producto.create({
      data: {
        codigo_interno: `INSEC-CLOR-${Date.now().toString().slice(-6)}`,
        nombre: 'Clorpirifos 48% EC 1L',
        unidad_base: 'litro',
        categoria_id: categoriaId,
      },
    });
    productoId = prod.id;

    // 3. Crear dos almacenes físicos
    const almOrigen = await prisma.ubicacion.create({
      data: {
        tipo: 'ALMACEN',
        codigo: `ALM-PISCO-${Date.now().toString().slice(-4)}`,
        nombre: 'Almacén Principal Pisco',
      },
    });
    almacenOrigenId = almOrigen.id;

    const almDestino = await prisma.ubicacion.create({
      data: {
        tipo: 'ALMACEN',
        codigo: `ALM-CHINCHA-${Date.now().toString().slice(-4)}`,
        nombre: 'Almacén Secundario Chincha',
      },
    });
    almacenDestinoId = almDestino.id;

    // 4. Cargar stock inicial en almacén de origen (100 litros)
    await request(app.getHttpServer())
      .post('/api/inventario/ingreso')
      .set('Authorization', `Bearer ${operadorToken}`)
      .send({
        producto_id: productoId,
        ubicacion_id: almacenOrigenId,
        cantidad_base: 100,
        costo_unitario: 45.0,
        motivo: 'Stock inicial para pruebas de traslado',
      })
      .expect(201);
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  describe('1. Validaciones de Negocio Obligatorias', () => {
    it('1.1 [a] Debe bloquear el traslado si origen y destino son idénticos (400 Bad Request)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/inventario/traslado')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          producto_id: productoId,
          origen_id: almacenOrigenId,
          destino_id: almacenOrigenId, // Mismo almacén
          cantidad_base: 10,
          motivo: 'Intento de traslado al mismo almacén',
        })
        .expect(400);

      expect(res.body.message).toContain('origen y destino no pueden ser el mismo');
    });

    it('1.2 [c] Debe bloquear si falta el motivo del traslado (400 Bad Request)', async () => {
      // Petición sin campo motivo
      await request(app.getHttpServer())
        .post('/api/inventario/traslado')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          producto_id: productoId,
          origen_id: almacenOrigenId,
          destino_id: almacenDestinoId,
          cantidad_base: 10,
        })
        .expect(400);

      // Petición con motivo en blanco
      await request(app.getHttpServer())
        .post('/api/inventario/traslado')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          producto_id: productoId,
          origen_id: almacenOrigenId,
          destino_id: almacenDestinoId,
          cantidad_base: 10,
          motivo: '   ',
        })
        .expect(400);
    });

    it('1.3 [b] Debe bloquear si la cantidad a trasladar supera el stock disponible en origen', async () => {
      // Saldo disponible en origen = 100. Se solicitan 150.
      const res = await request(app.getHttpServer())
        .post('/api/inventario/traslado')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          producto_id: productoId,
          origen_id: almacenOrigenId,
          destino_id: almacenDestinoId,
          cantidad_base: 150,
          motivo: 'Intento de traslado sobregirado',
        })
        .expect(400);

      expect(res.body.message).toContain('Stock disponible insuficiente');
    });

    it('1.4 [d] Debe bloquear la operación para el rol VENDEDOR (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/api/inventario/traslado')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          producto_id: productoId,
          origen_id: almacenOrigenId,
          destino_id: almacenDestinoId,
          cantidad_base: 10,
          motivo: 'Intento de traslado por vendedor no autorizado',
        })
        .expect(403);
    });
  });

  describe('2. Ejecución Atómica del Traslado y Doble Movimiento en Kárdex', () => {
    let trasladoId: string;
    let movSalidaId: string;
    let movEntradaId: string;

    it('2.1 [e] Traslado exitoso entre dos almacenes físicos', async () => {
      // Stock inicial: Origen = 100, Destino = 0.
      // Se trasladan 40 unidades.
      const res = await request(app.getHttpServer())
        .post('/api/inventario/traslado')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          producto_id: productoId,
          origen_id: almacenOrigenId,
          destino_id: almacenDestinoId,
          cantidad_base: 40,
          motivo: 'Reabastecimiento por falta de espacio en almacén principal Pisco',
        })
        .expect(201);

      expect(res.body.traslado_id).toBeDefined();
      expect(res.body.movimiento_salida_id).toBeDefined();
      expect(res.body.movimiento_entrada_id).toBeDefined();
      expect(res.body.delta_global).toBe(0);

      // Origen descuenta 40: 100 - 40 = 60
      expect(res.body.origen.cantidad_fisica).toBe(60);
      expect(res.body.origen.cantidad_disponible).toBe(60);

      // Destino incrementa 40: 0 + 40 = 40
      expect(res.body.destino.cantidad_fisica).toBe(40);
      expect(res.body.destino.cantidad_disponible).toBe(40);

      trasladoId = res.body.traslado_id;
      movSalidaId = res.body.movimiento_salida_id;
      movEntradaId = res.body.movimiento_entrada_id;

      // Verificar en base de datos la persistencia de saldos
      const saldoOrigenDb = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: almacenOrigenId,
          },
        },
      });
      expect(Number(saldoOrigenDb.cantidad_fisica)).toBe(60);

      const saldoDestinoDb = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: almacenDestinoId,
          },
        },
      });
      expect(Number(saldoDestinoDb.cantidad_fisica)).toBe(40);
    });

    it('2.2 Verificación de los dos movimientos en movimiento_kardex enlazados por movimiento_ref_id', async () => {
      const movSalida = await prisma.movimiento_kardex.findUnique({
        where: { id: movSalidaId },
      });
      const movEntrada = await prisma.movimiento_kardex.findUnique({
        where: { id: movEntradaId },
      });

      expect(movSalida).toBeDefined();
      expect(movEntrada).toBeDefined();

      // Movimiento 1 (Origen): TRASLADO_SALIDA negativo (-40)
      expect(movSalida.tipo).toBe('TRASLADO_SALIDA');
      expect(Number(movSalida.cantidad_base)).toBe(-40);
      expect(movSalida.ubicacion_id).toBe(almacenOrigenId);

      // Movimiento 2 (Destino): TRASLADO_ENTRADA positivo (+40)
      expect(movEntrada.tipo).toBe('TRASLADO_ENTRADA');
      expect(Number(movEntrada.cantidad_base)).toBe(40);
      expect(movEntrada.ubicacion_id).toBe(almacenDestinoId);

      // Enlace estricto de trazabilidad
      expect(movEntrada.movimiento_ref_id).toBe(movSalida.id);

      // Coincidencia de metadatos de auditoría
      expect(movSalida.motivo).toBe('Reabastecimiento por falta de espacio en almacén principal Pisco');
      expect(movEntrada.motivo).toBe('Reabastecimiento por falta de espacio en almacén principal Pisco');
      expect(movSalida.usuario_id).toBe(movEntrada.usuario_id);
    });
  });

  describe('3. Invariante Matemática de Delta Cero y Conciliación', () => {
    it('3.1 [f] El stock global consolidado no sufrió cambio alguno (Delta Cero)', async () => {
      // Consultar todos los saldos del producto en todas las ubicaciones
      const saldos = await prisma.stock_saldo.findMany({
        where: { producto_id: productoId },
      });

      const stockGlobalActual = saldos.reduce(
        (acc, s) => acc + Number(s.cantidad_fisica),
        0,
      );

      // Stock antes del traslado = 100 (solo en origen)
      // Stock después del traslado = 60 (origen) + 40 (destino) = 100
      expect(stockGlobalActual).toBe(100);
    });

    it('3.2 Conciliación matemática en tiempo real en ambos almacenes', async () => {
      // Conciliación en Almacén Origen:
      // +100 (ingreso inicial) - 40 (traslado salida) = 60
      const concOrigen = await request(app.getHttpServer())
        .get('/api/kardex/conciliacion')
        .query({
          producto_id: productoId,
          ubicacion_id: almacenOrigenId,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(concOrigen.body.total_kardex).toBe(60);
      expect(concOrigen.body.saldo_fisico).toBe(60);
      expect(concOrigen.body.discrepancia).toBe(0);
      expect(concOrigen.body.conciliado).toBe(true);

      // Conciliación en Almacén Destino:
      // +40 (traslado entrada) = 40
      const concDestino = await request(app.getHttpServer())
        .get('/api/kardex/conciliacion')
        .query({
          producto_id: productoId,
          ubicacion_id: almacenDestinoId,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(concDestino.body.total_kardex).toBe(40);
      expect(concDestino.body.saldo_fisico).toBe(40);
      expect(concDestino.body.discrepancia).toBe(0);
      expect(concDestino.body.conciliado).toBe(true);
    });

    it('3.3 Consulta del historial de traslados (GET /api/inventario/traslados)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/inventario/traslados')
        .query({
          producto_id: productoId,
        })
        .set('Authorization', `Bearer ${operadorToken}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThanOrEqual(1);
      const traslado = res.body.items.find(
        (t: any) => t.producto.id === productoId,
      );

      expect(traslado).toBeDefined();
      expect(traslado.origen.id).toBe(almacenOrigenId);
      expect(traslado.destino.id).toBe(almacenDestinoId);
      expect(traslado.cantidad_base).toBe(40);
      expect(traslado.motivo).toContain('falta de espacio');
      expect(traslado.movimiento_salida_id).toBeDefined();
      expect(traslado.movimiento_entrada_id).toBeDefined();
    });

    it('3.4 Traslado de retorno y verificación de consistencia continua', async () => {
      // Trasladar de regreso 15 unidades de Chincha a Pisco
      const res = await request(app.getHttpServer())
        .post('/api/inventario/traslado')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          producto_id: productoId,
          origen_id: almacenDestinoId,
          destino_id: almacenOrigenId,
          cantidad_base: 15,
          motivo: 'Retorno de excedente a almacén principal',
        })
        .expect(201);

      // Chincha queda en: 40 - 15 = 25
      expect(res.body.origen.cantidad_fisica).toBe(25);
      // Pisco queda en: 60 + 15 = 75
      expect(res.body.destino.cantidad_fisica).toBe(75);

      // Stock global consolidado sigue siendo 100
      const saldos = await prisma.stock_saldo.findMany({
        where: { producto_id: productoId },
      });
      const stockGlobal = saldos.reduce(
        (acc, s) => acc + Number(s.cantidad_fisica),
        0,
      );
      expect(stockGlobal).toBe(100);
    });
  });
});
