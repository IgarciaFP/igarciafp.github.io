# Laboratorio de taller de código (base3)

Variante de [`/base/`](../base/README.md) para ejercicios de HTML, CSS y JavaScript. Mantiene la barra, las incidencias y el guardado de la plantilla común, con estas diferencias:

- Hay un solo laboratorio para todas las actividades. La actividad y su módulo se eligen en la dirección: `…/base3/?a=MODULO/ACTIVIDAD`, con módulo `diw`, `dwec` o `ssii`.
- No se elige idioma (solo español) y la identificación pide únicamente el correo del centro.
- Bajo la barra aparece el enunciado, en una tarjeta desplegable que empieza abierta.
- Debajo hay dos paneles: a la izquierda el editor con pestañas HTML, CSS y JavaScript, que empiezan con el código de partida y tienen un botón para restaurarlo, más una pestaña TXT para notas; a la derecha el resultado y una consola.
- La entrega, por defecto, es un único archivo TXT descargado con el código modificado; el envío a Google Sheets es opcional.

Las instrucciones detalladas están en el comentario inicial de `index.html`.

## Organización

- `index.html`: interfaz (barra, identificación, enunciado, paneles y diálogos).
- `motor/cargador.js`: lee el parámetro `a`, carga la actividad y valida la configuración.
- `motor/laboratorio.js`: editor, vista previa, informe y entrega.
- `motor/taller.css`: presentación del enunciado y de los paneles.
- `contenido/config.json`: ajustes comunes a todas las actividades (dominio del correo y entrega).
- `actividades/MODULO/ACTIVIDAD/`: una carpeta por actividad.
- `profesor.html`: página del profesor para revisar los archivos de entrega.
- `servidor/`: Cloudflare Worker que controla la red y el horario y sella las entregas ([guía](servidor/README.md)).
- `receptor/`: Apps Script que escribe las entregas en la hoja de cálculo del profesor ([guía](receptor/README.md)).

La seguridad, la entrega y los estilos generales se cargan de `/base/motor/` (`seguridad.js`, `entregas.js`, `estilos.css`), igual que en los laboratorios de `/labs/`.

## Crear una actividad

1. Crear la carpeta `actividades/diw/NOMBRE/` (o `dwec`, `ssii`). El nombre solo admite minúsculas, números y guiones.
2. Añadir `actividad.json` con `title` y `version`, y `enunciado.html` con el texto.
3. Añadir, si hacen falta, `codigo.html`, `codigo.css` y `codigo.js`. Los tres son opcionales: la pestaña de un archivo que no existe empieza vacía.
4. Dar a los alumnos la dirección `…/base3/?a=diw/NOMBRE`.

El identificador de la práctica (`DIW-NOMBRE`), las claves de guardado y los nombres de archivo se derivan del módulo y de la carpeta. Sin parámetro, o si la actividad no existe, la página muestra «No se encuentra la actividad.».

Ejemplos incluidos: `?a=diw/tarjeta` (con los tres archivos) y `?a=dwec/contador` (solo JavaScript).

## Entrega

Por defecto (`"delivery": { "type": "archivo" }`) no hace falta receptor: al pulsar «Entregar» se descarga un único archivo `MÓDULO · NOMBRE DE LA ACTIVIDAD_USUARIO.txt` (el usuario es el del correo, sin dominio) con el código modificado, comprimido con gzip y codificado en base64 para URL, precedido del prefijo `format.report`. El alumno lo hace llegar al profesor por el medio que se le indique.

Con `"type": "apps-script"` y `endpoint`, además de la descarga, la entrega se envía al receptor de `receptor/`, que añade una fila en la pestaña «Entregas» de la hoja del profesor (columnas A a I).

## Control de red y horario

Con `control.servidor` en `contenido/config.json`, las actividades solo se abren desde la red del centro y en el horario de su módulo, y cada entrega lleva un sello del servidor con la IP y la hora (campo `sello` del informe). Las entregas fuera de red o de horario se generan igualmente, marcadas. Ver [servidor/README.md](servidor/README.md).

En ambos casos el informe conserva el formato del resto de laboratorios (versión 3), añade `module` y `activity`, e incluye solo las pestañas que difieren del código de partida, como respuestas abiertas `html`, `css`, `js` o `txt`; la lista `modified` las enumera. La respuesta `txt` son las notas del alumno, envueltas en un comentario `/* … */`. Si no se modificó nada, hay una única respuesta vacía `sin-cambios`. Cada pestaña admite 10 000 caracteres.

Para revisar las entregas, abrir `profesor.html` y arrastrar los archivos TXT, aunque sean de actividades distintas (también admite pegar el texto de la columna «ENTREGA completa» de la hoja, o llegar desde su enlace «Probar código»): muestra de cada alumno la actividad, el código con los cambios respecto al de partida resaltados, el resultado, la consola, el tiempo, las incidencias y el registro del intento, y avisa si un archivo ha sido alterado, es de una actividad que no está en el sitio o de otra versión. Los archivos se leen en el navegador y no se envían a ningún sitio.

Para leer un archivo de entrega sin esa página:

```python
import base64, gzip, json, sys

texto = open(sys.argv[1], encoding="utf-8").read().strip()[len("SSII3G."):]
contenido = gzip.decompress(base64.urlsafe_b64decode(texto + "=" * (-len(texto) % 4))).decode()
informe = json.loads(contenido.rsplit("\nCódigo de comprobación: ", 1)[0])
print(informe["exam"], informe["email"], informe["seconds"], "s · incidencias:", informe["incidents"], "· modificado:", informe["modified"])
for respuesta in informe["answers"]:
    print("\n=====", respuesta["question"])
    print(respuesta["answer"])
```

El archivo de «Guardar y pausar» (`practica-….txt`) es distinto: guarda el intento completo para poder recuperarlo.

## Vista previa

- HTML y CSS se actualizan al escribir. El JavaScript solo se ejecuta al pulsar «Ejecutar», para que un bucle a medio escribir no bloquee la página. El HTML que incluya `<script>` propio se trata igual.
- «Actualizar» vuelve a cargar solo el resultado, tal como se mostró por última vez: reinicia su estado sin ejecutar JavaScript nuevo y sin tocar el editor, el reloj, el guardado ni las incidencias.
- Al recuperar una práctica guardada no se ejecuta el JavaScript del alumno hasta que pulse «Ejecutar».
- La consola muestra `console.log`, los errores y las llamadas a `alert`. `confirm` y `prompt` no están disponibles: los diálogos nativos sacan al navegador de la pantalla completa y contarían como incidencia.
- El resultado se ejecuta en un `iframe` aislado, sin acceso a la página, al guardado ni a la entrega. Una política de contenido impide peticiones de red, marcos anidados y envío de formularios; las imágenes, fuentes y medios por `https` sí se cargan. Se puede sustituir con `preview.csp` en `contenido/config.json`.
- Los enlaces están desactivados y, si el marco navega a otra página, se sustituye por un aviso.

Como en `/base/`, los controles son disuasorios y no constituyen una plataforma de examen seguro. Un bucle infinito ejecutado con «Ejecutar» puede bloquear la pestaña: el trabajo queda en el guardado local, pero solo se reanuda desde un archivo de «Guardar y pausar».

## Comprobación

Servir desde la raíz del repositorio, porque se usan rutas `/base/motor/`:

```sh
python3 -m http.server 8000
```

Abrir `http://localhost:8000/base3/?a=diw/tarjeta`.
