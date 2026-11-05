import * as acorn from "acorn";
import postcss from "postcss";
import * as parse5 from "parse5";

/**
 * Índice heurístico de revisión; NO es una probabilidad calibrada de uso de IA.
 * Nunca ejecuta el código del alumno ni descarga sus recursos.
 *
 * contenido: string (un lenguaje o HTML con bloques incrustados),
 *            o { js: "...", css: "...", html: "..." }.
 * lenguajes: "", "JS Css", "HTML+css", "jscss", etc.
 * opciones: { pesos: {id: numero}, desactivadas: [id], umbrales: {...} }
 *
 * Con varios lenguajes y texto sin HTML, usa el objeto para evitar ambigüedad.
 * El HTML solo extrae script/style: no carga src/href ni analiza handlers/style
 * de atributos. No admite JSX ni TypeScript.
 */
export const PESOS = Object.freeze({
  sin_comentarios: 100, caracteres_especiales: 75,
  comentarios_mayuscula: 10, indentacion_par: 10,
  comentarios_abundantes: 10, comentarios_sin_puntos: 10,
  comentarios_punto_final: 10, comentarios_largos: 10, comentarios_longitud_similar: 10,
  comentarios_antes_funciones: 10, comentarios_separadores: 10,
  comentarios_pasos: 10, comentarios_etiquetas: 10,
  comentarios_jsdoc: 10, comentarios_repetidos: 10,
  comentarios_conversacionales: 10, comentarios_instrucciones: 10,
  menciones_ia: 10, ausencia_faltas: 50,
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
  proporcionUniversal: 0.9, proporcionLongitudSimilar: 0.8,
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
  const normal = valor.toLowerCase().replace(/[\s+,;|/\-]+/g, "");
  const encontrados = normal.match(/html|css|js/g) || [];
  if (normal.replace(/html|css|js/g, "")) {
    throw new TypeError("Usa únicamente js, html y css, juntos o separados");
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
    if (n.nodeName === "#text" && p) textos.push({ text: n.value, start: p.startOffset });
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

function prepararUnidades(contenido, seleccion, avisos = []) {
  const unidades = [];
  function agregar(lenguaje, texto, nombre) {
    if (typeof texto !== "string") throw new TypeError(nombre + " debe contener texto");
    if (lenguaje !== "html") {
      if (seleccion.includes(lenguaje)) unidades.push({ lenguaje, texto, nombre, base: 0 });
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
        ? "El texto pegado después de </html> se analiza como un fragmento JavaScript separado."
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
      const lenguaje = clave.toLowerCase();
      if (!["js", "html", "css"].includes(lenguaje)) throw new TypeError("Clave desconocida: " + clave);
      agregar(lenguaje, texto, "contenido." + lenguaje);
    }
  } else throw new TypeError("contenido debe ser texto o un objeto {js, html, css}");
  return unidades;
}

export function analizarEntrega(contenido, lenguajes = "", opciones = {}) {
  const seleccion = seleccionarLenguajes(lenguajes);
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
  if (!seleccion.length) return { lenguajes: [], puntuacion: null, resultados, errores, estado: "sin_lenguajes" };
  const unidades = prepararUnidades(contenido, seleccion, avisos);
  for (const unidad of unidades) {
    const { texto: s, lenguaje, nombre, base } = unidad;
    const linea = posicion => base + 1 + (s.slice(0, posicion).match(/\n/g) || []).length;
    const evidencia = (start, detalle) => ({ linea: linea(start), detalle });
    function registrar(id, aplicable, cumple, valor, evidencias = [], motivo = null) {
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
    const textos = comentarios.map(c => c.text.replace(/^\s*\* ?/gm, "").trim());
    const activos = comentarios.map((c, i) => ({ ...c, text: textos[i] })).filter(c => /\p{L}/u.test(c.text));
    const suficiente = activos.length >= u.minComentarios;
    const evComentarios = cs => cs.map(c => evidencia(c.start, c.text.slice(0, 160)));
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
      // ID conservado; compara intros previos con el umbral general del 90 %.
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
      buscarComentarios("html_comentarios_secciones", /\b(header|navigation|main|footer|inicio|fin)\b/i);
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
  const densidadAplicable = !desactivadas.has("sin_comentarios") && !errores.length && lineasCodigo > 0;
  resultados.push({ id: "sin_comentarios", lenguaje: seleccion.join("+"), archivo: "Conjunto de lenguajes seleccionados",
    aplicable: densidadAplicable,
    cumple: densidadAplicable && totalComentarios * 10 < lineasCodigo,
    peso: pesos.sin_comentarios,
    valor: { comentarios: totalComentarios, lineasCodigo,
      comentariosPor10Lineas: lineasCodigo ? totalComentarios * 10 / lineasCodigo : null,
      umbral: "Menos de 1 comentario por cada 10 líneas de código",
      desglose: densidadPorUnidad },
    evidencias: densidadPorUnidad.slice(0, 30).map(d => ({ linea: d.primeraLinea,
      archivo: d.archivo, detalle: d.archivo + " · " + d.comentarios + " comentarios / " + d.lineasCodigo + " líneas de código" })),
    evidenciasTotales: densidadPorUnidad.length,
    motivo: desactivadas.has("sin_comentarios") ? "desactivada" : errores.length ? "Hay errores de sintaxis; no se puede calcular la densidad completa."
      : !lineasCodigo ? "No hay líneas de código en los lenguajes seleccionados." : null });
  resultados.push({ id: "ausencia_faltas", lenguaje: seleccion.join("+"), archivo: "Comentarios de la entrega",
    aplicable: false, cumple: false, valor: null, peso: pesos.ausencia_faltas,
    evidencias: [], evidenciasTotales: 0,
    motivo: "Revisión ortográfica pendiente del análisis asíncrono." });
  // Cada ID suma una sola vez aunque aparezca en varios archivos o lenguajes.
  const activadas = [...new Set(resultados.filter(r => r.cumple).map(r => r.id))];
  const suma = activadas.reduce((total, id) => total + pesos[id], 0);
  return { lenguajes: seleccion, puntuacion: unidades.length ? Math.min(100, suma) : null,
    sumaSinLimitar: suma, reglasActivadas: activadas, resultados, errores, avisos,
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

/** La entrada asíncrona revisa siempre la prosa de los comentarios disponible.
 * opciones.ortografia: { idioma:'es', mostrarDetalle:true, endpoint?:URL }
 * opciones.revisorOrtografico: proveedor inyectable para integración/pruebas.
 */
export async function analizarEntregaAsync(contenido, lenguajes = "", opciones = {}) {
  const resultado = analizarEntrega(contenido, lenguajes, { ...opciones, incluirComentarios: true });
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
  // Solo prosa de comentarios: excluye bloques de código Markdown, código inline,
  // URL y líneas de etiquetas JSDoc. Los nombres técnicos restantes pueden marcarse.
  const seleccionados = fragmentos.map(f => ({ ...f, texto: f.texto
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/^\s*\*?\s*@\w+.*$/gm, " ")
    .replace(/^\s*\* ?/gm, "").trim() })).filter(f => /\p{L}/u.test(f.texto));
  let texto = "";
  for (const f of seleccionados) { f.offset = texto.length; texto += f.texto + "\n\n"; }
  const palabras = (texto.match(/\p{L}+(?:['’-]\p{L}+)*/gu) || []).length;
  const minimo = 1;
  regla.valor = { palabras, minimo, idioma: config.idioma || "es" };
  if (palabras < minimo) {
    regla.motivo = "No hay prosa de comentarios que se pueda enviar a revisión.";
    return resultado;
  }
  try {
    const revisar = opciones.revisorOrtografico || consultarLanguageTool;
    const data = await revisar(texto, config);
    if (!Array.isArray(data?.matches) || data.warnings?.incompleteResults) throw new Error("Respuesta ortográfica incompleta o inválida.");
    if (data.matches.some(m => !Number.isInteger(m.offset) || m.offset < 0 || m.offset >= texto.length || !Number.isInteger(m.length) || m.length < 0 || m.offset + m.length > texto.length)) {
      throw new Error("El servicio devolvió posiciones de errores inválidas.");
    }
    // Solo sustituciones de una palabra completa por otra de igual longitud.
    // NFC hace que una vocal con tilde descompuesta se cuente como un carácter.
    const palabra = /^[\p{L}\p{M}]+$/u;
    const caracterPalabra = /[\p{L}\p{M}\p{N}_]/u;
    const longitud = t => [...t.normalize("NFC")].length;
    const faltas = data.matches.flatMap(m => {
      if (m.rule?.issueType === "style" || m.rule?.category?.id === "STYLE") return [];
      const original = texto.slice(m.offset, m.offset + m.length);
      if (!palabra.test(original) || caracterPalabra.test(texto.slice(0, m.offset).slice(-1)) ||
          caracterPalabra.test(texto.slice(m.offset + m.length, m.offset + m.length + 1))) return [];
      const replacements = (m.replacements || []).filter(r => typeof r.value === "string" &&
        palabra.test(r.value) && longitud(r.value) === longitud(original) &&
        r.value.normalize("NFC") !== original.normalize("NFC"));
      return replacements.length ? [{ ...m, replacements }] : [];
    });
    regla.aplicable = true;
    regla.cumple = faltas.length === 0 && !(opciones.desactivadas || []).includes("ausencia_faltas");
    regla.motivo = null;
    regla.valor = { ...regla.valor, faltas: faltas.length, avisosDescartados: data.matches.length - faltas.length,
      sugerenciasEstilo: data.matches.filter(m => m.rule?.issueType === "style" || m.rule?.category?.id === "STYLE").length,
      filtro: "Sustitución de palabra completa por otra distinta de igual longitud",
      servicio: "LanguageTool", version: data.software?.version || null };
    const evidencias = faltas.length ? faltas.map(m => {
      const f = seleccionados.find(f => m.offset >= f.offset && m.offset < f.offset + f.texto.length) || seleccionados[0];
      const sugerencias = (m.replacements || []).slice(0, 3).map(r => r.value).join(", ");
      return { linea: f.linea, archivo: f.archivo,
        detalle: "Inicio del comentario · " + f.archivo + "\n" + (m.message || "Posible falta") +
          "\nFragmento: " + texto.slice(m.offset, m.offset + m.length) +
          (sugerencias ? "\nSugerencias: " + sugerencias : "") };
    }) : seleccionados.map(f => ({ linea: f.linea, archivo: f.archivo,
      detalle: "Comentario revisado sin faltas detectadas: " + f.texto.slice(0, 200) }));
    regla.evidencias = config.mostrarDetalle === false ? [] : evidencias.slice(0, 30);
    regla.evidenciasTotales = config.mostrarDetalle === false ? 0 : evidencias.length;
  } catch (error) {
    regla.motivo = "No se pudo completar la revisión ortográfica: " + error.message;
    resultado.errores.push({ archivo: "Revisión ortográfica", lenguaje: "texto", linea: null, mensaje: regla.motivo });
    resultado.estado = "analisis_parcial";
  }
  resultado.reglasActivadas = [...new Set(resultado.resultados.filter(r => r.cumple).map(r => r.id))];
  resultado.sumaSinLimitar = resultado.reglasActivadas.reduce((suma, id) => suma + (opciones.pesos?.[id] ?? PESOS[id]), 0);
  resultado.puntuacionAntesReduccion = resultado.puntuacion === null ? null : Math.min(100, resultado.sumaSinLimitar);
  resultado.reduccionOrtografica = regla.aplicable ? Math.min(100, regla.valor.faltas * 10) / 100 : 0;
  resultado.puntuacion = resultado.puntuacionAntesReduccion === null ? null
    : Math.round(resultado.puntuacionAntesReduccion * (1 - resultado.reduccionOrtografica) * 100) / 100;
  return resultado;
}

