export function errorMessage(error: unknown) {
  return error instanceof Error && error.name !== 'TypeError' ? error.message : 'No se pudo conectar con el servidor. Intenta nuevamente.';
}
// Hora de Colombia: UTC-5, independiente de la zona del navegador.
export const clinicDate = (iso = new Date().toISOString()) => new Date(new Date(iso).getTime() - 5 * 3600000).toISOString().slice(0, 10);
export const clinicInput = (iso: string) => new Date(new Date(iso).getTime() - 5 * 3600000).toISOString().slice(0, 16);
export const clinicISO = (value: string) => new Date(`${value}:00-05:00`).toISOString();
export const formatDate = (iso: string) => new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium' }).format(new Date(iso));
export const formatDateTime = (iso: string) => new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
export const formatTime = (iso: string) => new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
export function addDays(date: string, days: number) { const result = new Date(`${date}T12:00:00Z`); result.setUTCDate(result.getUTCDate() + days); return result.toISOString().slice(0, 10); }
export function agendaRange(date: string, week: boolean) {
  const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
  const first = week ? addDays(date, -(weekday === 0 ? 6 : weekday - 1)) : date;
  return { first, desde: new Date(`${first}T00:00:00-05:00`).toISOString(), hasta: new Date(`${addDays(first, week ? 7 : 1)}T00:00:00-05:00`).toISOString() };
}
