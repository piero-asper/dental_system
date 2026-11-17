import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { campoCsvFinanciero, periodoFinanciero, validarAbono } from './pagos.logic';
describe('reglas de cobros y caja', () => {
  it('acepta abonos exactos y el pago del saldo restante', () => {
    expect(validarAbono(new Prisma.Decimal('100.30'), new Prisma.Decimal('20.10'), '80.20').toFixed(2)).toBe('80.20');
  });
  it('rechaza cero, sobrepagos y un saldo ya pagado', () => {
    expect(() => validarAbono(new Prisma.Decimal(100), new Prisma.Decimal(0), '0')).toThrow(BadRequestException);
    expect(() => validarAbono(new Prisma.Decimal(100), new Prisma.Decimal(20), '80.01')).toThrow('supera');
    expect(() => validarAbono(new Prisma.Decimal(100), new Prisma.Decimal(100), '1')).toThrow('supera');
  });
  it('interpreta el periodo con fin excluido en hora Colombia y limita la consulta', () => {
    const result = periodoFinanciero('2026-01-01', '2026-01-02');
    expect(result.inicio.toISOString()).toBe('2026-01-01T05:00:00.000Z');
    expect(result.fin.getTime() - result.inicio.getTime()).toBe(86400000);
    expect(() => periodoFinanciero('2026-01-02', '2026-01-02')).toThrow(BadRequestException);
    expect(() => periodoFinanciero('2020-01-01', '2022-01-01')).toThrow(BadRequestException);
  });
  it('escapa comillas y neutraliza fórmulas en CSV', () => {
    expect(campoCsvFinanciero('=SUM(A1)')).toBe('"\'=SUM(A1)"');
    expect(campoCsvFinanciero('Paciente "A"')).toBe('"Paciente ""A"""');
  });
});
