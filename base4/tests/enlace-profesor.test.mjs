import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../receptor/Code.gs',import.meta.url),'utf8');
const ctx=vm.createContext({});vm.runInContext(source,ctx);
const origin='https://igarciafp.github.io';
for(const suffix of ['', '/', '/?a=diw/prueba', '?a=diw/prueba','#inicio'])
 assert.equal(ctx.paginaProfesor_({url:origin+'/base4'+suffix}),origin+'/base4/profesor.html');
for(const url of [undefined, '',origin+'/base3/?a=diw/prueba',origin+'/base40/', 'https://otro.example/base4/', origin+'.otro.example/base4/'])
 assert.equal(ctx.paginaProfesor_({url}),origin+'/base3/profesor.html');
assert.match(source,/formulaValue: '=HYPERLINK\("' \+ paginaProfesor_\(datos\) \+ '#entrega='/);
console.log('OK: enlaces base4, compatibilidad base3 y destinos limitados al sitio.');
