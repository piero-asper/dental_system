import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CatalogoQueryDto } from '../../common/dto/catalogo.dto';
import { CrearInsumoDto, EditarInsumoDto, InventarioQueryDto, MovimientoDto } from './inventario.dto';
import { InventarioService } from './inventario.service';
@ApiTags('inventario') @ApiBearerAuth() @ApiResponse({ status: 401, description: 'Se requiere una sesión válida.' })
@ApiResponse({ status: 409, description: 'Registro modificado desde otra pestaña.' })
@Controller('inventario')
export class InventarioController {
  constructor(private readonly service: InventarioService) {}
  @Get() @Header('Cache-Control', 'no-store') @ApiOperation({ summary: 'Buscar insumos, con filtro de existencias iguales o inferiores al mínimo.' })
  listar(@Query() query: InventarioQueryDto) { return this.service.listar(query); }
  @Post() @ApiOperation({ summary: 'Crear insumo con código consecutivo automático y stock cero. Registrar las existencias iniciales como entrada.' })
  crear(@Body() dto: CrearInsumoDto) { return this.service.crear(dto); }
  @Patch(':id') @ApiOperation({ summary: 'Editar insumo o desactivarlo conservando su historial.' })
  editar(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: EditarInsumoDto) { return this.service.editar(id, dto); }
  @Get(':id/movimientos') @Header('Cache-Control', 'no-store') @ApiOperation({ summary: 'Consultar historial inmutable de movimientos, paginado.' })
  movimientos(@Param('id', new ParseUUIDPipe()) id: string, @Query() query: CatalogoQueryDto) { return this.service.movimientos(id, query); }
  @Post(':id/movimientos') @ApiOperation({ summary: 'Registrar entrada, salida o ajuste con motivo. Actualiza stock e historial en una transacción; ajuste indica la existencia final.' })
  movimiento(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: MovimientoDto) { return this.service.movimiento(id, dto); }
}
