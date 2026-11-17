import assert from 'node:assert/strict';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
const server=readFileSync(new URL('../receptor/Code.gs',import.meta.url),'utf8');
const guardSource=readFileSync(new URL('../../base/motor/seguridad.js',import.meta.url),'utf8');
const labSource=readFileSync(new URL('../motor/laboratorio.js',import.meta.url),'utf8');
const hash=s=>createHash('sha256').update(s).digest('hex');
const headers=['DIA Y HORA [DD/MM/AA HH:MM:SS]','MODULO','Nombre de la práctica','EMAIL','PROBAR CODIGO','Tiempo','IP','Incidencias','ENTREGA completa','nota','Comentarios'];
const rows=[headers.map(v=>({value:v,note:''}))];
const cell=(r,c)=>{rows[r]||=[];return rows[r][c]||=( {value:'',note:''});};
function range(r,c,n=1,m=1){
 return {
  getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>cell(r-1+i,c-1+j).value)),
  getNotes:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>cell(r-1+i,c-1+j).note)),
  getNote:()=>cell(r-1,c-1).note,
  getValue:()=>cell(r-1,c-1).value,getFormula:()=>'',getDisplayValue:()=>String(cell(r-1,c-1).value),
  setValue:v=>{cell(r-1,c-1).value=v;},
  createTextFinder:term=>{const finder={matchEntireCell:()=>finder,matchCase:()=>finder,
   findAll:()=>Array.from({length:n},(_,i)=>i+r).filter(row=>cell(row-1,c-1).value===term).map(row=>({getRow:()=>row}))};return finder;}
 };
}
const sheet={getRange:range,getLastRow:()=>rows.length,getLastColumn:()=>rows[0].length,getMaxColumns:()=>30,getSheetId:()=>1};
const book={getId:()=> 'sheet',getSheetByName:()=>sheet};
let policy={entregas:1,redes:['185.197.0.0/16'],restringirIPs:false,restringirHorario:false};
const context=vm.createContext({
 SpreadsheetApp:{openById:()=>book,flush(){}},
 LockService:{getScriptLock:()=>({tryLock:()=>true,hasLock:()=>true,releaseLock(){}})},
 UrlFetchApp:{fetch:()=>({getResponseCode:()=>200,getContentText:()=>JSON.stringify(policy)})},
 Utilities:{DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},computeDigest:(_,s)=>Array.from(Buffer.from(hash(s),'hex')),formatDate:date=>date.toISOString()},
 Sheets:{Spreadsheets:{batchUpdate:({requests})=>{
  for(const req of requests){
   const op=req.appendCells||req.updateCells;
   const row=req.appendCells?rows.length:op.range.startRowIndex,col=req.appendCells?0:op.range.startColumnIndex;
   for(const [j,v]of op.rows[0].values.entries()){const c=cell(row,col+j);c.value=v.userEnteredValue?.stringValue??v.userEnteredValue?.numberValue??v.userEnteredValue?.formulaValue??'';if(op.fields.includes('note'))c.note=v.note||'';}
  }
 }}}
});
vm.runInContext(server+"\ndocumento_=s=>'SSII3G.'+s.submissionId;",context);
function envelope(id,reason='',email='alumno@g.educaand.es',finishReason='voluntary'){
 const payload=JSON.stringify({attemptId:id.repeat(32),exam:'DIW-PRUEBA',module:'DIW',activity:'prueba',activityTitle:'Prueba',activityVersion:'1',version:3,email,finishedAt:new Date().toISOString(),seconds:30,answers:[{question:'css',answer:'h1{color:white}'}],finishReason,revisionReason:reason});
 return {protocol:1,submissionId:hash(payload),payload,practiceId:'DIW-PRUEBA',practiceVersion:'1',attemptToken:'a'.repeat(64)};
}
const first=envelope('1');
assert.equal(context.iniciarEntrega(first).number,1);
assert.equal(rows.length,2);
assert.equal(context.iniciarEntrega(first).number,1);
assert.equal(rows.length,2,'registro inicial idempotente');
assert.equal(rows[0][11].value,'ID');
assert.equal(rows[0][12].value,'Número de entrega');
assert.equal(rows[1][11].value,'1'.repeat(32));
assert.equal(rows[1][12].value,1);
assert.match(rows[1][7].value,/pendiente/);
cell(1,9).value=7;cell(1,10).value='Conservar';
const initialDate=cell(1,0).value;
const receipt=context.recibirEntrega(first);
assert.equal(receipt.ok,true);
assert.equal(rows.length,2,'actualiza la fila, no añade otra');
assert.equal(cell(1,0).value,initialDate);
assert.equal(cell(1,9).value,7,'no sobrescribe nota');
assert.equal(cell(1,10).value,'Conservar');
assert.equal(context.recibirEntrega(first).duplicate,true);
assert.equal(context.recibirEntrega(first).receivedAt,receipt.receivedAt);
assert.equal(context.recibirEntrega({...first,attemptToken:'b'.repeat(64)}).code,'INVALID');
const modified=envelope('1','Otra versión que no debe sobrescribir la entrega');
assert.equal(context.recibirEntrega(modified).code,'ALREADY_SUBMITTED');
const second=envelope('2','','alumno@g.educaand.es','duration-limit');
assert.equal(context.iniciarEntrega(second).number,2);
assert.equal(context.recibirEntrega(second).code,'REVISION_REASON','también exige motivo en automático');
assert.match(cell(2,7).value,/pendiente/);
const withReason=envelope('2','Necesito una revisión porque he corregido mis errores','alumno@g.educaand.es','duration-limit');
assert.equal(context.recibirEntrega(withReason).ok,true);
assert.equal(rows.length,3);
assert.match(cell(2,7).value,/Motivo de revisión/);
assert.match(cell(2,7).value,/no sustituye/);
assert.equal(context.recibirEntrega(envelope('3')).code,'NOT_STARTED');
assert.equal(context.iniciarEntrega(envelope('3','','otra@g.educaand.es')).number,1);
assert.equal(context.consultarOportunidades({practiceId:'DIW-PRUEBA',email:'alumno@g.educaand.es'}).used,2);
assert.equal(context.iniciarEntrega(envelope('4')).number,3,'las reservas pendientes también cuentan');
assert.equal(context.iniciarEntrega(envelope('5')).number,4);
policy.restringirIPs=true;
assert.equal(context.recibirEntrega(envelope('4','Quiero revisar los errores de mi código CSS')).code,'CONTROL_REQUIRED');
assert.match(cell(4,7).value,/pendiente/,'una restricción conserva la fila inicial');


