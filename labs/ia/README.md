# Analizador de patrones de entregas frontend

Abre index.html o visita https://igarciafp.github.io/labs/ia/. Pega la entrega: se clasifica automáticamente en texto, HTML, CSS y JavaScript. Revisa los fragmentos en «Contenido clasificado» y selecciona cuáles analizar. Los archivos enlazados no se descargan. Se admite HTML seguido de JS y se muestran patrones recuperables de código incompleto.

El texto y los comentarios seleccionados se envían a LanguageTool al pulsar Analizar entrega. El ejemplo muestra las faltas y sus sugerencias; en producción `ortografia.mostrarDetalle=false` conserva únicamente el recuento. Para las tildes, solo cuentan sugerencias que añadan una tilde omitida a una vocal minúscula, sin cambiar ninguna otra letra (normalización Unicode NFC). También cuentan los inicios de frase en minúscula, espacios ausentes tras puntuación y aperturas ¿/¡ ausentes propuestas por la API. Se conservan palabras de cualquier longitud como contexto, pero solo se cuentan faltas desde tres letras. Dos cambios, transposiciones, palabras idénticas y avisos de estilo quedan excluidos. El descuento es proporcional: faltas distintas ÷ líneas de texto/comentarios revisadas × 500, con un máximo del 100 %. Las líneas vacías, el código y las líneas sin palabras elegibles no cuentan. Una falta con varias sugerencias solo cuenta una vez. Sin faltas se suman 25 puntos. Si la API falla, no se asume cero faltas.

Las reglas universales exigen un 95 % de coincidencia. Longitud similar requiere que el 95 % de los comentarios esté dentro de ±25 % de la media. Pesos: comentarios escasos 100, caracteres especiales 60, ausencia de faltas 25, restantes 10. La puntuación es un índice docente configurable, no una probabilidad calibrada de uso de IA.

## Desarrollo

Instala con `npm install`, ejecuta `npm test` y reconstruye con `npm run build`. El HTML integra todas las dependencias del navegador. El análisis del código es local y no ejecuta el trabajo del alumno; la revisión lingüística requiere conexión. La API pública de LanguageTool está destinada a pruebas manuales; para lotes o automatizaciones usa una instancia propia o contratada mediante `ortografia.endpoint`. No incluyas claves privadas en el navegador.

Las pruebas usan respuestas simuladas del servicio. Licencias de las dependencias: THIRD_PARTY_NOTICES.md.


## Preparación y llamada

```js
import { prepararEntrega, analizarEntregaAsync } from './analizador-entregas.mjs';
const preparada = prepararEntrega(entradaDelAlumno);
// preparada.bloques: { texto: [...], html: [...], css: [...], javascript: [...] }
// Cada fragmento: { texto, nombre, base } (base = líneas anteriores).
const [comentariosEscasos, humanidad, reglas] = await analizarEntregaAsync(preparada, 'texto + javascript');
```

También se puede llamar directamente con un string o con `{texto, html, css, javascript}`; `js` sigue siendo un alias válido. La preparación es independiente de la selección y puede reutilizarse para otras llamadas. Sin selección se analizan todos los tipos detectados con contenido no vacío. El informe JSON incluye `preparacion` con el original y los cuatro depósitos, también los no analizados. La interfaz conserva estos datos en memoria; no usa almacenamiento permanente.

Para entregas mixtas, utiliza bloques Markdown con etiqueta `texto`, `html`, `css` o `javascript`: la prosa exterior se conserva como texto. Un HTML separa los cuerpos ejecutables de `script` y `style`; su contenido textual entre etiquetas pertenece a HTML. También se admite una introducción antes de un documento HTML completo. El contenido ambiguo se conserva como texto con un aviso; puedes indicar su tipo en el selector o mediante un objeto. No se garantiza separar fragmentos arbitrarios de prosa y código sin delimitadores. No se admiten JSX ni TypeScript.

El texto analiza caracteres especiales, espacios invisibles, menciones de IA y ortografía. Las reglas de código y densidad de comentarios no se aplican a prosa. La revisión lingüística recibe únicamente el texto seleccionado y los comentarios de los lenguajes seleccionados. Los patrones son observaciones para revisión, no pruebas de autoría ni de plagio.

La exclusión inglesa usa un glosario local de términos técnicos, no un reconocimiento completo del idioma. Está activa por defecto al revisar idiomas distintos del inglés; puede desactivarse con `ortografia.excluirIngles=false`. Amplíalo con `ortografia.terminosIgnorados: ['workflow', 'repository']` o desde la interfaz. Las palabras excluidas se sustituyen por espacios antes de enviar la prosa, conservando sus posiciones. El JSON registra `terminosExcluidos` y `exclusionIngles`. Una palabra inglesa fuera del glosario todavía puede recibir una corrección; una palabra compartida por idiomas incluida en él se excluye también.

