(() => {
'use strict';
// Motor del taller de código: editor HTML/CSS/JS a la izquierda y resultado a la derecha.
// Sin selección de idioma ni nombre: la identificación es solo el correo del centro.
// Seguridad y entrega son los módulos comunes de /base/motor/.
const {config,code}=window.Lab;
// Temporal en base4: poner false para restaurar las restricciones de selección y menú contextual.
const TEMP_ALLOW_INSPECTION=true;
if(TEMP_ALLOW_INSPECTION){
 document.documentElement.classList.add('allow-inspection');
 const installGuards=window.installPracticeInputGuards;
 window.installPracticeInputGuards=(doc,blockAction,blockClipboard)=>installGuards(doc,event=>{
  const key=String(event.key||'').toLowerCase();
  if(event.type==='contextmenu'||event.button===2||event.type==='selectstart'||
    (event.type.startsWith('key')&&(key==='control'||((event.ctrlKey||event.metaKey)&&['a','arrowleft','arrowright','arrowup','arrowdown','home','end'].includes(key)))))return;
  blockAction(event);
 },blockClipboard);
}
const $=id=>document.getElementById(id);
// Pestañas del editor. «txt» son notas del alumno: no forman parte del resultado.
const LANGS=['html','css','js','txt'];
const NAMES={html:'HTML',css:'CSS',js:'JavaScript',txt:'TXT'};
const language='es';
const ids=[...LANGS,'student'];
// El código de partida (contenido/codigo.*) se carga en las pestañas del editor al empezar.
const start={...code,txt:''};
// Entrega por defecto: un único archivo TXT descargado. Con "apps-script" se envía además al receptor.
const fileMode=config.delivery.type==='archivo';
const deliveryReady=()=>fileMode||window.LabDelivery.configured(config.delivery);
const RECOVERY=config.storage.recovery;
const IDENTITY_KEY=config.storage.key+'-identity';
let durationMs=config.durationMs;
let emailTouched=false,guard=null,elapsed=0,started=null,phase='ready',delivering=false,lastDelivery=null,recoveryMode=false;

const texts={
 identification:'Identificación',email:'Correo del centro',retrySave:'Reintentar guardado',
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
 savePractice:'Guardar y pausar',recoverPractice:'Recuperar práctica',toolbarFinish:'Entregar',toolbarReset:'Reiniciar',
 saveWarning:'Se descargará un documento y se pausará la práctica. La recuperación quedará registrada. ¿Guardar y pausar?',
 restartWarning:'Se descargará automáticamente una copia antes de borrar el intento y volver al comienzo. ¿Reiniciar?',
 recoveryFullscreenError:'El navegador no ha permitido activar la pantalla completa. Revisa el permiso y vuelve a pulsar Recuperar práctica.',
 fileSaved:'Archivo descargado. Consérvalo: Recuperar práctica lo leerá para continuar otro día.',
 fileError:'No se pudo descargar el documento. La práctica sigue guardada aquí; vuelve a pulsar Guardar.',
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
const tr=k=>texts[k]??k;

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
function validEmail(email){return /^[^\s@]+@[^\s@]+$/.test(email)&&email.split('@')[1].toLowerCase()===config.emailDomain.toLowerCase();}
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
let opportunitySerial=0,opportunityTimer,revisionReason='',revisionNeeded=false;
function cachedOpportunity(){
 const email=$('student').value.trim().toLowerCase(),saved=opportunityCache[email];
 return {used:Number.isSafeInteger(saved?.used)?saved.used:submittedCount(),limit:config.maxSubmissions};
}
function saveOpportunity(email,used){
 opportunityCache[email]={used,at:Date.now()};
 try{localStorage.setItem(opportunityStore,JSON.stringify(opportunityCache));}catch{}
}
function canStart(){return deliveryReady()&&validIdentity();}
async function checkOpportunities(){
 const email=$('student').value.trim().toLowerCase(),serial=++opportunitySerial;
 if(fileMode||!validIdentity()||!deliveryReady())return;
 try{
  const result=await window.LabDelivery.status(config.delivery,{practiceId:config.id,email,activityTitle:config.activityTitle});
  if(serial!==opportunitySerial)return;
  saveOpportunity(email,result.used);
  if(phase==='ready')guard?.render();
 }catch{/* La entrada usa la caché y nunca espera a la red. */}
}
function scheduleOpportunityCheck(){
 clearTimeout(opportunityTimer);++opportunitySerial;
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
  owner.number=result.number;owner.limit=result.limit;owner.registered=true;
  saveOpportunity(JSON.parse(envelope.payload).email.toLowerCase(),result.number);
 })();
 registrationPromise=job;
 try{await job;}finally{if(registrationPromise===job)registrationPromise=null;}
}
function requiresReason(){return attempt?attempt.number>attempt.limit:cachedOpportunity().used>=cachedOpportunity().limit;}
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
 const notice=remaining>0?'Queda menos de un minuto. La práctica se entregará automáticamente al terminar.':'Tiempo agotado. Generando la entrega automática…';
 if($('duration-warning').textContent!==notice)$('duration-warning').textContent=notice;
}
function startClock(){if(started===null)started=Date.now();clock();}
function stopClock(at=Date.now()){elapsed=timeSpent(at);started=null;clock();}

