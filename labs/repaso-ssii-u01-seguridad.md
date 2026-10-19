# Repaso SSII UD01: seguridad, guardado e idiomas

Adaptación del flujo de `tmp/index.html`, `tmp/seguridad.js` y `tmp/examen.js`.
Se mantienen los 94 pasos, siete bloques, soluciones, pistas y comprobaciones del laboratorio. El orden se conserva porque las conversiones dependen de ejercicios anteriores.

## Procedimiento

1. Elegir español o inglés; los enunciados, opciones, pistas y mensajes de corrección se traducen. Los valores internos de las opciones permanecen estables para el corrector y los borradores.
2. Aceptar las condiciones e introducir nombre y correo del dominio exacto `g.educaand.es`. Se valida el formato, no la titularidad.
3. Iniciar mediante la API Fullscreen. Solo se permite editar con foco, visibilidad y pantalla completa, sin avisos o errores pendientes.
4. Las dos primeras salidas muestran avisos. La tercera detiene el reloj y cierra el intento **conservando todas las respuestas**, genera una entrega y bloquea la edición. Si la generación falla, se mantiene el estado `closing` y se permite reintentar.
5. La finalización voluntaria pide confirmación y permite respuestas pendientes. Se descarga un TXT, se copia el mismo código y se abre el formulario de entrega indicado para este laboratorio. **El alumno debe pulsar Enviar en Forms**; abrirlo no acredita recepción.
6. Si se deniega el portapapeles o la ventana emergente, la entrega permanece guardada y puede reintentarse. El código se copia para pegarlo en el nuevo formulario; no se reutilizan los identificadores de preguntas del formulario anterior.
7. Tras abrir el formulario se vuelve al selector. La última entrega se conserva en `sessionStorage` durante la sesión de esa pestaña y puede volver a copiarse o descargarse.

## Controles y persistencia

El controlador conserva la política de la referencia: agrupa señales de una misma salida, bloquea copiar/cortar/pegar/arrastrar, Control, teclas de función y botón derecho, y registra acciones bloqueadas con fecha, tipo y recuento. Estas acciones no suman salidas. No registra escritura normal ni lee el portapapeles.

La clave del laboratorio sigue siendo `ssii-repaso-ud01-seguridad-v1`; el borrador previo `ssii-repaso-ud01-v1` se importa sin borrar el original. No se usan las claves del examen de referencia. Se conservan respuestas, idioma, comprobaciones, pistas, reloj y entrega. Una recarga exige recuperación explícita y consume una incidencia adicional; una pausa guardada detiene el reloj hasta recuperar.

Los intentos activos antiguos sin la nueva identidad pasan a preparación conservando respuestas y tiempo acumulado, para aceptar el procedimiento e identificarse. Los informes antiguos ya finalizados se mantienen; el texto antiguo se convierte una sola vez a Base64. JSON dañado, fallos de escritura y cambios en otras pestañas bloquean el trabajo sin sobrescribir silenciosamente el guardado.

El HTML empieza cerrado mediante `hidden`, `inert` y `disabled`. El controlador, el adaptador y `repaso-ssii-u01-variantes.js` deben publicarse junto al HTML. No hay dependencias externas.

## Entrega

Los informes nuevos son JSON UTF-8 con versión 3, identificador `SSII-UD01`, idioma, identidad, tiempo, respuestas identificadas por su campo, estado de corrección, grupo, reflexión, comprobaciones, pistas, motivo de cierre, incidencias, acciones bloqueadas y URL. Las explicaciones siguen requiriendo revisión docente.

Se añade una línea `Código de comprobación: SSII3-<SHA-256>`, se comprime con gzip y se codifica en Base64URL con prefijo `SSII3G.`. El TXT y el código enviado al formulario son iguales. Es compresión/codificación reversible, no cifrado ni firma de autoría.

Decodificación local de informes nuevos y Base64 anteriores:

```python
import base64, gzip, hashlib, json
from pathlib import Path

code = Path("comprobante.txt").read_text(encoding="utf-8-sig").strip()
if code.startswith("SSII3G."):
    payload = code.split(".", 1)[1]
    report = gzip.decompress(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4))).decode("utf-8")
    body, checksum = report.rsplit("\nCódigo de comprobación: SSII3-", 1)
    assert hashlib.sha256(body.encode("utf-8")).hexdigest() == checksum
    answers = json.loads(body)
else:
    report = base64.b64decode(code, validate=True).decode("utf-8")
Path("informe-decodificado.txt").write_text(report, encoding="utf-8")
```

## Verificación

```sh
pip install pytest playwright
playwright install chromium
pytest -q labs/tests/test_repaso_seguridad.py
```

