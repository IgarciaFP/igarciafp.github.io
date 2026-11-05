import test from 'node:test';import assert from 'node:assert/strict';
import {analizarEntregaDetalladaAsync as analizarEntregaAsync} from './analizador-entregas.mjs';
const revisar=async(palabras,sugerencias)=>analizarEntregaAsync('// '+palabras.join(' ')+'\nlet x=1;','js',{revisorOrtografico:async texto=>({matches:palabras.map((p,i)=>({offset:texto.indexOf(p),length:p.length,replacements:sugerencias[i].map(value=>({value}))})).filter(m=>m.offset>=0)})});
const regla=r=>r.resultados.find(x=>x.id==='ausencia_faltas');
test('dos tildes omitidas en una línea alcanzan el límite del descuento',async()=>{const r=await revisar(['numero','arbol'],[['número'],['árbol']]);assert.equal((regla(r).valor.faltas??0),2);assert.equal(r.reduccionOrtografica,1);assert.equal(r.puntuacion,0);});
test('cambios de longitud, varias palabras, idénticas o sin sugerencias no cuentan',async()=>{const r=await revisar(['const','ola','sino','igual'],[[],['hola'],['si no'],['igual']]);assert.equal((regla(r).valor.faltas??0),0);assert.equal(r.reduccionOrtografica,0);});
test('varias sugerencias válidas cuentan una vez',async()=>{const r=await revisar(['numero'],[['número','Numero']]);assert.equal((regla(r).valor.faltas??0),1);assert.equal(r.reduccionOrtografica,1);});
test('diez o más faltas no producen puntuaciones negativas',async()=>{const ps=Array.from({length:11},(_,i)=>'palabr'+String.fromCharCode(97+i));const r=await revisar(ps,ps.map(p=>[p.replace('a','á')]));assert.equal((regla(r).valor.faltas??0),11);assert.equal(r.reduccionOrtografica,1);assert.equal(r.puntuacion,0);});
test('vocal con tilde descompuesta cuenta la misma longitud Unicode',async()=>{const r=await revisar(['numero'],[['nu\u0301mero']]);assert.equal((regla(r).valor.faltas??0),1);});


test('palabras cortas cuentan por tilde, eliminar letras no cuenta',async()=>{
 const r=await revisar(['esta','arbol','casas'],[['está'],['árbol'],['casa']]);assert.equal((regla(r).valor.faltas??0),2);
});
test('solo la tilde cuenta, inserción y eliminación no cuentan',async()=>{
 const r=await revisar(['arbol','arbool','arboles'],[['árbol'],['arbol'],['arboless']]);assert.equal((regla(r).valor.faltas??0),1);
});
test('dos sustituciones, transposición, longitud mayor de uno y palabras idénticas no cuentan',async()=>{
 const r=await revisar(['camino','caimno','arbol','igual'],[['canina'],['camino'],['arboles'],['igual']]);assert.equal((regla(r).valor.faltas??0),0);
});
test('glosario inglés ignora términos sin distinguir mayúsculas',async()=>{
 const r=await revisar(['Browser','array','arbol'],[['Browsers'],['arrays'],['árbol']]);assert.equal((regla(r).valor.faltas??0),1);assert.deepEqual(regla(r).valor.terminosExcluidos,['Browser','array']);
});
test('exclusión configurable, ampliable y desactivada al revisar inglés',async()=>{
 for(const [ortografia,esperadas] of [[{},0],[{terminosIgnorados:['workflow']},0],[{excluirIngles:false},0],[{idioma:'en-US'},0]]) {
  const r=await analizarEntregaAsync({texto:'browser workflow'},'texto',{ortografia,revisorOrtografico:async t=>({matches:[{offset:0,length:7,replacements:[{value:'browsers'}]},{offset:8,length:8,replacements:[{value:'workflows'}]}].filter(m=>t.slice(m.offset,m.offset+m.length).trim())})});
  assert.equal((regla(r).valor.faltas??0),esperadas);
 }
});

test('tildes en palabras de una a cuatro letras y vocales mayúsculas excluidas',async()=>{
 const r=await revisar(['a','el','si','mas','esta','Arbol','ARBOL','Numero','camion'],[['á'],['él'],['sí'],['más'],['está'],['Árbol'],['ÁRBOL'],['Número'],['camión']]);
 assert.equal(regla(r).valor.faltas,7);
});
test('no cuentan tildes sobrantes, diéresis, eñes ni otras erratas',async()=>{
 const r=await revisar(['ésta','pinguino','ano','cassa','árbol'],[['esta'],['pingüino'],['año'],['casa'],['árbol']]);
 assert.equal(regla(r).valor.faltas,0);
});
