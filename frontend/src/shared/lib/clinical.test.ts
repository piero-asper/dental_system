import { describe, expect, it } from 'vitest';
import { addDays, agendaRange, clinicDate, clinicInput, clinicISO } from './clinical';
describe('fechas de la clinica', () => {
  it('respeta UTC-5 al cruzar medianoche', () => { expect(clinicDate('2026-10-18T03:00:00Z')).toBe('2026-10-17'); expect(clinicInput('2026-10-18T03:00:00Z')).toBe('2026-10-17T22:00'); expect(clinicISO('2026-10-17T22:00')).toBe('2026-10-18T03:00:00.000Z'); });
  it('calcula semana de lunes a domingo incluso al cambiar de mes', () => { expect(agendaRange('2026-11-01', true)).toEqual({ first: '2026-10-26', desde: '2026-10-26T05:00:00.000Z', hasta: '2026-11-02T05:00:00.000Z' }); expect(addDays('2026-12-31', 1)).toBe('2027-01-01'); });
});
