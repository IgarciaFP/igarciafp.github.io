import test from 'node:test';
import assert from 'node:assert/strict';
import { analizarEntrega, analizarEntregaAsync, analizarEntregaDetalladaAsync, crearVectorResultado, analizarEntregaInformeAsync, PATRONES_REPETICION, PESOS } from './analizador-entregas.mjs';
const limpio={revisorOrtografico:async()=>({matches:[]})};
test('contrato público: vector JSON de tres elementos y complemento del resultado final',async()=>{
 const entrada={texto:'Explicación detallada.'};
 const informe=await analizarEntregaDetalladaAsync(entrada,'texto',limpio);
 const v=await analizarEntregaAsync(entrada,'texto',limpio);
 assert.equal(v.length,3);assert.equal(v[0],false);assert.equal(v[1],100-informe.puntuacion);
 assert.deepEqual(v,crearVectorResultado(informe));assert.deepEqual(JSON.parse(JSON.stringify(v)),v);
 assert.equal(v[2],'ausencia_faltas: 25%\nfaltas_detectadas: 0');
});
test('densidad: cero comentarios activa a aunque tenga peso cero; exactamente 1/10 no',()=>{
 const codigo=Array.from({length:10},(_,i)=>`let v${i} = ${i};`).join('\n');
 const sin=analizarEntrega({js:codigo},'js',{pesos:{sin_comentarios:0}});
 assert.equal(sin[0],true);assert.equal(sin[2].split('\n').at(-1),'No se admite código sin comentar');
 assert.equal(analizarEntrega({js:'// Comentario\n'+codigo},'js')[0],false);
});
test('sin entrada calculable no inventa humanidad del cien por cien',()=>{
 assert.deepEqual(analizarEntrega(''),[false,null,'']);
 assert.equal(analizarEntrega({texto:''},'texto')[1],null);
});
test('solo reglas detectadas con peso y agrupación sin duplicar; peso especial 60',()=>{
 assert.equal(PESOS.caracteres_especiales,60);
 const v=analizarEntrega({texto:'“”',js:'"use strict";\n// Comentario.\n// Otro comentario.\nconst x = "“”";\n'+Array.from({length:9},(_,i)=>`let z${i}=${i};`).join('\n')},'texto js',{pesos:{sin_comentarios:0}});
 const especial=v[2].split('\n').filter(r=>r.startsWith('caracteres_especiales:'));
 assert.deepEqual(especial,['caracteres_especiales: 60%']);
 assert.ok(!v[2].includes('sin_comentarios: 0%'));
 assert.ok(!v[2].includes('ausencia_faltas:'));

});
test('humanidad incorpora reducción por faltas y fallo no suma ausencia de faltas',async()=>{
 const entrada={texto:'“” numero'};
 const opciones={revisorOrtografico:async texto=>({matches:[{offset:texto.indexOf('numero'),length:6,message:'Tilde',rule:{issueType:'misspelling'},replacements:[{value:'número'}]}]})};
 const r=await analizarEntregaDetalladaAsync(entrada,'texto',opciones);
 assert.equal(r.reduccionOrtografica,1);
 assert.equal((await analizarEntregaAsync(entrada,'texto',opciones))[1],Math.round((100-r.puntuacion)*100)/100);
 const fallido=await analizarEntregaAsync(entrada,'texto',{revisorOrtografico:async()=>{throw Error('fallo');}});
 assert.ok(!fallido[2].includes('ausencia_faltas:'));
});

