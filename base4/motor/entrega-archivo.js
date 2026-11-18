/* Reenvío del documento original: conserva intento, sello e identificador. */
(function(root){
'use strict';
root.LabFileDelivery={init({config,decode,envelope,encode,validEmail,onReceived}){
 const d=document,$=id=>d.getElementById(id),button=$('file-delivery-open');
 const dialog=$('file-delivery-dialog'),input=$('file-delivery-input'),send=$('file-delivery-send'),status=$('file-delivery-status'),reason=$('file-delivery-reason');
 let item=null,packet=null,busy=false;
 const message=text=>{status.textContent=text;};
 button.hidden=config.delivery.type!=='apps-script';
 button.addEventListener('click',()=>{input.value='';input.click();});
 $('file-delivery-close').addEventListener('click',()=>{if(!busy)dialog.close();});
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 input.addEventListener('change',async()=>{
  const file=input.files?.[0];if(!file||busy)return;
  item=null;packet=null;send.disabled=true;reason.parentElement.hidden=true;reason.value='';
  dialog.showModal();message('Comprobando archivo…');
  try{
   if(file.size>3000000)throw Error('El archivo es demasiado grande.');
   const text=await file.text(),decoded=await decode(text);
   let saved=null;
   try{saved=JSON.parse(decoded);}catch{}
   if(saved?.state){
    if(saved.format!==config.format.save||!saved.state.data?.report)throw Error('El archivo es una práctica sin entrega final. Recupérala y finalízala antes de enviarla.');
    item={code:saved.state.data.report,attemptToken:saved.state.data.attempt?.token,practice:decoded};
   }else item={code:text};
   packet=await envelope(item);
   const report=JSON.parse(packet.payload);
   if(report.module!==config.module||report.activity!==config.activity||!validEmail(report.email||'')||!Array.isArray(report.answers))throw Error('El archivo no corresponde a esta actividad.');
   const email=$('student').value.trim().toLowerCase();
   if(email&&email!==report.email.toLowerCase())throw Error('El correo del archivo no coincide con el correo introducido.');
   if(report.attemptId&&!/^[a-f0-9]{64}$/.test(item.attemptToken||''))throw Error('Este TXT no contiene la clave del intento. Selecciona el comprobante completo descargado por el laboratorio.');
   if(report.url&&!/^https:\/\/igarciafp\.github\.io\/base4(?:[/?#]|$)/.test(report.url))throw Error('El archivo pertenece a otro laboratorio.');
   item.name=report.email.split('@')[0];item.language=report.language||'es';
   $('student').value=report.email; $('student').dispatchEvent(new Event('input',{bubbles:true}));
   message('Archivo: '+file.name+'\nActividad: '+config.title+'\nCorreo: '+report.email+'\nPulsa Entregar archivo para enviarlo.');send.disabled=false;
  }catch(error){item=null;packet=null;message(error.message==='INVALID'?'El archivo no es válido, está alterado o pertenece a otra actividad o versión.':error.message);}
 });
 send.addEventListener('click',async()=>{
  if(busy||!packet)return;
  if(!reason.parentElement.hidden&&(reason.value.match(/\p{L}/gu)||[]).length<20){message('Indica un motivo de revisión con al menos 20 letras.');return;}
  busy=true;send.disabled=true;$('file-delivery-close').disabled=true;dialog.setAttribute('aria-busy','true');message('Enviando archivo… Espera la confirmación.');
  try{
   if(!reason.parentElement.hidden){
    const data=JSON.parse(packet.payload);data.revisionReason=reason.value.trim();
    const payload=JSON.stringify(data),hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(payload))),b=>b.toString(16).padStart(2,'0')).join('');
    item.code=await encode(payload+'\nCódigo de comprobación: '+config.format.checksum+hash);packet=await envelope(item);
   }
   let receipt;
   try{receipt=await root.LabDelivery.send(config.delivery,packet);}catch(error){
    if(error.message!=='NOT_STARTED')throw error;
    await root.LabDelivery.start(config.delivery,packet);receipt=await root.LabDelivery.send(config.delivery,packet);
   }
   message('Entrega recibida. Identificador: '+receipt.submissionId+'\nFecha: '+new Date(receipt.receivedAt).toLocaleString('es-ES'));
   packet=null;await onReceived?.(item,receipt);
  }catch(error){
   if(error.message==='REVISION_REASON'){reason.parentElement.hidden=false;message('No quedan intentos ordinarios. Indica el motivo de revisión para enviar la entrega adicional.');}
   else message('No se ha confirmado la entrega. Conserva el archivo y vuelve a intentarlo. Código: '+error.message);
  }finally{busy=false;send.disabled=!packet;$('file-delivery-close').disabled=false;dialog.setAttribute('aria-busy','false');}
 });
}};
})(window);
