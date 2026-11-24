let total = 0;
  document.querySelectorAll('.prueba button').forEach(boton => {
    boton.addEventListener('focus', () => {
      document.querySelector('#foco').textContent = 'Foco: ' + boton.id;
    });
    boton.addEventListener('click', () => {
      total++;
      document.querySelector('#resultado').textContent =
        'Activaciones: ' + total + '. Último botón: ' + boton.id;
    });
  });