test('tipos pedidos vacíos recurren a TXT y no provocan rechazo por JS ausente',async()=>{
 for(const tipos of ['js','html css','txt js css']) {
  const entrada={texto:'Explicación del alumno.',js:'  ',css:'\n'};
  const r=await analizarEntregaInformeAsync(entrada,tipos,limpio);
  assert.deepEqual(r.lenguajes,['texto']);
  assert.deepEqual(crearVectorResultado(r),await analizarEntregaAsync(entrada,'txt',limpio));
  assert.equal(crearVectorResultado(r)[0],false);
 }
});
test('solo se analizan tipos pedidos con datos, sin incluir TXT si hay código pedido',async()=>{
 const entrada={texto:'Explicación del alumno.',js:'// Comentario.\nconst x=1;',html:'<p>Hola</p>',css:'  '};
 const r=await analizarEntregaInformeAsync(entrada,'js css',limpio);
 assert.deepEqual(r.lenguajes,['js']);
 assert.deepEqual(crearVectorResultado(r),await analizarEntregaAsync(entrada,'js',limpio));
 assert.ok(!crearVectorResultado(r)[2].includes('Código/texto no detectado'));
});
test('sin tipos pedidos disponibles ni TXT no se inventa puntuación',async()=>{
 const v=await analizarEntregaAsync({html:'<p>Hola</p>'},'js css',limpio);
 assert.equal(v[0],false);assert.equal(v[1],null);
 assert.deepEqual(v[2],'Código/texto no detectado');
});
test('tipos vacíos no impiden detectar código sin comentar',()=>{
 const v=analizarEntrega(Array.from({length:10},(_,i)=>`const x${i}=${i};`).join('\n'),'js css html texto');
 assert.equal(v[0],true);
 assert.ok(!v[2].includes('Código/texto no detectado'));
 assert.equal(v[2].split('\n').at(-1),'No se admite código sin comentar');
});

test('código breve se analiza y revisa tildes sin patrones repetidos',async()=>{
 const codigo='// “numero repetido”\n// “numero repetido”\nconst x="uno";';
 let llamadas=0;
 const opciones={revisorOrtografico:async texto=>{llamadas++;return {matches:[{offset:texto.indexOf('numero'),length:6,replacements:[{value:'número'}]}]};}};
 const informe=await analizarEntregaInformeAsync(codigo,'js',opciones);
 assert.equal(llamadas,1);assert.equal(informe.codigoBreve.lineas,1);
 assert.equal(informe.resultados.find(r=>r.id==='ausencia_faltas').valor.faltas,1);
 assert.equal(informe.resultados.find(r=>r.id==='caracteres_especiales').cumple,true);
 for(const regla of informe.resultados.filter(r=>PATRONES_REPETICION.includes(r.id))){
  assert.equal(regla.aplicable,false);assert.equal(regla.valor,null);assert.deepEqual(regla.evidencias,[]);
 }
 const v=await analizarEntregaAsync(codigo,'js',opciones);
 assert.equal(v[0],false);assert.equal(typeof v[2],'string');assert.notEqual(v[1],50);
 assert.ok(!v[2].includes('use strict'));
});
test('código breve sigue exigiendo comentario real',()=>{
 const v=analizarEntrega('const x="// comentario";','js');
 assert.equal(v[0],true);assert.equal(v[2].split('\n').at(-1),'No se admite código sin comentar');
});
test('desde diez líneas vuelven a evaluarse los patrones',async()=>{
 const codigo='// Comentario repetido suficientemente largo.\n// Comentario repetido suficientemente largo.\n'+Array.from({length:10},(_,i)=>`let x${i}=${i};`).join('\n');
 const r=await analizarEntregaInformeAsync(codigo,'js',limpio);
 assert.equal(r.resultados.find(r=>r.id==='comentarios_repetidos').cumple,true);
 assert.equal(r.codigoBreve,undefined);
});

test('tipos ausentes no impiden aplicar la política de código breve al código presente',async()=>{
 const r=await analizarEntregaInformeAsync('// Comentario de prueba.\nlet x=1;','js css',limpio);
 assert.equal(r.codigoBreve.lineas,1);
 assert.equal(r.resultados.find(r=>r.id==='comentarios_mayuscula').aplicable,false);
 assert.ok(!crearVectorResultado(r)[2].includes('Código/texto no detectado'));
 assert.deepEqual(r.lenguajes,['js']);
});

