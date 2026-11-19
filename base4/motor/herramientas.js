(function(root){
'use strict';
const KEYS=['colorPicker','calculadora','binarioDecimal','hexadecimalDecimal','traductor','rubrica','apuntes','atajosTeclado'];
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
function init(config,{language=()=> 'es',copyText=null}={}){
 const doc=root.document,bar=doc.getElementById('toolbar-tools');if(!bar)return null;
 const names={colorPicker:['Color','Color'],calculadora:['Calculadora','Calculator'],binarioDecimal:['Binario ↔ decimal','Binary ↔ decimal'],hexadecimalDecimal:['Hexadecimal ↔ decimal','Hexadecimal ↔ decimal'],traductor:['Traductor','Translator'],apuntes:['Apuntes de la unidad','Unit notes'],rubrica:['Rúbrica de la actividad','Activity rubric']};
 const icons={colorPicker:'◉',calculadora:'±',binarioDecimal:'01',hexadecimalDecimal:'0F',traductor:'A↔文',apuntes:'▤',rubrica:'☷'};
 const dialog=doc.createElement('dialog');dialog.id='tool-dialog';dialog.setAttribute('aria-labelledby','tool-title');
 dialog.innerHTML='<header><h2 id="tool-title"></h2><button type="button" class="secondary" aria-label="Cerrar / Close">×</button></header><div id="tool-content"></div>';
 doc.body.append(dialog);
 const close=dialog.querySelector('button'),content=dialog.querySelector('#tool-content'),panels=new Map();let selected=null,openedFullscreen=null;
 const closeDialog=()=>{if(dialog.open)dialog.close();};
 close.addEventListener('click',closeDialog);
 dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
 dialog.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();event.stopPropagation();closeDialog();}});
 // Escape desde un iframe puede salir de pantalla completa sin cancelar el dialog.
 doc.addEventListener('fullscreenchange',()=>{if(dialog.open&&openedFullscreen&&doc.fullscreenElement!==openedFullscreen)closeDialog();});
 dialog.addEventListener('close',()=>{openedFullscreen=null;});
 const title=k=>names[k][language()==='en'?1:0];
 function build(key){
  const panel=doc.createElement('section');panel.className='tool-panel';
  const status=doc.createElement('p');status.setAttribute('role','status');
  const addInput=(label,type='text')=>{const wrap=doc.createElement('label'),input=doc.createElement('input');wrap.textContent=label;input.type=type;wrap.append(input);panel.append(wrap);return input;};
  const action=(label,fn)=>{const button=doc.createElement('button');button.type='button';button.textContent=label;button.addEventListener('click',fn);panel.append(button);return button;};
  if(key==='colorPicker'){
   panel.classList.add('color-picker');
   panel.innerHTML='<div class="color-sv" tabindex="0" role="slider" aria-label="Saturación y brillo: flechas para ajustar" aria-valuemin="0" aria-valuemax="100"><span class="color-cursor"></span></div><input class="color-hue" type="range" min="0" max="360" step="1" aria-label="Tono"><div class="color-value-row"><span class="color-swatch" aria-hidden="true"></span><input class="color-value" type="text" aria-label="Valor del color" spellcheck="false"><button class="color-copy" type="button" aria-label="Copiar color" title="Copiar color"><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 8V3h12v13h-5M3 8h13v13H3z"/></svg></button><select class="color-format" aria-label="Formato del color"><option value="hex">Hex</option><option value="rgb">RGB</option><option value="hsl">HSL</option></select></div>';
   const area=panel.querySelector('.color-sv'),cursor=panel.querySelector('.color-cursor'),hue=panel.querySelector('.color-hue'),value=panel.querySelector('.color-value'),swatch=panel.querySelector('.color-swatch'),format=panel.querySelector('.color-format');
   let h=211.017,s=0.608247,v=0.760784;
   const clamp=(n,a=0,b=1)=>Math.min(b,Math.max(a,n));
   function rgb(){const c=v*s,x=c*(1-Math.abs((h/60)%2-1)),m=v-c;return (h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x]).map(n=>Math.round((n+m)*255));}
   function fromRGB(values){const [r,g,b]=values.map(n=>n/255),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;v=max;s=max?d/max:0;if(d)h=((max===r?(g-b)/d:max===g?(b-r)/d+2:(r-g)/d+4)*60+360)%360;}
   function formatted(){const channels=rgb();if(format.value==='rgb')return 'rgb('+channels.join(', ')+')';if(format.value==='hsl'){const l=v*(1-s/2),sat=l===0||l===1?0:(v-l)/Math.min(l,1-l);return 'hsl('+Math.round(h)+', '+Math.round(sat*100)+'%, '+Math.round(l*100)+'%)';}return '#'+channels.map(n=>n.toString(16).padStart(2,'0')).join('').toUpperCase();}
   function render(){const color='rgb('+rgb().join(', ')+')';area.style.backgroundColor='hsl('+h+',100%,50%)';cursor.style.left=s*100+'%';cursor.style.top=(1-v)*100+'%';cursor.style.backgroundColor=color;swatch.style.backgroundColor=color;hue.value=h;hue.style.setProperty('--tone','hsl('+h+',100%,50%)');value.value=formatted();value.setAttribute('aria-invalid','false');area.setAttribute('aria-valuenow',Math.round(s*100));area.setAttribute('aria-valuetext','Saturación '+Math.round(s*100)+'%, brillo '+Math.round(v*100)+'%');status.textContent='';}
   function pick(e){const r=area.getBoundingClientRect();s=clamp((e.clientX-r.left)/r.width);v=1-clamp((e.clientY-r.top)/r.height);render();}
   area.addEventListener('pointerdown',e=>{if(e.button!==0)return;e.preventDefault();area.focus();area.setPointerCapture(e.pointerId);pick(e);});
   area.addEventListener('pointermove',e=>{if(area.hasPointerCapture(e.pointerId))pick(e);});
   area.addEventListener('pointerup',e=>{if(area.hasPointerCapture(e.pointerId))area.releasePointerCapture(e.pointerId);});
   area.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const step=e.shiftKey?0.1:0.01;if(e.key==='ArrowLeft')s=clamp(s-step);if(e.key==='ArrowRight')s=clamp(s+step);if(e.key==='ArrowUp')v=clamp(v+step);if(e.key==='ArrowDown')v=clamp(v-step);render();});
   hue.addEventListener('input',()=>{h=Number(hue.value);render();});format.addEventListener('change',render);
   value.addEventListener('input',()=>{const text=value.value.trim();let match,channels;
    if(format.value==='hex'&&(match=/^#?([0-9a-f]{6}|[0-9a-f]{3})$/i.exec(text))){let hex=match[1];if(hex.length===3)hex=hex.split('').map(c=>c+c).join('');channels=[0,2,4].map(i=>parseInt(hex.slice(i,i+2),16));}
    if(format.value==='rgb'&&(match=/^(?:rgb\()?\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)?$/i.exec(text))){const nums=match.slice(1).map(Number);if(nums.every(n=>n<=255))channels=nums;}
    if(format.value==='hsl'&&(match=/^(?:hsl\()?\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)%\s*,\s*(\d+(?:\.\d+)?)%\s*\)?$/i.exec(text))){const [hh,ss,ll]=match.slice(1).map(Number);if(hh<=360&&ss<=100&&ll<=100){h=hh%360;const l=ll/100;v=l+ss/100*Math.min(l,1-l);s=v?2*(1-l/v):0;render();value.value=text;return;}}
    if(channels){fromRGB(channels);render();value.value=text;}else{value.setAttribute('aria-invalid','true');status.textContent='Introduce un color válido en el formato seleccionado.';}
   });
   panel.querySelector('.color-copy').addEventListener('click',async()=>{if(value.getAttribute('aria-invalid')==='true')return;try{if(copyText)await copyText(formatted());else await navigator.clipboard.writeText(formatted());status.textContent='Color copiado';}catch{status.textContent='Err. permiso';}});
   render();
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
   const escapeToken=Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
   window.addEventListener('message',event=>{if(event.source===frame.contentWindow&&event.data?.base4CloseNotes===escapeToken&&dialog.open&&selected==='apuntes')closeDialog();});
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
      const html=await response.text();
      const base=url.href.replaceAll('&','&amp;').replaceAll('"','&quot;');
      const relay='<script>document.addEventListener("keydown",function(e){if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();parent.postMessage({base4CloseNotes:'+JSON.stringify(escapeToken)+'},"*");}},true);<\/script>';
      frame.hidden=false;frame.srcdoc='<base href="'+base+'">'+relay+html;
     }catch{failed();}
    };
    const retry=action('Reintentar / Retry',load);retry.hidden=true;void load();
   }
  }
  panel.append(status);return panel;
 }
 for(const key of KEYS)if(key!=='atajosTeclado'&&config.enabled[key]&&(key!=='rubrica'||config.rubric)){
  const button=doc.createElement('button');button.type='button';button.className='tool-launch';button.dataset.tool=key;button.textContent=icons[key];button.title=title(key);button.setAttribute('aria-label',title(key));
  button.addEventListener('click',()=>{selected=key;dialog.querySelector('h2').textContent=title(key);if(!panels.has(key))panels.set(key,build(key));content.replaceChildren(panels.get(key));openedFullscreen=doc.fullscreenElement;dialog.showModal();});bar.append(button);
 }
 bar.hidden=!bar.children.length;
 return {close:closeDialog,language(){for(const button of bar.children){button.title=title(button.dataset.tool);button.setAttribute('aria-label',button.title);}if(selected)dialog.querySelector('h2').textContent=title(selected);}};
}
const api={KEYS,settings,rubric,convert,calculate,init};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LabTools=api;
})(typeof window==='object'?window:globalThis);
