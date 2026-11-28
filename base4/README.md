> **base4:** consulta [Apartados y herramientas](README-apartados.md) para configurar webcode, QA, Test y los paneles de la barra superior. Las actividades sin apartados conservan el funcionamiento descrito a continuación.

# Laboratorio de taller de código (base4)

Variante de [`/base/`](../base/README.md) para ejercicios de HTML, CSS y JavaScript. Mantiene la barra, las incidencias y el guardado de la plantilla común, con estas diferencias:

- Hay un solo laboratorio para todas las actividades. La actividad y su módulo se eligen en la dirección: `…/base4/?a=MODULO/ACTIVIDAD`, con módulo `diw`, `dwec` o `ssii`.
- La identificación pide únicamente el correo del centro. Las actividades pueden aportar una versión en inglés.
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
2. Añadir `config.json` con `title` (`"02-01-Menú responsive"`) y `version`, y `enunciado.html` con el texto.
3. Añadir, si hacen falta, `codigo.html`, `codigo.css` y `codigo.js`. Los tres son opcionales: las pestañas CSS y JavaScript sin archivo empiezan vacías, y la pestaña HTML sin archivo (o con el archivo vacío) empieza con el esqueleto de `contenido/esqueleto.html`.
4. Dar a los alumnos la dirección `…/base4/?a=diw/02-01-menu-responsive`.

Las actividades se nombran `MÓDULO NN-MM-Nombre de la actividad`: el alumno ve «DIW02-01-Menú responsive» y en la hoja el módulo y el nombre van en columnas separadas. El identificador de la práctica (`DIW-02-01-MENU-RESPONSIVE`), las claves de guardado y los nombres de archivo se derivan del módulo y de la carpeta. Sin parámetro, o si la actividad no existe, la página muestra «No se encuentra la actividad.».

Ejemplos incluidos: `?a=diw/01-01-tarjeta-de-presentacion` (con los tres archivos) y `?a=dwec/01-01-contador-de-pulsaciones` (solo JavaScript).

## Entrega

Desde la revisión del 26/11/2026, el comprobante descargado es texto plano (JSON del informe y código SHA-256). La hoja Entregas conserva el informe comprimido y cifrado con la contraseña del profesor. Los archivos históricos comprimidos siguen admitidos. Los enlaces publicados en DIW, DWEC, SSII y revisor.html se generan sin cifrado después de corregir; el original de Entregas permanece cifrado.

## Pausa, recuperación e intentos

El borrador editable se guarda en localStorage por correo, actividad y versión. Se conserva el guardado de cambios y se añade una copia silenciosa cada cinco minutos mientras la práctica está activa. Si falla el almacenamiento, se muestra el error para no dar por guardado un trabajo que solo está en memoria.

Pausar, cuando la actividad habilita `guardar`, conserva las respuestas, tiempo consumido, identificación del intento e incidencias, descarga `entrega.txt` y vuelve al login. No entrega la práctica. Al pulsar Empezar después de identificarse, se recupera automáticamente la copia local correspondiente. Si no hay borrador del alumno o se ha borrado la caché, aparece Recuperar para abrir el archivo de pausa. El tiempo con la página cerrada no se descuenta. La recuperación conserva la reserva del intento y queda registrada. Los archivos de otra actividad, versión o correo y los comprobantes finalizados se rechazan.

Al generar una entrega manual o automática se elimina el borrador editable. El justificante y un posible envío pendiente se guardan por separado para poder consultar o reintentar la recepción sin reabrir el editor. Un comprobante finalizado no se puede importar para seguir trabajando.

La hoja es la autoridad del límite de intentos. El receptor comprueba el límite al reservar y al recibir; borrar la caché no permite saltárselo. Para autorizar otra oportunidad, el profesor elimina manualmente una fila completa de ese alumno y actividad en Entregas; esa fila y sus calificaciones dejan de conservarse. Vaciar una celda no basta, porque los metadatos de la reserva continúan en la fila. El alumno vuelve a entrar: la consulta actualizada permite el nuevo intento. Reanudar una reserva pendiente no consume otra oportunidad.

Los nuevos controles exigen actualizar Code.gs y Bridge.html y publicar una nueva versión del receptor. El frontend detecta un receptor antiguo y bloquea el inicio hasta actualizarlo. El cambio opcional del motor compartido solo se activa en base4; base3 y los laboratorios existentes mantienen su comportamiento.

## Formato histórico y compatibilidad

