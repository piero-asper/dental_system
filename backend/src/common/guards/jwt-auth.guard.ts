import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthUser } from '../types/auth-user.type';

type SupabaseUser = {
  id: string;
  email?: string;
  role: string;
  is_anonymous?: boolean;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Token de autenticacion requerido.');
    }

    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const apiKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !apiKey) {
      throw new ServiceUnavailableException('Servicio de autenticacion no configurado.');
    }

    let response: globalThis.Response;
    try {
      // Supabase verifies the token with the project's current signing keys.
      // The service key is only an API key; the user's token is the bearer credential.
      response = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
        headers: { apikey: apiKey, Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(5000)
      });
    } catch {
      throw new ServiceUnavailableException('No se pudo verificar la sesion. Intenta nuevamente.');
    }

    if (response.status === 401 || response.status === 403) {
      throw new UnauthorizedException('Token de autenticacion invalido.');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('No se pudo verificar la sesion. Intenta nuevamente.');
    }

    let user: SupabaseUser;
    try {
      user = await response.json() as SupabaseUser;
    } catch {
      throw new ServiceUnavailableException('Respuesta de autenticacion invalida.');
    }

    if (!user || typeof user.id !== 'string' || !user.id || user.role !== 'authenticated' || user.is_anonymous) {
      throw new UnauthorizedException('Cuenta de acceso invalida.');
    }

    request.user = { authUserId: user.id, email: user.email };
    return true;
  }

  private extractBearerToken(request: Request): string | undefined {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return undefined;
    }

    return /^Bearer ([^\s]+)$/i.exec(authorization)?.[1];
  }
}

