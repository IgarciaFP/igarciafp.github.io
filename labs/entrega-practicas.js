// CONFIGURACIÓN DEL DOCENTE. El ID y la versión deben coincidir con Code.gs.
const CONFIG = Object.freeze({
  id: 'ENTREGA-PRACTICAS', version: '1', title: 'Entrega de prácticas',
  endpoint: 'https://script.google.com/macros/s/AKfycbz4YssPrSv-NqQZQ9HaiudXzGP56gu27JWa3DpO7FUQl7Pufh8jeaI_prKYpzONIL81/exec'
});
(() => {
  'use strict';
  const configured=delivery=>delivery?.type==='apps-script' && /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(delivery.endpoint || '');
  const googleOrigin=origin=>/^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(origin);
  const IDLE_MS=300000;
  let active=null;

  function connect(delivery,practiceId) {
    const channel=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
    const url=new URL(delivery.endpoint);
    url.searchParams.set('practice',practiceId);url.searchParams.set('channel',channel);
    const frame=document.createElement('iframe');frame.hidden=true;frame.title='Recepción de entrega';
    let resolveReady,rejectReady,peer=null,peerOrigin=null,timer,pending=null;
    const connection={endpoint:delivery.endpoint,practiceId,closed:false,busy:false,
      ready:new Promise((resolve,reject)=>{resolveReady=resolve;rejectReady=reject;})};
    // La precarga puede fallar sin que el alumno haya intentado enviar todavía.
    connection.ready.catch(()=>{});
    function close(code='NETWORK') {
      if(connection.closed)return;
      connection.closed=true;clearTimeout(timer);
      window.removeEventListener('message',receive);frame.remove();
      if(active===connection)active=null;
      rejectReady(Error(code));
      if(pending){const p=pending;pending=null;p.reject(Error(code));}
    }
    connection.close=close;
    function receive(event) {
      const m=event.data;
      if(!googleOrigin(event.origin)||m?.channel!==channel||!event.source)return;
      if(m.type==='LAB_READY'&&!peer){
        // HtmlService usa un iframe adicional: responder al emisor de Google.
        peer=event.source;peerOrigin=event.origin;
        clearTimeout(timer);timer=setTimeout(()=>close('EXPIRED'),IDLE_MS);
        resolveReady();
      } else if(m.type==='LAB_RESULT'&&pending&&event.source===peer&&event.origin===peerOrigin){
        const result=m.result;
        if(!result?.ok){close(result?.code||'STORAGE');return;}
        if(result.submissionId!==pending.envelope.submissionId||typeof result.receivedAt!=='string'||!Number.isFinite(Date.parse(result.receivedAt))){close('INVALID_RECEIPT');return;}
        const p=pending;pending=null;close();
        p.resolve({submissionId:result.submissionId,receivedAt:result.receivedAt});
      }
    }
    connection.submit=envelope=>new Promise((resolve,reject)=>{
      if(connection.closed){reject(Error('NETWORK'));return;}
      if(connection.busy){reject(Error('BUSY'));return;}
      connection.busy=true;pending={envelope,resolve,reject};
      clearTimeout(timer);timer=setTimeout(()=>close('TIMEOUT'),60000);
      try{peer.postMessage({type:'LAB_SUBMIT',channel,envelope},peerOrigin);}catch{close('NETWORK');}
    });
    window.addEventListener('message',receive);
    timer=setTimeout(()=>close('TIMEOUT'),30000);
    frame.onerror=()=>close('NETWORK');frame.src=url.href;document.body.append(frame);
    return connection;
  }
  function acquire(delivery,practiceId) {
    if(!configured(delivery))throw Error('NOT_CONFIGURED');
    if(active&&!active.closed&&active.endpoint===delivery.endpoint&&active.practiceId===practiceId)return active;
    if(active?.busy)throw Error('BUSY');
    active?.close();active=connect(delivery,practiceId);return active;
  }
  async function prepare(delivery,practiceId) {
    try{await acquire(delivery,practiceId).ready;return true;}catch{return false;}
  }
  async function send(delivery,envelope) {
    const connection=acquire(delivery,envelope.practiceId);
    await connection.ready;
    return connection.submit(envelope);
  }
  window.addEventListener('pagehide',()=>active?.close());
  window.LabDelivery=Object.freeze({configured,prepare,send});
})();


async function hash(text){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),b=>b.toString(16).padStart(2,'0')).join('');}

