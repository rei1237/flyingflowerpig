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
