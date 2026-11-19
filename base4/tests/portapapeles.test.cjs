const {JSDOM}=require('jsdom'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
async function main(){
 const dom=new JSDOM('<button id="guard-start">Start</button><button id="guard-continue">Continuar en pantalla completa</button><textarea id="code" maxlength="12">hola mundo</textarea>',{runScripts:'outside-only',url:'https://example.com/base4/'}),w=dom.window,d=w.document;
 let text='externo',deny=false,editable=true,inputs=0;
 Object.defineProperty(w.navigator,'clipboard',{value:{writeText:async value=>{if(deny)throw Error('Denied');text=value;},readText:()=>assert.fail('No debe solicitar permiso para leer el portapapeles')}});
 for(const id of ['guard-finish','guard-confirm-ok','revision-delivery-send','delivery-retry']){const button=d.createElement('button');button.id=id;d.body.append(button);}
 w.eval(fs.readFileSync(path.join(__dirname,'../motor/portapapeles.js'),'utf8'));
 // jsdom no implementa el historial nativo; su comportamiento real se prueba en deshacer-browser.
 const nativeHistory=[];
 d.queryCommandEnabled=command=>command==='undo'&&nativeHistory.length>0;
 d.execCommand=(command,unused,text)=>{const el=d.activeElement;if(command==='insertText'){nativeHistory.push(el.value);el.setRangeText(text,el.selectionStart,el.selectionEnd,'end');}else if(command==='undo'){if(!nativeHistory.length)return false;el.value=nativeHistory.pop();}else return false;el.dispatchEvent(new w.Event('input',{bubbles:true}));return true;};
 const api=w.createLabClipboard({canEdit:()=>editable});const field=d.getElementById('code');field.addEventListener('input',()=>inputs++);
 const tick=()=>new Promise(r=>setTimeout(r,0));
 function menu(){field.dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:20,clientY:20}));const buttons=[...d.querySelectorAll('#clipboard-menu button')];assert.deepEqual(buttons.map(b=>b.textContent),['Deshacer','Cortar','Copiar','Pegar']);return buttons.slice(2);}
 field.setSelectionRange(0,4);let buttons=menu();assert.deepEqual(buttons.map(b=>b.textContent),['Copiar','Pegar']);buttons[0].click();await tick();assert.equal(text,'hola');
 text='externo';field.setSelectionRange(5,10);buttons=menu();buttons[1].click();await tick();assert.equal(field.value,'hola hola');assert.equal(inputs,1);
 field.setSelectionRange(0,4);menu();d.querySelectorAll('#clipboard-menu button')[1].click();assert.equal(field.value,' hola');
 menu();d.querySelectorAll('#clipboard-menu button')[0].click();assert.equal(field.value,'hola hola');
 menu();d.querySelectorAll('#clipboard-menu button')[0].click();assert.equal(field.value,'hola mundo');
 assert.equal(menu().length,2);assert.equal(d.querySelectorAll('#clipboard-menu button')[0].disabled,true);
 field.readOnly=true;menu();assert.equal(d.querySelectorAll('#clipboard-menu button')[1].disabled,true);field.readOnly=false;
 editable=false;buttons=menu();assert.equal(buttons[1].disabled,true);editable=true;
 d.getElementById('guard-start').click();await tick();assert.equal(text,' ');
 assert.equal(menu()[1].disabled,true);
 text='algo';assert.equal(await api.clear(),true);assert.equal(text,' ');
 deny=true;assert.equal(await api.clear(),false);assert.equal(d.getElementById('clipboard-status').hidden,false);
 assert.equal(d.getElementById('clipboard-status').textContent,'Err. permiso');
 // Synchronous copy succeeds even if the asynchronous API is denied.
 let copies=0;
 d.execCommand=command=>{assert.equal(command,'copy');copies++;assert.equal(d.activeElement.value,' ');text=d.activeElement.value;return true;};
 field.focus();field.setSelectionRange(1,4);text='externo';
 const clearing=api.clear({gesture:true});assert.equal(copies,1);assert.equal(text,' ');
 assert.equal(d.activeElement,field);assert.equal(field.selectionStart,1);assert.equal(field.selectionEnd,4);
 assert.equal(await clearing,true);assert.equal(d.getElementById('clipboard-status').hidden,true);
 text='entrada';d.getElementById('guard-start').click();assert.equal(text,' ');await tick();
 text='contenido externo';
 d.getElementById('guard-continue').addEventListener('click',()=>assert.equal(text,' ','la copia precede al regreso a pantalla completa'));
 d.getElementById('guard-continue').click();assert.equal(text,' ');await tick();
 for(const id of ['guard-finish','guard-confirm-ok','revision-delivery-send','delivery-retry']){text='codigo copiado';d.getElementById(id).addEventListener('click',()=>assert.equal(text,' ','se borra antes de entregar'));d.getElementById(id).click();assert.equal(text,' ',id);await tick();}
 d.execCommand=()=>false;assert.equal(await api.clear({gesture:true}),false);
 deny=false;text='salir';w.dispatchEvent(new w.Event('beforeunload'));await tick();assert.equal(text,' ');
 const frame={contentWindow:{},getBoundingClientRect:()=>({left:0,top:0,width:100,height:100})};api.hide();api.preview({source:{},data:{labClipboard:'ok',action:'menu',text:'x'}},frame,'ok');assert.equal(d.getElementById('clipboard-menu').hidden,true);
 dom.window.close();console.log('OK: copy/paste-only menu, insertion events, locked fields, entry/exit clearing and denied access.');
}
main().catch(e=>{console.error(e);process.exit(1);});
