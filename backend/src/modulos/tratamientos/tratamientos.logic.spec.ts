import { BadRequestException, ConflictException } from '@nestjs/common';
import { EstadoPresupuesto } from '@prisma/client';
import { calcularPresupuesto, validarTransicion } from './tratamientos.logic';
const item = (precioUnitario: string, cantidad = 1) => ({ tratamientoId: 't', cantidad, precioUnitario });
describe('importes y estados de presupuesto', () => {
  it('conserva centésimas exactas y aplica un descuento de importe fijo', () => {
    const result = calcularPresupuesto([item('0.10', 3), item('0.20')], '0.05');
    expect(result.subtotal.toFixed(2)).toBe('0.50');
    expect(result.total.toFixed(2)).toBe('0.45');
    expect(result.items[0].precioUnitario.toFixed(2)).toBe('0.10');
  });
  it('admite un presupuesto sin saldo cuando el descuento coincide con el subtotal', () => {
    expect(calcularPresupuesto([item('100')], '100').total.isZero()).toBe(true);
  });
  it('rechaza descuento excesivo y desbordamientos del total', () => {
    expect(() => calcularPresupuesto([item('10')], '11')).toThrow(BadRequestException);
    expect(() => calcularPresupuesto([item('9999999999.99', 2)], '0')).toThrow(BadRequestException);
    expect(() => calcularPresupuesto([item('9999999999.99'), item('1')], '0')).toThrow(BadRequestException);
  });
  it('solo permite las transiciones declaradas, sin reabrir estados finales', () => {
    const allowed = new Set(['BORRADOR:ENVIADO', 'ENVIADO:ACEPTADO', 'ENVIADO:RECHAZADO', 'ACEPTADO:FINALIZADO']);
    for (const from of Object.values(EstadoPresupuesto)) for (const to of Object.values(EstadoPresupuesto)) {
      if (allowed.has(`${from}:${to}`)) expect(() => validarTransicion(from, to)).not.toThrow();
      else expect(() => validarTransicion(from, to)).toThrow(ConflictException);
    }
  });
});
