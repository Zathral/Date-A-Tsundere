// js/extras.js: event data, gift items, scene art, gacha page, journal page, milestone CGs
(() => {
  const { $, $$, S } = G, t = (...a) => G.t(...a), L = () => G.settings.lang;
  G.USE_ENV_IMAGES = false; // true: also try assets/env/<loc>.png on top of the drawn scenes

  // ---------- story events (beats are director notes; the model narrates them) ----------
  G.EVENTS = [
    { id: 'rain', min: 2, loc: 'school_gate', time: 990, weather: 'rain', title: { en: 'Rainy Afternoon', ja: '雨の放課後' },
      setup: 'Sudden rain after school. You and Yui are both stuck at the school gate, and she only has one umbrella.',
      beats: ['She reluctantly offers to share the umbrella, insisting it is only practical.', 'Thunder cracks. She grabs your sleeve, then pretends she did not.', 'You reach the station. She struggles to say goodbye.'],
      choice: { at: 1, ask: { en: 'The umbrella is small...', ja: '傘が小さい…' }, options: [
        { en: 'Hold it over her', ja: '傘を彼女に寄せる', note: 'The player tilted the umbrella over Yui and got wet.', delta: 1 },
        { en: 'Tease her about standing close', ja: '近いね、とからかう', note: 'The player teased Yui about standing so close.', delta: 0 }] } },
    { id: 'library', min: 5, loc: 'library', time: 975, title: { en: 'Library Duty', ja: '図書当番' },
      setup: 'The class committee assigned you and Yui to library duty. The room is quiet and golden with late sun.',
      beats: ['You both reach for the same book on a high shelf.', 'A long awkward silence. She asks, too casually, what you do for fun.', 'A teacher leaves. She relaxes a little and admits she likes this quiet.'],
      choice: { at: 1, ask: { en: 'She is struggling with a tall stack of books.', ja: '彼女は本の山を抱えて苦戦している。' }, options: [
        { en: 'Take half the stack', ja: '半分持つ', note: 'The player took half of Yui\'s book stack without being asked.', delta: 1 },
        { en: 'Let her carry it, cheer her on', ja: '任せて応援する', note: 'The player let Yui carry the stack and cheered her on.', delta: 0 }] } },
    { id: 'festival', min: 9, loc: 'classroom', time: 840, title: { en: 'Culture Festival', ja: '文化祭' },
      setup: 'Culture festival day. Your class runs a cafe stall and Yui is stuck wearing a frilly apron she hates.',
      beats: ['A customer compliments her apron. She short-circuits.', 'Classmates tease her about being popular today.', 'The rush ends. She slumps beside you, exhausted and weirdly happy.'],
      choice: { at: 1, ask: { en: 'A classmate keeps teasing her.', ja: 'クラスメイトが彼女をからかい続ける。' }, options: [
        { en: 'Step in and defend her', ja: 'かばう', note: 'The player defended Yui from the teasing.', delta: 1 },
        { en: 'Join in gently', ja: '一緒に軽くからかう', note: 'The player joined in the gentle teasing.', delta: 0 }] } },
    { id: 'study', min: 13, loc: 'classroom', time: 1020, title: { en: 'Exam Study Session', ja: '試験勉強会' },
      setup: 'Exam week. You and Yui study in the empty classroom after everyone left. She is surprisingly good at this.',
      beats: ['She explains a hard problem, leaning closer than she realizes.', 'She dozes off for a second and blames you for the warm room.', 'The sun sets. She quietly says the exam is not what she is worried about.'],
      choice: { at: 1, ask: { en: 'You do not get the problem.', ja: '問題が分からない。' }, options: [
        { en: 'Ask her to explain again', ja: 'もう一度教えてもらう', note: 'The player asked Yui to explain again, patiently.', delta: 1 },
        { en: 'Offer her a snack break', ja: 'おやつ休憩に誘う', note: 'The player offered Yui a snack break.', delta: 1 }] } },
    { id: 'fireworks', min: 17, loc: 'park', time: 1170, title: { en: 'Summer Festival Night', ja: '夏祭りの夜' },
      setup: 'Summer festival night. Yui shows up in a yukata, claiming her friends cancelled and this is the only reason she came.',
      beats: ['The crowd pushes you together near the food stalls.', 'The first firework bursts. She forgets to be tsundere for a moment.', 'The finale fades. Neither of you wants to leave first.'],
      choice: { at: 1, ask: { en: 'She looks amazing in the yukata.', ja: '浴衣姿がとても似合っている。' }, options: [
        { en: 'Tell her she looks nice', ja: '似合ってるよと伝える', note: 'The player sincerely told Yui she looks nice in the yukata.', delta: 2 },
        { en: 'Say nothing, buy her a snack', ja: '何も言わず屋台で何か買う', note: 'The player silently bought Yui a snack.', delta: 1 }] } },
    { id: 'rooftop', min: 20, loc: 'rooftop', time: 1065, title: { en: 'Rooftop at Sunset', ja: '夕暮れの屋上' },
      setup: 'Sunset on the school rooftop. Yui asked you to come and is trying to confess, but keeps failing, flustered. Keep it sweet and PG.',
      beats: ['She starts a sentence three times and abandons it each time.', 'The wind lifts her hair. She finally says what she wants to say, almost whispering.', 'Silence. She waits for your answer, pretending she is not nervous.'],
      choice: { at: 1, ask: { en: 'She is struggling to say it.', ja: '彼女は言葉に詰まっている。' }, options: [
        { en: 'Wait patiently for her', ja: '待ってあげる', note: 'The player waited patiently for Yui to find her words.', delta: 1 },
        { en: 'Say it first', ja: '先に気持ちを伝える', note: 'The player said their feelings first, gently.', delta: 2 }] } }
  ];

  // ---------- gift items ----------
  G.ITEMS = [
    { id: 'melonpan', r: 'N', en: 'Melon Bread', ja: 'メロンパン', tag: 'a warm melon bread from the school store' },
    { id: 'coffee', r: 'N', en: 'Canned Coffee', ja: '缶コーヒー', tag: 'a can of sweet milk coffee' },
    { id: 'pens', r: 'N', en: 'Gel Pen Set', ja: 'ジェルペンセット', tag: 'a colourful gel pen set' },
    { id: 'strawmilk', r: 'R', en: 'Strawberry Milk', ja: 'いちごミルク', tag: 'strawberry milk, secretly her favourite drink' },
    { id: 'hairclip', r: 'R', en: 'Cherry Hair Clip', ja: 'さくらんぼのヘアクリップ', tag: 'a cute cherry hair clip' },
    { id: 'cafe', r: 'R', en: 'Cafe Voucher', ja: 'カフェ券', tag: 'a voucher for the cafe near the station (an activity ticket)' },
    { id: 'plush', r: 'SR', en: 'Fluffy Bear Plushie', ja: 'ふわふわクマのぬいぐるみ', tag: 'a big fluffy bear plushie' },
    { id: 'arcade', r: 'SR', en: 'Arcade Tickets', ja: 'ゲーセンチケット', tag: 'two arcade tickets (an activity ticket)' },
    { id: 'ribbon', r: 'SSR', en: 'Sakura Ribbon', ja: '桜のリボン', tag: 'a limited sakura-pattern hair ribbon, clearly special' },
    { id: 'planet', r: 'SSR', en: 'Planetarium Pair Pass', ja: 'プラネタリウムペア券', tag: 'a pair pass to the planetarium (an activity ticket)' }
  ];
  G.itemName = it => it[L()] || it.en;

  // ---------- scene art (drawn SVG, so no image assets are required) ----------
  const PAL = { dawn: ['#ffc9dd', '#ffe9c9'], day: ['#7cc4ff', '#e4f5ff'], sunset: ['#ff8fb0', '#ffd9a0'], night: ['#101a45', '#40336f'] };
  G.period = h => h < 5 ? 'night' : h < 9 ? 'dawn' : h < 16 ? 'day' : h < 19 ? 'sunset' : 'night';
  const R = (x, y, w, h, f, x2 = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${f}" ${x2}/>`;
  const C = (x, y, r, f) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${f}"/>`;
  const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i)).join('');
  G.sceneSVG = (loc, hour) => {
    const p = G.period(hour), [a, b] = PAL[p], night = p === 'night';
    const win = (x, y, w, h) => R(x, y, w, h, 'url(#sk)', 'stroke="#fff" stroke-width="10"') + `<path d="M${x + w / 2} ${y}v${h}M${x} ${y + h / 2}h${w}" stroke="#fff" stroke-width="6"/>`;
    const wall = night ? '#5a5490' : '#f6efe6';
    const tree = (x, y, s = 1) => R(x - 8 * s, y, 16 * s, 90 * s, '#8a5a3c') + C(x, y, 62 * s, '#ffb3d1') + C(x - 40 * s, y + 28 * s, 42 * s, '#ff9ac3') + C(x + 42 * s, y + 24 * s, 44 * s, '#ffc6dc');
    const S2 = {
      bedroom: R(0, 0, 800, 675, night ? '#6a5a95' : '#f7e1ee') + win(470, 90, 230, 260) + R(0, 520, 800, 155, '#d9a77c') + R(40, 380, 380, 170, '#ff9ac8') + R(40, 350, 380, 60, '#ffd0e8') + R(70, 340, 120, 50, '#fff', 'rx="14"'),
      yui_room: R(0, 0, 800, 675, night ? '#5d4f93' : '#e9dcff') + win(480, 100, 220, 240) + R(0, 520, 800, 155, '#c79b80') + R(60, 390, 340, 160, '#9ad0ff') + R(60, 360, 340, 60, '#d8ecff') + C(130, 400, 36, '#ffd0a8'),
      street: R(0, 420, 800, 255, '#9ea6bb') + rep(6, i => R(40 + i * 130, 560, 70, 14, '#fff')) + rep(5, i => R(i * 170 - 20, 200 + (i % 2) * 40, 150, 260, night ? '#3b3f7a' : '#b9c8ec')) + tree(120, 330) + tree(660, 310, 1.1) + R(0, 410, 800, 18, '#c9d0e2'),
      school_gate: R(0, 450, 800, 225, '#c8bfa8') + R(120, 140, 560, 310, night ? '#7a78b4' : '#f4ecd8') + rep(4, i => rep(2, j => R(160 + i * 130, 190 + j * 120, 90, 80, 'url(#sk)', 'stroke="#fff" stroke-width="6"'))) + R(370, 60, 60, 90, '#e8dfc8') + C(400, 100, 22, '#fff') + R(30, 330, 30, 130, '#6c6f88') + R(740, 330, 30, 130, '#6c6f88') + tree(70, 360, .8),
      classroom: R(0, 0, 800, 675, wall) + R(50, 70, 340, 180, '#2f5a49', 'stroke="#c79b6b" stroke-width="12"') + win(470, 70, 270, 200) + R(0, 500, 800, 175, '#c99c6a') + rep(3, i => R(60 + i * 250, 400, 180, 16, '#a8794a') + R(80 + i * 250, 416, 10, 90, '#7a5532') + R(150 + i * 250, 416, 10, 90, '#7a5532')),
      cafeteria: R(0, 0, 800, 675, night ? '#6b5a8a' : '#fff1de') + win(80, 80, 300, 200) + win(430, 80, 300, 200) + R(0, 480, 800, 195, '#d9b38a') + rep(2, i => R(40 + i * 400, 420, 340, 24, '#8a5a3c') + R(70 + i * 400, 444, 14, 80, '#6a4529') + R(300 + i * 400, 444, 14, 80, '#6a4529')),
      rooftop: R(0, 470, 800, 205, '#b4b8cc') + rep(8, i => R(i * 110, 330 + (i * 37) % 90, 90, 200, night ? '#2b2f66' : '#9fb4e0')) + rep(14, i => R(i * 60, 400, 3, 150, '#5a5f82')) + R(0, 400, 800, 3, '#5a5f82') + R(0, 470, 800, 8, '#8a8fb0'),
      park: R(0, 400, 800, 275, '#8ad69a') + C(200, 460, 320, '#7cc98c') + C(640, 480, 300, '#6dbf7f') + R(330, 520, 140, 155, '#e5d3a8', 'rx="40"') + R(100, 380, 260, 14, '#8a5a3c') + R(110, 394, 10, 50, '#6a4529') + R(340, 394, 10, 50, '#6a4529') + tree(90, 250) + tree(700, 260, 1.2) + `<ellipse cx="610" cy="590" rx="110" ry="30" fill="#8fd1ff"/>`,
      library: R(0, 0, 800, 675, night ? '#6a5a85' : '#f2e6d3') + win(300, 70, 200, 170) + rep(2, k => R(k ? 560 : 20, 60, 220, 420, '#8a5a3c') + rep(4, i => rep(6, j => R((k ? 570 : 30) + j * 34, 75 + i * 100, 26, 80, ['#ff9ac8', '#7cc4ff', '#ffd36e', '#8ad69a', '#b39bff'][(i + j) % 5])))) + R(0, 540, 800, 135, '#c99c6a') + R(250, 440, 300, 20, '#a8794a')
    };
    S2.home = S2.bedroom;
    const moods = { sunset: '#ff8a5c', dawn: '#ffb3d1', night: '#0b1240', day: '#ffffff' };
    return `<svg viewBox="0 0 800 675" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><defs><linearGradient id="sk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="800" height="675" fill="url(#sk)"/>${night ? rep(24, i => C((i * 97 + 30) % 800, (i * 53) % 240 + 10, 1.4 + (i % 3) * .5, '#fff')) : ''}${S2[loc] || S2.bedroom}<rect width="800" height="675" fill="${moods[p]}" opacity="${night ? .3 : p === 'day' ? 0 : .12}"/></svg>`;
  };

  // ---------- generic page helper ----------
  const mkPage = (id, cls = '') => {
    const el = document.createElement('section'); el.id = id; el.className = 'page ' + cls; G.game.appendChild(el); return el;
  };

  // ---------- milestone CGs ----------
  const CG = [null,
    { loc: 'classroom', hour: 16, en: "...Fine. You can sit next to me. Just don't talk too much.", ja: '…いいわ。隣に座っても。ただし、しゃべりすぎないでよね。' },
    { loc: 'rooftop', hour: 12, en: "Hey... thanks for always showing up. D-don't make it weird.", ja: 'ねえ…いつも来てくれてありがと。へ、変な空気にしないでよね。' },
    { loc: 'park', hour: 17, en: 'I saved you a seat. Obviously it was empty anyway!', ja: '席、取っといてあげた。どうせ空いてたけど！' },
    { loc: 'rooftop', hour: 18, en: "If I said I was happy right now, would you laugh? ...Don't answer.", ja: '今、幸せって言ったら笑う？…答えなくていいから。' }];
  G.showCG = (idx, replay) => {
    const cg = CG[idx]; if (!cg) return;
    const el = document.createElement('div'); el.className = 'overlay cg'; el.tabIndex = 0;
    el.innerHTML = `<div class="cg-frame"><div class="cg-art">${G.sceneSVG(cg.loc, cg.hour)}<img src="assets/main-character.png" alt=""></div>
      <h3>${G.t('stage')[idx]}${replay ? '' : ' · ' + G.t('cg_unlock')}</h3><p>${cg[L()]}</p><small>${G.t('cg_tap')}</small></div>`;
    G.game.appendChild(el); el.focus(); G.sfx('sparkle'); G.voice('soft'); G.petalBurst(replay ? 12 : 40);
    el.addEventListener('click', () => el.remove()); el.addEventListener('keydown', () => el.remove());
  };

  // ---------- gacha ----------
  const gp = mkPage('gachaPage'), RAR = { N: '#7a8fc7', R: '#3aa6ff', SR: '#b45cff', SSR: '#ffb21e' };
  const roll = () => {
    S.pulls++; S.pity++;
    const x = Math.random(); let r = x < .02 ? 'SSR' : x < .12 ? 'SR' : x < .4 ? 'R' : 'N';
    if (S.pity >= 30) r = 'SSR'; else if (S.pulls % 10 === 0 && (r === 'N' || r === 'R')) r = 'SR';
    if (r === 'SSR') S.pity = 0;
    const pool = G.ITEMS.filter(i => i.r === r), it = pool[Math.floor(Math.random() * pool.length)];
    S.inventory[it.id] = (S.inventory[it.id] || 0) + 1; return it;
  };
  const chip = it => `<span class="item" style="--c:${RAR[it.r]}"><b>${it.r}</b> ${G.itemName(it)}</span>`;
  let lastPull = [];
  const renderGacha = () => {
    const inv = G.ITEMS.filter(i => S.inventory[i.id]).map(i => `${chip(i)}<i>x${S.inventory[i.id]}</i>`).join('');
    gp.innerHTML = `<div class="sheet"><h2>${G.t('gacha_title')}</h2><p class="muted">💎 ${S.gems} ${G.t('gems')} · ${G.t('gacha_pity', Math.max(1, 30 - S.pity))}</p>
      <div class="row-btns"><button class="chip-btn" data-pull="1">${G.t('gacha_pull1')}</button><button class="chip-btn" data-pull="10">${G.t('gacha_pull10')}</button></div>
      <div class="results" aria-live="polite">${lastPull.map(chip).join('')}</div><h3>${G.t('gacha_inv')}</h3><div class="inv">${inv || `<span class="muted">${G.t('j_none')}</span>`}</div><p class="muted">${G.t('gacha_tip')}</p></div>`;
  };
  gp.addEventListener('click', e => {
    const b = e.target.closest('[data-pull]'); if (!b) return;
    const n = +b.dataset.pull, cost = n === 10 ? 90 : 10;
    if (S.gems < cost) { G.toast(G.t('gacha_noGems')); return G.sfx('error'); }
    S.gems -= cost; lastPull = Array.from({ length: n }, roll); G.save(); G.renderState(); renderGacha();
    const top = lastPull.some(i => i.r === 'SSR'); G.sfx(top ? 'chime' : 'sparkle'); if (top) G.petalBurst(30);
  });
  G.pages.gacha = { show: on => { gp.classList.toggle('show', on); if (on) renderGacha(); } };

  // ---------- journal ----------
  const jp = mkPage('journalPage');
  const renderJournal = () => {
    const lang = L(), si = G.stageIdx(S.affection);
    const evs = G.EVENTS.map(e => `<li class="${S.eventsDone.includes(e.id) ? 'done' : ''}">${S.eventsDone.includes(e.id) ? '✓' : S.affection >= e.min ? '★' : '🔒'} ${e.title[lang]} <i>(${e.min})</i></li>`).join('');
    const cgs = [1, 2, 3, 4].map(i => S.cgs.includes(i) ? `<button class="chip-btn" data-cg="${i}">${G.t('stage')[i]}</button>` : `<span class="locked">${G.t('j_locked')}</span>`).join('');
    const list = a => a.length ? `<ul>${a.map(x => `<li>${x}</li>`).join('')}</ul>` : `<p class="muted">${G.t('j_none')}</p>`;
    jp.innerHTML = `<div class="sheet"><h2>${G.t('j_title')}</h2><p>${G.t('day')} ${S.day} · ${G.t('stage')[si]} · ♡ ${S.affection}/20 · ${G.t('streak', S.streak)}</p>
      <div class="cols"><div><h3>${G.t('j_events')}</h3><ul class="evs">${evs}</ul><h3>${G.t('j_cgs')}</h3><div class="row-btns">${cgs}</div></div>
      <div><h3>${G.t('j_mem')}</h3>${list(S.memories)}<h3>${G.t('j_gifts')}</h3>${list(S.gifts.slice(-8))}</div></div></div>`;
  };
  jp.addEventListener('click', e => { const b = e.target.closest('[data-cg]'); if (b) G.showCG(+b.dataset.cg, true); });
  G.pages.journal = { show: on => { jp.classList.toggle('show', on); if (on) renderJournal(); } };
  G.on('lang', () => { if (gp.classList.contains('show')) renderGacha(); if (jp.classList.contains('show')) renderJournal(); });
})();