"""Pruebas de integración DOM en Chromium.

El entorno de desarrollo puede bloquear navegar a HTTP/file. Por ello esta
suite monta los tres archivos locales con set_content. localStorage y el
SHA-256 son DOBLES DE PRUEBA; no verifica persistencia nativa ni criptografía.
requestFullscreen/exitFullscreen, diálogos, teclado y JavaScript desactivado
sí se ejecutan en Chromium. Las señales de foco/visibilidad se simulan donde
se indica. No hay herramientas de simulación en el HTML publicado.

Ejecutar: pip install pytest playwright; playwright install chromium
          pytest -q labs/tests/test_repaso_seguridad.py
CHROMIUM_PATH permite usar un Chromium instalado en el sistema.
"""
import base64
import gzip
import json
import os
from pathlib import Path
import pytest
from playwright.sync_api import sync_playwright

LABS=Path(__file__).resolve().parents[1]
KEY='ssii-repaso-ud01-seguridad-v1'
LEGACY='ssii-repaso-ud01-v1'
HTML=(LABS/'repaso-ssii-u01.html').read_text()
for name in ('repaso-ssii-u01-seguridad.js','repaso-ssii-u01.js'):
    HTML=HTML.replace(f'<script src="{name}"></script>',f'<script>{(LABS/name).read_text()}</script>')

@pytest.fixture(scope='module')
def browser():
    with sync_playwright() as pw:
        executable=os.getenv('CHROMIUM_PATH')
        b=pw.chromium.launch(headless=True,executable_path=executable,args=['--no-sandbox'])
        yield b
        b.close()

@pytest.fixture
def make_page(browser):
    contexts=[]
    def make(store=None,js=True,setup='',html=HTML):
        ctx=browser.new_context(java_script_enabled=js,viewport={'width':1280,'height':900},reduced_motion='reduce')
        contexts.append(ctx)
        p=ctx.new_page();p.set_default_timeout(3500)
        errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
        if js:
            p.evaluate('''data=>{
              window.testStore=data;window.testWriteFail=false;
              Object.defineProperty(window,'localStorage',{value:{
                getItem:k=>window.testStore[k]??null,
                setItem:(k,v)=>{if(window.testWriteFail)throw new DOMException('Cuota','QuotaExceededError');window.testStore[k]=String(v);},
                removeItem:k=>delete window.testStore[k]
              }});
              // Solo para probar el flujo asíncrono del informe en about:blank.
              Object.defineProperty(window,'sessionStorage',{value:{getItem:k=>window.testStore[k]??null,setItem:(k,v)=>window.testStore[k]=String(v),removeItem:k=>delete window.testStore[k]}});
              Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('denied in test'))},configurable:true});
              Object.defineProperty(crypto,'subtle',{value:{digest:()=>new Promise(resolve=>setTimeout(()=>resolve(new Uint8Array(32).buffer),window.testDigestDelay||0))}});
            }''',store or {})
            if setup:p.evaluate('() => {'+setup+';}')
        p.set_content(html)
        p.errors=errors
        return p
    yield make
    for ctx in contexts:ctx.close()


def setup_identity(p,lang='es',email='alumno@g.educaand.es'):
    p.locator(f'[data-language="{lang}"]').click()
    p.locator('#guard-consent').check()
    p.locator('#fullname').fill('Alumno de prueba')
    p.locator('#student').fill(email)

def begin(p,lang='es'):
    setup_identity(p,lang)
    p.locator('#guard-start').click()
    p.wait_for_function("!document.querySelector('#answer-fields').disabled")

def state(p):
    return p.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))")

def resume(p):
    p.locator('#guard-continue').click()
    p.wait_for_function("!document.querySelector('#answer-fields').disabled")

def blur_return(p):
    p.evaluate("""() => {window.testFocus=false;document.hasFocus=()=>window.testFocus;
      window.dispatchEvent(new FocusEvent('blur'));
      window.testFocus=true;window.dispatchEvent(new FocusEvent('focus'));}""")
    p.wait_for_timeout(250)

def finish(p):
    p.locator('#guard-finish').click()
    p.locator('#guard-confirm-ok').click()
    p.wait_for_function(f"JSON.parse(localStorage.getItem('{KEY}')).phase==='submitted'")

def decode(code):
    assert code.startswith('SSII3G.')
    payload=code.split('.',1)[1]
    report=gzip.decompress(base64.urlsafe_b64decode(payload+'='*(-len(payload)%4))).decode('utf-8')
    body,checksum=report.rsplit('\nCódigo de comprobación: SSII3-',1)
    assert checksum=='00'*32  # This suite substitutes the hash API.
    return json.loads(body)

def test_no_javascript(make_page):
    p=make_page(js=False)
    assert p.locator('#cuaderno').is_hidden()
    assert p.locator('noscript').is_visible()
    assert p.locator('#t1').is_disabled()
    assert p.locator('[data-language=es]').is_disabled()

def test_missing_activity_keeps_closed(make_page):
    p=make_page(html=HTML[:HTML.rindex('<script>')]+'</body></html>')
    assert p.locator('#cuaderno').is_hidden()
    assert p.locator('[data-language=es]').is_disabled()

