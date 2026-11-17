// Solicita un correo para la única cuenta existente. No imprime enlaces, tokens ni contraseñas.
const path = require('node:path');
process.loadEnvFile(path.resolve(__dirname, '../.env'));
const redirectTo = 'http://localhost:5173/restablecer-contrasena';
async function main() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('configuracion');
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };
  const response = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=2`, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) { console.log('Consulta de cuenta: HTTP', response.status); process.exitCode = 1; return; }
  const { users } = await response.json();
  if (users?.length !== 1 || !users[0].email || !users[0].email_confirmed_at) {
    console.log('Se requiere una única cuenta confirmada para solicitar la recuperación.'); process.exitCode = 1; return;
  }
  // El servidor aplica su lista de redirecciones también al generar el enlace.
  const generated = await fetch(`${url}/auth/v1/admin/generate_link`, { method: 'POST', headers,
    body: JSON.stringify({ type: 'recovery', email: users[0].email, redirect_to: redirectTo }), signal: AbortSignal.timeout(15000) });
  if (!generated.ok) { console.log('Verificación del enlace: HTTP', generated.status); process.exitCode = 1; return; }
  const result = await generated.json();
  const target = result.redirect_to ?? (result.action_link ? new URL(result.action_link).searchParams.get('redirect_to') : null);
  if (target !== redirectTo) {
    console.log('Falta autorizar esta URL de redirección en Supabase Auth:', redirectTo);
    console.log('No se solicitó el correo. La contraseña actual se conserva.'); process.exitCode = 2; return;
  }
  if (process.argv.includes('--open')) {
    // Puente efímero de un solo uso. Nunca escribe ni imprime el enlace de Supabase.
    const { createServer } = require('node:http');
    const { randomBytes } = require('node:crypto');
    const route = `/recuperar/${randomBytes(16).toString('hex')}`;
    if (!result.action_link || new URL(result.action_link).origin !== new URL(url).origin) throw new Error('destino');
    let consumed = false;
    const server = createServer((request, reply) => {
      reply.setHeader('Cache-Control', 'no-store');
      reply.setHeader('Referrer-Policy', 'no-referrer');
      if (request.method !== 'GET' || request.url !== route || consumed) { reply.writeHead(404).end(); return; }
      consumed = true;
      reply.writeHead(302, { Location: result.action_link }).end();
      server.close(); clearTimeout(expiry);
    });
    const expiry = setTimeout(() => server.close(), 10 * 60 * 1000);
    server.on('error', () => { clearTimeout(expiry); console.log('No se pudo abrir el puente local de recuperación.'); process.exitCode = 1; });
    server.listen(5175, '127.0.0.1', () => console.log(`Abrir una vez en esta computadora: http://127.0.0.1:5175${route}`));
    return;
  }
  if (!process.argv.includes('--send')) { console.log('Cuenta confirmada y destino de recuperación correcto. No se solicitó correo.'); return; }
  const recovery = await fetch(`${url}/auth/v1/recover?redirect_to=${encodeURIComponent(redirectTo)}`, { method: 'POST', headers,
    body: JSON.stringify({ email: users[0].email }), signal: AbortSignal.timeout(15000) });
  if (!recovery.ok) { console.log('Solicitud de recuperación: HTTP', recovery.status); process.exitCode = 1; return; }
  console.log('Supabase aceptó la solicitud de correo para la cuenta operativa. La contraseña se cambia al completar el enlace.');
}
void main().catch(() => { console.log('No se pudo completar la recuperación. Comprueba la conexión con Supabase.'); process.exitCode = 1; });
