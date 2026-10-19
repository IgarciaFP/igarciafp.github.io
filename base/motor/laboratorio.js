(() => {
'use strict';
// Motor común: el contenido y la configuración se inyectan antes de iniciar.
const {config,activity,variants}=window.Lab;
const $=id=>document.getElementById(id);
const fields=structuredClone(activity.fields), sections=activity.sections;


const hintNodes=[...document.querySelectorAll('.exercise details')];
let checked={},hints={};
const ids=[...fields.map(f=>f.id),'student','fullname','group','reflection'];
const FORM=config.form.url;
const RECOVERY=config.storage.recovery;
let emailTouched=false,languageSelected=false;
let language=null,guard=null,elapsed=0,started=null,phase='ready',delivering=false,lastDelivery=null,recoveryMode=false;

const workbookTranslations=activity.translations;
const workbookNodes=[];
document.querySelectorAll('#cuaderno option').forEach(option=>{option.value=option.value;});
const walker=document.createTreeWalker($('cuaderno'),NodeFilter.SHOW_TEXT);
while(walker.nextNode()){
 const node=walker.currentNode;
 if(Object.prototype.hasOwnProperty.call(workbookTranslations,node.data))workbookNodes.push([node,node.data]);
}
function translateWorkbook(){
 for(const [node,original]of workbookNodes)node.data=language==='en'?workbookTranslations[original]:original;
 $('progress').setAttribute('aria-label',language==='en'?'Completed blocks':'Bloques completos');
}
function encodeLegacyReport(text){let binary='';for(const b of new TextEncoder().encode(text))binary+=String.fromCharCode(b);return btoa(binary);}



let parameters=variants.sanitize(variants.defaults),parameterLocks={},randomized=false;
function applyParameters(){
 const derived=variants.derive(parameters),idx=language==='en'?1:0;
 for(const f of fields)if(Object.prototype.hasOwnProperty.call(derived.answers,f.id))f.answer=derived.answers[f.id];
 for(const [key,strings]of Object.entries(derived.prompts))$('variant-'+key).textContent=strings[idx];
 for(const [id,strings]of Object.entries(derived.labels))$('variant-label-'+id).textContent=strings[idx];
 variants.render?.(derived,$,idx);
}
function lockStartedParameters(values){
 for(const [key,group]of Object.entries(variants.groups)){
   if(group.some(id=>(values?values[id]:$(id).value)?.trim()))parameterLocks[key]=true;
 }
}
function refreshPendingParameters(){
 lockStartedParameters();
 let changed=0;
 for(const [key,group]of Object.entries(variants.groups)){
   if(parameterLocks[key])continue;
   parameters[key]=variants.create(key,parameters[key]);changed++;
   for(const id of group){const f=fields.find(f=>f.id===id);clearFeedback(f);checked[f.section]=false;$('status-'+f.section).textContent='';}
 }
 randomized=true;applyParameters();progress();
 return changed;
}

const texts={
step:['Antes de empezar','Before you begin'],
procedure:['Procedimiento del laboratorio','Exam procedure'],
 instructions:["Este laboratorio práctico contiene medidas de seguridad para garantizar su correcta realización. Los intentos de utilización de IA, copia, plugins,etc son registrados y supondrán un cero en la práctica.","This practical lab includes security measures to ensure it is completed correctly. Attempts to use AI, copy, use plugins, etc. are recorded and will result in a zero for the lab."],
rules:config.rules,
privacy:["Los datos de cada laboratorio son distintos para cada usuario/intento. No se permite su realización en grupo.","The data in each lab differ for each user/attempt. Group work is not permitted."],
penalty:["Cualquier intento de copia será penalizado con un cero en la actividad.","Any attempt to cheat will result in a zero for the activity."],
terms:['He leído y acepto el procedimiento y las condiciones.','I have read and accept the procedure and conditions.'],
name:['Nombre y apellidos','Full name'],email:['Correo del centro','School email'],
back:['Cambiar idioma','Change language'],retrySave:['Reintentar guardado','Retry saving'],eventLog:['Registro del intento','Attempt log'],
yourExam:['Tu examen','Your exam'],elapsed:['Tiempo transcurrido','Elapsed time'],goDelivery:['Ir a la entrega ↓','Go to submission ↓'],
question:['Pregunta','Question'],finishTitle:['Generar entrega','Generate submission'],
finishInfo:['Revisa tus respuestas. Al confirmar, se cerrará la edición, se copiará el código y se abrirá el formulario de entrega. Puedes finalizar con preguntas sin responder.','Review your answers. Confirmation closes editing, copies the code and opens the submission form. You may finish with unanswered questions.'],
notes:['Observaciones (opcional)','Comments (optional)'],generate:['Generar entrega','Generate submission'],
deliveryTitle:['Tu entrega está preparada','Your submission is ready'],copyOpen:['Copiar código y abrir Google Forms','Copy code and open Google Forms'],
deliveryNote:['La entrega solo se registra cuando pulsas Enviar en Google Forms. Si el código es demasiado largo para el enlace, pégalo en el campo del contenido.','Your submission is only recorded when you click Submit in Google Forms. If the code is too long for the link, paste it into the content field.'],
recover:['Volver a copiar y abrir la última entrega','Copy and open the last submission again'],
cancel:['Cancelar','Cancel'],confirm:['Confirmar','Confirm'],
start:['Empezar','Start'],
ready:['Pendiente de comenzar','Ready to start'],active:['En curso','In progress'],blocked:['Respuestas bloqueadas · reloj en marcha','Answers locked · timer running'],
submitted:['Intento finalizado','Attempt finished'],reset:['Intento invalidado','Attempt invalidated'],
saved:['Respuestas guardadas: ','Answers saved: '],saveReady:['Guardado local preparado.','Local saving ready.'],
saveError:['Guardado bloqueado. Revisa el aviso superior.','Saving blocked. Check the warning above.'],
answered:['Respuesta escrita','Answer entered'],unanswered:['Sin responder','Not answered'],
progress:[` de ${fields.length} preguntas respondidas.`,` of ${fields.length} questions answered.`],chars:[' caracteres',' characters'],
first:['Primer aviso','First warning'],last:['Último aviso','Final warning'],resetTitle:['Intento reiniciado','Attempt reset'],resume:['Reanudar el intento','Resume attempt'],
firstText:['El laboratorio perdió visibilidad, foco o pantalla completa. Las respuestas se conservan. A la tercera incidencia se vaciarán.','The lab lost visibility, focus or fullscreen. Your answers are retained. The third incident deletes them.'],
lastText:['Segunda incidencia. La próxima salida borrará las respuestas y reiniciará el proceso.','Second incident. The next departure will delete your answers and restart the process.'],
resetText:['Tercera incidencia. Se han borrado las respuestas. Volverás a elegir idioma y a identificarte.','Third incident. Your answers have been deleted. You will choose a language and enter your details again.'],
resumeText:['Se han recuperado las respuestas y el contador. El reloj sigue contando. Recupera la pantalla completa para continuar.','Your answers and incident count have been restored. The timer is still running. Return to fullscreen to continue.'],
continue:['Continuar en pantalla completa','Continue in fullscreen'],understood:['Volver al inicio','Return to start'],
confirmTitle:['¿Generar la entrega y finalizar?','Generate submission and finish?'],
confirmBody:['Las respuestas quedarán bloqueadas. Se copiará el código y se abrirá Google Forms con tus datos. Debes pulsar Enviar en el formulario. Después, este laboratorio volverá al selector de idioma.','Your answers will be locked. The code will be copied and Google Forms will open with your details. You must click Submit in the form. This lab will then return to language selection.'],
copying:['Copiando código y preparando Google Forms…','Copying code and preparing Google Forms…'],
clipboardError:['El navegador no permitió copiar. Permite el portapapeles y pulsa de nuevo «Copiar código y abrir Google Forms». La entrega sigue guardada.','The browser did not allow copying. Allow clipboard access and click “Copy code and open Google Forms” again. Your submission is still saved.'],
popupError:['El código está copiado, pero el navegador bloqueó la nueva pestaña. Permite las ventanas emergentes y vuelve a pulsar el botón.','The code was copied, but the browser blocked the new tab. Allow pop-ups and click the button again.'],
recovery:['Última entrega preparada. Puedes volver a abrirla si todavía no la has enviado en Google Forms.','Last submission prepared. You can reopen it if you have not submitted it in Google Forms yet.'],
longCode:['El código es demasiado largo para el enlace. Ya está copiado: pégalo en el campo de contenido de Google Forms y pulsa Enviar.','The code is too long for the link. It has been copied: paste it into the content field in Google Forms and click Submit.'],
longContinue:['Continuar al formulario','Continue to the form'],
genericError:['No se pudo generar el informe. No se ha finalizado el intento; revisa los datos y vuelve a intentarlo.','The report could not be generated. Your attempt has not been finalized; check your details and try again.']
};
texts.domain=[`Solo se admite el dominio @${config.emailDomain}.`,`Only the @${config.emailDomain} domain is accepted.`];
texts.identityError=[`Introduce tu nombre y un correo válido terminado exactamente en @${config.emailDomain}.`,`Enter your name and a valid email ending exactly in @${config.emailDomain}.`];
const tr=k=>texts[k]?.[language==='en'?1:0]??k;
texts.finishInfo=['Al finalizar el laboratorio, se descargará una copia codificada y se pasará otra al formulario de entrega.','At the end of the lab, it will download a cypher copy automatically and other will pass to the form'];
texts.confirmBody=["Las respuestas quedarán bloqueadas. Se descargará un TXT y se copiará el código. Se abrirá el formulario con el texto de entrega rellenado. Revisa los datos y pulsa Enviar. Si el texto supera el tamaño del enlace, se te indicará que lo pegues.","Your answers will be locked. A TXT file will download and the code will be copied. The form will open with the submission text filled in. Review the details and click Submit. If the text exceeds the link size, you will be asked to paste it."];
texts.deliveryNote=["Conserva el TXT como copia. Pega el código copiado en el formulario de entrega, completa los datos solicitados y pulsa Enviar.","Keep the TXT as a copy. Paste the copied code into the submission form, complete the requested details and click Submit."];
texts.receipt=['Descargar comprobante TXT','Download TXT receipt'];
texts.receiptRequested=['Descarga del comprobante solicitada. Si no aparece, pulsa «Descargar comprobante TXT».','Receipt download requested. If it does not appear, click “Download TXT receipt”.'];
texts.receiptError=['No se pudo iniciar la descarga. La entrega sigue guardada; vuelve a descargar el comprobante.','The download could not be started. Your submission is still saved; download the receipt again.'];
texts.compressionError=['Este navegador no permite comprimir la entrega. Actualízalo o consulta al profesor. El intento no se ha finalizado.','This browser cannot compress the submission. Update it or contact your teacher. The attempt has not been finalized.'];
texts.firstText=['Primer aviso. Tus respuestas se conservan. La tercera incidencia cerrará el intento y generará una entrega con el contenido actual.','First warning. Your answers are retained. The third incident will close the attempt and generate a submission with your current answers.'];
texts.lastText=['Segundo aviso. La próxima incidencia cerrará el intento y generará automáticamente una entrega con tus respuestas actuales.','Second warning. The next incident will close the attempt and automatically generate a submission with your current answers.'];
texts.closing=['Cierre automático: respuestas conservadas','Automatic closure: answers retained'];
texts.forcedPending=['Se ha alcanzado el tercer aviso. Se está generando la entrega con tus respuestas conservadas.','The third warning has been reached. Your submission is being generated with your answers retained.'];
texts.forcedError=['No se pudo generar la entrega automática. Tus respuestas siguen guardadas y bloqueadas. Pulsa Reintentar entrega.','The automatic submission could not be generated. Your answers remain saved and locked. Click Retry submission.'];
texts.forcedRetry=['Reintentar entrega','Retry submission'];
texts.auditInfo=['Se registran el tipo de acción bloqueada, su fecha y hora y el número de usos. No se registran la escritura normal ni el contenido del portapapeles.','The type, timestamp and count of blocked actions are logged. Ordinary typing and clipboard contents are not recorded.'];

Object.assign(texts,{
 procedure:['Procedimiento del laboratorio','Lab procedure'],
 instructions:["Este laboratorio práctico contiene medidas de seguridad para garantizar su correcta realización. Los intentos de utilización de IA, copia, plugins,etc son registrados y supondrán un cero en la práctica.","This practical lab includes security measures to ensure it is completed correctly. Attempts to use AI, copy, use plugins, etc. are recorded and will result in a zero for the lab."],
 yourExam:['Tu laboratorio','Your lab'],
 missing:['Falta este paso.','This step is missing.'],
 review:['Registrado: pendiente de revisión del profesor.','Recorded: awaiting teacher review.'],
 correct:['✓ Correcto.','✓ Correct.'],
 groups:['Revisa cada grupo y sepáralos con espacios.','Check each group and separate them with spaces.'],
 wrong:['Revisa este paso: el resultado no coincide.','Check this step: the result does not match.'],
 changed:['Has cambiado respuestas: vuelve a comprobar este bloque.','Answers changed: check this block again.'],
 blocks:[` de ${sections.length} bloques comprobados y completos. Las explicaciones requieren revisión.`,` of ${sections.length} blocks checked and complete. Explanations require review.`],
 hits:['respuestas cerradas correctas','correct closed answers'],errors:['por corregir','to correct'],
 pendingSteps:['pasos pendientes','missing steps'],explanations:['explicaciones para revisión','explanations for review']
});


Object.assign(texts,{
 savePractice:['Guardar y pausar','Save and pause'],recoverPractice:['Recuperar práctica','Recover practice'],
 paused:['Práctica guardada y pausada','Practice saved and paused'],
 resume:['Recuperar práctica guardada','Recover saved practice'],
 resumeText:['Recuperar añade una incidencia al mismo contador que las pérdidas de foco. La tercera incidencia cierra el intento conservando tus respuestas.','Recovery adds one incident to the same counter as focus losses. The third incident closes the attempt while retaining your answers.'],
 resumeAction:['Recuperar (+1 incidencia)','Recover (+1 incident)'],
 saveNote:['Se guarda en este navegador y perfil. Guardar pausa el reloj; recuperar consume un aviso. Al tercero se cierra el intento.','Saved in this browser and profile. Saving pauses the timer; recovery consumes one warning. The third closes the attempt.'],
 pausedNote:['Guardado: puedes cerrar y continuar otro día en este navegador y perfil. Recuperar suma 1 incidencia; al llegar a 3 se genera la entrega.','Saved: you may close and continue another day in this browser and profile. Recovery adds 1 incident; reaching 3 generates the submission.'],
 recoverFinal:['Recuperar (+1: finalizará)','Recover (+1: will finish)'],
 restoreNote:['Intento guardado encontrado. Recuperar suma 1 incidencia y restaura exactamente los datos guardados.','Saved attempt found. Recovery adds 1 incident and restores the saved values exactly.']
});

for(const [id,anchor]of [['receipt-download','delivery-retry'],['recovery-download','recover-delivery']]){
 const button=document.createElement('button');button.id=id;button.type='button';button.className='secondary';button.dataset.text='receipt';$(anchor).after(button);
 button.addEventListener('click',()=>downloadReceipt(guard.canDownloadReport()?rememberDelivery($('report').value):lastDelivery));
}
const receiptStatus=document.createElement('p');receiptStatus.id='receipt-status';receiptStatus.setAttribute('role','status');$('receipt-download').after(receiptStatus);
function setLanguage(lang){
 language=lang;document.documentElement.lang=lang||'es';
 $('practice-toolbar').hidden=!language||document.fullscreenElement!==document.documentElement||!['active','paused','closing','submitted'].includes(phase);
 document.documentElement.style.setProperty('--toolbar-height',!$('practice-toolbar').hidden?Math.ceil($('practice-toolbar').getBoundingClientRect().height)+'px':'0px');
 document.title=config.title[language==='en'?1:0];
 document.querySelector('.topline').textContent=document.title;
 document.querySelectorAll('[data-text]').forEach(el=>el.textContent=tr(el.dataset.text));
 $('delivery-retry').textContent=tr('copyOpen');
 translateWorkbook();
 applyParameters();
 progress();
}
function validEmail(email){return /^[^\s@]+@[^\s@]+$/.test(email)&&email.split('@')[1].toLowerCase()===config.emailDomain.toLowerCase();}
function validIdentity(){
 const email=$('student').value.trim();
 return !!$('fullname').value.trim() && $('student').validity.valid && validEmail(email);
}
function canStart(){return !!language&&$('guard-consent').checked&&validIdentity();}
function timeSpent(at=Date.now()){return elapsed+(started===null?0:Math.max(0,at-started));}
function clock(){const sec=Math.floor(timeSpent()/1000);$('clock').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
function startClock(){if(!randomized)refreshPendingParameters();if(started===null)started=Date.now();clock();}
function stopClock(at=Date.now()){elapsed=timeSpent(at);started=null;clock();}
function numeric(v){const s=v.trim().replace(',','.');return /^\d+(\.\d+)?$/.test(s)&&Number.isFinite(Number(s))?Number(s):null;}
function normalized(v){return v.trim().toUpperCase().replace(/\s+/g,' ');}
function correct(f){const v=$(f.id).value;if(!v.trim())return false;if(f.kind==='open')return null;if(f.kind==='number'){const n=numeric(v);return n!==null&&Math.abs(n-f.answer)<1e-8;}return normalized(v)===normalized(String(f.answer));}
function hasAnswer(f){return !!$(f.id).value.trim();}
function complete(s){return fields.filter(f=>f.section===s.id).every(f=>f.kind==='open'?hasAnswer(f):correct(f));}
function progress(){const n=sections.filter(s=>checked[s.id]&&complete(s)).length;$('progress').value=n;$('progressText').textContent=`${n}${tr('blocks')}`;}
let reportRevision=0;
function invalidate(){reportRevision++;if($('report').value){$('report').value='';$('download').disabled=true;$('reportStatus').textContent=tr('changed');}}
function clearFeedback(f){const el=$(f.id);el.removeAttribute('aria-invalid');el.closest('.field').classList.remove('correct','wrong');$('feedback-'+f.id).textContent='';}
function check(id,focus=false){let ok=0,bad=0,missing=0,open=0;const list=fields.filter(f=>f.section===id);for(const f of list){clearFeedback(f);const el=$(f.id),out=$('feedback-'+f.id);if(!hasAnswer(f)){out.textContent=tr('missing');missing++;if(f.kind!=='open')el.setAttribute('aria-invalid','true');}else if(f.kind==='open'){out.textContent=tr('review');open++;}else if(correct(f)){out.textContent=tr('correct');el.closest('.field').classList.add('correct');ok++;}else{out.textContent=f.kind==='groups'?tr('groups'):tr('wrong');el.setAttribute('aria-invalid','true');el.closest('.field').classList.add('wrong');bad++;}}
 checked[id]=true;$('status-'+id).textContent=`${ok} ${tr('hits')} · ${bad} ${tr('errors')} · ${missing} ${tr('pendingSteps')} · ${open} ${tr('explanations')}`;progress();if(focus&&missing+bad){const f=list.find(f=>!hasAnswer(f)||(f.kind!=='open'&&!correct(f)));$(f.id).focus();}}

async function encodeReport(text){
 const stream=new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
 const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
 let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 return config.format.report+btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
function empty() { return { values: Object.fromEntries(ids.map(id=>[id,''])), checked:{}, hints:{}, elapsed:0, started:null, report:'', parameters:variants.sanitize(variants.defaults),parameterLocks:{},randomized:false,language:null,reportEncoding:'gzip-base64url' }; }
function sanitize(data) {
  if(!data || typeof data!=='object' || !data.values || typeof data.values!=='object' || Array.isArray(data.values)) throw new Error('Borrador inválido');
  const out=empty();
  out.parameters=data.parameters===undefined?variants.sanitize(variants.defaults):variants.sanitize(data.parameters);
  out.randomized=data.parameters===undefined?true:data.randomized===true;
  if(data.parameterLocks!==undefined&&(!data.parameterLocks||typeof data.parameterLocks!=='object'||Array.isArray(data.parameterLocks)))throw Error('Invalid parameter locks');
  for(const id of ids) {
    const el=$(id), v=data.values[id];
    if(v!==undefined && typeof v!=='string') throw new Error('Campo inválido: '+id);
    out.values[id]=(v||'').slice(0,el.maxLength>0?el.maxLength:2400);
    if(el.tagName==='SELECT' && ![...el.options].some(o=>o.value===out.values[id])) out.values[id]='';
  }
  for(const [key,group]of Object.entries(variants.groups))out.parameterLocks[key]=data.parameterLocks?.[key]===true||group.some(id=>out.values[id].trim());
  for(const sec of sections) out.checked[sec.id]=data.checked?.[sec.id]===true;
  hintNodes.forEach((_,i)=>{if(data.hints?.[i]===true)out.hints[i]=true;});
  out.elapsed=Number.isFinite(data.elapsed)&&data.elapsed>=0?Math.min(data.elapsed,31536000000):0;
  out.started=Number.isFinite(data.started)&&data.started>0&&data.started<=Date.now()?data.started:null;
  const report=typeof data.report==='string'?data.report:'';
  if(report.length>2000000)throw new Error('Informe demasiado largo');
  if(data.reportEncoding!==undefined&&!['base64','gzip-base64url'].includes(data.reportEncoding))throw new Error('Formato de informe no válido');
  // Los informes anteriores se convierten una sola vez al cargar el guardado.
  out.report=data.reportEncoding?report:encodeLegacyReport(report);
  if(data.language!=null&&!['es','en'].includes(data.language))throw Error('Invalid language');
  out.language=data.language||null;out.reportEncoding=data.reportEncoding||'base64';
  return out;
}
function snapshot() {
  lockStartedParameters();
  return {values:Object.fromEntries(ids.map(id=>[id,$(id).value])),checked:{...checked},hints:{...hints},parameters:variants.sanitize(parameters),parameterLocks:{...parameterLocks},randomized,elapsed,started,language,report:$('report').value,reportEncoding:$('report').value.startsWith(config.format.report)?'gzip-base64url':'base64'};
}

function restore(data) {
  emailTouched=false;
  parameters=variants.sanitize(data.parameters||variants.defaults);parameterLocks={...data.parameterLocks};randomized=data.randomized===true;
  for(const id of ids) $(id).value=data.values[id]||'';
  checked={...data.checked};hints={...data.hints};elapsed=data.elapsed;started=data.started??null;
  setLanguage(data.language||null);
  fields.forEach(clearFeedback);
  sections.forEach(s=>{$('status-'+s.id).textContent='';if(checked[s.id])check(s.id);});
  hintNodes.forEach(d=>d.open=false);
  $('report').value=data.report||'';$('download').disabled=true;$('reportStatus').textContent='';
  reportRevision++;clock();progress();
}
function setEnabled(enabled) {
  $('answer-fields').disabled=!enabled;$('reflection-fields').disabled=!enabled;
  document.querySelectorAll('[data-check]').forEach(b=>b.disabled=!enabled);
}
function setReport(report){$('report').value=report;}
Object.assign(texts,{
 saveWarning:['Se descargará un documento y se pausará la práctica. Al recuperarla se generará una incidencia de las 3 disponibles. Si es la tercera, se cerrará el intento. ¿Guardar y pausar?','A document will download and the practice will pause. Recovering it will consume one of the 3 available incidents. If it is the third, the attempt will close. Save and pause?'],
 recoveryFullscreenError:['El navegador no ha permitido activar la pantalla completa. Revisa el permiso y vuelve a pulsar Recuperar práctica.','The browser did not allow fullscreen. Check the permission and click Recover practice again.'],
 toolbarFinish:['Entregar','Submit'],toolbarReset:['Reiniciar','Restart'],
 continueImported:['Continuar práctica recuperada','Continue recovered practice'],
 fileSaved:['Archivo descargado. Consérvalo: Recuperar práctica lo leerá para continuar otro día.','File downloaded. Keep it: Recover practice will read it to continue another day.'],
 fileLoaded:['Archivo leído. Pulsa Continuar práctica recuperada; contará como una incidencia.','File loaded. Click Continue recovered practice; this counts as one incident.'],
 fileError:['No se pudo descargar el documento. La práctica sigue guardada aquí; vuelve a pulsar Guardar.','Could not download the document. The practice is still saved here; click Save again.'],
 recoveryEmailRequired:['Introduce primero tu correo de alumno en los datos de inicio para poder recuperar una práctica.','Enter your student email in the starting details before recovering a practice.'],
 recoveryEmailMismatch:['El correo actual no coincide con el de la práctica guardada. No se ha recuperado ni se ha añadido ninguna incidencia.','The current email does not match the saved practice. Nothing was recovered and no incident was added.'],
 fileInvalid:['No se pudo recuperar: selecciona un archivo de práctica o comprobante válido que no haya agotado las tres incidencias.','Could not recover: choose a valid practice file or receipt that has not reached three incidents.'],
 restartWarning:['Se descargará automáticamente una copia antes de borrar el intento y volver al comienzo. ¿Reiniciar?','A copy will download automatically before this browser’s attempt is cleared and you return to the start. Restart?']
});
let importedPractice=false,recoverySelecting=false,recoveryReading=false;
function afterRender(state,ctx){
 phase=state.phase;
 if(!languageSelected){
  $('practice-toolbar').hidden=true;syncToolbarHeight();
  $('language-stage').hidden=false;
  $('setup-stage').hidden=true;$('guard-panel').hidden=true;
  $('cuaderno').hidden=true;$('cuaderno').inert=true;
  $('delivery-stage').hidden=true;$('recovery').hidden=true;
  return;
 }
 $('practice-toolbar').hidden=!language||document.fullscreenElement!==document.documentElement||!['active','paused','closing','submitted'].includes(phase);
 syncToolbarHeight();
 const paused=phase==='paused',needsRecovery=paused||ctx.restoring;
 const active=phase==='active',submitted=phase==='submitted'||phase==='closing';
 $('language-stage').hidden=!!language||active||submitted;
 $('setup-stage').hidden=!language||submitted||recoveryMode;
 $('guard-panel').hidden=!language||submitted||(active&&!ctx.restoring&&!ctx.problem&&!$('guard-action-status').textContent);$('guard-panel').inert=!language;
 document.querySelector('.setup-only').hidden=(active&&!ctx.restoring)||phase==='reset';
 $('guard-start-box').hidden=active&&!ctx.restoring;
 $('active-status').hidden=true;
 $('event-details').hidden=false;
 $('cuaderno').hidden=!active||needsRecovery;$('cuaderno').inert=!active||needsRecovery;
 $('delivery-stage').hidden=!submitted&&!recoveryMode;
 if(phase==='closing'){
   if(!$('delivery-status').textContent)$('delivery-status').textContent=tr('forcedPending');
   $('delivery-retry').textContent=tr('forcedRetry');
   $('delivery-retry').disabled=!!ctx.forcedBusy;
 } else if(phase==='submitted'&&!pendingURL){$('delivery-retry').textContent=tr('copyOpen');$('delivery-retry').disabled=delivering;}
 $('receipt-download').disabled=phase==='closing';
 $('download').hidden=true;
 document.querySelector('.identity').hidden=!$('guard-consent').checked;
 $('fullname').disabled=false;$('student').disabled=false;
 $('guard-start').textContent=tr('start');
 $('practice-recover').disabled=!active||ctx.restoring||!validIdentity()||!!ctx.problem||ctx.busy||!ctx.supported||recoverySelecting||recoveryReading;
 $('guard-state').textContent=tr(active?($('answer-fields').disabled?'blocked':'active'):phase);
 $('guard-count').textContent=(language==='en'?'Incidents: ':'Incidencias: ')+state.count+'/3';
 $('guard-conditions').textContent=(language==='en'?'Fullscreen: ':'Pantalla completa: ')+(document.fullscreenElement?'✓':'—')+' · '+(language==='en'?'Focus: ':'Foco: ')+(document.hasFocus()?'✓':'—')+' · '+(language==='en'?'Visible: ':'Visible: ')+(document.visibilityState==='visible'?'✓':'—');
 $('saveStatus').textContent=ctx.problem?tr('saveError'):state.savedAt?tr('saved')+new Date(state.savedAt).toLocaleTimeString(language==='en'?'en-GB':'es-ES'):tr('saveReady');
 $('identity-error').textContent=$('guard-consent').checked&&emailTouched&&$('student').value.trim()&&(!$('student').validity.valid||!validEmail($('student').value.trim()))?tr('identityError'):'';
 if(state.pending){
 const k=state.pending;
 $('guard-warning-title').textContent=tr(k==='reset'?'resetTitle':k);
 $('guard-warning-text').textContent=tr(k+'Text');
 $('guard-warning-count').textContent=$('guard-count').textContent;
 $('guard-continue').textContent=tr(ctx.restoring?'resumeAction':active?'continue':'understood');
 }
 if(language==='en')translateErrors();
 if(language==='en')for(const el of $('guard-log').children)el.textContent=el.textContent
   .replace(/Comienzo del intento (\d+)\. Normas aceptadas\./g,'Attempt $1 started. Terms accepted.')
   .replaceAll('Intento reanudado en pantalla completa.','Attempt resumed in fullscreen.')
   .replaceAll('Práctica guardada y pausada; recuperar consumirá una incidencia.','Practice saved and paused; recovery will consume one incident.')
   .replaceAll('Recuperación guardada: incidencia ','Saved recovery: incident ')
   .replaceAll('Datos renovados en ejercicios sin empezar: ','Values renewed in untouched exercises: ')
   .replaceAll('Respuestas vaciadas; intento detenido.','Answers cleared; attempt stopped.')
   .replaceAll('Intento finalizado. Exportación del informe habilitada.','Attempt finished. Report delivery enabled.')
   .replaceAll('Incidencia ','Incident ').replaceAll('Mismo episodio: ','Same episode: ')
   .replaceAll('(sin sumar otra incidencia).','(no additional incident).')
   .replaceAll('página oculta','page hidden').replaceAll('pérdida de foco','focus lost')
   .replaceAll('salida de pantalla completa','fullscreen exited').replaceAll('recarga o cierre','reload or close');
 $('recovery').hidden=true; // Recovery is available only through the toolbar file picker.
 $('recovery-message').textContent=tr('recovery');

 $('practice-save').disabled=(!active&&!paused)||ctx.restoring||!!ctx.problem||ctx.busy||(active&&$('answer-fields').disabled);
 $('practice-finish').disabled=!guard?.canEdit();
 $('practice-reset').disabled=!!ctx.problem||ctx.busy||phase==='closing';
 $('toolbar-count').textContent=(language==='en'?'Incidents: ':'Incidencias: ')+state.count+'/3';
 // Toolbar guidance removed; save errors remain visible in the guard panel.

}
const errorTranslations={
'El guardado no es válido. No se ha sobrescrito: avisa al profesor.':'The saved data is invalid. It has not been overwritten; contact your teacher.',
'El navegador no permite acceder al guardado local.':'The browser does not allow access to local storage.',
'El borrador anterior está dañado. No se ha modificado: avisa al profesor.':'The previous draft is damaged. It has not been changed; contact your teacher.',
'El borrador cambió en otra pestaña. Esta copia se ha bloqueado para no sobrescribirlo. Cierra las copias adicionales y recarga.':'The draft changed in another tab. This copy is locked to prevent overwriting it. Close duplicate tabs and reload.',
'No se pudo guardar. Los cambios actuales siguen en memoria. No cierres la página; avisa al profesor y reintenta el guardado.':'Saving failed. Your current changes are still in memory. Do not close the page; contact your teacher and retry saving.',
'Este navegador no ofrece las funciones necesarias. Abre la página directamente en un navegador de escritorio compatible con pantalla completa.':'This browser lacks required features. Open the page directly in a desktop browser with fullscreen support.',
'Otra pestaña modificó o borró este intento. Esta copia está bloqueada. Cierra las copias adicionales y recarga.':'Another tab changed or deleted this attempt. This copy is locked. Close duplicate tabs and reload.',
'No se puede leer el guardado.':'The saved data cannot be read.',
'No se pudo activar pantalla completa. Regresa a la página y vuelve a intentarlo.':'Fullscreen could not be activated. Return to the page and try again.',
'Falta pantalla completa, foco o visibilidad. Regresa y vuelve a pulsar el botón.':'Fullscreen, focus or visibility is missing. Return and click the button again.',
'No se pudo activar pantalla completa.':'Fullscreen could not be activated.',
'Se produjo un error de JavaScript. El laboratorio está bloqueado. No borres los datos: avisa al profesor. El último guardado correcto se conserva.':'A JavaScript error occurred. The lab is locked. Do not delete any data; contact your teacher. The last successful save is retained.',
'No se pudo generar el informe. No se ha finalizado el intento; revisa los datos y vuelve a intentarlo.':texts.genericError[1]
};
function translateErrors(){for(const id of ['guard-problem-text','guard-action-status','guard-warning-error','guard-boot-detail','reportStatus']){const el=$(id);if(errorTranslations[el.textContent])el.textContent=errorTranslations[el.textContent];}}
function confirmText(kind){if(kind==='save'){$('guard-confirm-title').textContent=tr('savePractice');$('guard-confirm-text').textContent=tr('saveWarning');}if(kind==='erase'){$('guard-confirm-title').textContent=tr('toolbarReset');$('guard-confirm-text').textContent=tr('restartWarning');}if(kind==='finish'){$('guard-confirm-title').textContent=tr('confirmTitle');$('guard-confirm-text').textContent=tr('confirmBody');}}
async function makeReport(metadata,final,finishedAt=Date.now(),context={}){
 if(!validIdentity()){$('reportStatus').textContent=tr('identityError');return null;}
 // Compact, versioned report avoids repeating the public question text in a prefilled URL.
 if(typeof CompressionStream!=='function'){$('reportStatus').textContent=tr('compressionError');return null;}
 const data={exam:config.id,version:3,language,name:$('fullname').value.trim(),email:$('student').value.trim().toLowerCase(),finishedAt:new Date(finishedAt).toISOString(),seconds:Math.floor(timeSpent(finishedAt)/1000),presentationOrder:fields.map(f=>f.id),answers:fields.map((f,i)=>({question:f.id,answer:$(f.id).value.trim(),status:!hasAnswer(f)?'pending':f.kind==='open'?'teacher-review':correct(f)?'correct':'review'})),parameters:variants.sanitize(parameters),parameterLocks:{...parameterLocks},group:$('group').value.trim(),checked:{...checked},hints:{...hints},notes:$('reflection').value.trim().slice(0,2400),...context,audit:metadata,url:location.href};
 const body=JSON.stringify(data);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body))),b=>b.toString(16).padStart(2,'0')).join('');
 return encodeReport(body+'\nCódigo de comprobación: '+config.format.checksum+hash);
}
function rememberDelivery(report){
 if(lastDelivery?.code===report&&lastDelivery.practice)return lastDelivery;
 const item={code:report,practice:guard.exportPractice(),name:$('fullname').value.trim(),language:language||'es'};
 lastDelivery=item;
 try{sessionStorage.setItem(RECOVERY,JSON.stringify(item));}catch{/* Current submitted state still preserves the report. */}
 return item;
}
function formURL(item){
 // Field confirmed by the teacher's Google Forms prefilled link.
 const base=FORM.split('?')[0]+'?usp=pp_url';
 const url=base+'&'+encodeURIComponent(config.form.entry)+'='+encodeURIComponent(item.code);
 // Keep the complete code in the clipboard/TXT if a URL would be too long.
 return url.length<=8000?{url,long:false}:{url:base,long:true};
}
let pendingURL=null;
async function deliver(item,reset=true){
 if(delivering)return;
 delivering=true;$('delivery-retry').disabled=true;$('delivery-status').textContent=tr('copying');
 const dest=formURL(item);
 // Copy while this document is still focused. A blocked popup leaves the report intact.
 try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(item.code);
 }catch{
   if(dest.long){$('delivery-status').textContent=tr('clipboardError');delivering=false;$('delivery-retry').disabled=false;return;}
 }
 if(dest.long){
   pendingURL={url:dest.url,reset};
   $('delivery-status').textContent=tr('longCode');
   $('delivery-retry').textContent=tr('longContinue');
   delivering=false;$('delivery-retry').disabled=false;return;
 }
 const popup=window.open('about:blank','_blank');
 if(!popup){$('delivery-status').textContent=tr('popupError');delivering=false;$('delivery-retry').disabled=false;return;}
 popup.opener=null;
 popup.location.replace(dest.url);
 delivering=false;$('delivery-retry').disabled=false;
 if(reset)guard.resetProcess();else {recoveryMode=false;guard.render();}
}
const requestedReceipts=new Set();
async function downloadReceipt(item){
 if(!item?.code)return false;
 let url;
 try{
  const documentCode=item.practice?await encodeReport(item.practice):item.code;
  url=URL.createObjectURL(new Blob([documentCode],{type:'text/plain;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;link.download='comprobante-'+config.filePrefix+'-'+item.code.slice(-16).replace(/[^a-zA-Z0-9_-]/g,'')+'.txt';
  document.body.append(link);link.click();link.remove();
  requestedReceipts.add(item.code);
  $('receipt-status').textContent=tr('receiptRequested');
  return true;
 }catch{$('receipt-status').textContent=tr('receiptError');return false;}
 finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),60000);}
}
async function downloadReport(){
 const item=rememberDelivery($('report').value);
 if(!requestedReceipts.has(item.code)&&!await downloadReceipt(item))return;
 return deliver(item);
}
function onReset(){languageSelected=false;emailTouched=false;importedPractice=false;$('practice-file-status').hidden=true;recoveryMode=false;setLanguage(null);pendingURL=null;$('delivery-retry').textContent=tr('copyOpen');$('delivery-status').textContent='';window.scrollTo(0,0);}
$('delivery-retry').addEventListener('click',()=>{
 if(phase==='closing'){$('delivery-status').textContent=tr('forcedPending');void guard.finalizeForced();return;}
 if(pendingURL){
   const target=window.open('about:blank','_blank');
   if(!target){$('delivery-status').textContent=tr('popupError');return;}
   target.opener=null;target.location.replace(pendingURL.url);
   const reset=pendingURL.reset;pendingURL=null;
   if(reset)guard.resetProcess();else {recoveryMode=false;guard.render();}
   return;
 }
 if(guard.canDownloadReport())downloadReport();
 else if(lastDelivery)deliver(lastDelivery,false);
});
$('recover-delivery').addEventListener('click',()=>{
 if(!lastDelivery)return;
 recoveryMode=true;
 $('delivery-stage').hidden=false;$('setup-stage').hidden=true;$('recovery').hidden=true;
 deliver(lastDelivery,false);
});
$('student').addEventListener('blur',()=>{emailTouched=!!$('student').value.trim();guard?.render();});
for(const id of ['student','fullname'])$(id).addEventListener('input',()=>guard?.render());
$('guard-consent').addEventListener('change',()=>guard?.render());
document.querySelectorAll('[data-language]').forEach(el=>el.addEventListener('click',()=>{languageSelected=true;setLanguage(el.dataset.language);guard.render();window.scrollTo(0,0);}));
$('back-language').addEventListener('click',()=>{languageSelected=false;setLanguage(null);$('guard-consent').checked=false;guard.render();});

