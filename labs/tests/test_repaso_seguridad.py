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
for name in ('repaso-ssii-u01-variantes.js','repaso-ssii-u01-seguridad.js','repaso-ssii-u01.js'):
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
              window.testNetworkCalls=0;window.fetch=async()=>{window.testNetworkCalls++;throw Error('Unexpected network request');};
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

def recover_once(p):
    saved=state(p)
    if saved['phase']=='active':
        p.locator('#guard-continue').click()
    else:
        payload=json.dumps({'format':'SSII-UD01-SAVE','version':1,'state':saved})
        p.locator('#practice-file').set_input_files({'name':'practica.json','mimeType':'application/json','buffer':payload.encode()})
        p.wait_for_function("document.querySelector('#practice-recover').textContent.includes('Continu') ")
        p.locator('#practice-recover').click()

def resume(p):
    recover_once(p)
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
    assert p.evaluate("window.formDestination")=="https://docs.google.com/forms/d/e/1FAIpQLSfwo1fdBwSlm-iWU00VAiTdAueuuNTYQOl0iibaCpF69O5ZWg/viewform?usp=publish-editor"
    assert p.evaluate("Array.from(new URL(window.formDestination).searchParams.keys()).every(k=>!k.startsWith('entry.'))")
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


def test_fixed_toolbar_does_not_cover_content(make_page):
    p=make_page()
    assert p.locator('#practice-toolbar').evaluate("el=>getComputedStyle(el).position")=='fixed'
    for width in [1280,390]:
        p.set_viewport_size({'width':width,'height':900})
        p.wait_for_timeout(100)
        height=p.locator('#practice-toolbar').bounding_box()['height']
        padding=p.locator('body').evaluate("el=>parseFloat(getComputedStyle(el).paddingTop)")
        assert padding>=height
    assert p.locator('#practice-save').is_disabled()

def test_pause_recovery_preserves_parameters_and_counts(make_page):
    p=make_page();begin(p,'en')
    p.locator('#t1').fill('150')
    before=state(p)['data']['parameters']
    p.locator('#practice-save').click()
    paused=state(p)
    assert paused['phase']=='paused' and paused['data']['started'] is None
    assert paused['count']==0
    q=make_page(p.evaluate('window.testStore'))
    assert q.locator('#cuaderno').is_hidden()
    recover_once(q)
    q.wait_for_function("!document.querySelector('#answer-fields').disabled")
    restored=state(q)
    assert restored['count']==1 and restored['recoveries']==1
    assert restored['data']['parameters']==before
    assert q.locator('#t1').input_value()=='150'
    assert q.locator('html').get_attribute('lang')=='en'
    assert not p.errors and not q.errors

def test_third_recovery_closes_with_current_answers(make_page):
    p=make_page();begin(p);p.locator('#t1').fill('150')
    for i in range(3):
        p.locator('#practice-save').click()
        assert state(p)['phase']=='paused'
        recover_once(p)
        expected='submitted' if i==2 else 'active'
        p.wait_for_function(f"JSON.parse(localStorage.getItem('{KEY}')).phase==='{expected}'")
    report=decode(state(p)['data']['report'])
    assert report['recoveries']==3 and report['incidents']==3
    assert report['answers'][0]['answer']=='150'
    assert report['parameters']==state(p)['data']['parameters']

def test_reload_active_consumes_one_recovery(make_page):
    p=make_page();begin(p);p.locator('#t1').fill('150')
    q=make_page(p.evaluate('window.testStore'))
    assert state(q)['count']==0
    assert q.locator('#guard-warning').is_hidden()
    recover_once(q)
    q.wait_for_function("!document.querySelector('#answer-fields').disabled")
    assert state(q)['count']==1
    assert state(q)['recoveries']==1

def test_random_refresh_only_untouched_groups(make_page):
    p=make_page();begin(p)
    p.locator('#t1').fill('150')
    # The two binary/base exercises share one parameter and one lock.
    p.locator('#bridge').fill('101010')
    before=state(p)['data']['parameters']
    blur_return(p);resume(p)
    after=state(p)['data']['parameters']
    assert after['download']==before['download']
    assert after['bridge']==before['bridge']
    assert after['upload']!=before['upload']
    assert p.locator('#variant-dividend').inner_text()==str(after['bridge']['n'])+' ÷ 2'
    # A blank answer after editing does not unlock the original quantities.
    p.locator('#t1').fill('')
    blur_return(p);resume(p)
    assert state(p)['data']['parameters']['download']==before['download']
    assert not p.errors

