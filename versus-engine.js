(function (root) {
  'use strict';
  const WIDTH = 320, HEIGHT = 640, X = 82, RADIUS = 70 * 0.38, PIPE_WIDTH = 74, STEP = 1 / 60;
  function randomGenerator(seed) {
    let s = seed >>> 0;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function createMatch(seed, difficulty = {}) {
    const random = randomGenerator(seed);
    return { seed, random, tick: 0, elapsed: 0, nextGate: 1.8, gates: [], finished: false, winner: null,
      config: { gravity: difficulty.gravity || 0.38, jump: difficulty.jump || -7.5,
        maxFall: difficulty.maxFall || 10, speed: 105 * (difficulty.speedScale || 1),
        gap: Math.max(150, 210 * (difficulty.gapScale || 1)),
        hitHalfWidth: 70 * (0.5 - (difficulty.hitPad ?? 0.25)),
        hitHalfHeight: (70 / 1.15) * (0.5 - (difficulty.hitPad ?? 0.25)),
        boundaryHalfHeight: (70 / 1.15) * 0.32, shield: (difficulty.shieldMs || 0) / 1000 },
      players: [0, 1].map(() => ({ y: HEIGHT * 0.44, vy: 0, alive: true, points: 0, survived: 0,
        collected: 0, reactionUntil: 0, diedAt: null })) };
  }
  function flap(match, index) {
    const p = match.players[index];
    if (p && p.alive && !match.finished) p.vy = match.config.jump;
  }
  function resolveWinner(players) {
    // Distance first, then pickups; exact same simulation tick and points is a draw.
    if (players[0].survived !== players[1].survived) return players[0].survived > players[1].survived ? 0 : 1;
    if (players[0].points !== players[1].points) return players[0].points > players[1].points ? 0 : 1;
    return null;
  }
  function step(match) {
    if (match.finished) return;
    match.tick++; match.elapsed = match.tick * STEP;
    const c = match.config;
    if (match.elapsed >= match.nextGate) {
      match.gates.push({ x: WIDTH + 35, center: 155 + match.random() * 330,
        gem: match.random() < 0.6, passed: [false, false], taken: [false, false] });
      match.nextGate += 2.1;
    }
    for (const gate of match.gates) gate.x -= c.speed * STEP;
    match.players.forEach((p, i) => {
      if (!p.alive) return;
      p.survived = match.tick;
      p.vy = Math.min(c.maxFall, p.vy + c.gravity); p.y += p.vy;
      let collided = p.y - c.boundaryHalfHeight < 0 || p.y + c.boundaryHalfHeight > HEIGHT;
      for (const g of match.gates) {
        const overlaps = X + c.hitHalfWidth > g.x - PIPE_WIDTH * 0.95 / 2 && X - c.hitHalfWidth < g.x + PIPE_WIDTH * 0.95 / 2;
        if (overlaps && (p.y - c.hitHalfHeight < g.center - c.gap / 2 || p.y + c.hitHalfHeight > g.center + c.gap / 2)
          && match.elapsed >= c.shield) collided = true;
        if (!g.passed[i] && g.x + PIPE_WIDTH / 2 < X) { g.passed[i] = true; p.points += 10; }
        if (g.gem && !g.taken[i] && Math.hypot(g.x - X, g.center - p.y) < RADIUS + 14) {
          g.taken[i] = true; p.points += 3; p.collected++; p.reactionUntil = match.elapsed + 0.65;
        }
      }
      if (collided) { p.alive = false; p.diedAt = match.elapsed; }
    });
    match.gates = match.gates.filter(g => g.x > -40);
    if (match.players.every(p => !p.alive)) { match.finished = true; match.winner = resolveWinner(match.players); }
  }
  const api = { WIDTH, HEIGHT, X, RADIUS, PIPE_WIDTH, STEP, createMatch, flap, step, resolveWinner };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FlyingMatch = api;
})(typeof window === 'undefined' ? globalThis : window);
