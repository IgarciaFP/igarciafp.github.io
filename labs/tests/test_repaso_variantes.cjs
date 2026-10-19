/* Run with: node labs/tests/test_repaso_variantes.cjs
   Pure numerical checks; this does not exercise browser APIs. */
const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const window={};
new Function('window',fs.readFileSync(path.join(__dirname,'../repaso-ssii-u01-variantes.js'),'utf8'))(window);
const v=window.SSIIParameters;
const original=v.derive(v.defaults).answers;
assert.equal(original.t3,6.25);
assert.equal(original.s9,50);
assert.equal(original.hfinal,'2D');
assert.equal(original.hdec,182);
assert.equal(original.odec,181);
for(let i=0;i<1000;i++){
 const p=Object.fromEntries(Object.keys(v.groups).map(k=>[k,v.create(k,v.defaults[k])]));
 const a=v.derive(p).answers;
 assert.equal(a.q5,0);
 assert.equal(a.bbin.length,6);
 assert.equal(a.hbin.length,8);
 assert.equal(a.obin.length,9);
 assert.equal(parseInt(a.bbin,2),p.bridge.n);
 assert.equal(parseInt(a.hfinal,16),p.bridge.n);
 assert.equal(parseInt(a.ofinal,8),p.bridge.n);
 assert.equal(parseInt(a.hgroup.replaceAll(' ',''),2),p.bridge.n);
 assert.equal(parseInt(a.ogroup.replaceAll(' ',''),2),p.bridge.n);
 assert.equal(parseInt(a.hbin,2),a.hdec);
 assert.equal(parseInt(a.obin,2),a.odec);
 assert.equal(a.s8,'Sí');
 assert.ok(a.s9>=25&&a.s9<=300);
 assert.ok(a.kib>=2&&a.kib<=8);
 for(const id of ['t3','t5','t9','t10','s2','s13'])
   assert.ok(Math.abs(a[id]*1000-Math.round(a[id]*1000))<1e-6, id+' has a finite decimal of at most three places');
 for(let bit=0;bit<8;bit++)assert.ok(a['b'+bit]===0||a['b'+bit]===2**(7-bit));
 assert.equal(Array.from({length:8},(_,i)=>a['b'+i]).reduce((x,y)=>x+y,0),a.btotal);
 assert.deepEqual(v.sanitize(JSON.parse(JSON.stringify(p))),p);
}
for(const [key,property] of [['bridge','n'],['address','bits'],['download','minutes']]){
 const p=v.sanitize(v.defaults);p[key][property]=999;
 assert.throws(()=>v.sanitize(p));
}
console.log('Original answers, 1000 bounded variants and invalid-parameter rejection: OK');
