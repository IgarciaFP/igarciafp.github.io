import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const policy=JSON.parse(readFileSync(new URL('../contenido/redes.json',import.meta.url),'utf8'));
const source=readFileSync(new URL('../servidor/worker.js',import.meta.url),'utf8').replace("import politicaRed from '../contenido/redes.json';",'const politicaRed='+JSON.stringify(policy)+';');
const {default:worker,enRed}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
for(const ip of ['88.26.0.0','88.26.255.255','45.86.123.45','185.197.255.1','::ffff:88.26.2.3'])assert.equal(enRed(ip),true,ip);
for(const ip of ['88.16.2.3','88.27.0.1','45.85.0.1','185.198.0.1','88.260.1.1','88.26.256.1','2001:db8::1','',null])assert.equal(enRed(ip),false,String(ip));
assert.equal(enRed('88.26.99.11',['88.26.0.0/32']),true);assert.equal(enRed('88.27.0.1',['88.26.0.0/0']),false);
const env={SECRETO_SELLO:'test-secret-only',CLAVE_PROFESOR:'test-professor'};
const request=(route,ip,body)=>new Request('https://control.example/base4/'+route,{method:body?'POST':'GET',headers:{Origin:'https://igarciafp.github.io','CF-Connecting-IP':ip},...(body?{body:JSON.stringify(body)}:{})});
for(const ip of ['88.26.12.1','45.86.255.9','185.197.0.1']){
 const response=await worker.fetch(request('acceso?a=diw/prueba',ip),env);assert.equal(response.status,200);assert.equal((await response.json()).ok,true);
}
const denied=await worker.fetch(request('acceso?a=diw/prueba&clave=test-professor','88.16.1.1'),env);assert.equal(denied.status,403);
const body={a:'diw/prueba',email:'test@g.educaand.es',huella:'a'.repeat(64),clave:'test-professor'};
assert.equal((await worker.fetch(request('sello','1.2.3.4',body),env)).status,403);
const signed=await (await worker.fetch(request('sello','45.86.1.2',body),env)).json();assert.equal(signed.enRed,true);assert.match(signed.firma,/^[a-f0-9]{64}$/);
assert.equal((await (await worker.fetch(request('verificar','1.2.3.4',{sello:signed}),env)).json()).valido,true);
signed.ip='88.16.1.1';assert.equal((await (await worker.fetch(request('verificar','1.2.3.4',{sello:signed}),env)).json()).valido,false);
assert.equal((await worker.fetch(request('acceso?a=diw/prueba','88.26.1.1'),{})).status,500);
console.log('OK: prefixes, ignored masks, denied IPv6/unknown IPs, no teacher bypass, mandatory stamp and fail-closed configuration.');
