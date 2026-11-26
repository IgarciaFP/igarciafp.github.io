import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../base/motor/entregas.js',import.meta.url),'utf8');
for(const method of ['start','status']){
 for(const limit of [0,1,-1,0.5,'0']){
  let receive,request;
  const runtime=vm.createContext({
   window:{addEventListener:(_,fn)=>receive=fn,removeEventListener(){}},
   document:{createElement:()=>({remove(){}}),body:{append(){}}},
   crypto:{getRandomValues:a=>a.fill(1)},URL,Uint8Array,setTimeout:()=>1,clearTimeout(){}
  });
  vm.runInContext(source,runtime);
  const envelope={practiceId:'DIW-PRUEBA',email:'alumno@g.educaand.es',payload:JSON.stringify({attemptId:'a'.repeat(32)})};
  const promise=runtime.window.LabDelivery[method]({type:'apps-script',endpoint:'https://script.google.com/macros/s/test/exec'},envelope);
  const peer={postMessage:m=>request=m},channel='01'.repeat(16),origin='https://script.googleusercontent.com';
  receive({source:peer,origin,data:{type:'LAB_READY',channel,capabilities:['start']}});
  assert.equal(request.type,method==='start'?'LAB_START':'LAB_STATUS');
  const result=method==='start'?{ok:true,attemptId:'a'.repeat(32),number:1,limit}:{ok:true,practiceId:envelope.practiceId,email:envelope.email,used:0,limit};
  receive({source:peer,origin,data:{type:'LAB_RESULT',channel,result}});
  if(limit===0||limit===1)assert.equal((await promise).limit,limit);
  else await assert.rejects(promise,/INVALID_RECEIPT/);
 }
}
console.log('OK: inicio y consulta aceptan cero; rechazan límites negativos, fraccionarios o de texto.');

for(const capabilities of [['start'],['start','attempt-limit']]){
 let receive;
 const runtime=vm.createContext({window:{addEventListener:(_,fn)=>receive=fn,removeEventListener(){}},document:{createElement:()=>({remove(){}}),body:{append(){}}},crypto:{getRandomValues:a=>a.fill(1)},URL,Uint8Array,setTimeout:()=>1,clearTimeout(){}});
 vm.runInContext(source,runtime);
 const promise=runtime.window.LabDelivery.start({type:'apps-script',endpoint:'https://script.google.com/macros/s/test/exec',requireAttemptLimit:true},{practiceId:'DIW-PRUEBA',payload:JSON.stringify({attemptId:'a'.repeat(32)})});
 const peer={postMessage(){}},channel='01'.repeat(16),origin='https://script.googleusercontent.com';
 receive({source:peer,origin,data:{type:'LAB_READY',channel,capabilities}});
 if(capabilities.includes('attempt-limit'))receive({source:peer,origin,data:{type:'LAB_RESULT',channel,result:{ok:true,attemptId:'a'.repeat(32),number:1,limit:1}}});
 await assert.rejects(promise,/RECEIVER_VERSION/,'no permite iniciar con Bridge o Code.gs antiguos');
}
console.log('OK: base4 exige soporte del límite tanto en Bridge.html como en Code.gs.');
