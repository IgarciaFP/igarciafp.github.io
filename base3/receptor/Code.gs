/**
 * Receptor de entregas de base3. Instalar VINCULADO a la hoja de cálculo de entregas
 * (Extensiones → Apps Script). Escribe con la cuenta del propietario: la hoja no se comparte.
 * Añade una fila por entrega en la pestaña «Entregas», columnas A a I. No toca las demás.
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
  try { comprobarCabeceras_(libro.getSheetByName(PESTANA_)); } catch (error) { throw Error('La hoja «' + libro.getName() + '» no tiene una pestaña «' + PESTANA_ + '» con las cabeceras esperadas en las columnas A a I.'); }
  console.log('Todo correcto. Las entregas se escribirán en «' + libro.getName() + '», pestaña «' + PESTANA_ + '». Publica una versión nueva de la aplicación web.');
}

const igual_ = texto => String(texto).replace(/\s+/g, ' ').trim().toLowerCase();
function comprobarCabeceras_(hoja) {
  if (!hoja) throw Error('SCHEMA');
  const fila = hoja.getRange(1, 1, 1, CABECERAS_.length).getValues()[0];
  if (CABECERAS_.some((cabecera, i) => igual_(fila[i]) !== igual_(cabecera))) throw Error('SCHEMA');
}
function doGet(e) {
  const practica = e?.parameter?.practice || '', canal = e?.parameter?.channel || '';
  if (!PRACTICA_.test(practica) || !/^[a-f0-9]{32}$/.test(canal)) return HtmlService.createHtmlOutput('Receptor de entregas. Accede desde el laboratorio.');
  const plantilla = HtmlService.createTemplateFromFile('Bridge');
  plantilla.settings = JSON.stringify({ origin: ORIGEN_, practiceId: practica, channel: canal }).replace(/</g, '\\u003c');
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
function controlEntrega_(datos) {
  const sello = datos.sello;
  const avisos = [];
  if (sello?.accesoSinComprobar === true) avisos.push('acceso sin comprobar');
  if (!sello || sello.error || typeof sello.ip !== 'string' || !/^[0-9a-fA-F.:]{3,45}$/.test(sello.ip))
    return { ip: '', avisos: [...avisos, 'SIN COMPROBAR'] };
  if (huella_(JSON.stringify([datos.exam, datos.email, datos.answers])) !== sello.huella || sello.email !== datos.email)
    return { ip: '', avisos: [...avisos, 'SELLO NO VÁLIDO'] };
  let verificado = false;
  if (SERVIDOR_) {
    try {
      const respuesta = UrlFetchApp.fetch(SERVIDOR_ + '/verificar', {
        method: 'post', contentType: 'application/json',
        payload: JSON.stringify({ sello }), muteHttpExceptions: true
      });
      if (respuesta.getResponseCode() === 200) {
        if (JSON.parse(respuesta.getContentText()).valido !== true)
          return { ip: '', avisos: [...avisos, 'SELLO NO VÁLIDO'] };
        verificado = true;
      }
    } catch (error) { /* Se conserva la entrega y se avisa de que no pudo verificarse. */ }
  }
  if (!verificado) avisos.push('sello sin verificar');
  if (sello.enRed !== true) avisos.push('FUERA DE LA RED');
  if (sello.enHorario !== true) avisos.push('FUERA DE HORARIO');
  if (sello.profesor === true) avisos.push('clave del profesor');
  return { ip: sello.ip, avisos };
}
function incidencias_(datos, control) {
  const partes = [(Number.isFinite(datos.incidents) ? datos.incidents : '?') + '/3'];
  if (datos.finishReason === 'incident-limit') partes.push('cierre automático');
  partes.push(...control.avisos);
  return partes.join(' · ');
}
/** Mismo documento que descarga el alumno: informe comprimido (gzip) y codificado. */
function documento_(sobre) {
  const contenido = sobre.payload + '\nCódigo de comprobación: ' + FORMATO_.comprobacion + sobre.submissionId;
  return FORMATO_.informe + Utilities.base64EncodeWebSafe(Utilities.gzip(Utilities.newBlob(contenido, 'text/plain')).getBytes()).replace(/=+$/, '');
}
const literal_ = valor => ({ userEnteredValue: { stringValue: String(valor ?? '') } });

/** Única función de escritura expuesta al navegador. Nunca devuelve entregas ajenas. */
function recibirEntrega(sobre) {
  let cerrojo;
  try {
    const datos = validarEntrega_(sobre);
    cerrojo = LockService.getScriptLock();
    if (!cerrojo.tryLock(25000)) throw Error('BUSY');
    const libro = libro_(), id = libro.getId(), hoja = libro.getSheetByName(PESTANA_);
    comprobarCabeceras_(hoja);
    const codigo = documento_(sobre), cabe = codigo.length <= 45000 && /^[A-Za-z0-9._-]+$/.test(codigo);
    const ultima = hoja.getLastRow();
    // Reenviar la misma entrega no añade otra fila.
    if (cabe && ultima > 1 && hoja.getRange(2, 9, ultima - 1, 1).createTextFinder(codigo).matchEntireCell(true).matchCase(true).findNext())
      return { ok: true, submissionId: sobre.submissionId, receivedAt: new Date().toISOString(), duplicate: true };
    const ahora = new Date(), segundos = Math.floor(datos.seconds);
    const control = controlEntrega_(datos);
    const fila = [
      literal_(Utilities.formatDate(ahora, 'Europe/Madrid', 'dd/MM/yy HH:mm:ss')),
      literal_(datos.module), literal_(datos.activityTitle), literal_(datos.email.toLowerCase()),
      // El código solo contiene letras, cifras, punto, guion y guion bajo: no puede alterar la fórmula.
      // Los argumentos se separan con punto y coma: es válido en todas las configuraciones regionales
      // (con coma, las hojas en español dan #ERROR!).
      cabe ? { userEnteredValue: { formulaValue: '=HYPERLINK("' + PAGINA_PROFESOR_ + '#entrega=' + codigo + '";"Probar código")' } } : literal_('Pide el archivo TXT al alumno'),
      literal_(Math.floor(segundos / 60) + ' min ' + String(segundos % 60).padStart(2, '0') + ' s'),
      literal_(control.ip), literal_(incidencias_(datos, control)),
      literal_(cabe ? codigo : 'Entrega demasiado larga para una celda: pide el archivo TXT al alumno.')
    ];
    Sheets.Spreadsheets.batchUpdate({ requests: [{ appendCells: { sheetId: hoja.getSheetId(), rows: [{ values: fila }], fields: 'userEnteredValue' } }] }, id);
    return { ok: true, submissionId: sobre.submissionId, receivedAt: ahora.toISOString(), duplicate: false };
  } catch (error) {
    const conocidos = ['INVALID', 'HASH', 'EMAIL', 'ROUTE', 'SCHEMA', 'BUSY'];
    return { ok: false, code: conocidos.includes(error.message) ? error.message : 'STORAGE' };
  } finally { if (cerrojo?.hasLock()) cerrojo.releaseLock(); }
}
