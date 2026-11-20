# Receptor de entregas en Google Sheets

Escribe cada entrega en la pestaña **Entregas** de la hoja de cálculo del profesor, columnas localizadas por el nombre de su cabecera. La hoja sigue siendo privada: el script se ejecuta con la cuenta del propietario y los alumnos no pueden abrirla ni leerla.

| Columna | Contenido |
| --- | --- |
| DIA Y HORA | Fecha y hora de inicio registrada en el servidor de Google, `DD/MM/AA HH:MM:SS` (hora de Madrid) |
| MODULO | `DIW`, `DWEC` o `SSII` |
| Nombre de la práctica | Título de la actividad |
| EMAIL | Correo con el que se identificó el alumno |
| PROBAR CODIGO | Enlace «Probar código»: abre `profesor.html` con esa entrega cargada |
| Tiempo | Tiempo empleado |
| IP | Solo la dirección IP; vacía si falta el sello o no es válido |
| Incidencias | Número de incidencias y todos los avisos: cierre automático, fuera de red/horario, clave del profesor, acceso sin comprobar y problemas de verificación del sello |
| ENTREGA completa | La entrega comprimida y codificada, igual que el archivo TXT del alumno |

Las columnas existentes siguientes (Detección IA, NOTA, Comentarios) no se tocan; ID y NUM ENTREGA se reutilizan donde estén; solo se añaden al final si faltan. El receptor comprueba que cada cabecera necesaria exista una sola vez, independientemente de su posición. Reenviar la misma entrega no añade otra fila.

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

El enlace «Probar código» se genera con `paginaProfesor_(datos)`: las entregas cuya URL pertenece a `/base4/` abren `/base4/profesor.html`; las de base3 y las antiguas sin URL conservan `/base3/profesor.html`. El fragmento `#entrega=` se conserva completo. Este cambio necesita publicarse en Apps Script: actualizar el archivo en GitHub no modifica el receptor activo ni los enlaces ya guardados.

## Límites

- El correo es el que escribe el alumno: se comprueba el dominio, no la identidad.
- La dirección `/exec` es pública. El receptor solo acepta entregas bien formadas de los tres módulos y del dominio del centro, pero no puede impedir envíos fabricados; el sello del servidor de control es lo que acredita IP y hora.
- Una celda admite 50 000 caracteres. Si una entrega codificada no cabe, la fila se añade con un aviso en las columnas E e I y hay que pedir el archivo TXT al alumno.

## Notas desde la revisión del profesor

La página `profesor.html` consulta y modifica la columna cuya cabecera sea «nota» (sin distinguir mayúsculas ni espacios exteriores), en cualquier posición. No crea la columna ni toca otras celdas. La identifica por el hash de la entrega completa de la columna «ENTREGA completa»: no depende del número de fila ni del orden de la hoja.

1. Actualiza **Code.gs y Bridge.html** con los archivos de esta carpeta.
2. Publica una nueva versión de la implementación existente de Apps Script, conservando su URL.
3. Abre `base4/profesor.html` o su enlace de entrega. La pantalla de entrada pide únicamente la **CLAVE_PROFESOR del Worker**. El enlace se conserva durante el acceso.
4. Al seleccionar una entrega se consultan automáticamente la nota del profesor y la propuesta IA. Edita la calificación y pulsa «Guardar nota y comentarios». Volver a seleccionar la entrega recarga la hoja; dejar el campo vacío borra la calificación manual.
5. La sesión se recuerda durante 30 días en el mismo navegador y perfil. «Cerrar sesión» revoca el identificador. No se guarda la clave: el navegador guarda un token aleatorio y el servidor su hash con caducidad en las propiedades del script.

La consulta y escritura requieren validación de sesión en el servidor. Los alumnos no reciben acceso a las notas. La primera autenticación verifica la clave con `POST /base4/profesor` del Worker de base4. Publica el Worker actualizado antes de desplegar este receptor. Los cambios manuales detectados desde la última consulta producen un aviso de conflicto; actualiza la nota antes de guardar de nuevo. El bloqueo del script coordina sus propias escrituras, pero no bloquea la edición simultánea desde Google Sheets.