async function comprobarEntrega(lenguaje,documento){
 const {analizarEntregaAsync}=await import('./ia/analizador-entregas.browser.mjs?v=1f155267');
 return analizarEntregaAsync(documento,lenguaje,{ortografia:{mostrarDetalle:false}});
}

// El laboratorio protegido comparte el receptor y el analizador con el formulario ordinario.
if (!document.documentElement.hasAttribute('data-entrega-protegida')) iniciarFormularioDeEntrega();
function iniciarFormularioDeEntrega(){
'use strict';
const $=id=>document.getElementById(id);
const delivery={type:'apps-script',endpoint:CONFIG.endpoint};
const fixedPractice = $('practice-name').defaultValue;
const baseKey = 'entrega-texto-v1:' + CONFIG.id + ':' + CONFIG.version;
const emailKey = baseKey + ':email';
const draftParam = new URLSearchParams(location.search).get('borrador') || '';
const draftId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draftParam) ? draftParam : '';
// Cada transferencia conserva su envío y justificante sin sustituir otras entregas.
const key = draftId ? baseKey + ':borrador:' + draftId : fixedPractice ? baseKey + ':' + fixedPractice : baseKey;
let current=null,busy=false,storageOK=true;
const urls={};
const validEmail=value=>/^[^\s@]+@g\.educaand\.es$/i.test(value);

