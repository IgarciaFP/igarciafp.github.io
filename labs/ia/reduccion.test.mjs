import test from 'node:test';import assert from 'node:assert/strict';
import {analizarEntregaDetalladaAsync as analizarEntregaAsync} from './analizador-entregas.mjs';
const entrada='// Este comentario explica como se prepara la lista de tareas antes de mostrar todos los elementos que ha introducido el usuario.\nconst x=1;';
test('una falta en una línea alcanza el límite del descuento y conserva el detalle',async()=>{
 const r=await analizarEntregaAsync(entrada,'js',{revisorOrtografico:async t=>({matches:[{offset:t.indexOf('como'),length:4,message:'Falta de prueba',replacements:[{value:'cómo'}]}]})});
 assert.equal(r.reduccionOrtografica,1);assert.equal(r.puntuacion,0);
 assert.match(r.resultados.find(x=>x.id==='ausencia_faltas').evidencias[0].detalle,/Falta de prueba/);
});
test('modo de producción conserva el recuento y suprime detalle',async()=>{
 const r=await analizarEntregaAsync(entrada,'js',{ortografia:{mostrarDetalle:false},revisorOrtografico:async t=>({matches:[{offset:t.indexOf('como'),length:4,message:'Falta de prueba',replacements:[{value:'cómo'}]}]})});
 const regla=r.resultados.find(x=>x.id==='ausencia_faltas');assert.equal(regla.valor.faltas,1);assert.deepEqual(regla.evidencias,[]);assert.equal(regla.evidenciasTotales,0);
});


async function medir(lineas, faltas, extras='') {
 const texto=Array.from({length:lineas},(_,i)=>i<faltas?['El numero calculado.','El arbol plantado.'][i]:'La cantidad calculada.').join('\n')+extras;
 return analizarEntregaAsync({texto},'texto',{revisorOrtografico:async enviado=>({matches:[...enviado.matchAll(/numero|arbol/g)].map(m=>({offset:m.index,length:m[0].length,replacements:[{value:m[0]==='numero'?'número':'árbol'}]}))})});
}
test('descuento proporcional a las faltas y a las líneas elegibles',async()=>{
 for(const [lineas,faltas,esperado] of [[10,1,.5],[20,1,.25],[10,2,1],[3,1,1],[10,0,0]]) {
  const r=await medir(lineas,faltas);
  assert.equal(r.reduccionOrtografica,esperado);
  assert.equal(r.descuentoOrtografico.lineasRevisadas,lineas);
  assert.equal(r.puntuacion,Math.round(r.puntuacionAntesReduccion*(1-esperado)*100)/100);
 }
});
test('líneas vacías y glosario excluido no diluyen el descuento',async()=>{
 const r=await medir(10,1,'\n\n\n browser miVariable nombre.js\n');
 assert.equal(r.descuentoOrtografico.lineasRevisadas,10);assert.equal(r.reduccionOrtografica,.5);
});
test('comentarios multilínea cuentan sus líneas; el código no cuenta',async()=>{
 const entrada={js:'/* El numero calculado.\nLa cantidad calculada. */\n'+Array.from({length:20},(_,i)=>`let x${i}=${i};`).join('\n')};
 const r=await analizarEntregaAsync(entrada,'js',{revisorOrtografico:async texto=>({matches:[{offset:texto.indexOf('numero'),length:6,replacements:[{value:'número'}]}]})});
 assert.equal(r.descuentoOrtografico.lineasRevisadas,2);assert.equal(r.reduccionOrtografica,1);
});
test('sin revisión completa no hay descuento ni líneas afirmadas como revisadas',async()=>{
 const r=await analizarEntregaAsync({texto:'El numero calculado.'},'texto',{revisorOrtografico:async()=>{throw Error('Servicio caído');}});
 assert.equal(r.reduccionOrtografica,0);assert.equal(r.descuentoOrtografico.lineasRevisadas,0);assert.equal(r.descuentoOrtografico.faltas,null);
});
