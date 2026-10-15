const QUESTION_BANK={"es":["Indica en qué orden se descargan los distintos recursos de esta página. ¿Se solapa la carga de algunos recursos?","¿Qué componente del navegador procesa cada fichero de esta página?","¿Qué función cumple cada tecnología: HTTP, HTML, CSS y JavaScript?","Compara los métodos GET y POST: explica su finalidad y cómo se envían habitualmente los parámetros o datos con cada uno.","¿Qué significa que el navegador reciba un código 200 o un código 400 tras la petición?","script.js ejecuta fetch(\"http://miapi.com/data.json\"); y se produce un error de CORS. ¿Por qué el navegador impide que el script acceda a la respuesta?","Supón que también existe http://127.0.0.1/styles2.css. ¿Podemos utilizar DevTools para sustituir styles.css por styles2.css y cambiar temporalmente el estilo de la página? Razona la respuesta.","¿Qué es un punto de interrupción —breakpoint—? ¿Cómo lo establecerías en DevTools para pausar el script antes de ejecutar una instrucción?","¿Podemos utilizar DevTools para simular un dispositivo móvil con baja velocidad de red ubicado en Perú? ¿Cambiaría nuestra huella de navegación (browser fingerprint)?","script.js contiene un código que bloquea la descarga de la imagen. Indica cómo descargarla con DevTools.","Supón que la página utiliza una biblioteca JavaScript externa. ¿Qué ventajas puede aportar servir ese fichero mediante una CDN, como Cloudflare, frente a servirlo únicamente desde un servidor de origen?","Una vez cargada la página y renderizado todo el contenido sin problemas, actualizamos con F5. ¿Qué acciones y comprobaciones realiza el navegador antes de hacer la petición al servidor?","¿Qué aporta HTTPS frente a HTTP a nivel de seguridad? ¿Cómo lo hace?","Si el servidor local utiliza el puerto 8080, ¿cuál es la URL completa para acceder a index.html?"],"en":["In what order are the resources on this page downloaded? Can any of the downloads overlap?","Which browser component processes each file on this page?","What is the role of each technology: HTTP, HTML, CSS and JavaScript?","Compare GET and POST: explain their purpose and how parameters or data are usually sent with each method.","What does it mean when the browser receives a 200 or a 400 status code after the request?","script.js runs fetch(\"http://miapi.com/data.json\"); and a CORS error occurs. Why does the browser prevent the script from accessing the response?","Suppose http://127.0.0.1/styles2.css also exists. Can we use DevTools to replace styles.css with styles2.css and temporarily change the page’s appearance? Explain your answer.","What is a breakpoint? How would you set one in DevTools to pause the script before an instruction runs?","Can we use DevTools to simulate a mobile device with a slow network connection located in Peru? Would our browser fingerprint change?","script.js contains code that blocks the image download. Explain how to download it using DevTools.","Suppose the page uses an external JavaScript library. What advantages could serving that file through a CDN, such as Cloudflare, offer over serving it only from an origin server?","Once the page has loaded and all its content has rendered correctly, we refresh it with F5. What actions and checks does the browser perform before making a request to the server?","What security does HTTPS provide compared with HTTP? How does it work?","If the local server uses port 8080, what is the full URL to access index.html?"]};
(() => {
'use strict';
// QUESTION_BANK is prepended when packaging.
const $=id=>document.getElementById(id);
const fields=Array.from({length:14},(_,i)=>({id:'q'+(i+1)}));
const ids=[...fields.map(f=>f.id),'student','fullname','reflection'];
const FORM='https://docs.google.com/forms/d/e/1FAIpQLSe0iRrYhaOF0WL5lwjWeFheZbz1jKhz8vkG45E1i3psjfKK-w/viewform';
const RECOVERY='examen-web-ultima-entrega-v2';
let language=null,guard=null,elapsed=0,started=null,phase='ready',delivering=false,lastDelivery=null,recoveryMode=false;
let questionOrder=null;
const canonicalOrder=()=>fields.map((_,i)=>i+1);
function shuffledOrder(){
 const order=canonicalOrder();
 for(let i=order.length-1;i>0;i--){
   const random=new Uint32Array(1),limit=Math.floor(4294967296/(i+1))*(i+1);
   do{crypto.getRandomValues(random);}while(random[0]>=limit);
   const j=random[0]%(i+1);[order[i],order[j]]=[order[j],order[i]];
 }
 return order;
}
function applyQuestionOrder(){
 const nav=document.querySelector('.sidebar nav');
 (questionOrder||canonicalOrder()).forEach((number,position)=>{
   const section=$('question-'+number),link=$('nav-q'+number);
   const label=document.createElement('span');label.dataset.text='question';label.textContent=tr('question');
   section.querySelector('.eyebrow').replaceChildren(label,document.createTextNode(' '+String(position+1).padStart(2,'0')+' / 14'));
   $('answer-fields').append(section);
   link.textContent=String(position+1).padStart(2,'0');nav.append(link);
 });
}
const texts={
step:['Antes de empezar','Before you begin'],
procedure:['Procedimiento del examen','Exam procedure'],
instructions:['Responde por escrito a 14 preguntas. Al generar la entrega, se cerrará el intento, se copiará el código y se abrirá Google Forms. Revisa los campos y pulsa Enviar allí. Este examen volverá al selector de idioma.','Answer 14 questions in writing. Generating your submission closes the attempt, copies the code and opens Google Forms. Review the fields and click Submit there. This exam then returns to language selection.'],
rules:['Mantén la página visible, con foco y en pantalla completa. Las dos primeras salidas generan avisos; la tercera borra las respuestas y reinicia el proceso. Copiar, cortar, pegar, arrastrar, Control y el botón derecho están bloqueados durante el examen.','Keep this page visible, focused and in fullscreen. The first two departures trigger warnings; the third deletes your answers and restarts the process. Copy, cut, paste, drag, Control shortcuts and right-click are blocked during the exam.'],
privacy:['El intento y el tiempo se guardan en este navegador. Al entregar, el código contiene tu nombre, correo, respuestas y registro de incidencias y se pasa al formulario indicado por el profesor. Los controles son disuasorios; una incidencia no demuestra copia.','Your attempt and elapsed time are saved in this browser. On delivery, the code contains your name, email, answers and incident log and is passed to the teacher’s form. These controls are deterrents; an incident does not prove cheating.'],
terms:['He leído y acepto el procedimiento y las condiciones.','I have read and accept the procedure and conditions.'],
name:['Nombre y apellidos','Full name'],email:['Correo del centro','School email'],domain:['Solo se admite el dominio @g.educaand.es.','Only the @g.educaand.es domain is accepted.'],
back:['Cambiar idioma','Change language'],retrySave:['Reintentar guardado','Retry saving'],eventLog:['Registro del intento','Attempt log'],
yourExam:['Tu examen','Your exam'],elapsed:['Tiempo transcurrido','Elapsed time'],goDelivery:['Ir a la entrega ↓','Go to submission ↓'],
scenario:['El supuesto','The scenario'],
scenarioText:['El navegador web realiza una petición GET contra la IP 127.0.0.1. El servidor web contiene el siguiente fichero index.html en su directorio raíz:','The browser makes a GET request to IP address 127.0.0.1. The web server contains the following index.html file in its root directory:'],
written:['Responde las cuestiones sobre DevTools por escrito. No abras herramientas ni abandones esta página durante el intento.','Answer the DevTools questions in writing. Do not open tools or leave this page during the attempt.'],
question:['Pregunta','Question'],finishTitle:['Generar entrega','Generate submission'],
finishInfo:['Revisa tus respuestas. Al confirmar, se cerrará la edición, se copiará el código y se abrirá el formulario de entrega. Puedes finalizar con preguntas sin responder.','Review your answers. Confirmation closes editing, copies the code and opens the submission form. You may finish with unanswered questions.'],
notes:['Observaciones (opcional)','Comments (optional)'],generate:['Generar entrega','Generate submission'],
deliveryTitle:['Tu entrega está preparada','Your submission is ready'],copyOpen:['Copiar código y abrir Google Forms','Copy code and open Google Forms'],
deliveryNote:['La entrega solo se registra cuando pulsas Enviar en Google Forms. Si el código es demasiado largo para el enlace, pégalo en el campo del contenido.','Your submission is only recorded when you click Submit in Google Forms. If the code is too long for the link, paste it into the content field.'],
recover:['Volver a copiar y abrir la última entrega','Copy and open the last submission again'],
cancel:['Cancelar','Cancel'],confirm:['Confirmar y generar entrega','Confirm and generate submission'],
start:['Aceptar e iniciar en pantalla completa','Start in fullscreen'],
identityError:['Introduce tu nombre y un correo válido terminado exactamente en @g.educaand.es.','Enter your name and a valid email ending exactly in @g.educaand.es.'],
ready:['Pendiente de comenzar','Ready to start'],active:['En curso','In progress'],blocked:['Respuestas bloqueadas · reloj en marcha','Answers locked · timer running'],
submitted:['Intento finalizado','Attempt finished'],reset:['Intento invalidado','Attempt invalidated'],
saved:['Respuestas guardadas: ','Answers saved: '],saveReady:['Guardado local preparado.','Local saving ready.'],
saveError:['Guardado bloqueado. Revisa el aviso superior.','Saving blocked. Check the warning above.'],
answered:['Respuesta escrita','Answer entered'],unanswered:['Sin responder','Not answered'],
progress:[' de 14 preguntas respondidas.',' of 14 questions answered.'],chars:[' caracteres',' characters'],
first:['Primer aviso','First warning'],last:['Último aviso','Final warning'],resetTitle:['Intento reiniciado','Attempt reset'],resume:['Reanudar el intento','Resume attempt'],
firstText:['El examen perdió visibilidad, foco o pantalla completa. Las respuestas se conservan. A la tercera incidencia se vaciarán.','The exam lost visibility, focus or fullscreen. Your answers are retained. The third incident deletes them.'],
lastText:['Segunda incidencia. La próxima salida borrará las respuestas y reiniciará el proceso.','Second incident. The next departure will delete your answers and restart the process.'],
resetText:['Tercera incidencia. Se han borrado las respuestas. Volverás a elegir idioma y a identificarte.','Third incident. Your answers have been deleted. You will choose a language and enter your details again.'],
resumeText:['Se han recuperado las respuestas y el contador. El reloj sigue contando. Recupera la pantalla completa para continuar.','Your answers and incident count have been restored. The timer is still running. Return to fullscreen to continue.'],
continue:['Continuar en pantalla completa','Continue in fullscreen'],understood:['Volver al inicio','Return to start'],
confirmTitle:['¿Generar la entrega y finalizar?','Generate submission and finish?'],
confirmBody:['Las respuestas quedarán bloqueadas. Se copiará el código y se abrirá Google Forms con tus datos. Debes pulsar Enviar en el formulario. Después, este examen volverá al selector de idioma.','Your answers will be locked. The code will be copied and Google Forms will open with your details. You must click Submit in the form. This exam will then return to language selection.'],
copying:['Copiando código y preparando Google Forms…','Copying code and preparing Google Forms…'],
clipboardError:['El navegador no permitió copiar. Permite el portapapeles y pulsa de nuevo «Copiar código y abrir Google Forms». La entrega sigue guardada.','The browser did not allow copying. Allow clipboard access and click “Copy code and open Google Forms” again. Your submission is still saved.'],
popupError:['El código está copiado, pero el navegador bloqueó la nueva pestaña. Permite las ventanas emergentes y vuelve a pulsar el botón.','The code was copied, but the browser blocked the new tab. Allow pop-ups and click the button again.'],
recovery:['Última entrega preparada. Puedes volver a abrirla si todavía no la has enviado en Google Forms.','Last submission prepared. You can reopen it if you have not submitted it in Google Forms yet.'],
longCode:['El código es demasiado largo para el enlace. Ya está copiado: pégalo en el campo de contenido de Google Forms y pulsa Enviar.','The code is too long for the link. It has been copied: paste it into the content field in Google Forms and click Submit.'],
longContinue:['Continuar al formulario','Continue to the form'],
genericError:['No se pudo generar el informe. No se ha finalizado el intento; revisa los datos y vuelve a intentarlo.','The report could not be generated. Your attempt has not been finalized; check your details and try again.']
};
const tr=k=>texts[k]?.[language==='en'?1:0]??k;
texts.rules=['Este examen está protegido con diversas medidas de seguridad. Mantén la página visible, con foco y en pantalla completa. No utilices atajos de teclado ni intentes abrir plugins, devtools o cambiar de ventana o se cerrará el examen automáticamente.','Keep this page visible, focused and in fullscreen. Don\'t use keyboard shortcuts neither plugings, devtools or change the window or the exam will auto finish.'];
texts.instructions=['Responde por escrito a 14 preguntas. Al finalizar se descargará automáticamente un TXT con el código comprimido, se copiará el mismo código y se abrirá Google Forms. Revisa los campos y pulsa Enviar allí. Este examen volverá al selector de idioma.','Answer 14 questions in writing. Finishing automatically downloads a TXT file with the compressed code, copies the same code and opens Google Forms. Review the fields and click Submit there. This exam then returns to language selection.'];
texts.finishInfo=['Al finalizar el examen, se descargará una copia codificada y se pasará otra al formulario de entrega.','At the end of the exam, it will download a cypher copy automatically and other will pass to the form'];
texts.confirmBody=['Las respuestas quedarán bloqueadas. Se descargará un TXT con el código comprimido y se copiará el mismo código para Google Forms. Debes pulsar Enviar en el formulario. Después, este examen volverá al selector de idioma.','Your answers will be locked. A TXT file containing the compressed code will download, and the same code will be copied for Google Forms. You must click Submit in the form. This exam will then return to language selection.'];
texts.deliveryNote=['Conserva el TXT como copia de la entrega generada. La entrega solo se registra cuando pulsas Enviar en Google Forms. Si el código es demasiado largo para el enlace, pégalo en el campo del contenido.','Keep the TXT as a copy of your generated submission. Your submission is only recorded when you click Submit in Google Forms. If the code is too long for the link, paste it into the content field.'];
texts.receipt=['Descargar comprobante TXT','Download TXT receipt'];
texts.receiptRequested=['Descarga del comprobante solicitada. Si no aparece, pulsa «Descargar comprobante TXT».','Receipt download requested. If it does not appear, click “Download TXT receipt”.'];
texts.receiptError=['No se pudo iniciar la descarga. La entrega sigue guardada; vuelve a descargar el comprobante.','The download could not be started. Your submission is still saved; download the receipt again.'];
texts.compressionError=['Este navegador no permite comprimir la entrega. Actualízalo o consulta al profesor. El intento no se ha finalizado.','This browser cannot compress the submission. Update it or contact your teacher. The attempt has not been finalized.'];
texts.rules=['Mantén la página visible, con foco y en pantalla completa. Las dos primeras salidas generan avisos. La tercera cierra el intento y genera una entrega con tus respuestas actuales, sin borrarlas. Se bloquean y registran las teclas de función, Control, botón derecho, copiar, cortar, pegar y arrastrar, cuando el navegador permite detectarlos. Estos usos no suman avisos de salida.','Keep this page visible, focused and in fullscreen. The first two departures trigger warnings. The third closes the attempt and generates a submission with your current answers, without deleting them. Function keys, Control, right-click, copy, cut, paste and drag actions are blocked and logged when the browser allows detection. These actions do not add departure warnings.'];
texts.firstText=['Primer aviso. Tus respuestas se conservan. La tercera incidencia cerrará el intento y generará una entrega con el contenido actual.','First warning. Your answers are retained. The third incident will close the attempt and generate a submission with your current answers.'];
texts.lastText=['Segundo aviso. La próxima incidencia cerrará el intento y generará automáticamente una entrega con tus respuestas actuales.','Second warning. The next incident will close the attempt and automatically generate a submission with your current answers.'];
texts.closing=['Cierre automático: respuestas conservadas','Automatic closure: answers retained'];
texts.forcedPending=['Se ha alcanzado el tercer aviso. Se está generando la entrega con tus respuestas conservadas.','The third warning has been reached. Your submission is being generated with your answers retained.'];
texts.forcedError=['No se pudo generar la entrega automática. Tus respuestas siguen guardadas y bloqueadas. Pulsa Reintentar entrega.','The automatic submission could not be generated. Your answers remain saved and locked. Click Retry submission.'];
texts.forcedRetry=['Reintentar entrega','Retry submission'];
texts.auditInfo=['Se registran el tipo de acción bloqueada, su fecha y hora y el número de usos. No se registran la escritura normal ni el contenido del portapapeles.','The type, timestamp and count of blocked actions are logged. Ordinary typing and clipboard contents are not recorded.'];
texts.privacy=texts.privacy.map((text,i)=>text+' '+texts.auditInfo[i]);
for(const [id,anchor]of [['receipt-download','delivery-retry'],['recovery-download','recover-delivery']]){
 const button=document.createElement('button');button.id=id;button.type='button';button.className='secondary';button.dataset.text='receipt';$(anchor).after(button);
 button.addEventListener('click',()=>downloadReceipt(guard.canDownloadReport()?rememberDelivery($('report').value):lastDelivery));
}
const receiptStatus=document.createElement('p');receiptStatus.id='receipt-status';receiptStatus.setAttribute('role','status');$('receipt-download').after(receiptStatus);
function setLanguage(lang){
 language=lang;document.documentElement.lang=lang||'es';
 document.querySelectorAll('[data-text]').forEach(el=>el.textContent=tr(el.dataset.text));
 $('delivery-retry').textContent=tr('copyOpen');
 fields.forEach((f,i)=>$('label-'+f.id).textContent=QUESTION_BANK[lang||'es'][i]);
 applyQuestionOrder();
 progress();
}
function validIdentity(){
 const email=$('student').value.trim();
 return !!$('fullname').value.trim() && $('student').validity.valid && /^[^\s@]+@g\.educaand\.es$/i.test(email);
}
function canStart(){return !!language&&$('guard-consent').checked&&validIdentity();}
function timeSpent(at=Date.now()){return elapsed+(started===null?0:Math.max(0,at-started));}
function clock(){const sec=Math.floor(timeSpent()/1000);$('clock').textContent=String(Math.floor(sec/60)).padStart(2,'0')+':'+String(sec%60).padStart(2,'0');}
function startClock(){if(questionOrder===null){questionOrder=shuffledOrder();applyQuestionOrder();}if(started===null)started=Date.now();clock();}
function stopClock(at=Date.now()){elapsed=timeSpent(at);started=null;clock();}
function progress(){
 const n=fields.filter(f=>$(f.id).value.trim()).length;
 $('progress').value=n;$('progress').setAttribute('aria-label',n+tr('progress'));$('progressText').textContent=n+tr('progress');
 for(const f of fields){const done=!!$(f.id).value.trim();$('nav-'+f.id).classList.toggle('answered',done);$('status-'+f.id).textContent=tr(done?'answered':'unanswered');$('count-'+f.id).textContent=$(f.id).value.length+' / 2000'+tr('chars');}
}
async function encodeReport(text){
 const stream=new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
 const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
 let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 return 'WEB3G.'+btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
function empty(){return {values:Object.fromEntries(ids.map(id=>[id,''])),questionOrder:null,language:null,elapsed:0,started:null,report:'',reportEncoding:'gzip-base64url'};}
function sanitize(data){
 if(!data||typeof data!=='object'||!data.values||typeof data.values!=='object'||Array.isArray(data.values))throw Error('Invalid state');
 const out=empty();
 if(data.questionOrder===undefined)out.questionOrder=canonicalOrder();
 else if(data.questionOrder!==null){
   if(!Array.isArray(data.questionOrder)||data.questionOrder.length!==14||new Set(data.questionOrder).size!==14||!data.questionOrder.every(n=>Number.isInteger(n)&&n>=1&&n<=14))throw Error('Invalid question order');
   out.questionOrder=[...data.questionOrder];
 }
 for(const id of ids){const v=data.values[id];if(v!==undefined&&typeof v!=='string')throw Error('Invalid field');out.values[id]=(v||'').slice(0,$(id).maxLength);}
 if(data.language!==null&&data.language!==undefined&&!['en','es'].includes(data.language))throw Error('Invalid language');
 out.language=data.language||null;
 out.elapsed=Number.isFinite(data.elapsed)&&data.elapsed>=0?Math.min(data.elapsed,31536000000):0;
 out.started=Number.isFinite(data.started)&&data.started>0&&data.started<=Date.now()?data.started:null;
 if(data.report!==undefined&&typeof data.report!=='string')throw Error('Invalid report');
 if((data.report||'').length>2000000)throw Error('Report too long');
 out.report=data.report||'';out.reportEncoding=out.report&&!out.report.startsWith('WEB3G.')?'base64':'gzip-base64url';return out;
}
function snapshot(){return {values:Object.fromEntries(ids.map(id=>[id,$(id).value])),questionOrder:questionOrder?[...questionOrder]:null,language,elapsed,started,report:$('report').value,reportEncoding:$('report').value&&!$('report').value.startsWith('WEB3G.')?'base64':'gzip-base64url'};}
function restore(data){
 questionOrder=data.questionOrder?[...data.questionOrder]:null;
 for(const id of ids)$(id).value=data.values[id]||'';
 elapsed=data.elapsed;started=data.started??null;$('report').value=data.report||'';
 if(data.language)setLanguage(data.language);
 applyQuestionOrder();
 clock();progress();
}
function setEnabled(enabled){$('answer-fields').disabled=!enabled;$('reflection-fields').disabled=!enabled;}
function setReport(report){$('report').value=report;}
function afterRender(state,ctx){
 phase=state.phase;
 const active=phase==='active',submitted=phase==='submitted'||phase==='closing';
 $('language-stage').hidden=!!language||active||submitted;
 $('setup-stage').hidden=!language||submitted||recoveryMode;
 $('guard-panel').hidden=!language||submitted;$('guard-panel').inert=!language;
 document.querySelector('.setup-only').hidden=active||phase==='reset';
 $('active-status').hidden=!active&&phase!=='reset';
 $('event-details').hidden=!active&&phase!=='reset';
 $('cuaderno').hidden=!active;$('cuaderno').inert=!active;
 $('delivery-stage').hidden=!submitted&&!recoveryMode;
 if(phase==='closing'){
   if(!$('delivery-status').textContent)$('delivery-status').textContent=tr('forcedPending');
   $('delivery-retry').textContent=tr('forcedRetry');
   $('delivery-retry').disabled=!!ctx.forcedBusy;
 } else if(phase==='submitted'&&!pendingURL){$('delivery-retry').textContent=tr('copyOpen');$('delivery-retry').disabled=delivering;}
 $('receipt-download').disabled=phase==='closing';
 $('download').hidden=true;
 document.querySelector('.identity').hidden=!$('guard-consent').checked;
 $('fullname').disabled=active||submitted;$('student').disabled=active||submitted;
 $('guard-start').textContent=tr('start');
 $('guard-state').textContent=tr(active?($('answer-fields').disabled?'blocked':'active'):phase);
 $('guard-count').textContent=(language==='en'?'Incidents: ':'Incidencias: ')+state.count+'/3';
 $('guard-conditions').textContent=(language==='en'?'Fullscreen: ':'Pantalla completa: ')+(document.fullscreenElement?'✓':'—')+' · '+(language==='en'?'Focus: ':'Foco: ')+(document.hasFocus()?'✓':'—')+' · '+(language==='en'?'Visible: ':'Visible: ')+(document.visibilityState==='visible'?'✓':'—');
 $('saveStatus').textContent=ctx.problem?tr('saveError'):state.savedAt?tr('saved')+new Date(state.savedAt).toLocaleTimeString(language==='en'?'en-GB':'es-ES'):tr('saveReady');
 $('identity-error').textContent=$('guard-consent').checked&&($('student').value||$('fullname').value)&&!validIdentity()?tr('identityError'):'';
 if(state.pending){
 const k=state.pending;
 $('guard-warning-title').textContent=tr(k==='reset'?'resetTitle':k);
 $('guard-warning-text').textContent=tr(k+'Text');
 $('guard-warning-count').textContent=$('guard-count').textContent;
 $('guard-continue').textContent=tr(active?'continue':'understood');
 }
 if(language==='en')translateErrors();
 if(language==='en')for(const el of $('guard-log').children)el.textContent=el.textContent
   .replace(/Comienzo del intento (\d+)\. Normas aceptadas\./g,'Attempt $1 started. Terms accepted.')
   .replaceAll('Intento reanudado en pantalla completa.','Attempt resumed in fullscreen.')
   .replaceAll('Respuestas vaciadas; intento detenido.','Answers cleared; attempt stopped.')
   .replaceAll('Intento finalizado. Exportación del informe habilitada.','Attempt finished. Report delivery enabled.')
   .replaceAll('Incidencia ','Incident ').replaceAll('Mismo episodio: ','Same episode: ')
   .replaceAll('(sin sumar otra incidencia).','(no additional incident).')
   .replaceAll('página oculta','page hidden').replaceAll('pérdida de foco','focus lost')
   .replaceAll('salida de pantalla completa','fullscreen exited').replaceAll('recarga o cierre','reload or close');
 $('recovery').hidden=!language||active||submitted||recoveryMode||!lastDelivery;
 $('recovery-message').textContent=tr('recovery');
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
'Se produjo un error de JavaScript. El examen está bloqueado. No borres los datos: avisa al profesor. El último guardado correcto se conserva.':'A JavaScript error occurred. The exam is locked. Do not delete any data; contact your teacher. The last successful save is retained.',
'No se pudo generar el informe. No se ha finalizado el intento; revisa los datos y vuelve a intentarlo.':texts.genericError[1]
};
function translateErrors(){for(const id of ['guard-problem-text','guard-action-status','guard-warning-error','guard-boot-detail','reportStatus']){const el=$(id);if(errorTranslations[el.textContent])el.textContent=errorTranslations[el.textContent];}}
function confirmText(kind){if(kind==='finish'){$('guard-confirm-title').textContent=tr('confirmTitle');$('guard-confirm-text').textContent=tr('confirmBody');}}
async function makeReport(metadata,final,finishedAt=Date.now(),context={}){
 if(!validIdentity()){$('reportStatus').textContent=tr('identityError');return null;}
 // Compact, versioned report avoids repeating the public question text in a prefilled URL.
 if(typeof CompressionStream!=='function'){$('reportStatus').textContent=tr('compressionError');return null;}
 const data={exam:'WEB-01',version:3,language,name:$('fullname').value.trim(),email:$('student').value.trim().toLowerCase(),finishedAt:new Date(finishedAt).toISOString(),seconds:Math.floor(timeSpent(finishedAt)/1000),presentationOrder:questionOrder?[...questionOrder]:canonicalOrder(),answers:fields.map((f,i)=>({question:i+1,answer:$(f.id).value.trim().slice(0,2000)})),notes:$('reflection').value.trim().slice(0,2000),...context,audit:metadata,url:location.href};
 const body=JSON.stringify(data);
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body))),b=>b.toString(16).padStart(2,'0')).join('');
 return encodeReport(body+'\nCódigo de comprobación: WEB3-'+hash);
}
function rememberDelivery(report){
 if(lastDelivery?.code===report)return lastDelivery;
 const item={code:report,name:$('fullname').value.trim(),language:language||'es'};
 lastDelivery=item;
 try{sessionStorage.setItem(RECOVERY,JSON.stringify(item));}catch{/* Current submitted state still preserves the report. */}
 return item;
}
function formURL(item){
 const url=new URL(FORM);url.searchParams.set('usp','pp_url');
 url.searchParams.set('entry.346661486',item.name);
 url.searchParams.set('entry.1438887233','examen unidad 01');
 url.searchParams.set('entry.1197951345',item.code);
 const long=url.href.length>7000;
 if(long)url.searchParams.delete('entry.1197951345');
 return {url:url.href,long};
}
let pendingURL=null;
async function deliver(item,reset=true){
 if(delivering)return;
 delivering=true;$('delivery-retry').disabled=true;$('delivery-status').textContent=tr('copying');
 // Copy while this document is still focused. A blocked popup leaves the report intact.
 try{
   if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable');
   await navigator.clipboard.writeText(item.code);
 }catch{
   $('delivery-status').textContent=tr('clipboardError');delivering=false;$('delivery-retry').disabled=false;return;
 }
 const dest=formURL(item);
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
function downloadReceipt(item){
 if(!item?.code)return false;
 let url;
 try{
  url=URL.createObjectURL(new Blob([item.code],{type:'text/plain;charset=utf-8'}));
  const link=document.createElement('a');
  link.href=url;link.download='comprobante-unidad-01-'+item.code.slice(-16).replace(/[^a-zA-Z0-9_-]/g,'')+'.txt';
  document.body.append(link);link.click();link.remove();
  requestedReceipts.add(item.code);
  $('receipt-status').textContent=tr('receiptRequested');
  return true;
 }catch{$('receipt-status').textContent=tr('receiptError');return false;}
 finally{if(url)setTimeout(()=>URL.revokeObjectURL(url),60000);}
}
function downloadReport(){
 const item=rememberDelivery($('report').value);
 if(!requestedReceipts.has(item.code)&&!downloadReceipt(item))return;
 return deliver(item);
}
function onReset(){recoveryMode=false;setLanguage(null);pendingURL=null;$('delivery-retry').textContent=tr('copyOpen');$('delivery-status').textContent='';window.scrollTo(0,0);}
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
for(const id of ['student','fullname'])$(id).addEventListener('input',()=>guard?.render());
$('guard-consent').addEventListener('change',()=>guard?.render());
document.querySelectorAll('[data-language]').forEach(el=>el.addEventListener('click',()=>{setLanguage(el.dataset.language);guard.render();window.scrollTo(0,0);}));
$('back-language').addEventListener('click',()=>{setLanguage(null);$('guard-consent').checked=false;guard.render();});
for(const id of [...fields.map(f=>f.id),'reflection'])$(id).addEventListener('input',()=>{if(!guard.canEdit())return;$(id).value=$(id).value.slice(0,2000);progress();guard.saveEdit();});
$('lab').addEventListener('submit',e=>e.preventDefault());
setInterval(clock,1000);
try{const item=JSON.parse(sessionStorage.getItem(RECOVERY));if(item&&typeof item.code==='string'&&item.code.length<2000000&&typeof item.name==='string'&&['es','en'].includes(item.language))lastDelivery=item;}catch{}
setLanguage(null);
guard=window.createPracticeGuard({empty,sanitize,snapshot,restore,setEnabled,startClock,stopClock,downloadReport,makeReport,setReport,canStart,afterRender,confirmText,onReset,
forcedError(){$('delivery-status').textContent=tr('forcedError');},
isAnswer(el){return el instanceof HTMLElement&&ids.includes(el.id);},
restoreValue(el,data){el.value=data.values[el.id]||'';}
});
document.querySelectorAll('[data-language]').forEach(el=>el.disabled=false);
window.addEventListener('error',()=>{if(language==='en')translateErrors();});
window.addEventListener('unhandledrejection',()=>{if(language==='en')translateErrors();});
})();