// La hoja real del profesor empieza por ID y NUM ENTREGA; las filas antiguas se conservan.
const order=[11,12,0,1,2,3,4,5,6,7,8,9,10];
for(let i=0;i<rows.length;i++){const old=rows[i];rows[i]=order.map(j=>old[j]||{value:'',note:''});}
cell(0,1).value='NUM ENTREGA';
policy.restringirIPs=false;
assert.equal(context.comprobarCabeceras_(sheet)[0],3);
assert.deepEqual(Array.from(context.columnasIntento_(sheet)),[1,2]);
assert.equal(rows[0].length,13,'no crea columnas duplicadas');
assert.equal(context.iniciarEntrega(first).number,1,'localiza reservas tras mover columnas');
assert.equal(context.recibirEntrega(first).duplicate,true);
assert.equal(context.consultarOportunidades({practiceId:'DIW-PRUEBA',email:'alumno@g.educaand.es'}).used,4);
const moved=envelope('6','Necesito revisar el resultado de este nuevo ejercicio');
assert.equal(context.iniciarEntrega(moved).number,5);
const last=rows.length-1;
const dateBefore=cell(last,2).value;
cell(last,11).value=8;
assert.equal(context.recibirEntrega(moved).ok,true);
assert.equal(cell(last,0).value,'6'.repeat(32));
assert.equal(cell(last,1).value,5);
assert.equal(cell(last,2).value,dateBefore);
assert.equal(cell(last,3).value,'DIW');
assert.equal(cell(last,5).value,'alumno@g.educaand.es');
assert.match(cell(last,6).value,/HYPERLINK/);
assert.match(cell(last,9).value,/Motivo de revisión/);
assert.equal(cell(last,11).value,8);
// Lectura y edición de nota resuelven también ENTREGA completa por nombre.
const reportText=moved.payload+'\nCódigo de comprobación: SSII3-'+moved.submissionId;
cell(last,10).value='SSII3G.'+Buffer.from(reportText).toString('base64url');
context.Utilities.base64DecodeWebSafe=s=>Buffer.from(s,'base64url');
context.Utilities.newBlob=bytes=>bytes;
context.Utilities.ungzip=bytes=>({getDataAsString:()=>bytes.toString('utf8')});
vm.runInContext("sesionProfesor_=()=>({});",context);
const grade=context.gestionarNota({action:'get',submissionId:moved.submissionId});
assert.equal(grade.ok,true);assert.equal(grade.nota,'8');
assert.equal(context.gestionarNota({action:'set',submissionId:moved.submissionId,revision:grade.revision,nota:'9'}).ok,true);
assert.equal(cell(last,11).value,9);
assert.equal(cell(last,0).value,'6'.repeat(32));
// Rechaza cabeceras ambiguas sin adivinar dónde escribir.
cell(0,12).value='NUM ENTREGA';
assert.throws(()=>context.columnasIntento_(sheet),/SCHEMA/);
cell(0,12).value='Comentarios';

