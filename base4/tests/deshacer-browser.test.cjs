const {chromium}=require('playwright-core'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),S=require('../motor/apartados.js'),T=require('../motor/herramientas.js');
(async()=>{
 const folder='actividades/diw/01-01-tarjeta-de-presentacion/',activity=JSON.parse(fs.readFileSync(path.join(root,folder,'config.json')));
 const read=async p=>({text:async()=>fs.readFileSync(path.join(root,p),'utf8'),json:async()=>JSON.parse(fs.readFileSync(path.join(root,p)))});
 const sections=await S.load(activity,folder,read,async p=>fs.existsSync(path.join(root,p))?fs.readFileSync(path.join(root,p),'utf8'):'');
 const common=JSON.parse(fs.readFileSync(path.join(root,'contenido/config.json')));
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
 const page=await browser.newPage();page.setDefaultTimeout(5000);await page.route('**/*',route=>route.fulfill({body:'',contentType:'text/html'}));await page.goto('https://example.test/base4/');
 await page.setContent(fs.readFileSync(path.join(root,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,''));
 await page.evaluate(lab=>{
  window.Lab=lab;window.saved=null;
  window.createPracticeGuard=a=>{a.restore(a.empty());a.setEnabled(true);return {canEdit:()=>true,saveEdit:()=>{window.saved=a.snapshot();return true;},render(){},canDownloadReport:()=>false};};
 },{sectionMode:true,sections,code:sections[0].code,config:{...common,delivery:{type:'archivo'},control:null,durationMs:900000,module:'DIW',activity:'test',title:'test',id:'TEST',version:'2',maxSubmissions:1,storage:{key:'test',legacyKey:'old'},tools:T.settings(activity,'diw','test')}});
 await page.addScriptTag({content:fs.readFileSync(path.join(root,'../base/motor/seguridad.js'),'utf8').replace('window.createPracticeGuard =','window.unusedPracticeGuard =')});
 // Keep the real input guards, but use a local adapter stub to avoid delivery and fullscreen.
 
 for(const file of ['apartados.js','apartados-ui.js','herramientas.js','portapapeles.js','laboratorio.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,'motor',file),'utf8')});
 await page.evaluate(()=>window.installPracticeInputGuards(document,e=>{e.preventDefault();e.stopImmediatePropagation();},true));
 await page.evaluate(()=>{document.getElementById('cuaderno').hidden=false;document.getElementById('cuaderno').inert=false;document.getElementById('lab').hidden=false;document.getElementById('lab').inert=false;document.querySelectorAll('fieldset').forEach(el=>el.disabled=false);});
 const field=page.locator('#html');await field.focus();await page.keyboard.press('Control+End');
 const initial=await field.inputValue();await page.keyboard.type('Z');assert.equal(await field.inputValue(),initial+'Z','typing reaches editor');
 await page.keyboard.press('Control+z');assert.equal(await field.inputValue(),initial,'Ctrl+Z is allowed');
 await page.keyboard.press('Control+y');assert.equal(await field.inputValue(),initial+'Z','redo uses same history');
 await page.locator('#editor-undo').click();assert.equal(await field.inputValue(),initial,'icon uses native undo');
 await page.keyboard.type('A');await field.click({button:'right'});await page.locator('#clipboard-menu button').filter({hasText:'Deshacer'}).click();assert.equal(await field.inputValue(),initial,'menu uses native undo');
 await field.focus();await page.keyboard.press('Control+End');await page.keyboard.press('Enter');await page.keyboard.type('linea');await page.keyboard.press('Tab');
 for(let i=0;i<6&&(await field.inputValue())!==initial;i++)await page.locator('#editor-undo').click();
 assert.equal(await field.inputValue(),initial,'Enter and Tab do not reset history');
 await page.keyboard.press('Control+End');await page.keyboard.type('CUT');await page.keyboard.press('Shift+ArrowLeft');await page.keyboard.press('Shift+ArrowLeft');await page.keyboard.press('Shift+ArrowLeft');
 await field.dispatchEvent('contextmenu',{clientX:20,clientY:20});await page.locator('#clipboard-menu button').filter({hasText:'Cortar'}).click();assert.equal(await field.inputValue(),initial);
 await page.locator('#editor-undo').click();assert.equal(await field.inputValue(),initial+'CUT','cut is undoable');
 assert.equal(await page.evaluate(()=>saved.values.html),initial+'CUT','undo is saved for delivery');
 await page.keyboard.press('Control+End');await field.dispatchEvent('contextmenu',{clientX:20,clientY:20});await page.locator('#clipboard-menu button').filter({hasText:'Pegar'}).evaluate(el=>el.click());assert.equal(await field.inputValue(),initial+'CUTCUT');await page.locator('#editor-undo').click();assert.equal(await field.inputValue(),initial+'CUT','paste is undoable');
 const beforeRestore=await field.inputValue();
 await page.locator('#editor-restore').click();assert.equal(await page.locator('#action-confirm').evaluate(el=>el.open),false);
 await page.locator('#editor-restore').click();assert.equal(await page.locator('#action-confirm').evaluate(el=>el.open),true);assert.equal(await field.inputValue(),beforeRestore);
 await page.locator('#action-confirm-cancel').click();assert.equal(await field.inputValue(),beforeRestore);
 await page.locator('#editor-restore').click();await page.locator('#editor-restore').click();await page.locator('#action-confirm-accept').click();assert.equal(await field.inputValue(),initial);
 console.log('OK: real Edge Ctrl+Z, redo, icon, context menu, indentation, Enter and cut share native history.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1);});

