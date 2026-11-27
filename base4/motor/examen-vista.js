window.createSectionView=function(sections,hooks){
 'use strict';
 const model=window.LabSections,$=id=>document.getElementById(id);
 let state=model.initial(sections),enabled=false;
 const nav=$('section-nav'),fields=$('question-fields'),web=document.querySelector('.paneles');
 const active=()=>sections.find(s=>s.id===state.active),text=(es,en)=>hooks.language?.()==='en'?en:es;
 const pointsText=value=>new Intl.NumberFormat(hooks.language?.()==='en'?'en':'es',{maximumFractionDigits:2}).format(value)+' '+text(value===1?'punto':'puntos',value===1?'point':'points');
 function capture(){
  const next=structuredClone(state),s=active();
  if(s.type==='webcode')next.values[s.id]=hooks.readCode();
  else for(const q of s.questions){
   const controls=[...fields.querySelectorAll('[data-question]')].filter(el=>el.dataset.question===q.id);
   next.values[s.id][q.id]=q.format==='gaps'?model.gapAnswer(controls.map(el=>el.value)):s.type==='test'?controls.find(el=>el.checked)?.value||'':controls[0]?.value||'';
  }
  next.presentationSeed=hooks.presentationSeed?.()||state.presentationSeed;
  state=model.sanitize(sections,next);return structuredClone(state);
 }
 const hasNext=()=>sections.findIndex(s=>s.id===state.active)<sections.length-1;
 function next(){
  if(hasNext())navigate(sections[sections.findIndex(s=>s.id===state.active)+1].id);
 }
 function navigate(id){
  if(!hooks.canEdit()||id===state.active)return;
  void hooks.clearClipboard?.();
  try{capture();state.active=id;render();hooks.save();$('section-heading').focus({preventScroll:true});}
  catch(error){$('section-status').textContent=error.message;}
 }
 function codeNode(source){
  const code=document.createElement('code'),tokens=/(\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:const|let|function|if|else|for|return|switch|case|break|default|true|false|null|undefined)\b|\b\d+(?:\.\d+)?\b)/g;
  let last=0;
  for(const match of source.matchAll(tokens)){
   code.append(document.createTextNode(source.slice(last,match.index)));
   const span=document.createElement('span'),token=match[0];span.className=token.startsWith('//')?'code-comment':/^["'`]/.test(token)?'code-string':/^\d/.test(token)?'code-number':'code-keyword';
   span.textContent=token;code.append(span);last=match.index+token.length;
  }code.append(document.createTextNode(source.slice(last)));return code;
 }
 function showCode(box,q){
  const pre=document.createElement('pre');pre.className='exam-code';pre.setAttribute('aria-label',text('Fragmento de JavaScript','JavaScript snippet'));
  if(q.format!=='gaps'){pre.append(codeNode(q.code));box.append(pre);return;}
  const values=model.gapValues(q,state.values[active().id][q.id]),chunks=q.code.split('____'),line=document.createElement('code');
  chunks.forEach((chunk,i)=>{
   line.append(...codeNode(chunk).childNodes);if(i===chunks.length-1)return;
   const input=document.createElement('input');input.type='text';input.className='code-gap';input.dataset.question=q.id;input.dataset.gap=String(i);input.value=values[i];input.maxLength=500;
   input.id='answer-'+active().id+'-'+q.id+'-'+i;input.autocomplete='off';input.spellcheck=false;input.placeholder='…';
   input.setAttribute('aria-label',q.text+' · '+text('Hueco','Blank')+' '+(i+1));input.style.width=Math.max(7,Math.min(40,input.value.length+2))+'ch';line.append(input);
  });pre.append(line);box.append(pre);
 }
 function render(){
  const s=active();state.presentationSeed=hooks.presentationSeed?.()||state.presentationSeed;state=model.sanitize(sections,state);
  $('activity-text').innerHTML=s.statement;$('section-heading').textContent=s.title+(Number.isFinite(s.points)?' · '+pointsText(s.points):'');$('section-heading').tabIndex=-1;nav.hidden=sections.length===1;
  nav.replaceChildren(...sections.map(section=>{const button=document.createElement('button');button.type='button';button.textContent=section.title;button.setAttribute('aria-current',String(section.id===s.id));button.disabled=!enabled;button.addEventListener('click',()=>navigate(section.id));return button;}));
  web.hidden=s.type!=='webcode';fields.hidden=s.type==='webcode';fields.disabled=!enabled;fields.replaceChildren();
  if(s.type==='webcode')hooks.writeCode(s.code,state.values[s.id]);
  else{
   hooks.stopPreview();
   for(const id of state.presentation.questions[s.id]){
    const q=s.questions.find(q=>q.id===id),box=document.createElement('fieldset'),legend=document.createElement('legend');box.className='exam-question';
    const heading=document.createElement('span');heading.className='question-label';heading.textContent=q.text;legend.append(heading);
    if(Number.isFinite(q.points)){const score=document.createElement('span');score.className='question-points';score.textContent=pointsText(q.points);legend.append(score);}
    box.append(legend);
    if(q.code)showCode(box,q);
    if(s.type==='qa'&&q.format!=='gaps'){
     const input=document.createElement('textarea');input.id='answer-'+s.id+'-'+q.id;input.dataset.question=q.id;input.rows=s.id==='b-consola'?3:5;input.maxLength=10000;input.value=state.values[s.id][q.id];
     input.placeholder=text('Escribe tu respuesta…','Write your answer…');input.setAttribute('aria-label',q.text);if(q.code)input.classList.add('code-answer');box.append(input);
    }else if(s.type==='test'){
     const options=document.createElement('div');options.className='test-options';
     for(const n of state.presentation.options[s.id][q.id]){
      const label=document.createElement('label'),input=document.createElement('input');input.type='radio';input.name='answer-'+s.id+'-'+q.id;input.id=input.name+'-'+n;input.dataset.question=q.id;input.value=String(n);input.checked=state.values[s.id][q.id]===String(n);
      const isCode=/^(?:const |let |function )/.test(q.options[n]);
      const content=isCode?codeNode(q.options[n]):document.createElement('span');
      if(isCode)content.className='test-code';else content.textContent=q.options[n];
      label.append(input,content);options.append(label);
     }box.append(options);
     const clear=document.createElement('button');clear.type='button';clear.className='clear-answer';clear.textContent=text('Borrar selección','Clear selection');clear.addEventListener('click',()=>{if(!hooks.canEdit())return;capture();state.values[s.id][q.id]='';render();hooks.save();});box.append(clear);
    }fields.append(box);
   }
  }hooks.changed?.();
 }
 function edited(event){
  if(!event.target.matches('[data-question]')||!hooks.canEdit())return;
  if(event.target.matches('.code-gap'))event.target.style.width=Math.max(7,Math.min(40,event.target.value.length+2))+'ch';
  try{capture();$('section-status').textContent='';hooks.save();}catch(error){render();$('section-status').textContent=error.message;}
 }
 fields.addEventListener('input',edited);fields.addEventListener('change',edited);
 return {hasNext,next,snapshot:capture,restore(data){state=model.sanitize(sections,data);render();},
  enabled(value){enabled=value;fields.disabled=!value;for(const button of nav.querySelectorAll('button'))button.disabled=!value;},
  isAnswer:el=>fields.contains(el)&&el.matches('[data-question]'),isWeb:()=>active().type==='webcode',
  acceptCode(){try{capture();$('section-status').textContent='';return true;}catch(error){render();$('section-status').textContent=error.message;return false;}},answers:()=>model.pack(sections,capture()),render};
};
