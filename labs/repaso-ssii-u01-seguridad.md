# Repaso SSII UD01: controles del navegador

## Propósito y alcance

Integración de la plantilla de controles en `repaso-ssii-u01.html`, conservando los **94 pasos, sus enunciados, opciones y criterios de corrección**, los siete bloques y la generación del informe de texto.

**Es una medida didáctica y disuasoria, no un navegador de examen seguro.** JavaScript, el DOM y el almacenamiento están bajo el control del usuario. Una incidencia describe una señal del navegador; no prueba que el alumno haya copiado ni revela qué aplicación o web consultó. No se accede a cámara, micrófono, historial o contenido del portapapeles. No se envían respuestas ni registros al profesor ni a servicios externos.

## Archivos y puntos de adaptación

| Archivo | Responsabilidad |
| --- | --- |
| `repaso-ssii-u01.html` | Contenido original, estilos, normas visibles, bloqueo inicial y diálogos. |
| `repaso-ssii-u01-seguridad.js` | Estado del intento, señales, avisos, reinicio, persistencia y portapapeles. |
| `repaso-ssii-u01.js` | Preguntas y corrector originales, informe, reloj y adaptador del cuaderno. |
| `tests/test_repaso_seguridad.py` | Pruebas DOM automatizadas; distingue APIs nativas de dobles de prueba. |

El HTML carga primero el controlador y después el adaptador, desde rutas relativas del mismo repositorio. No usa dependencias de terceros ni requiere un proceso de construcción. **Hay que publicar los tres archivos juntos.** Descargar solo el HTML no produce una versión autónoma.

Para reutilizarlo, el adaptador suministra `empty`, `sanitize`, `snapshot`, `restore`, `setEnabled`, `startClock`, `stopClock`, `downloadReport`, `makeReport`, `setReport`, `isAnswer` y `restoreValue`. Las escrituras del cuaderno pasan por `saveEdit`; no deben añadirse guardados paralelos que ignoren el contador o el estado del intento. Al añadir preguntas, actualizar también el listado de campos, el HTML y las pruebas.

## Flujo visible

1. El cuaderno empieza cerrado. Tras inicializar los scripts se muestra, todavía sin permitir respuestas. Se explican las normas y se exige marcar la aceptación.
2. «Pantalla completa y comenzar» solicita la API Fullscreen desde ese clic. Maximizar la ventana o pulsar F11 no equivale a `document.fullscreenElement === document.documentElement`.
3. Durante el intento solo se habilitan respuestas, comprobación y reflexión cuando la página está visible, tiene foco, sigue en pantalla completa y no hay avisos ni errores pendientes.
4. Una primera salida muestra «Primer aviso». La segunda muestra «Último aviso». La tercera vacía **todas las respuestas**, identidad, reflexión, correcciones, reloj e informe, y detiene el intento.
5. «Finalizar y descargar TXT» pide confirmación, genera un único fichero TXT y bloquea las respuestas. No hay borrador de informe ni fase de revisión. El informe incluye el tiempo total empleado, en minutos y segundos. Finalizar no envía nada a un servidor: el alumno entrega el fichero descargado en el destino indicado por el profesor.
6. «Volver a descargar TXT» permite recuperar exactamente el mismo informe final, también al reabrir el navegador. No vuelve a generar ni modificar el informe. Ya no hay un control para recuperar copias de revisión.
7. Un nuevo intento después de finalizar o reiniciar comienza vacío. «Borrar datos de este laboratorio» exige confirmación y está deshabilitado durante un intento activo; elimina únicamente sus dos claves de almacenamiento, no las de otros laboratorios.

Se conserva la posibilidad de finalizar con pasos pendientes. El informe ya los identifica como incompletos. Las explicaciones abiertas continúan pendientes de valoración docente: rellenarlas no demuestra que sean correctas.

## Señales, agrupación y modales

