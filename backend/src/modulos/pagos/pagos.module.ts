import { Module } from '@nestjs/common';
import { PrismaModule } from '../../common/prisma/prisma.module';
import { PagosController } from './pagos.controller';
import { PagosRepository } from './pagos.repository';
import { PagosService } from './pagos.service';
@Module({ imports: [PrismaModule], controllers: [PagosController], providers: [PagosRepository, PagosService] })
export class PagosModule {}
