/**
 * CONTROL DE ACCESO Y SELLO DE ENTREGA · base3
 * Cloudflare Worker. Ve la IP real del alumno y usa la hora del servidor, dos cosas que
 * una página estática no puede comprobar por sí misma.
 *
 *   GET  /acceso?a=modulo/actividad      → { ok }   ¿se puede abrir ahora y desde aquí?
 *   POST /sello        { a, email, huella } → sello firmado con IP, hora y si cumple
 *   POST /verificar    { sello }            → { valido }   ¿el sello lo emitió este servidor?
 *   GET  /diagnostico?clave=…               → IP y horario vistos por el servidor (profesor)
 *
 * Secretos (Configuración → Variables y secretos, tipo «Secreto»), nunca en el repositorio:
 *   CLAVE_PROFESOR   clave que se añade a la dirección del laboratorio: &clave=…
 *   SECRETO_SELLO    texto largo aleatorio con el que se firman los sellos
 */

// ───────────── Ajustes: lo único que hay que tocar si cambian la red o el horario ─────────────
const REDES = ['45.86.184.0/24'];            // redes del centro (IPv4 o IPv6, en notación CIDR)
const MARGEN_MINUTOS = 5;                    // margen antes y después de cada clase
const ZONA = 'Europe/Madrid';
const ORIGENES = ['https://igarciafp.github.io'];   // sitios que pueden usar este servidor

const A = ['16:30', '17:30'], B = ['17:30', '18:30'], C = ['18:45', '19:45'], D = ['19:45', '20:45'], E = ['20:45', '21:45'];
// Aula 2.7. Días: 1 = lunes … 5 = viernes.
const HORARIO = {
  ssii: { 1: [A], 3: [B, C], 4: [D, E] },
  diw:  { 2: [B, C], 5: [C, D, E] },
  dwec: { 2: [D, E], 3: [D, E], 4: [B, C] },
};
// ──────────────────────────────────────────────────────────────────────────────────────────────

const ACTIVIDAD = /^(diw|dwec|ssii)\/([a-z0-9][a-z0-9-]{0,59})$/;
const DIAS = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const minutos = texto => { const [h, m] = texto.split(':').map(Number); return h * 60 + m; };

export function momento(fecha) {
  const partes = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: ZONA, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    .formatToParts(fecha).map(p => [p.type, p.value]));
  return { dia: DIAS[partes.weekday], minuto: Number(partes.hour) * 60 + Number(partes.minute) };
}
export function enHorario(modulo, fecha) {
  const { dia, minuto } = momento(fecha);
  return (HORARIO[modulo]?.[dia] || []).some(([inicio, fin]) => minuto >= minutos(inicio) - MARGEN_MINUTOS && minuto <= minutos(fin) + MARGEN_MINUTOS);
}

function ipv4(texto) {
  const partes = texto.split('.');
  if (partes.length !== 4 || partes.some(p => !/^\d{1,3}$/.test(p) || Number(p) > 255)) return null;
  return partes.reduce((n, p) => (n << 8n) | BigInt(p), 0n);
}
function ipv6(texto) {
  if (!/^[0-9a-f:]+$/i.test(texto) || (texto.match(/::/g) || []).length > 1) return null;
  const [antes, despues] = texto.split('::');
  const grupos = t => (t ? t.split(':') : []);
  const a = grupos(antes), b = despues === undefined ? [] : grupos(despues);
  const todos = despues === undefined ? a : [...a, ...Array(8 - a.length - b.length).fill('0'), ...b];
  if (todos.length !== 8 || todos.some(g => !/^[0-9a-f]{1,4}$/i.test(g))) return null;
  return todos.reduce((n, g) => (n << 16n) | BigInt(parseInt(g, 16)), 0n);
}
export function enRed(ip, redes = REDES) {
  ip = String(ip || '').trim().toLowerCase();
  const mapeada = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(ip);
  if (mapeada) ip = mapeada[1];
  for (const red of redes) {
    const [base, prefijo] = red.split('/');
    const v6 = base.includes(':'), bits = v6 ? 128n : 32n;
    const a = v6 ? ipv6(ip) : ipv4(ip), b = v6 ? ipv6(base.toLowerCase()) : ipv4(base);
    if (a === null || b === null) continue;
    const quitar = bits - BigInt(prefijo);
    if (a >> quitar === b >> quitar) return true;
  }
  return false;
}

