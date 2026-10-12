export const ROLES = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  ODONTOLOGO: 'ODONTOLOGO',
  RECEPCIONISTA: 'RECEPCIONISTA'
} as const;

export type RolUsuario = (typeof ROLES)[keyof typeof ROLES];

