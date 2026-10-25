// Read-only diagnostics. Never print environment values, tokens or user credentials.
const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const path = require('node:path');
const { parseEnv } = require('node:util');
const backendEnv = path.resolve(__dirname, '../.env');
if (fs.existsSync(backendEnv)) process.loadEnvFile(backendEnv);
// Only known diagnostic codes: never emit an exception message containing configuration.
function reason(error) {
  const code = error?.cause?.code ?? error?.errorCode ?? error?.code;
  const known = ['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ETIMEDOUT', 'ENETUNREACH', 'ECONNRESET', 'UND_ERR_CONNECT_TIMEOUT', 'CERT_HAS_EXPIRED', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'P1000', 'P1001', 'P1002', 'P1017'];
  return known.includes(code) ? ` (${code})` : error?.name === 'TimeoutError' ? ' (tiempo de espera agotado)' : '';
}

const tables = ['pacientes', 'citas', 'historias_clinicas', 'evoluciones_clinicas',
  'odontograma_piezas', 'auditoria_historias_clinicas', 'tratamientos', 'presupuestos',
  'presupuesto_items', 'pagos', 'comprobantes', 'caja_movimientos', 'insumos', 'inventario_movimientos','agenda_versiones','agenda_bloqueos','cita_eventos'];

async function main() {
  const frontendPath = path.resolve(__dirname, '../../frontend/.env');
  const frontend = fs.existsSync(frontendPath) ? parseEnv(fs.readFileSync(frontendPath, 'utf8')) : {};
  console.log('Frontend configurado:', Boolean(frontend.VITE_SUPABASE_URL && frontend.VITE_SUPABASE_ANON_KEY));
  console.log('Frontend y backend usan el mismo proyecto:', frontend.VITE_SUPABASE_URL === process.env.SUPABASE_URL);
  if (!frontend.VITE_SUPABASE_URL || !frontend.VITE_SUPABASE_ANON_KEY || frontend.VITE_SUPABASE_URL !== process.env.SUPABASE_URL) {
    process.exitCode = 1;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (url && key) {
    for (const [name, route] of [['settings', '/settings'], ['users', '/admin/users?page=1&per_page=2']]) {
      try {
        const response = await fetch(`${url.replace(/\/$/, '')}/auth/v1${route}`, {
          headers: { apikey: key, Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(10000)
        });
        if (!response.ok) { console.log(`${name}: HTTP ${response.status}`); process.exitCode = 1; continue; }
        const result = await response.json();
        if (name === 'settings') {
          console.log('Registro publico desactivado:', result.disable_signup === true);
          console.log('Acceso anonimo habilitado:', result.external?.anonymous_users === true);
          console.log('Acceso con correo habilitado:', result.external?.email === true);
          if (!result.disable_signup || result.external?.anonymous_users || !result.external?.email) process.exitCode = 1;
        } else {
          console.log('Cuentas encontradas (limite 2):', result.users?.length ?? 0);
          if (result.users?.length !== 1) process.exitCode = 1;
          const confirmed = result.users?.length === 1 && Boolean(result.users[0].email_confirmed_at);
          console.log('Cuenta operativa con correo confirmado:', confirmed);
          if (!confirmed) process.exitCode = 1;
        }
      } catch (error) { console.log(`${name}: no se pudo conectar a Supabase${reason(error)}.`); process.exitCode = 1; }
    }
  } else { console.log('Falta configurar Supabase en backend.'); process.exitCode = 1; }

  const prisma = new PrismaClient();
  try {
    const rows = await prisma.$queryRaw`
      SELECT c.relname AS tabla, c.relrowsecurity AS rls,
        (SELECT count(*)::int FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = c.relname) AS politicas,
        has_table_privilege('anon', c.oid, 'SELECT,INSERT,UPDATE,DELETE') AS permisos_anon
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
    `;
    const domain = rows.filter((row) => tables.includes(row.tabla));
    console.table(domain);
    if (domain.length !== tables.length || domain.some((row) => !row.rls || row.politicas !== 1 || row.permisos_anon)) {
      process.exitCode = 1;
    }
    const policies = await prisma.$queryRaw`
      SELECT tablename, roles::text AS roles, cmd, qual, with_check
      FROM pg_policies WHERE schemaname = 'public'
    `;
    const domainPolicies = policies.filter((row) => tables.includes(row.tablename));
    const clinicalTables = ['historias_clinicas', 'evoluciones_clinicas', 'odontograma_piezas', 'auditoria_historias_clinicas','agenda_versiones','agenda_bloqueos','cita_eventos'];
    const expected = domainPolicies.length === tables.length && domainPolicies.every((row) =>
      row.roles === '{authenticated}' && row.qual === 'true' &&
      (clinicalTables.includes(row.tablename) ? row.cmd === 'SELECT' && row.with_check === null : row.cmd === 'ALL' && row.with_check === 'true'));
    console.log('Politicas de usuario autenticado verificadas:', expected);
    if (!expected) process.exitCode = 1;
    const clinicalPermissions = await prisma.$queryRaw`
      SELECT relname AS tabla,
        has_table_privilege('authenticated', c.oid, 'INSERT,UPDATE,DELETE,TRUNCATE') AS escritura_directa
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname IN ('historias_clinicas','evoluciones_clinicas','odontograma_piezas','auditoria_historias_clinicas','agenda_versiones','agenda_bloqueos','cita_eventos')
    `;
    const protectedClinicalWrites = clinicalPermissions.length === 7 && clinicalPermissions.every((row) => !row.escritura_directa);
    console.log('Escrituras clinicas directas bloqueadas:', protectedClinicalWrites);
    if (!protectedClinicalWrites) process.exitCode = 1;
  } catch (error) { console.log(`No se pudo inspeccionar RLS en PostgreSQL${reason(error)}.`); process.exitCode = 1; }
  finally { await prisma.$disconnect(); }
}
void main().catch(() => { console.log('No se pudo completar la verificacion.'); process.exitCode = 1; });
