/* Sirve esta carpeta por HTTP(S). Los archivos de contenido son del docente. */
(async () => {
  'use strict';
  const loaderURL=new URL(document.currentScript.src);
  const root=new URL('../',loaderURL);
  const version=loaderURL.searchParams.get('v')||'20261021-3';
  const asset=path=>{const url=new URL(path,root);url.searchParams.set('v',version);return url;};
  const read=async path=>{
    const response=await fetch(asset(path),{cache:'no-cache'});
    if(!response.ok)throw Error(`No se pudo cargar ${path} (${response.status})`);
    return response;
  };
  const script=path=>new Promise((resolve,reject)=>{
    const el=document.createElement('script');el.src=asset(path);
    el.onload=resolve;el.onerror=()=>reject(Error(`No se pudo cargar ${path}`));
    document.body.append(el);
  });
  try {
    const [config,activity,html]=await Promise.all([
      read('contenido/config.json').then(r=>r.json()),
      read('contenido/actividad.json').then(r=>r.json()),
      read('contenido/actividad.html').then(r=>r.text())
    ]);
    if(!config.id||!config.title?.[0]||!config.title?.[1]||!config.emailDomain||
      !config.storage?.key||!config.storage?.legacyKey||!config.storage?.recovery||
      !config.format?.save||!config.format?.report||!config.format?.checksum||
      !config.filePrefix||!Array.isArray(config.rules)||!config.version||
      !['apps-script','download'].includes(config.delivery?.type)||typeof config.delivery.endpoint!=='string')throw Error('Configuración incompleta o inválida.');
    if(!Array.isArray(activity.fields)||!activity.fields.length||!Array.isArray(activity.sections)||!activity.sections.length)
      throw Error('La actividad debe definir campos y bloques.');
    document.getElementById('cuaderno').innerHTML=html;
    const seen=new Set();
    for(const el of document.querySelectorAll('[id]')){
      if(seen.has(el.id))throw Error(`Identificador duplicado: ${el.id}`);
      seen.add(el.id);
    }
    const sectionIds=new Set(activity.sections.map(s=>s.id));
    if(sectionIds.size!==activity.sections.length)throw Error('Hay bloques duplicados.');
    const fieldIds=new Set();
    for(const f of activity.fields){
      if(fieldIds.has(f.id)||!sectionIds.has(f.section)||!document.getElementById(f.id)||
        !document.getElementById('feedback-'+f.id)||!['open','number','choice','digits','groups'].includes(f.kind))
        throw Error(`Campo inválido o sin HTML: ${f.id}`);
      fieldIds.add(f.id);
    }
    for(const s of activity.sections)if(!document.getElementById(s.id)||!document.getElementById('status-'+s.id))
      throw Error(`Bloque sin HTML: ${s.id}`);
    document.getElementById('progress').max=activity.sections.length;
    document.getElementById('student').placeholder='nombre@'+config.emailDomain;
    window.Lab={config,activity};
    await script('contenido/variantes.js');
    if(!window.Lab.variants)throw Error('Falta el adaptador de variantes.');
    await script('motor/seguridad.js');
    await script('motor/entregas.js');
    await script('motor/laboratorio.js');
    if(document.querySelector('[data-language]').disabled)throw Error('No se pudo completar el inicio. Recarga la página con Ctrl + F5; tus respuestas guardadas se conservan.');
  } catch(error) {
    document.getElementById('language-stage').hidden=true;
    document.getElementById('guard-boot').hidden=false;
    document.getElementById('guard-boot-detail').textContent='No se pudo iniciar el laboratorio. '+error.message;
    console.error(error);
  }
})();