const hex = bytes => Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
async function iguales(a, b) {
  // Comparación sin filtrar por tiempo cuánto coincide.
  const [x, y] = await Promise.all([a, b].map(t => crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(t)))));
  return hex(x) === hex(y);
}
async function esProfesor(clave, env) {
  return !!env.CLAVE_PROFESOR && typeof clave === 'string' && clave.length > 0 && iguales(clave, env.CLAVE_PROFESOR);
}
async function firmar(sello, env) {
  const clave = await crypto.subtle.importKey('raw', new TextEncoder().encode(env.SECRETO_SELLO), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const datos = JSON.stringify([sello.ip, sello.hora, sello.modulo, sello.actividad, sello.email, sello.huella, sello.enRed, sello.enHorario, sello.profesor]);
  return hex(await crypto.subtle.sign('HMAC', clave, new TextEncoder().encode(datos)));
}

function responder(datos, origen, estado = 200) {
  const cabeceras = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', vary: 'Origin' };
  if (origen) cabeceras['access-control-allow-origin'] = origen;
  return new Response(JSON.stringify(datos), { status: estado, headers: cabeceras });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url), ruta = url.pathname.replace(/\/+$/, '') || '/';
    const pedido = request.headers.get('Origin');
    const permitidos = [...ORIGENES, ...String(env.ORIGENES_EXTRA || '').split(',').map(t => t.trim()).filter(Boolean)];
    const origen = permitidos.includes(pedido) ? pedido : null;
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: origen ? { 'access-control-allow-origin': origen, 'access-control-allow-methods': 'GET, POST', 'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'Origin' } : {} });
    }
    if (!env.SECRETO_SELLO) return responder({ ok: false, error: 'SIN_CONFIGURAR' }, origen, 500);
    const ip = request.headers.get('CF-Connecting-IP') || '', ahora = new Date();
    try {
      if (request.method === 'GET' && ruta === '/acceso') {
        const actividad = ACTIVIDAD.exec(String(url.searchParams.get('a') || '').toLowerCase());
        if (!actividad) return responder({ ok: false }, origen);
        if (await esProfesor(url.searchParams.get('clave'), env)) return responder({ ok: true, profesor: true }, origen);
        // La negativa no explica el motivo: la página muestra «No se encuentra la actividad.».
        return responder({ ok: enRed(ip) && enHorario(actividad[1], ahora) }, origen);
      }
      if (request.method === 'POST' && ruta === '/sello') {
        const cuerpo = JSON.parse(await request.text());
        const actividad = ACTIVIDAD.exec(String(cuerpo.a || '').toLowerCase());
        if (!actividad || typeof cuerpo.email !== 'string' || cuerpo.email.length > 254 || !/^[a-f0-9]{64}$/.test(cuerpo.huella || '')) return responder({ error: 'INVALIDO' }, origen, 400);
        const sello = { ip, hora: ahora.toISOString(), modulo: actividad[1], actividad: actividad[2], email: cuerpo.email.toLowerCase(), huella: cuerpo.huella,
          enRed: enRed(ip), enHorario: enHorario(actividad[1], ahora), profesor: await esProfesor(cuerpo.clave, env) };
        return responder({ ...sello, firma: await firmar(sello, env) }, origen);
      }
      if (request.method === 'POST' && ruta === '/verificar') {
        const sello = JSON.parse(await request.text()).sello || {};
        const valido = typeof sello.firma === 'string' && await iguales(sello.firma, await firmar(sello, env));
        return responder({ valido }, origen);
      }
      if (request.method === 'GET' && ruta === '/diagnostico') {
        if (!await esProfesor(url.searchParams.get('clave'), env)) return responder({ ok: false }, origen, 403);
        const { dia, minuto } = momento(ahora);
        return responder({ ip, enRed: enRed(ip), redes: REDES, dia, hora: String(Math.floor(minuto / 60)).padStart(2, '0') + ':' + String(minuto % 60).padStart(2, '0'),
          abiertos: Object.keys(HORARIO).filter(m => enHorario(m, ahora)), margenMinutos: MARGEN_MINUTOS }, origen);
      }
    } catch { return responder({ error: 'INVALIDO' }, origen, 400); }
    return responder({ ok: false }, origen, 404);
  },
};
