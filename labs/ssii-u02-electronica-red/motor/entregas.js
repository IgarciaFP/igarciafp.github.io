(() => {
'use strict';
// La entrega se completa en el formulario del docente; este laboratorio no simula una recepción.
window.LabDelivery=Object.freeze({
configured:delivery=>delivery?.type==='google-form' && /^https:\/\/docs\.google\.com\/forms\//.test(delivery.endpoint||'')
});
})();
