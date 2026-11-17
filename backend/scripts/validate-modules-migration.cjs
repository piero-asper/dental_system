const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const path = require('node:path');
process.loadEnvFile(path.resolve(__dirname, '../.env'));
const prisma = new PrismaClient();
async function main() {
  const migration = process.argv[2] ?? '20261106010000_tratamientos_inventario';
  if (!/^[a-z0-9_]+$/i.test(migration)) throw new Error('Nombre de migración no válido.');
  const sql = fs.readFileSync(path.resolve(__dirname, '../prisma/migrations', migration, 'migration.sql'), 'utf8');
  const rollback = new Error('ROLLBACK_MIGRATION');
  try {
    await prisma.$transaction(async (tx) => {
      await tx.$executeRawUnsafe(`DO $migration$ BEGIN ${sql} END $migration$;`);
      throw rollback;
    }, { timeout: 45000, maxWait: 10000 });
  } catch (error) { if (error !== rollback) throw error; }
  const constraint = migration === '20261106020000_pagos_caja' ? 'pagos_monto_positivo' : 'insumos_existencias_validas';
  const constraints = await prisma.$queryRaw`SELECT 1 FROM pg_constraint WHERE conname = ${constraint}`;
  if (constraints.length) throw new Error('La migración ya existe o no se revirtió.');
  console.log('Migración validada con ROLLBACK; no se modificaron registros ni permisos de forma permanente.');
}
void main().catch((error) => { console.log('No se pudo validar la migración. Código:', error.code ?? 'no disponible'); process.exitCode = 1; }).finally(() => prisma.$disconnect());
