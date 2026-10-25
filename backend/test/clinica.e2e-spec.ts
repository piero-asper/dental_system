import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'node:crypto';
import request = require('supertest');
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { buildSwaggerConfig } from '../src/config/swagger.config';
import { CitasModule } from '../src/modulos/citas/citas.module';
import { CitasRepository } from '../src/modulos/citas/citas.repository';
import { HistoriasClinicasModule } from '../src/modulos/historias-clinicas/historias-clinicas.module';
import { HistoriasClinicasRepository } from '../src/modulos/historias-clinicas/historias-clinicas.repository';

describe('Flujos HTTP de citas e historias clinicas', () => {
  let app: INestApplication, fetchMock: jest.SpyInstance;
  const pacienteId = randomUUID(), actor = randomUUID(), records = new Map<string, any>();
  const histories = new Map<string, any>(), evolutions = new Map<string, any>(), teeth = new Map<string, any>();
  const stamp = (data: object) => ({ ...data, id: randomUUID(), createdAt: new Date(), updatedAt: new Date() });
  const patient = { id: pacienteId, nombres: 'Prueba', apellidos: 'Clinica', activo: true, telefono: null };
  const citas = {
    admite:async()=>true,solicitud:async()=>null,
    transaccion: async (fn: Function) => fn({}), paciente: async () => patient,
    obtener: async (id: string) => records.get(id) ?? null, buscar: async (_tx: unknown, id: string) => records.get(id) ?? null,
    listar: async () => [...records.values()],
    cruce: async (_tx: unknown, inicio: Date, fin: Date, excluir?: string) => [...records.values()].find((c) => c.id !== excluir && ['PROGRAMADA','CONFIRMADA','ATENDIDA'].includes(c.estado) && c.fechaInicio < fin && c.fechaFin > inicio),
    crear: async (_tx: unknown, data: object) => { const item = stamp({ ...data, estado: 'PROGRAMADA', paciente: patient }); records.set(item.id, item); return item; },
    editar: async (_tx: unknown, id: string, data: object) => { const item = { ...records.get(id), ...data, updatedAt: new Date(Date.now() + 1) }; records.set(id, item); return item; }
  };
  const clinical = {
    registrosPieza:async()=>[],cita:async()=>({pacienteId}),
    evoluciones:async()=>({items:[...evolutions.values()],total:evolutions.size,pagina:1,totalPaginas:1}),odontograma:async()=>[...teeth.values()],
    transaccion: jest.fn(async (_patient: string, _actor: string, fn: Function) => fn({})),
    obtener: async (id: string) => histories.get(id) ? { ...histories.get(id), paciente: patient, evoluciones: [...evolutions.values()], odontograma: [...teeth.values()] } : null,
    buscar: async (_tx: unknown, id: string) => histories.get(id) ?? null,
    crear: async (_tx: unknown, data: any) => { const item = stamp(data); histories.set(data.pacienteId, item); return item; },
    editar: async (_tx: unknown, id: string, data: any) => { const previous = [...histories.values()].find((h) => h.id === id); const item = { ...previous, ...data, updatedAt: new Date(Date.now() + 1) }; histories.set(previous.pacienteId, item); return item; },
    crearEvolucion: async (_tx: unknown, data: any) => { const item = stamp({ ...data, fecha: data.fecha ?? new Date() }); evolutions.set(item.id, item); return item; },
    evolucion: async (_tx: unknown, historiaId: string, id: string) => evolutions.get(id)?.historiaClinicaId === historiaId ? evolutions.get(id) : null,
    editarEvolucion: async (_tx: unknown, id: string, data: any) => { const item = { ...evolutions.get(id), ...data, updatedAt: new Date(Date.now() + 1) }; evolutions.set(id, item); return item; },
    crearPieza: async (_tx: unknown, data: any) => { const item = stamp(data); teeth.set(item.id, item); return item; },
    pieza: async (_tx: unknown, historiaId: string, id: string) => teeth.get(id)?.historiaClinicaId === historiaId ? teeth.get(id) : null,
    editarPieza: async (_tx: unknown, id: string, data: any) => { const item = { ...teeth.get(id), ...data, updatedAt: new Date(Date.now() + 1) }; teeth.set(id, item); return item; },
    auditoria: async () => ({ items: [], total: 0, pagina: 1, totalPaginas: 0 })
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [CitasModule, HistoriasClinicasModule], providers: [
      { provide: ConfigService, useValue: { get: (key: string) => key === 'SUPABASE_URL' ? 'https://example.supabase.co' : 'server-key' } }, { provide: APP_GUARD, useClass: JwtAuthGuard }
    ] }).overrideProvider(CitasRepository).useValue(citas).overrideProvider(HistoriasClinicasRepository).useValue(clinical).compile();
    app = module.createNestApplication(); app.setGlobalPrefix('api'); app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })); app.useGlobalFilters(new HttpExceptionFilter()); await app.init();
  });
  beforeEach(() => { records.clear(); histories.clear(); evolutions.clear(); teeth.clear(); jest.clearAllMocks(); fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ id: actor, role: 'authenticated' }))); });
  afterEach(() => fetchMock.mockRestore()); afterAll(async () => app.close());
  const api = () => request(app.getHttpServer());
  const base = `/api/historias-clinicas/${pacienteId}`;
  const schedule = { pacienteId, fechaInicio: '2020-01-01T14:00:00Z', fechaFin: '2020-01-01T15:00:00Z' };

  it.each([
    ['get','/api/citas'], ['post','/api/citas'], ['get',`/api/citas/${randomUUID()}`], ['patch',`/api/citas/${randomUUID()}/horario`], ['patch',`/api/citas/${randomUUID()}/estado`],
    ['get',base], ['post',base], ['patch',base], ['post',`${base}/evoluciones`], ['patch',`${base}/evoluciones/${randomUUID()}`], ['post',`${base}/odontograma`], ['patch',`${base}/odontograma/${randomUUID()}`], ['get',`${base}/auditoria`]
  ] as const)('exige sesion en %s %s', async (method, path) => { await api()[method](path).send({}).expect(401); expect(clinical.transaccion).not.toHaveBeenCalled(); });
  it('reserva, impide cruces, reprograma, confirma y cancela liberando el horario', async () => {
    const created = await api().post('/api/citas').auth('token', { type: 'bearer' }).send(schedule).expect(201);
    await api().post('/api/citas').auth('token', { type: 'bearer' }).send(schedule).expect(409);
    const moved = await api().patch(`/api/citas/${created.body.id}/horario`).auth('token', { type: 'bearer' }).send({ fechaInicio: '2020-01-01T15:00:00Z', fechaFin: '2020-01-01T16:00:00Z', version: created.body.updatedAt }).expect(200);
    await api().post('/api/citas').auth('token', { type: 'bearer' }).send(schedule).expect(201);
    const confirmed = await api().patch(`/api/citas/${created.body.id}/estado`).auth('token', { type: 'bearer' }).send({ estado: 'CONFIRMADA', version: moved.body.updatedAt }).expect(200);
    await api().patch(`/api/citas/${created.body.id}/estado`).auth('token', { type: 'bearer' }).send({ estado: 'CANCELADA', version: confirmed.body.updatedAt }).expect(400);
    const cancelled = await api().patch(`/api/citas/${created.body.id}/estado`).auth('token', { type: 'bearer' }).send({ estado: 'CANCELADA', version: confirmed.body.updatedAt, motivoCancelacion: ' Solicitud del paciente ' }).expect(200);
    expect(cancelled.body.motivoCancelacion).toBe('Solicitud del paciente');
    await api().patch(`/api/citas/${created.body.id}/horario`).auth('token', { type: 'bearer' }).send({ fechaInicio: schedule.fechaInicio, fechaFin: schedule.fechaFin, version: cancelled.body.updatedAt }).expect(400);
    const agenda = await api().get('/api/citas?desde=2020-01-01T00:00:00Z&hasta=2020-01-02T00:00:00Z').auth('token', { type: 'bearer' }).expect(200); expect(agenda.headers['cache-control']).toBe('no-store');
  });
  it.each([{ pacienteId: 'invalid' }, { fechaInicio: '2020-01-01T09:00' }, { fechaFin: null }, { notas: 42 }, { estado: 'ATENDIDA' }])('valida la reserva: %s', async (change) => { await api().post('/api/citas').auth('token', { type: 'bearer' }).send({ ...schedule, ...change }).expect(400); });
  it('rechaza version nula y filtros sin zona o demasiado amplios', async () => { await api().patch(`/api/citas/${randomUUID()}/estado`).auth('token', { type: 'bearer' }).send({ version: null, estado: 'CONFIRMADA' }).expect(400); await api().get('/api/citas?desde=2020-01-01&hasta=2020-01-02').auth('token', { type: 'bearer' }).expect(400); await api().get('/api/citas?desde=2020-01-01T00:00:00Z&hasta=2020-01-09T00:00:00Z').auth('token', { type: 'bearer' }).expect(400); });
  it('crea historia unica, registra/corrige evolucion y odontograma y propaga el actor autenticado', async () => {
    const created = await api().post(base).auth('token', { type: 'bearer' }).send({ antecedentesMedicos: ' Sin antecedentes ', alergias: 'Penicilina' }).expect(201);
    await api().post(base).auth('token', { type: 'bearer' }).send({}).expect(409);
    await api().patch(base).auth('token', { type: 'bearer' }).send({ version: created.body.updatedAt, medicamentos: 'Ninguno' }).expect(200);
    await api().patch(base).auth('token', { type: 'bearer' }).send({ version: '2019-01-01T00:00:00Z', alergias: null }).expect(409);
    const evolution = await api().post(`${base}/evoluciones`).auth('token', { type: 'bearer' }).send({ diagnostico: 'Caries', procedimiento: 'Evaluacion' }).expect(201);
    await api().patch(`${base}/evoluciones/${evolution.body.id}`).auth('token', { type: 'bearer' }).send({ version: evolution.body.updatedAt, diagnostico: 'Caries 11', procedimiento: 'Restauracion',motivoCorreccion:'Completar procedimiento' }).expect(200);
    const tooth = await api().post(`${base}/odontograma`).auth('token', { type: 'bearer' }).send({ pieza: '11', estado: 'CARIES' }).expect(201);
    expect(tooth.body.superficie).toBe('GENERAL');
    await api().patch(`${base}/odontograma/${tooth.body.id}`).auth('token', { type: 'bearer' }).send({ version: tooth.body.updatedAt, estado: 'RESTAURADO', observaciones: 'Control' }).expect(200);
    const detail = await api().get(base).auth('token', { type: 'bearer' }).expect(200);
    expect(detail.headers['cache-control']).toBe('no-store'); expect(detail.body.evoluciones[0].procedimiento).toBe('Restauracion'); expect(detail.body.odontograma[0].estado).toBe('RESTAURADO');
    expect(clinical.transaccion).toHaveBeenCalledWith(pacienteId, actor, expect.any(Function));
  });
  it.each([{ pieza: '19', estado: 'CARIES' }, { pieza: '00', estado: 'SANO' }, { pieza: '56', estado: 'SANO' }, { pieza: '11', estado: 'DESCONOCIDO' }, { pieza: '11', estado: 'SANO', superficie: null }, { pieza: '11', estado: 'SANO', superficie: 'OTRA' }, { pieza: '11', estado: 'SANO', authUserId: randomUUID() }])('valida FDI, superficie y campos permitidos: %s', async (body) => { await api().post(`${base}/odontograma`).auth('token', { type: 'bearer' }).send(body).expect(400); });
  it('rechaza evolucion vacia, versiones ausentes y UUID invalido', async () => { await api().post(`${base}/evoluciones`).auth('token', { type: 'bearer' }).send({ diagnostico: ' ', procedimiento: 'Control' }).expect(400); await api().patch(base).auth('token', { type: 'bearer' }).send({ alergias: null }).expect(400); await api().get('/api/historias-clinicas/no-uuid').auth('token', { type: 'bearer' }).expect(400); });
  it('documenta todos los endpoints protegidos y DTOs en Swagger', () => { const schema = SwaggerModule.createDocument(app, buildSwaggerConfig()); const endpoints = Object.entries(schema.paths).filter(([path]) => /citas|historias-clinicas/.test(path)); let count = 0; for (const [, operations] of endpoints) for (const operation of Object.values(operations)) if (typeof operation === 'object' && operation && 'security' in operation) { expect(operation.security).toContainEqual({ bearer: [] }); count++; } expect(count).toBe(17); expect(schema.components?.schemas?.CrearPiezaDto).toBeDefined(); });
});
