const $ = id => document.getElementById(id);
const actividad = "Examen DWEC · Unidad 2";
const version = "1";
const clave = "dwec-examen-u02-v1";
const campos = [...document.querySelectorAll("[data-answer]")];
const nombres = ["errata1","errata2","errata3","errata4","errata5","salida",
    ...Array.from({length:10},(_,i)=>"teoria"+(i+1)),"explicacion","text"];
let inicio = null, transcurrido = 0, fase = "ready", abrirAlFinalizar = false, urlDescarga;
let intento;

function respuestasVacias() {
    return Object.fromEntries(["student",...nombres].map(n=>[n,""]));
}
function vacio() {
    return {values:respuestasVacias(),report:"",started:null,elapsed:0,language:"es"};
}
function valor(nombre) {
    return nombre.startsWith("teoria")
        ? document.querySelector('input[name="'+nombre+'"]:checked')?.value || ""
        : $(nombre).value;
}
function leer() {
    return {values:Object.fromEntries(["student",...nombres].map(n=>[n,valor(n)])),
        report:$("report").value,started:inicio,elapsed:transcurrido,language:"es"};
}
function restaurar(datos) {
    $("student").value=datos.values.student;
    for (const campo of campos) {
        if(campo.type==="radio") campo.checked=datos.values[campo.name]===campo.value;
        else campo.value=datos.values[campo.id];
    }
    $("report").value=datos.report;
    inicio=datos.started;transcurrido=datos.elapsed;
}
function generarTexto(v) {
    const respuesta=n=>v[n].trim() || "[Sin responder]";
    const lineas=[actividad+" · Versión "+version,"Correo: "+v.student,
        "","1. CINCO ERRATAS",...Array.from({length:5},(_,i)=>(i+1)+". "+respuesta("errata"+(i+1))),
        "","2. SALIDA Y RAZONAMIENTO",respuesta("salida"),"","3. TEORÍA"];
    for(let i=1;i<=10;i++){
        const grupo=document.querySelectorAll('input[name="teoria'+i+'"]');
        const elegida=v["teoria"+i];
        const titulo=grupo[0].closest("fieldset").querySelector("legend").textContent;
        lineas.push(titulo,elegida===""?"[Sin responder]":grupo[Number(elegida)].closest("label").textContent.trim());
    }
    lineas.push("","4. CORRECCIÓN DEL PROGRAMA","Explicación:",respuesta("explicacion"),
        "","app.js propuesto:","\x60\x60\x60javascript",respuesta("text"),"\x60\x60\x60");
    return lineas.join("\n");
}
function datosFinales() {
    const datos=JSON.parse($("report").value);
    if(typeof datos.text!=="string"||typeof datos.draftId!=="string")throw Error("Informe inválido");
    return datos;
}
function mostrarFinalizado() {
    const datos=datosFinales();
    if(urlDescarga) URL.revokeObjectURL(urlDescarga);
    urlDescarga=URL.createObjectURL(new Blob([datos.text],{type:"text/plain;charset=utf-8"}));
    $("descargar-codigo").href=urlDescarga;
    $("descargar-codigo").download="Examen-DWEC-Unidad-2-respuestas.txt";
    $("panel-resultado").hidden=false;
    $("acciones-entrega").hidden=false;
    $("nuevo-intento").hidden=false;
    $("reportStatus").textContent="Examen finalizado. Abre el formulario con tus datos y todas las respuestas ya rellenados. Confirma allí la entrega y guarda el justificante.";
}
function abrirFormulario() {
    try {
        const datos=datosFinales();
        localStorage.setItem("laboratorio-entrega:"+datos.draftId,JSON.stringify({
            email:datos.email,practiceName:actividad,text:datos.text
        }));
        location.assign("../entrega-practicas.html?borrador="+encodeURIComponent(datos.draftId));
    } catch {
        $("reportStatus").textContent="No se pudo abrir la entrega. Conserva la copia TXT y vuelve a intentarlo.";
    }
}
function progreso() {
    const v=leer().values;
    const respondidas=nombres.filter(n=>v[n].trim()).length;
    $("avance").textContent=respondidas+" de "+nombres.length+" campos respondidos.";
    $("count").textContent=generarTexto(v).length.toLocaleString("es-ES")+" / 10 000 caracteres de entrega";
}
const correoValido=v=>/^[^\s@]+@g\.educaand\.es$/i.test(v);
try {
    intento=window.createPracticeGuard({
        config:{storage:{key:clave,legacyKey:clave+"-anterior"},resumeInBrowser:true,requireFullName:false,format:{save:"dwec-examen-u02"}},
        empty:vacio,
        sanitize(d){
            if(!d?.values||typeof d.report!=="string")throw Error("Borrador inválido");
            const values=respuestasVacias();
            for(const n of Object.keys(values)){
                if(typeof d.values[n]!=="string")throw Error("Respuesta inválida");
                if(n.startsWith("teoria")&&!["","0","1","2","3"].includes(d.values[n]))throw Error("Opción inválida");
                const max=n==="student"?254:n.startsWith("teoria")?1:$(n).maxLength;
                if(d.values[n].length>max)throw Error("Respuesta demasiado larga");
                values[n]=d.values[n];
            }
            return {...vacio(),values,report:d.report,started:Number.isFinite(d.started)?d.started:null,
                elapsed:Number.isFinite(d.elapsed)?Math.max(0,d.elapsed):0};
        },
        snapshot:leer,restore:restaurar,validEmail:correoValido,
        canStart:()=>$("student").validity.valid&&correoValido($("student").value.trim()),
        startClock(){inicio??=Date.now()},
        stopClock(fin=Date.now()){if(inicio!==null)transcurrido+=Math.max(0,fin-inicio);inicio=null},
        isAnswer:n=>n?.matches?.("[data-answer]")===true,
        restoreValue(n,d){
            if(n.type==="radio"){
                for(const radio of document.querySelectorAll('input[name="'+n.name+'"]'))radio.checked=d.values[n.name]===radio.value;
            }else n.value=d.values[n.id];
        },
        refreshPendingParameters:()=>0,
        setEnabled(activo){for(const c of campos)c.disabled=!activo},
        afterRender(estado,vista){
            fase=estado.phase;
            $("cuaderno").hidden=fase!=="active";
            $("guard-start-box").hidden=fase!=="ready";
            $("reanudar").hidden=!vista.restoring||fase!=="active";
            $("acciones-entrega").hidden=fase!=="submitted";
            $("guard-warning-text").textContent=$("guard-warning-text").textContent
                .replace("generará una entrega automática","cerrará el examen y conservará las respuestas para su entrega")
                .replace("se generará una entrega con las respuestas actuales","se conservarán las respuestas para su entrega");
            progreso();
            if(fase==="submitted")mostrarFinalizado();
        },
        confirmText(){
            $("guard-confirm-title").textContent="¿Entregar el examen?";
            $("guard-confirm-text").textContent="El intento se cerrará y se abrirá el formulario con tus respuestas. Los apartados sin responder se conservarán como tales.";
            $("guard-confirm-ok").textContent="Abrir formulario";
        },
        makeReport(notas,final,fin,audit){
            const v=leer().values;
            const text=generarTexto(v);
            if(text.length>10000)throw Error("La entrega supera el límite");
            abrirAlFinalizar=audit.finishReason!=="incident-limit";
            return JSON.stringify({activity:actividad,version,draftId:crypto.randomUUID(),
                email:v.student.trim().toLowerCase(),text,answers:v,finishedAt:new Date(fin).toISOString(),
                seconds:Math.floor((transcurrido+(inicio?Math.max(0,fin-inicio):0))/1000),audit,notes:notas});
        },
        setReport(t){$("report").value=t},
        downloadReport(){mostrarFinalizado();if(abrirAlFinalizar)abrirFormulario()},
        forcedError(){$("panel-resultado").hidden=false;$("reportStatus").textContent="No se pudo preparar la entrega. Las respuestas guardadas se conservan; recarga para recuperarlas.";},
        onReset(){$("panel-resultado").hidden=true},
        saveBeforeReset:()=>false
    });
    $("student").addEventListener("input",intento.render);
    for(const c of campos)c.addEventListener(c.type==="radio"?"change":"input",()=>{intento.saveEdit();progreso()});
    $("reanudar").addEventListener("click",intento.recoverPractice);
    $("abrir-formulario").addEventListener("click",e=>{e.preventDefault();abrirFormulario()});
    $("nuevo-intento").addEventListener("click",()=>{
        if(fase!=="submitted")return;
        try{
            localStorage.setItem(clave+":finalizados:"+crypto.randomUUID(),localStorage.getItem(clave));
            if(!intento.resetProcess())return;
            $("guard-panel").scrollIntoView({block:"start"});$("student").focus({preventScroll:true});
        }catch{$("reportStatus").textContent="No se pudo conservar la copia anterior. Descarga tus respuestas antes de volver a intentarlo.";}
    });
} catch {
    $("guard-boot").hidden=false;
    $("guard-boot-detail").textContent="No se pudo iniciar el examen. Las respuestas guardadas se conservan. Recarga la página o avisa al profesor.";
}
