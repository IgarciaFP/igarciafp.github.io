const editor = document.querySelector("#text");
const vista = document.querySelector("#vista");
const ejecutar = document.querySelector("#ejecutar");
const estado = document.querySelector("#estado-vista");
const claveBorrador = "dwec-validar-correo:app.js";
let htmlInicial;
let cssInicial;

try {
    if (!editor.value) editor.value = sessionStorage.getItem(claveBorrador) || "";
} catch { /* La práctica también funciona sin almacenamiento local. */ }
editor.dispatchEvent(new Event("input"));

editor.addEventListener("input", () => {
    try { sessionStorage.setItem(claveBorrador, editor.value); } catch { /* Almacenamiento desactivado. */ }
});

async function leerArchivo(ruta) {
    const respuesta = await fetch(ruta);
    if (!respuesta.ok) throw new Error(ruta);
    return respuesta.text();
}

function archivoJS(texto) {
    return "data:text/javascript;charset=utf-8," + encodeURIComponent(texto);
}

function mostrarVista() {
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
    errores.src = archivoJS(`window.addEventListener("error", e => {
        parent.postMessage({ tipo: "error-app-js", mensaje: e.message }, "*");
    });`);
    script.before(errores);

    vista.srcdoc = "<!doctype html>\n" + pagina.documentElement.outerHTML;
    estado.textContent = editor.value.trim()
        ? "Prueba el formulario con «Aceptar» y con Intro."
        : "El formulario está listo. Escribe tu JavaScript y pulsa «Ejecutar código».";
}

window.addEventListener("message", evento => {
    if (evento.source === vista.contentWindow && evento.data?.tipo === "error-app-js"
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
    mostrarVista();
    ejecutar.disabled = false;
    ejecutar.addEventListener("click", mostrarVista);
} catch {
    estado.textContent = "No se han podido cargar los archivos de partida. Recarga la página para volver a intentarlo.";
}
