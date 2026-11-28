# Actividades, apartados y herramientas

Una actividad puede pedir que el alumno construya una página, explique sus decisiones y responda a un test. Los tres trabajos pertenecen al mismo intento: comparten identificación, tiempo y entrega, pero cada apartado conserva sus propias respuestas.

La configuración y los contenidos se guardan dentro de `actividades/MODULO/ACTIVIDAD/`. No hay que modificar el motor para añadir actividades.

## Una actividad existente sigue funcionando

Si `config.json` no contiene `apartados` ni `tipo`, se interpreta como un único apartado `webcode`. Se siguen leyendo `enunciado.html` y los archivos `codigo.html`, `codigo.css` y `codigo.js` de la carpeta principal. Se mantiene el formato anterior de las entregas.

`webcode` conserva los tres paneles actuales: instrucciones, editor y resultado. Las pestañas de código y las notas TXT son independientes para cada apartado.

El icono de pin de «Resultado» abre la vista previa en un modal redimensionable. Arrastra su esquina inferior derecha o utiliza las flechas con el control de tamaño enfocado. Esc o el botón de cierre devuelven el resultado a su posición sin recargarlo; el indicador muestra el ancho y el alto reales de la vista previa. El modal es común a todas las actividades; los apartados QA y Test conservan su propia vista.

## Cifrado opcional por actividad

El cifrado está **desactivado por defecto**. Omitir `cifrado` o escribir `"cifrado": false` conserva la carga y el acceso habituales. No es una opción global ni cambia otras actividades.

Para preparar una actividad cifrada, añade `"cifrado": true` al `config.json` de su copia local de autor y ejecuta:

```powershell
node base4/scripts/cifrar-actividad.mjs "ruta/copia-local" "ruta/paquete-publicable"
```

El destino debe ser una carpeta nueva, separada del origen. El script usa el dominio de `base4/contenido/config.json`; también admite indicarlo como tercer argumento, y debe coincidir con el configurado en el sitio donde se publique. Publica solo el contenido de la carpeta resultante dentro de `base4/actividades/MODULO/ACTIVIDAD/`. Mantén la copia de autor fuera del repositorio público. Activar la opción exige generar y publicar el paquete; cambiar solo el JSON no cifra los archivos que ya estén publicados.

El paquete contiene un `config.json` público con el descriptor generado:

```json
"cifrado": {
  "archivo": "contenido.cifrado.json",
  "modo": "email-domain",
  "dominio": "g.educaand.es"
}
```

Los enunciados, preguntas, traducciones y JavaScript de partida quedan en el paquete AES-GCM. Las rúbricas y los archivos proporcionados `codigo.html` y `codigo.css` permanecen públicos. La lista opcional `usuariosPermitidos` limita los correos admitidos; si se omite, se acepta cualquier correo del dominio configurado.

El alumno escribe el correo una sola vez en el acceso original de base4. El contenido se prepara en segundo plano y el botón habitual Empezar se habilita al terminar; el intento y el reloj comienzan al pulsarlo. No se añade otra pantalla ni se autentica la cuenta. El dominio es público: este mecanismo oculta los enunciados del repositorio, pero no constituye una clave secreta ni acredita la titularidad del correo.

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

### Rúbrica opcional

Si la carpeta de la actividad contiene `rubrica.json`, aparece el icono «Rúbrica de la actividad» en la barra de herramientas. Se consulta dentro del laboratorio y no modifica las respuestas. Si el archivo no existe, el icono no aparece. Para ocultarlo expresamente, usa `"herramientas": {"rubrica": false}`.

El JSON contiene `titulo` y una lista `criterios`. Cada criterio tiene `titulo`, `puntos` (máximo) y `niveles`, con pares `puntos` y `descripcion`. Los niveles deben incluir cero y la puntuación máxima, sin puntuaciones repetidas ni superiores al máximo. La puntuación total se calcula sumando los máximos de los criterios. La rúbrica sirve para consulta y valoración del profesor; no realiza autocorrección. Hay un ejemplo completo en `actividades/dwec/02-02-mover-cuadrado-con-teclado/rubrica.json`.

Todas las herramientas están activadas por defecto. Solo hay que declarar las que se quieren desactivar:

```json
{
  "herramientas": {
    "colorPicker": true,
    "calculadora": true,
    "binarioDecimal": true,
    "hexadecimalDecimal": true,
    "traductor": false,
    "apuntes": true,
    "atajosTeclado": true
  },
  "unidad": 1
}
```

`herramientas` es una propiedad del mismo `config.json`; no sustituye el título, la versión ni los apartados. Cada valor debe ser `true` o `false`.

`atajosTeclado` permite los atajos de selección y Ctrl/Cmd+A, C, V y X, también dentro de la vista previa. Está activo si se omite; usa `false` para bloquearlos durante la práctica. Es una opción del profesor, sin botón para que el alumno cambie la restricción.

Los paneles se abren dentro del laboratorio. El selector de color utiliza deslizadores RGB y un campo HEX para evitar ventanas del sistema que puedan sacar al alumno de pantalla completa. La calculadora admite paréntesis, las cuatro operaciones y `%` como resto. Los conversores aceptan enteros no negativos y conservan la precisión con números grandes.