test('sin tipo se analizan todos los bloques no vacíos y se respeta selección explícita',async()=>{
 const entrada={texto:'Explicación detallada.',html:'<p>Hola</p>',css:'   ',js:'// Comentario\nconst x=1;'};
 const r=await analizarEntregaInformeAsync(entrada,undefined,limpio);
 assert.deepEqual(r.lenguajes,['texto','html','js']);
 const explicita=await analizarEntregaInformeAsync(entrada,'js',limpio);
 assert.deepEqual(explicita.lenguajes,['js']);
 const v=await analizarEntregaAsync(entrada,'   ',limpio);
 assert.deepEqual(v,crearVectorResultado(r));
 assert.ok(!v[2].includes('Código/texto no detectado'));
});
test('HTML con script y style se analiza completo por defecto',async()=>{
 const r=await analizarEntregaInformeAsync('<!DOCTYPE html><html><style>p{color:red}</style><script>const x=1;</script><p>Hola</p></html>',undefined,limpio);
 assert.deepEqual(r.lenguajes,['html','css','js']);
 assert.equal(r.errores.length,0);
});

test('texto compacto exacto, pesos personalizados, cero excluido y ajustes globales solo en b',()=>{
 const r={resultados:[
 {id:'primera',aplicable:true,cumple:true,peso:12.5},
 {id:'segunda',aplicable:true,cumple:true,peso:60},
 {id:'primera',aplicable:true,cumple:true,peso:12.5},
 {id:'cero',aplicable:true,cumple:true,peso:0},
 {id:'inactiva',aplicable:true,cumple:false,peso:10},
 {id:'no_aplica',aplicable:false,cumple:true,peso:10}],
 lenguajes:[],preparacion:{bloques:{}},puntuacion:36.25,multiplicadorPenalizaciones:2};
 assert.deepEqual(crearVectorResultado(r),[false,63.75,'primera: 12.5%\nsegunda: 60%']);
});

test('rechazo por comentarios devuelve solo el mensaje aunque haya más reglas y falte strict',()=>{
 const v=analizarEntrega({js:'const x="“”";'},'js');
 assert.equal(v[0],true);assert.equal(v[2],'No se admite código sin comentar');
});
test('la ausencia de strict o su aparición como cadena no añade mensajes',async()=>{
 for(const codigo of ['// use strict\nconst x="“”";', '// Comentario.\nconst x="use strict";', '// Comentario.\nfunction f(){"use strict";return 1;}', '// Comentario.\nconst x=1; "use strict";']) {
  const v=await analizarEntregaAsync({js:codigo},'js',limpio);
  assert.ok(!v[2].includes('use strict'));
 }
});
test('strict válido permite el resumen y no se exige en lenguajes no seleccionados',()=>{
 for(const directiva of ['"use strict";', "'use strict';", '"otra directiva"; "use strict";']) {
  const v=analizarEntrega({js:'// Comentario.\n'+directiva+'const x="“”";'},'js');
  assert.ok(v[2].includes('caracteres_especiales: 60%'));
 }
 const v=analizarEntrega({texto:'“”',js:'const x=1;'},'txt');
 assert.equal(v[2],'caracteres_especiales: 60%');
});

test('JavaScript sin strict continúa con su resumen normal de reglas',()=>{
 const v=analizarEntrega({js:'// Comentario.\nconst x="“”";'},'js');
 assert.equal(v[0],false);assert.ok(v[2].includes('caracteres_especiales: 60%'));
 assert.ok(!v[2].includes('use strict'));
});

test('selección CSS incluye HTML y toda la prosa sin añadir líneas JS',async()=>{
 const css='/* Estilo general */\nbody { color: red; }';
 const js=Array.from({length:50},(_,i)=>`const valor${i}=${i};`).join('\n');
 const html='<!DOCTYPE html><html><head><style>'+css+'</style></head><body>\n'+Array.from({length:30},()=>'<p>Texto</p>').join('\n')+'\n<script>'+js+'</script></body></html>';
 for(const entrada of [{texto:'Mi texto ajeno al CSS.',css,html:'<p>Texto</p>',js},'Mi texto ajeno al CSS.\n'+html]){
  let enviado='';
  const r=await analizarEntregaInformeAsync(entrada,'CSS',{revisorOrtografico:async t=>{enviado=t;return {matches:[]};}});
  const densidad=r.resultados.find(x=>x.id==='sin_comentarios');
  assert.deepEqual(r.lenguajes,['css','html']);assert.equal(densidad.valor.comentarios,1);assert.equal(densidad.valor.lineasCodigo,1);
  assert.ok(densidad.valor.desglose.every(x=>x.lenguaje==='css'));
  assert.equal(crearVectorResultado(r)[0],false);assert.ok(!crearVectorResultado(r)[2].includes('No se admite'));
  assert.ok(enviado.includes('Mi texto'));
  assert.ok(r.resultados.filter(x=>x.id==='sin_comentarios').every(x=>x.valor.desglose.every(d=>d.lenguaje!=='js')));
 }
 const inversa=await analizarEntregaAsync({css:'body { color: red; }',js:'// Comentario de JS\nconst x=1;',html:'<!-- Comentario HTML --><p>Texto</p>'},'CSS',limpio);
 assert.equal(inversa[0],false);assert.ok(!inversa[2].includes('sin_comentarios:'));
});

