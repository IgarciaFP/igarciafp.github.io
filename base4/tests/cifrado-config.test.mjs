// node --test base4/tests/cifrado-config.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
import {prepararActividad} from '../scripts/cifrar-actividad.mjs';
const require=createRequire(import.meta.url),cipher=require('../motor/contenido-cifrado.js');
const readJSON=async file=>JSON.parse(await readFile(file,'utf8'));
async function fixture(cifrado){
 const root=await mkdtemp(path.join(os.tmpdir(),'base4-cifrado-')),source=path.join(root,'autor'),target=path.join(root,'publicable');
 await mkdir(source);
 const settings={title:'Actividad de prueba',version:'1',duracion:10,...(cifrado===undefined?{}:{cifrado})};
 for(const [file,text]of Object.entries({'config.json':JSON.stringify(settings),'enunciado.html':'<p>Instrucciones de prueba</p>','codigo.html':'<h1>Inicio</h1>','codigo.css':'h1 {color: blue}','codigo.js':'console.log("Inicio");','rubrica.json':'{"criterios":[]}'}))await writeFile(path.join(source,file),text);
 return {source,target,settings};
}
for(const value of [undefined,false])test('La actividad sigue en claro con cifrado '+String(value),async()=>{
 const {source,target}=await fixture(value);
 assert.equal((await prepararActividad(source,target)).cifrado,false);
 for(const file of await readdir(source))assert.deepEqual(await readFile(path.join(target,file)),await readFile(path.join(source,file)));
 assert.ok(!(await readdir(target)).includes('contenido.cifrado.json'));
});
test('Cifra solo el paquete nuevo y conserva la rúbrica y el HTML/CSS públicos',async()=>{
 const {source,target,settings}=await fixture(true);
 settings.usuariosPermitidos=['alumno'];settings.penalizacionSalidaMinutos=10;await writeFile(path.join(source,'config.json'),JSON.stringify(settings));
 await mkdir(path.join(source,'idiomas'));
 await writeFile(path.join(source,'idiomas/en.json'),JSON.stringify({title:'Activity',rubric:{criterios:[]},sections:[]}));
 assert.equal((await prepararActividad(source,target,'g.educaand.es')).cifrado,true);
 assert.deepEqual((await readdir(target)).sort(),['codigo.css','codigo.html','config.json','contenido.cifrado.json','rubrica-en.json','rubrica.json']);
 const manifest=await readJSON(path.join(target,'config.json'));
 assert.equal(manifest.penalizacionSalidaMinutos,10);
 assert.ok(!manifest.usuariosPermitidos);assert.ok(!manifest.apartados);
 assert.equal(await cipher.allowedEmail('ALUMNO@G.EDUCAAND.ES',manifest),true);
 assert.equal(await cipher.allowedEmail('otro@g.educaand.es',manifest),false);
 const envelope=await readJSON(path.join(target,manifest.cifrado.archivo));
 const bundle=await cipher.decrypt(envelope,'g.educaand.es');
 assert.equal(bundle.files['enunciado.html'],await readFile(path.join(source,'enunciado.html'),'utf8'));
 assert.ok(bundle.files['codigo.js']);assert.ok(!bundle.files['codigo.html']);assert.ok(!bundle.files['codigo.css']);assert.ok(!bundle.files['rubrica.json']);
 assert.equal(JSON.parse(bundle.files['idiomas/en.json']).rubricFile,'rubrica-en.json');
 assert.equal((await readJSON(path.join(source,'config.json'))).cifrado,true);
 await assert.rejects(cipher.decrypt(envelope,'otro.es'));
 const altered={...envelope,ciphertext:(envelope.ciphertext[0]==='A'?'B':'A')+envelope.ciphertext.slice(1)};
 await assert.rejects(cipher.decrypt(altered,'g.educaand.es'));
 await assert.rejects(prepararActividad(source,target,'g.educaand.es'),/ya existe/);
 await assert.rejects(prepararActividad(source,path.join(source,'salida'),'g.educaand.es'),/separadas/);
 await assert.rejects(prepararActividad(source,path.dirname(source),'g.educaand.es'),/separadas/);
});
test('Sin lista opcional se acepta cualquier correo del dominio',async()=>{
 const {source,target}=await fixture(true);await prepararActividad(source,target,'g.educaand.es');
 const manifest=await readJSON(path.join(target,'config.json'));
 assert.equal(await cipher.allowedEmail('otro@g.educaand.es',manifest),true);
 assert.equal(await cipher.allowedEmail('otro@gmail.com',manifest),false);
});
