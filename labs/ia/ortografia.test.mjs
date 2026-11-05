import test from 'node:test';
import assert from 'node:assert/strict';
import { analizarEntrega, analizarEntregaAsync, PESOS } from './analizador-entregas.mjs';
const texto = '// Este comentario explica cómo se prepara la lista de tareas antes de mostrar todos los elementos que ha introducido el usuario.\nconst secreto = "NO_ENVIAR_CODIGO";';
const regla=r=>r.resultados.find(x=>x.id==='ausencia_faltas');
const config = {ortografia:{activa:true,idioma:'es'}};
test('sin faltas suma exactamente 50 puntos y solo envía comentarios',async()=>{
 let enviado='';const previo=analizarEntrega(texto,'js');
 const r=await analizarEntregaAsync(texto,'js',{...config,revisorOrtografico:async t=>{enviado=t;return {matches:[]};}});
 assert.equal(PESOS.ausencia_faltas,50);assert.equal(regla(r).cumple,true);
 assert.equal(r.sumaSinLimitar-previo.sumaSinLimitar,50);
 assert.ok(!enviado.includes('NO_ENVIAR_CODIGO'));assert.ok(!enviado.includes('const secreto'));
 assert.equal(r.fragmentosOrtografia,undefined);
});
test('falta detectada impide sumar y muestra evidencia',async()=>{
 const r=await analizarEntregaAsync(texto,'js',{...config,revisorOrtografico:async()=>({matches:[{offset:5,length:10,message:'Posible falta',rule:{issueType:'misspelling'},replacements:[{value:'comentarios'}]}]})});
 assert.equal(regla(r).aplicable,true);assert.equal(regla(r).cumple,false);assert.equal(regla(r).valor.faltas,1);assert.match(regla(r).evidencias[0].detalle,/Posible falta/);
});
test('fallo del servicio y respuesta incompleta nunca significan ausencia de faltas',async()=>{
 for(const proveedor of [async()=>{throw new Error('Sin conexión');},async()=>({matches:[],warnings:{incompleteResults:true}}),async()=>({}),async()=>({matches:[{offset:-1,length:3}]})]){
  const r=await analizarEntregaAsync(texto,'js',{...config,revisorOrtografico:proveedor});
  assert.equal(regla(r).cumple,false);assert.equal(regla(r).aplicable,false);assert.equal(r.estado,'analisis_parcial');
 }
});
test('sin comentarios no consulta; con texto revisa siempre incluso con peso cero',async()=>{
 let llamadas=0;const proveedor=async()=>{llamadas++;return {matches:[]};};
 const vacio=await analizarEntregaAsync('const x=1;','js',{revisorOrtografico:proveedor});assert.equal(regla(vacio).aplicable,false);assert.equal(llamadas,0);
 for(const [entrada,opciones] of [['// Texto breve\nlet x=1;',config],[texto,{pesos:{ausencia_faltas:0}}],[texto,{desactivadas:['ausencia_faltas']}],[texto,{}]]){
  const r=await analizarEntregaAsync(entrada,'js',{...opciones,revisorOrtografico:proveedor});assert.equal(regla(r).aplicable,true);
 }assert.equal(llamadas,4);
});
test('las sugerencias de estilo no cuentan como faltas',async()=>{
 const r=await analizarEntregaAsync(texto,'js',{...config,revisorOrtografico:async()=>({matches:[{offset:1,length:4,rule:{issueType:'style'}}]})});
 assert.equal(regla(r).cumple,true);assert.equal(regla(r).valor.sugerenciasEstilo,1);
});
test('errores léxicos impiden atribuir una revisión completa',async()=>{
 let llamadas=0;const r=await analizarEntregaAsync(texto+'\nconst a="cadena sin cerrar','js',{...config,revisorOrtografico:async()=>{llamadas++;return {matches:[]};}});
 assert.equal(llamadas,0);assert.equal(regla(r).aplicable,false);
});
test('si los comentarios se extraen completos pueden revisarse aunque falte una llave',async()=>{
 let llamadas=0;const r=await analizarEntregaAsync('function f(){\n'+texto,'js',{...config,revisorOrtografico:async()=>{llamadas++;return {matches:[]};}});
 assert.equal(llamadas,1);assert.equal(regla(r).cumple,true);assert.equal(r.estado,'analisis_parcial');
});

