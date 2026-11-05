import test from 'node:test';
import assert from 'node:assert/strict';
import { prepararEntrega, analizarEntrega, analizarEntregaAsync, seleccionarLenguajes } from './analizador-entregas.mjs';

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
  assert.ok(!r.resultados.some(x=>['js','html','css'].includes(x.lenguaje)));
});
test('HTML extrae script/style aun seleccionando solo texto y no descarga src',()=>{
  const p=prepararEntrega('<html><style>.x {color:red}</style><script>const secreto=1;</script><script src="/privado.js"></script><p>Hola</p></html>');
  assert.equal(p.bloques.javascript.length,1);
  assert.equal(p.bloques.css.length,1);
  assert.ok(!p.bloques.html[0].texto.includes('const secreto'));
  assert.equal(analizarEntrega(p,'texto').puntuacion,null);
});
test('ortografía envía únicamente los tipos seleccionados',async()=>{
  const entrada={texto:'Explicación del alumno.',javascript:'// Comentario reservado\nconst x=1;'};
  let recibido='';
  const r=await analizarEntregaAsync(entrada,'texto',{revisorOrtografico:async t=>{recibido=t;return {matches:[]};}});
  assert.equal(recibido.trim(),'Explicación     alumno.');
  assert.equal(r.puntuacion,50);
  assert.equal(r.resultados.find(x=>x.id==='sin_comentarios').valor.lineasCodigo,0);
});
test('selección errónea no convierte prosa a JS y sin selección conserva preparación',()=>{
  assert.equal(analizarEntrega('Una explicación normal.','js').puntuacion,null);
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
