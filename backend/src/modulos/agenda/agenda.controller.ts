import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { AgendaService } from './agenda.service';
import { BloqueoDto, CancelarBloqueoDto, ConfigurarAgendaDto, DisponibilidadDto } from './agenda.dto';
@ApiBearerAuth() @ApiTags('agenda') @Controller('agenda')
export class AgendaController {
  constructor(private readonly service: AgendaService) {}
  @Get('configuracion') @Header('Cache-Control','no-store') configuracion() { return this.service.configuracion(); }
  @Post('configuracion') configurar(@Body() dto: ConfigurarAgendaDto, @CurrentUser() user: AuthUser) { return this.service.configurar(dto, user.authUserId); }
  @Get('disponibilidad') @Header('Cache-Control','no-store') franjas(@Query() query: DisponibilidadDto) { return this.service.franjas(query); }
  @Post('bloqueos') bloquear(@Body() dto: BloqueoDto, @CurrentUser() user: AuthUser) { return this.service.bloquear(dto, user.authUserId); }
  @Patch('bloqueos/:id/cancelar') cancelar(@Param('id',new ParseUUIDPipe()) id: string,@Body() dto: CancelarBloqueoDto) { return this.service.cancelar(id,dto.version); }
}
