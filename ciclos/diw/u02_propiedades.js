/*
 * UD02 · Fuente única de las propiedades CSS de la unidad.
 *
 * Cada propiedad se describe UNA sola vez en `propiedades`. A partir de estas fichas se generan:
 *   - las tablas de los apartados:   <div data-tabla-propiedades data-familia="…" data-apartado="…" data-nivel="…" data-props="…" data-titulo="…"></div>
 *   - las tablas de valores:         <div data-tabla-valores="overflow"></div>
 *
 * Campos de cada ficha:
 *   n        nombre de la propiedad, o lista de nombres si se presentan juntas en una fila
 *   f        familia (ver `familias`)
 *   nivel    'basica' (se trabaja en el tema) o 'ampliada' (menos habitual; se consulta en la referencia)
 *   sec      id del apartado donde se presenta
 *   c        qué controla
 *   v        valores habituales
 *   i        valor inicial
 *   h        true si se hereda
 *   e        ejemplo de declaración
 *   ab       id de la tarjeta Shorthand si la propiedad es una abreviatura
 * Los textos admiten HTML (por ejemplo, <code>…</code>).
 */
(() => {
const C = x => `<code>${x}</code>`;

const familias = [
  { id: 'caja', titulo: 'Caja y espaciado' },
  { id: 'dimensiones', titulo: 'Dimensiones y encuadre' },
  { id: 'desbordamiento', titulo: 'Desbordamiento' },
  { id: 'color', titulo: 'Color y transparencia' },
  { id: 'fondos', titulo: 'Fondos' },
  { id: 'bordes', titulo: 'Bordes, contornos y sombras' },
  { id: 'tipografia', titulo: 'Tipografía' },
  { id: 'texto', titulo: 'Texto' },
  { id: 'flujo', titulo: 'Flujo, visibilidad y flotantes' },
  { id: 'posicion', titulo: 'Posicionamiento' },
];

const L = 'longitud', P = 'porcentaje';
const propiedades = [
  {
    n: 'container', f: 'dimensiones', nivel: 'ampliada', sec: 'medidas',
    c: 'Da un nombre al contenedor y establece el tipo de consulta que admite.',
    v: 'Nombre y, opcionalmente, una barra seguida del tipo de contenedor.',
    i: C('none / normal'), h: false, e: 'container: catalogo / inline-size;'
  },

  // ── Caja y espaciado ─────────────────────────────────────────────
  { n: 'padding', f: 'caja', nivel: 'basica', sec: 'caja-tamano', c: 'Relleno entre el contenido y el borde, en los cuatro lados.', v: `De uno a cuatro valores: ${L} o ${P}; no admite negativos`, i: '0', h: false, e: 'padding: 1rem 2rem;', ab: 'shorthand-espacios' },
  { n: ['padding-top', 'padding-right', 'padding-bottom', 'padding-left'], f: 'caja', nivel: 'basica', sec: 'caja-tamano', c: 'Relleno de un solo lado físico: arriba, derecha, abajo o izquierda.', v: `${L} o ${P}`, i: '0', h: false, e: 'padding-left: 1rem;' },
  { n: 'margin', f: 'caja', nivel: 'basica', sec: 'caja-tamano', c: 'Espacio exterior que separa la caja de sus vecinas, en los cuatro lados.', v: `De uno a cuatro valores: ${L}, ${P} o ${C('auto')}; admite negativos`, i: '0', h: false, e: 'margin: 0 auto;', ab: 'shorthand-espacios' },
  { n: ['margin-top', 'margin-right', 'margin-bottom', 'margin-left'], f: 'caja', nivel: 'basica', sec: 'caja-tamano', c: 'Margen de un solo lado físico.', v: `${L}, ${P} o ${C('auto')}`, i: '0', h: false, e: 'margin-bottom: 1.5rem;' },
  { n: ['padding-inline', 'padding-block'], f: 'caja', nivel: 'basica', sec: 'caja-tamano', c: 'Relleno de los dos extremos de un eje lógico: el de la línea (<em>inline</em>) o el de los bloques (<em>block</em>). En escritura horizontal, <code>inline</code> son los laterales y <code>block</code>, arriba y abajo.', v: `Uno o dos valores: inicio y fin`, i: '0', h: false, e: 'padding-inline: 2rem;' },
  { n: ['margin-inline', 'margin-block'], f: 'caja', nivel: 'basica', sec: 'caja-tamano', c: 'Margen de los dos extremos de un eje lógico. <code>margin-inline: auto</code> centra un bloque de ancho limitado.', v: `Uno o dos valores: inicio y fin; admiten ${C('auto')}`, i: '0', h: false, e: 'margin-inline: auto;' },
  { n: ['padding-inline-start', 'padding-inline-end', 'padding-block-start', 'padding-block-end'], f: 'caja', nivel: 'ampliada', sec: 'caja-tamano', c: 'Relleno de un solo extremo lógico. <code>padding-inline-start</code> es la izquierda en español y la derecha en árabe.', v: `${L} o ${P}`, i: '0', h: false, e: 'padding-inline-start: 1rem;' },
  { n: ['margin-inline-start', 'margin-inline-end', 'margin-block-start', 'margin-block-end'], f: 'caja', nivel: 'ampliada', sec: 'caja-tamano', c: 'Margen de un solo extremo lógico. En escritura horizontal, <code>margin-block-end</code> es el margen inferior.', v: `${L}, ${P} o ${C('auto')}`, i: '0', h: false, e: 'margin-block-end: 1rem;' },
  { n: 'box-sizing', f: 'caja', nivel: 'basica', sec: 'caja-tamano', c: 'Qué incluye el ancho y el alto declarados: solo el contenido o también el relleno y el borde.', v: `${C('content-box')}, ${C('border-box')}`, i: C('content-box'), h: false, e: 'box-sizing: border-box;' },

  // ── Dimensiones y encuadre ───────────────────────────────────────
  { n: 'width', f: 'dimensiones', nivel: 'basica', sec: 'caja-dimensiones', c: 'Ancho de la caja, sujeto a los límites mínimo y máximo.', v: `${C('auto')}, ${L}, ${P}, ${C('fit-content')}`, i: C('auto'), h: false, e: 'width: 80%;' },
  { n: 'height', f: 'dimensiones', nivel: 'basica', sec: 'caja-dimensiones', c: 'Alto de la caja.', v: `${C('auto')}, ${L}, ${P}`, i: C('auto'), h: false, e: 'height: auto;' },
  { n: 'min-width', f: 'dimensiones', nivel: 'basica', sec: 'caja-dimensiones', c: 'Ancho mínimo: la caja no se estrecha por debajo.', v: `${C('auto')}, ${L}, ${P}`, i: C('auto'), h: false, e: 'min-width: 16rem;' },
  { n: 'min-height', f: 'dimensiones', nivel: 'basica', sec: 'caja-dimensiones', c: 'Alto mínimo: la caja puede crecer con su contenido.', v: `${C('auto')}, ${L}, ${P}`, i: C('auto'), h: false, e: 'min-height: 12rem;' },
  { n: 'max-width', f: 'dimensiones', nivel: 'basica', sec: 'caja-dimensiones', c: 'Ancho máximo.', v: `${C('none')}, ${L}, ${P}`, i: C('none'), h: false, e: 'max-width: 65ch;' },
  { n: 'max-height', f: 'dimensiones', nivel: 'basica', sec: 'caja-dimensiones', c: 'Alto máximo; el contenido sobrante puede desbordarse.', v: `${C('none')}, ${L}, ${P}`, i: C('none'), h: false, e: 'max-height: 30rem;' },
  { n: 'aspect-ratio', f: 'dimensiones', nivel: 'basica', sec: 'caja-dimensiones', c: 'Proporción preferida entre ancho y alto. Al menos una dimensión debe ser automática para calcularla a partir de la otra.', v: `${C('auto')}, una proporción como ${C('16 / 9')} o un número`, i: C('auto'), h: false, e: 'aspect-ratio: 16 / 9;' },
  { n: 'object-fit', f: 'dimensiones', nivel: 'basica', sec: 'caja-dimensiones', c: 'Cómo se ajusta una imagen o un vídeo a su caja: estirándose, recortándose o mostrándose entero.', v: `${C('fill')}, ${C('cover')}, ${C('contain')}, ${C('none')}, ${C('scale-down')}`, i: C('fill'), h: false, e: 'object-fit: cover;' },
  { n: 'object-position', f: 'dimensiones', nivel: 'ampliada', sec: 'caja-dimensiones', c: 'Qué parte de la imagen queda visible cuando se recorta dentro de su caja.', v: `Palabras clave, ${L} o ${P}, como en ${C('background-position')}`, i: C('50% 50%'), h: false, e: 'object-position: center top;' },
  { n: 'inline-size', f: 'dimensiones', nivel: 'ampliada', sec: 'caja-dimensiones', c: 'Tamaño en el eje del texto; en escritura horizontal equivale al ancho.', v: 'Los de ' + C('width'), i: C('auto'), h: false, e: 'inline-size: 100%;' },
  { n: 'block-size', f: 'dimensiones', nivel: 'ampliada', sec: 'caja-dimensiones', c: 'Tamaño en el eje perpendicular al texto; en escritura horizontal equivale al alto.', v: 'Los de ' + C('height'), i: C('auto'), h: false, e: 'block-size: auto;' },
  { n: 'min-inline-size', f: 'dimensiones', nivel: 'ampliada', sec: 'caja-dimensiones', c: 'Mínimo en el eje del texto; en escritura horizontal, ancho mínimo.', v: 'Los de ' + C('min-width'), i: C('auto'), h: false, e: 'min-inline-size: 16rem;' },
  { n: 'max-inline-size', f: 'dimensiones', nivel: 'ampliada', sec: 'caja-dimensiones', c: 'Máximo en el eje del texto; en escritura horizontal, ancho máximo.', v: 'Los de ' + C('max-width'), i: C('none'), h: false, e: 'max-inline-size: 65ch;' },
  { n: 'min-block-size', f: 'dimensiones', nivel: 'ampliada', sec: 'caja-dimensiones', c: 'Mínimo en el eje perpendicular al texto; en escritura horizontal, alto mínimo.', v: 'Los de ' + C('min-height'), i: C('auto'), h: false, e: 'min-block-size: 12rem;' },
  { n: 'max-block-size', f: 'dimensiones', nivel: 'ampliada', sec: 'caja-dimensiones', c: 'Máximo en el eje perpendicular al texto; en escritura horizontal, alto máximo.', v: 'Los de ' + C('max-height'), i: C('none'), h: false, e: 'max-block-size: 30rem;' },
  { n: 'writing-mode', f: 'dimensiones', nivel: 'ampliada', sec: 'caja-tamano', c: 'Orienta las líneas e indica dónde aparece la siguiente. Para escribir en árabe en horizontal, conserva <code>horizontal-tb</code> y usa <code>&lt;p lang="ar" dir="rtl"&gt;مرحبا&lt;/p&gt;</code>. El atributo <code>dir="rtl"</code> fija la dirección de lectura de derecha a izquierda.', v: `${C('horizontal-tb')}: líneas horizontales que se suceden de arriba abajo (<em>top to bottom</em>).<br>${C('vertical-rl')}: columnas de derecha a izquierda (<em>right to left</em>).<br>${C('vertical-lr')}: columnas de izquierda a derecha (<em>left to right</em>).`, i: C('horizontal-tb'), h: true, e: 'writing-mode: vertical-rl;' },
  { n: 'container-type', f: 'dimensiones', nivel: 'ampliada', sec: 'medidas', c: 'Si el elemento puede usarse como referencia en consultas y unidades de contenedor.', v: `${C('normal')}, ${C('inline-size')}, ${C('size')}`, i: C('normal'), h: false, e: 'container-type: inline-size;' },

  // ── Desbordamiento ──────────────────────────────────────────────
  { n: 'overflow', f: 'desbordamiento', nivel: 'basica', sec: 'caja-overflow', c: 'Desbordamiento en los dos ejes.', v: `Uno o dos de: ${C('visible')}, ${C('hidden')}, ${C('clip')}, ${C('scroll')}, ${C('auto')}`, i: C('visible'), h: false, e: 'overflow: hidden auto;', ab: 'shorthand-overflow' },
  { n: 'overflow-x', f: 'desbordamiento', nivel: 'basica', sec: 'caja-overflow', c: 'Desbordamiento horizontal.', v: 'Los valores de ' + C('overflow'), i: C('visible'), h: false, e: 'overflow-x: auto;' },
  { n: 'overflow-y', f: 'desbordamiento', nivel: 'basica', sec: 'caja-overflow', c: 'Desbordamiento vertical.', v: 'Los valores de ' + C('overflow'), i: C('visible'), h: false, e: 'overflow-y: auto;' },
  { n: ['overflow-inline', 'overflow-block'], f: 'desbordamiento', nivel: 'ampliada', sec: 'caja-overflow', c: 'Desbordamiento en el eje de la línea o en el de los bloques; equivalen a <code>overflow-x</code> y <code>overflow-y</code> en escritura horizontal.', v: 'Los valores de ' + C('overflow'), i: C('visible'), h: false, e: 'overflow-block: auto;' },
  { n: 'overflow-clip-margin', f: 'desbordamiento', nivel: 'ampliada', sec: 'caja-overflow', c: 'Cuánto puede sobresalir el contenido antes de recortarse con <code>overflow: clip</code>.', v: `${L} no negativa`, i: C('0px'), h: false, e: 'overflow-clip-margin: 1rem;' },
  { n: 'resize', f: 'desbordamiento', nivel: 'ampliada', sec: 'caja-overflow', c: 'Si el usuario puede cambiar el tamaño de la caja arrastrando su esquina. Requiere un <code>overflow</code> distinto de <code>visible</code>.', v: `${C('none')}, ${C('both')}, ${C('horizontal')}, ${C('vertical')}, ${C('block')}, ${C('inline')}`, i: C('none'), h: false, e: 'resize: vertical;' },

  // ── Color y transparencia ──────────────────────────────────────
  { n: 'color', f: 'color', nivel: 'basica', sec: 'caja-colores', c: 'Color del texto y valor de <code>currentColor</code>.', v: 'Un color en cualquier notación', i: 'Depende del navegador (normalmente negro)', h: true, e: 'color: var(--marca);' },
  { n: 'background-color', f: 'color', nivel: 'basica', sec: 'caja-colores', c: 'Color del fondo de la caja. También se ve si la imagen de fondo no carga.', v: `Un color o ${C('transparent')}`, i: C('transparent'), h: false, e: 'background-color: rgb(30 58 138 / .15);' },
  { n: 'opacity', f: 'color', nivel: 'basica', sec: 'caja-colores', c: 'Opacidad del elemento completo, incluidos su texto y sus descendientes.', v: 'Número de 0 a 1 o porcentaje de 0 % a 100 %', i: C('1'), h: false, e: 'opacity: .5;' },

  // ── Fondos ─────────────────────────────────────────────────────
  { n: 'background-image', f: 'fondos', nivel: 'basica', sec: 'imagenes-fondo', c: 'Una o varias capas de imagen o degradado. La primera queda delante.', v: `${C('none')}, ${C('url()')}, degradados o ${C('image-set()')}`, i: C('none'), h: false, e: 'background-image: url("patio.jpg");' },
  { n: 'background-position', f: 'fondos', nivel: 'basica', sec: 'imagenes-fondo', c: 'Sitúa la imagen en su zona de referencia.', v: `Eje horizontal: ${C('left')}, ${C('center')} o ${C('right')}. Eje vertical: ${C('top')}, ${C('center')} o ${C('bottom')}. También admite ${L} o ${P}`, i: C('0% 0%'), h: false, e: 'background-position: center top;' },
  { n: 'background-size', f: 'fondos', nivel: 'basica', sec: 'imagenes-fondo', c: 'Escala la imagen: <code>cover</code> cubre el área aunque recorte; <code>contain</code> la muestra entera.', v: `${C('auto')}, ${C('cover')}, ${C('contain')} o dimensiones`, i: C('auto'), h: false, e: 'background-size: cover;' },
  { n: 'background-repeat', f: 'fondos', nivel: 'basica', sec: 'imagenes-fondo', c: 'Si se repite la imagen y en qué ejes.', v: `${C('repeat')}, ${C('no-repeat')}, ${C('repeat-x')}, ${C('repeat-y')}, ${C('space')}, ${C('round')}`, i: C('repeat'), h: false, e: 'background-repeat: no-repeat;' },
  { n: 'background', f: 'fondos', nivel: 'basica', sec: 'imagenes-fondo', c: 'Reúne las propiedades de fondo en una sola declaración.', v: 'Color, imagen, posición / tamaño, repetición, desplazamiento y cajas', i: 'El de cada componente', h: false, e: 'background: navy url("patio.jpg") center / cover no-repeat;', ab: 'shorthand-fondos' },
  { n: ['background-position-x', 'background-position-y'], f: 'fondos', nivel: 'ampliada', sec: 'imagenes-fondo', c: 'Ajustan solo el eje horizontal o el vertical de la posición.', v: `${C('left')}, ${C('center')}, ${C('right')} en X; ${C('top')}, ${C('center')}, ${C('bottom')} en Y; también ${L} y ${P}`, i: C('0%'), h: false, e: 'background-position-y: 25%;' },
  { n: 'background-attachment', f: 'fondos', nivel: 'ampliada', sec: 'imagenes-fondo', c: 'Vincula la imagen a la caja, al contenido desplazable o a la ventana.', v: `${C('scroll')}, ${C('local')}, ${C('fixed')}`, i: C('scroll'), h: false, e: 'background-attachment: local;' },
  { n: 'background-origin', f: 'fondos', nivel: 'ampliada', sec: 'imagenes-fondo', c: 'Desde qué caja se calculan el tamaño y la posición del fondo.', v: `${C('border-box')}, ${C('padding-box')}, ${C('content-box')}`, i: C('padding-box'), h: false, e: 'background-origin: content-box;' },
  { n: 'background-clip', f: 'fondos', nivel: 'ampliada', sec: 'imagenes-fondo', c: 'Hasta dónde se pinta el fondo. <code>padding-box</code> evita que se vea bajo un borde discontinuo.', v: `${C('border-box')}, ${C('padding-box')}, ${C('content-box')}, ${C('text')}`, i: C('border-box'), h: false, e: 'background-clip: padding-box;' },
  { n: 'background-blend-mode', f: 'fondos', nivel: 'ampliada', sec: 'imagenes-fondo', c: 'Mezcla las capas de fondo entre sí y con el color de base.', v: `${C('normal')}, ${C('multiply')}, ${C('screen')}, ${C('overlay')}…`, i: C('normal'), h: false, e: 'background-blend-mode: multiply;' },

  // ── Bordes, contornos y sombras ────────────────────────────────
  { n: 'border', f: 'bordes', nivel: 'basica', sec: 'caja-bordes', c: 'La línea que delimita la caja en los cuatro lados. Su grosor ocupa espacio.', v: 'Grosor, estilo y color', i: 'El de cada componente', h: false, e: 'border: 2px solid navy;', ab: 'shorthand-bordes' },
  { n: 'border-width', f: 'bordes', nivel: 'basica', sec: 'caja-bordes', c: 'El grosor del borde, de uno a cuatro valores.', v: `${L} o ${C('thin')}, ${C('medium')}, ${C('thick')}`, i: C('medium'), h: false, e: 'border-width: 2px;' },
  { n: 'border-style', f: 'bordes', nivel: 'basica', sec: 'caja-bordes', c: 'El trazo del borde. Con <code>none</code>, el borde desaparece.', v: `${C('none')}, ${C('solid')}, ${C('dashed')}, ${C('dotted')}… (tabla de valores)`, i: C('none'), h: false, e: 'border-style: dashed;' },
  { n: 'border-color', f: 'bordes', nivel: 'basica', sec: 'caja-bordes', c: 'El color, sin alterar el grosor ni el trazo.', v: 'Un color', i: C('currentColor'), h: false, e: 'border-color: navy;' },
  { n: 'border-radius', f: 'bordes', nivel: 'basica', sec: 'caja-bordes', c: 'El redondeo de las esquinas. En una caja cuadrada, un radio del 50 % produce un círculo.', v: `De uno a cuatro radios: ${L} o ${P}`, i: C('0'), h: false, e: 'border-radius: 12px;', ab: 'shorthand-bordes' },
  { n: 'box-shadow', f: 'bordes', nivel: 'basica', sec: 'caja-bordes', c: 'Una o varias sombras, sin cambiar las dimensiones de la caja.', v: `${C('none')} o una lista de sombras; ${C('inset')} opcional`, i: C('none'), h: false, e: 'box-shadow: 0 4px 12px #0003;' },
  { n: 'outline', f: 'bordes', nivel: 'basica', sec: 'caja-bordes', c: 'Un contorno que no desplaza las cajas vecinas. Úsalo para señalar el foco.', v: 'Grosor, estilo y color', i: 'El de cada componente', h: false, e: 'outline: 3px solid navy;', ab: 'shorthand-bordes' },
  { n: 'outline-offset', f: 'bordes', nivel: 'basica', sec: 'caja-bordes', c: 'La separación entre el contorno y el borde.', v: `${L}; negativa para acercarlo al interior`, i: C('0'), h: false, e: 'outline-offset: 3px;' },
  { n: ['border-top', 'border-right', 'border-bottom', 'border-left'], f: 'bordes', nivel: 'ampliada', sec: 'caja-bordes', c: 'El borde completo de un lado físico.', v: 'Grosor, estilo y color', i: 'El de cada componente', h: false, e: 'border-bottom: 2px solid teal;' },
  { n: ['border-top-width', 'border-top-style', 'border-top-color', 'border-right-width', 'border-right-style', 'border-right-color', 'border-bottom-width', 'border-bottom-style', 'border-bottom-color', 'border-left-width', 'border-left-style', 'border-left-color'], f: 'bordes', nivel: 'ampliada', sec: 'caja-bordes', c: 'Un solo componente (grosor, estilo o color) de un solo lado físico.', v: 'Los de ' + C('border-width') + ', ' + C('border-style') + ' y ' + C('border-color'), i: 'El de cada componente', h: false, e: 'border-top-color: navy;' },
  { n: ['border-inline', 'border-block', 'border-inline-start', 'border-inline-end', 'border-block-start', 'border-block-end'], f: 'bordes', nivel: 'ampliada', sec: 'caja-bordes', c: 'Bordes de los extremos lógicos: el eje de la línea o el de los bloques, completos o de un solo extremo.', v: 'Grosor, estilo y color', i: 'El de cada componente', h: false, e: 'border-inline-start: 4px solid teal;' },
  { n: ['border-top-left-radius', 'border-top-right-radius', 'border-bottom-right-radius', 'border-bottom-left-radius'], f: 'bordes', nivel: 'ampliada', sec: 'caja-bordes', c: 'El radio de una sola esquina. Dos valores crean una esquina elíptica.', v: `Uno o dos radios: ${L} o ${P}`, i: C('0'), h: false, e: 'border-top-left-radius: 12px;' },
  { n: ['border-start-start-radius', 'border-start-end-radius', 'border-end-start-radius', 'border-end-end-radius'], f: 'bordes', nivel: 'ampliada', sec: 'caja-bordes', c: 'El radio de una esquina según la dirección de escritura.', v: `Uno o dos radios: ${L} o ${P}`, i: C('0'), h: false, e: 'border-start-end-radius: 12px;' },
  { n: ['outline-width', 'outline-style', 'outline-color'], f: 'bordes', nivel: 'ampliada', sec: 'caja-bordes', c: 'Los componentes del contorno por separado.', v: 'Como los del borde; ' + C('outline-style') + ' admite además ' + C('auto'), i: `${C('medium')}, ${C('none')} y ${C('auto')}`, h: false, e: 'outline-color: navy;' },

  // ── Tipografía ─────────────────────────────────────────────────
  { n: 'font-family', f: 'tipografia', nivel: 'basica', sec: 'ampliacion-typography', c: 'Lista ordenada de fuentes; termina siempre con una familia genérica.', v: 'Nombres de fuente y familias genéricas, separados por comas', i: 'Depende del navegador', h: true, e: 'font-family: system-ui, sans-serif;' },
  { n: 'font-size', f: 'tipografia', nivel: 'basica', sec: 'ampliacion-typography', c: 'Tamaño de la letra.', v: `${L}, ${P}, ${C('small')}…${C('xx-large')}, ${C('smaller')}, ${C('larger')}`, i: C('medium'), h: true, e: 'font-size: 1rem;' },
  { n: 'font-weight', f: 'tipografia', nivel: 'basica', sec: 'ampliacion-typography', c: 'Peso o grosor de los trazos.', v: `${C('normal')}, ${C('bold')}, ${C('bolder')}, ${C('lighter')} o un número de 1 a 1000`, i: C('normal'), h: true, e: 'font-weight: 600;' },
  { n: 'font-style', f: 'tipografia', nivel: 'basica', sec: 'ampliacion-typography', c: 'Inclinación: normal, cursiva u oblicua.', v: `${C('normal')}, ${C('italic')}, ${C('oblique')} con ángulo opcional`, i: C('normal'), h: true, e: 'font-style: italic;' },
  { n: 'line-height', f: 'tipografia', nivel: 'basica', sec: 'ampliacion-typography', c: 'Altura de cada línea. Un número sin unidad se hereda como factor.', v: `${C('normal')}, número sin unidad, ${L} o ${P}`, i: C('normal'), h: true, e: 'line-height: 1.6;' },
  { n: 'font', f: 'tipografia', nivel: 'basica', sec: 'ampliacion-typography', c: 'Reúne estilo, variante, peso, anchura, tamaño, interlineado y familia. El tamaño y la familia son obligatorios.', v: 'Opcionales, tamaño, / interlineado y familia', i: 'El de cada componente', h: true, e: 'font: italic 600 1.125rem/1.6 system-ui, sans-serif;', ab: 'shorthand-tipografia' },
  { n: ['font-stretch', 'font-width'], f: 'tipografia', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Anchura de los caracteres, si la fuente ofrece variantes. <code>font-width</code> es el nombre nuevo de <code>font-stretch</code>.', v: `${C('normal')}, ${C('condensed')}, ${C('expanded')}… o ${P}`, i: C('normal'), h: true, e: 'font-stretch: condensed;' },
  { n: 'font-variant', f: 'tipografia', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Reúne las variantes tipográficas: mayúsculas, cifras, ligaduras…', v: 'Palabras clave de cada variante', i: C('normal'), h: true, e: 'font-variant: small-caps;', ab: 'shorthand-tipografia' },
  { n: 'font-variant-caps', f: 'tipografia', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Variantes de mayúsculas, como las versalitas.', v: `${C('normal')}, ${C('small-caps')}, ${C('all-small-caps')}, ${C('petite-caps')}…`, i: C('normal'), h: true, e: 'font-variant-caps: small-caps;' },
  { n: 'font-variant-numeric', f: 'tipografia', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Forma de las cifras: tabulares para alinear columnas, fracciones, cero con barra…', v: `${C('normal')}, ${C('tabular-nums')}, ${C('oldstyle-nums')}, ${C('diagonal-fractions')}, ${C('slashed-zero')}…`, i: C('normal'), h: true, e: 'font-variant-numeric: tabular-nums;' },
  { n: 'font-variant-ligatures', f: 'tipografia', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Si se usan ligaduras, como la unión de «fi».', v: `${C('normal')}, ${C('none')}, ${C('common-ligatures')}, ${C('no-common-ligatures')}…`, i: C('normal'), h: true, e: 'font-variant-ligatures: none;' },
  { n: 'font-kerning', f: 'tipografia', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Si se aplica el ajuste de espacio entre pares de letras que trae la fuente.', v: `${C('auto')}, ${C('normal')}, ${C('none')}`, i: C('auto'), h: true, e: 'font-kerning: normal;' },
  { n: 'font-optical-sizing', f: 'tipografia', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Si una fuente variable adapta su diseño al tamaño de la letra.', v: `${C('auto')}, ${C('none')}`, i: C('auto'), h: true, e: 'font-optical-sizing: auto;' },
  { n: 'font-size-adjust', f: 'tipografia', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Ajusta el tamaño para que la altura de la x se mantenga aunque cambie la fuente de reserva.', v: `${C('none')} o un número`, i: C('none'), h: true, e: 'font-size-adjust: .5;' },
  { n: 'font-synthesis', f: 'tipografia', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Si el navegador puede simular negrita, cursiva o versalitas cuando la fuente no las incluye.', v: `${C('none')} o una combinación de ${C('weight')}, ${C('style')}, ${C('small-caps')}`, i: C('weight style small-caps'), h: true, e: 'font-synthesis: none;' },
  { n: ['font-feature-settings', 'font-variation-settings'], f: 'tipografia', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Acceso directo a las funciones OpenType de la fuente y a los ejes de una fuente variable. Úsalas solo si no hay una propiedad específica.', v: `${C('normal')} o etiquetas de cuatro letras con su valor`, i: C('normal'), h: true, e: 'font-variation-settings: "wght" 650;' },

  // ── Texto ──────────────────────────────────────────────────────
  { n: 'text-align', f: 'texto', nivel: 'basica', sec: 'ampliacion-typography', c: 'Alineación horizontal de las líneas dentro del bloque.', v: `${C('start')}, ${C('end')}, ${C('left')}, ${C('right')}, ${C('center')}, ${C('justify')}`, i: C('start'), h: true, e: 'text-align: start;' },
  { n: 'text-indent', f: 'texto', nivel: 'basica', sec: 'ampliacion-typography', c: 'Sangría de la primera línea.', v: `${L} o ${P}`, i: C('0'), h: true, e: 'text-indent: 1.5em;' },
  { n: 'letter-spacing', f: 'texto', nivel: 'basica', sec: 'ampliacion-typography', c: 'Separación adicional entre caracteres.', v: `${C('normal')} o ${L}`, i: C('normal'), h: true, e: 'letter-spacing: .02em;' },
  { n: 'text-transform', f: 'texto', nivel: 'basica', sec: 'ampliacion-typography', c: 'Cambio visual de mayúsculas y minúsculas, sin modificar el texto del HTML.', v: `${C('none')}, ${C('capitalize')}, ${C('uppercase')}, ${C('lowercase')}`, i: C('none'), h: true, e: 'text-transform: uppercase;' },
  { n: 'text-decoration', f: 'texto', nivel: 'basica', sec: 'ampliacion-typography', c: 'Reúne la línea, el estilo, el color y el grosor de la decoración.', v: 'Línea, estilo, color y grosor', i: 'El de cada componente', h: false, e: 'text-decoration: underline 2px;', ab: 'shorthand-tipografia' },
  { n: 'text-underline-offset', f: 'texto', nivel: 'basica', sec: 'ampliacion-typography', c: 'Separación entre el subrayado y el texto.', v: `${C('auto')}, ${L} o ${P}`, i: C('auto'), h: true, e: 'text-underline-offset: .2em;' },
  { n: 'word-spacing', f: 'texto', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Separación adicional entre palabras.', v: `${C('normal')} o ${L}`, i: C('normal'), h: true, e: 'word-spacing: .1em;' },
  { n: 'text-align-last', f: 'texto', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Alineación de la última línea de un párrafo justificado.', v: `${C('auto')} y los valores de ${C('text-align')}`, i: C('auto'), h: true, e: 'text-align-last: start;' },
  { n: 'text-decoration-line', f: 'texto', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Qué líneas decorativas se dibujan; se pueden combinar.', v: `${C('none')}, ${C('underline')}, ${C('overline')}, ${C('line-through')}`, i: C('none'), h: false, e: 'text-decoration-line: underline;' },
  { n: 'text-decoration-style', f: 'texto', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Trazo de la línea decorativa.', v: `${C('solid')}, ${C('double')}, ${C('dotted')}, ${C('dashed')}, ${C('wavy')}`, i: C('solid'), h: false, e: 'text-decoration-style: wavy;' },
  { n: 'text-decoration-color', f: 'texto', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Color de la línea decorativa.', v: 'Un color', i: C('currentColor'), h: false, e: 'text-decoration-color: currentColor;' },
  { n: 'text-decoration-thickness', f: 'texto', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Grosor de la línea decorativa.', v: `${C('auto')}, ${C('from-font')}, ${L} o ${P}`, i: C('auto'), h: false, e: 'text-decoration-thickness: .1em;' },
  { n: 'text-underline-position', f: 'texto', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Dónde se coloca el subrayado; <code>under</code> lo baja por debajo de los descendentes.', v: `${C('auto')}, ${C('under')}, ${C('from-font')}`, i: C('auto'), h: true, e: 'text-underline-position: under;' },
  { n: 'text-decoration-skip-ink', f: 'texto', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Si el subrayado se interrumpe donde cruza letras como la g o la p.', v: `${C('auto')}, ${C('none')}, ${C('all')}`, i: C('auto'), h: true, e: 'text-decoration-skip-ink: auto;' },
  { n: 'text-shadow', f: 'texto', nivel: 'ampliada', sec: 'ampliacion-typography', c: 'Sombra de las letras.', v: `${C('none')} o una lista de desplazamientos, desenfoque y color`, i: C('none'), h: true, e: 'text-shadow: 0 1px 2px rgb(0 0 0 / .2);' },
  { n: 'list-style', f: 'texto', nivel: 'ampliada', sec: 'pseudoelementos', c: 'Reúne el tipo, la posición y la imagen del marcador de una lista.', v: 'Tipo, posición e imagen', i: 'El de cada componente', h: true, e: 'list-style: square outside;' },
  { n: ['list-style-type', 'list-style-position', 'list-style-image'], f: 'texto', nivel: 'ampliada', sec: 'pseudoelementos', c: 'Forma del marcador, si queda dentro o fuera de la caja del elemento y si es una imagen.', v: `${C('disc')}, ${C('decimal')}, ${C('none')}, una cadena…; ${C('inside')}, ${C('outside')}; ${C('url()')}`, i: `${C('disc')}, ${C('outside')}, ${C('none')}`, h: true, e: 'list-style-type: "– ";' },

  // ── Flujo, visibilidad y flotantes ─────────────────────────────
  { n: 'display', f: 'flujo', nivel: 'basica', sec: 'caja-display', c: 'Qué tipo de caja genera el elemento y cómo se comporta en el flujo.', v: `${C('block')}, ${C('inline')}, ${C('inline-block')}, ${C('none')}, ${C('flow-root')}… (tabla de valores)`, i: C('inline'), h: false, e: 'display: inline-block;' },
  { n: 'visibility', f: 'flujo', nivel: 'basica', sec: 'ocultar-elementos', c: 'Oculta el elemento conservando su hueco. Un descendiente con <code>visible</code> vuelve a mostrarse.', v: `${C('visible')}, ${C('hidden')}, ${C('collapse')}`, i: C('visible'), h: true, e: 'visibility: hidden;' },
  { n: 'float', f: 'flujo', nivel: 'basica', sec: 'caja-float', c: 'Lleva la caja a un lado de su contenedor para que el texto la rodee.', v: `${C('none')}, ${C('left')}, ${C('right')}`, i: C('none'), h: false, e: 'float: left;' },
  { n: 'clear', f: 'flujo', nivel: 'basica', sec: 'caja-float', c: 'Hace que el bloque empiece por debajo de los flotantes anteriores.', v: `${C('none')}, ${C('left')}, ${C('right')}, ${C('both')}, ${C('inline-start')}, ${C('inline-end')}`, i: C('none'), h: false, e: 'clear: both;' },
  { n: 'vertical-align', f: 'flujo', nivel: 'ampliada', sec: 'caja-display', c: 'Posición vertical de una caja en línea, como una imagen o un icono, respecto al texto que la acompaña.', v: `${C('baseline')}, ${C('middle')}, ${C('top')}, ${C('bottom')}, ${C('text-top')}, ${L}…`, i: C('baseline'), h: false, e: 'vertical-align: middle;' },
  { n: 'content', f: 'flujo', nivel: 'ampliada', sec: 'pseudoelementos', c: 'Contenido generado por <code>::before</code> y <code>::after</code>. Sin él, esos pseudoelementos no se crean.', v: `${C('normal')}, ${C('none')}, una cadena, ${C('url()')}, ${C('attr()')}, contadores`, i: C('normal'), h: false, e: 'content: "→ ";' },

  // ── Posicionamiento ────────────────────────────────────────────
  { n: 'position', f: 'posicion', nivel: 'basica', sec: 'caja-position', c: 'Cómo se coloca la caja: en el flujo, desplazada, fuera del flujo, fija o adherida (tabla de valores).', v: `${C('static')}, ${C('relative')}, ${C('absolute')}, ${C('fixed')}, ${C('sticky')}`, i: C('static'), h: false, e: 'position: relative;' },
  { n: ['top', 'right', 'bottom', 'left'], f: 'posicion', nivel: 'basica', sec: 'posicion-indicar', c: 'Distancia desde cada lado de la referencia. Solo actúan en cajas posicionadas.', v: `${C('auto')}, ${L} o ${P}`, i: C('auto'), h: false, e: 'top: 0;' },
  { n: 'z-index', f: 'posicion', nivel: 'basica', sec: 'posicion-z-index', c: 'Qué caja posicionada se dibuja delante cuando se solapan, dentro del mismo contexto de apilamiento.', v: `${C('auto')} o un número entero`, i: C('auto'), h: false, e: 'z-index: 2;' },
  { n: 'inset', f: 'posicion', nivel: 'ampliada', sec: 'posicion-indicar', c: 'Reúne <code>top</code>, <code>right</code>, <code>bottom</code> y <code>left</code>.', v: 'De uno a cuatro valores, como ' + C('margin'), i: C('auto'), h: false, e: 'inset: 0;', ab: 'shorthand-posicion' },
  { n: ['inset-inline', 'inset-block', 'inset-inline-start', 'inset-inline-end', 'inset-block-start', 'inset-block-end'], f: 'posicion', nivel: 'ampliada', sec: 'posicion-indicar', c: 'Desplazamientos según la dirección de escritura: los dos extremos de un eje o uno solo.', v: `${C('auto')}, ${L} o ${P}`, i: C('auto'), h: false, e: 'inset-inline-end: 1rem;' },
];

const valores = {
  'box-sizing': { titulo: 'Valores de box-sizing', columnas: ['Valor', 'Efecto: qué miden los 280 px', 'Ancho del contenido', 'Ancho hasta el borde exterior'], filas: [
    [C('content-box'), 'Solo el contenido.', '280 px', '280 + 40 + 4 = 324 px'],
    [C('border-box'), 'El contenido, el relleno y el borde.', '280 − 40 − 4 = 236 px', '280 px'] ] },
  'overflow': { titulo: 'Valores de overflow', columnas: ['Valor', 'Efecto', 'Ejemplo'], filas: [
    [C('visible'), 'El contenido puede salir de la caja. Es el valor inicial; puede solaparse con otros elementos.', C('overflow: visible;')],
    [C('hidden'), 'Recorta el excedente sin ofrecer barras de desplazamiento. Puede existir desplazamiento programático.', C('overflow: hidden;')],
    [C('clip'), 'Recorta y no crea un contenedor desplazable, ni siquiera mediante JavaScript.', C('overflow: clip;')],
    [C('scroll'), 'Crea un área desplazable y solicita barras incluso sin desbordamiento; su apariencia depende del sistema.', C('overflow-y: scroll;')],
    [C('auto'), 'Permite desplazarse cuando el contenido lo necesita.', C('overflow: auto;')] ] },
  'border-style': { titulo: 'Valores de border-style', columnas: ['Valor', 'Efecto', 'Ejemplo'], filas: [
    [C('none'), 'Sin borde.', C('border-style: none;')], [C('hidden'), 'Oculto; en tablas con bordes colapsados tiene prioridad.', C('border-style: hidden;')],
    [C('dotted'), 'Puntos.', C('border-style: dotted;')], [C('dashed'), 'Guiones.', C('border-style: dashed;')],
    [C('solid'), 'Línea continua.', C('border-style: solid;')], [C('double'), 'Dos líneas.', C('border-style: double;')],
    [C('groove'), 'Surco.', C('border-style: groove;')], [C('ridge'), 'Relieve.', C('border-style: ridge;')],
    [C('inset'), 'Apariencia hundida.', C('border-style: inset;')], [C('outset'), 'Apariencia elevada.', C('border-style: outset;')] ] },
  'box-shadow': { titulo: 'Valores de una sombra', columnas: ['Valor', 'Efecto', 'Ejemplo'], filas: [
    [C('offset-x'), 'Desplazamiento horizontal; negativo hacia la izquierda. Obligatorio.', C('0')],
    [C('offset-y'), 'Desplazamiento vertical; negativo hacia arriba. Obligatorio.', C('4px')],
    [C('blur'), 'Desenfoque no negativo; 0 deja un borde nítido.', C('12px')],
    [C('spread'), 'Expande la sombra; un valor negativo la contrae.', C('2px')],
    [C('color'), 'Color de la sombra; admite alfa.', C('rgb(0 0 0 / .2)')],
    [C('inset'), 'Dibuja la sombra dentro de la caja.', C('inset')] ] },
  'display': { titulo: 'Valores de display', columnas: ['Valor', 'Efecto', 'Dimensiones y separación'], filas: null },  // filas tomadas del HTML original (ver más abajo)
  'position': { titulo: 'Valores de position', columnas: ['Valor', 'Efecto', '¿Conserva su espacio?'], filas: [
    [C('static'), 'Valor inicial. Sigue el flujo normal; <code>top</code>, <code>right</code>, <code>bottom</code> y <code>left</code> no la desplazan.', 'Sí.'],
    [C('relative'), 'Se desplaza desde donde estaría normalmente.', 'Sí, en su posición original.'],
    [C('absolute'), 'Se sitúa normalmente respecto al antepasado más cercano con <code>position</code> distinto de <code>static</code>.', 'No.'],
    [C('fixed'), 'Normalmente se fija a la ventana y permanece visible al desplazar la página.', 'No.'],
    [C('sticky'), 'Se desplaza con el contenido hasta alcanzar un límite, como <code>top: 0</code>; entonces queda adherida a la zona de desplazamiento mientras su contenedor lo permita.', 'Sí.'] ] },
};

window.U02_PROPIEDADES = { familias, propiedades, valores };

// ─────────────────────────────── Generación ───────────────────────────────
const nombres = p => Array.isArray(p.n) ? p.n : [p.n];
const titulo = p => nombres(p).map(n => C(n)).join(', ');
const familia = id => familias.find(f => f.id === id);
const filtrar = ({ familia: f, apartado, nivel, props }) => {
  if (props) {
    const lista = props.split(',').map(x => x.trim());
    return lista.map(n => propiedades.find(p => nombres(p).includes(n))).filter((p, i, a) => p && a.indexOf(p) === i);
  }
  return propiedades.filter(p => (!f || p.f === f) && (!apartado || apartado.split(' ').includes(p.sec)) && (!nivel || p.nivel === nivel))
    .sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === 'basica' ? -1 : 1));
};
function tablaPropiedades(lista, caption) {
  const columnas = ['Propiedad', 'Qué controla', 'Valores habituales', 'Valor inicial', '¿Se hereda?', 'Ejemplo'];
  const filas = lista.map(p => {
    const nivel = p.nivel === 'ampliada' ? ' <span class="prop-nivel">ampliada</span>' : '';
    const abreviatura = p.ab ? ' <a class="prop-shorthand" href="#' + p.ab + '">abreviatura</a>' : '';
    return `<tr data-glossary="${nombres(p).join(' ')}"><th scope="row">${titulo(p)}${nivel}${abreviatura}</th><td>${p.c}</td><td>${p.v}</td><td>${p.i}</td><td>${p.h ? 'Sí' : 'No'}</td><td>${C(p.e)}</td></tr>`;
  });
  return `<table class="prop-table"><caption>${caption}</caption><thead><tr>${columnas.map(c => `<th scope="col">${c}</th>`).join('')}</tr></thead><tbody>${filas.join('')}</tbody></table>`;
}
function tablaValores(id) {
  const t = valores[id];
  if (!t || !t.filas) return '';
  const filas = t.filas.map(([v, ...rest]) => `<tr><th scope="row">${v}</th>${rest.map(x => `<td>${x}</td>`).join('')}</tr>`).join('\n');
  return `<table class="prop-values"><caption data-glossary="${id}">${t.titulo}</caption><thead><tr>${t.columnas.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>\n${filas}\n</tbody></table>`;
}
const disclosure = (caption, html) => `<details class="table-disclosure"><summary>${caption}</summary><div class="table-wrap">${html}</div></details>`;

// Las filas de display se conservan tal y como estaban escritas en el HTML.
const displayOriginal = document.querySelector('[data-tabla-valores="display"] template');
if (displayOriginal) valores.display.filas = [...displayOriginal.content.querySelectorAll('tbody tr')].map(tr => [...tr.children].map(td => td.innerHTML));

// Tablas de los apartados.
for (const el of document.querySelectorAll('[data-tabla-propiedades]')) {
  const lista = filtrar(el.dataset);
  const fam = familia(el.dataset.familia);
  const caption = el.dataset.titulo || `Propiedades de ${fam ? fam.titulo.toLowerCase() : 'la sección'}`;
  el.outerHTML = disclosure(caption, tablaPropiedades(lista, caption));
}
for (const el of document.querySelectorAll('[data-tabla-valores]')) {
  const id = el.dataset.tablaValores;
  el.outerHTML = disclosure(valores[id].titulo, tablaValores(id));
}

})();
