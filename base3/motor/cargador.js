/* Sirve esta carpeta por HTTP(S). La actividad se elige en la dirección:
   …/base3/?a=MODULO/ACTIVIDAD   (módulos: diw, dwec, ssii)
   y se lee de actividades/MODULO/ACTIVIDAD/. */
(async () => {
  'use strict';
  const loaderURL=new URL(document.currentScript.src);
  const root=new URL('../',loaderURL);
  const version=loaderURL.searchParams.get('v')||'20261117-base3-25';
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
    const params=new URLSearchParams(location.search);
    const wanted=(params.get('a')||'').trim().toLowerCase();
    const match=/^(diw|dwec|ssii)\/([a-z0-9][a-z0-9-]{0,59})$/.exec(wanted);
    if(!match){notFound();return;}
    const [,mod,slug]=match,folder=`actividades/${mod}/${slug}/`;
    const common=await read('contenido/config.json').then(r=>r.json());
    const settingsResponse=await fetchAsset(folder+'config.json');
    if(settingsResponse.status===404){notFound();return;}
    if(!settingsResponse.ok)throw Error('No se pudo cargar config.json de la actividad.');
    const supplied=await settingsResponse.json();
    if(!supplied||typeof supplied!=='object'||Array.isArray(supplied))throw Error('config.json de la actividad no es válido.');
    const settings={guardar:false,duracion:10,entregas:1,reiniciar:false,redes:['185.197.0.0/16','192.168.0.0/16'],restringirHorario:false,restringirIPs:false,...supplied};
    if(typeof settings.guardar!=='boolean'||typeof settings.reiniciar!=='boolean'||
      !Number.isFinite(settings.duracion)||settings.duracion<=0||settings.duracion>1440||
      !Number.isSafeInteger(settings.entregas)||settings.entregas<1||
      typeof settings.restringirHorario!=='boolean'||typeof settings.restringirIPs!=='boolean'||
      !Array.isArray(settings.redes)||!settings.redes.every(red=>typeof red==='string'&&red.includes('/')))
      throw Error('Revisa guardar, duracion, entregas, reiniciar, redes, restringirHorario y restringirIPs en el config.json de la actividad.');
    const allowSaveRecovery=settings.guardar,minutes=settings.duracion;
    // El servidor comprueba red y horario. En modo de registro no se bloquea el acceso.
    // Solo control.restringirAcceso === true aplica la negativa del servidor.
    // Si no responde, la entrega queda anotada como acceso sin comprobar.
    const server=String(common.control?.servidor||'').replace(/\/+$/,'');
    const key=new URLSearchParams(location.search).get('clave')||'';
    let unchecked=false;
    if(server){
      if(!/^https:\/\/[^/]+$/.test(server))throw Error('"control.servidor" debe ser una dirección https sin ruta.');
      let answer=null;
      try{
        const query=new URLSearchParams({a:mod+'/'+slug});if(key)query.set('clave',key);
        const response=await fetch(server+'/acceso?'+query,{cache:'no-store',signal:AbortSignal.timeout(8000)});
        if(response.ok)answer=await response.json();
      }catch{}
      if(answer&&typeof answer.ok==='boolean'){if(!answer.ok&&common.control?.restringirAcceso===true){notFound();return;}}
      else unchecked=true;
    }
    const activity=supplied,statementResponse=await fetchAsset(folder+'enunciado.html');
    if(statementResponse.status===404){notFound();return;}
    if(!statementResponse.ok)throw Error('No se pudo cargar la actividad.');
    const [statement,ownHtml,css,js,skeleton]=await Promise.all([
      statementResponse.text(),
      optional(folder+'codigo.html'),optional(folder+'codigo.css'),optional(folder+'codigo.js'),
      optional('contenido/esqueleto.html')
    ]);
    // Sin HTML de partida (no hay codigo.html o está vacío), la pestaña HTML empieza con el esqueleto común.
    const html=ownHtml.trim()?ownHtml:skeleton;
    if(!common.emailDomain||!common.format?.report||!common.format?.checksum||common.requireFullName!==false||
      !['archivo','apps-script'].includes(common.delivery?.type)||
      (common.delivery.type==='apps-script'&&typeof common.delivery.endpoint!=='string'))throw Error('Configuración incompleta o inválida.');
    if(typeof activity.title!=='string'||!activity.title.trim()||!['string','number'].includes(typeof activity.version)||!String(activity.version).trim())
      throw Error('config.json debe indicar "title" y "version".');
    const code={html,css,js};
    for(const [name,value]of Object.entries(code))
      if(value.length>10000)throw Error(`codigo.${name} supera los 10000 caracteres que admite el editor.`);
    // Identidad y claves derivadas de módulo y actividad: no hay que configurarlas a mano.
    const MOD=mod.toUpperCase(),id=MOD+'-'+slug.toUpperCase(),store='base3-'+mod+'-'+slug;
    // Nombre de la actividad: «NN-MM-Nombre» (tema y número de actividad). Se muestra con el
    // módulo delante: «DIW02-01-Nombre». Si el título ya lo lleva escrito, no se repite.
    const name=activity.title.trim().replace(new RegExp('^'+mod+'\\s*','i'),'').trim()||activity.title.trim();
    const config={...common,allowSaveRecovery,allowRestart:settings.reiniciar,maxSubmissions:settings.entregas,durationMs:Math.round(minutes*60000),module:MOD,activity:slug,id,title:MOD+name,
      filePrefix:mod+'-'+slug,version:String(activity.version).trim(),
      storage:{key:store+'-v1',legacyKey:store+'-anterior-v1',recovery:store+'-ultima-entrega-v1'},
      activityTitle:name,control:server?{servidor:server,clave:key,sinComprobar:unchecked}:null,
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
