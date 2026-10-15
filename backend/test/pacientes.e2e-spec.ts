import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { SwaggerModule } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import request = require('supertest');
import { randomUUID } from 'node:crypto';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { buildSwaggerConfig } from '../src/config/swagger.config';
import { PacientesModule } from '../src/modulos/pacientes/pacientes.module';
import { PacientesRepository } from '../src/modulos/pacientes/pacientes.repository';

describe('Pacientes HTTP', () => {
  let app: INestApplication;
  let fetchMock: jest.SpyInstance;
  const records = new Map<string, Record<string, unknown>>();
  const repository = {
    crear: jest.fn(async (data) => {
      const { tipoDocumento: _tipo, ...fields } = data;
      const item = { id: randomUUID(), activo: true,
        createdAt: new Date(), updatedAt: new Date(), ...fields, telefono: fields.telefono ?? null };
      records.set(item.id, item); return item;
    }),
    buscarPorId: jest.fn(async (id: string) => records.get(id) ?? null),
    editar: jest.fn(async (id: string, data) => {
      if (!records.has(id)) throw new Prisma.PrismaClientKnownRequestError('missing', { code: 'P2025', clientVersion: '6' });
      const item = { ...records.get(id), ...data, updatedAt: new Date() }; records.set(id, item); return item;
    }),
    listar: jest.fn(async () => ({ items: [...records.values()], total: records.size }))
  };
  const valid = { nombres: ' Lucia ', apellidos: ' Torres Rojas ' };

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [PacientesModule], providers: [
      { provide: ConfigService, useValue: { get: (key: string) => key === 'SUPABASE_URL' ? 'https://example.supabase.co' : 'server-api-key' } },
      { provide: APP_GUARD, useClass: JwtAuthGuard }
    ] }).overrideProvider(PacientesRepository).useValue(repository).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    app.useGlobalFilters(new HttpExceptionFilter());
    await app.init();
  });
  beforeEach(() => {
    records.clear(); jest.clearAllMocks();
    fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ id: randomUUID(), role: 'authenticated' })));
  });
  afterEach(() => fetchMock.mockRestore());
  afterAll(async () => app.close());
  const api = () => request(app.getHttpServer());

  it.each(['get', 'post', 'patch'] as const)('protege %s antes de consultar o modificar pacientes', async (method) => {
    const path = method === 'patch' ? `/api/pacientes/${randomUUID()}` : '/api/pacientes';
    await api()[method](path).send(method === 'get' ? undefined : valid).expect(401);
    expect(repository.crear).not.toHaveBeenCalled(); expect(repository.listar).not.toHaveBeenCalled(); expect(repository.editar).not.toHaveBeenCalled();
  });

  it('registra, consulta y edita conservando los datos que no se enviaron', async () => {
    const created = await api().post('/api/pacientes').auth('token', { type: 'bearer' }).send(valid).expect(201);
    expect(created.body).toMatchObject({ nombres: 'Lucia', apellidos: 'Torres Rojas', telefono: null });
    expect(created.body).not.toHaveProperty('numeroDocumento');
    const id = created.body.id;
    const detail = await api().get(`/api/pacientes/${id}`).auth('token', { type: 'bearer' }).expect(200);
    expect(detail.headers['cache-control']).toBe('no-store');
    const updated = await api().patch(`/api/pacientes/${id}`).auth('token', { type: 'bearer' }).send({ telefono: '999111222', activo: false }).expect(200);
    expect(updated.body).toMatchObject({ nombres: 'Lucia', telefono: '999111222', activo: false });
    const result = await api().get('/api/pacientes?q=Lucia&estado=inactivos&pagina=2&tamanoPagina=10').auth('token', { type: 'bearer' }).expect(200);
    expect(repository.listar).toHaveBeenCalledWith(expect.objectContaining({ q: 'Lucia', estado: 'inactivos', pagina: 2, tamanoPagina: 10 }));
    expect(result.body).toMatchObject({ total: 1, pagina: 2, tamanoPagina: 10 });
  });

  it('admite pacientes homonimos con identificadores diferentes', async () => {
    await api().post('/api/pacientes').auth('token', { type: 'bearer' }).send(valid).expect(201);
    await api().post('/api/pacientes').auth('token', { type: 'bearer' }).send(valid).expect(201);
    expect(records.size).toBe(2);
  });

  it.each([
    { nombres: '  ' }, { apellidos: null }, { telefono: 'abc' }, { activo: 'false' }, { activo: null },
    { numeroDocumento: '01234567' }, { tipoDocumento: 'DNI' }, { fechaNacimiento: '1990-01-01' },
    { sexo: 'F' }, { email: 'example@example.com' }, { direccion: 'Direccion' },
    { contactoEmergenciaNombre: 'Contacto' }, { contactoEmergenciaTelefono: '999111222' }, { deletedAt: '2020-01-01' }
  ])('rechaza datos invalidos o campos no permitidos: %s', async (changes) => {
    await api().post('/api/pacientes').auth('token', { type: 'bearer' }).send({ ...valid, ...changes }).expect(400);
    expect(repository.crear).not.toHaveBeenCalled();
  });

  it.each([{ nombres: null }, { apellidos: null }, { activo: null }, {}])('valida tambien los datos del PATCH: %s', async (body) => {
    await api().patch(`/api/pacientes/${randomUUID()}`).auth('token', { type: 'bearer' }).send(body).expect(400);
  });

  it.each(['pagina=0', 'pagina=1.5', 'tamanoPagina=101', 'estado=otro', 'q=' + 'x'.repeat(101)])('valida filtros: %s', async (query) => {
    await api().get(`/api/pacientes?${query}`).auth('token', { type: 'bearer' }).expect(400);
    expect(repository.listar).not.toHaveBeenCalled();
  });

  it('devuelve 404 cuando no existe la ficha y 400 para un UUID invalido', async () => {
    await api().get(`/api/pacientes/${randomUUID()}`).auth('token', { type: 'bearer' }).expect(404);
    await api().get('/api/pacientes/no-uuid').auth('token', { type: 'bearer' }).expect(400);
  });

  it('documenta los cuatro endpoints protegidos y sus DTOs en Swagger', () => {
    const schema = SwaggerModule.createDocument(app, buildSwaggerConfig());
    for (const [path, method] of [['/api/pacientes', 'get'], ['/api/pacientes', 'post'], ['/api/pacientes/{id}', 'get'], ['/api/pacientes/{id}', 'patch']] as const) {
      expect(schema.paths[path][method]?.security).toContainEqual({ bearer: [] });
    }
    expect(schema.components?.schemas?.CrearPacienteDto).toMatchObject({ required: ['nombres', 'apellidos'] });
  });
});