Por defecto (`"delivery": { "type": "archivo" }`) no hace falta receptor: al pulsar «Entregar» se descarga un único archivo `MÓDULO NN-MM-NOMBRE_USUARIO.txt` (el usuario es el del correo, sin dominio) en texto plano con el informe y su código de comprobación. El formato anterior llevaba gzip y Base64url con el prefijo `format.report`. El alumno lo hace llegar al profesor por el medio que se le indique.

Con `"type": "apps-script"` y `endpoint`, además de la descarga, la entrega se envía al receptor de `receptor/`, que reserva una fila al empezar y la actualiza al entregar en la pestaña «Entregas», con ID y Número de entrega.

## Control de red y horario

El inicio comprueba la red mediante `/base4/acceso` del servidor de control y la lista común `contenido/redes.json`. Sin respuesta positiva no se carga la actividad. No existe una excepción por clave del profesor. Al entregar se solicita un sello firmado con IP y hora (campo `sello` del informe), sin volver a restringir la red. La columna IP contiene solo la dirección, o queda vacía si no hay un sello utilizable. Ver [servidor/README.md](servidor/README.md).

En ambos casos el informe conserva el formato del resto de laboratorios (versión 3), añade `module` y `activity`, e incluye solo las pestañas que difieren del código de partida, como respuestas abiertas `html`, `css`, `js` o `txt`; la lista `modified` las enumera. La respuesta `txt` son las notas del alumno, envueltas en un comentario `/* … */`. Si no se modificó nada, hay una única respuesta vacía `sin-cambios`. Cada pestaña admite 10 000 caracteres.

Para revisar las entregas, abrir `profesor.html` y arrastrar los archivos TXT, aunque sean de actividades distintas (también admite pegar el texto de la columna «ENTREGA completa» de la hoja, o llegar desde su enlace «Probar código»): muestra de cada alumno la actividad, el código con los cambios respecto al de partida resaltados, el resultado, la consola, el tiempo, las incidencias y el registro del intento, y avisa si un archivo ha sido alterado, es de una actividad que no está en el sitio o de otra versión. Los comprobantes en texto plano y los archivos históricos SSII3G. se leen localmente. Las entregas SSII4E1. se descifran mediante la sesión ya autenticada en el receptor y el Worker del profesor; no se vuelve a pedir la contraseña.

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

Los archivos históricos `practica-….txt` pueden recuperar un intento pausado. El botón Pausar actual no descarga archivos: conserva el borrador local. Un comprobante finalizado no reabre el editor.

## Vista previa

- HTML y CSS se actualizan al escribir. El JavaScript solo se ejecuta al pulsar «Ejecutar», para que un bucle a medio escribir no bloquee la página. El HTML que incluya `<script>` propio se trata igual.
- «Actualizar» vuelve a cargar solo el resultado, tal como se mostró por última vez: reinicia su estado sin ejecutar JavaScript nuevo y sin tocar el editor, el reloj, el guardado ni las incidencias.
- Al recuperar una práctica guardada no se ejecuta el JavaScript del alumno hasta que pulse «Ejecutar».
- La consola muestra `console.log`, los errores y las llamadas a `alert`. `confirm` y `prompt` no están disponibles: los diálogos nativos sacan al navegador de la pantalla completa y contarían como incidencia.
- El resultado se ejecuta en un `iframe` aislado, sin acceso a la página, al guardado ni a la entrega. Una política de contenido impide peticiones de red, marcos anidados y envío de formularios; las imágenes, fuentes y medios por `https` sí se cargan. Se puede sustituir con `preview.csp` en `contenido/config.json`.
- Los enlaces están desactivados y, si el marco navega a otra página, se sustituye por un aviso.

Como en `/base/`, los controles son disuasorios y no constituyen una plataforma de examen seguro. Ejecutar comprueba el JavaScript mediante ESLint antes de mostrar el resultado. Este análisis detecta errores de sintaxis y algunos bucles infinitos, pero no todos. Tras un bloqueo se puede recuperar el último borrador local o un archivo de pausa de una actividad que permita guardar.

## Comprobación

Servir desde la raíz del repositorio, porque se usan rutas `/base/motor/`:

```sh
python3 -m http.server 8000
```

Abrir `http://localhost:8000/base4/?a=diw/01-01-tarjeta-de-presentacion`.

## Plazo para regresar y tamaño del resultado

