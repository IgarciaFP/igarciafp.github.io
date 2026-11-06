import glosarioTecnico from "./glosario-tecnico.json" with { type: "json" };
import * as acorn from "acorn";
import postcss from "postcss";
import * as parse5 from "parse5";

/**
 * Índice heurístico de revisión; NO es una probabilidad calibrada de uso de IA.
 * Nunca ejecuta el código del alumno ni descarga sus recursos.
 *
 * contenido: string clasificado automáticamente, preparación reutilizable,
 *            o { texto: "...", javascript: "...", css: "...", html: "..." }.
 * lenguajes: "", "texto + javascript", "JS Css", "HTML+css", etc.
 * opciones: { pesos: {id: numero}, desactivadas: [id], umbrales: {...} }
 *
 * Con contenido mixto usa bloques Markdown etiquetados o un objeto explícito.
 * El HTML solo extrae script/style: no carga src/href ni analiza handlers/style
 * de atributos. No admite JSX ni TypeScript.
 */
const EVALUACIONES_PROSA = Symbol("evaluacionesProsa");

export const PESOS = Object.freeze({
  sin_comentarios: 100, caracteres_especiales: 60,
  comentarios_mayuscula: 10, indentacion_par: 10,
  comentarios_abundantes: 10, comentarios_sin_puntos: 10,
  comentarios_punto_final: 10, comentarios_largos: 10, comentarios_longitud_similar: 10,
  comentarios_antes_funciones: 10, comentarios_separadores: 10,
  comentarios_pasos: 10, comentarios_etiquetas: 10,
  comentarios_jsdoc: 10, comentarios_repetidos: 10,
  comentarios_conversacionales: 10, comentarios_instrucciones: 10,
  menciones_ia: 10, ausencia_faltas: 25,
  espacios_invisibles: 10, emojis_comentarios: 10,
  lineas_largas: 10, sangria_uniforme: 10, espaciado_uniforme: 10, comillas_uniformes: 10,
  bloques_markdown: 10, encabezados_markdown: 10,
  sintaxis_configurable: 10, metodos_configurables: 10,
  estructuras_configurables: 10, validaciones_repetidas: 10,
  muchos_try_catch: 10, envoltorio_iife: 10,
  mensajes_prefijados: 10, identificadores_largos: 10,
  nombres_pendientes: 10, urls_ejemplo: 10,
  html_comentarios_secciones: 10, html_textos_provisionales: 10,
  html_atributos_configurables: 10,
  css_variables: 10, css_funciones_configurables: 10,
  css_reglas_configurables: 10, css_nombres_bem: 10
});

// Excluye letras españolas, signos ¿¡, símbolos habituales de programación,
// acentos graves, @, #, €, barras y comillas rectas.
// Son caracteres de una lista de vigilancia, no caracteres imposibles de teclear.
// Invisibles y emojis se contabilizan con sus propias reglas.
export const CARACTERES_ESPECIALES = "“”‘’«»‹›„‚—–…→←↑↓↔⇒⇐⇔✓✔✗✘•‣⁃";
export const UMBRALES = Object.freeze({
  minComentarios: 2, minSangrias: 3, minCadenas: 5,
  proporcionUniversal: 0.95, proporcionLongitudSimilar: 0.95,
  minComentariosLongitud: 3, toleranciaLongitud: 0.25,
  minComentariosEspaciado: 3, proporcionEspaciado: 0.8,
  minSeparadores: 2, densidadComentarios: 0.2,
  longitudComentario: 120, proporcionComentariosLargos: 0.5,
  minPasos: 3, minEtiquetas: 2, minJSDoc: 2,
  longitudComentarioRepetido: 20, longitudLinea: 120,
  minLineasLargas: 1, validacionesPor100Lineas: 5,
  proporcionTryCatch: 0.5, longitudIdentificador: 25,
  proporcionIdentificadoresLargos: 0.2, minIdentificadores: 5,
  minBEM: 2
});

export function seleccionarLenguajes(valor = "") {
  if (typeof valor !== "string") throw new TypeError("lenguajes debe ser un string");
  const normal = valor.toLowerCase().replace(/javascript/g, "js").replace(/text(?:o)?|txt/g, "texto").replace(/[\s+,;|/\-]+/g, "");
  const encontrados = normal.match(/texto|html|css|js/g) || [];
  if (normal.replace(/texto|html|css|js/g, "")) {
    throw new TypeError("Usa texto, javascript (o js), html y css, juntos o separados");
  }
  return [...new Set(encontrados)];
}

function recorrer(nodo, visita) {
  if (!nodo || typeof nodo !== "object") return;
  if (typeof nodo.type === "string") visita(nodo);
  for (const [clave, valor] of Object.entries(nodo)) {
    if (clave === "loc") continue;
    if (Array.isArray(valor)) valor.forEach(n => recorrer(n, visita));
    else if (valor && typeof valor === "object") recorrer(valor, visita);
  }
}

function predominio(valores, proporcionExigida) {
  const frecuencias = new Map();
  for (const valor of valores) frecuencias.set(valor, (frecuencias.get(valor) || 0) + 1);
  const dominante = [...frecuencias].sort((a, b) => b[1] - a[1])[0];
  return { dominante: dominante?.[0] ?? null, coinciden: dominante?.[1] ?? 0,
    total: valores.length, proporcion: valores.length ? (dominante?.[1] ?? 0) / valores.length : 0,
    proporcionExigida };
}

function leerHTML(texto) {
  const arbol = parse5.parse(texto, { sourceCodeLocationInfo: true });
  const comentarios = [], elementos = [], bloques = [], textos = [];
  function visita(n) {
    const p = n.sourceCodeLocation;
    if (n.nodeName === "#comment" && p) {
      comentarios.push({ text: n.data, start: p.startOffset, end: p.endOffset });
    }
    if (n.tagName && p) elementos.push(n);
    if (n.nodeName === "#text" && p) textos.push({ text: n.value, start: p.startOffset, end: p.endOffset });
    if (["script", "style"].includes(n.tagName) && p?.startTag) {
      const inicio = p.startTag.endOffset;
      const fin = p.endTag?.startOffset ?? p.endOffset;
      const tipo = n.attrs.find(a => a.name === "type")?.value.toLowerCase().trim() || "";
      const src = n.attrs.some(a => a.name === "src");
      const esJS = n.tagName === "script" && !src &&
        ["", "module", "text/javascript", "application/javascript", "text/ecmascript", "application/ecmascript"].includes(tipo);
      const esCSS = n.tagName === "style" && ["", "text/css"].includes(tipo);
      bloques.push({ lenguaje: esJS ? "js" : esCSS ? "css" : null,
        inicio, fin, texto: texto.slice(inicio, fin) });
      return;
    }
    for (const hijo of n.childNodes || []) visita(hijo);
    if (n.content) visita(n.content);
  }
  visita(arbol);
  return { comentarios, elementos, bloques, textos };
}

