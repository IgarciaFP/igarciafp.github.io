/* Vista previa flotante común a los apartados webcode de base4. */
(() => {
  'use strict';
  const lab = window.Lab;
  if (!lab || document.getElementById('preview-dialog')) return;
  const frame = document.getElementById('preview');
  const panel = frame.closest('.panel');
  const header = panel.querySelector('.panel-cabecera');
  const resizer = panel.querySelector('.preview-resizer');
  const dialog = document.createElement('dialog');
  dialog.id = 'preview-dialog';
  dialog.className = 'preview-dialog';
  dialog.setAttribute('role', 'presentation');
  dialog.setAttribute('open', '');
  dialog.setAttribute('data-inline-preview', '');
  // Se envuelve antes de iniciar el intento; abrir y cerrar no mueve ni recarga el iframe.
  panel.before(dialog);
  dialog.append(panel);
  const icon = path => '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + path + '"/></svg>';
  const pin = document.createElement('button');
  pin.id = 'preview-pin';
  pin.type = 'button';
  pin.className = 'secondary preview-pin';
  pin.title = 'Abrir resultado en una ventana redimensionable';
  pin.setAttribute('aria-label', pin.title);
  pin.setAttribute('aria-haspopup', 'dialog');
  pin.setAttribute('aria-controls', dialog.id);
  pin.setAttribute('aria-expanded', 'false');
  pin.innerHTML = icon('M16 3 21 8l-4 2-3 6-2 1-5-5 1-2 6-3z M9 15l-6 6');
  header.insertBefore(pin, document.getElementById('preview-refresh'));
  const close = document.createElement('button');
  close.id = 'preview-modal-close';
  close.type = 'button';
  close.className = 'secondary preview-close';
  close.title = 'Cerrar y devolver el resultado a su posición';
  close.setAttribute('aria-label', close.title);
  close.hidden = true;
  close.innerHTML = icon('m6 6 12 12M18 6 6 18');
  header.append(close);
  const footer = document.createElement('footer');
  footer.className = 'preview-floating-footer';
  const dimensions = document.createElement('output');
  dimensions.className = 'preview-dimensions';
  dimensions.setAttribute('aria-label', 'Tamaño de la vista previa');
  const handle = document.createElement('button');
  handle.id = 'preview-modal-resize';
  handle.type = 'button';
  handle.className = 'preview-resize-handle';
  handle.title = 'Cambiar tamaño: arrastra o utiliza las flechas';
  handle.setAttribute('aria-label', handle.title);
  handle.innerHTML = icon('m8 20 12-12M14 20l6-6M20 20h.01');
  footer.append(dimensions, handle);
  panel.append(footer);
  const shield = document.createElement('div');
  shield.className = 'preview-frame-shield';
  shield.setAttribute('aria-hidden', 'true');
  resizer.append(shield);
  const inset = 8;
  let floating = false, drag = null, previousRect = null, openedFullscreen = null;
  let keyboardLocked = false, releaseTimer = null;
  function unlockKeyboard() {
    clearTimeout(releaseTimer);
    if (keyboardLocked) navigator.keyboard?.unlock();
    keyboardLocked = false;
  }
  async function lockEscape() {
    if (!document.fullscreenElement || !navigator.keyboard?.lock) return;
    try {
      await navigator.keyboard.lock(['Escape']);
      keyboardLocked = true;
      if (!floating) unlockKeyboard();
    } catch { /* El cierre nativo sigue disponible si el navegador no admite la captura. */ }
  }
  const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
  const bounds = () => ({ width: Math.max(1, innerWidth - inset * 2), height: Math.max(1, innerHeight - inset * 2) });
  function updateDimensions() {
    dimensions.value = frame.clientWidth + ' × ' + frame.clientHeight + ' px';
  }
  new ResizeObserver(updateDimensions).observe(frame);
  function resize(width, height) {
    const box = dialog.getBoundingClientRect();
    const available = bounds();
    const maxWidth = Math.max(1, innerWidth - Math.max(inset, box.left) - inset);
    const maxHeight = Math.max(1, innerHeight - Math.max(inset, box.top) - inset);
    dialog.style.width = clamp(width, Math.min(320, available.width, maxWidth), maxWidth) + 'px';
    dialog.style.height = clamp(height, Math.min(260, available.height, maxHeight), maxHeight) + 'px';
    updateDimensions();
  }
  function finishResize() {
    const pointerId = drag?.pointerId;
    drag = null;
    dialog.classList.remove('is-resizing');
    if (pointerId !== undefined && handle.hasPointerCapture(pointerId)) handle.releasePointerCapture(pointerId);
  }
  function restoreInline() {
    if (!floating) return;
    finishResize();
    floating = false;
    syncModalState();
    openedFullscreen = null;
    dialog.removeAttribute('aria-modal');
    dialog.removeAttribute('aria-labelledby');
    dialog.setAttribute('role', 'presentation');
    dialog.setAttribute('open', '');
    dialog.setAttribute('data-inline-preview', '');
    dialog.removeAttribute('style');
    pin.hidden = false;
    close.hidden = true;
    pin.setAttribute('aria-expanded', 'false');
    if (!document.getElementById('cuaderno').hidden) pin.focus({ preventScroll: true });
  }
  function closeModal(escapePressed = false) {
    if (!floating) return;
    const box = dialog.getBoundingClientRect();
    previousRect = { width: box.width, height: box.height };
    dialog.close();
    restoreInline();
    // Se libera después de soltar Escape para que ese mismo gesto no salga de pantalla completa.
    if (escapePressed && keyboardLocked) releaseTimer = setTimeout(unlockKeyboard, 500);
    else unlockKeyboard();
  }
  function openModal() {
    if (floating || document.getElementById('cuaderno').hidden) return;
    const available = bounds();
    const width = Math.min(previousRect?.width || 900, available.width);
    const height = Math.min(previousRect?.height || 650, available.height);
    dialog.style.width = width + 'px';
    dialog.style.height = height + 'px';
    dialog.style.left = Math.max(inset, (innerWidth - width) / 2) + 'px';
    dialog.style.top = Math.max(inset, (innerHeight - height) / 2) + 'px';
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'preview-title');
    pin.hidden = true;
    close.hidden = false;
    pin.setAttribute('aria-expanded', 'true');
    floating = true;
    openedFullscreen = document.fullscreenElement;
    dialog.removeAttribute('open');
    dialog.removeAttribute('data-inline-preview');
    dialog.showModal();
    syncModalState();
    clearTimeout(releaseTimer);
    void lockEscape();
    updateDimensions();
    close.focus({ preventScroll: true });
  }
  pin.addEventListener('click', openModal);
  close.addEventListener('click', () => closeModal());
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeModal(true); });
  dialog.addEventListener('close', () => {
    if (!dialog.open && floating) { restoreInline(); unlockKeyboard(); }
  });
  dialog.addEventListener('keydown', event => {
    if (floating && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeModal(true);
    }
  });
  document.addEventListener('keyup', event => {
    if (event.key === 'Escape' && !floating && keyboardLocked) setTimeout(unlockKeyboard, 0);
  }, true);
  handle.addEventListener('pointerdown', event => {
    if (!floating || event.button !== 0) return;
    event.preventDefault();
    const box = dialog.getBoundingClientRect();
    drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, width: box.width, height: box.height };
    dialog.classList.add('is-resizing');
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    resize(drag.width + event.clientX - drag.x, drag.height + event.clientY - drag.y);
  });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) handle.addEventListener(type, finishResize);
  handle.addEventListener('keydown', event => {
    if (!floating || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    const step = event.shiftKey ? 1 : 10;
    const box = dialog.getBoundingClientRect();
    resize(box.width + (event.key === 'ArrowRight' ? step : event.key === 'ArrowLeft' ? -step : 0),
      box.height + (event.key === 'ArrowDown' ? step : event.key === 'ArrowUp' ? -step : 0));
  });
  window.addEventListener('resize', () => {
    if (!floating) return;
    const available = bounds(), box = dialog.getBoundingClientRect();
    dialog.style.left = clamp(box.left, inset, Math.max(inset, innerWidth - Math.min(box.width, available.width) - inset)) + 'px';
    dialog.style.top = clamp(box.top, inset, Math.max(inset, innerHeight - Math.min(box.height, available.height) - inset)) + 'px';
    resize(box.width, box.height);
  });
  document.addEventListener('fullscreenchange', () => {
    if (floating && openedFullscreen && document.fullscreenElement !== openedFullscreen) closeModal();
  });
  const notebook = document.getElementById('cuaderno');
  const panelGroup = dialog.closest('.paneles');
  const visibilityObserver = new MutationObserver(() => {
    if (floating && (notebook.hidden || notebook.inert || panelGroup.hidden)) closeModal();
  });
  for (const node of [notebook, panelGroup]) visibilityObserver.observe(node, { attributes: true, attributeFilter: ['hidden', 'inert'] });
  function translateControls() {
    const english = document.documentElement.lang === 'en';
    for (const [button, text] of [
      [pin, english ? 'Open result in a resizable window' : 'Abrir resultado en una ventana redimensionable'],
      [close, english ? 'Close and return the result to its position' : 'Cerrar y devolver el resultado a su posición'],
      [handle, english ? 'Resize: drag or use the arrow keys' : 'Cambiar tamaño: arrastra o utiliza las flechas']
    ]) { button.title = text; button.setAttribute('aria-label', text); }
    dimensions.setAttribute('aria-label', english ? 'Preview size' : 'Tamaño de la vista previa');
  }
  new MutationObserver(translateControls).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
  translateControls();
  // El resultado conserva sus propias teclas cuando se muestra dentro del panel.
  const escapeToken = crypto.randomUUID();
  function syncModalState() {
    frame.contentWindow.postMessage({ labPreviewModal: escapeToken, open: floating }, '*');
  }
  const relay = '<script>(function(){var modal=false,token=' + JSON.stringify(escapeToken) + ';window.addEventListener("message",function(e){if(e.source===parent&&e.data&&e.data.labPreviewModal===token)modal=e.data.open===true;});document.addEventListener("keydown",function(e){if(modal&&e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();parent.postMessage({labPreviewEscape:token},"*");}},true);})();</script>';
  lab.transformPreview = source => source.replace('<style>', relay + '<style>');
  frame.addEventListener('load', syncModalState);
  window.addEventListener('message', event => {
    if (event.source === frame.contentWindow && event.data?.labPreviewEscape === escapeToken) closeModal(true);
  });
})();