`visibilitychange`, `window.blur` y `fullscreenchange` se observan durante un intento activo. `pagehide` añade cobertura de recarga o cierre cuando el navegador lo emite. Cambiar de campo dentro del formulario **no** es perder el foco de la ventana: el listener de `window.blur` no utiliza captura.

Una salida puede emitir varios eventos. `episode` los agrupa y suma **una incidencia por episodio**, no una por evento. Las respuestas se bloquean desde la primera señal. Cuando las tres condiciones se recuperan de forma estable durante 200 ms se cierra el episodio; el aviso sigue pendiente hasta pulsar «Continuar». Si la página sigue oculta, sin foco o sin pantalla completa, no se añaden incidencias continuamente. Si vuelve a salir tras un regreso completo y estable, puede empezar otro episodio aunque el aviso anterior no se haya aceptado.

Los modales pertenecen al documento: no aparecen encima de otra aplicación. Se presentan al regresar a una página visible y enfocada. «Continuar» vuelve a pedir pantalla completa si hace falta. Una petición rechazada no abre las respuestas ni borra el contador. Los diálogos de confirmación son `<dialog>`, no `alert` o `confirm`, para evitar interacciones del navegador innecesarias. Escape no confirma un aviso de incidencia ni activa por sí solo la continuación.

El seguimiento sigue activo mientras se solicita finalizar y mientras se calcula el informe. Si ocurre una salida durante el SHA-256 asíncrono, no se finaliza silenciosamente ni se revive un intento reiniciado. Después de finalizar se abandona pantalla completa sin sanción.

## Bloqueo de portapapeles y entrada

Se cancelan `copy`, `cut`, `paste`, `dragstart`, `drop` y `dragover` en todas las fases, también después de finalizar. No hay botón de copia ni campo visible de informe. La entrega se obtiene exclusivamente como TXT Base64 desde «Finalizar y descargar TXT», con confirmación; «Volver a descargar TXT» recupera el mismo fichero.

Se interceptan en captura `keydown`, `keypress` y `keyup` cuando `ctrlKey` está activo o la tecla es Control. Esto incluye seleccionar todo, deshacer, rehacer, imprimir y cualquier otra combinación con Control que llegue al documento. Se mantienen los bloqueos previos de Cmd+C/X/V y Shift+Insert/Delete. También se cancela `contextmenu` y los eventos de puntero/ratón con botón derecho o Control.

Los bloqueos son silenciosos: no muestran avisos, no registran pulsaciones, no incrementan contadores ni generan eventos de supuesto intento de copia. El campo antiguo `clipboardBlocked` se conserva únicamente por compatibilidad del guardado y no se muestra ni se incluye en informes nuevos. Las pérdidas reales de foco, visibilidad o pantalla completa mantienen su política independiente.

La validación en captura de `beforeinput`, `input` y `change` impide guardar pegados o ediciones rechazadas. Si un pegado no pudo cancelarse antes de modificar un campo, se restaura su último valor aceptado. La escritura ordinaria y la navegación sin Control permanecen disponibles. AltGr puede producir `ctrlKey` en algunos sistemas y quedar bloqueado por esta política.

El bloqueo se limita a eventos que el navegador entrega a la página y permite cancelar; no controla atajos reservados del navegador o del sistema ni desactiva extensiones. No se lee, vacía ni deshabilita el portapapeles del sistema. Para adaptaciones de accesibilidad, revisar los manejadores de Control y menú contextual, `CONFIG.blockClipboard`, las normas visibles y las pruebas.

## Arranque cerrado y fallos

El **HTML inicial**, antes de ejecutar un solo script, contiene `hidden` e `inert` en el cuaderno, dos `fieldset[disabled]` y botones dependientes de JavaScript deshabilitados. `<noscript>` informa, pero no es la única barrera. El arranque retira `hidden` e `inert` solo al terminar la inicialización; los campos permanecen cerrados hasta cumplir la política.

