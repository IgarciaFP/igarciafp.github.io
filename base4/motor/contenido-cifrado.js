/* Paquetes de contenido. Un dominio público no aporta una clave secreta. */
(function(root){
'use strict';
const FORMAT='BASE4-EXAM-1',ITERATIONS=600000,MAX_PLAIN=3000000,encoder=new TextEncoder();
const toBase64=bytes=>{let text='';for(const byte of bytes)text+=String.fromCharCode(byte);return btoa(text).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');};
function fromBase64(text){if(typeof text!=='string'||text.length>1500000||!/^[A-Za-z0-9_-]+$/.test(text))throw Error('INVALID_ENVELOPE');return Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),char=>char.charCodeAt(0));}
const domainOf=email=>{const match=/^[^\s@]+@([^\s@]+)$/.exec(String(email).trim());return match?match[1].toLowerCase():'';};
async function emailHash(email){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(String(email).trim().toLowerCase()))),n=>n.toString(16).padStart(2,'0')).join('');}
async function allowedEmail(email,manifest){
 const value=String(email).trim().toLowerCase();
 if(domainOf(value)!==normalizedDomain(manifest.cifrado?.dominio))return false;
 const hashes=manifest.allowedEmailHashes;
 if(hashes===undefined)return true;
 if(!Array.isArray(hashes)||hashes.some(hash=>typeof hash!=='string'||!/^[a-f0-9]{64}$/.test(hash)))return false;
 return hashes.includes(await emailHash(value));
}
const normalizedDomain=domain=>String(domain||'').trim().toLowerCase();
async function key(domain,salt,usage){
 const value=normalizedDomain(domain);if(!value||value.length>253)throw Error('DOMAIN_REQUIRED');
 const material=await crypto.subtle.importKey('raw',encoder.encode(value),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},material,{name:'AES-GCM',length:256},false,[usage]);
}
const headerOf=e=>({format:FORMAT,cipher:'AES-256-GCM',kdf:'PBKDF2-SHA-256',iterations:ITERATIONS,salt:e.salt,iv:e.iv});
function validateBundle(value){
 if(!value||value.format!=='base4-files-v1'||!value.files||typeof value.files!=='object'||Array.isArray(value.files)||!Object.hasOwn(value.files,'config.json'))throw Error('INVALID_BUNDLE');
 for(const [path,text]of Object.entries(value.files)){
  if(!/^[a-zA-Z0-9_./-]+$/.test(path)||path.startsWith('/')||path.split('/').some(p=>p==='..'||p==='.')||typeof text!=='string'||text.length>250000)throw Error('INVALID_BUNDLE');
 }
 return value;
}
async function encrypt(value,domain){
 validateBundle(value);const text=JSON.stringify(value);if(text.length>MAX_PLAIN)throw Error('CONTENT_TOO_LARGE');
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const header=headerOf({salt:toBase64(salt),iv:toBase64(iv)});
 const compressed=await new Response(new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
 const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(JSON.stringify(header)),tagLength:128},await key(domain,salt,'encrypt'),compressed);
 return {...header,ciphertext:toBase64(new Uint8Array(ciphertext))};
}
async function decrypt(envelope,domain){
 if(!envelope||envelope.format!==FORMAT||envelope.cipher!=='AES-256-GCM'||envelope.kdf!=='PBKDF2-SHA-256'||envelope.iterations!==ITERATIONS)throw Error('INVALID_ENVELOPE');
 const salt=fromBase64(envelope.salt),iv=fromBase64(envelope.iv),ciphertext=fromBase64(envelope.ciphertext);
 if(salt.length!==16||iv.length!==12||ciphertext.length<17)throw Error('INVALID_ENVELOPE');
 const compressed=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:encoder.encode(JSON.stringify(headerOf(envelope))),tagLength:128},await key(domain,salt,'decrypt'),ciphertext);
 const reader=new Blob([compressed]).stream().pipeThrough(new DecompressionStream('gzip')).getReader(),parts=[];
 let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.length;if(size>MAX_PLAIN){await reader.cancel();throw Error('CONTENT_TOO_LARGE');}parts.push(value);}}finally{reader.releaseLock();}
 const result=new Uint8Array(size);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}
 return validateBundle(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(result)));
}
function response(bundle,folder,path){
 if(!path.startsWith(folder))return null;
 const relative=path.slice(folder.length);
 // La rúbrica se sirve como archivo público, por decisión del profesor.
 if(/^rubrica(?:-[a-z]{2})?\.json$/.test(relative)||/(^|\/)codigo\.(html|css)$/.test(relative))return null;
 const exists=Object.hasOwn(bundle.files,relative);
 return new Response(exists?bundle.files[relative]:'',{status:exists?200:404,headers:{'Content-Type':relative.endsWith('.json')?'application/json; charset=utf-8':'text/plain; charset=utf-8'}});
}
function unlock(manifest,domain,fetchEnvelope){
 const expected=normalizedDomain(domain);
 if(manifest.cifrado?.modo!=='email-domain'||normalizedDomain(manifest.cifrado.dominio)!==expected||!/^[a-z0-9-]+(?:\.[a-z0-9-]+)*\.json$/.test(manifest.cifrado.archivo||''))return Promise.reject(Error('INVALID_ENCRYPTED_CONFIG'));
 return new Promise(resolve=>{
  const gate=document.createElement('section');gate.className='encrypted-entry';gate.setAttribute('aria-labelledby','encrypted-entry-title');
  gate.innerHTML='<h1 id="encrypted-entry-title"></h1><form><label for="encrypted-email"></label><input id="encrypted-email" type="email" autocomplete="email" maxlength="254" required><button type="submit"></button><p role="status" aria-live="polite"></p></form>';
  const title=gate.querySelector('h1'),form=gate.querySelector('form'),label=form.querySelector('label'),email=form.querySelector('input'),button=form.querySelector('button'),status=form.querySelector('p');
  const language=document.getElementById('ui-language');let busy=false,settled=false,timer;
  const english=()=>language?.value==='en';
  const message=(es,en)=>english()?en:es;
  function localize(){title.textContent=message('Examen de JavaScript','JavaScript exam');label.textContent=message('Correo del centro','School email');email.placeholder=message('nombre@','name@')+expected;button.textContent=message('Continuar','Continue');document.documentElement.lang=english()?'en':'es';}
  const requested=new URLSearchParams(location.search).get('lang');if(language){let selected=requested;try{selected=selected||localStorage.getItem('base4-ui-language');}catch{}language.value=selected==='en'?'en':'es';language.addEventListener('change',localize);}
  const finish=(bundle,value)=>{settled=true;clearTimeout(timer);language?.removeEventListener('change',localize);gate.remove();resolve({bundle,email:value});};
  async function submit(showError=false){
   if(busy||settled)return;
   if(!email.validity.valid||domainOf(email.value)!==expected){if(showError)status.textContent=message('Introduce tu correo del centro.','Enter your school email.');return;}
   busy=true;email.disabled=button.disabled=true;status.textContent=message('Preparando el examen…','Preparing the exam…');
   const value=email.value.trim().toLowerCase();
   try{
    if(!await allowedEmail(value,manifest)){status.textContent=message('Este correo no está autorizado para el examen.','This email is not allowed to open the exam.');email.disabled=button.disabled=false;busy=false;return;}
    const envelope=await fetchEnvelope(manifest.cifrado.archivo);finish(await decrypt(envelope,domainOf(value)),value);
   }
   catch{status.textContent=message('No se pudo preparar el examen. Vuelve a intentarlo.','The exam could not be prepared. Try again.');email.disabled=button.disabled=false;busy=false;}
  }
  form.addEventListener('submit',event=>{event.preventDefault();void submit(true);});
  email.addEventListener('input',()=>{clearTimeout(timer);status.textContent='';if(email.validity.valid&&domainOf(email.value)===expected)timer=setTimeout(()=>void submit(),350);});
  localize();const anchor=document.getElementById('guard-boot');if(anchor)anchor.before(gate);else document.body.append(gate);email.focus();
 });
}
const api={FORMAT,ITERATIONS,encrypt,decrypt,domainOf,emailHash,allowedEmail,response,unlock,validateBundle};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LabCipher=api;
})(typeof window==='object'?window:globalThis);
