const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async () => {
 const browser = await chromium.launch({headless:true});
 try {
  const context = await browser.newContext({serviceWorkers:'block', viewport:{width:1280,height:800}});
  const page = await context.newPage(), errors=[];
  page.on('pageerror', e=>errors.push(e.message));
  await page.goto(process.env.GAME_URL || 'http://127.0.0.1:5374/');
  await page.locator('#btn-start:enabled').waitFor();
  const alphaCheck=await page.evaluate(async()=>{
   const report=[];
   for(const spec of Object.values(FlyingSprites.manifest)){
    const image=new Image();image.src=spec.src;await image.decode();
    const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const g=c.getContext('2d');g.drawImage(image,0,0);const pixels=g.getImageData(0,0,c.width,c.height).data;
    let bad=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if((x%256<12||x%256>=244||y%256<12||y%256>=244)&&pixels[(y*c.width+x)*4+3])bad++;
    report.push({name:spec.name,bad});
   }return report;
  });assert.ok(alphaCheck.every(r=>r.bad===0));
  const mechanics=await page.evaluate(()=>{
   startGame(); gameState=STATE.PLAYING; pigExpr='normal';pigExprUntil=0;
   spawnPipe(performance.now()); const pipe=pipePool.getActive()[0];
   pipe.x=BIRD_X-PIPE_W-4;pipe.moving=false;pipe.isAura=false;pipe.gapTop=0;pipe.gapBottom=BASE_H;
   const before=score;updatePipes(performance.now());const passed={delta:score-before,expression:pigExpr,until:pigExprUntil};
   collectItem({type:'coin',x:bird.x,y:bird.y},performance.now());
   const item={expression:pigExpr,started:pigExprStarted,until:pigExprUntil};
   const dims={width:bird.width,height:bird.height};goToMenu();return {passed,item,dims};
  });
  assert.equal(mechanics.passed.delta,1);assert.equal(mechanics.passed.expression,'normal');assert.equal(mechanics.passed.until,0);
  assert.equal(mechanics.item.expression,'happy');assert.ok(mechanics.item.until>mechanics.item.started);
  assert.equal(mechanics.dims.width,70);assert.equal(mechanics.dims.height,70/1.15);
  await page.locator('[data-character="yeongnyangi"]').click();
  await page.locator('#btn-start').click();await page.keyboard.press('Space');
  assert.equal(await page.evaluate(()=>FlyingSprites.selected),'yeongnyangi');
  await page.evaluate(()=>goToMenu());
  // Observe engine state through its public step function; no production debug bypass.
  await page.evaluate(()=>{const step=FlyingMatch.step;FlyingMatch.step=m=>{step(m);window.qaMatch=m;};window.qaSounds=[];const originalBeep=beep;beep=(...args)=>{window.qaSounds.push(args);originalBeep(...args)};});
  await page.locator('#btn-versus').click();await page.locator('#versus-action').click();
  await page.waitForFunction(()=>window.qaMatch?.tick>0);
  await page.keyboard.press('KeyW');
  const separate=await page.evaluate(()=>qaMatch.players.map(p=>p.vy));assert.ok(separate[0]<0&&separate[1]>=0);
  assert.ok(await page.evaluate(()=>qaSounds.length>0));
  await page.locator('#versus-sound').click();
  const soundCount=await page.evaluate(()=>qaSounds.length);
  await page.keyboard.press('ArrowUp');
  assert.equal(await page.evaluate(()=>qaSounds.length),soundCount);
  await page.locator('#versus-sound').click();
  assert.ok(await page.evaluate(()=>qaMatch.players[1].vy<0));
  await page.screenshot({path:path.resolve('docs/versus-desktop.png')});
  await page.locator('#versus-pause').click();const tick=await page.evaluate(()=>qaMatch.tick);
  await page.waitForTimeout(250);assert.equal(await page.evaluate(()=>qaMatch.tick),tick);
  await page.locator('#versus-action').click();
  await page.waitForFunction(()=>window.qaMatch.finished,{},{timeout:10000});
  assert.ok(await page.evaluate(()=>qaSounds.some(args=>args[0]===160)));
  const previousSeed=await page.evaluate(()=>qaMatch.seed);
  await page.locator('#versus-action').click();
  await page.waitForFunction(()=>!window.qaMatch.finished,{},{timeout:6000});
  assert.equal(await page.evaluate(()=>qaMatch.seed),previousSeed);
  await page.locator('#versus-exit').click();assert.equal(await page.locator('#screen-menu').isVisible(),true);
  await context.close();
  const mobile=await browser.newContext({serviceWorkers:'block',viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const touch=await mobile.newPage();touch.on('pageerror',e=>errors.push(e.message));
  await touch.goto(process.env.GAME_URL || 'http://127.0.0.1:5374/');
  await touch.locator('#btn-versus:enabled').waitFor();
  await touch.evaluate(()=>{const step=FlyingMatch.step;FlyingMatch.step=m=>{step(m);window.qaMatch=m;};});
  await touch.locator('#btn-versus').click();await touch.locator('#versus-action').click();
  await touch.waitForFunction(()=>window.qaMatch?.tick>0);
  const buttons=await touch.locator('[data-vs-player]').all();
  const points=await Promise.all(buttons.map(async(b,i)=>{const r=await b.boundingBox();return {x:r.x+r.width/2,y:r.y+r.height/2,id:i+1}}));
  const client=await mobile.newCDPSession(touch);
  await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:points});
  const velocities=await touch.evaluate(()=>qaMatch.players.map(p=>p.vy));assert.ok(velocities.every(v=>v<0));
  await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await touch.screenshot({path:path.resolve('docs/versus-mobile.png')});
  await touch.locator('#versus-pause').click();
  for(const size of [{width:320,height:568},{width:844,height:390}]){
   await touch.setViewportSize(size);assert.equal(await touch.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   const boxes=await touch.locator('[data-vs-player]').evaluateAll(bs=>bs.map(b=>{const r=b.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height,b:r.bottom}}));
   assert.ok(boxes.every(b=>b.h>=44&&b.x>=0&&b.b<=size.height));
  }
  await mobile.close();assert.deepEqual(errors,[]);
  console.log(JSON.stringify({passed:true,alphaCheck,effectsAndMute:true,mechanics,separateKeyboard:true,simultaneousTouch:velocities,pause:true,replaySameSeed:true,viewports:['1280x800','390x844','320x568','844x390'],pageErrors:errors}));
 } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
