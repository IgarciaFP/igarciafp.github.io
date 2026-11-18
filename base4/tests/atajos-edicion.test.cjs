const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{JSDOM}=require('jsdom');
const source=fs.readFileSync(path.join(__dirname,'../motor/laboratorio.js'),'utf8');
const shared=fs.readFileSync(path.join(__dirname,'../../base/motor/seguridad.js'),'utf8');
for(const enabled of [true,false])for(const preview of [false,true]){
 const dom=new JSDOM('<textarea>Texto de prueba</textarea>',{runScripts:'outside-only',url:'https://example.com'}),w=dom.window,d=w.document;
 if(preview){
  w.eval(source.slice(source.indexOf('function bridge('),source.indexOf('const lines='))+'\nbridge("test",0,true,'+enabled+');');
 }else{
  w.eval(shared);
  w.eval('const allowEditingShortcuts='+enabled+';'+source.slice(source.indexOf('function editingShortcut('),source.indexOf('const $=')));
  w.installPracticeInputGuards(d,e=>e.preventDefault(),true);
 }
 const target=d.querySelector('textarea');
 const shortcuts=[...['a','c','x','v','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].flatMap(key=>[{key,ctrlKey:true},{key,metaKey:true}]),{key:'ArrowLeft',shiftKey:true,ctrlKey:true},{key:'End',shiftKey:true,metaKey:true},{key:'Insert',ctrlKey:true},{key:'Insert',shiftKey:true},{key:'Delete',shiftKey:true}];
 for(const type of ['keydown','keypress','keyup'])for(const shortcut of shortcuts){
  const e=new w.KeyboardEvent(type,{...shortcut,bubbles:true,cancelable:true});target.dispatchEvent(e);
  assert.equal(e.defaultPrevented,!enabled,JSON.stringify({preview,type,...shortcut}));
 }
 for(const type of ['copy','cut','paste']){
  const e=new w.Event(type,{bubbles:true,cancelable:true});target.dispatchEvent(e);assert.equal(e.defaultPrevented,!enabled,type);
 }
 for(const shortcut of [{key:'p',ctrlKey:true},{key:'F12'}]){
  const e=new w.KeyboardEvent('keydown',{...shortcut,bubbles:true,cancelable:true});target.dispatchEvent(e);assert.equal(e.defaultPrevented,true,'Se conservan las otras restricciones');
 }
 dom.window.close();
}
console.log('OK: selección, Ctrl/Cmd+A/C/X/V, alternativas Insert/Delete y vista previa.');
