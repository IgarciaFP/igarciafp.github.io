import test from 'node:test';
import assert from 'node:assert/strict';
import { analizarEntrega, analizarEntregaAsync, prepararProsa } from './analizador-entregas.mjs';
test('se eliminan antes de enviar cortas, glosario, camelCase y puntos internos',async()=>{
 let enviado='';const original='Hola browser miVariable nombre.js archivo.largo.js numero.\nExplicación extensa';
 const r=await analizarEntregaAsync({texto:original},'texto',{revisorOrtografico:async t=>{enviado=t;return {matches:[]};}});
 for(const prohibida of ['Hola','browser','miVariable','nombre.js','archivo.largo.js'])assert.ok(!enviado.includes(prohibida));
 assert.ok(enviado.includes('numero.'));assert.ok(enviado.includes('Explicación extensa'));
 assert.equal(r.preparacionProsa.fragmentos[0].texto.length,original.length);
 assert.deepEqual(r.preparacionProsa.exclusiones.map(e=>e.motivo),['menos_de_cinco_letras','glosario_ingles','camelCase','punto_interno','punto_interno']);
});
test('sin palabras elegibles no llama al servicio ni presume ausencia de faltas',async()=>{
 let llamadas=0;const r=await analizarEntregaAsync({texto:'el CSS browser miVariable nombre.js'},'texto',{revisorOrtografico:async()=>{llamadas++;return {matches:[]};}});
 assert.equal(llamadas,0);const regla=r.resultados.find(r=>r.id==='ausencia_faltas');assert.equal(regla.aplicable,false);assert.equal(regla.cumple,false);assert.equal(regla.valor.faltas,undefined);
});
test('punto final no elimina la palabra; puntos internos y Unicode conservan posiciones',()=>{
 const original='numero. nombre.js\nnu\u0301mero áéíó';
 const p=prepararProsa([{texto:original,archivo:'texto',linea:8}]);
 assert.ok(p.fragmentos[0].texto.startsWith('numero.'));assert.ok(p.fragmentos[0].texto.includes('nu\u0301mero'));assert.ok(!p.fragmentos[0].texto.includes('áéíó'));assert.equal(p.fragmentos[0].texto.length,original.length);
});
test('las reglas de formato conservan resultados del original',async()=>{
 const contenido={js:'// Hola miVariable nombre.js\nlet x=1;\n// Hola otroNombre cosas.css\nx++;\n// Hola tercerNombre datos.html\nx++;'};
 const previo=analizarEntrega(contenido,'js');
 const posterior=await analizarEntregaAsync(contenido,'js',{revisorOrtografico:async()=>({matches:[]})});
 for(const id of ['comentarios_mayuscula','comentarios_sin_puntos','comentarios_longitud_similar','espaciado_uniforme'])assert.deepEqual(posterior.resultados.find(r=>r.id===id),previo.resultados.find(r=>r.id===id));
});
