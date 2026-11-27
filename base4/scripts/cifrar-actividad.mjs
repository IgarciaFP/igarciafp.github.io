// node base4/scripts/cifrar-actividad.mjs ORIGEN DESTINO [DOMINIO]
import {readFile,writeFile,readdir,mkdir,access} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),cipher=require('../motor/contenido-cifrado.js');
const json=text=>JSON.parse(text),asText=value=>JSON.stringify(value,null,2)+'\n';
const publicStarter=file=>/(^|\/)codigo\.(html|css)$/.test(file);
async function readFolder(folder,prefix=''){
 const result=new Map();
 for(const entry of await readdir(folder,{withFileTypes:true})){
  const name=prefix+entry.name;
  if(entry.isDirectory())for(const pair of await readFolder(path.join(folder,entry.name),name+'/'))result.set(...pair);
  else if(entry.isFile())result.set(name,await readFile(path.join(folder,entry.name)));
  else throw Error('No se admiten enlaces: '+name);
 }
 return result;
}
export async function prepararActividad(origin,destination,domain){
 const source=path.resolve(origin),target=path.resolve(destination);
 for(const [from,to]of [[source,target],[target,source]]){
  const relative=path.relative(from,to);
  if(!relative||(!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('Origen y destino deben ser carpetas separadas.');
 }
 try{await access(target);throw Error('El destino ya existe; utiliza una carpeta nueva.');}catch(error){if(error.code!=='ENOENT')throw error;}
 const files=await readFolder(source),settings=json(files.get('config.json')?.toString('utf8'));
 const enabled=settings.cifrado===undefined?false:settings.cifrado;
 if(typeof enabled!=='boolean')throw Error('En la copia de autor, cifrado debe ser true o false.');
 let output=files;
 if(enabled){
  if(!domain){const common=json(await readFile(new URL('../contenido/config.json',import.meta.url),'utf8'));domain=common.emailDomain;}
  domain=String(domain).trim().toLowerCase();
  if(!/^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(domain))throw Error('Dominio de correo inválido.');
  const bundle={format:'base4-files-v1',files:{}},publicFiles=new Map();
  for(const [name,bytes]of files){
   if(!/^[a-zA-Z0-9_./-]+$/.test(name)||!['.json','.html','.css','.js'].includes(path.extname(name)))throw Error('Archivo no admitido en la actividad cifrada: '+name);
   if(name==='contenido.cifrado.json')throw Error('La carpeta de origen contiene un paquete ya cifrado.');
   if(/^rubrica(?:-[a-z]{2})?\.json$/.test(name)||publicStarter(name)){publicFiles.set(name,bytes);continue;}
   let text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);
   if(/^idiomas\/[a-z]{2}\.json$/.test(name)){
    const locale=json(text),lang=path.basename(name,'.json');
    if(locale.rubric){
     locale.rubricFile=lang==='es'?'rubrica.json':'rubrica-'+lang+'.json';
     const rubric=asText(locale.rubric);
     if(files.has(locale.rubricFile)&&JSON.stringify(json(files.get(locale.rubricFile).toString('utf8')))!==JSON.stringify(locale.rubric))throw Error('Hay dos rúbricas diferentes para '+lang+'.');
     publicFiles.set(locale.rubricFile,Buffer.from(rubric));delete locale.rubric;text=asText(locale);
    }
   }
   bundle.files[name]=name==='config.json'?asText({...settings,cifrado:false}):text;
  }
  const manifest={};
  for(const name of ['title','version','guardar','duracion','entregas','reiniciar','restringirHorario','penalizacionSalidaMinutos','unidad','herramientas'])if(Object.hasOwn(settings,name))manifest[name]=settings[name];
  if(settings.usuariosPermitidos!==undefined){
   const users=settings.usuariosPermitidos;
   if(!Array.isArray(users)||!users.length||new Set(users).size!==users.length||users.some(user=>typeof user!=='string'||!/^[a-z0-9][a-z0-9._-]{0,63}$/.test(user)))throw Error('Lista de usuarios inválida.');
   manifest.allowedEmailHashes=await Promise.all(users.map(user=>cipher.emailHash(user+'@'+domain)));
  }
  manifest.cifrado={archivo:'contenido.cifrado.json',modo:'email-domain',dominio:domain};
  publicFiles.set('config.json',Buffer.from(asText(manifest)));
  publicFiles.set(manifest.cifrado.archivo,Buffer.from(asText(await cipher.encrypt(bundle,domain))));
  output=publicFiles;
 }
 // No se sobrescribe ni borra ninguna carpeta. Solo se escribe el paquete nuevo.
 await mkdir(path.dirname(target),{recursive:true});await mkdir(target);
 for(const [name,bytes]of output){const file=path.join(target,name);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,bytes);}
 return {cifrado:enabled,archivos:output.size,destino:target};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [, ,origin,destination,domain]=process.argv;
 if(!origin||!destination){console.error('Uso: node base4/scripts/cifrar-actividad.mjs ORIGEN DESTINO [DOMINIO]');process.exitCode=1;}
 else try{console.log(JSON.stringify(await prepararActividad(origin,destination,domain)));}catch(error){console.error(error.message);process.exitCode=1;}
}