El receptor admite `action: session` para validar una sesión recordada antes de mostrar el visor. Las columnas **NOTA IA** y **COMENTARIOS IA** se buscan por cabecera y se devuelven como `notaIA` y `comentariosIA`, únicamente después de validar la sesión. Son de solo lectura desde el visor y guardar la nota manual nunca las modifica. Un cero se muestra como cero; las celdas vacías se indican como pendientes. Si las cabeceras faltan o están duplicadas se informa sin impedir la corrección manual ni crear columnas.

Esta ampliación requiere **actualizar Code.gs y publicar una nueva versión de la implementación existente**, conservando la URL. Publicar los archivos en GitHub Pages no despliega Apps Script. Hasta actualizarlo, se puede iniciar sesión con la contraseña, pero la propuesta IA mostrará un aviso de receptor pendiente de actualización. No es necesario cambiar Bridge.html para esta ampliación. La interfaz no incluye los antiguos botones «Actualizar nota» y «Copiar texto del correo»; «Enviar por email» sigue abriendo un borrador en Gmail.

Las entregas sin código completo en I, los borradores y las entregas duplicadas no se califican desde esta página: se muestra un aviso. Las notas numéricas se guardan como números; otros textos se guardan literalmente, nunca como fórmulas. Una nota con fórmula escrita previamente en la hoja se muestra con su resultado; guardar una nueva nota sustituye esa fórmula.


## Edición de instrucciones y rúbrica desde profesor.html

Añade **Contenido.gs** al mismo proyecto de Apps Script y actualiza **Code.gs**. En Configuración del proyecto → Propiedades del script, configura `BASE4_GITHUB_TOKEN` con un token fino de GitHub limitado al repositorio `IgarciaFP/igarciafp.github.io` y permiso **Contents: Read and write**. Nunca lo pegues en HTML, JavaScript público ni archivos del repositorio. Después publica una nueva versión de la implementación existente manteniendo la URL.

El editor permite modificar `enunciado.html` de la actividad o de su apartado seleccionado, y `rubrica.json` de la actividad. La edición de rúbrica usa campos para título, criterios, puntos y niveles; el servidor valida la estructura y actualiza su versión. Cada guardado crea un commit en `main` y devuelve su enlace. La API rechaza una versión SHA obsoleta para no sobrescribir cambios ajenos. El guardado se limita a estos archivos bajo `base4/actividades/`; no admite rutas de base3, código del alumno, configuración de acceso ni archivos arbitrarios. Referencia: https://docs.github.com/en/rest/repos/contents#create-or-update-file-contents

Los cambios se reflejan inmediatamente en la revisión abierta y en la web tras desplegar GitHub Pages. No modifican entregas históricas ni recalculan notas IA. La pantalla de revisión siempre identifica la rúbrica como la versión publicada actualmente.

## Red de base4

La restricción de IP se aplica únicamente al abrir la actividad mediante `/base4/acceso`, con la política de los dos primeros octetos. En `/base4/sello` se registra y firma la IP, pero no se rechaza un cambio posterior de red. `/base4/verificar` valida la firma sin repetir la restricción de acceso. El receptor no vuelve a comparar base4 con redes de la actividad ni con los valores heredados de base3, y no añade «FUERA DE LA RED» por la IP de entrega. Se conservan los datos y la firma para comprobar integridad. Las rutas y el comportamiento de base3 no se modifican. Este cambio necesita el despliegue del Worker y del receptor; los avisos históricos de la hoja permanecen sin alterar.

## Registro inicial y panel definitivo

