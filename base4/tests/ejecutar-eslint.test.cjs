const path=require('node:path'),assert=require('node:assert/strict');
// Requiere Playwright: npm install --no-save playwright
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.resolve(path.dirname(process.execPath),'../node_modules/playwright')));}
const fs=require('node:fs/promises'),http=require('node:http'),root=path.resolve(__dirname,'../..');
const email='igarcas306@g.educaand.es';let base;
// El servidor de prueba elimina la entrega remota y el control de red SOLO en memoria.
const server=http.createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'');
  if(!/^(base|base4)\//.test(name))throw Error('Invalid path');
  const file=path.resolve(root,name.endsWith('/')?name+'index.html':name),relative=path.relative(root,file);
  if(relative.startsWith('..')||path.isAbsolute(relative))throw Error('Invalid path');
  let bytes=await fs.readFile(file);
  if(name==='base4/contenido/config.json'){const c=JSON.parse(bytes);c.delivery={type:'archivo'};c.control={};bytes=Buffer.from(JSON.stringify(c));}
  if(name==='base4/motor/cargador.js'){
   let text=bytes.toString(),begin=text.indexOf('    // Sin respuesta positiva del servidor'),end=text.indexOf('    const settingsResponse=',begin);
   assert.ok(begin>0&&end>begin);
   text=text.slice(0,begin)+"    const server='',key='';\n"+text.slice(end);
   const anchor='    window.Lab={config,code,sections,sectionMode,ready:false};';assert.ok(text.includes(anchor));
   text=text.replace(anchor,"    config.control=null;config.delivery={type:'archivo',requireAttemptLimit:false,requireEncryptedStorage:false};\n"+anchor);bytes=Buffer.from(text);
  }
  res.writeHead(200,{'Content-Type':file.endsWith('.js')?'text/javascript':file.endsWith('.json')?'application/json':file.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-store'});res.end(bytes);
 }catch{res.writeHead(404);res.end();}
});

let browser;
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 base='http://127.0.0.1:'+server.address().port+'/base4/?a=dwec/02-08-examen-ud02-2026-11-27';
 browser=await chromium.launch({channel:'msedge',headless:true});
 async function open(language='es'){
  const context=await browser.newContext({viewport:{width:1440,height:1000}});await context.addInitScript(()=>{document.hasFocus=()=>true;});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'&lang='+language);await page.locator('#student').waitFor({state:'visible'});await page.locator('#student').fill(email);await page.waitForFunction(()=>window.Lab?.ready);await page.locator('#guard-start').click();await page.locator('#cuaderno').waitFor({state:'visible'});
  return {page,context,errors};
 }
 const {page,context,errors}=await open();let workers=0;page.on('worker',()=>workers++);
 await page.locator('[data-editor=js]').click();const initial=await page.locator('#preview').getAttribute('srcdoc');
 await page.locator('#js').fill('while(true){}');assert.equal(workers,0);assert.equal(await page.locator('#preview').getAttribute('srcdoc'),initial);
 async function run(){await page.locator('#preview-run').click();await page.waitForFunction(()=>!document.getElementById('preview-run').disabled);}
 for(const code of ['while(true){}','let i=0;while(i<10){}','for(;;){}','const = ;']){
  await page.locator('#js').fill(code);await run();
  assert.equal(await page.locator('#js').inputValue(),code);assert.equal(await page.locator('#preview').getAttribute('srcdoc'),initial);
  assert.ok((await page.locator('#preview-console').textContent()).length>0);assert.match(await page.locator('#preview-status').textContent(),/Sin ejecutar/);
 }
 if(process.env.BASE4_ESLINT_SCREENSHOT)await page.screenshot({path:process.env.BASE4_ESLINT_SCREENSHOT,fullPage:true});
 await page.locator('#js').fill('let i=0;while(i<3){i++;}console.log("OK"+i);');await run();await page.waitForFunction(()=>document.getElementById('preview-console').textContent.includes('OK3'));
 await page.locator('#js').fill('while(true){break;}console.log("SALIDA");');await run();await page.waitForFunction(()=>document.getElementById('preview-console').textContent.includes('SALIDA'));
 const previous=await page.locator('#preview').getAttribute('srcdoc');
 await page.locator('[data-editor=html]').click();
 for(const html of ['<script>while(true){}</script>','<button onclick="while(true){}">Prueba</button>']){
  await page.locator('#html').fill(html);await run();assert.equal(await page.locator('#preview').getAttribute('srcdoc'),previous);assert.match(await page.locator('#preview-console').textContent(),/HTML/);
 }
 await page.locator('#html').fill('<h1>Prueba</h1>');await page.locator('[data-editor=js]').click();await page.locator('#js').fill('console.log("SIN ANALISIS");');
 await page.evaluate(()=>{window.__Worker=window.Worker;window.Worker=class{constructor(){throw Error('Worker no disponible');}};});
 await page.waitForTimeout(450);const beforeFailure=await page.locator('#preview').getAttribute('srcdoc');await run();assert.equal(await page.locator('#preview').getAttribute('srcdoc'),beforeFailure);assert.match(await page.locator('#preview-console').textContent(),/No se pudo comprobar/);await page.evaluate(()=>{window.Worker=window.__Worker;});
 await page.evaluate(()=>{window.__check=window.LabJSCheck.check;window.LabJSCheck.check=async(...args)=>{await new Promise(resolve=>setTimeout(resolve,200));return window.__check(...args);};});
 await page.locator('#preview-run').click();await page.locator('#js').fill('console.log("CAMBIO POSTERIOR");');await page.waitForFunction(()=>!document.getElementById('preview-run').disabled);
 assert.equal(await page.locator('#preview').getAttribute('srcdoc'),beforeFailure);assert.deepEqual(errors,[]);assert.equal(await page.locator('#guard-warning').isVisible(),false);await context.close();
 const english=await open('en');await english.page.locator('[data-editor=js]').click();await english.page.locator('#js').fill('while(true){}');await english.page.locator('#preview-run').click();await english.page.waitForFunction(()=>!document.getElementById('preview-run').disabled);
 assert.match(await english.page.locator('#preview-status').textContent(),/Not executed/);assert.match(await english.page.locator('#preview-console').textContent(),/Constant loop condition/);assert.deepEqual(english.errors,[]);await english.context.close();
 console.log('OK: ESLint solo al ejecutar; bloqueo de bucles y sintaxis; código y resultado conservados; scripts/eventos HTML; salidas válidas; fallos y cambios durante el análisis; español e inglés.');
 await browser.close();
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1;}).finally(()=>new Promise(resolve=>server.close(resolve)));
