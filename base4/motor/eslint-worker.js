'use strict';
const rules=new URL('eslint-reglas.js',self.location.href);rules.search=self.location.search;
importScripts(new URL('vendor/eslint-10.16.0.min.js',self.location.href).href,rules.href);
self.onmessage=event=>{
 try{
  const messages=[];
  for(const source of event.data.sources){
   for(const message of self.LabESLint.verify(source.code,source.sourceType))messages.push({...message,file:source.file,line:(message.line||1)+(source.offset||0)});
  }
  self.postMessage({messages:messages.slice(0,30)});
 }catch{self.postMessage({error:true});}
};