El icono de pin de «Resultado» abre la vista previa en un modal redimensionable. Arrastra su esquina inferior derecha o utiliza las flechas con el control de tamaño enfocado. Esc o el botón de cierre devuelven el resultado a su posición sin recargarlo; el indicador muestra el ancho y el alto reales de la vista previa. El CSS responde al ancho del propio resultado.

`guard.returnSeconds` en `contenido/config.json` fija el plazo de regreso (actualmente 12 segundos acumulados por práctica). Al perder pantalla completa, visibilidad o foco, se bloquea el editor y aparece una cuenta atrás roja al volver a la página. Pulsa «Continuar en pantalla completa» antes del vencimiento. Si se agota, se conserva el código y se genera y envía la entrega automáticamente. Cada salida consume el tiempo restante; continuar, pausar o recuperar no repone los segundos consumidos. Las incidencias se registran sin límite de tres. Pausar detiene la práctica sin iniciar este plazo. Con la página abierta, una pestaña suspendida comprueba el vencimiento al reactivarse. Tras cerrar el navegador se retoma el tiempo guardado en el último borrador.

El receptor actualizado y `profesor.html` reconocen `guardPolicy: "return-timeout"` y `finishReason: "return-timeout"`. Actualiza la implementación de Apps Script para que la hoja muestre el nuevo motivo de cierre y el contador sin «/3».

## Llamada y configuración por actividad

La actividad se selecciona mediante el parámetro `a`:

```text
https://igarciafp.github.io/base4/?a=MODULO/ACTIVIDAD
```

Módulos admitidos: `diw`, `dwec`, `ssii`. Ejemplo:
`/base4/?a=diw/02-01-prueba-css-adaptable`.

Cada carpeta `actividades/MODULO/ACTIVIDAD/` incluye un único **config.json** con título, versión y ajustes (sustituye al antiguo archivo de metadatos):

```json
{
  "title": "02-01-Menú responsive",
  "version": "1",
  "guardar": false,
  "duracion": 15,
  "entregas": 1,
  "reiniciar": false,
  "restringirHorario": false
}
```

| Campo | Función | Valor predeterminado |
| --- | --- | --- |
| title | Nombre de la actividad | Obligatorio |
| version | Versión del contenido | Obligatorio |
| guardar | Mostrar Pausar para guardar localmente, descargar entrega.txt y volver al login; el autoguardado y la recuperación local están siempre activos | false |
| duracion | Minutos disponibles; número positivo, hasta 1440 | 15 |
| entregas | Máximo de intentos por correo y actividad; entero no negativo; 0 impide comenzar hasta autorización del profesor | 1 |
| reiniciar | Mostrar y habilitar el botón Reiniciar | false |

`title` y `version` son obligatorios. Los demás campos omitidos toman su valor predeterminado. Si falta config.json (404), la actividad no se abre. Un archivo inválido o un fallo de conexión produce un error; no se interpreta como ausencia. Los antiguos parámetros `guardar` y `duracion` de la URL ya no modifican la configuración.

Las actividades incluyen estos valores por defecto, salvo `diw/02-01-prueba-css-adaptable`, configurada para pruebas con guardar y reiniciar activados, 2 minutos y 1 intento. Para crear otra, copia uno de ellos a su carpeta. `contenido/config.json` sigue conteniendo los ajustes comunes de correo, entrega, servidor y margen de regreso.

### Duración y entrega

El contador muestra el tiempo restante desde Empezar. Al quedar un minuto se pone rojo y aparece un aviso. A cero se bloquea el editor y se entrega automáticamente. El margen acumulado para volver a pantalla completa es independiente. Si guardar está habilitado, pausar conserva el borrador local y detiene el tiempo de trabajo; recuperar conserva lo consumido.

## Registro inicial y panel definitivo

Al empezar se genera un ID aleatorio y se registra, antes de habilitar el editor, una fila con fecha y hora de inicio (Madrid), módulo, actividad, correo e IP. Se usan las columnas **ID** y **NUM ENTREGA** (o **Número de entrega**) donde estén. Todas las columnas se localizan por su cabecera, sin exigir un orden; solo se añaden al final las de identificación que falten. El número se asigna en el servidor bajo bloqueo para el mismo correo y práctica. Los intentos iniciados, aunque se abandonen, consumen una oportunidad.

