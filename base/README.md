# Plantilla de prácticas de laboratorio

Esta carpeta es la base para las próximas prácticas de SSII, DWEC y DIW. Incluye el repaso de SSII U01 como contenido de ejemplo funcional.

## Organización

- `index.html`: interfaz común (idioma, identificación, barra de herramientas y diálogos).
- `motor/estilos.css`: presentación compartida.
- `motor/cargador.js`: carga y valida la configuración y el contenido antes de iniciar.
- `motor/laboratorio.js`: idiomas, corrección, progreso, reloj, informes y entrega.
- `motor/entregas.js`: envío y confirmación de recepción en Google Sheets.
- `receptor/`: proyecto Apps Script y guía de instalación.
- `motor/seguridad.js`: estados del intento, controles del navegador, guardado y recuperación.
- `contenido/config.json`: identidad de la práctica, títulos ES/EN, reglas, dominio del correo, destino de entrega y formatos.
- `contenido/actividad.html`: enunciados, ayudas, campos y navegación del cuaderno.
- `contenido/actividad.json`: bloques, campos, soluciones y traducciones del contenido.
- `contenido/variantes.js`: generador de datos y soluciones específicos de esta actividad.
- `repaso-ssii-u01.html`: acceso compatible que redirige a `index.html`.

## Crear otra práctica

1. Copiar esta carpeta a la ubicación de la nueva práctica.
2. Editar `contenido/config.json`: usar un `id` y un `filePrefix` propios, títulos en español e inglés, reglas y `version` del contenido. Configurar `delivery.endpoint` con la URL del receptor de Apps Script. El destino de Sheets se registra en el receptor según se explica en [su guía](receptor/README.md).
3. Asignar claves únicas a los tres valores de `storage`, para no mezclar intentos entre prácticas del mismo sitio. La plantilla ya usa claves distintas de `/labs/repaso-ssii-u01.html`.
4. Asignar un identificador propio a `format.save`, que impide importar archivos de otra práctica. `format.report` y `format.checksum` identifican el formato de informe: coordinar cualquier cambio con la herramienta de corrección. El ejemplo mantiene los identificadores anteriores de SSII y admite sus TXT.
5. Sustituir los enunciados en `actividad.html` y sincronizar sus campos y bloques con `actividad.json`.
6. Adaptar `variantes.js` o utilizar el adaptador vacío que se muestra debajo.

No es necesario modificar `motor/` para cambiar el módulo, las preguntas, las respuestas, el número de bloques o los datos variables.

## Contrato del contenido

`actividad.json` contiene:

- `sections`: lista de objetos `{ "id", "title", "time" }`.
- `fields`: lista de objetos `{ "id", "label", "answer", "kind", "section" }`.
- `translations`: diccionario de texto original español a inglés. Se traduce cada nodo de texto del cuaderno; las claves deben coincidir exactamente, incluidos espacios. Los valores de las opciones se conservan para corregir en ambos idiomas.

Los tipos de campo son `number` (decimal con coma o punto), `choice` (opción), `digits` y `groups` (texto normalizado), y `open` (revisión del profesor). Las soluciones numéricas se expresan como números JSON. Los campos abiertos tienen `answer: null`.

El HTML del cuaderno debe conservar los elementos comunes `lab`, `answer-fields`, `reflection-fields`, `group`, `reflection`, `guard-finish`, `progress`, `progressText` y `saveStatus`. Cada bloque necesita su `id`, un estado `status-ID` y un botón `data-check="ID"`. Cada campo necesita su `id`, un contenedor `.field` y un mensaje `feedback-ID`. Las ayudas se sitúan en `.exercise details`. Los identificadores deben ser únicos en toda la página. El cargador comprueba los vínculos entre campos y bloques antes de habilitar el inicio.

## Variantes propias o sin aleatoriedad

`contenido/variantes.js` registra `window.Lab.variants`. El contrato es:

- `groups`: nombres de grupos asociados a listas de identificadores de campos.
- `defaults`: parámetros iniciales.
- `sanitize(parameters)`: valida y devuelve una copia de los parámetros.
- `create(group, previous)`: genera nuevos parámetros del grupo.
- `derive(parameters)`: devuelve `{ answers, prompts, labels }`; cada prompt/label contiene `[es, en]` y corresponde a `variant-CLAVE` o `variant-label-ID` en el HTML.
- `render(derived, getElement, languageIndex)`: opcional, para representación específica del ejercicio.

Para una práctica sin variantes:

```js
window.Lab.variants = {
  groups: {}, defaults: {},
  sanitize: () => ({}),
  create: () => ({}),
  derive: () => ({ answers: {}, prompts: {}, labels: {} })
};
```

En ese caso se usan las respuestas fijas de `actividad.json`.

## Uso y comprobación

Publicar mediante GitHub Pages o ejecutar un servidor local desde la raíz del repositorio:

```sh
python3 -m http.server 8000
```

Abrir `http://localhost:8000/base/`. No abrir con `file://`: la plantilla carga los archivos de contenido mediante `fetch`. El navegador necesita admitir las mismas funciones de pantalla completa, almacenamiento y compresión que la práctica original.

Antes de publicar una nueva actividad, comprobar ambos idiomas, identificación, inicio, corrección, guardado y recuperación, y generación del TXT. La entrega en Google Sheets solo se considera recibida cuando el servidor devuelve su identificador y fecha. Si falla, las respuestas se conservan para reintentar. Sin URL de receptor configurada no se permite iniciar un intento.

Los controles del navegador son disuasorios: las soluciones y el código se descargan en el cliente. No constituyen una plataforma de examen seguro.

## Identificación y barra superior

El paso inicial se titula «Identificación». Nombre y correo aparecen directamente, sin casilla de aceptación ni textos introductorios. Se recuerda la última identidad escrita mediante localStorage, en la clave `config.storage.key + '-identity'`. Los campos siguen siendo editables y el nombre y correo institucional se validan antes de iniciar. Si existe un intento guardado, se mantiene su mecanismo de recuperación y comprobación de identidad.

La barra mantiene el fondo azul oscuro original, diferencia «Entregar» como acción principal y agrupa tiempo e incidencias. Se adapta a pantallas estrechas. El mensaje de una entrega confirmada es «Ya has completado este laboratorio».

El index incluye una versión en las URLs del CSS y del cargador. El cargador propaga esa versión a los archivos de contenido y scripts. Al modificar archivos de la plantilla, actualizar ambos parámetros `v` en index.html para evitar mezclar archivos en caché de distintas versiones.

Estas opciones de presentación no configuran el destino de entrega: cada laboratorio conserva su identificador, sus claves y el receptor propios.
