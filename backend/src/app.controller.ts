import { Controller, Get, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './common/prisma/prisma.service';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('salud')
@Controller()
export class AppController {
  constructor(@Optional() private readonly prisma?:PrismaService,@Optional() private readonly config?:ConfigService){}
  @Public() @Get('health/dependencias')
  async dependencias(){
    const checks=await Promise.allSettled([
      this.prisma?.$transaction(async(tx)=>{await tx.$queryRaw`SELECT 1`;},{timeout:5000,maxWait:5000})??Promise.reject(new Error()),
      (async()=>{const url=this.config?.get<string>('SUPABASE_URL'),key=this.config?.get<string>('SUPABASE_SERVICE_ROLE_KEY');if(!url||!key)throw new Error();const response=await fetch(`${url.replace(/\/$/,'')}/auth/v1/health`,{headers:{apikey:key},signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error();})()
    ]);
    return {api:'ok',baseDatos:checks[0].status==='fulfilled'?'ok':'no disponible',autenticacion:checks[1].status==='fulfilled'?'ok':'no disponible'};
  }
  @Public()
  @Get('health')
  health(): { status: string; service: string } {
    return {
      status: 'ok',
      service: 'sistema-dental-backend'
    };
  }
}

