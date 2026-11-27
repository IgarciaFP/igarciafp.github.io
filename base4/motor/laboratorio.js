(() => {
'use strict';
// Motor del taller de código: editor HTML/CSS/JS a la izquierda y resultado a la derecha.
// Sin selección de idioma ni nombre: la identificación es solo el correo del centro.
// Seguridad y entrega son los módulos comunes de /base/motor/.
const {config,code,sections,sectionMode}=window.Lab;
let sectionView=null,toolbox=null,clipboard=null;
// Herramienta activada por defecto; solo el profesor la configura.
const allowEditingShortcuts=config.tools?.enabled?.atajosTeclado!==false;
function editingShortcut(event){
 const key=String(event.key||'').toLowerCase();
 if(['copy','cut','paste','selectstart'].includes(event.type))return true;
 if(!event.type.startsWith('key')||event.altKey)return false;
 return ['control','meta','shift'].includes(key)||
  ((event.ctrlKey||event.metaKey)&&['a','c','v','x','z','y','arrowleft','arrowright','arrowup','arrowdown','home','end','insert'].includes(key))||
  (event.shiftKey&&['arrowleft','arrowright','arrowup','arrowdown','home','end','pageup','pagedown','insert','delete'].includes(key));
}
// Conserva la inspección y el menú contextual ya habilitados en base4.
const TEMP_ALLOW_INSPECTION=true;
if(TEMP_ALLOW_INSPECTION)document.documentElement.classList.add('allow-inspection');
const installGuards=window.installPracticeInputGuards;
window.installPracticeInputGuards=(doc,blockAction,blockClipboard)=>{
 if(!allowEditingShortcuts)for(const type of ['keydown','keypress','keyup'])doc.addEventListener(type,event=>{
  if(editingShortcut(event)&&!['control','meta','shift'].includes(String(event.key||'').toLowerCase()))blockAction(event);
 },true);
 return installGuards(doc,event=>{
 if((allowEditingShortcuts&&editingShortcut(event))||(TEMP_ALLOW_INSPECTION&&(event.type==='contextmenu'||event.button===2)))return;
 blockAction(event);
},blockClipboard);
};
const $=id=>document.getElementById(id);
// Pestañas del editor. «txt» son notas del alumno: no forman parte del resultado.
const LANGS=['html','css','js','txt'];
const NAMES={html:'HTML',css:'CSS',js:'JavaScript',txt:'TXT'};
let language=window.LabI18n?.language||'es';
let uiLanguage=language;
const ids=[...LANGS,'student'];
// El código de partida (contenido/codigo.*) se carga en las pestañas del editor al empezar.
const start={...code,txt:''};
// Entrega por defecto: un único archivo TXT descargado. Con "apps-script" se envía además al receptor.
const fileMode=config.delivery.type==='archivo';
const deliveryReady=()=>fileMode||window.LabDelivery.configured(config.delivery);
const RECOVERY=config.storage.recovery;
const IDENTITY_KEY=config.storage.key+'-identity';
const browserDrafts=config.localDrafts?window.LabDrafts.create(config):null;
let durationMs=config.durationMs;
let emailTouched=false,guard=null,elapsed=0,started=null,phase='ready',delivering=false,lastDelivery=null,recoveryMode=false;

const texts={
 identification:'ID',email:'Correo del centro',retrySave:'Reintentar guardado',
 elapsed:'Tiempo restante',cancel:'Cancelar',confirm:'Confirmar',start:'Empezar',backStart:'Volver al inicio',
 ready:'Pendiente de comenzar',active:'En curso',blocked:'Código bloqueado · reloj en marcha',
 paused:'Práctica guardada y pausada',closing:'Cierre automático: código conservado',
 submitted:'Intento finalizado',reset:'Intento invalidado',review:'Copia recuperada: solo lectura',
 saved:'Código guardado: ',saveReady:'Guardado local preparado.',
 saveError:'Guardado bloqueado. Revisa el aviso superior.',
 first:'Primer aviso',last:'Último aviso',resetTitle:'Intento reiniciado',resume:'Recuperar práctica guardada',
 firstText:'Tu código se conserva. Vuelve a pantalla completa antes de agotar el tiempo restante.',
 lastText:'Vuelve a pantalla completa antes de agotar el tiempo restante.',
 resetText:'Intento finalizado. Volverás a identificarte.',
 resumeText:'Recupera la pantalla completa para continuar con tu práctica.',
 resumeAction:'Recuperar (+1 incidencia)',continue:'Continuar en pantalla completa',understood:'Volver al inicio',
 confirmTitle:'¿Generar la entrega y finalizar?',
 confirmBody:'El código quedará bloqueado. Se descargará un TXT de respaldo y se enviará la entrega. Espera la confirmación de recepción.',
 changed:'Has cambiado el código: la entrega anterior ya no es válida.',
 genericError:'No se pudo generar el informe. No se ha finalizado el intento; revisa los datos y vuelve a intentarlo.',
 domain:`Solo se admite el dominio @${config.emailDomain}.`,
 identityError:`Introduce un correo válido terminado exactamente en @${config.emailDomain}.`,
 receipt:'Descargar comprobante TXT',
 receiptRequested:'Descarga del comprobante solicitada. Si no aparece, pulsa «Descargar comprobante TXT».',
 receiptError:'No se pudo iniciar la descarga. La entrega sigue guardada; vuelve a descargar el comprobante.',
 compressionError:'Este navegador no permite comprimir la entrega. Actualízalo o consulta al profesor. El intento no se ha finalizado.',
 forcedPending:'Se ha agotado el tiempo permitido. Se está generando la entrega con tu código conservado.',
 forcedError:'No se pudo generar la entrega automática. Tu código sigue guardado y bloqueado. Pulsa Reintentar entrega.',
 forcedRetry:'Reintentar entrega',
 savePractice:'Pausar',recoverPractice:'Recuperar práctica',toolbarFinish:'Entregar',toolbarReset:'Reiniciar',
 saveWarning:'Se guardará la práctica en este navegador y volverás al inicio. El tiempo quedará pausado. ¿Pausar?',
 restartWarning:'Se descargará automáticamente una copia antes de borrar el intento y volver al comienzo. ¿Reiniciar?',
 recoveryFullscreenError:'El navegador no ha permitido activar la pantalla completa. Revisa el permiso y vuelve a pulsar Recuperar práctica.',
 fileSaved:'Archivo descargado. Consérvalo y recupéralo desde el inicio para continuar otro día.',
 fileError:'No se pudo descargar el documento. La práctica sigue guardada aquí; vuelve a pulsar Pausar.',
 recoveryEmailRequired:'Introduce primero tu correo en los datos de inicio para poder recuperar una práctica.',
 recoveryEmailMismatch:'El correo actual no coincide con el de la práctica guardada. No se ha recuperado ni se ha añadido ninguna incidencia.',
 fileInvalid:'No se pudo recuperar: selecciona un archivo de práctica o comprobante válido.',
 deliveryTitle:'Entrega del laboratorio',copyOpen:'Enviar / reintentar entrega',
 deliveryNote:'Conserva el TXT. La entrega solo está registrada cuando aparece la confirmación con su identificador y fecha. Si falla la conexión, reintenta sin cambiar el código.',
 sending:'Enviando el código… Espera la confirmación.',
 received:'Entrega recibida. Identificador:',receivedShort:'Entrega recibida',
 deliveryFailed:'No se ha podido confirmar la recepción. Tu código sigue guardado. Pulsa «Enviar / reintentar entrega».',
 notConfigured:'Esta práctica todavía no tiene activado el destino de entrega. El profesor debe configurarlo antes de comenzar.',
 pendingDelivery:'Tienes una entrega pendiente de confirmar. Puedes volver a enviarla o descargar su TXT.',
 previousReceived:'Ya has completado este laboratorio',viewReceipt:'Ver confirmación',recover:'Ver la última entrega',
 pendingRun:'Hay cambios sin ejecutar: pulsa Ejecutar.',
 navigation:'La vista previa no puede abrir otras páginas. Pulsa Ejecutar para volver a tu resultado.',
 consoleEmpty:'Aquí aparecen los mensajes de console.log y los errores de tu código.',
 chars:' caracteres',restore:'↺ Restaurar',restoreConfirm:'¿Seguro? Pulsa otra vez'
};
if(fileMode)Object.assign(texts,{
 confirmBody:'El código quedará bloqueado y se descargará un único archivo TXT con tu entrega. Entrégalo como te indique el profesor.',
 copyOpen:'Descargar la entrega de nuevo',
 deliveryNote:'Tu entrega es el archivo TXT descargado: contiene el código que has modificado, comprimido y codificado. Consérvalo sin modificarlo y entrégalo como te indique el profesor.',
 fileDelivered:'Entrega generada y descargada en un único archivo TXT.',
 receiptRequested:'Descarga solicitada. Si no aparece el archivo, pulsa «Descargar la entrega de nuevo».',
 receiptError:'No se pudo iniciar la descarga. La entrega sigue guardada en este navegador; vuelve a descargarla.',
 pendingDelivery:'Ya generaste una entrega en este navegador. Puedes volver a descargar su archivo TXT.',
 forcedPending:'Se ha agotado el tiempo permitido. Se está generando el archivo de entrega con tu código conservado.'
});
Object.assign(texts,{activity:'Instrucciones',yourCode:'Tu código',result:'Resultado',refresh:'↻ Actualizar',run:'▶ Ejecutar',console:'Consola',attempts:'Intentos restantes: ',languageLabel:'Idioma',clearCache:'Borrar caché'});
const english={"identification":"ID","email":"School email","retrySave":"Retry saving","elapsed":"Time remaining","cancel":"Cancel","confirm":"Confirm","start":"Start","backStart":"Back to start","ready":"Ready to start","active":"In progress","blocked":"Code locked · timer running","paused":"Practice saved and paused","closing":"Automatic submission: code preserved","submitted":"Attempt finished","reset":"Attempt invalidated","review":"Recovered copy: read only","saved":"Code saved: ","saveReady":"Local saving ready.","saveError":"Saving blocked. Check the notice above.","first":"First warning","last":"Last warning","resetTitle":"Attempt reset","resume":"Recover saved practice","firstText":"Your code is preserved. Return to full screen before time runs out.","lastText":"Return to full screen before time runs out.","resetText":"Attempt finished. Identify yourself again.","resumeText":"Return to full screen to continue.","resumeAction":"Recover (+1 incident)","continue":"Continue in full screen","understood":"Back to start","confirmTitle":"Generate the submission and finish?","confirmBody":"Your code will be locked. A backup TXT will be downloaded and your work submitted. Wait for the receipt.","changed":"Your code has changed: the previous submission is no longer valid.","genericError":"The report could not be generated. Your attempt is still open. Check your details and try again.","receipt":"Download TXT receipt","receiptRequested":"Download requested. If it does not appear, click Download TXT receipt.","receiptError":"The download could not start. Your submission is saved; try downloading it again.","compressionError":"This browser cannot compress your submission. Update it or contact your teacher. Your attempt is still open.","forcedPending":"Time is up. Preparing your submission with your saved code.","forcedError":"Automatic submission failed. Your code is still saved and locked. Click Retry submission.","forcedRetry":"Retry submission","savePractice":"Pause","recoverPractice":"Recover practice","toolbarFinish":"Submit","toolbarReset":"Restart","saveWarning":"A file will be downloaded and the practice paused. Recovery will be recorded. Pause?","restartWarning":"A backup will be downloaded before deleting this attempt. Restart?","recoveryFullscreenError":"Full screen was not allowed. Check browser permissions and click Recover practice again.","fileSaved":"File downloaded. Keep it to recover your practice later.","fileError":"The file could not be downloaded. Your work remains saved here. Try again.","recoveryEmailRequired":"Enter your email before recovering a practice.","recoveryEmailMismatch":"Your email does not match the saved practice. Nothing was recovered and no incident was added.","fileInvalid":"Select a valid saved practice or receipt file.","deliveryTitle":"Laboratory submission","copyOpen":"Send / retry submission","deliveryNote":"Keep the TXT. Submission is confirmed only when its identifier and date appear. If the connection fails, retry without changing your code.","sending":"Sending your code… Wait for confirmation.","received":"Submission received. Identifier:","receivedShort":"Submission received","deliveryFailed":"Receipt could not be confirmed. Your code is still saved. Click Send / retry submission.","notConfigured":"Submission has not been configured yet. Your teacher must set it up before you can start.","pendingDelivery":"A submission is awaiting confirmation. You can resend it or download its TXT.","previousReceived":"You have already completed this laboratory","viewReceipt":"View confirmation","recover":"View last submission","pendingRun":"There are changes to run: click Run.","navigation":"The preview cannot open other pages. Click Run to return to your result.","consoleEmpty":"console.log messages and code errors appear here.","chars":" characters","restore":"↺ Restore","restoreConfirm":"Are you sure? Click again","activity":"Instructions","yourCode":"Your code","result":"Result","refresh":"↻ Refresh","run":"▶ Run","console":"Console","attempts":"Attempts remaining: ","languageLabel":"Language","clearCache":"Clear cache"};
english.domain=`Only @${config.emailDomain} email addresses are allowed.`;
english.identityError=`Enter a valid email ending exactly in @${config.emailDomain}.`;
english.saveWarning='Your practice will be saved in this browser and you will return to sign-in. The timer will be paused. Pause?';
if(fileMode)Object.assign(english,{
 confirmBody:'Your code will be locked and a single TXT file downloaded. Submit it as instructed by your teacher.',
 copyOpen:'Download submission again',deliveryNote:'Your submission is the downloaded TXT file. Keep it unchanged and submit it as instructed by your teacher.',
 fileDelivered:'Submission generated and downloaded as a single TXT file.',
 receiptRequested:'Download requested. If the file does not appear, click Download submission again.',
 pendingDelivery:'You already generated a submission in this browser. You can download its TXT again.',
 forcedPending:'Time is up. Preparing your submission file with your saved code.'
});
if(Array.isArray(config.allowedUsers)){
 texts.identityError='Este correo no está autorizado para el examen.';
 english.identityError='This email is not allowed to open the exam.';
}
const tr=k=>(uiLanguage==='en'?english[k]:texts[k])??texts[k]??k;
function renderStartIcon(){
 const button=$('guard-start');
 if(!button.querySelector('svg'))button.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
 const label=tr('start');
 button.setAttribute('aria-label',label);button.title=label;
}
function applyUILanguage(){
 const en=uiLanguage==='en';
 $('action-confirm-title').textContent=en?'Confirm action':'Confirmar acción';
 $('action-confirm-cancel').textContent=en?'Cancel':'Cancelar';
 $('action-confirm-accept').textContent=en?'Confirm':'Aceptar';
 $('editor-undo').title=en?'Undo (Ctrl+Z)':'Deshacer (Ctrl+Z)';
 $('editor-undo').setAttribute('aria-label',$('editor-undo').title);
 $('editor-restore').title=en?'Restore starter code':'Restaurar código de partida';
 $('editor-restore').setAttribute('aria-label',$('editor-restore').title);
 $('txt').placeholder=en?'Notes for the teacher (optional). They do not affect the result.':'Notas para el profesor (opcional). No afectan al resultado.';
 toolbox?.language();
 document.documentElement.lang=uiLanguage;
 document.querySelectorAll('[data-text]').forEach(el=>el.textContent=tr(el.dataset.text));
 const languageAction=tr('languageLabel');
 $('ui-language').value=uiLanguage;
 $('ui-language').setAttribute('aria-label',languageAction);
 $('ui-language').title=languageAction;
 $('student').placeholder=(uiLanguage==='en'?'name':'nombre')+'@'+config.emailDomain;
 $('preview-console').dataset.empty=tr('consoleEmpty');
 clearLocalButton.title=tr('clearCache');clearLocalButton.setAttribute('aria-label',tr('clearCache'));
 renderStartIcon();
}

// ---------------------------------------------------------------- Identidad
function cachedIdentity(){
 try{const value=JSON.parse(localStorage.getItem(IDENTITY_KEY));
  if(value&&typeof value.student==='string')return {student:value.student.slice(0,254)};
 }catch{}
 return null;
}
function rememberIdentity(){
 try{localStorage.setItem(IDENTITY_KEY,JSON.stringify({student:$('student').value}));}catch{}
}
function fillCachedIdentity(onlyEmpty=true){
 const saved=cachedIdentity();if(!saved)return;
 if(!onlyEmpty||!$('student').value)$('student').value=saved.student;
}
function validEmail(email){
 const value=String(email).trim().toLowerCase();
 return /^[^\s@]+@[^\s@]+$/.test(value)&&value.split('@')[1]===config.emailDomain.toLowerCase()&&(!Array.isArray(config.allowedUsers)||config.allowedUsers.includes(value.split('@')[0]));
}
function validIdentity(){return $('student').validity.valid&&validEmail($('student').value.trim());}
const submissionStore=config.storage.key+'-submissions';
let submissionLedger={};
try{submissionLedger=JSON.parse(localStorage.getItem(submissionStore))||{};}catch{}
function submittedCount(){
 const email=$('student').value.trim().toLowerCase();
 const entries=submissionLedger[email];
 return Array.isArray(entries)?entries.length:0;
}
async function recordSubmission(item){
 const envelope=await deliveryEnvelope(item),email=JSON.parse(envelope.payload).email.toLowerCase();
 let latest={};try{latest=JSON.parse(localStorage.getItem(submissionStore))||{};}catch{}
 const wasKnown=(Array.isArray(submissionLedger[email])?submissionLedger[email]:[]).includes(envelope.submissionId);
 const ids=new Set([...(Array.isArray(latest[email])?latest[email]:[]),...(Array.isArray(submissionLedger[email])?submissionLedger[email]:[]),envelope.submissionId]);
 if(!wasKnown&&!attempt)saveOpportunity(email,Math.max(ids.size,(opportunityCache[email]?.used||0)+1));
 submissionLedger={...latest,[email]:[...ids]};
 try{localStorage.setItem(submissionStore,JSON.stringify(submissionLedger));}catch{}
}
const opportunityStore=config.storage.key+'-opportunities';
let opportunityCache={};try{opportunityCache=JSON.parse(localStorage.getItem(opportunityStore))||{};}catch{}
let opportunitySerial=0,opportunityTimer,opportunityCheck=null,revisionReason='',revisionNeeded=false;
function cachedOpportunity(){
 const email=$('student').value.trim().toLowerCase(),saved=opportunityCache[email];
 return {used:Number.isSafeInteger(saved?.used)?saved.used:submittedCount(),limit:config.maxSubmissions};
}
function saveOpportunity(email,used){
 opportunityCache[email]={used,at:Date.now()};
 try{localStorage.setItem(opportunityStore,JSON.stringify(opportunityCache));}catch{}
}
const exhaustedMessage='Número de intentos agotados. Consulta con tu profesor.';
function canStart(){return deliveryReady()&&validIdentity();}
async function checkOpportunities(){
 const email=$('student').value.trim().toLowerCase(),serial=++opportunitySerial;
 if(!validIdentity()||!deliveryReady())return null;
 try{
  const raw=browserDrafts?.peek(email),saved=raw?JSON.parse(raw):null,owner=saved?.data?.attempt;
  const result=fileMode?cachedOpportunity():await window.LabDelivery.status(config.delivery,{practiceId:config.id,email,activityTitle:config.activityTitle,url:location.origin+location.pathname,
   ...(owner?{attemptId:owner.id,attemptToken:owner.token}:{})});
  if(serial!==opportunitySerial)return null;
  saveOpportunity(email,result.used);
  opportunityCheck={email,used:result.used,limit:result.limit};
  return opportunityCheck;
 }catch{
  if(serial===opportunitySerial)opportunityCheck=null;
  return null;
 }
}
async function beforeStart(){
 clearTimeout(opportunityTimer);
 $('attempt-status').textContent='';
 const checked=await checkOpportunities();
 if(!checked){
  $('attempt-status').textContent='No se pudieron comprobar los intentos. Vuelve a pulsar Intro o el botón de inicio.';
  return false;
 }
 if(checked.used>=checked.limit){$('attempt-status').textContent=exhaustedMessage;return false;}
 return true;
}
function scheduleOpportunityCheck(){
 clearTimeout(opportunityTimer);++opportunitySerial;opportunityCheck=null;
 $('attempt-status').textContent='';$('guard-action-status').textContent='';
 opportunityTimer=setTimeout(checkOpportunities,500);guard?.render();
}

let attempt=null,initialEnvelopePromise=null,registrationPromise=null,panelEntered=false,deliveryComplete=false,panelSending=false;
const randomHex=bytes=>Array.from(crypto.getRandomValues(new Uint8Array(bytes)),b=>b.toString(16).padStart(2,'0')).join('');
function onAttemptStart(){
 const cached=cachedOpportunity();
 attempt={id:randomHex(16),token:randomHex(32),number:cached.used+1,limit:cached.limit,registered:false};
 initialEnvelopePromise=null;registrationPromise=null;panelEntered=false;deliveryComplete=false;lastDelivery=null;
 ++opportunitySerial;clearTimeout(opportunityTimer);
 if(fileMode){attempt.registered=true;saveOpportunity($('student').value.trim().toLowerCase(),attempt.number);return;}
 // La petición conserva la identidad y el sello iniciales aunque el alumno siga editando.
 const owner=attempt;
 initialEnvelopePromise=makeReport({},false,Date.now(),{finishReason:'start'})
  .then(code=>deliveryEnvelope({code,attemptToken:owner.token}));
 if(browserDrafts)return ensureRegistration();
 void ensureRegistration().catch(()=>{/* Se reintenta con el mismo ID antes de enviar. */});
}
async function ensureRegistration(){
 if(fileMode||attempt?.registered)return;
 if(!attempt)throw Error('NOT_STARTED');
 if(registrationPromise)return registrationPromise;
 const owner=attempt;
 if(!initialEnvelopePromise)initialEnvelopePromise=makeReport({},false,Date.now(),{finishReason:'start'}).then(code=>deliveryEnvelope({code,attemptToken:owner.token}));
 const source=initialEnvelopePromise;
 const job=(async()=>{
  const envelope=await source.catch(error=>{if(initialEnvelopePromise===source)initialEnvelopePromise=null;throw error;});
  const result=await window.LabDelivery.start(config.delivery,envelope);
   if(browserDrafts&&result.status==='submitted')throw Error('ALREADY_SUBMITTED');
  owner.number=result.number;owner.limit=result.limit;owner.registered=true;
  saveOpportunity(JSON.parse(envelope.payload).email.toLowerCase(),result.number);
 })();
 registrationPromise=job;
 try{await job;}finally{if(registrationPromise===job)registrationPromise=null;}
}
function requiresReason(){return browserDrafts?false:attempt?attempt.number>attempt.limit:cachedOpportunity().used>=cachedOpportunity().limit;}
function showReason(){
 revisionNeeded=requiresReason();
 $('revision-delivery').hidden=!revisionNeeded;
 if(revisionNeeded)refreshDeliveryReason();
}

const reasonValid=text=>(text.match(/\p{L}/gu)||[]).length>=20;
function refreshReason(){
 revisionReason=$('revision-reason').value.trim();
 const invalid=revisionNeeded&&!reasonValid(revisionReason);
 $('revision-error').textContent=invalid?'Debes indicar el motivo de la entrega':'';
 $('guard-confirm-ok').disabled=invalid;
 return !invalid;
}
function validateFinish(){return refreshReason();}
// El receptor y la hoja del profesor esperan un nombre: se usa la parte local del correo.
function displayName(){return $('student').value.trim().toLowerCase().split('@')[0].slice(0,160);}

// ---------------------------------------------------------------- Reloj
function timeSpent(at=Date.now()){return elapsed+(started===null?0:Math.max(0,at-started));}
function clock(){
 const remaining=Math.max(0,durationMs-timeSpent()),sec=Math.ceil(remaining/1000);
 $('clock').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');
 const urgent=phase==='active'&&remaining<=60000;
 $('clock').classList.toggle('time-urgent',urgent);
 $('duration-warning').hidden=!urgent;
 const notice=uiLanguage==='en'?(remaining>0?'Less than one minute remains. Your exam will be submitted automatically when time runs out.':'Time is up. Preparing automatic submission…'):(remaining>0?'Queda menos de un minuto. La práctica se entregará automáticamente al terminar.':'Tiempo agotado. Generando la entrega automática…');
 if($('duration-warning').textContent!==notice)$('duration-warning').textContent=notice;
}
function startClock(){if(started===null)started=Date.now();clock();}
function stopClock(at=Date.now()){elapsed=timeSpent(at);started=null;clock();}
function applyTimePenalty(ms){elapsed+=ms;clock();}

// ---------------------------------------------------------------- Editor
const editorTabs=[...document.querySelectorAll('[data-editor]')];
let currentEditor='html';
// Una columna visual compartida: nunca forma parte del código guardado o entregado.
const lineGutter=document.createElement('div');
lineGutter.className='editor-line-numbers';
lineGutter.setAttribute('aria-hidden','true');
const lineList=document.createElement('div');
lineGutter.append(lineList);
$('answer-fields').insertBefore(lineGutter,$('html'));
let lastLineCount=0;
function syncLineScroll(){
 const editor=$(currentEditor);
 lineList.style.transform='translateY('+(-editor.scrollTop)+'px)';
}
function syncLineNumbers(){
 lineGutter.hidden=currentEditor==='txt';
 if(lineGutter.hidden)return;
 const count=$(currentEditor).value.split('\n').length;
 if(count!==lastLineCount){
  lineList.textContent=Array.from({length:count},(_,i)=>i+1).join('\n');
  lastLineCount=count;
 }
 syncLineScroll();
 requestAnimationFrame(syncLineScroll);
}
for(const id of ['html','css','js']){
 $(id).addEventListener('scroll',()=>{if(id===currentEditor)syncLineScroll();});
 $(id).addEventListener('input',()=>{if(id===currentEditor)syncLineNumbers();});
}

// Restaurar el código de partida de la pestaña visible. Pide una segunda pulsación:
// Un confirm() nativo sacaría de la pantalla completa.
let restoreArmed=null,restoreTimer=null;
function syncRestore(){
 const button=$('editor-restore'),same=$(currentEditor).value===start[currentEditor];
 if(restoreArmed&&(restoreArmed!==currentEditor||same)){restoreArmed=null;clearTimeout(restoreTimer);}
 button.disabled=same;
 button.classList.toggle('armado',!!restoreArmed);
 button.title=tr(restoreArmed?'restoreConfirm':'restore');
 button.setAttribute('aria-label',(restoreArmed?'Confirmar: restaurar':'Restaurar')+' el código de partida de '+NAMES[currentEditor]);
}
function countChars(){const el=$(currentEditor);$('editor-count').textContent=NAMES[currentEditor]+' · '+el.value.length+' / '+el.maxLength+tr('chars');syncRestore();syncLineNumbers();}
function showEditor(lang,focus=false){
 currentEditor=lang;
 for(const tab of editorTabs)tab.setAttribute('aria-selected',String(tab.dataset.editor===lang));
 for(const id of LANGS)$(id).hidden=id!==lang;
 countChars();
 if(focus&&!$('answer-fields').disabled)$(lang).focus();
}
for(const tab of editorTabs)tab.addEventListener('click',()=>showEditor(tab.dataset.editor,true));
let reportRevision=0;
function invalidate(){reportRevision++;if($('report').value){$('report').value='';$('download').disabled=true;$('reportStatus').textContent=tr('changed');}}
function edited(id){
 if(!guard.canEdit())return;
 if(sectionView&&!sectionView.acceptCode())return;
 invalidate();guard.saveEdit();countChars();
 if(id==='txt')return; // Las notas no cambian el resultado.
 if(id==='js')previewStatus();else schedulePreview();
}
function insertText(el,text){clipboard?.insert(el,text);}
$('editor-undo').addEventListener('mousedown',e=>e.preventDefault());
$('editor-undo').addEventListener('click',()=>{if(guard.canEdit())clipboard?.undo($(currentEditor));});
$('editor-restore').addEventListener('click',async()=>{
 if(!guard.canEdit())return;
 const id=currentEditor;
 if(restoreArmed!==id){
  restoreArmed=id;clearTimeout(restoreTimer);
  restoreTimer=setTimeout(()=>{restoreArmed=null;syncRestore();},4000);
  syncRestore();return;
 }
 restoreArmed=null;clearTimeout(restoreTimer);syncRestore();
 const message=uiLanguage==='en'?'Restore the starter code for '+NAMES[id]+'? Your current code in this tab will be replaced.':'¿Restaurar el código de partida de '+NAMES[id]+'? Se sustituirá el contenido actual de esta pestaña.';
 if(!await confirmActionModal(message)||!guard.canEdit()||currentEditor!==id)return;
 clipboard?.insert($(id),start[id],0,$(id).value.length);$(id).scrollTop=0;
 if(sectionView&&!sectionView.acceptCode())return;
 invalidate();guard.saveEdit();countChars();
 // El JavaScript de partida es del profesor: se ejecuta sin esperar a «Ejecutar».
 if(id==='js')ranJs=start.js;
 if(id!=='txt')autoPreview();
 $(id).focus();
});
for(const id of LANGS){
 $(id).addEventListener('input',()=>edited(id));
 // Tabulador y sangría automática: escribir código sin poder pegar debe ser cómodo.
 $(id).addEventListener('keydown',e=>{
  if(e.isComposing||e.ctrlKey||e.altKey||e.metaKey||!guard?.canEdit())return;
  const el=e.currentTarget;
  if(e.key==='Tab'&&!e.shiftKey){e.preventDefault();insertText(el,'  ');}
  else if(e.key==='Enter'&&!e.shiftKey){
   const before=el.value.slice(0,el.selectionStart);
   const indent=/^[ \t]*/.exec(before.slice(before.lastIndexOf('\n')+1))[0];
   e.preventDefault();insertText(el,'\n'+indent);
  }
 });
}

// ---------------------------------------------------------------- Resultado (vista previa aislada)
// El iframe no comparte origen con la página (sandbox sin allow-same-origin): el código del
// alumno no puede leer las respuestas, el guardado ni la entrega. La política de contenido
// impide peticiones de red, marcos anidados y envío de formularios.
const frame=$('preview');
const CSP=config.preview?.csp||"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: https:; media-src data: https:; font-src data: https:; form-action 'none'; base-uri 'none'";
const attr=text=>text.replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;');
// Se ejecuta DENTRO de la vista previa, antes que el código del alumno.
function bridge(token,jsLine,allowInspection,allowShortcuts=true){
 var editingShortcut=function editingShortcut(event){
 const key=String(event.key||'').toLowerCase();
 if(['copy','cut','paste','selectstart'].includes(event.type))return true;
 if(!event.type.startsWith('key')||event.altKey)return false;
 return ['control','meta','shift'].includes(key)||
  ((event.ctrlKey||event.metaKey)&&['a','c','v','x','z','y','arrowleft','arrowright','arrowup','arrowdown','home','end','insert'].includes(key))||
  (event.shiftKey&&['arrowleft','arrowright','arrowup','arrowdown','home','end','pageup','pagedown','insert','delete'].includes(key));
};
 var parent=window.parent,sent=0;
 // El documento del iframe también necesita un destino real para el teclado.
 function prepareKeyboardTarget(){
  if(!document.body)return;
  document.body.setAttribute('tabindex','-1');
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',prepareKeyboardTarget,{once:true});
 else prepareKeyboardTarget();
 window.addEventListener('message',function(event){
  if(event.source!==parent||event.data?.labFocus!==token)return;
  prepareKeyboardTarget();
  document.body?.focus({preventScroll:true});
 });
 function format(value){
  if(typeof value==='string')return value;
  if(value instanceof Error)return value.name+': '+value.message;
  try{var json=JSON.stringify(value);return json===undefined?String(value):json;}catch(error){return String(value);}
 }
 function send(kind,values){
  if(sent>300)return;
  var text=sent++===300?'… demasiados mensajes: se omite el resto.':Array.prototype.map.call(values,format).join(' ').slice(0,2000);
  try{parent.postMessage({labPreview:token,kind:kind,text:text},'*');}catch(error){}
 }
 ['log','info','warn','error','debug'].forEach(function(kind){
  var original=console[kind];
  console[kind]=function(){send(kind,arguments);try{original.apply(console,arguments);}catch(error){}};
 });
 window.addEventListener('error',function(event){
  var line=event.lineno>=jsLine?' (JavaScript, línea '+(event.lineno-jsLine+1)+')':'';
  send('error',[(event.message||'Error')+line]);
 });
 window.addEventListener('unhandledrejection',function(event){send('error',['Promesa rechazada: '+format(event.reason)]);});
 // Los diálogos nativos sacarían de la pantalla completa: se muestran en la consola.
 window.alert=function(message){send('alert',['alert: '+format(message===undefined?'':message)]);};
 window.confirm=function(message){send('alert',['confirm: '+format(message===undefined?'':message)+' → false (no disponible en la vista previa)']);return false;};
 window.prompt=function(message){send('alert',['prompt: '+format(message===undefined?'':message)+' → null (no disponible en la vista previa)']);return null;};
 const editable=el=>el&&(el.tagName==='TEXTAREA'||(el.tagName==='INPUT'&&['text','search','url','tel','password','email'].includes(el.type)))&&!el.disabled&&!el.readOnly;
 function canUndo(el){if(!editable(el))return false;el.focus();return document.queryCommandEnabled('undo');}
 function undoEdit(el){el.focus();document.execCommand('undo');}
 var clipboardTarget=null;
 document.addEventListener('contextmenu',function(event){
  event.preventDefault();event.stopImmediatePropagation();clipboardTarget=event.target;
  var el=clipboardTarget,editable=(el.tagName==='TEXTAREA'||(el.tagName==='INPUT'&&['text','search','url','tel','password','email'].indexOf(el.type)>=0))&&!el.disabled&&!el.readOnly;
  var text=typeof el.selectionStart==='number'?el.value.slice(el.selectionStart,el.selectionEnd):String(window.getSelection()||'');
  parent.postMessage({labClipboard:token,action:'menu',text:text.slice(0,10000),editable:editable,canUndo:canUndo(el),x:event.clientX,y:event.clientY},'*');
 },true);
 window.addEventListener('message',function(event){
  if(event.source!==parent||event.data?.labClipboard!==token||!['paste','cut','undo'].includes(event.data.action))return;
  var el=clipboardTarget;if(!el||!el.isConnected||el.disabled||el.readOnly)return;
  if(!editable(el))return;
  if(event.data.action==='undo'){undoEdit(el);return;}
  if(event.data.action==='paste'&&typeof event.data.text!=='string')return;
  var text=event.data.action==='cut'?'':event.data.text.slice(0,10000);
  if(typeof el.selectionStart==='number'){
   var room=el.maxLength>=0?Math.max(0,el.maxLength-(el.value.length-(el.selectionEnd-el.selectionStart))):text.length;
   el.focus();document.execCommand('insertText',false,text.slice(0,room));
  }else if(el.tagName==='INPUT')el.value=text.slice(0,el.maxLength>=0?el.maxLength:text.length);else return;
 });
 function stop(event){
  var key=String(event.key||'').toLowerCase();
  if((allowShortcuts&&editingShortcut(event))||(allowInspection&&event.type==='contextmenu'))return;
  event.preventDefault();event.stopImmediatePropagation();
 }
 ['contextmenu','copy','cut','paste','dragstart','drop'].forEach(function(type){document.addEventListener(type,stop,true);});
 // El teclado del resultado pertenece al ejercicio: no se cancela ni se detiene.
 // El control de pantalla completa permanece en el documento principal.
 document.addEventListener('click',function(event){
  var link=event.target&&event.target.closest&&event.target.closest('a[href],area[href]');
  var href=link&&(link.getAttribute('href')||'');
  if(link&&href.charAt(0)!=='#'&&href.toLowerCase().indexOf('javascript:')!==0){
   event.preventDefault();send('info',['Enlace desactivado en la vista previa: '+href]);
  }
 },true);
 // Responde a la comprobación de la página: demuestra que este documento sigue en el marco.
 window.addEventListener('message',function(event){
  if(event.source===parent&&event.data&&typeof event.data.labPing==='number')
   try{parent.postMessage({labPreview:token,kind:'pong',text:String(event.data.labPing)},'*');}catch(error){}
 });
}
const lines=text=>text.split('\n').length-1;
function previewDocument(html,css,js,token){
 const head='<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="'+attr(CSP)+'"><script>('+bridge+')('+JSON.stringify(token)+',';
 const body=','+JSON.stringify(TEMP_ALLOW_INSPECTION)+','+JSON.stringify(allowEditingShortcuts)+')<\/script><style>'+css.replace(/<\/style/gi,'<\\/style')+'</style>'+html+'<script>';
 return head+(lines(head)+lines(body)+1)+body+js.replace(/<\/script/gi,'<\\/script')+'<\/script>';
}
let previewToken='',pingId=0,pongId=0,noticeLoads=0,previewTimer=null,ranJs=null,shown={html:null,css:null,js:null},previewFocusOwner=null;
const value=id=>$(id).value;
// El HTML del alumno con <script> propio se trata como JavaScript: solo se ejecuta al pulsar Ejecutar.
const ownScript=html=>/<script/i.test(html)&&html!==start.html;
function clearConsole(){$('preview-console').replaceChildren();$('console-count').textContent='';}
function consoleLine(kind,text){
 const list=$('preview-console'),item=document.createElement('li');
 item.className='consola-'+(['warn','error','alert'].includes(kind)?kind:'log');
 item.textContent=text;list.append(item);
 while(list.children.length>200)list.firstElementChild.remove();
 const errors=list.querySelectorAll('.consola-error').length;
 $('console-count').textContent=errors?'· '+errors+(errors===1?' error':' errores'):'';
 list.scrollTop=list.scrollHeight;
}
function previewStatus(){
 const pending=value('js')!==(ranJs??'')||shown.html!==value('html')||shown.css!==value('css');
 $('preview-status').textContent=pending?tr('pendingRun'):'';
 $('preview-run').classList.toggle('pendiente',pending);
}
function renderPreview(html,css,js,focusResult=false){
 previewFocusOwner=focusResult?document.activeElement:null;
 clearTimeout(previewTimer);previewTimer=null;clearConsole();
 previewToken=Array.from(crypto.getRandomValues(new Uint8Array(12)),x=>x.toString(16).padStart(2,'0')).join('');
 noticeLoads=0;
 const source=previewDocument(html,css,js,previewToken);
 frame.srcdoc=window.Lab.transformPreview?window.Lab.transformPreview(source):source;
 shown={html,css,js};previewStatus();
}
function previewNotice(text){
 clearTimeout(previewTimer);previewTimer=null;clearConsole();
 previewToken='';previewFocusOwner=null;noticeLoads=1;
 frame.srcdoc='<!doctype html><meta charset="utf-8"><body style="font:15px/1.6 system-ui,sans-serif;color:#56657b;padding:24px;margin:0">'+attr(text)+'</body>';
 shown={html:null,css:null,js:null};previewStatus();
}
// Actualización automática: HTML y CSS al escribir, con el último JavaScript ejecutado.
function autoPreview(){
 if(ownScript(value('html'))){previewStatus();return;}
 renderPreview(value('html'),value('css'),ranJs??'');
}
function schedulePreview(){clearTimeout(previewTimer);previewTimer=setTimeout(autoPreview,350);previewStatus();}
function runPreview(){ranJs=value('js');renderPreview(value('html'),value('css'),ranJs,true);}
// Al cargar o recuperar un intento solo se ejecuta sin pedirlo el JavaScript del ejercicio.
// Un marco cargado mientras el taller está oculto puede quedarse en blanco al mostrarlo:
// en ese caso se deja pendiente y se genera cuando el taller pasa a ser visible.
let previewDeferred=false;
function resetPreview(){
 if(sectionView&&!sectionView.isWeb()){previewDeferred=false;clearTimeout(previewTimer);frame.srcdoc='';return;}
 ranJs=value('js')===start.js?value('js'):null;
 if($('cuaderno').hidden){
  previewDeferred=true;clearTimeout(previewTimer);previewTimer=null;
  shown={html:null,css:null,js:null};previewStatus();
  return;
 }
 previewDeferred=false;
 if(ownScript(value('html')))previewNotice(tr('pendingRun'));
 else renderPreview(value('html'),value('css'),ranJs??'',true);
}
// Actualizar: vuelve a cargar el resultado tal como se mostró por última vez (reinicia su estado).
// No ejecuta JavaScript nuevo, ni toca el editor, el guardado, el reloj o las incidencias.
function refreshPreview(){
 if(shown.html!==null)renderPreview(shown.html,shown.css,shown.js,true);
 else if(!ownScript(value('html')))renderPreview(value('html'),value('css'),ranJs??'',true);
}
$('preview-run').addEventListener('click',runPreview);
$('preview-refresh').addEventListener('click',refreshPreview);
window.addEventListener('message',event=>{
 const m=event.data;
 if(!previewToken||event.source!==frame.contentWindow||!m||m.labPreview!==previewToken||typeof m.kind!=='string'||typeof m.text!=='string')return;
 if(m.kind==='pong'){pongId=Math.max(pongId,Number(m.text)||0);return;}
 consoleLine(m.kind,m.text.slice(0,2000));
});
// Tras cada carga del marco se pregunta al documento si sigue siendo el generado aquí.
// Si no responde, el alumno ha navegado dentro del marco y se sustituye por un aviso.
function verifyFrame(tries){
 const token=previewToken,id=++pingId;
 try{frame.contentWindow.postMessage({labPing:id},'*');}catch{}
 setTimeout(()=>{
  if(token!==previewToken||pongId>=id)return;
  if(tries>1)verifyFrame(tries-1);else previewNotice(tr('navigation'));
 },500);
}
frame.addEventListener('load',()=>{
 const owner=previewFocusOwner;previewFocusOwner=null;
 // Una recarga automática no roba el foco mientras se escribe en el editor.
 if(owner&&previewToken&&guard?.canEdit()&&!$('cuaderno').hidden&&
    !document.querySelector('dialog[open]:not([data-inline-preview])')&&
    [owner,frame,document.body].includes(document.activeElement)){
  frame.focus({preventScroll:true});
  frame.contentWindow.postMessage({labFocus:previewToken},'*');
 }
 if(noticeLoads>0){noticeLoads--;return;}
 verifyFrame(2);
});

// ---------------------------------------------------------------- Estado del intento
async function encodeReport(text){
 const stream=new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
 const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
 let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 return config.format.report+btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
function empty(){return {...(sectionMode?{sections:window.LabSections.initial(sections)}:{}),values:{...code,txt:'',student:''},elapsed:0,started:null,durationMs:config.durationMs,report:'',language,reportEncoding:'gzip-base64url'};}
function sanitize(data){
 if(!data||typeof data!=='object'||!data.values||typeof data.values!=='object'||Array.isArray(data.values))throw new Error('Borrador inválido');
 const out=empty();
 for(const id of ids){
  const v=data.values[id];
  if(v!==undefined&&typeof v!=='string')throw new Error('Campo inválido: '+id);
  out.values[id]=(v||'').slice(0,$(id).maxLength);
 }
 out.durationMs=Number.isFinite(data.durationMs)&&data.durationMs>0?Math.min(data.durationMs,config.durationMs):config.durationMs;
 out.elapsed=Number.isFinite(data.elapsed)&&data.elapsed>=0?Math.min(data.elapsed,31536000000):0;
 out.started=Number.isFinite(data.started)&&data.started>0&&data.started<=Date.now()?data.started:null;
 const report=typeof data.report==='string'?data.report:'';
 if(report.length>2000000)throw new Error('Informe demasiado largo');
 if(report&&data.reportEncoding!=='gzip-base64url')throw new Error('Formato de informe no válido');
 if(data.language!=null&&!['es','en'].includes(data.language))throw Error('Invalid language');
 if(data.attempt){
  const a=data.attempt;
  if(!/^[a-f0-9]{32}$/.test(a.id||'')||!/^[a-f0-9]{64}$/.test(a.token||'')||!Number.isSafeInteger(a.number)||a.number<1)throw Error('Invalid attempt');
  out.attempt={id:a.id,token:a.token,number:a.number,limit:config.maxSubmissions,registered:false};
 }
 if(sectionMode)out.sections=window.LabSections.sanitize(sections,data.sections);
 out.report=report;
 return out;
}
function snapshot(){
 return {...(sectionView?{sections:sectionView.snapshot()}:{}),attempt,values:Object.fromEntries(ids.map(id=>[id,$(id).value])),elapsed,started,durationMs,language,report:$('report').value,reportEncoding:'gzip-base64url'};
}
function restore(data){
 attempt=data.attempt||null;initialEnvelopePromise=null;registrationPromise=null;
 emailTouched=false;
 for(const id of ids)$(id).value=data.values[id]||'';
 if(sectionView)sectionView.restore(data.sections);
 fillCachedIdentity();
 durationMs=data.durationMs??config.durationMs;
 elapsed=data.elapsed;started=data.started??null;
 $('report').value=data.report||'';$('download').disabled=true;$('reportStatus').textContent='';
 reportRevision++;clock();countChars();resetPreview();
}
function setEnabled(enabled){$('answer-fields').disabled=!enabled;sectionView?.enabled(enabled);}
function setReport(report){$('report').value=report;}

// ---------------------------------------------------------------- Vista según el estado
const syncToolbarHeight=()=>document.documentElement.style.setProperty('--toolbar-height',Math.ceil($('practice-toolbar').getBoundingClientRect().height)+'px');
function syncToolbar(){
 $('practice-toolbar').hidden=document.fullscreenElement!==document.documentElement||!['active','paused'].includes(phase);
 syncToolbarHeight();
}
function syncFinishAction(){
 $('practice-finish').textContent=sectionView?.hasNext()?(uiLanguage==='en'?'Next':'Siguiente'):tr('toolbarFinish');
}
function afterRender(state,ctx){
 for(const id of ['attempt-status','guard-action-status']){
  const notice=$(id),isError=notice.textContent===exhaustedMessage;
  notice.classList.toggle('login-error',isError);
  notice.setAttribute('role',isError?'alert':'status');
  notice.setAttribute('aria-live',isError?'assertive':'polite');
 }
 const previousPhase=phase;
 phase=state.phase;if(['active','paused'].includes(previousPhase)&&!['active','paused'].includes(phase))void clipboard?.clear();if(!['active','paused'].includes(phase))toolbox?.close();if(previousPhase!==phase&&(phase==='closing'||phase==='submitted'))closeActionModal(false);
 if(phase==='closing'||phase==='submitted')panelEntered=true;clock();syncToolbar();
 $('practice-reset').hidden=!config.allowRestart;
 $('practice-save').hidden=!config.allowSaveRecovery;
 const paused=phase==='paused',needsRecovery=paused||ctx.restoring;
 const active=phase==='active',submitted=phase==='submitted'||phase==='closing';
 const loading=ctx.busy&&!submitted&&!ctx.problem;
 $('environment-loading').hidden=!loading;
 if(loading)$('practice-toolbar').hidden=true;
 const panelHidden=loading||submitted||(active&&!ctx.restoring&&!ctx.problem&&!$('guard-action-status').textContent);
 $('guard-panel').hidden=panelHidden;
 $('setup-stage').hidden=panelHidden||recoveryMode;
 $('lab-title').hidden=active;
 document.querySelector('.setup-only').hidden=(active&&!ctx.restoring)||phase==='reset';
 $('guard-start-box').hidden=active&&!ctx.restoring;
 $('active-status').hidden=true;
 $('event-details').hidden=false;
 $('cuaderno').hidden=loading||!active||needsRecovery;$('cuaderno').inert=loading||!active||needsRecovery;
 if(previewDeferred&&!$('cuaderno').hidden)resetPreview();
 $('delivery-stage').hidden=!submitted&&!recoveryMode;
 $('delivery-back').hidden=true;
 $('delivery-abandon').hidden=!panelEntered||deliveryComplete||!!lastDelivery?.receipt;
 $('delivery-abandon').disabled=delivering||panelSending||!!ctx.forcedBusy;
 if(phase==='closing'){
  if(ctx.forcedBusy)setDeliveryState('sending');
  if(!$('delivery-status').textContent)$('delivery-status').textContent=tr('forcedPending');
  $('delivery-retry').textContent=tr('forcedRetry');
  $('delivery-retry').disabled=!!ctx.forcedBusy;
 }else if(phase==='submitted'){$('delivery-retry').textContent=fileMode?tr('copyOpen'):'Reintentar entrega';$('delivery-retry').disabled=delivering||panelSending||(!fileMode&&deliveryComplete);}
 $('receipt-download').disabled=phase==='closing';$('receipt-download').hidden=fileMode;$('recovery-download').hidden=fileMode;
 if(phase==='submitted'&&lastDelivery?.code===$('report').value&&lastDelivery.receipt)showDeliveryReceipt(lastDelivery);
 $('download').hidden=true;
 $('student').disabled=ctx.busy;
 renderStartIcon();
 $('delivery-config-note').hidden=deliveryReady();
 $('delivery-config-note').textContent=tr('notConfigured');

 $('guard-state').textContent=tr(active?($('answer-fields').disabled?'blocked':'active'):phase);
 $('guard-count').textContent=(uiLanguage==='en'?'Incidents: ':'Incidencias: ')+state.count;
 $('guard-conditions').textContent='Pantalla completa: '+(document.fullscreenElement?'✓':'—')+' · Foco: '+(document.hasFocus()?'✓':'—')+' · Visible: '+(document.visibilityState==='visible'?'✓':'—');
 $('saveStatus').textContent=ctx.problem?tr('saveError'):state.savedAt?tr('saved')+new Date(state.savedAt).toLocaleTimeString('es-ES'):tr('saveReady');
 $('identity-error').textContent=emailTouched&&$('student').value.trim()&&!validIdentity()?tr('identityError'):'';
 if(state.pending && !ctx.returnSeconds){
  const k=state.pending;
  $('guard-warning-title').textContent=tr(k==='reset'?'resetTitle':k);
  $('guard-warning-text').textContent=tr(k+'Text');
  $('guard-warning-count').textContent=$('guard-count').textContent;
  $('guard-continue').textContent=tr(ctx.restoring?'resumeAction':active?'continue':'understood');
 }
 if(ctx.returnSeconds && state.pending&&state.pending!=='penalty'){
  $('guard-warning-title').textContent=uiLanguage==='en'?'Return to full screen':'Vuelve a pantalla completa';
  $('guard-warning-text').textContent=uiLanguage==='en'?'Click Continue in full screen before the countdown ends. This allowance is shared across the whole exam. If it runs out, your work will be submitted automatically.':'Pulsa Continuar en pantalla completa antes de que termine el tiempo. El tiempo disponible es acumulado para toda la práctica. Si se agota, se entregará automáticamente tu código.';
  $('guard-warning-count').textContent=ctx.remainingSeconds===null?'':(uiLanguage==='en'?'Automatic submission in ':'Entrega automática en ')+ctx.remainingSeconds+' s';
  $('guard-continue').textContent=uiLanguage==='en'?'Continue in full screen':'Continuar en pantalla completa';
  if(ctx.returnPenaltyMinutes){
   $('guard-warning-text').textContent=uiLanguage==='en'?'Return before the countdown ends. Otherwise, you must accept a '+ctx.returnPenaltyMinutes+'-minute time deduction to continue.':'Regresa antes de que termine la cuenta atrás. Si se agota, tendrás que aceptar un descuento de '+ctx.returnPenaltyMinutes+' minutos para continuar.';
   $('guard-warning-count').textContent=(uiLanguage==='en'?'Time deduction in ':'Penalización en ')+ctx.remainingSeconds+' s';
  }
 }
 if(state.pending==='penalty'){
  $('guard-warning-title').textContent=uiLanguage==='en'?'Time deduction':'Descuento de tiempo';
  $('guard-warning-text').textContent=uiLanguage==='en'?'The return allowance has run out. Accepting will deduct '+ctx.returnPenaltyMinutes+' minutes from your remaining time and return you to full screen.':'Se ha agotado el margen de regreso. Al aceptar se descontarán '+ctx.returnPenaltyMinutes+' minutos del tiempo restante y volverás a pantalla completa.';
  $('guard-warning-count').textContent=uiLanguage==='en'?'Next return allowance: '+ctx.nextReturnSeconds+' seconds.':'Margen para la próxima incidencia: '+ctx.nextReturnSeconds+' segundos.';
  $('guard-continue').textContent=uiLanguage==='en'?'Accept':'Aceptar';
  if($('guard-warning-error').textContent)$('guard-warning-error').textContent=uiLanguage==='en'?'Full screen could not be restored. Click Accept again; the time deduction has not been applied yet.':'No se pudo recuperar pantalla completa. Vuelve a pulsar Aceptar; todavía no se ha aplicado el descuento.';
 }
 // Última entrega: accesible desde la pantalla de identificación.
 $('utility-actions').hidden=loading||recoveryMode||phase!=='ready';
 // El login no muestra entregas ya completadas ni sus comprobantes.
 $('recovery').hidden=loading||recoveryMode||phase!=='ready'||!lastDelivery||!!lastDelivery.receipt||fileMode;
 const attempts=cachedOpportunity();
 $('recovery-message').textContent=lastDelivery?.receipt?tr('previousReceived'):lastDelivery?tr('pendingDelivery'):'';
 $('toolbar-attempts').textContent=tr('attempts')+Math.max(0,attempts.limit-attempts.used);
 $('recover-delivery').hidden=!lastDelivery;
 $('recovery-download').hidden=fileMode||!lastDelivery;
 $('recover-delivery').textContent=tr(fileMode?'recover':lastDelivery?.receipt?'viewReceipt':'copyOpen');
 $('practice-save').disabled=(!active&&!paused)||ctx.restoring||!!ctx.problem||ctx.busy||(active&&$('answer-fields').disabled);
 $('practice-finish').disabled=!guard?.canEdit();
 syncFinishAction();
 $('practice-reset').disabled=!!ctx.problem||ctx.busy||panelEntered;
 if(panelEntered){$('practice-save').hidden=true;$('practice-reset').hidden=true;}
 if(!$('revision-delivery').hidden)$('delivery-retry').disabled=true;
 syncDeliveryActions();
 $('toolbar-count').textContent=(uiLanguage==='en'?'Incidents: ':'Incidencias: ')+state.count+(uiLanguage==='en'?' · Allowance: ':' · Margen: ')+ctx.remainingSeconds+' s';
}
function confirmText(kind){
 revisionNeeded=kind==='finish'&&requiresReason();
 $('revision-fields').hidden=!revisionNeeded;
 $('guard-confirm-ok').disabled=false;
 if(kind==='finish')refreshReason();
 if(kind==='save'){$('guard-confirm-title').textContent=tr('savePractice');$('guard-confirm-text').textContent=tr('saveWarning');}
 if(kind==='erase'){$('guard-confirm-title').textContent=tr('toolbarReset');$('guard-confirm-text').textContent=tr('restartWarning');}
 if(kind==='finish'){$('guard-confirm-title').textContent=tr('confirmTitle');$('guard-confirm-text').textContent=tr('confirmBody');}
}

// ---------------------------------------------------------------- Informe y entrega
// Mismo formato de informe (versión 3) que el resto de laboratorios: una respuesta abierta
// por cada pestaña modificada (html, css, js y las notas txt), pendiente de revisión del profesor.
// Las notas de la pestaña TXT se entregan como un comentario /* … */.
function noteComment(text){return text.trim()?'/*\n'+text.replaceAll('*/','* /')+'\n*/':'';}
async function makeReport(metadata,final,finishedAt=Date.now(),context={}){
 const reportAttempt=attempt,reportEmail=$('student').value.trim().toLowerCase();
 if(!validIdentity()){$('reportStatus').textContent=tr('identityError');return null;}
 if(context.finishReason!=='start'&&attempt)await ensureRegistration();
 if(typeof CompressionStream!=='function'){$('reportStatus').textContent=tr('compressionError');return null;}
 // Solo se entregan las pestañas que difieren del código de partida. El receptor exige al
 // menos una respuesta: si no cambió nada, se envía una única respuesta vacía «sin-cambios».
 const changed=sectionView?sections.map(s=>s.id):LANGS.filter(id=>$(id).value!==start[id]);
 const answers=sectionView?sectionView.answers():changed.length?changed.map(id=>({question:id,answer:id==='txt'?noteComment($(id).value):$(id).value,status:$(id).value.trim()?'teacher-review':'pending'})):[{question:'sin-cambios',answer:'',status:'pending'}];
 // Sello del servidor: IP real, hora del servidor y si la entrega cumple red y horario.
 // La red ya se comprobó al entrar: aquí se exige el sello, no repetir el acceso.
 let sello=null;
 if(config.control){
  const email=$('student').value.trim().toLowerCase();
  try{
   const huella=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([config.id,email,answers])))),b=>b.toString(16).padStart(2,'0')).join('');
   const response=await fetch(config.control.servidor+'/sello',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(8000),body:JSON.stringify({a:config.module.toLowerCase()+'/'+config.activity,email,huella,clave:config.control.clave||undefined})});
   const stamp=response.ok?await response.json():null;
   sello=stamp&&stamp.huella===huella&&typeof stamp.firma==='string'?stamp:{error:'sin-sello'};
  }catch{sello={error:'sin-sello'};}
  if(!sello||sello.error||!/^[a-f0-9]{64}$/.test(sello.firma||''))throw Error('NETWORK_UNVERIFIED');
 }
 const data={...(sectionView?{sectionsVersion:1,sectionDefinitions:sections.map(s=>({id:s.id,type:s.type,title:s.title,questions:s.questions}))}:{}),attemptId:reportAttempt?.id,attemptNumber:reportAttempt?.number,exam:config.id,module:config.module,activity:config.activity,activityTitle:config.activityTitle,activityVersion:config.version,version:3,language,name:reportEmail.split('@')[0],email:reportEmail,finishedAt:new Date(finishedAt).toISOString(),seconds:Math.floor(timeSpent(finishedAt)/1000),presentationOrder:changed.length?changed:['sin-cambios'],answers,modified:changed,parameters:{},parameterLocks:{},group:'',checked:{},hints:{},notes:'',revisionReason:revisionReason.trim(),...context,sello,audit:metadata,url:location.origin+location.pathname+'?a='+config.module.toLowerCase()+'/'+config.activity};
 const body=JSON.stringify(data);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body))),b=>b.toString(16).padStart(2,'0')).join('');
 return encodeReport(body+'\nCódigo de comprobación: '+config.format.checksum+hash);
}
function persistDelivery(item){
 lastDelivery=item;
 try{localStorage.setItem(RECOVERY,JSON.stringify(item));}catch{/* El TXT sigue disponible. */}
}
function rememberDelivery(report){
 if(lastDelivery?.code===report&&lastDelivery.practice)return lastDelivery;
 const item={code:report,attemptToken:attempt?.token,practice:guard.exportPractice(),name:displayName(),language};
 persistDelivery(item);
 return item;
}
async function decodePracticeDocument(text){
 text=text.trim();
 if(text.startsWith('{'))return text;
 if(!text.startsWith(config.format.report)||!/^[A-Za-z0-9_-]+$/.test(text.slice(config.format.report.length)))throw Error('Invalid encoded document');
 const encoded=text.slice(config.format.report.length).replaceAll('-','+').replaceAll('_','/');
 const binary=atob(encoded+'='.repeat((4-encoded.length%4)%4));
 const bytes=Uint8Array.from(binary,c=>c.charCodeAt(0));
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
 const chunks=[];let length=0;
 try{
  for(;;){const {value,done}=await reader.read();if(done)break;
   length+=value.length;if(length>3000000){await reader.cancel();throw Error('Document too large');}
   chunks.push(value);
  }
 }finally{reader.releaseLock();}
 const result=new Uint8Array(length);let offset=0;
 for(const chunk of chunks){result.set(chunk,offset);offset+=chunk.length;}
 return new TextDecoder('utf-8',{fatal:true}).decode(result);
}
async function deliveryEnvelope(item){
 const decoded=await decodePracticeDocument(item.code);
 const marker='\nCódigo de comprobación: '+config.format.checksum;
 const offset=decoded.lastIndexOf(marker);
 if(offset<0)throw Error('INVALID');
 const payload=decoded.slice(0,offset),data=JSON.parse(payload);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload))),b=>b.toString(16).padStart(2,'0')).join('');
 if(hash!==decoded.slice(offset+marker.length)||data.exam!==config.id||data.activityVersion!==config.version)throw Error('INVALID');
 return {attemptToken:item.attemptToken||attempt?.token,protocol:1,submissionId:hash,practiceId:config.id,practiceVersion:config.version,payload};
}
function setDeliveryState(state){
 const container=$('delivery-stage'),progress=$('delivery-progress');
 container.dataset.state=state;
 container.setAttribute('aria-busy',String(state==='sending'));
 progress.hidden=state==='idle';
 syncDeliveryActions();
 if(state==='sending'){
  progress.removeAttribute('value');
  progress.setAttribute('aria-label','Enviando la entrega y esperando confirmación de recepción');
 }else{
  progress.value=state==='success'?1:0;
  progress.setAttribute('aria-label',state==='success'?'Entrega completada':state==='error'?'Error en la entrega':'Progreso de entrega');
 }
}
function syncDeliveryActions(){
 const state=$('delivery-stage').dataset.state;
 const reasonVisible=!$('revision-delivery').hidden;
 const sending=state==='sending';
 $('revision-delivery-send').hidden=!reasonVisible||sending;
 $('receipt-download').hidden=fileMode||sending||!lastDelivery?.code;
 $('delivery-abandon').hidden=!panelEntered||deliveryComplete||!!lastDelivery?.receipt||sending;
 $('delivery-retry').hidden=reasonVisible||!(state==='error'||(fileMode&&state==='success'));
 $('delivery-note').hidden=state!=='error'||reasonVisible;
 $('delivery-note').textContent=lastDelivery?.code?'Tu trabajo está guardado. Puedes reintentar o descargar el TXT.':'Tu trabajo está guardado. Pulsa Reintentar entrega.';
}
function showDeliveryReceipt(item){
 deliveryComplete=true;$('delivery-abandon').hidden=true;$('revision-delivery').hidden=true;
 setDeliveryState('success');
 $('delivery-status').textContent=tr('received')+' '+item.receipt.submissionId+' · '+new Date(item.receipt.receivedAt).toLocaleString('es-ES');
 $('delivery-retry').textContent=tr('receivedShort');$('delivery-retry').disabled=true;
}
async function deliver(item){
 if(item.receipt){showDeliveryReceipt(item);return;}
 if(requiresReason()&&!reasonValid(revisionReason)) {showReason();return;}
 if(fileMode){
  deliveryComplete=true;$('delivery-abandon').hidden=true;
  await recordSubmission(item);
  // Sin receptor: la entrega es el archivo descargado.
  setDeliveryState('success');
  $('delivery-status').textContent=tr('fileDelivered');
  $('delivery-retry').textContent=tr('copyOpen');$('delivery-retry').disabled=false;
  return;
 }
 if(delivering)return;
 if(item.receipt){showDeliveryReceipt(item);return;}
 delivering=true;setDeliveryState('sending');$('delivery-retry').disabled=true;$('delivery-status').textContent=tr('sending');
 persistDelivery(item);
 try{
  const envelope=await deliveryEnvelope(item);
  if(JSON.parse(envelope.payload).attemptId===attempt?.id)await ensureRegistration();
  item.receipt=await window.LabDelivery.send(config.delivery,envelope);
  persistDelivery(item);await recordSubmission(item);showDeliveryReceipt(item);
 }catch(error){
  setDeliveryState('error');
  // El código (TIMEOUT, ROUTE, SCHEMA, STORAGE…) indica al profesor qué ha fallado en el receptor.
  const code=/^[A-Z_]{3,20}$/.test(error.message)?error.message:'ERROR';
  if(code==='REVISION_REASON'){
   revisionNeeded=true;
   if(attempt)attempt.limit=Math.min(attempt.limit,attempt.number-1);
   $('revision-delivery').hidden=false;
   $('revision-delivery-reason').value=revisionReason;
   refreshDeliveryReason();
   $('delivery-status').textContent='Debes indicar el motivo de la entrega';
   $('delivery-retry').disabled=true;
   return;
  }
  const policyErrors={
   ENCRYPTION_UNAVAILABLE:'No se pudo cifrar la entrega. Se conserva para reintentar; el receptor no guardará una copia sin cifrar.',
   ENCRYPTED_DOCUMENT_TOO_LARGE:'La entrega cifrada supera el tamaño admitido por la hoja. Conserva el comprobante y avisa al profesor.',
   NETWORK_DENIED:'Entrega no admitida: la IP no pertenece a las redes permitidas para esta actividad.',
   SCHEDULE_DENIED:'Entrega no admitida: se ha realizado fuera del horario permitido para el módulo.',
   CONTROL_REQUIRED:'No se ha obtenido el sello necesario para comprobar las restricciones. Conserva el TXT.',
   CONTROL_INVALID:'El sello de esta entrega no es válido. Conserva el TXT y avisa al profesor.',
   CONTROL_UNAVAILABLE:'No se pudo verificar el sello. Conserva el TXT y reintenta cuando el servidor responda.'
  };
  $('delivery-status').textContent=policyErrors[code]|| (code==='ACTIVITY_CONFIG'?'No se pudo comprobar la configuración de la actividad. Conserva el TXT y reintenta más tarde.':code==='NOT_CONFIGURED'?tr('notConfigured'):tr('deliveryFailed')+' Código para el profesor: '+code+'.');
  $('delivery-retry').textContent=tr('copyOpen');$('delivery-retry').disabled=false;
 }finally{delivering=false;syncDeliveryActions();if(!$('revision-delivery').hidden)refreshDeliveryReason();}
}
function refreshDeliveryReason(){
 const valid=reasonValid($('revision-delivery-reason').value);
 $('revision-delivery-error').textContent=valid?'':'Debes indicar el motivo de la entrega';
 $('revision-delivery-send').disabled=!valid||delivering||panelSending;
 return valid;
}
$('revision-delivery-reason').addEventListener('input',refreshDeliveryReason);
$('revision-delivery-send').addEventListener('click',()=>submitPanel());
const requestedReceipts=new Set();
async function downloadReceipt(item){
 if(!item?.code)return false;
 let url;
 try{
  // Comprobante comprimido: conserva el formato GZIP + Base64URL anterior.
  const documentCode=item.practice&&!fileMode?await encodeReport(item.practice):item.code;
  url=URL.createObjectURL(new Blob([documentCode],{type:'text/plain;charset=utf-8'}));
  const link=document.createElement('a');
  // Entrega por archivo: «nombre de la actividad_usuario.txt», con el usuario del correo sin dominio.
  const clean=text=>String(text||'').replace(/[\\/:*?"<>|\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().replace(/^\.+|\.+$/g,'');
  link.href=url;link.download=fileMode?(clean(config.title).slice(0,120)||config.filePrefix)+'_'+(clean(item.name).slice(0,64)||'alumno')+'.txt'
   :'comprobante-'+config.filePrefix+'-'+item.code.slice(-16).replace(/[^a-zA-Z0-9_-]/g,'')+'.txt';
  document.body.append(link);link.click();link.remove();
  requestedReceipts.add(item.code);
  $('receipt-status').textContent=tr('receiptRequested');
  return true;
 }catch{$('receipt-status').textContent=tr('receiptError');return false;}
 finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),60000);}
}
async function downloadReport(){
 const item=rememberDelivery($('report').value);
 showReason();
 $('delivery-status').textContent=revisionNeeded?'':'Preparando el envío…';
 setDeliveryState('idle');guard.render();
 if(!revisionNeeded)return submitPanel();
}
async function submitPanel(){
 if(delivering||panelSending||!lastDelivery||deliveryComplete)return;
 if(revisionNeeded&&!refreshDeliveryReason())return;
 const item=lastDelivery;panelSending=true;$('delivery-retry').disabled=true;$('revision-delivery-send').disabled=true;
 try{
  const envelope=await deliveryEnvelope(item),data=JSON.parse(envelope.payload);
  revisionReason=revisionNeeded?$('revision-delivery-reason').value.trim():'';
  data.revisionReason=revisionReason;
  const payload=JSON.stringify(data);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload))),b=>b.toString(16).padStart(2,'0')).join('');
  item.code=await encodeReport(payload+'\nCódigo de comprobación: '+config.format.checksum+hash);
  setReport(item.code);
  if(item.practice){const p=JSON.parse(item.practice);p.state.data.report=item.code;item.practice=JSON.stringify(p);}
  await deliver(item);
  if(deliveryComplete&&!requestedReceipts.has(item.code))await downloadReceipt(item);
 }catch(error){setDeliveryState('error');$('delivery-status').textContent='No se pudo enviar la entrega: '+error.message+'. Puedes reintentar.';}
 finally{panelSending=false;guard.render();if(revisionNeeded&&!deliveryComplete)refreshDeliveryReason();}
}
function onReset(){
 attempt=null;initialEnvelopePromise=null;registrationPromise=null;panelEntered=false;deliveryComplete=false;
 $('revision-delivery').hidden=true;
 revisionReason='';$('revision-reason').value='';
 scheduleOpportunityCheck();
 setDeliveryState('idle');
 $('statement').open=true;
 emailTouched=false;recoveryMode=false;$('practice-file-status').hidden=true;
 $('delivery-retry').textContent=tr('copyOpen');$('delivery-status').textContent='';$('receipt-status').textContent='';
 showEditor('html');window.scrollTo(0,0);
}

