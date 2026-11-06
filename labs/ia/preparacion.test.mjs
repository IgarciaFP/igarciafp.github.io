import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararEntrega, analizarEntregaDetallada as analizarEntrega, analizarEntregaDetalladaAsync as analizarEntregaAsync, seleccionarLenguajes } from './analizador-entregas.mjs';

test('cuatro tipos y alias javascript', () => {
  assert.deepEqual(seleccionarLenguajes('texto+javascript HTML CSS'), ['texto','js','html','css']);
  for (const [tipo, entrada] of Object.entries({texto:'Explico cómo he resuelto la actividad.',html:'<h1>Hola</h1>',css:'.caja { color: red; }',javascript:'console.log("Hola");'})) {
    const p=prepararEntrega(entrada);
    assert.equal(p.original,entrada);
    assert.equal(p.bloques[tipo].length,1);
    assert.equal(Object.values(p.bloques).flat().length,1);
  }
});
test('Markdown mixto conserva bloques y líneas sin ejecutar código', () => {
  const entrada='Mi explicación.\n\n```html\n<p>Hola</p>\n```\n```css\n.a {color:red}\n```\n```javascript\nthrow new Error("NO EJECUTAR");\n```\nConclusión.';
  const p=prepararEntrega(entrada);
  assert.equal(p.bloques.texto.length,2);
  assert.equal(p.bloques.html[0].base,3);
  assert.equal(p.bloques.javascript[0].base,9);
  assert.equal(p.bloques.css.length,1);
  const r=analizarEntrega(JSON.parse(JSON.stringify(p)),'texto');
  assert.equal(r.errores.length,0);
  assert.equal(r.resultados.find(x=>x.id==='sin_comentarios').aplicable,false);
  assert.ok(!r.resultados.some(x=>['sintaxis_configurable','css_variables','html_atributos_configurables'].includes(x.id)));
});
test('HTML extrae script/style aun seleccionando solo texto y no descarga src',()=>{
  const p=prepararEntrega('<html><style>.x {color:red}</style><script>const secreto=1;</script><script src="/privado.js"></script><p>Hola</p></html>');
  assert.equal(p.bloques.javascript.length,1);
  assert.equal(p.bloques.css.length,1);
  assert.ok(!p.bloques.html[0].texto.includes('const secreto'));
  assert.equal(analizarEntrega(p,'texto').puntuacion,null);
});
test('ortografía envía todo el texto y comentarios aunque no estén seleccionados',async()=>{
  const entrada={texto:'Explicación del alumno.',javascript:'// Comentario reservado\nconst x=1;'};
  let recibido='';
  const r=await analizarEntregaAsync(entrada,'texto',{revisorOrtografico:async t=>{recibido=t;return {matches:[]};}});
  assert.ok(recibido.includes('Explicación del alumno.'));
  assert.ok(recibido.includes('Comentario reservado'));
  assert.equal(r.puntuacion,35);
  assert.equal(r.resultados.find(x=>x.id==='sin_comentarios').valor.lineasCodigo,0);
});
test('selección errónea no convierte prosa a JS y sin selección conserva preparación',()=>{
  assert.deepEqual(analizarEntrega('Una explicación normal.','js').lenguajes,['texto']);
  assert.equal(analizarEntrega('Una explicación normal.','js').puntuacion,0);
  assert.equal(analizarEntrega('Una explicación normal.').preparacion.bloques.texto.length,1);
  assert.equal(prepararEntrega('x').bloques.texto.length,1);
  assert.throws(()=>prepararEntrega({python:'print(1)'}));
  assert.throws(()=>prepararEntrega({texto:32}));
});
test('código incompleto, fences sin cierre y contenido explícito',()=>{
  assert.equal(analizarEntrega('const = ;','javascript').estado,'analisis_parcial');
  const p=prepararEntrega('```js\nfunction f(){');
  assert.equal(p.bloques.javascript.length,1);
  assert.ok(p.avisos.length);
  assert.equal(prepararEntrega({texto:'const x=1;'}).bloques.texto[0].texto,'const x=1;');
});
test('introducción antes de HTML conserva líneas originales',()=>{
  const p=prepararEntrega('Mi explicación.\n\n<!doctype html>\n<html><script>const x=1;</script></html>');
  assert.equal(p.bloques.texto.length,1);
  assert.equal(p.bloques.html[0].base,2);
  assert.equal(p.bloques.javascript[0].base,3);
});
test('fences dentro de cadenas JS y scripts JSON no se reclasifican',()=>{
  assert.equal(prepararEntrega('const s = "```html";').bloques.html.length,0);
  assert.equal(prepararEntrega('<script type="application/json">{"x":1}</script>').bloques.javascript.length,0);
});