function extraerUnidades(contenido, seleccion, avisos = []) {
  const unidades = [];
  function agregar(lenguaje, texto, nombre) {
    if (typeof texto !== "string") throw new TypeError(nombre + " debe contener texto");
    if (lenguaje !== "html") {
      if (texto.trim() && seleccion.includes(lenguaje)) unidades.push({ lenguaje, texto, nombre, base: 0 });
      return;
    }
    let html = leerHTML(texto);
    // Admite el pegado de dos archivos seguidos: documento HTML y código JS.
    // El cierre se obtiene del parser HTML, no de una búsqueda dentro de cadenas.
    const finHTML = html.elementos.find(el => el.tagName === "html")?.sourceCodeLocation?.endTag?.endOffset;
    const posterior = finHTML == null ? "" : texto.slice(finHTML);
    const prefijoJS = posterior.replace(/^(?:\s|\/\/[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)*/, "");
    const pareceJS = /^(?:["']use strict["']\s*;?|(?:async\s+)?function\b|(?:const|let|var|class|import|export)\b)/.test(prefijoJS);
    let bloquePosterior = null;
    if (posterior.trim() && pareceJS) {
      bloquePosterior = { lenguaje: "js", inicio: finHTML, texto: posterior };
      texto = texto.slice(0, finHTML);
      html = leerHTML(texto);
      avisos.push({ archivo: nombre, mensaje: seleccion.includes("js")
        ? "El contenido pegado después de </html> se ha separado como un fragmento JavaScript."
        : "Hay un fragmento JavaScript pegado después de </html>; no se analiza porque JS no está seleccionado." });
    }
    if (seleccion.includes("js") && html.elementos.some(el => el.tagName === "script" && el.attrs.some(a => a.name === "src"))) {
      avisos.push({ archivo: nombre, mensaje: "Los archivos JavaScript enlazados con src no se descargan. Solo se analiza el código incluido o pegado en esta entrega." });
    }
    if (seleccion.includes("html")) {
      // Impide contar los cuerpos de script/style también como HTML.
      let limpio = texto;
      for (const b of [...html.bloques].reverse()) {
        limpio = limpio.slice(0, b.inicio) +
          limpio.slice(b.inicio, b.fin).replace(/[^\r\n]/g, " ") + limpio.slice(b.fin);
      }
      unidades.push({ lenguaje: "html", texto: limpio, nombre, base: 0, html });
    }
    html.bloques.forEach((b, i) => {
      if (b.lenguaje && seleccion.includes(b.lenguaje)) {
        unidades.push({ lenguaje: b.lenguaje, texto: b.texto,
          nombre: nombre + "#" + b.lenguaje + "-" + (i + 1),
          base: (texto.slice(0, b.inicio).match(/\n/g) || []).length });
      }
    });
    if (bloquePosterior && seleccion.includes("js")) {
      unidades.push({ lenguaje: "js", texto: bloquePosterior.texto,
        nombre: nombre + "#js-posterior", base: (texto.match(/\n/g) || []).length });
    }
  }
  if (typeof contenido === "string") {
    const pareceHTML = /<!doctype\s+html|<\/?(?:html|head|body|script|style|div|main|p|section)\b/i.test(contenido);
    if (seleccion.includes("html") || (seleccion.length > 1 && pareceHTML)) {
      agregar("html", contenido, "contenido.html");
    } else if (seleccion.length === 1) agregar(seleccion[0], contenido, "contenido." + seleccion[0]);
    else throw new TypeError("Para JS y CSS separados usa {js: '...', css: '...'}");
  } else if (contenido && typeof contenido === "object" && !Array.isArray(contenido)) {
    for (const [clave, texto] of Object.entries(contenido)) {
      const lenguaje = clave.toLowerCase() === "javascript" ? "js" : clave.toLowerCase();
      if (!["texto", "js", "html", "css"].includes(lenguaje)) throw new TypeError("Clave desconocida: " + clave);
      agregar(lenguaje, texto, "contenido." + lenguaje);
    }
  } else throw new TypeError("contenido debe ser texto o un objeto {js, html, css}");
  return unidades;
}


// La clasificación no depende de los tipos solicitados para el análisis.
function detectarTipo(texto) {
  const limpio = texto.replace(/^(?:\s|\/\/[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)*/, "");
  if (/^(?:<!doctype\s+html\b|<!--|<\/?[a-z][\w-]*(?:\s[^<>]*|\s*\/?)>)/i.test(limpio)) return "html";
  if (/^(?:["']use strict["']\s*;?|(?:async\s+)?function\b|(?:const|let|var|class|import|export|if|for|while|try|switch)\b)/.test(limpio)) return "js";
  try {
    const ast = acorn.parse(texto, { ecmaVersion: "latest", sourceType: "module" });
    // Una palabra aislada también es JS válido, pero no demuestra que sea código.
    if (ast.body.length && /[;=(){}\[\]]/.test(limpio)) return "js";
  } catch {}
  try {
    const ast = postcss.parse(texto);
    let declaraciones = 0;
    ast.walkDecls(() => declaraciones++);
    if (declaraciones && /[{}:]/.test(limpio)) return "css";
  } catch {}
  if (/^(?:[.#:@*][\w-]|[a-z][\w-]*\s*\{)[\s\S]*\{/.test(limpio)) return "css";
  if (/^\s*\/\//.test(texto)) return "js";
  return "texto";
}

/** Devuelve cuatro depósitos de fragmentos serializables, con líneas de origen.
 * Se conserva el original; no ejecuta código, descarga enlaces ni persiste datos.
 * Acepta pegado automático o un objeto explícito {texto, html, css, javascript/js}.
 */
export function prepararEntrega(contenido) {
  // Permite reutilizar una preparación serializada sin volver a clasificarla.
  if (contenido?.version === 1 && contenido.bloques && 'original' in contenido) {
    for (const tipo of ['texto', 'html', 'css', 'javascript']) {
      if (!Array.isArray(contenido.bloques[tipo]) || contenido.bloques[tipo].some(f =>
        typeof f.texto !== 'string' || typeof f.nombre !== 'string' || !Number.isInteger(f.base) || f.base < 0)) {
        throw new TypeError('Preparación inválida: ' + tipo);
      }
    }
    if (Object.keys(contenido.bloques).length !== 4 || !Array.isArray(contenido.avisos)) throw new TypeError('Preparación inválida');
    return contenido;
  }
  const bloques = { texto: [], html: [], css: [], javascript: [] }, avisos = [];
  function guardar(unidad) {
    if (!unidad.texto.trim()) return;
    const { lenguaje, texto, nombre, base } = unidad;
    if (lenguaje === "js") {
      const fin = Math.max(texto.lastIndexOf('}'), texto.lastIndexOf(';')) + 1;
      if (fin > 0) {
        bloques.javascript.push({ texto: texto.slice(0, fin), nombre, base });
        const resto = texto.slice(fin);
        if (resto.trim()) bloques.texto.push({ texto: resto, nombre: nombre + '#texto-posterior',
          base: base + (texto.slice(0, fin).match(/\n/g) || []).length });
        return;
      }
    }
    bloques[lenguaje === "js" ? "javascript" : lenguaje].push({ texto, nombre, base });
  }
  function agregar(tipo, texto, base = 0, nombre = "contenido") {
    // Un pegado marcado como JS puede contener el envoltorio HTML.
    if (tipo === "js" && detectarTipo(texto) === "html") tipo = "html";
    const extraidas = extraerUnidades({ [tipo]: texto }, ["texto", "html", "css", "js"], avisos);
    for (const unidad of extraidas) {
      unidad.base += base;
      unidad.nombre = unidad.nombre.replace("contenido", nombre);
      guardar(unidad);
    }
  }
  function separarDocumentoHTML(texto, base = 0, nombre = "contenido") {
    // Un documento escrito dentro de una cadena JS válida no es HTML independiente.
    try {
      acorn.parse(texto, { ecmaVersion: "latest", sourceType: "module" });
      return false;
    } catch {}
    const inicio = texto.indexOf('<!');
    if (inicio < 0 || /^[ \t]*(?:`{3,}|~{3,})/m.test(texto.slice(0, inicio))) return false;
    const resto = texto.slice(inicio);
    const html = leerHTML(resto);
    const cierre = html.elementos.find(el => el.tagName === 'html')?.sourceCodeLocation?.endTag?.endOffset;
    if (cierre == null) return false;
    const fin = inicio + cierre;
    automatico(texto.slice(0, inicio), base, nombre + '#antes-html');
    agregar('html', texto.slice(inicio, fin), base + (texto.slice(0, inicio).match(/\n/g) || []).length, nombre);
    const posterior = texto.slice(fin);
    if (posterior.trim() && detectarTipo(posterior) === 'js') avisos.push({ archivo: nombre,
      mensaje: 'El contenido pegado después de </html> se ha separado como un fragmento JavaScript.' });
    automatico(posterior, base + (texto.slice(0, fin).match(/\n/g) || []).length, nombre + '#despues-html');
    return true;
  }
  function automatico(texto, base = 0, nombre = "contenido") {
    if (!texto.trim()) return;
    // Extraer primero el documento completo evita absorber HTML dentro del JS previo.
    if (separarDocumentoHTML(texto, base, nombre)) return;
    const tipo = /^(?:`{3,}|~{3,})/.test(texto.trimStart()) ? "texto" : detectarTipo(texto);
    // No interpretar fences que estén dentro de cadenas/comentarios de código.
    if (tipo !== "texto") { agregar(tipo, texto, base, nombre); return; }
    const fence = /^[ \t]*(`{3,}|~{3,})([\w-]*)[^\S\n]*\r?\n/gm;
    let cursor = 0, m;
    while ((m = fence.exec(texto))) {
      const cierre = new RegExp("^[ \\t]*" + m[1][0] + "{" + m[1].length + ",}[ \\t]*\\r?$", "gm");
      cierre.lastIndex = fence.lastIndex;
      const fin = cierre.exec(texto), hasta = fin ? fin.index : texto.length;
      if (m.index > cursor) agregar("texto", texto.slice(cursor, m.index), base + (texto.slice(0, cursor).match(/\n/g) || []).length, nombre);
      const cuerpo = texto.slice(fence.lastIndex, hasta);
      const alias = { js: "js", javascript: "js", html: "html", css: "css", texto: "texto", text: "texto", txt: "texto" };
      const etiqueta = m[2].toLowerCase();
      agregar(alias[etiqueta] || detectarTipo(cuerpo), cuerpo,
        base + (texto.slice(0, fence.lastIndex).match(/\n/g) || []).length, nombre + "#bloque-" + (m.index + 1));
      if (etiqueta && !alias[etiqueta]) avisos.push({ archivo: nombre, mensaje: "Etiqueta no admitida: " + etiqueta + ". Se ha clasificado su contenido automáticamente; revisa la separación." });
      if (!fin) avisos.push({ archivo: nombre, mensaje: "Bloque Markdown sin cierre; se conserva el contenido restante." });
      cursor = fin ? cierre.lastIndex : texto.length;
      fence.lastIndex = cursor;
    }
    if (!cursor) {
      // Una introducción en prosa puede preceder a un documento HTML completo.
      const inicioHTML = /^[ \t]*(?:<!doctype\s+html\b|<html\b|<script\b)/im.exec(texto);
      if (inicioHTML && inicioHTML.index > 0) {
        agregar('texto', texto.slice(0, inicioHTML.index), base, nombre);
        agregar('html', texto.slice(inicioHTML.index), base + (texto.slice(0, inicioHTML.index).match(/\n/g) || []).length, nombre);
        return;
      }
      // Reconoce un archivo JS tras una introducción, conservando ambas partes.
      const inicioJS = /^[ \t]*(?:["']use strict["']\s*;?|(?:let|const|function)\b)/m.exec(texto);
      if (inicioJS && inicioJS.index > 0) {
        agregar('texto', texto.slice(0, inicioJS.index), base, nombre);
        agregar('js', texto.slice(inicioJS.index), base + (texto.slice(0, inicioJS.index).match(/\n/g) || []).length, nombre);
        return;
      }
      agregar("texto", texto, base, nombre);
      avisos.push({ archivo: nombre, mensaje: "Contenido tratado como texto. Si contiene código ambiguo o mezclado, sepáralo en bloques Markdown con su lenguaje o indica el tipo de entrada." });
    } else if (cursor < texto.length) agregar("texto", texto.slice(cursor), base + (texto.slice(0, cursor).match(/\n/g) || []).length, nombre);
  }
  if (typeof contenido === "string") automatico(contenido);
  else if (contenido && typeof contenido === "object" && !Array.isArray(contenido)) {
    for (const [clave, valor] of Object.entries(contenido)) {
      const tipos = seleccionarLenguajes(clave);
      if (tipos.length !== 1 || typeof valor !== "string") throw new TypeError("Entrada inválida: " + clave);
      if (!['js', 'html'].includes(tipos[0]) || !separarDocumentoHTML(valor)) agregar(tipos[0], valor);
    }
  } else throw new TypeError("contenido debe ser un string o un objeto {texto, html, css, javascript}");
  return { version: 1, original: contenido, bloques, avisos };
}

function prepararUnidades(preparada, seleccion) {
  return Object.entries(preparada.bloques).flatMap(([tipo, fragmentos]) => {
    const lenguaje = tipo === "javascript" ? "js" : tipo;
    if (!seleccion.includes(lenguaje)) return [];
    return fragmentos.map(f => ({ ...f, lenguaje,
      ...(lenguaje === "html" ? { html: leerHTML(f.texto) } : {}) }));
  });
}

function resolverSeleccion(preparacion, lenguajes) {
  const seleccion = seleccionarLenguajes(lenguajes);
  const disponibles = Object.entries(preparacion.bloques)
    .filter(([, fragmentos]) => fragmentos.some(f => f.texto.trim()))
    .map(([tipo]) => tipo === 'javascript' ? 'js' : tipo);
  if (!seleccion.length) return disponibles;
  const presentes = seleccion.filter(tipo => disponibles.includes(tipo));
  return presentes.length ? presentes : ['texto'];
}
export function analizarEntregaDetallada(contenido, lenguajes = "", opciones = {}) {
  const preparacion = prepararEntrega(contenido);
  const seleccion = resolverSeleccion(preparacion, lenguajes);
  const pesos = { ...PESOS, ...opciones.pesos };
  const u = { ...UMBRALES, ...opciones.umbrales };
  const desactivadas = new Set(opciones.desactivadas || []);
  for (const [id, peso] of Object.entries(pesos)) {
    if (!(id in PESOS) || !Number.isFinite(peso) || peso < 0 || peso > 100) {
      throw new TypeError("Peso inválido: " + id);
    }
  }
  const resultados = [], errores = [], avisos = [], fragmentosOrtografia = [];
  const lineasCodigoEntrega = new Set(), densidadPorUnidad = [];
  let totalComentarios = 0, comentariosExtraidosCompletos = true;
  avisos.push(...preparacion.avisos);
  if (!seleccion.length) return { preparacion, lenguajes: [], puntuacion: null, resultados, errores, avisos, estado: "sin_contenido_seleccionado" };
  if (!seleccion.includes("js") && preparacion.bloques.javascript.some(f => (f.nombre.endsWith("#js-posterior") || f.nombre.includes("#despues-html")))) {
    avisos.push({ archivo: "contenido.html", mensaje: "El JS posterior se ha separado, pero JS no está seleccionado y no se analiza." });
  }
  const unidades = prepararUnidades(preparacion, seleccion);
  for (const tipo of seleccion) if (!unidades.some(u => u.lenguaje === tipo)) avisos.push({ archivo: tipo, mensaje: "Código/texto no detectado" });
  for (const unidad of unidades) {
    const { texto: s, lenguaje, nombre, base } = unidad;
    const linea = posicion => base + 1 + (s.slice(0, posicion).match(/\n/g) || []).length;
    const evidencia = (start, detalle) => ({ linea: linea(start), detalle });
    function registrar(id, aplicable, cumple, valor, evidencias = [], motivo = null) {
      if (opciones.codigoBreve && PATRONES_REPETICION.includes(id)) {
        resultados.push({ id, lenguaje, archivo: nombre, aplicable: false, cumple: false,
          peso: pesos[id], valor: null, evidencias: [], evidenciasTotales: 0,
          motivo: 'Patrón de repetición o uniformidad omitido: menos de 10 líneas de código.' });
        return;
      }
      const habilitada = !desactivadas.has(id);
      resultados.push({ id, lenguaje, archivo: nombre,
        aplicable: Boolean(aplicable && habilitada),
        cumple: Boolean(aplicable && habilitada && cumple), valor,
        peso: pesos[id], evidencias: evidencias.slice(0, 30),
        evidenciasTotales: evidencias.length,
        motivo: !habilitada ? "desactivada" : !aplicable ? motivo || "muestra insuficiente o condición no aplicable" : null });
    }
    function coincidencias(id, fuente, re, minimo = 1) {
      const encontrados = [...fuente.matchAll(new RegExp(re.source, [...new Set(re.flags + "g")].join("")))];
      registrar(id, true, encontrados.length >= minimo, encontrados.length,
        encontrados.map(m => evidencia(m.index, m[0])));
    }
    if (lenguaje === "texto") {
      const evaluarTexto = () => {
      const caracteres = opciones.caracteresEspeciales ?? CARACTERES_ESPECIALES;
      const especiales = [...s.matchAll(/./gu)].filter(m => caracteres.includes(m[0]));
      registrar("caracteres_especiales", true, especiales.length > 0, especiales.length,
        especiales.map(m => evidencia(m.index, m[0])));
      coincidencias("espacios_invisibles", s, /[\u00a0\u200b-\u200f\u202a-\u202e\u202f\u2060\u2066-\u2069]|(?<!^)\ufeff/g);
      coincidencias("menciones_ia", s, /\b(?:ChatGPT|Copilot|OpenAI|Claude|Gemini|generado por (?:una? )?IA)\b/gi);
      };
      if (opciones[EVALUACIONES_PROSA]) opciones[EVALUACIONES_PROSA].push(evaluarTexto); else evaluarTexto();
      fragmentosOrtografia.push({ texto: s, linea: base + 1, archivo: nombre });
      continue; // La prosa no contribuye a densidad de comentarios ni reglas de código.
    }
    let comentarios = [], nodos = [], cadenas = [], raiz, valido = true, comentariosCompletos = false;
    try {
      if (lenguaje === "js") {
        let ast, ultimoError;
        for (const sourceType of ["module", "script"]) {
          const capturados = [];
          try {
            ast = acorn.parse(s, { ecmaVersion: "latest", sourceType, locations: true, onComment: capturados });
            comentarios = capturados.map(c => ({ text: c.value, start: c.start, end: c.end }));
            break;
          } catch (e) { ultimoError = e; }
        }
        if (!ast) throw ultimoError;
        recorrer(ast, n => nodos.push(n));
        cadenas = nodos.filter(n => n.type === "Literal" && typeof n.value === "string")
          .map(n => ({ text: n.value, start: n.start, raw: s.slice(n.start, n.end) }));
      } else if (lenguaje === "css") {
        raiz = postcss.parse(s, { from: undefined });
        raiz.walkComments(c => comentarios.push({ text: c.text,
          start: c.source.start.offset, end: c.source.end.offset + 1 }));
        let sinComentarios = s.split("");
        comentarios.forEach(c => { for (let i = c.start; i < c.end; i++) if (!/[\r\n]/.test(s[i])) sinComentarios[i] = " "; });
        for (const m of sinComentarios.join("").matchAll(/"(?:\\[\s\S]|[^"\\])*"|'(?:\\[\s\S]|[^'\\])*'/g)) {
          cadenas.push({ text: m[0].slice(1, -1), raw: m[0], start: m.index });
        }
      } else {
        comentarios = unidad.html.comentarios;
        for (const el of unidad.html.elementos) {
          for (const a of el.attrs || []) {
            const loc = el.sourceCodeLocation.attrs?.[a.name];
            if (!loc) continue;
            const raw = s.slice(loc.startOffset, loc.endOffset).match(/=\s*(["'][\s\S]*)$/)?.[1];
            if (raw) cadenas.push({ text: a.value, raw, start: loc.startOffset });
          }
        }
      }
    } catch (e) {
      valido = false;
      errores.push({ archivo: nombre, lenguaje, mensaje: e.message,
        linea: e.loc?.line ? base + e.loc.line : e.line ? base + e.line : null });
      if (lenguaje === "js") {
        // Un bloque sin cerrar puede impedir construir el AST, aunque todos los
        // comentarios y cadenas estén completos. No se inventan llaves ni código.
        const capturados = [], literales = [];
        try {
          const lector = acorn.tokenizer(s, { ecmaVersion: "latest", locations: true, onComment: capturados });
          for (let token = lector.getToken(); token.type.label !== "eof"; token = lector.getToken()) {
            if (token.type.label === "string") literales.push({ text: token.value,
              start: token.start, raw: s.slice(token.start, token.end) });
          }
          comentarios = capturados.map(c => ({ text: c.value, start: c.start, end: c.end }));
          cadenas = literales;
          comentariosCompletos = true;
          avisos.push({ archivo: nombre, mensaje: "Se han leído los comentarios y el formato del fragmento completo mediante análisis léxico. Las reglas que necesitan una estructura JavaScript válida no se han evaluado." });
        } catch {
          // Una cadena/comentario sin cerrar impide saber si falta más contenido.
          comentarios = [];
          cadenas = [];
        }
      }
    }
    const lineas = [...s.matchAll(/[^\n]*(?:\n|$)/g)].filter(m => m[0].trim());
    const caracteres = opciones.caracteresEspeciales ?? CARACTERES_ESPECIALES;
    const especiales = [...s.matchAll(/./gu)].filter(m => caracteres.includes(m[0]));
    registrar("caracteres_especiales", !!s.trim(), especiales.length > 0, especiales.length,
      especiales.map(m => evidencia(m.index, m[0] + " U+" + m[0].codePointAt(0).toString(16).toUpperCase())));
    coincidencias("espacios_invisibles", s, /[\u00a0\u200b-\u200f\u202a-\u202e\u202f\u2060\u2066-\u2069]|(?<!^)\ufeff/g);
    const largas = lineas.filter(m => m[0].replace(/[\r\n]+$/, "").length > u.longitudLinea);
    registrar("lineas_largas", !!lineas.length, largas.length >= u.minLineasLargas, largas.length,
      largas.map(m => evidencia(m.index, m[0].trim().slice(0, 160))));
    coincidencias("bloques_markdown", s, /^[ \t]*```(?:javascript|js|html|css)?/gm);
    const sangrias = lineas.map(m => ({ start: m.index, texto: m[0].match(/^[ \t]*/)[0] })).filter(x => x.texto.length);
    const hayTabs = sangrias.some(x => x.texto.includes("\t"));
    const hayEspacios = sangrias.some(x => x.texto.includes(" "));
    const sangriaAplicable = sangrias.length >= u.minSangrias && !hayTabs && hayEspacios;
    const pares = sangrias.filter(x => x.texto.length % 2 === 0).length;
    const proporcionPares = pares / (sangrias.length || 1);
    registrar("indentacion_par", sangriaAplicable, proporcionPares >= u.proporcionUniversal,
        { sangrias: sangrias.length, hayTabs, hayEspacios, mezcla: hayTabs && hayEspacios,
          coinciden: pares, proporcion: proporcionPares, proporcionExigida: u.proporcionUniversal },
        sangrias.map(x => evidencia(x.start, x.texto.length + " caracteres de sangría")),
        hayTabs ? "La sangría contiene tabuladores; no se evalúa la paridad de espacios."
          : "Se necesitan al menos " + u.minSangrias + " líneas con sangría; se han encontrado " + sangrias.length + ".");
    const anchos = sangrias.filter(x => /^ +$/.test(x.texto)).map(x => x.texto.length);
    const candidatas = new Set();
    for (const ancho of new Set(anchos)) {
      if (ancho >= 2) candidatas.add(ancho);
      for (let divisor = 2; divisor * divisor <= ancho; divisor++) {
        if (ancho % divisor === 0) { candidatas.add(divisor); candidatas.add(ancho / divisor); }
      }
    }
    const patronesSangria = [{ tipo: "tabuladores", unidad: 1,
      coinciden: sangrias.filter(x => /^\t+$/.test(x.texto)).length },
      ...[...candidatas].map(unidad => ({ tipo: "espacios", unidad,
        coinciden: anchos.filter(ancho => ancho % unidad === 0).length }))];
    const patronSangria = patronesSangria.sort((a, b) => b.coinciden - a.coinciden || b.unidad - a.unidad)[0];
    const proporcionSangria = patronSangria.coinciden / (sangrias.length || 1);
    registrar("sangria_uniforme", sangrias.length >= u.minSangrias,
      proporcionSangria >= u.proporcionUniversal,
      { sangrias: sangrias.length, tipo: patronSangria.coinciden ? patronSangria.tipo : "sin patrón",
        unidad: patronSangria.coinciden ? patronSangria.unidad : null, mezcla: hayTabs && hayEspacios,
        coinciden: patronSangria.coinciden, proporcion: proporcionSangria, proporcionExigida: u.proporcionUniversal },
      sangrias.map(x => evidencia(x.start, x.texto.length + (/^\t+$/.test(x.texto) ? " tabuladores" : " caracteres de sangría"))),
      "Se necesitan al menos " + u.minSangrias + " líneas con sangría; se han encontrado " + sangrias.length + ".");
      if (!valido && !comentariosCompletos) {
        comentariosExtraidosCompletos = false;
        // Mostrar por qué no se han evaluado estos patrones, en lugar de ocultarlos.
        for (const id of ["comentarios_mayuscula", "comentarios_sin_puntos", "comentarios_longitud_similar", "espaciado_uniforme"]) {
          registrar(id, false, false, null, [], "No se pudieron extraer todos los comentarios por un error de sintaxis.");
        }
        continue;
      }
    // Retirar solo los comentarios identificados por los analizadores. Se conservan
    // los saltos de línea y el código que comparte línea con un comentario.
    let codigoSinComentarios = s;
    for (const c of [...comentarios].sort((a, b) => b.start - a.start)) {
      codigoSinComentarios = codigoSinComentarios.slice(0, c.start) +
        codigoSinComentarios.slice(c.start, c.end).replace(/[^\r\n]/g, " ") +
        codigoSinComentarios.slice(c.end);
    }
    const archivoOrigen = nombre.split("#")[0];
    const lineasConCodigo = codigoSinComentarios.split("\n")
      .map((texto, i) => ({ texto, numero: base + i + 1 }))
      .filter(l => l.texto.trim());
    // Una línea del mismo HTML puede contener marcado, JS y CSS. Solo cuenta una
    // vez en el total, aunque sus fragmentos pertenezcan a unidades diferentes.
    for (const l of lineasConCodigo) lineasCodigoEntrega.add(JSON.stringify([archivoOrigen, l.numero]));
    totalComentarios += comentarios.length;
    densidadPorUnidad.push({ archivo: nombre, lenguaje, comentarios: comentarios.length,
      lineasCodigo: lineasConCodigo.length, primeraLinea: lineasConCodigo[0]?.numero ?? base + 1 });
    if (opciones.incluirComentarios) {
      fragmentosOrtografia.push(...comentarios.map(c => ({ texto: c.text,
        archivo: nombre, lenguaje, linea: linea(c.start) })));
    }
    const evComentarios = cs => cs.map(c => evidencia(c.start, c.text.slice(0, 160)));
    const evaluarProsa = () => {
    const textos = comentarios.map(c => c.text.replace(/^\s*\* ?/gm, "").trim());
    const activos = comentarios.map((c, i) => ({ ...c, text: textos[i] })).filter(c => /\p{L}/u.test(c.text));
    const suficiente = activos.length >= u.minComentarios;
      const todos = (id, predicado) => {
        const coinciden = activos.filter(c => predicado(c.text)).length;
        const proporcion = coinciden / (activos.length || 1);
        registrar(id, suficiente, proporcion >= u.proporcionUniversal,
          { coinciden, total: activos.length, minimo: u.minComentarios, proporcion, proporcionExigida: u.proporcionUniversal }, evComentarios(activos),
          "Se necesitan al menos " + u.minComentarios + " comentarios con texto; se han encontrado " + activos.length + ".");
      };
    todos("comentarios_mayuscula", t => /\p{Lu}/u.test(t.match(/\p{L}/u)?.[0] || ""));
    todos("comentarios_sin_puntos", t => !t.includes("."));
    todos("comentarios_punto_final", t => t.endsWith("."));
      const largosComentarios = activos.map(c => [...c.text.replace(/\s+/g, " ")].length);
      const mediaLongitud = largosComentarios.reduce((a, b) => a + b, 0) / (largosComentarios.length || 1);
      const desviaciones = largosComentarios.map(l => mediaLongitud ? Math.abs(l - mediaLongitud) / mediaLongitud : 0);
      const longitudesSimilares = desviaciones.filter(d => d <= u.toleranciaLongitud).length;
      const proporcionLongitudes = longitudesSimilares / (activos.length || 1);
      registrar("comentarios_longitud_similar", activos.length >= u.minComentariosLongitud,
        proporcionLongitudes >= u.proporcionLongitudSimilar,
        { total: activos.length, minimoComentarios: u.minComentariosLongitud,
          longitudes: largosComentarios, media: mediaLongitud,
          desviacionMaxima: desviaciones.length ? Math.max(...desviaciones) : null,
          tolerancia: u.toleranciaLongitud, coinciden: longitudesSimilares,
          proporcion: proporcionLongitudes, proporcionExigida: u.proporcionLongitudSimilar },
        activos.map((c, i) => evidencia(c.start, largosComentarios[i] + " caracteres · " + c.text.slice(0, 160))),
        "Se necesitan al menos " + u.minComentariosLongitud + " comentarios con texto; se han encontrado " + activos.length + ".");
    registrar("comentarios_abundantes", !!lineas.length, comentarios.length / lineas.length > u.densidadComentarios,
      { comentarios: comentarios.length, lineasNoVacias: lineas.length, ratio: comentarios.length / (lineas.length || 1) }, evComentarios(comentarios));
    registrar("comentarios_largos", suficiente,
      activos.filter(c => c.text.length > u.longitudComentario).length / (activos.length || 1) > u.proporcionComentariosLargos,
      activos.filter(c => c.text.length > u.longitudComentario).length, evComentarios(activos.filter(c => c.text.length > u.longitudComentario)));
      // ID conservado; compara intros previos con el umbral general del 95 %.
    // Ignora espacios/tabuladores entre saltos, pero no cuenta un inicio de archivo sin salto.
    const intros = comentarios.map(c => (s.slice(0, c.start).match(/[ \t\r\n]*$/)[0].match(/\n/g) || []).length);
      const patronIntros = predominio(intros, u.proporcionUniversal);
    registrar("comentarios_antes_funciones", comentarios.length >= u.minComentarios,
        patronIntros.proporcion >= u.proporcionUniversal, { intros, ...patronIntros },
        comentarios.map((c, i) => evidencia(c.start, intros[i] + " saltos de línea anteriores")));
      // El comentario de apertura no tiene un elemento anterior con el que medir
      // separación. Esta regla conserva su umbral específico del 80 %.
      const separaciones = comentarios.map((c, i) => ({ ...c, saltos: intros[i] }))
        .filter(c => s.slice(0, c.start).trim().length > 0);
      const frecuencias = new Map();
      separaciones.forEach(c => frecuencias.set(c.saltos, (frecuencias.get(c.saltos) || 0) + 1));
      const dominante = [...frecuencias].sort((a, b) => b[1] - a[1])[0];
      const proporcion = dominante ? dominante[1] / separaciones.length : 0;
      registrar("espaciado_uniforme", separaciones.length >= u.minComentariosEspaciado,
        proporcion >= u.proporcionEspaciado,
        { comentariosEvaluados: separaciones.length, saltosPredominantes: dominante?.[0] ?? null,
          coinciden: dominante?.[1] ?? 0, proporcion, minimo: u.minComentariosEspaciado,
          proporcionExigida: u.proporcionEspaciado },
        separaciones.map(c => evidencia(c.start, c.saltos + " saltos de línea antes del comentario")),
        "Se necesitan al menos " + u.minComentariosEspaciado + " comentarios con contenido anterior para comparar la separación; se han encontrado " + separaciones.length + ".");
    const separadores = comentarios.filter(c => /([=\-*\/_#])\1{3,}/.test(c.text));
    const longitudes = separadores.map(c => [...c.text.matchAll(/([=\-*\/_#])\1{3,}/g)].map(m => m[0].length));
      const patronSeparadores = predominio(longitudes.flat(), u.proporcionUniversal);
    registrar("comentarios_separadores", separadores.length >= u.minSeparadores,
        patronSeparadores.proporcion >= u.proporcionUniversal, { longitudes, ...patronSeparadores }, evComentarios(separadores));
    function buscarComentarios(id, re, minimo = 1) {
      const encontrados = comentarios.filter(c => re.test(c.text));
      registrar(id, comentarios.length > 0, encontrados.length >= minimo, encontrados.length, evComentarios(encontrados));
    }
    buscarComentarios("comentarios_pasos", /^\s*(?:paso\s+\d+|step\s+\d+|\d+[.)])/i, u.minPasos);
    buscarComentarios("comentarios_etiquetas", /^\s*(?:nota|importante|ejemplo|explicación|advertencia|note|important|example|warning)\s*:/i, u.minEtiquetas);
    const docs = comentarios.filter(c => s.slice(c.start, c.start + 3) === "/**" || /@(param|returns?|example|typedef)\b/.test(c.text));
    registrar("comentarios_jsdoc", comentarios.length > 0, docs.length >= u.minJSDoc, docs.length, evComentarios(docs));
    const normalizar = t => t.toLowerCase().replace(/\s+/g, " ").trim();
    const repetidos = comentarios.filter((c, i, cs) => normalizar(c.text).length >= u.longitudComentarioRepetido &&
      cs.some((otro, j) => j !== i && normalizar(otro.text) === normalizar(c.text)));
    registrar("comentarios_repetidos", comentarios.length > 1, repetidos.length > 0, repetidos.length, evComentarios(repetidos));
    buscarComentarios("comentarios_conversacionales", /aquí tienes|como puedes ver|puedes adaptar|espero que te sirva|here is|here's|hope this helps/i);
    buscarComentarios("comentarios_instrucciones", /reemplaza|sustituye|añade aquí|tu código aquí|YOUR_API_KEY|your-url|replace this|your code here/i);
    buscarComentarios("menciones_ia", /\b(?:ChatGPT|Copilot|Claude|Gemini|OpenAI)\b|generado por|generated by|as an AI/i);
    buscarComentarios("emojis_comentarios", /\p{Extended_Pictographic}/u);
    buscarComentarios("encabezados_markdown", /^\s*#{2,6}\s/m);
    if (lenguaje === "html") buscarComentarios("html_comentarios_secciones", /\b(header|navigation|main|footer|inicio|fin)\b/i);
    };
    if (opciones[EVALUACIONES_PROSA]) opciones[EVALUACIONES_PROSA].push(evaluarProsa);
    else evaluarProsa();
    const comillas = cadenas.map(c => c.raw[0]).filter(q => q === "'" || q === '"');
      const patronComillas = predominio(comillas, u.proporcionUniversal);
      registrar("comillas_uniformes", comillas.length >= u.minCadenas, patronComillas.proporcion >= u.proporcionUniversal,
        { tipos: [...new Set(comillas)], ...patronComillas }, cadenas.map(c => evidencia(c.start, c.raw.slice(0, 100))));
    if (lenguaje === "js" && valido) {
      const funcs = nodos.filter(n => /^(FunctionDeclaration|FunctionExpression|ArrowFunctionExpression)$/.test(n.type));
      function detectar(id, predicado, minimo = 1) {
        const encontrados = nodos.filter(predicado);
        registrar(id, true, encontrados.length >= minimo, encontrados.length,
          encontrados.map(n => evidencia(n.start, s.slice(n.start, Math.min(n.end, n.start + 160)))));
      }
      const sintaxis = new Set(opciones.sintaxis || ["ChainExpression", "ObjectPattern", "ArrayPattern", "SpreadElement", "ArrowFunctionExpression", "TemplateLiteral", "??"]);
      detectar("sintaxis_configurable", n => sintaxis.has(n.type) || (n.type === "LogicalExpression" && sintaxis.has(n.operator)));
      const metodos = new Set(opciones.metodos || ["reduce", "flatMap", "entries", "fromEntries", "all"]);
      const nombreProp = n => n.computed ? n.property?.value : n.property?.name;
      detectar("metodos_configurables", n => n.type === "CallExpression" && n.callee.type === "MemberExpression" && metodos.has(nombreProp(n.callee)));
      const estructuras = new Set(opciones.estructuras || ["Map", "Set", "Proxy", "Reflect", "MutationObserver", "AbortController"]);
      detectar("estructuras_configurables", n =>
        ((n.type === "NewExpression" || n.type === "CallExpression") && estructuras.has(n.callee.name)) ||
        (n.type === "MemberExpression" && estructuras.has(n.object.name)));
      const validaciones = nodos.filter(n => (n.type === "UnaryExpression" && n.operator === "typeof") ||
        (n.type === "BinaryExpression" && ["==", "!=", "===", "!=="].includes(n.operator) &&
          [n.left, n.right].some(v => v.type === "Literal" && v.value === null)) ||
        (n.type === "CallExpression" && n.callee.type === "MemberExpression" && n.callee.object.name === "Array" && nombreProp(n.callee) === "isArray"));
      registrar("validaciones_repetidas", lineas.length > 0, validaciones.length * 100 / lineas.length >= u.validacionesPor100Lineas,
        { cantidad: validaciones.length, por100Lineas: validaciones.length * 100 / (lineas.length || 1) },
        validaciones.map(n => evidencia(n.start, s.slice(n.start, n.end))));
      const tries = nodos.filter(n => n.type === "TryStatement");
      registrar("muchos_try_catch", funcs.length > 0, tries.length / funcs.length >= u.proporcionTryCatch,
        { bloques: tries.length, funciones: funcs.length }, tries.map(n => evidencia(n.start, "try/catch")));
      detectar("envoltorio_iife", n => n.type === "CallExpression" && ["FunctionExpression", "ArrowFunctionExpression"].includes(n.callee.type));
      detectar("mensajes_prefijados", n => n.type === "CallExpression" && n.callee.type === "MemberExpression" &&
        n.callee.object.name === "console" && typeof n.arguments[0]?.value === "string" && /^\[(INFO|ERROR|DEBUG|WARN)\]/.test(n.arguments[0].value));
      const ids = [...new Map(nodos.filter(n => n.type === "Identifier").map(n => [n.name, n])).values()];
      const largos = ids.filter(n => n.name.length > u.longitudIdentificador);
      registrar("identificadores_largos", ids.length >= u.minIdentificadores,
        largos.length / (ids.length || 1) > u.proporcionIdentificadoresLargos,
        { largos: largos.length, total: ids.length }, largos.map(n => evidencia(n.start, n.name)));
      const provisionales = new Set(opciones.nombresPendientes || ["foo", "bar", "exampleFunction", "myFunction", "tempData"]);
      detectar("nombres_pendientes", n => n.type === "Identifier" && provisionales.has(n.name));
      const urls = cadenas.filter(c => /\bexample\.(?:com|org|net)\b|your-url|YOUR_API_KEY/i.test(c.text));
      registrar("urls_ejemplo", true, urls.length > 0, urls.length, urls.map(c => evidencia(c.start, c.text)));
    }
    if (lenguaje === "html") {
      const provisionales = unidad.html.textos.filter(t => /lorem ipsum|título aquí|descripción del producto/i.test(t.text));
      registrar("html_textos_provisionales", true, provisionales.length > 0, provisionales.length, evComentarios(provisionales));
      const attrs = opciones.atributosHTML || ["aria-*", "role", "data-*", "loading"];
      const elementos = unidad.html.elementos.filter(el => el.attrs.some(a => attrs.some(p => p.endsWith("*") ? a.name.startsWith(p.slice(0, -1)) : a.name === p)));
      registrar("html_atributos_configurables", true, elementos.length > 0, elementos.length,
        elementos.map(el => evidencia(el.sourceCodeLocation.startOffset, el.tagName)));
    }
    if (lenguaje === "css") {
      function reglaCSS(id, encontrados, minimo = 1) {
        registrar(id, true, encontrados.length >= minimo, encontrados.length,
          encontrados.map(n => evidencia(n.source.start.offset, n.toString().slice(0, 160))));
      }
      const variables = [], funciones = [], reglas = [], bem = [];
      const funcsCSS = opciones.funcionesCSS || ["clamp", "min", "max", "calc", "color-mix"];
      const reglasCSS = opciones.reglasCSS || ["supports", "container", "layer"];
      raiz.walkDecls(n => {
        if (n.prop.startsWith("--") || /\bvar\s*\(/.test(n.value)) variables.push(n);
        // Evita coincidencias en contenidos textuales entre comillas.
        const valor = n.value.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, "");
        if ([...valor.matchAll(/([\w-]+)\s*\(/g)].some(m => funcsCSS.includes(m[1]))) funciones.push(n);
      });
      raiz.walkAtRules(n => {
        if (reglasCSS.includes(n.name) || (n.name === "media" && /prefers-reduced-motion/.test(n.params))) reglas.push(n);
      });
      raiz.walkRules(n => { if (/\.[\w-]+(?:__[\w-]+|--[\w-]+)/.test(n.selector)) bem.push(n); });
      reglaCSS("css_variables", variables);
      reglaCSS("css_funciones_configurables", funciones);
      reglaCSS("css_reglas_configurables", reglas);
      reglaCSS("css_nombres_bem", bem, u.minBEM);
    }
  }
  // Se conserva el ID y el peso para mantener compatibles las configuraciones.
  // El umbral es estricto: 1 comentario / 10 líneas NO activa esta regla.
  const lineasCodigo = lineasCodigoEntrega.size;
  const densidadAplicable = !desactivadas.has("sin_comentarios") && !errores.length && (opciones.codigoBreve ? lineasCodigo > 0 : lineasCodigo >= 10);
  resultados.push({ id: "sin_comentarios", lenguaje: seleccion.join("+"), archivo: "Conjunto de lenguajes seleccionados",
    aplicable: densidadAplicable,
    cumple: densidadAplicable && totalComentarios * 10 < lineasCodigo,
    peso: pesos.sin_comentarios,
    valor: { comentarios: totalComentarios, lineasCodigo,
      comentariosPor10Lineas: lineasCodigo ? totalComentarios * 10 / lineasCodigo : null,
      umbral: "Menos de 1 comentario por cada 10 líneas de código (solo desde 10 líneas)",
      minLineasExigidas: opciones.codigoBreve ? 1 : 10,
      desglose: densidadPorUnidad },
    evidencias: densidadPorUnidad.slice(0, 30).map(d => ({ linea: d.primeraLinea,
      archivo: d.archivo, detalle: d.archivo + " · " + d.comentarios + " comentarios / " + d.lineasCodigo + " líneas de código" })),
    evidenciasTotales: densidadPorUnidad.length,
    motivo: desactivadas.has("sin_comentarios") ? "desactivada" : errores.length ? "Hay errores de sintaxis; no se puede calcular la densidad completa."
      : !lineasCodigo ? "No hay líneas de código en los lenguajes seleccionados."
      : lineasCodigo < 10 && !opciones.codigoBreve ? "Código breve: aplicar el análisis público para exigir un comentario." : null });
  resultados.push({ id: "ausencia_faltas", lenguaje: seleccion.join("+"), archivo: "Texto y comentarios seleccionados",
    aplicable: false, cumple: false, valor: null, peso: 0, pesoConfigurado: pesos.ausencia_faltas,
    estadoRevision: "no_realizada", puntosAplicados: 0,
    evidencias: [], evidenciasTotales: 0,
    motivo: "Revisión ortográfica pendiente del análisis asíncrono." });
  // Cada ID suma una sola vez aunque aparezca en varios archivos o lenguajes.
  const activadas = [...new Set(resultados.filter(r => r.cumple).map(r => r.id))];
  const suma = activadas.reduce((total, id) => total + pesos[id], 0);
  const multiplicadorPenalizaciones = 2 ** Math.min(1023, Math.floor(lineasCodigo / 25));
  const sumaPonderada = suma === 0 ? 0 : suma * multiplicadorPenalizaciones;
  return { preparacion, lenguajes: seleccion, puntuacion: unidades.length ? Math.min(100, sumaPonderada) : null,
    lineasCodigoAnalizadas: lineasCodigo, multiplicadorPenalizaciones,
    sumaPesosBase: suma, sumaSinLimitar: sumaPonderada, reglasActivadas: activadas, resultados, errores, avisos,
    estado: errores.length ? "analisis_parcial" : unidades.length ? "analizado" : "sin_contenido_seleccionado",
    significado: "Índice de prioridad de revisión; no es probabilidad calibrada de IA.",
    ...(opciones.incluirComentarios ? { fragmentosOrtografia, comentariosExtraidosCompletos } : {}) };
}

/** Una petición POST por acción explícita. Sin reintentos ni llamadas en segundo plano.
 * Para automatizaciones/lotes, configura una instancia propia o un servicio contratado.
 * No incluyas claves privadas en aplicaciones de navegador.
 */
export async function consultarLanguageTool(texto, opciones = {}) {
  const endpoint = opciones.endpoint || "https://api.languagetool.org/v2/check";
  const url = new URL(endpoint);
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Endpoint de LanguageTool inválido.");
  if (new TextEncoder().encode(texto).length > 19000) throw new Error("El texto supera el límite de esta revisión (19 KB). No se ha enviado ningún fragmento.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { method: "POST", credentials: "omit", signal: controller.signal,
      body: new URLSearchParams({ text: texto, language: opciones.idioma || "es", level: "default" }) });
    if (!response.ok) throw new Error("LanguageTool devolvió HTTP " + response.status + ". La regla no se puntuará.");
    const data = await response.json();
    if (!Array.isArray(data.matches) || data.warnings?.incompleteResults) throw new Error("LanguageTool no devolvió una revisión completa.");
    return data;
  } catch (error) {
    if (error.name === "AbortError") throw new Error("LanguageTool no respondió en 15 segundos.");
    throw error;
  } finally { clearTimeout(timeout); }
}

// Glosario conservador y ampliable: no es un detector universal del idioma.
export const TERMINOS_INGLES = Object.freeze(["abstract", "accessibility", "accessible", "algorithm", "application", "argument", "array", "async", "await", "backend", "background", "boolean", "border", "bottom", "branch", "breakpoint", "browser", "buffer", "build", "button", "cache", "callback", "camelcase", "checkbox", "child", "class", "client", "closure", "cluster", "commit", "component", "console", "constant", "constructor", "container", "content", "cookie", "credentials", "database", "dataset", "debug", "debugger", "default", "delete", "deployment", "desktop", "disabled", "display", "document", "dropdown", "endpoint", "error", "event", "exception", "export", "expression", "extends", "fallback", "fetch", "field", "filename", "filter", "finally", "firewall", "framework", "frontend", "function", "getter", "handler", "header", "height", "hidden", "hostname", "hover", "import", "index", "inline", "input", "interface", "iterator", "javascript", "jquery", "keyword", "layout", "length", "library", "listener", "loading", "local", "localhost", "localstorage", "location", "login", "logout", "margin", "markdown", "middleware", "module", "namespace", "network", "number", "object", "offset", "online", "operator", "output", "overflow", "package", "padding", "parameter", "parent", "parser", "password", "payload", "placeholder", "pointer", "polling", "promise", "property", "prototype", "query", "readonly", "redirect", "refactor", "regular", "release", "render", "request", "required", "resize", "resolve", "response", "return", "router", "runtime", "scope", "screen", "script", "scroll", "selector", "server", "session", "setter", "shadow", "sibling", "socket", "source", "split", "spread", "stack", "statement", "storage", "stream", "strict", "string", "stylesheet", "submit", "substring", "switch", "syntax", "target", "template", "testing", "thread", "throw", "timeout", "toggle", "token", "toolbar", "tooltip", "transform", "transition", "undefined", "username", "validation", "value", "variable", "viewport", "warning", "websocket", "widget", "width", "window", "wrapper", "yield"]);
export const TERMINOS_TECNICOS = Object.freeze([...new Set(Object.values(glosarioTecnico.grupos).flat())]);
const glosarioTecnicoSet = new Set(TERMINOS_TECNICOS);

// Solo cuenta una tilde omitida en una vocal minúscula; el resto debe coincidir.
function faltaTildeMinuscula(original, sugerida) {
  const a = [...original.normalize('NFC')], b = [...sugerida.normalize('NFC')];
  if (a.length !== b.length) return false;
  const tildes = { a:'á', e:'é', i:'í', o:'ó', u:'ú' };
  let cambios = 0;
  for (let i=0; i<a.length; i++) {
    if (a[i] === b[i]) continue;
    if (tildes[a[i]] !== b[i] || ++cambios > 1) return false;
  }
  return cambios === 1;
}

/** Prepara la prosa ANTES de llamar al servicio. Los espacios conservan los
 * offsets UTF-16 y saltos de línea sin enviar las palabras excluidas. */
export function prepararProsa(fragmentos, config = {}) {
  const exclusionIngles = config.excluirIngles !== false && !/^en(?:-|$)/i.test(config.idioma || "es");
  const adicionales = Array.isArray(config.terminosIgnorados) ? config.terminosIgnorados : [];
  const ingles = new Set([...TERMINOS_INGLES, ...adicionales].map(t => String(t).normalize('NFC').toLowerCase())
    .filter(t => (t.match(/\p{L}/gu) || []).length > 4));
  const exclusiones = [];
  const borrar = t => t.replace(/[^\r\n]/g, ' ');
  const preparados = fragmentos.map(f => {
    let limpio = f.texto.replace(/```[\s\S]*?```|`[^`]*`|https?:\/\/\S+|^\s*\*?\s*@\w+.*$/gm, borrar);
    limpio = limpio.replace(/[$_\p{L}\p{N}][$_\p{L}\p{M}\p{N}]*(?:[.\-’'][$_\p{L}\p{M}\p{N}]+)*/gu, (token, inicio) => {
      const normal = token.normalize('NFC').toLowerCase();
      const motivo = token.includes('.') ? 'punto_interno'
        : /\p{Ll}[\p{M}\p{N}]*\p{Lu}/u.test(token) ? 'camelCase'
        : glosarioTecnicoSet.has(normal) ? 'glosario_tecnico'
        : exclusionIngles && ingles.has(normal) ? 'glosario_ingles' : null;
      if (!motivo) return token;
      exclusiones.push({ token, motivo, archivo: f.archivo, linea: f.linea + (f.texto.slice(0, inicio).match(/\n/g) || []).length, inicio });
      return borrar(token);
    });
    return { ...f, texto: limpio, original: f.texto };
  });
  return { fragmentos: preparados, exclusiones, exclusionIngles };
}

/** La entrada asíncrona revisa siempre la prosa de los comentarios disponible.
 * opciones.ortografia: { idioma:'es', mostrarDetalle:true, endpoint?:URL }
 * opciones.revisorOrtografico: proveedor inyectable para integración/pruebas.
 */
export async function analizarEntregaDetalladaAsync(contenido, lenguajes = "", opciones = {}) {
  const evaluaciones = [];
  const resultado = analizarEntregaDetallada(contenido, lenguajes, { ...opciones, incluirComentarios: true, [EVALUACIONES_PROSA]: evaluaciones });
  await revisarProsa(resultado, opciones);
  for (const evaluar of evaluaciones) evaluar();
  const regla = resultado.resultados.find(r => r.id === "ausencia_faltas");
  resultado.reglasActivadas = [...new Set(resultado.resultados.filter(r => r.cumple).map(r => r.id))];
  resultado.sumaPesosBase = resultado.reglasActivadas.reduce((suma, id) => suma + (opciones.pesos?.[id] ?? PESOS[id]), 0);
  resultado.sumaSinLimitar = resultado.sumaPesosBase === 0 ? 0 : resultado.sumaPesosBase * resultado.multiplicadorPenalizaciones;
  resultado.puntuacionAntesReduccion = resultado.puntuacion === null ? null : Math.min(100, resultado.sumaSinLimitar);
  const lineasRevisadas = regla?.valor?.lineasRevisadas || 0;
  resultado.reduccionOrtografica = regla?.aplicable && lineasRevisadas > 0
    ? Math.min(1, 5 * regla.valor.faltas / lineasRevisadas) : 0;
  resultado.descuentoOrtografico = {
    faltas: regla?.aplicable ? regla.valor.faltas : null,
    lineasRevisadas: regla?.aplicable ? lineasRevisadas : 0,
    porcentaje: Math.round(resultado.reduccionOrtografica * 10000) / 100,
    formula: 'min(100, faltasUnicas / lineasRevisadas * 500)'
  };
  resultado.puntuacion = resultado.puntuacionAntesReduccion === null ? null
    : Math.round(resultado.puntuacionAntesReduccion * (1 - resultado.reduccionOrtografica) * 100) / 100;
  resultado.fases = ["separacion", "extraccion_comentarios", "analisis_codigo_seleccionado", "preparacion_prosa", "revision_ortografica", "reglas_prosa_y_puntuacion"];
  return resultado;
}

export const EXPRESIONES_VIGILADAS = Object.freeze([
  'de que', 'hubieron', 'han habido', 'habían', 'sobretodo', 'mi', 'tu',
  'a parte', 'aun', 'ni si quiera', 'a ver'
]);
function detectarExpresionesVigiladas(f) {
  const alternativas = EXPRESIONES_VIGILADAS.map(t => t.replaceAll(' ', '\\s+').replace('í', '(?:í|i\\u0301)')).join('|');
  const patron = new RegExp('(?<![\\p{L}\\p{M}\\p{N}_$])(?:' + alternativas + ')(?![\\p{L}\\p{M}\\p{N}_$])', 'giu');
  const normal = t => t.normalize('NFC').toLowerCase().replace(/\s+/g, ' ');
  return [...f.texto.matchAll(patron)].filter(m => normal(f.original.slice(m.index, m.index + m[0].length)) === normal(m[0])).map(m => ({
    offset: (f.offset || 0) + m.index, length: m[0].length, tipo: 'expresion_vigilada',
    expresion: normal(m[0]), replacements: [],
    message: 'Expresión vigilada por configuración; puede ser correcta según el contexto.'
  }));
}

async function revisarProsa(resultado, opciones) {
  const fragmentos = resultado.fragmentosOrtografia || [];
  const comentariosDisponibles = resultado.comentariosExtraidosCompletos === true;
  delete resultado.fragmentosOrtografia;
  delete resultado.comentariosExtraidosCompletos;
  const regla = resultado.resultados.find(r => r.id === "ausencia_faltas");
  resultado.puntuacionAntesReduccion = resultado.puntuacion;
  resultado.reduccionOrtografica = 0;
  if (!regla) return resultado;
  const config = opciones.ortografia || {};
  if (!comentariosDisponibles) {
    regla.motivo = "Los errores del código impiden extraer la totalidad de los comentarios.";
    return resultado;
  }
  const preparacionProsa = prepararProsa(fragmentos, config);
  resultado.preparacionProsa = preparacionProsa;
  const tienePalabrasRevisables = t => (t.normalize('NFC').match(/\p{L}+/gu) || []).some(p => [...p].length >= 3);
  const seleccionados = preparacionProsa.fragmentos.filter(f => tienePalabrasRevisables(f.texto) || detectarExpresionesVigiladas(f).length);
  const lineasElegibles = new Set();
  for (const f of seleccionados) {
    f.texto.split('\n').forEach((linea, i) => {
      if (tienePalabrasRevisables(linea) || detectarExpresionesVigiladas({texto:linea,original:f.original.split('\n')[i]}).length) lineasElegibles.add(JSON.stringify([f.archivo, f.linea + i]));
    });
  }
  const lineasRevisadas = lineasElegibles.size;
  let texto = "";
  for (const f of seleccionados) { f.offset = texto.length; texto += f.texto + "\n\n"; }
  const palabras = (texto.normalize('NFC').match(/\p{L}+/gu) || []).filter(p => [...p].length >= 3).length;
  const vigiladas = seleccionados.flatMap(detectarExpresionesVigiladas);
  const minimo = 1;
  const excluidos = motivo => [...new Set(preparacionProsa.exclusiones.filter(e => e.motivo === motivo).map(e => e.token))];
  regla.valor = { palabras, lineasRevisadas, minimo, idioma: config.idioma || "es", exclusionIngles: preparacionProsa.exclusionIngles,
    tecnicosExcluidos: excluidos('glosario_tecnico'), camelCaseExcluidos: excluidos('camelCase'),
    puntosInternosExcluidos: excluidos('punto_interno'),
    terminosExcluidos: [...excluidos('glosario_tecnico'), ...excluidos('glosario_ingles')] };
  if (palabras < minimo && !vigiladas.length) {
    regla.motivo = "No quedan palabras de tres o más letras ni expresiones vigiladas tras aplicar las exclusiones. No se ha solicitado revisión ortográfica.";
    return resultado;
  }
  try {
    const revisar = opciones.revisorOrtografico || consultarLanguageTool;
    const data = await revisar(texto, config);
    if (!Array.isArray(data?.matches) || data.warnings?.incompleteResults) throw new Error("Respuesta ortográfica incompleta o inválida.");
    if (data.matches.some(m => !Number.isInteger(m.offset) || m.offset < 0 || m.offset >= texto.length || !Number.isInteger(m.length) || m.length < 0 || m.offset + m.length > texto.length)) {
      throw new Error("El servicio devolvió posiciones de errores inválidas.");
    }
    // Cada categoría acepta solo la transformación concreta solicitada.
    const palabra = /^[\p{L}\p{M}]+$/u;
    const caracterPalabra = /[\p{L}\p{M}\p{N}_]/u;
    const candidatasAPI = data.matches.flatMap(m => {
      if (vigiladas.some(v => m.offset < v.offset + v.length && m.offset + m.length > v.offset)) return [];
      if ([m.message, m.shortMessage, m.rule?.description].some(t => typeof t === "string" && /si\s+es/i.test(t))) return [];
      if (m.rule?.issueType === "style" || m.rule?.category?.id === "STYLE") return [];
      const original = texto.slice(m.offset, m.offset + m.length);
      const sugerencias = (m.replacements || []).filter(r => typeof r.value === "string");
      const f = seleccionados.find(f => m.offset >= f.offset && m.offset + m.length <= f.offset + f.texto.length);
      if (!f || !original) return [];
      const inicio = m.offset - f.offset;
      // No aceptar un comienzo de frase creado al borrar términos excluidos.
      const prefijo = f.original.slice(0, inicio).split(/[.!?\n]/u).at(-1);
      let tipo, replacements;
      if (m.rule?.id === 'UPPERCASE_SENTENCE_START' && /^\p{Ll}/u.test(original) &&
          /^[\s¿¡«»"'“”‘’()*\-–—]*$/u.test(prefijo)) {
        tipo = 'inicio_minuscula';
        replacements = sugerencias.filter(r => r.value === original[0].toUpperCase() + original.slice(1));
      } else if (['COMMA_PARENTHESIS_WHITESPACE','INCORRECT_SPACES','ESPACIO_DESPUES_DE_PUNTO','SENTENCE_WHITESPACE'].includes(m.rule?.id)) {
        tipo = 'espacio_puntuacion';
        const corregida = original.replace(/([.,;:!?])(?=\p{L})/gu, '$1 ');
        replacements = sugerencias.filter(r => corregida !== original && r.value === corregida);
      } else if (m.rule?.id === 'ES_QUESTION_MARK') {
        tipo = 'apertura_ausente';
        replacements = sugerencias.filter(r => r.value === '¿' + original || r.value === '¡' + original);
      } else {
        tipo = 'tilde_omitida';
        if ([...original.normalize("NFC")].length < 3 || !palabra.test(original) || caracterPalabra.test(texto.slice(0, m.offset).slice(-1)) ||
            caracterPalabra.test(texto.slice(m.offset + m.length, m.offset + m.length + 1))) return [];
        replacements = sugerencias.filter(r => palabra.test(r.value) && faltaTildeMinuscula(original, r.value));
      }
      return replacements.length ? [{ ...m, tipo, replacements }] : [];
    });
    const candidatas = [...vigiladas, ...candidatasAPI];
    const unicas = new Map();
    for (const m of candidatas) {
      const contexto = ['tilde_omitida','expresion_vigilada'].includes(m.tipo) ? texto.slice(m.offset, m.offset + m.length)
        : texto.slice(m.offset, m.offset + m.length) + '|' + texto.slice(m.offset + m.length).split(/[.!?\n]/u)[0];
      const clave = m.tipo + ':' + contexto.normalize('NFC').toLowerCase().replace(/\s+/g, ' ').trim();
      if (unicas.has(clave)) unicas.get(clave).apariciones++;
      else unicas.set(clave, { ...m, apariciones: 1 });
    }
    const faltas = [...unicas.values()];
    regla.aplicable = true;
    regla.estadoRevision = "completada";
    regla.peso = regla.pesoConfigurado;
    regla.cumple = faltas.length === 0 && !(opciones.desactivadas || []).includes("ausencia_faltas");
    regla.puntosAplicados = regla.cumple ? regla.peso : 0;
    regla.motivo = null;
    regla.valor = { ...regla.valor, faltas: faltas.length, aparicionesFaltas: candidatas.length, faltasRepetidas: candidatas.length - faltas.length, avisosDescartados: data.matches.length - candidatasAPI.length,
      faltasPorTipo: Object.fromEntries(["tilde_omitida", "inicio_minuscula", "espacio_puntuacion", "apertura_ausente", "expresion_vigilada"].map(tipo => [tipo, faltas.filter(f => f.tipo === tipo).length])),
      expresionesVigiladas: faltas.filter(f => f.tipo === 'expresion_vigilada').map(f => ({expresion:f.expresion,apariciones:f.apariciones})),
      sugerenciasEstilo: data.matches.filter(m => m.rule?.issueType === "style" || m.rule?.category?.id === "STYLE").length,
      filtro: "Tildes omitidas desde 3 letras, inicio de frase en minúscula, espacio tras puntuación y apertura ¿/¡ ausente y lista de expresiones vigiladas; sin repetir error; avisos API Si es excluidos",
      servicio: "LanguageTool", version: data.software?.version || null };
    const evidencias = faltas.length ? faltas.map(m => {
      const f = seleccionados.find(f => m.offset >= f.offset && m.offset < f.offset + f.texto.length) || seleccionados[0];
      const sugerencias = (m.replacements || []).slice(0, 3).map(r => r.value).join(", ");
      return { tipo: m.tipo, linea: f.linea + (f.texto.slice(0, m.offset - f.offset).match(/\n/g) || []).length, archivo: f.archivo,
        detalle: m.tipo + ' · ' + "Inicio del comentario · " + f.archivo + "\n" + (m.message || "Posible falta") +
          "\nFragmento: " + texto.slice(m.offset, m.offset + m.length) +
          "\nApariciones: " + m.apariciones + " (cuenta una sola falta)" +
          (sugerencias ? "\nSugerencias: " + sugerencias : "") };
    }) : seleccionados.map(f => ({ linea: f.linea, archivo: f.archivo,
      detalle: "Comentario revisado sin faltas detectadas: " + f.texto.slice(0, 200) }));
    regla.evidencias = config.mostrarDetalle === false ? [] : evidencias.slice(0, 30);
    regla.evidenciasTotales = config.mostrarDetalle === false ? 0 : evidencias.length;
  } catch (error) {
    regla.estadoRevision = "fallida";
    regla.peso = 0;
    regla.puntosAplicados = 0;
    regla.motivo = "No se pudo completar la revisión ortográfica: " + error.message;
    resultado.errores.push({ archivo: "Revisión ortográfica", lenguaje: "texto", linea: null, mensaje: regla.motivo });
    resultado.estado = "analisis_parcial";
    // El fallo externo no elimina las coincidencias literales comprobadas localmente.
    if (vigiladas.length) {
      const unicas = new Map();
      for (const v of vigiladas) {
        if (unicas.has(v.expresion)) unicas.get(v.expresion).apariciones++;
        else unicas.set(v.expresion, {...v,apariciones:1});
      }
      const locales = [...unicas.values()];
      regla.aplicable = true;
      regla.estadoRevision = 'parcial';
      regla.valor = {...regla.valor, faltas:locales.length, aparicionesFaltas:vigiladas.length,
        faltasRepetidas:vigiladas.length-locales.length,
        faltasPorTipo:{expresion_vigilada:locales.length},
        expresionesVigiladas:locales.map(v=>({expresion:v.expresion,apariciones:v.apariciones}))};
      regla.motivo += ' Solo se contabilizan las expresiones vigiladas detectadas localmente.';
      regla.evidencias = config.mostrarDetalle === false ? [] : locales.slice(0,30).map(v=>{
        const f=seleccionados.find(f=>v.offset>=f.offset&&v.offset<f.offset+f.texto.length);
        return {tipo:v.tipo,archivo:f.archivo,linea:f.linea+(f.texto.slice(0,v.offset-f.offset).match(/\n/g)||[]).length,
          detalle:v.message+'\nFragmento: '+v.expresion+'\nApariciones: '+v.apariciones+' (cuenta una sola coincidencia)'};
      });
      regla.evidenciasTotales = config.mostrarDetalle === false ? 0 : locales.length;
    }
  }
  return resultado;
}


/** Contrato público: [comentariosEscasos, humanidad, reglasDetectadas].
 * Humanidad es el complemento del índice heurístico, no una prueba de autoría.
 * Sin puntuación calculable se devuelve null, nunca un 100 ficticio.
 */
/** Recuento previo para decidir qué patrones requieren más código. */
export function comprobarCodigoBreve(contenido, lenguajes = '') {
  const preparacion = prepararEntrega(contenido), seleccion = resolverSeleccion(preparacion, lenguajes);
  const unidades = prepararUnidades(preparacion, seleccion);
  const lineas = new Set(); let numeroComentarios = 0;
  for (const u of unidades.filter(u => u.lenguaje !== 'texto')) {
    const comentarios = [];
    try {
      if (u.lenguaje === 'js') {
        const lector = acorn.tokenizer(u.texto, { ecmaVersion: 'latest', onComment: comentarios });
        while (lector.getToken().type.label !== 'eof') {}
      } else if (u.lenguaje === 'css') {
        postcss.parse(u.texto).walkComments(c => comentarios.push({ start: c.source.start.offset, end: c.source.end.offset + 1 }));
      } else comentarios.push(...u.html.comentarios);
    } catch { return null; }
    numeroComentarios += comentarios.length;
    let codigo = u.texto;
    for (const c of comentarios.sort((a,b)=>b.start-a.start)) {
      codigo = codigo.slice(0,c.start) + codigo.slice(c.start,c.end).replace(/[^\r\n]/g,' ') + codigo.slice(c.end);
    }
    codigo.split('\n').forEach((linea,i)=>{
      if (linea.trim()) lineas.add(JSON.stringify([u.nombre.split('#')[0], u.base+i+1]));
    });
  }
  if (lineas.size === 0 || lineas.size >= 10) return null;
  return { lineas: lineas.size, comentarios: numeroComentarios };
}

export function crearVectorResultado(informe) {
  const escasos = informe.resultados.find(r => r.id === 'sin_comentarios');
  const noDetectados = informe.lenguajes.filter(tipo =>
    !informe.preparacion.bloques[tipo === 'js' ? 'javascript' : tipo].some(f => f.texto.trim()));
  const grupos = new Map();
  for (const r of informe.resultados) {
    if (!r.aplicable || !r.cumple || !(r.peso > 0)) continue;
    if (!grupos.has(r.id)) grupos.set(r.id, { id: r.id, peso: r.peso, coincidencias: [] });
    grupos.get(r.id).coincidencias.push(r);
  }
  const detalles = [...grupos.values()];
  for (const lenguaje of noDetectados) detalles.push({
    id: 'contenido_no_detectado', lenguaje, peso: 0, mensaje: 'Código/texto no detectado'
  });
  if (escasos?.cumple === true) {
    const regla = grupos.get('sin_comentarios');
    if (regla) regla.mensaje = 'No se admite código sin comentar';
    else detalles.push({ id: 'sin_comentarios', peso: 0, mensaje: 'No se admite código sin comentar', coincidencias: [escasos] });
  }
  return [escasos?.cumple === true,
    informe.puntuacion === null ? null : Math.round((100 - informe.puntuacion) * 100) / 100,
    detalles];
}
export const PATRONES_REPETICION = Object.freeze([
  'comentarios_mayuscula', 'comentarios_sin_puntos', 'comentarios_punto_final',
  'comentarios_longitud_similar', 'comentarios_antes_funciones', 'comentarios_separadores',
  'comentarios_repetidos', 'indentacion_par', 'sangria_uniforme', 'espaciado_uniforme',
  'comillas_uniformes', 'validaciones_repetidas'
]);
function opcionesParaEntrega(contenido, lenguajes, opciones) {
  const codigoBreve = comprobarCodigoBreve(contenido, lenguajes);
  return { ...opciones, codigoBreve };
}
export async function analizarEntregaInformeAsync(contenido, lenguajes = '', opciones = {}) {
  const config = opcionesParaEntrega(contenido, lenguajes, opciones);
  const informe = await analizarEntregaDetalladaAsync(contenido, lenguajes, config);
  if (config.codigoBreve) informe.codigoBreve = config.codigoBreve;
  return informe;
}
export function analizarEntrega(contenido, lenguajes = '', opciones = {}) {
  return crearVectorResultado(analizarEntregaDetallada(contenido, lenguajes, opcionesParaEntrega(contenido, lenguajes, opciones)));
}
export async function analizarEntregaAsync(contenido, lenguajes = '', opciones = {}) {
  return crearVectorResultado(await analizarEntregaInformeAsync(contenido, lenguajes, opciones));
}
