# Actividades, apartados y herramientas

Una actividad puede pedir que el alumno construya una página, explique sus decisiones y responda a un test. Los tres trabajos pertenecen al mismo intento: comparten identificación, tiempo y entrega, pero cada apartado conserva sus propias respuestas.

La configuración y los contenidos se guardan dentro de `actividades/MODULO/ACTIVIDAD/`. No hay que modificar el motor para añadir actividades.

## Una actividad existente sigue funcionando

Si `config.json` no contiene `apartados` ni `tipo`, se interpreta como un único apartado `webcode`. Se siguen leyendo `enunciado.html` y los archivos `codigo.html`, `codigo.css` y `codigo.js` de la carpeta principal. Se mantiene el formato anterior de las entregas.

`webcode` conserva los tres paneles actuales: instrucciones, editor y resultado. Las pestañas de código y las notas TXT son independientes para cada apartado.

## Combinar varios apartados

La lista `apartados` determina el orden. Cada `id` coincide con el nombre de una subcarpeta y debe ser único: minúsculas, números y guiones, sin espacios. Si se omite `tipo`, se utiliza `webcode`.

```json
{
  "title": "01-01-Tarjeta de presentación",
  "version": "2",
  "duracion": 20,
  "entregas": 1,
  "unidad": 1,
  "apartados": [
    {"id": "tarjeta", "titulo": "Diseña tu tarjeta", "tipo": "webcode", "archivos": ["html", "css", "js"]},
    {"id": "explicacion", "titulo": "Explica tus decisiones", "tipo": "qa"},
    {"id": "comprobacion", "titulo": "Comprueba tus conocimientos", "tipo": "test"}
  ]
}
```

```text
01-01-tarjeta-de-presentacion/
├── config.json
└── apartados/
    ├── tarjeta/
    │   ├── enunciado.html
    │   ├── codigo.html
    │   ├── codigo.css
    │   └── codigo.js
    ├── explicacion/
    │   ├── enunciado.html
    │   └── preguntas.json
    └── comprobacion/
        ├── enunciado.html
        └── preguntas.json
```

Con `apartados` definido, el motor lee el contenido de esas subcarpetas. Los archivos antiguos que permanezcan en la raíz no se utilizan para mostrar los apartados. Conviene declarar `archivos` en los apartados `webcode`: así el navegador no solicita ficheros inexistentes. Si falta HTML de partida, se utiliza `contenido/esqueleto.html`.

Para una actividad sencilla de un único tipo también se puede escribir `"tipo": "qa"` o `"tipo": "test"` directamente en el `config.json`, sin `apartados`. En ese caso, `enunciado.html` y `preguntas.json` están en la carpeta principal.

## QA: respuestas abiertas

El nombre visible es **QA** y su identificador es `qa`. `preguntas.json` contiene una lista. Cada pregunta tiene un `id` estable y un `enunciado` en texto plano; el alumno responde en un área de texto.

```json
[
  {"id": "legibilidad", "enunciado": "¿Qué decisión de tu diseño facilita la lectura y qué efecto produce?"},
  {"id": "movil", "enunciado": "¿Qué comprobarías en una pantalla estrecha?"}
]
```

Los identificadores permiten recuperar la respuesta de cada pregunta aunque se cambie de apartado. No los reutilices para preguntas diferentes en una actividad que ya está en uso: crea una nueva versión de la actividad.

## Test: cuatro alternativas

Cada pregunta tiene exactamente cuatro alternativas distintas y admite una única selección. Se puede cambiar de opción o usar el control de borrado para dejarla sin responder.

```json
[
  {
    "id": "espacio",
    "enunciado": "¿Qué propiedad CSS controla el espacio interior entre el contenido y el borde?",
    "opciones": ["margin", "padding", "color", "font-family"]
  }
]
```

Esta primera implementación registra las respuestas para revisión del profesor; no realiza autocorrección. No se publican soluciones en los JSON del alumno. Tanto en QA como en Test, las instrucciones generales del apartado se escriben en `enunciado.html`.

## Herramientas por actividad

Todas las herramientas están activadas por defecto. Solo hay que declarar las que se quieren desactivar:

```json
{
  "herramientas": {
    "colorPicker": true,
    "calculadora": true,
    "binarioDecimal": true,
    "hexadecimalDecimal": true,
    "traductor": false,
    "apuntes": true
  },
  "unidad": 1
}
```

`herramientas` es una propiedad del mismo `config.json`; no sustituye el título, la versión ni los apartados. Cada valor debe ser `true` o `false`.

