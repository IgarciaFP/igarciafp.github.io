// npm install jsdom; NODE_PATH may point to a separate test-only installation.
const {JSDOM}=require('jsdom'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{webcrypto}=require('node:crypto'),{gunzipSync}=require('node:zlib');
const root=path.resolve(__dirname,'..');
const S=require('../motor/apartados.js'),T=require('../motor/herramientas.js');
async function main(){
 const folder='actividades/diw/01-01-tarjeta-de-presentacion/',activity=JSON.parse(fs.readFileSync(path.join(root,folder,'config.json'),'utf8'));
 const read=async p=>({text:async()=>fs.readFileSync(path.join(root,p),'utf8'),json:async()=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'))});
 const sections=await S.load(activity,folder,read,async p=>fs.existsSync(path.join(root,p))?fs.readFileSync(path.join(root,p),'utf8'):'');
 const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.com/base4/?a=diw/01-01-tarjeta-de-presentacion'});
 const w=dom.window,d=w.document;Object.defineProperty(w,'crypto',{value:webcrypto});
 Object.assign(w,{CompressionStream,DecompressionStream,Response,Blob,TextEncoder,TextDecoder,AbortSignal});w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.installPracticeInputGuards=()=>{};
 const common=JSON.parse(fs.readFileSync(path.join(root,'contenido/config.json'),'utf8'));
 w.Lab={sectionMode:true,sections,code:sections[0].code,config:{...common,delivery:{type:'archivo'},control:null,durationMs:900000,module:'DIW',activity:'01-01-tarjeta-de-presentacion',activityTitle:activity.title,title:'DIW'+activity.title,id:'DIW-01-01-TARJETA-DE-PRESENTACION',version:'2',maxSubmissions:1,storage:{key:'test',legacyKey:'old',recovery:'recovery'},tools:T.settings(activity,'diw','01-01-tarjeta-de-presentacion')}};
 let adapter,saved;
 w.createPracticeGuard=a=>{
  adapter=a;a.restore(a.empty());a.setEnabled(true);
  return {canEdit:()=>true,saveEdit:()=>{saved=a.sanitize(a.snapshot());return true;},render(){},canDownloadReport:()=>false};
 };
 for(const f of ['apartados.js','apartados-ui.js','herramientas.js','laboratorio.js'])w.eval(fs.readFileSync(path.join(root,'motor',f),'utf8'));
 assert.equal(w.Lab.ready,true);assert.equal(d.querySelectorAll('#toolbar-tools button').length,6);
 const go=n=>d.querySelectorAll('#section-nav button')[n].click();
 const input=(el,value)=>{el.value=value;el.dispatchEvent(new w.Event('input',{bubbles:true}));};
 input(d.getElementById('student'),'alumno@g.educaand.es');input(d.getElementById('html'),'<h1>Mi tarjeta final</h1>');
 go(1);input(d.querySelector('#question-fields textarea'),'He aumentado el contraste para facilitar la lectura.');
 go(2);d.querySelectorAll('#question-fields input')[1].click();
 const full=adapter.sanitize(adapter.snapshot());assert.equal(full.sections.values.tarjeta.html,'<h1>Mi tarjeta final</h1>');assert.equal(full.sections.values.comprobacion.enlace,'1');
 adapter.restore(full);assert.equal(d.querySelectorAll('#question-fields input')[1].checked,true);
 const packed=await adapter.makeReport({},true,Date.now(),{finishReason:'start'});
 const text=gunzipSync(Buffer.from(packed.slice(common.format.report.length),'base64url')).toString('utf8');
 const report=JSON.parse(text.split('\nCódigo de comprobación: ')[0]);assert.equal(report.sectionsVersion,1);
 const restored=S.unpack(report.answers);assert.equal(restored.values.tarjeta.html,'<h1>Mi tarjeta final</h1>');assert.ok(restored.values.explicacion.legibilidad.includes('contraste'));assert.equal(restored.values.comprobacion.enlace,'1');assert.equal(restored.values.comprobacion.espacio,'');
 assert.ok(report.answers.length<=10&&report.answers.every(a=>a.answer.length<=10000));
 // Every tool opens within the document; neither input changes nor calculations change answers.
 const before=JSON.stringify(adapter.snapshot().sections);
 const calc=d.querySelector('[data-tool=calculadora]');calc.click();const panel=d.querySelector('#tool-content');input(panel.querySelector('input'),'2*(3+4)');panel.querySelector('button').click();assert.equal(panel.querySelector('[role=status]').textContent,'14');
 assert.equal(JSON.stringify(adapter.snapshot().sections),before);
 d.getElementById('tool-dialog').close();
 // File mode test performs no external submission and sends no student data.
 assert.ok(saved.sections);dom.window.close();
 const review=new JSDOM(fs.readFileSync(path.join(root,'profesor.html'),'utf8'),{runScripts:'outside-only',url:'https://example.com/base4/profesor.html'});
 const rw=review.window;Object.defineProperty(rw,'crypto',{value:webcrypto});Object.assign(rw,{CompressionStream,DecompressionStream,Response,Blob,TextEncoder,TextDecoder});
 rw.fetch=async url=>{const relative=new URL(url,'https://example.com/base4/profesor.html').pathname.replace('/base4/','');const file=path.join(root,relative);const exists=fs.existsSync(file);return {ok:exists,status:exists?200:404,text:async()=>exists?fs.readFileSync(file,'utf8'):'',json:async()=>JSON.parse(fs.readFileSync(file,'utf8'))};};
 rw.eval(fs.readFileSync(path.join(root,'motor/apartados.js'),'utf8'));
 const script=[...rw.document.querySelectorAll('script')].find(el=>!el.src).textContent;
 new Function(script);
 await rw.eval(script.replace('window.reviewReady=true;','window.reviewReady=true;window.reviewTest={parse,items,select};'));
 const item=await rw.reviewTest.parse(packed);rw.reviewTest.items.set(item.id,item);rw.reviewTest.select(item.id);
 assert.equal(rw.document.querySelectorAll('#review-sections button').length,3);
 assert.ok(rw.document.getElementById('codigo').textContent.includes('Mi tarjeta final'));
 rw.document.querySelectorAll('#review-sections button')[1].click();assert.ok(rw.document.getElementById('review-questions').textContent.includes('contraste'));
 rw.document.querySelectorAll('#review-sections button')[2].click();assert.ok(rw.document.getElementById('review-questions').textContent.includes('Sin responder'));assert.ok(rw.document.getElementById('review-questions').textContent.includes('Elegida'));
 review.window.close();
 console.log('OK: complete adapter boot, saved state, gzip report, blank questions, internal tools and teacher review of all sections.');
}
main().catch(e=>{console.error(e);process.exit(1);});
