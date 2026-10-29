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
 for(const f of ['sprites.js','versus-engine.js','versus-ui.js','multiplayer.css','assets/sprites/yeoni-v4.webp','assets/sprites/yeongnyangi-v3.webp'])assert.ok(fs.existsSync(f),f);
});

test('cat thrust grows on input without changing sprite size or leaking into reactions',async()=>{
 const sandbox={window:{},Image:class{constructor(){this.complete=true;this.naturalWidth=1024;this.naturalHeight=1536;}set src(v){queueMicrotask(()=>this.onload())}}};
 vm.runInNewContext(fs.readFileSync('sprites.js','utf8'),sandbox);const sprites=sandbox.window.FlyingSprites;await sprites.loaded;
 const paths=[],images=[];const ctx={globalAlpha:1,save(){},restore(){},translate(){},rotate(){},beginPath(){},moveTo(){},closePath(){},fill(){},bezierCurveTo(...a){paths.push(a)},drawImage(...a){images.push(a)}};
 sprites.draw(ctx,0,0,66,0,'normal',0,1,'yeongnyangi',0);const idle=Math.min(...paths.flat());paths.length=0;
 sprites.draw(ctx,0,0,66,0,'normal',0,1,'yeongnyangi',1);const boost=Math.min(...paths.flat());assert.ok(boost<idle);assert.ok(boost>=-35);
 assert.ok(images.every(a=>a[7]===70&&a[8]===70));
 for(const expression of ['collect','hurt']){paths.length=0;sprites.draw(ctx,0,0,66,0,expression,0,1,'yeongnyangi',1);assert.equal(paths.length,0);}
});
