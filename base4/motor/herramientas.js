(function(root){
'use strict';
const KEYS=['colorPicker','calculadora','binarioDecimal','hexadecimalDecimal','traductor','apuntes','rubrica'];
function rubric(value){
 if(value==null)return null;
 const fail=()=>{throw Error('Revisa rubrica.json: título, criterios, puntos y niveles no válidos.');};
 const text=v=>typeof v==='string'&&v.trim()&&v.length<=2000;
 if(!text(value.titulo)||!Array.isArray(value.criterios)||!value.criterios.length||value.criterios.length>30)fail();
 const criterios=value.criterios.map(c=>{
  if(!text(c.titulo)||!Number.isFinite(c.puntos)||c.puntos<=0||c.puntos>100||!Array.isArray(c.niveles)||!c.niveles.length||c.niveles.length>10)fail();
  const niveles=c.niveles.map(n=>{if(!Number.isFinite(n.puntos)||n.puntos<0||n.puntos>c.puntos||!text(n.descripcion))fail();return {puntos:n.puntos,descripcion:n.descripcion};});
  if(new Set(niveles.map(n=>n.puntos)).size!==niveles.length||!niveles.some(n=>n.puntos===0)||!niveles.some(n=>n.puntos===c.puntos))fail();
  return {titulo:c.titulo,puntos:c.puntos,niveles:niveles.sort((a,b)=>b.puntos-a.puntos)};
 });
 return {titulo:value.titulo,criterios,total:Number(criterios.reduce((sum,c)=>sum+c.puntos,0).toFixed(4))};
}
function settings(activity,module,slug,rubricData=null){
 const value=activity.herramientas??{};
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!KEYS.includes(k))||Object.values(value).some(v=>typeof v!=='boolean'))throw Error('herramientas solo admite opciones booleanas: '+KEYS.join(', '));
 const unit=activity.unidad??Number(/^(\d{2})-/.exec(slug)?.[1]||0);
 if(activity.unidad!==undefined&&(!Number.isInteger(unit)||unit<1||unit>99))throw Error('unidad debe ser un número entre 1 y 99.');
 return {enabled:Object.fromEntries(KEYS.map(k=>[k,value[k]??true])),rubric:rubric(rubricData),notes:unit>0?'/ciclos/'+module+'/u'+String(unit).padStart(2,'0')+'_es.html':null};
}
function convert(value,from,to){
 const text=String(value).trim();
 const patterns={2:/^[01]+$/,10:/^\d+$/,16:/^[\da-f]+$/i};
 if(!patterns[from]||!patterns[to]||text.length>256||!patterns[from].test(text))throw Error('Introduce un entero no negativo válido (sin prefijos).');
 return BigInt((from===2?'0b':from===16?'0x':'')+text).toString(to).toUpperCase();
}
function calculate(source){
 const text=String(source).replaceAll(',','.').replace(/\s+/g,'');
 if(!text||text.length>200)throw Error('Introduce una expresión de hasta 200 caracteres.');
 const tokens=text.match(/\d+(?:\.\d*)?|\.\d+|\*\*|[()+\-*/%^]/g)||[];
 if(tokens.join('')!==text)throw Error('Usa números, paréntesis y + − * / % ^ o **.');
 let at=0;
 function atom(){
  const token=tokens[at++];
  if(token==='('){const value=sum();if(tokens[at++]!==')')throw Error('Falta cerrar un paréntesis.');return value;}
  if(token===undefined||!/^\d|^\.\d/.test(token))throw Error('Expresión incompleta.');
  return Number(token);
 }
 // Potencias de derecha a izquierda y antes del signo: -2^2 = -(2^2).
 function power(){const value=atom();if(['^','**'].includes(tokens[at])){at++;return value**unary();}return value;}
 function unary(){if(['+','-'].includes(tokens[at]))return (tokens[at++]==='-'?-1:1)*unary();return power();}
 function product(){let value=unary();while(['*','/','%'].includes(tokens[at])){const op=tokens[at++],right=unary();if((op==='/'||op==='%')&&right===0)throw Error('No se puede dividir entre cero.');value=op==='*'?value*right:op==='/'?value/right:value%right;}return value;}
 function sum(){let value=product();while(['+','-'].includes(tokens[at])){const op=tokens[at++],right=product();value=op==='+'?value+right:value-right;}return value;}
 const result=sum();if(at!==tokens.length||!Number.isFinite(result))throw Error('Expresión inválida o resultado fuera de rango.');
 return Number(result.toPrecision(12)).toString();
}
function init(config,{language=()=> 'es'}={}){
 const doc=root.document,bar=doc.getElementById('toolbar-tools');if(!bar)return null;
 const names={colorPicker:['Color','Color'],calculadora:['Calculadora','Calculator'],binarioDecimal:['Binario ↔ decimal','Binary ↔ decimal'],hexadecimalDecimal:['Hexadecimal ↔ decimal','Hexadecimal ↔ decimal'],traductor:['Traductor','Translator'],apuntes:['Apuntes de la unidad','Unit notes'],rubrica:['Rúbrica de la actividad','Activity rubric']};
 const icons={colorPicker:'◉',calculadora:'±',binarioDecimal:'01',hexadecimalDecimal:'0F',traductor:'A↔文',apuntes:'▤',rubrica:'☷'};
 const dialog=doc.createElement('dialog');dialog.id='tool-dialog';dialog.setAttribute('aria-labelledby','tool-title');
 dialog.innerHTML='<header><h2 id="tool-title"></h2><button type="button" class="secondary" aria-label="Cerrar / Close">×</button></header><div id="tool-content"></div>';
 doc.body.append(dialog);
 const close=dialog.querySelector('button'),content=dialog.querySelector('#tool-content'),panels=new Map();let selected=null;
 close.addEventListener('click',()=>dialog.close());
 const title=k=>names[k][language()==='en'?1:0];
 function build(key){
  const panel=doc.createElement('section');panel.className='tool-panel';
  const status=doc.createElement('p');status.setAttribute('role','status');
  const addInput=(label,type='text')=>{const wrap=doc.createElement('label'),input=doc.createElement('input');wrap.textContent=label;input.type=type;wrap.append(input);panel.append(wrap);return input;};
  const action=(label,fn)=>{const button=doc.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',fn);panel.append(button);return button;};
  if(key==='colorPicker'){
   const sample=doc.createElement('div');sample.className='color-sample';sample.setAttribute('aria-hidden','true');panel.append(sample);
   const hex=addInput('HEX'),channels=['R','G','B'].map(label=>{const input=addInput(label,'range');input.min=0;input.max=255;input.value=128;return input;});hex.maxLength=7;
   function update(){const values=channels.map(c=>Number(c.value));hex.value='#'+values.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();sample.style.backgroundColor=hex.value;status.textContent='rgb('+values.join(', ')+')';}
   channels.forEach(c=>c.addEventListener('input',update));hex.addEventListener('input',()=>{if(!/^#[\da-f]{6}$/i.test(hex.value)){status.textContent='HEX: #RRGGBB';return;}channels.forEach((c,i)=>c.value=parseInt(hex.value.slice(1+i*2,3+i*2),16));update();});update();
  }else if(key==='calculadora'){
   const expression=addInput('Expresión / Expression');expression.placeholder='2^8 - 2';expression.maxLength=200;
   const run=()=>{try{status.textContent=calculate(expression.value);}catch(error){status.textContent=error.message;}};
   action('=',run);expression.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();run();}});
   const help=doc.createElement('small');help.textContent='+ − * / · % = resto / remainder · ^ o ** = potencia / power. Ej.: 2^8 = 256; 2^-3 = 0.125; (-2)^2 = 4; -2^2 = -4.';panel.append(help);
  }else if(key==='binarioDecimal'||key==='hexadecimalDecimal'){
   const base=key==='binarioDecimal'?2:16,left=addInput(base===2?'Binario / Binary':'Hexadecimal'),right=addInput('Decimal');left.maxLength=right.maxLength=256;
   left.placeholder=base===2?'1010':'FF';right.placeholder=base===2?'10':'255';
   function change(source,target,from,to){try{target.value=source.value.trim()?convert(source.value,from,to):'';status.textContent='';}catch(error){target.value='';status.textContent=error.message;}}
   left.addEventListener('input',()=>change(left,right,base,10));right.addEventListener('input',()=>change(right,left,10,base));
  }else if(key==='traductor'){
   const direction=doc.createElement('select');direction.setAttribute('aria-label','Dirección / Direction');direction.innerHTML='<option value="es|en">Español → English</option><option value="en|es">English → Español</option>';panel.append(direction);
   const input=doc.createElement('textarea');input.rows=4;input.maxLength=500;input.setAttribute('aria-label','Texto para traducir / Text to translate');panel.append(input);
   const note=doc.createElement('small');note.textContent='MyMemory · Al traducir se envía solo este texto al servicio externo (máximo 500 bytes). / Translation sends this text to the external service.';panel.append(note);
   const button=action('Traducir / Translate',async()=>{
    const text=input.value.trim();if(!text){status.textContent='Escribe un texto. / Enter some text.';return;}
    if(new TextEncoder().encode(text).length>500){status.textContent='Máximo 500 bytes UTF-8. Reduce el texto. / Shorten the text.';return;}
    button.disabled=true;status.textContent='Traduciendo… / Translating…';
    try{
     const url=new URL('https://api.mymemory.translated.net/get');url.search=new URLSearchParams({q:text,langpair:direction.value});
     const response=await fetch(url,{signal:AbortSignal.timeout(15000),referrerPolicy:'no-referrer'});if(!response.ok)throw Error('HTTP '+response.status);
     const result=await response.json();if(Number(result.responseStatus)!==200||typeof result.responseData?.translatedText!=='string')throw Error('Servicio no disponible o límite diario alcanzado.');
     status.textContent=result.responseData.translatedText;
    }catch{status.textContent='No se pudo traducir. Revisa la conexión o inténtalo más tarde. / Translation unavailable; try again later.';}finally{button.disabled=false;}
   });
  }else if(key==='rubrica'){
   const heading=doc.createElement('h3');heading.textContent=config.rubric.titulo;panel.append(heading);
   const total=doc.createElement('p');total.textContent='Total: '+config.rubric.total+' puntos / points';panel.append(total);
   for(const criterion of config.rubric.criterios){
    const section=doc.createElement('section'),title=doc.createElement('h4'),list=doc.createElement('ul');
    title.textContent=criterion.titulo+' · '+criterion.puntos+' puntos / points';section.append(title,list);
    for(const level of criterion.niveles){const li=doc.createElement('li'),score=doc.createElement('strong');score.textContent=level.puntos+' — ';li.append(score,doc.createTextNode(level.descripcion));list.append(li);}
    panel.append(section);
   }
  }else if(key==='apuntes'){
   const frame=doc.createElement('iframe');frame.className='unit-notes-frame';
   frame.title='Apuntes de la unidad / Unit notes';frame.setAttribute('sandbox','allow-scripts');
   frame.referrerPolicy='no-referrer';frame.hidden=true;panel.append(frame);
   if(!config.notes)status.textContent='Indica unidad en el config.json de esta actividad. / Configure the unit number.';
   else{
    const failed=()=>{status.textContent='No se pudieron cargar los apuntes de esta unidad. / Could not load unit notes.';retry.hidden=false;};
    frame.addEventListener('load',()=>{if(frame.hidden)return;status.textContent='';retry.hidden=true;});
    frame.addEventListener('error',failed);
    const load=async()=>{
     status.textContent='Cargando apuntes… / Loading notes…';retry.hidden=true;
     try{
      const url=new URL(config.notes,location.href);
      if(url.origin!==location.origin||!/^\/ciclos\/(diw|dwec|ssii)\/u\d{2}_es\.html$/.test(url.pathname))throw Error('Invalid unit URL');
      const response=await fetch(url,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('HTTP '+response.status);
      frame.hidden=false;frame.src=url.href;
     }catch{failed();}
    };
    const retry=action('Reintentar / Retry',load);retry.hidden=true;void load();
   }
  }
  panel.append(status);return panel;
 }
 for(const key of KEYS)if(config.enabled[key]&&(key!=='rubrica'||config.rubric)){
  const button=doc.createElement('button');button.type='button';button.className='tool-launch';button.dataset.tool=key;button.textContent=icons[key];button.title=title(key);button.setAttribute('aria-label',title(key));
  button.addEventListener('click',()=>{selected=key;dialog.querySelector('h2').textContent=title(key);if(!panels.has(key))panels.set(key,build(key));content.replaceChildren(panels.get(key));dialog.showModal();});bar.append(button);
 }
 bar.hidden=!bar.children.length;
 return {close:()=>{if(dialog.open)dialog.close();},language(){for(const button of bar.children){button.title=title(button.dataset.tool);button.setAttribute('aria-label',button.title);}if(selected)dialog.querySelector('h2').textContent=title(selected);}};
}
const api={KEYS,settings,rubric,convert,calculate,init};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LabTools=api;
})(typeof window==='object'?window:globalThis);
