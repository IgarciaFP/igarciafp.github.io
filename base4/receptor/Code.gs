/**
 * Receptor de entregas de base3. Instalar VINCULADO a la hoja de cálculo de entregas
 * (Extensiones → Apps Script). Escribe con la cuenta del propietario: la hoja no se comparte.
 * Añade una fila por entrega en «Entregas», columnas identificadas por sus cabeceras.
 * La revisión autenticada consulta y modifica «nota» y «Comentarios a la nota».
 */
const ORIGEN_ = 'https://igarciafp.github.io';     // sitio del laboratorio
const DOMINIO_ = 'g.educaand.es';                  // dominio de correo admitido
const PAGINA_PROFESOR_ = 'https://igarciafp.github.io/base3/profesor.html';
// El receptor es compartido: solo se elige entre nuestros dos revisores.
function laboratorio_(datos) {
  return /^https:\/\/igarciafp\.github\.io\/base4(?:[/?#]|$)/.test(datos.url||'')?'base4':'base3';
}
function paginaProfesor_(datos) {
  const url=typeof datos.url==='string'?datos.url:'';
  const base4=ORIGEN_+'/base4';
  return url===base4||url.startsWith(base4+'/')||url.startsWith(base4+'?')||url.startsWith(base4+'#')
    ? ORIGEN_+'/base4/profesor.html' : PAGINA_PROFESOR_;
}
const SERVIDOR_ = 'https://igarciafp-github-io.igarciafp.workers.dev';   // dirección del servidor de control (Cloudflare Worker), sin barra final. Vacío: no se verifica el sello.
const HOJA_ID_ = '14dLBTlpFRY7mJ33Ckj-60T6MULZxp1tz2FTvUM7PKT4';    // solo si el script NO se creó desde la hoja: el ID de la hoja (lo que va entre /d/ y /edit en su dirección)
const PESTANA_ = 'Entregas';
const CABECERAS_ = ['DIA Y HORA [DD/MM/AA HH:MM:SS]', 'MODULO', 'Nombre de la práctica', 'EMAIL', 'PROBAR CODIGO', 'Tiempo', 'IP', 'Incidencias', 'ENTREGA completa'];
const FORMATO_ = { informe: 'SSII3G.', comprobacion: 'SSII3-' };
const PRACTICA_ = /^(DIW|DWEC|SSII)-[A-Z0-9][A-Z0-9-]{0,59}$/;

/** Hoja de entregas: la indicada en HOJA_ID_ o, si está vacío, la hoja desde la que se creó el script. */
function libro_() {
  const libro = HOJA_ID_ ? SpreadsheetApp.openById(HOJA_ID_) : SpreadsheetApp.getActiveSpreadsheet();
  if (!libro) throw Error('ROUTE');
  return libro;
}
/**
 * Comprobación opcional: elegir «configurar» en el desplegable del editor y pulsar Ejecutar.
 * Pide los permisos y verifica que encuentra la hoja y las cabeceras de «Entregas».
 */
function configurar() {
  let libro;
  try { libro = libro_(); } catch (error) { throw Error('No encuentro la hoja de entregas. Crea el script desde la hoja (Extensiones → Apps Script) o escribe su ID en HOJA_ID_.'); }
  const hoja=libro.getSheetByName(PESTANA_);
  const lock=LockService.getScriptLock();
  if(!lock.tryLock(25000))throw Error('El receptor está ocupado. Vuelve a ejecutar configurar.');
  try {
    prepararHojaVacia_(hoja);
    comprobarCabeceras_(hoja);
  } catch(error) {
    throw Error('Revisa la pestaña «'+PESTANA_+'» de «'+libro.getName()+'»: '+(error.detail||error.message));
  } finally { lock.releaseLock(); }
  console.log('Todo correcto. Las entregas se escribirán en «' + libro.getName() + '», pestaña «' + PESTANA_ + '». Publica una versión nueva de la aplicación web.');
}

/** Solo inicializa una pestaña sin contenido; nunca reordena filas ni columnas existentes. */
function prepararHojaVacia_(hoja) {
  if(!hoja)throw Object.assign(Error('SCHEMA'),{detail:'No existe la pestaña «'+PESTANA_+'».'});
  if(hoja.getLastRow()!==0)return false;
  const cabeceras=['ID','NUM ENTREGA',...CABECERAS_,'nota','Comentarios a la nota'];
  if(hoja.getMaxColumns()<cabeceras.length)hoja.insertColumnsAfter(hoja.getMaxColumns(),cabeceras.length-hoja.getMaxColumns());
  hoja.getRange(1,1,1,cabeceras.length).setValues([cabeceras]);
  SpreadsheetApp.flush();
  return true;
}

const igual_ = texto => String(texto).replace(/\s+/g, ' ').trim().toLowerCase();
const nombreCabecera_ = valor => igual_(valor).normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function comprobarCabeceras_(hoja) {
  if (!hoja) throw Object.assign(Error('SCHEMA'),{detail:'No existe la pestaña «'+PESTANA_+'».'});
  const fila=hoja.getRange(1,1,1,Math.max(1,hoja.getLastColumn())).getValues()[0];
  return CABECERAS_.map(nombre=>{
    const posiciones=fila.map((v,i)=>nombreCabecera_(v)===nombreCabecera_(nombre)?i+1:0).filter(Boolean);
    if(posiciones.length!==1)throw Object.assign(Error('SCHEMA'),{detail:posiciones.length?'Cabecera duplicada: «'+nombre+'».':'Falta la cabecera «'+nombre+'» en la fila 1.'});
    return posiciones[0];
  });
}
/** Traduce el orden lógico de los datos al orden real de las columnas. */
function distribuirFila_(hoja,fila) {
  const columnas=comprobarCabeceras_(hoja);
  const values=Array.from({length:hoja.getLastColumn()},()=>literal_(''));
  fila.forEach((valor,i)=>{values[columnas[i]-1]=valor;});
  return values;
}
function doGet(e) {
  const practica = e?.parameter?.practice || '', canal = e?.parameter?.channel || '';
  const profesor = e?.parameter?.mode === 'grade';
  if ((!profesor && !PRACTICA_.test(practica)) || !/^[a-f0-9]{32}$/.test(canal)) return HtmlService.createHtmlOutput('Receptor de entregas. Accede desde el laboratorio.');
  const plantilla = HtmlService.createTemplateFromFile('Bridge');
  plantilla.settings = JSON.stringify({ origin: ORIGEN_, practiceId: practica, channel: canal, mode: profesor ? 'grade' : 'submit' }).replace(/</g, '\\u003c');
  return plantilla.evaluate().setTitle('Entrega de laboratorio').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function huella_(texto) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, texto, Utilities.Charset.UTF_8)
    .map(b => (b & 255).toString(16).padStart(2, '0')).join('');
}
function texto_(valor, maximo, vacio = false) {
  if (typeof valor !== 'string' || valor.length > maximo || (!vacio && !valor.trim())) throw Error('INVALID');
  return valor;
}
function validarEntrega_(sobre) {
  if (sobre?.protocol !== 1 || !/^[a-f0-9]{64}$/.test(sobre.submissionId || '') || !PRACTICA_.test(sobre.practiceId || '') ||
    typeof sobre.payload !== 'string' || sobre.payload.length > 500000) throw Error('INVALID');
  if (huella_(sobre.payload) !== sobre.submissionId) throw Error('HASH');
  const datos = JSON.parse(sobre.payload);
  if (datos.exam !== sobre.practiceId || datos.activityVersion !== sobre.practiceVersion || datos.version !== 3) throw Error('INVALID');
  texto_(datos.module, 4); texto_(datos.activity, 60); texto_(datos.activityTitle, 200); texto_(datos.email, 254);
  if (datos.exam !== datos.module + '-' + datos.activity.toUpperCase()) throw Error('INVALID');
  if (!/^[^\s@]+@[^\s@]+$/.test(datos.email) || datos.email.split('@')[1].toLowerCase() !== DOMINIO_.toLowerCase()) throw Error('EMAIL');
  if (!Number.isFinite(Date.parse(datos.finishedAt)) || !Number.isFinite(datos.seconds) || datos.seconds < 0 || datos.seconds > 31536000 ||
    !Array.isArray(datos.answers) || datos.answers.length < 1 || datos.answers.length > 10) throw Error('INVALID');
  for (const respuesta of datos.answers) { texto_(respuesta.question, 100); texto_(respuesta.answer, 10000, true); }
  return datos;
}
/** Comprueba el sello una sola vez y separa la IP de los avisos. */
function controlEntrega_(datos,politica) {
  const base4=laboratorio_(datos)==='base4';
  const sello=datos.sello,avisos=[],exigir=politica.restringirHorario||(!base4&&politica.restringirIPs);
  if(sello?.accesoSinComprobar===true)avisos.push('acceso sin comprobar');
  if(!sello||sello.error||typeof sello.ip!=='string'||!/^[0-9a-fA-F.:]{3,45}$/.test(sello.ip)){
    if(exigir)throw Error('CONTROL_REQUIRED');
    return {ip:'',avisos:[...avisos,'SIN COMPROBAR']};
  }
  if(huella_(JSON.stringify([datos.exam,datos.email,datos.answers]))!==sello.huella||sello.email!==datos.email||
    sello.modulo!==datos.module.toLowerCase()||sello.actividad!==datos.activity){
    if(exigir)throw Error('CONTROL_INVALID');
    return {ip:'',avisos:[...avisos,'SELLO NO VÁLIDO']};
  }
  let verificado=false,invalido=false;
  if(SERVIDOR_){
    try{
      const response=UrlFetchApp.fetch(SERVIDOR_+(laboratorio_(datos)==='base4'?'/base4':'')+'/verificar',{method:'post',contentType:'application/json',payload:JSON.stringify({sello}),muteHttpExceptions:true});
      if(response.getResponseCode()===200){
        verificado=JSON.parse(response.getContentText()).valido===true;
        invalido=!verificado;
      }
    }catch{}
  }
  if(invalido){
    if(exigir)throw Error('CONTROL_INVALID');
    return {ip:'',avisos:[...avisos,'SELLO NO VÁLIDO']};
  }
  if(exigir&&!verificado)throw Error('CONTROL_UNAVAILABLE');
  const redPermitida=base4||enRed(sello.ip,politica.redes);
  if(!base4&&politica.restringirIPs&&!redPermitida)throw Error('NETWORK_DENIED');
  if(politica.restringirHorario&&sello.enHorario!==true)throw Error('SCHEDULE_DENIED');
  if(!verificado)avisos.push('sello sin verificar');
  if(!redPermitida)avisos.push('FUERA DE LA RED');
  if(sello.enHorario!==true)avisos.push('FUERA DE HORARIO');
  if(sello.profesor===true)avisos.push('clave del profesor');
  return {ip:sello.ip,avisos};
}
function incidencias_(datos, control) {
  const partes = [(Number.isFinite(datos.incidents) ? datos.incidents : '?') + (datos.guardPolicy === 'return-timeout' ? ' incidencias' : '/3')];
  if (datos.finishReason === 'incident-limit') partes.push('cierre automático');
  if (datos.finishReason === 'return-timeout') partes.push('cierre automático: tiempo de regreso agotado');
  if (datos.finishReason === 'duration-limit') partes.push('cierre automático: duración de la práctica agotada');
  partes.push(...control.avisos);
  return partes.join(' · ');
}
/** Cifra en el servidor antes de almacenar; no hay alternativa en claro si el cifrado falla. */
function documento_(sobre) {
  const contenido = sobre.payload + '\nCódigo de comprobación: ' + FORMATO_.comprobacion + sobre.submissionId;
  if(laboratorio_(JSON.parse(sobre.payload))==='base4'){
    try{
      const response=UrlFetchApp.fetch(SERVIDOR_+'/base4/cifrar',{method:'post',contentType:'application/json',payload:JSON.stringify({payload:sobre.payload,submissionId:sobre.submissionId}),muteHttpExceptions:true});
      const result=JSON.parse(response.getContentText());
      if(response.getResponseCode()!==200||!result.ok||!/^SSII4E1\.[A-Za-z0-9_-]+$/.test(result.code||''))throw Error('ENCRYPTION_UNAVAILABLE');
      return result.code;
    }catch{throw Error('ENCRYPTION_UNAVAILABLE');}
  }
  return codificarDocumento_(contenido);
}
function codificarDocumento_(contenido){
  return FORMATO_.informe + Utilities.base64EncodeWebSafe(Utilities.gzip(Utilities.newBlob(contenido, 'text/plain')).getBytes()).replace(/=+$/, '');
}
function descifrarDocumento_(codigo,token){
  if(typeof codigo!=='string'||codigo.length>1000000||!/^SSII4E1\.[A-Za-z0-9_-]+$/.test(codigo))throw Error('INVALID');
  if(!token)throw Error('ENCRYPTION_SESSION');
  const response=UrlFetchApp.fetch(SERVIDOR_+'/base4/descifrar',{method:'post',contentType:'application/json',payload:JSON.stringify({code:codigo,token}),muteHttpExceptions:true});
  const result=JSON.parse(response.getContentText());
  if(response.getResponseCode()!==200||!result.ok||typeof result.document!=='string')throw Error('DECRYPTION');
  return result.document;
}

/** Configuración publicada por el profesor; nunca se acepta el límite enviado por el alumno. */
function errorConfiguracion_(detalle) {
  const error = Error('ACTIVITY_CONFIG');
  error.detail = detalle;
  return error;
}
function configuracionActividad_(datos) {
  if (!/^(DIW|DWEC|SSII)$/.test(datos.module) || !/^[a-z0-9][a-z0-9-]{0,59}$/.test(datos.activity)) throw Error('INVALID');
  const carpeta=laboratorio_(datos);
  const url=ORIGEN_+'/'+carpeta+'/actividades/'+datos.module.toLowerCase()+'/'+datos.activity+'/config.json';
  try {
    let respuesta;
    for(let intento=0;intento<3;intento++){
      try{
        respuesta=UrlFetchApp.fetch(url+'?v='+Date.now(),{muteHttpExceptions:true});
      }catch(error){
        if(intento===2)throw errorConfiguracion_('No se pudo descargar '+url+': '+error.message);
        Utilities.sleep(300*(intento+1));continue;
      }
      const estado=respuesta.getResponseCode();
      if(![408,429,500,502,503,504].includes(estado)||intento===2)break;
      Utilities.sleep(300*(intento+1));
    }
    if(respuesta.getResponseCode()===404&&carpeta==='base4')throw errorConfiguracion_('No existe la actividad de base4: '+url);
    if(respuesta.getResponseCode()===404)return {entregas:0,redes:['185.197.0.0/16','88.16.0.0/16'],restringirHorario:false,restringirIPs:false};
    if(respuesta.getResponseCode()!==200)throw errorConfiguracion_('HTTP '+respuesta.getResponseCode()+' al descargar '+url);
    let config;
    try{config=JSON.parse(respuesta.getContentText());}catch{throw errorConfiguracion_('La respuesta de '+url+' no es JSON válido.');}
    if(!config||typeof config!=='object'||Array.isArray(config))throw errorConfiguracion_('config.json debe contener un objeto.');
    const limite=config.entregas===undefined?(carpeta==='base4'?1:0):config.entregas;
    if(!Number.isSafeInteger(limite)||limite<0)throw errorConfiguracion_('entregas debe ser un entero mayor o igual a 0.');
    const redes=carpeta==='base4'?[]:config.redes===undefined?['185.197.0.0/16','88.16.0.0/16']:config.redes;
    const restringirHorario=config.restringirHorario??false,restringirIPs=carpeta==='base4'?false:config.restringirIPs??false;
    if(!Array.isArray(redes)||!redes.every(cidrValido))throw errorConfiguracion_('redes debe ser una lista de redes CIDR válidas.');
    if(typeof restringirHorario!=='boolean'||typeof restringirIPs!=='boolean')throw errorConfiguracion_('restringirHorario y restringirIPs deben ser true o false.');
    return {entregas:limite,redes,restringirHorario,restringirIPs};
  }catch(error){
    console.error('ACTIVITY_CONFIG: '+(error.detail||error.message)+' · '+url);
    if(error.detail)throw error;
    throw errorConfiguracion_(error.message);
  }
}
/** Ejecutar desde el editor para comprobar la descarga real desde los servidores de Google. */
function diagnosticarActividad() {
  try {
    const politica=configuracionActividad_({module:'DIW',activity:'02-01-prueba-css-adaptable'});
    console.log('Configuración correcta (receptor compatible con entregas: 0): '+JSON.stringify(politica));
  }catch(error){throw Error(error.detail||error.message);}
}
function limiteActividad_(datos){return configuracionActividad_(datos).entregas;}
function ipv4(texto) {
  const partes = texto.split('.');
  if (partes.length !== 4 || partes.some(p => !/^\d{1,3}$/.test(p) || Number(p) > 255)) return null;
  return partes.map(Number);
}
function ipv6(texto) {
  if (!/^[0-9a-f:]+$/i.test(texto) || (texto.match(/::/g) || []).length > 1) return null;
  const [antes, despues] = texto.split('::');
  const grupos = t => (t ? t.split(':') : []);
  const a = grupos(antes), b = despues === undefined ? [] : grupos(despues);
  if(despues!==undefined&&a.length+b.length>=8)return null;
  const todos = despues === undefined ? a : [...a, ...Array(8 - a.length - b.length).fill('0'), ...b];
  if (todos.length !== 8 || todos.some(g => !/^[0-9a-f]{1,4}$/i.test(g))) return null;
  const bytes=[];
  for(const grupo of todos){const valor=parseInt(grupo,16);bytes.push(valor >>> 8,valor & 255);}
  return bytes;
}
function cidrValido(red) {
  if(typeof red!=='string')return false;
  const partes=red.split('/');
  if(partes.length!==2||!/^\d{1,3}$/.test(partes[1]))return false;
  const v6=partes[0].includes(':'),n=Number(partes[1]);
  return n<=(v6?128:32)&&(v6?ipv6(partes[0]):ipv4(partes[0]))!==null;
}

function enRed(ip, redes) {
  ip = String(ip || '').trim().toLowerCase();
  const mapeada = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
  if (mapeada) ip = mapeada[1];
  for (const red of redes) {
    if(!cidrValido(red))throw Error('CIDR inválido');
    const [base, prefijo] = red.split('/');
    const v6 = base.includes(':');
    const a = v6 ? ipv6(ip) : ipv4(ip), b = v6 ? ipv6(base.toLowerCase()) : ipv4(base);
    if (a === null || b === null) continue;
    // Comparación por bytes: evita los literales de entero grande que rechaza Apps Script.
    const longitud=Number(prefijo), completos=Math.floor(longitud/8), resto=longitud%8;
    let coincide=true;
    for(let i=0;i<completos;i++){if(a[i]!==b[i]){coincide=false;break;}}
    if(coincide&&resto){const mascara=(255 << (8-resto)) & 255;coincide=(a[completos]&mascara)===(b[completos]&mascara);}
    if(coincide)return true;
  }
  return false;
}


function informeAlmacenado_(codigo) {
  if(typeof codigo!=='string'||!codigo.startsWith(FORMATO_.informe))return null;
  try{
    const encoded=codigo.slice(FORMATO_.informe.length);
    const bytes=Utilities.base64DecodeWebSafe(encoded+'='.repeat((4-encoded.length%4)%4));
    const texto=Utilities.ungzip(Utilities.newBlob(bytes,'application/gzip')).getDataAsString('UTF-8');
    const marker='\nCódigo de comprobación: '+FORMATO_.comprobacion,pos=texto.lastIndexOf(marker);
    if(pos<0)return null;
    const payload=texto.slice(0,pos),id=huella_(payload);
    if(id!==texto.slice(pos+marker.length))return null;
    const report=JSON.parse(payload);
    return {laboratorio:laboratorio_(report),exam:report.exam,activity:report.activity,activityTitle:report.activityTitle,unidad:report.unidad,email:String(report.email).toLowerCase(),id};
  }catch{return null;}
}
function entregasAnteriores_(hoja,datos,id) {
  const total=hoja.getLastRow()-1,email=datos.email.toLowerCase();
  if(total<1)return {count:0,duplicate:false};
  const columnas=comprobarCabeceras_(hoja);
  const filas=hoja.getRange(2,1,total,hoja.getLastColumn()).getValues().map(fila=>columnas.slice(1).map(col=>fila[col-1]));
  const notas=hoja.getRange(2,columnas[8],total,1).getNotes();
  let count=0,duplicate=false,duplicateRow=0;
  for(let i=0;i<filas.length;i++){
    const fila=filas[i];
    if(String(fila[0])!==datos.module||String(fila[2]).trim().toLowerCase()!==email)continue;
    let meta=null;
    try{const n=JSON.parse(notas[i][0]);if((n?.base3===1&&/^[a-f0-9]{64}$/.test(n.id))||n?.base3===2)meta=n;}catch{}
    meta=meta||informeAlmacenado_(fila[7]);
    const origen=meta?.laboratorio||informeAlmacenado_(fila[7])?.laboratorio;
    if(origen&&origen!==laboratorio_(datos))continue;
    if(meta&&meta.exam===datos.exam&&meta.email===email){count++;if(meta.id===id){duplicate=true;duplicateRow=i+2;}}
    // Entregas antiguas demasiado largas: solo queda el título en la hoja.
    else if(!meta&&String(fila[1])===datos.activityTitle)count++;
  }
  return {count,duplicate,duplicateRow};
}

const literal_ = valor => ({ userEnteredValue: { stringValue: String(valor ?? '') } });


/** Las columnas nuevas se añaden al final: nunca desplazan ni sobrescriben «nota». */
function columnasIntento_(hoja) {
  const headers=hoja.getRange(1,1,1,hoja.getLastColumn()).getValues()[0];
  return ['ID','Número de entrega'].map(nombre=>{
    const aliases=nombre==='ID'?['id']:['numero de entrega','num entrega'];
    const matches=headers.map((v,i)=>aliases.includes(nombreCabecera_(v))?i+1:0).filter(Boolean);
    if(matches.length>1)throw Error('SCHEMA');
    if(matches.length)return matches[0];
    const col=headers.length+1;
    if(col>hoja.getMaxColumns())hoja.insertColumnsAfter(hoja.getMaxColumns(),col-hoja.getMaxColumns());
    hoja.getRange(1,col).setValue(nombre);headers.push(nombre);return col;
  });
}
function buscarIntento_(hoja,sobre,datos,columnas) {
  if(!/^[a-f0-9]{32}$/.test(datos.attemptId||'')||!/^[a-f0-9]{64}$/.test(sobre.attemptToken||''))throw Error('INVALID');
  if(hoja.getLastRow()<2)return null;
  const matches=hoja.getRange(2,columnas[0],hoja.getLastRow()-1,1).createTextFinder(datos.attemptId).matchEntireCell(true).matchCase(true).findAll();
  if(matches.length>1)throw Error('AMBIGUOUS');
  if(!matches.length)return null;
  const row=matches[0].getRow();
  let meta;try{meta=JSON.parse(hoja.getRange(row,comprobarCabeceras_(hoja)[8]).getNote());}catch{throw Error('INVALID');}
  if((meta.laboratorio&&meta.laboratorio!==laboratorio_(datos))||meta.base3!==2||meta.exam!==datos.exam||meta.email!==datos.email.toLowerCase()||meta.tokenHash!==huella_(sobre.attemptToken))throw Error('INVALID');
  return {row,meta};
}
/** Reserva idempotente: guarda la identidad antes de la entrega definitiva. */
function iniciarEntrega(sobre) {
  let lock;
  try{
    const datos=validarEntrega_(sobre);
    lock=LockService.getScriptLock();if(!lock.tryLock(25000))throw Error('BUSY');
    const libro=libro_(),hoja=libro.getSheetByName(PESTANA_);comprobarCabeceras_(hoja);
    const columnas=columnasIntento_(hoja),existing=buscarIntento_(hoja,sobre,datos,columnas);
    const politica=configuracionActividad_(datos);
    const limitEnforced=laboratorio_(datos)==='base4';
    if(existing)return {ok:true,attemptId:datos.attemptId,number:existing.meta.number,limit:politica.entregas,status:existing.meta.status,limitEnforced,encryptedStorage:limitEnforced};
    const number=entregasAnteriores_(hoja,datos,'').count+1,ahora=new Date();
    // La hoja es la autoridad: borrar una fila libera una oportunidad para ese alumno y actividad.
    if(limitEnforced&&number>politica.entregas)throw Error('ATTEMPTS_EXHAUSTED');
    // El inicio registra los avisos; las restricciones se aplican al enviar.
    const control=controlEntrega_(datos,{...politica,restringirIPs:false,restringirHorario:false});
    const meta={base3:2,laboratorio:laboratorio_(datos),exam:datos.exam,email:datos.email.toLowerCase(),attemptId:datos.attemptId,
      number,tokenHash:huella_(sobre.attemptToken),status:'started',startedAt:ahora.toISOString(),initialIP:control.ip};
    let values=Array.from({length:9},()=>literal_(''));
    values[0]=literal_(Utilities.formatDate(ahora,'Europe/Madrid','dd/MM/yy HH:mm:ss'));
    values[1]=literal_(datos.module);values[2]=literal_(datos.activityTitle);values[3]=literal_(meta.email);
    values[6]=literal_(control.ip);values[7]=literal_(['INICIADA · pendiente de entrega',...control.avisos].join(' · '));
    values[8]={...literal_(''),note:JSON.stringify(meta)};
    values=distribuirFila_(hoja,values);
    values[columnas[0]-1]=literal_(datos.attemptId);values[columnas[1]-1]={userEnteredValue:{numberValue:number}};
    Sheets.Spreadsheets.batchUpdate({requests:[{appendCells:{sheetId:hoja.getSheetId(),rows:[{values}],fields:'userEnteredValue,note'}}]},libro.getId());
    return {ok:true,attemptId:datos.attemptId,number,limit:politica.entregas,status:'started',limitEnforced,encryptedStorage:limitEnforced};
  }catch(error){return {ok:false,code:['INVALID','EMAIL','HASH','BUSY','SCHEMA','ROUTE','ACTIVITY_CONFIG','AMBIGUOUS','ATTEMPTS_EXHAUSTED'].includes(error.message)?error.message:'STORAGE'};}
  finally{if(lock?.hasLock())lock.releaseLock();}
}

/** Marca el reenvío sin duplicar filas ni modificar notas o respuestas. */
function marcarEntregaArchivo_(hoja,row) {
  if(!row)return;
  const celda=hoja.getRange(row,comprobarCabeceras_(hoja)[7]);
  const actual=String(celda.getValue()||'');
  if(!actual.split(' · ').includes('Entrega desde archivo'))celda.setValue(actual+(actual?' · ':'')+'Entrega desde archivo');
}
/** Recepción del alumno. Nunca devuelve entregas ajenas. */
function recibirEntrega(sobre) {
  let cerrojo;
  try {
    const datos = validarEntrega_(sobre);
    cerrojo = LockService.getScriptLock();
    if (!cerrojo.tryLock(25000)) throw Error('BUSY');
    const libro = libro_(), id = libro.getId(), hoja = libro.getSheetByName(PESTANA_);
    comprobarCabeceras_(hoja);
    const intento=datos.attemptId?buscarIntento_(hoja,sobre,datos,columnasIntento_(hoja)):null;
    if(datos.attemptId&&!intento)throw Error('NOT_STARTED');
    if(intento?.meta.status==='submitted'){
      if(intento.meta.id!==sobre.submissionId)throw Error('ALREADY_SUBMITTED');
      if(sobre.fromFile===true&&laboratorio_(datos)==='base4')marcarEntregaArchivo_(hoja,intento.row);
      return {ok:true,submissionId:sobre.submissionId,receivedAt:intento.meta.receivedAt,duplicate:true};
    }
    const anteriores=entregasAnteriores_(hoja,datos,sobre.submissionId);
    if(anteriores.duplicate){
      if(sobre.fromFile===true&&laboratorio_(datos)==='base4')marcarEntregaArchivo_(hoja,anteriores.duplicateRow);
      return {ok:true,submissionId:sobre.submissionId,receivedAt:new Date().toISOString(),duplicate:true};
    }
    const politica=configuracionActividad_(datos),limite=politica.entregas,adicional=intento?intento.meta.number>limite:anteriores.count>=limite;
    if(laboratorio_(datos)==='base4'&&!intento&&adicional)throw Error('ATTEMPTS_EXHAUSTED');
    const motivo=typeof datos.revisionReason==='string'?datos.revisionReason.trim():'';
    if(motivo.length>2000)throw Error('INVALID');
    if(laboratorio_(datos)!=='base4'&&adicional&&(datos.attemptId||datos.finishReason==='voluntary')&&(motivo.match(/\p{L}/gu)||[]).length<20)throw Error('REVISION_REASON');
    const ahora = new Date(), segundos = Math.floor(datos.seconds);
    const control = controlEntrega_(datos,politica);
    const codigo = documento_(sobre), cabe = codigo.length <= 45000 && /^[A-Za-z0-9._-]+$/.test(codigo);
    if(laboratorio_(datos)==='base4'&&!cabe)throw Error('ENCRYPTED_DOCUMENT_TOO_LARGE');
    if(sobre.fromFile===true&&laboratorio_(datos)==='base4')control.avisos.push('Entrega desde archivo');
    if(adicional)control.avisos.push('entrega adicional: no sustituye ni actualiza la nota anterior');
    if(intento&&control.ip!==intento.meta.initialIP)control.avisos.push('IP de entrega: '+(control.ip||'sin comprobar'));
    if(motivo)control.avisos.push('Motivo de revisión: '+motivo);
    const fila = [
      literal_(Utilities.formatDate(ahora, 'Europe/Madrid', 'dd/MM/yy HH:mm:ss')),
      literal_(datos.module), literal_(datos.activityTitle), literal_(datos.email.toLowerCase()),
      // El código solo contiene letras, cifras, punto, guion y guion bajo: no puede alterar la fórmula.
      // Los argumentos se separan con punto y coma: es válido en todas las configuraciones regionales
      // (con coma, las hojas en español dan #ERROR!).
      cabe ? { userEnteredValue: { formulaValue: '=HYPERLINK("' + paginaProfesor_(datos) + '#entrega=' + codigo + '";"Probar código")' } } : literal_('Pide el archivo TXT al alumno'),
      literal_(Math.floor(segundos / 60) + ' min ' + String(segundos % 60).padStart(2, '0') + ' s'),
      literal_(control.ip), literal_(incidencias_(datos, control)),
      {...literal_(cabe ? codigo : 'Entrega demasiado larga para una celda: pide el archivo TXT al alumno.'),
        note:JSON.stringify({base3:1,laboratorio:laboratorio_(datos),exam:datos.exam,email:datos.email.toLowerCase(),id:sobre.submissionId,adicional})}
    ];
    if(intento){
      // Conserva fecha, identidad e IP iniciales; no se toca «nota».
      fila[8].note=JSON.stringify({...intento.meta,id:sobre.submissionId,status:'submitted',receivedAt:ahora.toISOString(),adicional});
      const columnas=comprobarCabeceras_(hoja);
      const update=(start,values)=>({updateCells:{range:{sheetId:hoja.getSheetId(),startRowIndex:intento.row-1,endRowIndex:intento.row,startColumnIndex:start,endColumnIndex:start+values.length},rows:[{values}],fields:'userEnteredValue,note'}});
      Sheets.Spreadsheets.batchUpdate({requests:[4,5,7,8].map(i=>update(columnas[i]-1,[fila[i]]))},id);
    }else{
      Sheets.Spreadsheets.batchUpdate({ requests: [{ appendCells: { sheetId: hoja.getSheetId(), rows: [{ values: distribuirFila_(hoja,fila) }], fields: 'userEnteredValue,note' } }] }, id);
    }
    return { ok: true, submissionId: sobre.submissionId, receivedAt: ahora.toISOString(), duplicate: false };
  } catch (error) {
    const conocidos = ['INVALID', 'HASH', 'EMAIL', 'ROUTE', 'SCHEMA', 'BUSY', 'ACTIVITY_CONFIG', 'REVISION_REASON', 'CONTROL_REQUIRED', 'CONTROL_INVALID', 'CONTROL_UNAVAILABLE', 'NETWORK_DENIED', 'SCHEDULE_DENIED', 'NOT_STARTED', 'ALREADY_SUBMITTED', 'AMBIGUOUS', 'ATTEMPTS_EXHAUSTED','ENCRYPTION_UNAVAILABLE','ENCRYPTED_DOCUMENT_TOO_LARGE'];
    return { ok: false, code: conocidos.includes(error.message) ? error.message : 'STORAGE' };
  } finally { if (cerrojo?.hasLock()) cerrojo.releaseLock(); }
}

/** Sesiones de profesor: token aleatorio, 30 días; solo su hash queda en el servidor. */
const SESION_DIAS_ = 30;
function autenticarProfesor_(clave) {
  texto_(clave, 500);
  if (!SERVIDOR_) throw Error('AUTH_CONFIG');
  let respuesta;
  try {
    respuesta = UrlFetchApp.fetch(SERVIDOR_ + '/base4/profesor', {
      method: 'post', contentType: 'application/json', payload: JSON.stringify({ clave }), muteHttpExceptions: true
    });
    if (respuesta.getResponseCode() !== 200) throw Error('AUTH');
    const result=JSON.parse(respuesta.getContentText());
    if (result.profesor !== true) throw Error('AUTH');
    return result.decryptToken;
  } catch (error) { throw Error('AUTH'); }
}
function sesionProfesor_(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw Error('SESSION');
  const propiedades = PropertiesService.getScriptProperties(), nombre = 'PROF_SESSION_' + huella_(token);
  const expiresAt = Number(propiedades.getProperty(nombre));
  if (!expiresAt || expiresAt <= Date.now()) { propiedades.deleteProperty(nombre);propiedades.deleteProperty('PROF_DECRYPT_'+huella_(token)); throw Error('SESSION'); }
  return { propiedades, nombre, expiresAt, decryptToken:propiedades.getProperty('PROF_DECRYPT_'+huella_(token)) };
}
function iniciarSesionProfesor_(clave) {
  const decryptToken=autenticarProfesor_(clave);
  if(typeof decryptToken!=='string'||!/^\d{13}\.[a-f0-9]{32}\.[a-f0-9]{64}$/.test(decryptToken))throw Error('AUTH_CONFIG');
  const propiedades = PropertiesService.getScriptProperties();
  // Retirar las sesiones caducadas sin tocar otras propiedades del proyecto.
  for (const [nombre, valor] of Object.entries(propiedades.getProperties()))
    if (nombre.startsWith('PROF_SESSION_') && Number(valor) <= Date.now()) {propiedades.deleteProperty(nombre);propiedades.deleteProperty(nombre.replace('PROF_SESSION_','PROF_DECRYPT_'));}
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  const expiresAt = Date.now() + SESION_DIAS_ * 86400000;
  propiedades.setProperty('PROF_SESSION_' + huella_(token), String(expiresAt));
  propiedades.setProperty('PROF_DECRYPT_'+huella_(token),decryptToken);
  return { ok: true, token, expiresAt };
}
/** Identifica la entrega por el hash del informe, también para archivos TXT descargados. */
function filaDeEntrega_(hoja, id) {
  if (!/^[a-f0-9]{64}$/.test(id || '')) throw Error('INVALID');
  const total = hoja.getLastRow() - 1;
  if (total < 1) throw Error('NOT_FOUND');
  const valores = hoja.getRange(2, comprobarCabeceras_(hoja)[8], total, 1).getValues();
  const notas=hoja.getRange(2,comprobarCabeceras_(hoja)[8],total,1).getNotes();
  const marcador = '\nCódigo de comprobación: ' + FORMATO_.comprobacion;
  let encontrada = 0;
  for (let i = 0; i < valores.length; i++) {
    const codigo = String(valores[i][0] || '');
    let coincide = false;
    if(codigo.startsWith('SSII4E1.')){
      try{const meta=JSON.parse(notas[i][0]);coincide=meta.id===id&&[1,2].includes(meta.base3);}catch{}
      if(coincide){if(encontrada)throw Error('AMBIGUOUS');encontrada=i+2;}continue;
    }
    if (!codigo.startsWith(FORMATO_.informe)) continue;
    try {
      const encoded = codigo.slice(FORMATO_.informe.length);
      const bytes = Utilities.base64DecodeWebSafe(encoded + '='.repeat((4 - encoded.length % 4) % 4));
      const texto = Utilities.ungzip(Utilities.newBlob(bytes, 'application/gzip')).getDataAsString('UTF-8');
      const pos = texto.lastIndexOf(marcador);
      coincide = pos >= 0 && texto.slice(pos + marcador.length) === id && huella_(texto.slice(0, pos)) === id;
    } catch (error) { continue; }
    if (coincide) {
      if (encontrada) throw Error('AMBIGUOUS');
      encontrada = i + 2;
    }
  }
  if (!encontrada) throw Error('NOT_FOUND');
  return encontrada;
}
function estadoNota_(celda, celdaComentarios) {
  const valor = celda.getValue(), formula = celda.getFormula(), nota = celda.getDisplayValue();
  const comentarios = celdaComentarios.getDisplayValue();
  return { nota, comentarios, revision: huella_(JSON.stringify([valor, formula, nota, celdaComentarios.getValue(), celdaComentarios.getFormula(), comentarios])) };
}
/** La propuesta IA es de solo lectura; nunca se mezcla con la nota del profesor. */
function estadoIA_(hoja, cabeceras, fila) {
  const localizar = nombre => cabeceras.map((v,i) => igual_(v) === nombre ? i+1 : 0).filter(Boolean);
  const notas = localizar('nota ia'), comentarios = localizar('comentarios ia');
  const analisis=cabeceras.map((v,i)=>nombreCabecera_(v)==='analisis de la nota'?i+1:0).filter(Boolean);
  const detalle={analisisNota:analisis.length===1?String(hoja.getRange(fila,analisis[0]).getValue()||''):'',analisisAviso:analisis.length>1?'Hay columnas de análisis duplicadas.':''};
  if (notas.length > 1 || comentarios.length > 1) return { ...detalle,iaDisponible: false, iaAviso: 'Hay cabeceras de IA duplicadas en la hoja.' };
  if (notas.length !== 1 || comentarios.length !== 1) return { ...detalle,iaDisponible: false, iaAviso: 'Faltan las columnas NOTA IA o COMENTARIOS IA.' };
  return { ...detalle,iaDisponible: true, notaIA: hoja.getRange(fila, notas[0]).getDisplayValue(), comentariosIA: hoja.getRange(fila, comentarios[0]).getDisplayValue() };
}
/** Todas las consultas y escrituras de notas requieren una sesión validada aquí. */
function gestionarNota(pedido) {
  let cerrojo;
  try {
    if (!pedido || typeof pedido !== 'object') throw Error('INVALID');
    if (pedido.action === 'login') return iniciarSesionProfesor_(pedido.key);
    const sesion = sesionProfesor_(pedido.token);
    if (pedido.action === 'session') return { ok: true, expiresAt: sesion.expiresAt,decryptReady:!!sesion.decryptToken };
    if(pedido.action==='decrypt')return {ok:true,document:descifrarDocumento_(pedido.code,sesion.decryptToken)};
    if (['content-get', 'content-set'].includes(pedido.action)) return gestionarContenido_(pedido);
    if (pedido.action === 'logout') { sesion.propiedades.deleteProperty(sesion.nombre);sesion.propiedades.deleteProperty('PROF_DECRYPT_'+huella_(pedido.token)); return { ok: true }; }
    if (!['get', 'set'].includes(pedido.action)) throw Error('INVALID');
    cerrojo = LockService.getScriptLock();
    if (!cerrojo.tryLock(25000)) throw Error('BUSY');
    const libro = libro_(), hoja = libro.getSheetByName(PESTANA_);
    comprobarCabeceras_(hoja);
    const cabeceras = hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0];
    const columnas = cabeceras.map((v, i) => igual_(v) === 'nota' ? i + 1 : 0).filter(Boolean);
    if (columnas.length !== 1) throw Error('GRADE_COLUMN');
    const fila = filaDeEntrega_(hoja, pedido.submissionId), columna = columnas[0], celda = hoja.getRange(fila, columna);
    const columnasComentarios = cabeceras.map((v, i) => igual_(v) === 'comentarios a la nota' ? i + 1 : 0).filter(Boolean);
    if (columnasComentarios.length !== 1) throw Error('COMMENTS_COLUMN');
    const columnaComentarios = columnasComentarios[0], celdaComentarios = hoja.getRange(fila, columnaComentarios);
    const actual = { ...estadoNota_(celda, celdaComentarios), ...estadoIA_(hoja, cabeceras, fila) };
    if (pedido.action === 'get') return { ok: true, submissionId: pedido.submissionId, ...actual };
    texto_(pedido.nota, 100, true);
    if (pedido.comentarios !== undefined) texto_(pedido.comentarios, 10000, true);
    // Evitar sobreescribir una modificación realizada desde la hoja u otra revisión.
    if (pedido.revision !== actual.revision) return { ok: false, code: 'CONFLICT', ...actual };
    const nota = pedido.nota.trim();
    const numero = /^-?\d+(?:[.,]\d+)?$/.test(nota) ? Number(nota.replace(',', '.')) : NaN;
    const entrada = nota === '' ? {} : Number.isFinite(numero) ? { userEnteredValue: { numberValue: numero } } : literal_(nota);
    const requests = [{ updateCells: {
      range: { sheetId: hoja.getSheetId(), startRowIndex: fila - 1, endRowIndex: fila, startColumnIndex: columna - 1, endColumnIndex: columna },
      rows: [{ values: [entrada] }], fields: 'userEnteredValue'
    } }];
    if (pedido.comentarios !== undefined) requests.push({ updateCells: {
      range: { sheetId: hoja.getSheetId(), startRowIndex: fila - 1, endRowIndex: fila, startColumnIndex: columnaComentarios - 1, endColumnIndex: columnaComentarios },
      rows: [{ values: [literal_(pedido.comentarios)] }], fields: 'userEnteredValue'
    } });
    const volcado=prepararVolcadoNota_(libro,hoja,fila,nota,pedido.comentarios,sesion.decryptToken);
    requests.push(...volcado.requests);
    Sheets.Spreadsheets.batchUpdate({ requests }, libro.getId());
    SpreadsheetApp.flush();
    return { ok: true, submissionId: pedido.submissionId, volcado:{estado:volcado.estado,mensaje:volcado.mensaje}, ...estadoNota_(celda, celdaComentarios), ...estadoIA_(hoja, cabeceras, fila) };
  } catch (error) {
    const conocidos = ['AUTH', 'AUTH_CONFIG', 'SESSION', 'INVALID', 'BUSY', 'SCHEMA', 'ROUTE', 'NOT_FOUND', 'AMBIGUOUS', 'GRADE_COLUMN', 'COMMENTS_COLUMN', 'SYNC_SCHEMA', 'SYNC_DATE', 'SYNC_ID', 'SYNC_GRADE', 'SYNC_UNIT','ENCRYPTION_SESSION','DECRYPTION'];
    return { ok: false, code: conocidos.includes(error.message) ? error.message : 'STORAGE' };
  } finally { if (cerrojo?.hasLock()) cerrojo.releaseLock(); }
}

