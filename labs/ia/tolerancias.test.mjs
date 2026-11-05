import test from 'node:test';
import assert from 'node:assert/strict';
import {analizarEntregaDetallada as analizarEntrega,PESOS} from './analizador-entregas.mjs';
const regla=(r,id)=>r.resultados.find(x=>x.id===id);
const analizar=s=>analizarEntrega(s,'js');

test('mayúsculas y puntos: 95 % activa y 90 % no activa',()=>{
 for(const buenos of [19,18]){
  const comentarios=Array.from({length:20},(_,i)=>i<buenos?'// Comentario correcto':'// comentario diferente.').join('\n')+'\nlet x=1;';
  const r=analizar(comentarios);
  for(const id of ['comentarios_mayuscula','comentarios_sin_puntos']){
   assert.equal(regla(r,id).cumple,buenos===19,id);assert.equal(regla(r,id).valor.proporcion,buenos/20);
  }
  const puntos=Array.from({length:20},(_,i)=>'// Comentario'+(i<buenos?'.':'')).join('\n')+'\nlet x=1;';
  assert.equal(regla(analizar(puntos),'comentarios_punto_final').cumple,buenos===19);
 }
});
test('longitud similar permite un 5 % de comentarios fuera del intervalo',()=>{
 for(const buenos of [19,18]){
  const codigo=Array.from({length:20},(_,i)=>'// '+'A'.repeat(i<buenos?20:35)).join('\n')+'\nlet x=1;';
  const r=regla(analizar(codigo),'comentarios_longitud_similar');
  assert.equal(r.cumple,buenos===19);assert.equal(r.valor.coinciden,buenos);assert.equal(r.valor.proporcionExigida,0.95);
 }
});
test('misma separación de comentarios: 95 % activa y 90 % no activa',()=>{
 for(const buenos of [19,18]){
  const codigo='let x=0;'+Array.from({length:20},(_,i)=>'\n'.repeat(i<buenos?2:3)+'// Comentario\nx++;').join('');
  assert.equal(regla(analizar(codigo),'comentarios_antes_funciones').cumple,buenos===19);
 }
});
test('separadores con distinta longitud tolerados hasta un 5 %',()=>{
 for(const buenos of [19,18]){
  const codigo=Array.from({length:20},(_,i)=>'// '+'='.repeat(i<buenos?4:6)).join('\n')+'\nlet x=1;';
  assert.equal(regla(analizar(codigo),'comentarios_separadores').cumple,buenos===19);
 }
});
test('comillas uniformes toleran un 5 % de cadenas con otras comillas',()=>{
 for(const buenos of [19,18]){
  const codigo=Array.from({length:20},(_,i)=>'const x'+i+' = '+(i<buenos?'"texto"':"'texto'")+';').join('\n');
  assert.equal(regla(analizar(codigo),'comillas_uniformes').cumple,buenos===19);
 }
});
test('paridad y unidad de sangría toleran una línea discordante de veinte',()=>{
 for(const buenos of [19,18]){
  const codigo='function f(){\n'+Array.from({length:20},(_,i)=>' '.repeat(i<buenos?4:3)+'let x'+i+'=1;').join('\n')+'\n}';
  const r=analizar(codigo);
  assert.equal(regla(r,'indentacion_par').cumple,buenos===19);
  assert.equal(regla(r,'sangria_uniforme').cumple,buenos===19);
 }
});
test('la mezcla de espacios y tabuladores sigue excluida de la paridad',()=>{
 const codigo='function f(){\n'+Array.from({length:20},(_,i)=>(i<19?'    ':'\t')+'let x'+i+'=1;').join('\n')+'\n}';
 const r=analizar(codigo);
 assert.equal(regla(r,'indentacion_par').aplicable,false);
 assert.equal(regla(r,'sangria_uniforme').cumple,true);
});
test('se retira use strict del catálogo y todos los pesos de 25 pasan a 10',()=>{
 assert.equal('modo_estricto' in PESOS,false);
 assert.equal(regla(analizar('"use strict";\nlet x=1;'),'modo_estricto'),undefined);
 assert.equal(Object.keys(PESOS).length,44);
 for(const [id,peso] of Object.entries(PESOS)){
  if(!['sin_comentarios','caracteres_especiales','ausencia_faltas'].includes(id))assert.equal(peso,10,id);
 }
 assert.equal(PESOS.sin_comentarios,100);assert.equal(PESOS.caracteres_especiales,60);assert.equal(PESOS.ausencia_faltas,25);
});

