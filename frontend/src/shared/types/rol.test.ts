import { describe, expect, it } from 'vitest';
import { RolUsuario } from './rol';

describe('RolUsuario', () => {
  it('allows expected business roles', () => {
    const roles: RolUsuario[] = ['ADMINISTRADOR', 'ODONTOLOGO', 'RECEPCIONISTA'];

    expect(roles).toHaveLength(3);
  });
});
