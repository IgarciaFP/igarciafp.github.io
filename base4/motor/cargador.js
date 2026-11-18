/* Sirve esta carpeta por HTTP(S). La actividad se elige en la dirección:
   …/base4/?a=MODULO/ACTIVIDAD   (módulos: diw, dwec, ssii)
   y se lee de actividades/MODULO/ACTIVIDAD/. */
(async () => {
  'use strict';
  const loaderURL=new URL(document.currentScript.src);
  const root=new URL('../',loaderURL);
  const version=loaderURL.searchParams.get('v')||'20261118190309-base4';
  const asset=path=>{const url=new URL(path,root);url.searchParams.set('v',version);return url;};
  const fetchAsset=async path=>{
    // La configuración cambia sin necesidad de publicar otra versión del HTML.
    const fresh=path.endsWith('/config.json');
    let response,error;
    for(let attempt=0;attempt<3;attempt++){
      try{
        const url=asset(path);
        if(fresh)url.searchParams.set('_config',Date.now()+'-'+Math.random().toString(36).slice(2));
        response=await fetch(url,{cache:fresh?'no-store':attempt?'reload':'no-cache',signal:AbortSignal.timeout(15000)});
        if(![408,429,500,502,503,504].includes(response.status))return response;
        error=null;
      }catch(cause){error=cause;}
      if(attempt<2)await new Promise(resolve=>setTimeout(resolve,250*(attempt+1)));
    }
    if(error)throw error;
    return response;
  };
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
    // Sin respuesta positiva del servidor no se carga el contenido de la actividad.
    const server=String(common.control?.servidor||'').replace(/\/+$/,'');
    const key=new URLSearchParams(location.search).get('clave')||'';
    let answer=null;
    if(!/^https:\/\/[^/]+\/base4$/.test(server)){
      stop('Acceso bloqueado','No se ha configurado correctamente el control de red de base4.');return;
    }
    try{
      const response=await fetch(server+'/acceso?'+new URLSearchParams({a:mod+'/'+slug}),{cache:'no-store',signal:AbortSignal.timeout(8000)});
      if(response.ok)answer=await response.json();
    }catch{}
    if(answer?.ok!==true||answer.policy!=='base4-prefix2-v1'){
      stop('Acceso bloqueado','Solo se permite acceder desde las redes autorizadas de base4. Si no se puede verificar la IP, el acceso permanece bloqueado.');return;
    }
    const settingsResponse=await fetchAsset(folder+'config.json');
    if(settingsResponse.status===404){notFound();return;}
    if(!settingsResponse.ok)throw Error('No se pudo cargar config.json de la actividad.');
    const supplied=await settingsResponse.json();
    if(!supplied||typeof supplied!=='object'||Array.isArray(supplied))throw Error('config.json de la actividad no es válido.');
    const settings={guardar:false,duracion:15,entregas:1,reiniciar:false,restringirHorario:false,...supplied};
    if(typeof settings.guardar!=='boolean'||typeof settings.reiniciar!=='boolean'||
      !Number.isFinite(settings.duracion)||settings.duracion<=0||settings.duracion>1440||
      !Number.isSafeInteger(settings.entregas)||settings.entregas<0||
      typeof settings.restringirHorario!=='boolean')
      throw Error('Revisa guardar, duracion, entregas, reiniciar y restringirHorario en el config.json de la actividad.');
    await script('motor/apartados.js');
    await script('motor/herramientas.js');
    const rubricText=await optional(folder+'rubrica.json');
    const tools=window.LabTools.settings(settings,mod,slug,rubricText?JSON.parse(rubricText):null);
    const allowSaveRecovery=settings.guardar,minutes=settings.duracion;
    const activity=supplied;
    const sections=await window.LabSections.load(activity,folder,read,optional);
    const sectionMode=activity.apartados!==undefined||sections[0].type!=='webcode';
    const code=sections[0].code||{html:'',css:'',js:'',txt:''};
    const statement=sections[0].statement;
    if(!common.emailDomain||!common.format?.report||!common.format?.checksum||common.requireFullName!==false||
      !['archivo','apps-script'].includes(common.delivery?.type)||
      (common.delivery.type==='apps-script'&&typeof common.delivery.endpoint!=='string'))throw Error('Configuración incompleta o inválida.');
    if(typeof activity.title!=='string'||!activity.title.trim()||!['string','number'].includes(typeof activity.version)||!String(activity.version).trim())
      throw Error('config.json debe indicar "title" y "version".');
    for(const [name,value]of Object.entries(code))
      if(value.length>10000)throw Error(`codigo.${name} supera los 10000 caracteres que admite el editor.`);
    // Identidad y claves derivadas de módulo y actividad: no hay que configurarlas a mano.
    const MOD=mod.toUpperCase(),id=MOD+'-'+slug.toUpperCase(),store=(sectionMode?'base4-sections-':'base4-')+mod+'-'+slug;
    // Nombre de la actividad: «NN-MM-Nombre» (tema y número de actividad). Se muestra con el
    // módulo delante: «DIW02-01-Nombre». Si el título ya lo lleva escrito, no se repite.
    const name=activity.title.trim().replace(new RegExp('^'+mod+'\\s*','i'),'').trim()||activity.title.trim();
    const config={...common,tools,allowSaveRecovery,allowRestart:settings.reiniciar,maxSubmissions:settings.entregas,durationMs:Math.round(minutes*60000),module:MOD,activity:slug,id,title:MOD+name,
      filePrefix:mod+'-'+slug,version:String(activity.version).trim(),
      storage:{key:store+'-v1',legacyKey:store+'-anterior-v1',recovery:store+'-ultima-entrega-v1'},
      activityTitle:name,control:{servidor:server,clave:key},
      format:{...common.format,save:id+'-SAVE'}};
    document.getElementById('activity-text').innerHTML=statement;
    const seen=new Set();
    for(const el of document.querySelectorAll('[id]')){
      if(seen.has(el.id))throw Error(`Identificador duplicado: ${el.id}`);
      seen.add(el.id);
    }
    document.getElementById('student').placeholder='nombre@'+config.emailDomain;
    window.Lab={config,code,sections,sectionMode,ready:false};
    // Seguridad, entrega y estilos generales son los de la plantilla común /base/.
    await script('/base/motor/seguridad.js');
    await script('/base/motor/entregas.js');
    if(sectionMode)await script('motor/apartados-ui.js');
    await script('motor/portapapeles.js');
    await script('motor/laboratorio.js');
    if(!window.Lab.ready)throw Error('No se pudo completar el inicio. Recarga la página con Ctrl + F5.');
  } catch(error) {
    stop('Error','No se pudo iniciar el laboratorio. '+error.message);
    console.error(error);
  }
})();


