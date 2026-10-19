/** Receptor de laboratorios. Instalar vinculado a la hoja elegida por el docente. */
const CONFIGURACION_ = [{
  practiceId: 'SSII-UD01', versions: ['1'], spreadsheetId: '',
  origin: 'https://igarciafp.github.io', emailDomain: 'g.educaand.es'
}];
const CABECERAS_ = {
  Entregas: ['ID entrega','Recepción servidor (UTC)','Email','Nombre','Grupo','Práctica','Versión','Idioma','Finalización cliente (UTC)','Segundos','Incidencias declaradas','Estado','Respuestas'],
  Respuestas: ['ID entrega','Email','Práctica','Versión','Pregunta','Respuesta','Comprobación cliente'],
  DatosEntrega: ['ID entrega','Parte','JSON original'],
  Calificaciones: ['Email','Nota','Comentario','Práctica','Versión','ID entrega']
};

/** Ejecutar una vez desde el editor. El sufijo _ impide invocarlo desde google.script.run. */
function configurarReceptor_() {
  const routes = {};
  for (const item of CONFIGURACION_) {
    const id = item.spreadsheetId || SpreadsheetApp.getActiveSpreadsheet()?.getId();
    if (!id || !item.practiceId || !item.versions.length || !/^https:\/\/[^/]+$/.test(item.origin))
      throw Error('Completa CONFIGURACION_ y vincula el script a la hoja.');
    const book = SpreadsheetApp.openById(id);
    for (const [name, headers] of Object.entries(CABECERAS_)) {
      let sheet = book.getSheetByName(name);
      if (!sheet) sheet = book.insertSheet(name);
      if (!sheet.getLastRow()) {
        sheet.getRange(1,1,1,headers.length).setValues([headers]);
        sheet.getRange(1,1,1,headers.length).setBackground('#eeeeee').setFontWeight('bold').setWrap(true);
        sheet.setFrozenRows(1);
        sheet.setColumnWidths(1,headers.length,180);
        if (name==='Respuestas') sheet.setColumnWidth(6,440);
        if (name==='Calificaciones') sheet.setColumnWidth(3,440);
      }
      comprobarCabeceras_(sheet, headers);
    }
    routes[item.practiceId] = {...item, spreadsheetId:id};
  }
  PropertiesService.getScriptProperties().setProperty('LAB_ROUTES',JSON.stringify(routes));
  SpreadsheetApp.flush();
  console.log('Receptor configurado. Publica como aplicación web y copia la URL /exec a contenido/config.json.');
}
function rutas_() {
  return JSON.parse(PropertiesService.getScriptProperties().getProperty('LAB_ROUTES') || '{}');
}
function comprobarCabeceras_(sheet, headers) {
  if (!sheet || JSON.stringify(sheet.getRange(1,1,1,headers.length).getValues()[0])!==JSON.stringify(headers))
    throw Error('SCHEMA');
}
function doGet(e) {
  const route=rutas_()[e?.parameter?.practice];
  const channel=e?.parameter?.channel || '';
  if (!route || !/^[a-f0-9]{32}$/.test(channel)) return HtmlService.createHtmlOutput('Receptor de laboratorios. Accede desde la práctica.');
  const template=HtmlService.createTemplateFromFile('Bridge');
  template.settings=JSON.stringify({origin:route.origin,practiceId:route.practiceId,channel}).replace(/</g,'\\u003c');
  return template.evaluate().setTitle('Entrega de laboratorio').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function huella_(text) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,text,Utilities.Charset.UTF_8)
    .map(b=>(b & 255).toString(16).padStart(2,'0')).join('');
}
function texto_(value,max,empty=false) {
  if (typeof value!=='string' || value.length>max || (!empty&&!value.trim())) throw Error('INVALID');
  return value;
}
function validarEntrega_(envelope,route) {
  if (envelope.protocol!==1 || !/^[a-f0-9]{64}$/.test(envelope.submissionId || '') ||
    typeof envelope.payload!=='string' || envelope.payload.length>500000 ||
    !route.versions.includes(envelope.practiceVersion)) throw Error('INVALID');
  if (huella_(envelope.payload)!==envelope.submissionId) throw Error('HASH');
  const data=JSON.parse(envelope.payload);
  if (data.exam!==envelope.practiceId || data.activityVersion!==envelope.practiceVersion || data.version!==3) throw Error('INVALID');
  texto_(data.name,160);texto_(data.email,254);texto_(data.group,60,true);texto_(data.notes,2400,true);
  if (!/^[^\s@]+@[^\s@]+$/.test(data.email) || data.email.split('@')[1].toLowerCase()!==route.emailDomain.toLowerCase()) throw Error('EMAIL');
  if (!['es','en'].includes(data.language) || !Number.isFinite(Date.parse(data.finishedAt)) ||
    !Number.isFinite(data.seconds) || data.seconds<0 || data.seconds>31536000 ||
    !Array.isArray(data.answers) || data.answers.length<1 || data.answers.length>500) throw Error('INVALID');
  const seen=new Set();
  for (const answer of data.answers) {
    texto_(answer.question,100);texto_(answer.answer,10000,true);
    if (seen.has(answer.question) || !['pending','teacher-review','correct','review'].includes(answer.status)) throw Error('INVALID');
    seen.add(answer.question);
  }
  return data;
}
function celda_(value) {
  // Escribir stringValue conserva literalmente incluso respuestas que empiezan por '='.
  return {userEnteredValue:typeof value==='number'?{numberValue:value}:{stringValue:String(value ?? '')}};
}
function anexar_(sheetId,rows) {
  return {appendCells:{sheetId,rows:rows.map(row=>({values:row.map(celda_)})),fields:'userEnteredValue'}};
}
/** Única función de escritura expuesta al navegador. Nunca devuelve respuestas ajenas. */
function recibirEntrega(envelope) {
  let lock;
  try {
    const route=rutas_()[envelope?.practiceId];
    if (!route) throw Error('ROUTE');
    const data=validarEntrega_(envelope,route);
    lock=LockService.getScriptLock();
    if (!lock.tryLock(25000)) throw Error('BUSY');
    const book=SpreadsheetApp.openById(route.spreadsheetId), sheets={};
    for (const [name,headers] of Object.entries(CABECERAS_)) {
      sheets[name]=book.getSheetByName(name);comprobarCabeceras_(sheets[name],headers);
    }
    const index=sheets.Entregas, last=index.getLastRow();
    const existing=last>1?index.getRange(2,1,last-1,1).createTextFinder(envelope.submissionId).matchEntireCell(true).findNext():null;
    if (existing) {
      const receivedAt=index.getRange(existing.getRow(),2).getValue();
      return {ok:true,submissionId:envelope.submissionId,receivedAt:String(receivedAt),duplicate:true};
    }
    const receivedAt=new Date().toISOString(), id=envelope.submissionId;
    const count=Number.isFinite(data.incidents)?data.incidents:'';
    const rows=data.answers.map(a=>[id,data.email.toLowerCase(),data.exam,data.activityVersion,a.question,a.answer,a.status]);
    const chunks=[];
    for(let i=0;i<envelope.payload.length;){
      let end=Math.min(i+40000,envelope.payload.length);
      if(end<envelope.payload.length && /[\uD800-\uDBFF]/.test(envelope.payload[end-1]))end--;
      chunks.push([id,chunks.length+1,envelope.payload.slice(i,end)]);i=end;
    }
    // Las tres escrituras forman una única operación atómica; no hay entregas parciales.
    Sheets.Spreadsheets.batchUpdate({requests:[
      anexar_(sheets.Respuestas.getSheetId(),rows),
      anexar_(sheets.DatosEntrega.getSheetId(),chunks),
      anexar_(index.getSheetId(),[[id,receivedAt,data.email.toLowerCase(),data.name,data.group,data.exam,data.activityVersion,data.language,data.finishedAt,data.seconds,count,'Pendiente de corrección',rows.length]])
    ]},route.spreadsheetId);
    return {ok:true,submissionId:id,receivedAt,duplicate:false};
  } catch(error) {
    const known=['INVALID','HASH','EMAIL','ROUTE','SCHEMA','BUSY'];
    return {ok:false,code:known.includes(error.message)?error.message:'STORAGE'};
  } finally { if(lock?.hasLock())lock.releaseLock(); }
}
