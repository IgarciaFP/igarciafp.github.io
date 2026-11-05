import test from 'node:test';
import assert from 'node:assert/strict';
import glosario from './glosario-tecnico.json' with { type: 'json' };
import { analizarEntregaDetalladaAsync as analizarEntregaAsync, prepararProsa, TERMINOS_INGLES, TERMINOS_TECNICOS } from './analizador-entregas.mjs';
const regla=r=>r.resultados.find(x=>x.id==='ausencia_faltas');
test('un término técnico dentro de una palabra compuesta retira la palabra completa',()=>{
 const tokens=['mitextareaextra','pre-display','mi_textarea','prefijo/textarea/sufijo','(TEXTAREA_extra)'];
 const texto=tokens.join(' ');
 const r=prepararProsa([{texto,archivo:'prueba',linea:1}],{excluirIngles:false});
 assert.equal(r.fragmentos[0].texto,' '.repeat(texto.length));
 assert.deepEqual(r.exclusiones.map(x=>x.token),tokens);
 assert.ok(r.exclusiones.every(x=>x.motivo==='glosario_tecnico'));
});
test('la exclusión de compuestos no cruza puntos, comas, espacios ni saltos de línea',()=>{
 const texto='campo.textareaextra,campo mitextarea\ncampo';
 const r=prepararProsa([{texto,archivo:'prueba',linea:4}],{excluirIngles:false});
 assert.equal(r.fragmentos[0].texto,'campo.'+' '.repeat(13)+',campo '+' '.repeat(10)+'\ncampo');
 assert.equal(r.fragmentos[0].texto.length,texto.length);
 assert.equal(r.fragmentos[0].original,texto);
 assert.deepEqual(r.exclusiones.map(x=>x.inicio),[6,26]);
});
test('los términos ingleses y personalizados respetan la opción de exclusión',()=>{
 const texto='zzzfoobarinozzz';
 const fragmentos=[{texto,archivo:'prueba',linea:1}];
 assert.equal(prepararProsa(fragmentos,{terminosIgnorados:['foobarino']}).fragmentos[0].texto.trim(),'');
 assert.equal(prepararProsa(fragmentos,{terminosIgnorados:['foobarino'],excluirIngles:false}).fragmentos[0].texto,texto);
});
test('el filtro retira compuestos antes de enviar texto y comentarios al revisor',async()=>{
 for(const [contenido,lenguaje] of [[{texto:'mitextareaextra campo'},'texto'],[{js:'// mitextareaextra campo\nlet x=1;'},'js']]){
  let recibido;
  await analizarEntregaAsync(contenido,lenguaje,{ortografia:{excluirIngles:false},revisorOrtografico:async texto=>{recibido=texto;return {matches:[]};}});
  assert.ok(recibido.includes('campo'));
  assert.ok(!recibido.includes('mitextareaextra'));
 }
});
async function revisar(texto,matches,ortografia={excluirIngles:false}) {
 return analizarEntregaAsync({texto},'texto',{ortografia,revisorOrtografico:async t=>({matches:matches.filter(m=>t.slice(m.offset,m.offset+m.length).trim())})});
}
test('todos los glosarios contienen solo términos con más de cuatro letras',()=>{
 for(const palabra of [...TERMINOS_INGLES,...TERMINOS_TECNICOS])assert.ok((palabra.match(/\p{L}/gu)||[]).length>4,palabra);
});
test('cobertura de reservadas JS, HTML, CSS y ambas unidades SSII',()=>{
 const esperadas={javascript:'await break catch class const continue debugger default delete export extends false finally function import instanceof return super switch throw typeof while yield implements interface package private protected public static async target arguments using',html:'article textarea required onbeforetoggle',css:'display background inherit initial unset revert important rebeccapurple',ssii_u01:'hardware kibibyte mebibyte ebcdic megatransfers speedometer copyleft',ssii_u02:'broadcast backhaul subnetting ipconfig nslookup wireshark monomodo'};
 for(const [grupo,terminos] of Object.entries(esperadas))for(const t of terminos.split(' '))assert.ok(glosario.grupos[grupo].includes(t),grupo+': '+t);
});
test('términos técnicos se excluyen incluso desactivando inglés',async()=>{
 const palabras=['instanceof','textarea','rebeccapurple','Kibibyte','subnetting'];const texto=palabras.join(' ');
 const r=await revisar(texto,palabras.map(t=>({offset:texto.indexOf(t),length:t.length,replacements:[{value:t+'s'}]})));
 assert.equal((regla(r).valor.faltas??0),0);assert.deepEqual(regla(r).valor.tecnicosExcluidos,palabras);
});
test('camelCase y PascalCase excluyen avisos completos y parciales',async()=>{
 for(const palabra of ['miPalabra','MiPalabra','getHTTPResponse','calcular2Total']){
  const r=await revisar(palabra,[{offset:0,length:palabra.length,replacements:[{value:palabra+'s'}]}]);
  assert.equal((regla(r).valor.faltas??0),0);assert.deepEqual(regla(r).valor.camelCaseExcluidos,[palabra]);
 }
 const r=await revisar('miPalabra',[{offset:2,length:7,replacements:[{value:'Palabras'}]}]);
 assert.deepEqual(regla(r).valor.camelCaseExcluidos,['miPalabra']);assert.equal((regla(r).valor.faltas??0),0);
});
test('mayúscula inicial no es camelCase; errata de un término sigue siendo analizable',async()=>{
 const texto='Arbol subneting';
 const r=await revisar(texto,[{offset:0,length:5,replacements:[{value:'Árbol'}]},{offset:6,length:9,replacements:[{value:'subnetting'}]}]);
 assert.equal((regla(r).valor.faltas??0),2);assert.deepEqual(regla(r).valor.camelCaseExcluidos,[]);
});
test('camelCase y términos técnicos también se excluyen en comentarios',async()=>{
 const r=await analizarEntregaAsync({js:'// miPalabra y subnetting\nlet x=1;'},'js',{revisorOrtografico:async texto=>({matches:['miPalabra','subnetting'].map(t=>({offset:texto.indexOf(t),length:t.length,replacements:[{value:t+'s'}]}))})});
 assert.equal((regla(r).valor.faltas??0),0);assert.deepEqual(regla(r).valor.camelCaseExcluidos,['miPalabra']);assert.deepEqual(regla(r).valor.tecnicosExcluidos,['subnetting']);
});
