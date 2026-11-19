import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';const guardSource=readFileSync(new URL('../../base/motor/seguridad.js',import.meta.url),'utf8');
async function guardHarness(mode, preserve=true){
 class Element{constructor(){this.listeners={};this.value='';this.open=false;}addEventListener(n,f){(this.listeners[n]||=[]).push(f);}replaceChildren(){}showModal(){this.open=true;}close(){this.open=false;}}
 Element.prototype.inert=false;
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
 let now=100000,elapsed=0,started=null,latest,confirmResult=false,prompts=0,prepared=0,starts=0; let editorCode='inicial',reportCode=null;const docEvents={},winEvents={};
 const intervals=[],storage=new Map(),document={getElementById:get,fullscreenEnabled:true,visibilityState:'visible',hasFocus:()=>true,addEventListener(n,f){(docEvents[n]||=[]).push(f);},createElement:()=>new Element()};
 document.documentElement={requestFullscreen:async()=>{document.fullscreenElement=document.documentElement;}};
 document.exitFullscreen=async()=>{document.fullscreenElement=null;
 for(const f of get('lab').listeners.change||[])f({type:'change',target:get('js'),cancelable:false,stopImmediatePropagation(){}});};
 const window={addEventListener(n,f){(winEvents[n]||=[]).push(f);},confirm:()=>{prompts++;return confirmResult;}};
 const runtime=vm.createContext({window,document,HTMLElement:Element,structuredClone,URL,
  Date:class extends Date{static now(){return now;}},
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  setInterval:f=>{intervals.push(f);return intervals.length;},clearInterval(){},setTimeout:()=>1,clearTimeout(){}});
 vm.runInContext(guardSource,runtime);
 const blank=()=>({values:{student:'alumno@g.educaand.es',js:editorCode},elapsed,started,language:'es'});
 const adapter={config:{format:{save:'TEST-SAVE'},storage:{key:'test',legacyKey:'old'},guard:{returnSeconds:10},requireFullName:false},deliveryPanel:true,preservePendingEdits:preserve,
  confirmDelivery:async()=>{prompts++;return confirmResult;},
  empty:blank,sanitize:x=>x,snapshot:blank,restore(){},setEnabled(){},canStart:()=>true,validEmail:()=>true,
  timeSpent:()=>elapsed+(started===null?0:now-started),timeLimitMs:()=>120000,
  startClock:()=>{started=now;},stopClock:at=>{elapsed+= (at??now)-started;started=null;},
  onAttemptStart:()=>starts++,afterRender:s=>{latest=s.phase;},confirmText(){},onReset(){},refreshPendingParameters:()=>0,
  isAnswer:()=>true,restoreValue:(_,data)=>{editorCode=data.values.js;},
  makeReport:async()=> {reportCode=editorCode;return 'report';},setReport:s=>get('report').value=s,downloadReport:async()=>prepared++,forcedError:()=>assert.fail('forcedError')};
 const guard=window.createPracticeGuard(adapter);
 await get('guard-start').listeners.click[0]();
 assert.equal(starts,1);assert.equal(latest,'active');
 editorCode='version autoguardada';guard.saveEdit();
 const emit=type=>{for(const f of get('lab').listeners[type]||[])f({type,target:get('js'),inputType:'insertText',cancelable:true,preventDefault(){},stopImmediatePropagation(){}});};
 if(mode==='pending')emit('beforeinput');
 document.fullscreenElement=null;
 if(mode==='blocked')emit('beforeinput');
 editorCode='ultima version visible sin guardar';
 emit(mode==='change'?'change':'input');
 for(const f of docEvents.fullscreenchange||[])f();
 now+=10001;for(const f of intervals)f();
 for(let i=0;i<20;i++)await Promise.resolve();
 assert.equal(latest,'submitted');assert.equal(prepared,1);
 const expected=(!preserve||mode==='blocked')?'version autoguardada':'ultima version visible sin guardar';
 assert.equal(reportCode,expected,mode);
 const receipt=JSON.parse(guard.exportPractice());
 assert.equal(receipt.state.data.values.js,expected,mode);
}
for(const mode of ['change','pending','blocked'])await guardHarness(mode);
await guardHarness('change',false);
console.log('OK: cambio tardío, edición en curso, bloqueo y comportamiento anterior sin opt-in.');
