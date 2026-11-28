(function(){
'use strict';
const model=window.ReviewModel,records=new Map();let selected=null;
const binding=item=>({id:item.id,module:item.reviewModule||item.module,activity:item.activity,version:item.activityVersion});
const element=(tag,text,className)=>{const node=document.createElement(tag);if(text!==undefined)node.textContent=text;if(className)node.className=className;return node;};
const labels={correct:'Correcto',partial:'Parcialmente correcto',incorrect:'Incorrecto',unanswered:'Sin responder',unverified:'Pendiente de comprobar'};
const points=score=>score.earned===null?'Pendiente · máximo '+score.max:score.earned+' / '+score.max+' puntos';
function state(item){
 let entry=records.get(item.id);
 if(!entry){entry={item,analysis:null,analysisIssue:'',questions:[],tab:'html'};records.set(item.id,entry);readAnalysis(entry,item.reviewAnalysis);if(!entry.analysis&&item.reviewAnalysisIssue)entry.analysisIssue=item.reviewAnalysisIssue;entry.loading=loadSolution(entry);}
 else entry.item=item;
 return entry;
}
function readAnalysis(entry,value){try{entry.analysis=model.analysis(value,binding(entry.item));entry.analysisIssue='';}catch(error){entry.analysis=null;entry.analysisIssue=error.message;}}
async function loadSolution(entry){
 const request=entry.solutionRequest=(entry.solutionRequest||0)+1;entry.solution=null;entry.solutionIssue='';
 const item=entry.item,key=item.known?.key||(item.module&&item.activity?String(item.module).toLowerCase()+'/'+item.activity:'');
 if(!/^(diw|dwec|ssii)\/[a-z0-9][a-z0-9-]{0,59}$/.test(key))return;
 const version=item.activityVersion===undefined?item.known?.version:String(item.activityVersion),paths=[];
 const modelVersion=entry.analysis?.solutionVersion;if(modelVersion&&/^[a-zA-Z0-9_-]{1,80}$/.test(modelVersion))paths.push('soluciones/'+modelVersion+'/solucion.json');
 if(version!==undefined&&/^[a-zA-Z0-9_-]{1,80}$/.test(version))paths.push('soluciones/'+version+'/solucion.json');
 paths.push('solucion.json');
 for(const path of paths)try{
  const response=await fetch(new URL('actividades/'+key+'/'+path,location.href),{cache:'no-cache'});if(response.status===404)continue;if(!response.ok)throw Error('No se pudo leer la solución.');
  const solution=model.solution(await response.json(),{module:key.split('/')[0],activity:key.split('/')[1],...(version===undefined?{}:{version}),...(modelVersion?{solutionVersion:modelVersion}:{})});
  if(request!==entry.solutionRequest)return;entry.solution=solution;entry.solutionIssue='';refresh(entry);return;
 }catch(error){if(request!==entry.solutionRequest)return;entry.solutionIssue=error.message;}
 if(request===entry.solutionRequest)refresh(entry);
}
function feedback(item){
 const box=element('section',undefined,'review-feedback '+item.status);box.append(element('h4',item.title+' · '+points(item.score)),element('p',labels[item.status]));
 if(item.summary)box.append(element('p',item.summary));
 for(const [field,label]of [['positives','Aciertos'],['errors','Errores'],['improvements','Cómo mejorar'],['evidence','Evidencias y pruebas']])if(item[field]?.length){
  box.append(element('strong',label));const list=element('ul');for(const text of item[field])list.append(element('li',text));box.append(list);
 }
 return box;
}
function summary(entry){
 if(selected!==entry.item.id)return;
 let panel=document.getElementById('review-detail-summary');if(!panel){panel=element('section',undefined,'review-detail-summary');panel.id='review-detail-summary';document.getElementById('review-sections')?.before(panel);}
 if(!panel)return;panel.replaceChildren(element('h3','Análisis de la nota'));
 if(entry.analysis){
  const a=entry.analysis;panel.append(element('strong',points(a.score)),element('p',a.summary));
  if(a.bonus){const base=a.sections.some(s=>s.score.earned===null)?'Pendiente':a.sections.reduce((sum,s)=>sum+s.score.earned,0);panel.append(element('p','Nota base: '+base+' / '+a.score.max+' · Extra: +'+a.bonus.points+' · '+a.bonus.reason+' · Máximo final: '+a.score.max,'review-detail-note'));}
  if(a.identity)panel.append(element('p','Identidad confirmada por el profesor: '+a.identity.studentId+'; el documento original figura como '+a.identity.sourceStudentId+'. '+a.identity.reason,'review-detail-note'));
  panel.append(element('p','Revisión IA'+(a.generatedAt?' · '+a.generatedAt:'')+' · Rúbrica '+(a.rubricVersion||'sin versión indicada'), 'review-detail-note'));
  if(entry.grade!==undefined&&entry.grade!==''&&Number(String(entry.grade).replace(',','.'))!==a.score.earned)panel.append(element('p','Este desglose corresponde a la valoración IA. La calificación actual del profesor o de la hoja puede ser distinta.','review-detail-note'));
 }else panel.append(element('p',entry.analysisIssue||'Esta entrega no dispone de un análisis detallado. Su nota y sus comentarios siguen disponibles.','review-detail-note'));
 if(entry.solutionIssue)panel.append(element('p','Solución de referencia: '+entry.solutionIssue,'review-detail-note'));
}
function paintQuestion(entry,record){
 if(!record.article.isConnected)return;
 const section=entry.solution?.sections.find(s=>s.id===record.section.id),answer=section?.questions?.find(q=>q.id===record.question.id);
 const analysed=entry.analysis?.sections.find(s=>s.id===record.section.id)?.items.find(q=>q.id===record.question.id);
 let pair=record.article.querySelector(':scope > .review-answer-pair');
 if(answer){
  if(!pair){
   pair=element('div',undefined,'review-answer-pair');const student=element('div');student.append(element('h4','Respuesta del alumno'));
   for(const child of [...record.article.children].slice(1))if(!child.classList.contains('review-feedback'))student.append(child);
   pair.append(student,element('div'));record.article.append(pair);
  }
  const reference=pair.children[1];reference.replaceChildren(element('h4','Solución de referencia'));
  let expected=answer.answer;
  if(record.section.type==='test'&&answer.correctOption!==undefined)expected=String.fromCharCode(65+answer.correctOption)+'. '+(record.question.options?.[answer.correctOption]||answer.answer);
  const isCode=record.question.code||record.question.format==='gaps';
  const expectedNode=element(isCode?'pre':'p',expected,'review-model-text');if(isCode)expectedNode.classList.add('review-model-snippet');
  reference.append(expectedNode);if(answer.explanation)reference.append(element('p',answer.explanation,'review-detail-note'));
 }
 record.article.querySelector(':scope > .review-feedback')?.remove();if(analysed)record.article.append(feedback(analysed));
}
function code(entry){
 if(selected!==entry.item.id)return;
 const panels=document.querySelector('.detalle .paneles');if(!panels||panels.hidden)return;
 const sectionId=entry.item.reviewSelectedSection||entry.item.reviewSections?.find(s=>s.type==='webcode')?.id||'principal';
 const section=entry.solution?.sections.find(s=>s.id===sectionId&&s.type==='webcode');
 const analysed=entry.analysis?.sections.find(s=>s.id===sectionId&&s.type==='webcode');
 let panel=document.getElementById('review-model-code');
 if(!section&&!analysed){panel?.remove();panels.classList.remove('has-review-solution');return;}
 if(!panel){panel=element('section',undefined,'review-model-panel');panel.id='review-model-code';panels.firstElementChild.after(panel);}
 panels.classList.add('has-review-solution');panel.replaceChildren(element('h3',section?'Solución modelo · '+entry.tab.toUpperCase():'Análisis del código'));
 if(section)panel.append(element('p',section.explanation||'Solución de referencia: se admiten implementaciones equivalentes.','review-detail-note'),element('pre',section.code[entry.tab]||'(Sin contenido en esta pestaña)'));
 if(analysed)for(const criterion of analysed.items)panel.append(feedback(criterion));
}
function refresh(entry){summary(entry);for(const record of entry.questions)paintQuestion(entry,record);code(entry);}
window.ReviewDetailed={
 question(article,item,section,question){const entry=state(item);entry.questions=entry.questions.filter(r=>r.article.isConnected);const record={article,section,question};entry.questions.push(record);paintQuestion(entry,record);},
 code(item,tab){const entry=state(item);entry.tab=tab;code(entry);},
 analysis(id,value,issue){const entry=records.get(id);if(!entry)return;const previous=entry.analysis?.solutionVersion;readAnalysis(entry,value);if(issue)entry.analysisIssue=String(issue);if(entry.analysis?.solutionVersion!==previous){entry.solution=null;entry.loading=loadSolution(entry);}refresh(entry);},
 grade(id,value){const entry=records.get(id);if(entry){entry.grade=value;summary(entry);}}
};
window.addEventListener('review-selection',event=>{selected=event.detail?.id||null;const item=event.detail?.reviewItem;if(item)refresh(state(item));});
})();
