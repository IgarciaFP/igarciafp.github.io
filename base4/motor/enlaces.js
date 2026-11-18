/* Los recursos del enunciado permanecen dentro de la práctica. */
(() => {
  'use strict';
  const notebook = document.getElementById('cuaderno');
  const dialog = document.createElement('dialog');
  dialog.id = 'activity-link-dialog';
  dialog.setAttribute('aria-labelledby', 'activity-link-title');
  dialog.innerHTML = '<header><h2 id="activity-link-title"></h2><button type="button" class="secondary" autofocus aria-label="Cerrar / Close">×</button></header><p class="activity-link-note">Si el sitio impide mostrarse dentro de un iframe, el contenido no estará disponible aquí. / Some sites do not allow embedded content.</p><iframe title="Recurso de la actividad / Activity resource" sandbox="allow-scripts allow-forms" referrerpolicy="no-referrer"></iframe>';
  document.body.append(dialog);
  const frame = dialog.querySelector('iframe');
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => frame.removeAttribute('src'));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  function openLink(event) {
    if (event.type === 'auxclick' && event.button !== 1) return;
    const link = event.target.closest?.('#activity-text a[href], #question-fields a[href]');
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    if (notebook.hidden || notebook.inert) return;
    let url;
    try { url = new URL(link.getAttribute('href'), document.baseURI); } catch { return; }
    // Un iframe no puede representar mailto/tel ni debe ejecutar javascript:.
    if (!['https:', 'http:'].includes(url.protocol)) return;
    dialog.querySelector('h2').textContent = link.textContent.trim() || url.hostname;
    frame.src = url.href;
    if (!dialog.open) dialog.showModal();
  }
  notebook.addEventListener('click', openLink, true);
  notebook.addEventListener('auxclick', openLink, true);
  // Una entrega automática o una pausa no debe quedar oculta tras el recurso.
  new MutationObserver(() => {
    if (dialog.open && (notebook.hidden || notebook.inert)) dialog.close();
  }).observe(notebook, {attributes: true, attributeFilter: ['hidden', 'inert']});
})();
