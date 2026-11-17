/* Limpieza local explícita: conserva esquema, migraciones y usuarios de autenticación. */
const { PrismaClient } = require('@prisma/client');

if (process.env.CONFIRMAR_LIMPIEZA_DATOS !== 'SI') {
  throw new Error('Operación cancelada. Usa CONFIRMAR_LIMPIEZA_DATOS=SI solo para reiniciar datos de prueba.');
}

const prisma = new PrismaClient();
const tablas = [
  'pacientes', 'citas', 'historias_clinicas', 'evoluciones_clinicas', 'odontograma_piezas',
  'auditoria_historias_clinicas', 'agenda_versiones', 'agenda_bloqueos', 'cita_eventos',
  'tratamientos', 'presupuestos', 'presupuesto_items', 'pagos', 'comprobantes',
  'caja_movimientos', 'secuencias_comprobantes', 'insumos', 'inventario_movimientos'
];

async function main() {
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tablas.map((t) => `public.${t}`).join(', ')} RESTART IDENTITY CASCADE`);
  const conteos = await Promise.all(tablas.map((tabla) => prisma.$queryRawUnsafe(`SELECT count(*)::int AS total FROM public.${tabla}`)));
  if (conteos.some(([fila]) => fila.total !== 0)) throw new Error('No se pudieron eliminar todos los datos de prueba.');
  console.log(`Base limpia: ${tablas.length} tablas de datos en cero. Usuarios de acceso y migraciones conservados.`);
}

main().finally(() => prisma.$disconnect());