Si falta un script o hay un error de sintaxis previo al arranque, se mantiene la pantalla «Preparando la práctica». Si se propaga un error inesperado durante el funcionamiento, se cierra el cuaderno y se conserva el último guardado correcto. Los fallos esperados, como permisos de pantalla completa o cuota de almacenamiento, se tratan de forma explícita. No se deduce que el programa esté protegido simplemente porque el código se haya minimizado u ocultado.

Sin JavaScript no hay una práctica utilizable, pero **esto no oculta el código fuente** ni evita que alguien lo descargue o modifique. Un control estrictamente local no autentica al navegador.

## Persistencia y migración

Se usa `localStorage`, con JSON y clave **`ssii-repaso-ud01-seguridad-v1`**. Se conserva versión de esquema, fase, número de intento, incidencias, aviso pendiente, registro limitado a 80 eventos, el campo legado de portapapeles (sin nuevos recuentos), respuestas, comprobaciones, pistas, reloj e informe. Se aceptan copias de revisión antiguas por compatibilidad, pero ya no se crean ni se muestran. Los datos se validan por estructura, tipo y longitud; se representan con `textContent` o `value`, nunca con HTML procedente del guardado.

Al no existir la clave nueva, se importa el borrador previo **`ssii-repaso-ud01-v1`**, conservando campos, comprobaciones, pistas y tiempo. No se inventan incidencias para trabajo anterior a la política. El original no se borra durante la migración. Si el JSON actual o el anterior está dañado, se bloquea el inicio y no se sobrescribe automáticamente.

Cada edición aceptada y cada transición guarda una instantánea. El reloj arranca automáticamente al comenzar. Se persiste una marca de inicio (`started`) y el tiempo previo (`elapsed`), sin acumular dos veces los intervalos al guardar. Sigue contando durante avisos, confirmaciones, bloqueos, recargas y con el navegador cerrado. Solo se detiene al finalizar o al invalidarse el intento por la tercera incidencia. Un intento antiguo sin marca de inicio conserva el tiempo acumulado y comienza a contar de forma continua al cargar esta versión. Si se cancela la confirmación, falta un correo válido o falla el informe, el reloj continúa. El informe y el reloj final usan el mismo instante de confirmación aceptada; un fallo o una incidencia durante el hash cancela la finalización.

Al reabrir un intento activo, se conservan respuestas y contador y se exige reanudar en pantalla completa. El nuevo arranque **no inventa una incidencia** por no estar todavía en pantalla completa. Cerrar o recargar puede haber registrado la salida anterior si el navegador emitió el evento; ningún evento de cierre está garantizado frente a terminación forzosa, fallos o apagado.

Si escribir falla, las ediciones actuales permanecen en memoria y se bloquea el trabajo. «Reintentar guardado» no descarta esos cambios. Antes de escribir se compara el valor actual con el último leído; `storage` detecta cambios de otras pestañas y bloquea copias obsoletas para evitar sobreescrituras silenciosas. **Comparación + escritura no es una transacción atómica.** Para resolver carreras simultáneas estrictamente harían falta Web Locks/IndexedDB o un servidor.

Los datos son locales al **origen y perfil del navegador**, no al nombre escrito por el alumno. En navegación privada, tras borrar datos, al cambiar de perfil o según las políticas del centro pueden desaparecer o quedar separados. `file:` no garantiza el mismo comportamiento entre navegadores; utilizar la URL HTTPS publicada. En un equipo compartido, el siguiente usuario del mismo perfil podría ver el borrador anterior. No guardar información sensible y borrar los datos tras entregar.

## Comprobación y pruebas

```sh
pip install pytest playwright
playwright install chromium
pytest -q labs/tests/test_repaso_seguridad.py
# Alternativa con un ejecutable ya instalado:
CHROMIUM_PATH=/usr/bin/chromium pytest -q labs/tests/test_repaso_seguridad.py
```

