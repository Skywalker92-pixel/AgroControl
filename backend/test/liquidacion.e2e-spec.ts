import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';

describe('Hito 9: Retornos de Mercadería y Módulo de Liquidación de Vendedores (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let operadorToken: string;
  let vendedorToken: string;
  let vendedor2Token: string;
  let vendedorId: string;
  let vendedor2Id: string;

  let almacenOrigenId: string;
  let categoriaId: string;
  let producto1Id: string;
  let producto2Id: string;
  let presentacionCajaId: string;
  const factorCaja = 12;

  let vehiculoId: string;
  let vehiculoPlaca: string;
  let bodegaMovilId: string;
  let cargaEnRutaId: string;

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

    const opLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'almacen1', password: 'AgroControl2026*' });
    operadorToken = opLogin.body.access_token;

    const v1Login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'vendedor1', password: 'AgroControl2026*' });
    vendedorToken = v1Login.body.access_token;

    const uVendedor1 = await prisma.usuario.findUnique({ where: { username: 'vendedor1' } });
    vendedorId = uVendedor1 ? uVendedor1.id : '';

    let uVendedor2 = await prisma.usuario.findUnique({ where: { username: 'vendedor2' } });
    if (!uVendedor2) {
      const bcrypt = require('bcryptjs');
      const hash = await bcrypt.hash('AgroControl2026*', 10);
      uVendedor2 = await prisma.usuario.create({
        data: {
          username: 'vendedor2',
          password_hash: hash,
          nombre_completo: 'Vendedor Suplente',
          email: 'vendedor2@agrocontrol.local',
          rol: 'VENDEDOR',
          activo: true,
        },
      });
    }
    vendedor2Id = uVendedor2.id;
    const v2Login = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'vendedor2', password: 'AgroControl2026*' });
    vendedor2Token = v2Login.body.access_token;

    // 2. Localizar almacén físico principal
    const almacen = await prisma.ubicacion.findFirst({
      where: { tipo: 'ALMACEN', activo: true },
    });
    almacenOrigenId = almacen!.id;

    // 3. Crear categoría de prueba
    const ts = Date.now();
    const cat = await prisma.categoria.create({
      data: {
        codigo: `CAT-LQ-${ts}`,
        nombre: `Categoría Liquidación ${ts}`,
      },
    });
    categoriaId = cat.id;

    // 4. Crear 2 productos de prueba con stock inicial
    const p1 = await prisma.producto.create({
      data: {
        codigo_interno: `PROD-LQ1-${ts}`,
        nombre: `Fungicida Líquido Premium ${ts}`,
        categoria_id: categoriaId,
        unidad_base: 'botella',
      },
    });
    producto1Id = p1.id;

    const presCaja = await prisma.presentacion.create({
      data: {
        producto_id: producto1Id,
        nombre: 'Caja x 12 L',
        factor: factorCaja,
      },
    });
    presentacionCajaId = presCaja.id;

    const p2 = await prisma.producto.create({
      data: {
        codigo_interno: `PROD-LQ2-${ts}`,
        nombre: `Fertilizante Foliar 1Kg ${ts}`,
        categoria_id: categoriaId,
        unidad_base: 'kg',
      },
    });
    producto2Id = p2.id;

    // Inyectar 500 litros de P1 y 200 kg de P2 en el almacén de origen
    const adminUser = await prisma.usuario.findUnique({ where: { username: 'alipio.admin' } });
    await prisma.movimiento_kardex.createMany({
      data: [
        {
          id: require('crypto').randomUUID(),
          producto_id: producto1Id,
          ubicacion_id: almacenOrigenId,
          tipo: 'ENTRADA',
          cantidad_base: 500,
          costo_unitario: 25.0,
          documento_tipo: 'INGRESO_INICIAL',
          motivo: 'Stock para pruebas de liquidación',
          usuario_id: adminUser!.id,
          fecha_operacion: new Date(),
        },
        {
          id: require('crypto').randomUUID(),
          producto_id: producto2Id,
          ubicacion_id: almacenOrigenId,
          tipo: 'ENTRADA',
          cantidad_base: 200,
          costo_unitario: 15.0,
          documento_tipo: 'INGRESO_INICIAL',
          motivo: 'Stock para pruebas de liquidación',
          usuario_id: adminUser!.id,
          fecha_operacion: new Date(),
        },
      ],
    });

    await prisma.$executeRaw`
      INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
      VALUES (${producto1Id}::uuid, ${almacenOrigenId}::uuid, 500, 0, NOW())
      ON CONFLICT (producto_id, ubicacion_id) DO UPDATE SET cantidad_fisica = stock_saldo.cantidad_fisica + 500;
    `;
    await prisma.$executeRaw`
      INSERT INTO stock_saldo (producto_id, ubicacion_id, cantidad_fisica, cantidad_reservada, actualizado_en)
      VALUES (${producto2Id}::uuid, ${almacenOrigenId}::uuid, 200, 0, NOW())
      ON CONFLICT (producto_id, ubicacion_id) DO UPDATE SET cantidad_fisica = stock_saldo.cantidad_fisica + 200;
    `;

    // 5. Crear vehículo para pruebas
    const placaAleatoria = `LIQ-${Math.floor(100 + Math.random() * 900)}`;
    const vehRes = await request(app.getHttpServer())
      .post('/api/distribucion/vehiculos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        placa: placaAleatoria,
        marca: 'Hyundai',
        modelo: 'H100',
        tipo_vehiculo: 'Furgón',
        capacidad_kg: 2500,
        conductor_habitual_id: vendedorId,
      });
    vehiculoId = vehRes.body.id;
    vehiculoPlaca = vehRes.body.placa;
    bodegaMovilId = vehRes.body.bodega_movil.id;

    // 6. Crear carga de distribución y despacharla
    // P1: 2 cajas de 12 L + 6 sueltas = 30 L
    // P2: 20 unidades directas = 20 KG
    const cargaRes = await request(app.getHttpServer())
      .post('/api/distribucion/cargas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        almacen_origen_id: almacenOrigenId,
        vehiculo_id: vehiculoId,
        trabajador_id: vendedorId,
        fecha_salida: new Date().toISOString().split('T')[0],
        observaciones: 'Carga para prueba de liquidación',
        detalles: [
          {
            producto_id: producto1Id,
            presentacion_id: presentacionCajaId,
            cantidad_presentacion: 2,
            cantidad_unidades_sueltas: 6,
          },
          {
            producto_id: producto2Id,
            cantidad_presentacion: 0,
            cantidad_unidades_sueltas: 20,
          },
        ],
      });
    cargaEnRutaId = cargaRes.body.id;

    // Despachar la carga atómicamente a ruta
    await request(app.getHttpServer())
      .patch(`/api/distribucion/cargas/${cargaEnRutaId}/despachar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // ESCENARIO 1: CONTROL DE ACCESO (RBAC) Y VALIDACIONES PREVIAS
  // ============================================================================
  describe('1. Reglas de Validación y Permisos RBAC', () => {
    it('1.1 Debe rechazar la liquidación si es intentada por el rol VENDEDOR (403 Forbidden)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/distribucion/liquidaciones')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .send({
          carga_distribucion_id: cargaEnRutaId,
          total_cobrado: 1500,
          items: [
            {
              producto_id: producto1Id,
              cantidad_vendida: 30,
              cantidad_retornada: 0,
            },
            {
              producto_id: producto2Id,
              cantidad_vendida: 20,
              cantidad_retornada: 0,
            },
          ],
        });

      expect(res.status).toBe(403);
    });

    it('1.2 Debe rechazar la liquidación si la carga NO está en estado EN_RUTA (400 Bad Request)', async () => {
      // Crear una carga en estado PENDIENTE (no despachada)
      const otraPlaca = `PEN-${Math.floor(100 + Math.random() * 900)}`;
      const vehPendiente = await request(app.getHttpServer())
        .post('/api/distribucion/vehiculos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ placa: otraPlaca });

      const cargaPendienteRes = await request(app.getHttpServer())
        .post('/api/distribucion/cargas')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          almacen_origen_id: almacenOrigenId,
          vehiculo_id: vehPendiente.body.id,
          trabajador_id: vendedorId,
          detalles: [
            {
              producto_id: producto1Id,
              cantidad_presentacion: 1,
              cantidad_unidades_sueltas: 0,
            },
          ],
        });

      const res = await request(app.getHttpServer())
        .post('/api/distribucion/liquidaciones')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          carga_distribucion_id: cargaPendienteRes.body.id,
          total_cobrado: 200,
          items: [
            {
              producto_id: producto1Id,
              cantidad_vendida: 12,
              cantidad_retornada: 0,
            },
          ],
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain('Solo es posible liquidar cargas que se encuentren en estado EN_RUTA');
    });

    it('1.3 Debe exigir justificación administrativa obligatoria (min 5 chars) si hay diferencia física (400 Bad Request)', async () => {
      // Carga tiene 30 L de P1 y 20 KG de P2.
      // Reportamos: Vendido 20 L + Retornado 5 L = 25 L (Faltante = 5 L).
      // Sin justificación:
      const resSinJustif = await request(app.getHttpServer())
        .post('/api/distribucion/liquidaciones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          carga_distribucion_id: cargaEnRutaId,
          total_cobrado: 800,
          items: [
            {
              producto_id: producto1Id,
              cantidad_vendida: 20,
              cantidad_retornada: 5,
              // Faltante de 5 sin justificación
            },
            {
              producto_id: producto2Id,
              cantidad_vendida: 20,
              cantidad_retornada: 0,
            },
          ],
        });

      expect(resSinJustif.status).toBe(400);
      expect(resSinJustif.body.message).toContain('Se exige una justificación administrativa de al menos 5 caracteres');

      // Con justificación demasiado corta (< 5 caracteres):
      const resCorta = await request(app.getHttpServer())
        .post('/api/distribucion/liquidaciones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          carga_distribucion_id: cargaEnRutaId,
          total_cobrado: 800,
          items: [
            {
              producto_id: producto1Id,
              cantidad_vendida: 20,
              cantidad_retornada: 5,
              justificacion: 'malo', // 4 caracteres
            },
            {
              producto_id: producto2Id,
              cantidad_vendida: 20,
              cantidad_retornada: 0,
            },
          ],
        });

      expect(resCorta.status).toBe(400);
      expect(resCorta.body.message).toContain('Se exige una justificación administrativa de al menos 5 caracteres');
    });
  });

  // ============================================================================
  // ESCENARIO 2: LIQUIDACIÓN ATÓMICA EXITOSA CUADRADA A CERO (CONCILIADA)
  // ============================================================================
  describe('2. Liquidación Atómica Cuadrada a Cero (Estado: CONCILIADA)', () => {
    let saldoOrigenP1AntesLiq: number;
    let saldoOrigenP2AntesLiq: number;
    let liquidacionId: string;

    it('2.1 Debe capturar el stock antes de la liquidación para verificar los reintegros', async () => {
      const saldosOrigen = await prisma.stock_saldo.findMany({
        where: {
          ubicacion_id: almacenOrigenId,
          producto_id: { in: [producto1Id, producto2Id] },
        },
      });
      const sP1 = saldosOrigen.find((s) => s.producto_id === producto1Id);
      const sP2 = saldosOrigen.find((s) => s.producto_id === producto2Id);
      saldoOrigenP1AntesLiq = Number(sP1?.cantidad_fisica || 0);
      saldoOrigenP2AntesLiq = Number(sP2?.cantidad_fisica || 0);

      // En bodega móvil antes de liquidar: debe haber exactamente 30 L de P1 y 20 KG de P2
      const saldosMovil = await prisma.stock_saldo.findMany({
        where: {
          ubicacion_id: bodegaMovilId,
          producto_id: { in: [producto1Id, producto2Id] },
        },
      });
      const bmP1 = saldosMovil.find((s) => s.producto_id === producto1Id);
      const bmP2 = saldosMovil.find((s) => s.producto_id === producto2Id);
      expect(Number(bmP1?.cantidad_fisica)).toBe(30);
      expect(Number(bmP2?.cantidad_fisica)).toBe(20);
    });

    it('2.2 Debe ejecutar la liquidación atómica con retorno y ventas exactas', async () => {
      // P1: Cargado 30 L. Vendido: 22 L @ S/ 35.00 = S/ 770.00. Retornado: 8 L. Diferencia: 0.
      // P2: Cargado 20 KG. Vendido: 15 KG @ S/ 20.00 = S/ 300.00. Retornado: 5 KG. Diferencia: 0.
      // Total Vendido = 770 + 300 = S/ 1,070.00.
      // Total Cobrado entregado = S/ 1,070.00.
      // Cuadre perfecto: estado CONCILIADA.
      const res = await request(app.getHttpServer())
        .post('/api/distribucion/liquidaciones')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          carga_distribucion_id: cargaEnRutaId,
          total_cobrado: 1070.0,
          observaciones: 'Liquidación de ruta matutina cuadrada a satisfacción',
          items: [
            {
              producto_id: producto1Id,
              presentacion_id: presentacionCajaId,
              cantidad_vendida: 22,
              cantidad_retornada: 8,
              precio_unitario_promedio: 35.0,
            },
            {
              producto_id: producto2Id,
              cantidad_vendida: 15,
              cantidad_retornada: 5,
              precio_unitario_promedio: 20.0,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.codigo).toMatch(/^LIQ-\d{8}-\d{3}$/);
      expect(res.body.estado).toBe('CONCILIADA');
      expect(Number(res.body.total_vendido)).toBe(1070.0);
      expect(Number(res.body.total_cobrado)).toBe(1070.0);
      expect(Number(res.body.diferencia_dinero)).toBe(0);

      liquidacionId = res.body.id;
    });

    it('2.3 La carga de distribución debe pasar automáticamente a FINALIZADA con fecha_cierre', async () => {
      const cargaActualizada = await prisma.carga_distribucion.findUnique({
        where: { id: cargaEnRutaId },
      });
      expect(cargaActualizada?.estado).toBe('FINALIZADA');
      expect(cargaActualizada?.fecha_cierre).not.toBeNull();
    });

    it('2.4 El stock físico en la BODEGA_MOVIL para ambos productos debe quedar en CERO', async () => {
      const saldosBodega = await prisma.stock_saldo.findMany({
        where: {
          ubicacion_id: bodegaMovilId,
          producto_id: { in: [producto1Id, producto2Id] },
        },
      });

      const bmP1 = saldosBodega.find((s) => s.producto_id === producto1Id);
      const bmP2 = saldosBodega.find((s) => s.producto_id === producto2Id);

      expect(Number(bmP1?.cantidad_fisica)).toBe(0);
      expect(Number(bmP2?.cantidad_fisica)).toBe(0);
    });

    it('2.5 El stock en el almacén de origen debe haberse incrementado por el retorno (8 L y 5 KG)', async () => {
      const saldosOrigen = await prisma.stock_saldo.findMany({
        where: {
          ubicacion_id: almacenOrigenId,
          producto_id: { in: [producto1Id, producto2Id] },
        },
      });

      const sP1 = saldosOrigen.find((s) => s.producto_id === producto1Id);
      const sP2 = saldosOrigen.find((s) => s.producto_id === producto2Id);

      expect(Number(sP1?.cantidad_fisica)).toBe(saldoOrigenP1AntesLiq + 8);
      expect(Number(sP2?.cantidad_fisica)).toBe(saldoOrigenP2AntesLiq + 5);
    });

    it('2.6 Deben haberse registrado movimientos de Kárdex VENTA_RUTA y RETORNO_DISTRIBUCION enlazados', async () => {
      const movimientosLiq = await prisma.movimiento_kardex.findMany({
        where: {
          documento_tipo: 'LIQUIDACION',
          documento_id: liquidacionId,
        },
      });

      // Debe haber:
      // - 2 movimientos VENTA_RUTA (salida de bodega móvil por 22 L y 15 KG)
      // - 4 movimientos RETORNO_DISTRIBUCION (2 salidas de bodega móvil y 2 entradas a almacén origen enlazadas)
      expect(movimientosLiq.length).toBe(6);

      const ventas = movimientosLiq.filter((m) => m.tipo === 'VENTA_RUTA');
      expect(ventas.length).toBe(2);
      expect(ventas.every((v) => v.ubicacion_id === bodegaMovilId && Number(v.cantidad_base) < 0)).toBe(true);

      const retornos = movimientosLiq.filter((m) => m.tipo === 'RETORNO_DISTRIBUCION');
      expect(retornos.length).toBe(4);

      // Verificar que los retornos están vinculados por pares
      const retornosSalida = retornos.filter((r) => r.ubicacion_id === bodegaMovilId);
      const retornosEntrada = retornos.filter((r) => r.ubicacion_id === almacenOrigenId);

      expect(retornosSalida.length).toBe(2);
      expect(retornosEntrada.length).toBe(2);

      for (const salida of retornosSalida) {
        const parEntrada = retornosEntrada.find((e) => e.movimiento_ref_id === salida.id);
        expect(parEntrada).toBeDefined();
        expect(Math.abs(Number(salida.cantidad_base))).toBe(Number(parEntrada?.cantidad_base));
      }
    });

    it('2.7 Conciliación matemática Kárdex vs stock_saldo debe ser Cero Discrepancias (CONCILIADO_OK)', async () => {
      // Conciliar producto1 en bodega móvil
      const concP1Bodega = await request(app.getHttpServer())
        .get(`/api/kardex/conciliacion?producto_id=${producto1Id}&ubicacion_id=${bodegaMovilId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(concP1Bodega.status).toBe(200);
      expect(concP1Bodega.body.conciliado).toBe(true);
      expect(Number(concP1Bodega.body.discrepancia)).toBe(0);

      // Conciliar producto1 en almacén origen
      const concP1Almacen = await request(app.getHttpServer())
        .get(`/api/kardex/conciliacion?producto_id=${producto1Id}&ubicacion_id=${almacenOrigenId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(concP1Almacen.status).toBe(200);
      expect(concP1Almacen.body.conciliado).toBe(true);
      expect(Number(concP1Almacen.body.discrepancia)).toBe(0);
    });
  });

  // ============================================================================
  // ESCENARIO 3: LIQUIDACIÓN CON DIFERENCIAS FÍSICAS Y FALTANTE DE DINERO (OBSERVADA)
  // ============================================================================
  describe('3. Liquidación con Diferencias Físicas y Dinero Descuadrado (Estado: OBSERVADA)', () => {
    let segundaCargaId: string;
    let segundaBodegaMovilId: string;

    beforeAll(async () => {
      // Crear segundo vehículo y segunda carga
      const placaObs = `OBS-${Math.floor(100 + Math.random() * 900)}`;
      const vehObs = await request(app.getHttpServer())
        .post('/api/distribucion/vehiculos')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ placa: placaObs, conductor_habitual_id: vendedor2Id });

      segundaBodegaMovilId = vehObs.body.bodega_movil.id;

      // Carga: 15 unidades de Producto 2
      const cRes = await request(app.getHttpServer())
        .post('/api/distribucion/cargas')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          almacen_origen_id: almacenOrigenId,
          vehiculo_id: vehObs.body.id,
          trabajador_id: vendedor2Id,
          detalles: [
            {
              producto_id: producto2Id,
              cantidad_unidades_sueltas: 15,
            },
          ],
        });
      segundaCargaId = cRes.body.id;

      // Despachar a ruta
      await request(app.getHttpServer())
        .patch(`/api/distribucion/cargas/${segundaCargaId}/despachar`)
        .set('Authorization', `Bearer ${operadorToken}`)
        .expect(200);
    });

    it('3.1 Debe procesar liquidación con faltante justificado y marcarla como OBSERVADA', async () => {
      // Carga: 15 KG.
      // Reportado: Vendido = 10 KG @ S/ 20.00 = S/ 200.00. Retornado = 3 KG. Faltante = 2 KG.
      // Justificación: "Rotura de empaque por mal estado del camino rural" (válida, > 5 chars).
      // Dinero: Cobrado = S/ 150.00 (Falta S/ 50.00 por crédito no autorizado o faltante de caja).
      const res = await request(app.getHttpServer())
        .post('/api/distribucion/liquidaciones')
        .set('Authorization', `Bearer ${operadorToken}`)
        .send({
          carga_distribucion_id: segundaCargaId,
          total_cobrado: 150.0,
          observaciones: 'Liquidación con merma justificada y saldo pendiente de cobranza',
          items: [
            {
              producto_id: producto2Id,
              cantidad_vendida: 10,
              cantidad_retornada: 3,
              diferencia: 2,
              justificacion: 'Rotura de empaque por mal estado del camino rural',
              precio_unitario_promedio: 20.0,
            },
          ],
        });

      expect(res.status).toBe(201);
      expect(res.body.estado).toBe('OBSERVADA');
      expect(Number(res.body.total_vendido)).toBe(200.0);
      expect(Number(res.body.total_cobrado)).toBe(150.0);
      expect(Number(res.body.diferencia_dinero)).toBe(-50.0);

      // Verificar que se registró movimiento de AJUSTE compensatorio en Kárdex
      const movAjuste = await prisma.movimiento_kardex.findFirst({
        where: {
          documento_id: res.body.id,
          tipo: 'AJUSTE',
        },
      });
      expect(movAjuste).toBeDefined();
      expect(Number(movAjuste?.cantidad_base)).toBe(-2);
      expect(movAjuste?.motivo).toContain('Rotura de empaque por mal estado del camino rural');

      // Bodega móvil debe quedar en cero
      const saldoBM = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: producto2Id,
            ubicacion_id: segundaBodegaMovilId,
          },
        },
      });
      expect(Number(saldoBM?.cantidad_fisica)).toBe(0);
    });
  });

  // ============================================================================
  // ESCENARIO 4: CONSULTAS Y PROTECCIÓN DE DATOS POR ROL
  // ============================================================================
  describe('4. Consultas y Filtros de Liquidaciones', () => {
    it('4.1 Admin y Operador pueden listar todas las liquidaciones', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/distribucion/liquidaciones')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
      expect(res.body.items.length).toBeGreaterThanOrEqual(2);
    });

    it('4.2 Vendedor solo puede ver las liquidaciones de sus propias cargas', async () => {
      // Vendedor 1 consulta: no debe ver la liquidación del Vendedor 2
      const res = await request(app.getHttpServer())
        .get('/api/distribucion/liquidaciones')
        .set('Authorization', `Bearer ${vendedorToken}`);

      expect(res.status).toBe(200);
      for (const item of res.body.items) {
        expect(item.carga_distribucion.trabajador_id).toBe(vendedorId);
      }
    });

    it('4.3 Permite consultar liquidación por ID de carga de distribución', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/distribucion/liquidaciones/carga/${cargaEnRutaId}`)
        .set('Authorization', `Bearer ${operadorToken}`);

      expect(res.status).toBe(200);
      expect(res.body.carga_distribucion_id).toBe(cargaEnRutaId);
      expect(res.body.estado).toBe('CONCILIADA');
      expect(res.body.liquidacion_detalle.length).toBe(2);
    });
  });
});