/** Consulta previa: solo devuelve contadores, nunca código ni calificaciones. */
function consultarOportunidades(pedido) {
  try {
    if(!PRACTICA_.test(pedido?.practiceId||''))throw Error('INVALID');
    const email=texto_(pedido.email,254).trim().toLowerCase();
    if(!/^[^\s@]+@[^\s@]+$/.test(email)||email.split('@')[1]!==DOMINIO_)throw Error('EMAIL');
    const modulo=pedido.practiceId.split('-')[0];
    const datos={exam:pedido.practiceId,module:modulo,activity:pedido.practiceId.slice(modulo.length+1).toLowerCase(),
      email,url:typeof pedido.url==='string'?pedido.url:'',activityTitle:typeof pedido.activityTitle==='string'?pedido.activityTitle:''};
    const limite=limiteActividad_(datos),hoja=libro_().getSheetByName(PESTANA_);
    comprobarCabeceras_(hoja);
    const anteriores=entregasAnteriores_(hoja,datos,'');
    let intento=null;
    if(pedido.attemptId!==undefined){
      datos.attemptId=pedido.attemptId;
      intento=buscarIntento_(hoja,pedido,datos,columnasIntento_(hoja));
    }
    return {ok:true,practiceId:pedido.practiceId,email,used:anteriores.count,limit:limite,
      limitEnforced:laboratorio_(datos)==='base4',encryptedStorage:laboratorio_(datos)==='base4',canResume:intento?.meta.status==='started',attemptStatus:intento?.meta.status||null};
  }catch(error){
    const conocidos=['INVALID','EMAIL','SCHEMA','ROUTE','ACTIVITY_CONFIG'];
    return {ok:false,code:conocidos.includes(error.message)?error.message:'STORAGE'};
  }
}


