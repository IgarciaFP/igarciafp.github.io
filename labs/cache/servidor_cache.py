#!/usr/bin/env python3
"""Laboratorio de caché HTTP. Python 3, sin dependencias. Solo localhost.
Ejecutar: python3 servidor_cache.py. Abrir http://localhost:8765.
Detener: Ctrl+C. Cada caso dispone de URLs nuevas y estado independiente.
"""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
import json
import secrets
import threading

CASES = {}
LOCK = threading.Lock()
PAGE = '''<!doctype html><html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>El fantasma · HTTP real</title><style>body{font:18px/1.6 system-ui;max-width:900px;margin:40px auto;padding:0 20px;color:#152038}button{font:inherit;padding:12px;margin:5px;border:1px solid #a9b7cc;border-radius:8px;background:#edf2ff;cursor:pointer}button:disabled{opacity:.5}pre{white-space:pre-wrap;background:#152038;color:white;padding:20px;border-radius:12px}output{display:block;padding:20px;background:#edf2ff;font-size:26px}h1{line-height:1.2}</style><h1>El fantasma · HTTP real</h1><p>Abre Network / Red y deja «Disable cache» desmarcado. Empieza un caso, pide una copia y luego publica v2. Todo ocurre en este ordenador.</p><button id="new">Nuevo caso</button><button id="publish" disabled>Publicar v2</button><p id="case" role="status">Creando caso…</p><div><button data-kind="fresh" disabled>Copia de 60 s</button><button data-kind="fresh" data-force="yes" disabled>Revalidar copia de 60 s</button><button data-kind="check" disabled>Comprobar siempre</button><button data-kind="storeless" disabled>No almacenar</button><button data-kind="versioned" disabled>Pedir cartel-v2.txt</button></div><output id="poster" aria-live="polite">Todavía no has pedido el cartel.</output><pre id="log" role="log"></pre><p>El estado que ve JavaScript puede ser 200 aunque Network y el servidor muestren un 304: el navegador reconstruye la respuesta con el cuerpo almacenado. Una copia local puede no generar ninguna línea nueva en el servidor.</p><p>Las cabeceras están en la respuesta, no en etiquetas meta de esta página. En «Copia de 60 s» el reloj es real. Las otras políticas usan URLs distintas para comparar sin contaminar sus entradas.</p><script>
const $=id=>document.getElementById(id);let caseId=null,busy=false;
function log(s){$('log').textContent+=s+'\\n';}
async function run(fn){if(busy)return;busy=true;document.querySelectorAll('button').forEach(b=>b.disabled=true);try{await fn();}catch(e){log('Error: '+e.message);}finally{busy=false;document.querySelectorAll('button').forEach(b=>b.disabled=!caseId&&b.id!=='new');}}
async function freshCase(){const r=await fetch('/api/new',{method:'POST'});if(!r.ok)throw new Error('No se pudo crear el caso');const d=await r.json();caseId=d.id;$('case').textContent='Caso '+caseId+' · Servidor v1 (17:00)';$('poster').textContent='Todavía no has pedido el cartel.';$('log').textContent='URLs nuevas. Los datos ajenos a este caso se conservan.\\n';}
$('new').onclick=()=>run(freshCase);
$('publish').onclick=()=>run(async()=>{const r=await fetch('/api/publish/'+caseId,{method:'POST'});if(!r.ok)throw new Error('No se pudo publicar');$('case').textContent='Caso '+caseId+' · Servidor v2 (18:00)';log('Servidor actualizado. Las copias no han recibido un aviso.');});
document.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>run(async()=>{const kind=b.dataset.kind,path='/case/'+caseId+'/'+(kind==='versioned'?'cartel-v2.txt':kind+'.txt');const r=await fetch(path,b.dataset.force?{cache:'no-cache'}:{});const body=await r.text();$('poster').textContent=body;log(path+' → estado visto por JS: '+r.status+'; Cache-Control: '+r.headers.get('Cache-Control')+'; ETag: '+r.headers.get('ETag'));}));run(freshCase);
</script></html>'''

class Handler(BaseHTTPRequestHandler):
    def reply(self, status, body=b'', content_type='text/plain; charset=utf-8', policy='no-store', etag=None):
        if isinstance(body, str):
            body = body.encode('utf-8')
        self.send_response(status)
        self.send_header('Cache-Control', policy)
        if etag:
            self.send_header('ETag', etag)
        if status != 304:
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        if status != 304:
            self.wfile.write(body)

    def do_POST(self):
        # Only this local page should be able to mutate its teaching state.
        origin = self.headers.get('Origin')
        if origin and origin not in ('http://localhost:8765', 'http://127.0.0.1:8765'):
            return self.reply(403, 'Origen no permitido')
        path = urlparse(self.path).path
        with LOCK:
            if path == '/api/new':
                if len(CASES) >= 1000:
                    return self.reply(503, 'Reinicia el servidor para abrir más casos.')
                case_id = secrets.token_hex(5)
                CASES[case_id] = 1
                return self.reply(200, json.dumps({'id': case_id}), 'application/json')
            if path.startswith('/api/publish/'):
                case_id = path.rsplit('/', 1)[-1]
                if case_id in CASES:
                    CASES[case_id] = 2
                    return self.reply(200, 'Servidor actualizado a v2')
        self.reply(404, 'Caso desconocido')

    def do_GET(self):
        path = urlparse(self.path).path
        if path == '/':
            return self.reply(200, PAGE, 'text/html; charset=utf-8')
        parts = path.strip('/').split('/')
        if len(parts) != 3 or parts[0] != 'case':
            return self.reply(404, 'Recurso desconocido')
        _, case_id, resource = parts
        policies = {'fresh.txt': 'max-age=60', 'check.txt': 'no-cache', 'storeless.txt': 'no-store', 'cartel-v2.txt': 'max-age=3600'}
        with LOCK:
            version = CASES.get(case_id)
        if version is None or resource not in policies:
            return self.reply(404, 'Recurso desconocido')
        if resource == 'cartel-v2.txt':
            if version != 2:
                return self.reply(404, 'Publica v2 antes de pedir su URL versionada.')
            version = 2
        etag = '"cartel-v%d"' % version
        policy = policies[resource]
        if policy != 'no-store' and self.headers.get('If-None-Match') == etag:
            return self.reply(304, policy=policy, etag=etag)
        self.reply(200, 'Torneo · %s · v%d' % ('17:00' if version == 1 else '18:00', version), policy=policy, etag=etag)

if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 8765), Handler)
    print('Laboratorio listo: http://localhost:8765 — detener con Ctrl+C', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print('\nLaboratorio detenido.')
    finally:
        server.server_close()
