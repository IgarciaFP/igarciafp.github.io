/* Copias editables por alumno, actividad y versión. Los comprobantes se guardan aparte. */
(function(root){
'use strict';
root.LabDrafts={create(config,storage=localStorage,now=()=>Date.now()){
 const prefix=config.storage.key+'-draft-'+encodeURIComponent(config.version)+'-';
 let current=null;
 const key=email=>prefix+encodeURIComponent(String(email).trim().toLowerCase());
 return {
  peek(email){return storage.getItem(key(email));},
  discard(email,expected){if(storage.getItem(key(email))===expected)storage.removeItem(key(email));},
  select(email){current=key(email);},
  release(){current=null;},
  matches(changed){return current!==null&&(changed===current||changed===null);},
  getItem(){return current===null?null:storage.getItem(current);},
  write(raw){
   if(current===null)return null;
   const saved=JSON.parse(raw);
   if(!['active','paused','closing'].includes(saved.phase)){storage.removeItem(current);return null;}
   // El tiempo cerrado no se descuenta: cada copia contiene el tiempo consumido al guardarla.
   if(saved.data.started!==null){saved.data.elapsed+=Math.max(0,now()-saved.data.started);saved.data.started=null;}
   if(saved.returnDeadline!==null){saved.returnRemainingMs=Math.max(0,saved.returnDeadline-now());saved.returnDeadline=null;}
   const result=JSON.stringify(saved);storage.setItem(current,result);return result;
  },
  remove(){if(current!==null)storage.removeItem(current);},
  clear(){for(let i=storage.length-1;i>=0;i--){const name=storage.key(i);if(name?.startsWith(config.storage.key+'-draft-'))storage.removeItem(name);}}
 };
}};
})(window);
