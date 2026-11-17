import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../../common/types/auth-user.type';
import { AnularPagoDto, BuscarPagosDto, CarteraQueryDto, CorteFinancieroDto, PeriodoFinancieroDto, RegistrarPagoDto } from './pagos.dto';
import { PagosService } from './pagos.service';
@ApiTags('pagos') @ApiBearerAuth() @ApiResponse({ status: 401, description: 'Se requiere una sesión válida.' })
@ApiResponse({ status: 409, description: 'Versión desactualizada o solicitud duplicada con datos diferentes.' })
@Controller('pagos')
export class PagosController {
  constructor(private readonly service: PagosService) {}
  @Get('cartera') @Header('Cache-Control', 'no-store') @ApiOperation({ summary: 'Presupuestos aceptados/finalizados, abonos vigentes y saldos actuales; incluye pacientes inactivos.' })
  cartera(@Query() query: CarteraQueryDto) { return this.service.cartera(query); }
  @Get('reporte') @Header('Cache-Control', 'no-store') @ApiOperation({ summary: 'Caja por fecha del movimiento, medios de pago y cartera actual. Devuelve un corte de cinco minutos para detalle y CSV.' })
  resumen(@Query() query: PeriodoFinancieroDto, @CurrentUser() user: AuthUser) { return this.service.resumen(query, user.authUserId); }
  @Get('reporte/detalle') @Header('Cache-Control', 'no-store') @ApiOperation({ summary: 'Detalle paginado del mismo corte de caja.' })
  detalleReporte(@Query() query: CorteFinancieroDto, @CurrentUser() user: AuthUser) { return this.service.detalleReporte(query, user.authUserId); }
  @Get('reporte/csv') @Header('Cache-Control', 'no-store') @Header('Content-Type', 'text/csv; charset=utf-8') @Header('Content-Disposition', 'attachment; filename="caja-clinica.csv"')
  @ApiOperation({ summary: 'Exportar movimientos del corte de caja, hasta 5000 filas, sin notas clínicas.' })
  csv(@Query() query: CorteFinancieroDto, @CurrentUser() user: AuthUser) { return this.service.csv(query, user.authUserId); }
  @Get() @Header('Cache-Control', 'no-store') @ApiOperation({ summary: 'Buscar cobros por paciente, recibo, presupuesto, estado y periodo de registro.' })
  listar(@Query() query: BuscarPagosDto) { return this.service.listar(query); }
  @Get(':id') @Header('Cache-Control', 'no-store') @ApiOperation({ summary: 'Consultar pago, recibo interno y movimientos de caja.' })
  obtener(@Param('id', new ParseUUIDPipe()) id: string) { return this.service.obtener(id); }
  @Post() @ApiOperation({ summary: 'Registrar abono a presupuesto aceptado/finalizado. Pago, recibo REC correlativo y caja se crean en una transacción; no admite sobrepagos.' })
  registrar(@Body() dto: RegistrarPagoDto, @CurrentUser() user: AuthUser) { return this.service.registrar(dto, user.authUserId); }
  @Patch(':id/anular') @ApiOperation({ summary: 'Anular un cobro con motivo y versión: conserva el recibo y añade una reversión en la fecha actual. No ejecuta transferencias bancarias.' })
  anular(@Param('id', new ParseUUIDPipe()) id: string, @Body() dto: AnularPagoDto, @CurrentUser() user: AuthUser) { return this.service.anular(id, dto, user.authUserId); }
}