El traductor ofrece español e inglés mediante MyMemory. Solo envía el texto escrito en su panel cuando se pulsa Traducir, con un máximo de 500 bytes UTF-8 por consulta. Depende de conexión y de los límites del servicio; los fallos se muestran en el panel y no afectan a las respuestas. Referencia técnica: https://mymemory.translated.net/doc/spec.php.

Los apuntes se leen de `/ciclos/MODULO/uNN_es.html`. Si no se indica `unidad`, se toman las dos primeras cifras de la carpeta de actividad (`02-01-ejemplo` corresponde a la unidad 2). Si el nombre no identifica una unidad, hay que declararla. Se muestran como contenido de lectura dentro del panel, sin ejecutar los scripts de la página original.

## Red autorizada a nivel de aplicación

La lista de IP está en `contenido/redes.json`, no en cada actividad. Se comparan los dos primeros octetos: `88.26`, `45.86` y `185.197`. Se han retirado `redes` y `restringirIPs` de las actividades. No hay modo permisivo ni excepción por clave del profesor. Si la IP no está autorizada o no se puede verificar, no se carga la actividad. Consulta `servidor/README.md` para la activación del controlador en el servidor compartido.

## Guardado, entrega y revisión

### Penalización opcional al agotar el margen de regreso

`"penalizacionSalidaPorcentaje": 25` en el `config.json` de una actividad muestra un aviso al agotar el margen de regreso. Al pulsar Aceptar y recuperar pantalla completa, se descuenta el 25 % del tiempo que quede en ese momento; se conservan las respuestas y se reanuda el intento. Si quedan 40 minutos se descuentan 10; si quedan 20, se descuentan 5.

El margen completo disminuye 3 segundos tras cada penalización: 12 → 9 → 6 → 3 segundos. Si se agotan esos últimos 3 segundos, se genera la entrega automática, sin otra penalización. El descuento y el margen se conservan al recargar. El reloj normal del examen continúa contando durante los avisos.

La opción está desactivada si se omite o vale cero. Las actividades que ya utilizan `penalizacionSalidaMinutos` conservan el descuento fijo; el porcentaje tiene prioridad cuando se configura. En las actividades cifradas, estos ajustes se leen del `config.json` público, sin regenerar las preguntas cifradas.

### Comprobación de JavaScript al ejecutar

El botón Ejecutar analiza el JavaScript con ESLint antes de enviarlo a la vista previa. Comprueba la sintaxis y las reglas `no-constant-condition` y `no-unmodified-loop-condition`, restringidas a bucles sin una salida identificable; añade la comprobación de `for (;;)` sin salida. Admite salidas válidas mediante `break`, `return` y excepciones no capturadas dentro del bucle. No corrige ni modifica las respuestas, y no aplica reglas de formato ni de estilo.

También comprueba los scripts y manejadores escritos en HTML. El análisis ocurre en un Worker con un límite de tiempo; nunca ejecuta el código del alumno. Los avisos aparecen en la consola de base4, en español o inglés, sin ventanas nativas. Si no se puede completar la comprobación, el código no se ejecuta. ESLint 10.16.0 está alojado con los archivos del sitio y no envía respuestas a servicios externos. El análisis estático no garantiza detectar todos los bucles infinitos.

### Continuidad y entrega

Cambiar de apartado conserva el código, las respuestas abiertas y las alternativas seleccionadas. El guardado y la entrega incluyen todos los apartados, también las preguntas sin responder. El tiempo es común y no se reinicia al navegar. Las actividades con apartados usan un espacio de guardado propio de `base4` para no interpretar los borradores antiguos como respuestas nuevas.

El botón de la barra muestra Siguiente mientras quedan apartados y avanza conservando las respuestas. En el último apartado muestra Entregar. Una actividad de un solo apartado muestra Entregar directamente.

Al pulsar Entregar, la confirmación muestra un aviso rojo si hay preguntas QA vacías, preguntas Test sin selección o apartados webcode sin cambios en HTML, CSS o JavaScript. Las notas TXT no cuentan como cambios de código. Este aviso detecta trabajo pendiente, no comprueba si la solución es correcta; permite cancelar y revisar o entregar igualmente.

Para revisar estos archivos utiliza **`base4/profesor.html`**. El visor muestra una navegación por apartados: código y resultado para `webcode`, respuestas escritas para QA y alternativa elegida para Test.

El transporte mantiene el protocolo del receptor actual: el estado se serializa en fragmentos `apartados-01`, `apartados-02`, etc., de hasta 9000 caracteres. El visor los recompone antes de mostrar las respuestas. Se admiten hasta 20 apartados, 50 preguntas por apartado, 10 000 caracteres por respuesta o archivo de código y 90 000 caracteres serializados para el conjunto del estado. Si se supera el límite, se conserva el último estado válido y se avisa; no se recorta la respuesta silenciosamente.

El control de red de base4 utiliza la ruta propia `/base4/` del Worker compartido y comprueba la IP únicamente al iniciar la actividad. La entrega conserva un sello firmado y registra la IP sin volver a restringirla. El receptor de Apps Script se despliega por separado; el enlace de revisión apunta a `base4/profesor.html`, que también puede abrir el TXT descargado.

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
