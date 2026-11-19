/* Menú contextual propio. La API del navegador puede denegar el portapapeles. */
window.createLabClipboard=function(options){
 'use strict';
 const {canEdit,language=()=> 'es'}=options;
 const menu=document.createElement('div');menu.id='clipboard-menu';menu.setAttribute('role','menu');menu.hidden=true;
 const status=document.createElement('p');status.id='clipboard-status';status.setAttribute('role','status');status.hidden=true;
 const undo=document.createElement('button'),cut=document.createElement('button'),copy=document.createElement('button'),paste=document.createElement('button');
 for(const button of [undo,cut,copy,paste]){button.type='button';button.setAttribute('role','menuitem');menu.append(button);}
 document.body.append(menu,status);
 let context=null,internalText='';
 const message=(es,en)=>language()==='en'?en:es;
 const notify=text=>{status.textContent=text;status.hidden=!text;};
 const editable=el=>el&&(el.tagName==='TEXTAREA'||(el.tagName==='INPUT'&&['text','search','url','tel','password','email'].includes(el.type)))&&!el.disabled&&!el.readOnly&&!el.closest('[inert],fieldset:disabled');
 // El menú usa el mismo historial nativo que Ctrl+Z.
 function canUndo(el){if(!editable(el))return false;el.focus({preventScroll:true});return document.queryCommandEnabled?.('undo')===true;}
 function undoEdit(el){if(!canEdit()||!editable(el))return;el.focus({preventScroll:true});document.execCommand('undo');}
 function insert(el,text,start=el.selectionStart,end=el.selectionEnd){
  if(!canEdit()||!editable(el))return;
  el.focus({preventScroll:true});if(typeof start==='number')el.setSelectionRange(start,end);
  const room=el.maxLength>=0?Math.max(0,el.maxLength-(el.value.length-(end-start))):text.length;
  document.execCommand('insertText',false,text.slice(0,room));
 }
 function selected(el){
  if(el&&(el.tagName==='TEXTAREA'||el.tagName==='INPUT')&&typeof el.selectionStart==='number')return el.value.slice(el.selectionStart,el.selectionEnd);
  return String(window.getSelection()||'');
 }
 function hide(){menu.hidden=true;}
 function show(data,x,y){
  context=data;undo.textContent=message('Deshacer','Undo');cut.textContent=message('Cortar','Cut');undo.disabled=!data.editable||!canEdit()||!(data.frame?data.canUndo:canUndo(data.target));cut.disabled=!data.editable||!canEdit()||!data.text;copy.textContent=message('Copiar','Copy');paste.textContent=message('Pegar','Paste');
  copy.disabled=!data.text;paste.disabled=!data.editable||!canEdit()||!internalText;
  menu.hidden=false;menu.style.left='0px';menu.style.top='0px';
  menu.style.left=Math.max(4,Math.min(x,window.innerWidth-menu.offsetWidth-4))+'px';
  menu.style.top=Math.max(4,Math.min(y,window.innerHeight-menu.offsetHeight-4))+'px';
 }
 document.addEventListener('contextmenu',event=>{
  event.preventDefault();event.stopImmediatePropagation();
  const el=event.target;
  show({target:el,text:selected(el),editable:editable(el),start:el?.selectionStart,end:el?.selectionEnd},event.clientX,event.clientY);
 },true);
 menu.addEventListener('mousedown',event=>event.preventDefault());
 document.addEventListener('pointerdown',event=>{if(!menu.contains(event.target))hide();},true);
 document.addEventListener('keydown',event=>{if(event.key==='Escape')hide();},true);
 window.addEventListener('resize',hide);
 document.addEventListener('scroll',hide,true);
 undo.addEventListener('click',()=>{const current=context;hide();if(!current?.editable||!canEdit())return;if(current.frame){current.frame.contentWindow.postMessage({labClipboard:current.token,action:'undo'},'*');return;}if(editable(current.target))undoEdit(current.target);});
 cut.addEventListener('click',()=>{const current=context;hide();if(!current?.editable||!canEdit()||!current.text)return;
  if(!current.frame&&(!current.target?.isConnected||!editable(current.target)))return;
  internalText=current.text;try{void navigator.clipboard.writeText(internalText).catch(()=>{});}catch{}
  if(current.frame){current.frame.contentWindow.postMessage({labClipboard:current.token,action:'cut'},'*');return;}
  insert(current.target,'',current.start,current.end);
 });
 copy.addEventListener('click',async()=>{
  const current=context;hide();if(!current?.text)return;
  internalText=current.text;
  try{await navigator.clipboard.writeText(current.text);notify('');}
  catch{notify(message('El navegador no ha permitido copiar al portapapeles.','The browser did not allow copying to the clipboard.'));}
 });
 paste.addEventListener('click',async()=>{
  const current=context;hide();if(!current?.editable||!canEdit())return;
  try{
   const text=internalText;if(!text||!canEdit())return;
   if(current.frame){
    // El token lo comprueba el puente antes de insertar en el resultado.
    current.frame.contentWindow.postMessage({labClipboard:current.token,action:'paste',text:text.slice(0,10000)},'*');return;
   }
   const el=current.target;if(!el?.isConnected||!editable(el))return;
   insert(el,text,current.start,current.end);notify('');
  }catch{notify(message('El navegador no ha permitido leer el portapapeles para pegar.','The browser did not allow reading the clipboard to paste.'));}
 });
 // Un espacio sustituye el contenido incluso en navegadores que ignoran una copia vacía.
 // La copia clásica se inicia en el mismo clic: esperar al rechazo de la API puede
 // perder la activación del usuario. Nunca se lee el contenido anterior.
 function copyBlank(){
  if(typeof document.execCommand!=='function')return false;
  const active=document.activeElement,selection=window.getSelection();
  const ranges=selection?Array.from({length:selection.rangeCount},(_,i)=>selection.getRangeAt(i).cloneRange()):[];
  const start=active?.selectionStart,end=active?.selectionEnd,direction=active?.selectionDirection;
  const field=document.createElement('textarea');field.value=' ';field.tabIndex=-1;
  field.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none';
  (document.querySelector('dialog[open]')||document.body).append(field);
  const onCopy=event=>{if(!event.clipboardData)return;event.clipboardData.setData('text/plain',' ');event.preventDefault();event.stopImmediatePropagation();};
  window.addEventListener('copy',onCopy,true);
  try{field.focus({preventScroll:true});field.select();return document.execCommand('copy')===true;}
  catch{return false;}
  finally{
   window.removeEventListener('copy',onCopy,true);field.remove();
   if(active?.isConnected){active.focus({preventScroll:true});if(typeof start==='number')active.setSelectionRange(start,end,direction);}
   if(selection){selection.removeAllRanges();for(const range of ranges)selection.addRange(range);}
  }
 }
 let clearing=0;
 async function clear({gesture=false}={}){
  hide();internalText='';
  const operation=++clearing;
  let modern;
  try{modern=Promise.resolve(navigator.clipboard.writeText(' ')).then(()=>true,()=>false);}catch{modern=Promise.resolve(false);}
  const copied=gesture&&copyBlank();
  const success=(await modern)||copied;
  if(operation===clearing)notify('');
  return success;
 }
// Captura: copiar en el clic, antes de iniciar la entrega o solicitar pantalla completa.
 for(const id of ['guard-start','guard-continue','guard-finish','guard-confirm-ok','revision-delivery-send','delivery-retry'])
  document.getElementById(id)?.addEventListener('click',()=>{void clear({gesture:true});},true);
 // Al cerrar o navegar fuera el navegador puede cancelar operaciones asíncronas.
 window.addEventListener('beforeunload',()=>{void clear();});
 window.addEventListener('pagehide',()=>{void clear();});
 return {clear,hide,undo:undoEdit,insert,async copyText(text){internalText=String(text);try{await navigator.clipboard.writeText(internalText);}catch{}},preview(event,frame,token){
  const data=event.data;
  if(event.source!==frame.contentWindow||!token||data?.labClipboard!==token||data.action!=='menu')return;
  const rect=frame.getBoundingClientRect();
  show({frame,token,canUndo:data.canUndo===true,text:typeof data.text==='string'?data.text.slice(0,10000):'',editable:data.editable===true},rect.left+Math.max(0,Math.min(Number(data.x)||0,rect.width)),rect.top+Math.max(0,Math.min(Number(data.y)||0,rect.height)));
 }};
};
