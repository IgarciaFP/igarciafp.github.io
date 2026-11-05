import test from 'node:test';import assert from 'node:assert/strict';
import {analizarEntregaDetalladaAsync as analizarEntregaAsync} from './analizador-entregas.mjs';
const entrada='// Este comentario explica como se prepara la lista de tareas antes de mostrar todos los elementos que ha introducido el usuario.\nconst x=1;';
test('una falta de igual longitud reduce el índice un 10 % y conserva el detalle',async()=>{
 const r=await analizarEntregaAsync(entrada,'js',{revisorOrtografico:async t=>({matches:[{offset:t.indexOf('como'),length:4,message:'Falta de prueba',replacements:[{value:'cómo'}]}]})});
 assert.equal(r.reduccionOrtografica,0.1);assert.equal(r.puntuacion,Math.round(r.puntuacionAntesReduccion*90)/100);
 assert.match(r.resultados.find(x=>x.id==='ausencia_faltas').evidencias[0].detalle,/Falta de prueba/);
});
test('modo de producción conserva el recuento y suprime detalle',async()=>{
 const r=await analizarEntregaAsync(entrada,'js',{ortografia:{mostrarDetalle:false},revisorOrtografico:async t=>({matches:[{offset:t.indexOf('como'),length:4,message:'Falta de prueba',replacements:[{value:'cómo'}]}]})});
 const regla=r.resultados.find(x=>x.id==='ausencia_faltas');assert.equal(regla.valor.faltas,1);assert.deepEqual(regla.evidencias,[]);assert.equal(regla.evidenciasTotales,0);
});

