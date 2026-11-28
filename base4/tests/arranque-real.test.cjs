const {JSDOM,ResourceLoader,VirtualConsole}=require('jsdom'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{webcrypto}=require('node:crypto');
const repo=path.resolve(__dirname,'../..');
class LocalResources extends ResourceLoader{fetch(url){const p=path.join(repo,new URL(url).pathname);return fs.existsSync(p)?Promise.resolve(fs.readFileSync(p)):null;}}
async function boot(activity,recoverFile){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));vc.on('error',e=>errors.push(String(e)));
 const dom=new JSDOM(fs.readFileSync(path.join(repo,'base4/index.html'),'utf8'),{url:'https://example.com/base4/?a='+activity,resources:new LocalResources(),runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  Object.defineProperty(w,'crypto',{value:webcrypto});Object.assign(w,{CompressionStream,DecompressionStream,Response,Blob,TextEncoder,TextDecoder,AbortSignal,structuredClone});
  w.ResizeObserver=class{observe(){}disconnect(){}};
  w.HTMLElement.prototype.inert=false;w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  Object.defineProperty(w.document,'fullscreenEnabled',{value:true});w.document.hasFocus=()=>true;
  w.HTMLElement.prototype.requestFullscreen=async function(){w.document.fullscreenElement=this;w.document.dispatchEvent(new w.Event('fullscreenchange'));};w.document.exitFullscreen=async()=>{w.document.fullscreenElement=null;};
  w.fetch=async url=>{if(new URL(url,'https://example.com/base4/').pathname==='/base4/acceso')return {ok:true,json:async()=>({ok:true,policy:'base4-prefix2-v1'})};const p=path.join(repo,new URL(url,'https://example.com/base4/').pathname),exists=fs.existsSync(p);let text=exists?fs.readFileSync(p,'utf8'):'';
   if(p.endsWith(path.join('contenido','config.json'))){const c=JSON.parse(text);c.delivery={type:'archivo'};text=JSON.stringify(c);}
   if(recoverFile&&p.endsWith(path.join(activity,'config.json'))){const c=JSON.parse(text);c.guardar=true;text=JSON.stringify(c);}
   return {status:exists?200:404,ok:exists,text:async()=>text,json:async()=>JSON.parse(text)};
  };
 }});
 const w=dom.window,d=w.document;
 for(let i=0;i<150&&!w.Lab?.ready&&!d.querySelector('#guard-boot-detail').textContent;i++)await new Promise(r=>setTimeout(r,20));
 assert.equal(w.Lab?.ready,true,activity+': '+d.querySelector('#guard-boot-detail').textContent+' '+errors.join('; '));
 assert.equal(typeof w.Lab.sections[0].statement,'string');
 assert.ok(d.querySelector('#activity-text').textContent.trim());
 assert.ok(!d.querySelector('#activity-text').textContent.includes('undefined'));
 assert.equal(d.querySelector('#guard-boot').hidden,true);assert.ok(d.querySelector('#utility-actions button'));assert.equal(d.querySelectorAll('#toolbar-tools button').length,6);
 const missingKey=()=>{for(const type of ['keydown','keypress','keyup'])d.dispatchEvent(new w.Event(type,{bubbles:true,cancelable:true}));};
 missingKey();assert.equal(d.querySelector('#guard-boot').hidden,true,'Un evento sin key no debe bloquear la identificación');
 const student=d.querySelector('#student');student.value='alumno@g.educaand.es';student.dispatchEvent(new w.Event('input',{bubbles:true}));
 assert.equal(d.querySelector('#attempt-refresh'),null);
 assert.equal(d.querySelector('#guard-start').disabled,false);
 d.documentElement.requestFullscreen=async()=>{d.fullscreenElement=d.documentElement;d.dispatchEvent(new w.Event('fullscreenchange'));};
 if(recoverFile){
  const input=d.querySelector('#file-delivery-input');
  Object.defineProperty(input,'files',{value:[{name:'practica.txt',size:2000,text:async()=>JSON.stringify(recoverFile)}]});
  input.dispatchEvent(new w.Event('change'));await new Promise(r=>setTimeout(r,30));
  if(recoverFile.state.phase==='submitted'){
   assert.equal(d.querySelector('#file-delivery-send').disabled,true,'Un justificante finalizado no se ofrece para recuperar');
   assert.equal(d.querySelector('#cuaderno').hidden,true,'Un justificante finalizado no se reabre como editable');
   assert.match(d.querySelector('#file-delivery-status').textContent,/finalizada/);w.close();return;
  }
  assert.equal(d.querySelector('#file-delivery-send').disabled,false,d.querySelector('#file-delivery-status').textContent);
  d.querySelector('#file-delivery-send').click();await new Promise(r=>setTimeout(r,100));
  assert.equal(d.querySelector('#cuaderno').hidden,false,d.querySelector('#file-delivery-status').textContent);
  const restored=JSON.parse(w.localStorage.getItem(w.Lab.config.storage.key+'-draft-'+encodeURIComponent(w.Lab.config.version)+'-'+encodeURIComponent(student.value)));
  assert.equal(restored.phase,'active');assert.equal(restored.data.elapsed,120000);
  assert.equal(restored.returnRemainingMs,w.Lab.config.guard.returnSeconds*1000);
  assert.equal(restored.returnDeadline,null);
  assert.equal(restored.data.attempt.id,recoverFile.state.data.attempt.id,'Una pausa conserva el intento');
  assert.equal(restored.data.durationMs,w.Lab.config.durationMs);
  assert.equal(restored.recoveries,recoverFile.state.recoveries+1);
  assert.equal(restored.data.values.js,recoverFile.state.data.values.js);
  assert.equal(restored.data.report,'');assert.equal(errors.length,0,errors.join('; '));
  w.close();return;
 }
 const icon=d.querySelector('#guard-start svg');
 student.dispatchEvent(new w.Event('blur'));
 assert.equal(d.querySelector('#guard-start svg'),icon,'El blur del correo conserva el objetivo del clic');
 icon.dispatchEvent(new w.MouseEvent('click',{bubbles:true}));await new Promise(r=>setTimeout(r,100));
 assert.equal(d.querySelector('#cuaderno').hidden,false,errors.join('; '));
 assert.equal(d.querySelector('#practice-toolbar').hidden,false);
 assert.equal(d.querySelector('#practice-finish').textContent,w.Lab.sectionMode?'Siguiente':'Entregar');
 assert.equal(d.querySelector('#activity-text').innerHTML,w.Lab.sections[0].statement.replace(/\r\n/g,'\n'));
 missingKey();
 const shortcut=new w.Event('keydown',{bubbles:true,cancelable:true});Object.defineProperty(shortcut,'ctrlKey',{value:true});d.dispatchEvent(shortcut);
 assert.equal(d.querySelector('#guard-boot').hidden,true,'Un evento sin key tampoco debe bloquear un intento activo');
 if(w.Lab.sectionMode){assert.equal(d.querySelectorAll('#section-nav button').length,3);d.querySelectorAll('#section-nav button')[1].click();assert.equal(d.querySelector('#question-fields').hidden,false);assert.equal(d.querySelector('#question-fields').disabled,false);d.querySelectorAll('#section-nav button')[0].click();assert.equal(d.querySelector('#activity-text').innerHTML,w.Lab.sections[0].statement.replace(/\r\n/g,'\n'));}
 if(w.Lab.sectionMode){
  const next=d.querySelector('#practice-finish');
  next.click();assert.equal(d.querySelector('#section-heading').textContent,'Explica tus decisiones');assert.equal(next.textContent,'Siguiente');
  next.click();assert.equal(d.querySelector('#section-heading').textContent,'Comprueba tus conocimientos');assert.equal(next.textContent,'Entregar');
  next.click();await new Promise(r=>setTimeout(r,20));assert.equal(d.querySelector('#action-confirm').open,true);assert.equal(d.querySelector('#action-confirm-warning').hidden,false);
  d.querySelector('#action-confirm-cancel').click();
 }
 assert.equal(errors.length,0,errors.join('; '));
 const saved=JSON.parse(w.localStorage.getItem(w.Lab.config.storage.key+'-draft-'+encodeURIComponent(w.Lab.config.version)+'-'+encodeURIComponent(student.value)));
 saved.phase='submitted';saved.data.elapsed=120000;saved.data.started=null;
 saved.returnRemainingMs=w.Lab.config.guard.returnSeconds*1000;saved.returnDeadline=null;
 saved.data.values.js='// Respuesta recuperada';
 const exportFile={format:w.Lab.config.format.save,version:1,state:saved};
 w.close();return exportFile;
}
(async()=>{await boot('diw/01-01-tarjeta-de-presentacion');const saved=await boot('dwec/01-01-contador-de-pulsaciones');await boot('dwec/01-01-contador-de-pulsaciones',saved);saved.state.phase='paused';await boot('dwec/01-01-contador-de-pulsaciones',saved);console.log('OK: actual HTML + loader + shared guard + modules boot and start for mixed and legacy activities.');})().catch(e=>{console.error(e);process.exit(1);});

