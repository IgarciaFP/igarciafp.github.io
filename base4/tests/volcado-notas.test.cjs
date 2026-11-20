const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const headers=['ID','MODULO','Nombre de la práctica','EMAIL','DIA Y HORA [DD/MM/AA HH:MM:SS]','PROBAR CODIGO','ENTREGA completa','nota','Comentarios a la nota','NOTA IA','COMENTARIOS IA'];
const title='02-03-Bolita rebotando';
let source=[headers,['a1','DWEC',title,'uno@g.educaand.es','19/11/26 17:00:00','','report-a1','','',8,'IA 1'],['a2','DWEC',title,'uno@g.educaand.es','19/11/26 18:00:00','','report-a2','','',7,'IA 2'],['b1','DWEC',title,'dos@g.educaand.es','19/11/26 18:00:00','','report-b1','','',6,'IA 3']];
let dest=[['ID entrega','ID','Nombre actividad','Enlace','Nota','Comentario a la nota'],['a1','uno',title,'Ver entrega',8,'IA 1'],['a2','uno',title,'Ver entrega',7,'IA 2']];
let quadrant=[['','Unidad:',2],['ID','Nombre de la actividad:',title],['uno','',7],['sinentrega','',4]];
const clone=x=>JSON.parse(JSON.stringify(x));
function sheet(id,get){return {getSheetId:()=>id,getLastColumn:()=>get()[0].length,getDataRange:()=>({getValues:()=>clone(get())}),getMaxRows:()=>1000,getMaxColumns:()=>27,getRange:(row,col,n,m)=>({getValues:()=>clone(get().slice(row-1,row-1+(n||1)).map(r=>r.slice(col-1,col-1+(m||1)))),getValue:()=>get()[row-1][col-1],getDisplayValue:()=>String(get()[row-1][col-1]??''),getFormula:()=>col===6?'=HYPERLINK("https://igarciafp.github.io/base4/profesor.html#entrega=report-'+get()[row-1][0]+'";"Ver entrega")':'',getRichTextValue:()=>null})};}
const origin=sheet(0,()=>source),moduleSheet=sheet(1,()=>dest),q=sheet(2,()=>quadrant);
const book={getSheetByName:n=>n==='Entregas'?origin:n==='DWEC'?moduleSheet:n==='CuadranteDWEC'?q:null,getId:()=> 'book'};
let batches=[];
const ctx=vm.createContext({console,Sheets:{Spreadsheets:{batchUpdate:r=>batches.push(clone(r))}},SpreadsheetApp:{flush(){}},LockService:{getScriptLock:()=>({tryLock:()=>true,hasLock:()=>true,releaseLock(){}})}});
vm.runInContext(fs.readFileSync(__dirname+'/../receptor/Code.gs','utf8'),ctx);
ctx.informeAlmacenado_=code=>code.startsWith('report-')?{id:code}:null;
const cells=(p,id)=>p.requests.filter(r=>r.updateCells?.start?.sheetId===id).map(r=>({row:r.updateCells.start.rowIndex,col:r.updateCells.start.columnIndex,values:r.updateCells.rows[0].values.map(c=>c.userEnteredValue?.numberValue??c.userEnteredValue?.stringValue),raw:r.updateCells.rows[0].values}));
let p=ctx.prepararVolcadoNota_(book,origin,3,'9','Docente');
let one=cells(p,1).find(x=>x.values[1]==='uno');assert.equal(one.values[0],'a2');assert.equal(one.values[4],9);assert.equal(one.values[5],'Docente');assert.match(one.raw[3].textFormatRuns[0].format.link.uri,/revisor.html#entrega=report-a2$/);
assert.ok(p.requests.some(r=>r.deleteDimension?.range.startIndex===2));
assert.equal(cells(p,2).find(x=>x.row===3&&x.col===2).values[0],0);
assert.equal(cells(p,2).find(x=>x.row===4&&x.col===0).values[0],'dos');
assert.equal(cells(p,2).find(x=>x.row===4&&x.col===2).values[0],6);
p=ctx.prepararVolcadoNota_(book,origin,3,'5','Docente');one=cells(p,1).find(x=>x.values[1]==='uno');assert.equal(one.values[0],'a1');assert.equal(one.values[4],8);assert.equal(one.values[5],'IA 1');
p=ctx.prepararVolcadoNota_(book,origin,2,'','Solo comentario');one=cells(p,1).find(x=>x.values[1]==='uno');assert.equal(one.values[4],8);assert.equal(one.values[5],'Solo comentario');
p=ctx.prepararVolcadoNota_(book,origin,3,'8','Empate');assert.equal(cells(p,1).find(x=>x.values[1]==='uno').values[0],'a2');
source[2][7]=0;p=ctx.prepararVolcadoNota_(book,origin,2,'0','');assert.equal(cells(p,1).find(x=>x.values[1]==='uno').values[4],0);source[2][7]='';
const saved=source;source=source.slice(0,3);p=ctx.prepararVolcadoNota_(book,origin,2,'9','');assert.equal(p.estado,'excluida');assert.equal(p.requests.length,0);source=saved;
source[3][6]='';p=ctx.prepararVolcadoNota_(book,origin,2,'9','');assert.equal(p.estado,'excluida');source[3][6]='report-b1';
// Integración: el guardado manual y el volcado forman un único batch.
ctx.libro_=()=>book;ctx.sesionProfesor_=()=>({});ctx.comprobarCabeceras_=()=>{};ctx.filaDeEntrega_=()=>3;
ctx.estadoNota_=()=>({nota:'',comentarios:'',revision:'rev'});ctx.estadoIA_=()=>({notaIA:'7',comentariosIA:'IA 2'});
let out=ctx.gestionarNota({action:'set',token:'session',submissionId:'id',nota:'9',comentarios:'Docente',revision:'rev'});assert.equal(out.ok,true);assert.equal(batches.length,1);assert.ok(batches[0].requests.some(r=>r.updateCells?.range?.sheetId===0));assert.ok(batches[0].requests.some(r=>r.updateCells?.start?.sheetId===1));assert.ok(batches[0].requests.some(r=>r.updateCells?.start?.sheetId===2));
out=ctx.gestionarNota({action:'set',nota:'9',comentarios:'Docente',revision:'old'});assert.equal(out.code,'CONFLICT');assert.equal(batches.length,1);
dest[0][0]='otro';out=ctx.gestionarNota({action:'set',nota:'9',comentarios:'Docente',revision:'rev'});assert.equal(out.code,'SYNC_SCHEMA');assert.equal(batches.length,1);
console.log('OK: prioridad manual/IA, cero, comentario independiente, mayor nota, empate, enlace, duplicados, IDs nuevos, ceros, alumno único, conflicto y guardado atómico.');

