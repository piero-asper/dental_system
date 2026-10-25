import { Module } from '@nestjs/common';
import { CitasController } from './citas.controller';
import { CitasRepository } from './citas.repository';
import { CitasService } from './citas.service';
@Module({ controllers: [CitasController], providers: [CitasRepository, CitasService] })
export class CitasModule {}
