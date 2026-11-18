const {JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
async function main(){
 const dom=new JSDOM('<div id="toolbar-tools"></div>',{runScripts:'outside-only',url:'https://example.com/base4/'}),w=dom.window,d=w.document;
 w.TextEncoder=TextEncoder;w.AbortSignal=AbortSignal;w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 const requests=[];w.fetch=async url=>{requests.push(String(url));return String(url).includes('mymemory')?{ok:true,json:async()=>({responseStatus:200,responseData:{translatedText:'Hello'}})}:{ok:true,text:async()=>'<main><h1>Unidad 1</h1><p onclick="bad()">Apuntes</p><script>bad()</script><img src="img/diagrama.svg"><a href="javascript:bad()">Enlace</a></main>'};};
 w.eval(fs.readFileSync(path.join(__dirname,'../motor/herramientas.js'),'utf8'));
 const config=w.LabTools.settings({},'diw','01-01-ejemplo'),tools=w.LabTools.init(config);
 assert.equal(d.querySelector('[data-tool=rubrica]'),null);
 const open=key=>{tools.close();d.querySelector('[data-tool='+key+']').click();return d.getElementById('tool-content');};
 let panel=open('colorPicker'),hex=panel.querySelector('input');hex.value='#FF0000';hex.dispatchEvent(new w.Event('input'));assert.equal(panel.querySelector('[role=status]').textContent,'rgb(255, 0, 0)');
 panel=open('binarioDecimal');let fields=panel.querySelectorAll('input');fields[0].value='1010';fields[0].dispatchEvent(new w.Event('input'));assert.equal(fields[1].value,'10');fields[1].value='15';fields[1].dispatchEvent(new w.Event('input'));assert.equal(fields[0].value,'1111');
 panel=open('traductor');panel.querySelector('textarea').value='Hola';panel.querySelector('button').click();await new Promise(r=>setTimeout(r,10));assert.equal(panel.querySelector('[role=status]').textContent,'Hello');assert.equal(new URL(requests[0]).searchParams.get('q'),'Hola');assert.equal(new URL(requests[0]).searchParams.size,2);
 panel=open('apuntes');await new Promise(r=>setTimeout(r,10));const shadow=panel.querySelector('div').shadowRoot;assert.ok(shadow.textContent.includes('Unidad 1'));assert.equal(shadow.querySelector('script'),null);assert.equal(shadow.querySelector('[onclick]'),null);assert.equal(shadow.querySelector('a').hasAttribute('href'),false);assert.equal(shadow.querySelector('img').src,'https://example.com/ciclos/diw/img/diagrama.svg');
 tools.close();d.getElementById('tool-dialog').remove();d.getElementById('toolbar-tools').replaceChildren();
 const rubric=JSON.parse(fs.readFileSync(path.join(__dirname,'../actividades/dwec/02-02-mover-cuadrado-con-teclado/rubrica.json'),'utf8'));
 rubric.criterios[0].niveles[0].descripcion='<img src=x onerror=bad()> Texto seguro';
 const rubricTools=w.LabTools.init(w.LabTools.settings({},'dwec','02-02',rubric));
 d.querySelector('[data-tool=rubrica]').click();assert.equal(d.getElementById('tool-dialog').open,true);
 assert.ok(d.getElementById('tool-content').textContent.includes('Total: 10'));
 assert.equal(d.querySelectorAll('#tool-content h4').length,5);
 assert.equal(d.querySelector('#tool-content img'),null);
 assert.ok(d.getElementById('tool-content').textContent.includes('<img'));
 rubricTools.close();d.getElementById('tool-dialog').remove();d.getElementById('toolbar-tools').replaceChildren();
 w.LabTools.init(w.LabTools.settings({herramientas:{rubrica:false}},'dwec','02-02',rubric));
 assert.equal(d.querySelector('[data-tool=rubrica]'),null);
 dom.window.close();console.log('OK: tools, safe notes, optional rubric, scores and safe text rendering.');
}
main().catch(e=>{console.error(e);process.exit(1);});
