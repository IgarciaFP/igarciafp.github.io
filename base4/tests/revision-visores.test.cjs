const fs=require('node:fs'),fsp=require('node:fs/promises'),http=require('node:http'),path=require('node:path'),crypto=require('node:crypto'),zlib=require('node:zlib'),assert=require('node:assert/strict');
let chromium;try{({chromium}=require('playwright'));}catch{({chromium}=require(path.resolve(path.dirname(process.execPath),'../node_modules/playwright')));}
const root=path.resolve(__dirname,'../..'),M=require('../motor/revision-modelo.js'),S=require('../motor/apartados.js'),cipher=require('../motor/contenido-cifrado.js');
const activity={module:'dwec',id:'02-01-prueba',version:'1'},folder='base4/actividades/dwec/02-01-prueba/',files=new Map();
let encrypted=false,noSolution=false,base,browser;
const defs=[{id:'web',type:'webcode',title:'Código',code:{html:'<p>Inicial</p>',css:'',js:'',txt:''}},{id:'texto',type:'qa',title:'Explicación',questions:[{id:'q1',text:'Pregunta abierta'},{id:'hueco',text:'Completa el fragmento',code:'const n = ____;',format:'gaps'}]},{id:'test',type:'test',title:'Test',questions:[{id:'q2',text:'Selecciona una opción',options:['Uno','Dos','Tres','Cuatro']}]}];
const answer=S.initial(defs);answer.values.web.html='<p>Alumno</p>';answer.values.texto.q1='Respuesta del alumno';answer.values.texto.hueco='["5"]';answer.values.test.q2='0';
const report={version:3,exam:'DWEC-02-01-PRUEBA',module:'DWEC',activity:activity.id,activityTitle:'02-01-Prueba',activityVersion:'1',email:'alumno@g.educaand.es',name:'alumno',seconds:30,attemptId:'b'.repeat(32),sectionsVersion:1,sectionDefinitions:defs.map(({code,...s})=>s),answers:S.pack(defs,answer),modified:['web','texto','test'],audit:'Prueba'};
const body=JSON.stringify(report),id=crypto.createHash('sha256').update(body).digest('hex'),receipt='SSII3G.'+zlib.gzipSync(Buffer.from(body+'\nCódigo de comprobación: SSII3-'+id)).toString('base64url');
const score=(id,earned,max,status)=>({id,title:id,status,score:{earned,max},summary:'Detalle individual',positives:['Acierto verificable'],errors:status==='incorrect'?['Error comprobado']:[],improvements:['Mejora concreta'],evidence:['Prueba de referencia']});
const analysis={format:'base4-analysis-v1',submissionId:id,activity,solutionVersion:'modelo-1',score:{earned:5,max:10},summary:'Análisis de prueba',sections:[{id:'web',type:'webcode',score:{earned:3,max:5},items:[score('funciona',3,5,'partial')]},{id:'texto',type:'qa',score:{earned:2,max:2},items:[score('q1',1,1,'correct'),score('hueco',1,1,'correct')]},{id:'test',type:'test',score:{earned:0,max:3},items:[score('q2',0,3,'incorrect')]}]};
const solution={format:'base4-solution-v1',activity,revision:'modelo-1',sections:[{id:'web',type:'webcode',code:{html:'<p>Modelo</p>',css:'p{color:blue}',js:'console.log(1);'}},{id:'texto',type:'qa',questions:[{id:'q1',answer:'<img src=x onerror="window.__bad=1">Referencia',explanation:'Respuesta equivalente admitida'}]},{id:'test',type:'test',questions:[{id:'q2',answer:'Dos',correctOption:1}]}]};
solution.sections[1].questions.push({id:'hueco',answer:'const n = 5;'});
const config={title:'02-01-Prueba',version:'1',apartados:defs.map(s=>({id:s.id,tipo:s.type,titulo:s.title,...(s.type==='webcode'?{archivos:['html','css','js']}:{})}))};
files.set('config.json',JSON.stringify(config));files.set('apartados/web/enunciado.html','<p>Actividad de código</p>');files.set('apartados/web/codigo.html','<p>Inicial</p>');files.set('apartados/web/codigo.css','');files.set('apartados/web/codigo.js','');
for(const section of defs.slice(1)){files.set('apartados/'+section.id+'/enunciado.html','<p>Responde</p>');files.set('apartados/'+section.id+'/preguntas.json',JSON.stringify(section.questions.map(q=>({id:q.id,enunciado:q.text,...(q.options?{opciones:q.options}:{}),...(q.code?{codigo:q.code,formato:q.format}:{})}))));}
let envelope;
const server=http.createServer(async(req,res)=>{
 try{
  const name=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'');let data;
  if(name.startsWith(folder)){
   const relative=name.slice(folder.length);
   if(/(?:^|\/)solucion\.json$/.test(relative)){if(noSolution)throw Error('404');data=JSON.stringify(solution);}
   else if(relative==='config.json')data=encrypted?JSON.stringify({title:config.title,version:'1',cifrado:{archivo:'contenido.cifrado.json',modo:'email-domain',dominio:'g.educaand.es'}}):files.get(relative);
   else if(relative==='contenido.cifrado.json')data=JSON.stringify(envelope);
   else if(encrypted&&!/codigo\.(html|css)$/.test(relative))throw Error('404');
   else if(files.has(relative))data=files.get(relative);else throw Error('404');
  }else if(name==='base4/motor/notas.js')data="window.ReviewAuth={logged:true};document.getElementById('login-page').hidden=true;document.getElementById('review-app').hidden=false;window.ReviewRequest=async()=>({ok:true});";
  else if(name==='base4/contenido/config.json'){const c=JSON.parse(await fsp.readFile(path.join(root,name),'utf8'));c.control=null;c.delivery={type:'archivo'};data=JSON.stringify(c);}
  else{const target=path.resolve(root,name);if(path.relative(root,target).startsWith('..'))throw Error('404');data=await fsp.readFile(target);}
  res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript':name.endsWith('.json')?'application/json':name.endsWith('.css')?'text/css':'text/html','Cache-Control':'no-store'});res.end(data);
 }catch{res.writeHead(404);res.end();}
});
(async()=>{
 envelope=await cipher.encrypt({format:'base4-files-v1',files:Object.fromEntries([...files].filter(([name])=>!/codigo\.(html|css)$/.test(name)))},'g.educaand.es');
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));base='http://127.0.0.1:'+server.address().port;
 const wrapped=await M.pack(receipt,analysis);browser=await chromium.launch({channel:'msedge',headless:true});
 for(const pageName of ['revisor.html','profesor.html'])for(const mode of ['nuevo','antiguo','cifrado']){
  encrypted=mode==='cifrado';noSolution=false;const context=await browser.newContext({viewport:{width:1700,height:1050}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://docs.google.com/**',route=>route.fulfill({body:'ID entrega,ID,Nombre actividad,Enlace,Nota,Comentario a la nota\n'+report.attemptId+',alumno,02-01-Prueba,,8,Nota manual',contentType:'text/csv'}));
  await page.goto(base+'/base4/'+pageName+'#entrega='+(mode==='antiguo'?receipt:wrapped));await page.waitForFunction(()=>window.reviewReady);
  await page.locator('#review-model-code').waitFor({state:'visible'});assert.match(await page.locator('#review-model-code pre').textContent(),/Modelo/);
  await page.locator('[data-tab=css]').click();assert.match(await page.locator('#review-model-code pre').textContent(),/color:blue/);
  if(mode==='antiguo')assert.match(await page.locator('#review-detail-summary').textContent(),/no dispone de un análisis/);
  else assert.match(await page.locator('#review-detail-summary').textContent(),/5 \/ 10 puntos/);
  await page.locator('#review-sections button').nth(1).click();await page.locator('.review-answer-pair').first().waitFor();assert.match(await page.locator('.review-answer-pair').first().textContent(),/Respuesta del alumno/);assert.match(await page.locator('.review-answer-pair').first().textContent(),/Referencia/);assert.equal(await page.locator('.review-answer-pair img').count(),0);assert.equal(await page.evaluate(()=>window.__bad||false),false);
  assert.equal(await page.locator('.review-answer-pair').nth(1).locator('pre').count(),2);assert.equal(await page.locator('.review-answer-pair').nth(1).locator('pre').first().textContent(),'const n = 5;');
  if(mode!=='antiguo')assert.equal(await page.locator('#review-questions .review-feedback.correct').count(),2);
  await page.locator('#review-sections button').nth(2).click();await page.locator('.review-answer-pair').waitFor();assert.match(await page.locator('.review-answer-pair').textContent(),/B\. Dos/);if(mode!=='antiguo')assert.equal(await page.locator('#review-questions .review-feedback.incorrect').count(),1);
  if(process.env.BASE4_REVIEW_SCREENSHOT&&pageName==='revisor.html'&&mode==='nuevo')await page.screenshot({path:process.env.BASE4_REVIEW_SCREENSHOT,fullPage:true});
  assert.deepEqual(errors,[]);await context.close();console.log('OK: '+pageName+' · '+mode+' · código, QA y test comparados sin ejecutar la solución.');
 }
 encrypted=false;noSolution=false;
 const assigned=structuredClone(analysis);assigned.identity={studentId:'destino',sourceStudentId:'alumno',reason:'Confirmación explícita del profesor'};assigned.bonus={points:1,reason:'Bonificación autorizada'};assigned.score.earned=6;
 for(const pageName of ['revisor.html','profesor.html']){const assignedPage=await browser.newPage();await assignedPage.addInitScript(()=>window.addEventListener('review-selection',event=>window.__selectedReview=event.detail));await assignedPage.route('https://docs.google.com/**',route=>route.fulfill({body:'',contentType:'text/csv'}));await assignedPage.goto(base+'/base4/'+pageName+'#entrega='+await M.pack(receipt,assigned));await assignedPage.locator('#review-detail-summary').waitFor();assert.match(await assignedPage.locator('#review-detail-summary').textContent(),/6 \/ 10 puntos/);assert.match(await assignedPage.locator('#review-detail-summary').textContent(),/Nota base: 5 \/ 10 · Extra: \+1/);assert.match(await assignedPage.locator('#review-detail-summary').textContent(),/Identidad confirmada por el profesor: destino/);if(pageName==='revisor.html')assert.equal(await assignedPage.evaluate(()=>window.__selectedReview.user),'destino');await assignedPage.close();}
 console.log('OK: bonificación separada e identidad confirmada sin sustituir el documento original.');
 encrypted=false;noSolution=true;const page=await browser.newPage();await page.route('https://docs.google.com/**',route=>route.fulfill({body:'',contentType:'text/csv'}));await page.goto(base+'/base4/revisor.html#entrega='+wrapped);await page.locator('#review-detail-summary').waitFor();assert.match(await page.locator('#review-detail-summary').textContent(),/5 \/ 10 puntos/);await page.locator('#review-model-code .review-feedback').waitFor();assert.equal(await page.locator('#review-model-code pre').count(),0);assert.match(await page.locator('#review-model-code').textContent(),/3 \/ 5 puntos/);
 await page.close();console.log('OK: sin solución publicada se conserva el análisis y la entrega.');
 noSolution=false;files.set('config.json',JSON.stringify({title:config.title,version:'1'}));files.set('enunciado.html','<p>Práctica de un solo editor</p>');files.set('codigo.html','<p>Inicial</p>');
 solution.sections=[{id:'principal',type:'webcode',code:{html:'<p>Modelo antiguo</p>',css:'',js:''}}];
 const legacy={...report,answers:[{question:'html',answer:'<p>Alumno antiguo</p>'}]};delete legacy.sectionsVersion;delete legacy.sectionDefinitions;
 const legacyBody=JSON.stringify(legacy),legacyId=crypto.createHash('sha256').update(legacyBody).digest('hex'),legacyReceipt='SSII3G.'+zlib.gzipSync(Buffer.from(legacyBody+'\nCódigo de comprobación: SSII3-'+legacyId)).toString('base64url');
 const legacyAnalysis={...analysis,submissionId:legacyId,score:{earned:5,max:10},sections:[{id:'principal',type:'webcode',score:{earned:5,max:10},items:[score('funciona',5,10,'partial')]}]};
 for(const pageName of ['revisor.html','profesor.html']){const old=await browser.newPage();await old.route('https://docs.google.com/**',route=>route.fulfill({body:'',contentType:'text/csv'}));await old.goto(base+'/base4/'+pageName+'#entrega='+await M.pack(legacyReceipt,legacyAnalysis));await old.locator('#review-model-code pre').waitFor();assert.match(await old.locator('#review-model-code pre').textContent(),/Modelo antiguo/);assert.match(await old.locator('#codigo').textContent(),/Alumno antiguo/);await old.close();console.log('OK: '+pageName+' · actividad sin apartados y solución principal.');}
 await browser.close();
})().catch(async error=>{console.error(error);await browser?.close();process.exitCode=1;}).finally(()=>new Promise(resolve=>server.close(resolve)));
