const porId = id => document.getElementById(id);
const actividad = "Lab: Validar un dato";
// La actividad de edad tiene un guardado independiente del antiguo laboratorio de correo.
const versionActividad = "edad-v1";
const destino = {type: "apps-script", endpoint: CONFIG.endpoint};
const claveEntrega = "entrega-texto-v1:" + CONFIG.id + ":" + CONFIG.version + ":" + actividad + ":" + versionActividad;

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

    // Cada intento conserva su envío exacto, aunque se empiece otro sin conexión.
    const prefijoHistorial = claveEntrega + ":historial:";
    const historial = document.createElement("section");
    historial.className = "card";
    historial.id = "historial-entregas";
    historial.hidden = true;
    porId("panel-resultado").after(historial);
    let faseActual = "ready";

    function mostrarHistorial() {
        historial.replaceChildren();
        const titulo = document.createElement("h2");
        titulo.textContent = "Entregas anteriores";
        historial.append(titulo);
        let total = 0;
        for (const clave of Object.keys(localStorage).filter(clave => clave.startsWith(prefijoHistorial)).sort()) {
            const guardada = JSON.parse(localStorage.getItem(clave));
            if (!guardada?.envelope?.submissionId) continue;
            total++;
            const fila = document.createElement("p");
            const texto = document.createElement("span");
            texto.textContent = guardada.receipt
                ? "Entrega confirmada · " + guardada.envelope.submissionId
                : "Pendiente de confirmación · " + guardada.envelope.submissionId;
            texto.style.overflowWrap = "anywhere";
            fila.append(texto);
            if (!guardada.receipt) {
                const boton = document.createElement("button");
                boton.type = "button";
                boton.textContent = "Reintentar entrega anterior";
                boton.disabled = enviando;
                boton.addEventListener("click", async () => {
                    if (enviando || faseActual === "active") return;
                    enviando = true;
                    mostrarHistorial();
                    intento.render();
                    try {
                        guardada.receipt = await LabDelivery.send(destino, guardada.envelope);
                        localStorage.setItem(clave, JSON.stringify(guardada));
                    } catch {
                        // Se conserva el mismo identificador y contenido para el siguiente reintento.
                    } finally {
                        enviando = false;
                        mostrarHistorial();
                        intento.render();
                    }
                });
                fila.append(document.createElement("br"), boton);
            }
            historial.append(fila);
        }
        historial.hidden = !total || faseActual === "active";
    }

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
                nuevo.hidden = false;
            }
        } finally { enviando = false; }
    }

    const correoValido = valor => /^[^\s@]+@g\.educaand\.es$/i.test(valor);
    intento = window.createPracticeGuard({
        config: {storage: {key: "dwec-validar-edad-intento-v1", legacyKey: "dwec-validar-edad-intento-anterior"},
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
        canStart: () => !enviando && !entrega && alumno.validity.valid && correoValido(alumno.value.trim()) && LabDelivery.configured(destino),
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
            faseActual = estado.phase;
            historial.hidden = faseActual === "active" || historial.children.length <= 1;
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
        if (enviando || cerrado) return;
        try {
            const anterior = entrega || (informe.value ? {envelope: JSON.parse(informe.value)} : null);
            if (!anterior?.envelope?.submissionId) return;
            // Guardar primero: un fallo de almacenamiento no debe perder la entrega.
            localStorage.setItem(prefijoHistorial + anterior.envelope.submissionId, JSON.stringify(anterior));
            if (!intento.resetProcess()) return;
            localStorage.removeItem(claveEntrega);
            entrega = null;
            porId("panel-resultado").hidden = true;
            nuevo.hidden = true;
            mostrarHistorial();
            intento.render();
            porId("guard-panel").scrollIntoView({block: "start"});
            alumno.focus({preventScroll: true});
        } catch {
            mostrar("No se pudo preparar otro intento. La entrega anterior se conserva; reintenta sin borrar los datos del navegador.");
        }
    });

    if (entrega?.receipt) mostrarRecibo();
    else if (entrega || informe.value) {
        mostrar("Hay una entrega pendiente de confirmación. Puedes reintentar el envío o comenzar otra práctica; el envío pendiente se conservará.");
        reintentar.hidden = false;
        nuevo.hidden = cerrado;
    }
    mostrarHistorial();
    void LabDelivery.prepare(destino, CONFIG.id);
    return intento;
}
