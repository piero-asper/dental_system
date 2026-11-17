# Entorno local con Podman

El frontend React y la API NestJS se ejecutan juntos con `compose.yaml`. PostgreSQL y la autenticación siguen en Supabase. El arranque no ejecuta migraciones ni crea usuarios o datos.

## Preparación en Windows

1. Instalar Podman o Podman Desktop y habilitar WSL2.
2. Crear e iniciar una máquina si todavía no existe:

   ```powershell
   podman machine init --now dental-system
   ```

   Para una máquina ya creada y detenida: `podman machine start dental-system`. Si ya tienes otra máquina activa, puedes utilizarla.

3. Instalar Compose desde Podman Desktop, en **Settings > Resources > Compose**, y comprobar:

   ```powershell
   podman info
   podman compose version
   ```

4. Mantener `backend/.env` y `frontend/.env` con las variables de sus respectivos `.env.example`. Si no existen, copiar los ejemplos y completar las credenciales de Supabase. Los ejemplos contienen marcadores, no credenciales utilizables.

Las variables se entregan al iniciar los contenedores. Los `.env`, dependencias locales y registros quedan excluidos del contexto de construcción mediante `.dockerignore`. La clave `SUPABASE_SERVICE_ROLE_KEY` pertenece exclusivamente al backend; el frontend usa la clave pública `VITE_SUPABASE_ANON_KEY`.

## Arranque y uso

Desde la raíz del repositorio:

```powershell
podman compose up --build -d
podman compose ps
```

Abrir [el sistema](http://localhost:5173). La API está en [localhost:3000/api](http://localhost:3000/api/health) y Swagger en [api/docs](http://localhost:3000/api/docs).

Los puertos se publican sólo en la interfaz local de la computadora. Compose fija el puerto de la API, los orígenes CORS y `VITE_API_URL` para estas direcciones. La URL de la API es `localhost` porque la consulta el navegador; `backend` sólo se resuelve entre contenedores.

El backend se compila con Node.js 22 y genera Prisma para Linux. Se inicia con dependencias de producción y usuario sin privilegios. El frontend utiliza Vite para este entorno local; las credenciales públicas se leen al arrancar. Ambos incluyen comprobaciones de salud y el frontend espera a que la API responda.

Los archivos de código se copian a las imágenes: después de un cambio, repetir `podman compose up --build -d`. No se montan `node_modules` de Windows dentro de Linux. Este Compose prepara el trabajo local; el despliegue público requiere su configuración de entrega.

## Diagnóstico y parada

```powershell
podman compose logs --tail 100 backend frontend
Invoke-RestMethod http://localhost:3000/api/health
Invoke-RestMethod http://localhost:3000/api/health/dependencias
podman compose stop
```

`health` confirma que la API responde. `health/dependencias` comprueba por separado PostgreSQL y Supabase Auth, sin escribir datos. Si Supabase está pausado, restaurarlo desde su panel y volver a arrancar. Si la API no inicia, consultar sus registros para revisar conectividad y variables.

Para retirar los contenedores y su red local:

```powershell
podman compose down
```

La base de datos remota permanece en Supabase. Para volver a iniciar los mismos contenedores tras `stop`, usar `podman compose up -d`.

Si un puerto está ocupado, cerrar el proceso local anterior que utiliza 3000 o 5173 antes de arrancar. Si falta el proveedor de Compose, instalarlo en Podman Desktop y abrir otra terminal. Podman admite seleccionar explícitamente el ejecutable mediante la variable `PODMAN_COMPOSE_PROVIDER`.

En esta computadora, Compose se instaló desde la distribución oficial de Docker en `%LOCALAPPDATA%\Programs\DockerCompose`, con verificación SHA256 y su carpeta agregada al PATH del usuario. En una terminal que ya estaba abierta antes de instalarlo, seleccionar el proveedor así:

```powershell
$env:PODMAN_COMPOSE_PROVIDER = "$env:LOCALAPPDATA/Programs/DockerCompose/docker-compose.exe"
podman compose version
```

Referencias: [Compose con Podman Desktop](https://podman-desktop.io/docs/compose/running-compose), [Prisma en contenedores](https://www.prisma.io/docs/guides/deployment/docker).
