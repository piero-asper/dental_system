# Postman y la API local

Postman **no ejecuta** el sistema ni reemplaza al navegador. Podman ejecuta el frontend y la API; Postman es una herramienta opcional para consultar y comprobar la API HTTP de forma aislada.

La fuente de verdad de las rutas y los cuerpos de petición es Swagger: con el sistema iniciado, abrir `http://localhost:3000/api/docs`. La especificación OpenAPI está disponible en `http://localhost:3000/api/docs-json`.

## Uso recomendado

1. Iniciar el sistema con `podman compose up --build -d` desde la raíz.
2. En Postman, crear el entorno local `Dental local` con:

   | Variable | Valor local |
   | --- | --- |
   | `baseUrl` | `http://localhost:3000/api` |
   | `accessToken` | Vacío inicialmente; valor local y seguro solo si se necesita una ruta privada |

3. Importar `http://localhost:3000/api/docs-json` como una colección OpenAPI. Así la colección parte de los DTO y rutas reales de la API, no de peticiones escritas a mano.
4. Crear una carpeta `Diagnóstico` con peticiones de solo lectura:

   - `GET {{baseUrl}}/health` → debe responder `200` y `status: "ok"`.
   - `GET {{baseUrl}}/health/dependencias` → comprueba API, PostgreSQL y Supabase Auth sin modificar registros.

5. Para una ruta protegida, configurar la colección o la petición con **Authorization → Bearer Token** y usar `{{accessToken}}`. Una solicitud sin token debe devolver `401`.

## Reglas de seguridad

- No copiar `SUPABASE_SERVICE_ROLE_KEY`, archivos `.env`, contraseñas ni tokens a una colección compartida.
- No guardar datos clínicos reales en ejemplos, scripts ni ejecuciones compartidas.
- Mantener `accessToken` como variable local/segura y dejar su valor compartido vacío.
- Usar Swagger para explorar manualmente; reservar Postman para diagnóstico, reproducir un fallo HTTP o ejecutar una colección de comprobaciones no destructivas.

## Comprobaciones repetibles

Añadir estas pruebas en la pestaña **Tests** de las dos peticiones de diagnóstico:

```javascript
pm.test('responde correctamente', () => pm.response.to.have.status(200));
pm.test('devuelve JSON', () => pm.expect(pm.response.headers.get('content-type')).to.include('application/json'));
```

Ejecutar esa carpeta con Collection Runner después de levantar contenedores o cambiar configuración. No debe usarse una colección de diagnóstico para crear, editar o borrar pacientes, citas, pagos o historias clínicas reales.

## Cuándo usar cada herramienta

| Necesidad | Herramienta |
| --- | --- |
| Usar el sistema de la clínica | Navegador (`http://localhost:5173`) |
| Ver rutas, DTO y probar una llamada puntual | Swagger (`/api/docs`) |
| Repetir diagnóstico HTTP, comprobar códigos o aislar un fallo del frontend | Postman |
| Ejecutar pruebas del proyecto | Jest/Vitest y las pruebas de base de datos del repositorio |

Postman admite importar una definición OpenAPI, usar entornos y ejecutar colecciones; el enfoque anterior usa esas capacidades sin convertir Postman en una segunda fuente de verdad ni exponer secretos. Referencias: [importar OpenAPI](https://learning.postman.com/docs/integrations/available-integrations/working-with-openAPI/), [entornos](https://learning.postman.com/docs/use/send-requests/variables/managing-environments/), [Bearer Token](https://learning.postman.com/docs/use/send-requests/authorization/authorization-types/) y [Collection Runner](https://learning.postman.com/docs/tests-and-scripts/running-collections/intro-to-collection-runs/).
