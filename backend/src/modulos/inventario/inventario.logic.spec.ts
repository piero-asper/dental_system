import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { calcularStock } from './inventario.logic';
describe('movimientos de inventario', () => {
  const stock = new Prisma.Decimal('1.20');
  it('registra entradas y salidas exactas con centésimas', () => {
    expect(calcularStock(stock, 'ENTRADA', '0.10').toFixed(2)).toBe('1.30');
    expect(calcularStock(stock, 'SALIDA', '1.20').toFixed(2)).toBe('0.00');
  });
  it('interpreta ajuste como existencia final y permite dejarla en cero', () => {
    expect(calcularStock(stock, 'AJUSTE', '3').toFixed(2)).toBe('3.00');
    expect(calcularStock(stock, 'AJUSTE', '0').toFixed(2)).toBe('0.00');
  });
  it('rechaza salida insuficiente, cantidad cero, ajuste sin cambios y desbordamiento', () => {
    expect(() => calcularStock(stock, 'SALIDA', '1.21')).toThrow(BadRequestException);
    expect(() => calcularStock(stock, 'ENTRADA', '0')).toThrow(BadRequestException);
    expect(() => calcularStock(stock, 'AJUSTE', '1.20')).toThrow(BadRequestException);
    expect(() => calcularStock(new Prisma.Decimal('9999999999.99'), 'ENTRADA', '0.01')).toThrow(BadRequestException);
  });
});
