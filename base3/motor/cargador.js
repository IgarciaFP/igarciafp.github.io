/* Sirve esta carpeta por HTTP(S). La actividad se elige en la dirección:
   …/base3/?a=MODULO/ACTIVIDAD   (módulos: diw, dwec, ssii)
   y se lee de actividades/MODULO/ACTIVIDAD/. */
(async () => {
  'use strict';
  const loaderURL=new URL(document.currentScript.src);
  const root=new URL('../',loaderURL);
  const version=loaderURL.searchParams.get('v')||'20261116-base3-9';
  const asset=path=>{const url=new URL(path,root);url.searchParams.set('v',version);return url;};
  const fetchAsset=path=>fetch(asset(path),{cache:'no-cache'});
  const read=async path=>{
    const response=await fetchAsset(path);
    if(!response.ok)throw Error(`No se pudo cargar ${path} (${response.status})`);
    return response;
  };
  // Archivo opcional: si no existe, la pestaña empieza vacía.
  const optional=async path=>{
    const response=await fetchAsset(path);
    if(response.status===404)return '';
    if(!response.ok)throw Error(`No se pudo cargar ${path} (${response.status})`);
    return response.text();
  };
  const script=path=>new Promise((resolve,reject)=>{
    const el=document.createElement('script');el.src=asset(path);
    el.onload=resolve;el.onerror=()=>reject(Error(`No se pudo cargar ${path}`));
    document.body.append(el);
  });
  const stop=(title,detail)=>{
    document.getElementById('setup-stage').hidden=true;
    document.getElementById('cuaderno').hidden=true;
    document.getElementById('guard-boot').hidden=false;
    document.getElementById('guard-boot-title').textContent=title;
    document.getElementById('guard-boot-detail').textContent=detail;
  };
  const notFound=()=>stop('No se encuentra la actividad.','Comprueba que la dirección es exactamente la que te ha dado el profesor.');
  try {
    const wanted=(new URLSearchParams(location.search).get('a')||'').trim().toLowerCase();
    const match=/^(diw|dwec|ssii)\/([a-z0-9][a-z0-9-]{0,59})$/.exec(wanted);
    if(!match){notFound();return;}
    const [,mod,slug]=match,folder=`actividades/${mod}/${slug}/`;
    const [activityResponse,statementResponse]=await Promise.all([fetchAsset(folder+'actividad.json'),fetchAsset(folder+'enunciado.html')]);
    if(activityResponse.status===404||statementResponse.status===404){notFound();return;}
    if(!activityResponse.ok||!statementResponse.ok)throw Error('No se pudo cargar la actividad.');
    const [common,activity,statement,html,css,js]=await Promise.all([
      read('contenido/config.json').then(r=>r.json()),
      activityResponse.json(),statementResponse.text(),
      optional(folder+'codigo.html'),optional(folder+'codigo.css'),optional(folder+'codigo.js')
    ]);
    if(!common.emailDomain||!common.format?.report||!common.format?.checksum||common.requireFullName!==false||
      !['archivo','apps-script'].includes(common.delivery?.type)||
      (common.delivery.type==='apps-script'&&typeof common.delivery.endpoint!=='string'))throw Error('Configuración incompleta o inválida.');
    if(typeof activity.title!=='string'||!activity.title.trim()||!['string','number'].includes(typeof activity.version)||!String(activity.version).trim())
      throw Error('actividad.json debe indicar "title" y "version".');
    const code={html,css,js};
    for(const [name,value]of Object.entries(code))
      if(value.length>10000)throw Error(`codigo.${name} supera los 10000 caracteres que admite el editor.`);
    // Identidad y claves derivadas de módulo y actividad: no hay que configurarlas a mano.
    const MOD=mod.toUpperCase(),id=MOD+'-'+slug.toUpperCase(),key='base3-'+mod+'-'+slug;
    const config={...common,module:MOD,activity:slug,id,title:MOD+' · '+activity.title.trim(),
      filePrefix:mod+'-'+slug,version:String(activity.version).trim(),
      storage:{key:key+'-v1',legacyKey:key+'-anterior-v1',recovery:key+'-ultima-entrega-v1'},
      format:{...common.format,save:id+'-SAVE'}};
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
    stop('Error','No se pudo iniciar el laboratorio. '+error.message);
    console.error(error);
  }
})();
