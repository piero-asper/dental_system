import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { AuditoriaQueryDto, CrearEvolucionDto, CrearHistoriaDto, CrearPiezaDto, EditarEvolucionDto, EditarHistoriaDto, EditarPiezaDto, EvolucionesQueryDto } from './dto/historia.dto';
import { HistoriasClinicasService } from './historias-clinicas.service';

@ApiTags('historias-clinicas') @ApiBearerAuth()
@ApiResponse({ status: 400, description: 'Datos clinicos o identificadores invalidos.' })
@ApiResponse({ status: 401, description: 'Sesion requerida.' })
@ApiResponse({ status: 404, description: 'Paciente, historia o registro no encontrado.' })
@ApiResponse({ status: 409, description: 'Historia/hallazgo duplicado o version desactualizada.' })
@Controller('historias-clinicas/:pacienteId')
export class HistoriasClinicasController {
  constructor(private readonly service: HistoriasClinicasService) {}
  @Get() @Header('Cache-Control', 'no-store') @ApiOperation({ summary: 'Consultar historia unica, evoluciones y odontograma de un paciente.' })
  obtener(@Param('pacienteId', new ParseUUIDPipe()) pacienteId: string) { return this.service.obtener(pacienteId); }
  @Get('evoluciones') @Header('Cache-Control','no-store') evoluciones(@Param('pacienteId',new ParseUUIDPipe()) id:string,@Query() query:EvolucionesQueryDto) {return this.service.evoluciones(id,query);}
  @Get('odontograma') @Header('Cache-Control','no-store') odontograma(@Param('pacienteId',new ParseUUIDPipe()) id:string) {return this.service.odontograma(id);}
  @Get('auditoria') @Header('Cache-Control', 'no-store') @ApiOperation({ summary: 'Auditoria paginada de solo lectura con valores anteriores, nuevos y usuario responsable.' })
  auditoria(@Param('pacienteId', new ParseUUIDPipe()) pacienteId: string, @Query() query: AuditoriaQueryDto) { return this.service.auditoria(pacienteId, query); }
  @Post() @ApiOperation({ summary: 'Crear historia unica por paciente. Auditoria automatica en la misma transaccion.' })
  crear(@Param('pacienteId', new ParseUUIDPipe()) pacienteId: string, @Body() dto: CrearHistoriaDto, @CurrentUser() user: AuthUser) { return this.service.crear(pacienteId, dto, user.authUserId); }
  @Patch() @ApiOperation({ summary: 'Actualizar antecedentes con control de version y auditoria automatica.' })
  editar(@Param('pacienteId', new ParseUUIDPipe()) pacienteId: string, @Body() dto: EditarHistoriaDto, @CurrentUser() user: AuthUser) { return this.service.editar(pacienteId, dto, user.authUserId); }
  @Post('evoluciones') @ApiOperation({ summary: 'Registrar diagnostico y procedimiento en una evolucion clinica.' })
  evolucion(@Param('pacienteId', new ParseUUIDPipe()) pacienteId: string, @Body() dto: CrearEvolucionDto, @CurrentUser() user: AuthUser) { return this.service.crearEvolucion(pacienteId, dto, user.authUserId); }
  @Patch('evoluciones/:id') @ApiOperation({ summary: 'Corregir una evolucion conservando los valores anteriores en auditoria.' })
  editarEvolucion(@Param('pacienteId', new ParseUUIDPipe()) pacienteId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: EditarEvolucionDto, @CurrentUser() user: AuthUser) { return this.service.editarEvolucion(pacienteId, id, dto, user.authUserId); }
  @Post('odontograma') @ApiOperation({ summary: 'Registrar pieza FDI y superficie. Sin registro significa sin evaluar.' })
  pieza(@Param('pacienteId', new ParseUUIDPipe()) pacienteId: string, @Body() dto: CrearPiezaDto, @CurrentUser() user: AuthUser) { return this.service.crearPieza(pacienteId, dto, user.authUserId); }
  @Patch('odontograma/:id') @ApiOperation({ summary: 'Actualizar hallazgo sin borrar su historial. Pieza y superficie se conservan.' })
  editarPieza(@Param('pacienteId', new ParseUUIDPipe()) pacienteId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body() dto: EditarPiezaDto, @CurrentUser() user: AuthUser) { return this.service.editarPieza(pacienteId, id, dto, user.authUserId); }
}
