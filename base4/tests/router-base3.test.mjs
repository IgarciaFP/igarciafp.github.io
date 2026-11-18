import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
const current=readFileSync(new URL('../../base3/servidor/worker.js',import.meta.url),'utf8').replace(/\r\n/g,'\n');
const importLine="import controlBase4 from '../../base4/servidor/worker.js';\n";
const branch="    if(/^\\/base4(?:\\/|$)/.test(new URL(request.url).pathname))return controlBase4.fetch(request,env);\n";
const original=current.replace(importLine,'').replace(branch,'');
assert.equal(createHash('sha256').update(original).digest('hex'),'45bd86dcc2a837057483769c6a7e25bd10a7137e7b69d7ab6111d4075111fc30','El resto de base3 debe permanecer idéntico a la versión anterior');
const uri=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const policy=JSON.parse(readFileSync(new URL('../contenido/redes.json',import.meta.url),'utf8'));
const b4=readFileSync(new URL('../servidor/worker.js',import.meta.url),'utf8').replace("import politicaRed from '../contenido/redes.json';",'const politicaRed='+JSON.stringify(policy)+';');
const after=(await import(uri(current.replace(importLine,'import controlBase4 from '+JSON.stringify(uri(b4))+';\n')))).default;
const before=(await import(uri(original))).default;
const env={SECRETO_SELLO:'test-only-secret',CLAVE_PROFESOR:'test-only-key'};
for(const [url,method,body]of [['/acceso?a=diw/prueba','GET'],['/acceso?a=diw/prueba&clave=test-only-key','GET'],['/acceso?a=invalida','GET'],['/sello','POST',{}],['/verificar','POST',{sello:{}}],['/base40/acceso','GET'],['/diagnostico','GET'],['/acceso','OPTIONS']]){
 const init={method,headers:{Origin:'https://igarciafp.github.io','CF-Connecting-IP':'88.16.1.1'},...(body?{body:JSON.stringify(body)}:{})};
 const left=await before.fetch(new Request('https://control.example'+url,init),env),right=await after.fetch(new Request('https://control.example'+url,init),env);
 assert.equal(right.status,left.status,url);assert.equal(await right.text(),await left.text(),url);assert.deepEqual([...right.headers],[...left.headers]);
}
for(const [ip,status]of [['88.26.2.3',200],['45.86.2.3',200],['185.197.2.3',200],['88.16.1.1',403]]){
 const r=await after.fetch(new Request('https://control.example/base4/acceso?a=diw/prueba&clave=test-only-key',{headers:{'CF-Connecting-IP':ip}}),env);assert.equal(r.status,status);assert.equal((await r.json()).policy,'base4-prefix2-v1');
}
console.log('OK: código y respuestas legacy de base3 conservados; solo /base4 usa la política nueva.');
