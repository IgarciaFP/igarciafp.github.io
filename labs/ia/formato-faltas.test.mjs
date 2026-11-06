import test from 'node:test';
import assert from 'node:assert/strict';
import {analizarEntregaDetalladaAsync as analizar,analizarEntregaInformeAsync} from './analizador-entregas.mjs';
const match=(t,original,value,id,message='Corrección')=>({offset:t.indexOf(original),length:original.length,message,rule:{id},replacements:[{value}]});
async function revisar(texto,crear){return analizar({texto},'txt',{revisorOrtografico:async t=>({matches:crear(t)})});}
const regla=r=>r.resultados.find(r=>r.id==='ausencia_faltas');
test('tilde de palabra de tres letras cuenta y la de dos no',async()=>{
 const r=await revisar('Son mas cosas para el.',t=>[match(t,'mas','más','MAS'),match(t,'el','él','EL')]);
 assert.equal(regla(r).valor.faltasPorTipo.tilde_omitida,1);
});
test('inicio minúsculo cuenta incluso con primera palabra de dos letras',async()=>{
 const r=await revisar('el perro corre. otra frase.',t=>[match(t,'el','El','UPPERCASE_SENTENCE_START'),match(t,'otra','Otra','UPPERCASE_SENTENCE_START')]);
 assert.equal(regla(r).valor.faltasPorTipo.inicio_minuscula,2);
 assert.equal(r.reduccionOrtografica,1);assert.equal(regla(r).cumple,false);
});
test('glosario eliminado no fabrica un inicio de frase',async()=>{
 const r=await revisar('Browser muestra resultados.',t=>[match(t,'muestra','Muestra','UPPERCASE_SENTENCE_START')]);
 assert.equal(regla(r).valor.faltas,0);
});
test('espacio posterior admite puntuación y excluye espacios sobrantes o anteriores',async()=>{
 const r=await revisar('Hola,mundo;vamos:ahora?Claro!Adelante. Hola , mundo.',t=>[
 match(t,',mundo',', mundo','COMMA_PARENTHESIS_WHITESPACE'),
 match(t,';vamos','; vamos','INCORRECT_SPACES'),match(t,':ahora',': ahora','INCORRECT_SPACES'),
 match(t,'?Claro','? Claro','ESPACIO_DESPUES_DE_PUNTO'),match(t,'!Adelante','! Adelante','SENTENCE_WHITESPACE'),
 match(t,' ,',',','COMMA_PARENTHESIS_WHITESPACE')]);
 assert.equal(regla(r).valor.faltasPorTipo.espacio_puntuacion,5);
});
test('aperturas ¿ y ¡ ausentes cuentan; cierres y cambios adicionales no',async()=>{
 const r=await revisar('Vienes mañana? Bravo! ¿Sales mañana',t=>[
 match(t,'Vienes','¿Vienes','ES_QUESTION_MARK'),match(t,'Bravo','¡Bravo','ES_QUESTION_MARK'),
 match(t,'mañana','mañana?','ES_QUESTION_MARK'),match(t,'Sales','¿sales','ES_QUESTION_MARK')]);
 assert.equal(regla(r).valor.faltasPorTipo.apertura_ausente,2);
});
test('error estructural repetido se cuenta una vez; frases diferentes cuentan aparte',async()=>{
 const r=await revisar('hola mundo. hola mundo. hola amigos.',t=>[...t.matchAll(/hola/g)].map(m=>({...match(t,'hola','Hola','UPPERCASE_SENTENCE_START'),offset:m.index})));
 assert.equal(regla(r).valor.faltas,2);assert.equal(regla(r).valor.aparicionesFaltas,3);
});
test('avisos condicionales Si es y estilo se descartan también en categorías nuevas',async()=>{
 const r=await revisar('hola mundo. Bravo!',t=>[match(t,'hola','Hola','UPPERCASE_SENTENCE_START','Si es una frase'),{...match(t,'Bravo','¡Bravo','ES_QUESTION_MARK'),rule:{id:'ES_QUESTION_MARK',issueType:'style'}}]);
 assert.equal(regla(r).valor.faltas,0);
});
test('signos de apertura de inicio de comentario breve mantienen el descuento',async()=>{
 const r=await analizarEntregaInformeAsync('// Bravo!\nlet x=1;','js',{revisorOrtografico:async t=>({matches:[match(t,'Bravo','¡Bravo','ES_QUESTION_MARK')]})});
 assert.equal(regla(r).valor.faltas,1);assert.equal(r.puntuacion,0);assert.equal(r.codigoBreve.lineas,1);
});
test('tres letras activan la revisión y el denominador de líneas',async()=>{
 let llamadas=0;const r=await revisar('mas\nSol\nel',t=>{llamadas++;return [match(t,'mas','más','MAS')];});
 assert.equal(llamadas,1);assert.equal(regla(r).valor.lineasRevisadas,2);
});
test('fallo del servicio no se convierte en ausencia de errores',async()=>{
 const r=await analizar({texto:'hola,mundo!'},'txt',{revisorOrtografico:async()=>{throw Error('Fallo');}});
 assert.equal(regla(r).peso,0);assert.equal(regla(r).estadoRevision,'fallida');assert.equal(r.reduccionOrtografica,0);
});

