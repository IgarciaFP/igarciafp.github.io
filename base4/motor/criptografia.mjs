/* SSII4E1: gzip + AES-256-GCM; contraseña del profesor, nunca incluida en el archivo. */
export const PREFIX='SSII4E1.';
export const ITERATIONS=600000;
const encoder=new TextEncoder();
const base64=bytes=>{let text='';for(const byte of bytes)text+=String.fromCharCode(byte);return btoa(text).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');};
const bytes=text=>Uint8Array.from(atob(text.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));
async function key(password,salt,usage){
 if(typeof password!=='string'||!password)throw Error('PASSWORD_REQUIRED');
 const material=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveKey']);
 return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},material,{name:'AES-GCM',length:256},false,[usage]);
}
export async function encryptDocument(document,password){
 const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
 const compressed=await new Response(new Blob([document]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer();
 const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:encoder.encode(PREFIX)},await key(password,salt,'encrypt'),compressed));
 const result=new Uint8Array(28+encrypted.length);result.set(salt);result.set(iv,16);result.set(encrypted,28);
 return PREFIX+base64(result);
}
export async function decryptDocument(code,password){
 if(typeof code!=='string'||code.length>1000000||!code.startsWith(PREFIX)||!/^[A-Za-z0-9_-]+$/.test(code.slice(PREFIX.length)))throw Error('INVALID_ENCRYPTED_DOCUMENT');
 const data=bytes(code.slice(PREFIX.length));if(data.length<45)throw Error('INVALID_ENCRYPTED_DOCUMENT');
 const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:data.slice(16,28),additionalData:encoder.encode(PREFIX)},await key(password,data.slice(0,16),'decrypt'),data.slice(28));
 const reader=new Blob([plain]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
 const parts=[];let length=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>3000000){await reader.cancel();throw Error('DOCUMENT_TOO_LARGE');}parts.push(value);}}finally{reader.releaseLock();}
 const result=new Uint8Array(length);let offset=0;for(const part of parts){result.set(part,offset);offset+=part.length;}
 return new TextDecoder('utf-8',{fatal:true}).decode(result);
}
