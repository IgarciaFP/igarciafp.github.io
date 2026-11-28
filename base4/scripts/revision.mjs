// Ejecutar antes de publicar cambios: node base4/scripts/revision.mjs
import {readFile,writeFile} from 'node:fs/promises';
const date=new Date(),iso=date.toISOString();
const stamp=new Intl.DateTimeFormat('es-ES',{timeZone:'Europe/Madrid',dateStyle:'short',timeStyle:'short'}).format(date);
const version=iso.replace(/\D/g,'').slice(0,14)+'-base4';
for(const name of ['index.html','profesor.html','revisor.html']){
 const path=new URL('../'+name,import.meta.url);let text=await readFile(path,'utf8');
 text=text.replace(/((?:href|src)="[^"]*\?v=)[^"]+/g,'$1'+version);
 if(name==='index.html')text=text.replace(/<footer class="lab-version">[\s\S]*?<\/footer>/,'<footer class="lab-version">Última revisión del HTML: <time datetime="'+iso+'">'+stamp+'</time> · Europe/Madrid</footer>');
 await writeFile(path,text);
}
const loader=new URL('../motor/cargador.js',import.meta.url);let source=await readFile(loader,'utf8');source=source.replace(/(const version=loaderURL.searchParams.get\('v'\)\|\|')[^']+/,'$1'+version);await writeFile(loader,source);
console.log(JSON.stringify({version,revisedAt:iso,madrid:stamp}));
