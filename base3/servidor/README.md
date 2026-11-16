# Servidor de control de red y horario

`worker.js` es un Cloudflare Worker. Hace lo que una página estática no puede: ver la IP real desde la que se conecta el alumno y usar la hora del servidor, no la del ordenador del alumno.

- **Al abrir una actividad** decide si se puede: solo desde la red del centro y dentro del horario del módulo, con cinco minutos de margen antes y después. Si no, la página muestra «No se encuentra la actividad.».
- **Al entregar** emite un sello firmado con la IP, la hora y si la entrega cumple red y horario. La entrega se genera siempre; si no cumple, queda marcada.
- **Si el servidor no responde** (caído o bloqueado por la red), el alumno entra igualmente y la entrega queda anotada como «sin comprobar».

Mientras `control.servidor` esté vacío en `contenido/config.json`, el control está desactivado.

## Puesta en marcha

1. Crear una cuenta gratuita en Cloudflare y, en **Workers & Pages**, crear un Worker (por ejemplo `base3-control`).
2. Abrir el editor de código del Worker, sustituir todo su contenido por el de `worker.js` y desplegar.
3. En la configuración del Worker, en **Variables y secretos**, añadir dos valores de tipo **Secreto**:
   - `CLAVE_PROFESOR`: la clave con la que el profesor entra fuera de horario o desde otra red.
   - `SECRETO_SELLO`: un texto largo y aleatorio (40 caracteres o más). No hace falta recordarlo.
4. Copiar la dirección del Worker (`https://base3-control.SUBDOMINIO.workers.dev`) en `contenido/config.json`, sin barra final:

   ```json
   "control": { "servidor": "https://base3-control.SUBDOMINIO.workers.dev" }
   ```

5. Si se usa la hoja de cálculo, poner la misma dirección en `SERVIDOR_` del receptor (`receptor/Code.gs`) para que verifique los sellos.

Ninguno de los dos secretos debe escribirse en el repositorio, que es público.

### Alternativa: Worker conectado al repositorio de GitHub

Si el Worker se creó importando este repositorio, Cloudflare intenta publicar el sitio entero y la compilación falla. Para que publique solo este servidor, en el Worker ir a **Settings → Build** y dejar:

- **Root directory:** `base3/servidor`
- **Build command:** vacío
- **Deploy command:** `npx wrangler deploy`

`wrangler.jsonc` indica qué archivo se publica. Su `name` debe coincidir con el nombre del Worker en Cloudflare (`igarciafp-github-io`); si el Worker se llama de otra forma, cambiarlo ahí. Con esta conexión, cada cambio de `worker.js` en la rama `main` se publica solo. Los secretos se añaden igual, en el panel.

Si Cloudflare abre en GitHub una *pull request* de configuración automática (añade `wrangler.jsonc` y un plugin de Vite en la raíz), hay que cerrarla sin fusionar: es para publicar el sitio, no este servidor.

## Comprobar desde el aula

Abrir en un ordenador del aula:

```
https://base3-control.SUBDOMINIO.workers.dev/diagnostico?clave=LA_CLAVE
```

Muestra la IP que ve el servidor, si pertenece a la red, el día y la hora, y qué módulos están abiertos en ese momento. Conviene hacerlo antes del primer uso: si el centro saliera a Internet por IPv6 o por otra dirección, `enRed` sería `false` y habría que añadir esa red a `REDES`.

## Entrar como profesor

Añadir la clave a la dirección de la actividad:

```
https://igarciafp.github.io/base3/?a=diw/tarjeta&clave=LA_CLAVE
```

Las entregas hechas así llevan la marca «clave del profesor». La clave queda visible en la barra de direcciones: no usarla en una pantalla proyectada.

## Cambiar la red, el margen o el horario

Están al principio de `worker.js` (`REDES`, `MARGEN_MINUTOS`, `HORARIO`). Tras cambiarlos hay que volver a pegar el archivo en Cloudflare y desplegar. El horario está en hora de Madrid y sigue el cambio de hora.

Con el margen de cinco minutos, el descanso de 18:30 a 18:45 deja cerrados los minutos de 18:35 a 18:40.

## Límites

El control es real para la hora y la IP de **la entrega**, porque el sello lo firma el servidor y la página del profesor y el receptor lo verifican. Para **abrir** la actividad es disuasorio: el repositorio es público, así que el enunciado y el código de partida se pueden leer en GitHub a cualquier hora, y un alumno que impida a su navegador llegar al servidor entra «sin comprobar» (su entrega lo indica).
