/* Correo de revisión: texto plano, sin registro del intento ni credenciales. */
(() => {
'use strict';
function plain(html){
 const doc=new DOMParser().parseFromString(String(html||''),'text/html');
 doc.querySelectorAll('script,style,template').forEach(el=>el.remove());
 doc.querySelectorAll('br').forEach(el=>el.replaceWith('\n'));
 doc.querySelectorAll('p,div,li,h1,h2,h3,h4,pre,tr,section').forEach(el=>el.append('\n'));
 return doc.body.textContent.replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
function build(item,nota,comentarios){
 const lines=[item.label,'Alumno: '+item.email,'Nota: '+(nota.trim()||'Sin calificar'),'','Comentario:',comentarios.trim()||'Sin comentarios.','','EJERCICIO Y ENTREGA'];
 const code=values=>{
  for(const [key,name] of Object.entries({html:'HTML',css:'CSS',js:'JavaScript',txt:'Notas del alumno'})){
   if(typeof values?.[key]==='string'&&values[key]!=='')lines.push('',name+':',values[key]);
  }
 };
 if(item.sectionData){
  for(const [index,section] of item.reviewSections.entries()){
   lines.push('','APARTADO '+(index+1)+': '+section.title);
   if(section.statement)lines.push(plain(section.statement));
   const values=item.sectionData.values[section.id]||{};
   if(section.type==='webcode')code(values);
   else for(const question of section.questions){
    lines.push('',question.text);
    if(section.type==='test')question.options.forEach((option,i)=>lines.push(String.fromCharCode(65+i)+'. '+option));
    const value=values[question.id]||'';
    const answer=section.type==='test'&&value.trim()?String.fromCharCode(65+Number(value))+'. '+question.options[Number(value)]:value;
    lines.push('Respuesta: '+(answer||'Sin responder'));
   }
  }
 }else{
  const statement=item.known?.sections?.[0]?.statement;
  if(statement)lines.push(plain(statement));
  code(item.code);
 }
 if(item.known&&String(item.activityVersion)!==String(item.known.version))lines.push('','Las instrucciones corresponden a la versión publicada actualmente.');
 return {subject:'Corrección: '+item.label,body:lines.join('\n')};
}
function address(email){
 const value=String(email||'').trim();
 if(!/^[^\s@,;<>?&#]+@[^\s@,;<>?&#]+\.[^\s@,;<>?&#]+$/.test(value))throw Error('La entrega no contiene un correo válido.');
 return value;
}
window.ReviewEmail={build,address,uri(email,message){
 return 'mailto:'+encodeURIComponent(address(email))+'?subject='+encodeURIComponent(message.subject)+'&body='+encodeURIComponent(message.body);
}};
})();