La suite monta el HTML y sus dos scripts locales en un documento de Chromium. Prueba arranque con JavaScript realmente desactivado, pantalla completa nativa, modales y edición DOM. **localStorage y el cálculo del hash son dobles de prueba**; foco/visibilidad se simulan en los casos señalados. No atribuir a esta suite verificación de persistencia nativa, permisos de portapapeles o funcionamiento en todos los navegadores.

Comprobación manual en el navegador del aula: abrir la URL HTTPS, aceptar e iniciar; escribir respuestas; cambiar a otra ventana tres veces, regresando y continuando entre salidas; comprobar que no existe copia de revisión; probar copia/pegado; cerrar y reabrir con el mismo perfil comprobando el tiempo; cancelar y después confirmar la finalización y comprobar la descarga TXT; repetir con JavaScript desactivado. Revisar también pérdida de foco por herramientas de accesibilidad o diálogos del navegador antes de aplicar consecuencias en una evaluación.

El informe conserva el SHA-256 original. Es un checksum público **sin clave ni firma**: cualquiera que pueda editar el texto puede recalcularlo. Ni el hash, ni la URL registrada, ni los eventos locales demuestran autoría o ausencia de ayuda externa.

## Referencias técnicas

- Visibilidad: https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
- Foco: https://developer.mozilla.org/en-US/docs/Web/API/Window/blur_event
- Pantalla completa y activación del usuario: https://developer.mozilla.org/en-US/docs/Web/API/Element/requestFullscreen
- Persistencia: https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage
- Conflictos entre pestañas: https://developer.mozilla.org/en-US/docs/Web/API/Window/storage_event
- Pegado: https://developer.mozilla.org/en-US/docs/Web/API/Element/paste_event
- Antes de modificar: https://developer.mozilla.org/en-US/docs/Web/API/Element/beforeinput_event
- Inercia del árbol: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/inert
- HTML sin scripts: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/noscript

## Formato de entrega Base64

El informe completo (incluidos tiempo total, URL actual y checksum SHA-256) se convierte de UTF-8 a Base64 estándar. El TXT contiene la cadena Base64, sin cabecera ni BOM; no se ofrece copia ni previsualización en pantalla. La codificación conserva tildes, eñes, símbolos y emoji. No se añade una fase de borrador ni revisión.

Base64 es una codificación reversible, **no cifrado** ni una garantía de autenticidad. Las respuestas siguen disponibles en el navegador del alumno. La última línea del cuerpo registra `window.location.href` al generar el informe, incluyendo parámetros y fragmento. El checksum se calcula sobre ese cuerpo, incluida la URL, y se añade después; finalmente se codifica todo en Base64. Volver a descargar conserva la URL original. Los informes ya finalizados no se regeneran.

El guardado identifica los informes mediante `reportEncoding: "base64"`. Los informes anteriores en texto se convierten al cargar, una sola vez. Reabrir y volver a descargar no regenera ni vuelve a codificar el informe.

Para recuperar el informe con Python, sin enviar datos a servicios externos:

```python
import base64
from pathlib import Path

encoded = Path("repaso-ssii-u01.txt").read_text(encoding="utf-8-sig").strip()
report = base64.b64decode(encoded, validate=True).decode("utf-8")
Path("informe-decodificado.txt").write_text(report, encoding="utf-8")
```

## Identificación por correo

El campo de identidad solicita un correo electrónico obligatorio (máximo 254 caracteres) en lugar del nombre. La finalización comprueba que haya una parte local, una arroba y un dominio con punto, sin espacios; si falla, el intento sigue activo y el reloj continúa. Esta validación comprueba formato, no titularidad del correo. El informe lo identifica como «Correo electrónico». Los nombres guardados en intentos activos antiguos deben sustituirse por un correo válido antes de finalizar. Los informes ya finalizados se conservan.
