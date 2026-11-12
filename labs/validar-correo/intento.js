const porId = id => document.getElementById(id);
const actividad = "2.52. Validar el correo del centro";
const destino = {type: "apps-script", endpoint: CONFIG.endpoint};
const claveEntrega = "entrega-texto-v1:" + CONFIG.id + ":" + CONFIG.version + ":" + actividad;

export function protegerIntento(actualizarSesion) {
    const editor = porId("text");
    const alumno = porId("student");
    const informe = porId("report");
    const estadoEntrega = porId("reportStatus");
    const reintentar = porId("reintentar-entrega");
    const nuevo = porId("nuevo-intento");
    let inicio = null;
    let transcurrido = 0;
    let enviando = false;
    let intento;
    let cerrado = false;
    let entrega = JSON.parse(localStorage.getItem(claveEntrega) || "null");

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

    function mostrar(texto) {
        porId("panel-resultado").hidden = false;
        estadoEntrega.textContent = texto;
    }

    function mostrarRecibo() {
        const recibo = entrega.receipt;
        mostrar("Entrega registrada el " + new Date(recibo.receivedAt).toLocaleString("es-ES", {timeZone: "Europe/Madrid"})
            + " (hora de Madrid).\nIdentificador: " + recibo.submissionId);
        reintentar.hidden = true;
        nuevo.hidden = false;
    }

    async function prepararInforme(notas, final, fin, auditoria) {
        const codigo = editor.value;
        const automatico = auditoria.finishReason === "incident-limit";
        if (!codigo.trim() && !automatico) {
            mostrar("Escribe tu JavaScript antes de entregar.");
            return "";
        }
        mostrar("Comprobando el código para la entrega…");
        const falloAnalizador = [false, 51, "El documento no se ha podido verificar. Tras la entrega será revisado."];
        let limite;
        let analisis;
        try {
            analisis = await Promise.race([comprobarEntrega("JS", codigo), new Promise(resolve => {
                limite = setTimeout(() => resolve(falloAnalizador), 15000);
            })]);
            if (!Array.isArray(analisis) || typeof analisis[0] !== "boolean"
                    || (!analisis[0] && !(Number.isFinite(analisis[1]) && analisis[1] >= 0 && analisis[1] <= 100))) {
                analisis = falloAnalizador;
            }
        } catch { analisis = falloAnalizador; }
        finally { clearTimeout(limite); }

        const [bloqueado, porcentaje, detalles] = analisis;
        if (bloqueado && !automatico) {
            const razones = (Array.isArray(detalles) ? detalles : [detalles])
                .map(detalle => typeof detalle === "string" ? detalle : detalle?.mensaje || detalle?.message).filter(Boolean);
            mostrar(razones.join("\n") || "Revisa el código antes de entregar.");
            return "";
        }
        const valor = bloqueado || !codigo.trim() ? 0 : porcentaje;
        const email = alumno.value.trim().toLowerCase();
        const datos = {exam: CONFIG.id, activityVersion: CONFIG.version, version: 3, language: "es",
            name: email, email, practiceName: actividad, group: "", module: "DWEC",
            notes: ("Motivo de cierre: " + (automatico ? "tercera incidencia" : "entrega del alumno") + "\n" + notas).slice(0, 2400),
            incidents: valor, verificationDetails: detalles, zeroFinalConfirmation: valor === 0, audit: auditoria,
            finishedAt: new Date(fin).toISOString(), seconds: Math.floor((transcurrido + (inicio ? Math.max(0, fin - inicio) : 0)) / 1000),
            answers: [{question: actividad, answer: codigo || "[Sin respuesta]", status: "teacher-review"}], url: location.href};
        const payload = JSON.stringify(datos);
        return JSON.stringify({protocol: 1, submissionId: await hash(payload), practiceId: CONFIG.id,
            practiceVersion: CONFIG.version, zeroFinalConfirmation: valor === 0, payload});
    }

    async function enviar() {
        if (enviando) return;
        if (!entrega) entrega = {envelope: JSON.parse(informe.value)};
        if (entrega.receipt) { mostrarRecibo(); return; }
        enviando = true;
        reintentar.hidden = true;
        mostrar("Enviando al registro de DWEC…");
        try {
            localStorage.setItem(claveEntrega, JSON.stringify(entrega));
            const recibo = await LabDelivery.send(destino, entrega.envelope);
            entrega.receipt = recibo;
            localStorage.setItem(claveEntrega, JSON.stringify(entrega));
            mostrarRecibo();
        } catch {
            if (entrega.receipt) mostrarRecibo();
            else {
                mostrar("Pendiente de confirmación. Reintenta el envío desde este navegador con el mismo identificador.");
                reintentar.hidden = false;
            }
        } finally { enviando = false; }
    }

    const correoValido = valor => /^[^\s@]+@g\.educaand\.es$/i.test(valor);
    intento = window.createPracticeGuard({
        config: {storage: {key: "dwec-correo-intento-v1", legacyKey: "dwec-correo-intento-anterior"},
            resumeInBrowser: true, requireFullName: false, format: {save: "dwec-correo"}},
        empty: vacio,
        sanitize(datos) {
            if (typeof datos?.values?.text !== "string"
                    || typeof datos.values.student !== "string" || typeof datos.report !== "string") throw Error("Borrador dañado");
            return {...vacio(), values: {student: datos.values.student, text: datos.values.text}, report: datos.report,
                elapsed: Number.isFinite(datos.elapsed) ? Math.max(0, datos.elapsed) : 0,
                started: Number.isFinite(datos.started) ? datos.started : null};
        },
        snapshot: leer, restore: restaurar, validEmail: correoValido,
        canStart: () => !entrega && alumno.validity.valid && correoValido(alumno.value.trim()) && LabDelivery.configured(destino),
        startClock() { inicio ??= Date.now(); },
        stopClock(fin = Date.now()) { if (inicio !== null) transcurrido += Math.max(0, fin - inicio); inicio = null; },
        isAnswer: nodo => nodo === editor,
        restoreValue(nodo, datos) { nodo.value = datos.values.text; },
        refreshPendingParameters: () => 0,
        setEnabled(activo) {
            editor.disabled = !activo;
            porId("ejecutar").disabled = !activo;
            porId("vista").inert = !activo;
        },
        afterRender(estado, vista) {
            cerrado = estado.phase === "closing";
            actualizarSesion(estado.phase, !editor.disabled);
            porId("cuaderno").hidden = estado.phase !== "active";
            porId("guard-start-box").hidden = estado.phase !== "ready" || !!entrega;
            porId("reanudar").hidden = !vista.restoring || estado.phase !== "active";
            porId("count").textContent = editor.value.length.toLocaleString("es-ES") + " / 10 000 caracteres";
        },
        confirmText() {
            porId("guard-confirm-title").textContent = "¿Entregar tu JavaScript?";
            porId("guard-confirm-text").textContent = "El intento se cerrará y se enviará tu código al registro de prácticas de DWEC.";
        },
        makeReport: prepararInforme, setReport(texto) { informe.value = texto; },
        downloadReport: enviar,
        forcedError() { mostrar("El intento está cerrado. Reintenta la entrega para registrar el código guardado."); reintentar.hidden = false; },
        onReset() { porId("panel-resultado").hidden = true; },
        saveBeforeReset: () => false
    });
    alumno.addEventListener("input", intento.render);
    editor.addEventListener("input", intento.saveEdit);
    porId("reanudar").addEventListener("click", intento.recoverPractice);
    reintentar.addEventListener("click", () => cerrado ? intento.finalizeForced() : enviar());
    nuevo.addEventListener("click", () => {
        if (enviando || !entrega?.receipt) return;
        intento.resetProcess();
        localStorage.removeItem(claveEntrega);
        entrega = null;
        porId("panel-resultado").hidden = true;
        nuevo.hidden = true;
        intento.render();
    });

    if (entrega?.receipt) mostrarRecibo();
    else if (entrega || informe.value) {
        mostrar("Hay una entrega pendiente de confirmación.");
        reintentar.hidden = false;
    }
    void LabDelivery.prepare(destino, CONFIG.id);
    return intento;
}
