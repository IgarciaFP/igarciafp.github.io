const test=require('node:test'),assert=require('node:assert/strict'),lint=require('../motor/eslint-reglas.js');
test('Usa ESLint y detecta bucles y errores de sintaxis sin ejecutar el código',()=>{
 assert.equal(lint.version,'10.16.0');
 for(const code of ['while(true){}','for(;;){}','let i=0;while(i<10){}','for(let i=0;i<10;){}','do {} while(true);','while(true){if(false)break;}','while(true){while(false){break;}}','while(true){const f=()=>{return 1;};}','while(true){try{throw 1;}catch(e){}}','/* eslint-disable */ while(true){}'])assert.ok(lint.verify(code).length,code);
 assert.ok(lint.verify('const = ;').some(message=>message.fatal));
});
test('Admite bucles finitos, salidas válidas y condiciones ajenas a los bucles',()=>{
 for(const code of ['for(let i=0;i<10;i++){}','let i=0;while(i<10){i++;}','while(true){break;}','for(;;){break;}','function f(){while(true){return 1;}}','while(false){}','if(true){console.log(1);}','const text="while(true){}";','outer:while(true){while(true){break outer;}}','while(true){throw Error("parar");}'])assert.deepEqual(lint.verify(code),[],code);
});
