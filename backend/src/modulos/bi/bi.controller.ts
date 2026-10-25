import { Controller, Get, Header, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { BiService } from './bi.service';
import { DetalleBiDto,PeriodoBiDto } from './bi.dto';
@ApiBearerAuth() @ApiTags('bi') @Controller('bi')
export class BiController {
  constructor(private readonly service:BiService){}
  @Get('resumen') @Header('Cache-Control','no-store') resumen(@Query() q:PeriodoBiDto,@CurrentUser() user:AuthUser){return this.service.resumen(q,user.authUserId);}
  @Get('detalle') @Header('Cache-Control','no-store') detalle(@Query() q:DetalleBiDto,@CurrentUser() user:AuthUser){return this.service.detalle(q,user.authUserId);}
  @Get('exportar') @Header('Cache-Control','no-store') @Header('Content-Type','text/csv; charset=utf-8') @Header('Content-Disposition','attachment; filename="reporte-clinica.csv"') csv(@Query() q:DetalleBiDto,@CurrentUser() user:AuthUser){return this.service.csv(q,user.authUserId);}
}
