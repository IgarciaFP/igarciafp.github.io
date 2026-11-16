/* Sirve esta carpeta por HTTP(S). Los archivos de contenido son del docente. */
(async () => {
  'use strict';
  const loaderURL=new URL(document.currentScript.src);
  const root=new URL('../',loaderURL);
  const version=loaderURL.searchParams.get('v')||'20261116-base3-1';
  const asset=path=>{const url=new URL(path,root);url.searchParams.set('v',version);return url;};
  const read=async path=>{
    const response=await fetch(asset(path),{cache:'no-cache'});
    if(!response.ok)throw Error(`No se pudo cargar ${path} (${response.status})`);
    return response;
  };
  const text=path=>read(path).then(r=>r.text());
  const script=path=>new Promise((resolve,reject)=>{
    const el=document.createElement('script');el.src=asset(path);
    el.onload=resolve;el.onerror=()=>reject(Error(`No se pudo cargar ${path}`));
    document.body.append(el);
  });
  try {
    const [config,statement,html,css,js]=await Promise.all([
      read('contenido/config.json').then(r=>r.json()),
      text('contenido/enunciado.html'),
      text('contenido/codigo.html'),
      text('contenido/codigo.css'),
      text('contenido/codigo.js')
    ]);
    if(!config.id||typeof config.title!=='string'||!config.title.trim()||!config.emailDomain||
      !config.storage?.key||!config.storage?.legacyKey||!config.storage?.recovery||
      !config.format?.save||!config.format?.report||!config.format?.checksum||
      !config.filePrefix||!config.version||config.requireFullName!==false||
      !['codigo','vacio'].includes(config.editor?.inicio)||
      config.delivery?.type!=='apps-script'||typeof config.delivery.endpoint!=='string')throw Error('Configuración incompleta o inválida.');
    const code={html,css,js};
    for(const [name,value]of Object.entries(code))
      if(value.length>10000)throw Error(`contenido/codigo.${name} supera los 10000 caracteres que admite el editor.`);
    document.getElementById('activity-text').innerHTML=statement;
    const seen=new Set();
    for(const el of document.querySelectorAll('[id]')){
      if(seen.has(el.id))throw Error(`Identificador duplicado: ${el.id}`);
      seen.add(el.id);
    }
    document.getElementById('student').placeholder='nombre@'+config.emailDomain;
    window.Lab={config,code,ready:false};
    // Seguridad, entrega y estilos generales son los de la plantilla común /base/.
    await script('/base/motor/seguridad.js');
    await script('/base/motor/entregas.js');
    await script('motor/laboratorio.js');
    if(!window.Lab.ready)throw Error('No se pudo completar el inicio. Recarga la página con Ctrl + F5.');
  } catch(error) {
    document.getElementById('setup-stage').hidden=true;
    document.getElementById('cuaderno').hidden=true;
    document.getElementById('guard-boot').hidden=false;
    document.getElementById('guard-boot-detail').textContent='No se pudo iniciar el laboratorio. '+error.message;
    console.error(error);
  }
})();
