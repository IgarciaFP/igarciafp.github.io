import test from 'node:test';
import assert from 'node:assert/strict';
import { analizarEntrega, analizarEntregaAsync, analizarEntregaDetalladaAsync, crearVectorResultado, analizarEntregaInformeAsync, PATRONES_REPETICION, PESOS } from './analizador-entregas.mjs';
const limpio={revisorOrtografico:async()=>({matches:[]})};
test('contrato público: vector JSON de tres elementos y complemento del resultado final',async()=>{
 const entrada={texto:'Explicación detallada.'};
 const informe=await analizarEntregaDetalladaAsync(entrada,'texto',limpio);
 const v=await analizarEntregaAsync(entrada,'texto',limpio);
 assert.equal(v.length,3);assert.equal(v[0],false);assert.equal(v[1],100-informe.puntuacion);
 assert.deepEqual(v,crearVectorResultado(informe));assert.deepEqual(JSON.parse(JSON.stringify(v)),v);
 assert.equal(v[2].find(r=>r.id==='ausencia_faltas').peso,50);
});
test('densidad: cero comentarios activa a aunque tenga peso cero; exactamente 1/10 no',()=>{
 const codigo=Array.from({length:10},(_,i)=>`let v${i} = ${i};`).join('\n');
 const sin=analizarEntrega({js:codigo},'js',{pesos:{sin_comentarios:0}});
 assert.equal(sin[0],true);assert.equal(sin[2].find(r=>r.id==='sin_comentarios').mensaje,'No se admite código sin comentar');
 assert.equal(analizarEntrega({js:'// Comentario\n'+codigo},'js')[0],false);
});
test('sin entrada calculable no inventa humanidad del cien por cien',()=>{
 assert.deepEqual(analizarEntrega(''),[false,null,[]]);
 assert.equal(analizarEntrega({texto:''},'texto')[1],null);
});
test('solo reglas detectadas con peso y agrupación sin duplicar; peso especial 60',()=>{
 assert.equal(PESOS.caracteres_especiales,60);
 const v=analizarEntrega({texto:'“”',js:'const x = "“”";\n'+Array.from({length:9},(_,i)=>`let z${i}=${i};`).join('\n')},'texto js',{pesos:{sin_comentarios:0}});
 const especial=v[2].filter(r=>r.id==='caracteres_especiales');
 assert.equal(especial.length,1);assert.equal(especial[0].peso,60);assert.equal(especial[0].coincidencias.length,2);
 assert.ok(v[2].filter(r=>r.peso>0).every(r=>r.coincidencias.every(c=>c.cumple&&c.aplicable)));
 assert.ok(!v[2].some(r=>r.id==='ausencia_faltas'));
});
test('humanidad incorpora reducción por faltas y fallo no suma ausencia de faltas',async()=>{
 const entrada={texto:'“” numero'};
 const opciones={revisorOrtografico:async texto=>({matches:[{offset:texto.indexOf('numero'),length:6,message:'Tilde',rule:{issueType:'misspelling'},replacements:[{value:'número'}]}]})};
 const r=await analizarEntregaDetalladaAsync(entrada,'texto',opciones);
 assert.equal(r.reduccionOrtografica,.1);
 assert.equal((await analizarEntregaAsync(entrada,'texto',opciones))[1],Math.round((100-r.puntuacion)*100)/100);
 const fallido=await analizarEntregaAsync(entrada,'texto',{revisorOrtografico:async()=>{throw Error('fallo');}});
 assert.ok(!fallido[2].some(r=>r.id==='ausencia_faltas'));
});

test('JS solicitado ausente activa a e informa exactamente el motivo',async()=>{
 for(const entrada of ['', 'Explicación del alumno.', '<p>Hola</p>', '<script src="app.js"></script>', '<script type="application/json">{}</script>']) {
  const v=await analizarEntregaAsync(entrada,'js',limpio);
  assert.equal(v[0],true);assert.equal(v[1],null);
  assert.equal(v[2].find(r=>r.lenguaje==='js').mensaje,'Código/texto no detectado');
 }
});
test('cada tipo solicitado ausente informa; JS presente insuficientemente comentado informa rechazo',()=>{
 const v=analizarEntrega(Array.from({length:10},(_,i)=>`const x${i}=${i};`).join('\n'),'js css html texto');
 assert.equal(v[0],true);
 assert.deepEqual(v[2].filter(r=>r.id==='contenido_no_detectado').map(r=>r.lenguaje),['css','html','texto']);
 assert.equal(v[2].find(r=>r.id==='sin_comentarios').mensaje,'No se admite código sin comentar');
 assert.ok(!v[2].some(r=>r.id==='contenido_no_detectado'&&r.lenguaje==='js'));
});

test('código breve se analiza y revisa tildes sin patrones repetidos',async()=>{
 const codigo='// “numero repetido”\n// “numero repetido”\nconst x="uno";';
 let llamadas=0;
 const opciones={revisorOrtografico:async texto=>{llamadas++;return {matches:[{offset:texto.indexOf('numero'),length:6,replacements:[{value:'número'}]}]};}};
 const informe=await analizarEntregaInformeAsync(codigo,'js',opciones);
 assert.equal(llamadas,1);assert.equal(informe.codigoBreve.lineas,1);
 assert.equal(informe.resultados.find(r=>r.id==='ausencia_faltas').valor.faltas,1);
 assert.equal(informe.resultados.find(r=>r.id==='caracteres_especiales').cumple,true);
 for(const regla of informe.resultados.filter(r=>PATRONES_REPETICION.includes(r.id))){
  assert.equal(regla.aplicable,false);assert.equal(regla.valor,null);assert.deepEqual(regla.evidencias,[]);
 }
 const v=await analizarEntregaAsync(codigo,'js',opciones);
 assert.equal(v[0],false);assert.ok(Array.isArray(v[2]));assert.notEqual(v[1],50);
 assert.ok(v[2].some(r=>r.id==='caracteres_especiales'));
});
test('código breve sigue exigiendo comentario real',()=>{
 const v=analizarEntrega('const x="// comentario";','js');
 assert.equal(v[0],true);assert.equal(v[2].find(r=>r.id==='sin_comentarios').mensaje,'No se admite código sin comentar');
});
test('desde diez líneas vuelven a evaluarse los patrones',async()=>{
 const codigo='// Comentario repetido suficientemente largo.\n// Comentario repetido suficientemente largo.\n'+Array.from({length:10},(_,i)=>`let x${i}=${i};`).join('\n');
 const r=await analizarEntregaInformeAsync(codigo,'js',limpio);
 assert.equal(r.resultados.find(r=>r.id==='comentarios_repetidos').cumple,true);
 assert.equal(r.codigoBreve,undefined);
});
