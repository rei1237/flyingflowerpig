(function (root) {
  'use strict';
  const WIDTH=320, HEIGHT=640, X=82, RADIUS=70*.38, PIPE_WIDTH=74, STEP=1/60;
  const FIRST_STAGE={at:0,name:'꽃밭',speed:1,gap:220,interval:1800,move:0,bg:'day',pipe:1};
  function randomGenerator(seed){let s=seed>>>0;return ()=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;};}
  function createMatch(seed,difficulty={},stages=[FIRST_STAGE]){
    const pad=difficulty.hitPad??.25;
    return {seed,random:randomGenerator(seed),tick:0,elapsed:0,nextGate:.5,gates:[],finished:false,winner:null,
      stages,stageIndex:0,progress:0,events:[],
      config:{name:difficulty.name||'꽃잎',gravity:difficulty.gravity??.38,jump:difficulty.jump??-8,
        maxFall:difficulty.maxFall??10,speedScale:difficulty.speedScale??1,gapScale:difficulty.gapScale??1,
        intervalScale:difficulty.intervalScale??1,moveScale:difficulty.moveScale??1,
        auraFrom:difficulty.auraFrom??8,itemRate:difficulty.itemRate??.32,lotusBonus:difficulty.lotusBonus??1,
        hitHalfWidth:70*(.5-pad),hitHalfHeight:(70/1.15)*(.5-pad),boundaryHalfHeight:(70/1.15)*.32,
        shield:(difficulty.shieldMs??0)/1000,gap:Math.max(116,Math.round(stages[0].gap*(difficulty.gapScale??1)))},
      players:[0,1].map(()=>({y:HEIGHT*.44,vy:0,alive:true,points:0,survived:0,collected:0,reactionUntil:0,diedAt:null,
        motionPhase:0,boostUntil:0,shieldUntil:0,cloverUntil:0,boltUntil:0,poisonUntil:0,poisonDrain:0}))};
  }
  function flap(match,index){const p=match.players[index];if(!p||!p.alive||match.finished)return false;
    p.vy=match.config.jump;p.boostUntil=match.elapsed+.38;return true;}
  function resolveWinner(ps){if(ps[0].survived!==ps[1].survived)return ps[0].survived>ps[1].survived?0:1;
    if(ps[0].points!==ps[1].points)return ps[0].points>ps[1].points?0:1;return null;}
  function protectedPlayer(m,p){return m.elapsed<Math.max(m.config.shield,p.shieldUntil,p.boltUntil);}
  function spawnGate(m){const c=m.config,s=m.stages[m.stageIndex],r=m.random,gap=Math.max(116,Math.round(s.gap*c.gapScale));
    const center=100+gap/2+r()*(HEIGHT-200-gap);
    const moving=r()<Math.min(.92,s.move*c.moveScale+(c.moveScale>1&&m.stageIndex===0?.1:0));
    const aura=m.stageIndex+1>=c.auraFrom&&r()<(m.stageIndex>=7?.45:.3);
    const hasItem=r()<c.itemRate,choice=r(),itemType=choice<.25?'lotus':choice<.5?'clover':choice<.7?'bolt':'coin';
    m.gates.push({x:WIDTH+PIPE_WIDTH/2,center,baseCenter:center,gap,moving,
      phase:r()*Math.PI*2,amplitude:Math.min(50,35+(m.stageIndex+1)*6.5),moveSpeed:(1+(m.stageIndex+1)*.13)*c.moveScale,
      aura,auraKind:r()<.5?'dark':'chaos',theme:s.pipe,gem:hasItem,itemType,
      passed:[false,false],taken:[false,false],worldPassed:false});
    m.nextGate+=s.interval*c.intervalScale/1000;
  }
  function collect(m,p,g,i){g.taken[i]=true;p.collected++;p.reactionUntil=m.elapsed+.65;
    const type=g.itemType||'coin';
    if(type==='lotus'){p.shieldUntil=m.elapsed+10*m.config.lotusBonus;p.poisonUntil=0;p.poisonDrain=0;}
    else if(type==='clover')p.cloverUntil=m.elapsed+11;
    else if(type==='bolt')p.boltUntil=m.elapsed+5;
    else p.points+=3;
    m.events.push({type:'collect',item:type,player:i});
  }
  function step(m){if(m.finished)return;m.events=[];m.tick++;m.elapsed=m.tick*STEP;const c=m.config;
    let stage=0;for(let i=1;i<m.stages.length;i++)if(m.progress>=m.stages[i].at)stage=i;
    if(stage!==m.stageIndex){m.stageIndex=stage;m.events.push({type:'stage'});}
    const s=m.stages[m.stageIndex];c.gap=Math.max(116,Math.round(s.gap*c.gapScale));
    if(m.elapsed>=m.nextGate)spawnGate(m);
    for(const g of m.gates){g.x-=3*s.speed*c.speedScale;
      if(g.moving){const half=g.gap/2;g.center=Math.max(80+half,Math.min(HEIGHT-80-half,g.baseCenter+Math.sin(m.elapsed*g.moveSpeed+g.phase)*g.amplitude));}
      if(!g.worldPassed&&g.x+PIPE_WIDTH/2<X){g.worldPassed=true;m.progress++;}
    }
    m.players.forEach((p,i)=>{if(!p.alive)return;p.survived=m.tick;
      p.motionPhase+=(m.elapsed<p.boostUntil?48:24)*STEP;
      p.vy=Math.min(c.maxFall,p.vy+c.gravity);p.y+=p.vy;
      let hit=p.y-c.boundaryHalfHeight<0||p.y+c.boundaryHalfHeight>HEIGHT;
      for(const g of m.gates){const gap=g.gap??c.gap,top=g.center-gap/2,bottom=g.center+gap/2;
        const overlap=X+c.hitHalfWidth>g.x-PIPE_WIDTH*.95/2&&X-c.hitHalfWidth<g.x+PIPE_WIDTH*.95/2;
        if(overlap&&(p.y-c.hitHalfHeight<top||p.y+c.hitHalfHeight>bottom)&&!protectedPlayer(m,p)){
          if(!g.aura)hit=true;
          else {const cy=p.y<g.center?top/2:(bottom+HEIGHT)/2;
            if(Math.hypot(X-g.x,p.y-cy)<32)hit=true;
            else if(m.elapsed>=p.poisonUntil){p.poisonUntil=m.elapsed+10;p.poisonDrain=0;m.events.push({type:'poison',player:i});}
          }
        }
        if(!g.passed[i]&&g.x+PIPE_WIDTH/2<X){g.passed[i]=true;p.points+=m.elapsed<p.cloverUntil?20:10;m.events.push({type:'score',player:i});}
        if(!hit&&g.gem&&!g.taken[i]&&Math.hypot(g.x-X,g.center-p.y)<RADIUS+14)collect(m,p,g,i);
      }
      if(m.elapsed<p.poisonUntil&&m.tick%30===0&&p.points>0&&p.poisonDrain<5){p.points--;p.poisonDrain++;}
      if(hit){p.alive=false;p.diedAt=m.elapsed;m.events.push({type:'hit',player:i});}
    });
    m.gates=m.gates.filter(g=>g.x>-PIPE_WIDTH);
    if(m.players.every(p=>!p.alive)){m.finished=true;m.winner=resolveWinner(m.players);}
  }
  const api={WIDTH,HEIGHT,X,RADIUS,PIPE_WIDTH,STEP,createMatch,flap,step,resolveWinner,spawnGate,protectedPlayer};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.FlyingMatch=api;
})(typeof window==='undefined'?globalThis:window);