Al empezar se genera un ID aleatorio y se registra en segundo plano una fila con fecha y hora de inicio (Madrid), módulo, actividad, correo e IP. Se localizan **ID** y **NUM ENTREGA** (también se acepta **Número de entrega**) en cualquier posición. Si faltan se crean al final, sin desplazar «nota». El número se asigna en el servidor bajo bloqueo para el mismo correo y práctica. Los intentos iniciados, aunque se abandonen, consumen una oportunidad.

La entrega final actualiza esa fila por ID; conserva los datos iniciales y las notas del profesor. En Incidencias quedan el estado inicial pendiente, o los avisos y el motivo al completar. La hora de recepción final se conserva en los metadatos de la celda de «ENTREGA completa» y se devuelve en el comprobante. Reintentar una petición no crea filas duplicadas.

- **Manual:** «Entregar» muestra un aviso sencillo que permite cancelar. Al aceptarlo se entra en el panel definitivo, se para el reloj y no se puede volver al editor.
- **Automática con intentos:** abre el mismo panel y envía sin esperar confirmación.
- **Automática sin intentos:** abre ese panel y espera un motivo de al menos 20 letras antes de enviar.
- El motivo ocupa un campo de **2rem** de alto y se almacena en Incidencias.
- «Cerrar sin entregar» exige confirmación. Recargar o cerrar la pestaña muestra la advertencia nativa del navegador cuando este la permite. Al salir se elimina la copia local pendiente; queda la fila inicial, no una entrega completa. No se recuperan comprobantes finalizados como prácticas editables.

El ID se mantiene al guardar y recuperar una práctica pausada. El registro inicial se reintenta con el mismo ID antes del envío si falló la red; no se puede garantizar el registro remoto sin conexión. La actualización final de base4 conserva el control de horario y la firma, sin repetir la restricción de red inicial. Si se rechaza, la fila inicial sigue pendiente y el panel permite reintentar.

**Despliegue:** sustituir **Code.gs y Bridge.html** y publicar una nueva versión de la implementación existente. La URL de Apps Script se conserva; el Worker debe incluir la ruta `/base4/profesor`. Solo se crean columnas de identificación si faltan. El orden ID, NUM ENTREGA, DIA Y HORA, MODULO, Nombre de la práctica, EMAIL… es válido.

## Hoja vacía y errores de cabecera

Al ejecutar `configurar`, una pestaña Entregas completamente vacía se inicializa con ID, NUM ENTREGA, las nueve cabeceras de entrega y nota. Una pestaña con contenido nunca se reinicializa ni se reordena. Si falta una cabecera o está repetida, el registro de ejecución indica su nombre; el protocolo del navegador conserva el código SCHEMA.

El botón de limpieza local se muestra como un icono de recarga junto a Empezar, con el tooltip «Flush Caché». El pie del laboratorio muestra una fecha y hora de revisión fija, actualizada al modificar su HTML (Europe/Madrid), no la fecha de apertura.

## Revisor de solo lectura (base4/revisor.html)

La página abre sin contraseña y admite archivos y enlaces #entrega=. No permite modificar datos y muestra el ID del alumno, sin dominio. Cerrar cierra la pestaña o la deja en blanco.

La nota y el comentario se leen de las publicaciones públicas de DIW, DWEC y SSII configuradas en motor/revisor.js, utilizando CSV. Se busca primero ID entrega junto al ID del alumno y, si falta el intento por una deduplicación, ID del alumno más actividad. Las coincidencias ambiguas se notifican. La prioridad profesor/IA se resuelve al volcar los datos en esas hojas, de manera independiente para nota y comentario. Google puede tardar en actualizar la publicación.

No necesita publicar Apps Script ni utiliza tokens o contraseñas para consultar la calificación. La acción pública review propuesta anteriormente se ha retirado del código del receptor: no hace falta implementarla. Las operaciones de gestión del profesor siguen requiriendo sesión.

En los volcados derivados, sustituye /base3/profesor.html o /base4/profesor.html por /base4/revisor.html y conserva íntegro el fragmento de entrega. El prompt actualizado está en ../prompt-correccion.txt, con copia sincronizada en ../correccion/instrucciones.txt.