test('las doce expresiones vigiladas cuentan sin avisos de la API',async()=>{
 const texto='de que; hubieron; han habido; habían; sobretodo; mi; tu; a parte; aun; ni si quiera; a ver; preveer';
 const r=await revisar(texto,()=>[]);
 assert.equal(regla(r).valor.faltasPorTipo.expresion_vigilada,12);
 assert.equal(regla(r).cumple,false);assert.equal(r.reduccionOrtografica,1);
});
test('mi y tu solos son elegibles, aun no coincide con aún y se respetan límites',async()=>{
 const r=await revisar('mi\ntu\nmí tú aún miremos turno aunado hubieronAlgo mi.js',()=>[]);
 assert.equal(regla(r).valor.faltas,2);assert.deepEqual(regla(r).valor.expresionesVigiladas.map(v=>v.expresion),['mi','tu']);
 const solo=await revisar('mi tu',()=>[]);assert.equal(regla(solo).valor.lineasRevisadas,1);assert.equal(regla(solo).valor.faltas,2);
});
test('expresiones repetidas no duplican descuento; case, espacios y NFC equivalen',async()=>{
 const r=await revisar('DE QUE; de   que; habían; habi\u0301an; MI mi',()=>[]);
 assert.equal(regla(r).valor.faltas,3);assert.equal(regla(r).valor.aparicionesFaltas,6);
});
test('la eliminación de glosario no crea expresiones artificiales',async()=>{
 const r=await revisar('de browser que; han browser habido; a browser parte',()=>[]);
 assert.equal(regla(r).valor.faltas,0);
});
test('un aviso API sobre una expresión vigilada no la cuenta por segunda vez',async()=>{
 const r=await revisar('aun hay cosas',t=>[match(t,'aun','aún','AUN','Si es temporal')]);
 assert.equal(regla(r).valor.faltas,1);assert.equal(regla(r).valor.faltasPorTipo.expresion_vigilada,1);
 assert.equal(regla(r).valor.faltasPorTipo.tilde_omitida,0);
});
test('las expresiones sobreviven al fallo API sin afirmar revisión completada',async()=>{
 const r=await analizar({texto:'mi tu'},'txt',{revisorOrtografico:async()=>{throw Error('Fallo');}});
 assert.equal(regla(r).estadoRevision,'parcial');assert.equal(regla(r).valor.faltas,2);
 assert.equal(regla(r).peso,0);assert.equal(regla(r).cumple,false);assert.equal(r.reduccionOrtografica,1);
});
test('solo se detectan expresiones en prosa, no en código ejecutable',async()=>{
 const r=await analizarEntregaInformeAsync('const mi = "a ver";\n// Tu texto\nlet x=1;','js',{revisorOrtografico:async()=>({matches:[]})});
 assert.deepEqual(regla(r).valor.expresionesVigiladas.map(v=>v.expresion),['tu']);
});

test('espacios en delimitadores reales JS, CSS y HTML; repetidos una vez',async()=>{
 for(const [tipo,codigo,n] of [
 ['js','//Hola mundo\n//Hola mundo\n/*Otra frase*/\nconst x=1;',3],
 ['css','/*Hola mundo*/\na { color: red; }',2],
 ['html','<!--Hola mundo--><p>Texto</p>',2],
 ['js','//x\nconst x=1;',1],
 ['js','/**Hola mundo*/\nconst x=1;',2]]){
  const r=await analizar({[tipo]:codigo},tipo,{revisorOrtografico:async()=>({matches:[]})});
  assert.equal(regla(r).valor.faltasPorTipo.espacio_comentario,n,tipo+codigo);
  assert.ok(r.reduccionOrtografica>0);
 }
});
test('separadores correctos, saltos, JSDoc, vacíos y cadenas no dan faltas',async()=>{
 for(const [tipo,codigo] of [
 ['js','// Hola mundo\n/*\nOtra frase\n*/\n/** Documentación correcta */\n//\n/**/\nconst x="//sin espacio";'],
 ['css','/* Hola mundo */\na { content: "/*texto*/"; }'],
 ['html','<!-- Hola mundo --><!--\nOtra frase\n--><p>Texto</p>']]){
  const r=await analizar({[tipo]:codigo},tipo,{revisorOrtografico:async()=>({matches:[]})});
  assert.equal(regla(r).valor.faltasPorTipo.espacio_comentario,0);
 }
});
test('espacios locales sobreviven al fallo API y conservan línea del cierre',async()=>{
 const r=await analizar({js:'/*\nHola mundo*/\nconst x=1;'},'js',{revisorOrtografico:async()=>{throw Error('sin servicio');}});
 const v=regla(r);assert.equal(v.estadoRevision,'parcial');assert.equal(v.puntosAplicados,0);
 assert.equal(v.valor.faltasPorTipo.espacio_comentario,1);assert.equal(v.evidencias[0].linea,2);
});
test('el texto y los lenguajes no seleccionados no se revisan como comentarios',async()=>{
 const r=await analizar({texto:'//Hola mundo',js:'/*Hola mundo*/\nconst x=1;'},'txt',{revisorOrtografico:async()=>({matches:[]})});
 assert.equal(regla(r).valor.faltasPorTipo.espacio_comentario,0);
});
