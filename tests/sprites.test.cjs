const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');
test('sprite frames preserve size and separate flight, pickup and impact rows',async()=>{
 const sandbox={window:{},Image:class{constructor(){this.complete=true;this.naturalWidth=1024;this.naturalHeight=1536;}set src(v){queueMicrotask(()=>this.onload())}}};
 vm.runInNewContext(fs.readFileSync('sprites.js','utf8'),sandbox);const sprites=sandbox.window.FlyingSprites;await sprites.loaded;
 const calls=[];const ctx={globalAlpha:1,save(){},restore(){},translate(){},rotate(){},drawImage(...args){calls.push(args)}};
 for(let i=0;i<16;i++)sprites.draw(ctx,0,0,66,0,'normal',i*2);
 assert.deepEqual(calls.map(a=>[a[1]/256,a[2]/256]),Array.from({length:16},(_,i)=>[i%4,Math.floor(i/4)]));
 assert.ok(calls.every(a=>a[7]===70&&a[8]===70));
 calls.length=0;for(let i=0;i<4;i++)sprites.draw(ctx,0,0,66,0,'collect',i*2);
 assert.ok(calls.every(a=>a[2]===1024));
 calls.length=0;for(let i=0;i<4;i++)sprites.draw(ctx,0,0,66,0,'hurt',i*2);
 assert.ok(calls.every(a=>a[2]===1280));
});
test('page inline scripts parse and local assets exist',()=>{
 const html=fs.readFileSync('index.html','utf8');
 for(const m of html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
 for(const f of ['sprites.js','versus-engine.js','versus-ui.js','multiplayer.css','assets/sprites/yeoni-v2.webp','assets/sprites/yeongnyangi-v2.webp'])assert.ok(fs.existsSync(f),f);
});
