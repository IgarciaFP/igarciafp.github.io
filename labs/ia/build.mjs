import {build} from 'esbuild';
import {readFile,writeFile} from 'node:fs/promises';
const r=await build({entryPoints:['src/prueba-ui.mjs'],bundle:true,write:false,format:'iife',platform:'browser',target:'es2020',minify:true,legalComments:'inline',loader:{'.txt':'text'}});
const html=await readFile('src/prueba.template.html','utf8');
const script=r.outputFiles[0].text.replace(/<\/script/gi,'<\\/script');
await writeFile('index.html',html.replace('/* APP_BUNDLE */',()=>script));

// Distribución ES importable desde otras páginas, sin dependencias externas de código.
await build({entryPoints:['analizador-entregas.mjs'],outfile:'analizador-entregas.browser.mjs',bundle:true,format:'esm',platform:'browser',target:'es2020',minify:true,legalComments:'inline'});
