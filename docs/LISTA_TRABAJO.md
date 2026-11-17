# Lista de trabajo acordada

Fecha: 2026-11-05 · America/Bogota.

## 1. Entender Podman y Postman

El entorno local de este proyecto utiliza **Podman**. El repositorio no necesita Postman para arrancar.

**Podman ejecuta el programa:**

1. Windows inicia la máquina Linux `dental-system` mediante WSL2.
2. Podman utiliza una imagen para la API NestJS y otra para la interfaz React. Cada imagen contiene el código y las dependencias de esa parte.
3. `compose.yaml` describe los dos contenedores, sus puertos, variables y comprobaciones de salud. `podman compose` utiliza el proveedor Compose instalado para coordinarlos.
4. La API se publica en `http://localhost:3000/api`. La interfaz se publica en `http://localhost:5173`.
5. El navegador abre la interfaz y esta llama a la API para consultar o guardar datos.
6. La API consulta PostgreSQL en Supabase. La interfaz utiliza Supabase Auth para el acceso. Si el proyecto de Supabase está pausado, hay que reactivarlo para usar el sistema completo.
7. Al modificar el código hay que reconstruir las imágenes y volver a arrancar los contenedores. Los datos de la clínica permanecen en Supabase.

Arranque desde la raíz del proyecto:

```powershell
podman machine start dental-system
$env:PODMAN_COMPOSE_PROVIDER = "$env:LOCALAPPDATA/Programs/DockerCompose/docker-compose.exe"
podman compose up --build -d
podman compose ps
```

Si la máquina ya está iniciada, se omite la primera línea. Para detener el programa: `podman compose stop`.

**Postman prueba la API:**

1. Se crea una petición HTTP y se elige el método, por ejemplo `GET`.
2. Se introduce `http://localhost:3000/api/health`.
3. Se pulsa **Send** para enviar la petición al backend que está ejecutándose.
4. Una respuesta `200` con `status: "ok"` confirma que responde la API.
5. `GET http://localhost:3000/api/health/dependencias` comprueba además base de datos y autenticación.
6. Las rutas privadas, por ejemplo `/api/pacientes`, necesitan un token de sesión del usuario. Sin él deben devolver `401`.

Postman puede ser útil para diagnosticar rutas sin usar las pantallas. Swagger ya ofrece otra forma de explorar la API en `http://localhost:3000/api/docs`.

Referencias: [Compose en Podman](https://docs.podman.io/en/latest/markdown/podman-compose.1.html), [recuperación de contraseña de Supabase](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).

## 2. Recuperar el acceso

- El usuario reactivó el proyecto de Supabase durante esta sesión.
- Añadidas las pantallas **Recuperar acceso** y **Establecer contraseña**, con enlace desde el login.
- Se solicita un correo para la cuenta existente. El usuario abre el enlace y escribe/confirma su contraseña nueva.
- El enlace vuelve a `http://localhost:5173/restablecer-contrasena`, autorizado en Supabase. El programa debe estar ejecutándose en esa computadora.
- Los tokens se retiran de la dirección antes de verificarse. Los enlaces vencidos y los fallos de conexión muestran instrucciones para reintentar.
- La contraseña no cambia por el mero envío del correo. El usuario completó el paso de contraseña durante la sesión y posteriormente inició sesión; se comprobó la carga del panel autenticado.
- En esta sesión Supabase devolvió HTTP 429 al solicitar el correo. Se abrió una recuperación directa de la cuenta existente mediante un puente local efímero de un solo uso, sin imprimir ni guardar el enlace de Supabase. La pantalla de contraseña se verificó y se entregó al usuario para que escriba y confirme la nueva contraseña.

## 3. Avanzar módulos y mejorarlos después

Primera implementación de esta sesión:

- **Tratamientos:** catálogo, códigos únicos, precios base, búsqueda, paginación, edición y activación/desactivación.
- **Presupuestos:** paciente activo, tratamientos activos, cantidades, precio acordado, piezas FDI opcionales, notas, descuento y totales decimales calculados en servidor. Los precios anteriores se conservan al modificar el catálogo.
- **Estados:** borrador → enviado → aceptado/rechazado; aceptado → finalizado. Solo los borradores admiten cambios de contenido. “Enviado” registra el estado administrativo y no envía correos.
- **Inventario:** insumos, unidades, mínimo, filtro de reposición, entradas, salidas y ajustes con motivo; existencias e historial se guardan en una transacción. Un ajuste indica la existencia final contada, admite cero y conserva el valor anterior.
- **Integridad:** versiones para evitar sobrescrituras y repetición de movimientos, bloqueo transaccional por registro, rechazo de stock negativo y de importes fuera de rango. Las escrituras directas de estos módulos desde Supabase Auth están bloqueadas; el historial de inventario es inmutable.

Pendientes de aceptación: recorrido con la cuenta real, revisión de escritorio/móvil y ajuste de reglas con la clínica. No se cargan catálogos ni existencias de ejemplo en la base real.

Actualización posterior de esta sesión: **Pagos** implementado con abonos, saldos, recibos internos REC, anulaciones y caja. Panel y Reportes incluyen datos financieros reales. El menú lateral se agrupó en Resumen, Pacientes y citas, Atención clínica, Pagos, Inventario y Ayuda. Véase la [guía completa de flujos](GUIA_FLUJOS.md), también disponible en el programa. Se conserva pendiente la aceptación con la clínica, la apariencia definitiva y la preparación de producción.
