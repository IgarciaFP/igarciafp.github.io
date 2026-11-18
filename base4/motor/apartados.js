/* Definición, estado y transporte de los apartados. Sin dependencias del navegador. */
(function(root){
'use strict';
const LANGS=['html','css','js','txt'],ID=/^[a-z0-9][a-z0-9-]{0,39}$/;
const MAX_SERIALIZED=90000;
const fail=message=>{throw Error(message);};
function type(value='webcode'){
 const result=String(value).toLowerCase();
 return ['webcode','qa','test'].includes(result)?result:fail('Tipo de apartado desconocido: '+value);
}
function definitions(activity){
 const explicit=activity.apartados!==undefined;
 const list=explicit?activity.apartados:[{id:'principal',tipo:activity.tipo, titulo:activity.title,archivos:activity.archivos}];
 if(!Array.isArray(list)||!list.length||list.length>20)fail('apartados debe contener entre 1 y 20 apartados.');
 const ids=new Set();
 return list.map((s,i)=>{
  if(!s||typeof s!=='object'||!ID.test(s.id)||ids.has(s.id))fail('Cada apartado necesita un id único, en minúsculas y con guiones.');
  ids.add(s.id);
  const title=s.titulo??('Apartado '+(i+1));
  if(typeof title!=='string'||!title.trim()||title.length>200)fail('Título de apartado inválido.');
  const files=s.archivos;
  if(files!==undefined&&(!Array.isArray(files)||files.some(x=>!LANGS.slice(0,3).includes(x))||new Set(files).size!==files.length))fail('archivos debe ser una lista sin duplicados con html, css o js.');
  return {id:s.id,type:type(s.tipo),title,files,path:explicit?'apartados/'+s.id+'/':''};
 });
}
function questions(value,kind){
 if(!Array.isArray(value)||!value.length||value.length>50)fail('preguntas.json debe contener entre 1 y 50 preguntas.');
 const ids=new Set();
 return value.map(q=>{
  if(!q||!ID.test(q.id)||ids.has(q.id))fail('Cada pregunta necesita un id único.');
  ids.add(q.id);
  if(typeof q.enunciado!=='string'||!q.enunciado.trim()||q.enunciado.length>2000)fail('Enunciado de pregunta inválido.');
  if(kind==='test'&&(!Array.isArray(q.opciones)||q.opciones.length!==4||q.opciones.some(v=>typeof v!=='string'||!v.trim()||v.length>1000)||new Set(q.opciones).size!==4))fail('Cada pregunta de Test necesita cuatro alternativas distintas.');
  return {id:q.id,text:q.enunciado,...(kind==='test'?{options:q.opciones.slice()}:{})};
 });
}
async function load(activity,folder,read,optional){
 const defs=definitions(activity);
 const sections=await Promise.all(defs.map(async s=>{
  const path=folder+s.path,statement=await read(path+'enunciado.html').then(r=>r.text());
  if(s.type!=='webcode')return {...s,statement,questions:questions(await read(path+'preguntas.json').then(r=>r.json()),s.type)};
  const values=await Promise.all(LANGS.slice(0,3).map(ext=>s.files===undefined?optional(path+'codigo.'+ext):s.files.includes(ext)?read(path+'codigo.'+ext).then(r=>r.text()):''));
  if(!values[0].trim())values[0]=await optional('contenido/esqueleto.html');
  if(values.some(v=>v.length>10000))fail('El código de partida supera los 10000 caracteres por archivo.');
  return {...s,statement,code:{html:values[0],css:values[1],js:values[2],txt:''}};
 }));
 if(JSON.stringify(sections.map(s=>({id:s.id,type:s.type,title:s.title,questions:s.questions}))).length>200000)fail('Los enunciados y alternativas superan el tamaño admitido para una actividad.');
 sanitize(sections,initial(sections));
 return sections;
}
function initial(sections){return {active:sections[0].id,values:Object.fromEntries(sections.map(s=>[s.id,s.type==='webcode'?{...s.code}:Object.fromEntries(s.questions.map(q=>[q.id,'']))]))};}
function sanitize(sections,data){
 if(!data||!data.values||typeof data.values!=='object')fail('Estado de apartados inválido.');
 const out=initial(sections);
 if(!sections.some(s=>s.id===data.active))fail('Apartado activo inválido.');
 out.active=data.active;
 for(const s of sections){
  const values=data.values[s.id];
  if(!values||typeof values!=='object')fail('Faltan respuestas del apartado '+s.id);
  for(const key of Object.keys(out.values[s.id])){
   const value=values[key];
   if(typeof value!=='string'||value.length>(s.type==='test'?1:key==='txt'?9900:10000))fail('Respuesta inválida en '+s.id+'/'+key);
   if(s.type==='test'&&!/^$|^[0-3]$/.test(value))fail('Alternativa inválida.');
   out.values[s.id][key]=value;
  }
 }
 if(JSON.stringify(out).length>MAX_SERIALIZED)fail('Se ha alcanzado el límite total de respuestas de esta actividad (90 000 caracteres serializados).');
 return out;
}
// El receptor existente admite diez respuestas de 10 000 caracteres. Los fragmentos
// contienen TODO el estado, incluida la respuesta vacía; no se pierde ningún apartado.
function pack(sections,data){
 const state=sanitize(sections,data),json=JSON.stringify(state);
 return Array.from({length:Math.ceil(json.length/9000)},(_,i)=>({question:'apartados-'+String(i+1).padStart(2,'0'),answer:json.slice(i*9000,(i+1)*9000),status:'teacher-review'}));
}
function unpack(answers){
 const parts=answers.filter(a=>/^apartados-\d{2}$/.test(a.question)).sort((a,b)=>a.question.localeCompare(b.question));
 if(!parts.length)return null;
 if(parts.length>10||parts.some((p,i)=>p.question!=='apartados-'+String(i+1).padStart(2,'0')||typeof p.answer!=='string'||p.answer.length>9000))fail('Entrega de apartados incompleta.');
 return JSON.parse(parts.map(p=>p.answer).join(''));
}
const api={LANGS,definitions,questions,load,initial,sanitize,pack,unpack};
if(typeof module==='object'&&module.exports)module.exports=api;
else root.LabSections=api;
})(typeof window==='object'?window:globalThis);
