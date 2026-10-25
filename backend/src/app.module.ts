import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PrismaModule } from './common/prisma/prisma.module';
import { validateEnv } from './config/env.validation';
import { AutenticacionController } from './modulos/autenticacion/autenticacion.controller';
import { PacientesModule } from './modulos/pacientes/pacientes.module';
import { CitasModule } from './modulos/citas/citas.module';
import { HistoriasClinicasModule } from './modulos/historias-clinicas/historias-clinicas.module';
import { AgendaModule } from './modulos/agenda/agenda.module';
import { BiModule } from './modulos/bi/bi.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv
    }),
    PrismaModule,
    PacientesModule,
    CitasModule,
    HistoriasClinicasModule
    ,AgendaModule,BiModule
  ],
  controllers: [AppController, AutenticacionController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter
    },
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard
    }
  ]
})
export class AppModule {}