test('JS suelto con los cuatro inicios, incluso tras presentación y con errores',()=>{
 for(const codigo of ['"use strict";\nlet x=1;', "'use strict';\nconst x=1;",'let x=1;','const x=1;','function saludo() {}','const = ;']) {
  for(const prefijo of ['', '\n\t','Mi entrega:\n']) {
   const p=prepararEntrega(prefijo+codigo);
   assert.equal(p.bloques.javascript.length,1,prefijo+codigo);
   assert.ok(p.bloques.javascript[0].texto.includes(codigo));
  }
 }
});
test('script HTML se extrae aun pegado en entrada marcada JS o tras introducción',()=>{
 for(const entrada of ['<html><body><script>let x=1;</script></body></html>', '<SCRIPT type="module">const x=1;</SCRIPT>', 'Mi entrega:\n<script>function f(){}</script>',{js:'<script>"use strict"; let x=1;</script>'}]) {
  const p=prepararEntrega(entrada);
  assert.equal(p.bloques.javascript.length,1);
  assert.ok(!p.bloques.javascript[0].texto.includes('<script>'));
  assert.equal(analizarEntrega(p,'js').errores.length,0);
 }
});

test('el fragmento JS acaba en el último cierre o punto y coma y conserva el texto posterior',()=>{
 for(const codigo of ['const x=1;', 'function saludo() { return 1; }','function saludo() { return 1; };']) {
  for(const entrada of [codigo+'\nConclusión del alumno.', '<script>'+codigo+'\nConclusión del alumno.</script>', {js:codigo+'\nConclusión del alumno.'}]) {
   const p=prepararEntrega(entrada);
   assert.equal(p.bloques.javascript[0].texto,codigo);
   assert.equal(p.bloques.texto[0].texto,'\nConclusión del alumno.');
   assert.equal(p.bloques.texto[0].base,0);
   assert.equal(analizarEntrega(p,'js').errores.length,0);
  }
 }
});
test('se usa el último delimitador, no el primer cierre; se conservan líneas y original',()=>{
 const codigo='function f() {\n if (true) { return 1; }\n}\nconst resultado=f();';
 const original=codigo+'\nTexto posterior';
 const p=prepararEntrega(original);
 assert.equal(p.bloques.javascript[0].texto,codigo);
 assert.equal(p.bloques.texto[0].base,3);
 assert.equal(p.original,original);
});

test('separa primero documento HTML y clasifica JS antes y después',()=>{
 const html='<!DOCTYPE html>\n<html><body><script>const dentro=2;</script><p>Hola</p></body></html>';
 const entrada='"use strict";\nlet antes=1;\n'+html+'\nfunction despues(){ return 3; }\nExplicación final.';
 for(const valor of [entrada,{js:entrada},{html:entrada}]) {
  const p=prepararEntrega(valor);
  assert.equal(p.bloques.html.length,1);
  assert.equal(p.bloques.html[0].base,2);
  assert.equal(p.bloques.javascript.length,3);
  assert.ok(p.bloques.javascript.every(f=>!f.texto.includes('<!DOCTYPE')&&!f.texto.includes('</html>')));
  assert.ok(p.bloques.javascript[0].texto.includes('let antes=1;'));
  assert.equal(p.bloques.javascript[2].texto.trim(),'function despues(){ return 3; }');
  assert.equal(p.bloques.texto.at(-1).texto.trim(),'Explicación final.');
  assert.equal(analizarEntrega(p,'js').errores.length,0);
 }
});
test('HTML aislado primero y resto no JS se conserva como texto',()=>{
 const p=prepararEntrega('Presentación.\n<!DOCTYPE html><html><body>Hola</body></html>\nConclusión.');
 assert.equal(p.bloques.html.length,1);assert.equal(p.bloques.javascript.length,0);
 assert.deepEqual(p.bloques.texto.map(f=>f.texto.trim()),['Presentación.','Conclusión.']);
});
test('documento HTML dentro de cadena JS no se extrae',()=>{
 const codigo='const plantilla = `<!DOCTYPE html><html><body>Hola</body></html>`;';
 const p=prepararEntrega(codigo);
 assert.equal(p.bloques.html.length,0);assert.equal(p.bloques.javascript[0].texto,codigo);
});

test('documento HTML delimitado por Markdown conserva el siguiente bloque JS',()=>{
 const p=prepararEntrega('```html\n<!DOCTYPE html><html><body>Hola</body></html>\n```\n```js\nconst x=1;\n```');
 assert.equal(p.bloques.html.length,1);assert.equal(p.bloques.javascript.length,1);
 assert.equal(p.bloques.javascript[0].texto,'const x=1;');
 assert.equal(p.bloques.texto.length,0);
});
