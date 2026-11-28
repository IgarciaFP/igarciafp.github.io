# Soluciones y análisis de corrección

Los dos prompts de corrección usan estos formatos. Se validan en `motor/revision-modelo.js`. El contenido del alumno se trata como datos y se presenta como texto, nunca como instrucciones ni HTML ejecutable.

## Solución de referencia

`solucion.json` es público y no se cifra, incluso cuando la actividad está cifrada. Las copias archivadas se guardan en `soluciones/<revision>/solucion.json` y `soluciones/<versionActividad>/solucion.json`. La revisión debe ser un identificador estable de hasta 80 caracteres, con letras, números, guiones o guion bajo.

```json
{
  "format": "base4-solution-v1",
  "activity": {"module": "dwec", "id": "02-01-prueba", "version": "1"},
  "revision": "modelo-1",
  "createdAt": "2026-11-28T12:00:00Z",
  "sections": [
    {"id": "web", "type": "webcode", "explanation": "Objetivo y comprobación del modelo.", "code": {"html": "<p>Modelo</p>", "css": "", "js": ""}},
    {"id": "texto", "type": "qa", "questions": [{"id": "q1", "answer": "Respuesta de referencia", "explanation": "Justificación"}]},
    {"id": "test", "type": "test", "questions": [{"id": "q2", "correctOption": 1, "answer": "Texto de la opción correcta", "explanation": "Justificación"}]}
  ]
}
```

`correctOption` utiliza el índice original de `preguntas.json`, de 0 a 3; no la posición aleatoria mostrada al alumno. En una actividad antigua de un solo apartado, el ID de apartado es `principal`. Para completar, `answer` contiene el fragmento completo resuelto. Para consola, contiene la salida literal, con sus saltos de línea.

## Análisis individual

La columna privada `Análisis de la nota` contiene un JSON `base4-analysis-v1`, de hasta 50000 caracteres. Su `submissionId` es el SHA-256 verificado del informe original, no el ID de fila ni el de alumno. `attemptId` identifica el intento cuando está disponible. Todos los apartados y preguntas deben usar los ID estables de la entrega.

```json
{
  "format": "base4-analysis-v1",
  "submissionId": "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
  "attemptId": "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
  "activity": {"module": "dwec", "id": "02-01-prueba", "version": "1"},
  "generatedAt": "2026-11-28T12:00:00Z",
  "rubricVersion": "1",
  "solutionVersion": "modelo-1",
  "score": {"earned": 1, "max": 2},
  "summary": "Resumen concreto de la valoración.",
  "sections": [{
    "id": "texto", "type": "qa", "score": {"earned": 1, "max": 2},
    "items": [{
      "id": "q1", "title": "Pregunta o criterio", "status": "partial",
      "score": {"earned": 1, "max": 2}, "summary": "Explicación del crédito parcial.",
      "positives": ["Acierto comprobado"], "errors": ["Error concreto"],
      "improvements": ["Mejora prioritaria"], "evidence": ["Respuesta, archivo/línea o prueba que lo demuestra"]
    }]
  }]
}
```

Estados admitidos: `correct`, `partial`, `incorrect`, `unanswered`, `unverified`. Para aspectos pendientes de verificación, `earned` puede ser `null`, también en los subtotales afectados. Eso no representa una nota de cero. Las sumas de los ítems, apartados y total deben coincidir. No se añade una penalización académica por las incidencias del navegador salvo que la rúbrica lo exija.

## Enlace de revisión

El enlace mantiene `revisor.html#entrega=...`. Si existe análisis, el valor empieza por `BASE4R1.` y continúa con Base64url, sin relleno, de gzip de este JSON UTF-8:

```json
{"format":"base4-review-v1","document":"SSII3G.documento-original","analysis":{}}
```

`document` conserva el documento original y su comprobación, normalmente comprimido con el prefijo histórico `SSII3G.`. `analysis` contiene el objeto completo validado. No incluye contraseñas ni entregas cifradas `SSII4E1.`. El análisis queda vinculado al hash del informe original; un análisis de otra entrega se rechaza sin sustituir notas. Los enlaces antiguos sin este contenedor siguen admitidos.

El análisis del enlace es una copia individual. El profesor consulta la columna original mediante la sesión autenticada de Apps Script; su nota manual sigue teniendo prioridad. Si la nota vigente difiere de la nota explicada por la IA, el visor lo indica. No se publican JSON de análisis de alumnos en GitHub ni se añaden columnas a las hojas públicas de los módulos.

## Receptor de Google Sheets

La columna nueva es opcional para leer entregas históricas. El receptor actualizado la devuelve como `analisisNota` y conserva los demás campos del protocolo. Al guardar una nota, genera el enlace con el análisis de la misma entrega ganadora. El origen cifrado y la calificación manual permanecen intactos.

Después de actualizar `receptor/Code.gs` hay que publicar una versión nueva de la aplicación web de Apps Script, conservando su URL e implementación. Publicar archivos en GitHub no actualiza por sí solo el código que Google ejecuta.