La suite usa DOM y Fullscreen de Chromium. Almacenamiento, portapapeles y hash son dobles de prueba; foco/visibilidad se simulan en los casos indicados. Las descargas y la compresión gzip se prueban en Chromium sin enviar respuestas reales a Forms.

Durante esta adaptación se ejecutaron pruebas de estado con un DOM simulado: arranque, dominio, inicio, idioma, guardado, corrector inglés, recarga, auditoría F12, agrupación de señales, avisos, tercer cierre, migración y conflictos. La ejecución local de Chromium está pendiente: el lanzador de procesos del entorno falla por una unidad BitLocker bloqueada.

Antes de publicar, ejecutar la suite de Chromium y comprobar en el navegador del aula los permisos reales de pantalla completa, portapapeles, descargas y ventanas emergentes, además del formulario de destino. Los controles son disuasorios: el alumno controla JavaScript y el almacenamiento; una incidencia no prueba copia.

## Barra fija, pausa y recuperación

La barra permanece visible al desplazarse y adapta el espacio superior a su altura real, también en móvil. Muestra Guardar y pausar, Recuperar práctica, contador compartido. El texto auxiliar bajo los botones se ha retirado.

Guardar y pausar conserva respuestas, correcciones, pistas, idioma, cantidades, bloqueos de ejercicios, tiempo e incidencias en el mismo navegador y perfil. Detiene el reloj antes de salir de pantalla completa; cerrar después de pausar no añade una salida. No es una copia exportada ni sincronizada entre dispositivos.

Cada recuperación correcta (incluida una recarga de un intento activo) suma **una incidencia al mismo límite de tres** que las pérdidas de foco. No crea un intento nuevo ni reinicia el contador. Con dos incidencias, el botón avisa de que recuperar finalizará. La tercera genera entrega conservando las respuestas. La denegación de pantalla completa no consume una recuperación. La entrega registra por separado el número de recuperaciones.

Se restaura exactamente el conjunto guardado de cantidades, también las de ejercicios vacíos. Solo al volver del foco durante el trabajo activo se renuevan los ejercicios sin empezar. Una recuperación guardada es una restauración, no una nueva generación. El autoguardado de cada edición sigue activo.

## Cantidades aleatorias de dificultad comparable

El módulo puro `repaso-ssii-u01-variantes.js` define rangos y calcula las soluciones; enunciados, etiquetas y corrector usan los mismos parámetros. Los datos se generan al comenzar un formulario nuevo y se renuevan al regresar de una salida para los ejercicios que no se han empezado.

Un ejercicio se considera empezado cuando se ha escrito o elegido alguna respuesta de su grupo. Su bloqueo se conserva incluso si después se vacía ese campo, evitando invalidar operaciones a medias. La conversión decimal→binario y su continuación a hexadecimal/octales comparten número y bloqueo.

| Ejercicio | Rango y complejidad |
| --- | --- |
| Descarga | 600–900 MB en saltos de 75; 2 o 2,5 minutos. |
| Subida | 1,2–2,4 GB; 64, 80 o 96 Mbit/s. Solo combinaciones con resultados decimales finitos de hasta 3 cifras. |
| Copia USB | 2 o 2,5 GB libres; 3–4 vídeos de 350–500 MB; 200–300 fotos de 1200–2000 kB; documentos de 150–250 MB. Se filtra para que quepa y sobren 25–300 MB, sin introducir restas negativas. |
| Carpetas binarias | 1,25–1,75 GiB y 512–896 MiB, en cuartos/octavos binarios exactos. |
| Binario→decimal | 160–190: siempre 8 bits y 4–5 bits a uno. |
| Divisiones y puente de bases | 42–47: siempre seis divisiones, dos dígitos hexadecimales con una letra, dos octales. |
| Hexadecimal→binario | A2–B9 con primer dígito A/B y segundo 2–9: dos dígitos, 8 bits. |
| Octal→binario | 241–277 en octal, con dígito final 1–7: tres grupos, 9 bits escritos. |
| Memoria direccionable | 11–13 bits, 1 byte por posición: 2–8 KiB. Dirección 16–24 y dato 5–9. |
| Ciclo | PC 16–24, sumando 3–7, registro 5–9: una suma y avance de PC de una posición. |

Los textos conceptuales y constantes de conversión (8 bits/byte, 1000 y 1024) no cambian. Las soluciones predeterminadas coinciden con el laboratorio anterior para migrar borradores. No se aceptan conjuntos guardados incompletos o fuera de los rangos; el estado inválido no se sobrescribe. Los informes incluyen `parameters` y `parameterLocks` junto a respuestas e idioma, de modo que pueden corregirse con los datos exactos.

Prueba numérica independiente del navegador:

```sh
node labs/tests/test_repaso_variantes.cjs
```

