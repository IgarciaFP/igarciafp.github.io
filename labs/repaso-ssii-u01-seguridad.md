# Repaso SSII UD01: seguridad, guardado e idiomas

Adaptación del flujo de `tmp/index.html`, `tmp/seguridad.js` y `tmp/examen.js`.
Se mantienen los 94 pasos, siete bloques, soluciones, pistas y comprobaciones del laboratorio. El orden se conserva porque las conversiones dependen de ejercicios anteriores.

## Procedimiento

1. Elegir español o inglés; los enunciados, opciones, pistas y mensajes de corrección se traducen. Los valores internos de las opciones permanecen estables para el corrector y los borradores.
2. Aceptar las condiciones e introducir nombre y correo del dominio exacto `g.educaand.es`. Se valida el formato, no la titularidad.
3. Iniciar mediante la API Fullscreen. Solo se permite editar con foco, visibilidad y pantalla completa, sin avisos o errores pendientes.
4. Las dos primeras salidas muestran avisos. La tercera detiene el reloj y cierra el intento **conservando todas las respuestas**, genera una entrega y bloquea la edición. Si la generación falla, se mantiene el estado `closing` y se permite reintentar.
5. La finalización voluntaria pide confirmación y permite respuestas pendientes. Se descarga un TXT, se copia el mismo código y se abre el mismo Google Forms que en la referencia, con el nombre de actividad «Repaso SSII · Unidad 01». **El alumno debe pulsar Enviar en Forms**; abrirlo no acredita recepción.
6. Si se deniega el portapapeles o la ventana emergente, la entrega permanece guardada y puede reintentarse. Para enlaces de más de 7000 caracteres se copia el código y se pide pegarlo en Forms.
7. Tras abrir el formulario se vuelve al selector. La última entrega se conserva en `sessionStorage` durante la sesión de esa pestaña y puede volver a copiarse o descargarse.

## Controles y persistencia

El controlador conserva la política de la referencia: agrupa señales de una misma salida, bloquea copiar/cortar/pegar/arrastrar, Control, teclas de función y botón derecho, y registra acciones bloqueadas con fecha, tipo y recuento. Estas acciones no suman salidas. No registra escritura normal ni lee el portapapeles.

La clave del laboratorio sigue siendo `ssii-repaso-ud01-seguridad-v1`; el borrador previo `ssii-repaso-ud01-v1` se importa sin borrar el original. No se usan las claves del examen de referencia. Se conservan respuestas, idioma, comprobaciones, pistas, reloj y entrega. Una recarga exige reanudar; el reloj cuenta durante las interrupciones.

Los intentos activos antiguos sin la nueva identidad pasan a preparación conservando respuestas y tiempo acumulado, para aceptar el procedimiento e identificarse. Los informes antiguos ya finalizados se mantienen; el texto antiguo se convierte una sola vez a Base64. JSON dañado, fallos de escritura y cambios en otras pestañas bloquean el trabajo sin sobrescribir silenciosamente el guardado.

El HTML empieza cerrado mediante `hidden`, `inert` y `disabled`. El controlador y el adaptador deben publicarse junto al HTML. No hay dependencias externas.

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
