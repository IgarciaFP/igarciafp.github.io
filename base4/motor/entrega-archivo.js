/* Recuperación desde el login: conserva respuestas, intento y tiempo pendiente. */
(function(root){
'use strict';
root.LabFileDelivery={init({config,decode,validEmail,recover}){
 const d=document,$=id=>d.getElementById(id),button=$('file-delivery-open');
 const dialog=$('file-delivery-dialog'),input=$('file-delivery-input'),resume=$('file-delivery-send'),status=$('file-delivery-status');
 let documentText=null,busy=false;
 button.hidden=false;
 button.addEventListener('click',()=>{if(!busy){input.value='';input.click();}});
 $('file-delivery-close').addEventListener('click',()=>{if(!busy)dialog.close();});
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file||busy)return;
  busy=true;documentText=null;resume.disabled=true;
  dialog.dataset.state='idle';if(!dialog.open)dialog.showModal();status.textContent='Comprobando archivo…';
  try{
   if(file.size>3000000)throw Error('El archivo es demasiado grande.');
   const decoded=await decode(await file.text());
   let saved;try{saved=JSON.parse(decoded);}catch{throw Error('Selecciona el archivo completo de la práctica, con sus respuestas y tiempo restante.');}
   if(saved.format!==config.format.save||saved.version!==1||!['paused','submitted'].includes(saved.state?.phase))throw Error('El archivo no corresponde a una práctica guardada de esta actividad.');
   const data=saved.state.data,email=data?.values?.student?.trim();
   if(!validEmail(email||''))throw Error('El archivo no contiene un correo válido.');
   const current=$('student').value.trim().toLowerCase();
   if(current&&current!==email.toLowerCase())throw Error('El correo del archivo no coincide con el correo introducido.');
   if(!/^[a-f0-9]{32}$/.test(data.attempt?.id||'')||!/^[a-f0-9]{64}$/.test(data.attempt?.token||''))throw Error('El archivo no contiene la identificación completa del intento.');
   if(!Number.isFinite(data.elapsed)||data.elapsed<0||!Number.isFinite(data.durationMs)||data.durationMs<=0)throw Error('El archivo no contiene un tiempo válido.');
   const remaining=Math.max(0,Math.min(data.durationMs,config.durationMs)-data.elapsed);
   if(!remaining)throw Error('Esta práctica ya ha agotado su tiempo.');
   documentText=decoded;
   $('student').value=email;$('student').dispatchEvent(new Event('input',{bubbles:true}));
   status.textContent='Archivo: '+file.name+'\nActividad: '+config.title+'\nCorreo: '+email+'\nTiempo restante: '+Math.floor(remaining/60000)+' min '+Math.floor(remaining/1000)%60+' s.\nSe conservarán tus respuestas y se registrará la recuperación como incidencia.';
   resume.disabled=false;
  }catch(error){status.textContent=error.message;}
  finally{busy=false;}
 });
 resume.addEventListener('click',async()=>{
  if(busy||!documentText)return;
  busy=true;resume.disabled=true;dialog.close();
  try{
   // Invocar desde el clic mantiene la activación necesaria para pantalla completa.
   if(!await recover(documentText))throw Error('No se pudo continuar en pantalla completa. Pulsa Recuperar y continuar para reintentarlo.');
   documentText=null;
  }catch(error){dialog.dataset.state='error';status.textContent=error.message;if(!dialog.open)dialog.showModal();}
  finally{busy=false;resume.disabled=!documentText;}
 });
}};
})(window);