En esta revisión se ejecutaron las comprobaciones numéricas de 1000 conjuntos, equivalencia de los valores originales, ancho de conversiones, decimales finitos y rechazo de datos inválidos. También se ejecutaron 18 comprobaciones de estado con DOM simulado para pausa, recuperación, límite compartido, regeneración selectiva y conservación de parámetros. Las pruebas reales de Chromium continúan pendientes por el bloqueo del lanzador local.

## Formulario de entrega actual

Destino: https://docs.google.com/forms/d/e/1FAIpQLSfwo1fdBwSlm-iWU00VAiTdAueuuNTYQOl0iibaCpF69O5ZWg/viewform?usp=publish-editor

Se conserva la descarga TXT y la copia del código. El alumno pega el código, completa los campos y pulsa Enviar. El profesor ha facilitado el enlace prerrellenado con el campo `entry.659443543`. Se utiliza para incluir el código completo, codificado con encodeURIComponent, en la URL de apertura.

## Horas por intento sin servicios de IP externos

El estado incluye `attemptAudit.startedAt`, `finishedAt` e `ipSamples`. La hora inicial se conserva durante pausas/recuperaciones. La finalización voluntaria o por límite registra la hora de cierre. Los informes incluyen `attemptStartedAt` y `attemptFinishedAt` en ISO UTC y la referencia `Europe/Madrid`. Los eventos de pausa y recuperación conservan sus propias marcas temporales.

Por petición del usuario no se consulta ningún servicio para obtener la IP. JavaScript del navegador no dispone de una API fiable para leer la IP pública por sí solo. Se registra explícitamente IP nula y estado `unavailable` al iniciar o recuperar, sin inventar una dirección. No hay consultas HTTP de IP, WebRTC, STUN ni técnicas de identificación del navegador. El formulario de entrega autorizado se conserva.

Los intentos antiguos sin marcas de inicio conservan inicio nulo. Los datos se guardan localmente y dentro de la entrega; no se crea un servidor de vigilancia ni un historial central. Las horas dependen del reloj del dispositivo. El horario de SSII es una norma visible, no un bloqueo automático por horario.

Las pruebas comprueban inicio/fin, conservación tras recuperar, exportación y ausencia de solicitudes de red para la IP. Se ejecutaron pruebas con DOM simulado; Chromium local sigue bloqueado por BitLocker.


## Documento recuperable y barra de acciones

Guardar y pausar descarga un JSON identificado como SSII-UD01-SAVE, con estado validado, respuestas, cantidades, reloj e incidencias. No es la entrega final comprimida SSII3G. Recuperar práctica lee el archivo elegido y exige pulsar Continuar para solicitar pantalla completa y cargar una incidencia. Se rechazan documentos ajenos, finalizados, demasiado grandes o inválidos. Reabrir una copia antigua no reduce el contador del mismo intento conservado en este navegador. Sin servidor no puede impedirse que un usuario manipule el archivo o lo reutilice desde un navegador vacío.

La barra añade Entregar y Reiniciar. Entregar usa la confirmación y el informe final existentes: descarga TXT, copia el texto al portapapeles y abre el formulario autorizado. El campo de entrega se prerrellena mediante el enlace confirmado por el profesor; el alumno revisa y pulsa Enviar. Para enlaces de más de 8000 caracteres se muestra el aviso de pegado manual y se conserva el código completo en el portapapeles y TXT. Si el portapapeles está bloqueado, el prerrellenado normal sigue funcionando. Reiniciar pide confirmación, borra los datos locales del intento y vuelve al selector de idioma.

Validación adicional ejecutada con DOM simulado: exportación/importación en navegador vacío, respuestas y cantidades conservadas, contador al reutilizar archivo, rechazo de archivo inválido y reinicio activo confirmado. Actualizada la suite Playwright para archivos; su ejecución real sigue pendiente por el bloqueo local descrito arriba.


## Guardado comprimido y copia previa al reinicio

El documento recuperable se serializa como JSON y se comprime con gzip, codificado en Base64URL con prefijo SSII3G., igual que la entrega. Se descarga como TXT. El contenido mantiene la marca SSII-UD01-SAVE para distinguirlo del informe final; no se permite reanudar una entrega final. La recuperación descomprime con límite de 3 MB de salida y valida el documento, conservando compatibilidad con JSON antiguos.

Al confirmar Reiniciar, un intento activo se pausa y se descarga su documento antes de borrar el estado. Si falla la creación o descarga, no se borra. Un intento finalizado conserva su comprobante final mediante descarga; un estado inicial sin intento no necesita copia. El navegador puede solicitar o bloquear la descarga y no ofrece una confirmación de que el usuario haya conservado el archivo en disco. El botón de confirmación muestra Confirmar (Confirm en inglés).

