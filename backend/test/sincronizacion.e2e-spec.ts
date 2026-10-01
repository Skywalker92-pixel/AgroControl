import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';
import { randomUUID } from 'crypto';

describe('Hito 11: Infraestructura de Red Híbrida y Motor de Sincronización Idempotente (e2e)', () => {
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
  let vehiculoId: string;
  let bodegaMovilId: string;
  let cargaEnRutaId: string;

  let dispositivoId: string;
  let codigoDispositivo: string;

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

    // 1. Obtener tokens
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

    // 2. Almacén origen
    const almacen = await prisma.ubicacion.findFirst({
      where: { tipo: 'ALMACEN', activo: true },
    });
    almacenOrigenId = almacen!.id;

    // 3. Crear categoría y producto para sincronización
    const ts = Date.now();
    const cat = await prisma.categoria.create({
      data: {
        codigo: `CAT-SYNC-${ts}`,
        nombre: `Categoría Sync ${ts}`,
      },
    });
    categoriaId = cat.id;

    const prod = await prisma.producto.create({
      data: {
        codigo_interno: `PROD-SYNC-${ts}`,
        nombre: `Bioestimulante Foliar Sync ${ts}`,
        unidad_base: 'botella',
        categoria_id: categoriaId,
        activo: true,
      },
    });
    productoId = prod.id;

    // Inyectar 300 botellas de stock inicial en almacén
    await prisma.movimiento_kardex.create({
      data: {
        id: randomUUID(),
        producto_id: productoId,
        ubicacion_id: almacenOrigenId,
        tipo: 'ENTRADA',
        cantidad_base: 300,
        costo_unitario: 20.0,
        documento_tipo: 'INGRESO_INICIAL',
        motivo: 'Stock para pruebas de sincronización móvil',
        usuario_id: adminUser.id,
        fecha_operacion: new Date(),
      },
    });

    await prisma.$executeRaw`
      INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
      VALUES (${productoId}::uuid, ${almacenOrigenId}::uuid, 300, 0, NOW())
      ON CONFLICT (producto_id, ubicacion_id) DO UPDATE SET cantidad_fisica = stock_saldo.cantidad_fisica + 300;
    `;

    // 4. Crear Vehículo y Carga de Distribución para vendedor1
    const vehRes = await request(app.getHttpServer())
      .post('/api/distribucion/vehiculos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        placa: `MVI-${Math.floor(100 + Math.random() * 900)}`,
        marca: 'Kia',
        modelo: 'K2700',
        tipo_vehiculo: 'Furgón',
        capacidad_kg: 2000,
        conductor_habitual_id: vendedorUser.id,
      });
    vehiculoId = vehRes.body.id;
    bodegaMovilId = vehRes.body.bodega_movil.id;

    // Crear Carga con 50 botellas asignadas a vendedor1
    const cargaRes = await request(app.getHttpServer())
      .post('/api/distribucion/cargas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        almacen_origen_id: almacenOrigenId,
        vehiculo_id: vehiculoId,
        trabajador_id: vendedorUser.id,
        fecha_salida: new Date().toISOString().split('T')[0],
        observaciones: 'Carga para pruebas de sincronización offline',
        detalles: [
          {
            producto_id: productoId,
            cantidad_presentacion: 0,
            cantidad_unidades_sueltas: 50,
          },
        ],
      });
    cargaEnRutaId = cargaRes.body.id;

    // Despachar a EN_RUTA
    await request(app.getHttpServer())
      .patch(`/api/distribucion/cargas/${cargaEnRutaId}/despachar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    codigoDispositivo = `IMEI-SYNC-${ts}`;
  }, 40000);

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // 1. REGISTRO Y AUTORIZACIÓN DE DISPOSITIVOS MÓVILES (RF-72)
  // ============================================================================
  describe('1. Registro y Autorización de Terminales Móviles (RF-72)', () => {
    it('1.1 Debe registrar y autorizar un nuevo dispositivo móvil', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/sync/dispositivos/registrar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          codigo_dispositivo: codigoDispositivo,
          modelo: 'Samsung Galaxy Tab Active 4',
          sistema_operativo: 'Android 14',
          version_app: '1.0.0',
          trabajador_id: vendedorUser.id,
          activo: true,
          autorizado: true,
        })
        .expect(201);

      expect(res.body.dispositivo).toBeDefined();
      expect(res.body.dispositivo.codigo_dispositivo).toBe(codigoDispositivo);
      expect(res.body.dispositivo.autorizado).toBe(true);
      expect(res.body.dispositivo.activo).toBe(true);
      expect(res.body.dispositivo.trabajador_id).toBe(vendedorUser.id);
      dispositivoId = res.body.dispositivo.id;
    });

    it('1.2 Debe ser idempotente al re-registrar el mismo dispositivo actualizando sus datos', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/sync/dispositivos/registrar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          codigo_dispositivo: codigoDispositivo,
          modelo: 'Samsung Galaxy Tab Active 4 Pro',
          version_app: '1.0.1',
        })
        .expect(201);

      expect(res.body.dispositivo.id).toBe(dispositivoId);
      expect(res.body.dispositivo.modelo).toBe('Samsung Galaxy Tab Active 4 Pro');
      expect(res.body.dispositivo.version_app).toBe('1.0.1');
    });

    it('1.3 Debe bloquear el acceso a un dispositivo no autorizado o inactivo', async () => {
      // Desautorizar temporalmente el dispositivo
      await prisma.dispositivo_movil.update({
        where: { id: dispositivoId },
        data: { autorizado: false },
      });

      await request(app.getHttpServer())
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Device-Id', dispositivoId)
        .set('X-App-Version', '1.0.0')
        .expect(403);

      // Reactivar autorización para los siguientes tests
      await prisma.dispositivo_movil.update({
        where: { id: dispositivoId },
        data: { autorizado: true },
      });
    });

    it('1.4 [OBS-SEC-02] Un vendedor solo registra dispositivos en estado pendiente y no puede auto-aprobarse ni cambiar trabajador', async () => {
      const codigoDevVendedor = `DEV-PENDING-${Date.now()}`;
      const res = await request(app.getHttpServer())
        .post('/api/sync/dispositivos/registrar')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          codigo_dispositivo: codigoDevVendedor,
          modelo: 'Xiaomi Redmi Note 12',
          sistema_operativo: 'Android 13',
          version_app: '1.0.0',
          trabajador_id: adminUser.id, // Intento de asignar a otro usuario
          autorizado: true, // Intento de auto-aprobarse
        })
        .expect(201);

      expect(res.body.dispositivo.codigo_dispositivo).toBe(codigoDevVendedor);
      expect(res.body.dispositivo.autorizado).toBe(false); // Siempre false
      expect(res.body.dispositivo.activo).toBe(true);
      expect(res.body.dispositivo.trabajador_id).toBe(vendedorUser.id); // Forzado a jwt.sub

      // Vendedor recibe 403 Forbidden al intentar autorizar terminales
      await request(app.getHttpServer())
        .patch(`/api/sync/dispositivos/${res.body.dispositivo.id}/autorizar`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(403);

      // Solo administradores pueden autorizar terminales móviles
      const resAutorizar = await request(app.getHttpServer())
        .patch(`/api/sync/dispositivos/${res.body.dispositivo.id}/autorizar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(resAutorizar.body.dispositivo.autorizado).toBe(true);
    });

    it('1.5 [OBS-SEC-03] Guard bloquea con 400 Bad Request si falta la cabecera X-Device-Id en rutas móviles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-App-Version', '1.0.0')
        .expect(400);

      expect(res.body.message).toContain('Cabecera X-Device-Id requerida');
    });

    it('1.6 [OBS-SEC-03] Guard bloquea con 403 Forbidden si el dispositivo pertenece a otro trabajador', async () => {
      // Registrar dispositivo para el administrador
      const devAdmin = await prisma.dispositivo_movil.create({
        data: {
          id: randomUUID(),
          codigo_dispositivo: `DEV-ADMIN-${Date.now()}`,
          modelo: 'Admin Phone',
          trabajador_id: adminUser.id,
          activo: true,
          autorizado: true,
        },
      });

      // Vendedor intenta operar con el dispositivo del administrador
      await request(app.getHttpServer())
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Device-Id', devAdmin.id)
        .set('X-App-Version', '1.0.0')
        .expect(403);
    });

    it('1.7 [OBS-SEC-NEW-02] Un vendedor u operador no puede reactivar un dispositivo existente deshabilitado (activo = false)', async () => {
      // 1. Admin crea y autoriza un dispositivo, pero en estado inactivo (activo = false)
      const codDevInactivo = `DEV-INACTIVO-${Date.now()}`;
      const devRes = await request(app.getHttpServer())
        .post('/api/sync/dispositivos/registrar')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          codigo_dispositivo: codDevInactivo,
          modelo: 'Terminal Deshabilitado',
          trabajador_id: vendedorUser.id,
          activo: false,
          autorizado: true,
        })
        .expect(201);

      expect(devRes.body.dispositivo.activo).toBe(false);

      // 2. Vendedor intenta re-registrar el dispositivo existente enviando activo = true
      const vReactivar = await request(app.getHttpServer())
        .post('/api/sync/dispositivos/registrar')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          codigo_dispositivo: codDevInactivo,
          modelo: 'Terminal Reactivado Intento',
          activo: true,
        })
        .expect(201);

      // Debe preservar estrictamente activo = false
      expect(vReactivar.body.dispositivo.activo).toBe(false);

      // 3. Operador de almacén tampoco puede reactivar ni asignar dispositivos ajenos
      await request(app.getHttpServer())
        .post('/api/sync/dispositivos/registrar')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          codigo_dispositivo: codDevInactivo,
          activo: true,
        })
        .expect(403);
    });
  });

  // ============================================================================
  // 2. CONTROL DE VERSIONES MÍNIMAS (426 Upgrade Required)
  // ============================================================================
  describe('2. Control de Versiones de la Aplicación Móvil', () => {
    it('2.1 Debe responder con 426 Upgrade Required si la versión del cliente es obsoleta (< 1.0.0)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-App-Version', '0.9.5')
        .expect(426);

      expect(res.body.statusCode).toBe(426);
      expect(res.body.error).toBe('Upgrade Required');
      expect(res.body.version_minima).toBe('1.0.0');
      expect(res.body.version_cliente).toBe('0.9.5');
    });

    it('2.2 Debe permitir la solicitud si la versión es igual o superior a 1.0.0', async () => {
      await request(app.getHttpServer())
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Device-Id', dispositivoId)
        .set('X-App-Version', '1.0.0')
        .expect(200);
    });
  });

  // ============================================================================
  // 3. SINCRONIZACIÓN DESCENDENTE INCREMENTAL (PULL: PC -> MÓVIL)
  // ============================================================================
  describe('3. Sincronización Descendente Incremental (PULL)', () => {
    it('3.1 Debe entregar catálogo completo y la carga activa EN_RUTA sin filtro de fecha previa', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/sync/pull')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Device-Id', dispositivoId)
        .set('X-App-Version', '1.0.0')
        .expect(200);

      expect(res.body.timestamp_servidor).toBeDefined();
      expect(res.body.es_incremental).toBe(false);
      expect(res.body.totales.productos).toBeGreaterThanOrEqual(1);

      // Verificación de la Carga de Distribución activa
      expect(res.body.datos.carga_activa).toBeDefined();
      expect(res.body.datos.carga_activa.id).toBe(cargaEnRutaId);
      expect(res.body.datos.carga_activa.estado).toBe('EN_RUTA');
      expect(res.body.datos.carga_activa.bodega_movil.id).toBe(bodegaMovilId);
      expect(res.body.datos.carga_activa.items.length).toBeGreaterThanOrEqual(1);

      const itemCarga = res.body.datos.carga_activa.items.find(
        (i: any) => i.producto_id === productoId,
      );
      expect(itemCarga).toBeDefined();
      expect(itemCarga.cantidad_cargada_total_base).toBe(50);
      expect(itemCarga.stock_actual_bodega_movil).toBe(50);
    });

    it('3.2 Debe filtrar por ultima_sincronizacion y devolver solo cambios incrementales', async () => {
      const timestampFiltro = new Date(Date.now() + 1000).toISOString();

      const res = await request(app.getHttpServer())
        .get(`/api/sync/pull?ultima_sincronizacion=${encodeURIComponent(timestampFiltro)}`)
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Device-Id', dispositivoId)
        .set('X-App-Version', '1.0.0')
        .expect(200);

      expect(res.body.es_incremental).toBe(true);
      expect(res.body.datos.productos.length).toBe(0); // Sin cambios futuros
    });
  });

  // ============================================================================
  // 4. SINCRONIZACIÓN ASCENDENTE POR LOTES (PUSH: MÓVIL -> PC) E IDEMPOTENCIA
  // ============================================================================
  describe('4. Sincronización Ascendente por Lotes (PUSH), Idempotencia y Trazabilidad', () => {
    const venta1Id = randomUUID();
    const fechaVenta1 = new Date(Date.now() - 3600 * 1000).toISOString(); // Realizada hace 1 hora en zona sin señal

    it('4.1 Debe procesar una venta válida en ruta: transicionar a APLICADA y descontar bodega móvil', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Device-Id', dispositivoId)
        .set('X-App-Version', '1.0.0')
        .send({
          dispositivo_id: dispositivoId,
          operaciones: [
            {
              id: venta1Id,
              tipo_operacion: 'VENTA',
              carga_distribucion_id: cargaEnRutaId,
              fecha_operacion: fechaVenta1,
              total: 250.0,
              detalles: [
                {
                  producto_id: productoId,
                  cantidad: 10,
                  precio_unitario: 25.0,
                  subtotal: 250.0,
                },
              ],
              observaciones: 'Venta en fundo El Peral',
            },
          ],
        })
        .expect(201);

      expect(res.body.total_recibidas).toBe(1);
      expect(res.body.total_aplicadas).toBe(1);
      expect(res.body.total_observadas).toBe(0);
      expect(res.body.total_reintentos_ignorados).toBe(0);

      const opResultado = res.body.resultados[0];
      expect(opResultado.id).toBe(venta1Id);
      expect(opResultado.estado_sync).toBe('APLICADA');
      expect(opResultado.ya_procesado).toBe(false);

      // Validar que el stock en bodega móvil se haya descontado atómicamente de 50 a 40
      const saldoBodega = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: bodegaMovilId,
          },
        },
      });
      expect(Number(saldoBodega?.cantidad_fisica)).toBe(40);

      // Validar creación del movimiento en Kárdex VENTA_RUTA
      const kardexMov = await prisma.movimiento_kardex.findFirst({
        where: {
          documento_id: venta1Id,
          tipo: 'VENTA_RUTA',
        },
      });
      expect(kardexMov).toBeDefined();
      expect(Number(kardexMov?.cantidad_base)).toBe(-10);
    });

    it('4.2 REGLA DE IDEMPOTENCIA: Re-enviar el mismo lote push no debe duplicar Kárdex ni registros', async () => {
      // Reintento de sincronización con el MISMO lote y UUIDs
      const res = await request(app.getHttpServer())
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Device-Id', dispositivoId)
        .set('X-App-Version', '1.0.0')
        .send({
          dispositivo_id: dispositivoId,
          operaciones: [
            {
              id: venta1Id, // Mismo UUID
              tipo_operacion: 'VENTA',
              carga_distribucion_id: cargaEnRutaId,
              fecha_operacion: fechaVenta1,
              total: 250.0,
              detalles: [
                {
                  producto_id: productoId,
                  cantidad: 10,
                  precio_unitario: 25.0,
                  subtotal: 250.0,
                },
              ],
            },
          ],
        })
        .expect(201);

      expect(res.body.total_recibidas).toBe(1);
      expect(res.body.total_reintentos_ignorados).toBe(1);
      expect(res.body.total_aplicadas).toBe(0);

      const opResultado = res.body.resultados[0];
      expect(opResultado.id).toBe(venta1Id);
      expect(opResultado.ya_procesado).toBe(true);

      // Verificar que el saldo en bodega móvil sigue siendo 40 (NO se descontó dos veces)
      const saldoBodega = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: bodegaMovilId,
          },
        },
      });
      expect(Number(saldoBodega?.cantidad_fisica)).toBe(40);

      // Verificar que solo existe exactamente 1 movimiento Kárdex para este UUID
      const totalMovimientos = await prisma.movimiento_kardex.count({
        where: { documento_id: venta1Id },
      });
      expect(totalMovimientos).toBe(1);
    });

    it('4.3 DOBLE MARCA TEMPORAL: fecha_operacion del móvil vs fecha_registro del servidor', async () => {
      const opEnBD = await prisma.operacion_sincronizada.findUnique({
        where: { id: venta1Id },
      });

      expect(opEnBD).toBeDefined();
      expect(opEnBD?.fecha_operacion.toISOString()).toBe(new Date(fechaVenta1).toISOString());
      expect(opEnBD?.fecha_registro).toBeDefined();
      expect(opEnBD!.fecha_registro.getTime()).toBeGreaterThan(opEnBD!.fecha_operacion.getTime());
    });

    it('4.4 OPERACIÓN OBSERVADA: Venta con faltante físico en bodega móvil se acepta en OBSERVADA sin romper el lote', async () => {
      const ventaExcedidaId = randomUUID();
      const cobroValidoId = randomUUID();

      // Enviar lote mixto: 1 venta con cantidad imposible (100 botellas cuando solo quedan 40) + 1 cobro válido
      const res = await request(app.getHttpServer())
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Device-Id', dispositivoId)
        .set('X-App-Version', '1.0.0')
        .send({
          dispositivo_id: dispositivoId,
          operaciones: [
            {
              id: ventaExcedidaId,
              tipo_operacion: 'VENTA',
              carga_distribucion_id: cargaEnRutaId,
              fecha_operacion: new Date().toISOString(),
              total: 2500.0,
              detalles: [
                {
                  producto_id: productoId,
                  cantidad: 100, // Excede el stock de 40 disponible en bodega móvil
                  precio_unitario: 25.0,
                  subtotal: 2500.0,
                },
              ],
            },
            {
              id: cobroValidoId,
              tipo_operacion: 'COBRO',
              carga_distribucion_id: cargaEnRutaId,
              fecha_operacion: new Date().toISOString(),
              total: 500.0,
              observaciones: 'Cobro en efectivo',
            },
          ],
        })
        .expect(201);

      expect(res.body.total_recibidas).toBe(2);
      expect(res.body.total_aplicadas).toBe(1); // El cobro se aplicó
      expect(res.body.total_observadas).toBe(1); // La venta quedó observada

      const opObservada = res.body.resultados.find((r: any) => r.id === ventaExcedidaId);
      expect(opObservada).toBeDefined();
      expect(opObservada.estado_sync).toBe('OBSERVADA');
      expect(opObservada.motivo_observacion).toContain('Stock insuficiente en bodega móvil');

      // Verificar que el stock de bodega móvil no fue tocado por la venta observada
      const saldoBodega = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: bodegaMovilId,
          },
        },
      });
      expect(Number(saldoBodega?.cantidad_fisica)).toBe(40);
    });

    it('4.5 [OBS-SEC-04] IDOR: Bloquea con 403 Forbidden si un vendedor intenta registrar ventas sobre una carga asignada a otro trabajador', async () => {
      // 1. Crear vehículo y carga asignada al administrador
      const vehOtroRes = await request(app.getHttpServer())
        .post('/api/distribucion/vehiculos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          placa: `ADM-${Math.floor(100 + Math.random() * 900)}`,
          marca: 'Toyota',
          modelo: 'Hilux',
          tipo_vehiculo: 'Camioneta',
          capacidad_kg: 1500,
          conductor_habitual_id: adminUser.id,
        });

      const cargaOtroRes = await request(app.getHttpServer())
        .post('/api/distribucion/cargas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          almacen_origen_id: almacenOrigenId,
          vehiculo_id: vehOtroRes.body.id,
          trabajador_id: adminUser.id, // Asignada a admin, NO al vendedor
          fecha_salida: new Date().toISOString().split('T')[0],
          observaciones: 'Carga de prueba para detección IDOR',
          detalles: [
            {
              producto_id: productoId,
              cantidad_presentacion: 0,
              cantidad_unidades_sueltas: 20,
            },
          ],
        });

      const cargaAdminId = cargaOtroRes.body.id;

      // Despachar a EN_RUTA
      await request(app.getHttpServer())
        .patch(`/api/distribucion/cargas/${cargaAdminId}/despachar`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // 2. Vendedor intenta enviar venta sobre la carga del administrador
      const idorVentaId = randomUUID();
      const resIdor = await request(app.getHttpServer())
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Device-Id', dispositivoId)
        .set('X-App-Version', '1.0.0')
        .send({
          dispositivo_id: dispositivoId,
          operaciones: [
            {
              id: idorVentaId,
              tipo_operacion: 'VENTA',
              carga_distribucion_id: cargaAdminId, // IDOR: Carga de otro trabajador!
              fecha_operacion: new Date().toISOString(),
              total: 50.0,
              detalles: [
                {
                  producto_id: productoId,
                  cantidad: 2,
                  precio_unitario: 25.0,
                  subtotal: 50.0,
                },
              ],
            },
          ],
        })
        .expect(403);

      expect(resIdor.body.message).toContain('No está autorizado para registrar ventas sobre una carga asignada a otro trabajador');

      // 3. Verificar que la operación NO fue registrada en BD
      const opEnBd = await prisma.operacion_sincronizada.findUnique({
        where: { id: idorVentaId },
      });
      expect(opEnBd).toBeNull();
    });

    it('4.6 [OBS-MOB-NEW-02] IDEMPOTENCIA TARDÍA: Reintento devuelve ya_procesado: true aun si la carga asociada ya se encuentra FINALIZADA', async () => {
      // 1. Simular que la carga fue liquidada y pasa a FINALIZADA (ya no está EN_RUTA)
      await prisma.carga_distribucion.update({
        where: { id: cargaEnRutaId },
        data: { estado: 'FINALIZADA' },
      });

      // 2. El móvil (por reintento offline tardío) reenvía la MISMA venta previa (venta1Id de 4.1)
      const resReintento = await request(app.getHttpServer())
        .post('/api/sync/push')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .set('X-Device-Id', dispositivoId)
        .set('X-App-Version', '1.0.0')
        .send({
          dispositivo_id: dispositivoId,
          operaciones: [
            {
              id: venta1Id,
              tipo_operacion: 'VENTA',
              carga_distribucion_id: cargaEnRutaId,
              fecha_operacion: fechaVenta1,
              total: 250.0,
              detalles: [
                {
                  producto_id: productoId,
                  cantidad: 10,
                  precio_unitario: 25.0,
                  subtotal: 250.0,
                },
              ],
            },
          ],
        })
        .expect(201); // No debe responder 403 Forbidden!

      expect(resReintento.body.total_reintentos_ignorados).toBe(1);
      expect(resReintento.body.resultados[0].id).toBe(venta1Id);
      expect(resReintento.body.resultados[0].ya_procesado).toBe(true);
      expect(resReintento.body.resultados[0].estado_sync).toBe('APLICADA');

      // 3. Restaurar estado de la carga a EN_RUTA para consistencia de tests posteriores
      await prisma.carga_distribucion.update({
        where: { id: cargaEnRutaId },
        data: { estado: 'EN_RUTA' },
      });
    });
  });

  // ============================================================================
  // 5. AUDITORÍA DE OPERACIONES OBSERVADAS
  // ============================================================================
  describe('5. Auditoría de Operaciones Observadas (/api/sync/operaciones-observadas)', () => {
    it('5.1 Administrador debe listar transacciones observadas con motivo y latencia', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/sync/operaciones-observadas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(Array.isArray(res.body.items)).toBe(true);

      const itemObs = res.body.items.find((item: any) => item.estado_sync === 'OBSERVADA');
      expect(itemObs).toBeDefined();
      expect(itemObs.motivo_observacion).toBeDefined();
      expect(itemObs.latencia_sincronizacion_segundos).toBeDefined();
      expect(itemObs.vendedor).toBeDefined();
      expect(itemObs.dispositivo).toBeDefined();
    });

    it('5.2 Debe exportar las operaciones observadas a CSV (RFC 4180)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/sync/operaciones-observadas?formato=csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('operaciones_observadas.csv');
      expect(res.text).toContain('ID Operación');
      expect(res.text).toContain('Motivo Observación');
    });

    it('5.3 Debe denegar acceso al rol VENDEDOR (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/sync/operaciones-observadas')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(403);
    });
  });

  // ============================================================================
  // 6. NO REGRESIÓN Y CONCILIACIÓN MATEMÁTICA DEL KÁRDEX
  // ============================================================================
  describe('6. Conciliación Matemática y No Regresión', () => {
    it('6.1 El stock físico en stock_saldo de bodega móvil debe ser idéntico a la suma de Kárdex', async () => {
      const kardexSuma = await prisma.movimiento_kardex.aggregate({
        where: { producto_id: productoId, ubicacion_id: bodegaMovilId },
        _sum: { cantidad_base: true },
      });

      const saldoActual = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: productoId,
            ubicacion_id: bodegaMovilId,
          },
        },
      });

      expect(Number(saldoActual?.cantidad_fisica)).toBe(Number(kardexSuma._sum.cantidad_base));
      expect(Number(saldoActual?.cantidad_fisica)).toBe(40); // 50 cargadas - 10 vendidas
    });

    it('6.2 El reporte de conciliación general debe confirmar consistencia íntegra', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/conciliacion')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.resumen.total_discrepancias).toBe(0);
      expect(res.body.resumen.estado_general).toBe('CONCILIACION_TOTAL_OK');
    });
  });
});