/** Diagnóstico de solo lectura: no crea ni modifica entregas. */
function diagnosticarBase4() {
  for(const [module,activity] of [['DWEC','02-02-mover-cuadrado-con-teclado'],['SSII','02-01-distingue-mac-ipv4-ipv6']]) {
    const policy=configuracionActividad_({module,activity,url:ORIGEN_+'/base4/?a='+module.toLowerCase()+'/'+activity});
    if(policy.entregas!==1)throw Error('Límite inesperado: '+policy.entregas);
    console.log(module+' '+activity+': límite='+policy.entregas+'; intento 1 adicional='+(1>policy.entregas)+'; intento 2 adicional='+(2>policy.entregas));
  }
}


/** Prepara el volcado de la actividad junto al guardado manual, sin escribir todavía. */
function unidadActividad_(informe,nombre){
  for(const value of [informe&&informe.activity,informe&&informe.exam,informe&&informe.activityTitle,nombre]){
    const text=String(value||'').trim();
    const match=/^(?:(?:DIW|DWEC|SSII)[\s·:/-]*)?(?:UD?|TEMA\s*)?0?(\d{1,2})(?=[-._\s]|$)/i.exec(text);
    if(match&&Number(match[1])>0)return Number(match[1]);
    const labelled=/\b(?:UD|UNIDAD|TEMA)\s*0?(\d{1,2})\b/i.exec(text);
    if(labelled&&Number(labelled[1])>0)return Number(labelled[1]);
  }
  return Number.isInteger(informe&&informe.unidad)&&informe.unidad>0&&informe.unidad<100?informe.unidad:null;
}
/** Copia individual de la revisión. No modifica el informe ni su checksum original. */
function codificarRevision_(codigo,analisis,id){
  if(!analisis)return codigo;
  try{
    if(typeof analisis!=='string'||analisis.length>50000)return codigo;
    const detail=JSON.parse(analisis);
    if(detail.format!=='base4-analysis-v1'||detail.submissionId!==id)return codigo;
    const text=JSON.stringify({format:'base4-review-v1',document:codigo,analysis:detail});
    return 'BASE4R1.'+Utilities.base64EncodeWebSafe(Utilities.gzip(Utilities.newBlob(text,'application/json')).getBytes()).replace(/=+$/,'');
  }catch{return codigo;}
}
function prepararVolcadoNota_(libro, origen, filaEditada, notaNueva, comentarioNuevo,decryptToken) {
  const destinos={DIW:'CuadranteDIW',DWEC:'CuadranteDWEC',SSII:'Cuadrante_SSII'};
  const tabla=origen.getDataRange().getValues(),cabeceras=tabla[0];
  const indice=(headers,name,opcional=false)=>{
    const matches=headers.map((v,i)=>nombreCabecera_(v)===nombreCabecera_(name)?i:-1).filter(i=>i>=0);
    if(matches.length!==1){if(opcional&&!matches.length)return -1;throw Error('SYNC_SCHEMA');}
    return matches[0];
  };
  const cols={id:indice(cabeceras,'ID',true),mod:indice(cabeceras,'MODULO'),actividad:indice(cabeceras,'Nombre de la práctica'),
    email:indice(cabeceras,'EMAIL'),fecha:indice(cabeceras,'DIA Y HORA [DD/MM/AA HH:MM:SS]'),
    enlace:indice(cabeceras,'PROBAR CODIGO'),informe:indice(cabeceras,'ENTREGA completa'),
    nota:indice(cabeceras,'nota'),comentario:indice(cabeceras,'Comentarios a la nota'),
    ia:indice(cabeceras,'NOTA IA',true),comentarioIA:indice(cabeceras,'COMENTARIOS IA',true),analisis:indice(cabeceras,'Análisis de la nota',true)};
  const editada=tabla[filaEditada-1],modulo=String(editada[cols.mod]).trim().toUpperCase(),actividad=String(editada[cols.actividad]).trim();
  if(!destinos[modulo]||!actividad)throw Error('SYNC_SCHEMA');
  editada[cols.nota]=notaNueva;
  if(comentarioNuevo!==undefined)editada[cols.comentario]=comentarioNuevo;
  const presente=v=>v!==''&&v!==null&&v!==undefined;
  const numero=v=>typeof v==='number'?v:/^-?\d+(?:[.,]\d+)?$/.test(String(v).trim())?Number(String(v).replace(',','.')):NaN;
  const fecha=v=>{
    if(v instanceof Date)return v.getTime();
    const m=/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(v));
    if(!m)throw Error('SYNC_DATE');
    return Date.UTC(Number(m[3])+(m[3].length===2?2000:0),Number(m[2])-1,Number(m[1]),Number(m[4]),Number(m[5]),Number(m[6]||0));
  };
  const alumnos=new Set(),emails=new Map(),ganadores=new Map(),unidades=new Set();
  for(let i=1;i<tabla.length;i++){
    const r=tabla[i];
    if(String(r[cols.mod]).trim().toUpperCase()!==modulo||String(r[cols.actividad]).trim()!==actividad)continue;
    const almacenado=String(r[cols.informe]||''),cifrado=almacenado.startsWith('SSII4E1.');
    const codigo=cifrado?codificarDocumento_(descifrarDocumento_(almacenado,decryptToken)):almacenado,informe=informeAlmacenado_(codigo);
    if(!informe)continue; // Los registros iniciales sin entrega no cuentan.
    const unidad=unidadActividad_(informe,actividad);if(unidad)unidades.add(unidad);
    const email=String(r[cols.email]||'').trim().toLowerCase(),usuario=email.split('@')[0];
    if(!usuario||!email.includes('@'))throw Error('SYNC_SCHEMA');
    if(emails.has(usuario)&&emails.get(usuario)!==email)throw Error('SYNC_ID');
    emails.set(usuario,email);alumnos.add(usuario);
    const valor=presente(r[cols.nota])?r[cols.nota]:cols.ia>=0?r[cols.ia]:'';
    if(!presente(valor))continue;
    const nota=numero(valor);
    if(!Number.isFinite(nota))throw Error('SYNC_GRADE');
    const id=String(cols.id>=0&&presente(r[cols.id])?r[cols.id]:informe.id);
    const comentario=presente(r[cols.comentario])?String(r[cols.comentario]):cols.comentarioIA>=0?String(r[cols.comentarioIA]||''):'';
    const candidato={id,usuario,nota,comentario,fecha:fecha(r[cols.fecha]),fila:i+1,codigo,cifrado,originalId:informe.id,...(cols.analisis>=0?{analisis:String(r[cols.analisis]||'')}:{})};
    const anterior=ganadores.get(usuario);
    if(!anterior||nota>anterior.nota||(nota===anterior.nota&&(candidato.fecha>anterior.fecha||(candidato.fecha===anterior.fecha&&id.localeCompare(anterior.id)>0))))ganadores.set(usuario,candidato);
  }
  if(alumnos.size<2)return {requests:[],estado:'excluida',mensaje:'Guardado en Entregas. Actividad de un único alumno: sin volcado al módulo ni al cuadrante.'};
  const destino=libro.getSheetByName(modulo),cuadrante=libro.getSheetByName(destinos[modulo]);
  if(!destino||!cuadrante)throw Error('SYNC_SCHEMA');
  const datos=destino.getDataRange().getValues(),titulos=datos[0],campos=['ID entrega','ID','Nombre actividad','Enlace','Nota','Comentario a la nota'];
  if(destino.getLastColumn()!==6||campos.some((t,i)=>nombreCabecera_(titulos[i])!==nombreCabecera_(t)))throw Error('SYNC_SCHEMA');
  const q=cuadrante.getDataRange().getValues();
  if(q.length<2||nombreCabecera_(q[1][0])!=='id')throw Error('SYNC_SCHEMA');
  const requests=[],borrar=[],existentes=new Map();
  for(let i=1;i<datos.length;i++){
    if(String(datos[i][2]).trim()!==actividad)continue;
    const usuario=String(datos[i][1]).trim().toLowerCase();
    if(!existentes.has(usuario))existentes.set(usuario,[]);
    existentes.get(usuario).push(i);
  }
  const celda=v=>({userEnteredValue:typeof v==='number'?{numberValue:v}:{stringValue:String(v)}});
  const escribir=(sheet,row,col,values,fields='userEnteredValue')=>requests.push({updateCells:{start:{sheetId:sheet.getSheetId(),rowIndex:row,columnIndex:col},rows:[{values}],fields}});
  const ampliar=(sheet,rows,columns)=>{
    if(rows>sheet.getMaxRows())requests.push({appendDimension:{sheetId:sheet.getSheetId(),dimension:'ROWS',length:rows-sheet.getMaxRows()}});
    if(columns>sheet.getMaxColumns())requests.push({appendDimension:{sheetId:sheet.getSheetId(),dimension:'COLUMNS',length:columns-sheet.getMaxColumns()}});
  };
  const nuevos=[...ganadores.keys()].filter(id=>!existentes.has(id));
  let siguiente=datos.length;
  ampliar(destino,siguiente+nuevos.length,6);
  for(const [usuario,filas] of existentes)if(!ganadores.has(usuario))borrar.push(...filas);
  for(const ganador of ganadores.values()){
    const filas=existentes.get(ganador.usuario)||[],row=filas.length?filas[0]:siguiente++;
    borrar.push(...filas.slice(1));
    if(!filas.length&&datos.length>1)requests.push({copyPaste:{source:{sheetId:destino.getSheetId(),startRowIndex:datos.length-1,endRowIndex:datos.length,startColumnIndex:0,endColumnIndex:6},destination:{sheetId:destino.getSheetId(),startRowIndex:row,endRowIndex:row+1,startColumnIndex:0,endColumnIndex:6},pasteType:'PASTE_FORMAT'}});
    const original=origen.getRange(ganador.fila,cols.enlace+1);
    const formula=original.getFormula(),rich=original.getRichTextValue();
    let enlace=rich&&rich.getLinkUrl();
    if(!enlace){const m=/^=HYPERLINK\(\s*"((?:[^"]|"")+)"/i.exec(formula);enlace=m?m[1].replace(/""/g,'"'):String(original.getValue()||'');}
    if(ganador.cifrado||!/^https:\/\/igarciafp\.github\.io\/base[34]\/(?:profesor|revisor)\.html(?:[?#]|$)/i.test(enlace)){
      enlace='https://igarciafp.github.io/base4/revisor.html#entrega='+ganador.codigo;
    }else enlace=enlace.replace(/\/base[34]\/(?:profesor|revisor)\.html/i,'/base4/revisor.html');
    if(ganador.analisis!==undefined)enlace='https://igarciafp.github.io/base4/revisor.html#entrega='+codificarRevision_(ganador.codigo,ganador.analisis,ganador.originalId);
    const values=[ganador.id,ganador.usuario,actividad,'Ver entrega',ganador.nota,ganador.comentario].map(celda);
    for(const c of values)c.textFormatRuns=[];
    values[3].textFormatRuns=[{startIndex:0,format:{link:{uri:enlace}}}];
    escribir(destino,row,0,values,'userEnteredValue,textFormatRuns');
  }
  const columnas=q[1].map((v,i)=>i>=2&&String(v).trim()===actividad?i:-1).filter(i=>i>=0);
  if(columnas.length>1)throw Error('SYNC_SCHEMA');
  let col=columnas.length?columnas[0]:Math.max(2,q[1].length);
  if(unidades.size>1)throw Error('SYNC_UNIT');
  const tema=unidades.size?[...unidades][0]:unidadActividad_(null,actividad);
  if(!tema)throw Error('SYNC_UNIT');
  const ids=new Set(),roster=[];
  for(let i=2;i<q.length;i++){
    const id=String(q[i][0]||'').trim().toLowerCase();
    if(!id)throw Error('SYNC_SCHEMA');
    if(ids.has(id))throw Error('SYNC_ID');
    ids.add(id);roster.push(id);
  }
  const added=[...ganadores.keys()].filter(id=>!ids.has(id));roster.push(...added);
  ampliar(cuadrante,roster.length+2,col+1);
  if(!columnas.length&&col>2)requests.push({copyPaste:{source:{sheetId:cuadrante.getSheetId(),startRowIndex:0,endRowIndex:q.length,startColumnIndex:col-1,endColumnIndex:col},destination:{sheetId:cuadrante.getSheetId(),startRowIndex:0,endRowIndex:q.length,startColumnIndex:col,endColumnIndex:col+1},pasteType:'PASTE_FORMAT'}});
  for(let i=0;i<added.length;i++){
    const row=q.length+i;
    if(q.length>2)requests.push({copyPaste:{source:{sheetId:cuadrante.getSheetId(),startRowIndex:q.length-1,endRowIndex:q.length,startColumnIndex:0,endColumnIndex:Math.max(col+1,q[1].length)},destination:{sheetId:cuadrante.getSheetId(),startRowIndex:row,endRowIndex:row+1,startColumnIndex:0,endColumnIndex:Math.max(col+1,q[1].length)},pasteType:'PASTE_FORMAT'}});
    escribir(cuadrante,row,0,[celda(added[i])]);
  }
  escribir(cuadrante,0,col,[celda(tema)]);escribir(cuadrante,1,col,[celda(actividad)]);
  roster.forEach((id,i)=>escribir(cuadrante,i+2,col,[celda(ganadores.get(id)?.nota??0)]));
  // Se borran al final y de abajo arriba para que los índices de escritura no se desplacen.
  [...new Set(borrar)].sort((a,b)=>b-a).forEach(row=>requests.push({deleteDimension:{range:{sheetId:destino.getSheetId(),dimension:'ROWS',startIndex:row,endIndex:row+1}}}));
  return {requests,estado:'actualizado',mensaje:'Nota y comentarios guardados. '+modulo+' y '+destinos[modulo]+' actualizados.'};
}
