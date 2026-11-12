import { protegerIntento } from "./intento.js";

const editor = document.querySelector("#text");
const vista = document.querySelector("#vista");
const ejecutar = document.querySelector("#ejecutar");
const estado = document.querySelector("#estado-vista");
let htmlInicial;
let cssInicial;
let intento;

async function leerArchivo(ruta) {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) throw new Error(ruta);
    return respuesta.text();
}

function archivoJS(texto) {
    return "data:text/javascript;charset=utf-8," + encodeURIComponent(texto);
}

function mostrarVista() {
    if (!intento?.canEdit()) return;
    const pagina = new DOMParser().parseFromString(htmlInicial, "text/html");
    const seguridad = pagina.createElement("meta");
    seguridad.httpEquiv = "Content-Security-Policy";
    seguridad.content = "default-src 'none'; script-src data:; style-src 'unsafe-inline'; form-action about:; base-uri 'none'";
    pagina.head.prepend(seguridad);

    const estilos = pagina.createElement("style");
    estilos.textContent = cssInicial;
    pagina.querySelector('link[rel="stylesheet"]').replaceWith(estilos);
    pagina.querySelector("form").action = "about:blank";

    const script = pagina.querySelector("script[src]");
    script.src = archivoJS(editor.value);
    const errores = pagina.createElement("script");
    errores.src = archivoJS(`const instalar = ${window.installPracticeInputGuards.toString()};
    function bloquear(evento) {
        evento.preventDefault();
        evento.stopImmediatePropagation();
        const {type, key, code, ctrlKey, metaKey, shiftKey, repeat, button, inputType} = evento;
        parent.postMessage({tipo: "accion-bloqueada", accion: {type, key, code, ctrlKey, metaKey, shiftKey, repeat, button, inputType}}, "*");
    }
    instalar(document, bloquear, true);
    document.addEventListener("beforeinput", evento => {
        if (["insertFromPaste","insertFromPasteAsQuotation","insertFromDrop","deleteByCut","deleteByDrag"].includes(evento.inputType)) bloquear(evento);
    }, true);
    window.addEventListener("error", e => {
        parent.postMessage({ tipo: "error-app-js", mensaje: e.message }, "*");
    });`);
    script.before(errores);

    vista.srcdoc = "<!doctype html>\n" + pagina.documentElement.outerHTML;
    estado.textContent = editor.value.trim()
        ? "Prueba el formulario con «Aceptar» y con Intro."
        : "El formulario está listo. Escribe tu JavaScript y pulsa el icono de actualizar.";
}

window.addEventListener("message", evento => {
    if (evento.source !== vista.contentWindow) return;
    if (evento.data?.tipo === "accion-bloqueada") {
        const accion = evento.data.accion;
        if (accion && ["keydown","contextmenu","copy","cut","paste","dragstart","dragover","drop","beforeinput","click","auxclick","dblclick","mousedown","mouseup","pointerdown","pointerup"].includes(accion.type)) intento?.auditAction(accion);
    }
    if (evento.data?.tipo === "error-app-js"
            && typeof evento.data.mensaje === "string") {
        estado.textContent = "Revisa app.js. " + evento.data.mensaje;
    }
});

try {
    [htmlInicial, cssInicial] = await Promise.all([
        leerArchivo("material/index.html"), leerArchivo("material/estilos.css")
    ]);
    document.querySelector("#fuente-html").textContent = htmlInicial;
    document.querySelector("#fuente-css").textContent = cssInicial;
    let vistaPreparada = false;
    intento = protegerIntento((fase, habilitado) => {
        if (habilitado && !vistaPreparada) {
            mostrarVista();
            vistaPreparada = true;
        } else if (fase !== "active" && vistaPreparada) {
            vista.removeAttribute("srcdoc");
            vistaPreparada = false;
        }
    });
    ejecutar.addEventListener("click", mostrarVista);
} catch {
    document.querySelector("#guard-boot").hidden = false;
    document.querySelector("#guard-boot-detail").textContent = "No se pudo iniciar el laboratorio. Comprueba la conexión y el almacenamiento de este navegador y recarga la página.";
}
