(() => {
'use strict';
const $=id=>document.getElementById(id);
let selected=null,revision=null,serial=0,busy=false,session=null,endpoint='';
const storageKey='base3-profesor-session-v1';
const messages={
 AUTH:'Clave incorrecta o no se pudo verificar con el servidor de control.',
 AUTH_CONFIG:'No está configurado el servidor de control.',
 SESSION:'La sesión ha caducado. Introduce de nuevo la clave del profesor.',
 NOT_FOUND:'Esta entrega no se encuentra en la hoja. Comprueba que fue recibida y que su código completo está en la columna I.',
 AMBIGUOUS:'Hay varias filas con la misma entrega. Revisa los duplicados en la hoja.',
 GRADE_COLUMN:'Debe existir una única columna con la cabecera «nota», después de las columnas A–I.',
 COMMENTS_COLUMN:'Debe existir una única columna «Comentarios a la nota» en la hoja.',
 RECEIVER_VERSION:'Actualiza Code.gs y publica una nueva versión para guardar comentarios.',
 CONFLICT:'La nota o los comentarios cambiaron en la hoja. Pulsa «Actualizar nota» antes de volver a guardar.',
 TIMEOUT:'No se recibió respuesta. Actualiza la nota para comprobar si se guardó antes de reintentar.',
 NOT_CONFIGURED:'No hay un receptor de Google Sheets configurado.',
 SCHEMA:'Las cabeceras de la hoja no coinciden con las esperadas.',
 BUSY:'La hoja está ocupada. Inténtalo de nuevo.',
 NETWORK:'No se pudo conectar con el receptor.',
 STORAGE:'No se pudo acceder a la nota. Comprueba la implementación de Apps Script.'
};
function status(text,error=false){$('nota-status').textContent=text;$('nota-status').classList.toggle('alerta',error);}
function remember(value){
 session=value;
 try{if(value)localStorage.setItem(storageKey,JSON.stringify(value));else localStorage.removeItem(storageKey);}catch{
  if(value)status('Sesión iniciada; este navegador no permite recordarla al cerrar.');
 }
}
function render(){
 const logged=!!session;
 $('nota-login').hidden=logged;
 $('nota-logout').hidden=!logged;
 $('nota-session').textContent=logged?'Sesión recordada hasta '+new Date(session.expiresAt).toLocaleDateString('es-ES'):'Accede con la clave del profesor.';
 const valid=selected&&selected.intact&&!selected.draft;
 $('nota-value').disabled=busy||!logged||!valid||revision===null;
 $('nota-comments').disabled=$('nota-value').disabled;
 $('nota-save').disabled=busy||!logged||!valid||revision===null;
 $('nota-refresh').disabled=busy||!logged||!valid;
 $('nota-enter').disabled=busy;
 $('nota-logout').disabled=busy;
}
function request(data){
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint))return Promise.reject(Error('NOT_CONFIGURED'));
 return new Promise((resolve,reject)=>{
  const channel=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
  const url=new URL(endpoint);url.searchParams.set('mode','grade');url.searchParams.set('channel',channel);
  const frame=document.createElement('iframe');frame.hidden=true;frame.title='Gestión de notas';
  let peer=null,origin='',sent=false;
  const cleanup=()=>{clearTimeout(timer);window.removeEventListener('message',receive);frame.remove();};
  const fail=code=>{cleanup();reject(Error(code));};
  const timer=setTimeout(()=>fail('TIMEOUT'),90000);
  function receive(event){
   const m=event.data;
   if(!/^https:\/\/(?:[a-z0-9-]+-)?script\.googleusercontent\.com$/.test(event.origin)||m?.channel!==channel||!event.source)return;
   if(m.type==='LAB_READY'&&!sent){
    sent=true;peer=event.source;origin=event.origin;
    peer.postMessage({type:'LAB_GRADE',channel,request:data},origin);
   }else if(m.type==='GRADE_RESULT'&&event.source===peer&&event.origin===origin){
    cleanup();resolve(m.result||{ok:false,code:'STORAGE'});
   }
  }
  window.addEventListener('message',receive);
  frame.onerror=()=>fail('NETWORK');frame.src=url.href;document.body.append(frame);
 });
}
const ready=fetch('contenido/config.json',{cache:'no-cache'}).then(async r=>{
 if(!r.ok)throw Error('NOT_CONFIGURED');
 const config=await r.json();endpoint=config.delivery?.type==='apps-script'?config.delivery.endpoint:'';
 try{
  const saved=JSON.parse(localStorage.getItem(storageKey));
  if(saved&&saved.endpoint===endpoint&&/^[a-f0-9]{64}$/.test(saved.token)&&saved.expiresAt>Date.now())session=saved;
 }catch{}
 render();
}).catch(()=>{status(messages.NOT_CONFIGURED,true);});
async function operate(action){
 await ready;
 if(busy)return;
 const item=selected,turn=++serial;
 if((action==='get'||action==='set')&&(!session||!item?.intact||item.draft))return;
 const key=$('nota-key').value;
 if(action==='login'&&!key){status('Introduce la clave del profesor.',true);return;}
 busy=true;render();status(action==='set'?'Guardando nota y comentarios…':action==='login'?'Iniciando sesión…':action==='logout'?'Cerrando sesión…':'Consultando la nota actual…');
 try{
  const result=await request(action==='login'?{action,key}:{
   action,token:session?.token,submissionId:item?.id,
   ...(action==='set'?{nota:$('nota-value').value,comentarios:$('nota-comments').value,revision}: {})
  });
  if(turn!==serial)return;
  if(!result.ok){
   if(result.code==='SESSION'){remember(null);revision=null;}
   if(result.code==='CONFLICT')revision=null;
   throw Error(result.code||'STORAGE');
  }
  if(action==='login'){
   if(!/^[a-f0-9]{64}$/.test(result.token)||!Number.isFinite(result.expiresAt))throw Error('STORAGE');
   remember({token:result.token,expiresAt:result.expiresAt,endpoint});$('nota-key').value='';
   status('Sesión iniciada.');
  }else if(action==='logout'){
   remember(null);revision=null;$('nota-value').value='';$('nota-comments').value='';status('Sesión cerrada.');
  }else{
   if(result.submissionId!==item.id||typeof result.nota!=='string'||typeof result.revision!=='string')throw Error('STORAGE');
   if(typeof result.comentarios!=='string')throw Error('RECEIVER_VERSION');
   revision=result.revision;$('nota-value').value=result.nota;$('nota-comments').value=result.comentarios;
   status(action==='set'?'Nota y comentarios guardados en la hoja.':result.nota===''?'Sin calificar: la celda está vacía.':'Nota actual de la hoja.');
  }
 }catch(error){
  if(turn!==serial)return;
  if(action==='logout'){remember(null);revision=null;$('nota-value').value='';$('nota-comments').value='';}
  if(action==='set'||action==='get')revision=null;
  status(messages[error.message]||'No se pudo completar la operación.',true);
 }finally{
  if(turn===serial){busy=false;render();if(action==='login'&&session&&selected)void operate('get');}
 }
}
window.addEventListener('review-selection',async event=>{
 ++serial;busy=false;selected=event.detail;revision=null;$('nota-value').value='';$('nota-comments').value='';
 render();
 if(!selected){status('Selecciona una entrega.');return;}
 if(selected.draft||!selected.intact){status('La nota solo está disponible para entregas íntegras, no para borradores.');return;}
 await ready;
 if(session)void operate('get');else status('Inicia sesión para consultar o modificar la nota.');
});
$('nota-enter').addEventListener('click',()=>void operate('login'));
$('nota-key').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void operate('login');}});
$('nota-refresh').addEventListener('click',()=>void operate('get'));
$('nota-save').addEventListener('click',()=>void operate('set'));
$('nota-logout').addEventListener('click',()=>void operate('logout'));
render();
})();

