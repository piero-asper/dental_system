import { Prisma } from '@prisma/client';
export type Franja = { dia: number; inicio: string; fin: string };
export type Intervalo = { inicio: Date; fin: Date };
export const fechaClinica = (value = new Date()) => new Date(value.getTime() - 18000000).toISOString().slice(0, 10);
export const inicioDia = (date: string) => new Date(`${date}T00:00:00-05:00`);
export function restar(base: Intervalo[], ocupados: Intervalo[]) {
  return ocupados.reduce((items, cut) => items.flatMap((i) => cut.fin <= i.inicio || cut.inicio >= i.fin ? [i] : [
    ...(cut.inicio > i.inicio ? [{ inicio: i.inicio, fin: cut.inicio }] : []),
    ...(cut.fin < i.fin ? [{ inicio: cut.fin, fin: i.fin }] : [])
  ]), base);
}
export async function disponibilidad(tx: Pick<Prisma.TransactionClient, 'agendaVersion' | 'agendaBloqueo'>, date: string) {
  const version = await tx.agendaVersion.findFirst({ where: { vigenteDesde: { lte: new Date(date) } }, orderBy: [{ vigenteDesde: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }] });
  const desde = inicioDia(date), hasta = new Date(desde.getTime() + 86400000);
  const bloqueos = await tx.agendaBloqueo.findMany({ where: { createdAt: { lte: hasta }, fechaInicio: { lt: hasta }, fechaFin: { gt: desde }, OR: [{ canceladoAt: null }, { canceladoAt: { gt: desde } }] } });
  const dia = new Date(`${date}T12:00:00Z`).getUTCDay();
  const intervalos: Intervalo[] = version ? (version.intervalos as unknown as Franja[]).filter((i) => i.dia === dia).map((i) => ({
    inicio: new Date(Math.max(new Date(`${date}T${i.inicio}:00-05:00`).getTime(), version.createdAt.getTime())),
    fin: new Date(`${date}T${i.fin}:00-05:00`)
  })).filter((i) => i.fin > i.inicio) : [];
  // La cancelación libera sólo el tramo posterior a su fecha; conserva ocupación histórica del bloqueo.
  const cortes = bloqueos.map((b) => ({ inicio: new Date(Math.max(b.fechaInicio.getTime(), b.createdAt.getTime())), fin: new Date(Math.min(b.fechaFin.getTime(), b.canceladoAt?.getTime() ?? Infinity)) })).filter((i) => i.fin > i.inicio);
  return { version, bloqueos, intervalos: restar(intervalos, cortes) };
}
export async function admite(tx: Pick<Prisma.TransactionClient, 'agendaVersion' | 'agendaBloqueo'>, inicio: Date, fin: Date) {
  if (fechaClinica(inicio) !== fechaClinica(new Date(fin.getTime() - 1))) return false;
  const result = await disponibilidad(tx, fechaClinica(inicio));
  return result.intervalos.some((i) => inicio >= i.inicio && fin <= i.fin);
}
