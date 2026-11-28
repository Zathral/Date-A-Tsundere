// js/pixel.js: animated procedural pixel-art scenes
(() => {
  const W = 200, H = 169, OUT = ['street', 'school_gate', 'park', 'rooftop', 'shopping', 'shrine', 'riverside'];
  const SKY = {
    dawn: ['#ffd9e8', '#ffcfe0', '#ffc4d8', '#ffd2c4', '#ffe0b8', '#ffeccc'],
    day: ['#5fb4ff', '#78c2ff', '#92d0ff', '#b0e0ff', '#cdeeff', '#e4f6ff'],
    sunset: ['#ff7aa5', '#ff8fa0', '#ffa592', '#ffbc88', '#ffd098', '#ffe0b0'],
    night: ['#0b1240', '#121a55', '#1a2468', '#262e78', '#34388a', '#443f95']
  };
  const BOOKS = ['#ff9ac8', '#7cc4ff', '#ffd36e', '#8ad69a', '#b39bff'];

  function paint(ctx, loc, hour, wx, f) {
    const p = G.period(hour), night = p === 'night';
    const r = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
    const disc = (x, y, rad, c) => { rad = Math.round(rad); ctx.fillStyle = c; for (let dy = -rad; dy <= rad; dy++) { const w = Math.floor(Math.sqrt(rad * rad - dy * dy)); ctx.fillRect(Math.round(x - w), Math.round(y + dy), w * 2 + 1, 1); } };
    const glow = (x, y, rad, c, a) => { ctx.globalAlpha = a; disc(x, y, rad, c); ctx.globalAlpha = 1; };
    const sky = (top, h) => {
      SKY[p].forEach((c, i) => r(0, top + i * h / 6, W, h / 6 + 1, c));
      if (night) for (let i = 0; i < 28; i++) r((i * 67 + 13) % W, top + (i * 29) % h, 1, 1, (f / 5 + i) % 14 < 1 ? '#fff' : '#9aa6ff');
    };
    const cloud = (x, y) => { const cx = ((x + f * .12) % (W + 70)) - 35, c = night ? '#5b5aa6' : '#fff'; r(cx, y, 28, 5, c); r(cx + 5, y - 4, 16, 5, c); r(cx + 10, y - 6, 8, 3, c); };
    const rain = (x, y, w, h, n = 18) => { for (let i = 0; i < n; i++) r(x + (i * 53) % w, y + (f * 2.4 + i * 37) % h, 1, 3, 'rgba(255,255,255,.65)'); };
    const win = (x, y, w, h) => {
      ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip(); sky(y, h); cloud(x + 4, y + 8); if (wx === 'rain') rain(x, y, w, h); ctx.restore();
      r(x - 2, y - 2, w + 4, 2, '#fff'); r(x - 2, y + h, w + 4, 3, '#e8e0d4'); r(x - 2, y, 2, h, '#fff'); r(x + w, y, 2, h, '#fff'); r(x + w / 2 - 1, y, 2, h, '#fff'); r(x, y + h / 2 - 1, w, 2, '#fff');
    };
    const gw = (x, y, w, h) => { r(x, y, w, h, '#fff'); r(x + 1, y + 1, w - 2, h - 2, night ? '#ffd36e' : SKY[p][3]); r(x + w / 2, y, 1, h, '#fff'); };
    const petals = () => { for (let i = 0; i < 16; i++) r(((i * 47 + f * .35 + Math.sin(f / 14 + i) * 6) % W + W) % W, (f * .55 + i * 31) % H, 2, 1, i % 3 ? '#ffb3d1' : '#fff'); };
    const tree = (x, by, s = 1) => {
      const sw = Math.round(Math.sin(f / 24 + x)); r(x - 3 * s, by - 38 * s, 6 * s, 38 * s, '#8a5a3c');
      [[0, -46, 20, '#ffb3d1'], [-15, -38, 14, '#ff9ac3'], [15, -40, 15, '#ffc6dc'], [0, -32, 13, '#ff9ac3']].forEach(([dx, dy, rd, c]) => disc(x + (dx + sw) * s, by + dy * s, rd * s, c));
    };
    const steam = (x, y) => { for (let i = 0; i < 4; i++) r(x + Math.sin((f + i * 9) / 8) * 2, y - (f / 3 + i * 5) % 16, 1, 2, 'rgba(255,255,255,.7)'); };
    const motes = () => { for (let i = 0; i < 10; i++) r(112 + (i * 13 + Math.sin(f / 20 + i) * 8 + f * .05) % 60, 30 + (i * 17 + f * .15) % 90, 1, 1, 'rgba(255,255,255,.8)'); };
    const room = (wall, bed, pillow) => {
      r(0, 0, W, 112, night ? '#5a4d8c' : wall); r(0, 100, W, 12, 'rgba(0,0,0,.06)'); win(120, 20, 56, 56);
      r(0, 112, W, 57, '#d9a77c'); for (let i = 0; i < 6; i++) r(0, 118 + i * 10, W, 1, '#c4936a');
      r(8, 86, 96, 36, bed); r(8, 76, 96, 14, pillow); r(14, 68, 30, 12, '#fff'); r(8, 120, 4, 8, '#8a5a3c'); r(100, 120, 4, 8, '#8a5a3c');
      r(136, 96, 40, 4, '#a8794a'); r(140, 100, 4, 22, '#7a5532'); r(168, 100, 4, 22, '#7a5532'); r(150, 84, 3, 12, '#ddd'); r(144, 76, 15, 9, '#ffe9a8');
      if (night) glow(151, 82, 26, '#ffd36e', .16 + .04 * Math.sin(f / 9));
    };

    const scenes = {
      bedroom: () => room('#f7e1ee', '#ff9ac8', '#ffd0e8'),
      home: () => room('#ffe9d2', '#9ad0ff', '#fff'),
      yui_room: () => { room('#e9dcff', '#9ad0ff', '#d8ecff'); glow(40, 80, 14, '#bfe6ff', .25 + .1 * Math.sin(f / 6)); r(36, 76, 7, 12, '#fff'); },
      classroom: () => {
        r(0, 0, W, 112, night ? '#6a63a0' : '#f6efe6'); win(112, 22, 70, 50);
        r(12, 22, 84, 46, '#c79b6b'); r(15, 25, 78, 40, '#2f5a49'); [[20, 32, 40], [20, 40, 52], [20, 48, 30]].forEach(([x, y, w]) => r(x, y, w, 1, '#cfe8da'));
        r(98, 6, 12, 12, '#fff'); r(104 + Math.cos(f / 60) * 4, 12 + Math.sin(f / 60) * 4, 1, 1, '#e0457b');
        r(0, 112, W, 57, '#c99c6a'); for (let i = 0; i < 3; i++) { r(10 + i * 62, 94, 46, 5, '#a8794a'); r(14 + i * 62, 99, 3, 24, '#7a5532'); r(51 + i * 62, 99, 3, 24, '#7a5532'); }
        if (!night) { ctx.globalAlpha = .1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(112, 22); ctx.lineTo(182, 22); ctx.lineTo(150, 130); ctx.lineTo(70, 130); ctx.fill(); ctx.globalAlpha = 1; }
        motes();
      },
      school_gate: () => {
        sky(0, 118); cloud(20, 20); cloud(120, 36); r(30, 44, 140, 74, '#f4ecd8'); r(30, 40, 140, 5, '#c9b9a0');
        for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) gw(42 + i * 32, 54 + j * 28, 20, 18);
        r(88, 10, 24, 34, '#e8dfc8'); disc(100, 24, 7, '#fff'); r(100 + Math.cos(f / 60) * 3, 24 + Math.sin(f / 60) * 3, 1, 1, '#e0457b');
        r(0, 118, W, 51, '#c8bfa8'); r(0, 118, W, 3, '#b5ab92'); r(10, 82, 8, 40, '#6c6f88'); r(182, 82, 8, 40, '#6c6f88'); tree(24, 122, .9); petals();
      },
      street: () => {
        sky(0, 120); cloud(30, 18); cloud(130, 30);
        for (let i = 0; i < 6; i++) { const bx = i * 36 - 8, by = 48 + (i % 3) * 12; r(bx, by, 32, 120 - by, night ? '#3b3f7a' : ['#b9c8ec', '#c9bdf0', '#a8c0e8'][i % 3]); for (let j = 0; j < 3; j++) for (let k = 0; k < 2; k++) gw(bx + 5 + k * 13, by + 8 + j * 14, 8, 8); }
        r(0, 120, W, 49, '#9ea6bb'); r(0, 120, W, 4, '#c9d0e2'); for (let i = 0; i < 8; i++) r(((i * 30 - f * .4) % 240 + 240) % 240 - 20, 148, 14, 3, '#fff');
        tree(20, 124); tree(178, 122, 1.1); petals();
      },
      rooftop: () => {
        sky(0, 120); cloud(40, 24); if (p === 'sunset' || p === 'dawn') disc(140, 86, 14, p === 'sunset' ? '#ffd36e' : '#fff3c4');
        for (let i = 0; i < 9; i++) { const bh = 40 + (i * 37) % 50; r(i * 24 - 4, 118 - bh, 20, bh, night ? '#2b2f66' : '#9fb4e0'); for (let k = 0; k < bh / 8; k++) if ((i * 5 + k * 3 + Math.floor(f / 40)) % 4 === 0) r(i * 24 + 2 + (k * 5) % 10, 118 - bh + 4 + k * 8, 3, 3, night ? '#ffd36e' : '#c7d7f5'); }
        r(0, 118, W, 51, '#b4b8cc'); r(0, 118, W, 3, '#8a8fb0'); r(0, 92, W, 2, '#5a5f82'); for (let i = 0; i < 34; i++) r(i * 6, 92, 1, 26, '#5a5f82');
        if (!night) r((f * .6 + 20) % W, 30 + Math.sin(f / 10) * 3, 3, 1, '#555');
      },
      park: () => {
        sky(0, 110); cloud(30, 22); cloud(110, 40); disc(40, 128, 60, '#7cc98c'); disc(160, 134, 56, '#6dbf7f'); r(0, 118, W, 51, '#7cc98c');
        r(80, 118, 40, 51, '#e5d3a8'); r(120, 138, 60, 18, '#8fd1ff'); for (let i = 0; i < 6; i++) r(124 + (i * 11 + f * .3) % 50, 141 + (i % 3) * 5, 4, 1, '#fff');
        r(20, 126, 40, 3, '#8a5a3c'); r(20, 120, 40, 2, '#8a5a3c'); r(22, 129, 3, 10, '#6a4529'); r(55, 129, 3, 10, '#6a4529');
        tree(24, 122, 1.2); tree(176, 120, 1.3); petals();
      },
      library: () => {
        r(0, 0, W, 112, night ? '#6a5a85' : '#f2e6d3'); win(76, 20, 48, 44);
        [8, 148].forEach(x => { r(x, 14, 44, 100, '#8a5a3c'); for (let i = 0; i < 4; i++) { r(x + 2, 18 + i * 24, 40, 1, '#6a4529'); for (let j = 0; j < 8; j++) r(x + 3 + j * 5, 20 + i * 24, 4, 18 - (j % 3) * 2, BOOKS[(i + j) % 5]); } });
        r(0, 112, W, 57, '#c99c6a'); r(60, 120, 80, 5, '#a8794a'); r(66, 125, 4, 24, '#7a5532'); r(130, 125, 4, 24, '#7a5532');
        r(96, 0, 1, 30, '#555'); r(88, 30, 17, 6, '#ffd36e'); glow(97, 40, 26, '#ffd36e', .12 + .03 * Math.sin(f / 10)); motes();
      },
      cafeteria: () => {
        r(0, 0, W, 112, night ? '#6b5a8a' : '#fff1de'); win(14, 22, 70, 50); win(116, 22, 70, 50); r(0, 112, W, 57, '#d9b38a');
        [0, 100].forEach(x => { r(x + 8, 98, 84, 6, '#8a5a3c'); r(x + 14, 104, 4, 22, '#6a4529'); r(x + 82, 104, 4, 22, '#6a4529'); r(x + 40, 92, 7, 6, '#fff'); steam(x + 43, 90); });
      },
      // ---- second location set ----
      shopping: () => {
        sky(0, 60); cloud(40, 16); r(0, 60, W, 60, '#e9dfd0');
        [['#ff9ac8'], ['#7cc4ff'], ['#ffd36e'], ['#b39bff']].forEach(([c], i) => {
          const x = i * 50, top = 42 + (i % 2) * 6; r(x, top, 50, 120 - top, i % 2 ? '#f4ecd8' : '#ece0cf');
          for (let k = 0; k < 5; k++) { r(x + k * 10, 70, 5, 6, c); r(x + 5 + k * 10, 70, 5, 6, '#fff'); }
          gw(x + 8, 84, 14, 16); r(x + 30, 86, 12, 34, '#8a5a3c'); r(x + 8, top + 8, 34, 8, (Math.floor(f / 12) + i) % 7 ? c : '#888');
        });
        for (let i = 0; i < 8; i++) { const lx = 12 + i * 25 + Math.round(Math.sin(f / 20 + i)); r(lx, 34, 5, 7, '#ff5a5a'); if (night) glow(lx + 2, 38, 6, '#ff8a5c', .25); }
        r(0, 120, W, 49, '#cfc4b4'); r(0, 120, W, 2, '#b8ac9c'); for (let i = 0; i < 12; i++) r(i * 18, 121, 1, 48, '#c2b6a6'); petals();
      },
      cafe: () => {
        r(0, 0, W, 112, night ? '#5a4034' : '#e8c9a0'); r(0, 70, W, 42, night ? '#4a3328' : '#c9a070'); win(120, 20, 56, 44);
        r(0, 112, W, 57, '#8a5a3c'); for (let i = 0; i < 8; i++) r(i * 26, 112, 1, 57, '#7a4a2c');
        r(10, 92, 100, 10, '#6a4529'); r(10, 102, 100, 20, '#7a5532'); r(20, 78, 10, 14, '#eee'); r(22, 80, 6, 3, '#c33'); steam(26, 76); r(60, 86, 6, 6, '#fff'); steam(63, 84);
        r(70, 20, 34, 30, '#2a2a2a'); r(75, 27, 24, 1, '#fff'); r(75, 32, 18, 1, '#fff'); r(85, 40, 4, 3, '#ff9ac8');
        [40, 100, 150].forEach(x => { r(x, 0, 1, 26, '#333'); r(x - 6, 26, 13, 6, '#ffd36e'); glow(x, 36, 14, '#ffd36e', .12 + .03 * Math.sin(f / 10 + x)); });
        r(130, 106, 36, 4, '#a8794a'); r(146, 110, 4, 22, '#7a5532');
      },
      shrine: () => {
        sky(0, 120); cloud(30, 20); tree(30, 120, 1.2); tree(170, 120, 1.3); r(0, 118, W, 51, '#8fbf8f'); r(80, 118, 40, 51, '#cfc7b8');
        for (let i = 0; i < 5; i++) r(80, 126 + i * 9, 40, 1, '#aaa');
        r(70, 60, 6, 60, '#d6402b'); r(124, 60, 6, 60, '#d6402b'); r(62, 52, 76, 7, '#d6402b'); r(66, 48, 68, 4, '#2a2a2a'); r(72, 68, 56, 4, '#d6402b');
        [52, 148].forEach(x => { r(x, 98, 6, 20, '#bbb'); r(x - 3, 92, 12, 6, '#bbb'); if (night) glow(x + 3, 100, 10, '#ffd36e', .2 + .06 * Math.sin(f / 8 + x)); });
        if (night) for (let i = 0; i < 10; i++) r(40 + (i * 37 + f * .3 + Math.sin(f / 10 + i) * 8) % 120, 70 + (i * 23 + Math.sin(f / 13 + i) * 10) % 50, 1, 1, (f / 4 + i) % 6 < 3 ? '#e8ff8a' : '#5a7a2a');
        petals();
      },
      riverside: () => {
        sky(0, 90); cloud(30, 18); cloud(120, 32); if (p === 'sunset') disc(150, 76, 12, '#ffd36e');
        r(0, 90, W, 30, '#9fd2a0'); r(0, 100, W, 36, SKY[p][4]); for (let i = 0; i < 24; i++) r((i * 37 + f * (.3 + (i % 3) * .1)) % W, 102 + (i % 6) * 6, 5, 1, night ? '#9aa6ff' : '#fff');
        r(60, 86, 90, 2, '#8a5a3c'); r(60, 92, 90, 5, '#8a5a3c'); for (let i = 0; i < 8; i++) r(64 + i * 11, 97, 2, 10, '#6a4529');
        r((f * .2) % W, 120, 6, 3, '#fff'); r(((f * .2) % W) + 5, 118, 2, 2, '#ffb21e');
        r(0, 136, W, 33, '#7cc98c'); r(0, 136, W, 3, '#6dbf7f'); for (let i = 0; i < 14; i++) r(i * 15 + 4 + Math.round(Math.sin(f / 18 + i)), 122 + (i % 3) * 2, 1, 16, '#5aa070');
        tree(20, 138, 1.2); tree(178, 136, 1.1); petals();
      }
    };
    (scenes[loc] || (G.SCENES && G.SCENES[loc] ? () => G.SCENES[loc]({ r, disc, glow, sky, cloud, win, steam, petals, tree, f, W, H, p, night }) : scenes.bedroom))();
    if (wx === 'rain' && OUT.includes(loc)) { r(0, 0, W, H, 'rgba(40,60,110,.15)'); rain(0, 0, W, H, 60); }
    const T = { sunset: ['#ff8a5c', .13], dawn: ['#ffb3d1', .12], night: ['#0b1240', .28] }[p];
    if (T) { ctx.globalAlpha = T[1]; r(0, 0, W, H, T[0]); ctx.globalAlpha = 1; }
  }

  G.pixelMount = box => {
    const c = document.createElement('canvas'), snap = document.createElement('canvas');
    [c, snap].forEach(x => { x.width = W; x.height = H; x.className = 'px-scene'; }); snap.classList.add('px-snap'); box.replaceChildren(c, snap);
    const ctx = c.getContext('2d'), sctx = snap.getContext('2d'), st = { key: '', loc: 'bedroom', hour: 12, wx: 'clear' }; let f = 0;
    const visible = () => c.isConnected && !c.closest('.page:not(.show)');
    const draw = () => { if (visible()) paint(ctx, st.loc, st.hour, st.wx, f); };
    const id = setInterval(() => { if (!c.isConnected) return clearInterval(id); if (!G.settings.reduceMotion) f++; draw(); }, 100);
    return { set(loc, hour, wx = 'clear') {
      const key = loc + G.period(hour);
      if (st.key && key !== st.key && visible() && !G.settings.reduceMotion) {
        sctx.drawImage(c, 0, 0); snap.style.transition = 'none'; snap.style.opacity = 1; void snap.offsetWidth; snap.style.transition = 'opacity .7s ease'; snap.style.opacity = 0;
        c.classList.remove('enter'); void c.offsetWidth; c.classList.add('enter');
      }
      Object.assign(st, { key, loc, hour, wx }); draw();
    } };
  };
})();