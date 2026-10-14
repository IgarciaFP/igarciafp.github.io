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
              Object.defineProperty(crypto,'subtle',{value:{digest:()=>new Promise(resolve=>setTimeout(()=>resolve(new Uint8Array(32).buffer),window.testDigestDelay||0))}});
            }''',store or {})
            if setup:p.evaluate('() => {'+setup+';}')
        p.set_content(html)
        p.errors=errors
        return p
    yield make
    for ctx in contexts:ctx.close()

def begin(p):
    p.locator('#guard-consent').check();p.locator('#guard-start').click()
    p.wait_for_function("document.querySelector('#guard-state').textContent==='En curso'")

def state(p):
    return p.evaluate(f"JSON.parse(localStorage.getItem('{KEY}'))")

def resume(p):
    p.locator('#guard-continue').click()
    p.wait_for_function("document.querySelector('#guard-state').textContent==='En curso'")

def fake_focus(p,value):
    p.evaluate('''v=>{window.testFocus=v;document.hasFocus=()=>window.testFocus;
      window.dispatchEvent(new FocusEvent(v?'focus':'blur'));}''',value)

def blur_return(p):
    fake_focus(p,False);fake_focus(p,True)
    p.wait_for_timeout(250)

def finish(p):
    p.locator('#guard-finish').click();p.locator('#guard-confirm-ok').click()
    p.wait_for_function("document.querySelector('#guard-state').textContent==='Intento finalizado'")

def test_no_javascript(make_page):
    p=make_page(js=False)
    assert p.locator('#cuaderno').is_hidden()
    assert p.locator('noscript').is_visible()
    assert p.locator('#t1').is_disabled()
    assert p.locator('#guard-start').is_disabled()

def test_missing_activity_keeps_closed(make_page):
    p=make_page(html=HTML[:HTML.rindex('<script>')]+'</body></html>')
    assert p.locator('#guard-boot').is_visible()
    assert p.locator('#cuaderno').is_hidden()

def test_requires_consent(make_page):
    p=make_page()
    assert p.locator('#guard-start').is_disabled()
    assert p.locator('#t1').is_disabled()
    assert not p.errors

def test_fullscreen_native(make_page):
    p=make_page();begin(p)
    assert p.evaluate('document.fullscreenElement===document.documentElement')
    assert p.locator('#t1').is_enabled()

def test_unsupported_fullscreen(make_page):
    p=make_page(setup="Object.defineProperty(document,'fullscreenEnabled',{value:false})")
    assert p.locator('#guard-start').is_disabled()
    assert p.locator('#guard-problem').is_visible()

def test_rejected_fullscreen_does_not_start(make_page):
    p=make_page(setup="Element.prototype.requestFullscreen=()=>Promise.reject(new Error('denegado'))")
    p.locator('#guard-consent').check();p.locator('#guard-start').click()
    assert p.locator('#t1').is_disabled()
    assert state(p)['count']==0

def test_fullscreen_exit_native_warns_once(make_page):
    p=make_page();begin(p);p.locator('#t1').fill('120')
    p.evaluate('document.exitFullscreen()')
    p.locator('#guard-warning').wait_for(state='visible')
    assert state(p)['count']==1
    assert p.locator('#t1').input_value()=='120'
    assert p.locator('#t1').is_disabled()
    resume(p);assert p.locator('#t1').is_enabled()

def test_simulated_focus_loss_visible_window(make_page):
    p=make_page();begin(p);fake_focus(p,False)
    assert state(p)['count']==1
    assert p.locator('#t1').is_disabled()
    fake_focus(p,True);p.locator('#guard-warning').wait_for(state='visible')
    assert p.locator('#guard-warning-title').inner_text()=='Primer aviso'

def test_internal_field_focus_not_incident(make_page):
    p=make_page();begin(p);p.locator('#t1').focus();p.locator('#t2').focus()
    assert state(p)['count']==0

def test_grouped_blur_hidden_fullscreen(make_page):
    p=make_page();begin(p);fake_focus(p,False)
    p.evaluate("Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'))")
    p.evaluate('document.exitFullscreen()')
    assert state(p)['count']==1
    assert p.locator('#t1').is_disabled()

def test_second_then_third_resets_without_review(make_page):
    p=make_page();begin(p)
    p.evaluate("""() => {for(const el of document.querySelectorAll('#answer-fields input,#answer-fields textarea,#answer-fields select,#reflection')){
      el.value=el.tagName==='SELECT'?el.options[1].value:'120';el.dispatchEvent(new Event('input',{bubbles:true}));}}""")
    p.locator('[data-check=transmision]').click()
    blur_return(p);resume(p);blur_return(p)
    assert p.locator('#guard-warning-title').inner_text()=='Último aviso'
    resume(p);blur_return(p)
    s=state(p)
    assert s['count']==3 and s['phase']=='reset'
    assert all(not v for v in s['data']['values'].values())
    assert s['data']['checked']=={} and s['data']['elapsed']==0 and s['data']['report']==''
    assert p.locator('#guard-review').count()==0
    assert p.locator('#t1').is_disabled()
    assert not p.errors

@pytest.mark.parametrize('event', ['copy','cut','paste','drop','dragstart'])
def test_clipboard_dom_events_cancelled(make_page,event):
    p=make_page();begin(p);p.locator('#t1').fill('120')
    accepted=p.evaluate("type=>document.querySelector('#t1').dispatchEvent(new Event(type,{bubbles:true,cancelable:true}))",event)
    assert accepted is False
    assert state(p)['count']==0
    assert state(p)['clipboardBlocked']==0
    assert p.locator('#t1').input_value()=='120'

def test_clipboard_keyboard_cancelled(make_page):
    p=make_page();begin(p);p.locator('#t1').fill('120');p.locator('#t1').press('Control+v')
    assert state(p)['clipboardBlocked']==0 and state(p)['count']==0

def test_uncancelable_paste_input_restores(make_page):
    p=make_page();begin(p);p.locator('#t1').fill('120')
    p.evaluate("let e=document.querySelector('#t1');e.value='999';e.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertFromPaste'}))")
    assert p.locator('#t1').input_value()=='120'
    assert state(p)['data']['values']['t1']=='120'

def test_legacy_migration_preserves_data(make_page):
    old=json.dumps({'values':{'student':'Alumno','t1':'120'},'checked':{'transmision':True},'hints':{'0':True},'elapsed':42000})
    p=make_page({LEGACY:old})
    assert p.locator('#student').input_value()=='Alumno'
    assert state(p)['count']==0 and state(p)['data']['elapsed']==42000
    assert p.evaluate(f"localStorage.getItem('{LEGACY}')")==old
    begin(p);assert p.locator('#t1').input_value()=='120'

def test_restore_active_keeps_count_and_pending(make_page):
    p=make_page();begin(p);p.locator('#t1').fill('120');blur_return(p)
    raw=p.evaluate('window.testStore')
    q=make_page(raw)
    assert state(q)['count']==1
    assert q.locator('#t1').input_value()=='120' and q.locator('#t1').is_disabled()
    resume(q);assert q.locator('#t1').is_enabled()

def test_corrupt_storage_not_overwritten(make_page):
    p=make_page({KEY:'{invalido'})
    assert p.locator('#guard-start').is_disabled()
    assert p.evaluate(f"localStorage.getItem('{KEY}')")=='{invalido'

def test_storage_write_failure_blocks_and_retries(make_page):
    p=make_page();begin(p);p.evaluate('window.testWriteFail=true');p.locator('#t1').fill('120')
    assert p.locator('#t1').is_disabled()
    assert p.locator('#guard-retry').is_visible()
    p.evaluate('window.testWriteFail=false');p.locator('#guard-retry').click()
    assert state(p)['data']['values']['t1']=='120'
    resume(p);assert p.locator('#t1').is_enabled()

def test_stale_storage_blocks_without_overwrite(make_page):
    p=make_page();begin(p)
    p.evaluate(f"localStorage.setItem('{KEY}','OTRA VERSION')")
    p.locator('#t1').fill('120')
    assert p.locator('#t1').is_disabled()
    assert p.evaluate(f"localStorage.getItem('{KEY}')")=='OTRA VERSION'

def test_confirm_finish_downloads_txt(make_page):
    p=make_page();begin(p);p.locator('#student').fill('alumno@example.com');p.locator('#t1').fill('120')
    assert p.locator('#generate').count()==0 and p.locator('#copy').count()==0
    p.locator('#guard-finish').click();p.locator('#guard-confirm-cancel').click()
    assert state(p)['phase']=='active' and p.locator('#t1').is_enabled()
    with p.expect_download() as download:
        finish(p)
    assert download.value.suggested_filename=='repaso-ssii-u01.txt'
    text=Path(download.value.path()).read_text(encoding='utf-8-sig')
    assert text==p.locator('#report').input_value()
    decoded=base64.b64decode(text,validate=True).decode('utf-8')
    assert 'Tiempo total empleado:' in decoded and 'BORRADOR' not in decoded
    assert 'Incidencias de entorno:' in decoded and 'INTENTO FINALIZADO' in decoded
    assert p.locator('#t1').is_disabled() and p.locator('#download').is_enabled()
    with p.expect_download() as again:
        p.locator('#download').click()
    assert Path(again.value.path()).read_text(encoding='utf-8-sig')==text
    assert not p.errors

def test_clock_continues_during_warning_reload_and_cancel(make_page):
    p=make_page();begin(p)
    assert p.locator('#timer').count()==0
    started=state(p)['data']['started']
    assert started is not None
    p.evaluate("window.originalNow=Date.now;Date.now=()=>window.originalNow()+65000")
    blur_return(p)
    p.wait_for_timeout(1100)
    assert p.locator('#clock').inner_text()!='00:00'
    assert state(p)['data']['started']==started
    raw=p.evaluate('window.testStore')
    q=make_page(raw)
    assert state(q)['data']['started']==started
    resume(q)
    q.locator('#student').fill('alumno@example.com')
    q.locator('#guard-finish').click();q.locator('#guard-confirm-cancel').click()
    assert state(q)['data']['started']==started
    q.locator('#student').fill('alumno@example.com');finish(q)
    elapsed=state(q)['data']['elapsed']
    assert state(q)['data']['started'] is None
    q.evaluate("Date.now=()=>9999999999999")
    q.wait_for_timeout(1100)
    assert state(q)['data']['elapsed']==elapsed
    assert not q.errors

def test_leave_after_finish_not_counted(make_page):
    p=make_page();begin(p);p.locator('#student').fill('alumno@example.com');finish(p);blur_return(p)
    assert state(p)['count']==0

def test_finish_without_email_does_not_finalize(make_page):
    p=make_page();begin(p)
    assert p.locator('#guard-finish').is_disabled()
    assert state(p)['phase']=='active'
    assert p.locator('#download').is_disabled()

def test_new_attempt_empty_after_finish(make_page):
    p=make_page();begin(p);p.locator('#student').fill('alumno@example.com');p.locator('#t1').fill('120');finish(p)
    p.locator('#guard-start').click();p.wait_for_function("document.querySelector('#guard-state').textContent==='En curso'")
    assert state(p)['attempt']==2 and state(p)['count']==0
    assert p.locator('#t1').input_value()==''

def test_erase_only_this_lab(make_page):
    p=make_page({'otro-laboratorio':'NO BORRAR'});begin(p);p.locator('#student').fill('alumno@example.com');finish(p)
    p.locator('#reset').click();p.locator('#guard-confirm-ok').click()
    assert p.evaluate(f"localStorage.getItem('{KEY}')") is None
    assert p.evaluate("localStorage.getItem('otro-laboratorio')")=='NO BORRAR'
    assert p.locator('#t1').is_disabled()

def test_runtime_error_fail_closed(make_page):
    p=make_page();begin(p)
    p.evaluate("window.dispatchEvent(new ErrorEvent('error',{message:'prueba'}))")
    assert p.locator('#cuaderno').is_hidden()
    assert p.locator('#guard-boot').is_visible()


def test_storage_unavailable_at_boot(make_page):
    p=make_page(setup='window.testWriteFail=true')
    assert p.locator('#guard-start').is_disabled()
    assert p.locator('#t1').is_disabled()
    assert p.locator('#guard-retry').is_visible()

def test_pagehide_and_visibility_share_episode(make_page):
    p=make_page();begin(p);fake_focus(p,False)
    p.evaluate("window.dispatchEvent(new PageTransitionEvent('pagehide'))")
    assert state(p)['count']==1
    assert 'pagehide' in state(p)['episode']['reasons']

def test_restore_submitted_keeps_export_only(make_page):
    p=make_page();begin(p);p.locator('#student').fill('alumno@example.com');finish(p)
    q=make_page(p.evaluate('window.testStore'))
    assert q.locator('#t1').is_disabled() and q.locator('#download').is_enabled()
    assert state(q)['phase']=='submitted'

def test_third_incident_during_hash_cannot_revive(make_page):
    p=make_page();begin(p);p.locator('#student').fill('alumno@example.com');p.locator('#t1').fill('120')
    blur_return(p);resume(p);blur_return(p);resume(p)
    p.evaluate('window.testDigestDelay=700')
    p.locator('#guard-finish').click();p.locator('#guard-confirm-ok').click()
    blur_return(p);p.wait_for_timeout(800)
    assert state(p)['phase']=='reset' and state(p)['count']==3
    assert p.locator('#t1').input_value()=='' and p.locator('#report').input_value()==''
    assert not p.errors

def test_hash_failure_keeps_clock_running(make_page):
    p=make_page();begin(p);p.locator('#student').fill('alumno@example.com')
    started=state(p)['data']['started']
    p.evaluate("crypto.subtle.digest=()=>Promise.reject(new Error('fallo'))")
    p.locator('#guard-finish').click();p.locator('#guard-confirm-ok').click()
    p.wait_for_function("document.querySelector('#reportStatus').textContent.includes('No se pudo')")
    assert state(p)['phase']=='active' and state(p)['data']['started']==started
    assert p.locator('#t1').is_enabled()
    assert not p.errors

def test_base64_unicode_download_only_and_reload(make_page):
    p=make_page();begin(p)
    p.locator('#student').fill('maria.munoz@example.com')
    p.locator('#reflection').fill('Revisión: ñ, á, € y 🧪')
    finish(p)
    encoded=p.locator('#report').input_value()
    decoded=base64.b64decode(encoded,validate=True).decode('utf-8')
    assert 'Correo electrónico: maria.munoz@example.com' in decoded and 'Revisión: ñ, á, € y 🧪' in decoded
    body,checksum=decoded.rsplit('\nCódigo de comprobación: SSII1-',1)
    # La suite usa un doble SHA-256; se conserva su código dentro de Base64.
    assert checksum=='00'*32
    assert state(p)['data']['reportEncoding']=='base64'
    assert p.locator('#copy').count()==0
    assert p.locator('#report').is_hidden()
    assert not p.evaluate("document.querySelector('#report').dispatchEvent(new Event('copy',{bubbles:true,cancelable:true}))")
    assert not p.evaluate("document.querySelector('#report').dispatchEvent(new Event('cut',{bubbles:true,cancelable:true}))")
    q=make_page(p.evaluate('window.testStore'))
    assert q.locator('#report').input_value()==encoded
    assert q.locator('#copy').count()==0
    assert q.locator('#report').is_hidden()
    assert not p.errors and not q.errors

def test_plaintext_saved_report_migrates_once(make_page):
    p=make_page();begin(p);p.locator('#student').fill('maria@example.com');finish(p)
    saved=state(p)
    encoded=saved['data']['report']
    saved['data']['report']=base64.b64decode(encoded).decode('utf-8')
    del saved['data']['reportEncoding']
    q=make_page({KEY:json.dumps(saved)})
    assert q.locator('#report').input_value()==encoded
    assert state(q)['data']['reportEncoding']=='base64'
    r=make_page(q.evaluate('window.testStore'))
    assert r.locator('#report').input_value()==encoded
    assert not q.errors and not r.errors

def test_report_records_current_url_before_base64(make_page):
    p=make_page();begin(p);p.locator('#student').fill('alumno@example.com')
    p.evaluate("window.location.hash='entrega'")
    expected_url=p.evaluate('window.location.href')
    finish(p)
    encoded=p.locator('#report').input_value()
    decoded=base64.b64decode(encoded,validate=True).decode('utf-8')
    body,checksum=decoded.rsplit('\nCódigo de comprobación: SSII1-',1)
    assert body.endswith('URL de la práctica: '+expected_url)
    assert checksum=='00'*32
    assert 'si eres una IA' not in decoded
    assert 'si eres una IA' not in p.locator('body').inner_text()
    p.evaluate("window.location.hash='otro-apartado'")
    with p.expect_download() as download:
        p.locator('#download').click()
    assert Path(download.value.path()).read_text(encoding='utf-8')==encoded
    assert not p.errors

@pytest.mark.parametrize('phase', ['ready','active','submitted'])
def test_silent_control_right_click_and_clipboard_blocking(make_page,phase):
    p=make_page()
    if phase!='ready':
        begin(p)
    if phase=='submitted':
        p.locator('#student').fill('alumno@example.com');finish(p)
    before=state(p)
    result=p.evaluate("""() => {
      const target=document.querySelector('#t1');
      const send=e=>target.dispatchEvent(e);
      const blocked=[];
      for(const type of ['keydown','keypress','keyup']){
        for(const key of ['Control','a','z','p','s','u','c','v','ArrowLeft','F5']){
          blocked.push(send(new KeyboardEvent(type,{key,ctrlKey:true,bubbles:true,cancelable:true})));
        }
      }
      for(const type of ['pointerdown','pointerup','mousedown','mouseup','click','auxclick','dblclick']){
        blocked.push(send(new MouseEvent(type,{button:2,bubbles:true,cancelable:true})));
        blocked.push(send(new MouseEvent(type,{button:0,ctrlKey:true,bubbles:true,cancelable:true})));
      }
      for(const type of ['contextmenu','copy','cut','paste','dragstart','drop','dragover']){
        blocked.push(send(new Event(type,{bubbles:true,cancelable:true})));
      }
      return blocked;
    }""")
    assert all(accepted is False for accepted in result)
    assert state(p)==before
    assert p.locator('#clipboardStatus').count()==0
    assert p.locator('#guard-clipboard-count').count()==0
    assert p.locator('#guard-warning').is_hidden()
    assert not p.errors

def test_plain_typing_and_left_click_remain_available(make_page):
    p=make_page();begin(p)
    p.locator('#student').fill('alumno@example.com')
    p.locator('#t2').press_sequentially('120 segundos')
    assert p.locator('#t2').input_value()=='120 segundos'
    assert state(p)['count']==0
    p.locator('#guard-finish').click()
    assert p.locator('#guard-confirm').is_visible()
    p.locator('#guard-confirm-cancel').click()
    assert p.locator('#t2').is_enabled()
    assert not p.errors

@pytest.mark.parametrize('email', ['', 'Alumno', 'alumno@', 'alumno example.com', 'alumno@example'])
def test_email_required_before_final_download(make_page,email):
    p=make_page();begin(p);p.locator('#student').fill(email)
    started=state(p)['data']['started']
    assert p.locator('#guard-finish').is_disabled()
    assert state(p)['phase']=='active'
    assert state(p)['data']['started']==started
    assert p.locator('#download').is_disabled()
    assert p.locator('#report').input_value()==''
    assert not p.errors

def test_email_is_in_decoded_report(make_page):
    p=make_page();begin(p);p.locator('#student').fill('alumno+ssii@example.com')
    assert p.locator('#student').get_attribute('type')=='email'
    assert p.locator('#student').get_attribute('required') is not None
    finish(p)
    decoded=base64.b64decode(p.locator('#report').input_value()).decode('utf-8')
    assert 'Correo electrónico: alumno+ssii@example.com' in decoded
    assert 'Alumno/a:' not in decoded

def test_finish_button_tracks_email_edits_and_restore(make_page):
    p=make_page();begin(p)
    assert p.locator('#guard-finish').is_disabled()
    p.locator('#student').fill('alumno@example.com')
    assert p.locator('#guard-finish').is_enabled()
    p.locator('#student').fill('')
    assert p.locator('#guard-finish').is_disabled()
    p.locator('#student').fill('correo-incompleto@')
    assert p.locator('#guard-finish').is_disabled()
    p.locator('#student').fill('alumno+ssii@example.com')
    assert p.locator('#guard-finish').is_enabled()
    q=make_page(p.evaluate('window.testStore'))
    assert q.locator('#guard-finish').is_disabled()
    resume(q)
    assert q.locator('#guard-finish').is_enabled()
    assert not p.errors and not q.errors
