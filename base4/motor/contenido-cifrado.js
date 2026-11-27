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
  // Se prepara el contenido en el acceso original; no se crea otro formulario.
  const get=id=>document.getElementById(id),email=get('student'),button=get('guard-start'),status=get('guard-action-status'),error=get('identity-error');
  const language=document.getElementById('ui-language');let busy=false,settled=false,timer;
  const english=()=>language?.value==='en';
  const message=(es,en)=>english()?en:es;
  function localize(){
   const mod=(new URLSearchParams(location.search).get('a')||'').split('/')[0].toUpperCase();
   const name=String(manifest.title||message('Laboratorio','Laboratory')).trim().replace(new RegExp('^'+mod+'\\s*','i'),'').trim();
   get('lab-title').textContent=(mod?mod+' · ':'')+name;
   document.title=get('lab-title').textContent;
   get('guard-panel').querySelector('[data-text="identification"]').textContent='ID';
   get('guard-panel').querySelector('[data-text="email"]').textContent=message('Correo del centro','School email');
   email.placeholder=message('nombre@','name@')+expected;
   button.setAttribute('aria-label',message('Empezar','Start'));button.title=message('Empezar','Start');
   language?.setAttribute('aria-label',message('Idioma','Language'));
   document.documentElement.lang=english()?'en':'es';
   if(busy)status.textContent=message('Preparando la actividad…','Preparing the activity…');
  }
  function changeLanguage(){
   const lang=english()?'en':'es',url=new URL(location.href);url.searchParams.set('lang',lang);history.replaceState(null,'',url);
   try{localStorage.setItem('base4-ui-language',lang);}catch{}
   error.textContent='';localize();
  }
  const requested=new URLSearchParams(location.search).get('lang');if(language){let selected=requested;try{selected=selected||localStorage.getItem('base4-ui-language');}catch{}language.value=selected==='en'?'en':'es';language.addEventListener('change',changeLanguage);}
  const finish=(bundle,value)=>{
   settled=true;clearTimeout(timer);email.disabled=false;status.textContent='';get('guard-panel').removeAttribute('aria-busy');
   email.removeEventListener('input',input);email.removeEventListener('blur',blur);email.removeEventListener('keydown',keydown);language?.removeEventListener('change',changeLanguage);
   // El controlador habitual habilitará Empezar cuando termine de cargar.
   resolve({bundle,email:value});
  };
  async function submit(showError=false){
   if(busy||settled)return;
   if(!email.validity.valid||domainOf(email.value)!==expected){if(showError)error.textContent=message('Introduce tu correo del centro.','Enter your school email.');return;}
   busy=true;email.disabled=button.disabled=true;get('guard-panel').setAttribute('aria-busy','true');error.textContent='';localize();
   const value=email.value.trim().toLowerCase();
   try{
    if(!await allowedEmail(value,manifest)){error.textContent=message('Este correo no está autorizado para la actividad.','This email is not allowed to open the activity.');return;}
    const envelope=await fetchEnvelope(manifest.cifrado.archivo);finish(await decrypt(envelope,domainOf(value)),value);
   }
   catch{error.textContent=message('No se pudo preparar la actividad. Pulsa Intro para reintentar.','The activity could not be prepared. Press Enter to retry.');}
   finally{if(!settled){busy=false;email.disabled=false;status.textContent='';get('guard-panel').removeAttribute('aria-busy');}}
  }
  function input(){clearTimeout(timer);error.textContent='';if(email.validity.valid&&domainOf(email.value)===expected)timer=setTimeout(()=>void submit(),250);}
  function blur(){clearTimeout(timer);if(email.value.trim())void submit(true);}
  function keydown(event){if(event.key==='Enter'){event.preventDefault();clearTimeout(timer);void submit(true);}}
  email.addEventListener('input',input);email.addEventListener('blur',blur);email.addEventListener('keydown',keydown);
  button.disabled=true;button.innerHTML='<svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  get('active-status').hidden=true;get('guard-panel').hidden=false;get('guard-panel').inert=false;get('setup-stage').hidden=false;
  localize();email.focus();if(email.value)input();
 });
}
const api={FORMAT,ITERATIONS,encrypt,decrypt,domainOf,emailHash,allowedEmail,response,unlock,validateBundle};
if(typeof module==='object'&&module.exports)module.exports=api;else root.LabCipher=api;
})(typeof window==='object'?window:globalThis);
