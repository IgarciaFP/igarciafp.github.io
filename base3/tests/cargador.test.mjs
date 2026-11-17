import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../motor/cargador.js',import.meta.url),'utf8');
async function run(files,failures={},overrides={}){
 const calls={},requests=[],els={},window={};
 const settings={title:'Prueba',version:'1',...overrides,...(files===undefined?{}:{archivos:files})};
 const common={emailDomain:'g.educaand.es',requireFullName:false,delivery:{type:'archivo'},format:{report:'SSII3G.',checksum:'SSII3-'}};
 const get=id=>els[id]||={hidden:false,textContent:''};
 const data={'contenido/config.json':common,'actividades/diw/prueba/config.json':settings,'actividades/diw/prueba/enunciado.html':'Texto','contenido/esqueleto.html':'<html></html>','actividades/diw/prueba/codigo.html':'<h1>Prueba</h1>','actividades/diw/prueba/codigo.css':'h1{color:white}'};
 const document={currentScript:{src:'https://example.com/base3/motor/cargador.js'},getElementById:get,querySelectorAll:()=>[],createElement:()=>({}),body:{append:el=>{window.Lab.ready=true;el.onload();}}};
 await vm.runInNewContext(source,{window,document,URL,URLSearchParams,AbortSignal,location:{search:'?a=diw/prueba'},setTimeout:fn=>fn(),console:{error(){}},
  fetch:async (url,options)=>{
   requests.push({url:String(url),options});
   const path=new URL(url).pathname.replace('/base3/','');calls[path]=(calls[path]||0)+1;
   const failuresForPath=failures[path]||[];
   const status=failuresForPath[calls[path]-1]??(path in data?200:404);
   return {status,ok:status===200,json:async()=>data[path],text:async()=>String(data[path]||'')};
  }});
 return {window,calls,requests,error:get('guard-boot-detail').textContent};
}
let result=await run(['html','css'],{'actividades/diw/prueba/codigo.js':[503,503,503]});
assert.equal(result.window.Lab.ready,true);
assert.equal(result.calls['actividades/diw/prueba/codigo.js'],undefined);
assert.equal(result.window.Lab.code.js,'');
result=await run(['html','css'],{'actividades/diw/prueba/codigo.css':[503,200]});
assert.equal(result.window.Lab.ready,true);assert.equal(result.calls['actividades/diw/prueba/codigo.css'],2);
result=await run(['css'],{'actividades/diw/prueba/codigo.css':[503,503,503]});
assert.match(result.error,/503/);assert.equal(result.calls['actividades/diw/prueba/codigo.css'],3);
result=await run(['html'],{'actividades/diw/prueba/codigo.html':[404]});assert.match(result.error,/404/);
result=await run([]);assert.equal(result.window.Lab.code.html,'<html></html>');assert.equal(result.calls['actividades/diw/prueba/codigo.css'],undefined);
result=await run(undefined);assert.equal(result.window.Lab.ready,true);assert.equal(result.window.Lab.code.js,'');
result=await run(['css','css']);assert.match(result.error,/sin duplicados/);
console.log('OK: archivos declarados, omisión sin petición, reintentos 503, fallos reales y compatibilidad 404.');

const first=await run(['html','css']),second=await run(['html','css']);
for(const path of ['contenido/config.json','actividades/diw/prueba/config.json']){
 const a=first.requests.find(r=>new URL(r.url).pathname==='/base3/'+path);
 const b=second.requests.find(r=>new URL(r.url).pathname==='/base3/'+path);
 assert.equal(a.options.cache,'no-store');
 assert.ok(new URL(a.url).searchParams.get('_config'));
 assert.notEqual(a.url,b.url,'Cada carga debe solicitar una configuración nueva');
}
assert.equal(first.requests.find(r=>r.url.includes('codigo.css')).options.cache,'no-cache');
console.log('OK: configuración sin caché y URL nueva en cada carga.');

result=await run(['html','css']);
assert.equal(result.window.Lab.config.durationMs,15*60000);
assert.equal(result.window.Lab.config.maxSubmissions,0);
assert.equal(result.window.Lab.config.allowSaveRecovery,false);
assert.equal(result.window.Lab.config.allowRestart,false);
result=await run(['html','css'],{},{entregas:-1});
assert.match(result.error,/Revisa guardar/);
result=await run(['html','css'],{},{entregas:0,duracion:3});
assert.equal(result.window.Lab.ready,true);
assert.equal(result.window.Lab.config.durationMs,180000);
