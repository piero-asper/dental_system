import { BadRequestException, GoneException, Injectable } from '@nestjs/common';
import { MetodoPago, Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { escritura } from '../../common/lib/importes';
import { AnularPagoDto, BuscarPagosDto, CarteraQueryDto, CorteFinancieroDto, PeriodoFinancieroDto, RegistrarPagoDto } from './pagos.dto';
import { campoCsvFinanciero, periodoFinanciero } from './pagos.logic';
import { PagosRepository } from './pagos.repository';

type FilaCaja = { id: string; pagoId: string; pacienteId: string; paciente: string; recibo: string; fecha: string; tipo: string; metodoPago: string; monto: string; motivo: string };
type Corte = { actor: string; expira: number; actualizado: string; filas: FilaCaja[] };
@Injectable()
export class PagosService {
  private cortes = new Map<string, Corte>();
  constructor(private readonly repository: PagosRepository) {}
  private exponer<T extends { huellaSolicitud: string | null }>(value: T) { const { huellaSolicitud: _huella, ...data } = value; return data; }
  async listar(query: BuscarPagosDto) {
    if (Boolean(query.desde) !== Boolean(query.hasta)) throw new BadRequestException('Incluye ambas fechas para filtrar pagos.');
    const [items, total] = await this.repository.listar(query, query.desde && query.hasta ? periodoFinanciero(query.desde, query.hasta) : undefined);
    return { items: items.map((item) => this.exponer(item)), total, pagina: query.pagina, tamanoPagina: query.tamanoPagina, totalPaginas: Math.ceil(total / query.tamanoPagina) };
  }
  async obtener(id: string) { return this.exponer(await this.repository.obtener(id)); }
  async registrar(dto: RegistrarPagoDto, actor: string) { return this.exponer(await escritura(() => this.repository.registrar(dto, actor))); }
  async anular(id: string, dto: AnularPagoDto, actor: string) { return this.exponer(await escritura(() => this.repository.anular(id, dto, actor))); }
  async cartera(query: CarteraQueryDto) {
    const result = await this.repository.cartera(query);
    return { ...result, pagina: query.pagina, tamanoPagina: query.tamanoPagina, totalPaginas: Math.ceil(result.total / query.tamanoPagina) };
  }
  async resumen(dto: PeriodoFinancieroDto, actor: string) {
    const { inicio, fin } = periodoFinanciero(dto.desde, dto.hasta), actualizado = new Date().toISOString();
    const data = await this.repository.datosReporte(inicio, fin);
    if (data.movimientos.length > 5000) throw new BadRequestException('El periodo supera 5000 movimientos. Reduce las fechas para consultar el detalle completo.');
    const filas: FilaCaja[] = data.movimientos.filter((m) => m.pago).map((m) => ({ id: m.id, pagoId: m.pago!.id, pacienteId: m.pago!.pacienteId,
      paciente: `${m.pago!.paciente.apellidos}, ${m.pago!.paciente.nombres}`, recibo: m.pago!.comprobante?.numero ?? 'Sin recibo histórico',
      fecha: m.createdAt.toISOString(), tipo: m.tipo, metodoPago: m.metodoPago ?? 'OTRO', monto: m.monto.toFixed(2), motivo: m.descripcion ?? '' }));
    const sum = (rows: FilaCaja[], tipo: string) => rows.filter((row) => row.tipo === tipo).reduce((total, row) => total.add(row.monto), new Prisma.Decimal(0));
    const ingresos = sum(filas, 'INGRESO'), reversiones = sum(filas, 'EGRESO');
    const porMetodo = Object.values(MetodoPago).map((metodoPago) => { const rows = filas.filter((row) => row.metodoPago === metodoPago);
      const entrada = sum(rows, 'INGRESO'), salida = sum(rows, 'EGRESO');
      return { metodoPago, ingresos: entrada.toFixed(2), reversiones: salida.toFixed(2), neto: entrada.sub(salida).toFixed(2) }; });
    for (const [id, corte] of this.cortes) if (corte.expira < Date.now()) this.cortes.delete(id);
    if (this.cortes.size >= 10) this.cortes.delete(this.cortes.keys().next().value!);
    const corte = randomUUID(); this.cortes.set(corte, { actor, actualizado, filas, expira: Date.now() + 300000 });
    return { corte, actualizado, desde: dto.desde, hasta: dto.hasta, ingresos: ingresos.toFixed(2), reversiones: reversiones.toFixed(2),
      neto: ingresos.sub(reversiones).toFixed(2), saldoPendiente: data.saldoPendiente, presupuestosPendientes: data.presupuestosPendientes, porMetodo, totalMovimientos: filas.length };
  }
  private corte(dto: CorteFinancieroDto, actor: string) {
    const corte = this.cortes.get(dto.corte);
    if (!corte || corte.actor !== actor || corte.expira < Date.now()) throw new GoneException('El corte financiero venció. Actualiza el reporte.');
    return corte;
  }
  detalleReporte(dto: CorteFinancieroDto, actor: string) {
    const corte = this.corte(dto, actor), total = corte.filas.length;
    return { items: corte.filas.slice((dto.pagina - 1) * 20, dto.pagina * 20), total, pagina: dto.pagina, totalPaginas: Math.ceil(total / 20), actualizado: corte.actualizado };
  }
  csv(dto: CorteFinancieroDto, actor: string) {
    const corte = this.corte(dto, actor);
    return '\ufeff' + [['Fecha', 'Paciente', 'Recibo interno', 'Movimiento', 'Medio', 'Importe', 'Motivo'],
      ...corte.filas.map((row) => [row.fecha, row.paciente, row.recibo, row.tipo, row.metodoPago, row.monto, row.motivo])]
      .map((row) => row.map(campoCsvFinanciero).join(',')).join('\r\n');
  }
}
