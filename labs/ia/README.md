# Analizador de patrones de entregas frontend

Abre index.html o visita https://igarciafp.github.io/labs/ia/. Pega la entrega: se clasifica automáticamente en texto, HTML, CSS y JavaScript. Revisa los fragmentos en «Contenido separado por tipo» y selecciona cuáles analizar. Los archivos enlazados no se descargan. Se admite HTML seguido de JS y se muestran patrones recuperables de código incompleto.

El texto y los comentarios seleccionados se envían a LanguageTool al pulsar Analizar entrega. El ejemplo muestra las faltas y sus sugerencias; en producción `ortografia.mostrarDetalle=false` conserva únicamente el recuento. Solo cuentan palabras originales de más de 4 letras cuya sugerencia sustituya, añada o elimine un único carácter (longitud ±1, normalización Unicode NFC). Dos cambios, transposiciones, palabras idénticas y avisos de estilo quedan excluidos. Cada falta reduce el índice inicial un 10 %, hasta un máximo del 100 %. Una falta con varias sugerencias solo cuenta una vez. Sin faltas se suman 50 puntos. Si la API falla, no se asume cero faltas.

Las reglas universales exigen un 95 % de coincidencia. Longitud similar requiere que el 95 % de los comentarios esté dentro de ±25 % de la media. Pesos: comentarios escasos 100, caracteres especiales 75, ausencia de faltas 50, restantes 10. La puntuación es un índice docente configurable, no una probabilidad calibrada de uso de IA.

## Desarrollo

Instala con `npm install`, ejecuta `npm test` y reconstruye con `npm run build`. El HTML integra todas las dependencias del navegador. El análisis del código es local y no ejecuta el trabajo del alumno; la revisión lingüística requiere conexión. La API pública de LanguageTool está destinada a pruebas manuales; para lotes o automatizaciones usa una instancia propia o contratada mediante `ortografia.endpoint`. No incluyas claves privadas en el navegador.

Las pruebas usan respuestas simuladas del servicio. Licencias de las dependencias: THIRD_PARTY_NOTICES.md.


## Preparación y llamada

```js
import { prepararEntrega, analizarEntregaAsync } from './analizador-entregas.mjs';
const preparada = prepararEntrega(entradaDelAlumno);
// preparada.bloques: { texto: [...], html: [...], css: [...], javascript: [...] }
// Cada fragmento: { texto, nombre, base } (base = líneas anteriores).
const resultado = await analizarEntregaAsync(preparada, 'texto + javascript');
```

También se puede llamar directamente con un string o con `{texto, html, css, javascript}`; `js` sigue siendo un alias válido. La preparación es independiente de la selección y puede reutilizarse para otras llamadas. Sin selección no se analiza nada. El informe JSON incluye `preparacion` con el original y los cuatro depósitos, también los no analizados. La interfaz conserva estos datos en memoria; no usa almacenamiento permanente.

Para entregas mixtas, utiliza bloques Markdown con etiqueta `texto`, `html`, `css` o `javascript`: la prosa exterior se conserva como texto. Un HTML separa los cuerpos ejecutables de `script` y `style`; su contenido textual entre etiquetas pertenece a HTML. También se admite una introducción antes de un documento HTML completo. El contenido ambiguo se conserva como texto con un aviso; puedes indicar su tipo en el selector o mediante un objeto. No se garantiza separar fragmentos arbitrarios de prosa y código sin delimitadores. No se admiten JSX ni TypeScript.

El texto analiza caracteres especiales, espacios invisibles, menciones de IA y ortografía. Las reglas de código y densidad de comentarios no se aplican a prosa. La revisión lingüística recibe únicamente el texto seleccionado y los comentarios de los lenguajes seleccionados. Los patrones son observaciones para revisión, no pruebas de autoría ni de plagio.

La exclusión inglesa usa un glosario local de términos técnicos, no un reconocimiento completo del idioma. Está activa por defecto al revisar idiomas distintos del inglés; puede desactivarse con `ortografia.excluirIngles=false`. Amplíalo con `ortografia.terminosIgnorados: ['workflow', 'repository']` o desde la interfaz. Se filtran los avisos recibidos, sin alterar el texto enviado ni sus posiciones. El JSON registra `terminosExcluidos` y `exclusionIngles`. Una palabra inglesa fuera del glosario todavía puede recibir una corrección; una palabra compartida por idiomas incluida en él se excluye también.
