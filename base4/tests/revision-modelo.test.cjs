const test=require('node:test'),assert=require('node:assert/strict'),zlib=require('node:zlib'),fs=require('node:fs'),vm=require('node:vm');
const M=require('../motor/revision-modelo.js');
const activity={module:'dwec',id:'02-01-prueba',version:'1'},id='a'.repeat(64);
const item=(id,earned,max,status)=>({id,title:id,status,score:{earned,max},summary:'Comentario individual',positives:['Acierto observado'],errors:[],improvements:['Una mejora'],evidence:['Prueba comprobada']});
const analysis={format:'base4-analysis-v1',submissionId:id,attemptId:'b'.repeat(32),activity,generatedAt:'2026-11-28T12:00:00Z',rubricVersion:'1',solutionVersion:'modelo-1',summary:'Desglose de la calificación',score:{earned:5,max:10},sections:[{id:'web',type:'webcode',score:{earned:3,max:5},items:[item('funciona',3,5,'partial')]},{id:'texto',type:'qa',score:{earned:2,max:2},items:[item('q1',2,2,'correct')]},{id:'test',type:'test',score:{earned:0,max:3},items:[item('q2',0,3,'incorrect')]}]};
const solution={format:'base4-solution-v1',activity,revision:'modelo-1',sections:[{id:'web',type:'webcode',code:{html:'<p>Modelo</p>',css:'p{color:blue}',js:'console.log(1);'}},{id:'texto',type:'qa',questions:[{id:'q1',answer:'Respuesta de referencia',explanation:'Justificación'}]},{id:'test',type:'test',questions:[{id:'q2',correctOption:1,answer:'Opción correcta'}]}]};
test('Valida puntos por pregunta y la identidad de la entrega',()=>{
 assert.equal(M.analysis(JSON.stringify(analysis),{id,module:'DWEC',activity:activity.id,version:'1'}).score.earned,5);
 for(const change of [a=>a.submissionId='c'.repeat(64),a=>a.activity.version='2',a=>a.score.earned=9,a=>a.sections[0].items[0].score.earned=4,a=>a.sections[0].items[0].errors=Array(20).fill('x'.repeat(3000))]){const a=structuredClone(analysis);change(a);assert.throws(()=>M.analysis(a,{id,version:'1'}));}
 const pending=structuredClone(analysis);pending.sections[0].items[0].score.earned=null;pending.sections[0].items[0].status='unverified';pending.sections[0].score.earned=null;pending.score.earned=null;assert.equal(M.analysis(pending).score.earned,null);
});
test('Valida soluciones por actividad, versión y revisión',()=>{
 assert.equal(M.solution(solution,{activity:activity.id,version:'1',solutionVersion:'modelo-1'}).sections.length,3);
 assert.throws(()=>M.solution(solution,{version:'2'}));assert.throws(()=>M.solution(solution,{solutionVersion:'otra'}));
 const wrong=structuredClone(solution);wrong.sections[2].questions[0].correctOption=4;assert.throws(()=>M.solution(wrong));
});
test('La bonificación autorizada mantiene el desglose base y el máximo final',async()=>{
 const extra=structuredClone(analysis);extra.bonus={points:1,reason:'Examen en inglés autorizado por el profesor'};extra.score.earned=6;
 assert.equal(M.analysis(extra).score.earned,6);assert.equal(M.analysis(extra).sections[0].score.earned,3);assert.equal((await M.unpack(await M.pack('SSII3G.original',extra))).analysis.bonus.points,1);
 extra.bonus.points=8;extra.score.earned=10;assert.equal(M.analysis(extra).score.earned,10);extra.score.earned=11;assert.throws(()=>M.analysis(extra));extra.bonus.points=-1;assert.throws(()=>M.analysis(extra));
});
test('Una identidad confirmada se conserva sin modificar el documento original',async()=>{
 const assigned=structuredClone(analysis);assigned.identity={studentId:'destino',sourceStudentId:'origen',reason:'Confirmado expresamente por el profesor'};
 const result=await M.unpack(await M.pack('SSII3G.original',assigned));assert.equal(result.document,'SSII3G.original');assert.equal(result.analysis.identity.studentId,'destino');
 assigned.identity.studentId='../otro';assert.throws(()=>M.analysis(assigned));
});
test('Los enlaces nuevos conservan íntegramente el documento y los antiguos siguen funcionando',async()=>{
 const document='SSII3G.documento-original';const packed=await M.pack(document,analysis),decoded=await M.unpack(packed);
 assert.equal(decoded.document,document);assert.equal(decoded.analysis.submissionId,id);assert.deepEqual(await M.unpack(document),{document,analysis:null});assert.equal(await M.pack(document,null),document);
 const damaged=M.PREFIX+zlib.gzipSync(Buffer.from(JSON.stringify({format:'base4-review-v1',document,analysis:{format:'roto'}}))).toString('base64url');const read=await M.unpack(damaged);assert.equal(read.document,document);assert.equal(read.analysis,null);assert.ok(read.issue);
});
test('El receptor incorpora el mismo formato y lee opcionalmente la columna de análisis',async()=>{
 const c=vm.createContext({console,Utilities:{newBlob:value=>({getBytes:()=>Buffer.from(value)}),gzip:blob=>({getBytes:()=>zlib.gzipSync(blob.getBytes())}),base64EncodeWebSafe:bytes=>Buffer.from(bytes).toString('base64url')}});vm.runInContext(fs.readFileSync(__dirname+'/../receptor/Code.gs','utf8'),c);
 const code=c.codificarRevision_('SSII3G.original',JSON.stringify(analysis),id);assert.equal((await M.unpack(code)).analysis.score.earned,5);assert.equal(c.codificarRevision_('SSII3G.original',JSON.stringify(analysis),'d'.repeat(64)),'SSII3G.original');
 const headers=['NOTA IA','COMENTARIOS IA','Análisis de la nota'],values=['5','Resumen',JSON.stringify(analysis)],sheet={getRange:(_,col)=>({getValue:()=>values[col-1],getDisplayValue:()=>values[col-1]})};assert.equal(c.estadoIA_(sheet,headers,2).analisisNota,values[2]);assert.equal(c.estadoIA_(sheet,headers.slice(0,2),2).analisisNota,'');
 for(const title of ['DWEC · 02-08-Examen','DWEC-02-08-EXAMEN','02-08-Examen','Examen UD02'])assert.equal(c.unidadActividad_({},title),2);assert.equal(c.unidadActividad_({activity:'03-01-prueba'},'Título sin número'),3);
});
module.exports={analysis,solution};
