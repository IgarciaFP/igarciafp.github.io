/* Prueba del panel flotante: únicamente DIW02-02. */
(() => {
  'use strict';
  const lab = window.Lab;
  if (lab?.config.module !== 'DIW' || lab.config.activity !== '02-02-checkpoint-modelo-de-caja') return;
  const frame = document.getElementById('preview');
  const panel = frame.closest('.panel');
  const header = panel.querySelector('.panel-cabecera');
  const resizer = panel.querySelector('.preview-resizer');
  const style = document.createElement('style');
  style.textContent = `
.checkpoint-preview-dialog:not(:modal) { display: contents !important; }
.checkpoint-preview-dialog .resize-hint { display: none; }
.checkpoint-preview-dialog .preview-resizer { resize: none; padding: 0; position: relative; }
.checkpoint-preview-dialog .preview-pin,
.checkpoint-preview-dialog .preview-close {
  display: inline-grid; place-items: center; flex: none; width: 36px; height: 36px;
  min-height: 36px; padding: 7px; border-radius: 8px;
}
.checkpoint-preview-dialog button[hidden] { display: none !important; }
.checkpoint-preview-dialog button svg { width: 20px; height: 20px; }
.checkpoint-preview-dialog:modal {
  display: block; position: fixed; inset: auto; margin: 0; padding: 0; border: 0;
  box-sizing: border-box; max-width: calc(100vw - 16px); max-height: calc(100dvh - 16px);
  overflow: hidden; background: #fff; color: var(--navy, #172b42); border-radius: 14px;
  box-shadow: 0 18px 70px #111a2c66;
}
.checkpoint-preview-dialog::backdrop { background: #111a2c99; }
.checkpoint-preview-dialog:modal > .panel { width: 100%; height: 100%; min-height: 0; }
.checkpoint-preview-dialog:modal .panel-cabecera { flex: none; flex-wrap: wrap; gap: 8px; padding: 8px 12px; }
.checkpoint-preview-dialog:modal .preview-close { margin-left: auto; }
.checkpoint-preview-dialog:modal .preview-resizer {
  flex: 1; width: 100%; height: auto; min-width: 0; min-height: 60px; max-width: none;
  border: 0;
}
.checkpoint-preview-dialog:modal .consola { flex: none; max-height: 34%; overflow: auto; }
.checkpoint-preview-dialog .preview-floating-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: 12px;
  flex: none; min-height: 38px; padding: 0 4px 0 12px;
  border-top: 1px solid var(--line, #d5deeb); background: #f7f9fc;
}
.checkpoint-preview-dialog:not(:modal) .preview-floating-footer { display: none; }
.checkpoint-preview-dialog .preview-dimensions { font: .78rem/1.4 system-ui; color: #475569; font-variant-numeric: tabular-nums; }
.checkpoint-preview-dialog .preview-resize-handle {
  display: grid; place-items: center; width: 36px; height: 36px; min-height: 36px;
  padding: 6px; border: 0; border-radius: 6px; background: transparent; color: #475569;
  cursor: nwse-resize; touch-action: none; user-select: none;
}
.checkpoint-preview-dialog .preview-frame-shield { display: none; }
.checkpoint-preview-dialog.is-resizing { cursor: nwse-resize; user-select: none; }
.checkpoint-preview-dialog.is-resizing .preview-frame-shield {
  display: block; position: absolute; inset: 0; z-index: 2; cursor: nwse-resize;
}
`;
  document.head.append(style);
  const dialog = document.createElement('dialog');
  dialog.id = 'checkpoint-preview-dialog';
  dialog.className = 'checkpoint-preview-dialog';
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
  new MutationObserver(() => {
    if (floating && (notebook.hidden || notebook.inert)) closeModal();
  }).observe(notebook, { attributes: true, attributeFilter: ['hidden', 'inert'] });
  // Escape también debe volver al panel cuando el teclado está dentro del iframe aislado.
  const escapeToken = crypto.randomUUID();
  const relay = '<script>document.addEventListener("keydown",function(e){if(e.key==="Escape"){e.preventDefault();e.stopImmediatePropagation();parent.postMessage({checkpointPreviewEscape:' + JSON.stringify(escapeToken) + '},"*");}},true);</script>';
  lab.transformPreview = source => source.replace('<style>', relay + '<style>');
  window.addEventListener('message', event => {
    if (event.source === frame.contentWindow && event.data?.checkpointPreviewEscape === escapeToken) closeModal(true);
  });
})();
