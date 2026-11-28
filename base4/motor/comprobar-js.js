(function(){
'use strict';
const workerURL=new URL('eslint-worker.js',document.currentScript.src);workerURL.search=new URL(document.currentScript.src).search;
function sources(html,js){
 const template=document.createElement('template');template.innerHTML=html;
 const list=[{code:js,file:'JavaScript',sourceType:'script',offset:0}];
 for(const script of template.content.querySelectorAll('script')){
  const type=(script.getAttribute('type')||'').trim().toLowerCase();
  if(type&&!['module','text/javascript','application/javascript'].includes(type))continue;
  if(script.hasAttribute('src'))continue;
  const code=script.textContent,index=html.indexOf(code);
  list.push({code,file:'HTML',sourceType:type==='module'?'module':'script',offset:index<0?0:html.slice(0,index).split('\n').length-1});
 }
 for(const node of template.content.querySelectorAll('*'))for(const attribute of node.attributes){
  if(/^on[a-z]+$/i.test(attribute.name))list.push({code:'function __evento(event){\n'+attribute.value+'\n}',file:'HTML ('+attribute.name+')',sourceType:'script',offset:-1});
  else if(/^(href|action|formaction)$/i.test(attribute.name)&&/^\s*javascript:/i.test(attribute.value))list.push({code:attribute.value.replace(/^\s*javascript:/i,''),file:'HTML ('+attribute.name+')',sourceType:'script',offset:0});
 }
 return list;
}
window.LabJSCheck={check(html,js){
 return new Promise((resolve,reject)=>{
  let worker,timer;
  function finish(error,messages){clearTimeout(timer);worker?.terminate();error?reject(Error('JS_CHECK_UNAVAILABLE')):resolve(messages);}
  try{
   worker=new Worker(workerURL);timer=setTimeout(()=>finish(true),8000);
   worker.onmessage=event=>finish(event.data.error,event.data.messages);worker.onerror=event=>{event.preventDefault();finish(true);};
   worker.postMessage({sources:sources(html,js)});
  }catch{finish(true);}
 });
}};
})();
