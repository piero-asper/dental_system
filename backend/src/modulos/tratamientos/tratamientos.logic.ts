import { BadRequestException, ConflictException } from '@nestjs/common';
import { EstadoPresupuesto, Prisma } from '@prisma/client';
import { importe } from '../../common/lib/importes';
import { PresupuestoItemDto } from './tratamientos.dto';

export function calcularPresupuesto(items: PresupuestoItemDto[], descuento: string) {
  const lineas = items.map((item) => ({ ...item, precioUnitario: importe(item.precioUnitario),
    subtotal: importe(importe(item.precioUnitario).mul(item.cantidad)) }));
  const subtotal = importe(lineas.reduce((total, item) => total.add(item.subtotal), new Prisma.Decimal(0)));
  const rebaja = importe(descuento);
  if (rebaja.greaterThan(subtotal)) throw new BadRequestException('El descuento no puede superar el subtotal.');
  return { items: lineas, subtotal, descuento: rebaja, total: subtotal.sub(rebaja) };
}

export function validarTransicion(actual: EstadoPresupuesto, nuevo: EstadoPresupuesto) {
  const permitidos: Record<EstadoPresupuesto, EstadoPresupuesto[]> = {
    BORRADOR: ['ENVIADO'], ENVIADO: ['ACEPTADO', 'RECHAZADO'], ACEPTADO: ['FINALIZADO'], RECHAZADO: [], FINALIZADO: []
  };
  if (!permitidos[actual].includes(nuevo)) throw new ConflictException('Ese cambio de estado no está permitido.');
}
