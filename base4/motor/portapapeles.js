/* Menú contextual propio. La API del navegador puede denegar el portapapeles. */
window.createLabClipboard=function(options){
 'use strict';
 const {canEdit,language=()=> 'es'}=options;
 const menu=document.createElement('div');menu.id='clipboard-menu';menu.setAttribute('role','menu');menu.hidden=true;
 const status=document.createElement('p');status.id='clipboard-status';status.setAttribute('role','status');status.hidden=true;
 const copy=document.createElement('button'),paste=document.createElement('button');
 for(const button of [copy,paste]){button.type='button';button.setAttribute('role','menuitem');menu.append(button);}
 document.body.append(menu,status);
 let context=null;
 const message=(es,en)=>language()==='en'?en:es;
 const notify=text=>{status.textContent=text;status.hidden=!text;};
 const editable=el=>el&&(el.tagName==='TEXTAREA'||(el.tagName==='INPUT'&&['text','search','url','tel','password','email'].includes(el.type)))&&!el.disabled&&!el.readOnly&&!el.closest('[inert],fieldset:disabled');
 function selected(el){
  if(el&&(el.tagName==='TEXTAREA'||el.tagName==='INPUT')&&typeof el.selectionStart==='number')return el.value.slice(el.selectionStart,el.selectionEnd);
  return String(window.getSelection()||'');
 }
 function hide(){menu.hidden=true;}
 function show(data,x,y){
  context=data;copy.textContent=message('Copiar','Copy');paste.textContent=message('Pegar','Paste');
  copy.disabled=!data.text;paste.disabled=!data.editable||!canEdit();
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
 copy.addEventListener('click',async()=>{
  const current=context;hide();if(!current?.text)return;
  try{await navigator.clipboard.writeText(current.text);notify('');}
  catch{notify(message('El navegador no ha permitido copiar al portapapeles.','The browser did not allow copying to the clipboard.'));}
 });
 paste.addEventListener('click',async()=>{
  const current=context;hide();if(!current?.editable||!canEdit())return;
  try{
   const text=await navigator.clipboard.readText();if(!canEdit())return;
   if(current.frame){
    // El token lo comprueba el puente antes de insertar en el resultado.
    current.frame.contentWindow.postMessage({labClipboard:current.token,action:'paste',text:text.slice(0,10000)},'*');return;
   }
   const el=current.target;if(!el?.isConnected||!editable(el))return;
   if(typeof current.start==='number'){
    const room=el.maxLength>=0?Math.max(0,el.maxLength-(el.value.length-(current.end-current.start))):text.length;
    el.setRangeText(text.slice(0,room),current.start,current.end,'end');
   }else el.value=text.slice(0,el.maxLength>=0?el.maxLength:text.length);
   el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));el.focus();notify('');
  }catch{notify(message('El navegador no ha permitido leer el portapapeles para pegar.','The browser did not allow reading the clipboard to paste.'));}
 });
 async function clear(){
  hide();
  try{await navigator.clipboard.writeText('');notify('');return true;}
  catch{notify(message('No se pudo vaciar el portapapeles: el navegador ha denegado el acceso.','The clipboard could not be cleared: browser access was denied.'));return false;}
 }
 document.getElementById('guard-start').addEventListener('click',()=>{void clear();},true);
 // Al cerrar o navegar fuera el navegador puede cancelar operaciones asíncronas.
 window.addEventListener('beforeunload',()=>{void clear();});
 window.addEventListener('pagehide',()=>{void clear();});
 return {clear,hide,preview(event,frame,token){
  const data=event.data;
  if(event.source!==frame.contentWindow||!token||data?.labClipboard!==token||data.action!=='menu')return;
  const rect=frame.getBoundingClientRect();
  show({frame,token,text:typeof data.text==='string'?data.text.slice(0,10000):'',editable:data.editable===true},rect.left+Math.max(0,Math.min(Number(data.x)||0,rect.width)),rect.top+Math.max(0,Math.min(Number(data.y)||0,rect.height)));
 }};
};
