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

`GET /base4/acceso` responde con la política `base4-prefix2-v1`. Un servidor antiguo que no identifique esta política no habilita el laboratorio. `POST /base4/sello` registra y firma la IP de entrega sin repetir la restricción de red. `/base4/verificar` comprueba la firma; la restricción de IP se aplica únicamente al inicio mediante `/base4/acceso`. La comprobación del horario se conserva como información del sello, independiente de esta regla de IP.

## Activación en el servidor existente

El punto de entrada independiente es `base4/servidor/worker.js`. En Cloudflare Workers Builds, establece el directorio raíz en `base4/servidor` y conserva el nombre del Worker y sus secretos. Cambiar el comentario de `wrangler.jsonc` no cambia por sí solo la configuración del panel. Hasta cambiarla, la compilación anterior continúa dependiendo de `base3/servidor`.

El receptor autentica al profesor con `POST /base4/profesor`, enviando la clave en el cuerpo. Esta ruta no utiliza el controlador de base3 ni la IP de salida de Apps Script. El acceso del alumnado sigue comprobando la red en `/base4/acceso` sin excepciones por contraseña. Publica primero el Worker y después el receptor actualizado.

La integración de Cloudflare con GitHub publica el Worker al cambiar la rama principal. Deben comprobarse tanto el despliegue de Cloudflare como el de GitHub Pages. No se necesitan cambios en los secretos existentes. `CLAVE_PROFESOR` sirve para diagnóstico, no para evitar el bloqueo de IP.

## Alcance

Esta regla bloquea el flujo normal de entrada a base4 desde redes no autorizadas. El repositorio y GitHub Pages siguen siendo públicos: el contenido publicado puede consultarse directamente, sin ejecutar el laboratorio. Para impedir también ese acceso directo se necesita un alojamiento que aplique la restricción a los archivos, no solo al controlador.

El receptor de Apps Script heredado sigue siendo un despliegue independiente. La ruta nueva no modifica sus permisos ni hace privado el repositorio.

## Pruebas locales

```sh
node base4/tests/redes-app.test.mjs
node base4/tests/cargador.test.mjs
```

Cubren los tres prefijos, los límites de octetos, las máscaras ignoradas, el rechazo sin excepción para el profesor y los fallos de comunicación que bloquean el acceso.

## Cifrado de las entregas

El receptor envía las respuestas por HTTPS al Worker propio mediante POST /base4/cifrar. El Worker comprueba el hash y que el sello corresponda a esas respuestas, comprime con gzip y cifra con AES-256-GCM usando CLAVE_PROFESOR. El formato SSII4E1. incorpora una sal y un IV aleatorios; PBKDF2-HMAC-SHA-256 deriva la clave con 100000 iteraciones. La implementación compartida está en ../motor/criptografia.mjs y se verifica también con workerd real. La contraseña no se devuelve al alumnado ni se publica en GitHub.

POST /base4/profesor valida la contraseña y entrega al receptor una autorización de descifrado firmada y con caducidad. Apps Script la conserva asociada al hash de la sesión; el navegador conserva solo su token habitual. POST /base4/descifrar exige esa autorización. Así profesor.html reutiliza su login sin pedir otra contraseña y los volcados generan enlaces sin cifrar para revisor.html, conservando cifrado el original de Entregas. La IA debe solicitar la contraseña antes de corregir, conforme a correccion/instrucciones.txt. Si se cambia la contraseña, los documentos anteriores requieren la contraseña con la que se cifraron.

Despliega primero el Worker y después actualiza Code.gs y Bridge.html en la implementación existente de Apps Script. Los secretos actuales se conservan; no se añaden contraseñas al código ni a Apps Script.

Cloudflare limita PBKDF2 a 100000 iteraciones en producción, aunque workerd local admita más. Este valor forma parte del formato SSII4E1. y debe coincidir al descifrar. Referencia del runtime: https://github.com/cloudflare/workerd/issues/1346. La prueba publicada se realiza con datos ficticios, sin escribir entregas en la hoja.
