(function(root){
'use strict';
const model=root.LabSections||(typeof module==='object'?require('./apartados.js'):null);
const originalQuestions=model.questions,originalLoad=model.load,originalInitial=model.initial,originalSanitize=model.sanitize;
function random(seed){let h=2166136261;for(const char of seed){h^=char.charCodeAt(0);h=Math.imul(h,16777619);}return ()=>{h+=0x6D2B79F5;let t=Math.imul(h^(h>>>15),1|h);t^=t+Math.imul(t^(t>>>7),61|t);return ((t^(t>>>14))>>>0)/4294967296;};}
function shuffled(values,seed){const out=values.slice(),next=random(seed);for(let i=out.length-1;i>0;i--){const j=Math.floor(next()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;}
function presentation(sections,seed=''){
 const order={questions:{},options:{}};
 for(const s of sections){
  if(s.type==='webcode')continue;
  const ids=s.questions.map(q=>q.id);order.questions[s.id]=s.type==='test'&&seed?shuffled(ids,seed+'|'+s.id):ids;
  if(s.type==='test')order.options[s.id]=Object.fromEntries(s.questions.map(q=>[q.id,seed?shuffled([0,1,2,3],seed+'|'+s.id+'|'+q.id):[0,1,2,3]]));
 }return order;
}
function gapValues(q,answer){
 const count=(q.code.match(/____/g)||[]).length;if(!answer)return Array(count).fill('');
 let values;try{values=JSON.parse(answer);}catch{throw Error('Respuesta de huecos inválida.');}
 if(!Array.isArray(values)||values.length!==count||values.some(v=>typeof v!=='string'||v.length>500))throw Error('Respuesta de huecos inválida.');return values;
}
function gapAnswer(values){return values.some(v=>v.trim())?JSON.stringify(values):'';}
function completedCode(q,answer){let at=0;const values=gapValues(q,answer);return q.code.replace(/____/g,()=>values[at++]||'____');}
function questions(value,kind){return originalQuestions(value,kind).map((q,i)=>{
 const raw=value[i],code=raw.codigo||'',format=raw.formato||'text';
 if(typeof code!=='string'||code.length>10000||!['text','gaps'].includes(format))throw Error('Formato de pregunta inválido.');
 if(format==='gaps'&&(kind!=='qa'||!(code.match(/____/g)||[]).length))throw Error('Los huecos necesitan un fragmento de código.');
  if(raw.puntos!==undefined&&(!Number.isFinite(raw.puntos)||raw.puntos<=0||raw.puntos>100))throw Error('Puntuación inválida.');
  return {...q,...(code?{code}:{}),format,...(raw.puntos!==undefined?{points:raw.puntos}:{})};
});}
async function load(activity,folder,read,optional){
 const sections=await originalLoad(activity,folder,read,optional);
 await Promise.all(sections.filter(s=>s.type!=='webcode').map(async s=>{s.questions=questions(await read(folder+s.path+'preguntas.json').then(r=>r.json()),s.type);}));return sections;
}
function initial(sections){return {...originalInitial(sections),presentationSeed:'',presentation:presentation(sections)};}
function sanitize(sections,data){
 const out=originalSanitize(sections,data),seed=data.presentationSeed||'';
 if(typeof seed!=='string'||seed.length>500)throw Error('Identidad del orden inválida.');
 for(const s of sections)if(s.type==='qa')for(const q of s.questions)if(q.format==='gaps')gapValues(q,out.values[s.id][q.id]);
 const result={...out,presentationSeed:seed,presentation:presentation(sections,seed)};
 if(JSON.stringify(result).length>90000)throw Error('Se ha alcanzado el límite total de respuestas.');
 return result;
}
function pack(sections,data){const json=JSON.stringify(sanitize(sections,data));if(json.length>90000)throw Error('Se ha alcanzado el límite total de respuestas.');return Array.from({length:Math.ceil(json.length/9000)},(_,i)=>({question:'apartados-'+String(i+1).padStart(2,'0'),answer:json.slice(i*9000,(i+1)*9000),status:'teacher-review'}));}
function incomplete(sections,data){
 const state=sanitize(sections,data),pending=[];
 for(const s of sections){
  if(s.type==='webcode'){if(!['html','css','js'].some(k=>state.values[s.id][k]!==s.code[k]))pending.push({id:s.id,title:s.title,type:s.type,count:1});}
  else {const count=s.questions.filter(q=>q.format==='gaps'?gapValues(q,state.values[s.id][q.id]).some(v=>!v.trim()):!state.values[s.id][q.id].trim()).length;if(count)pending.push({id:s.id,title:s.title,type:s.type,count});}
 }return pending;
}
Object.assign(model,{questions,load,initial,sanitize,pack,incomplete,presentation,gapValues,gapAnswer,completedCode,shuffled});
if(typeof module==='object'&&module.exports)module.exports=model;
})(typeof window==='object'?window:globalThis);
