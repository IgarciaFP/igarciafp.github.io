import test from 'node:test';import assert from 'node:assert/strict';
import {analizarEntregaAsync} from './analizador-entregas.mjs';
const revisar=async(palabras,sugerencias)=>analizarEntregaAsync('// '+palabras.join(' ')+'\nlet x=1;','js',{revisorOrtografico:async texto=>({matches:palabras.map((p,i)=>({offset:texto.indexOf(p),length:p.length,replacements:sugerencias[i].map(value=>({value}))}))})});
const regla=r=>r.resultados.find(x=>x.id==='ausencia_faltas');
test('dos sustituciones de igual longitud descuentan 20 %',async()=>{const r=await revisar(['numero','avia'],[['número'],['había','avía']]);assert.equal(regla(r).valor.faltas,2);assert.equal(r.reduccionOrtografica,.2);assert.equal(r.puntuacion,Math.round(r.puntuacionAntesReduccion*80)/100);});
test('cambios de longitud, varias palabras, idénticas o sin sugerencias no cuentan',async()=>{const r=await revisar(['const','ola','sino','igual'],[[],['hola'],['si no'],['igual']]);assert.equal(regla(r).valor.faltas,0);assert.equal(r.reduccionOrtografica,0);});
test('varias sugerencias válidas cuentan una vez',async()=>{const r=await revisar(['numero'],[['número','Numero']]);assert.equal(regla(r).valor.faltas,1);assert.equal(r.reduccionOrtografica,.1);});
test('diez o más faltas no producen puntuaciones negativas',async()=>{const ps=Array.from({length:11},(_,i)=>'palabr'+String.fromCharCode(97+i));const r=await revisar(ps,ps.map(p=>[p.toUpperCase()]));assert.equal(regla(r).valor.faltas,11);assert.equal(r.reduccionOrtografica,1);assert.equal(r.puntuacion,0);});
test('vocal con tilde descompuesta cuenta la misma longitud Unicode',async()=>{const r=await revisar(['numero'],[['nu\u0301mero']]);assert.equal(regla(r).valor.faltas,1);});
