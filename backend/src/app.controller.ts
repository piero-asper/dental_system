import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

@ApiTags('salud')
@Controller()
export class AppController {
  @Public()
  @Get('health')
  health(): { status: string; service: string } {
    return {
      status: 'ok',
      service: 'sistema-dental-backend'
    };
  }
}

