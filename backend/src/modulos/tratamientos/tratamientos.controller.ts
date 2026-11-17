import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CatalogoQueryDto } from '../../common/dto/catalogo.dto';
import { CrearPresupuestoDto, CrearTratamientoDto, EditarPresupuestoDto, EditarTratamientoDto, EstadoPresupuestoDto, PresupuestosQueryDto } from './tratamientos.dto';
import { TratamientosService } from './tratamientos.service';

@ApiTags('tratamientos') @ApiBearerAuth() @ApiResponse({ status: 401, description: 'Se requiere una sesión válida.' })
@ApiResponse({ status: 409, description: 'Versión desactualizada o cambio de estado no permitido.' })
@Controller('tratamientos')
export class TratamientosController {
  constructor(private readonly service: TratamientosService) {}
  @Get() @Header('Cache-Control', 'no-store') @ApiOperation({ summary: 'Buscar en el catálogo de tratamientos.' })
  listar(@Query() query: CatalogoQueryDto) { return this.service.listar(query); }
  @Post() @ApiOperation({ summary: 'Crear un tratamiento con precio base y código consecutivo automático.' })
  crear(@Body() dto: CrearTratamientoDto) { return this.service.crear(dto); }
  @Patch(':id') @ApiOperation({ summary: 'Editar o desactivar un tratamiento conservando presupuestos anteriores.' })
  editar(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: EditarTratamientoDto) { return this.service.editar(id, dto); }
}
@ApiTags('presupuestos') @ApiBearerAuth() @ApiResponse({ status: 401, description: 'Se requiere una sesión válida.' })
@ApiResponse({ status: 409, description: 'Versión desactualizada o transición de estado no permitida.' })
@Controller('presupuestos')
export class PresupuestosController {
  constructor(private readonly service: TratamientosService) {}
  @Get() @Header('Cache-Control', 'no-store') @ApiOperation({ summary: 'Listar presupuestos por paciente y estado.' })
  listar(@Query() query: PresupuestosQueryDto) { return this.service.presupuestos(query); }
  @Get(':id') @Header('Cache-Control', 'no-store') @ApiOperation({ summary: 'Consultar ítems, precios históricos y totales.' })
  obtener(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.presupuesto(id); }
  @Post() @ApiOperation({ summary: 'Crear presupuesto en borrador. Los totales se calculan en el servidor.' })
  crear(@Body() dto: CrearPresupuestoDto) { return this.service.crearPresupuesto(dto); }
  @Patch(':id') @ApiOperation({ summary: 'Editar los ítems y descuento de un borrador con control de versión.' })
  editar(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: EditarPresupuestoDto) { return this.service.editarPresupuesto(id, dto); }
  @Patch(':id/estado') @ApiOperation({ summary: 'Cambiar estado: borrador → enviado → aceptado/rechazado; aceptado → finalizado. Enviado es un estado administrativo y no envía mensajes.' })
  estado(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: EstadoPresupuestoDto) { return this.service.estado(id, dto); }
}
