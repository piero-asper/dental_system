# Apariencia del sistema — pendiente de continuar

Punto de pausa: 2026-10-24 · America/Bogota.
Seguimiento: **FE-8, frontend**. El diseño visual sigue abierto; no hay aceptación final del usuario.

## Estado guardado

El panel funcional tiene una primera composición basada en la referencia dental: barra lateral, tarjetas de indicadores, próximas citas, próxima atención y seguimiento. Conserva la conexión con la API y los datos reales del consultorio.

Los colores implementados de azul petróleo y verde azulado no convencieron al usuario. Se exploraron otras paletas mediante muestras independientes de la aplicación. Ninguna de esas muestras se considera diseño aprobado ni cierre del sprint.

## Última propuesta de colores

| Color | Uso mostrado en la última muestra |
|---|---|
| `#0C4A6E` | Barra lateral |
| `#2B6CB0` | Botones principales, selección del menú, enlaces y acentos |
| `#1C3F72` | Títulos, texto principal y tarjeta de próxima atención |
| `#EBF8FF` | Fondo general, selecciones y superficies de apoyo |
| `#FFFFFF` | Tarjetas, formularios y tablas |

Estos colores fueron propuestos por el usuario para ver una muestra. **La paleta sigue pendiente de aprobación y no se ha aplicado al código de la aplicación.** Los nombres y cifras de las muestras son de demostración y no deben convertirse en datos del sistema.

## Próximos pasos al retomar

- [ ] Revisar la última paleta con el usuario y acordar los colores definitivos.
- [ ] Ajustar la apariencia del panel y la navegación hasta obtener aceptación visual.
- [ ] Aplicar la paleta acordada de forma consistente a los módulos, formularios, tablas, estados y acciones.
- [ ] Comprobar legibilidad, contraste, foco de teclado y presentación en escritorio y móvil.
- [ ] Verificar que la presentación conserve los flujos y los datos de la API.
- [ ] Registrar la aceptación antes de cerrar FE-8 e integrar el trabajo.

Este pendiente pertenece al frontend. No cierra los sprints de backend ni sustituye la aceptación funcional de Citas, Historias clínicas o BI. El avance se guarda en la rama de trabajo; no se considera una versión terminada.
