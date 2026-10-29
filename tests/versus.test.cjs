const { test } = require('node:test');
const assert = require('node:assert/strict');
const E = require('../versus-engine.js');
test('same seed generates identical obstacles and independent pickups', () => {
 const a=E.createMatch(123), b=E.createMatch(123);
 for(let i=0;i<500;i++){for(const m of [a,b]){m.players.forEach((p,j)=>{if(p.y>285)E.flap(m,j)});E.step(m)}}
 assert.deepEqual(a.gates,b.gates); assert.deepEqual(a.players[0],a.players[1]);
});
test('each player has an independent jump and death state', () => {
 const m=E.createMatch(7); E.flap(m,0); assert.equal(m.players[1].vy,0);
 m.players[0].y=640; m.players[0].vy=10; E.step(m);
 assert.equal(m.players[0].alive,false); assert.equal(m.players[1].alive,true); assert.equal(m.finished,false);
 const dead=m.players[0].vy; E.flap(m,0); assert.equal(m.players[0].vy,dead);
});
test('simultaneous death resolves as draw and no steps change finished match', () => {
 const m=E.createMatch(7); m.players.forEach(p=>{p.y=639;p.vy=10}); E.step(m);
 assert.equal(m.finished,true); assert.equal(m.winner,null); const tick=m.tick; E.step(m); assert.equal(m.tick,tick);
});
test('winner prioritizes survival then score', () => {
 assert.equal(E.resolveWinner([{survived:100,points:3},{survived:99,points:100}]),0);
 assert.equal(E.resolveWinner([{survived:100,points:3},{survived:100,points:10}]),1);
});
test('same gem can be collected separately by both players only once', () => {
 const m=E.createMatch(7); m.gates=[{x:E.X,y:0,center:282,gem:true,passed:[false,false],taken:[false,false]}];
 m.players.forEach(p=>{p.y=282;p.vy=0}); E.step(m);
 assert.deepEqual(m.players.map(p=>p.collected),[1,1]); E.step(m);
 assert.deepEqual(m.players.map(p=>p.points),[3,3]);
});
test('dead player cannot block survivors scoring or end the round early', () => {
 const m=E.createMatch(5); m.players[0].alive=false; m.players[0].diedAt=0;
 m.gates=[{x:44,center:282,gem:false,passed:[false,false],taken:[false,false]}];
 m.players[1].y=282; E.step(m); assert.equal(m.players[1].points,10); assert.equal(m.finished,false);
});
test('restart with same seed is clean and deterministic',()=>{
 const m=E.createMatch(77); E.flap(m,0); E.step(m);
 const reset=E.createMatch(m.seed); assert.equal(reset.tick,0); assert.equal(reset.players[0].points,0);
 assert.deepEqual(reset.players[0],reset.players[1]);
});
test('2P keeps original solo hitbox formulas for every difficulty',()=>{
 for(const pad of [.32,.29,.25,.22,.2,.18]){
  const c=E.createMatch(1,{hitPad:pad}).config;
  assert.equal(c.hitHalfWidth,70*(.5-pad));assert.equal(c.hitHalfHeight,(70/1.15)*(.5-pad));
  assert.equal(c.boundaryHalfHeight,(70/1.15)*.32);
 }
});
test('stage and difficulty control speed, gap, cadence and moving obstacles',()=>{
 const stages=[{at:0,name:'test',gap:220,interval:1800,speed:1,move:1,pipe:1},{at:1,name:'next',gap:180,interval:1000,speed:1.5,move:1,pipe:2}];
 const m=E.createMatch(9,{gapScale:.8,speedScale:1.2,intervalScale:.7,moveScale:2},stages);
 E.spawnGate(m);const gate=m.gates[0],before=gate.x;assert.equal(gate.gap,176);assert.ok(gate.moving);
 m.nextGate=999;E.step(m);assert.ok(Math.abs(before-gate.x-3.6)<1e-8);assert.notEqual(gate.center,gate.baseCenter);
 m.progress=1;E.step(m);assert.equal(m.stageIndex,1);assert.equal(m.config.gap,144);assert.ok(m.events.some(e=>e.type==='stage'));
});
test('aura difficulty threshold and pickup frequency are applied',()=>{
 const stage={at:0,name:'space',gap:200,interval:1800,speed:1,move:0,pipe:8};
 const easy=E.createMatch(12,{auraFrom:99,itemRate:1},[stage]);easy.random=()=>.1;E.spawnGate(easy);assert.equal(easy.gates[0].aura,false);assert.equal(easy.gates[0].gem,true);
 const hard=E.createMatch(12,{auraFrom:1,itemRate:0},[stage]);hard.random=()=>.1;E.spawnGate(hard);assert.equal(hard.gates[0].aura,true);assert.equal(hard.gates[0].gem,false);
});
test('item effects belong only to the collecting player and emit one sound event',()=>{
 for(const type of ['lotus','clover','bolt','coin']){
  const m=E.createMatch(4);m.nextGate=999;m.players[1].y=500;
  m.gates=[{x:E.X,center:282,gap:600,gem:true,itemType:type,passed:[false,false],taken:[false,false]}];
  E.step(m);assert.equal(m.players[0].collected,1);assert.equal(m.players[1].collected,0);
  assert.equal(m.events.filter(e=>e.type==='collect').length,1);
  assert.equal(m.players[1].reactionUntil,0);
  if(type==='lotus')assert.ok(E.protectedPlayer(m,m.players[0]));
  if(type==='clover')assert.ok(m.players[0].cloverUntil>m.elapsed);
  if(type==='bolt')assert.ok(m.players[0].boltUntil>m.elapsed);
  E.step(m);assert.equal(m.events.filter(e=>e.type==='collect').length,0);
 }
});
test('jump accelerates a continuous flight cycle without triggering pickup animation',()=>{
 const m=E.createMatch(1);m.players[0].motionPhase=13;assert.equal(E.flap(m,0),true);
 assert.equal(m.players[0].motionPhase,13);assert.equal(m.players[0].reactionUntil,0);assert.ok(m.players[0].boostUntil>0);
});
