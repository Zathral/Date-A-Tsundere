// js/mini.js: stats, randomised minigames, and the chance roll
(() => {
  const { $, clamp, S } = G, L = () => G.settings.lang;
  S.xp ||= { charm: 0, wit: 0, grit: 0, craft: 0 }; S.rel ||= {}; S.storyFacts ||= [];
  const rnd = (a, b) => a + Math.random() * (b - a), ri = (a, b) => Math.floor(rnd(a, b + 1));
  const shuf = a => a.map(v => [Math.random(), v]).sort((x, y) => x[0] - y[0]).map(v => v[1]);

  Object.assign(G.STR.en, {
    st_charm: 'Charm', st_wit: 'Wit', st_grit: 'Grit', st_craft: 'Craft', j_stats: 'Stats',
    stat_up: (n, l) => `${n} up! Lv.${l}`, mg_start: 'Start', mg_continue: 'Continue',
    tier_great: 'It lands!', tier_flustered: 'Flustered reaction', tier_corny: 'Cringe...',
    chance_line: (tier, total, base, game, stat, bonus) => `${tier} (${total}% chance = base ${base} + minigame ${game} + stat ${stat}${bonus ? ' + bond ' + bonus : ''})`
  });
  Object.assign(G.STR.ja, {
    st_charm: '魅力', st_wit: '知恵', st_grit: '根性', st_craft: '器用さ', j_stats: 'ステータス',
    stat_up: (n, l) => `${n}アップ！Lv.${l}`, mg_start: 'スタート', mg_continue: '続ける',
    tier_great: 'うまくいった！', tier_flustered: '動揺した反応', tier_corny: '微妙な空気…',
    chance_line: (tier, total, base, game, stat, bonus) => `${tier}（成功率${total}% = 基本${base} + ミニゲーム${game} + ステータス${stat}${bonus ? ' + 絆' + bonus : ''}）`
  });

  // ---------- stats ----------
  G.STATS = ['charm', 'wit', 'grit', 'craft'];
  G.level = st => Math.min(10, Math.floor(Math.sqrt((S.xp[st] || 0) / 3)));
  G.addXp = (st, n) => {
    const b = G.level(st); S.xp[st] = (S.xp[st] || 0) + n; const a = G.level(st); G.save();
    if (a > b) { G.toast(G.t('stat_up', G.t('st_' + st), a), 2600); G.sfx('sparkle'); G.petalBurst(14); }
  };
  const POOLS = G.POOLS = { charm: ['timing', 'memory', 'aim'], wit: ['quiz', 'scramble', 'memory'], grit: ['tap', 'timing', 'aim'], craft: ['timing', 'memory', 'scramble'] };

  // ---------- minigames: run(stage, finish) -> cleanup ----------
  const MINI = {
    timing: { en: 'Heart Timing', ja: 'ハートタイミング', hint: { en: 'Stop the marker inside the glowing zone. 3 rounds. (Click or Space)', ja: '光るゾーンでマーカーを止めよう。3回。（クリック／スペース）' },
      run(st, fin) {
        st.innerHTML = '<div class="mg-bar"><i class="mg-zone"></i><b class="mg-mark"></b></div><p class="mg-info"></p>';
        const zone = $('.mg-zone', st), mark = $('.mg-mark', st), info = $('.mg-info', st), scores = [];
        let round = 0, cen = .5, speed = 1, t0 = performance.now(), raf, done = false;
        const pos = now => { const x = ((now - t0) / 1000 * speed) % 2; return x > 1 ? 2 - x : x; };
        const next = () => { cen = rnd(.2, .8); speed = .9 + round * .45; zone.style.left = (cen - .09) * 100 + '%'; t0 = performance.now(); info.textContent = `${round + 1}/3`; };
        const loop = now => { mark.style.left = pos(now) * 100 + '%'; raf = requestAnimationFrame(loop); };
        const stop = () => {
          if (done) return; scores.push(clamp(1 - Math.abs(pos(performance.now()) - cen) / .22, 0, 1));
          if (++round >= 3) { done = true; cancelAnimationFrame(raf); fin(scores.reduce((a, b) => a + b) / 3); } else next();
        };
        st.addEventListener('pointerdown', stop); st._act = stop; next(); raf = requestAnimationFrame(loop);
        return () => cancelAnimationFrame(raf);
      } },
    memory: { en: 'Pattern Memory', ja: 'パターン記憶', hint: { en: 'Watch the pads light up, then repeat the order.', ja: '光る順番を覚えて、同じ順に押そう。' },
      run(st, fin) {
        const ICONS = ['♡', '✦', '☆', '♪'], len = 5, seq = Array.from({ length: len }, () => ri(0, 3)), T = [];
        st.innerHTML = `<div class="mg-pads">${ICONS.map((ic, i) => `<button class="mg-pad p${i}" data-i="${i}" type="button">${ic}</button>`).join('')}</div><p class="mg-info"></p>`;
        const pads = [...st.querySelectorAll('.mg-pad')], info = $('.mg-info', st); let step = 0, ok = 0, input = false, done = false;
        const flash = i => { pads[i].classList.add('lit'); T.push(setTimeout(() => pads[i].classList.remove('lit'), 320)); };
        info.textContent = L() === 'ja' ? '見て…' : 'Watch...';
        seq.forEach((v, k) => T.push(setTimeout(() => flash(v), 700 + k * 650)));
        T.push(setTimeout(() => { input = true; info.textContent = L() === 'ja' ? 'あなたの番！' : 'Your turn!'; }, 700 + len * 650));
        st.addEventListener('click', e => {
          const b = e.target.closest('.mg-pad'); if (!b || !input || done) return; const i = +b.dataset.i; flash(i);
          if (i === seq[step]) { ok++; if (++step >= len) { done = true; fin(1); } } else { done = true; fin(ok / len); }
        });
        return () => T.forEach(clearTimeout);
      } },
    tap: { en: 'Sprint', ja: 'ダッシュ', hint: { en: 'Mash the button for 5 seconds. (Click, tap or Space)', ja: '5秒間ボタンを連打！（クリック／スペース）' },
      run(st, fin) {
        const goal = 32, dur = 5000; st.innerHTML = '<button class="mg-big" type="button">GO!</button><div class="mg-meter"><i></i></div><p class="mg-info"></p>';
        const btn = $('.mg-big', st), fill = $('.mg-meter i', st), info = $('.mg-info', st); let n = 0, t0 = 0, iv, done = false;
        const tick = () => { const left = dur - (performance.now() - t0); info.textContent = (Math.max(0, left) / 1000).toFixed(1) + 's'; if (left <= 0 && !done) { done = true; clearInterval(iv); btn.disabled = true; fin(clamp(n / goal, 0, 1)); } };
        const hit = () => { if (done) return; if (!t0) { t0 = performance.now(); iv = setInterval(tick, 50); } n++; fill.style.width = Math.min(100, n / goal * 100) + '%'; };
        btn.addEventListener('pointerdown', hit); st._act = hit; return () => clearInterval(iv);
      } },
    quiz: { en: 'Quick Brain', ja: 'ひらめきクイズ', hint: { en: '3 quick questions, 8 seconds each.', ja: '3問、各8秒。' },
      run(st, fin) {
        const choices = a => shuf([a, a + ri(1, 4), a - ri(1, 4), a + ri(5, 9)]);
        const ODD = [[['cat', 'dog', 'bird', 'desk'], 'desk'], [['red', 'blue', 'green', 'piano'], 'piano'], [['rice', 'ramen', 'udon', 'pencil'], 'pencil'], [['sakura', 'maple', 'plum', 'bicycle'], 'bicycle']];
        const mk = () => {
          const k = ri(0, 2);
          if (k === 0) { const a = ri(3, 12), b = ri(3, 9), c = ri(1, 20), ans = a * b + c; return { q: `${a} × ${b} + ${c} = ?`, ans, o: choices(ans) }; }
          if (k === 1) { const s = ri(2, 9), d = ri(2, 6), ans = s + d * 4; return { q: `${[0, 1, 2, 3].map(i => s + d * i).join(', ')}, ?`, ans, o: choices(ans) }; }
          const [set, ans] = ODD[ri(0, ODD.length - 1)]; return { q: L() === 'ja' ? '仲間はずれは？' : 'Odd one out?', ans, o: shuf(set) };
        };
        const qs = [mk(), mk(), mk()]; let i = 0, good = 0, to, done = false;
        const ask = () => {
          const q = qs[i]; st.innerHTML = `<p class="mg-q">${q.q}</p><div class="mg-opts">${q.o.map(o => `<button type="button" class="chip-btn" data-v="${o}">${o}</button>`).join('')}</div><div class="mg-meter"><i class="mg-t"></i></div>`;
          const bar = $('.mg-t', st); bar.style.width = '100%'; void bar.offsetWidth; bar.style.transition = 'width 8s linear'; bar.style.width = '0%';
          to = setTimeout(() => ans(null), 8000);
        };
        const ans = v => { if (done) return; clearTimeout(to); if (String(v) === String(qs[i].ans)) good++; if (++i >= 3) { done = true; fin(good / 3); } else ask(); };
        st.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) ans(b.dataset.v); });
        ask(); return () => clearTimeout(to);
      } },
    aim: { en: 'Heart Catch', ja: 'ハートキャッチ', hint: { en: 'Click each heart before it vanishes. 8 hearts.', ja: '消える前にハートをクリック！全8個。' },
      run(st, fin) {
        st.innerHTML = '<div class="mg-field"></div><p class="mg-info"></p>'; const field = $('.mg-field', st), info = $('.mg-info', st); let n = 0, hit = 0, to;
        const spawn = () => {
          if (n >= 8) return fin(hit / 8); n++; info.textContent = `${n}/8`;
          const b = document.createElement('button'); b.type = 'button'; b.className = 'mg-target'; b.textContent = '♡'; b.style.left = rnd(6, 86) + '%'; b.style.top = rnd(8, 74) + '%';
          to = setTimeout(() => { b.remove(); spawn(); }, 1300 - Math.min(n, 7) * 70);
          b.addEventListener('pointerdown', () => { clearTimeout(to); hit++; b.remove(); spawn(); }); field.append(b);
        };
        spawn(); return () => clearTimeout(to);
      } },
    scramble: { en: 'Word Scramble', ja: '文字並べ替え', hint: { en: 'Unscramble 3 words (type, then Enter). 12 seconds each.', ja: '3つの英単語を並べ替えて入力（Enterで決定）。各12秒。' },
      run(st, fin) {
        const ws = shuf(['umbrella', 'festival', 'sakura', 'library', 'lantern', 'fortune', 'teacher', 'cookies', 'blossom', 'sunset', 'notebook', 'ramune']).slice(0, 3);
        const scr = w => { let s; do s = shuf(w.split('')).join(''); while (s === w); return s; };
        let i = 0, good = 0, to, done = false;
        const ans = v => { if (done) return; clearTimeout(to); if (v.trim().toLowerCase() === ws[i]) good++; if (++i >= 3) { done = true; fin(good / 3); } else ask(); };
        const ask = () => {
          st.innerHTML = `<p class="mg-q">${scr(ws[i]).toUpperCase()}</p><input class="mg-input" maxlength="12" autocomplete="off" spellcheck="false"><div class="mg-meter"><i class="mg-t"></i></div>`;
          const inp = $('.mg-input', st), bar = $('.mg-t', st); inp.focus(); bar.style.width = '100%'; void bar.offsetWidth; bar.style.transition = 'width 12s linear'; bar.style.width = '0%';
          inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter') ans(inp.value); }); to = setTimeout(() => ans(''), 12000);
        };
        ask(); return () => clearTimeout(to);
      } }
  };

  // ---------- shell: pick one at random from a pool, resolve with a 0..1 score ----------
  let last = '';
  G.playMini = (pool, label) => new Promise(resolve => {
    const opts = pool.filter(k => k !== last), list = opts.length ? opts : pool, id = list[ri(0, list.length - 1)]; last = id;
    const m = MINI[id], el = document.createElement('div'); el.className = 'overlay mini';
    el.innerHTML = '<div class="card mini-card"><h2></h2><p class="muted mg-hint"></p><div class="mg-stage"></div><div class="mg-foot"><button class="send" type="button"></button></div></div>';
    const stage = $('.mg-stage', el), go = $('.send', el); let cleanup = () => {}, over = false;
    $('h2', el).textContent = (label ? label + ' · ' : '') + m[L()]; $('.mg-hint', el).textContent = m.hint[L()]; go.textContent = G.t('mg_start');
    const key = e => { if (e.code === 'Space' && e.target.tagName !== 'INPUT' && stage._act) { e.preventDefault(); stage._act(); } };
    const finish = score => {
      if (over) return; over = true; cleanup(); score = clamp(score, 0, 1);
      const grade = score >= .85 ? 'S' : score >= .65 ? 'A' : score >= .4 ? 'B' : 'C';
      stage._act = null; stage.innerHTML = `<div class="mg-result"><b>${grade}</b><span>${Math.round(score * 100)}%</span></div>`; G.sfx(score >= .65 ? 'chime' : 'pop');
      go.hidden = false; go.textContent = G.t('mg_continue');
      go.onclick = () => { document.removeEventListener('keydown', key); el.classList.add('closing'); setTimeout(() => { el.remove(); resolve(score); }, 200); };
    };
    go.onclick = () => { go.hidden = true; cleanup = m.run(stage, finish) || cleanup; };
    document.addEventListener('keydown', key); G.game.appendChild(el); go.focus();
  });

  // chance = base + minigame*30% + stat*4% + bond/mood
  G.rollAction = async (stat, o = {}) => {
    const m = await G.playMini(POOLS[stat], o.label), lvl = G.level(stat);
    const parts = { base: o.base ?? .3, game: m * .3, stat: lvl * .04, bonus: o.bonus || 0 };
    const p = clamp(parts.base + parts.game + parts.stat + parts.bonus, .05, .95), r = Math.random();
    return { tier: r < p ? 'great' : r < p + (1 - p) * .55 ? 'flustered' : 'corny', p, m, lvl, parts };
  };
  G.train = async (stat, label) => { const m = await G.playMini(POOLS[stat], label), gain = 3 + Math.round(m * 7); G.addXp(stat, gain); return { m, gain }; };
  G.chanceLine = res => { const pc = n => Math.round(n * 100), p = res.parts; return G.t('chance_line', G.t('tier_' + res.tier), pc(res.p), pc(p.base), pc(p.game), pc(p.stat), pc(p.bonus)); };
})();