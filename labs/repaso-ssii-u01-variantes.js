/* Bounded numeric variants. Pure calculations; no student data or DOM access. */
(() => {
'use strict';
const list=(lo,hi,step=1)=>Array.from({length:Math.floor((hi-lo)/step)+1},(_,i)=>lo+i*step);
const pick=values=>values[Math.floor(Math.random()*values.length)];
const groups={
 download:['t1','t2','t3','t4','t5'],
 upload:['t6','t7','t8','t9','t10'],
 backup:list(1,9).map(n=>'s'+n),folders:list(10,13).map(n=>'s'+n),
 weights:[...list(0,7).map(n=>'b'+n),'bsum','btotal'],
 bridge:[...list(0,5).flatMap(n=>['q'+n,'r'+n]),'border','bbin','bridge','hgroup','hdigits','hfinal','ogroup','odigits','ofinal'],
 hex:['hb','h6','hbin','hweights','hdec'],oct:['o2','o6','o5','obin','oweights','odec'],
 address:['bus1','bus2','bus3','busformula','positions','bytes','kib'],
 cycle:['cycle1','cycle2','cycle3','ir','pc','result','cyclewhy']
};
const defaults={
 download:{mb:750,minutes:2},upload:{gb:1.8,mbps:80},
 backup:{freeGB:2,videos:3,videoMB:450,photos:250,photoKB:1600,docsMB:200},
 folders:{gib:1.5,mib:768},weights:{n:173},bridge:{n:45},
 hex:{n:182},oct:{n:181},address:{bits:12,bytes:1,address:20,value:7},cycle:{pc:20,add:5,value:7}
};
const nearInteger=x=>Math.abs(x-Math.round(x))<1e-7;
const uploadOptions=[];
for(const gb of [1.2,1.5,1.8,2.1,2.4])for(const mbps of [64,80,96]){
 const seconds=gb*1000/(mbps/8);
 if(nearInteger(seconds*1000)&&nearInteger(seconds/60*1000))uploadOptions.push({gb,mbps});
}
const backupOptions=[];
for(const freeGB of [2,2.5])for(const videos of [3,4])for(const videoMB of [350,400,450,500])
 for(const photos of [200,250,300])for(const photoKB of [1200,1600,2000])for(const docsMB of [150,200,250]){
 const remaining=freeGB*1000-videos*videoMB-photos*photoKB/1000-docsMB;
 if(remaining>=25&&remaining<=300)backupOptions.push({freeGB,videos,videoMB,photos,photoKB,docsMB});
}
const candidates={
 download:()=>({mb:pick([600,675,750,825,900]),minutes:pick([2,2.5])}),
 upload:()=>({...pick(uploadOptions)}),backup:()=>({...pick(backupOptions)}),
 folders:()=>({gib:pick([1.25,1.5,1.75]),mib:pick([512,640,768,896])}),
 weights:()=>({n:pick(list(160,190).filter(n=>[4,5].includes(n.toString(2).replaceAll('0','').length)))}),
 bridge:()=>({n:pick(list(42,47))}),
 hex:()=>({n:pick([10,11])*16+pick(list(2,9))}),
 oct:()=>({n:128+pick(list(4,7))*8+pick(list(1,7))}),
 address:()=>({bits:pick([11,12,13]),bytes:1,address:pick(list(16,24)),value:pick(list(5,9))}),
 cycle:()=>({pc:pick(list(16,24)),add:pick(list(3,7)),value:pick(list(5,9))})
};
const within=(v,lo,hi)=>Number.isInteger(v)&&v>=lo&&v<=hi;
function valid(k,p){
 if(!p||typeof p!=='object'||Array.isArray(p))return false;
 const keys=Object.keys(defaults[k]);if(Object.keys(p).length!==keys.length||keys.some(key=>typeof p[key]!=='number'||!Number.isFinite(p[key])))return false;
 switch(k){
 case 'download':return [600,675,750,825,900].includes(p.mb)&&[2,2.5].includes(p.minutes);
 case 'upload':return uploadOptions.some(x=>x.gb===p.gb&&x.mbps===p.mbps);
 case 'backup':return backupOptions.some(x=>keys.every(key=>x[key]===p[key]));
 case 'folders':return [1.25,1.5,1.75].includes(p.gib)&&[512,640,768,896].includes(p.mib);
 case 'weights':return within(p.n,160,190)&&[4,5].includes(p.n.toString(2).replaceAll('0','').length);
 case 'bridge':return within(p.n,42,47);
 case 'hex':return [10,11].includes(Math.floor(p.n/16))&&within(p.n%16,2,9);
 case 'oct':return Math.floor(p.n/64)===2&&within(Math.floor(p.n/8)%8,4,7)&&within(p.n%8,1,7);
 case 'address':return [11,12,13].includes(p.bits)&&p.bytes===1&&within(p.address,16,24)&&within(p.value,5,9);
 case 'cycle':return within(p.pc,16,24)&&within(p.add,3,7)&&within(p.value,5,9);
 }
 return false;
}
function sanitize(data){
 if(!data||typeof data!=='object'||Array.isArray(data)||Object.keys(data).length!==Object.keys(groups).length)throw Error('Invalid parameter set');
 const result={};
 for(const k of Object.keys(groups)){if(!valid(k,data[k]))throw Error('Invalid parameters: '+k);result[k]={...data[k]};}
 return result;
}
function create(k,previous){
 let next;
 for(let i=0;i<40;i++){next=candidates[k]();if(JSON.stringify(next)!==JSON.stringify(previous))return next;}
 // A repeat remains valid; never loop indefinitely if the RNG is unavailable or mocked.
 return next;
}
function derive(data){
 const p=sanitize(data),answers={},prompts={},labels={};
 const put=(id,answer)=>answers[id]=answer;
 let x=p.download;
 put('t1',x.minutes*60);put('t3',x.mb/(x.minutes*60));put('t5',x.mb/(x.minutes*60)*8);
 prompts.download=[`Un archivo de ${x.mb} MB tarda ${x.minutes} minutos en descargarse. Calcula la velocidad media en MB/s y Mbit/s.`,`A ${x.mb} MB file takes ${x.minutes} minutes to download. Calculate the average speed in MB/s and Mbit/s.`];
 x=p.upload;put('t6',x.gb*1000);put('t7',x.mbps/8);put('t9',x.gb*1000/(x.mbps/8));put('t10',answers.t9/60);
 prompts.upload=[`Debes subir ${x.gb} GB a ${x.mbps} Mbit/s. Supón velocidad constante y sin sobrecarga. Calcula el tiempo ideal.`,`Upload ${x.gb} GB at ${x.mbps} Mbit/s. Assume constant speed and no overhead. Calculate the ideal time.`];
 x=p.backup;put('s1',x.freeGB*1000);put('s2',x.photoKB/1000);put('s4',x.videos*x.videoMB);put('s5',x.photos*x.photoKB/1000);put('s7',answers.s4+answers.s5+x.docsMB);put('s8',answers.s7<=answers.s1?'Sí':'No');put('s9',answers.s1-answers.s7);
 prompts.backup=[`En una memoria USB quedan ${x.freeGB} GB libres. Quieres guardar ${x.videos} vídeos de ${x.videoMB} MB cada uno, ${x.photos} fotos de ${x.photoKB} kB cada una y ${x.docsMB} MB de documentos. ¿Cabe todo?`,`A USB drive has ${x.freeGB} GB free. Save ${x.videos} videos of ${x.videoMB} MB each, ${x.photos} photos of ${x.photoKB} kB each and ${x.docsMB} MB of documents. Will everything fit?`];
 x=p.folders;put('s10',x.gib*1024);put('s12',answers.s10+x.mib);put('s13',answers.s12/1024);
 prompts.folders=[`Una carpeta ocupa ${x.gib} GiB y otra ${x.mib} MiB. Necesitas almacenarlas juntas. Usa prefijos binarios.`,`One folder occupies ${x.gib} GiB and another ${x.mib} MiB. Store them together using binary prefixes.`];
 x=p.weights;const bits=x.n.toString(2).padStart(8,'0');for(let i=0;i<8;i++){put('b'+i,Number(bits[i])*2**(7-i));labels['b'+i]=[`${bits[i]} × 2^${7-i}`,`${bits[i]} × 2^${7-i}`];}put('btotal',x.n);
 prompts.weights=[`Convierte ${bits}₂ a decimal. Escribe cuánto aporta cada bit y después suma.`,`Convert ${bits}₂ to decimal. Write each bit's contribution, then add.`];
 x=p.bridge;let q=x.n;for(let i=0;i<6;i++){put('r'+i,q%2);q=Math.floor(q/2);put('q'+i,q);}const binary=x.n.toString(2),hex=x.n.toString(16).toUpperCase(),oct=x.n.toString(8);
 put('bbin',binary);put('bridge',binary);put('hgroup',binary.padStart(8,'0').match(/.{4}/g).join(' '));put('hdigits',[...hex].join(' '));put('hfinal',hex);put('ogroup',binary.match(/.{3}/g).join(' '));put('odigits',[...oct].join(' '));put('ofinal',oct);
 prompts.division=[`Convierte ${x.n}₁₀ a binario por divisiones sucesivas entre 2. Completa cada cociente y resto hasta obtener cociente cero.`,`Convert ${x.n}₁₀ to binary by repeated division by 2. Enter each quotient and remainder until the quotient is zero.`];
 prompts.bridge=[`Convierte ${x.n}₁₀ a hexadecimal y octal pasando por binario. Recupera el resultado del bloque anterior y agrúpalo desde la derecha. Añade ceros solo a la izquierda cuando hagan falta.`,`Convert ${x.n}₁₀ to hexadecimal and octal through binary. Use the result from the previous block and group from the right. Add leading zeros only when needed.`];
 labels.bridge=[`Paso previo: ${x.n} en binario`,`Previous step: ${x.n} in binary`];
 x=p.hex;const h=x.n.toString(16).toUpperCase();
 put('hb',Math.floor(x.n/16).toString(2).padStart(4,'0'));put('h6',(x.n%16).toString(2).padStart(4,'0'));put('hbin',x.n.toString(2));put('hdec',x.n);
 prompts.hex=[`Convierte ${h}₁₆ a binario y después a decimal. Escribe cuatro bits por cada dígito hexadecimal.`,`Convert ${h}₁₆ to binary, then decimal. Write four bits for each hexadecimal digit.`];
 labels.hb=[`1. ${h[0]} en cuatro bits`,`1. ${h[0]} in four bits`];labels.h6=[`2. ${h[1]} en cuatro bits`,`2. ${h[1]} in four bits`];
 x=p.oct;const o=x.n.toString(8);
 ['o2','o6','o5'].forEach((id,i)=>{put(id,Number(o[i]).toString(2).padStart(3,'0'));labels[id]=[`${i+1}. ${o[i]} en tres bits`,`${i+1}. ${o[i]} in three bits`];});put('obin',x.n.toString(2).padStart(9,'0'));put('odec',x.n);
 prompts.oct=[`Convierte ${o}₈ a binario y después a decimal. Escribe tres bits por cada dígito octal.`,`Convert ${o}₈ to binary, then decimal. Write three bits for each octal digit.`];
 x=p.address;put('positions',2**x.bits);put('bytes',2**x.bits*x.bytes);put('kib',answers.bytes/1024);
 prompts.address=[`En un modelo didáctico, la CPU lee la dirección ${x.address} y recibe el valor ${x.value}. Calcula la capacidad de una memoria con ${x.bits} bits de dirección y ${x.bytes} byte por posición.`,`In a teaching model, the CPU reads address ${x.address} and receives value ${x.value}. Calculate memory capacity with ${x.bits} address bits and ${x.bytes} byte per location.`];
 labels.bus1=[`1. Transporta la dirección ${x.address}`,`1. Carries address ${x.address}`];labels.bus2=[`2. Transporta el valor ${x.value}`,`2. Carries value ${x.value}`];
 x=p.cycle;put('pc',x.pc+1);put('result',x.value+x.add);
 prompts.cycle=[`Modelo simplificado: el PC vale ${x.pc} y allí está la instrucción «sumar ${x.add} al registro R». R contiene ${x.value}. La siguiente instrucción está en la dirección ${x.pc+1} y no hay saltos.`,`Simplified model: PC is ${x.pc} and that location holds “add ${x.add} to register R”. R contains ${x.value}. The next instruction is at address ${x.pc+1} and there are no jumps.`];
 return {answers,prompts,labels,firstDividend:p.bridge.n};
}
window.SSIIParameters=Object.freeze({groups,defaults,create,sanitize,derive});
})();