import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function importe(value: string | Prisma.Decimal) {
  const number = new Prisma.Decimal(value);
  if (!number.isFinite() || number.isNegative() || number.decimalPlaces() > 2 || number.greaterThan('9999999999.99')) {
    throw new BadRequestException('La cantidad debe ser positiva o cero, con hasta dos decimales y dentro del límite permitido.');
  }
  return number;
}

export function comprobarVersion(updatedAt: Date, version: string) {
  if (updatedAt.getTime() !== new Date(version).getTime()) {
    throw new ConflictException('El registro cambió. Recarga los datos antes de guardar de nuevo.');
  }
}
export const siguienteVersion = (date: Date) => new Date(Math.max(Date.now(), date.getTime() + 1));

export async function escritura<T>(action: () => Promise<T>): Promise<T> {
  try { return await action(); }
  catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') throw new ConflictException('Ese código ya está registrado. Usa otro código.');
      if (error.code === 'P2034') throw new ConflictException('Hubo otra operación al mismo tiempo. Recarga los datos y comprueba el resultado.');
    }
    throw error;
  }
}
