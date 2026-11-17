import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { importe } from '../../common/lib/importes';

export function validarAbono(total: Prisma.Decimal, abonado: Prisma.Decimal, monto: string) {
  const valor = importe(monto), saldo = total.sub(abonado);
  if (valor.isZero()) throw new BadRequestException('El pago debe ser mayor que cero.');
  if (valor.greaterThan(saldo)) throw new BadRequestException('El pago supera el saldo pendiente del presupuesto.');
  return valor;
}
export function periodoFinanciero(desde: string, hasta: string) {
  const inicio = new Date(`${desde}T00:00:00-05:00`), fin = new Date(`${hasta}T00:00:00-05:00`);
  const dias = (fin.getTime() - inicio.getTime()) / 86400000;
  if (!Number.isFinite(dias) || dias <= 0 || dias > 366 || inicio > new Date()) throw new BadRequestException('Consulta un periodo de 1 a 366 días con inicio no posterior a hoy.');
  return { inicio, fin };
}
export const campoCsvFinanciero = (value: string) => `"${(/^[\s]*[=+\-@\t\r\n]/.test(value) ? "'" + value : value).replace(/"/g, '""')}"`;
