# Operación para un consultorio único

El sistema está diseñado para una sola clínica y una sola cuenta operativa. No se debe reutilizar la misma base de datos para consultorios distintos.

## Antes de publicar una versión

1. Crear y revisar las migraciones de Prisma en desarrollo.
2. Ejecutar las pruebas, lint y compilación.
3. Verificar el estado de migraciones contra producción con `npx prisma migrate status`.
4. Crear una copia de seguridad verificable antes de aplicar migraciones.
5. Aplicar únicamente las migraciones ya versionadas con `npm run prisma:deploy`; nunca usar `prisma migrate dev` ni `prisma db push` sobre datos reales.

## Copias de seguridad

Las copias no están completas hasta que se prueba una restauración. Mantener como mínimo:

- Copia automática diaria desde el proveedor de PostgreSQL/Supabase, con retención acorde al plan contratado.
- Exportación cifrada semanal guardada fuera del equipo y fuera del servidor principal.
- Prueba mensual de restauración en una base aislada, verificando pacientes, historias clínicas, citas, pagos e inventario.
- Registro con fecha, responsable, ubicación de la copia y resultado de la restauración.

No guardar respaldos ni credenciales de PostgreSQL en GitHub, en el repositorio ni en dispositivos compartidos.

## Variables de producción

- `DATABASE_URL` y `DIRECT_URL`: conexión de PostgreSQL, solo en backend.
- `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`: solo en backend.
- `CORS_ORIGIN`: dominio exacto del frontend, sin comodines.
- `VITE_API_URL`, `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`: se inyectan al contenedor del frontend al iniciar; la anon key es pública por diseño, pero las demás claves privadas nunca deben estar allí.

## Despliegue

El frontend se compila una vez y Nginx entrega archivos estáticos. El archivo `runtime-config.js` recibe las variables públicas al iniciar el contenedor; así no es necesario reconstruir la imagen para cambiar dominio o API.
