# Receptor de entregas en Google Sheets

Escribe cada entrega en la pestaña **Entregas** de la hoja de cálculo del profesor, columnas A a I. La hoja sigue siendo privada: el script se ejecuta con la cuenta del propietario y los alumnos no pueden abrirla ni leerla.

| Columna | Contenido |
| --- | --- |
| A · DIA Y HORA | Fecha y hora de recepción en el servidor de Google, `DD/MM/AA HH:MM:SS` (hora de Madrid) |
| B · MODULO | `DIW`, `DWEC` o `SSII` |
| C · Nombre de la práctica | Título de la actividad |
| D · EMAIL | Correo con el que se identificó el alumno |
| E · PROBAR CODIGO | Enlace «Probar código»: abre `profesor.html` con esa entrega cargada |
| F · Tiempo | Tiempo empleado |
| G · IP | Solo la dirección IP; vacía si falta el sello o no es válido |
| H · Incidencias | `n/3` y todos los avisos: cierre automático, fuera de red/horario, clave del profesor, acceso sin comprobar y problemas de verificación del sello |
| I · ENTREGA completa | La entrega comprimida y codificada, igual que el archivo TXT del alumno |

Las columnas siguientes (Detección IA, NOTA, Comentarios) no se tocan. El receptor comprueba las nueve cabeceras antes de escribir y no escribe nada si alguna ha cambiado. Reenviar la misma entrega no añade otra fila.

## Instalación

1. Abrir la hoja de entregas y elegir **Extensiones → Apps Script**.
2. Sustituir el contenido de `Código.gs` por el de `Code.gs`.
3. Crear un archivo **HTML** llamado `Bridge` y pegar `Bridge.html`.
4. En **Configuración del proyecto**, mostrar `appsscript.json` en el editor y sustituirlo por el de esta carpeta.
5. Si se usa el servidor de control, poner su dirección en `SERVIDOR_`, al principio de `Code.gs`.
6. Seleccionar la función `configurar` en el desplegable del editor, pulsar **Ejecutar** y autorizar el acceso. Debe responder «Todo correcto». Si el script no se creó desde la hoja, escribir antes el ID de la hoja en `HOJA_ID_`.
7. **Implementar → Nueva implementación → Aplicación web**: ejecutar como «Yo» y dar acceso a «Cualquier usuario». Esto publica el script, no la hoja.
8. Copiar la dirección que termina en `/exec` en `contenido/config.json`:

   ```json
   "delivery": {
     "type": "apps-script",
     "endpoint": "https://script.google.com/macros/s/ID_DE_LA_IMPLEMENTACION/exec"
   }
   ```

9. Hacer una entrega de prueba y comprobar que aparece la fila y que «Probar código» abre la entrega.

Tras cambiar `Code.gs` hay que actualizar la implementación con una versión nueva; la dirección no cambia.

## Límites

- El correo es el que escribe el alumno: se comprueba el dominio, no la identidad.
- La dirección `/exec` es pública. El receptor solo acepta entregas bien formadas de los tres módulos y del dominio del centro, pero no puede impedir envíos fabricados; el sello del servidor de control es lo que acredita IP y hora.
- Una celda admite 50 000 caracteres. Si una entrega codificada no cabe, la fila se añade con un aviso en las columnas E e I y hay que pedir el archivo TXT al alumno.

## Notas desde la revisión del profesor

La página `profesor.html` consulta y modifica la columna cuya cabecera sea «nota» (sin distinguir mayúsculas ni espacios exteriores), situada después de A–I. No crea la columna ni toca otras celdas. La identifica por el hash de la entrega completa de la columna I: no depende del número de fila ni del orden de la hoja.

1. Actualiza **Code.gs y Bridge.html** con los archivos de esta carpeta.
2. Publica una nueva versión de la implementación existente de Apps Script, conservando su URL.
3. Abre «Probar código», introduce la **CLAVE_PROFESOR del Worker** e inicia sesión.
4. Consulta la nota actual, edítala y pulsa «Guardar nota». «Actualizar nota» vuelve a consultar la hoja. Dejar el campo vacío borra la calificación.
5. La sesión se recuerda durante 30 días en el mismo navegador y perfil. «Cerrar sesión» revoca el identificador. No se guarda la clave: el navegador guarda un token aleatorio y el servidor su hash con caducidad en las propiedades del script.

La consulta y escritura requieren validación de sesión en el servidor. Los alumnos no reciben acceso a las notas. La primera autenticación verifica la clave con el Worker; no requiere modificarlo. Los cambios manuales detectados desde la última consulta producen un aviso de conflicto; actualiza la nota antes de guardar de nuevo. El bloqueo del script coordina sus propias escrituras, pero no bloquea la edición simultánea desde Google Sheets.

Las entregas sin código completo en I, los borradores y las entregas duplicadas no se califican desde esta página: se muestra un aviso. Las notas numéricas se guardan como números; otros textos se guardan literalmente, nunca como fórmulas. Una nota con fórmula escrita previamente en la hoja se muestra con su resultado; guardar una nueva nota sustituye esa fórmula.

## Oportunidades de entrega

El receptor consulta `actividades/MODULO/ACTIVIDAD/config.json` y cuenta las oportunidades ordinarias (`entregas`, por defecto 1) por correo y actividad. No bloquea nuevas entregas al agotarlas: las añade como filas adicionales y marca Incidencias sin modificar notas anteriores. Los reintentos idénticos no añaden filas.

La consulta previa `consultarOportunidades` solo devuelve el contador y el límite configurado, para advertir antes de empezar. La recepción vuelve a contar bajo bloqueo. Las nuevas filas incluyen metadatos en una nota de la celda I, sin añadir columnas. Actualiza **Code.gs y Bridge.html** y publica una nueva versión.

El inicio utiliza caché y consulta el contador sin bloquear. Las entregas manuales adicionales requieren `revisionReason` con 20 letras como mínimo y hasta 2000 caracteres. Se guarda en Incidencias; si falta, se devuelve `REVISION_REASON` sin escribir la fila. Los cierres automáticos se conservan sin bloquearlos por este formulario. Para este cambio actualiza Code.gs; Bridge.html no cambia.
