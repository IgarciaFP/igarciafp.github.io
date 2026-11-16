# Plantilla de taller de código (base3)

Variante de [`/base/`](../base/README.md) para ejercicios de HTML, CSS y JavaScript. Mantiene la barra, las incidencias, el guardado y la entrega de la plantilla común, con estas diferencias:

- No se elige idioma: la interfaz está solo en español.
- La identificación pide únicamente el correo del centro.
- Bajo la barra aparece el enunciado de la actividad, en una tarjeta desplegable que empieza abierta.
- Debajo hay dos paneles: a la izquierda el editor con pestañas HTML, CSS y JavaScript, que empiezan con el código de partida y tienen un botón para restaurarlo, más una pestaña TXT para notas; a la derecha el resultado y una consola.
- La entrega, por defecto, es un único archivo TXT descargado con el código modificado; el envío a Google Sheets es opcional.

Las instrucciones detalladas para preparar una práctica están en el comentario inicial de `index.html`.

## Organización

- `index.html`: interfaz (barra, identificación, enunciado, paneles y diálogos).
- `motor/cargador.js`: carga y valida la configuración y el contenido.
- `motor/laboratorio.js`: editor, vista previa, informe y entrega.
- `motor/taller.css`: presentación del enunciado y de los paneles.
- `profesor.html`: página del profesor para revisar los archivos de entrega.
- `contenido/config.json`: identidad de la práctica, dominio del correo, claves y destino de entrega.
- `contenido/enunciado.html`: texto de la actividad.
- `contenido/codigo.html`, `codigo.css`, `codigo.js`: código de partida de cada pestaña del editor. Pueden quedar vacíos, pero deben existir.

La seguridad, la entrega y los estilos generales se cargan de `/base/motor/` (`seguridad.js`, `entregas.js`, `estilos.css`), igual que en los laboratorios de `/labs/`. El receptor de Apps Script es el de [`/base/receptor/`](../base/receptor/README.md).

## Crear otra práctica

1. Copiar esta carpeta a la ubicación de la nueva práctica.
2. Editar `contenido/config.json`: `id`, `title`, `filePrefix` y `version` propios; claves únicas en `storage`; e identificador propio en `format.save`.
3. Elegir la entrega en `delivery` (ver «Entrega»). Si se usa el receptor, registrar el `id` y la versión en su `CONFIGURACION_` y volver a ejecutar su configuración.
4. Escribir el enunciado en `contenido/enunciado.html` y el código de partida en los tres archivos `codigo.*`.
5. Al modificar archivos, actualizar los parámetros `v` de `index.html`.

`requireFullName` debe ser `false`: el módulo de seguridad común lo usa para no exigir el nombre.

## Entrega

Por defecto (`"delivery": { "type": "archivo" }`) no hace falta receptor: al pulsar «Entregar» se descarga un único archivo `NOMBRE DE LA ACTIVIDAD_USUARIO.txt` (el `title` de la práctica y el usuario del correo sin dominio) con el código modificado, comprimido con gzip y codificado en base64 para URL, precedido del prefijo `format.report`. El alumno lo hace llegar al profesor por el medio que se le indique.

Con `"type": "apps-script"` y `endpoint`, además de la descarga, la entrega se envía al receptor de Google Sheets. En la hoja, la columna «Nombre» recibe la parte del correo anterior a la arroba, porque no se pide el nombre.

En ambos casos el informe conserva el formato del resto de laboratorios (versión 3) e incluye solo las pestañas que difieren del código de partida, como respuestas abiertas `html`, `css`, `js` o `txt`; la lista `modified` las enumera. La respuesta `txt` son las notas del alumno, envueltas en un comentario `/* … */`. Si no se modificó nada, hay una única respuesta vacía `sin-cambios`, porque el receptor exige al menos una. Cada pestaña admite 10 000 caracteres, el máximo por respuesta del receptor.

Para revisar las entregas, abrir `profesor.html` de esta misma carpeta y arrastrar los archivos TXT: muestra de cada alumno el código, con los cambios respecto al código de partida resaltados, el resultado, la consola, el tiempo, las incidencias y el registro del intento, y avisa si un archivo ha sido alterado o es de otra práctica o versión. Los archivos se leen en el navegador y no se envían a ningún sitio. La página usa `contenido/config.json` y `contenido/codigo.*` de su carpeta, así que cada práctica tiene la suya.

Para leer un archivo de entrega sin esa página:

```python
import base64, gzip, json, sys

texto = open(sys.argv[1], encoding="utf-8").read().strip()[len("SSII3G."):]
contenido = gzip.decompress(base64.urlsafe_b64decode(texto + "=" * (-len(texto) % 4))).decode()
informe = json.loads(contenido.rsplit("\nCódigo de comprobación: ", 1)[0])
print(informe["email"], informe["seconds"], "s · incidencias:", informe["incidents"], "· modificado:", informe["modified"])
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
- El resultado se ejecuta en un `iframe` aislado, sin acceso a la página, al guardado ni a la entrega. Una política de contenido impide peticiones de red, marcos anidados y envío de formularios; las imágenes, fuentes y medios por `https` sí se cargan. Se puede sustituir con `preview.csp` en `config.json`.
- Los enlaces están desactivados y, si el marco navega a otra página, se sustituye por un aviso.

Como en `/base/`, los controles son disuasorios y no constituyen una plataforma de examen seguro. Un bucle infinito ejecutado con «Ejecutar» puede bloquear la pestaña: el trabajo queda en el guardado local, pero solo se reanuda desde un archivo de «Guardar y pausar».

## Comprobación

Servir desde la raíz del repositorio, porque se usan rutas `/base/motor/`:

```sh
python3 -m http.server 8000
```

Abrir `http://localhost:8000/base3/`.
