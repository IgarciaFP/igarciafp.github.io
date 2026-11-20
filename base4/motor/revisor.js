(() => {
'use strict';
const $=id=>document.getElementById(id);
const publication='https://docs.google.com/spreadsheets/d/e/2PACX-1vRMw9xmc9Cvjo5NMVegaNqtm7Zp_kmvLmJ3acc0Em4G4KkCjuh_9-D2-PrFTyx16zWtPErTqFaPoUWZ/pub';
const sheets={diw:'1751875470',dwec:'116140541',ssii:'1210214667'};
let serial=0,controller;
function csv(text){
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='"'){
   if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;
  }else if(ch===','&&!quoted){row.push(cell);cell='';}
  else if((ch==='\n'||ch==='\r')&&!quoted){
   if(ch==='\r'&&text[i+1]==='\n')i++;
   row.push(cell);rows.push(row);row=[];cell='';
  }else cell+=ch;
 }
 if(quoted)throw Error('FORMAT');
 if(cell!==''||row.length){row.push(cell);rows.push(row);}
 return rows;
}
const normal=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const activityKey=value=>normal(value).replace(/^(diw|dwec|ssii)[\s-]*/,'').replace(/[^a-z0-9]+/g,'');
function findGrade(rows,item){
 const headers=(rows.shift()||[]).map(x=>normal(x.replace(/^\uFEFF/,'')));
 const column=name=>{const indexes=headers.map((h,i)=>h===name?i:-1).filter(i=>i>=0);if(indexes.length!==1)throw Error('FORMAT');return indexes[0];};
 const attempt=column('id entrega'),user=column('id'),activity=column('nombre actividad'),grade=column('nota'),comment=column('comentario a la nota');
 const own=rows.filter(r=>normal(r[user])===normal(item.user));
 let found=item.attemptId?own.filter(r=>r[attempt]===item.attemptId):[];
 if(!found.length){
  const keys=new Set([item.activityTitle,item.label,item.activity].map(activityKey).filter(Boolean));
  found=own.filter(r=>keys.has(activityKey(r[activity])));
 }
 if(!found.length)throw Error('NOT_FOUND');
 if(found.length!==1)throw Error('AMBIGUOUS');
 return {nota:found[0][grade]||'',comentarios:found[0][comment]||''};
}
window.addEventListener('review-selection',async event=>{
 const turn=++serial,item=event.detail;
 controller?.abort();controller=new AbortController();
 $('review-grade-value').textContent='—';$('review-grade-comment').textContent='';
 const status=$('review-grade-status');
 if(!item){status.textContent='Selecciona una entrega.';return;}
 if(!item.intact||item.draft){status.textContent='No se puede consultar la nota de un borrador o una entrega alterada.';return;}
 const gid=sheets[String(item.module||'').toLowerCase()];
 if(!gid||!item.user){status.textContent='No se pudo identificar el módulo o el ID de esta entrega.';return;}
 status.textContent='Consultando la publicación…';
 const timer=setTimeout(()=>{if(turn===serial)controller.abort();},20000);
 try{
  const url=new URL(publication);url.searchParams.set('gid',gid);url.searchParams.set('single','true');url.searchParams.set('output','csv');
  const response=await fetch(url,{credentials:'omit',cache:'no-store',signal:controller.signal});
  if(!response.ok)throw Error('NETWORK');
  const result=findGrade(csv(await response.text()),item);
  if(turn!==serial)return;
  $('review-grade-value').textContent=result.nota!==''?result.nota:'Sin calificar';
  $('review-grade-comment').textContent=result.comentarios||'Sin comentarios.';
  status.textContent='';
 }catch(error){
  if(turn!==serial)return;
  status.textContent=error.message==='NOT_FOUND'
   ?'No hay una calificación publicada para este ID y actividad.'
   :error.message==='AMBIGUOUS'?'Hay varias filas para este ID y actividad. No se puede determinar una única calificación.'
   :error.message==='FORMAT'?'La publicación no contiene las columnas esperadas.'
   :'No se pudo leer la hoja pública. Vuelve a seleccionar la entrega para reintentar.';
 }finally{clearTimeout(timer);}
});
$('review-close').addEventListener('click',()=>{++serial;controller?.abort();window.close();location.replace('about:blank');});
})();
