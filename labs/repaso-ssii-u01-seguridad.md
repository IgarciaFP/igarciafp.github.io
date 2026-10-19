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

La barra permanece visible al desplazarse y adapta el espacio superior a su altura real, también en móvil. Muestra Guardar y pausar, Recuperar práctica, contador compartido y estado del guardado.

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