Verificación: sintaxis JavaScript y estados simulados de copia anterior al reinicio y fallo de generación sin pérdida de respuestas. Añadidas pruebas Playwright para compresión gzip/Base64URL, recuperación del TXT y reinicio. Chromium sigue sin ejecutarse en este entorno por BitLocker.


## Comprobante recuperable

Los comprobantes nuevos usan el mismo documento SSII-UD01-SAVE, comprimido gzip/Base64URL SSII3G, que Guardar. Además del informe final, incluyen el estado completo. Este documento se conserva también en la copia de sesión para poder volver a descargarlo tras abrir Forms. El campo del formulario continúa recibiendo el informe final, no el contenedor recuperable.

Recuperar admite documentos pausados o entregados con menos de tres incidencias, restaura las cantidades y respuestas, elimina el informe anterior de la edición y exige Continuar, que añade una incidencia. Los intentos con tres incidencias no se reabren. No modifica ninguna respuesta ya enviada a Forms; una nueva entrega genera un informe nuevo. Los antiguos comprobantes que solo contienen informe conservan su formato histórico y no incluyen el estado necesario para esta recuperación.

Verificado con DOM simulado: exportación de un intento entregado, recuperación en el mismo navegador y en uno vacío, conservación de respuestas y rechazo del límite agotado. Añadida prueba Playwright del TXT descargado; su ejecución real continúa bloqueada por BitLocker.


## Flujo simplificado de inicio, guardado y recuperación

Grupo ya no se muestra en Antes de empezar; se mantiene un campo oculto para compatibilidad de documentos anteriores. Guardar y pausar pide Confirmar y explica que recuperar consumirá una de las tres incidencias; cancelar conserva la edición activa. La incidencia se sigue cargando al recuperar, no dos veces.

Seleccionar un archivo válido solicita pantalla completa antes de leerlo de forma asíncrona y abre directamente el intento recuperado. Se elimina el paso normal de Continuar práctica recuperada. Si el navegador deniega pantalla completa por falta de activación, conserva el documento y solicita un clic en Recuperar práctica, sin cargar todavía ninguna incidencia.

Verificado mediante DOM simulado: confirmación, cancelación, pausa y lectura de archivo con recuperación inmediata y una única incidencia. Suite Playwright adaptada, pendiente de ejecución real por BitLocker.


## Correo de recuperación y barra inicial

Antes de importar un documento, se exige un correo actual válido y se compara con el del archivo normalizando espacios exteriores y mayúsculas. Si falta o no coincide, muestra un error y no cambia el estado ni consume incidencias. La comparación ocurre antes de sustituir datos locales. Es una comprobación de coherencia del correo declarado, no autenticación de identidad.

La barra empieza oculta en el HTML y se mantiene oculta mientras se selecciona idioma, sin espacio superior reservado. Elegir un idioma la muestra y reajusta su altura; volver al selector la oculta.

Verificado con DOM simulado: correo ausente, distinto y coincidente normalizado; ausencia de cambios al rechazar y una incidencia al recuperar correctamente; visibilidad de barra. Suite Playwright actualizada, sin ejecución nativa por la limitación de BitLocker.


## Idioma y visibilidad de la barra

La vista sincroniza la barra en cada render: oculta únicamente sin idioma y visible después de seleccionarlo, también en pausa y recuperación. Se versionan las referencias a los scripts para evitar mezclas de HTML nuevo con JavaScript anterior en caché.

El documento incluye explícitamente language además del idioma del estado. Recuperar valida ambos y aplica el idioma del archivo, aunque en la pantalla inicial se haya elegido otro. Los documentos anteriores conservan compatibilidad mediante state.data.language. Verificado ES/EN con DOM simulado y añadida cobertura Playwright; sin ejecución nativa por BitLocker.


## Barra solo dentro de la práctica

La barra permanece oculta tanto al seleccionar idioma como al introducir nombre y correo. Se muestra al iniciar o recuperar la práctica y permanece disponible durante la pausa y la entrega. La pantalla de identificación incluye Recuperar práctica, habilitado con nombre y correo válidos, para conservar el acceso al archivo antes de entrar.

Verificado con DOM simulado en español e inglés: barra oculta durante identificación, recuperación inicial habilitada con datos válidos, barra visible al iniciar y pausar. Suite Playwright actualizada; ejecución nativa pendiente por BitLocker.


## Recuperación solo en el procedimiento

El único botón Recuperar práctica se encuentra en Procedimiento del laboratorio. Se elimina de la barra superior y el selector de archivo se invoca directamente desde el procedimiento. Al pausar o volver a un intento que necesita recuperación, se muestra de nuevo ese panel. Los avisos del archivo y del correo aparecen también allí. Verificado con DOM simulado: botón único, identificación inicial y acceso tras pausa.