async function encode(text){
 const stream=new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
 const bytes=new Uint8Array(await new Response(stream).arrayBuffer());
 let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
 return 'ENTREGA3G.'+btoa(binary).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
}
async function token(data){const body=JSON.stringify(data);return encode(body+'\nCódigo de comprobación: ENTREGA3-'+await hash(body));}
function notice(text,success=false){$('status').hidden=false;$('status').textContent=text;$('status').classList.toggle('success',success);}
function save(){try{localStorage.setItem(key,JSON.stringify(current));}catch{storageOK=false;}}
function link(id,code,name){if(urls[id])URL.revokeObjectURL(urls[id]);urls[id]=URL.createObjectURL(new Blob([code+'\n'],{type:'text/plain;charset=utf-8'}));$(id).href=urls[id];$(id).download=name;$(id).hidden=false;}
function refresh(){
 const pending=!!current;
 $('email').readOnly=pending||busy;$('text').readOnly=pending||busy;$('practice-name').readOnly=!!fixedPractice||pending||busy;
 $('submit').disabled=busy||!!current?.receipt||!LabDelivery.configured(delivery);
 $('submit').textContent=busy?'Enviando…':current?.receipt?'Entrega confirmada':pending?'Reintentar entrega':'Entregar práctica';
 $('edit').hidden=!pending;$('edit').disabled=busy;
 $('edit').textContent=current?.receipt?'Ver justificante':'Preparar otra entrega';
 $('count').textContent=$('text').value.length.toLocaleString('es-ES')+' / 10 000 caracteres';
}
function showSaving(){
 delete $('receipt').dataset.outcome;
 $('document-check').hidden=true;
 $('status').hidden=true;
 $('receipt-title').textContent='Guardando entrega…';
 $('receipt-progress').textContent='Espera mientras se guarda la práctica en Google Sheets.';
 $('receipt-progress').hidden=false;
 $('receipt-result').hidden=true;
 $('receipt-back').hidden=true;
 if(!$('receipt').open)$('receipt').showModal();
 $('receipt-title').focus();
}
function showDeliveryError(message){
 delete $('receipt').dataset.outcome;
 $('document-check').hidden=true;
 $('status').hidden=true;
 $('receipt-title').textContent=current?.receipt?'Entrega guardada':'No se ha podido confirmar la entrega';
 $('receipt-progress').textContent=message;
 $('receipt-progress').hidden=false;
 $('receipt-result').hidden=true;
 $('receipt-back').hidden=false;
 if(!$('receipt').open)$('receipt').showModal();
 $('receipt-back').focus();
}
$('receipt').addEventListener('cancel',event=>{if(busy)event.preventDefault();});
$('receipt-back').addEventListener('click',()=>{$('receipt').close();});
async function showReceipt(){
 const data=JSON.parse(current.envelope.payload);
 // Se conserva el esquema v3 de la base y se añade la confirmación del servidor.
 const code=await token({...data,receipt:current.receipt});
 const practiceFile=(data.practiceName||'Práctica anterior').normalize('NFC').replace(/[<>:"/\\|?*\u0000-\u001f]/g,'-').replace(/\s+/g,'-').replace(/-+/g,'-').replace(/^[-.]+|[-.]+$/g,'')||'practica';
 link('download',code,practiceFile+'-justificante-'+current.envelope.submissionId.slice(0,16)+'.txt');
 $('backup').hidden=true;$('status').hidden=true;
 $('receipt-details').textContent='Práctica: '+(data.practiceName||'Práctica anterior')+'\nFecha de recepción: '+new Date(current.receipt.receivedAt).toLocaleString('es-ES',{timeZone:'Europe/Madrid'})+' (hora de Madrid).\nID: '+current.receipt.submissionId;
 const percent=Number.isFinite(data.incidents)?data.incidents:current.envelope.incidents;
 const warning=Number.isFinite(percent)&&percent<=50;
 $('receipt').dataset.outcome=warning?'warning':'success';
 $('receipt-title').textContent=warning?'Entrega registrada con advertencia':'Entrega registrada correctamente';
 $('receipt-description').textContent=warning?'La entrega no será puntuada hasta su defensa.':'La entrega ha sido registrada correctamente.';
 $('document-check-title').textContent='No se puede verificar autoría.';
 $('document-check-message').textContent='La entrega no será puntuada hasta su defensa.';
 $('document-check').hidden=true;
 if(warning)$('receipt-title').textContent='No se puede verificar autoría.';
 $('receipt-progress').hidden=true;$('receipt-progress').textContent='';
 $('receipt-result').hidden=false;$('receipt-back').hidden=true;
 if(!$('receipt').open)$('receipt').showModal();
 $('another').focus();
 if(!current.downloadRequested){$('download').click();current.downloadRequested=true;save();}
}
async function backup(){
 const data=JSON.parse(current.envelope.payload);
 const code=await token({...data,deliveryStatus:'pending',submissionId:current.envelope.submissionId});
 link('backup',code,'copia-pendiente-'+current.envelope.submissionId.slice(0,16)+'.txt');
}
// Adaptador del contrato del analizador compartido de labs/ia.

async function confirmDocumentScore(percent,verificationDetails){
 // Compatibilidad con el receptor existente: el cero se guarda sin pedir confirmación.
 return {percent,verificationDetails,zeroFinalConfirmation:percent===0};
}
async function checkDocument(documentText,pendingPercent){
 const panel=$('document-check'),message=$('document-check-message');
 panel.hidden=true;message.textContent='';
 $('status').hidden=true;
 delete $('receipt').dataset.outcome;
 $('document-check-title').textContent='Comprobación del documento';
 $('receipt-title').textContent='Comprobación del documento';
 $('receipt-progress').textContent='Verificando documento...';
 $('receipt-progress').hidden=false;
 $('receipt-result').hidden=true;
 $('receipt-back').hidden=true;
 $('document-check-progress').hidden=false;
 if(!$('receipt').open)$('receipt').showModal();
 $('receipt-title').focus();
 let allowed=false,analysisTimer;
 try{
  // Dejar visible el progreso durante un intervalo aleatorio de 2 a 4 segundos.
  const delay=new Promise(resolve=>setTimeout(resolve,2000+Math.random()*2000));
  const analysis=Promise.resolve().then(()=>comprobarEntrega("JS",documentText))
   .then(result=>({result}),error=>({error}));
  const timeout=new Promise(resolve=>{analysisTimer=setTimeout(()=>resolve({error:new Error("Tiempo de comprobación agotado")}),15000);});
  const [outcome]=await Promise.all([Promise.race([analysis,timeout]),delay]);
  clearTimeout(analysisTimer);
  if(outcome.error)throw outcome.error;
  const result=outcome.result;
  if(!Array.isArray(result)||result.length!==3||typeof result[0]!=='boolean')throw Error('La comprobación del documento ha devuelto una respuesta no válida.');
  const [a,b,c]=result;
  if(a){
   // El analizador puede devolver un mensaje o una lista de incidencias.
   const messages=(Array.isArray(c)?c:[c])
    .map(item=>typeof item==='string'?item:item?.mensaje||item?.message||'')
    .filter(Boolean);
   message.textContent=messages.join('\n')||'No se ha podido verificar el documento';
   return false;
  }
  if(typeof b!=='number'||!Number.isFinite(b)||b<0||b>100)throw Error('La comprobación del documento ha devuelto un porcentaje no válido.');
  const decision=await confirmDocumentScore(Number.isFinite(pendingPercent)?pendingPercent:b,c);
  allowed=!!decision;
  return decision;
 }catch(error){
  const decision=await confirmDocumentScore(Number.isFinite(pendingPercent)?pendingPercent:51,'El documento no se ha podido verificar. Tras la entrega será revisado.');
  allowed=!!decision;
  return decision;
 }finally{
  clearTimeout(analysisTimer);
  $('document-check-progress').hidden=true;
  $('receipt-progress').hidden=true;
  panel.hidden=allowed;
   if(!allowed&&$('receipt').open){$('receipt-back').hidden=false;$('receipt-back').focus();}
 }
}
$('form').addEventListener('submit',async event=>{
 event.preventDefault();if(busy||current?.receipt)return;
 const email=$('email').value.trim().toLowerCase();
 const practiceName=$('practice-name').value.trim();
 $('practice-name').setCustomValidity(practiceName?'':'Escribe el nombre de la práctica.');
 $('email').setCustomValidity(validEmail(email)?'':'Usa un correo del dominio g.educaand.es.');
 $('text').setCustomValidity($('text').value.trim()?'':'Pega el texto de tu práctica.');
 if(!$('form').reportValidity())return;
 if(!LabDelivery.configured(delivery)){notice('El receptor de Google Sheets todavía no está configurado.');return;}
 busy=true;refresh();
 // En los reintentos se comprueba exactamente el texto del envío pendiente.
 let verified=false;
 try{
  const documentText=current?JSON.parse(current.envelope.payload).answers[0].answer:$('text').value;
  verified=await checkDocument(documentText,current?JSON.parse(current.envelope.payload).incidents:undefined);
 }catch{showDeliveryError('No se ha podido verificar el documento');}
 if(!verified){busy=false;refresh();return;}
 showSaving();
 try{
  if(!current){
   const data={exam:CONFIG.id,activityVersion:CONFIG.version,version:3,language:'es',name:'',email,practiceName,group:'',module:'DWEC',notes:'',incidents:verified.percent,verificationDetails:verified.verificationDetails,zeroFinalConfirmation:verified.zeroFinalConfirmation===true,finishedAt:new Date().toISOString(),seconds:0,answers:[{question:practiceName,answer:$('text').value,status:'teacher-review'}],url:location.href};
   const payload=JSON.stringify(data);
   current={envelope:{protocol:1,submissionId:await hash(payload),practiceId:CONFIG.id,practiceVersion:CONFIG.version,payload}};save();
  }
  // Compatibilidad con entregas pendientes anteriores, sin cambiar su ID ni su payload.
  if(!Number.isFinite(JSON.parse(current.envelope.payload).incidents)){
   current.envelope.incidents=verified.percent;save();
  }
  if(!Object.prototype.hasOwnProperty.call(JSON.parse(current.envelope.payload),'verificationDetails')){
   current.envelope.verificationDetails=verified.verificationDetails;save();
  }
  current.envelope.zeroFinalConfirmation=verified.zeroFinalConfirmation===true;save();
  await backup();
  current.receipt=await LabDelivery.send(delivery,current.envelope);save();
  await showReceipt();
 }catch(error){
  if(current?.receipt){showDeliveryError('Google Sheets ha guardado la entrega, pero no se pudo preparar el justificante. Recarga para volver a generarlo. ID: '+current.receipt.submissionId);}
  else if(error.message==='FINAL_DELIVERY')showDeliveryError('No se permite otra entrega de esta práctica: ya confirmaste una entrega definitiva sin Inteligencia humana detectada.');
  else if(error.message==='ZERO_CONFIRMATION')showDeliveryError('No se ha podido guardar la entrega. Reintenta el envío.');
  else showDeliveryError('No se ha podido confirmar la recepción. Reintenta el envío: se conservará el mismo identificador para evitar duplicados. Puedes descargar una copia pendiente; esa copia no confirma la entrega.'+(storageOK?'':' No se pudo guardar la copia en este navegador. Descárgala antes de cerrar.'));
 }finally{busy=false;refresh();}
});
$('practice-name').addEventListener('input',()=>{$('practice-name').setCustomValidity('');});
$('email').addEventListener('input',()=>{$('email').setCustomValidity('');});
$('text').addEventListener('input',()=>{$('text').setCustomValidity('');$('document-check').hidden=true;refresh();});
function anotherDelivery(){
 if(busy)return;
 if(current&&!current.receipt&&!confirm('La recepción está pendiente. Si continúas, ya no podrás reintentar esta misma entrega desde aquí. Descarga antes la copia pendiente. ¿Continuar?'))return;
 const email=$('email').value;
 current=null;
 try{localStorage.removeItem(key);localStorage.setItem(emailKey,email);}catch{}
 if($('receipt').open)$('receipt').close();
 $('text').value='';$('practice-name').value=fixedPractice;$('practice-name').setCustomValidity('');$('email').value=email;
 $('text').setCustomValidity('');$('email').setCustomValidity('');
 $('backup').hidden=true;$('status').hidden=true;$('document-check').hidden=true;
 for(const id of Object.keys(urls)){URL.revokeObjectURL(urls[id]);delete urls[id];$(id).removeAttribute('href');}
 if(fixedPractice)$('text').dispatchEvent(new Event('input'));
 void LabDelivery.prepare(delivery,CONFIG.id);
 refresh();window.scrollTo({top:0,behavior:'instant'});$('email').focus({preventScroll:true});
}
$('another').addEventListener('click',anotherDelivery);
$('edit').addEventListener('click',()=>{if(current?.receipt){$('receipt').showModal();}else anotherDelivery();});
$('email').addEventListener('change',()=>{try{localStorage.setItem(emailKey,$('email').value);}catch{}});
async function init(){
 $('title').textContent=fixedPractice||CONFIG.title;document.title=fixedPractice||CONFIG.title;
 $('setup').hidden=LabDelivery.configured(delivery);
 if(!window.crypto?.subtle||typeof CompressionStream!=='function'){notice('Abre esta página por HTTPS con un navegador actualizado para generar el justificante.');$('submit').disabled=true;return;}
 try{
  $('email').value=localStorage.getItem(emailKey)||'';
  const raw=localStorage.getItem(key);
  if(raw){
   const item=JSON.parse(raw),e=item.envelope,d=JSON.parse(e.payload);
   if(e.practiceId!==CONFIG.id||e.practiceVersion!==CONFIG.version||await hash(e.payload)!==e.submissionId||!validEmail(d.email)||typeof d.answers?.[0]?.answer!=='string')throw Error('INVALID');
   if(item.receipt&&(item.receipt.submissionId!==e.submissionId||!Number.isFinite(Date.parse(item.receipt.receivedAt))))throw Error('INVALID');
   current=item;$('email').value=d.email;$('text').value=d.answers[0].answer;$('practice-name').value=d.practiceName||'Práctica anterior';
   if(current.receipt)await showReceipt();else{await backup();notice('Hay una entrega pendiente en este navegador. Pulsa «Reintentar entrega» para comprobar su recepción.');}
  }
 }catch{notice('No se pudo recuperar la copia guardada. Revisa los datos antes de enviar.');}
 if(!current && draftId){
  try{
   const draft=JSON.parse(localStorage.getItem('laboratorio-entrega:'+draftId));
   if(!draft||!validEmail(draft.email)||typeof draft.practiceName!=='string'||!draft.practiceName.trim()||draft.practiceName.length>100||typeof draft.text!=='string'||draft.text.length>10000)throw Error('INVALID_DRAFT');
   if(fixedPractice && fixedPractice!==draft.practiceName)throw Error('WRONG_PRACTICE');
   $('email').value=draft.email;
   $('practice-name').value=fixedPractice||draft.practiceName;
   $('text').value=draft.text;
   notice('Datos cargados desde el laboratorio. Revisa el contenido y pulsa «Entregar práctica».');
  }catch{notice('No se pudo recuperar el código del laboratorio. Vuelve al laboratorio para abrir de nuevo la entrega o utiliza la copia TXT.');}
 }
 refresh();
}
void init().then(()=>{
 if(!current?.receipt && window.crypto?.subtle)void LabDelivery.prepare(delivery,CONFIG.id);
});
// Recuperar la conexión tras una pausa larga, sin sondeos periódicos.
document.addEventListener('visibilitychange',()=>{
 if(document.visibilityState==='visible'&&!busy&&!current?.receipt)void LabDelivery.prepare(delivery,CONFIG.id);
});
$('form').addEventListener('focusin',()=>{
 if(!busy&&!current?.receipt)void LabDelivery.prepare(delivery,CONFIG.id);
});
}