// ---------------------------------------------------------------- Guardar y recuperar en archivo
function fileStatus(key){$('practice-file-status').hidden=false;$('practice-file-status').textContent=tr(key);}
async function savePracticeDocument(){
 let url;
 try{
  const documentCode=await encodeReport(guard.exportPractice());
  url=URL.createObjectURL(new Blob([documentCode],{type:'text/plain;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='practica-'+config.filePrefix+'-'+Date.now()+'.txt';
  document.body.append(link);link.click();link.remove();
  fileStatus('fileSaved');return true;
 }catch{fileStatus('fileError');return false;}
 finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),60000);}
}
$('practice-save').addEventListener('click',()=>{if(config.allowSaveRecovery)guard.ask('save');});
$('revision-reason').addEventListener('input',refreshReason);
$('practice-finish').addEventListener('click',()=>{
 if(!guard?.canEdit())return;
 if(sectionView?.hasNext())sectionView.next();
 else {void clipboard?.clear({gesture:true});guard.ask('finish');}
});
$('practice-reset').addEventListener('click',()=>{if(config.allowRestart)guard.ask('erase');});

// ---------------------------------------------------------------- Arranque

let modalResolve=null,modalClearsClipboard=false;
function incompleteWarning(){
 const pending=sectionView?window.LabSections.incomplete(sections,sectionView.snapshot()):
  LANGS.slice(0,3).some(id=>$(id).value!==start[id])?[]:[{title:config.title,type:'webcode',count:1}];
 if(!pending.length)return '';
 const english=uiLanguage==='en';
 return (english?'There is unfinished work:\n':'Quedan apartados o preguntas sin completar:\n')+
  pending.map(item=>'• '+item.title+': '+(item.type==='webcode'?(english?'no code changes':'sin cambios en el código'):item.count+(english?' unanswered question(s)':' pregunta(s) sin responder'))).join('\n')+
  (english?'\nYou can cancel to review them or confirm submission anyway.':'\nPuedes cancelar para revisarlos o confirmar la entrega igualmente.');
}
function confirmActionModal(message,warning='',clearClipboard=false){
 message=window.LabI18n?.message(message)||message;
 if(modalResolve)return Promise.resolve(false);
 modalClearsClipboard=clearClipboard;
 const dialog=$('action-confirm');
 $('action-confirm-message').textContent=message;
 $('action-confirm-warning').textContent=warning;
 $('action-confirm-warning').hidden=!warning;
 return new Promise(resolve=>{modalResolve=resolve;dialog.showModal();});
}
function closeActionModal(accepted=false){
 const resolve=modalResolve;modalResolve=null;modalClearsClipboard=false;
 if($('action-confirm').open)$('action-confirm').close();
 if(resolve)resolve(accepted);
}
$('action-confirm-accept').addEventListener('click',()=>{
 if(modalClearsClipboard)void clipboard?.clear({gesture:true});
 closeActionModal(true);
});
$('action-confirm-cancel').addEventListener('click',()=>closeActionModal(false));
$('action-confirm').addEventListener('cancel',event=>{event.preventDefault();closeActionModal(false);});
$('action-confirm').addEventListener('close',()=>{if(modalResolve)closeActionModal(false);});

