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
async function boot(context,language='es'){
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'&lang='+language);await identify(page);return {page,errors};
}
async function identify(page){await page.locator('#student').waitFor({state:'visible'});await page.locator('#student').fill(email);await page.waitForFunction(()=>window.Lab?.ready);await page.locator('#guard-start').click();}
const state=page=>page.evaluate(()=>{const c=window.Lab.config;return JSON.parse(localStorage.getItem(c.storage.key+'-draft-'+encodeURIComponent(c.version)+'-'+encodeURIComponent(document.getElementById('student').value)));});
async function focusLoss(page){await page.evaluate(()=>{window.__focused=false;window.dispatchEvent(new Event('blur'));});await page.waitForFunction(()=>document.getElementById('answer-fields').disabled);await page.waitForTimeout(300);}
async function exceed(page,seconds,expectWarning=true){await page.evaluate(seconds=>{window.__offset+=seconds*1000;window.__focused=true;window.dispatchEvent(new Event('focus'));},seconds);if(expectWarning)await page.locator('#guard-warning').waitFor({state:'visible'});}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 base='http://127.0.0.1:'+server.address().port+'/base4/?a=dwec/02-08-examen-ud02-2026-11-27';
 browser=await chromium.launch({channel:'msedge',headless:true});
 const context=await browser.newContext({viewport:{width:1280,height:950}});
 await context.addInitScript(()=>{window.__offset=0;window.__focused=true;const now=Date.now.bind(Date);Date.now=()=>now()+window.__offset;document.hasFocus=()=>window.__focused;});
 const {page,errors}=await boot(context),downloads=[];page.on('download',d=>downloads.push(d));
 await page.locator('#cuaderno').waitFor({state:'visible'});assert.equal((await state(page)).returnRemainingMs,12000);
 await page.locator('[data-editor=js]').click();await page.locator('#js').fill('// Respuesta conservada');
 for(let n=1;n<=3;n++){
  await focusLoss(page);await exceed(page,[13,10,7,4][n-1]);
  let saved=await state(page);assert.equal(saved.phase,'active');assert.equal(saved.pending,'penalty');assert.equal(saved.returnPenalties,n-1);assert.equal(downloads.length,0);
  assert.match(await page.locator('#guard-warning-text').textContent(),/25 % del tiempo restante/);
  assert.match(await page.locator('#guard-warning-count').textContent(),new RegExp(String(12-3*n)+' segundos'));
  if(n===2){
   await page.reload();await identify(page);await page.locator('#guard-warning').waitFor({state:'visible'});
   saved=await state(page);assert.equal(saved.pending,'penalty');assert.equal(saved.returnPenalties,1);assert.equal(saved.phase,'active');
  }
  const before=saved.data.elapsed;
  const remaining=await page.evaluate(()=>{const c=window.Lab.config,key=c.storage.key+'-draft-'+encodeURIComponent(c.version)+'-'+encodeURIComponent(document.getElementById('student').value),state=JSON.parse(localStorage.getItem(key));return c.durationMs-state.data.elapsed;});
  if(n===3){
   await page.evaluate(async()=>{await document.exitFullscreen();window.__originalRequest=document.documentElement.requestFullscreen;document.documentElement.requestFullscreen=async()=>{throw Error('Permiso denegado de prueba');};});
   await page.locator('#guard-continue').click();await page.waitForFunction(()=>!document.getElementById('guard-continue').disabled);
   assert.equal((await state(page)).returnPenalties,n-1);assert.equal((await state(page)).pending,'penalty');
   await page.evaluate(()=>{document.documentElement.requestFullscreen=window.__originalRequest;});
   await page.locator('#guard-continue').click();
  }else
  await page.locator('#guard-continue').evaluate(button=>{button.click();button.click();});
  await page.waitForFunction(()=>!document.getElementById('answer-fields').disabled);
  saved=await state(page);assert.equal(saved.phase,'active');assert.equal(saved.pending,null);assert.equal(saved.returnPenalties,n);
  assert.equal(saved.returnRemainingMs,(12-3*n)*1000);assert.ok(Math.abs(saved.data.elapsed-before-remaining*.25)<2000,JSON.stringify({before,after:saved.data.elapsed,remaining}));
  assert.equal(await page.locator('#js').inputValue(),'// Respuesta conservada');assert.equal(downloads.length,0);
  console.log('OK: penalización '+n+' aplicada una vez; margen '+saved.returnRemainingMs/1000+' s; respuestas conservadas.');
 }
 await focusLoss(page);await exceed(page,4,false);
 await page.waitForFunction(()=>document.getElementById('delivery-stage').hidden===false);await page.waitForTimeout(300);
 assert.equal(downloads.length,1);assert.deepEqual(errors,[]);
 console.log('OK: el último margen de 3 segundos termina con una única entrega automática.');
 await context.close();
 const enContext=await browser.newContext();await enContext.addInitScript(()=>{window.__offset=0;window.__focused=true;const now=Date.now.bind(Date);Date.now=()=>now()+window.__offset;document.hasFocus=()=>window.__focused;});
 const en=await boot(enContext,'en');await focusLoss(en.page);await exceed(en.page,13);
 assert.equal(await en.page.locator('#guard-continue').textContent(),'Accept');assert.match(await en.page.locator('#guard-warning-text').textContent(),/25% of your remaining time/);assert.match(await en.page.locator('#guard-warning-count').textContent(),/9 seconds/);assert.deepEqual(en.errors,[]);await enContext.close();
 console.log('OK: aviso y aceptación en inglés.');
 const legacyContext=await browser.newContext();await legacyContext.addInitScript(()=>{window.__offset=0;window.__focused=true;const now=Date.now.bind(Date);Date.now=()=>now()+window.__offset;document.hasFocus=()=>window.__focused;});
 await legacyContext.route('**/02-08-examen-ud02-2026-11-27/config.json*',async route=>{const response=await route.fetch();const config=await response.json();config.penalizacionSalidaMinutos=0;config.penalizacionSalidaPorcentaje=0;await route.fulfill({json:config});});
 const legacy=await boot(legacyContext),legacyDownloads=[];legacy.page.on('download',d=>legacyDownloads.push(d));await focusLoss(legacy.page);await exceed(legacy.page,13,false);
 await legacy.page.waitForFunction(()=>document.getElementById('delivery-stage').hidden===false);await legacy.page.waitForTimeout(300);
 assert.equal(legacyDownloads.length,1);assert.deepEqual(legacy.errors,[]);await legacyContext.close();
 console.log('OK: sin activar la opción se conserva la entrega automática anterior.');
 await browser.close();
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1;}).finally(()=>new Promise(resolve=>server.close(resolve)));
