"use strict";

// Ayuda facilitada: no necesitas implementar la reproducción de audio.
// Recibe "aviso", "acierto" o "error". Los sonidos están incluidos en el HTML.
function reproducirSonido(nombre) {
    const audio = document.querySelector("#sonido-" + nombre);
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {
        document.querySelector("#mensaje").textContent = "No se pudo reproducir el audio.";
    });
}

// TODO: selecciona los tres botones y registra la MISMA función en cada uno.
// TODO: en el manejador, usa evento.currentTarget.id para llamar a la ayuda.
// TODO: muestra el nombre del sonido en #mensaje.
// TODO: compara evento.target y evento.currentTarget al pulsar el span interior.
// No necesitas bucles, animaciones ni eventos del teclado para esta versión.

