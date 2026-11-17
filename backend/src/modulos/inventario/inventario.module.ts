import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { InventarioController } from './inventario.controller';
import { InventarioService } from './inventario.service';
import { InventarioRepository } from './inventario.repository';
@Module({ imports: [PrismaModule], controllers: [InventarioController], providers: [InventarioService, InventarioRepository] })
export class InventarioModule {}