Los paneles se abren dentro del laboratorio. El selector de color utiliza deslizadores RGB y un campo HEX para evitar ventanas del sistema que puedan sacar al alumno de pantalla completa. La calculadora admite paréntesis, las cuatro operaciones y `%` como resto. Los conversores aceptan enteros no negativos y conservan la precisión con números grandes.

El traductor ofrece español e inglés mediante MyMemory. Solo envía el texto escrito en su panel cuando se pulsa Traducir, con un máximo de 500 bytes UTF-8 por consulta. Depende de conexión y de los límites del servicio; los fallos se muestran en el panel y no afectan a las respuestas. Referencia técnica: https://mymemory.translated.net/doc/spec.php.

Los apuntes se leen de `/ciclos/MODULO/uNN_es.html`. Si no se indica `unidad`, se toman las dos primeras cifras de la carpeta de actividad (`02-01-ejemplo` corresponde a la unidad 2). Si el nombre no identifica una unidad, hay que declararla. Se muestran como contenido de lectura dentro del panel, sin ejecutar los scripts de la página original.

## Guardado, entrega y revisión

Cambiar de apartado conserva el código, las respuestas abiertas y las alternativas seleccionadas. El guardado y la entrega incluyen todos los apartados, también las preguntas sin responder. El tiempo es común y no se reinicia al navegar. Las actividades con apartados usan un espacio de guardado propio de `base4` para no interpretar los borradores antiguos como respuestas nuevas.

El botón de la barra muestra Siguiente mientras quedan apartados y avanza conservando las respuestas. En el último apartado muestra Entregar. Una actividad de un solo apartado muestra Entregar directamente.

Al pulsar Entregar, la confirmación muestra un aviso rojo si hay preguntas QA vacías, preguntas Test sin selección o apartados webcode sin cambios en HTML, CSS o JavaScript. Las notas TXT no cuentan como cambios de código. Este aviso detecta trabajo pendiente, no comprueba si la solución es correcta; permite cancelar y revisar o entregar igualmente.

Para revisar estos archivos utiliza **`base4/profesor.html`**. El visor muestra una navegación por apartados: código y resultado para `webcode`, respuestas escritas para QA y alternativa elegida para Test.

El transporte mantiene el protocolo del receptor actual: el estado se serializa en fragmentos `apartados-01`, `apartados-02`, etc., de hasta 9000 caracteres. El visor los recompone antes de mostrar las respuestas. Se admiten hasta 20 apartados, 50 preguntas por apartado, 10 000 caracteres por respuesta o archivo de código y 90 000 caracteres serializados para el conjunto del estado. Si se supera el límite, se conserva el último estado válido y se avisa; no se recorta la respuesta silenciosamente.

La conexión de Apps Script y el servicio de control siguen siendo los heredados de `base3`. Su política y el enlace de revisión escrito en la hoja todavía corresponden a ese despliegue; para independizar también los servicios de `base4` hay que cambiar sus rutas y publicar esos servicios. La actividad de ejemplo conserva la política de intentos del original. El nuevo visor puede abrir directamente el TXT descargado, sin modificar los servicios.

## Menú contextual y portapapeles

Dentro del laboratorio, el botón derecho abre un menú propio con Copiar y Pegar. Copiar utiliza la selección; Pegar inserta el contenido en el campo editable, respetando su longitud máxima y el estado de la práctica. El resultado webcode comunica estas acciones con la página mediante el token de su vista previa.

Al pulsar Empezar y al pasar de una práctica activa a su finalización se solicita escribir una cadena vacía en el portapapeles. También se intenta al abandonar la página. La API del navegador requiere un contexto seguro y puede denegar permisos; las operaciones asíncronas al cerrar una pestaña pueden cancelarse. Por eso no se garantiza el borrado del portapapeles del sistema: un fallo mientras la página sigue abierta muestra un aviso y no borra las respuestas guardadas.

## Publicar una revisión

Antes de publicar cambios, ejecuta desde la raíz del repositorio:

```sh
node base4/scripts/revision.mjs
```

El script actualiza la fecha real del pie en `Europe/Madrid` y la versión de las URL de estilos y scripts. Así el pie identifica la publicación, no la hora en que el alumno abrió la página, y el navegador vuelve a solicitar los recursos modificados.

Las pruebas puras se ejecutan con Node. Las pruebas del DOM y del arranque completo requieren `jsdom@26`; puede instalarse aparte y localizarse mediante `NODE_PATH`. No es una dependencia del sitio publicado.