test('CSS HTML y texto nunca bloquean; comentarios siguen como regla',async()=>{
 const entrada={css:'body { color: red; }',html:'<p>Texto</p>',texto:'Explicación.',js:'const x=1;'};
 for(const tipos of ['css','html','txt','css html texto']) {
  for(const analizar of [analizarEntrega,analizarEntregaAsync]) {
   const v=await analizar(entrada,tipos,limpio);
   assert.equal(v[0],false,tipos);assert.ok(!v[2].includes('No se admite'),tipos);
   assert.ok(!v[2].includes('sin_comentarios:'),tipos);
  }
 }
});
test('selección mixta bloquea exclusivamente por la densidad de JS',async()=>{
 const html=Array.from({length:50},()=>'<p>Texto</p>').join('\n');
 const css=Array.from({length:50},(_,i)=>`.c${i}{color:red;}`).join('\n');
 const r=await analizarEntregaInformeAsync({js:'// Comentario JS\nconst x=1;',html,css},'js html css',limpio);
 assert.equal(r.resultados.find(x=>x.id==='sin_comentarios').cumple,true);
 assert.equal(crearVectorResultado(r)[0],false);
 const v=await analizarEntregaAsync({js:'const x=1;',css:'/* Uno */ /* Dos */ body{color:red;}'},'js css',limpio);
 assert.equal(v[0],true);assert.equal(v[2],'No se admite código sin comentar');
});

test('sin comentarios CSS HTML: diez puntos por veinte líneas completas; JS conserva cien',async()=>{
 for(const tipo of ['css','html','js']) for(const n of [1,19,20,39,40,60]) {
  const codigo=Array.from({length:n},(_,i)=>tipo==='css'?`.c${i}{color:red;}`:tipo==='html'?'<p>Texto</p>':`const x${i}=${i};`).join('\n');
  const opciones={...limpio,desactivadas:Object.keys(PESOS).filter(id=>id!=='sin_comentarios')};
  const informe=await analizarEntregaInformeAsync({[tipo]:codigo},tipo,opciones);
  const esperado=tipo==='js'?100:10*Math.floor(n/20);
  assert.equal(informe.resultados.find(r=>r.id==='sin_comentarios').peso,esperado);
  assert.equal(informe.sumaPesosBase,esperado);
  assert.equal(analizarEntrega({[tipo]:codigo},tipo,opciones)[1],crearVectorResultado(informe)[1]);
  assert.equal(crearVectorResultado(informe)[0],tipo==='js');
 }
});

