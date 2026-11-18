const assert=require('node:assert/strict');
const S=require('../motor/apartados.js');
assert.equal(S.definitions({title:'Original'})[0].type,'webcode');
assert.equal(S.definitions({title:'Original'})[0].path,'');
assert.equal(S.definitions({title:'QA',tipo:'QA'})[0].type,'qa');
assert.throws(()=>S.definitions({apartados:[]}));
assert.throws(()=>S.definitions({apartados:[{id:'../fuera'}]}));
assert.throws(()=>S.definitions({apartados:[{id:'a'},{id:'a'}]}));
assert.throws(()=>S.definitions({tipo:'otro'}));
assert.throws(()=>S.questions([{id:'p',enunciado:'Pregunta',opciones:['A','B','C']}],'test'));
assert.throws(()=>S.questions([{id:'p',enunciado:'Pregunta',opciones:['A','B','C','A']}],'test'));
const sections=[{id:'web',type:'webcode',code:{html:'<p>Hola</p>',css:'',js:'',txt:''}},
 {id:'razona',type:'qa',questions:[{id:'p',text:'¿Por qué?'}]},
 {id:'elige',type:'test',questions:[{id:'p',text:'Elige',options:['A','B','C','D']}]}];
const state=S.initial(sections);
assert.equal(S.incomplete(sections,state).length,3);
const notesOnly=S.initial(sections);notesOnly.values.web.txt='Notas';assert.equal(S.incomplete(sections,notesOnly).length,3);
state.values.web.html='<h1>Entrega</h1>';state.values.razona.p='Una respuesta con tildes y símbolos <>&.';state.values.elige.p='2';state.active='elige';
assert.equal(S.incomplete(sections,state).length,0);
const blank=structuredClone(state);blank.values.razona.p='  ';blank.values.elige.p='0';assert.equal(S.incomplete(sections,blank).length,1);
assert.deepEqual(S.unpack(S.pack(sections,state)),state);
const sanitized=S.sanitize(sections,state);sanitized.values.web.html='Otro';assert.notEqual(state.values.web.html,'Otro');
const invalid=structuredClone(state);invalid.values.elige.p='4';assert.throws(()=>S.sanitize(sections,invalid));
const missing=structuredClone(state);delete missing.values.razona;assert.throws(()=>S.sanitize(sections,missing));
assert.throws(()=>S.unpack([{question:'apartados-02',answer:'{}'}]));
const large=structuredClone(state);large.values.web.html='x'.repeat(10000);large.values.web.css='z'.repeat(10000);
const chunks=S.pack(sections,large);assert.ok(chunks.length>1);assert.ok(chunks.length<=10);assert.ok(chunks.every(a=>a.answer.length<=10000));assert.deepEqual(S.unpack(chunks),large);
assert.equal(S.unpack([{question:'html',answer:'<h1>Legacy</h1>'}]),null);
console.log('OK: defaults, schema, QA, four options, independent state, recovery and compatible chunk transport.');
