const {JSDOM,ResourceLoader,VirtualConsole}=require('jsdom');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{webcrypto}=require('node:crypto'),{gzipSync,gunzipSync}=require('node:zlib');
const root=path.resolve(__dirname,'../..'),slug='02-01-pausa-prueba';let now=1800000000000;
const tick=()=>new Promise(r=>setTimeout(r,15));
async function until(check){for(let i=0;i<150;i++){if(check())return;await tick();}assert.ok(check(),'La operación no terminó');}
async function boot(module,kind,{saved={},pause=true}={}){
 const key=module+'/'+slug,folder='/base4/actividades/'+key+'/',files=new Map(),errors=[],downloads=[];
 const definitions={webcode:{id:'codigo',tipo:'webcode',titulo:'Programar',archivos:['html','css','js']},qa:{id:'explica',tipo:'qa',titulo:'Explicar'},test:{id:'elige',tipo:'test',titulo:'Elegir'}};
 const config={title:'02-01-Prueba de pausa',version:'1',guardar:pause,duracion:10,entregas:1,penalizacionSalidaPorcentaje:25};
 const kinds=kind==='mixta'?['webcode','qa','test']:[kind];if(kind!=='legacy')config.apartados=kinds.map(type=>definitions[type]);
 files.set('config.json',JSON.stringify(config));files.set('enunciado.html','<p>Completa la actividad.</p>');files.set('codigo.html','<p>Inicial</p>');
 for(const type of kinds){const section=definitions[type];if(!section)continue;const base='apartados/'+section.id+'/';files.set(base+'enunciado.html','<p>Completa el apartado.</p>');
  if(type==='webcode'){files.set(base+'codigo.html','<p>Inicial</p>');files.set(base+'codigo.css','');files.set(base+'codigo.js','');}
  else files.set(base+'preguntas.json',JSON.stringify([{id:'q1',enunciado:'Respuesta de prueba',...(type==='test'?{opciones:['Uno','Dos','Tres','Cuatro']}:{})}]));
 }
 class Resources extends ResourceLoader{fetch(url){const p=path.join(root,new URL(url).pathname);return fs.existsSync(p)?Promise.resolve(fs.readFileSync(p)):null;}}
 const vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(fs.readFileSync(path.join(root,'base4/index.html'),'utf8'),{url:'https://example.com/base4/?a='+key,resources:new Resources(),runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  Object.defineProperty(w,'crypto',{value:webcrypto});Object.assign(w,{CompressionStream,DecompressionStream,Response,Blob,TextEncoder,TextDecoder,AbortSignal,structuredClone});
  w.Date=class extends Date{static now(){return now;}};w.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};w.setInterval=()=>1;w.clearInterval=()=>{};
  for(const [k,v]of Object.entries(saved))w.localStorage.setItem(k,v);
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};w.HTMLElement.prototype.inert=false;
  Object.defineProperty(w.document,'fullscreenEnabled',{value:true});w.document.hasFocus=()=>true;
  w.HTMLElement.prototype.requestFullscreen=async function(){w.document.fullscreenElement=this;w.document.dispatchEvent(new w.Event('fullscreenchange'));};
  w.document.exitFullscreen=async()=>{w.document.fullscreenElement=null;w.document.dispatchEvent(new w.Event('fullscreenchange'));};
  w.URL.createObjectURL=blob=>{downloads.push({blob});return 'blob:test';};w.URL.revokeObjectURL=()=>{};w.HTMLAnchorElement.prototype.click=function(){downloads.at(-1).name=this.download;};
  w.fetch=async input=>{const url=new URL(input,'https://example.com/base4/');
   if(url.pathname==='/base4/acceso')return {ok:true,json:async()=>({ok:true,policy:'base4-prefix2-v1'})};
   let text,exists=true;
   if(url.pathname.startsWith(folder)){const p=url.pathname.slice(folder.length);exists=files.has(p);text=files.get(p)||'';}
   else{const p=path.join(root,url.pathname);exists=fs.existsSync(p);text=exists?fs.readFileSync(p,'utf8'):'';if(url.pathname==='/base4/contenido/config.json'){const c=JSON.parse(text);c.delivery={type:'archivo'};text=JSON.stringify(c);}}
   return {status:exists?200:404,ok:exists,text:async()=>text,json:async()=>JSON.parse(text)};
  };
 }});
 const w=dom.window,d=w.document,$=id=>d.getElementById(id);await until(()=>w.Lab?.ready||$('guard-boot-detail').textContent);assert.equal(w.Lab?.ready,true,$('guard-boot-detail').textContent+' '+errors.join('; '));
 const storage=()=>Object.fromEntries(Array.from({length:w.localStorage.length},(_,i)=>{const k=w.localStorage.key(i);return [k,w.localStorage.getItem(k)];}));
 const draft=()=>Object.entries(storage()).find(([k])=>k.includes('-draft-'));
 const login=()=>{$('student').value='alumno@g.educaand.es';$('student').dispatchEvent(new w.Event('input',{bubbles:true}));};
 const edit=(el,value)=>{el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
 const choose=async text=>{Object.defineProperty($('file-delivery-input'),'files',{configurable:true,value:[{name:'entrega.txt',size:text.length,text:async()=>text}]});$('file-delivery-input').dispatchEvent(new w.Event('change'));await until(()=>!$('file-delivery-send').disabled||!/Comprobando/.test($('file-delivery-status').textContent));};
 return {w,d,$,downloads,errors,storage,draft,login,edit,choose,close:()=>w.close()};
}
(async()=>{
 for(const [module,kind]of [['diw','legacy'],['dwec','mixta'],['ssii','qa'],['ssii','test']]){
  let app=await boot(module,kind);app.login();assert.equal(app.$('file-delivery-open').hidden,false,'Sin copia local debe aparecer Recuperar');app.$('guard-start').click();await until(()=>!app.$('cuaderno').hidden);
  if(kind==='legacy')app.edit(app.$('html'),'<p>Respuesta conservada</p>');
  else for(const [i,section]of app.w.Lab.sections.entries()){
   app.d.querySelectorAll('#section-nav button')[i].click();
   if(section.type==='webcode')app.edit(app.$('html'),'<p>Respuesta conservada</p>');
   else if(section.type==='qa')app.edit(app.d.querySelector('#question-fields textarea'),'Explicación conservada');
   else app.d.querySelectorAll('#question-fields input')[2].click();
  }
  now+=121000;app.$('practice-save').click();app.$('guard-confirm-ok').click();await until(()=>app.downloads.length===1&&app.$('cuaderno').hidden&&!app.$('setup-stage').hidden);
  app.login();assert.equal(app.$('file-delivery-open').hidden,true,'Con borrador local se usa la recuperación automática');assert.equal(app.downloads[0].name,'entrega.txt');
  const prefix=app.w.Lab.config.format.report,file=await app.downloads[0].blob.text(),paused=JSON.parse(gunzipSync(Buffer.from(file.slice(prefix.length),'base64url')));
  assert.equal(paused.state.phase,'paused');assert.equal(paused.activityVersion,'1');assert.equal(paused.state.data.elapsed,121000);const original=structuredClone(paused.state.data);
  // Un plazo ya reducido debe seguir reducido al recuperar desde el archivo.
  paused.state.returnPenalties=1;paused.state.returnRemainingMs=9000;
  const reduced=prefix+gzipSync(JSON.stringify(paused)).toString('base64url'),cache=app.storage();assert.deepEqual(app.errors,[]);app.close();now+=3600000;
  app=await boot(module,kind,{saved:cache});app.login();assert.equal(app.$('file-delivery-open').hidden,true);app.close();
  // Caché borrada: la copia externa recupera la misma práctica e intento.
  app=await boot(module,kind);assert.equal(app.$('file-delivery-open').hidden,false);await app.choose(reduced);assert.equal(app.$('student').value,'alumno@g.educaand.es');assert.equal(app.$('file-delivery-send').disabled,false,app.$('file-delivery-status').textContent);
  app.$('file-delivery-send').click();await until(()=>!app.$('cuaderno').hidden);const restored=JSON.parse(app.draft()[1]);
  assert.equal(restored.data.elapsed,121000,'El tiempo cerrado no se descuenta');assert.equal(restored.data.attempt.id,original.attempt.id);assert.equal(restored.data.attempt.token,original.attempt.token);assert.deepEqual(restored.data.values,original.values);assert.deepEqual(restored.data.sections,original.sections);assert.equal(restored.returnPenalties,1);assert.equal(restored.returnRemainingMs,9000);assert.equal(restored.recoveries,paused.state.recoveries+1);assert.deepEqual(app.errors,[]);app.close();
  console.log('OK: '+module+' · '+kind+' · entrega.txt, caché presente/borrada, respuestas, reloj, intento y margen conservados.');
 }
 const app=await boot('dwec','mixta',{pause:false});assert.equal(app.$('file-delivery-open').hidden,true);assert.equal(app.$('practice-save').hidden,true);app.close();console.log('OK: pausa desactivada sin botón de recuperación.');
})().catch(e=>{console.error(e);process.exit(1);});
