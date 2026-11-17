import { Controller, Get, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './common/prisma/prisma.service';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

type DependencyStatus = 'ok' | 'no disponible';

@ApiTags('salud')
@Controller()
export class AppController {
  constructor(
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly config?: ConfigService
  ) {}

  @Public()
  @Get('health/dependencias')
  async dependencias(): Promise<{ api: 'ok'; baseDatos: DependencyStatus; autenticacion: DependencyStatus }> {
    const [database, authentication] = await Promise.allSettled([
      this.checkDatabase(),
      this.checkSupabaseAuthentication()
    ]);

    return {
      api: 'ok',
      baseDatos: this.statusFrom(database),
      autenticacion: this.statusFrom(authentication)
    };
  }

  @Public()
  @Get('health')
  health(): { status: string; service: string } {
    return {
      status: 'ok',
      service: 'sistema-dental-backend'
    };
  }

  private async checkDatabase(): Promise<void> {
    if (!this.prisma) {
      throw new Error('Prisma no está configurado.');
    }

    await this.prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`SELECT 1`;
      },
      { timeout: 5000, maxWait: 5000 }
    );
  }

  private async checkSupabaseAuthentication(): Promise<void> {
    const url = this.config?.get<string>('SUPABASE_URL');
    const key = this.config?.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !key) {
      throw new Error('Supabase no está configurado.');
    }

    const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1/health`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error('Supabase Auth no está disponible.');
    }
  }

  private statusFrom(result: PromiseSettledResult<void>): DependencyStatus {
    return result.status === 'fulfilled' ? 'ok' : 'no disponible';
  }
}

