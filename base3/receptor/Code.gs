/**
 * Receptor de entregas de base3. Instalar VINCULADO a la hoja de cálculo de entregas
 * (Extensiones → Apps Script). Escribe con la cuenta del propietario: la hoja no se comparte.
 * Añade una fila por entrega en «Entregas», columnas identificadas por sus cabeceras.
 * La revisión autenticada consulta y modifica «nota» y «Comentarios a la nota».
 */
const ORIGEN_ = 'https://igarciafp.github.io';     // sitio del laboratorio
const DOMINIO_ = 'g.educaand.es';                  // dominio de correo admitido
const PAGINA_PROFESOR_ = 'https://igarciafp.github.io/base3/profesor.html';
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
  const sello=datos.sello,avisos=[],exigir=politica.restringirHorario||politica.restringirIPs;
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
      const response=UrlFetchApp.fetch(SERVIDOR_+'/verificar',{method:'post',contentType:'application/json',payload:JSON.stringify({sello}),muteHttpExceptions:true});
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
  const redPermitida=enRed(sello.ip,politica.redes);
  if(politica.restringirIPs&&!redPermitida)throw Error('NETWORK_DENIED');
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
/** Mismo documento que descarga el alumno: informe comprimido (gzip) y codificado. */
function documento_(sobre) {
  const contenido = sobre.payload + '\nCódigo de comprobación: ' + FORMATO_.comprobacion + sobre.submissionId;
  return FORMATO_.informe + Utilities.base64EncodeWebSafe(Utilities.gzip(Utilities.newBlob(contenido, 'text/plain')).getBytes()).replace(/=+$/, '');
}

