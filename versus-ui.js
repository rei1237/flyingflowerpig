(function () {
  'use strict';
  const E = window.FlyingMatch, sprites = window.FlyingSprites;
  let active = false, match, characters, phase = 'ready', previous = 0, accumulator = 0;
  let countdown = 3, countdownElapsed = 0, finishedAnimation = 0, animationId = 0, onExit, onPause, onResume;
  const panel = document.getElementById('versus-screen');
  const canvas = document.getElementById('versus-canvas'), ctx = canvas.getContext('2d');
  const message = document.getElementById('versus-message');
  const action = document.getElementById('versus-action');
  const pause = document.getElementById('versus-pause');
  const status = document.getElementById('versus-status');
  const sky = new Image(); sky.src = './sky-day.webp';
  let lastStatus = '';
  function teamName(i) { return characters[i] === 'yeoni' ? '연이' : '영냥이'; }
  function setPhase(next) {
    phase = next; previous = 0; accumulator = 0;
    message.hidden = next === 'playing';
    action.hidden = next === 'playing' || next === 'countdown';
    pause.disabled = next !== 'playing';
    if (next === 'ready') {
      message.querySelector('h2').textContent = '둘이서, 하늘 나들이';
      message.querySelector('p').textContent = '1P는 W · 2P는 ↑. 휴대폰에서는 각자 아래 비행 버튼을 누르세요.';
      action.textContent = '준비됐어, 출발!';
    } else if (next === 'countdown') {
      countdown = 3; countdownElapsed = 0;
      message.querySelector('h2').textContent = '3';
      message.querySelector('p').textContent = '동시에 출발합니다';
    } else if (next === 'paused') {
      message.querySelector('h2').textContent = '잠시 쉬어가요';
      message.querySelector('p').textContent = '두 사람의 비행을 모두 멈췄어요.';
      action.textContent = '다시 함께 출발'; onPause();
    } else if (next === 'finished') {
      finishedAnimation = 0;
      message.querySelector('h2').textContent = match.winner === null ? '우리, 사이좋게 무승부!' : `${match.winner + 1}P ${teamName(match.winner)} 팀 승리!`;
      message.querySelector('p').textContent = match.players.map((p, i) => `${i + 1}P ${(p.survived / 60).toFixed(1)}초 · ${p.points}점`).join(' / ');
      action.textContent = '한 번 더 날아볼까?'; onPause();
    }
  }
  function draw() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr)), h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    ctx.setTransform(w / (E.WIDTH * 2), 0, 0, h / E.HEIGHT, 0, 0);
    for (let i = 0; i < 2; i++) {
      const p = match.players[i];
      ctx.save(); ctx.translate(i * E.WIDTH, 0); ctx.beginPath(); ctx.rect(0, 0, E.WIDTH, E.HEIGHT); ctx.clip();
      ctx.fillStyle = '#f6e2ed'; ctx.fillRect(0, 0, E.WIDTH, E.HEIGHT);
      if (sky.complete && sky.naturalWidth) ctx.drawImage(sky, 0, 0, E.WIDTH, E.HEIGHT);
      for (const g of match.gates) {
        const top = g.center - match.config.gap / 2, bottom = g.center + match.config.gap / 2;
        ctx.fillStyle = '#75618f'; ctx.fillRect(g.x - E.PIPE_WIDTH / 2, 0, E.PIPE_WIDTH, top); ctx.fillRect(g.x - E.PIPE_WIDTH / 2, bottom, E.PIPE_WIDTH, E.HEIGHT - bottom);
        ctx.fillStyle = '#dfc6e5'; ctx.fillRect(g.x - E.PIPE_WIDTH / 2 - 3, top - 10, E.PIPE_WIDTH + 6, 10); ctx.fillRect(g.x - E.PIPE_WIDTH / 2 - 3, bottom, E.PIPE_WIDTH + 6, 10);
        if (g.gem && !g.taken[i]) {
          ctx.fillStyle = '#f8d166'; ctx.strokeStyle = '#8d5b15'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(g.x, g.center - 12); ctx.lineTo(g.x + 10, g.center);
          ctx.lineTo(g.x, g.center + 12); ctx.lineTo(g.x - 10, g.center); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }
      if (p.alive && match.elapsed < match.config.shield) {
        ctx.strokeStyle = '#997020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(E.X, p.y, 35, 0, Math.PI * 2); ctx.stroke();
      }
      const hurtAge = p.alive ? 0 : match.elapsed - p.diedAt + finishedAnimation;
      const y = p.alive ? p.y : Math.min(E.HEIGHT - 42, Math.max(42, p.y) + hurtAge * 110);
      sprites.draw(ctx, E.X, y, 66, p.alive ? Math.max(-0.3, Math.min(0.65, p.vy * 0.06)) : 0.35,
        !p.alive ? 'hurt' : match.elapsed < p.reactionUntil ? 'collect' : 'normal',
        !p.alive ? Math.min(7, hurtAge * 12) : match.elapsed < p.reactionUntil
          ? Math.min(7.99, (1 - (p.reactionUntil - match.elapsed) / 0.65) * 8) : match.elapsed * 24, 1, characters[i]);
      const pink = characters[i] === 'yeoni';
      ctx.fillStyle = pink ? '#fff0f5' : '#f3edff'; ctx.strokeStyle = pink ? '#cf91ab' : '#b5a0d3'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.roundRect(24, 12, E.WIDTH - 48, 69, 23); ctx.fill(); ctx.stroke();
      // Small authored flower/star mark beside the team name.
      ctx.save(); ctx.translate(50, 34); ctx.fillStyle = pink ? '#b45e85' : '#8664ac';
      if (pink) {
        for (let k = 0; k < 5; k++) { ctx.rotate(Math.PI * 2 / 5); ctx.beginPath(); ctx.ellipse(0, -5, 3, 5, 0, 0, Math.PI * 2); ctx.fill(); }
        ctx.fillStyle = '#f5d985'; ctx.beginPath(); ctx.arc(0, 0, 3, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.beginPath(); for (let k = 0; k < 10; k++) { const a = k * Math.PI / 5 - Math.PI / 2, r = k % 2 ? 4 : 10; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } ctx.closePath(); ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = pink ? '#793a59' : '#594075'; ctx.font = 'bold 25px "Nanum Pen Script", "Noto Sans KR", sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`${i + 1}P ${teamName(i)} 팀`, E.WIDTH / 2 + 8, 42);
      ctx.font = '500 15px "Noto Sans KR", sans-serif';
      ctx.fillText(`${p.points}점 · ${(p.survived / 60).toFixed(1)}초${p.alive ? '' : ' · 도착!'}`, E.WIDTH / 2, 65);
      ctx.restore();
    }
    ctx.fillStyle = '#524161'; ctx.fillRect(E.WIDTH - 1.5, 0, 3, E.HEIGHT);
    const text = match.players.map((p, i) => `${i + 1}P ${p.points}점 ${p.alive ? '비행 중' : '종료'}`).join(' · ');
    if (text !== lastStatus) { status.textContent = text; lastStatus = text; }
  }
  function frame(now) {
    if (!active) return;
    const dt = previous ? Math.min((now - previous) / 1000, 0.1) : 0; previous = now;
    if (phase === 'countdown') {
      countdownElapsed += dt;
      const n = Math.max(1, Math.ceil(3 - countdownElapsed));
      if (n !== countdown) { countdown = n; message.querySelector('h2').textContent = String(n); }
      if (countdownElapsed >= 3) { setPhase('playing'); onResume(); }
    } else if (phase === 'playing') {
      accumulator += dt;
      while (accumulator >= E.STEP && !match.finished) { E.step(match); accumulator -= E.STEP; }
      if (match.finished) setPhase('finished');
    }
    if (phase === 'finished') finishedAnimation = Math.min(2, finishedAnimation + dt);
    draw(); animationId = requestAnimationFrame(frame);
  }
  function jump(index) { if (phase === 'playing') E.flap(match, index); }
  document.querySelectorAll('[data-vs-player]').forEach(button => {
    button.addEventListener('pointerdown', event => {
      event.preventDefault(); event.stopPropagation(); if (active) jump(Number(button.dataset.vsPlayer));
    });
    button.addEventListener('click', event => { if (event.detail === 0 && active) jump(Number(button.dataset.vsPlayer)); });
  });
  canvas.addEventListener('pointerdown', event => {
    if (!active) return;
    event.preventDefault(); event.stopPropagation();
    const box = canvas.getBoundingClientRect(); jump(event.clientX - box.left < box.width / 2 ? 0 : 1);
  });
  document.addEventListener('keydown', event => {
    if (!active) return;
    if (['KeyW', 'ArrowUp', 'KeyP', 'Escape'].includes(event.code)) {
      event.preventDefault(); event.stopImmediatePropagation();
      if (event.repeat) return;
      if (event.code === 'KeyW') jump(0);
      else if (event.code === 'ArrowUp') jump(1);
      else if (phase === 'playing') setPhase('paused');
      else if (phase === 'paused') setPhase('countdown');
    }
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (active && document.hidden && ['playing', 'countdown'].includes(phase)) setPhase('paused');
  });
  window.addEventListener('blur', () => { if (active && ['playing', 'countdown'].includes(phase)) setPhase('paused'); });
  pause.addEventListener('click', () => { if (phase === 'playing') setPhase('paused'); });
  action.addEventListener('click', () => {
    if (phase === 'finished') match = E.createMatch(match.seed, window.FlyingVersus.difficulty);
    setPhase('countdown'); draw();
  });
  document.getElementById('versus-exit').addEventListener('click', () => {
    active = false; cancelAnimationFrame(animationId); panel.hidden = true; onExit(); document.getElementById('btn-versus').focus();
  });
  window.FlyingVersus = {
    get active() { return active; },
    start(options) {
      this.difficulty = options.difficulty; onExit = options.onExit; onPause = options.onPause; onResume = options.onResume;
      characters = [sprites.selected, sprites.selected === 'yeoni' ? 'yeongnyangi' : 'yeoni'];
      match = E.createMatch(crypto.getRandomValues(new Uint32Array(1))[0], options.difficulty);
      document.querySelectorAll('[data-vs-player]').forEach((button, i) => {
        button.dataset.character = characters[i];
        button.innerHTML = `<span class="vs-player-badge">${i + 1}P</span><span>${teamName(i)} 팀, 날아라!<small>${i === 0 ? 'W 키 · 왼쪽 터치' : '↑ 키 · 오른쪽 터치'}</small></span>`;
      });
      active = true; panel.hidden = false; setPhase('ready'); draw(); action.focus(); animationId = requestAnimationFrame(frame);
    }
  };
})();
