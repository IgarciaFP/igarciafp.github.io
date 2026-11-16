# Plantilla 2 · Laboratorios en español

Plantilla independiente de /base para crear prácticas de SSII, DWEC y DIW. Abre directamente «Identificación», sin selección de idioma ni casilla de aceptación. Incluye el repaso de SSII UD01 como contenido de ejemplo.

## Interfaz

Nombre y correo aparecen desde el inicio. Se recuperan del almacenamiento local cuando existen y siguen siendo editables. La barra superior conserva el fondo azul oscuro, las acciones de guardar, recuperar, entregar y reiniciar, y el tiempo e incidencias del intento.

Todas las pantallas, preguntas, variantes, mensajes e informes utilizan español, también al recuperar o reiniciar una práctica. Si existe una entrega confirmada, el aviso «Ya has completado este laboratorio» aparece junto a la identificación.

## Crear un laboratorio

1. Copia esta carpeta a la ruta del nuevo laboratorio.
2. Edita contenido/config.json: asigna un id, filePrefix, version y claves storage propios. Cambia format.save para impedir que se importen archivos de otra práctica. title y rules son listas con una única entrada en español.
3. Sustituye los enunciados de contenido/actividad.html y sincroniza los campos, respuestas y bloques de contenido/actividad.json. No hay diccionario de traducciones.
4. Adapta contenido/variantes.js. Los textos de prompts y labels son listas con una única entrada en español; el motor utiliza siempre el índice 0.
5. Configura delivery.endpoint con la URL /exec del receptor de Apps Script y registra el mismo id y version en el receptor. Consulta [la guía de instalación](receptor/README.md).
6. Actualiza el parámetro v de las dos URLs de recursos de index.html cuando modifiques archivos, para evitar que se mezclen versiones en caché.

El destino de entrega está vacío de forma intencionada: la plantilla muestra la identificación, pero no permite empezar hasta configurarlo. No utiliza las hojas ni los receptores de otros laboratorios. La confirmación de recepción requiere la respuesta real del servidor.

## Organización

- index.html: identificación, barra superior y diálogos.
- motor/: carga del contenido, presentación, estado del intento, guardado, recuperación y entrega.
- contenido/: configuración, HTML, campos y variantes del laboratorio.
- receptor/: código y documentación del receptor de Google Sheets.
- tests/: comprobaciones del envío y del receptor.

Las claves de esta plantilla comienzan por base2 y son independientes de /base. La identidad se recuerda en config.storage.key + '-identity'. Conserva identificadores distintos cuando copies la plantilla para otra práctica.

## Contrato del contenido

actividad.json define sections, con id, title y time, y fields, con id, label, answer, kind y section. Los tipos son number, choice, digits, groups y open. Los campos abiertos utilizan answer: null y quedan pendientes de revisión docente.

El HTML conserva los elementos lab, answer-fields, reflection-fields, group, reflection, guard-finish, progress, progressText y saveStatus. Cada bloque necesita su id, status-ID y un botón data-check. Cada campo necesita su id, un contenedor .field y feedback-ID. Las ayudas se incluyen en .exercise details.

El adaptador window.Lab.variants expone groups, defaults, sanitize, create y derive. derive devuelve answers, prompts y labels. Puede incluir render para representaciones específicas. Si no se necesitan variantes, utiliza grupos y parámetros vacíos y devuelve objetos vacíos en answers, prompts y labels.

## Comprobación

Publica mediante GitHub Pages o sirve el repositorio por HTTP, por ejemplo con python -m http.server 8000, y abre /base2/. La carga de contenido mediante fetch requiere HTTP(S).

Comprueba identificación y edición de los datos recordados, inicio, corrección, guardado y recuperación mediante TXT, reinicio y generación de entrega. Los archivos y los informes conservan language: 'es' por compatibilidad con el formato de registro. La recuperación rechaza archivos de otro laboratorio o idioma.

Las pruebas del motor de entregas se ejecutan con node --test base2/tests/*.test.cjs desde la raíz del repositorio. Una entrega real de prueba debe verificar también los permisos de Apps Script y el registro en Google Sheets.

Los controles del navegador conservan el comportamiento de la plantilla original. Las soluciones se descargan al cliente; no es un sistema de examen seguro.

