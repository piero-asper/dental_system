import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BuscarPacientesDto, CrearPacienteDto, EditarPacienteDto, ListaPacientesResponseDto, PacienteResponseDto } from './dto/paciente.dto';
import { PacientesService } from './pacientes.service';

@ApiTags('pacientes')
@ApiBearerAuth()
@ApiResponse({ status: 401, description: 'Se requiere una sesion valida.' })
@ApiResponse({ status: 400, description: 'Datos de paciente o filtros invalidos.' })
@Controller('pacientes')
export class PacientesController {
  constructor(private readonly service: PacientesService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Buscar pacientes por datos personales y estado, con paginacion.' })
  @ApiOkResponse({ type: ListaPacientesResponseDto })
  listar(@Query() query: BuscarPacientesDto) { return this.service.listar(query); }

  @Get(':id')
  @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Consultar la ficha administrativa de un paciente.' })
  @ApiOkResponse({ type: PacienteResponseDto })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado.' })
  obtener(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.obtener(id); }

  @Post()
  @ApiOperation({ summary: 'Registrar un paciente con nombres y apellidos obligatorios.' })
  @ApiCreatedResponse({ type: PacienteResponseDto })
  crear(@Body() dto: CrearPacienteDto) { return this.service.crear(dto); }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar datos o marcar al paciente como inactivo conservando su ficha.' })
  @ApiOkResponse({ type: PacienteResponseDto })
  @ApiResponse({ status: 404, description: 'Paciente no encontrado.' })
  editar(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: EditarPacienteDto) { return this.service.editar(id, dto); }
}
