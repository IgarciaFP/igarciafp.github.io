import test from 'node:test';
import assert from 'node:assert/strict';
import { analizarEntregaDetallada as analizarEntrega, seleccionarLenguajes } from './analizador-entregas.mjs';

const regla = (r, id) => r.resultados.find(x => x.id === id);
test('selección explícita y predeterminado sin lenguajes', () => {
  for (const s of ['JS Css', 'jscss']) assert.deepEqual(seleccionarLenguajes(s), ['js', 'css']);
  assert.deepEqual(seleccionarLenguajes('HTML+css'), ['html', 'css']);
  assert.equal(analizarEntrega('const x = 1;').puntuacion, null);
  assert.throws(() => seleccionarLenguajes('json'));
});
test('cadenas y expresiones regulares no son comentarios', () => {
  const r = analizarEntrega('const url = "https://example.com"; const re = /abc\\/\\/def/;', 'js');
  assert.equal(r.errores.length, 0);
  assert.equal(regla(r, 'sin_comentarios').valor.comentarios, 0);
  assert.equal(regla(r, 'sin_comentarios').cumple, false);
});
test('sangría mixta entre líneas no aplica', () => {
  const r = analizarEntrega('function f() {\n  let a = 1;\n\tlet b = 2;\n  return a+b;\n}', 'js');
  assert.equal(regla(r, 'indentacion_par').aplicable, false);
});
test('sin comentarios no activa reglas universales', () => {
  const r = analizarEntrega('let x = 1;', 'js');
  assert.equal(regla(r, 'comentarios_sin_puntos').aplicable, false);
});
test('intros uniformes y separadores iguales', () => {
  const r = analizarEntrega('let x=0;\n\n// ====\nx++;\n\n// ====\nx++;', 'js', { umbrales: {minComentarios: 2} });
  assert.equal(regla(r, 'comentarios_antes_funciones').cumple, true);
  assert.equal(regla(r, 'comentarios_separadores').cumple, true);
});
test('separadores de diferente longitud', () => {
  const r = analizarEntrega('// ====\nlet x=0;\n// =====\nx++;', 'js');
  assert.equal(regla(r, 'comentarios_separadores').cumple, false);
});
test('HTML solo analiza los lenguajes seleccionados', () => {
  const r = analizarEntrega('<style>:root {--color: red}</style><script>const x=1;</script>', 'HTML+css');
  assert.ok(r.resultados.some(x => x.lenguaje === 'css'));
  assert.ok(!r.resultados.some(x => x.lenguaje === 'js'));
  assert.equal(regla(r, 'css_variables').cumple, true);
});
test('error de sintaxis no implica ausencia de comentarios', () => {
  const r = analizarEntrega('const = ;', 'js');
  assert.equal(r.estado, 'analisis_parcial');
  assert.equal(regla(r, 'sin_comentarios').aplicable, false);
  assert.equal(regla(r, 'sin_comentarios').cumple, false);
});
test('pesos configurables y reglas desactivadas', () => {
  const codigo=Array.from({length:10},(_,i)=>`let x${i}=${i};`).join('\n');
  const r = analizarEntrega(codigo, 'js', {pesos: {sin_comentarios: 17}});
  assert.equal(r.puntuacion, 17);
  const r2 = analizarEntrega(codigo, 'js', {desactivadas: ['sin_comentarios']});
  assert.equal(r2.puntuacion, 0);
});
test('letras españolas no cuentan como caracteres especiales', () => {
  const r = analizarEntrega('const texto="ñ á é í ó ú ü ¿ ¡ €";', 'js');
  assert.equal(regla(r, 'caracteres_especiales').cumple, false);
});