def test_random_answers_correct_in_both_languages(make_page):
    p=make_page();begin(p,'en')
    parameters=state(p)['data']['parameters']
    expected=p.evaluate("p=>window.SSIIParameters.derive(p).answers",parameters)
    for field in ['t1','t3','t5','t6','t7','t9','t10']:
        p.locator('#'+field).fill(str(expected[field]))
    p.locator('[data-check=transmision]').click()
    for field in ['t1','t3','t5','t6','t7','t9','t10']:
        assert p.locator('#feedback-'+field).inner_text()=='✓ Correct.'
    p.locator('#practice-save').click()
    q=make_page(p.evaluate('window.testStore'));resume(q)
    assert state(q)['data']['parameters']==parameters

def test_parameter_corruption_does_not_overwrite(make_page):
    p=make_page();begin(p);p.locator('#practice-save').click()
    saved=state(p);saved['data']['parameters']['bridge']['n']=999
    raw=json.dumps(saved)
    q=make_page({KEY:raw})
    assert q.evaluate(f"localStorage.getItem('{KEY}')")==raw
    assert q.locator('#practice-recover').is_disabled()

def test_paused_clock_does_not_include_next_day(make_page):
    p=make_page();begin(p);p.locator('#practice-save').click()
    elapsed=state(p)['data']['elapsed']
    q=make_page(p.evaluate('window.testStore'),setup='window.realNow=Date.now;Date.now=()=>window.realNow()+86400000')
    assert state(q)['data']['elapsed']==elapsed
    resume(q)
    assert state(q)['data']['elapsed']==elapsed
    assert state(q)['data']['started'] is not None

def test_attempt_times_and_ip_are_saved_and_exported(make_page):
    p=make_page();begin(p)
    p.wait_for_function(f"JSON.parse(localStorage.getItem('{KEY}')).attemptAudit.ipSamples[0].status==='unavailable'")
    audit=state(p)['attemptAudit']
    assert audit['startedAt'] is not None and audit['finishedAt'] is None
    assert audit['ipSamples'][0]['ip'] is None
    assert p.evaluate('window.testNetworkCalls')==0
    p.locator('#practice-save').click()
    q=make_page(p.evaluate('window.testStore'));resume(q);finish(q)
    result=state(q)
    assert result['attemptAudit']['startedAt']==audit['startedAt']
    assert result['attemptAudit']['finishedAt']>=audit['startedAt']
    report=decode(result['data']['report'])
    assert report['attemptStartedAt'] and report['attemptFinishedAt']
    assert report['timeZone']=='Europe/Madrid'
    assert [s['reason'] for s in report['ipSamples']]==['start','recovery']

def test_browser_only_no_external_ip_requests(make_page):
    p=make_page()
    begin(p)
    p.wait_for_function(f"JSON.parse(localStorage.getItem('{KEY}')).attemptAudit.ipSamples[0].status==='unavailable'")
    assert state(p)['attemptAudit']['ipSamples'][0]['ip'] is None
    finish(p)
    assert decode(state(p)['data']['report'])['ipSamples'][0]['status']=='unavailable'
    assert p.evaluate('window.testNetworkCalls')==0

def test_penalty_has_own_bold_paragraph(make_page):
    p=make_page();p.locator('[data-language=es]').click()
    assert p.locator('p > strong[data-text=penalty]').inner_text()=='Cualquier intento de copia será penalizado con un cero en la actividad.'
    assert 'horas de clase de SSII' in p.locator('[data-text=rules]').inner_text()


def test_downloaded_file_recovers_in_new_browser(make_page):
    p=make_page();begin(p)
    p.locator('#t1').fill('123')
    with p.expect_download() as download:
        p.locator('#practice-save').click()
    payload=Path(download.value.path()).read_bytes()
    saved=json.loads(payload)
    assert saved['format']=='SSII-UD01-SAVE'
    q=make_page()
    q.locator('#practice-file').set_input_files({'name':'practica.json','mimeType':'application/json','buffer':payload})
    q.wait_for_function("document.querySelector('#practice-recover').textContent.includes('Continu')")
    q.locator('#practice-recover').click()
    q.wait_for_function("!document.querySelector('#answer-fields').disabled")
    assert state(q)['data']['values']['t1']=='123'
    assert state(q)['data']['parameters']==saved['state']['data']['parameters']
    assert state(q)['count']==1

def test_toolbar_restart_requires_confirmation(make_page):
    p=make_page();begin(p);p.locator('#t1').fill('123')
    p.locator('#practice-reset').click()
    p.locator('#guard-confirm-cancel').click()
    assert p.locator('#t1').input_value()=='123'
    p.locator('#practice-reset').click()
    p.locator('#guard-confirm-ok').click()
    assert p.locator('#t1').input_value()==''
    assert p.locator('#language-stage').is_visible()
