import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const hash=s=>createHash('sha256').update(s).digest('hex');
const headers=['ID','NUM ENTREGA','DIA Y HORA [DD/MM/AA HH:MM:SS]','MODULO','Nombre de la práctica','EMAIL','PROBAR CODIGO','Tiempo','IP','Incidencias','ENTREGA completa','nota','Comentarios a la nota'];
const rows=[headers.map(value=>({value,note:''}))];
const cell=(r,c)=>{rows[r]||=[];return rows[r][c]||={value:'',note:''};};
function range(r,c,n=1,m=1){return {
 getValues:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>cell(r-1+i,c-1+j).value)),
 getNotes:()=>Array.from({length:n},(_,i)=>Array.from({length:m},(_,j)=>cell(r-1+i,c-1+j).note)),
 getNote:()=>cell(r-1,c-1).note,getValue:()=>cell(r-1,c-1).value,
 setValue:v=>{cell(r-1,c-1).value=v;},
 createTextFinder:term=>{const finder={matchEntireCell:()=>finder,matchCase:()=>finder,findAll:()=>Array.from({length:n},(_,i)=>i+r).filter(row=>cell(row-1,c-1).value===term).map(row=>({getRow:()=>row}))};return finder;}
};}
const sheet={getRange:range,getLastRow:()=>rows.length,getLastColumn:()=>headers.length,getMaxColumns:()=>30,getSheetId:()=>1};
const book={getId:()=>'sheet',getSheetByName:()=>sheet};
let policy={entregas:1};
const context=vm.createContext({
 SpreadsheetApp:{openById:()=>book},LockService:{getScriptLock:()=>({tryLock:()=>true,hasLock:()=>true,releaseLock(){}})},
 UrlFetchApp:{fetch:()=>({getResponseCode:()=>200,getContentText:()=>JSON.stringify(policy)})},
 Utilities:{DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},computeDigest:(_,s)=>Array.from(Buffer.from(hash(s),'hex')),formatDate:d=>d.toISOString()},
 Sheets:{Spreadsheets:{batchUpdate:({requests})=>{for(const req of requests){const op=req.appendCells||req.updateCells,row=req.appendCells?rows.length:op.range.startRowIndex,col=req.appendCells?0:op.range.startColumnIndex;for(const [j,v]of op.rows[0].values.entries()){const c=cell(row,col+j);c.value=v.userEnteredValue?.stringValue??v.userEnteredValue?.numberValue??v.userEnteredValue?.formulaValue??'';if(op.fields.includes('note'))c.note=v.note||'';}}}}}
});
vm.runInContext(readFileSync(new URL('../receptor/Code.gs',import.meta.url),'utf8')+"\ndocumento_=s=>'SSII3G.'+s.submissionId;",context);
const email='alumno@g.educaand.es',url='https://igarciafp.github.io/base4/?a=diw/prueba';
function envelope(char,student=email,origin=url){const payload=JSON.stringify({attemptId:char.repeat(32),exam:'DIW-PRUEBA',module:'DIW',activity:'prueba',activityTitle:'Prueba',activityVersion:'1',version:3,email:student,finishedAt:new Date().toISOString(),seconds:30,answers:[{question:'css',answer:'h1{}'}],url:origin});return {protocol:1,submissionId:hash(payload),payload,practiceId:'DIW-PRUEBA',practiceVersion:'1',attemptToken:'a'.repeat(64)};}
const first=envelope('1'),status={practiceId:'DIW-PRUEBA',email,url};
assert.equal(context.consultarOportunidades(status).used,0);
assert.equal(context.iniciarEntrega(first).number,1);
assert.equal(context.iniciarEntrega(first).number,1,'reanudar conserva la reserva');
assert.equal(context.iniciarEntrega(envelope('2')).code,'ATTEMPTS_EXHAUSTED');
assert.equal(rows.length,2,'un inicio rechazado no crea filas');
const resume=context.consultarOportunidades({...status,attemptId:'1'.repeat(32),attemptToken:first.attemptToken});
assert.equal(resume.canResume,true);assert.equal(resume.limitEnforced,true);
assert.equal(context.recibirEntrega(first).ok,true);
assert.equal(context.recibirEntrega(first).duplicate,true);
assert.equal(context.iniciarEntrega(first).status,'submitted');
assert.equal(context.consultarOportunidades({...status,attemptId:'1'.repeat(32),attemptToken:first.attemptToken}).canResume,false);
assert.equal(context.iniciarEntrega(envelope('2')).code,'ATTEMPTS_EXHAUSTED');
cell(1,10).value='';
assert.equal(context.consultarOportunidades(status).used,1,'vaciar una celda no equivale a borrar la fila');
rows.splice(1,1);
assert.equal(context.consultarOportunidades(status).used,0,'el borrado manual libera una oportunidad');
assert.equal(context.iniciarEntrega(envelope('2')).number,1);
assert.equal(context.iniciarEntrega(envelope('3')).code,'ATTEMPTS_EXHAUSTED');
assert.equal(context.iniciarEntrega(envelope('4','otra@g.educaand.es')).number,1,'cuentas independientes');
policy={entregas:0};
assert.equal(context.iniciarEntrega(envelope('5','cero@g.educaand.es')).code,'ATTEMPTS_EXHAUSTED');
const withoutAttempt=envelope('6','cero@g.educaand.es');const body=JSON.parse(withoutAttempt.payload);delete body.attemptId;withoutAttempt.payload=JSON.stringify(body);withoutAttempt.submissionId=hash(withoutAttempt.payload);
assert.equal(context.recibirEntrega(withoutAttempt).code,'ATTEMPTS_EXHAUSTED','enviar directamente tampoco evita el límite');
assert.equal(context.iniciarEntrega(envelope('7','legacy@g.educaand.es','https://igarciafp.github.io/base3/')).ok,true,'base3 conserva su política');
console.log('OK: bloqueo en servidor, reserva idempotente, reanudación, entrega manual/automática, borrado de fila, cero intentos y aislamiento de base3.');