@pytest.mark.parametrize('email',['','alumno@example.com','alumno@g.educaand.es.example.com','alumno@'])
def test_exact_school_domain_required(make_page,email):
    p=make_page();setup_identity(p,email=email)
    assert p.locator('#guard-start').is_disabled()
    assert state(p)['phase']=='ready'

def test_fullscreen_native_and_internal_focus(make_page):
    p=make_page();begin(p)
    assert p.evaluate('document.fullscreenElement===document.documentElement')
    p.locator('#t1').fill('120');p.locator('#t2').focus()
    assert state(p)['count']==0
    assert state(p)['data']['values']['t1']=='120'
    assert not p.errors

def test_unsupported_fullscreen(make_page):
    p=make_page(setup="Object.defineProperty(document,'fullscreenEnabled',{value:false})")
    p.locator('[data-language=es]').click()
    assert p.locator('#guard-start').is_disabled()
    assert p.locator('#guard-problem').is_visible()

def test_rejected_fullscreen(make_page):
    p=make_page(setup="Element.prototype.requestFullscreen=()=>Promise.reject(new Error('denegado'))")
    setup_identity(p);p.locator('#guard-start').click()
    assert p.locator('#t1').is_disabled()
    assert state(p)['phase']=='ready'

def test_english_corrector_and_reload(make_page):
    p=make_page();begin(p,'en')
    p.locator('#t1').fill('120')
    p.locator('#p3').select_option('Unidad de control')
    p.locator('[data-check=hardware]').click()
    assert p.locator('#feedback-p3').inner_text()=='✓ Correct.'
    assert p.locator('#p3 option:checked').inner_text()=='Control unit'
    q=make_page(p.evaluate('window.testStore'))
    assert q.locator('html').get_attribute('lang')=='en'
    assert q.locator('#t1').input_value()=='120'
    assert q.locator('#t1').is_disabled()
    resume(q)
    assert q.locator('#p3').input_value()=='Unidad de control'
    assert not p.errors and not q.errors

def test_fullscreen_exit_and_grouped_signals(make_page):
    p=make_page();begin(p);p.locator('#t1').fill('120')
    p.evaluate('document.exitFullscreen()')
    p.locator('#guard-warning').wait_for(state='visible')
    p.evaluate("window.dispatchEvent(new FocusEvent('blur'));window.dispatchEvent(new PageTransitionEvent('pagehide'))")
    assert state(p)['count']==1
    assert p.locator('#t1').input_value()=='120'
    resume(p);assert p.locator('#t1').is_enabled()

def test_third_incident_submits_without_erasing(make_page):
    p=make_page();begin(p);p.locator('#t1').fill('120')
    blur_return(p);resume(p);blur_return(p);resume(p)
    blur_return(p)
    p.wait_for_function(f"JSON.parse(localStorage.getItem('{KEY}')).phase==='submitted'")
    saved=state(p)
    assert saved['count']==3 and saved['data']['values']['t1']=='120'
    assert p.locator('#cuaderno').is_hidden()
    report=decode(saved['data']['report'])
    assert report['finishReason']=='incident-limit'
    assert report['answers'][0]['answer']=='120'
    assert report['incidents']==3
    assert not p.errors

def test_forced_failure_retry(make_page):
    p=make_page();begin(p);p.locator('#t1').fill('120')
    p.evaluate("window.originalDigest=crypto.subtle.digest;crypto.subtle.digest=()=>Promise.reject(Error('test'))")
    blur_return(p);resume(p);blur_return(p);resume(p);blur_return(p)
    assert state(p)['phase']=='closing'
    assert state(p)['data']['values']['t1']=='120'
    p.evaluate('crypto.subtle.digest=window.originalDigest')
    p.locator('#delivery-retry').click()
    p.wait_for_function(f"JSON.parse(localStorage.getItem('{KEY}')).phase==='submitted'")
    assert decode(state(p)['data']['report'])['answers'][0]['answer']=='120'

@pytest.mark.parametrize('event',['copy','cut','paste','drop','dragstart','contextmenu'])
def test_blocked_actions_audited_without_departures(make_page,event):
    p=make_page();begin(p);p.locator('#t1').fill('120')
    accepted=p.evaluate("type=>document.querySelector('#t1').dispatchEvent(new Event(type,{bubbles:true,cancelable:true}))",event)
    assert accepted is False
    s=state(p)
    assert s['count']==0 and s['actionCounts']
    assert p.locator('#t1').input_value()=='120'

def test_function_keys_and_ordinary_typing(make_page):
    p=make_page();begin(p)
    p.locator('#t2').press_sequentially('120 segundos')
    p.locator('#t2').press('F12')
    assert state(p)['actionCounts']['F12']==1
    assert state(p)['count']==0
    assert p.locator('#t2').input_value()=='120 segundos'

def test_uncancelable_paste_restored(make_page):
    p=make_page();begin(p);p.locator('#t1').fill('120')
    p.evaluate("let e=document.querySelector('#t1');e.value='999';e.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste'}))")
    assert p.locator('#t1').input_value()=='120'
    assert state(p)['data']['values']['t1']=='120'

