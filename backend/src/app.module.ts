import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { PrismaModule } from './core/prisma/prisma.module';
import { AuditoriaModule } from './modules/auditoria/auditoria.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogoModule } from './modules/catalogo/catalogo.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { AlmacenesModule } from './modules/almacenes/almacenes.module';
import { KardexModule } from './modules/kardex/kardex.module';
import { InventarioModule } from './modules/inventario/inventario.module';
import { DespachoModule } from './modules/despacho/despacho.module';
import { ReportesModule } from './modules/reportes/reportes.module';
import { DistribucionModule } from './modules/distribucion/distribucion.module';
import { SincronizacionModule } from './modules/sincronizacion/sincronizacion.module';
import { HealthModule } from './modules/health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => [
        {
          name: 'default',
          ttl: config.get<number>('THROTTLE_TTL', 60000),
          limit: config.get<number>('THROTTLE_LIMIT', 100),
        },
      ],
    }),
    PrismaModule,
    AuditoriaModule,
    UsuariosModule,
    AuthModule,
    CatalogoModule,
    ClientesModule,
    AlmacenesModule,
    KardexModule,
    InventarioModule,
    DespachoModule,
    ReportesModule,
    DistribucionModule,
    SincronizacionModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
