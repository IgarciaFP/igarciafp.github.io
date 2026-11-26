const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {webcrypto}=require('node:crypto'),{JSDOM,ResourceLoader,VirtualConsole}=require('jsdom');
const repo=path.resolve(__dirname,'../..'),activity='dwec/01-01-contador-de-pulsaciones';
let now=1800000000000;
const attempts=new Map();let sends=0,failSend=false;
const tick=()=>new Promise(r=>setTimeout(r,20));
async function until(check){for(let i=0;i<100;i++){if(check())return;await tick();}assert.ok(check(),'La operación no terminó');}
const used=email=>[...attempts.values()].filter(a=>a.email===email).length;
const delivery={configured:()=>true,
 status:async(_,request)=>({used:used(request.email),limit:1,limitEnforced:true,canResume:attempts.get(request.attemptId)?.status==='started',attemptStatus:attempts.get(request.attemptId)?.status||null}),
 start:async(_,request)=>{const data=JSON.parse(request.payload),existing=attempts.get(data.attemptId);if(existing)return {number:1,limit:1,status:existing.status};if(used(data.email)>=1)throw Error('ATTEMPTS_EXHAUSTED');attempts.set(data.attemptId,{email:data.email,status:'started'});return {number:1,limit:1,status:'started'};},
 send:async(_,request)=>{if(failSend)throw Error('NETWORK');sends++;attempts.get(JSON.parse(request.payload).attemptId).status='submitted';return {submissionId:request.submissionId,receivedAt:new Date(now).toISOString()};}
};
async function boot(saved={}){
 const errors=[],downloads=[],intervals=[];
 const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/Not implemented: window.scrollTo/.test(e.message))errors.push(e.message);});
 class Resources extends ResourceLoader{fetch(url){const p=path.join(repo,new URL(url).pathname);if(!fs.existsSync(p))return null;let text=fs.readFileSync(p,'utf8');if(p.endsWith(path.join('base','motor','entregas.js')))text+='\nwindow.LabDelivery=window.__delivery;';return Promise.resolve(Buffer.from(text));}}
 const dom=new JSDOM(fs.readFileSync(path.join(repo,'base4/index.html'),'utf8'),{url:'https://igarciafp.github.io/base4/?a='+activity,resources:new Resources(),runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  Object.defineProperty(w,'crypto',{value:webcrypto});Object.assign(w,{CompressionStream,DecompressionStream,Response,Blob,TextEncoder,TextDecoder,AbortSignal,structuredClone,__delivery:delivery});
  w.Date=class extends Date{static now(){return now;}};
  w.ResizeObserver=class{observe(){}disconnect(){}};
  w.setInterval=(fn,ms)=>{intervals.push({fn,ms});return intervals.length;};w.clearInterval=()=>{};w.scrollTo=()=>{};
  for(const [k,v]of Object.entries(saved))w.localStorage.setItem(k,v);
  w.HTMLElement.prototype.inert=false;w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
  Object.defineProperty(w.document,'fullscreenEnabled',{value:true});w.document.hasFocus=()=>true;
  w.HTMLElement.prototype.requestFullscreen=async function(){w.document.fullscreenElement=this;w.document.dispatchEvent(new w.Event('fullscreenchange'));};w.document.exitFullscreen=async()=>{w.document.fullscreenElement=null;w.document.dispatchEvent(new w.Event('fullscreenchange'));};
  w.URL.createObjectURL=blob=>{downloads.push(blob);return 'blob:receipt';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=()=>{};
  w.fetch=async(input,options={})=>{
   const url=new URL(input,'https://igarciafp.github.io/base4/');
   if(url.pathname==='/base4/acceso')return {ok:true,json:async()=>({ok:true,policy:'base4-prefix2-v1'})};
   if(url.pathname==='/base4/sello'){const data=JSON.parse(options.body);return {ok:true,json:async()=>({...data,firma:'a'.repeat(64)})};}
   const p=path.join(repo,url.pathname),exists=fs.existsSync(p);let text=exists?fs.readFileSync(p,'utf8'):'';
   if(url.pathname.endsWith('/'+activity+'/config.json'))text=JSON.stringify({...JSON.parse(text),guardar:true});
   return {status:exists?200:404,ok:exists,text:async()=>text,json:async()=>JSON.parse(text)};
  };
 }});
 const w=dom.window,d=w.document,$=id=>d.getElementById(id);
 await until(()=>w.Lab?.ready||$('guard-boot-detail').textContent);
 assert.equal(w.Lab?.ready,true,$('guard-boot-detail').textContent+' '+errors.join('; '));
 const key=email=>w.Lab.config.storage.key+'-draft-'+encodeURIComponent(w.Lab.config.version)+'-'+encodeURIComponent(email);
 const storage=()=>Object.fromEntries(Array.from({length:w.localStorage.length},(_,i)=>{const k=w.localStorage.key(i);return [k,w.localStorage.getItem(k)];}));
 async function login(email){$('student').value=email;$('student').dispatchEvent(new w.Event('input',{bubbles:true}));$('attempt-refresh').click();await until(()=>!$('attempt-refresh').disabled);}
 async function start(){assert.equal($('guard-start').disabled,false,$('attempt-status').textContent);$('guard-start').click();await until(()=>!$('cuaderno').hidden);}
 async function pause(){$('practice-save').click();$('guard-confirm-ok').click();await until(()=>!$('setup-stage').hidden&&$('cuaderno').hidden);await login($('student').value);}
 function edit(value){const el=$('js');el.dispatchEvent(new w.InputEvent('beforeinput',{bubbles:true,cancelable:true,inputType:'insertText'}));el.value=value;el.dispatchEvent(new w.InputEvent('input',{bubbles:true,inputType:'insertText'}));}
 return {w,d,$,key,storage,login,start,pause,edit,downloads,intervals,errors,close:()=>w.close()};
}
(async()=>{
 const email='alumno@g.educaand.es';let app=await boot();await app.login(email);await app.start();
 app.edit('// Trabajo antes del cierre');now+=300000;
 const beforeLog=app.$('guard-log').textContent;app.intervals.find(i=>i.ms===300000).fn();
 let saved=JSON.parse(app.w.localStorage.getItem(app.key(email)));
 assert.equal(saved.data.elapsed,300000);assert.equal(saved.data.started,null);assert.equal(app.downloads.length,0);assert.equal(app.$('guard-log').textContent,beforeLog,'el autoguardado no anuncia eventos');
 const checkpoint=app.storage();app.close();now+=3600000;
 app=await boot(checkpoint);assert.equal(app.$('cuaderno').hidden,true,'el login precede a la recuperación');
 await app.login(email);await app.start();saved=JSON.parse(app.w.localStorage.getItem(app.key(email)));
 assert.equal(saved.data.elapsed,300000,'el tiempo cerrado no se descuenta');assert.equal(app.$('js').value,'// Trabajo antes del cierre');assert.equal(attempts.size,1,'no consume otro intento');
 now+=20000;await app.pause();saved=JSON.parse(app.w.localStorage.getItem(app.key(email)));
 assert.equal(saved.phase,'paused');assert.equal(saved.data.elapsed,320000);assert.equal(app.downloads.length,0);assert.equal(sends,0);
 const other='otra@g.educaand.es';await app.login(other);await app.start();assert.notEqual(app.$('js').value,'// Trabajo antes del cierre');app.edit('// Otro alumno');await app.pause();
 assert.ok(app.w.localStorage.getItem(app.key(email)));assert.ok(app.w.localStorage.getItem(app.key(other)));
 await app.login(email);await app.start();assert.equal(app.$('js').value,'// Trabajo antes del cierre');
 app.$('practice-finish').click();app.$('action-confirm-accept').click();await until(()=>app.$('delivery-stage').dataset.state==='success');
 assert.equal(app.w.localStorage.getItem(app.key(email)),null,'la entrega manual borra solo su borrador');assert.ok(app.w.localStorage.getItem(app.key(other)));assert.equal(sends,1);
 await until(()=>app.downloads.length===1);
 const receipt=await app.downloads[0].text();assert.ok(receipt.startsWith('{'));assert.ok(receipt.includes('Código de comprobación:'));assert.ok(receipt.includes('Trabajo antes del cierre'));
 const complete=app.storage();app.close();
 app=await boot(complete);await app.login(email);assert.equal(app.$('guard-start').disabled,true);assert.match(app.$('attempt-status').textContent,/No quedan/);
 for(const [id,a]of attempts)if(a.email===email)attempts.delete(id);
 app.$('attempt-refresh').click();await until(()=>!app.$('attempt-refresh').disabled);await app.start();assert.notEqual(app.$('js').value,'// Trabajo antes del cierre','borrar la fila permite un intento nuevo y vacío');
 now+=app.w.Lab.config.durationMs+1;for(const i of app.intervals.filter(i=>i.ms===250))i.fn();await until(()=>app.$('delivery-stage').dataset.state==='success');
 assert.equal(app.w.localStorage.getItem(app.key(email)),null,'el cierre automático borra el borrador');
 app.close();
 // Un envío fallido conserva un comprobante reenviable, nunca un borrador editable.
 attempts.clear();app=await boot();await app.login(email);await app.start();app.edit('// Pendiente de red');failSend=true;
 app.$('practice-finish').click();app.$('action-confirm-accept').click();await until(()=>app.$('delivery-stage').dataset.state==='error');
 assert.equal(app.w.localStorage.getItem(app.key(email)),null);assert.ok(app.w.localStorage.getItem(app.w.Lab.config.storage.recovery));
 const pending=app.storage();app.close();failSend=false;app=await boot(pending);app.$('recover-delivery').click();await until(()=>app.$('delivery-stage').dataset.state==='success');
 assert.equal(app.$('cuaderno').hidden,true);assert.equal(app.errors.length,0,app.errors.join('; '));app.close();
 console.log('OK: autoguardado silencioso, cierre, reloj congelado, pausa sin descarga, varios alumnos, limpieza manual/automática, límite y reenvío pendiente.');
})().catch(e=>{console.error(e);process.exit(1);});