const clearLocalButton=document.createElement('button');
clearLocalButton.id='clear-local-practice';clearLocalButton.type='button';clearLocalButton.className='secondary';
clearLocalButton.title='Borrar caché';
clearLocalButton.setAttribute('aria-label','Borrar caché');
clearLocalButton.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2.5 8.2M3 4v6h6"/></svg>';
$('utility-actions').prepend(clearLocalButton);
clearLocalButton.addEventListener('click',async()=>{
 if(phase!=='ready'||recoveryMode)return;
 if(!await confirmActionModal('Se borrarán los datos locales y el comprobante guardado de esta práctica, incluida cualquier entrega pendiente. Descarga antes el TXT si quieres conservarlo. No se borrará nada de la hoja del profesor. ¿Continuar?'))return;
 if(phase!=='ready'||recoveryMode)return;
 try{
  for(const key of [config.storage.key,config.storage.key+'-previous',config.storage.legacyKey,RECOVERY,submissionStore,opportunityStore])localStorage.removeItem(key);
  browserDrafts?.clear();
  location.reload();
 }catch{$('recovery-message').textContent='El navegador no permite borrar los datos locales. Revisa sus permisos de almacenamiento.';}
});
const deliveryConfigNote=document.createElement('p');deliveryConfigNote.id='delivery-config-note';deliveryConfigNote.className='note warm';
deliveryConfigNote.textContent=tr('notConfigured');$('guard-start-box').prepend(deliveryConfigNote);
for(const [id,anchor]of [['receipt-download','delivery-retry'],['recovery-download','recover-delivery']]){
 const button=document.createElement('button');button.id=id;button.type='button';button.className='secondary';button.dataset.text='receipt';$(anchor).after(button);
 button.addEventListener('click',()=>downloadReceipt(guard.canDownloadReport()?rememberDelivery($('report').value):lastDelivery));
}
const receiptStatus=document.createElement('p');receiptStatus.id='receipt-status';receiptStatus.setAttribute('role','status');$('delivery-actions').after(receiptStatus);
document.title=config.title;

