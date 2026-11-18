// Run with NODE_PATH pointing to a local installation of jsdom.
const {JSDOM}=require('jsdom'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const sections=[{id:'uno',type:'webcode',title:'Primero',statement:'<p>Instrucciones 1</p>',code:{html:'uno',css:'',js:'',txt:''}},
 {id:'dos',type:'webcode',title:'Segundo',statement:'<p>Instrucciones 2</p>',code:{html:'dos',css:'',js:'',txt:''}},
 {id:'razona',type:'qa',title:'Razona',statement:'Texto',questions:[{id:'p',text:'Explica'}]},
 {id:'elige',type:'test',title:'Elige',statement:'Test',questions:[{id:'p',text:'Pregunta',options:['A','B','C','D']}]}];
const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{runScripts:'outside-only',url:'https://example.com/base4/?a=diw/prueba'});
const w=dom.window,d=w.document;
for(const f of ['apartados.js','apartados-ui.js'])w.eval(fs.readFileSync(path.join(root,'motor',f),'utf8'));
let values={},saves=0,editable=true;
const view=w.createSectionView(sections,{canEdit:()=>editable,readCode:()=>({...values}),writeCode:(_,v)=>{values={...v};},stopPreview(){},save(){saves++;}});
view.restore(w.LabSections.initial(sections));view.enabled(true);
const go=n=>d.querySelectorAll('#section-nav button')[n].click();
values.html='mi código uno';go(1);assert.equal(values.html,'dos');values.html='mi código dos';go(0);assert.equal(values.html,'mi código uno');
go(2);assert.equal(d.querySelector('.paneles').hidden,true);
const qa=d.querySelector('#question-fields textarea');qa.value='Respuesta abierta';qa.dispatchEvent(new w.Event('input',{bubbles:true}));
go(3);assert.equal(d.querySelectorAll('#question-fields input[type=radio]').length,4);
const option=d.querySelectorAll('#question-fields input')[2];option.click();
assert.equal(d.querySelectorAll('#question-fields input:checked').length,1);
const snapshot=view.snapshot();assert.equal(snapshot.values.razona.p,'Respuesta abierta');assert.equal(snapshot.values.elige.p,'2');assert.equal(snapshot.values.dos.html,'mi código dos');
go(2);assert.equal(d.querySelector('#question-fields textarea').value,'Respuesta abierta');view.restore(snapshot);
assert.equal(d.querySelectorAll('#question-fields input')[2].checked,true);
d.querySelector('#question-fields button').click();assert.equal(view.snapshot().values.elige.p,'');
editable=false;view.enabled(false);assert.equal(d.getElementById('question-fields').disabled,true);assert.ok([...d.querySelectorAll('#section-nav button')].every(b=>b.disabled));
assert.ok(saves>0);
// Rejected oversized edits restore the previous valid data without erasing other sections.
editable=true;view.enabled(true);go(2);const input=d.querySelector('#question-fields textarea');input.value='x'.repeat(10001);input.dispatchEvent(new w.Event('input',{bubbles:true}));assert.equal(view.snapshot().values.razona.p,'Respuesta abierta');
assert.ok(d.getElementById('section-status').textContent);
dom.window.close();
console.log('OK: navigation, independent web editors, QA, exclusive radio choices, clearing, restore and locked state.');
