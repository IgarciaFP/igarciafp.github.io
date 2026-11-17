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
- `contenido/config.json`: ajustes comunes a todas las actividades (dominio del correo, control y entrega).
- `contenido/esqueleto.html`: documento HTML con el que empieza la pestaña HTML cuando la actividad no aporta el suyo.
- `actividades/MODULO/ACTIVIDAD/`: una carpeta por actividad.
- `profesor.html`: página del profesor para revisar los archivos de entrega.
- `servidor/`: Cloudflare Worker que controla la red y el horario y sella las entregas ([guía](servidor/README.md)).
- `receptor/`: Apps Script que escribe las entregas en la hoja de cálculo del profesor ([guía](receptor/README.md)).

La seguridad, la entrega y los estilos generales se cargan de `/base/motor/` (`seguridad.js`, `entregas.js`, `estilos.css`), igual que en los laboratorios de `/labs/`.

## Crear una actividad

1. Crear la carpeta `actividades/diw/NN-MM-nombre/` (o `dwec`, `ssii`), con NN el número de tema y MM el de la actividad, por ejemplo `actividades/diw/02-01-menu-responsive/`. Solo admite minúsculas, números y guiones.
2. Añadir `actividad.json` con `title` (`"02-01-Menú responsive"`) y `version`, y `enunciado.html` con el texto.
3. Añadir, si hacen falta, `codigo.html`, `codigo.css` y `codigo.js`. Los tres son opcionales: las pestañas CSS y JavaScript sin archivo empiezan vacías, y la pestaña HTML sin archivo (o con el archivo vacío) empieza con el esqueleto de `contenido/esqueleto.html`.
4. Dar a los alumnos la dirección `…/base3/?a=diw/02-01-menu-responsive`.

Las actividades se nombran `MÓDULO NN-MM-Nombre de la actividad`: el alumno ve «DIW02-01-Menú responsive» y en la hoja el módulo y el nombre van en columnas separadas. El identificador de la práctica (`DIW-02-01-MENU-RESPONSIVE`), las claves de guardado y los nombres de archivo se derivan del módulo y de la carpeta. Sin parámetro, o si la actividad no existe, la página muestra «No se encuentra la actividad.».

Ejemplos incluidos: `?a=diw/01-01-tarjeta-de-presentacion` (con los tres archivos) y `?a=dwec/01-01-contador-de-pulsaciones` (solo JavaScript).

## Entrega

Por defecto (`"delivery": { "type": "archivo" }`) no hace falta receptor: al pulsar «Entregar» se descarga un único archivo `MÓDULO NN-MM-NOMBRE_USUARIO.txt` (el usuario es el del correo, sin dominio) con el código modificado, comprimido con gzip y codificado en base64 para URL, precedido del prefijo `format.report`. El alumno lo hace llegar al profesor por el medio que se le indique.

Con `"type": "apps-script"` y `endpoint`, además de la descarga, la entrega se envía al receptor de `receptor/`, que añade una fila en la pestaña «Entregas» de la hoja del profesor (columnas A a I).

## Control de red y horario

Con `control.servidor` en `contenido/config.json`, cada entrega lleva un sello del servidor con la IP y la hora (campo `sello` del informe). Actualmente `control.restringirAcceso` es `false`: se permite abrir y realizar las prácticas fuera de red y horario, dejando constancia en Incidencias. La columna IP contiene solo la dirección, o queda vacía si no hay un sello utilizable. Para activar más adelante el bloqueo al abrir, cambiar `control.restringirAcceso` a `true`. Ver [servidor/README.md](servidor/README.md).

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

Abrir `http://localhost:8000/base3/?a=diw/01-01-tarjeta-de-presentacion`.

## Plazo para regresar y tamaño del resultado

La barra muestra solo los controles. Arrastra la esquina inferior derecha del resultado para ajustar su ancho y alto; el CSS responde al ancho del propio resultado.

`guard.returnSeconds` en `contenido/config.json` fija el plazo de regreso (actualmente 10 segundos acumulados por práctica). Al perder pantalla completa, visibilidad o foco, se bloquea el editor y aparece una cuenta atrás roja al volver a la página. Pulsa «Continuar en pantalla completa» antes del vencimiento. Si se agota, se conserva el código y se genera y envía la entrega automáticamente. Cada salida consume el tiempo restante; continuar, pausar o recuperar no repone los segundos consumidos. Las incidencias se registran sin límite de tres. Guardar y pausar detiene la práctica sin iniciar este plazo. El plazo usa una fecha límite, de modo que una pestaña suspendida comprueba el vencimiento al reactivarse; un navegador cerrado no puede enviar hasta volver a ejecutarse.

El receptor actualizado y `profesor.html` reconocen `guardPolicy: "return-timeout"` y `finishReason: "return-timeout"`. Actualiza la implementación de Apps Script para que la hoja muestre el nuevo motivo de cierre y el contador sin «/3».

## Opciones en el enlace de la actividad

- `guardar=1`: muestra los controles Guardar y pausar y Recuperar práctica. Si se omite, están ocultos.
- `duracion=20`: duración en minutos (por defecto 10). Admite decimales positivos y hasta 1440 minutos.

Ejemplo: `/base3/?a=diw/02-01-prueba-css-adaptable&guardar=1&duracion=20`.

El contador muestra el tiempo restante desde que se pulsa Empezar. Durante el último minuto se pone rojo y aparece un aviso. Al agotarse se bloquea el editor y se entrega automáticamente, con motivo `duration-limit`. La pérdida de foco no detiene la duración; el margen acumulado de regreso sigue siendo un límite independiente. Guardar y pausar detiene el tiempo de trabajo; al recuperar se conserva el tiempo consumido y no se amplía el límite original aunque el nuevo enlace indique más minutos. La detección del vencimiento usa el reloj real: si el navegador suspende la ejecución se comprueba al volver.

Estas opciones son parámetros de un entorno didáctico en el navegador, no una autorización firmada del servidor.
