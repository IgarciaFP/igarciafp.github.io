(() => {
'use strict';
const $=id=>document.getElementById(id);
let endpoint='',serial=0;
function request(data){
 if(!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint))return Promise.reject(Error('NOT_CONFIGURED'));
 return new Promise((resolve,reject)=>{
  const channel=Array.from(crypto.getRandomValues(new Uint8Array(16)),x=>x.toString(16).padStart(2,'0')).join('');
  const url=new URL(endpoint);url.searchParams.set('mode','grade');url.searchParams.set('channel',channel);
  const frame=document.createElement('iframe');frame.hidden=true;frame.title='Consulta de calificación';
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
}).then(()=>true,()=>false);
window.addEventListener('review-selection',async event=>{
 const turn=++serial,item=event.detail;
 $('review-grade-value').textContent='—';$('review-grade-comment').textContent='';
 const status=$('review-grade-status');
 if(!item){status.textContent='Selecciona una entrega.';return;}
 if(!item.intact||item.draft||!item.proof){status.textContent='No se puede consultar la nota de un borrador o una entrega alterada.';return;}
 status.textContent='Consultando la calificación…';
 try{
  if(!await ready)throw Error('NOT_CONFIGURED');
  const result=await request({action:'review',submissionId:item.id,proof:item.proof});
  if(turn!==serial)return;
  if(!result.ok)throw Error(result.code||'STORAGE');
  if(result.submissionId!==item.id||typeof result.nota!=='string'||typeof result.comentarios!=='string')throw Error('STORAGE');
  $('review-grade-value').textContent=result.nota!==''?result.nota:'Sin calificar';
  $('review-grade-comment').textContent=result.comentarios||'Sin comentarios.';
  status.textContent='';
 }catch(error){
  if(turn!==serial)return;
  status.textContent=error.message==='SESSION'||error.message==='INVALID'
   ?'La consulta de notas requiere actualizar la implementación del receptor.'
   :error.message==='NOT_FOUND'?'No se encontró esta entrega en la hoja.'
   :error.message==='TIMEOUT'?'El receptor no ha respondido. Vuelve a seleccionar la entrega.'
   :'No se pudo consultar la calificación. Vuelve a seleccionar la entrega.';
 }
});
$('review-close').addEventListener('click',()=>{++serial;window.close();location.replace('about:blank');});
})();
