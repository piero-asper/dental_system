import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { comprobarVersion, siguienteVersion } from '../../common/lib/importes';
import { AnularPagoDto, BuscarPagosDto, CarteraQueryDto, RegistrarPagoDto } from './pagos.dto';
import { validarAbono } from './pagos.logic';

const pacienteSelect = { id: true, nombres: true, apellidos: true };
const pagoInclude = { paciente: { select: pacienteSelect }, comprobante: true,
  presupuesto: { select: { id: true, total: true, estado: true } } } satisfies Prisma.PagoInclude;
export type CuentaPresupuesto = { id: string; pacienteId: string; paciente: { id: string; nombres: string; apellidos: string };
  estado: string; total: string; abonado: string; saldo: string; createdAt: Date };

@Injectable()
export class PagosRepository {
  constructor(private readonly prisma: PrismaService) {}
  private cuentas() {
    return Prisma.sql`WITH saldos AS (
      SELECT pr.id,pr.paciente_id,pr.estado,pr.total,pr.created_at,p.nombres,p.apellidos,
        COALESCE(sum(pg.monto) FILTER(WHERE pg.estado='REGISTRADO'),0) abonado,
        pr.total-COALESCE(sum(pg.monto) FILTER(WHERE pg.estado='REGISTRADO'),0) saldo
      FROM presupuestos pr JOIN pacientes p ON p.id=pr.paciente_id LEFT JOIN pagos pg ON pg.presupuesto_id=pr.id
      WHERE pr.deleted_at IS NULL AND pr.estado IN ('ACEPTADO','FINALIZADO')
      GROUP BY pr.id,p.id)`;
  }
  cartera(query: CarteraQueryDto) {
    const partes = [Prisma.sql`true`];
    if (query.estadoSaldo === 'pendientes') partes.push(Prisma.sql`s.saldo>0`);
    if (query.estadoSaldo === 'saldados') partes.push(Prisma.sql`s.saldo=0`);
    if (query.pacienteId) partes.push(Prisma.sql`s.paciente_id=${query.pacienteId}::uuid`);
    if (query.presupuestoId) partes.push(Prisma.sql`s.id=${query.presupuestoId}::uuid`);
    for (const palabra of query.q?.split(/\s+/).filter(Boolean) ?? []) {
      const q = '%' + palabra.replace(/[\\%_]/g, '\\$&') + '%'; partes.push(Prisma.sql`(s.apellidos||' '||s.nombres) ILIKE ${q}`);
    }
    const where = Prisma.join(partes, ' AND ');
    return this.prisma.$transaction(async (tx) => {
      const items = await tx.$queryRaw<CuentaPresupuesto[]>`${this.cuentas()} SELECT s.id,s.paciente_id AS "pacienteId",s.estado,s.total::text,s.abonado::text,s.saldo::text,s.created_at AS "createdAt",
        jsonb_build_object('id',s.paciente_id,'nombres',s.nombres,'apellidos',s.apellidos) paciente
        FROM saldos s WHERE ${where} ORDER BY s.created_at DESC,s.id LIMIT ${query.tamanoPagina} OFFSET ${(query.pagina - 1) * query.tamanoPagina}`;
      const count = await tx.$queryRaw<{ total: bigint; saldo: Prisma.Decimal }[]>`${this.cuentas()} SELECT count(*) total,COALESCE(sum(s.saldo),0) saldo FROM saldos s WHERE ${where}`;
      return { items, total: Number(count[0].total), saldoFiltrado: count[0].saldo.toFixed(2) };
    }, { isolationLevel: 'RepeatableRead' });
  }
  listar(query: BuscarPagosDto, fechas?: { inicio: Date; fin: Date }) {
    const where: Prisma.PagoWhereInput = { pacienteId: query.pacienteId, presupuestoId: query.presupuestoId, estado: query.estadoPago,
      ...(fechas ? { fechaPago: { gte: fechas.inicio, lt: fechas.fin } } : {}),
      ...(query.q ? { AND: query.q.split(/\s+/).filter(Boolean).map((word) => ({ OR: [{ paciente: { nombres: { contains: word, mode: 'insensitive' as const } } }, { paciente: { apellidos: { contains: word, mode: 'insensitive' as const } } }, { comprobante: { numero: { contains: word, mode: 'insensitive' as const } } }] })) } : {}) };
    return this.prisma.$transaction([this.prisma.pago.findMany({ where, include: pagoInclude, orderBy: [{ fechaPago: 'desc' }, { id: 'asc' }],
      take: query.tamanoPagina, skip: (query.pagina - 1) * query.tamanoPagina }), this.prisma.pago.count({ where })], { isolationLevel: 'RepeatableRead' });
  }
  async obtener(id: string) {
    const result = await this.prisma.pago.findUnique({ where: { id }, include: { ...pagoInclude, cajaMovimientos: { orderBy: { createdAt: 'asc' } } } });
    if (!result) throw new NotFoundException('Pago no encontrado.');
    return result;
  }
  registrar(dto: RegistrarPagoDto, actor: string) {
    const huella = createHash('sha256').update(JSON.stringify({ presupuestoId: dto.presupuestoId, monto: new Prisma.Decimal(dto.monto).toFixed(2),
      metodoPago: dto.metodoPago, referencia: dto.referencia || null, observaciones: dto.observaciones || null, actor })).digest('hex');
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${dto.claveSolicitud},0))::text`;
      const previo = await tx.pago.findUnique({ where: { claveSolicitud: dto.claveSolicitud }, include: pagoInclude });
      if (previo) {
        if (previo.huellaSolicitud !== huella) throw new ConflictException('La solicitud ya se utilizó con otros datos. Comprueba el pago anterior.');
        return previo;
      }
      await tx.$queryRaw`SELECT id FROM presupuestos WHERE id=${dto.presupuestoId}::uuid FOR UPDATE`;
      const presupuesto = await tx.presupuesto.findFirst({ where: { id: dto.presupuestoId, deletedAt: null } });
      if (!presupuesto) throw new NotFoundException('Presupuesto no encontrado.');
      if (!['ACEPTADO', 'FINALIZADO'].includes(presupuesto.estado)) throw new BadRequestException('Acepta el presupuesto antes de registrar un pago.');
      const suma = await tx.pago.aggregate({ where: { presupuestoId: presupuesto.id, estado: 'REGISTRADO' }, _sum: { monto: true } });
      const monto = validarAbono(presupuesto.total, suma._sum.monto ?? new Prisma.Decimal(0), dto.monto);
      const contador = await tx.secuenciaComprobante.upsert({ where: { serie: 'REC' }, create: { serie: 'REC', ultimoNumero: 1 }, update: { ultimoNumero: { increment: 1 } } });
      const pago = await tx.pago.create({ data: { pacienteId: presupuesto.pacienteId, presupuestoId: presupuesto.id, monto,
        metodoPago: dto.metodoPago, referencia: dto.referencia || null, observaciones: dto.observaciones, authUserId: actor,
        claveSolicitud: dto.claveSolicitud, huellaSolicitud: huella,
        comprobante: { create: { pacienteId: presupuesto.pacienteId, numero: `REC-${String(contador.ultimoNumero).padStart(8, '0')}`, tipo: 'RECIBO', montoTotal: monto } },
        cajaMovimientos: { create: { tipo: 'INGRESO', monto, metodoPago: dto.metodoPago, authUserId: actor, descripcion: 'Cobro de presupuesto' } }
      }, include: pagoInclude });
      return pago;
    }, { maxWait: 10000, timeout: 20000 });
  }
  anular(id: string, dto: AnularPagoDto, actor: string) {
    return this.prisma.$transaction(async (tx) => {
      const referencia = await tx.pago.findUnique({ where: { id }, select: { presupuestoId: true } });
      if (!referencia) throw new NotFoundException('Pago no encontrado.');
      // Mismo orden de bloqueo para registro y anulación: presupuesto antes que pago.
      if (referencia.presupuestoId) await tx.$queryRaw`SELECT id FROM presupuestos WHERE id=${referencia.presupuestoId}::uuid FOR UPDATE`;
      await tx.$queryRaw`SELECT id FROM pagos WHERE id=${id}::uuid FOR UPDATE`;
      const pago = await tx.pago.findUniqueOrThrow({ where: { id } });
      comprobarVersion(pago.updatedAt, dto.version);
      if (pago.estado !== 'REGISTRADO') throw new ConflictException('Este pago ya está anulado.');
      await tx.comprobante.updateMany({ where: { pagoId: id, estado: 'EMITIDO' }, data: { estado: 'ANULADO' } });
      await tx.cajaMovimiento.create({ data: { pagoId: id, tipo: 'EGRESO', monto: pago.monto, metodoPago: pago.metodoPago,
        descripcion: dto.motivo, authUserId: actor } });
      return tx.pago.update({ where: { id }, data: { estado: 'ANULADO', anuladoAt: new Date(), anuladoPor: actor,
        motivoAnulacion: dto.motivo, updatedAt: siguienteVersion(pago.updatedAt) }, include: pagoInclude });
    });
  }
  datosReporte(inicio: Date, fin: Date) {
    return this.prisma.$transaction(async (tx) => {
      const movimientos = await tx.cajaMovimiento.findMany({ where: { createdAt: { gte: inicio, lt: fin }, pagoId: { not: null } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }], take: 5001,
        include: { pago: { select: { id: true, presupuestoId: true, pacienteId: true, paciente: { select: pacienteSelect }, comprobante: { select: { numero: true } } } } } });
      const cartera = await tx.$queryRaw<{ saldo: Prisma.Decimal; pendientes: bigint }[]>`${this.cuentas()} SELECT COALESCE(sum(saldo),0) saldo,count(*) pendientes FROM saldos WHERE saldo>0`;
      return { movimientos, saldoPendiente: cartera[0].saldo.toFixed(2), presupuestosPendientes: Number(cartera[0].pendientes) };
    }, { isolationLevel: 'RepeatableRead' });
  }
}
