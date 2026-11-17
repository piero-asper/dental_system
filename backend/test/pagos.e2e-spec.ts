import { INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { randomUUID } from 'node:crypto';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { PagosModule } from '../src/modulos/pagos/pagos.module';
import { PagosRepository } from '../src/modulos/pagos/pagos.repository';
describe('Pagos HTTP', () => {
  let app: INestApplication, fetchMock: jest.SpyInstance;
  const id = randomUUID(), actor = randomUUID();
  const pago = { id, huellaSolicitud: 'privada', monto: '1', estado: 'REGISTRADO' };
  const repo = { registrar: jest.fn(async () => pago), anular: jest.fn(async () => pago), obtener: jest.fn(async () => pago),
    listar: jest.fn(async () => [[], 0]), cartera: jest.fn(async () => ({ items: [], total: 0, saldoFiltrado: '0.00' })),
    datosReporte: jest.fn(async () => ({ movimientos: [], saldoPendiente: '0.00', presupuestosPendientes: 0 })) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [PagosModule], providers: [
      { provide: ConfigService, useValue: { get: (key: string) => key === 'SUPABASE_URL' ? 'https://example.supabase.co' : 'api-key' } }, { provide: APP_GUARD, useClass: JwtAuthGuard }
    ] }).overrideProvider(PagosRepository).useValue(repo).compile();
    app = module.createNestApplication(); app.setGlobalPrefix('api'); app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })); await app.init();
  });
  beforeEach(() => { jest.clearAllMocks(); fetchMock = jest.spyOn(globalThis, 'fetch').mockImplementation(async () => new Response(JSON.stringify({ id: actor, role: 'authenticated' }))); });
  afterEach(() => fetchMock.mockRestore()); afterAll(async () => app.close());
  const api = () => request(app.getHttpServer());
  const input = { presupuestoId: id, monto: '10.50', metodoPago: 'EFECTIVO', claveSolicitud: randomUUID() };
  it.each(['/pagos', '/pagos/cartera', '/pagos/reporte', '/pagos/reporte/csv'])('protege la lectura %s', async (path) => {
    await api().get(`/api${path}`).expect(401); expect(repo.listar).not.toHaveBeenCalled();
  });
  it('protege las escrituras antes de acceder a los datos', async () => {
    await api().post('/api/pagos').send(input).expect(401); await api().patch(`/api/pagos/${id}/anular`).send({}).expect(401);
    expect(repo.registrar).not.toHaveBeenCalled(); expect(repo.anular).not.toHaveBeenCalled();
  });
  it('registra con actor autenticado y oculta la huella interna', async () => {
    const result = await api().post('/api/pagos').auth('token', { type: 'bearer' }).send(input).expect(201);
    expect(repo.registrar).toHaveBeenCalledWith(expect.objectContaining(input), actor); expect(result.body).not.toHaveProperty('huellaSolicitud');
  });
  it.each([{ monto: 10.50 }, { monto: '-1' }, { monto: '1.001' }, { monto: '1e3' }, { metodoPago: 'DESCONOCIDO' }, { claveSolicitud: 'no-uuid' }, { pacienteId: id }, { estado: 'REGISTRADO' }])('rechaza entradas inválidas %s', async (changes) => {
    await api().post('/api/pagos').auth('token', { type: 'bearer' }).send({ ...input, ...changes }).expect(400); expect(repo.registrar).not.toHaveBeenCalled();
  });
  it('exige motivo y versión para anular', async () => {
    await api().patch(`/api/pagos/${id}/anular`).auth('token', { type: 'bearer' }).send({ motivo: ' ' }).expect(400);
    await api().patch(`/api/pagos/${id}/anular`).auth('token', { type: 'bearer' }).send({ motivo: 'Corrección', version: new Date().toISOString() }).expect(200);
  });
  it('valida periodos y filtros', async () => {
    await api().get('/api/pagos?desde=2026-01-01').auth('token', { type: 'bearer' }).expect(400);
    await api().get('/api/pagos/reporte?desde=2026-01-02&hasta=2026-01-01').auth('token', { type: 'bearer' }).expect(400);
    await api().get('/api/pagos/cartera?estadoSaldo=otro').auth('token', { type: 'bearer' }).expect(400);
  });
  it('sirve resumen, detalle y CSV del mismo corte y devuelve 410 para cortes inválidos', async () => {
    const report = await api().get('/api/pagos/reporte?desde=2026-01-01&hasta=2026-01-02').auth('token', { type: 'bearer' }).expect(200);
    expect(report.body).toMatchObject({ ingresos: '0.00', reversiones: '0.00', neto: '0.00' });
    await api().get(`/api/pagos/reporte/detalle?corte=${report.body.corte}`).auth('token', { type: 'bearer' }).expect(200);
    const csv = await api().get(`/api/pagos/reporte/csv?corte=${report.body.corte}`).auth('token', { type: 'bearer' }).expect(200);
    expect(csv.headers['content-type']).toContain('text/csv');
    await api().get(`/api/pagos/reporte/detalle?corte=${randomUUID()}`).auth('token', { type: 'bearer' }).expect(410);
  });
});
