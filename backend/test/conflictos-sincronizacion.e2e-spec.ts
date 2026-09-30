import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { randomUUID } from 'crypto';

describe('Hito 13: Sincronización, Gestión de Conflictos y Auditoría Administrativa (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let adminToken: string;
  let operadorToken: string;
  let vendedorToken: string;

  let adminUser: any;
  let vendedorUser: any;

  let almacenOrigenId: string;
  let categoriaId: string;
  let productoId: string;
  let cargaEnRutaId: string;
  let bodegaMovilId: string;

  let dispositivoId: string;
  let codigoDispositivo: string;

  let operacionObservadaVentaId: string;
  let operacionObservadaParaRechazoId: string;

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

    // 1. Obtener tokens para cada rol
    const adminLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'alipio.admin', password: 'AgroControl2026*' });
    adminToken = adminLogin.body.access_token;
    adminUser = await prisma.usuario.findUnique({ where: { username: 'alipio.admin' } });

    const opLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'almacen1', password: 'AgroControl2026*' });
    operadorToken = opLogin.body.access_token;

    const v1Login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'vendedor1', password: 'AgroControl2026*' });
    vendedorToken = v1Login.body.access_token;
    vendedorUser = await prisma.usuario.findUnique({ where: { username: 'vendedor1' } });

    // 2. Almacén principal
    const almacen = await prisma.ubicacion.findFirst({
      where: { tipo: 'ALMACEN', activo: true },
    });
    almacenOrigenId = almacen!.id;

    // 3. Crear categoría y producto para las pruebas
    const ts = Date.now();
    const cat = await prisma.categoria.create({
      data: {
        codigo: `CAT-CONF-${ts}`,
        nombre: `Categoría Conflictos ${ts}`,
      },
    });
    categoriaId = cat.id;

    const prod = await prisma.producto.create({
      data: {
        codigo_interno: `PROD-CONF-${ts}`,
        nombre: `Fungicida Sistémico Conflictos ${ts}`,
        unidad_base: 'litro',
        categoria_id: categoriaId,
        activo: true,
      },
    });
    productoId = prod.id;

    // Inyectar 500 litros de stock inicial en almacén central
    await prisma.movimiento_kardex.create({
      data: {
        id: randomUUID(),
        producto_id: productoId,
        ubicacion_id: almacenOrigenId,
        tipo: 'ENTRADA',
        cantidad_base: 500,
        costo_unitario: 35.0,
        documento_tipo: 'INGRESO_INICIAL',
        motivo: 'Stock para pruebas de gestión de conflictos y operaciones observadas',
        usuario_id: adminUser.id,
        fecha_operacion: new Date(),
      },
    });

    await prisma.$executeRaw`
      INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
      VALUES (${productoId}::uuid, ${almacenOrigenId}::uuid, 500, 0, NOW())
      ON CONFLICT (producto_id, ubicacion_id) DO UPDATE SET cantidad_fisica = stock_saldo.cantidad_fisica + 500;
    `;

    // 4. Crear Vehículo y Carga de Distribución para vendedor1
    const vehRes = await request(app.getHttpServer())
      .post('/api/distribucion/vehiculos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        placa: `CF-${Math.floor(100 + Math.random() * 900)}-X`,
        marca: 'Toyota',
        modelo: 'Hilux',
        tipo_vehiculo: 'Camioneta',
        capacidad_kg: 1000,
        conductor_habitual_id: vendedorUser.id,
      });
    const vehiculoId = vehRes.body.id;

    // Crear carga con 10 unidades del producto
    const cargaRes = await request(app.getHttpServer())
      .post('/api/distribucion/cargas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        almacen_origen_id: almacenOrigenId,
        vehiculo_id: vehiculoId,
        trabajador_id: vendedorUser.id,
        fecha_salida: new Date().toISOString().split('T')[0],
        observaciones: 'Carga de prueba para operaciones observadas Hito 13',
        detalles: [
          {
            producto_id: productoId,
            cantidad_presentacion: 0,
            cantidad_unidades_sueltas: 10,
          },
        ],
      });
    cargaEnRutaId = cargaRes.body.id;

    // Despachar la carga a estado EN_RUTA
    const despachoRes = await request(app.getHttpServer())
      .patch(`/api/distribucion/cargas/${cargaEnRutaId}/despachar`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(despachoRes.status).toBe(200);

    const cargaDb = await prisma.carga_distribucion.findUnique({
      where: { id: cargaEnRutaId },
    });
    bodegaMovilId = cargaDb!.bodega_movil_id;

    // 5. Registrar Terminal Móvil del vendedor
    codigoDispositivo = `TERM-CONF-${Math.floor(1000 + Math.random() * 9000)}`;
    const termRes = await request(app.getHttpServer())
      .post('/api/sync/dispositivos/registrar')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send({
        codigo_dispositivo: codigoDispositivo,
        modelo: 'Samsung Galaxy XCover',
        sistema_operativo: 'Android 14',
        version_app: '1.0.0',
        trabajador_id: vendedorUser.id,
      });
    dispositivoId = termRes.body.dispositivo.id;
  });

  afterAll(async () => {
    await app.close();
  });

  // =========================================================================
  // CASO A: Venta sincronizada con stock desfasado -> Persiste como OBSERVADA
  // =========================================================================
  it('A) debe recibir y registrar como OBSERVADA una venta en ruta cuyo stock en bodega móvil es insuficiente', async () => {
    operacionObservadaVentaId = randomUUID();
    const fechaOp = new Date(Date.now() - 3600000).toISOString(); // Operación hace 1 hora (latencia)

    // La bodega móvil tiene 10 unidades, pero el vendedor registra venta de 25 unidades
    const pushPayload = {
      codigo_dispositivo: codigoDispositivo,
      dispositivo_id: dispositivoId,
      operaciones: [
        {
          id: operacionObservadaVentaId,
          tipo_operacion: 'VENTA',
          carga_distribucion_id: cargaEnRutaId,
          fecha_operacion: fechaOp,
          total: 875.0,
          detalles: [
            {
              producto_id: productoId,
              cantidad: 25, // DEFICIT = 25 - 10 = 15 unidades
              precio_unitario: 35.0,
              subtotal: 875.0,
            },
          ],
          observaciones: 'Venta con entrega de emergencia en campo',
          metadatos: {
            metodo_pago: 'EFECTIVO',
            monto_cobrado: 875.0,
          },
        },
      ],
    };

    const res = await request(app.getHttpServer())
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .set('X-Device-Id', dispositivoId)
      .set('X-App-Version', '1.0.0')
      .send(pushPayload);

    expect(res.status).toBe(201);
    expect(res.body.total_recibidas).toBe(1);
    expect(res.body.total_observadas).toBe(1);
    expect(res.body.total_aplicadas).toBe(0);

    const resultado = res.body.resultados[0];
    expect(resultado.id).toBe(operacionObservadaVentaId);
    expect(resultado.estado_sync).toBe('OBSERVADA');
    expect(resultado.motivo_observacion).toContain('Stock insuficiente en bodega móvil');

    // Verificar en BD que existe con estado OBSERVADA
    const opBd = await prisma.operacion_sincronizada.findUnique({
      where: { id: operacionObservadaVentaId },
    });
    expect(opBd).not.toBeNull();
    expect(opBd!.estado_sync).toBe('OBSERVADA');
  });

  // =========================================================================
  // CASO B: Control de Acceso y Roles (403 Forbidden para Vendedor y Operador)
  // =========================================================================
  it('B) debe bloquear la resolución de operaciones observadas a roles no administrativos (403)', async () => {
    const resolverPayload = {
      accion: 'APROBAR',
      nota_resolucion: 'Intento de resolución no autorizado',
    };

    // 1. Intento por Vendedor -> 403 Forbidden
    const resVendedor = await request(app.getHttpServer())
      .patch(`/api/sync/operaciones-observadas/${operacionObservadaVentaId}/resolver`)
      .set('Authorization', `Bearer ${vendedorToken}`)
      .send(resolverPayload);
    expect(resVendedor.status).toBe(403);

    // 2. Intento por Operador de Almacén -> 403 Forbidden
    const resOperador = await request(app.getHttpServer())
      .patch(`/api/sync/operaciones-observadas/${operacionObservadaVentaId}/resolver`)
      .set('Authorization', `Bearer ${operadorToken}`)
      .send(resolverPayload);
    expect(resOperador.status).toBe(403);
  });

  // =========================================================================
  // CASO C: Resolución Administrativa RECHAZAR sin alterar inventario
  // =========================================================================
  it('C) debe permitir al administrador RECHAZAR una operación observada sin alterar stock ni Kárdex', async () => {
    // 1. Crear una segunda venta observada para rechazo
    operacionObservadaParaRechazoId = randomUUID();
    const pushPayload = {
      codigo_dispositivo: codigoDispositivo,
      dispositivo_id: dispositivoId,
      operaciones: [
        {
          id: operacionObservadaParaRechazoId,
          tipo_operacion: 'VENTA',
          carga_distribucion_id: cargaEnRutaId,
          fecha_operacion: new Date().toISOString(),
          total: 3500.0,
          detalles: [
            {
              producto_id: productoId,
              cantidad: 100, // Stock desmedido
              precio_unitario: 35.0,
              subtotal: 3500.0,
            },
          ],
          observaciones: 'Venta duplicada erróneamente por el chofer',
        },
      ],
    };

    await request(app.getHttpServer())
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .set('X-Device-Id', dispositivoId)
      .set('X-App-Version', '1.0.0')
      .send(pushPayload);

    // Obtener saldos previos en bodega móvil y almacén
    const saldoBodegaAntes = await prisma.stock_saldo.findUnique({
      where: {
        producto_id_ubicacion_id: {
          producto_id: productoId,
          ubicacion_id: bodegaMovilId,
        },
      },
    });
    const cantidadBodegaAntes = Number(saldoBodegaAntes!.cantidad_fisica);

    // 2. Administrador resuelve con RECHAZAR
    const resRechazo = await request(app.getHttpServer())
      .patch(`/api/sync/operaciones-observadas/${operacionObservadaParaRechazoId}/resolver`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        accion: 'RECHAZAR',
        nota_resolucion: 'Desestimado formalmente por duplicidad no subsanable cometida en ruta.',
      });

    expect(resRechazo.status).toBe(200);
    expect(resRechazo.body.operacion.estado_sync).toBe('RESUELTA_RECHAZADA');
    expect(resRechazo.body.operacion.nota_resolucion).toContain('Desestimado formalmente');
    expect(resRechazo.body.operacion.usuario_resolutor_id).toBe(adminUser.id);
    expect(resRechazo.body.operacion.fecha_resolucion).not.toBeNull();

    // 3. Verificar que el inventario no fue alterado
    const saldoBodegaDespues = await prisma.stock_saldo.findUnique({
      where: {
        producto_id_ubicacion_id: {
          producto_id: productoId,
          ubicacion_id: bodegaMovilId,
        },
      },
    });
    expect(Number(saldoBodegaDespues!.cantidad_fisica)).toBe(cantidadBodegaAntes);

    // 4. Verificar que intentar re-resolver una operación ya rechazada retorna 400 Bad Request
    const reIntento = await request(app.getHttpServer())
      .patch(`/api/sync/operaciones-observadas/${operacionObservadaParaRechazoId}/resolver`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        accion: 'APROBAR',
        nota_resolucion: 'Intento de aprobar algo ya rechazado',
      });
    expect(reIntento.status).toBe(400);
    expect(reIntento.body.message).toContain('ya ha sido procesada previamente');
  });

  // =========================================================================
  // CASO D: Resolución Administrativa APROBAR con Ajuste Compensatorio
  // =========================================================================
  it('D) debe permitir al administrador APROBAR una operación observada regularizando Kárdex y conciliación', async () => {
    // La operacionObservadaVentaId pedía 25 unidades y la bodega móvil solo tenía 10 (déficit = 15).
    // El almacén central tiene stock suficiente para compensar.
    const saldoCentralAntes = await prisma.stock_saldo.findUnique({
      where: {
        producto_id_ubicacion_id: {
          producto_id: productoId,
          ubicacion_id: almacenOrigenId,
        },
      },
    });
    const cantidadCentralAntes = Number(saldoCentralAntes!.cantidad_fisica);

    const resAprobar = await request(app.getHttpServer())
      .patch(`/api/sync/operaciones-observadas/${operacionObservadaVentaId}/resolver`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        accion: 'APROBAR',
        nota_resolucion: 'Venta convalidada tras confirmación con cliente. Se compensa déficit desde almacén central.',
        almacen_regularizacion_id: almacenOrigenId,
      });

    expect(resAprobar.status).toBe(200);
    expect(resAprobar.body.operacion.estado_sync).toBe('RESUELTA_APROBADA');
    expect(resAprobar.body.operacion.usuario_resolutor_id).toBe(adminUser.id);
    expect(resAprobar.body.operacion.movimiento_ajuste_id).not.toBeNull();

    // 1. Verificar Kárdex: debe existir movimiento AJUSTE de salida en central y de ingreso en bodega móvil
    const movSalida = await prisma.movimiento_kardex.findFirst({
      where: {
        documento_id: operacionObservadaVentaId,
        ubicacion_id: almacenOrigenId,
        tipo: 'AJUSTE',
      },
    });
    expect(movSalida).not.toBeNull();
    expect(Number(movSalida!.cantidad_base)).toBe(-15); // Compensó los 15 de déficit

    const movVentaRuta = await prisma.movimiento_kardex.findFirst({
      where: {
        documento_id: operacionObservadaVentaId,
        ubicacion_id: bodegaMovilId,
        tipo: 'VENTA_RUTA',
      },
    });
    expect(movVentaRuta).not.toBeNull();
    expect(Number(movVentaRuta!.cantidad_base)).toBe(-25); // Descontó los 25 totales vendidos

    // 2. Verificar que el saldo del almacén central disminuyó exactamente en 15
    const saldoCentralDespues = await prisma.stock_saldo.findUnique({
      where: {
        producto_id_ubicacion_id: {
          producto_id: productoId,
          ubicacion_id: almacenOrigenId,
        },
      },
    });
    expect(Number(saldoCentralDespues!.cantidad_fisica)).toBe(cantidadCentralAntes - 15);

    // 3. Verificar que la bodega móvil no quedó en negativo (10 inicial + 15 ajuste - 25 venta = 0)
    const saldoBodegaDespues = await prisma.stock_saldo.findUnique({
      where: {
        producto_id_ubicacion_id: {
          producto_id: productoId,
          ubicacion_id: bodegaMovilId,
        },
      },
    });
    expect(Number(saldoBodegaDespues!.cantidad_fisica)).toBe(0);

    // 4. Verificación matemática de Conciliación de Kárdex: Saldo físico == SUM(Kardex)
    const sumaKardexBodega = await prisma.movimiento_kardex.aggregate({
      _sum: { cantidad_base: true },
      where: { producto_id: productoId, ubicacion_id: bodegaMovilId },
    });
    expect(Number(sumaKardexBodega._sum.cantidad_base)).toBe(0);
    expect(Number(saldoBodegaDespues!.cantidad_fisica)).toBe(Number(sumaKardexBodega._sum.cantidad_base));
  });

  // =========================================================================
  // CASO E: Idempotencia y Reintentos por Falla de Red
  // =========================================================================
  it('E) debe garantizar cero duplicidad si el móvil reintenta el push de una transacción ya procesada', async () => {
    // Reenviar el mismo lote con operacionObservadaVentaId
    const pushPayload = {
      codigo_dispositivo: codigoDispositivo,
      dispositivo_id: dispositivoId,
      operaciones: [
        {
          id: operacionObservadaVentaId,
          tipo_operacion: 'VENTA',
          carga_distribucion_id: cargaEnRutaId,
          fecha_operacion: new Date().toISOString(),
          total: 875.0,
          detalles: [{ producto_id: productoId, cantidad: 25, precio_unitario: 35.0, subtotal: 875.0 }],
        },
      ],
    };

    const resReintento = await request(app.getHttpServer())
      .post('/api/sync/push')
      .set('Authorization', `Bearer ${vendedorToken}`)
      .set('X-Device-Id', dispositivoId)
      .set('X-App-Version', '1.0.0')
      .send(pushPayload);

    expect(resReintento.status).toBe(201);
    expect(resReintento.body.total_reintentos_ignorados).toBe(1);
    expect(resReintento.body.resultados[0].ya_procesado).toBe(true);

    // No debe existir más de 1 registro con ese ID en la base de datos
    const totalEnBd = await prisma.operacion_sincronizada.count({
      where: { id: operacionObservadaVentaId },
    });
    expect(totalEnBd).toBe(1);
  });

  // =========================================================================
  // CASO F: Consultas, Filtros por Estado, Detalle y Exportación CSV
  // =========================================================================
  it('F) debe consultar operaciones filtradas por estado, ver detalle individual y exportar a CSV', async () => {
    // 1. Filtrar por estado RESUELTA_APROBADA
    const resAprobadas = await request(app.getHttpServer())
      .get('/api/sync/operaciones-observadas?estado_sync=RESUELTA_APROBADA')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resAprobadas.status).toBe(200);
    const encontradaAprobada = resAprobadas.body.items.find(
      (item: any) => item.id === operacionObservadaVentaId,
    );
    expect(encontradaAprobada).toBeDefined();
    expect(encontradaAprobada.resolutor).toBeDefined();
    expect(encontradaAprobada.latencia_minutos).toBeGreaterThanOrEqual(0);

    // 2. Filtrar por estado RESUELTA_RECHAZADA
    const resRechazadas = await request(app.getHttpServer())
      .get('/api/sync/operaciones-observadas?estado_sync=RESUELTA_RECHAZADA')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resRechazadas.status).toBe(200);
    const encontradaRechazada = resRechazadas.body.items.find(
      (item: any) => item.id === operacionObservadaParaRechazoId,
    );
    expect(encontradaRechazada).toBeDefined();

    // 3. Consultar detalle por ID
    const resDetalle = await request(app.getHttpServer())
      .get(`/api/sync/operaciones-observadas/${operacionObservadaVentaId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resDetalle.status).toBe(200);
    expect(resDetalle.body.id).toBe(operacionObservadaVentaId);
    expect(resDetalle.body.estado_sync).toBe('RESUELTA_APROBADA');
    expect(resDetalle.body.datos).toBeDefined();

    // 4. Exportar a CSV
    const resCsv = await request(app.getHttpServer())
      .get('/api/sync/operaciones-observadas?estado_sync=TODAS&formato=csv')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resCsv.status).toBe(200);
    expect(resCsv.header['content-type']).toContain('text/csv');
    expect(resCsv.text).toContain('ID Operación');
    expect(resCsv.text).toContain('Resolutor');
    expect(resCsv.text).toContain(operacionObservadaVentaId);
  });
});
