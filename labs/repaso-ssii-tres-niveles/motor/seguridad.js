/**
 * CONTROLES DIDÁCTICOS DEL NAVEGADOR · MOTOR COMÚN
 * -------------------------------------------
 * Esta plantilla es disuasoria, NO un sistema de examen seguro. El usuario
 * controla JavaScript, el DOM y localStorage. No se identifican otras webs,
 * no se lee el portapapeles. El adaptador prepara la entrega al registro del profesor.
 *
 * Integración: createPracticeGuard(adapter) recibe las operaciones del
 * examen. El controlador no conoce las preguntas ni sus soluciones.
 * Configuración y formato de guardado: adapter.config.
 */
(() => {
  'use strict';

  window.createPracticeGuard = function createPracticeGuard(adapter) {
    // 1. POLÍTICA. Esta clave es exclusiva de este laboratorio. No usar clear():
    // borraría también borradores de otros laboratorios del mismo dominio.
    const CONFIG = Object.freeze({
      key: adapter.config.storage.key, legacyKey: adapter.config.storage.legacyKey,
      limit: 3, maxEvents: 80, settleMs: 200, blockClipboard: true
    });
    const WHY = { hidden: 'página oculta', blur: 'pérdida de foco',
      fullscreen: 'salida de pantalla completa', pagehide: 'recarga o cierre' };
    const $ = id => document.getElementById(id);
    const root = document.documentElement;
    const warning = $('guard-warning'), confirmBox = $('guard-confirm');
    let initialized = false, fatal = false, busy = false, restoring = false;
    let problem = '', problemText = '', lastRaw = null, timer = null;
    let confirmation = null, forcedBusy = false, rerollPending = false, fileRecovery=false;
    let focusTimer = null;
    const recentActions = new Map();
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
        data: adapter.empty(), backup: null, attemptAudit:{startedAt:null,finishedAt:null,ipSamples:[]}, closingAt: null, recoveries: 0, actionCounts: {}, actions: [] };
    }
    function log(text) {
      state.events.push({ at: Date.now(), text });
      state.events = state.events.slice(-CONFIG.maxEvents);
    }
    const stamp = n => Number.isFinite(n) && n >= 0 && n <= 8640000000000000;

    function validIP(ip){
      if(typeof ip!=='string'||ip.length>45)return false;
      if(/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip))return ip.split('.').every(n=>Number(n)<=255);
      if(!/^[a-f0-9:]+$/i.test(ip)||!ip.includes(':'))return false;
      try{return !!new URL('http://['+ip+']/').hostname;}catch{return false;}
    }
    function sanitizeAudit(a){
      if(a===undefined)return {startedAt:null,finishedAt:null,ipSamples:[]};
      if(!a||typeof a!=='object'||!Array.isArray(a.ipSamples))throw Error('Invalid attempt audit');
      return {
        startedAt:stamp(a.startedAt)?a.startedAt:null,
        finishedAt:stamp(a.finishedAt)?a.finishedAt:null,
        ipSamples:a.ipSamples.slice(-8).map(s=>{
          if(!s||!stamp(s.at)||!['start','recovery'].includes(s.reason)||!['pending','available','unavailable'].includes(s.status))throw Error('Invalid IP sample');
          if(s.ip!==null&&!validIP(s.ip))throw Error('Invalid IP address');
          // A request cannot continue across a reload.
          return {at:s.at,reason:s.reason,ip:s.ip,status:s.status==='pending'?'unavailable':s.status};
        })
      };
    }
    function recordIPUnavailable(reason){
      // Browser JavaScript has no reliable public-IP API. No external requests,
      // WebRTC/STUN probes or fingerprinting are used.
      state.attemptAudit.ipSamples.push({at:Date.now(),reason,ip:null,status:'unavailable'});
      state.attemptAudit.ipSamples=state.attemptAudit.ipSamples.slice(-8);
    }
    function validate(s) {
      // Se validan estructura y límites. Esto detecta daños accidentales,
      // NO acredita que el alumno no haya modificado un JSON válido.
      if (!s || s.version !== 1 || !['ready','active','paused','closing','submitted','reset','review'].includes(s.phase)
        || !Number.isSafeInteger(s.attempt) || s.attempt < 0
        || !Number.isInteger(s.count) || s.count < 0 || s.count > CONFIG.limit
        || (['active','paused'].includes(s.phase) && s.count >= CONFIG.limit)
        || !Number.isInteger(s.clipboardBlocked) || s.clipboardBlocked < 0
        || s.clipboardBlocked > 1000000
        || ![null,'first','last','reset','resume'].includes(s.pending)
        || !s.data || !Array.isArray(s.events)) throw new Error('Estado inválido');
      return { ...fresh(), phase: s.phase, attempt: s.attempt, count: s.count,
        pending: s.pending, clipboardBlocked: s.clipboardBlocked,
        attemptAudit:sanitizeAudit(s.attemptAudit),
        recoveries: Number.isInteger(s.recoveries)&&s.recoveries>=0&&s.recoveries<=s.count?s.recoveries:0,
        closingAt: stamp(s.closingAt) ? s.closingAt : null,
        actionCounts: Object.fromEntries(Object.entries(s.actionCounts || {}).filter(([k,v]) => /^[A-Za-z0-9+_-]{1,48}$/.test(k) && Number.isSafeInteger(v) && v >= 0).slice(0,300)),
        actions: Array.isArray(s.actions) ? s.actions.filter(a => a && stamp(a.at) && typeof a.action === 'string' && /^[A-Za-z0-9+_-]{1,48}$/.test(a.action)).slice(-1000).map(a => ({at:a.at,action:a.action})) : [],
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
          try {
            const saved=validate(JSON.parse(lastRaw));
            // Older labs did not collect a name or require the school domain.
            // Preserve every answer and completed report; request the new identity before resuming.
            if (saved.phase === 'active' && (!saved.data.values.fullname?.trim()
                || !/^[^\s@]+@g\.educaand\.es$/i.test(saved.data.values.student||''))) {
              if(saved.data.started)saved.data.elapsed+=Math.max(0,Date.now()-saved.data.started);
              saved.data.started=null;saved.data.language='es';
              saved.phase='ready';saved.pending=null;
              saved.events.push({at:Date.now(),text:'Borrador conservado; pendiente de identificación y aceptación del nuevo procedimiento.'});
            }
            return saved;
          }
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
    const previous=load();
    // Opening the lab always starts at identification. Preserve the previous
    // browser snapshot separately; resumption is explicit through a document.
    if(lastRaw!==null&&problem!=='io'&&(previous.attempt>0||problem==='invalid')){
      try{
        localStorage.setItem(CONFIG.key+'-previous',lastRaw);
        if(problem==='invalid'){problem='';problemText='';}
      }catch{problem='io';problemText='No se pudo conservar el guardado anterior.';}
    }
    let state = fresh();
    restoring = false;

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
        && !state.pending && !state.episode && !restoring && !busy && !fileRecovery && safe(signals());
    }
    function failClosed() {
      fatal = true;
      adapter.setEnabled(false);
      $('cuaderno').hidden = true; $('cuaderno').inert = true;
      $('guard-panel').inert = true;
      if (warning.open) warning.close();
      if (confirmBox.open) confirmBox.close();
      $('guard-boot').hidden = false;
      $('guard-boot-detail').textContent = 'Se produjo un error de JavaScript. El laboratorio está bloqueado. No borres los datos: avisa al profesor. El último guardado correcto se conserva.';
    }

    // 4. VISTA. disabled bloquea respuestas; el modal explica el bloqueo.
    // No se muestra encima de otra aplicación: el aviso se ve al regresar.
    function render() {
      if (fatal) return;
      const enabled = canEdit(), s = signals();
      adapter.setEnabled(enabled);

      const names = { ready: 'Pendiente de comenzar', active: enabled ? 'En curso' : 'Respuestas bloqueadas · reloj en marcha',
        paused: 'Práctica guardada y pausada', closing: 'Cerrando intento: respuestas conservadas', submitted: 'Intento finalizado', reset: 'Reiniciado por tres incidencias', review: 'Copia recuperada: solo lectura' };
      $('guard-state').textContent = names[state.phase];
      $('guard-count').textContent = `${state.count} de ${CONFIG.limit}`;
      $('guard-conditions').textContent = `Pantalla completa: ${s.fullscreen ? 'sí' : 'no'} · Foco: ${s.focused ? 'sí' : 'no'} · Visible: ${s.visible ? 'sí' : 'no'}`;
      $('guard-start-box').hidden = state.phase === 'active';
      $('guard-consent').disabled = !supported || !!problem;
      $('guard-start').disabled = !supported || !!problem || busy || !!state.pending || !$('guard-consent').checked || !adapter.canStart() || state.phase === 'paused';
      $('guard-start').textContent = state.phase === 'ready' ? 'Pantalla completa y comenzar' : 'Pantalla completa y nuevo intento vacío';
      $('guard-problem').hidden = !problem && supported;
      $('guard-problem-text').textContent = problemText || (!supported ? 'Este navegador no ofrece las funciones necesarias. Abre la página directamente en un navegador de escritorio compatible con pantalla completa.' : '');
      $('guard-retry').hidden = problem !== 'io';
      $('saveStatus').textContent = problem ? 'Guardado bloqueado. Revisa el aviso superior.'
        : state.savedAt ? 'Respuestas guardadas: ' + new Date(state.savedAt).toLocaleTimeString('es-ES') : 'Guardado local preparado.';
      const canExport = !problem && state.phase === 'submitted';
      $('report').disabled = true;
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
      adapter.afterRender(state, {problem, supported, busy, restoring, forcedBusy});
    }
    function showWarning() {
      if (restoring || !initialized || !state.pending || !signals().visible || !signals().focused || fatal) return;
      if (confirmBox.open) confirmBox.close();
      confirmation = null;
      const texts = {
        first: ['Primer aviso', 'El laboratorio perdió visibilidad, foco o pantalla completa. Las respuestas se conservan. La tercera incidencia generará una entrega automática.'],
        last: ['Último aviso', 'Segunda incidencia. La próxima vez se cerrará el intento y se generará una entrega con las respuestas actuales.'],
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
      if (!initialized || fatal || problem || restoring || fileRecovery || state.phase !== 'active') return;
      clearTimeout(timer);
      if (!state.episode) {
        state.data = adapter.snapshot();
        state.episode = { at: Date.now(), reasons: [reason] };
        rerollPending = true;
        state.count++;
        log(`Incidencia ${state.count}/${CONFIG.limit}: ${WHY[reason]}.`);
        if (state.count >= CONFIG.limit) {
          state.closingAt = Date.now();state.attemptAudit.finishedAt=state.closingAt;
          adapter.stopClock(state.closingAt);
          state.data = adapter.snapshot();
          state.phase = 'closing'; state.pending = null; rerollPending = false;
          if (warning.open) warning.close();
          if (confirmBox.open) confirmBox.close();
          confirmation = null;
          log('Tercera incidencia: cierre automático con respuestas conservadas.');
        } else state.pending = state.count === 1 ? 'first' : 'last';
      } else if (!state.episode.reasons.includes(reason)) {
        state.episode.reasons.push(reason);
        log(`Mismo episodio: ${WHY[reason]} (sin sumar otra incidencia).`);
      }
      persist(); render();
      if (state.phase === 'closing') void finalizeForced();
    }
    function refreshPending() {
      if (!rerollPending || restoring || state.phase !== 'active' || !safe(signals())) return;
      const changed=adapter.refreshPendingParameters();
      rerollPending=false;state.data=adapter.snapshot();
      if(changed)log('Datos renovados en ejercicios sin empezar: '+changed+'.');
    }
    function environment(reason) {
      if (!initialized || fatal) return;
      const s = signals();
      if(safe(s)){clearTimeout(focusTimer);focusTimer=null;}
      if (state.phase === 'active' && !restoring && !fileRecovery) {
        if (reason === 'pagehide') record(reason);
        else if (!safe(s)) {
          // Entering fullscreen can briefly blur the window. Confirm a
          // foreground focus loss after the same settling interval used on return.
          // Hidden pages and actual fullscreen exits still count immediately.
          const r = !s.visible ? 'hidden' : !s.fullscreen ? 'fullscreen' : 'blur';
          if(r==='blur'){
            if(focusTimer===null)focusTimer=setTimeout(()=>{
              focusTimer=null;
              if(state.phase==='active'&&!restoring&&!safe(signals())){
                const now=signals();
                record(!now.visible?'hidden':!now.fullscreen?'fullscreen':'blur');
                render();
              }
            },CONFIG.settleMs);
          }else{clearTimeout(focusTimer);focusTimer=null;record(r);}
        } else if (state.episode) {
          clearTimeout(timer);
          timer = setTimeout(() => {
            if (safe(signals()) && state.phase === 'active' && !problem) {
              refreshPending(); state.episode = null; persist(); render();
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
      if (!resume && (!$('guard-consent').checked || !adapter.canStart() || !['ready','reset','review'].includes(state.phase))) return;
      const recovery=resume&&(restoring||state.phase==='paused');
      busy = true; $('guard-warning-error').textContent = ''; render();
      try {
        await fullscreen();
        if (problem || fatal) return;
        // Una tercera salida durante la petición no puede revivir el intento.
        if (resume && !['active','paused'].includes(state.phase)) return;
        if(recovery){
          state.count++;state.recoveries++;rerollPending=false;
          recordIPUnavailable('recovery');
          log('Recuperación guardada: incidencia '+state.count+'/'+CONFIG.limit+'.');
          if(state.count>=CONFIG.limit){
            state.closingAt=Date.now();state.attemptAudit.finishedAt=state.closingAt;adapter.stopClock(state.closingAt);
            state.data=adapter.snapshot();state.phase='closing';state.pending=null;state.episode=null;restoring=false;
            if(warning.open)warning.close();
            if(persist()){render();void finalizeForced();return true;}
            return false;
          }
          state.phase='active';
        } else if(resume) refreshPending();
        if (!resume) {
          const keep = state.phase === 'ready';
          const data = adapter.snapshot();
          const backup = state.backup, events = state.events, attempt = state.attempt + 1;
          state = { ...fresh(), phase: 'active', attempt, data, backup, events };
          state.attemptAudit.startedAt=Date.now();recordIPUnavailable('start');
          adapter.restore(data); log(`Comienzo del intento ${attempt}. Normas aceptadas.`);
        } else log('Intento reanudado en pantalla completa.');
        state.pending = null; state.episode = null; restoring = false;
        if (warning.open) warning.close();
        $('guard-action-status').textContent = '';
        adapter.startClock(); state.data = adapter.snapshot();
        return persist();
      } catch (e) {
        $('guard-action-status').textContent = e.message || 'No se pudo activar pantalla completa.';
        $('guard-warning-error').textContent = 'No se pudo activar pantalla completa. Regresa a la página y vuelve a intentarlo.';
      } finally { busy = false; render(); }
    }


    async function pausePractice() {
      if(state.phase!=='paused'&&!canEdit())return false;
      adapter.stopClock();
      state.data=adapter.snapshot();state.phase='paused';state.pending=null;state.episode=null;
      rerollPending=false;restoring=false;
      log('Práctica guardada y pausada; recuperar consumirá una incidencia.');
      const saved=persist();render();
      if(saved&&document.fullscreenElement===root){try{await document.exitFullscreen();}catch{}}
      return saved;
    }
    function exportPractice(){
      if(problem||fatal||!['paused','submitted'].includes(state.phase))throw Error('Attempt cannot be exported');
      return JSON.stringify({format:adapter.config.format.save,version:1,language:state.data.language,state},null,2);
    }
    function importPractice(text){
      if(problem||fatal||busy||!(['ready','paused','submitted','reset'].includes(state.phase)||(state.phase==='active'&&(restoring||fileRecovery))))throw Error('Cannot import now');
      const doc=JSON.parse(text);
      if(doc.format!==adapter.config.format.save||doc.version!==1||!['paused','submitted'].includes(doc.state?.phase))throw Error('Invalid save file');
      const next=validate(doc.state);
      if(doc.language!==undefined){
        if(!['es','en'].includes(doc.language)||next.data.language&&next.data.language!==doc.language)throw Error('Invalid document language');
        next.data.language=doc.language;
      }
      // Older files use the language already stored inside state.data.
      next.data.language=next.data.language||adapter.snapshot().language||'es';
      if(!next.attemptAudit.startedAt||!next.data.values.fullname?.trim()||!adapter.validEmail(next.data.values.student||''))throw Error('Invalid identity');
      const currentEmail=$('student').value.trim().toLowerCase();
      if(!adapter.validEmail(currentEmail))throw Object.assign(Error('Enter current email'),{code:'RECOVERY_EMAIL_REQUIRED'});
      if(currentEmail!==next.data.values.student.trim().toLowerCase())throw Object.assign(Error('Email mismatch'),{code:'RECOVERY_EMAIL_MISMATCH'});
      // Reopening an older copy must not reduce this browser's recorded count.
      if(next.attemptAudit.startedAt===state.attemptAudit.startedAt&&next.data.values.student===state.data.values.student){
        if(state.phase==='closing'||state.count>=CONFIG.limit)throw Error('Incident limit reached');
        next.count=Math.max(next.count,state.count);
        next.recoveries=Math.max(next.recoveries,state.recoveries);
      }
      if(next.count>=CONFIG.limit)throw Error('Incident limit reached');
      next.phase='paused';next.data.report='';next.closingAt=null;
      next.attemptAudit.finishedAt=null;
      next.data.started=null;next.pending=null;next.episode=null;
      state=next;restoring=false;rerollPending=false;
      adapter.restore(state.data);
      log('Documento de práctica recuperado; pendiente de continuar.');
      if(!persist())throw Error('Could not save imported data');
      render();
    }
    function beginFileRecovery(){
      if(fileRecovery||busy||problem||fatal||!(canEdit()||state.phase==='paused'))return false;
      fileRecovery=true;render();return true;
    }
    function endFileRecovery(){fileRecovery=false;render();}
    function recoverPractice(){
      if(!(state.phase==='paused'||(state.phase==='active'&&restoring)))return;
      return startOrResume(true);
    }

    // 6. ENTRADA. Registrar acciones bloqueadas sin sumar incidencias de entorno.
    // No se leen contenidos ni se solicitan permisos de lectura del sistema.
    // El informe se exporta como TXT únicamente después de finalizar.
    function canDownloadReport() {
      return !problem && !fatal && state.phase === 'submitted' && !!$('report').value;
    }
    function auditAction(e) {
      if (state.phase !== 'active' || problem || fatal) return;
      let action = '';
      if (e.type.startsWith('key')) {
        if (e.type !== 'keydown' || e.repeat) return;
        const key = /^F(?:[1-9]|1\d|2[0-4])$/i.test(e.key) ? e.key.toUpperCase() : /^F(?:[1-9]|1\d|2[0-4])$/i.test(e.code) ? e.code.toUpperCase() : null;
        const safeKey = /^[a-z0-9]$/i.test(e.key) ? e.key.toUpperCase() : ['Control','Insert','Delete','Escape','Tab','Enter','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key) ? e.key : 'Other';
        action = key ? (e.ctrlKey ? 'Ctrl+' : '') + key : e.key === 'Control' ? 'Control' : (e.ctrlKey ? 'Ctrl+' : e.metaKey ? 'Cmd+' : e.shiftKey ? 'Shift+' : '') + safeKey;
      } else if (e.type === 'contextmenu' || e.button === 2) action = 'right-click';
      else if (e.ctrlKey && /pointer|mouse|click/.test(e.type)) action = 'Ctrl+click';
      else action = ({insertFromPaste:'paste',insertFromPasteAsQuotation:'paste',insertFromDrop:'drop',deleteByCut:'cut',deleteByDrag:'dragstart'})[e.inputType] || e.type;
      if (!/^[A-Za-z0-9+_-]{1,48}$/.test(action)) return;
      const now = Date.now();
      if (!e.type.startsWith('key') && now - (recentActions.get(action) || 0) < 400) return;
      recentActions.set(action, now);
      state.actionCounts[action] = (state.actionCounts[action] || 0) + 1;
      state.actions.push({at:now,action}); state.actions = state.actions.slice(-1000);
      persist();
    }
    function blockAction(e) {
      if (e.cancelable) e.preventDefault();
      e.stopImmediatePropagation();
      auditAction(e);
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
        if (CONFIG.blockClipboard && forbiddenInput(e.inputType)) blockAction(e);
      }
    }

    // 7. FINALIZAR Y BORRAR. El adaptador descarga el TXT y envía la entrega al receptor configurado.
    function metadata() {
      return [`Intento: ${state.attempt}`, `Incidencias de entorno: ${state.count}/${CONFIG.limit}`,
        'Acciones bloqueadas: ' + JSON.stringify(state.actionCounts),
        'Registro local orientativo; no acredita copia ni identidad.',
        ...state.events.map(e => `${new Date(e.at).toISOString()} · ${e.text}`)].join('\n');
    }
    function ask(kind) {
      if (problem || busy || fatal) return;
      if (kind === 'finish' && !canEdit()) return;
      if(kind==='save'&&!canEdit()&&state.phase!=='paused')return;

      confirmation = kind;
      $('guard-confirm-title').textContent = kind === 'finish' ? '¿Finalizar el intento?' : '¿Borrar los datos locales?';
      $('guard-confirm-text').textContent = kind === 'finish'
        ? 'Se descargará un fichero TXT con tus respuestas y el tiempo total empleado. El laboratorio quedará finalizado y no podrás modificar las respuestas, aunque haya pasos pendientes. Para seguir trabajando, cancela.'
        : 'Se eliminarán de este navegador las respuestas, el contador, el informe y cualquier copia antigua de este laboratorio. Conserva antes tu entrega. No se borrarán datos de otros laboratorios.';
      adapter.confirmText(kind);
      confirmBox.showModal();
    }
    async function confirmAction() {
      const kind = confirmation;
      confirmation = null; confirmBox.close();
      if(kind==='save'){
        if(await pausePractice()){
          busy=true;render();
          try{if(await adapter.savePracticeDocument())resetProcess();}finally{busy=false;render();}
        }
        return;
      }
      if (kind === 'erase') {
        if (problem||busy) return;
        if(state.phase==='active'&&!await pausePractice())return;
        busy=true;render();
        try {
          if(!await adapter.saveBeforeReset(state.phase))return;
          if (localStorage.getItem(CONFIG.key) !== lastRaw) { environment('focus'); persist(); return; }
          localStorage.removeItem(CONFIG.legacyKey);
          localStorage.removeItem(CONFIG.key);
          adapter.stopClock();
          state = fresh(); lastRaw = null; restoring = false;rerollPending=false;
          adapter.onReset();
          adapter.restore(state.data); $('guard-consent').checked = false;
          // No persistir de nuevo durante pagehide: el borrado debe ser real.
          render();
          if(document.fullscreenElement===root)document.exitFullscreen().catch(()=>{});
        } catch { problem = 'io'; problemText = 'No se pudieron borrar los datos. Se conserva la página para revisión.'; render(); }
        finally {busy=false;render();}
        return;
      }
      if (kind !== 'finish' || !canEdit()) return;
      const finishedAt = Date.now();
      state.data = adapter.snapshot();
      const beforeCount = state.count;
      busy = true; render();
      try {
        const report = await adapter.makeReport(metadata(), true, finishedAt, reportContext('voluntary',finishedAt));
        // El cálculo SHA-256 es asíncrono. Una salida en mitad del cálculo
        // cancela la entrega: no permite saltarse un aviso o el tercer reinicio.
        if (!report || problem || fatal || state.phase !== 'active' || state.count !== beforeCount
          || state.pending || !safe(signals())) return;
        adapter.stopClock(finishedAt);state.attemptAudit.finishedAt=finishedAt;
        state.phase = 'submitted'; state.pending = null; state.episode = null;
        adapter.setReport(report);
        state.data = adapter.snapshot(); log('Intento finalizado. Exportación del informe habilitada.');
        if (!persist()) return;
        await adapter.downloadReport();
        if (document.fullscreenElement === root) {
          try { await document.exitFullscreen(); } catch { /* Ya está finalizado: no penalizar. */ }
        }
      } catch { $('reportStatus').textContent = 'No se pudo generar el informe. No se ha finalizado el intento; revisa los datos y vuelve a intentarlo.'; }
      finally { busy = false; render(); }
    }
    function reportContext(reason,finishedAt=state.closingAt||Date.now()) {
      return {attemptStartedAt:state.attemptAudit.startedAt===null?null:new Date(state.attemptAudit.startedAt).toISOString(),attemptFinishedAt:new Date(finishedAt).toISOString(),timeZone:'Europe/Madrid',ipSamples:structuredClone(state.attemptAudit.ipSamples),finishReason:reason, recoveries:state.recoveries, incidents:state.count, actionCounts:structuredClone(state.actionCounts), actions:structuredClone(state.actions)};
    }
    async function finalizeForced() {
      if (forcedBusy || fatal || problem || state.phase !== 'closing') return;
      forcedBusy = true;
      try {
        const report = await adapter.makeReport(metadata(), true, state.closingAt || Date.now(), reportContext('incident-limit'));
        if (!report) { adapter.forcedError(); return; }
        if (fatal || problem || state.phase !== 'closing') return;
        adapter.setReport(report); state.data = adapter.snapshot();
        state.phase = 'submitted'; state.pending = null; state.episode = null;
        log('Entrega generada automáticamente tras tres incidencias.');
        if (!persist()) return;
        render();
        await adapter.downloadReport();
        if (document.fullscreenElement === root) { try { await document.exitFullscreen(); } catch {} }
      } catch { adapter.forcedError(); }
      finally { forcedBusy = false; render(); }
    }
    function resetProcess() {
      if (fatal || problem || !['submitted','reset','paused'].includes(state.phase)) return false;
      const prior = structuredClone(state);
      state = fresh(); restoring = false;
      if (!persist()) { state = prior; render(); return false; }
      adapter.onReset(); adapter.restore(state.data);
      $('guard-consent').checked = false;
      if (warning.open) warning.close();
      if (confirmBox.open) confirmBox.close();
      render();
      if (document.fullscreenElement === root) document.exitFullscreen().catch(() => {});
      return true;
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
    // Control y botón derecho: durante toda la página, incluso tras finalizar.
    // Solo se pueden cancelar los eventos que el navegador entrega al documento.
    for (const type of ['keydown','keypress','keyup']) document.addEventListener(type, e => {
      const k = e.key.toLowerCase();
      const previousShortcut = CONFIG.blockClipboard && (
        (e.metaKey && ['c','x','v'].includes(k))
        || (e.shiftKey && ['insert','delete'].includes(k)));
      const functionKey = /^f(?:[1-9]|1\d|2[0-4])$/i;
      if (e.ctrlKey || k === 'control' || previousShortcut || functionKey.test(k) || functionKey.test(e.code || '')) blockAction(e);
    }, true);
    document.addEventListener('contextmenu', blockAction, true);
    for (const type of ['pointerdown','pointerup','mousedown','mouseup','click','auxclick','dblclick']) {
      document.addEventListener(type, e => {
        if (e.button === 2 || e.ctrlKey) blockAction(e);
      }, true);
    }
    if (CONFIG.blockClipboard) {
      for (const type of ['copy','cut','paste','dragstart','drop','dragover']) {
        document.addEventListener(type, blockAction, true);
      }
    }
    $('guard-consent').addEventListener('change', render);
    $('guard-start').addEventListener('click', () => startOrResume(false));
    $('guard-continue').addEventListener('click', () => {
      if (state.phase === 'active') startOrResume(true);
      else { state.pending = null; state.episode = null; warning.close(); resetProcess(); }
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
      if (state.phase === 'closing') void finalizeForced();
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
    if (state.phase === 'closing') setTimeout(() => void finalizeForced(), 0);
    return Object.freeze({ canEdit, canDownloadReport, saveEdit, metadata, render, resetProcess, finalizeForced, pausePractice, recoverPractice, exportPractice, importPractice, beginFileRecovery, endFileRecovery, ask });
  };
})();

