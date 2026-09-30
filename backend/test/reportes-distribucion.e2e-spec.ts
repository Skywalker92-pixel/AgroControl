import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/core/prisma/prisma.service';

describe('Hito 10: Auditoría, Reportes de Reparto y Cierre de la Fase 2 (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let operadorToken: string;
  let vendedorToken: string;
  let adminUser: any;
  let vendedorUser: any;

  let almacenOrigenId: string;
  let categoriaId: string;
  let producto1Id: string;
  let producto2Id: string;
  let presentacionCajaId: string;
  const factorCaja = 12;

  let vehiculoId: string;
  let vehiculoPlaca: string;
  let liquidacionConformeId: string;
  let liquidacionObservadaId: string;

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

    // 3. Crear categoría y productos
    const ts = Date.now();
    const cat = await prisma.categoria.create({
      data: {
        codigo: `CAT-REP-${ts}`,
        nombre: `Categoría Reportes ${ts}`,
      },
    });
    categoriaId = cat.id;

    const p1 = await prisma.producto.create({
      data: {
        codigo_interno: `PROD-REP1-${ts}`,
        nombre: `Fertilizante Líquido Reparto ${ts}`,
        unidad_base: 'botella',
        categoria_id: categoriaId,
        activo: true,
      },
    });
    producto1Id = p1.id;

    const presCaja = await prisma.presentacion.create({
      data: {
        producto_id: producto1Id,
        nombre: 'Caja x 12 L',
        factor: factorCaja,
        activo: true,
      },
    });
    presentacionCajaId = presCaja.id;

    const p2 = await prisma.producto.create({
      data: {
        codigo_interno: `PROD-REP2-${ts}`,
        nombre: `Insecticida Reparto ${ts}`,
        unidad_base: 'kg',
        categoria_id: categoriaId,
        activo: true,
      },
    });
    producto2Id = p2.id;

    // 4. Dotar de stock inicial
    await prisma.movimiento_kardex.createMany({
      data: [
        {
          id: require('crypto').randomUUID(),
          producto_id: producto1Id,
          ubicacion_id: almacenOrigenId,
          tipo: 'ENTRADA',
          cantidad_base: 500,
          costo_unitario: 15.0,
          documento_tipo: 'INGRESO_INICIAL',
          motivo: 'Stock para reportes de reparto',
          usuario_id: adminUser.id,
          fecha_operacion: new Date(),
        },
        {
          id: require('crypto').randomUUID(),
          producto_id: producto2Id,
          ubicacion_id: almacenOrigenId,
          tipo: 'ENTRADA',
          cantidad_base: 200,
          costo_unitario: 25.0,
          documento_tipo: 'INGRESO_INICIAL',
          motivo: 'Stock para reportes de reparto',
          usuario_id: adminUser.id,
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

    // 5. Crear Vehículo
    const vehRes = await request(app.getHttpServer())
      .post('/api/distribucion/vehiculos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        placa: `REP-${Math.floor(100 + Math.random() * 900)}`,
        marca: 'Toyota',
        modelo: 'Dyna',
        tipo_vehiculo: 'Camión',
        capacidad_kg: 3500,
        conductor_habitual_id: vendedorUser.id,
      });
    vehiculoId = vehRes.body.id;
    vehiculoPlaca = vehRes.body.placa;

    // 6. Carga 1 -> Liquidación CONCILIADA
    const carga1Res = await request(app.getHttpServer())
      .post('/api/distribucion/cargas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        almacen_origen_id: almacenOrigenId,
        vehiculo_id: vehiculoId,
        trabajador_id: vendedorUser.id,
        fecha_salida: new Date().toISOString().split('T')[0],
        observaciones: 'Ruta 1 para reporte conforme',
        detalles: [
          {
            producto_id: producto1Id,
            presentacion_id: presentacionCajaId,
            cantidad_presentacion: 2, // 24 botellas
            cantidad_unidades_sueltas: 0,
          },
        ],
      });
    const carga1Id = carga1Res.body.id;

    // Despachar carga 1
    await request(app.getHttpServer())
      .patch(`/api/distribucion/cargas/${carga1Id}/despachar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Liquidar Carga 1: 24 cargadas = 20 vendidas (20 * S/25 = S/500) + 4 retornadas. Cobrado = S/500
    const liq1Res = await request(app.getHttpServer())
      .post('/api/distribucion/liquidaciones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        carga_distribucion_id: carga1Id,
        total_cobrado: 500,
        observaciones: 'Liquidación cuadrada al 100%',
        items: [
          {
            producto_id: producto1Id,
            cantidad_vendida: 20,
            cantidad_retornada: 4,
            precio_unitario_promedio: 25.0,
          },
        ],
      });
    liquidacionConformeId = liq1Res.body.id;

    // 7. Carga 2 -> Liquidación OBSERVADA con Incidencias
    const carga2Res = await request(app.getHttpServer())
      .post('/api/distribucion/cargas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        almacen_origen_id: almacenOrigenId,
        vehiculo_id: vehiculoId,
        trabajador_id: vendedorUser.id,
        fecha_salida: new Date().toISOString().split('T')[0],
        observaciones: 'Ruta 2 para reporte observada',
        detalles: [
          {
            producto_id: producto2Id,
            cantidad_presentacion: 0,
            cantidad_unidades_sueltas: 30, // 30 kg
          },
        ],
      });
    const carga2Id = carga2Res.body.id;

    // Despachar carga 2
    await request(app.getHttpServer())
      .patch(`/api/distribucion/cargas/${carga2Id}/despachar`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    // Liquidar Carga 2 como OBSERVADA: 30 cargadas = 15 vendidas (15 * S/40 = S/600) + 12 retornadas = 27.
    // Falta 3 kg por derrame/merma. Cobrado = S/500 (descalce de S/100).
    const liq2Res = await request(app.getHttpServer())
      .post('/api/distribucion/liquidaciones')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        carga_distribucion_id: carga2Id,
        total_cobrado: 500,
        observaciones: 'Faltante físico y descalce monetario en ruta',
        items: [
          {
            producto_id: producto2Id,
            cantidad_vendida: 15,
            cantidad_retornada: 12,
            precio_unitario_promedio: 40.0,
            justificacion: 'Derrame de 3 KG en carretera por empaque roto',
          },
        ],
      });
    liquidacionObservadaId = liq2Res.body.id;
  }, 40000);

  afterAll(async () => {
    await app.close();
  });

  // ============================================================================
  // 1. REPORTE DE RESUMEN DE RUTAS Y RENDIMIENTO
  // ============================================================================
  describe('1. Reporte de Rendimiento de Rutas (/api/reportes/distribucion/resumen-rutas)', () => {
    it('1.1 Debe retornar métricas agregadas por conductor y vehículo en JSON', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/distribucion/resumen-rutas')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.resumen).toBeDefined();
      expect(res.body.resumen.total_liquidaciones).toBeGreaterThanOrEqual(2);
      expect(res.body.resumen.total_vendido_soles).toBeGreaterThanOrEqual(1100);
      expect(res.body.resumen.total_cobrado_soles).toBeGreaterThanOrEqual(1000);
      expect(res.body.resumen.efectividad_global_porcentaje).toBeGreaterThan(0);

      expect(Array.isArray(res.body.rendimiento)).toBe(true);
      const row = res.body.rendimiento.find((item: any) => item.vehiculo_placa === vehiculoPlaca);
      expect(row).toBeDefined();
      expect(row.conductor_id).toBe(vendedorUser.id);
      expect(row.cantidad_cargas).toBeGreaterThanOrEqual(2);
      expect(row.total_vendido_soles).toBeGreaterThanOrEqual(1100);
      expect(row.efectividad_venta_pct).toBeGreaterThan(0);

      expect(Array.isArray(res.body.rutas)).toBe(true);
      expect(res.body.rutas.length).toBeGreaterThanOrEqual(2);
    });

    it('1.2 Debe permitir filtrar por conductor_id específico', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reportes/distribucion/resumen-rutas?conductor_id=${vendedorUser.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.rendimiento.length).toBeGreaterThanOrEqual(1);
      res.body.rendimiento.forEach((item: any) => {
        expect(item.conductor_id).toBe(vendedorUser.id);
      });
    });

    it('1.3 Debe permitir filtrar por vehiculo_id específico', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/reportes/distribucion/resumen-rutas?vehiculo_id=${vehiculoId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.rendimiento.length).toBeGreaterThanOrEqual(1);
      res.body.rendimiento.forEach((item: any) => {
        expect(item.vehiculo_id).toBe(vehiculoId);
      });
    });

    it('1.4 Debe exportar en formato CSV con estándar RFC 4180', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/distribucion/resumen-rutas?formato=csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('reporte_resumen_rutas.csv');
      expect(res.text).toContain('Conductor');
      expect(res.text).toContain(vehiculoPlaca);
    });
  });

  // ============================================================================
  // 2. REPORTE DE INCIDENCIAS DE DISTRIBUCIÓN (OBSERVADAS Y DESCALCES)
  // ============================================================================
  describe('2. Reporte de Incidencias de Liquidación (/api/reportes/distribucion/incidencias)', () => {
    it('2.1 Debe listar liquidaciones observadas con faltantes y justificaciones', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/distribucion/incidencias')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.resumen).toBeDefined();
      expect(res.body.resumen.total_incidencias).toBeGreaterThanOrEqual(1);
      expect(res.body.resumen.total_descalce_dinero_soles).toBeGreaterThanOrEqual(100);

      const incidencia = res.body.items.find(
        (item: any) => item.id === liquidacionObservadaId,
      );
      expect(incidencia).toBeDefined();
      expect(incidencia.diferencia_dinero).toBe(-100); // 500 cobrado - 600 vendido
      expect(incidencia.saldo_pendiente).toBe(100);
      expect(incidencia.items_con_incidencia.length).toBeGreaterThanOrEqual(1);

      const detalleFaltante = incidencia.items_con_incidencia[0];
      expect(detalleFaltante.diferencia).toBe(3);
      expect(detalleFaltante.justificacion).toContain('Derrame de 3 KG');
    });

    it('2.2 Debe permitir filtrar por solo_con_diferencias=true', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/distribucion/incidencias?solo_con_diferencias=true')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.items.length).toBeGreaterThanOrEqual(1);
      res.body.items.forEach((item: any) => {
        const tieneDiferenciaFisica = item.items_con_incidencia.some((d: any) => d.diferencia > 0);
        const tieneDiferenciaMonetaria = Math.abs(item.diferencia_dinero) > 0.01;
        expect(tieneDiferenciaFisica || tieneDiferenciaMonetaria).toBe(true);
      });
    });

    it('2.3 Debe exportar incidencias en formato CSV', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/distribucion/incidencias?formato=csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('reporte_incidencias_distribucion.csv');
      expect(res.text).toContain('Liquidación');
      expect(res.text).toContain(vehiculoPlaca);
    });
  });

  // ============================================================================
  // 3. ACTA OFICIAL DE LIQUIDACIÓN PARA IMPRESIÓN FÍSICA A4
  // ============================================================================
  describe('3. DTO Oficial de Acta de Liquidación (/api/distribucion/liquidaciones/:id/acta)', () => {
    it('3.1 Debe generar el acta estructurada con casilleros de firma y balance monetario', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/distribucion/liquidaciones/${liquidacionObservadaId}/acta`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      // Verificación de cabecera y trazabilidad
      expect(res.body.id).toBe(liquidacionObservadaId);
      expect(res.body.codigo).toBeDefined();
      expect(res.body.carga.codigo).toBeDefined();
      expect(res.body.fecha_liquidacion).toBeDefined();
      expect(res.body.estado).toBe('OBSERVADA');

      // Verificación de vehículo y participantes
      expect(res.body.carga.vehiculo.placa).toBe(vehiculoPlaca);
      expect(res.body.carga.conductor.id).toBe(vendedorUser.id);
      expect(res.body.liquidador.nombre_completo).toBeDefined();

      // Verificación de detalle de productos y diferencias
      expect(res.body.items.length).toBe(1);
      const itemActa = res.body.items[0];
      expect(itemActa.cantidad_cargada).toBe(30);
      expect(itemActa.cantidad_vendida).toBe(15);
      expect(itemActa.cantidad_retornada).toBe(12);
      expect(itemActa.diferencia).toBe(3);
      expect(itemActa.justificacion).toContain('Derrame de 3 KG');

      // Verificación de totales físicos y monetarios
      expect(res.body.resumen_unidades.total_cargado).toBe(30);
      expect(res.body.resumen_unidades.total_vendido).toBe(15);
      expect(res.body.resumen_unidades.total_retornado).toBe(12);
      expect(res.body.resumen_unidades.total_diferencia).toBe(3);

      expect(res.body.monetario.total_vendido).toBe(600); // 15 * 40
      expect(res.body.monetario.total_cobrado).toBe(500);
      expect(res.body.monetario.saldo_pendiente).toBe(100);

      // Verificación de casilleros de firma requeridos por SRS
      expect(res.body.firmas.conductor.nombre).toBeDefined();
      expect(res.body.firmas.conductor.titulo).toBe('Conductor Responsable de Carga');
      expect(res.body.firmas.liquidador.nombre).toBeDefined();
      expect(res.body.firmas.liquidador.titulo).toBe('Responsable de Liquidación');
    });

    it('3.2 Debe generar correctamente el acta para una liquidación CONCILIADA sin diferencias', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/distribucion/liquidaciones/${liquidacionConformeId}/acta`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.estado).toBe('CONCILIADA');
      expect(res.body.resumen_unidades.total_diferencia).toBe(0);
      expect(res.body.monetario.saldo_pendiente).toBe(0);
      expect(res.body.items[0].diferencia).toBe(0);
    });

    it('3.3 Debe retornar 404 si la liquidación no existe', async () => {
      await request(app.getHttpServer())
        .get('/api/distribucion/liquidaciones/00000000-0000-0000-0000-000000000000/acta')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  // ============================================================================
  // 4. AUDITORÍA DE EVENTOS DE DISTRIBUCIÓN
  // ============================================================================
  describe('4. Auditoría de Distribución (/api/reportes/distribucion/auditoria)', () => {
    it('4.1 Debe listar eventos de auditoría para vehiculos, cargas y liquidaciones', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/distribucion/auditoria')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body.items)).toBe(true);
      expect(res.body.items.length).toBeGreaterThanOrEqual(1);

      // Verificar que las entidades registradas correspondan al dominio de distribución
      const entidadesValidas = ['vehiculo', 'carga_distribucion', 'liquidacion'];
      res.body.items.forEach((ev: any) => {
        expect(entidadesValidas).toContain(ev.entidad);
        expect(ev.accion).toBeDefined();
        expect(ev.usuario_nombre).toBeDefined();
        expect(ev.fecha).toBeDefined();
      });
    });

    it('4.2 Debe permitir filtrar por entidad específica', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/distribucion/auditoria?entidad=liquidacion')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      res.body.items.forEach((ev: any) => {
        expect(ev.entidad).toBe('liquidacion');
      });
    });

    it('4.3 Debe denegar acceso al rol VENDEDOR (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .get('/api/reportes/distribucion/auditoria')
        .set('Authorization', `Bearer ${vendedorToken}`)
        .expect(403);
    });

    it('4.4 Debe exportar la auditoría a CSV', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/distribucion/auditoria?formato=csv')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.headers['content-disposition']).toContain('reporte_auditoria_distribucion.csv');
      expect(res.text).toContain('Entidad');
      expect(res.text).toContain('Acción');
    });
  });

  // ============================================================================
  // 5. NO REGRESIÓN Y CONCILIACIÓN MATEMÁTICA DEL KÁRDEX
  // ============================================================================
  describe('5. Conciliación Matemática y No Regresión', () => {
    it('5.1 El stock físico en stock_saldo debe ser exactamente igual a la suma del Kárdex', async () => {
      // Validar producto 1
      const kardexSumaP1 = await prisma.movimiento_kardex.aggregate({
        where: { producto_id: producto1Id, ubicacion_id: almacenOrigenId },
        _sum: { cantidad_base: true },
      });
      const saldoP1 = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: producto1Id,
            ubicacion_id: almacenOrigenId,
          },
        },
      });

      // Validar producto 2
      const kardexSumaP2 = await prisma.movimiento_kardex.aggregate({
        where: { producto_id: producto2Id, ubicacion_id: almacenOrigenId },
        _sum: { cantidad_base: true },
      });
      const saldoP2 = await prisma.stock_saldo.findUnique({
        where: {
          producto_id_ubicacion_id: {
            producto_id: producto2Id,
            ubicacion_id: almacenOrigenId,
          },
        },
      });

      expect(Number(saldoP1?.cantidad_fisica)).toBe(Number(kardexSumaP1._sum.cantidad_base));
      expect(Number(saldoP2?.cantidad_fisica)).toBe(Number(kardexSumaP2._sum.cantidad_base));
    });

    it('5.2 El reporte de conciliación general debe confirmar 100% de coherencia', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/reportes/conciliacion')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.resumen).toBeDefined();
      expect(res.body.resumen.total_discrepancias).toBe(0);
      expect(res.body.resumen.estado_general).toBe('CONCILIACION_TOTAL_OK');
    });
  });
});