// ---------------------------------------------------------------- Editor
const editorTabs=[...document.querySelectorAll('[data-editor]')];
let currentEditor='html';
// Restaurar el código de partida de la pestaña visible. Pide una segunda pulsación:
// no hay deshacer (Ctrl+Z está bloqueado) y un confirm() nativo sacaría de la pantalla completa.
let restoreArmed=null,restoreTimer=null;
function syncRestore(){
 const button=$('editor-restore'),same=$(currentEditor).value===start[currentEditor];
 if(restoreArmed&&(restoreArmed!==currentEditor||same)){restoreArmed=null;clearTimeout(restoreTimer);}
 button.disabled=same;
 button.classList.toggle('armado',!!restoreArmed);
 button.textContent=tr(restoreArmed?'restoreConfirm':'restore');
 button.setAttribute('aria-label',(restoreArmed?'Confirmar: restaurar':'Restaurar')+' el código de partida de '+NAMES[currentEditor]);
}
function countChars(){const el=$(currentEditor);$('editor-count').textContent=NAMES[currentEditor]+' · '+el.value.length+' / '+el.maxLength+tr('chars');syncRestore();}
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
 invalidate();guard.saveEdit();countChars();
 if(id==='txt')return; // Las notas no cambian el resultado.
 if(id==='js')previewStatus();else schedulePreview();
}
function insertText(el,text){
 const room=el.maxLength-(el.value.length-(el.selectionEnd-el.selectionStart));
 if(text.length>room)return;
 el.setRangeText(text,el.selectionStart,el.selectionEnd,'end');
 edited(el.id);
}
$('editor-restore').addEventListener('click',()=>{
 if(!guard.canEdit())return;
 const id=currentEditor;
 if(restoreArmed!==id){
  restoreArmed=id;clearTimeout(restoreTimer);
  restoreTimer=setTimeout(()=>{restoreArmed=null;syncRestore();},4000);
  syncRestore();return;
 }
 $(id).value=start[id];$(id).scrollTop=0;
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
function bridge(token,jsLine,allowInspection){
 var parent=window.parent,sent=0;
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
 function stop(event){
  var key=String(event.key||'').toLowerCase();
  if(allowInspection&&(event.type==='contextmenu'||(event.type.startsWith('key')&&(key==='control'||((event.ctrlKey||event.metaKey)&&['a','arrowleft','arrowright','arrowup','arrowdown','home','end'].indexOf(key)>=0)))))return;
  event.preventDefault();event.stopImmediatePropagation();
 }
 ['contextmenu','copy','cut','paste','dragstart','drop'].forEach(function(type){document.addEventListener(type,stop,true);});
 ['keydown','keypress','keyup'].forEach(function(type){document.addEventListener(type,function(event){
  var key=String(event.key||'').toLowerCase();
  if(event.ctrlKey||(event.metaKey&&['c','x','v'].indexOf(key)>=0)||/^f([1-9]|1\d|2[0-4])$/.test(key))stop(event);
 },true);});
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
 const body=','+JSON.stringify(TEMP_ALLOW_INSPECTION)+')<\/script><style>'+css.replace(/<\/style/gi,'<\\/style')+'</style>'+html+'<script>';
 return head+(lines(head)+lines(body)+1)+body+js.replace(/<\/script/gi,'<\\/script')+'<\/script>';
}
let previewToken='',pingId=0,pongId=0,noticeLoads=0,previewTimer=null,ranJs=null,shown={html:null,css:null,js:null};
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
function renderPreview(html,css,js){
 clearTimeout(previewTimer);previewTimer=null;clearConsole();
 previewToken=Array.from(crypto.getRandomValues(new Uint8Array(12)),x=>x.toString(16).padStart(2,'0')).join('');
 noticeLoads=0;
 frame.srcdoc=previewDocument(html,css,js,previewToken);
 shown={html,css,js};previewStatus();
}
function previewNotice(text){
 clearTimeout(previewTimer);previewTimer=null;clearConsole();
 previewToken='';noticeLoads=1;
 frame.srcdoc='<!doctype html><meta charset="utf-8"><body style="font:15px/1.6 system-ui,sans-serif;color:#56657b;padding:24px;margin:0">'+attr(text)+'</body>';
 shown={html:null,css:null,js:null};previewStatus();
}
// Actualización automática: HTML y CSS al escribir, con el último JavaScript ejecutado.
function autoPreview(){
 if(ownScript(value('html'))){previewStatus();return;}
 renderPreview(value('html'),value('css'),ranJs??'');
}
function schedulePreview(){clearTimeout(previewTimer);previewTimer=setTimeout(autoPreview,350);previewStatus();}
function runPreview(){ranJs=value('js');renderPreview(value('html'),value('css'),ranJs);}
// Al cargar o recuperar un intento solo se ejecuta sin pedirlo el JavaScript del ejercicio.
// Un marco cargado mientras el taller está oculto puede quedarse en blanco al mostrarlo:
// en ese caso se deja pendiente y se genera cuando el taller pasa a ser visible.
let previewDeferred=false;
function resetPreview(){
 ranJs=value('js')===start.js?value('js'):null;
 if($('cuaderno').hidden){
  previewDeferred=true;clearTimeout(previewTimer);previewTimer=null;
  shown={html:null,css:null,js:null};previewStatus();
  return;
 }
 previewDeferred=false;
 if(ownScript(value('html')))previewNotice(tr('pendingRun'));
 else renderPreview(value('html'),value('css'),ranJs??'');
}
// Actualizar: vuelve a cargar el resultado tal como se mostró por última vez (reinicia su estado).
// No ejecuta JavaScript nuevo, ni toca el editor, el guardado, el reloj o las incidencias.
function refreshPreview(){
 if(shown.html!==null)renderPreview(shown.html,shown.css,shown.js);
 else if(!ownScript(value('html')))renderPreview(value('html'),value('css'),ranJs??'');
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
function empty(){return {values:{...start,student:''},elapsed:0,started:null,durationMs:config.durationMs,report:'',language,reportEncoding:'gzip-base64url'};}
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
 if(data.language!=null&&data.language!==language)throw Error('Invalid language');
 if(data.attempt){
  const a=data.attempt;
  if(!/^[a-f0-9]{32}$/.test(a.id||'')||!/^[a-f0-9]{64}$/.test(a.token||'')||!Number.isSafeInteger(a.number)||a.number<1)throw Error('Invalid attempt');
  out.attempt={id:a.id,token:a.token,number:a.number,limit:config.maxSubmissions,registered:false};
 }
 out.report=report;
 return out;
}
function snapshot(){
 return {attempt,values:Object.fromEntries(ids.map(id=>[id,$(id).value])),elapsed,started,durationMs,language,report:$('report').value,reportEncoding:'gzip-base64url'};
}
function restore(data){
 attempt=data.attempt||null;initialEnvelopePromise=null;registrationPromise=null;
 emailTouched=false;
 for(const id of ids)$(id).value=data.values[id]||'';
 fillCachedIdentity();
 durationMs=data.durationMs??config.durationMs;
 elapsed=data.elapsed;started=data.started??null;
 $('report').value=data.report||'';$('download').disabled=true;$('reportStatus').textContent='';
 reportRevision++;clock();countChars();resetPreview();
}
function setEnabled(enabled){$('answer-fields').disabled=!enabled;}
function setReport(report){$('report').value=report;}

// ---------------------------------------------------------------- Vista según el estado
const syncToolbarHeight=()=>document.documentElement.style.setProperty('--toolbar-height',Math.ceil($('practice-toolbar').getBoundingClientRect().height)+'px');
function syncToolbar(){
 $('practice-toolbar').hidden=document.fullscreenElement!==document.documentElement||!['active','paused'].includes(phase);
 syncToolbarHeight();
}
let recoverySelecting=false,recoveryReading=false;
function afterRender(state,ctx){
 const previousPhase=phase;
 phase=state.phase;if(previousPhase!==phase&&(phase==='closing'||phase==='submitted'))closeActionModal(false);
 if(phase==='closing'||phase==='submitted')panelEntered=true;clock();syncToolbar();
 $('practice-reset').hidden=!config.allowRestart;
 $('practice-save').hidden=!config.allowSaveRecovery;
 $('practice-recover').hidden=!config.allowSaveRecovery;
 const paused=phase==='paused',needsRecovery=paused||ctx.restoring;
 const active=phase==='active',submitted=phase==='submitted'||phase==='closing';
 const panelHidden=submitted||(active&&!ctx.restoring&&!ctx.problem&&!$('guard-action-status').textContent);
 $('guard-panel').hidden=panelHidden;
 $('setup-stage').hidden=panelHidden||recoveryMode;
 $('lab-title').hidden=active;
 document.querySelector('.setup-only').hidden=(active&&!ctx.restoring)||phase==='reset';
 $('guard-start-box').hidden=active&&!ctx.restoring;
 $('active-status').hidden=true;
 $('event-details').hidden=false;
 $('cuaderno').hidden=!active||needsRecovery;$('cuaderno').inert=!active||needsRecovery;
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
 $('student').disabled=false;
 $('guard-start').textContent=tr('start');
 $('delivery-config-note').hidden=deliveryReady();
 $('delivery-config-note').textContent=tr('notConfigured');

 $('practice-recover').disabled=!active||ctx.restoring||!validIdentity()||!!ctx.problem||ctx.busy||!ctx.supported||recoverySelecting||recoveryReading;
 $('guard-state').textContent=tr(active?($('answer-fields').disabled?'blocked':'active'):phase);
 $('guard-count').textContent='Incidencias: '+state.count;
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
 if(ctx.returnSeconds && state.pending){
  $('guard-warning-title').textContent='Vuelve a pantalla completa';
  $('guard-warning-text').textContent='Pulsa Continuar en pantalla completa antes de que termine el tiempo. El tiempo disponible es acumulado para toda la práctica. Si se agota, se entregará automáticamente tu código.';
  $('guard-warning-count').textContent=ctx.remainingSeconds===null?'':'Entrega automática en '+ctx.remainingSeconds+' s';
  $('guard-continue').textContent='Continuar en pantalla completa';
 }
 // Última entrega: accesible desde la pantalla de identificación.
 clearLocalButton.hidden=recoveryMode||phase!=='ready';
 $('recovery').hidden=recoveryMode||phase!=='ready';
 const attempts=cachedOpportunity();
 $('recovery-message').textContent=(lastDelivery?.receipt?tr('previousReceived'):lastDelivery?tr('pendingDelivery'):'')+' Intentos restantes: '+Math.max(0,attempts.limit-attempts.used);
 $('recover-delivery').hidden=!lastDelivery;
 $('recovery-download').hidden=fileMode||!lastDelivery;
 $('recover-delivery').textContent=tr(fileMode?'recover':lastDelivery?.receipt?'viewReceipt':'copyOpen');
 $('practice-save').disabled=(!active&&!paused)||ctx.restoring||!!ctx.problem||ctx.busy||(active&&$('answer-fields').disabled);
 $('practice-finish').disabled=!guard?.canEdit();
 $('practice-reset').disabled=!!ctx.problem||ctx.busy||panelEntered;
 if(panelEntered){$('practice-save').hidden=true;$('practice-recover').hidden=true;$('practice-reset').hidden=true;}
 if(!$('revision-delivery').hidden)$('delivery-retry').disabled=true;
 syncDeliveryActions();
 $('toolbar-count').textContent='Incidencias: '+state.count+' · Margen: '+ctx.remainingSeconds+' s';
}
function confirmText(kind){
 revisionNeeded=kind==='finish'&&cachedOpportunity().used>=cachedOpportunity().limit;
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
 const changed=LANGS.filter(id=>$(id).value!==start[id]);
 const answers=changed.length?changed.map(id=>({question:id,answer:id==='txt'?noteComment($(id).value):$(id).value,status:$(id).value.trim()?'teacher-review':'pending'})):[{question:'sin-cambios',answer:'',status:'pending'}];
 // Sello del servidor: IP real, hora del servidor y si la entrega cumple red y horario.
 // Va ligado a esta entrega mediante la huella de su contenido. Si no se obtiene, la
 // entrega se genera igualmente y queda marcada como «sin sello».
 let sello=null;
 if(config.control){
  const email=$('student').value.trim().toLowerCase();
  try{
   const huella=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([config.id,email,answers])))),b=>b.toString(16).padStart(2,'0')).join('');
   const response=await fetch(config.control.servidor+'/sello',{method:'POST',cache:'no-store',signal:AbortSignal.timeout(8000),body:JSON.stringify({a:config.module.toLowerCase()+'/'+config.activity,email,huella,clave:config.control.clave||undefined})});
   const stamp=response.ok?await response.json():null;
   sello=stamp&&stamp.huella===huella&&typeof stamp.firma==='string'?stamp:{error:'sin-sello'};
  }catch{sello={error:'sin-sello'};}
  // El servidor tampoco respondió al abrir la actividad: se entró sin comprobar red ni horario.
  if(config.control.sinComprobar)sello.accesoSinComprobar=true;
 }
 const data={attemptId:reportAttempt?.id,attemptNumber:reportAttempt?.number,exam:config.id,module:config.module,activity:config.activity,activityTitle:config.activityTitle,activityVersion:config.version,version:3,language,name:reportEmail.split('@')[0],email:reportEmail,finishedAt:new Date(finishedAt).toISOString(),seconds:Math.floor(timeSpent(finishedAt)/1000),presentationOrder:changed.length?changed:['sin-cambios'],answers,modified:changed,parameters:{},parameterLocks:{},group:'',checked:{},hints:{},notes:'',revisionReason:revisionReason.trim(),...context,sello,audit:metadata,url:location.origin+location.pathname+'?a='+config.module.toLowerCase()+'/'+config.activity};
 const body=JSON.stringify(data);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body))),b=>b.toString(16).padStart(2,'0')).join('');
 return encodeReport(body+'\nCódigo de comprobación: '+config.format.checksum+hash);
}
function persistDelivery(item){
 lastDelivery=item;
 if(!item.receipt)return;
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
  if(JSON.parse(envelope.payload).attemptId)await ensureRegistration();
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
  // En la entrega por archivo se descarga solo el informe: no incluye el código sin modificar.
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
function recoveryEmailReady(){
 if(validEmail($('student').value.trim()))return true;
 fileStatus('recoveryEmailRequired');return false;
}
async function waitForRecoveryFocus(){
 // El selector nativo puede emitir change antes de que la ventana recupere el foco.
 for(let tries=0;tries<40;tries++){
  if(document.fullscreenElement!==document.documentElement)throw Object.assign(Error('Fullscreen required'),{code:'RECOVERY_FULLSCREEN'});
  if(document.visibilityState==='visible'&&document.hasFocus())return;
  await new Promise(resolve=>setTimeout(resolve,50));
 }
 throw Object.assign(Error('Focus not restored'),{code:'RECOVERY_FULLSCREEN'});
}
async function restorePickerFullscreen(){
 const root=document.documentElement;
 if(document.fullscreenElement!==root){try{await root.requestFullscreen();}catch{throw Object.assign(Error('Fullscreen denied'),{code:'RECOVERY_FULLSCREEN'});}}
 if(document.fullscreenElement!==root)throw Object.assign(Error('Fullscreen required'),{code:'RECOVERY_FULLSCREEN'});
}
async function readRecoveryFile(file){
 if(recoveryReading)return;
 recoverySelecting=false;
 if(!file||!recoveryEmailReady()){guard.endFileRecovery();guard.render();return;}
 recoveryReading=true;guard.render();
 try{
  await restorePickerFullscreen();
  if(file.size>3000000)throw Error('Too large');
  const text=await decodePracticeDocument(await file.text());
  await waitForRecoveryFocus();
  // Validar e importar; después se reanuda. Solo el controlador suma la incidencia.
  guard.importPractice(text);
  guard.endFileRecovery();
  $('practice-file-status').hidden=true;
  if(!await guard.recoverPractice())throw Object.assign(Error('Recovery did not start'),{code:'RECOVERY_FULLSCREEN'});
 }catch(error){
  fileStatus(error.code==='RECOVERY_FULLSCREEN'?'recoveryFullscreenError':error.code==='RECOVERY_EMAIL_MISMATCH'?'recoveryEmailMismatch':error.code==='RECOVERY_EMAIL_REQUIRED'?'recoveryEmailRequired':'fileInvalid');
 }finally{recoveryReading=false;guard.endFileRecovery();guard.render();}
}
$('practice-save').addEventListener('click',()=>{if(config.allowSaveRecovery)guard.ask('save');});
$('practice-recover').addEventListener('click',async()=>{
 if(!config.allowSaveRecovery)return;
 if(recoverySelecting||recoveryReading||!recoveryEmailReady()||!guard.beginFileRecovery())return;
 recoverySelecting=true;$('practice-file-status').hidden=true;guard.render();
 try{
  if(document.fullscreenElement!==document.documentElement)await restorePickerFullscreen();
  if(typeof window.showOpenFilePicker==='function'){
   const [handle]=await window.showOpenFilePicker({multiple:false,types:[{description:config.title,accept:{'text/plain':['.txt'],'application/json':['.json']}}]});
   // El selector renueva la activación; se recupera la pantalla completa antes de leer.
   await restorePickerFullscreen();
   await readRecoveryFile(await handle.getFile());
  }else{
   $('practice-file').value='';$('practice-file').click();
  }
 }catch(error){
  try{await restorePickerFullscreen();}catch{$('guard-action-status').textContent=tr('recoveryFullscreenError');}
  recoverySelecting=false;guard.endFileRecovery();
  if(error.name!=='AbortError')fileStatus('recoveryFullscreenError');
  guard.render();
 }
});
$('practice-file').addEventListener('cancel',async()=>{
 try{await restorePickerFullscreen();}catch{$('guard-action-status').textContent=tr('recoveryFullscreenError');}
 recoverySelecting=false;guard.endFileRecovery();guard.render();
});
$('practice-file').addEventListener('change',()=>readRecoveryFile($('practice-file').files[0]));
$('revision-reason').addEventListener('input',refreshReason);
$('practice-finish').addEventListener('click',()=>guard.ask('finish'));
$('practice-reset').addEventListener('click',()=>{if(config.allowRestart)guard.ask('erase');});

// ---------------------------------------------------------------- Arranque

let modalResolve=null;
function confirmActionModal(message){
 if(modalResolve)return Promise.resolve(false);
 const dialog=$('action-confirm');
 $('action-confirm-message').textContent=message;
 return new Promise(resolve=>{modalResolve=resolve;dialog.showModal();});
}
function closeActionModal(accepted=false){
 const resolve=modalResolve;modalResolve=null;
 if($('action-confirm').open)$('action-confirm').close();
 if(resolve)resolve(accepted);
}
$('action-confirm-accept').addEventListener('click',()=>closeActionModal(true));
$('action-confirm-cancel').addEventListener('click',()=>closeActionModal(false));
$('action-confirm').addEventListener('cancel',event=>{event.preventDefault();closeActionModal(false);});
$('action-confirm').addEventListener('close',()=>{if(modalResolve)closeActionModal(false);});

const clearLocalButton=document.createElement('button');
clearLocalButton.id='clear-local-practice';clearLocalButton.type='button';clearLocalButton.className='secondary';
clearLocalButton.title='Borrar caché';
clearLocalButton.setAttribute('aria-label','Borrar caché');
clearLocalButton.innerHTML='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 10a9 9 0 1 1 2.5 8.2M3 4v6h6"/></svg>';
document.body.prepend(clearLocalButton);
clearLocalButton.addEventListener('click',async()=>{
 if(phase!=='ready'||recoveryMode)return;
 if(!await confirmActionModal('Se borrarán los datos locales y el comprobante guardado de esta práctica, incluida cualquier entrega pendiente. Descarga antes el TXT si quieres conservarlo. No se borrará nada de la hoja del profesor. ¿Continuar?'))return;
 if(phase!=='ready'||recoveryMode)return;
 try{
  for(const key of [config.storage.key,config.storage.key+'-previous',config.storage.legacyKey,RECOVERY,submissionStore,opportunityStore])localStorage.removeItem(key);
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
document.querySelectorAll('[data-text]').forEach(el=>el.textContent=tr(el.dataset.text));
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
guard=window.createPracticeGuard({config,deliveryPanel:true,onAttemptStart,confirmDelivery:()=>confirmActionModal('Vas a finalizar la práctica. Al aceptar no podrás volver al editor. ¿Entregar la práctica?'),timeSpent,timeLimitMs:()=>durationMs,validEmail,savePracticeDocument,refreshPendingParameters:()=>0,empty,sanitize,snapshot,restore,setEnabled,startClock,stopClock,downloadReport,makeReport,setReport,canStart,afterRender,confirmText,onReset,validateFinish,
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
 isAnswer(el){return el instanceof HTMLElement&&ids.includes(el.id);},
 restoreValue(el,data){el.value=data.values[el.id]||'';}
});
if(['ready','reset','review'].includes(phase))fillCachedIdentity(false);
// Registrados después de los del controlador: añaden el detalle a su aviso de bloqueo.
const showError=()=>{if(lastError&&!$('guard-boot').hidden&&!$('guard-boot-detail').textContent.includes('Detalle técnico'))$('guard-boot-detail').textContent+=' Detalle técnico: '+lastError.slice(0,300);};
window.addEventListener('error',showError);
window.addEventListener('unhandledrejection',showError);
rememberIdentity();guard.render();
void checkOpportunities();
window.Lab.ready=true;
})();


