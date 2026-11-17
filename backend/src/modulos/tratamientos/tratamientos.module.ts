import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { TratamientosController, PresupuestosController } from './tratamientos.controller';
import { TratamientosService } from './tratamientos.service';
import { TratamientosRepository } from './tratamientos.repository';
@Module({ imports: [PrismaModule], controllers: [TratamientosController, PresupuestosController], providers: [TratamientosService, TratamientosRepository] })
export class TratamientosModule {}