def test_legacy_migration(make_page):
    old=json.dumps({'values':{'student':'Alumno','t1':'120'},'checked':{},'hints':{'0':True},'elapsed':42000})
    p=make_page({LEGACY:old})
    assert state(p)['data']['elapsed']==42000
    assert p.evaluate(f"localStorage.getItem('{LEGACY}')")==old
    begin(p)
    assert p.locator('#t1').input_value()=='120'

def test_old_active_requires_new_identity(make_page):
    p=make_page();begin(p);p.locator('#t1').fill('120')
    saved=state(p);saved['data']['values'].pop('fullname');saved['data'].pop('language')
    q=make_page({KEY:json.dumps(saved)})
    assert state(q)['phase']=='ready'
    assert state(q)['data']['values']['t1']=='120'
    assert q.locator('#setup-stage').is_visible()

def test_corrupt_storage_not_overwritten(make_page):
    p=make_page({KEY:'{invalido'});p.locator('[data-language=es]').click()
    assert p.locator('#guard-start').is_disabled()
    assert p.evaluate(f"localStorage.getItem('{KEY}')")=='{invalido'

def test_write_failure_retry(make_page):
    p=make_page();begin(p);p.evaluate('window.testWriteFail=true');p.locator('#t1').fill('120')
    assert p.locator('#t1').is_disabled()
    p.evaluate('window.testWriteFail=false');p.locator('#guard-retry').click()
    assert state(p)['data']['values']['t1']=='120'
    resume(p);assert p.locator('#t1').is_enabled()

def test_conflict_not_overwritten(make_page):
    p=make_page();begin(p);p.evaluate(f"localStorage.setItem('{KEY}','OTHER')")
    p.locator('#t1').fill('120')
    assert p.locator('#t1').is_disabled()
    assert p.evaluate(f"localStorage.getItem('{KEY}')")=='OTHER'

def test_download_unicode_and_recovery(make_page):
    p=make_page();begin(p);p.locator('#reflection').fill('Revisión: ñ, á, € y 🧪')
    p.locator('#guard-finish').click();p.locator('#guard-confirm-cancel').click()
    assert state(p)['phase']=='active'
    with p.expect_download() as download:
        finish(p)
    code=Path(download.value.path()).read_text(encoding='utf-8-sig')
    report=decode(code)
    assert report['notes']=='Revisión: ñ, á, € y 🧪'
    assert report['exam']=='SSII-UD01' and len(report['answers'])==94
    assert report['email']=='alumno@g.educaand.es'
    assert state(p)['data']['reportEncoding']=='gzip-base64url'
    q=make_page(p.evaluate('window.testStore'))
    assert q.locator('#delivery-stage').is_visible()
    with q.expect_download() as again:
        q.locator('#receipt-download').click()
    assert Path(again.value.path()).read_text(encoding='utf-8-sig')==code
    assert not p.errors and not q.errors

def test_clipboard_and_popup_retries_do_not_erase_report(make_page):
    p=make_page();begin(p);finish(p)
    code=state(p)['data']['report']
    assert p.locator('#delivery-status').inner_text().startswith('El navegador no permitió copiar')
    p.evaluate("navigator.clipboard.writeText=async()=>{};window.open=()=>null")
    p.locator('#delivery-retry').click()
    p.wait_for_function("document.querySelector('#delivery-status').textContent.includes('bloqueó')")
    assert state(p)['data']['report']==code

def test_successful_open_resets_and_remembers(make_page):
    p=make_page();begin(p)
    p.evaluate("navigator.clipboard.writeText=async code=>{window.copied=code};window.open=()=>({opener:null,location:{replace:url=>{window.formDestination=url}}})")
    p.locator('#guard-finish').click();p.locator('#guard-confirm-ok').click()
    p.wait_for_function("!!window.formDestination")
    assert state(p)['phase']=='ready'
    assert all(not v for v in state(p)['data']['values'].values())
    assert p.locator('#language-stage').is_visible()
    assert p.evaluate("new URL(window.formDestination).searchParams.get('entry.1438887233')")=='Repaso SSII · Unidad 01'
    assert p.evaluate("JSON.parse(sessionStorage.getItem('ssii-repaso-ud01-ultima-entrega-v2')).code===window.copied")

def test_hash_failure_keeps_active(make_page):
    p=make_page();begin(p)
    p.evaluate("crypto.subtle.digest=()=>Promise.reject(Error('test'))")
    p.locator('#guard-finish').click();p.locator('#guard-confirm-ok').click()
    p.wait_for_function("document.querySelector('#reportStatus').textContent.includes('No se pudo')")
    assert state(p)['phase']=='active'
    assert state(p)['data']['started'] is not None

def test_runtime_error_fail_closed(make_page):
    p=make_page();begin(p)
    p.evaluate("window.dispatchEvent(new ErrorEvent('error',{message:'prueba'}))")
    assert p.locator('#cuaderno').is_hidden()
    assert p.locator('#guard-boot').is_visible()
