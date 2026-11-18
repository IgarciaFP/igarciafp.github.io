/* Una vista reutilizable; las respuestas se conservan por id de apartado y pregunta. */
window.createSectionView=function(sections,hooks){
 'use strict';
 const model=window.LabSections,$=id=>document.getElementById(id);
 let state=model.initial(sections),enabled=false;
 const nav=$('section-nav'),fields=$('question-fields'),web=document.querySelector('.paneles');
 const active=()=>sections.find(s=>s.id===state.active);
 const controls=()=>[...fields.querySelectorAll('[data-question]')];
 function capture(){
  const next=JSON.parse(JSON.stringify(state)),s=active();
  if(s.type==='webcode')next.values[s.id]=hooks.readCode();
  else for(const el of controls())if(el.type!=='radio'||el.checked)next.values[s.id][el.dataset.question]=el.value;
  state=model.sanitize(sections,next);return JSON.parse(JSON.stringify(state));
 }
 function render(){
  const s=active();
  $('activity-text').innerHTML=s.statement;
  $('section-heading').textContent=s.title+' · '+(s.type==='qa'?'QA':s.type==='test'?'Test':'webcode');
  nav.hidden=sections.length===1;
  nav.replaceChildren(...sections.map((section,i)=>{
   const button=document.createElement('button');button.type='button';button.textContent=(i+1)+'. '+section.title;
   button.setAttribute('aria-current',String(section.id===s.id));button.disabled=!enabled;
   button.addEventListener('click',()=>{
    if(!hooks.canEdit())return;
    try{capture();state.active=section.id;render();hooks.save();}catch(error){$('section-status').textContent=error.message;}
   });return button;
  }));
  web.hidden=s.type!=='webcode';fields.hidden=s.type==='webcode';fields.disabled=!enabled;
  fields.replaceChildren();
  if(s.type==='webcode')hooks.writeCode(s.code,state.values[s.id]);
  else{
   hooks.stopPreview();
   s.questions.forEach((q,index)=>{
    const box=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=(index+1)+'. '+q.text;box.append(legend);
    if(s.type==='qa'){
     const input=document.createElement('textarea');input.id='answer-'+s.id+'-'+q.id;input.dataset.question=q.id;input.rows=5;input.maxLength=10000;input.value=state.values[s.id][q.id];
     input.setAttribute('aria-label',q.text);box.append(input);
    }else{
     q.options.forEach((option,n)=>{
      const label=document.createElement('label'),input=document.createElement('input');input.type='radio';input.name='answer-'+s.id+'-'+q.id;
      input.id=input.name+'-'+n;input.dataset.question=q.id;input.value=String(n);input.checked=state.values[s.id][q.id]===String(n);
      label.append(input,document.createTextNode(String.fromCharCode(65+n)+'. '+option));box.append(label);
     });
     const clear=document.createElement('button');clear.type='button';clear.className='secondary';clear.textContent='↺';clear.title='Dejar sin responder / Clear answer';clear.setAttribute('aria-label',clear.title);
     clear.addEventListener('click',()=>{if(!hooks.canEdit())return;capture();state.values[s.id][q.id]='';render();hooks.save();});box.append(clear);
    }
    fields.append(box);
   });
  }
 }
 function edited(event){
  if(!event.target.matches('[data-question]')||!hooks.canEdit())return;
  try{capture();$('section-status').textContent='';hooks.save();}
  catch(error){render();$('section-status').textContent=error.message;}
 }
 fields.addEventListener('input',edited);
 fields.addEventListener('change',edited);
 return {
  snapshot:capture,
  restore(data){state=model.sanitize(sections,data);render();},
  enabled(value){enabled=value;fields.disabled=!value;for(const button of nav.querySelectorAll('button'))button.disabled=!value;},
  isAnswer:el=>fields.contains(el)&&el.matches('[data-question]'),
  isWeb:()=>active().type==='webcode',
  acceptCode(){try{capture();$('section-status').textContent='';return true;}catch(error){render();$('section-status').textContent=error.message;return false;}},
  answers:()=>model.pack(sections,capture()),
  render
 };
};
