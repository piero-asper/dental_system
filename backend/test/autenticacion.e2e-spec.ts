import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { SwaggerModule } from '@nestjs/swagger';
import { buildSwaggerConfig } from '../src/config/swagger.config';
import request = require('supertest');
import { AppController } from '../src/app.controller';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { AutenticacionController } from '../src/modulos/autenticacion/autenticacion.controller';

describe('Autenticacion HTTP', () => {
  let app: INestApplication;
  let fetchMock: jest.SpyInstance;
  const config: Record<string, string> = {
    SUPABASE_URL: 'https://example.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'test-server-api-key'
  };
  const user = { id: 'd858141e-5786-48b7-8329-14ccebe10772', email: 'clinica@example.com', role: 'authenticated' };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AppController, AutenticacionController],
      providers: [
        { provide: ConfigService, useValue: { get: (key: string) => config[key] } },
        { provide: APP_GUARD, useClass: JwtAuthGuard }
      ]
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    await app.init();
  });
  beforeEach(() => { fetchMock = jest.spyOn(globalThis, 'fetch'); });
  afterEach(() => { fetchMock.mockRestore(); });
  afterAll(async () => { await app.close(); });

  it('mantiene health publico sin consultar Supabase', async () => {
    await request(app.getHttpServer()).get('/api/health').expect(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('documenta el requisito bearer de sesion en Swagger', () => {
    const document = SwaggerModule.createDocument(app, buildSwaggerConfig());
    expect(document.paths['/api/autenticacion/sesion'].get?.security).toContainEqual({ bearer: [] });
    expect(document.paths['/api/autenticacion/sesion'].get?.responses).toHaveProperty('401');
  });

  it.each([undefined, 'Basic token', 'Bearer', 'Bearer a b', 'Bearer token extra'])('rechaza cabecera %s', async (header) => {
    const call = request(app.getHttpServer()).get('/api/autenticacion/sesion');
    if (header) call.set('Authorization', header);
    await call.expect(401);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('verifica el token con Supabase y devuelve solo datos de sesion', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ ...user, user_metadata: { private: true } })));
    const result = await request(app.getHttpServer()).get('/api/autenticacion/sesion')
      .set('Authorization', 'Bearer user-access-token').expect(200);
    expect(result.body).toEqual({ authUserId: user.id, email: user.email });
    expect(result.headers['cache-control']).toBe('no-store');
    expect(fetchMock).toHaveBeenCalledWith('https://example.supabase.co/auth/v1/user', expect.objectContaining({
      headers: { apikey: 'test-server-api-key', Authorization: 'Bearer user-access-token' }
    }));
  });

  it.each([401, 403])('rechaza tokens expirados o invalidos (%s)', async (status) => {
    fetchMock.mockResolvedValue(new Response('{}', { status }));
    await request(app.getHttpServer()).get('/api/autenticacion/sesion').auth('invalid', { type: 'bearer' }).expect(401);
  });

  it.each([{ ...user, is_anonymous: true }, { ...user, role: 'service_role' }, { email: user.email }, null])(
    'rechaza una identidad no apta para el sistema: %s', async (identity) => {
      fetchMock.mockResolvedValue(new Response(JSON.stringify(identity)));
      await request(app.getHttpServer()).get('/api/autenticacion/sesion').auth('token', { type: 'bearer' }).expect(401);
    }
  );

  it.each([429, 500])('distingue indisponibilidad de credenciales invalidas (%s)', async (status) => {
    fetchMock.mockResolvedValue(new Response('{}', { status }));
    await request(app.getHttpServer()).get('/api/autenticacion/sesion').auth('token', { type: 'bearer' }).expect(503);
  });

  it('rechaza acceso cuando falla la red', async () => {
    fetchMock.mockRejectedValue(new Error('Network unavailable'));
    await request(app.getHttpServer()).get('/api/autenticacion/sesion').auth('token', { type: 'bearer' }).expect(503);
  });
});
