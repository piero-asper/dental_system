import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { randomUUID } from 'node:crypto';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { TratamientosModule } from '../src/modulos/tratamientos/tratamientos.module';
import { TratamientosRepository } from '../src/modulos/tratamientos/tratamientos.repository';
import { InventarioModule } from '../src/modulos/inventario/inventario.module';
import { InventarioRepository } from '../src/modulos/inventario/inventario.repository';

describe('Tratamientos e inventario HTTP', () => {
  let app: INestApplication, fetchMock: jest.SpyInstance;
  const tratamientos = { crear: jest.fn(async (data) => data), editar: jest.fn(async (_id, data) => data), listar: jest.fn(async () => [[], 0]),
    guardarPresupuesto: jest.fn(async (data) => data), listarPresupuestos: jest.fn(async () => [[], 0]), estadoPresupuesto: jest.fn(), obtenerPresupuesto: jest.fn() };
  const inventario = { crear: jest.fn(async (data) => data), editar: jest.fn(async (_id, data) => data), listar: jest.fn(async () => [[], 0]), movimiento: jest.fn(async (_id, data) => data), movimientos: jest.fn(async () => [[], 0]) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [TratamientosModule, InventarioModule], providers: [
      { provide: ConfigService, useValue: { get: (key: string) => key === 'SUPABASE_URL' ? 'https://example.supabase.co' : 'server-api-key' } },
      { provide: APP_GUARD, useClass: JwtAuthGuard }
    ] }).overrideProvider(TratamientosRepository).useValue(tratamientos).overrideProvider(InventarioRepository).useValue(inventario).compile();
    app = module.createNestApplication(); app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })); await app.init();
  });
  beforeEach(() => {
    jest.clearAllMocks(); fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ id: randomUUID(), role: 'authenticated' })));
  });
  afterEach(() => fetchMock.mockRestore()); afterAll(async () => app.close());
  const api = () => request(app.getHttpServer());
  const id = randomUUID(), version = new Date().toISOString();
  const valid = { nombre: ' Limpieza ', precioBase: '100.50' };
  const presupuesto = { pacienteId: id, items: [{ tratamientoId: id, precioUnitario: '100', cantidad: 1 }], descuento: '0' };
  it.each(['/tratamientos', '/presupuestos', '/inventario', `/inventario/${id}/movimientos`])('exige autenticación para leer y escribir %s', async (path) => {
    await api().get(`/api${path}`).expect(401); await api().post(`/api${path}`).send({}).expect(401);
    expect(tratamientos.crear).not.toHaveBeenCalled(); expect(inventario.movimiento).not.toHaveBeenCalled();
  });
  it('normaliza el nombre y conserva el importe decimal como texto', async () => {
    await api().post('/api/tratamientos').auth('token', { type: 'bearer' }).send(valid).expect(201);
    expect(tratamientos.crear).toHaveBeenCalledWith(expect.objectContaining({ nombre: 'Limpieza', precioBase: '100.50' }));
  });
  it.each([{ precioBase: 1.25 }, { precioBase: '-1' }, { precioBase: '1.001' }, { precioBase: '1e3' }, { precioBase: null }, { activo: null }, { nombre: ' ' }, { codigo: 'x y' }])('rechaza datos de catálogo inválidos %s', async (data) => {
    await api().post('/api/tratamientos').auth('token', { type: 'bearer' }).send({ ...valid, ...data }).expect(400);
    expect(tratamientos.crear).not.toHaveBeenCalled();
  });
  it('no permite editar sin versión ni enviar campos de stock al crear un insumo', async () => {
    await api().patch(`/api/tratamientos/${id}`).auth('token', { type: 'bearer' }).send({ nombre: 'Nuevo' }).expect(400);
    await api().post('/api/inventario').auth('token', { type: 'bearer' }).send({ codigo: 'I1', nombre: 'Guantes', unidadMedida: 'caja', stockActual: '100' }).expect(400);
  });
  it('no restablece el mínimo cuando se edita solo el nombre de un insumo', async () => {
    await api().patch(`/api/inventario/${id}`).auth('token', { type: 'bearer' }).send({ nombre: 'Otro nombre', version }).expect(200);
    expect(inventario.editar).toHaveBeenCalledWith(id, expect.objectContaining({ nombre: 'Otro nombre', version }));
    expect(inventario.editar.mock.calls[0][1].stockMinimo).toBeUndefined();
  });
  it('crea un borrador con ítems validados y rechaza totales enviados por el cliente', async () => {
    await api().post('/api/presupuestos').auth('token', { type: 'bearer' }).send(presupuesto).expect(201);
    await api().post('/api/presupuestos').auth('token', { type: 'bearer' }).send({ ...presupuesto, total: '0' }).expect(400);
  });
  it.each([[], [{ tratamientoId: id, precioUnitario: '1', cantidad: 0 }], [{ tratamientoId: id, precioUnitario: '1', cantidad: 1.5 }],
    [{ tratamientoId: id, precioUnitario: '1', cantidad: 1, pieza: '99' }]].map((items) => ({ items })))('valida los ítems anidados %s', async ({ items }) => {
    await api().post('/api/presupuestos').auth('token', { type: 'bearer' }).send({ ...presupuesto, items }).expect(400);
    expect(tratamientos.guardarPresupuesto).not.toHaveBeenCalled();
  });
  it('admite ajustes a cero con motivo y exige versión y cantidades válidas', async () => {
    await api().post(`/api/inventario/${id}/movimientos`).auth('token', { type: 'bearer' }).send({ tipo: 'AJUSTE', cantidad: '0', motivo: ' Conteo ', version }).expect(201);
    expect(inventario.movimiento).toHaveBeenCalledWith(id, expect.objectContaining({ motivo: 'Conteo' }));
    await api().post(`/api/inventario/${id}/movimientos`).auth('token', { type: 'bearer' }).send({ tipo: 'SALIDA', cantidad: '-1', motivo: ' ', version }).expect(400);
  });
  it.each(['pagina=0', 'tamanoPagina=101', 'estado=desconocido', 'q=' + 'x'.repeat(101)])('valida filtros comunes %s', async (query) => {
    await api().get(`/api/tratamientos?${query}`).auth('token', { type: 'bearer' }).expect(400);
    await api().get(`/api/inventario?${query}`).auth('token', { type: 'bearer' }).expect(400);
  });
});