## Glosario técnico y camelCase

`glosario-tecnico.json` contiene las fuentes y listas separadas de JavaScript, HTML, CSS, SSII U01 y SSII U02. Todos los términos tienen más de cuatro letras, incluidos los del glosario inglés. JavaScript incluye reservadas actuales, de modo estricto y contextuales; HTML recoge nombres de elementos, atributos, eventos, interfaces y valores de su índice oficial; CSS recoge propiedades, selectores, reglas, funciones y palabras de sus sintaxis en MDN Data, incluidos nombres compuestos y sus componentes de más de cuatro letras. Son catálogos a fecha de la actualización, no identificadores personalizados ni todos los términos que puedan incorporarse en versiones futuras.

Las rutas reales de SSII son `ciclos/ssii/u01_es.html` y `ciclos/ssii/u02_es.html`. Se ha seleccionado vocabulario técnico del texto visible y verificado su presencia, sin añadir toda la prosa al glosario. La coincidencia es exacta, sin distinguir mayúsculas y con normalización NFC: una errata distinta del término sigue siendo analizable.

La exclusión técnica y la de camelCase/PascalCase son siempre activas en ortografía, independientes de la opción inglesa. Se reconoce un cambio interno de minúscula a mayúscula en una palabra o identificador completo de más de cuatro letras; también se excluyen avisos parciales dentro de él. Una mayúscula inicial aislada no es camelCase. El código conserva su análisis estructural y de patrones. Los campos `tecnicosExcluidos` y `camelCaseExcluidos` documentan las palabras retiradas antes de enviar la petición. Se conserva el texto original por separado.

## Orden del proceso

1. Separar la entrada en texto, JavaScript, HTML y CSS.
2. Extraer comentarios del código seleccionado; el texto libre no necesita extracción.
3. Analizar la estructura y los patrones del código seleccionado.
4. Preparar texto/comentarios para ortografía con `prepararProsa`: retirar glosario, camelCase/PascalCase y tokens con puntos internos (`nombre.js`). Se sustituyen por espacios manteniendo posiciones y saltos de línea. Un punto final de oración no elimina la palabra. También se excluyen URL, código Markdown y etiquetas JSDoc.
5. Enviar únicamente la prosa preparada a LanguageTool. Si no quedan palabras, no consultar ni asignar cero faltas. Se aceptan exclusivamente las cuatro categorías detalladas al final.
6. Evaluar las reglas de formato sobre los originales y calcular el resultado. Las mayúsculas, los puntos y la longitud similar no se miden sobre texto depurado.

El JSON conserva `preparacionProsa` con originales, fragmentos filtrados y exclusiones con motivo y línea. `analizarEntregaAsync` realiza el flujo completo; `analizarEntrega` es la variante local síncrona y deja pendiente la revisión externa.

La regla `ausencia_faltas` distingue `estadoRevision`: `no_realizada`, `fallida` y `completada`. Sin comprobación completa, `peso` y `puntosAplicados` son 0; `pesoConfigurado` conserva 25 (o el peso configurado). Una comprobación completa sin faltas activa la regla y aporta 25 por defecto. Una respuesta vacía, incompleta, fallida o la ausencia de palabras analizables no se interpreta como cero faltas.

La interfaz muestra siempre los bloques TXT, JS, HTML y CSS, en ese orden, con el contenido separado o «Vacío», incluso antes de introducir una entrega y después de limpiar.

## Salida pública: vector de tres elementos

`analizarEntregaAsync` (flujo completo) y `analizarEntrega` (solo local, sin ortografía externa) devuelven `[a, b, c]`:

- `a`: booleano que indica si se activa la regla de menos de un comentario por diez líneas de código seleccionado. Exactamente 1/10 no la activa. No se aplica a texto libre ni a código que no permite calcular la densidad completa.
- `b`: `100 - puntuacion`, después del límite de 100 y de la reducción ortográfica; se redondea a dos decimales. Se denomina humanidad como índice heurístico, no como probabilidad ni prueba de autoría. Sin contenido evaluable es `null`.
- `c`: array con las reglas aplicables, detectadas y con peso positivo. Cada objeto contiene `id`, `peso` y `coincidencias` (lenguaje, archivo, valor, evidencias y demás detalles). Cada ID aparece una sola vez; sus coincidencias se agrupan para no duplicar el peso. El peso es el configurado antes de la reducción global por faltas.

