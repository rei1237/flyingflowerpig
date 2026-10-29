(function (root) {
  'use strict';
  const manifest = {
    yeoni: { name: '꽃돼지 연이', src: './assets/sprites/yeoni-v3.webp' },
    yeongnyangi: { name: '영냥이', src: './assets/sprites/yeongnyangi-v3.webp' }
  };
  const images = {};
  let selected = 'yeoni';
  const loaded = Promise.all(Object.entries(manifest).map(([key, spec]) => new Promise((resolve, reject) => {
    const img = new Image(); images[key] = img;
    img.onload = () => img.naturalWidth % 4 === 0 && img.naturalHeight % 6 === 0
      ? resolve() : reject(new Error('캐릭터 시트 크기를 확인해 주세요.'));
    img.onerror = () => reject(new Error('캐릭터를 불러오지 못했어요. 연결을 확인하고 새로고침해 주세요.'));
    img.src = spec.src;
  })));
  // Loading failures are surfaced by the start controls; avoid an unhandled rejection on boot.
  loaded.catch(() => {});
  function draw(ctx, x, y, size, rotation, expression, frame, alpha = 1, character = selected) {
    const img = images[character];
    if (!img || !img.complete || !img.naturalWidth) return;
    const phase = Math.floor(frame / 2);
    const reaction = ['happy', 'wink', 'love', 'collect'].includes(expression);
    const index = expression === 'hurt' ? 20 + Math.min(3, Math.max(0, phase))
      : reaction ? 16 + ((phase % 4 + 4) % 4) : ((phase % 16 + 16) % 16);
    const cellW = img.naturalWidth / 4, cellH = img.naturalHeight / 6;
    const extent = size * (70 / 66);
    ctx.save(); ctx.translate(x, y); ctx.rotate(rotation || 0); ctx.globalAlpha *= alpha;
    ctx.drawImage(img, index % 4 * cellW, Math.floor(index / 4) * cellH, cellW, cellH,
      -extent / 2, -extent / 2, extent, extent);
    ctx.restore();
  }
  root.FlyingSprites = { manifest, loaded, draw, build() {},
    select(key) { if (manifest[key]) selected = key; }, get selected() { return selected; } };
})(window);
