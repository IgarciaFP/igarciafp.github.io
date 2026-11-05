import test from 'node:test';
import assert from 'node:assert/strict';
import { analizarEntregaDetallada as analizarEntrega } from './analizador-entregas.mjs';

const regla = r => r.resultados.find(x => x.id === 'sin_comentarios');
const lineas = (n, lenguaje) => Array.from({length:n}, (_, i) =>
  lenguaje === 'js' ? `let valor${i} = ${i};` :
  lenguaje === 'css' ? `.clase${i} { color: red; }` : `<p>Texto ${i}</p>`).join('\n');
const comentario = lenguaje => lenguaje === 'js' ? '// Comentario' : lenguaje === 'css' ? '/* Comentario */' : '<!-- Comentario -->';

for (const lenguaje of ['js', 'css', 'html']) {
  test(`${lenguaje}: umbral estricto y comentarios excluidos del denominador`, () => {
    for (const [cantidad, numeroComentarios, activa] of [[9,1,false],[10,1,false],[11,1,true],[20,2,false],[21,2,true],[1,0,true]]) {
      const codigo = [Array(numeroComentarios).fill(comentario(lenguaje)).join('\n'), '', lineas(cantidad,lenguaje), ''].join('\n');
      const r = regla(analizarEntrega(codigo,lenguaje));
      assert.equal(r.aplicable,true);
      assert.equal(r.cumple,activa,`${numeroComentarios} comentarios / ${cantidad} líneas`);
      assert.equal(r.valor.lineasCodigo,cantidad);
      assert.equal(r.valor.comentarios,numeroComentarios);
      assert.equal(r.peso,100);
    }
  });
}
test('comentarios de bloque cuentan como uno; líneas vacías o solo comentarios no cuentan', () => {
  const r=regla(analizarEntrega('/*\n Comentario\n largo\n*/\n\n'+lineas(10,'js')+'\n\n','js'));
  assert.equal(r.valor.comentarios,1);assert.equal(r.valor.lineasCodigo,10);assert.equal(r.cumple,false);
});
test('un comentario al final de una línea no elimina el código de esa línea', () => {
  const r=regla(analizarEntrega(lineas(10,'js')+' // comentario\n','js'));
  assert.equal(r.valor.comentarios,1);assert.equal(r.valor.lineasCodigo,10);assert.equal(r.cumple,false);
});
test('se suman los lenguajes seleccionados y se produce un único resultado', () => {
  const entrada={js:lineas(10,'js'),css:'/* Uno */\n/* Dos */\n'+lineas(10,'css'),html:lineas(100,'html')};
  const r=analizarEntrega(entrada,'jscss');
  assert.equal(r.resultados.filter(x=>x.id==='sin_comentarios').length,1);
  assert.equal(regla(r).valor.lineasCodigo,20);assert.equal(regla(r).valor.comentarios,2);assert.equal(regla(r).cumple,false);
  assert.equal(regla(analizarEntrega(entrada,'js')).cumple,true);
});
test('HTML con script/style: los lenguajes no seleccionados quedan excluidos', () => {
  const html='<!-- HTML no seleccionado -->\n<style>\n/* Uno */\n/* Dos */\n'+lineas(10,'css')+'\n</style>\n<script>\n'+lineas(10,'js')+'\n</script>';
  const r=regla(analizarEntrega({html},'jscss'));
  assert.equal(r.valor.comentarios,2);assert.equal(r.valor.lineasCodigo,20);assert.equal(r.cumple,false);
});
test('una misma línea HTML con JS y CSS no se cuenta varias veces', () => {
  const r=regla(analizarEntrega('<div><!-- Uno --><style>a{color:red}</style><script>let a=1;</script></div>','htmljscss'));
  assert.equal(r.valor.lineasCodigo,1);assert.equal(r.valor.comentarios,1);assert.equal(r.cumple,false);
});
test('sin código o con errores sintácticos la regla no aplica', () => {
  for(const entrada of ['', '// Comentario', '/* Comentario\n multilinea */', 'const = ;']) {
    const r=regla(analizarEntrega(entrada,'js'));
    assert.equal(r.aplicable,false);assert.equal(r.cumple,false);
  }
});

