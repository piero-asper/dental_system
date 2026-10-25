import { Module } from '@nestjs/common';
import { HistoriasClinicasController } from './historias-clinicas.controller';
import { HistoriasClinicasRepository } from './historias-clinicas.repository';
import { HistoriasClinicasService } from './historias-clinicas.service';
@Module({ controllers: [HistoriasClinicasController], providers: [HistoriasClinicasRepository, HistoriasClinicasService] })
export class HistoriasClinicasModule {}