La entrega final actualiza esa fila por ID; conserva los datos iniciales y las notas del profesor. En Incidencias quedan el estado inicial pendiente, o los avisos y el motivo al completar. La hora de recepción final se conserva en los metadatos de la celda de «ENTREGA completa» y se devuelve en el comprobante. Reintentar una petición no crea filas duplicadas.

- **Manual:** «Entregar» muestra un aviso sencillo que permite cancelar. Al aceptarlo se entra en el panel definitivo, se para el reloj y no se puede volver al editor.
- **Automática con intentos:** abre el mismo panel y envía sin esperar confirmación.
- **Sin intentos:** el inicio queda bloqueado hasta que el profesor libere una oportunidad borrando una fila completa. La entrega automática de una reserva ya iniciada no exige un motivo adicional.
- Los reenvíos de una entrega pendiente conservan su identidad y no crean un nuevo intento.
- «Cerrar sin entregar» exige confirmación. Recargar o cerrar la pestaña muestra la advertencia nativa del navegador cuando este la permite. Al salir se elimina la copia local pendiente; queda la fila inicial, no una entrega completa. No se recuperan comprobantes finalizados como prácticas editables.

El ID se mantiene al guardar y recuperar una práctica pausada. El registro inicial se reintenta con el mismo ID antes del envío si falló la red; no se puede garantizar el registro remoto sin conexión. La actualización final respeta el horario si la actividad lo exige; no vuelve a restringir la red. Si se rechaza, la fila inicial sigue pendiente y el panel permite reintentar.

**Despliegue:** sustituir **Code.gs y Bridge.html** y publicar una nueva versión de la implementación existente. La URL y el Worker no cambian. Las columnas nuevas se crean automáticamente en el primer inicio.

## Restricciones de entrega por actividad

La red se autoriza al iniciar mediante `contenido/redes.json`; `redes` y `restringirIPs` por actividad no se utilizan en base4. La entrega conserva la IP firmada sin volver a bloquear por red.

`restringirHorario` es `false` por defecto. Con `true`, la recepción final exige un sello válido dentro del horario del módulo definido en el Worker, con zona Europe/Madrid y cinco minutos de margen. Los reintentos de una entrega ya recibida devuelven su confirmación sin duplicarla.

Pruebas del ciclo de entrega: `node base4/tests/entrega-lifecycle.test.mjs`.

## Caché local y receptor publicado

El contador de la hoja reemplaza la caché aunque disminuya (por ejemplo, al borrar entregas de prueba). Mientras llega la consulta se muestra el último valor local disponible.
«Borrar datos locales de esta práctica», en la pantalla de entrada, elimina el historial y los comprobantes locales de esa actividad previa confirmación. No borra filas ni cambia notas en la hoja; descarga antes cualquier TXT que quieras conservar.

Fuera de la práctica activa no se bloquean los atajos del navegador. El registro inicial comprueba que el Bridge publicado anuncie la operación de inicio; si falta, muestra RECEIVER_VERSION en lugar de esperar sin explicación. Para actualizarlo copia Code.gs y Bridge.html y elige **Implementar → Gestionar implementaciones → Editar → Nueva versión → Implementar**, conservando la URL.

## Archivos de partida declarados

En config.json, `"archivos": ["html", "css"]` indica que la actividad aporta codigo.html y codigo.css. No se solicita codigo.js; su pestaña queda vacía y editable. Usa `["js"]` para una práctica que solo aporte JavaScript, o `[]` para partir del esqueleto HTML común sin CSS ni JS. Al añadir un archivo, inclúyelo en esta lista.

Los archivos declarados deben existir. Los errores temporales de carga se reintentan hasta tres veces y no se convierten silenciosamente en código vacío. Para compatibilidad, si no existe el campo archivos se conserva la detección por 404 de los tres archivos opcionales. La actividad de prueba CSS declara solo html y css.

Si aparece RECEIVER_VERSION, comprueba la implementación existente de Apps Script: debe publicar Code.gs con iniciarEntrega y Bridge.html con LAB_START y capabilities. Guardar archivos en el editor o ejecutar configurar no actualiza la versión servida por /exec. Si creas una implementación distinta con otra URL, hay que cambiar delivery.endpoint en contenido/config.json.

Las confirmaciones de entrega manual, limpieza de caché y abandono se muestran mediante modales HTML con Aceptar/Cancelar (Escape cancela). El reloj continúa durante el aviso previo; si vence, se cierra ese aviso y sigue la entrega automática. Solo el aviso de cerrar o recargar la pestaña usa el diálogo obligatorio del navegador.
