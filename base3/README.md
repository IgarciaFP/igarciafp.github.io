# Plantilla de taller de código (base3)

Variante de [`/base/`](../base/README.md) para ejercicios de HTML, CSS y JavaScript. Mantiene la barra, las incidencias, el guardado y la entrega de la plantilla común, con estas diferencias:

- No se elige idioma: la interfaz está solo en español.
- La identificación pide únicamente el correo del centro.
- Bajo la barra aparece el enunciado, con un botón que despliega el código del ejercicio (HTML, CSS y JavaScript).
- Debajo hay dos paneles: a la izquierda el editor con pestañas HTML, CSS y JavaScript; a la derecha el resultado y una consola.

## Organización

- `index.html`: interfaz (barra, identificación, enunciado, paneles y diálogos).
- `motor/cargador.js`: carga y valida la configuración y el contenido.
- `motor/laboratorio.js`: editor, vista previa, informe y entrega.
- `motor/taller.css`: presentación del enunciado y de los paneles.
- `contenido/config.json`: identidad de la práctica, dominio del correo, claves y destino de entrega.
- `contenido/enunciado.html`: texto de la actividad.
- `contenido/codigo.html`, `codigo.css`, `codigo.js`: código del ejercicio. Pueden quedar vacíos; el desplegable solo muestra los que tienen contenido.

La seguridad, la entrega y los estilos generales se cargan de `/base/motor/` (`seguridad.js`, `entregas.js`, `estilos.css`), igual que en los laboratorios de `/labs/`. El receptor de Apps Script es el de [`/base/receptor/`](../base/receptor/README.md).

## Crear otra práctica

1. Copiar esta carpeta a la ubicación de la nueva práctica.
2. Editar `contenido/config.json`: `id`, `title`, `filePrefix` y `version` propios; claves únicas en `storage`; identificador propio en `format.save`; y `delivery.endpoint` con la URL `/exec` del receptor. Sin esa URL no se puede iniciar un intento.
3. Registrar el `id` y la versión en `CONFIGURACION_` del receptor y volver a ejecutar su configuración.
4. Escribir el enunciado en `contenido/enunciado.html` y el código del ejercicio en los tres archivos `codigo.*`.
5. Elegir en `editor.inicio` cómo empieza el editor: `"codigo"` lo carga con el código del ejercicio y `"vacio"` lo deja en blanco.
6. Al modificar archivos, actualizar los parámetros `v` de `index.html`.

`requireFullName` debe ser `false`: el módulo de seguridad común lo usa para no exigir el nombre.

## Entrega

El informe conserva el formato del resto de laboratorios (versión 3), con tres respuestas abiertas, `html`, `css` y `js`, en estado «pendiente de revisión». Como no se pide el nombre, la columna «Nombre» de la hoja recibe la parte del correo anterior a la arroba. Cada pestaña admite 10 000 caracteres, el máximo por respuesta del receptor.

## Vista previa

- HTML y CSS se actualizan al escribir. El JavaScript solo se ejecuta al pulsar «Ejecutar», para que un bucle a medio escribir no bloquee la página. El HTML que incluya `<script>` propio se trata igual.
- «Actualizar» vuelve a cargar solo el resultado, tal como se mostró por última vez: reinicia su estado sin ejecutar JavaScript nuevo y sin tocar el editor, el reloj, el guardado ni las incidencias.
- Al recuperar una práctica guardada no se ejecuta el JavaScript del alumno hasta que pulse «Ejecutar».
- La consola muestra `console.log`, los errores y las llamadas a `alert`. `confirm` y `prompt` no están disponibles: los diálogos nativos sacan al navegador de la pantalla completa y contarían como incidencia.
- El resultado se ejecuta en un `iframe` aislado, sin acceso a la página, al guardado ni a la entrega. Una política de contenido impide peticiones de red, marcos anidados y envío de formularios; las imágenes, fuentes y medios por `https` sí se cargan. Se puede sustituir con `preview.csp` en `config.json`.
- Los enlaces están desactivados y, si el marco navega a otra página, se sustituye por un aviso.

Como en `/base/`, los controles son disuasorios y no constituyen una plataforma de examen seguro. Un bucle infinito ejecutado con «Ejecutar» puede bloquear la pestaña: el trabajo queda en el guardado local, pero solo se reanuda desde un archivo de «Guardar y pausar».

## Comprobación

Servir desde la raíz del repositorio, porque se usan rutas `/base/motor/`:

```sh
python3 -m http.server 8000
```

Abrir `http://localhost:8000/base3/`.
