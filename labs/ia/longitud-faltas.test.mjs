import test from 'node:test';import assert from 'node:assert/strict';
import {analizarEntregaAsync} from './analizador-entregas.mjs';
const revisar=async(palabras,sugerencias)=>analizarEntregaAsync('// '+palabras.join(' ')+'\nlet x=1;','js',{revisorOrtografico:async texto=>({matches:palabras.map((p,i)=>({offset:texto.indexOf(p),length:p.length,replacements:sugerencias[i].map(value=>({value}))})).filter(m=>m.offset>=0)})});
const regla=r=>r.resultados.find(x=>x.id==='ausencia_faltas');
test('dos sustituciones de igual longitud descuentan 20 %',async()=>{const r=await revisar(['numero','arbol'],[['número'],['árbol']]);assert.equal((regla(r).valor.faltas??0),2);assert.equal(r.reduccionOrtografica,.2);assert.equal(r.puntuacion,Math.round(r.puntuacionAntesReduccion*80)/100);});
test('cambios de longitud, varias palabras, idénticas o sin sugerencias no cuentan',async()=>{const r=await revisar(['const','ola','sino','igual'],[[],['hola'],['si no'],['igual']]);assert.equal((regla(r).valor.faltas??0),0);assert.equal(r.reduccionOrtografica,0);});
test('varias sugerencias válidas cuentan una vez',async()=>{const r=await revisar(['numero'],[['número','Numero']]);assert.equal((regla(r).valor.faltas??0),1);assert.equal(r.reduccionOrtografica,.1);});
test('diez o más faltas no producen puntuaciones negativas',async()=>{const ps=Array.from({length:11},(_,i)=>'palabr'+String.fromCharCode(97+i));const r=await revisar(ps,ps.map(p=>[p[0].toUpperCase()+p.slice(1)]));assert.equal((regla(r).valor.faltas??0),11);assert.equal(r.reduccionOrtografica,1);assert.equal(r.puntuacion,0);});
test('vocal con tilde descompuesta cuenta la misma longitud Unicode',async()=>{const r=await revisar(['numero'],[['nu\u0301mero']]);assert.equal((regla(r).valor.faltas??0),1);});


test('más de cuatro letras: cuatro se excluye y cinco se admite incluso al reducir a cuatro',async()=>{
 const r=await revisar(['esta','arbol','casas'],[['está'],['árbol'],['casa']]);assert.equal((regla(r).valor.faltas??0),2);
});
test('inserción, eliminación y sustitución únicas cuentan',async()=>{
 const r=await revisar(['arbol','arbool','arboles'],[['árbol'],['arbol'],['arboless']]);assert.equal((regla(r).valor.faltas??0),3);
});
test('dos sustituciones, transposición, longitud mayor de uno y palabras idénticas no cuentan',async()=>{
 const r=await revisar(['camino','caimno','arbol','igual'],[['canina'],['camino'],['arboles'],['igual']]);assert.equal((regla(r).valor.faltas??0),0);
});
test('glosario inglés ignora términos sin distinguir mayúsculas',async()=>{
 const r=await revisar(['Browser','array','arbol'],[['Browsers'],['arrays'],['árbol']]);assert.equal((regla(r).valor.faltas??0),1);assert.deepEqual(regla(r).valor.terminosExcluidos,['Browser','array']);
});
test('exclusión configurable, ampliable y desactivada al revisar inglés',async()=>{
 for(const [ortografia,esperadas] of [[{},1],[{terminosIgnorados:['workflow']},0],[{excluirIngles:false},2],[{idioma:'en-US'},2]]) {
  const r=await analizarEntregaAsync({texto:'browser workflow'},'texto',{ortografia,revisorOrtografico:async t=>({matches:[{offset:0,length:7,replacements:[{value:'browsers'}]},{offset:8,length:8,replacements:[{value:'workflows'}]}].filter(m=>t.slice(m.offset,m.offset+m.length).trim())})});
  assert.equal((regla(r).valor.faltas??0),esperadas);
 }
});
