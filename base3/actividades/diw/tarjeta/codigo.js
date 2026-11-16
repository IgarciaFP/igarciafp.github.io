const boton = document.getElementById('saludar');
const mensaje = document.getElementById('mensaje');
let veces = 0;

boton.addEventListener('click', () => {
  veces++;
  mensaje.textContent = 'Hola. Has pulsado ' + veces + ' veces.';
  console.log('Pulsaciones:', veces);
});
