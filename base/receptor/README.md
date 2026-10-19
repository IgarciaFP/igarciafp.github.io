# Activar la recepción en Google Sheets

La plantilla guarda las respuestas en una hoja privada de Google Sheets, accesible para el docente mediante Drive. No hace falta Google Forms. No se comparte la hoja con el alumnado.

## Primera instalación

1. Abrir la hoja que recibirá las respuestas y elegir **Extensiones → Apps Script**. Crear el proyecto vinculado a esa hoja.
2. Copiar `Code.gs` al archivo de código del proyecto.
3. Crear un archivo **HTML** llamado `Bridge` y copiar `Bridge.html`.
4. En Configuración del proyecto, mostrar `appsscript.json` y sustituir su contenido por el manifiesto de esta carpeta. Incluye el servicio avanzado **Google Sheets API v4**. Si se utiliza un proyecto propio de Google Cloud, habilitar también esa API allí.
5. Revisar `CONFIGURACION_` en `Code.gs`: ID de práctica, versiones admitidas, dominio del correo y origen del sitio. Con `spreadsheetId: ''`, se utiliza la hoja a la que está vinculado el proyecto.
6. Seleccionar **configurarReceptor_** en el editor y pulsar **Ejecutar**. Autorizar el acceso a Sheets con la cuenta propietaria. Crea o verifica las cuatro pestañas sin borrar el contenido existente. Si una cabecera no coincide, se detiene para evitar escribir en una estructura equivocada.
7. Elegir **Implementar → Nueva implementación → Aplicación web**. Ejecutar como el propietario; permitir acceso a quienes vayan a entregar. Para el puente incrustado sin inicio de sesión, se necesita acceso **Cualquier persona**. La cuenta o el centro pueden impedirlo; en ese caso no activar la plantilla hasta adaptar la autenticación.
8. Copiar la URL que termina en `/exec` a `contenido/config.json`:

```json
"delivery": {
  "type": "apps-script",
  "endpoint": "https://script.google.com/macros/s/ID_DE_LA_IMPLEMENTACION/exec"
}
```

9. Publicar la configuración y hacer una entrega de prueba. Comprobar el mismo identificador en la confirmación del navegador y en `Entregas`, y el detalle en `Respuestas` y `DatosEntrega`. Esta comprobación real es necesaria: las pruebas locales no verifican permisos ni políticas de Google.

Hasta que `endpoint` tenga una URL válida, la plantilla muestra un aviso y no permite iniciar un nuevo intento. Una URL válida por sí sola no garantiza que Google esté configurado: la recepción siempre necesita una confirmación real del servidor.

## Estructura de la hoja

- **Entregas:** identificador, fecha de recepción del servidor (UTC), email y nombre declarados, grupo, práctica y versión, idioma, fecha de finalización del cliente, tiempo, incidencias declaradas, estado y número de respuestas.
- **Respuestas:** una fila por pregunta; incluye el identificador de la entrega y la comprobación realizada por el navegador. Esa comprobación no es la nota del docente.
- **DatosEntrega:** JSON original, dividido en fragmentos ordenados de hasta 40 000 caracteres. Conserva parámetros aleatorios, respuestas, tiempos y registro para la corrección posterior. Se reconstruye concatenando las partes de una misma entrega por su número.
- **Calificaciones:** email, nota, comentario, práctica, versión e identificador de entrega. El receptor no escribe notas; se rellenará cuando el docente solicite la corrección.

Las otras pestañas de la hoja se conservan.

## Otra práctica u otra hoja

El mismo proyecto puede gestionar varias prácticas. Añadir cada una a `CONFIGURACION_` con su ID, versiones y `spreadsheetId` de destino; ejecutar de nuevo `configurarReceptor_`. Mantener en esa lista todas las prácticas activas. En el sitio, ajustar `id`, `version` y `delivery.endpoint`. La hoja se elige en el servidor, no con un identificador enviado por el alumno.

Una única instalación del receptor debe gestionar cada destino para que su bloqueo coordine los envíos. Tras cambiar el código del receptor, actualizar la implementación con una nueva versión. Conservar versiones anteriores de los enunciados y criterios de corrección en Git; incrementar `config.version` cuando cambien.

## Envío, reintentos y respaldo

El navegador prepara el informe, descarga un TXT y envía el JSON mediante un puente de Apps Script y `google.script.run`. El puente se comunica con la práctica mediante `postMessage`, con origen y canal comprobados. No se usa `fetch` con `no-cors`: una respuesta opaca no serviría para confirmar la recepción.

El identificador es SHA-256 del JSON original. El receptor vuelve a calcularlo, bloquea escrituras concurrentes y utiliza una operación atómica de Sheets para guardar las tres pestañas. Reenviar exactamente el mismo informe devuelve la confirmación original y no añade filas. Si se pierde la conexión después de guardar, el alumno puede reintentar con el mismo identificador.

La copia pendiente se conserva en este navegador y perfil y se puede reenviar desde el selector inicial. El botón de descarga sigue disponible aunque el envío falle. Las calificaciones y entregas no se publican en GitHub.

## Identificación y límites

El sistema conserva la identificación por nombre y email escrito de la plantilla original: comprueba el formato y dominio, **no autentica la identidad del alumno**. El endpoint de recepción es público cuando se permite acceso anónimo; la comprobación de origen del puente no sustituye autenticación ni evita peticiones fabricadas. No ofrece ninguna función pública para leer entregas ajenas. Para comprobar identidad institucional habría que añadir inicio de sesión y verificar sus credenciales en el servidor.

El hash comprueba integridad y permite deduplicar; no es una firma ni prueba de autoría. Las incidencias y estados de corrección del navegador son orientativos. Las respuestas se escriben como texto literal, incluso si empiezan por `=`, para impedir su ejecución como fórmulas.

El receptor admite hasta 500 respuestas, 10 000 caracteres por respuesta y 500 000 caracteres de JSON por entrega. Los límites de tamaño y la división en fragmentos evitan truncar las respuestas. El servicio está sujeto a las cuotas de Apps Script y Sheets.

## Pruebas locales

Desde la raíz del repositorio:

```sh
node --test base/tests/*.test.cjs
```

Comprueban validación, deduplicación, errores de almacenamiento, fragmentos Unicode, texto literal y confirmaciones del transporte. No realizan envíos a Google.

Referencias: [aplicaciones web](https://developers.google.com/apps-script/guides/web), [comunicación con el servidor](https://developers.google.com/apps-script/guides/html/communication), [operaciones atómicas de Sheets](https://developers.google.com/workspace/sheets/api/guides/batchupdate).
