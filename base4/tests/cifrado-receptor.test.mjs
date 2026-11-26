import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {gzipSync,gunzipSync} from 'node:zlib';
import {encryptDocument} from '../motor/criptografia.mjs';
const hash=s=>createHash('sha256').update(s).digest('hex');
const payload=JSON.stringify({url:'https://igarciafp.github.io/base4/',exam:'DIW-PRUEBA',email:'prueba@example.invalid',answers:[]}),id=hash(payload);
const document=payload+'\nCódigo de comprobación: SSII3-'+id;
const code=await encryptDocument(document,'contraseña ficticia');
const properties=new Map(),calls=[];
let failure=false;
const grant=(Date.now()+86400000)+'.'+'a'.repeat(32)+'.'+'b'.repeat(64);
const context=vm.createContext({
 Utilities:{DigestAlgorithm:{SHA_256:1},Charset:{UTF_8:1},computeDigest:(_,s)=>Array.from(Buffer.from(hash(s),'hex')),getUuid:()=>randomUUID(),
  newBlob:v=>({getBytes:()=>typeof v==='string'?Buffer.from(v):v}),gzip:v=>({getBytes:()=>gzipSync(v.getBytes())}),base64EncodeWebSafe:b=>Buffer.from(b).toString('base64url'),base64DecodeWebSafe:s=>Buffer.from(s,'base64url'),ungzip:b=>({getDataAsString:()=>gunzipSync(b.getBytes()).toString('utf8')})},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k)??null,setProperty:(k,v)=>properties.set(k,v),deleteProperty:k=>properties.delete(k),getProperties:()=>Object.fromEntries(properties)})},
 UrlFetchApp:{fetch:(url,options)=>{calls.push({url,body:JSON.parse(options.payload)});const result=url.endsWith('/cifrar')?{ok:true,code}:url.endsWith('/profesor')?{profesor:true,decryptToken:grant}:{ok:true,document};return {getResponseCode:()=>failure?503:200,getContentText:()=>JSON.stringify(result)};}}
});
vm.runInContext(readFileSync(new URL('../receptor/Code.gs',import.meta.url),'utf8'),context);
assert.equal(context.documento_({payload,submissionId:id}),code);assert.ok(calls[0].url.endsWith('/base4/cifrar'));assert.equal(calls[0].body.payload,payload);
failure=true;assert.throws(()=>context.documento_({payload,submissionId:id}),/ENCRYPTION_UNAVAILABLE/);failure=false;
const legacy=JSON.stringify({url:'https://igarciafp.github.io/base3/'}),before=calls.length;assert.ok(context.documento_({payload:legacy,submissionId:hash(legacy)}).startsWith('SSII3G.'));assert.equal(calls.length,before);
const login=context.gestionarNota({action:'login',key:'contraseña ficticia'});assert.equal(login.ok,true);assert.equal(properties.size,2);assert.ok(!JSON.stringify([...properties]).includes('contraseña ficticia'));
assert.equal(context.gestionarNota({action:'session',token:login.token}).decryptReady,true);
const decoded=context.gestionarNota({action:'decrypt',token:login.token,code});assert.equal(decoded.document,document);assert.equal(calls.filter(c=>c.url.endsWith('/profesor')).length,1,'no vuelve a pedir ni enviar la contraseña');
assert.equal(context.gestionarNota({action:'decrypt',token:'falso',code}).code,'SESSION');
const encryptedSheet={getLastRow:()=>2,getRange:()=>({getValues:()=>[[code]],getNotes:()=>[[JSON.stringify({base3:2,id})]]})};context.comprobarCabeceras_=()=>Array(9).fill(1);
assert.equal(context.filaDeEntrega_(encryptedSheet,id),2,'localiza la entrega cifrada por metadatos sin descifrarla');
assert.equal(context.gestionarNota({action:'logout',token:login.token}).ok,true);assert.equal(properties.size,0);
console.log('OK: receptor cifra sin alternativa en claro, sesión sin contraseña persistida, descifrado sin segundo login, metadatos y compatibilidad base3.');
