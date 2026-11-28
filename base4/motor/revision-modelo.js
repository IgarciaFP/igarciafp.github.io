/* Formatos de revisión: el informe original y su comprobación permanecen intactos. */
(function(root){
'use strict';
const PREFIX='BASE4R1.',ID=/^[a-z0-9][a-z0-9-]{0,79}$/;
const fail=()=>{throw Error('Formato de revisión no válido.');};
function text(v,max=10000){if(typeof v!=='string'||v.length>max)fail();return v;}
function activity(v){if(!v||!['diw','dwec','ssii'].includes(String(v.module).toLowerCase())||!ID.test(v.id)||!['string','number'].includes(typeof v.version)||!String(v.version).trim())fail();return {module:v.module.toLowerCase(),id:v.id,version:text(String(v.version),80)};}
function bound(a,b){if(b.module&&String(b.module).toLowerCase()!==a.module||b.activity&&b.activity!==a.id||b.version!==undefined&&String(b.version)!==a.version)throw Error('La revisión corresponde a otra actividad o versión.');}
function score(v){if(!v||!Number.isFinite(v.max)||v.max<=0||v.max>100||v.earned!==null&&(!Number.isFinite(v.earned)||v.earned<0||v.earned>v.max))fail();return {earned:v.earned,max:v.max};}
function list(v){if(v===undefined)return [];if(!Array.isArray(v)||v.length>30)fail();return v.map(t=>text(t,4000));}
function unique(items){const ids=new Set();for(const v of items){if(!ID.test(v.id)||ids.has(v.id))fail();ids.add(v.id);}return items;}
function total(items){return {max:items.reduce((s,v)=>s+v.score.max,0),earned:items.some(v=>v.score.earned===null)?null:items.reduce((s,v)=>s+v.score.earned,0)};}
function agrees(a,b){if(Math.abs(a.max-b.max)>.02||(a.earned===null)!==(b.earned===null)||a.earned!==null&&Math.abs(a.earned-b.earned)>.02)fail();}
function analysis(value,binding={}){
 if(value===null||value===undefined||value==='')return null;
 if(typeof value==='string'){if(value.length>50000)fail();value=JSON.parse(value);}
 if(!value||value.format!=='base4-analysis-v1'||JSON.stringify(value).length>50000||!/^[a-f0-9]{64}$/i.test(value.submissionId))fail();
 if(binding.id&&binding.id!==value.submissionId)throw Error('El análisis corresponde a otra entrega.');
 const a=activity(value.activity);bound(a,binding);
 if(!Array.isArray(value.sections)||!value.sections.length||value.sections.length>20)fail();
 const sections=unique(value.sections.map(section=>{
  if(!['webcode','qa','test'].includes(section.type)||!Array.isArray(section.items)||!section.items.length||section.items.length>100)fail();
  const items=unique(section.items.map(item=>{
   if(!['correct','partial','incorrect','unanswered','unverified'].includes(item.status))fail();
   return {id:item.id,title:text(item.title||item.id,2000),status:item.status,score:score(item.score),summary:text(item.summary||'',8000),positives:list(item.positives),errors:list(item.errors),improvements:list(item.improvements),evidence:list(item.evidence)};
  }));
  const points=score(section.score);agrees(points,total(items));return {id:section.id,type:section.type,title:text(section.title||section.id,2000),score:points,items};
 }));
 const points=score(value.score);agrees(points,total(sections));
 return {format:value.format,submissionId:value.submissionId,attemptId:text(value.attemptId||'',100),activity:a,generatedAt:text(value.generatedAt||'',100),rubricVersion:text(value.rubricVersion||'',200),solutionVersion:text(value.solutionVersion||a.version,200),score:points,summary:text(value.summary||'',8000),sections};
}
function solution(value,binding={}){
 if(!value||value.format!=='base4-solution-v1'||JSON.stringify(value).length>250000)fail();
 const a=activity(value.activity);bound(a,binding);
 if(!Array.isArray(value.sections)||!value.sections.length||value.sections.length>20)fail();
 const sections=unique(value.sections.map(section=>{
  if(!['webcode','qa','test'].includes(section.type))fail();
  if(section.type==='webcode')return {id:section.id,type:section.type,explanation:text(section.explanation||''),code:Object.fromEntries(['html','css','js'].map(key=>[key,text(section.code?.[key]||'')]))};
  if(!Array.isArray(section.questions)||section.questions.length>100)fail();
  return {id:section.id,type:section.type,questions:unique(section.questions.map(question=>{
   if(question.correctOption!==undefined&&(!Number.isInteger(question.correctOption)||question.correctOption<0||question.correctOption>3))fail();
   return {id:question.id,answer:text(question.answer||''),explanation:text(question.explanation||''),...(question.correctOption===undefined?{}:{correctOption:question.correctOption})};
  }))};
 }));
 const revision=text(value.revision||a.version,80);if(binding.solutionVersion&&binding.solutionVersion!==revision)throw Error('La solución corresponde a otra revisión del modelo.');
 return {format:value.format,activity:a,revision,createdAt:text(value.createdAt||'',100),sections};
}
const encode=bytes=>{let s='';for(const n of bytes)s+=String.fromCharCode(n);return btoa(s).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');};
async function pack(document,value){
 if(value===null||value===undefined||value==='')return text(document,3000000);
 const review={format:'base4-review-v1',document:text(document,3000000),analysis:analysis(value)};
 const bytes=await new Response(new Blob([JSON.stringify(review)]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
 return PREFIX+encode(new Uint8Array(bytes));
}
async function unpack(value){
 value=String(value).trim();if(!value.startsWith(PREFIX))return {document:value,analysis:null};
 const code=value.slice(PREFIX.length);if(code.length>4000000||!/^[A-Za-z0-9_-]+$/.test(code))fail();
 const bytes=Uint8Array.from(atob(code.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
 const reader=new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();let size=0;const parts=[];
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>3100000){await reader.cancel();fail();}parts.push(value);}}finally{reader.releaseLock();}
 const data=JSON.parse(await new Blob(parts).text());if(data.format!=='base4-review-v1')fail();
 // Un análisis inválido no impide abrir la entrega histórica original.
 let checked=null,issue='';try{checked=analysis(data.analysis);}catch(error){issue=error.message;}
 return {document:text(data.document,3000000),analysis:checked,issue};
}
const api={PREFIX,analysis,solution,pack,unpack};if(typeof module==='object'&&module.exports)module.exports=api;else root.ReviewModel=api;
})(typeof window==='object'?window:globalThis);
