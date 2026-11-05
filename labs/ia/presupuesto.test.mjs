import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {analizarEntrega} from './analizador-entregas.mjs';
const ejemplo=await readFile(new URL('./fixtures/presupuesto-incompleto.txt',import.meta.url),'utf8');
const porId=(r,id)=>r.resultados.find(x=>x.lenguaje==='js'&&x.id===id);
test('ejemplo real: HTML seguido de JS incompleto conserva sus cuatro comentarios',()=>{
 const r=analizarEntrega(ejemplo,'htmljs');
 assert.equal(r.estado,'analisis_parcial');assert.ok(r.errores.some(e=>e.lenguaje==='js'));
 assert.equal(porId(r,'comentarios_mayuscula').valor.total,4);
 assert.equal(porId(r,'comentarios_mayuscula').valor.coinciden,4);
 for(const id of ['comentarios_mayuscula','comentarios_sin_puntos','comentarios_longitud_similar','espaciado_uniforme','sangria_uniforme','indentacion_par'])assert.equal(porId(r,id).cumple,true,id);
 assert.equal(porId(r,'sangria_uniforme').valor.unidad,4);
 assert.ok(r.avisos.some(a=>a.mensaje.includes('después de </html>')));
 assert.ok(!r.resultados.some(x=>x.id==='modo_estricto'));
 const ubicaciones=porId(r,'comentarios_mayuscula').evidencias.map(e=>e.linea);
 const reales=ejemplo.split('\n').flatMap((l,i)=>l.trim().startsWith('//')?[i+1]:[]);
 assert.deepEqual(ubicaciones,reales);
});
test('sin JS seleccionado no se incluyen sus comentarios ni sus líneas en HTML',()=>{
 const r=analizarEntrega(ejemplo,'html');
 assert.equal(r.errores.length,0);assert.ok(!r.resultados.some(x=>x.lenguaje==='js'));
 assert.equal(r.resultados.find(x=>x.id==='sin_comentarios').valor.comentarios,0);
 assert.ok(r.avisos.some(a=>a.mensaje.includes('JS no está seleccionado')));
 assert.ok(r.resultados.find(x=>x.id==='sin_comentarios').valor.lineasCodigo<32);
});
test('el JS pegado puede analizarse solo a partir de un objeto HTML',()=>{
 const r=analizarEntrega({html:ejemplo},'js');assert.equal(porId(r,'comentarios_mayuscula').valor.total,4);
});
test('con la función cerrada también se evalúa el AST',()=>{
 const r=analizarEntrega(ejemplo+'\n}','htmljs');assert.equal(r.errores.length,0);
 assert.ok(porId(r,'metodos_configurables'));
 assert.equal(porId(r,'modo_estricto'),undefined);
});
test('texto normal después del HTML no se reclasifica como JS',()=>{
 const r=analizarEntrega('<html><body>Hola</body></html>Texto de despedida','htmljs');
 assert.ok(!r.resultados.some(x=>x.lenguaje==='js'));
});
test('un cierre HTML dentro de una cadena de script no divide el documento',()=>{
 const r=analizarEntrega('<html><body><script>const t="</html>"; // Texto\n</script></body></html>','htmljs');
 assert.equal(r.errores.length,0);assert.ok(!r.avisos.some(a=>a.mensaje.includes('después de </html>')));
});