$('lab-title').textContent=config.title;
applyUILanguage();
$('ui-language').addEventListener('change',()=>{
 const saved=sectionView?.snapshot();
 uiLanguage=$('ui-language').value==='en'?'en':'es';language=uiLanguage;
 if(window.LabI18n?.activity){
  const bundle=window.LabI18n.apply(uiLanguage);
  config.title='DWEC · '+bundle.title;document.title=config.title;$('lab-title').textContent=config.title;
  config.tools.rubric=window.LabTools.rubric(bundle.rubric);
 }
 try{localStorage.setItem('base4-ui-language',uiLanguage);}catch{}
 if(saved)sectionView.restore(saved);
 applyUILanguage();guard?.render();if(guard?.canEdit())guard.saveEdit();
});
$('preview-console').dataset.empty=tr('consoleEmpty');

$('delivery-retry').addEventListener('click',()=>{
 if(phase==='closing'){$('delivery-status').textContent=tr('forcedPending');void guard.finalizeForced();return;}
 if(fileMode){downloadReceipt(guard.canDownloadReport()?rememberDelivery($('report').value):lastDelivery);return;}
 if(guard.canDownloadReport())void submitPanel();
 else if(lastDelivery)deliver(lastDelivery);
});
$('recover-delivery').addEventListener('click',()=>{
 if(!lastDelivery)return;
 recoveryMode=true;guard.render();
 deliver(lastDelivery);
});
function discardPendingDelivery(){
 if(!panelEntered||deliveryComplete||lastDelivery?.receipt)return;
 try{localStorage.removeItem(config.storage.key);localStorage.removeItem(RECOVERY);}catch{}
}
$('delivery-abandon').addEventListener('click',async()=>{
 if(delivering||!await confirmActionModal('Si cierras sin entregar perderás todo el trabajo y no podrás recuperarlo. El intento iniciado seguirá registrado. ¿Abandonar?'))return;
 if(delivering||panelSending||deliveryComplete)return;
 discardPendingDelivery();panelEntered=false;location.reload();
});
window.addEventListener('beforeunload',event=>{
 if(panelEntered&&!deliveryComplete&&!lastDelivery?.receipt){event.preventDefault();event.returnValue='';}
});
window.addEventListener('pagehide',discardPendingDelivery);
window.addEventListener('pageshow',event=>{if(event.persisted&&panelEntered&&!deliveryComplete)location.reload();});
$('student').addEventListener('blur',()=>{emailTouched=!!$('student').value.trim();guard?.render();});
$('student').addEventListener('input',()=>{rememberIdentity();scheduleOpportunityCheck();});
$('student').addEventListener('keydown',e=>{if(e.key==='Enter'&&!$('guard-start').disabled)$('guard-start').click();});
if(typeof ResizeObserver==='function')new ResizeObserver(syncToolbarHeight).observe($('practice-toolbar'));
window.addEventListener('resize',syncToolbarHeight);
$('lab').addEventListener('submit',e=>e.preventDefault());
setInterval(clock,1000);
try{const item=JSON.parse(localStorage.getItem(RECOVERY));if(item&&typeof item.code==='string'&&item.code.length<2000000&&typeof item.name==='string'&&item.language===language)lastDelivery=item;}catch{}
showEditor('html');
// Errores de JavaScript. El controlador común bloquea el laboratorio ante cualquier error de
// la página. Antes de que lo vea se descartan los que no son de este laboratorio: avisos
// benignos del navegador y errores de extensiones (frecuentes en perfiles gestionados por el
// centro). De los demás se guarda el detalle para mostrarlo junto al aviso de bloqueo.
let lastError='';
const fromExtension=text=>/(?:chrome|moz|safari-web)-extension:\/\//.test(text);
window.addEventListener('error',e=>{
 const file=String(e.filename||''),message=String(e.message||'');
 if(/^ResizeObserver loop/.test(message)||fromExtension(file)||fromExtension(String(e.error?.stack||''))||(message==='Script error.'&&!file)){e.stopImmediatePropagation();return;}
 lastError=message+(file?' ('+file.split('/').pop().split('?')[0]+':'+e.lineno+')':'');
},true);
window.addEventListener('unhandledrejection',e=>{
 const reason=e.reason,text=String(reason?.stack||reason?.message||reason);
 if(fromExtension(text)){e.stopImmediatePropagation();return;}
 const where=/([\w.-]+\.js)[^\n]*?:(\d+):\d+/.exec(String(reason?.stack||''));
 lastError=String(reason?.message||reason)+(where?' ('+where[1]+':'+where[2]+')':'');
},true);
clipboard=window.createLabClipboard?.({canEdit:()=>phase==='ready'||!!guard?.canEdit(),language:()=>uiLanguage});
window.addEventListener('message',event=>clipboard?.preview(event,frame,previewToken));
toolbox=window.LabTools?.init(config.tools,{language:()=>uiLanguage,copyText:text=>clipboard.copyText(text)});
if(sectionMode){
 sectionView=window.createSectionView(sections,{
  language:()=>uiLanguage,
  presentationSeed:()=>[$('student').value.trim().toLowerCase(),config.activity,config.version].join('|'),
  clearClipboard:()=>clipboard?.clear({gesture:true}),
  changed:syncFinishAction,
  canEdit:()=>!!guard?.canEdit(),
  readCode:()=>Object.fromEntries(LANGS.map(id=>[id,$(id).value])),
  writeCode:(initial,values)=>{Object.assign(start,initial);for(const id of LANGS)$(id).value=values[id];countChars();resetPreview();},
  stopPreview:()=>{clearTimeout(previewTimer);previewDeferred=false;frame.srcdoc='';},
  save:()=>{invalidate();guard.saveEdit();}
 });
}
guard=window.createPracticeGuard({config,browserDrafts,beforeStart,applyTimePenalty,beforeResume:()=>ensureRegistration(),startError(error){
 $('guard-action-status').textContent=error.message==='ATTEMPTS_EXHAUSTED'?exhaustedMessage:error.message==='ALREADY_SUBMITTED'?'Este intento ya fue entregado.':'No se pudo registrar el intento. Comprueba la conexión y vuelve a iniciar.';
},preservePendingEdits:true,renderStartButton:renderStartIcon,deliveryPanel:true,allowSubmittedRecovery:!browserDrafts,onAttemptStart,confirmDelivery:()=>confirmActionModal('Vas a finalizar la práctica. Al aceptar no podrás volver al editor. ¿Entregar la práctica?',incompleteWarning(),true),timeSpent,timeLimitMs:()=>durationMs,validEmail,savePracticeDocument,refreshPendingParameters:()=>0,empty,sanitize,snapshot,restore,setEnabled,startClock,stopClock,downloadReport,makeReport,setReport,canStart,afterRender,confirmText,onReset,validateFinish,
 async saveBeforeReset(current){
  if(current==='paused')return savePracticeDocument();
  if(current==='submitted')return downloadReceipt(rememberDelivery($('report').value));
  return current==='ready'||current==='reset'||current==='review';
 },
 forcedError(error){
  setDeliveryState('error');
  const code=/^[A-Z_]{3,30}$/.test(error?.message||'')?error.message:'REPORT';
  const detail=code==='RECEIVER_VERSION'?'El receptor publicado está desactualizado. El profesor debe actualizar Code.gs y Bridge.html y publicar una nueva versión de Apps Script.':
    code==='TIMEOUT'?'El receptor no ha respondido a tiempo. Comprueba la implementación de Apps Script y reintenta.':
    code==='SCHEMA'?'Las cabeceras de la hoja no coinciden con las que espera el receptor publicado.':'No se pudo preparar la entrega. El código permanece bloqueado en esta página; puedes reintentar.';
  $('delivery-status').textContent=detail+' Código: '+code+'.';
 },
 isAnswer(el){return el instanceof HTMLElement&&(ids.includes(el.id)||!!sectionView?.isAnswer(el));},
 restoreValue(el,data){if(sectionView?.isAnswer(el))sectionView.restore(data.sections);else el.value=data.values[el.id]||'';}
});
if(['ready','reset','review'].includes(phase))fillCachedIdentity(false);
if(window.Lab.initialEmail&&phase==='ready'){
 $('student').value=window.Lab.initialEmail;window.Lab.initialEmail='';
 $('student').dispatchEvent(new Event('input',{bubbles:true}));
}
// Registrados después de los del controlador: añaden el detalle a su aviso de bloqueo.
const showError=()=>{if(lastError&&!$('guard-boot').hidden&&!$('guard-boot-detail').textContent.includes('Detalle técnico'))$('guard-boot-detail').textContent+=' Detalle técnico: '+lastError.slice(0,300);};
window.addEventListener('error',showError);
window.addEventListener('unhandledrejection',showError);
rememberIdentity();guard.render();
void checkOpportunities();
let recoveredLoginText=null;
window.LabFileDelivery?.init({config,decode:decodePracticeDocument,validEmail,
 recover(text){
  const finalized=JSON.parse(text).state?.phase==='submitted';
  if(recoveredLoginText!==text){
   guard.importPractice(text);
  // Un comprobante finalizado puede pertenecer a una entrega ya recibida.
  // Su ID es inmutable en el receptor; continuar requiere otro intento.
  // onAttemptStart solo renueva la identidad: conserva respuestas y reloj.
   if(finalized)onAttemptStart();
   recoveredLoginText=text;
  }
  panelEntered=false;deliveryComplete=false;lastDelivery=null;recoveryMode=false;
  rememberIdentity();
  return guard.recoverPractice();
 }
});
window.Lab.ready=true;
})();