/** Configuración publicada por el profesor; nunca se acepta el límite enviado por el alumno. */
function errorConfiguracion_(detalle) {
  const error = Error('ACTIVITY_CONFIG');
  error.detail = detalle;
  return error;
}
function configuracionActividad_(datos) {
  if (!/^(DIW|DWEC|SSII)$/.test(datos.module) || !/^[a-z0-9][a-z0-9-]{0,59}$/.test(datos.activity)) throw Error('INVALID');
  const url=ORIGEN_+'/base3/actividades/'+datos.module.toLowerCase()+'/'+datos.activity+'/config.json';
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
    if(respuesta.getResponseCode()===404)return {entregas:1,redes:['185.197.0.0/16','88.16.0.0/16'],restringirHorario:false,restringirIPs:false};
    if(respuesta.getResponseCode()!==200)throw errorConfiguracion_('HTTP '+respuesta.getResponseCode()+' al descargar '+url);
    let config;
    try{config=JSON.parse(respuesta.getContentText());}catch{throw errorConfiguracion_('La respuesta de '+url+' no es JSON válido.');}
    if(!config||typeof config!=='object'||Array.isArray(config))throw errorConfiguracion_('config.json debe contener un objeto.');
    const limite=config.entregas===undefined?1:config.entregas;
    if(!Number.isSafeInteger(limite)||limite<0)throw errorConfiguracion_('entregas debe ser un entero mayor o igual a 0.');
    const redes=config.redes===undefined?['185.197.0.0/16','88.16.0.0/16']:config.redes;
    const restringirHorario=config.restringirHorario??false,restringirIPs=config.restringirIPs??false;
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
    return {exam:report.exam,email:String(report.email).toLowerCase(),id};
  }catch{return null;}
}
function entregasAnteriores_(hoja,datos,id) {
  const total=hoja.getLastRow()-1,email=datos.email.toLowerCase();
  if(total<1)return {count:0,duplicate:false};
  const columnas=comprobarCabeceras_(hoja);
  const filas=hoja.getRange(2,1,total,hoja.getLastColumn()).getValues().map(fila=>columnas.slice(1).map(col=>fila[col-1]));
  const notas=hoja.getRange(2,columnas[8],total,1).getNotes();
  let count=0,duplicate=false;
  for(let i=0;i<filas.length;i++){
    const fila=filas[i];
    if(String(fila[0])!==datos.module||String(fila[2]).trim().toLowerCase()!==email)continue;
    let meta=null;
    try{const n=JSON.parse(notas[i][0]);if((n?.base3===1&&/^[a-f0-9]{64}$/.test(n.id))||n?.base3===2)meta=n;}catch{}
    meta=meta||informeAlmacenado_(fila[7]);
    if(meta&&meta.exam===datos.exam&&meta.email===email){count++;if(meta.id===id)duplicate=true;}
    // Entregas antiguas demasiado largas: solo queda el título en la hoja.
    else if(!meta&&String(fila[1])===datos.activityTitle)count++;
  }
  return {count,duplicate};
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
  if(meta.base3!==2||meta.exam!==datos.exam||meta.email!==datos.email.toLowerCase()||meta.tokenHash!==huella_(sobre.attemptToken))throw Error('INVALID');
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
    if(existing)return {ok:true,attemptId:datos.attemptId,number:existing.meta.number,limit:politica.entregas};
    const number=entregasAnteriores_(hoja,datos,'').count+1,ahora=new Date();
    // El inicio registra los avisos; las restricciones se aplican al enviar.
    const control=controlEntrega_(datos,{...politica,restringirIPs:false,restringirHorario:false});
    const meta={base3:2,exam:datos.exam,email:datos.email.toLowerCase(),attemptId:datos.attemptId,
      number,tokenHash:huella_(sobre.attemptToken),status:'started',startedAt:ahora.toISOString(),initialIP:control.ip};
    let values=Array.from({length:9},()=>literal_(''));
    values[0]=literal_(Utilities.formatDate(ahora,'Europe/Madrid','dd/MM/yy HH:mm:ss'));
    values[1]=literal_(datos.module);values[2]=literal_(datos.activityTitle);values[3]=literal_(meta.email);
    values[6]=literal_(control.ip);values[7]=literal_(['INICIADA · pendiente de entrega',...control.avisos].join(' · '));
    values[8]={...literal_(''),note:JSON.stringify(meta)};
    values=distribuirFila_(hoja,values);
    values[columnas[0]-1]=literal_(datos.attemptId);values[columnas[1]-1]={userEnteredValue:{numberValue:number}};
    Sheets.Spreadsheets.batchUpdate({requests:[{appendCells:{sheetId:hoja.getSheetId(),rows:[{values}],fields:'userEnteredValue,note'}}]},libro.getId());
    return {ok:true,attemptId:datos.attemptId,number,limit:politica.entregas};
  }catch(error){return {ok:false,code:['INVALID','EMAIL','HASH','BUSY','SCHEMA','ROUTE','ACTIVITY_CONFIG','AMBIGUOUS'].includes(error.message)?error.message:'STORAGE'};}
  finally{if(lock?.hasLock())lock.releaseLock();}
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
    const codigo = documento_(sobre), cabe = codigo.length <= 45000 && /^[A-Za-z0-9._-]+$/.test(codigo);
    const intento=datos.attemptId?buscarIntento_(hoja,sobre,datos,columnasIntento_(hoja)):null;
    if(datos.attemptId&&!intento)throw Error('NOT_STARTED');
    if(intento?.meta.status==='submitted'){
      if(intento.meta.id!==sobre.submissionId)throw Error('ALREADY_SUBMITTED');
      return {ok:true,submissionId:sobre.submissionId,receivedAt:intento.meta.receivedAt,duplicate:true};
    }
    const anteriores=entregasAnteriores_(hoja,datos,sobre.submissionId);
    if(anteriores.duplicate)
      return {ok:true,submissionId:sobre.submissionId,receivedAt:new Date().toISOString(),duplicate:true};
    const politica=configuracionActividad_(datos),limite=politica.entregas,adicional=intento?intento.meta.number>limite:anteriores.count>=limite;
    const motivo=typeof datos.revisionReason==='string'?datos.revisionReason.trim():'';
    if(motivo.length>2000)throw Error('INVALID');
    if(adicional&&(datos.attemptId||datos.finishReason==='voluntary')&&(motivo.match(/\p{L}/gu)||[]).length<20)throw Error('REVISION_REASON');
    const ahora = new Date(), segundos = Math.floor(datos.seconds);
    const control = controlEntrega_(datos,politica);
    if(adicional)control.avisos.push('entrega adicional: no sustituye ni actualiza la nota anterior');
    if(intento&&control.ip!==intento.meta.initialIP)control.avisos.push('IP de entrega: '+(control.ip||'sin comprobar'));
    if(motivo)control.avisos.push('Motivo de revisión: '+motivo);
    const fila = [
      literal_(Utilities.formatDate(ahora, 'Europe/Madrid', 'dd/MM/yy HH:mm:ss')),
      literal_(datos.module), literal_(datos.activityTitle), literal_(datos.email.toLowerCase()),
      // El código solo contiene letras, cifras, punto, guion y guion bajo: no puede alterar la fórmula.
      // Los argumentos se separan con punto y coma: es válido en todas las configuraciones regionales
      // (con coma, las hojas en español dan #ERROR!).
      cabe ? { userEnteredValue: { formulaValue: '=HYPERLINK("' + PAGINA_PROFESOR_ + '#entrega=' + codigo + '";"Probar código")' } } : literal_('Pide el archivo TXT al alumno'),
      literal_(Math.floor(segundos / 60) + ' min ' + String(segundos % 60).padStart(2, '0') + ' s'),
      literal_(control.ip), literal_(incidencias_(datos, control)),
      {...literal_(cabe ? codigo : 'Entrega demasiado larga para una celda: pide el archivo TXT al alumno.'),
        note:JSON.stringify({base3:1,exam:datos.exam,email:datos.email.toLowerCase(),id:sobre.submissionId,adicional})}
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
    const conocidos = ['INVALID', 'HASH', 'EMAIL', 'ROUTE', 'SCHEMA', 'BUSY', 'ACTIVITY_CONFIG', 'REVISION_REASON', 'CONTROL_REQUIRED', 'CONTROL_INVALID', 'CONTROL_UNAVAILABLE', 'NETWORK_DENIED', 'SCHEDULE_DENIED', 'NOT_STARTED', 'ALREADY_SUBMITTED', 'AMBIGUOUS'];
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
    respuesta = UrlFetchApp.fetch(SERVIDOR_ + '/acceso?a=diw/revision&clave=' + encodeURIComponent(clave), { muteHttpExceptions: true });
    if (respuesta.getResponseCode() !== 200) throw Error('AUTH');
    if (JSON.parse(respuesta.getContentText()).profesor !== true) throw Error('AUTH');
  } catch (error) { throw Error('AUTH'); }
}
function sesionProfesor_(token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw Error('SESSION');
  const propiedades = PropertiesService.getScriptProperties(), nombre = 'PROF_SESSION_' + huella_(token);
  const expiresAt = Number(propiedades.getProperty(nombre));
  if (!expiresAt || expiresAt <= Date.now()) { propiedades.deleteProperty(nombre); throw Error('SESSION'); }
  return { propiedades, nombre, expiresAt };
}
function iniciarSesionProfesor_(clave) {
  autenticarProfesor_(clave);
  const propiedades = PropertiesService.getScriptProperties();
  // Retirar las sesiones caducadas sin tocar otras propiedades del proyecto.
  for (const [nombre, valor] of Object.entries(propiedades.getProperties()))
    if (nombre.startsWith('PROF_SESSION_') && Number(valor) <= Date.now()) propiedades.deleteProperty(nombre);
  const token = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  const expiresAt = Date.now() + SESION_DIAS_ * 86400000;
  propiedades.setProperty('PROF_SESSION_' + huella_(token), String(expiresAt));
  return { ok: true, token, expiresAt };
}
/** Identifica la entrega por el hash del informe, también para archivos TXT descargados. */
function filaDeEntrega_(hoja, id) {
  if (!/^[a-f0-9]{64}$/.test(id || '')) throw Error('INVALID');
  const total = hoja.getLastRow() - 1;
  if (total < 1) throw Error('NOT_FOUND');
  const valores = hoja.getRange(2, comprobarCabeceras_(hoja)[8], total, 1).getValues();
  const marcador = '\nCódigo de comprobación: ' + FORMATO_.comprobacion;
  let encontrada = 0;
  for (let i = 0; i < valores.length; i++) {
    const codigo = String(valores[i][0] || '');
    if (!codigo.startsWith(FORMATO_.informe)) continue;
    let coincide = false;
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
/** Todas las consultas y escrituras de notas requieren una sesión validada aquí. */
function gestionarNota(pedido) {
  let cerrojo;
  try {
    if (!pedido || typeof pedido !== 'object') throw Error('INVALID');
    if (pedido.action === 'login') return iniciarSesionProfesor_(pedido.key);
    const sesion = sesionProfesor_(pedido.token);
    if (pedido.action === 'logout') { sesion.propiedades.deleteProperty(sesion.nombre); return { ok: true }; }
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
    const actual = estadoNota_(celda, celdaComentarios);
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
    Sheets.Spreadsheets.batchUpdate({ requests }, libro.getId());
    SpreadsheetApp.flush();
    return { ok: true, submissionId: pedido.submissionId, ...estadoNota_(celda, celdaComentarios) };
  } catch (error) {
    const conocidos = ['AUTH', 'AUTH_CONFIG', 'SESSION', 'INVALID', 'BUSY', 'SCHEMA', 'ROUTE', 'NOT_FOUND', 'AMBIGUOUS', 'GRADE_COLUMN', 'COMMENTS_COLUMN'];
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
      email,activityTitle:typeof pedido.activityTitle==='string'?pedido.activityTitle:''};
    const limite=limiteActividad_(datos),hoja=libro_().getSheetByName(PESTANA_);
    comprobarCabeceras_(hoja);
    const anteriores=entregasAnteriores_(hoja,datos,'');
    return {ok:true,practiceId:pedido.practiceId,email,used:anteriores.count,limit:limite};
  }catch(error){
    const conocidos=['INVALID','EMAIL','SCHEMA','ROUTE','ACTIVITY_CONFIG'];
    return {ok:false,code:conocidos.includes(error.message)?error.message:'STORAGE'};
  }
}

