export const mostrarImporte = (value: string) => new Intl.NumberFormat('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value));
// Vista previa en centésimas enteras; los totales definitivos los calcula la API con Decimal.
export function centesimas(value: string) {
  if (!/^(0|[1-9]\d{0,9})(\.\d{1,2})?$/.test(value)) return null;
  const [entero, fraccion = ''] = value.split('.');
  return BigInt(entero) * 100n + BigInt(fraccion.padEnd(2, '0'));
}
export const decimalTexto = (value: bigint) => `${value / 100n}.${String(value % 100n).padStart(2, '0')}`;
