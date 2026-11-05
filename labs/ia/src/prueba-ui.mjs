import { comprobarCodigoBreve, analizarEntregaDetalladaAsync, crearVectorResultado, prepararEntrega, PESOS, seleccionarLenguajes } from '../analizador-entregas.mjs';
import ejemploPresupuesto from '../fixtures/presupuesto-incompleto.txt';
const $ = id => document.getElementById(id);
const nombres = {
sin_comentarios:'Comentarios insuficientes (solo desde 10 líneas de código)', caracteres_especiales:'Caracteres especiales de la lista de vigilancia', comentarios_mayuscula:'Al menos el 95 % de los comentarios empieza con mayúscula', indentacion_par:'Sangría con espacios pares en al menos el 95 % de las líneas', comentarios_abundantes:'Más de un comentario por cada cinco líneas', comentarios_sin_puntos:'Al menos el 95 % de los comentarios no contiene puntos', comentarios_punto_final:'Al menos el 95 % de los comentarios termina con punto', comentarios_largos:'Proporción elevada de comentarios largos', comentarios_antes_funciones:'Mismos saltos previos en al menos el 95 % de los comentarios', comentarios_separadores:'Al menos el 95 % de los separadores tiene la misma longitud', comentarios_pasos:'Comentarios con pasos numerados', comentarios_etiquetas:'Etiquetas explicativas en comentarios', comentarios_jsdoc:'Documentación JSDoc abundante', comentarios_repetidos:'Comentarios repetidos', comentarios_conversacionales:'Frases conversacionales', comentarios_instrucciones:'Instrucciones de sustitución pendientes', menciones_ia:'Menciones a herramientas de IA', espacios_invisibles:'Espacios invisibles y controles Unicode', emojis_comentarios:'Emojis en comentarios', lineas_largas:'Líneas de más de 120 caracteres', sangria_uniforme:'Unidad de sangría uniforme en al menos el 95 % de las líneas', comillas_uniformes:'Comillas uniformes en al menos el 95 % de las cadenas', bloques_markdown:'Restos de bloques Markdown', encabezados_markdown:'Encabezados Markdown en comentarios', sintaxis_configurable:'Construcciones JavaScript seleccionadas', metodos_configurables:'Métodos JavaScript seleccionados', estructuras_configurables:'Estructuras y API seleccionadas', validaciones_repetidas:'Validaciones defensivas frecuentes', muchos_try_catch:'Proporción elevada de try/catch', envoltorio_iife:'Función autoejecutable', mensajes_prefijados:'Mensajes de consola con prefijos', identificadores_largos:'Identificadores largos', nombres_pendientes:'Identificadores provisionales', urls_ejemplo:'Direcciones o claves de ejemplo', html_comentarios_secciones:'Secciones HTML rotuladas', html_textos_provisionales:'Textos de plantilla en HTML', html_atributos_configurables:'Atributos HTML seleccionados', css_variables:'Propiedades personalizadas CSS', css_funciones_configurables:'Funciones CSS seleccionadas', css_reglas_configurables:'Reglas CSS seleccionadas', css_nombres_bem:'Clases CSS con nomenclatura BEM'
};
nombres.ausencia_faltas = 'Texto y comentarios sin faltas ortográficas o gramaticales detectadas';
nombres.comentarios_longitud_similar = 'Longitud aproximada similar en al menos el 95 % de los comentarios';
nombres.espaciado_uniforme = 'Separación uniforme antes de los comentarios';
const patronesResumen = ['comentarios_mayuscula','comentarios_sin_puntos','comentarios_longitud_similar','espaciado_uniforme','sangria_uniforme','indentacion_par'];
let ultimo = null, filtro = 'activadas', revision = 0;
const weightInputs = new Map();
function nodo(tag, text, clase) { const e = document.createElement(tag); if(text !== undefined) e.textContent = text; if(clase) e.className=clase; return e; }
for (const [id, peso] of Object.entries(PESOS)) {
  const row = nodo('div',undefined,'weight-row'); const label = nodo('label',nombres[id] || id); label.htmlFor='peso-'+id;
  const input=nodo('input'); Object.assign(input,{id:'peso-'+id,type:'number',min:'0',max:'100',step:'1',value:String(peso),required:true});
  row.append(label,input); $('pesos').append(row); weightInputs.set(id,input);
}
function invalidar() {
  revision++;
  if(ultimo){ $('resultado').hidden=true; $('vacio').hidden=false; $('estado').textContent='Cambios pendientes'; $('mensaje').textContent='La entrada o la configuración ha cambiado. Vuelve a analizar para actualizar los resultados.'; }
  ultimo=null;
}
function actualizarLenguajes(){ let seleccion=[];try{seleccion=seleccionarLenguajes($('lenguajes').value);}catch{}
  document.querySelectorAll('[data-lang]').forEach(b=>b.setAttribute('aria-pressed',String(seleccion.includes(b.dataset.lang))));
}
$('form').addEventListener('input',()=>{invalidar(); $('contador').textContent=$('codigo').value.length.toLocaleString('es-ES')+' caracteres';actualizarLenguajes();});
$('origen').addEventListener('change',()=>{ invalidar(); prepararVista(); });
let entregaPreparada=null;
function prepararVista() {
  entregaPreparada=null;
  const contenedor=$('preparacion');contenedor.replaceChildren();
  const excedida=$('codigo').value.length>100000;
  const tipo=$('origen').value;
  const preparada=prepararEntrega(excedida?'':tipo==='auto'?$('codigo').value:{[tipo]:$('codigo').value});
  if(excedida)contenedor.append(nodo('p','La entrega supera los 100.000 caracteres. Reduce la entrada para clasificarla.','hint'));
  entregaPreparada=preparada;
  for(const [tipo,etiqueta] of [['texto','TXT'],['javascript','JS'],['html','HTML'],['css','CSS']]){
    const fragmentos=preparada.bloques[tipo];
    const detalle=nodo('section');detalle.dataset.tipo=tipo;detalle.setAttribute('aria-label','Clasificación '+etiqueta);
    detalle.append(nodo('h4',etiqueta+' · '+fragmentos.length+(fragmentos.length===1?' fragmento · ':' fragmentos · ')+fragmentos.reduce((n,f)=>n+f.texto.length,0)+' caracteres'));
    if(!fragmentos.length)detalle.append(nodo('pre','Vacío'));
    for(const f of fragmentos){detalle.append(nodo('p',f.nombre+' · línea '+(f.base+1),'hint'),nodo('pre',f.texto));}
    contenedor.append(detalle);
  }
  for(const aviso of preparada.avisos)contenedor.append(nodo('p',aviso.mensaje,'hint'));
}
$('codigo').addEventListener('input',prepararVista);
$('form').addEventListener('input',e=>{if(e.target===$('form'))prepararVista();});
document.querySelectorAll('[data-lang]').forEach(b=>b.addEventListener('click',()=>{
  let seleccion=[];try{seleccion=seleccionarLenguajes($('lenguajes').value);}catch{}
  seleccion=seleccion.includes(b.dataset.lang)?seleccion.filter(x=>x!==b.dataset.lang):[...seleccion,b.dataset.lang];
  $('lenguajes').value=seleccion.map(x=>x.toUpperCase()).join(' ');actualizarLenguajes();invalidar();
}));
$('restaurar').addEventListener('click',()=>{for(const [id,input] of weightInputs)input.value=PESOS[id];$('umbral').value=60;invalidar();});
$('limpiar').addEventListener('click',()=>{invalidar();$('codigo').value='';$('contador').textContent='0 caracteres';$('estado').textContent='Sin analizar';$('mensaje').textContent='';prepararVista();$('codigo').focus();});
$('ejemplo').addEventListener('click',()=>{
  invalidar();$('origen').value='html';$('lenguajes').value='HTML JS CSS';
  $('codigo').value=`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Lista de tareas</title>
  <style>
    :root { --color: #076d68; }
    .tareas__titulo { color: var(--color); }
    .tareas__lista { padding: clamp(12px, 3vw, 24px); }
  </style>
</head>
<body>
  <!-- Inicio de la aplicación -->
  <h1 class="tareas__titulo">Mis tareas</h1>
  <ul class="tareas__lista" aria-label="Tareas pendientes"></ul>
  <script>
    // Paso 1: Preparar los datos → tareas pendientes
    const tareas = ["Repasar CSS", "Entregar la práctica"];
    // Paso 2: Seleccionar la lista
    const lista = document.querySelector(".tareas__lista");
    // Paso 3: Crear los elementos
    tareas.forEach((tarea) => {
      // Crear una entrada
      const elemento = document.createElement("li");
      // Asignar el texto
      elemento.textContent = tarea;
      lista.append(elemento);
    });
  <\/script>
</body>
</html>`;
  $('origen').dispatchEvent(new Event('change'));$('form').dispatchEvent(new Event('input'));$('mensaje').textContent='Ejemplo cargado. Pulsa «Analizar entrega» para probar el resultado.';
});
$('ejemplo-presupuesto').addEventListener('click',()=>{
  invalidar();$('origen').value='html';$('lenguajes').value='HTML JS';$('codigo').value=ejemploPresupuesto;
  $('origen').dispatchEvent(new Event('change'));$('form').dispatchEvent(new Event('input'));
  $('mensaje').textContent='Ejemplo de presupuesto cargado tal como se facilitó: HTML seguido de JS con una función sin cerrar. Sus comentarios pueden analizarse y el error de sintaxis seguirá visible.';
});
function mostrarLista(){
  const lista=$('lista');lista.replaceChildren();if(!ultimo)return;
  const rs=ultimo.resultados.filter(r=>filtro==='todas'||(filtro==='activadas'?r.cumple:!r.aplicable));
  $('cuenta-resultados').textContent=rs.length+' comprobaciones mostradas. Una regla puede aparecer en varios bloques, pero su peso solo suma una vez.';
  if(!rs.length){lista.append(nodo('p','No hay comprobaciones en este filtro.','hint'));return;}
  rs.forEach(r=>{
    const d=nodo('details',undefined,'rule'); d.dataset.active=String(r.cumple);
    const summary=nodo('summary'); const title=nodo('span',nombres[r.id]||r.id,'rule-title');title.append(nodo('span',r.lenguaje.toUpperCase()+' · '+r.archivo,'rule-meta'));
    summary.append(title,nodo('span',r.cumple?r.peso+' puntos':r.aplicable?'No se cumple':'No aplica','pill'));
    const body=nodo('div',undefined,'evidence');body.append(nodo('p',r.id,'hint'));
    if(r.motivo)body.append(nodo('p',r.motivo));
    body.append(nodo('span','Valor observado'),nodo('pre',JSON.stringify(r.valor,null,2)));
    if(r.evidencias.length){const list=nodo('ul');r.evidencias.forEach(e=>{const li=nodo('li');li.append(nodo('strong','Línea '+e.linea),nodo('pre',String(e.detalle)));list.append(li);});body.append(list);}
    if(r.evidenciasTotales>r.evidencias.length)body.append(nodo('p','Se muestran '+r.evidencias.length+' de '+r.evidenciasTotales+' evidencias.'));
    d.append(summary,body);lista.append(d);
  });
}
document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{filtro=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));mostrarLista();}));
function mostrar(r,umbral){
  ultimo=r;$('vector-salida').textContent=JSON.stringify(crearVectorResultado(r),null,2);$('vacio').hidden=true;$('resultado').hidden=false;
  const parcial=r.estado==='analisis_parcial';const sinDatos=r.puntuacion===null;
  $('estado').textContent=parcial?'Análisis parcial':sinDatos?'Sin contenido':'Análisis completado';
  const humanidad=crearVectorResultado(r)[1];$('puntuacion').textContent=sinDatos?'—':humanidad;$('anillo').style.setProperty('--score',humanidad||0);
  $('decision').textContent=parcial?'Revisar incidencias del análisis':sinDatos?'No hay contenido seleccionado':r.puntuacion>=umbral?'Propuesta de entrevista':'Por debajo del umbral';
  $('decision-detalle').textContent=parcial?'La puntuación es incompleta. Revisa los errores antes de interpretar el resultado.':sinDatos?'Comprueba el formato de entrada y los lenguajes.':'Índice de revisión: '+r.puntuacion+' puntos · umbral: '+umbral+' puntos. La decisión final corresponde al profesor.';
  $('activadas').textContent=r.reglasActivadas?.length||0;$('evaluadas').textContent=new Set(r.resultados.filter(x=>x.aplicable).map(x=>x.id)).size;$('suma').textContent=r.sumaSinLimitar||0;
  $('errores').textContent=r.errores.map(e=>e.archivo+(e.linea?' · línea '+e.linea:'')+': '+e.mensaje).join('\n');
  $('avisos').textContent=(r.avisos||[]).map(a=>a.archivo+': '+a.mensaje).join('\n');
  $('patrones-lista').replaceChildren();
  for(const id of patronesResumen){
    const reglas=r.resultados.filter(x=>x.id===id);
    const detectadas=reglas.filter(x=>x.cumple), aplicables=reglas.filter(x=>x.aplicable);
    const fila=nodo('li',undefined,'pattern-row');
    const titulo=nodo('span',nombres[id]);
    const detalles=reglas.map(x=>{
      let detalle=!x.aplicable?x.motivo:x.cumple?'detectado':'no detectado';
      if(x.aplicable&&['comentarios_mayuscula','comentarios_sin_puntos'].includes(id))detalle+=' · '+x.valor.coinciden+'/'+x.valor.total+' comentarios';
      return x.archivo+': '+detalle;
    }).join('\n');
    titulo.append(nodo('small',detalles||'No hay contenido evaluable para este patrón.','pattern-meta'));
    const estado=nodo('strong',detectadas.length?'Detectado':aplicables.length?'No detectado':'No aplica','pattern-state');
    estado.dataset.detectado=String(detectadas.length>0);
    fila.append(titulo,estado);$('patrones-lista').append(fila);
  }
  const ortografia=r.resultados.find(x=>x.id==='ausencia_faltas');
  const faltas=ortografia?.valor?.faltas;
  const revisada=ortografia?.aplicable===true&&Number.isInteger(faltas)&&faltas>=0;
  $('ortografia-resumen').dataset.estado=revisada?(faltas?'faltas':'correcto'):'sin-analisis';
  $('ortografia-resultado').textContent=revisada
    ?faltas+' '+(faltas===1?'falta detectada':'faltas detectadas')
    :(ortografia?.estadoRevision==='fallida'?'Comprobación fallida · 0 puntos':'Comprobación no realizada · 0 puntos');
  $('ortografia-motivo').textContent=revisada
    ?'Revisión completada · '+(ortografia.puntosAplicados||0)+' puntos: solo cuentan palabras de más de 4 letras con una única sustitución, inserción o eliminación (longitud ±1).'
    :ortografia?.motivo||'No hay una revisión lingüística completada para esta entrega.';

  $('faltas-detalle').replaceChildren();
  if(revisada&&faltas>0){
    for(const evidencia of ortografia.evidencias){
      const li=nodo('li');li.append(nodo('strong',evidencia.archivo+' · línea '+evidencia.linea),nodo('pre',evidencia.detalle));$('faltas-detalle').append(li);
    }
  }
  $('reduccion-ortografica').textContent=r.reduccionOrtografica
    ?'Reducción por '+faltas+' falta(s): −'+Math.round(r.reduccionOrtografica*100)+' % · '+r.puntuacionAntesReduccion+' → '+r.puntuacion+' puntos'
    :'Sin reducción por faltas'+(!revisada?' (revisión no completada)':'');
  if(r.codigoBreve){
    $('decision').textContent=r.salidaDirecta[0]?'No se admite código sin comentar':'Código breve: comentario presente';
    $('decision-detalle').textContent=r.codigoBreve.lineas+' líneas · '+r.codigoBreve.comentarios+' comentario(s). Salida directa, sin evaluar otras reglas.';
    $('ortografia-resultado').textContent='No realizada: salida directa por código breve';
    $('ortografia-motivo').textContent='Con menos de 10 líneas solo se exige al menos un comentario.';
  }
  mostrarLista();
}
$('form').addEventListener('submit',async e=>{
  e.preventDefault();$('mensaje').textContent='';
  try{
    if(!$('codigo').value.trim())throw new Error('Pega la entrega del alumno antes de analizar.');
    if($('codigo').value.length>100000)throw new Error('La entrega supera los 100.000 caracteres. Analiza un archivo más pequeño, sin bibliotecas ni archivos generados.');
    const seleccion=seleccionarLenguajes($('lenguajes').value);if(!seleccion.length)throw new Error('Selecciona al menos un tipo: texto, JavaScript, HTML o CSS.');
    const tipo=$('origen').value;
    const pesos=Object.fromEntries([...weightInputs].map(([id,input])=>[id,Number(input.value)]));
    const umbral=Number($('umbral').value);
    const version=revision;
    prepararVista();
    const entrada=entregaPreparada, lenguajes=$('lenguajes').value;
    const ortografia={idioma:$('idioma').value,mostrarDetalle:true,excluirIngles:$('ignorar-ingles').value==='si',terminosIgnorados:$('terminos-ignorados').value.split(/[\s,;]+/).filter(Boolean)};
    const umbrales={minComentarios:Number($('min-comentarios').value),toleranciaLongitud:Number($('tolerancia-longitud').value)/100};
    $('analizar').disabled=true;$('analizar').textContent='Analizando…';
    if(true)$('mensaje').textContent='Analizando los tipos seleccionados y solicitando la revisión del texto y los comentarios seleccionados a LanguageTool…';
    await new Promise(resolve=>setTimeout(resolve,30));
    const resultado=comprobarCodigoBreve(entrada,lenguajes) || await analizarEntregaDetalladaAsync(entrada,lenguajes,{pesos,ortografia,umbrales});
    if(revision!==version){$('mensaje').textContent='La entrada cambió durante el análisis. Vuelve a analizar para obtener un resultado actualizado.';return;}
    mostrar(resultado,umbral);$('mensaje').textContent='Análisis terminado. Consulta los resultados y abre las reglas para ver sus evidencias.';
  }catch(error){$('mensaje').textContent=error.message;}
  finally{$('analizar').disabled=false;$('analizar').textContent='Analizar entrega';}
});
$('descargar').addEventListener('click',()=>{
  if(!ultimo)return;
  const informe={...ultimo,umbralEntrevista:Number($('umbral').value),fecha:new Date().toISOString()};
  const url=URL.createObjectURL(new Blob([JSON.stringify(informe,null,2)],{type:'application/json'}));
  const a=nodo('a');a.href=url;a.download='revision-entrega.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
});



prepararVista();
