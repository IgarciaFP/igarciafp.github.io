// Recorre todas las actividades reales, sin reservar intentos ni contactar servicios externos.
const {JSDOM,ResourceLoader,VirtualConsole}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{webcrypto}=require('node:crypto');
const root=path.resolve(__dirname,'../..'),activities=path.join(root,'base4/actividades');
class Resources extends ResourceLoader{fetch(url){const target=path.join(root,new URL(url).pathname);return fs.existsSync(target)&&fs.statSync(target).isFile()?Promise.resolve(fs.readFileSync(target)):null;}}
const wait=()=>new Promise(resolve=>setTimeout(resolve,10));
async function check(key){
 const errors=[],vc=new VirtualConsole();vc.on('jsdomError',e=>errors.push(e.message));
 const dom=new JSDOM(fs.readFileSync(path.join(root,'base4/index.html'),'utf8'),{url:'https://example.com/base4/?a='+key,resources:new Resources(),runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(w){
  Object.defineProperty(w,'crypto',{value:webcrypto});Object.assign(w,{CompressionStream,DecompressionStream,Response,Blob,TextEncoder,TextDecoder,AbortSignal,structuredClone});
  w.ResizeObserver=class{observe(){}disconnect(){}};w.scrollTo=()=>{};w.setInterval=()=>1;w.clearInterval=()=>{};w.HTMLElement.prototype.inert=false;
  w.fetch=async input=>{const url=new URL(input,'https://example.com/base4/');if(url.pathname==='/base4/acceso')return {ok:true,json:async()=>({ok:true,policy:'base4-prefix2-v1'})};
   const target=path.join(root,url.pathname),exists=fs.existsSync(target)&&fs.statSync(target).isFile();let text=exists?fs.readFileSync(target,'utf8'):'';
   if(url.pathname==='/base4/contenido/config.json'){const config=JSON.parse(text);config.delivery={type:'archivo'};text=JSON.stringify(config);}
   return {status:exists?200:404,ok:exists,text:async()=>text,json:async()=>JSON.parse(text)};
  };
 }});
 const w=dom.window,d=w.document;let entered=false;
 try{
  for(let i=0;i<800&&!w.Lab?.ready&&!d.getElementById('guard-boot-detail').textContent;i++){
   const student=d.getElementById('student');if(!entered&&!d.getElementById('setup-stage').hidden){student.value='igarcas306@g.educaand.es';student.dispatchEvent(new w.Event('input',{bubbles:true}));entered=true;}await wait();
  }
  assert.equal(w.Lab?.ready,true,key+': '+d.getElementById('guard-boot-detail').textContent+' '+errors.join('; '));
  assert.ok(w.Lab.sections.length>0);for(const section of w.Lab.sections){assert.ok(section.statement?.trim(),key+' / '+section.id);if(section.type!=='webcode')assert.ok(section.questions.length>0);}
  assert.equal(w.Lab.config.id,w.Lab.config.module+'-'+w.Lab.config.activity.toUpperCase());assert.equal(w.Lab.config.activity,key.split('/')[1]);assert.equal(w.Lab.config.localDrafts,true);
  assert.equal(d.getElementById('file-delivery-open').hidden,!w.Lab.config.allowSaveRecovery);assert.deepEqual(errors,[],key);
  console.log('OK: '+key+' · '+w.Lab.sections.map(s=>s.type).join(', '));
 }finally{w.close();}
}
(async()=>{let count=0;for(const module of ['diw','dwec','ssii'])for(const name of fs.readdirSync(path.join(activities,module))){if(fs.existsSync(path.join(activities,module,name,'config.json'))){await check(module+'/'+name);count++;}}console.log('OK: '+count+' actividades reales arrancan con sus archivos y configuración.');})().catch(error=>{console.error(error);process.exit(1);});