// Controlador real, DOM simulado: cancelación manual, reloj y cierre automático.
async function guardHarness(automatic=false){
 class Element{constructor(){this.listeners={};this.value='';this.open=false;}addEventListener(n,f){(this.listeners[n]||=[]).push(f);}replaceChildren(){}showModal(){this.open=true;}close(){this.open=false;}}
 Element.prototype.inert=false;
 const elements=new Map(),get=id=>{if(!elements.has(id))elements.set(id,new Element());return elements.get(id);};
 let now=100000,elapsed=0,started=null,latest,confirmResult=false,prompts=0,prepared=0,starts=0;
 const intervals=[],storage=new Map(),document={getElementById:get,fullscreenEnabled:true,visibilityState:'visible',hasFocus:()=>true,addEventListener(){},createElement:()=>new Element()};
 document.documentElement={requestFullscreen:async()=>{document.fullscreenElement=document.documentElement;}};
 document.exitFullscreen=async()=>{document.fullscreenElement=null;};
 const window={addEventListener(){},confirm:()=>{prompts++;return confirmResult;}};
 const runtime=vm.createContext({window,document,HTMLElement:Element,structuredClone,URL,
  Date:class extends Date{static now(){return now;}},
  localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)},
  setInterval:f=>{intervals.push(f);return intervals.length;},clearInterval(){},setTimeout:()=>1,clearTimeout(){}});
 vm.runInContext(guardSource,runtime);
 const blank=()=>({values:{student:'alumno@g.educaand.es'},elapsed,started,language:'es'});
 const adapter={config:{storage:{key:'test',legacyKey:'old'},guard:{returnSeconds:10},requireFullName:false},deliveryPanel:true,
  empty:blank,sanitize:x=>x,snapshot:blank,restore(){},setEnabled(){},canStart:()=>true,validEmail:()=>true,
  timeSpent:()=>elapsed+(started===null?0:now-started),timeLimitMs:()=>120000,
  startClock:()=>{started=now;},stopClock:at=>{elapsed+= (at??now)-started;started=null;},
  onAttemptStart:()=>starts++,afterRender:s=>{latest=s.phase;},confirmText(){},onReset(){},refreshPendingParameters:()=>0,
  makeReport:async()=> 'report',setReport:s=>get('report').value=s,downloadReport:async()=>prepared++,forcedError:()=>assert.fail('forcedError')};
 const guard=window.createPracticeGuard(adapter);
 await get('guard-start').listeners.click[0]();
 assert.equal(starts,1);assert.equal(latest,'active');
 if(automatic){
  now+=120001;for(const f of intervals)f();
  for(let i=0;i<10;i++)await Promise.resolve();
  assert.equal(latest,'submitted');assert.equal(prepared,1);assert.equal(prompts,0);assert.equal(started,null);
  now+=200000;for(const f of intervals)f();
  assert.equal(prepared,1);
  return;
 }
 guard.ask('finish');assert.equal(prompts,1);assert.equal(latest,'active');assert.notEqual(started,null);
 confirmResult=true;now+=5000;guard.ask('finish');
 assert.equal(latest,'closing');assert.equal(started,null);
 for(let i=0;i<10;i++)await Promise.resolve();
 assert.equal(latest,'submitted');assert.equal(prepared,1);assert.equal(get('guard-confirm').open,false);
 now+=200000;for(const f of intervals)f();
 assert.equal(prepared,1,'no repite envío ni temporizador estando en panel');
 guard.ask('finish');assert.equal(prompts,2,'no reabre el aviso');
 return {runtime,get,intervals};
}
await guardHarness();
await guardHarness(true);

// Adaptador real: el envío automático solo espera cuando faltan oportunidades.
const part=(from,to)=>labSource.slice(labSource.indexOf(from),labSource.indexOf(to,labSource.indexOf(from)));
for(const [reason,number,expected]of [['voluntary',1,0],['duration-limit',1,1],['return-timeout',1,1],['duration-limit',2,0],['return-timeout',2,0]]){
 const elements={};let sends=0;
 const ctx=vm.createContext({
  attempt:{number,limit:1},revisionNeeded:false,revisionReason:'',delivering:false,panelSending:false,
  $:id=>elements[id]||=( {value:'',hidden:true,disabled:false,textContent:''}),
  guard:{render(){}},rememberDelivery:()=>({code:'test'}),
  deliveryEnvelope:async()=>({payload:JSON.stringify({finishReason:reason})}),
  setDeliveryState(){},cachedOpportunity:()=>({used:0,limit:1}),
  submitPanel:async()=>{sends++;}
 });
 vm.runInContext(part('function requiresReason(){','const reasonValid=')+
  "const reasonValid=text=>(text.match(/\\p{L}/gu)||[]).length>=20;\n"+
  part('function refreshDeliveryReason(){',"$('revision-delivery-reason').addEventListener")+
  part('async function downloadReport(){','async function submitPanel(){'),ctx);
 await ctx.downloadReport();
 assert.equal(sends,expected,reason+' intento '+number);
 assert.equal(elements['revision-delivery'].hidden,number<=1);
 if(number>1){
  assert.equal(elements['revision-delivery-send'].disabled,true);
  elements['revision-delivery-reason'].value='1234567890 !!!';
  assert.equal(ctx.refreshDeliveryReason(),false);
  elements['revision-delivery-reason'].value='Necesito revisar mi código y corregir errores';
  assert.equal(ctx.refreshDeliveryReason(),true);
  assert.equal(elements['revision-delivery-send'].disabled,false);
 }
}

console.log('OK: reserva, actualización, idempotencia, motivos, notas y panel definitivo.');
