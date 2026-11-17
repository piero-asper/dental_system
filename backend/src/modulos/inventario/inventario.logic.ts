import { BadRequestException } from '@nestjs/common';
import { Prisma, TipoMovimientoInventario } from '@prisma/client';
import { importe } from '../../common/lib/importes';

export function calcularStock(actual: Prisma.Decimal, tipo: TipoMovimientoInventario, cantidad: string) {
  const valor = importe(cantidad);
  if (tipo !== 'AJUSTE' && valor.isZero()) throw new BadRequestException('La cantidad del movimiento debe ser mayor que cero.');
  const nuevo = tipo === 'AJUSTE' ? valor : tipo === 'ENTRADA' ? actual.add(valor) : actual.sub(valor);
  if (nuevo.isNegative()) throw new BadRequestException('No hay existencias suficientes para registrar la salida.');
  if (nuevo.equals(actual)) throw new BadRequestException('El ajuste debe cambiar las existencias.');
  return importe(nuevo);
}