for(const f of fields) $(f.id).addEventListener('input',()=>{
 if(!guard.canEdit())return;
 clearFeedback(f);checked[f.section]=false;$('status-'+f.section).textContent=tr('changed');
 invalidate();progress();guard.saveEdit();
});
for(const id of ['group','reflection'])$(id).addEventListener('input',()=>{if(guard.canEdit()){invalidate();guard.saveEdit();}});
document.querySelectorAll('[data-check]').forEach(b=>b.addEventListener('click',()=>{
 if(!guard.canEdit())return;invalidate();check(b.dataset.check,true);guard.saveEdit();
}));
hintNodes.forEach((d,i)=>d.addEventListener('toggle',()=>{
 if(guard?.canEdit()&&d.open&&!hints[i]){hints[i]=true;invalidate();guard.saveEdit();}
}));
function fileStatus(key){$('practice-file-status').hidden=false;$('practice-file-status').textContent=tr(key);}
async function savePracticeDocument(){
 let url;
 try{
  const code=await encodeReport(guard.exportPractice());
  url=URL.createObjectURL(new Blob([code],{type:'text/plain;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='practica-'+config.filePrefix+'-'+Date.now()+'.txt';
  document.body.append(link);link.click();link.remove();
  importedPractice=false;fileStatus('fileSaved');return true;
 }catch{fileStatus('fileError');return false;}
 finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),60000);}
}
async function decodePracticeDocument(text){
 text=text.trim();
 // Compatibility with practice documents downloaded before compression.
 if(text.startsWith('{'))return text;
 if(!text.startsWith(config.format.report)||! /^[A-Za-z0-9_-]+$/.test(text.slice(config.format.report.length)))throw Error('Invalid encoded document');
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
$('practice-save').addEventListener('click',()=>guard.ask('save'));
function recoveryEmailReady(){
 if(validEmail($('student').value.trim()))return true;
 fileStatus('recoveryEmailRequired');return false;
}
async function waitForRecoveryFocus(){
 // The native file picker may dispatch change before window focus is restored.
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
$('practice-recover').addEventListener('click',async()=>{
 if(recoverySelecting||recoveryReading||!recoveryEmailReady()||!guard.beginFileRecovery())return;
 recoverySelecting=true;$('practice-file-status').hidden=true;guard.render();
 try{
  if(document.fullscreenElement!==document.documentElement)await restorePickerFullscreen();
  if(typeof window.showOpenFilePicker==='function'){
    const [handle]=await window.showOpenFilePicker({multiple:false,types:[{description:config.title[0],accept:{'text/plain':['.txt'],'application/json':['.json']}}]});
    // The picker renews activation; restore fullscreen before file I/O.
    await restorePickerFullscreen();
    const file=await handle.getFile();
    await readRecoveryFile(file);
  }else{
    $('practice-file').value='';$('practice-file').click();
  }
 }catch(error){
  try{await restorePickerFullscreen();}catch{
    $('guard-action-status').textContent=tr('recoveryFullscreenError');
  }
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
async function readRecoveryFile(file){
 if(recoveryReading)return;
 recoverySelecting=false;
 if(!file||!recoveryEmailReady()){guard.endFileRecovery();guard.render();return;}
 recoveryReading=true;guard.render();
 const root=document.documentElement;
 try{
  await restorePickerFullscreen();
  if(file.size>3000000)throw Error('Too large');
  const text=await decodePracticeDocument(await file.text());
  await waitForRecoveryFocus();
  // 3. Validate/import, then resume automatically. Only the guard charges recovery.
  guard.importPractice(text);importedPractice=false;
  guard.endFileRecovery();
  $('practice-file-status').hidden=true;
  if(!await guard.recoverPractice())throw Object.assign(Error('Recovery did not start'),{code:'RECOVERY_FULLSCREEN'});
 }catch(error){
  fileStatus(error.code==='RECOVERY_FULLSCREEN'?'recoveryFullscreenError':error.code==='RECOVERY_EMAIL_MISMATCH'?'recoveryEmailMismatch':error.code==='RECOVERY_EMAIL_REQUIRED'?'recoveryEmailRequired':'fileInvalid');
  
 }finally{recoveryReading=false;guard.endFileRecovery();guard.render();}
}
$('practice-finish').addEventListener('click',()=>guard.ask('finish'));
$('practice-reset').addEventListener('click',()=>guard.ask('erase'));
const syncToolbarHeight=()=>document.documentElement.style.setProperty('--toolbar-height',Math.ceil($('practice-toolbar').getBoundingClientRect().height)+'px');
if(typeof ResizeObserver==='function')new ResizeObserver(syncToolbarHeight).observe($('practice-toolbar'));
window.addEventListener('resize',syncToolbarHeight);
syncToolbarHeight();
$('lab').addEventListener('submit',e=>e.preventDefault());
setInterval(clock,1000);
try{const item=JSON.parse(sessionStorage.getItem(RECOVERY));if(item&&typeof item.code==='string'&&item.code.length<2000000&&typeof item.name==='string'&&['es','en'].includes(item.language))lastDelivery=item;}catch{}
setLanguage(null);
guard=window.createPracticeGuard({config,validEmail,savePracticeDocument,refreshPendingParameters,empty,sanitize,snapshot,restore,setEnabled,startClock,stopClock,downloadReport,makeReport,setReport,canStart,afterRender,confirmText,onReset,
async saveBeforeReset(phase){
 if(phase==='paused')return savePracticeDocument();
 if(phase==='submitted')return downloadReceipt(rememberDelivery($('report').value));
 return phase==='ready'||phase==='reset'||phase==='review';
},
forcedError(){$('delivery-status').textContent=tr('forcedError');},
isAnswer(el){return el instanceof HTMLElement&&ids.includes(el.id);},
restoreValue(el,data){el.value=data.values[el.id]||'';}
});
document.querySelectorAll('[data-language]').forEach(el=>el.disabled=false);
window.addEventListener('error',()=>{if(language==='en')translateErrors();});
window.addEventListener('unhandledrejection',()=>{if(language==='en')translateErrors();});
})();

