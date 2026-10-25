import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AgendaDto, CrearCitaDto, EditarCitaDto, EstadoCitaDto, ReprogramarCitaDto } from './dto/cita.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { CitasService } from './citas.service';

@ApiTags('citas') @ApiBearerAuth()
@ApiResponse({ status: 400, description: 'Datos invalidos o transicion de estado no permitida.' })
@ApiResponse({ status: 401, description: 'Sesion requerida.' })
@ApiResponse({ status: 404, description: 'Cita o paciente no encontrado.' })
@ApiResponse({ status: 409, description: 'Cruce de horarios o version desactualizada.' })
@Controller('citas')
export class CitasController {
  constructor(private readonly service: CitasService) {}
  @Get() @Header('Cache-Control', 'no-store') @ApiOperation({ summary: 'Agenda unica diaria o semanal; intervalos [desde, hasta), maximo 7 dias.' })
  listar(@Query() query: AgendaDto) { return this.service.listar(query); }
  @Get(':id') @Header('Cache-Control', 'no-store') @ApiOperation({ summary: 'Consultar cita con datos de contacto del paciente.' })
  obtener(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.obtener(id); }
  @Post() @ApiOperation({ summary: 'Reservar una cita para un paciente activo sin cruzar horarios.' })
  crear(@Body() dto: CrearCitaDto, @CurrentUser() user: AuthUser) { return this.service.crear(dto,user.authUserId); }
  @Patch(':id/horario') @ApiOperation({ summary: 'Reprogramar una cita pendiente con control de version.' })
  reprogramar(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: ReprogramarCitaDto, @CurrentUser() user: AuthUser) { return this.service.reprogramar(id, dto,user.authUserId); }
  @Patch(':id/estado') @ApiOperation({ summary: 'Confirmar, atender, registrar inasistencia o cancelar con motivo. Estados finales inmutables.' })
  estado(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: EstadoCitaDto, @CurrentUser() user: AuthUser) { return this.service.cambiarEstado(id, dto,user.authUserId); }
  @Get(':id/eventos') @Header('Cache-Control','no-store') eventos(@Param('id',new ParseUUIDPipe()) id: string) { return this.service.eventos(id); }
  @Patch(':id') editar(@Param('id',new ParseUUIDPipe()) id: string,@Body() dto: EditarCitaDto,@CurrentUser() user: AuthUser) { return this.service.editar(id,dto,user.authUserId); }
}
