/**
 * CONTROLES DIDÁCTICOS DEL NAVEGADOR · SSII UD01
 * -------------------------------------------
 * Esta plantilla es disuasoria, NO un sistema de examen seguro. El usuario
 * controla JavaScript, el DOM y localStorage. No se identifican otras webs,
 * no se lee el portapapeles y no se envían respuestas a ningún servidor.
 *
 * Integración: createPracticeGuard(adapter) recibe las operaciones del
 * laboratorio. El controlador no conoce las preguntas ni sus soluciones.
 * Véase repaso-ssii-u01-seguridad.md para estados, pruebas y limitaciones.
 */
(() => {
  'use strict';

  window.createPracticeGuard = function createPracticeGuard(adapter) {
    // 1. POLÍTICA. Esta clave es exclusiva de este laboratorio. No usar clear():
    // borraría también borradores de otros laboratorios del mismo dominio.
    const CONFIG = Object.freeze({
      key: 'ssii-repaso-ud01-seguridad-v1', legacyKey: 'ssii-repaso-ud01-v1',
      limit: 3, maxEvents: 80, settleMs: 200, blockClipboard: true
    });
    const WHY = { hidden: 'página oculta', blur: 'pérdida de foco',
      fullscreen: 'salida de pantalla completa', pagehide: 'recarga o cierre' };
    const $ = id => document.getElementById(id);
    const root = document.documentElement;
    const warning = $('guard-warning'), confirmBox = $('guard-confirm');
    let initialized = false, fatal = false, busy = false, restoring = false;
    let problem = '', problemText = '', lastRaw = null, timer = null;
    let confirmation = null, lastClipboardAt = 0, lastClipboardKind = '';
    const supported = typeof root.requestFullscreen === 'function'
      && document.fullscreenEnabled === true && typeof document.hasFocus === 'function'
      && 'visibilityState' in document && typeof warning.showModal === 'function'
      && 'inert' in HTMLElement.prototype && typeof structuredClone === 'function';

    // 2. MODELO. La interfaz se deriva de este estado, nunca al revés.
    // active + pending/episode/restoring bloquea respuestas; el reloj continúa.
    // submitted permite descargar el informe final; review solo es un estado legado.
    function fresh() {
      return { version: 1, phase: 'ready', attempt: 0, count: 0, pending: null,
        episode: null, clipboardBlocked: 0, savedAt: null, events: [],
        data: adapter.empty(), backup: null };
    }
    function log(text) {
      state.events.push({ at: Date.now(), text });
      state.events = state.events.slice(-CONFIG.maxEvents);
    }
    const stamp = n => Number.isFinite(n) && n >= 0 && n <= 8640000000000000;
    function validate(s) {
      // Se validan estructura y límites. Esto detecta daños accidentales,
      // NO acredita que el alumno no haya modificado un JSON válido.
      if (!s || s.version !== 1 || !['ready','active','submitted','reset','review'].includes(s.phase)
        || !Number.isSafeInteger(s.attempt) || s.attempt < 0
        || !Number.isInteger(s.count) || s.count < 0 || s.count > CONFIG.limit
        || (s.phase === 'active' && s.count >= CONFIG.limit)
        || !Number.isInteger(s.clipboardBlocked) || s.clipboardBlocked < 0
        || s.clipboardBlocked > 1000000
        || ![null,'first','last','reset','resume'].includes(s.pending)
        || !s.data || !Array.isArray(s.events)) throw new Error('Estado inválido');
      return { ...fresh(), phase: s.phase, attempt: s.attempt, count: s.count,
        pending: s.pending, clipboardBlocked: s.clipboardBlocked,
        savedAt: stamp(s.savedAt) ? s.savedAt : null,
        data: adapter.sanitize(s.data),
        // Un arranque nuevo conserva la marca de inicio sin añadir incidencias.
        // El contador y el aviso anterior sí se conservan.
        episode: null,
        backup: s.backup ? { data: adapter.sanitize(s.backup.data),
          attempt: Number.isSafeInteger(s.backup.attempt) ? s.backup.attempt : 0,
          at: stamp(s.backup.at) ? s.backup.at : 0 } : null,
        events: s.events.filter(e => e && stamp(e.at) && typeof e.text === 'string')
          .slice(-CONFIG.maxEvents).map(e => ({ at: e.at, text: e.text.slice(0, 300) })) };
    }
    function load() {
      try {
        lastRaw = localStorage.getItem(CONFIG.key);
        if (lastRaw !== null) {
          try { return validate(JSON.parse(lastRaw)); }
          catch { problem = 'invalid'; problemText = 'El guardado no es válido. No se ha sobrescrito: avisa al profesor.'; return fresh(); }
        }
        // Migración una sola vez: se copia el borrador anterior, sin borrar el
        // original y sin atribuirle incidencias que nunca se registraron.
        const old = localStorage.getItem(CONFIG.legacyKey);
        const s = fresh();
        if (old !== null) {
          try {
            const data = JSON.parse(old);
            s.data = adapter.sanitize(data);
            s.events.push({ at: Date.now(), text: 'Borrador anterior importado; pendiente de aceptar las nuevas normas.' });
          } catch { problem = 'invalid'; problemText = 'El borrador anterior está dañado. No se ha modificado: avisa al profesor.'; }
        }
        return s;
      } catch { problem = 'io'; problemText = 'El navegador no permite acceder al guardado local.'; return fresh(); }
    }
    let state = load();
    restoring = state.phase === 'active';
    if (restoring && !state.pending) state.pending = 'resume';

    // 3. PERSISTENCIA. Cada edición aceptada y cada transición se guardan.
    // No se confía únicamente en unload/pagehide: pueden no llegar a emitirse.
    // Comparar y escribir reduce conflictos, pero NO es una transacción atómica.
    function persist() {
      if (fatal || problem) return false;
      try {
        if (localStorage.getItem(CONFIG.key) !== lastRaw) {
          problem = 'conflict';
          problemText = 'El borrador cambió en otra pestaña. Esta copia se ha bloqueado para no sobrescribirlo. Cierra las copias adicionales y recarga.';
          render(); return false;
        }
        const savedAt = Date.now(), raw = JSON.stringify({ ...state, savedAt });
        localStorage.setItem(CONFIG.key, raw);
        lastRaw = raw; state.savedAt = savedAt;
        return true;
      } catch {
        problem = 'io';
        problemText = 'No se pudo guardar. Los cambios actuales siguen en memoria. No cierres la página; avisa al profesor y reintenta el guardado.';
        render(); return false;
      }
    }
    function signals() {
      return { visible: document.visibilityState === 'visible', focused: document.hasFocus(),
        fullscreen: document.fullscreenElement === root };
    }
    const safe = s => s.visible && s.focused && s.fullscreen;
    function canEdit() {
      return initialized && !fatal && !problem && supported && state.phase === 'active'
        && !state.pending && !state.episode && !restoring && !busy && safe(signals());
    }
    function failClosed() {
      fatal = true;
      adapter.setEnabled(false);
      $('cuaderno').hidden = true; $('cuaderno').inert = true;
      $('guard-panel').inert = true;
      if (warning.open) warning.close();
      if (confirmBox.open) confirmBox.close();
      $('guard-boot').hidden = false;
      $('guard-boot-detail').textContent = 'Se produjo un error de JavaScript. La práctica está bloqueada. No borres los datos: avisa al profesor. El último guardado correcto se conserva.';
    }

    // 4. VISTA. disabled bloquea respuestas; el modal explica el bloqueo.
    // No se muestra encima de otra aplicación: el aviso se ve al regresar.
    function render() {
      if (fatal) return;
      const enabled = canEdit(), s = signals();
      adapter.setEnabled(enabled);

      const names = { ready: 'Pendiente de comenzar', active: enabled ? 'En curso' : 'Respuestas bloqueadas · reloj en marcha',
        submitted: 'Intento finalizado', reset: 'Reiniciado por tres incidencias', review: 'Copia recuperada: solo lectura' };
      $('guard-state').textContent = names[state.phase];
      $('guard-count').textContent = `${state.count} de ${CONFIG.limit}`;
      $('guard-conditions').textContent = `Pantalla completa: ${s.fullscreen ? 'sí' : 'no'} · Foco: ${s.focused ? 'sí' : 'no'} · Visible: ${s.visible ? 'sí' : 'no'}`;
      $('guard-clipboard-count').textContent = `Acciones de portapapeles bloqueadas: ${state.clipboardBlocked}`;
      $('guard-start-box').hidden = state.phase === 'active';
      $('guard-consent').disabled = !supported || !!problem;
      $('guard-start').disabled = !supported || !!problem || busy || !!state.pending || !$('guard-consent').checked;
      $('guard-start').textContent = state.phase === 'ready' ? 'Pantalla completa y comenzar' : 'Pantalla completa y nuevo intento vacío';
      $('guard-problem').hidden = !problem && supported;
      $('guard-problem-text').textContent = problemText || (!supported ? 'Este navegador no ofrece las funciones necesarias. Abre la página directamente en un navegador de escritorio compatible con pantalla completa.' : '');
      $('guard-retry').hidden = problem !== 'io';
      $('saveStatus').textContent = problem ? 'Guardado bloqueado. Revisa el aviso superior.'
        : state.savedAt ? 'Respuestas guardadas: ' + new Date(state.savedAt).toLocaleTimeString('es-ES') : 'Guardado local preparado.';
      const canExport = !problem && state.phase === 'submitted';
      $('report').disabled = !canExport;
      $('download').disabled = !canExport || !$('report').value;
      $('download').hidden = state.phase !== 'submitted';
      $('guard-finish').disabled = !enabled;
      $('reset').disabled = state.phase === 'active' || !!problem || busy;
      // textContent: nunca insertar datos del alumno o del almacenamiento como HTML.
      $('guard-log').replaceChildren(...state.events.slice(-12).reverse().map(e => {
        const li = document.createElement('li');
        li.textContent = new Date(e.at).toLocaleTimeString('es-ES') + ' · ' + e.text; return li;
      }));
      if (problem) {
        if (warning.open) warning.close();
        if (confirmBox.open) confirmBox.close();
        confirmation = null;
      } else showWarning();
    }
    function showWarning() {
      if (!initialized || !state.pending || !signals().visible || !signals().focused || fatal) return;
      if (confirmBox.open) confirmBox.close();
      confirmation = null;
      const texts = {
        first: ['Primer aviso', 'La práctica perdió visibilidad, foco o pantalla completa. Las respuestas se conservan. A la tercera incidencia se vaciarán.'],
        last: ['Último aviso', 'Segunda incidencia. La próxima vez se vaciarán las respuestas y se detendrá el intento.'],
        reset: ['Intento reiniciado', 'Tercera incidencia: se han vaciado respuestas, comprobaciones e informe. Puedes comenzar un nuevo intento vacío.'],
        resume: ['Reanudar el intento', 'Se han recuperado las respuestas y el contador. El reloj sigue contando. Debes recuperar pantalla completa y foco para seguir.']
      };
      const [title, text] = texts[state.pending];
      $('guard-warning-title').textContent = title;
      $('guard-warning-text').textContent = text;
      $('guard-warning-count').textContent = `Incidencias: ${state.count}/${CONFIG.limit}.`;
      $('guard-continue').textContent = state.phase === 'active' ? 'Continuar en pantalla completa' : 'Entendido';
      $('guard-continue').disabled = busy;
      if (!warning.open) warning.showModal();
    }

    // 5. EPISODIOS. blur + visibilitychange + fullscreenchange pueden describir
    // UNA salida. Se agrupan hasta recuperar las tres condiciones. Solo tras
    // un regreso estable (200 ms) puede empezar otro episodio. No se sanciona
    // pasar de un campo a otro: escuchamos blur de window, sin capture.
    function record(reason) {
      if (!initialized || fatal || problem || restoring || state.phase !== 'active') return;
      clearTimeout(timer);
      if (!state.episode) {
        state.data = adapter.snapshot();
        state.episode = { at: Date.now(), reasons: [reason] };
        state.count++;
        log(`Incidencia ${state.count}/${CONFIG.limit}: ${WHY[reason]}.`);
        if (state.count >= CONFIG.limit) {
          adapter.stopClock();
          state.phase = 'reset'; state.pending = 'reset';
          state.data = adapter.empty(); adapter.restore(state.data);
          log('Respuestas vaciadas; intento detenido.');
        } else state.pending = state.count === 1 ? 'first' : 'last';
      } else if (!state.episode.reasons.includes(reason)) {
        state.episode.reasons.push(reason);
        log(`Mismo episodio: ${WHY[reason]} (sin sumar otra incidencia).`);
      }
      persist(); render();
    }
    function environment(reason) {
      if (!initialized || fatal) return;
      const s = signals();
      if (state.phase === 'active' && !restoring) {
        if (reason === 'pagehide') record(reason);
        else if (!safe(s)) {
          const r = reason === 'blur' ? 'blur' : !s.visible ? 'hidden' : !s.fullscreen ? 'fullscreen' : 'blur';
          record(r);
        } else if (state.episode) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            if (safe(signals()) && state.phase === 'active' && !problem) {
              state.episode = null; persist(); render();
            }
          }, CONFIG.settleMs);
        }
      }
      render();
    }
    async function fullscreen() {
      // Invocar desde el clic: la API exige activación del usuario. No se usan
      // medidas aproximadas de tamaño ni se equipara F11 a esta API.
      if (document.fullscreenElement !== root) await root.requestFullscreen();
      if (!safe(signals())) throw new Error('Falta pantalla completa, foco o visibilidad. Regresa y vuelve a pulsar el botón.');
    }
    async function startOrResume(resume) {
      if (busy || problem || !supported || fatal) return;
      if (!resume && (!$('guard-consent').checked || state.phase === 'active')) return;
      busy = true; $('guard-warning-error').textContent = ''; render();
      try {
        await fullscreen();
        if (problem || fatal) return;
        // Una tercera salida durante la petición no puede revivir el intento.
        if (resume && state.phase !== 'active') return;
        if (!resume) {
          const keep = state.phase === 'ready';
          const data = keep ? state.data : adapter.empty();
          const backup = state.backup, events = state.events, attempt = state.attempt + 1;
          state = { ...fresh(), phase: 'active', attempt, data, backup, events };
          adapter.restore(data); log(`Comienzo del intento ${attempt}. Normas aceptadas.`);
        } else log('Intento reanudado en pantalla completa.');
        state.pending = null; state.episode = null; restoring = false;
        if (warning.open) warning.close();
        $('guard-action-status').textContent = '';
        adapter.startClock(); state.data = adapter.snapshot();
        persist();
      } catch (e) {
        $('guard-action-status').textContent = e.message || 'No se pudo activar pantalla completa.';
        $('guard-warning-error').textContent = 'No se pudo activar pantalla completa. Regresa a la página y vuelve a intentarlo.';
      } finally { busy = false; render(); }
    }

    // 6. PORTAPAPELES. Cancelar cada evento; agrupar únicamente su registro.
    // No se leen contenidos ni se solicitan permisos de lectura del sistema.
    // El informe se exporta como TXT únicamente después de finalizar.
    function canDownloadReport() {
      return !problem && !fatal && state.phase === 'submitted' && !!$('report').value;
    }
    function denyClipboard(e, kind = e.type) {
      if (e.cancelable) e.preventDefault();
      e.stopImmediatePropagation();
      $('clipboardStatus').textContent = 'Copia, corte, pegado y arrastre bloqueados. Escribe directamente. El informe se descarga en TXT al finalizar.';
      const now = Date.now();
      if (state.phase === 'active' && !problem && (kind !== lastClipboardKind || now - lastClipboardAt > 300)) {
        state.clipboardBlocked = Math.min(1000000, state.clipboardBlocked + 1);
        log(`Portapapeles bloqueado: ${kind}.`);
        lastClipboardAt = now; lastClipboardKind = kind;
        persist(); render();
      }
    }
    const forbiddenInput = type => ['insertFromPaste','insertFromPasteAsQuotation','insertFromDrop','deleteByCut','deleteByDrag'].includes(type);
    function saveEdit() {
      if (!canEdit()) return false;
      state.data = adapter.snapshot();
      const ok = persist(); render(); return ok;
    }
    // Se instala en CAPTURA, antes de los manejadores de la actividad.
    // Si beforeinput no se pudo cancelar, input restaura el último dato aceptado.
    function inputGuard(e) {
      if (!adapter.isAnswer(e.target)) return;
      if (!canEdit() || (CONFIG.blockClipboard && forbiddenInput(e.inputType))) {
        if (e.cancelable) e.preventDefault();
        e.stopImmediatePropagation();
        if (e.type !== 'beforeinput') adapter.restoreValue(e.target, state.data);
        if (CONFIG.blockClipboard && forbiddenInput(e.inputType)) denyClipboard(e, 'entrada de portapapeles');
      }
    }

    // 7. FINALIZAR Y BORRAR. La finalización descarga un TXT sin enviar datos.
    function metadata() {
      return [`Intento: ${state.attempt}`, `Incidencias de entorno: ${state.count}/${CONFIG.limit}`,
        `Acciones de portapapeles bloqueadas: ${state.clipboardBlocked}`,
        'Registro local orientativo; no acredita copia ni identidad.',
        ...state.events.map(e => `${new Date(e.at).toISOString()} · ${e.text}`)].join('\n');
    }
    function ask(kind) {
      if (problem || busy || fatal) return;
      if (kind === 'finish' && !canEdit()) return;
      if (kind === 'erase' && state.phase === 'active') return;
      confirmation = kind;
      $('guard-confirm-title').textContent = kind === 'finish' ? '¿Finalizar el intento?' : '¿Borrar los datos locales?';
      $('guard-confirm-text').textContent = kind === 'finish'
        ? 'Se descargará un fichero TXT con tus respuestas y el tiempo total empleado. La práctica quedará finalizada y no podrás modificar las respuestas, aunque haya pasos pendientes. Para seguir trabajando, cancela.'
        : 'Se eliminarán de este navegador las respuestas, el contador, el informe y cualquier copia antigua de este laboratorio. Conserva antes tu entrega. No se borrarán datos de otros laboratorios.';
      confirmBox.showModal();
    }
    async function confirmAction() {
      const kind = confirmation;
      confirmation = null; confirmBox.close();
      if (kind === 'erase') {
        if (state.phase === 'active' || problem) return;
        try {
          if (localStorage.getItem(CONFIG.key) !== lastRaw) { environment('focus'); persist(); return; }
          localStorage.removeItem(CONFIG.legacyKey);
          localStorage.removeItem(CONFIG.key);
          state = fresh(); lastRaw = null; restoring = false;
          adapter.restore(state.data); $('guard-consent').checked = false;
          // No persistir de nuevo durante pagehide: el borrado debe ser real.
          render();
        } catch { problem = 'io'; problemText = 'No se pudieron borrar los datos. Se conserva la página para revisión.'; render(); }
        return;
      }
      if (kind !== 'finish' || !canEdit()) return;
      const finishedAt = Date.now();
      state.data = adapter.snapshot();
      const beforeCount = state.count;
      busy = true; render();
      try {
        const report = await adapter.makeReport(metadata(), true, finishedAt);
        // El cálculo SHA-256 es asíncrono. Una salida en mitad del cálculo
        // cancela la entrega: no permite saltarse un aviso o el tercer reinicio.
        if (!report || problem || fatal || state.phase !== 'active' || state.count !== beforeCount
          || state.pending || !safe(signals())) return;
        adapter.stopClock(finishedAt);
        state.phase = 'submitted'; state.pending = null; state.episode = null;
        adapter.setReport(report);
        state.data = adapter.snapshot(); log('Intento finalizado. Exportación del informe habilitada.');
        if (!persist()) return;
        adapter.downloadReport();
        if (document.fullscreenElement === root) {
          try { await document.exitFullscreen(); } catch { /* Ya está finalizado: no penalizar. */ }
        }
      } catch { $('reportStatus').textContent = 'No se pudo generar el informe. No se ha finalizado el intento; revisa los datos y vuelve a intentarlo.'; }
      finally { busy = false; render(); }
    }
    // 8. ARRANQUE CERRADO. El HTML original lleva hidden, inert y disabled.
    // Solo al terminar la carga, restauración y registro de eventos se revela.
    window.addEventListener('error', failClosed);
    window.addEventListener('unhandledrejection', failClosed);
    document.addEventListener('visibilitychange', () => environment('hidden'));
    document.addEventListener('fullscreenchange', () => environment('fullscreen'));
    window.addEventListener('blur', () => environment('blur'));
    window.addEventListener('focus', () => environment('focus'));
    window.addEventListener('pagehide', () => environment('pagehide'));
    window.addEventListener('pageshow', e => {
      if (e.persisted && state.phase === 'active') {
        restoring = true; state.pending ||= 'resume'; state.episode = null; render();
      }
    });
    window.addEventListener('storage', e => {
      if (e.key !== CONFIG.key && e.key !== null) return;
      try {
        if (localStorage.getItem(CONFIG.key) !== lastRaw) {
          problem = 'conflict'; problemText = 'Otra pestaña modificó o borró este intento. Esta copia está bloqueada. Cierra las copias adicionales y recarga.'; render();
        }
      } catch { problem = 'io'; problemText = 'No se puede leer el guardado.'; render(); }
    });
    for (const type of ['beforeinput','input','change']) $('lab').addEventListener(type, inputGuard, true);
    if (CONFIG.blockClipboard) {
      for (const type of ['copy','cut','paste','dragstart','drop']) document.addEventListener(type, e => {
        denyClipboard(e);
      }, true);
      document.addEventListener('dragover', e => e.preventDefault(), true);
      document.addEventListener('keydown', e => {
        const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey;
        const blocked = (mod && ['c','x','v'].includes(k)) || (e.ctrlKey && k === 'insert')
          || (e.shiftKey && ['insert','delete'].includes(k));
        if (blocked) denyClipboard(e, 'atajo');
      }, true);
    }
    $('guard-consent').addEventListener('change', render);
    $('guard-start').addEventListener('click', () => startOrResume(false));
    $('guard-continue').addEventListener('click', () => {
      if (state.phase === 'active') startOrResume(true);
      else { state.pending = null; state.episode = null; warning.close(); persist(); render(); }
    });
    warning.addEventListener('cancel', e => e.preventDefault());
    $('guard-finish').addEventListener('click', () => ask('finish'));
    $('reset').addEventListener('click', () => ask('erase'));
    $('guard-confirm-cancel').addEventListener('click', () => { confirmation = null; confirmBox.close(); });
    confirmBox.addEventListener('cancel', () => { confirmation = null; });
    $('guard-confirm-ok').addEventListener('click', confirmAction);
    $('guard-retry').addEventListener('click', () => {
      if (problem !== 'io') return;
      problem = ''; problemText = '';
      if (state.phase === 'active') { restoring = true; state.pending ||= 'resume'; }
      persist(); render();
    });
    // Los intentos antiguos conservan el tiempo acumulado; los nuevos incluyen
    // una marca de inicio que también cuenta el tiempo con la página cerrada.
    if (state.phase === 'active' && state.data.started === null) state.data.started = Date.now();
    if (state.phase !== 'active') state.data.started = null;
    adapter.restore(state.data);
    if (!problem) persist(); // Prueba escritura antes de habilitar Comenzar.
    initialized = true;
    $('cuaderno').hidden = false; $('cuaderno').inert = false;
    $('guard-panel').hidden = false; $('guard-panel').inert = false;
    $('guard-boot').hidden = true;
    render();
    return Object.freeze({ canEdit, canDownloadReport, saveEdit, metadata, render });
  };
})();