const soloReglas = (...ids) => ({desactivadas:Object.keys(PESOS).filter(id=>!ids.includes(id)),...limpio});
test('solo CSS suma HTML al 50%, incluso reglas compartidas, con resumen coherente',async()=>{
 const entrada={css:'a::before { content: "“”"; }',html:'<p>“”</p>'};
 for(const analizar of [analizarEntrega,analizarEntregaAsync]) {
  assert.deepEqual(await analizar(entrada,'CSS',soloReglas('caracteres_especiales')),[false,10,'caracteres_especiales: 90%']);
  assert.deepEqual(await analizar(entrada,'CSS HTML',soloReglas('caracteres_especiales')),[false,40,'caracteres_especiales: 60%']);
  assert.deepEqual(await analizar({css:'a {color:red}',html:entrada.html},'CSS',soloReglas('caracteres_especiales')),[false,70,'caracteres_especiales: 30%']);
 }
});
test('CSS y HTML calculan su propia densidad; HTML aporta la mitad',async()=>{
 const entrada={css:'/* Comentario correcto */\na { color:red; }',html:Array.from({length:20},()=>'<p>Hola</p>').join('\n')};
 const r=await analizarEntregaInformeAsync(entrada,'css',soloReglas('sin_comentarios'));
 assert.equal(r.lineasCodigoAnalizadas,21);
 assert.equal(r.sumaPesosBase,5);assert.equal(r.puntuacion,5);
 assert.deepEqual(crearVectorResultado(r),[false,95,'sin_comentarios: 5%\nfaltas_detectadas: 0']);
});
test('CSS vacío también incluye HTML con peso reducido; sin ambos conserva TXT',async()=>{
 assert.deepEqual(await analizarEntregaAsync({html:'<p>“”</p>'},'CSS',soloReglas('caracteres_especiales')),[false,70,'caracteres_especiales: 30%']);
 assert.deepEqual(await analizarEntregaAsync({texto:'“”'},'CSS',soloReglas('caracteres_especiales')),[false,40,'caracteres_especiales: 60%']);
});
test('toda la prosa se revisa una vez; código JS no seleccionado no puntúa ni bloquea',async()=>{
 const entrada={texto:'Explicación externa.',css:'/* Estilo externo */\na{color:red}',html:'<!-- Marcado externo --><p>Hola</p>',js:'// Algoritmo externo\nconst x = ()=> "“”";'};
 for(const tipo of ['css','html','txt','js']) {
  let enviado='',llamadas=0;
  const r=await analizarEntregaInformeAsync(entrada,tipo,{...soloReglas('ausencia_faltas','caracteres_especiales'),revisorOrtografico:async t=>{llamadas++;enviado=t;return {matches:[]};}});
  assert.equal(llamadas,1);
  for(const palabra of ['Explicación','Estilo','Marcado','Algoritmo']) assert.equal(enviado.split(palabra).length-1,1);
  assert.equal(r.resultados.find(x=>x.id==='ausencia_faltas').peso,25);
  if(tipo!=='js') {assert.equal(r.sumaPesosBase,25);assert.equal(crearVectorResultado(r)[0],false);}
 }
});
test('faltas en prosa no seleccionada descuentan también el análisis CSS',async()=>{
 const r=await analizarEntregaInformeAsync({css:'a{color:red}',js:'/*Hola mundo*/\nconst x=1;'},'css',limpio);
 assert.equal(r.resultados.find(x=>x.id==='ausencia_faltas').valor.faltasPorTipo.espacio_comentario,2);
 assert.equal(r.puntuacion,0);assert.equal(crearVectorResultado(r)[0],false);
});

test('el resumen incluye faltas distintas, también sin mostrar detalle',async()=>{
 const entrada={texto:'numero numero'};
 const revisar=async texto=>({matches:[...texto.matchAll(/numero/g)].map(m=>({offset:m.index,length:6,replacements:[{value:'número'}]}))});
 const v=await analizarEntregaAsync(entrada,'txt',{revisorOrtografico:revisar,ortografia:{mostrarDetalle:false}});
 assert.equal(v[2],'faltas_detectadas: 1');
});
test('el resumen distingue revisión parcial y no inventa cero si no se comprueba',async()=>{
 const fallo={revisorOrtografico:async()=>{throw Error('Sin servicio');}};
 const parcial=await analizarEntregaAsync({css:'/*Hola mundo*/\na{color:red}'},'css',fallo);
 assert.ok(parcial[2].includes('faltas_detectadas: 2 (revisión parcial)'));
 const fallida=await analizarEntregaAsync({texto:'Explicación completa.'},'txt',fallo);
 assert.ok(!fallida[2].includes('faltas_detectadas:'));
 assert.ok(!analizarEntrega({texto:'Explicación completa.'},'txt')[2].includes('faltas_detectadas:'));
 const bloqueada=await analizarEntregaAsync({js:'const x=1;',texto:'Explicación completa.'},'js',limpio);
 assert.equal(bloqueada[2],'No se admite código sin comentar');
});
