const porId = id => document.getElementById(id);
const actividad = "Lab: Validar un dato";
const claveIntento = "dwec-validar-edad-intento-v1";
const prefijoCopias = claveIntento + ":finalizados:";

export function protegerIntento(actualizarSesion) {
    const editor = porId("text");
    const alumno = porId("student");
    const informe = porId("report");
    const nuevo = porId("nuevo-intento");
    const descargar = porId("descargar-codigo");
    let inicio = null;
    let transcurrido = 0;
    let intento;
    let urlCodigo;
    let faseActual = "ready";
    let abrirAlFinalizar = false;

    function vacio() {
        return {values: {student: "", text: ""}, report: "", started: null, elapsed: 0, language: "es"};
    }
    function leer() {
        return {values: {student: alumno.value.trim().toLowerCase(), text: editor.value},
            report: informe.value, started: inicio, elapsed: transcurrido, language: "es"};
    }
    function restaurar(datos) {
        alumno.value = datos.values.student;
        editor.value = datos.values.text;
        informe.value = datos.report;
        inicio = datos.started;
        transcurrido = datos.elapsed;
    }
    function prepararDescarga() {
        if (urlCodigo) URL.revokeObjectURL(urlCodigo);
        urlCodigo = URL.createObjectURL(new Blob([editor.value], {type: "text/plain;charset=utf-8"}));
        descargar.href = urlCodigo;
        descargar.download = "Lab-Validar-un-dato.txt";
    }
    function mostrarFinalizado() {
        prepararDescarga();
        porId("panel-resultado").hidden = false;
        porId("reportStatus").textContent = "Código preparado. Abre el formulario de entrega con tu correo, el nombre de la práctica y el código ya rellenados. Confirma allí la entrega y guarda el justificante.";
        nuevo.hidden = false;
    }
    function abrirFormulario() {
        try {
            let datos;
            try { datos = JSON.parse(informe.value); } catch { datos = {}; }
            const id = datos.draftId || crypto.randomUUID();
            localStorage.setItem("laboratorio-entrega:" + id, JSON.stringify({
                email: alumno.value.trim().toLowerCase(), practiceName: actividad, text: editor.value
            }));
            location.assign("../entrega-practicas.html?borrador=" + encodeURIComponent(id));
        } catch {
            porId("reportStatus").textContent = "No se pudo abrir el formulario con los datos. Descarga el TXT y utiliza el formulario de entrega.";
        }
    }
    porId("abrir-formulario").addEventListener("click", evento => {
        evento.preventDefault();
        abrirFormulario();
    });
    function prepararInforme(notas, final, fin, auditoria) {
        if (!editor.value.trim() && auditoria.finishReason !== "incident-limit") {
            porId("panel-resultado").hidden = false;
            porId("reportStatus").textContent = "Escribe tu JavaScript antes de finalizar.";
            return "";
        }
        abrirAlFinalizar = auditoria.finishReason !== "incident-limit";
        return JSON.stringify({draftId: crypto.randomUUID(), activity: actividad, email: alumno.value.trim().toLowerCase(),
            code: editor.value, finishedAt: new Date(fin).toISOString(), audit: auditoria,
            notes: notas, seconds: Math.floor((transcurrido + (inicio ? Math.max(0, fin - inicio) : 0)) / 1000)});
    }
    const correoValido = valor => /^[^\s@]+@g\.educaand\.es$/i.test(valor);
    intento = window.createPracticeGuard({
        config: {storage: {key: claveIntento, legacyKey: "dwec-validar-edad-intento-anterior"},
            resumeInBrowser: true, requireFullName: false, format: {save: "dwec-validar-edad"}},
        empty: vacio,
        sanitize(datos) {
            if (typeof datos?.values?.text !== "string"
                    || typeof datos.values.student !== "string" || typeof datos.report !== "string") throw Error("Borrador dañado");
            return {...vacio(), values: {student: datos.values.student, text: datos.values.text}, report: datos.report,
                elapsed: Number.isFinite(datos.elapsed) ? Math.max(0, datos.elapsed) : 0,
                started: Number.isFinite(datos.started) ? datos.started : null};
        },
        snapshot: leer, restore: restaurar, validEmail: correoValido,
        canStart: () => alumno.validity.valid && correoValido(alumno.value.trim()),
        startClock() { inicio ??= Date.now(); },
        stopClock(fin = Date.now()) {
            if (inicio !== null) transcurrido += Math.max(0, fin - inicio);
            inicio = null;
        },
        isAnswer: nodo => nodo === editor,
        restoreValue(nodo, datos) { nodo.value = datos.values.text; },
        refreshPendingParameters: () => 0,
        setEnabled(activo) {
            editor.disabled = !activo;
            porId("ejecutar").disabled = !activo;
            porId("vista").inert = !activo;
        },
        afterRender(estado, vista) {
            faseActual = estado.phase;
            const aviso = porId("guard-warning-text");
            aviso.textContent = aviso.textContent
                .replace("generará una entrega automática", "cerrará el intento y conservará el código para entregarlo mediante el formulario")
                .replace("se generará una entrega con las respuestas actuales", "se conservará el código para entregarlo mediante el formulario");
            actualizarSesion(estado.phase, !editor.disabled);
            porId("cuaderno").hidden = estado.phase !== "active";
            porId("guard-start-box").hidden = estado.phase !== "ready";
            porId("reanudar").hidden = !vista.restoring || estado.phase !== "active";
            porId("count").textContent = editor.value.length.toLocaleString("es-ES") + " / 10 000 caracteres";
            porId("acciones-entrega").hidden = estado.phase !== "submitted";
            if (estado.phase === "submitted") mostrarFinalizado();
        },
        confirmText() {
            porId("guard-confirm-title").textContent = "¿Finalizar tu JavaScript?";
            porId("guard-confirm-text").textContent = "El intento se cerrará y se abrirá el formulario de entrega con tu correo, el nombre de la práctica y el código ya rellenados.";
            porId("guard-confirm-ok").textContent = "Abrir formulario";
        },
        makeReport: prepararInforme,
        setReport(texto) { informe.value = texto; },
        downloadReport() {
            mostrarFinalizado();
            if (abrirAlFinalizar) abrirFormulario();
        },
        forcedError() {
            porId("panel-resultado").hidden = false;
            porId("reportStatus").textContent = "No se pudo preparar el código. Recarga para recuperar el intento guardado.";
        },
        onReset() { porId("panel-resultado").hidden = true; },
        saveBeforeReset: () => false
    });
    alumno.addEventListener("input", intento.render);
    editor.addEventListener("input", intento.saveEdit);
    porId("reanudar").addEventListener("click", intento.recoverPractice);
    nuevo.addEventListener("click", () => {
        if (faseActual !== "submitted") return;
        try {
            // Conservar el intento completo antes de empezar otro, sin borrar envíos antiguos.
            const anterior = localStorage.getItem(claveIntento);
            localStorage.setItem(prefijoCopias + crypto.randomUUID(), anterior);
            if (!intento.resetProcess()) return;
            porId("panel-resultado").hidden = true;
            porId("guard-panel").scrollIntoView({block: "start"});
            alumno.focus({preventScroll: true});
        } catch {
            porId("reportStatus").textContent = "No se pudo conservar la copia anterior. Descarga tu código y reintenta sin borrar los datos del navegador.";
        }
    });
    return intento;
}