Para obtener el informe completo usa `analizarEntregaDetalladaAsync` o `analizarEntregaDetallada`. La página usa este informe para mostrar la clasificación, incidencias y reglas, y muestra además su vector mediante `crearVectorResultado(informe)`. Descargar JSON conserva el informe detallado. Las llamadas que antes leían `.puntuacion` deben migrar a las funciones detalladas o desestructurar el vector.

## Ausencia de contenido y comentarios

Los tipos solicitados vacíos se ignoran. Si ninguno de los solicitados tiene datos, se analiza el bloque TXT (`texto`); no se convierte código de otros bloques en texto. Si TXT también está vacío, la puntuación es `null` y se informa `Código/texto no detectado` para texto, sin activar `a`. La ausencia de JS ya no provoca rechazo. Si se activa la regla de comentarios escasos, su objeto incluye `mensaje: 'No se admite código sin comentar'`, incluso con peso configurado a cero. Exactamente un comentario por diez líneas no activa esa regla.

JS se reconoce entre etiquetas `script` ejecutables y suelto al comenzar por `"use strict"`, `'use strict'`, `let`, `const` o `function`, también tras una introducción en una línea anterior. Se conserva el código incompleto para informar errores de sintaxis. Si se pega HTML en la entrada marcada JS, se extraen sus scripts. Los scripts externos no se descargan y los bloques JSON no cuentan como JS.

El final de cada fragmento JS se fija en la última aparición de `}` o `;`, incluida. El contenido posterior no vacío se conserva en TXT con sus líneas de origen. Se aplica tanto a JS suelto como a scripts extraídos de HTML. Si no aparece ninguno de esos símbolos, se conserva el fragmento para diagnosticar código incompleto.

Para pegados mixtos se separa primero el documento desde `<!` hasta su cierre `</html>`. Los fragmentos anteriores y posteriores se clasifican por separado; pueden producir JS y/o TXT. Los scripts internos siguen extrayéndose como JS. También se aplica si la entrada mixta se etiqueta JS o HTML; no se separa un documento escrito dentro de una cadena JavaScript válida.

La exigencia de comentarios solo se aplica a partir de 10 líneas de código seleccionadas. De 1 a 9 líneas, la regla no aplica, no suma puntos y no activa el rechazo por comentarios. Desde 10 líneas se mantiene la proporción mínima de un comentario por cada diez líneas. Las líneas vacías y las que solo contienen comentarios no cuentan. La ausencia de JS solicitado no activa por sí sola el primer parámetro del vector.



La categoría de tildes cuenta únicamente tildes omitidas en `a/e/i/o/u` minúsculas: `esta → está`, `arbol → árbol`, `numero → número`. No se elimina ninguna palabra por ser corta. Se ignoran `Arbol → Árbol`, `ARBOL → ÁRBOL`, tildes sobrantes, diéresis, eñes y demás erratas. `Numero → Número` sí cuenta porque la vocal que debía llevar tilde es minúscula. Se mantienen las demás exclusiones; el código breve también se analiza, sin patrones de repetición.

El código de 1–9 líneas se analiza con normalidad, incluida la revisión de tildes y la exigencia de al menos un comentario. Se elimina la salida fija `[false, 50, ""]`. Solo se omiten los patrones de repetición y uniformidad enumerados en `PATRONES_REPETICION`: mayúsculas y puntos uniformes, longitudes similares, separación y separadores, comentarios repetidos, sangría, comillas y validaciones repetidas. No aportan puntuación ni evidencias. Desde 10 líneas se evalúan normalmente. `analizarEntregaAsync` devuelve el vector; `analizarEntregaInformeAsync` devuelve el informe completo con esta misma política y lo utiliza el HTML de prueba.

El descuento ortográfico aumenta con la densidad de faltas: `reduccion = min(1, 5 * faltasUnicas / lineasRevisadas)`. Se aplica al índice previo a la reducción, no como puntos directos. Una falta en 10 líneas descuenta el 50 %; una en 20, el 25 %; dos distintas en 10, el 100 %. Se cuentan líneas de origen distintas con palabras elegibles del texto/comentarios seleccionados, después de las exclusiones. El informe incluye `descuentoOrtografico` con faltas, líneas revisadas, porcentaje y fórmula. Sin revisión completada solo puede aplicarse descuento por expresiones vigiladas comprobadas localmente.

Solo se cuentan palabras de tres letras o más. Se conservan palabras más cortas como contexto, pero no generan faltas ni líneas revisables por sí solas. Las faltas de tilde se deduplican por palabra original normalizada (NFC, sin distinguir mayúsculas): la misma palabra repetida cuenta una vez en toda la prosa seleccionada. Se excluye cada aviso cuya explicación (`message`, `shortMessage` o descripción de regla) contenga «Si es», sin distinguir mayúsculas; los demás avisos siguen evaluándose. Las evidencias indican las apariciones y el informe distingue faltas únicas y repeticiones. Se mantienen las exclusiones de glosario, camelCase, puntos internos y vocales mayúsculas.

