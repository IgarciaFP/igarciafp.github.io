/* Recuperación desde el login: conserva respuestas y tiempo de actividad pendiente. */
(function(root){
'use strict';
root.LabFileDelivery={init({config,decode,validEmail,recover,hasDraft=()=>false,canRecover=()=>true}){
 const d=document,$=id=>d.getElementById(id),button=$('file-delivery-open');
 const dialog=$('file-delivery-dialog'),input=$('file-delivery-input'),resume=$('file-delivery-send'),status=$('file-delivery-status');
 const text=(es,en)=>document.documentElement.lang==='en'?en:es;
 let documentText=null,busy=false;
 function refresh(){if(button){button.hidden=config.allowSaveRecovery!==true||!canRecover()||hasDraft();button.textContent=text('Recuperar','Recover');button.disabled=busy;}
  $('file-delivery-title').textContent=text('Recuperar práctica desde archivo','Recover practice from a file');$('file-delivery-close').textContent=text('Cerrar','Close');resume.textContent=text('Recuperar y continuar','Recover and continue');}
 refresh();$('student').addEventListener('input',refresh);window.addEventListener('storage',refresh);
 button?.addEventListener('click',()=>{if(!busy){input.value='';input.click();}});
 $('file-delivery-close').addEventListener('click',()=>{if(!busy)dialog.close();});
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file||busy)return;
  busy=true;documentText=null;resume.disabled=true;
  dialog.dataset.state='idle';if(!dialog.open)dialog.showModal();status.textContent=text('Comprobando archivo…','Checking file…');
  try{
   if(file.size>3000000)throw Error(text('El archivo es demasiado grande.','The file is too large.'));
   const decoded=await decode(await file.text());
   let saved;try{saved=JSON.parse(decoded);}catch{throw Error(text('Selecciona el archivo completo de la práctica, con sus respuestas y tiempo restante.','Select the complete practice file, including answers and remaining time.'));}
   if(config.allowSaveRecovery!==true)throw Error(text('La pausa y recuperación no están activadas en esta práctica.','Pause and recovery are not enabled for this practice.'));
   if(saved.format!==config.format.save||saved.version!==1||saved.state?.phase!=='paused')throw Error(text('Selecciona un archivo de pausa de esta actividad. Una entrega finalizada no se puede reabrir.','Select a paused file for this activity. A completed submission cannot be reopened.'));
   if(saved.activityVersion!==undefined&&String(saved.activityVersion)!==String(config.version))throw Error(text('El archivo corresponde a otra versión de la actividad.','The file belongs to another version of the activity.'));
   const data=saved.state.data,email=data?.values?.student?.trim();
   if(!validEmail(email||''))throw Error(text('El archivo no contiene un correo válido.','The file does not contain a valid email address.'));
   const current=$('student').value.trim().toLowerCase();
   if(current&&current!==email.toLowerCase())throw Error(text('El correo del archivo no coincide con el correo introducido.','The email in the file does not match the email entered.'));
   if(!/^[a-f0-9]{32}$/.test(data.attempt?.id||'')||!/^[a-f0-9]{64}$/.test(data.attempt?.token||''))throw Error(text('El archivo no contiene la identificación completa del intento.','The file does not contain the full attempt identity.'));
   if(!Number.isFinite(data.elapsed)||data.elapsed<0||!Number.isFinite(data.durationMs)||data.durationMs<=0)throw Error(text('El archivo no contiene un tiempo válido.','The file does not contain valid timing data.'));
   const remaining=Math.max(0,Math.min(data.durationMs,config.durationMs)-data.elapsed);
   if(!remaining)throw Error(text('Esta práctica ya ha agotado su tiempo de actividad.','This practice has no working time remaining.'));
   // El tiempo fuera de la práctica no se descuenta al recuperar el archivo.
   data.started=null;
   const allowance=Math.max(0,(config.guard?.returnSeconds||0)*1000-(saved.state.returnPenalties||0)*3000);
   saved.state.returnRemainingMs=Number.isFinite(saved.state.returnRemainingMs)?Math.max(0,Math.min(allowance,saved.state.returnRemainingMs)):allowance;
   saved.state.returnDeadline=null;
   documentText=JSON.stringify(saved);
   $('student').value=email;$('student').dispatchEvent(new Event('input',{bubbles:true}));
   status.textContent=text('Archivo: ','File: ')+file.name+text('\nActividad: ','\nActivity: ')+config.title+text('\nCorreo: ','\nEmail: ')+email+text('\nTiempo restante: ','\nTime remaining: ')+Math.floor(remaining/60000)+' min '+Math.floor(remaining/1000)%60+text(' s.\nSe conservarán tus respuestas y se registrará la recuperación como incidencia.',' s.\nYour answers will be kept and the recovery will be recorded as an incident.');
   resume.disabled=false;
  }catch(error){status.textContent=error.message;}
  finally{busy=false;refresh();}
 });
 resume.addEventListener('click',async()=>{
  if(busy||!documentText)return;
  busy=true;resume.disabled=true;dialog.close();
  try{
   // Invocar desde el clic mantiene la activación necesaria para pantalla completa.
   if(!await recover(documentText))throw Error(text('No se pudo continuar en pantalla completa. Pulsa Recuperar y continuar para reintentarlo.','Could not continue in full screen. Click Recover and continue to try again.'));
   documentText=null;
  }catch(error){dialog.dataset.state='error';status.textContent=error.message;if(!dialog.open)dialog.showModal();}
  finally{busy=false;resume.disabled=!documentText;refresh();}
 });
 return {refresh};
}};
})(window);

