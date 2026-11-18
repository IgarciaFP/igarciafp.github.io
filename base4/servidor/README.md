# Control de red de base4

La lista única está en `base4/contenido/redes.json`:

```json
{"ipsPermitidas": ["88.26.0.0", "45.86.0.0", "185.197.0.0"]}
```

El servidor compara únicamente los dos primeros octetos de la IP real recibida de Cloudflare. `88.26.1.2` y `88.26.254.200` pertenecen al mismo grupo permitido. La máscara de una dirección configurada, si aparece, no altera la comparación. Se rechazan IPv4 inválidas, direcciones desconocidas y IPv6 que no representen una IPv4 admitida.

La actividad ya no define `redes` ni `restringirIPs`. Tampoco existe un modo permisivo a nivel de la aplicación. Si no hay respuesta positiva del servidor, si falta configuración o si el servicio falla, el cargador bloquea el acceso antes de solicitar los archivos de la actividad. La clave del profesor no permite entrar desde otra red.

`contenido/config.json` indica el punto de acceso:

```json
{"control": {"servidor": "https://igarciafp-github-io.igarciafp.workers.dev/base4"}}
```

`GET /base4/acceso` responde con la política `base4-prefix2-v1`. Un servidor antiguo que no identifique esta política no habilita el laboratorio. `POST /base4/sello` solo firma desde las redes permitidas; el cliente no genera una entrega cuando falta una verificación positiva. La comprobación del horario se conserva como información del sello, independiente de esta regla de IP.

## Activación en el servidor existente

El Worker utiliza `base3/servidor/worker.js` como punto de entrada. Un import del controlador de base4 y una condición derivan exclusivamente las rutas `/base4/`. Las demás rutas mantienen el controlador existente. La prueba `router-base3.test.mjs` comprueba que el código restante de base3 coincide con su versión anterior y conserva sus respuestas.

La integración de Cloudflare con GitHub publica el Worker al cambiar la rama principal. Deben comprobarse tanto el despliegue de Cloudflare como el de GitHub Pages. No se necesitan cambios en los secretos existentes. `CLAVE_PROFESOR` sirve para diagnóstico, no para evitar el bloqueo de IP.

## Alcance

Esta regla bloquea el flujo normal de entrada y la emisión de sellos de base4. El repositorio y GitHub Pages siguen siendo públicos: el contenido publicado puede consultarse directamente, sin ejecutar el laboratorio. Para impedir también ese acceso directo se necesita un alojamiento que aplique la restricción a los archivos, no solo al controlador.

El receptor de Apps Script heredado sigue siendo un despliegue independiente. La ruta nueva no modifica sus permisos ni hace privado el repositorio.

## Pruebas locales

```sh
node base4/tests/redes-app.test.mjs
node base4/tests/cargador.test.mjs
```

Cubren los tres prefijos, los límites de octetos, las máscaras ignoradas, el rechazo sin excepción para el profesor y los fallos de comunicación que bloquean el acceso.