La selección de tipos es opcional: `await analizarEntregaAsync(entrada)` analiza todos los bloques TXT, HTML, CSS y JS que no estén vacíos tras la separación. Una cadena vacía o de espacios tiene el mismo efecto. Si se indica una selección explícita, se analizan los tipos pedidos que tengan datos; si ninguno tiene datos, se analiza TXT.

Las penalizaciones se multiplican por `2 ** floor(lineasCodigoAnalizadas / 25)`: 0–24 líneas ×1, 25–49 ×2, 50–74 ×4, 75–99 ×8. Solo cuentan líneas con código de los tipos seleccionados; texto, comentarios y líneas vacías no incrementan el factor. Se multiplica la suma de pesos antes de limitarla a 100 y aplicar el descuento por faltas. El informe conserva `sumaPesosBase`, `lineasCodigoAnalizadas` y `multiplicadorPenalizaciones`; los pesos individuales siguen mostrando su valor base.


## Categorías de faltas

- `tilde_omitida`: palabra de al menos tres letras; una única tilde ausente en vocal minúscula.
- `inicio_minuscula`: aviso `UPPERCASE_SENTENCE_START` que solo cambia la primera letra a mayúscula. Se comprueba el contexto original para no fabricar inicios al eliminar términos del glosario. Puede comenzar por una palabra corta, como «el».
- `espacio_puntuacion`: la sugerencia solo inserta espacios después de `. , ; : ! ?` antes de una letra. No cuentan espacios anteriores, sobrantes ni cambios adicionales.
- `apertura_ausente`: aviso `ES_QUESTION_MARK` que solo antepone `¿` o `¡`. No incluye signos de cierre ausentes.

Se trabaja con la prosa preparada; los tokens con puntos internos (por ejemplo `nombre.js`), URLs y demás exclusiones siguen fuera. Los inicios y la puntuación se cuentan cuando LanguageTool informa de ellos, no se presume que la API detecte todos los casos. Los errores estructurales se deduplican por categoría, fragmento y continuación de frase normalizados; los de tilde, por palabra. Una misma frase repetida no multiplica el error. El informe incluye `faltasPorTipo`; todas las categorías suman en `faltas` y usan el descuento progresivo vigente. El umbral de tres letras también se aplica a las líneas revisables. Los avisos «Si es» y de estilo permanecen excluidos.


## Expresiones vigiladas

Se detectan localmente las doce expresiones de `EXPRESIONES_VIGILADAS`: «de que», «hubieron», «han habido», «habían», «sobretodo», «mi», «tu», «a parte», «aun», «ni si quiera», «a ver» y «preveer». Se buscan palabras/frases completas en la prosa preparada, sin distinguir mayúsculas y normalizando espacios y Unicode; se conserva la distinción de tilde (`aun` no coincide con `aún`, ni `mi/tu` con `mí/tú`). Las exclusiones y los límites de palabras impiden encontrar trozos de identificadores, URLs o nombres de archivo. No se fabrican frases al borrar términos excluidos.

Cada expresión distinta cuenta una vez en el descuento vigente, incluso cuando LanguageTool no la señala. Se identifican como `expresion_vigilada`, no como errores gramaticales confirmados, porque pueden ser correctas según el contexto. `mi` y `tu` son excepciones explícitas al mínimo de tres letras y hacen elegible la línea. Los avisos API que se solapan con una expresión no duplican su recuento; «Si es» sigue excluyendo avisos API, pero no las coincidencias literales de esta lista.

El detalle incluye `expresionesVigiladas` con cada expresión y sus apariciones. Si falla el servicio, las coincidencias locales se conservan con `estadoRevision: "parcial"`, sin puntos por ausencia de faltas; únicamente estas coincidencias participan en el descuento. Si no hay coincidencias locales, el fallo conserva el comportamiento anterior: sin descuento ni penalización de ausencia de faltas.

La revisión lingüística cuenta también la falta de separación tras `//`, `/*`, `/**` y `<!--`, y antes de `*/` y `-->`, solo en comentarios reales de los lenguajes seleccionados. Se aceptan espacios, tabulaciones y saltos de línea; los comentarios vacíos no generan esta incidencia. Apertura y cierre son faltas diferentes; la misma falta en un comentario repetido cuenta una vez. Estas comprobaciones locales siguen contando si falla el servicio ortográfico.
