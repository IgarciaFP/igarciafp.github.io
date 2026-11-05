# Analizador de patrones de entregas frontend

Abre index.html o visita https://igarciafp.github.io/labs/ia/. Selecciona los lenguajes y pega el código. Los archivos enlazados no se descargan. Se admite HTML seguido de JS y se muestran patrones recuperables de código incompleto.

Los comentarios se envían a LanguageTool cada vez que pulsas Analizar entrega. El ejemplo muestra las faltas y sus sugerencias; en producción `ortografia.mostrarDetalle=false` conserva únicamente el recuento. Solo cuentan sustituciones de palabras completas por otras distintas de igual longitud Unicode, excluyendo avisos de estilo. Cada falta reduce el índice inicial un 10 %, hasta un máximo del 100 %. Una falta con varias sugerencias solo cuenta una vez. Sin faltas se suman 50 puntos. Si la API falla, no se asume cero faltas.

Las reglas universales exigen un 90 % de coincidencia. Longitud similar requiere que el 80 % de los comentarios esté dentro de ±25 % de la media. Pesos: comentarios escasos 100, caracteres especiales 75, ausencia de faltas 50, restantes 10. La puntuación es un índice docente configurable, no una probabilidad calibrada de uso de IA.

## Desarrollo

Instala con `npm install`, ejecuta `npm test` y reconstruye con `npm run build`. El HTML integra todas las dependencias del navegador. El análisis del código es local y no ejecuta el trabajo del alumno; la revisión lingüística requiere conexión. La API pública de LanguageTool está destinada a pruebas manuales; para lotes o automatizaciones usa una instancia propia o contratada mediante `ortografia.endpoint`. No incluyas claves privadas en el navegador.

Las pruebas usan respuestas simuladas del servicio. Licencias de las dependencias: THIRD_PARTY_NOTICES.md.
