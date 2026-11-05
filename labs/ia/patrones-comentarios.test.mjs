import test from 'node:test';
import assert from 'node:assert/strict';
import {analizarEntrega} from './analizador-entregas.mjs';
const regla=(r,id)=>r.resultados.find(x=>x.id===id);
const comentarios=['Leer los datos del viaje','Sumar los gastos del viaje','Calcular el total del viaje','Mostrar el coste del viaje'];
const ejemplo=(sangria='\t')=>'function calcular() {\n'+comentarios.map((c,i)=>sangria+'// '+c+'\n'+sangria+'const gasto'+i+' = '+i+';').join('\n')+'\n}';

test('cuatro comentarios detectan mayúsculas, ausencia de puntos, longitud, espaciado y tabuladores uniformes',()=>{
 const r=analizarEntrega(ejemplo(),'js');assert.equal(r.errores.length,0);
 for(const id of ['comentarios_mayuscula','comentarios_sin_puntos','comentarios_longitud_similar','espaciado_uniforme','sangria_uniforme'])assert.equal(regla(r,id).cumple,true,id);
 assert.equal(regla(r,'indentacion_par').aplicable,false);
 assert.equal(regla(r,'sangria_uniforme').valor.tipo,'tabuladores');
});
test('mayúsculas y ausencia de puntos pueden comprobarse con dos comentarios',()=>{
 const r=analizarEntrega('// Leer datos\nlet a=1;\n// Sumar datos\na++;','js');
 for(const id of ['comentarios_mayuscula','comentarios_sin_puntos'])assert.equal(regla(r,id).cumple,true);
 assert.equal(regla(r,'comentarios_longitud_similar').aplicable,false);
});
test('un solo comentario explica la muestra insuficiente',()=>{
 const r=analizarEntrega('// Leer datos\nlet a=1;','js');
 assert.equal(regla(r,'comentarios_mayuscula').aplicable,false);
 assert.match(regla(r,'comentarios_mayuscula').motivo,/al menos 2.*encontrado 1/);
});
test('un comentario en minúscula o con punto impide cumplir las reglas universales',()=>{
 const r=analizarEntrega(ejemplo().replace('Leer los datos del viaje','leer los datos del viaje.'),'js');
 assert.equal(regla(r,'comentarios_mayuscula').cumple,false);assert.equal(regla(r,'comentarios_sin_puntos').cumple,false);
});
test('un comentario discordante entre cuatro supera el margen permitido del 20 %',()=>{
 const r=analizarEntrega(ejemplo().replace('Leer los datos del viaje','Leer'),'js');
 assert.equal(regla(r,'comentarios_longitud_similar').cumple,false);
 const amplia=analizarEntrega(ejemplo().replace('Leer los datos del viaje','Leer'),'js',{umbrales:{toleranciaLongitud:1}});
 assert.equal(regla(amplia,'comentarios_longitud_similar').cumple,true);
});
test('sangría uniforme de tres espacios no depende de la paridad',()=>{
 const r=analizarEntrega(ejemplo('   '),'js');
 assert.equal(regla(r,'sangria_uniforme').cumple,true);assert.equal(regla(r,'sangria_uniforme').valor.unidad,3);
 assert.equal(regla(r,'indentacion_par').aplicable,true);assert.equal(regla(r,'indentacion_par').cumple,false);
});
test('mezclar tabuladores y espacios no activa uniformidad ni paridad',()=>{
 const r=analizarEntrega(ejemplo().replace('\t// Leer','  // Leer'),'js');
 assert.equal(regla(r,'indentacion_par').aplicable,false);assert.equal(regla(r,'sangria_uniforme').cumple,false);
});
test('el espaciado puede ser uniforme aunque el primer comentario abra el archivo',()=>{
 const codigo=comentarios.map((c,i)=>'// '+c+'\nconst gasto'+i+'='+i+';').join('\n');
 const r=analizarEntrega(codigo,'js');
 assert.equal(regla(r,'espaciado_uniforme').cumple,true);
 assert.equal(regla(r,'comentarios_antes_funciones').cumple,false);
});
test('separaciones diferentes no se convierten en patrón uniforme',()=>{
 const codigo=comentarios.map((c,i)=>'\n'.repeat(i+1)+'// '+c+'\nconst gasto'+i+'='+i+';').join('');
 assert.equal(regla(analizarEntrega(codigo,'js'),'espaciado_uniforme').cumple,false);
});
test('errores léxicos muestran por qué no se analizaron los comentarios',()=>{
 const r=analizarEntrega(ejemplo()+'\nconst a = "cadena sin cerrar','js');
 assert.equal(regla(r,'comentarios_mayuscula').aplicable,false);
 assert.match(regla(r,'comentarios_mayuscula').motivo,/error de sintaxis/);
});
test('comentarios con numeración y mayúsculas acentuadas',()=>{
 const r=analizarEntrega('// 1) Obtener datos\nlet a=1;\n// 2) Áreas disponibles\na++;','js');
 assert.equal(regla(r,'comentarios_mayuscula').cumple,true);
});
