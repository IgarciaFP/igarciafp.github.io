/** Edición acotada a enunciados y rúbricas de base4. La sesión se valida en gestionarNota. */
function rutaContenido_(pedido) {
  if (!/^(diw|dwec|ssii)\/[a-z0-9][a-z0-9-]{0,59}$/.test(pedido.activity || '')) throw Error('CONTENT_PATH');
  if (!['statement','rubric'].includes(pedido.kind)) throw Error('CONTENT_PATH');
  const section=pedido.section || '';
  if (section && !/^[a-z0-9][a-z0-9-]{0,39}$/.test(section)) throw Error('CONTENT_PATH');
  if (pedido.kind==='rubric' && section) throw Error('CONTENT_PATH');
  return 'base4/actividades/'+pedido.activity+'/'+(section?'apartados/'+section+'/':'')+(pedido.kind==='rubric'?'rubrica.json':'enunciado.html');
}
function githubContenido_(path, method, payload) {
  const token=PropertiesService.getScriptProperties().getProperty('BASE4_GITHUB_TOKEN');
  if (!token) throw Error('GITHUB_CONFIG');
  const url='https://api.github.com/repos/IgarciaFP/igarciafp.github.io/contents/'+path;
  const options={method:method||'get',muteHttpExceptions:true,followRedirects:false,headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2026-03-10'}};
  if(payload){options.contentType='application/json';options.payload=JSON.stringify(payload);}
  const response=UrlFetchApp.fetch(url+(method==='put'?'':'?ref=main'),options),status=response.getResponseCode();
  if(status===404&&!payload)return null;
  if(status===409||status===422)throw Error('CONTENT_CONFLICT');
  if(status===401||status===403)throw Error('GITHUB_ACCESS');
  if(status<200||status>=300)throw Error('GITHUB_NETWORK');
  return JSON.parse(response.getContentText());
}
function validarRubricaEdicion_(value) {
  const text=v=>typeof v==='string'&&v.trim()&&v.length<=2000;
  if(!value||!text(value.titulo)||!Array.isArray(value.criterios)||!value.criterios.length||value.criterios.length>30)throw Error('RUBRIC_INVALID');
  for(const c of value.criterios){
    if(!text(c.titulo)||!Number.isFinite(c.puntos)||c.puntos<=0||c.puntos>100||!Array.isArray(c.niveles)||!c.niveles.length||c.niveles.length>10)throw Error('RUBRIC_INVALID');
    if(c.niveles.some(n=>!Number.isFinite(n.puntos)||n.puntos<0||n.puntos>c.puntos||!text(n.descripcion)))throw Error('RUBRIC_INVALID');
    if(new Set(c.niveles.map(n=>n.puntos)).size!==c.niveles.length||!c.niveles.some(n=>n.puntos===0)||!c.niveles.some(n=>n.puntos===c.puntos))throw Error('RUBRIC_INVALID');
  }
}
function gestionarContenido_(pedido) {
  let lock;
  try {
    // Defensa adicional: esta función no se puede invocar sin sesión desde google.script.run.
    sesionProfesor_(pedido.token);
    const path=rutaContenido_(pedido);
    const configFile=githubContenido_('base4/actividades/'+pedido.activity+'/config.json');
    if(!configFile||configFile.type!=='file')throw Error('CONTENT_PATH');
    const config=JSON.parse(Utilities.newBlob(Utilities.base64Decode(configFile.content)).getDataAsString('UTF-8'));
    if(pedido.section && !config.apartados?.some(s=>s.id===pedido.section))throw Error('CONTENT_PATH');
    if(pedido.action==='content-set'){lock=LockService.getScriptLock();if(!lock.tryLock(25000))throw Error('BUSY');}
    const file=githubContenido_(path);
    if(file&&(file.type!=='file'||file.encoding!=='base64'||file.size>100000))throw Error('CONTENT_INVALID');
    const sha=file?.sha||'',content=file?Utilities.newBlob(Utilities.base64Decode(file.content)).getDataAsString('UTF-8'):'';
    if(pedido.action==='content-get')return {ok:true,path,sha,content};
    if(pedido.action!=='content-set'||typeof pedido.sha!=='string'||pedido.sha!==sha)throw Error('CONTENT_CONFLICT');
    if(typeof pedido.content!=='string'||!pedido.content.trim()||pedido.content.length>100000)throw Error('CONTENT_INVALID');
    let next=pedido.content;
    if(pedido.kind==='rubric'){
      let data;try{data=JSON.parse(next);}catch{throw Error('RUBRIC_INVALID');}
      validarRubricaEdicion_(data);data.version=new Date().toISOString();next=JSON.stringify(data,null,2)+'\n';
    }
    if(next===content)return {ok:true,path,sha,content,unchanged:true};
    const result=githubContenido_(path,'put',{message:'base4: actualizar '+(pedido.kind==='rubric'?'rúbrica':'instrucciones')+' de '+pedido.activity,branch:'main',content:Utilities.base64Encode(next,Utilities.Charset.UTF_8),...(sha?{sha}:{})});
    return {ok:true,path,sha:result.content.sha,content:next,commitUrl:result.commit.html_url};
  } catch(error) {
    const known=['SESSION','BUSY','CONTENT_PATH','CONTENT_INVALID','CONTENT_CONFLICT','GITHUB_CONFIG','GITHUB_ACCESS','GITHUB_NETWORK','RUBRIC_INVALID'];
    return {ok:false,code:known.includes(error.message)?error.message:'GITHUB_NETWORK'};
  } finally {if(lock?.hasLock())lock.releaseLock();}
}
