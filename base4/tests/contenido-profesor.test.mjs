import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const files=new Map(),writes=[];let authorized=true;
const folder='base4/actividades/diw/prueba/';
files.set(folder+'config.json',{content:JSON.stringify({apartados:[{id:'uno'}]}),sha:'c'.repeat(40)});
files.set(folder+'enunciado.html',{content:'<p>Anterior</p>',sha:'a'.repeat(40)});
const ctx=vm.createContext({Date,PropertiesService:{getScriptProperties:()=>({getProperty:()=> 'server-only-secret'})},LockService:{getScriptLock:()=>({tryLock:()=>true,hasLock:()=>true,releaseLock(){}})},
 Utilities:{Charset:{UTF_8:'utf8'},base64Decode:s=>Buffer.from(s,'base64'),newBlob:b=>({getDataAsString:()=>b.toString('utf8')}),base64Encode:s=>Buffer.from(s).toString('base64')},
 sesionProfesor_:()=>{if(!authorized)throw Error('SESSION');},
 UrlFetchApp:{fetch:(url,options)=>{assert.match(url,/^https:\/\/api.github.com\/repos\/IgarciaFP\/igarciafp.github.io\/contents\/base4\/actividades\//);const path=url.split('/contents/')[1].split('?')[0];let status=200,data;
 if(options.method==='put'){const body=JSON.parse(options.payload);assert.equal(body.branch,'main');writes.push({path,body});files.set(path,{sha:'b'.repeat(40),content:Buffer.from(body.content,'base64').toString()});data={content:{sha:'b'.repeat(40)},commit:{html_url:'https://github.com/IgarciaFP/igarciafp.github.io/commit/'+'d'.repeat(40)}};}
 else{const file=files.get(path);if(!file){status=404;data={};}else data={type:'file',encoding:'base64',size:file.content.length,sha:file.sha,content:Buffer.from(file.content).toString('base64')};}
 return {getResponseCode:()=>status,getContentText:()=>JSON.stringify(data)};}}
});
vm.runInContext(readFileSync(new URL('../receptor/Contenido.gs',import.meta.url),'utf8'),ctx);
const get={action:'content-get',activity:'diw/prueba',kind:'statement',token:'session'};
assert.equal(ctx.gestionarContenido_(get).content,'<p>Anterior</p>');
authorized=false;assert.equal(ctx.gestionarContenido_(get).code,'SESSION');authorized=true;
for(const activity of ['../base3/prueba','diw/../prueba','dwec/a/b'])assert.equal(ctx.gestionarContenido_({...get,activity}).code,'CONTENT_PATH');
assert.equal(ctx.gestionarContenido_({...get,section:'inexistente'}).code,'CONTENT_PATH');
assert.equal(ctx.gestionarContenido_({...get,action:'content-set',sha:'old',content:'Cambio'}).code,'CONTENT_CONFLICT');assert.equal(writes.length,0);
const changed=ctx.gestionarContenido_({...get,action:'content-set',sha:'a'.repeat(40),content:'<p>Nueva instrucción</p>'});assert.equal(changed.ok,true);assert.equal(writes.length,1);assert.equal(changed.content,'<p>Nueva instrucción</p>');
const rubric={titulo:'Prueba',criterios:[{titulo:'Funciona',puntos:10,niveles:[{puntos:10,descripcion:'Cumple'},{puntos:0,descripcion:'No cumple'}]}]};
assert.equal(ctx.gestionarContenido_({...get,kind:'rubric',action:'content-set',sha:'',content:JSON.stringify(rubric)}).ok,true);
assert.ok(JSON.parse(files.get(folder+'rubrica.json').content).version);
rubric.criterios[0].niveles.pop();assert.throws(()=>ctx.validarRubricaEdicion_(rubric),/RUBRIC_INVALID/);
assert.equal(ctx.gestionarContenido_({...get,kind:'rubric',section:'uno'}).code,'CONTENT_PATH');
assert.ok(writes.every(w=>!JSON.stringify(w.body).includes('server-only-secret')));
console.log('OK: sesión, rutas base4, apartados existentes, conflicto SHA, edición de enunciado, rúbrica válida/versionada y secreto solo servidor.');
