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
| G · IP | IP vista por el servidor de control; añade `(FUERA DE LA RED)`, o `SIN COMPROBAR` si no hay sello |
| H · Incidencias | `n/3`; añade `cierre automático`, `FUERA DE HORARIO` o `acceso sin comprobar` si procede |
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
