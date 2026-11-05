import test from 'node:test';
import assert from 'node:assert/strict';
import { analizarEntrega, analizarEntregaAsync, analizarEntregaDetalladaAsync, crearVectorResultado, PESOS } from './analizador-entregas.mjs';
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
 assert.equal(sin[0],true);assert.ok(!sin[2].some(r=>r.id==='sin_comentarios'));
 assert.equal(analizarEntrega({js:'// Comentario\n'+codigo},'js')[0],false);
});
test('sin entrada calculable no inventa humanidad del cien por cien',()=>{
 assert.deepEqual(analizarEntrega(''),[false,null,[]]);
 assert.equal(analizarEntrega({texto:''},'texto')[1],null);
});
test('solo reglas detectadas con peso y agrupación sin duplicar; peso especial 60',()=>{
 assert.equal(PESOS.caracteres_especiales,60);
 const v=analizarEntrega({texto:'“”',js:'const x = "“”";'},'texto js',{pesos:{sin_comentarios:0}});
 const especial=v[2].filter(r=>r.id==='caracteres_especiales');
 assert.equal(especial.length,1);assert.equal(especial[0].peso,60);assert.equal(especial[0].coincidencias.length,2);
 assert.ok(v[2].every(r=>r.peso>0&&r.coincidencias.every(c=>c.cumple&&c.aplicable)));
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
