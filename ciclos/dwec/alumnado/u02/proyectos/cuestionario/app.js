"use strict";

// Cada fila contiene: enunciado, tres opciones y el índice de la correcta (0..2).
const preguntas = [
    ["¿Qué palabra declara una variable que puede reasignarse?", ["const", "let", "return"], 1],
    ["¿Qué tipo devuelve prompt() al aceptar?", ["string", "number", "boolean"], 0],
    ["¿Qué propiedad escribe texto sin interpretarlo como HTML?", ["innerHTML", "value", "textContent"], 2],
    ["¿Cómo se pasa una función como callback?", ["saludar()", "saludar", "return saludar()"], 1],
    ["¿Qué evita el envío convencional de un formulario?", ["preventDefault()", "querySelector()", "textContent"], 0]
];

// TODO: guarda el índice de pregunta (0) y los aciertos (0).
// TODO: esCorrecta(elegida, correcta) devuelve un booleano sin acceder al DOM.
// TODO: mostrarPregunta() usa preguntas[indice][0], [1] y [2].
// TODO: al enviar, busca input[name="respuesta"]:checked; puede devolver null.
// Si no hay selección, muestra un mensaje y no avances. Si existe, convierte value.
// TODO: suma un acierto solo si corresponde y avanza una pregunta.
// TODO: al terminar, oculta el formulario y muestra aciertos y porcentaje.
// TODO: reiniciar restaura datos, controles, mensajes y visibilidad.
// Registra submit y click una sola vez. No necesitas objetos ni APIs externas.

