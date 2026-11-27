// js/world.js: strings, town map, cast, jobs, shop, seasonal banners
(() => {
  const { $, $$, clamp, S } = G, t = (...a) => G.t(...a), L = () => G.settings.lang;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const TRAVEL = 15;

  Object.assign(G.STR.en, {
    slot_wwake: 'Lazy morning', slot_wam: 'Weekend morning', slot_wpm: 'Weekend afternoon',
    next_wwake: 'Head out', next_wam: 'Afternoon', next_wpm: 'Head home',
    after_map: 'Open the town map', stay_home: 'Stay home',
    loc_shopping: 'Shopping street', loc_cafe: 'Cafe Komorebi', loc_shrine: 'Hilltop shrine', loc_riverside: 'Riverside',
    map_btn: 'Map', map_title: 'Where to?', map_closed: 'closed', map_cant: 'You cannot wander off right now.', map_min: m => `${m} min`,
    talk_to: n => `Talk to ${n}`, no_coins: 'Not enough coins.', earned: n => `+${n} coins`, bought: n => `Bought: ${n}`,
    m_export: 'Download save', m_import: 'Load save', m_load_bad: 'That file is not a valid save.',
    gacha_banner: n => `Limited banner: ${n} (rate up)`, j_story: 'Story so far'
  });
  Object.assign(G.STR.ja, {
    slot_wwake: 'のんびり朝', slot_wam: '休日の午前', slot_wpm: '休日の午後',
    next_wwake: '出かける', next_wam: '午後へ', next_wpm: '帰る',
    after_map: '町の地図を開く', stay_home: '家にいる',
    loc_shopping: '商店街', loc_cafe: 'カフェ木漏れ日', loc_shrine: '丘の神社', loc_riverside: '河川敷',
    map_btn: '地図', map_title: 'どこへ行く？', map_closed: '閉店', map_cant: '今は出かけられない。', map_min: m => `${m}分`,
    talk_to: n => `${n}と話す`, no_coins: 'コインが足りません。', earned: n => `コイン+${n}`, bought: n => `購入: ${n}`,
    m_export: 'セーブを保存', m_import: 'セーブを読み込む', m_load_bad: '有効なセーブファイルではありません。',
    gacha_banner: n => `限定バナー: ${n}（確率UP）`, j_story: 'これまでの物語'
  });

  // ---------- cast + schedules ----------
  const CAST = G.CAST = {
    mika: { en: 'Mika', ja: 'ミカ', brief: 'Mika, 26, owner of Cafe Komorebi. Warm, teasing big-sister energy, loves feeding people, calls the player "kiddo". Knows gossip about Yui and hints at it.' },
    ren: { en: 'Ren', ja: 'レン', brief: 'Ren, 17, classmate and arcade regular. Loud, goofy, competitive, a good friend, secretly worried about exams. Loves challenging the player to little bets.' },
    haruka: { en: 'Haruka', ja: 'ハルカ', brief: 'Haruka, 18, student council president. Formal and strict, secretly clumsy and lonely, drinks too much tea. Respects hard workers.' },
    sato: { en: 'Granny Sato', ja: 'サトウばあちゃん', brief: 'Granny Sato, 70s, runs the shop on the shopping street. Blunt, funny, gossipy, haggles with a grin and tells small-town stories.' }
  };
  const pick = (arr, d, am) => arr[(d * 3 + (am ? 2 : 0) + d % 2) % arr.length];
  const WHERE = {
    yui: (d, h, we) => we ? pick(['shopping', 'cafe', 'shrine', 'riverside', 'park', 'library'], d, h < 13) : null,
    mika: (d, h) => h >= 10 && h < 20 ? 'cafe' : null,
    ren: (d, h, we) => we ? pick(['shopping', 'park', 'riverside'], d, h < 13) : (h >= 16 && h < 19 ? 'park' : null),
    haruka: (d, h, we) => we ? (h < 13 ? 'library' : 'shrine') : (h >= 15 && h < 18 ? 'library' : null),
    sato: (d, h) => h >= 9 && h < 18 ? 'shopping' : null
  };
  G.where = id => WHERE[id](S.day, Math.floor(S.minute / 60), G.weekend());
  G.peopleAt = loc => Object.keys(WHERE).filter(id => G.where(id) === loc);
  G.yuiHere = () => !(G.weekend() && G.story.slot().choose === 'map') || G.where('yui') === S.loc;
  G.speakerName = () => (S.talk && CAST[S.talk] ? CAST[S.talk].en : 'Yui');
  G.npcRel = (id, d) => { if (!d) return; S.rel[id] = clamp((S.rel[id] || 0) + d, 0, 10); G.toast(`${CAST[id][L()]} ${d > 0 ? '+' : ''}${d}`); };
  G.promptExtra = () => {
    if (S.talk && G.where(S.talk) !== S.loc) S.talk = null;
    const names = G.peopleAt(S.loc).filter(id => id !== S.talk).map(id => id === 'yui' ? 'Yui' : CAST[id].en);
    let out = `WORLD: the player has ${S.coins} coins. OTHERS HERE: ${names.join(', ') || 'nobody'} (they can be mentioned or walk into the scene, but never speak for them in <s>).`;
    if (S.talk) out += `\nSPEAKER: the player is talking to ${CAST[S.talk].en}, NOT Yui. ${CAST[S.talk].brief} Their friendliness toward the player: ${S.rel[S.talk] || 0}/10. Put ${CAST[S.talk].en}'s words in <s>; affection_delta applies to ${CAST[S.talk].en}.`;
    return out;
  };

  // ---------- places, jobs, shop ----------
  const PLACES = G.PLACES = {
    bedroom: { open: [0, 24], acts: [] },
    cafe: { open: [10, 20], acts: [
      { min: 120, pay: [25, 40], need: 'mika', en: 'Work a shift (2h)', ja: 'バイトをする（2時間）', prompt: 'The player works a shift at Cafe Komorebi under Mika: trays, latte art, a funny customer. Narrate the shift.' },
      { min: 30, cost: 12, en: 'Order a drink (12)', ja: 'ドリンクを頼む (12)', prompt: 'The player sits down and orders a drink at the cafe. Narrate it.' }] },
    shopping: { open: [9, 18], acts: [
      { min: 90, pay: [18, 28], need: 'sato', en: 'Help Granny Sato (90 min)', ja: 'サトウばあちゃんを手伝う（90分）', prompt: 'The player helps Granny Sato stock shelves and mind the register. Narrate the work.' }] },
    library: { open: [9, 18], acts: [
      { min: 60, pay: [12, 20], en: 'Shelve books (1h)', ja: '本の整理（1時間）', prompt: 'The player volunteers to shelve returned books for a small allowance. Narrate the quiet work.' }] },
    shrine: { open: [6, 20], acts: [
      { min: 10, cost: 5, en: 'Draw a fortune (5)', ja: 'おみくじ (5)', prompt: () => `The player draws an omikuji fortune: ${['great blessing', 'blessing', 'small blessing', 'a bad omen to tie to the tree'][Math.floor(Math.random() * 4)]}. Narrate it.` },
      { min: 10, en: 'Pray (10 min)', ja: 'お参りする（10分）', prompt: 'The player offers a quiet prayer at the shrine. Narrate the moment.' }] },
    riverside: { open: [6, 21], acts: [
      { min: 30, en: 'Skip stones (30 min)', ja: '水切りをする（30分）', prompt: 'The player skips stones across the river. Narrate it.' }] },
    park: { open: [6, 21], acts: [
      { min: 30, en: 'Take a walk (30 min)', ja: '散歩する（30分）', prompt: 'The player takes a slow walk through the park. Narrate it.' }] }
  };
  G.ITEMS.push(
    { id: 'taiyaki', r: 'N', shop: 15, en: 'Taiyaki', ja: 'たい焼き', tag: "a warm custard taiyaki from Granny Sato's shop" },
    { id: 'ramune', r: 'N', shop: 8, en: 'Ramune', ja: 'ラムネ', tag: 'a cold bottle of ramune soda' },
    { id: 'keychain', r: 'R', shop: 40, en: 'Cat Keychain', ja: 'ねこのキーホルダー', tag: 'a little cat keychain' });

  // ---------- seasonal banners (real-world calendar) ----------
  G.BANNERS = [
    { id: 'spring', months: [3, 4, 5], en: 'Hanami Breeze', ja: '花見のそよ風', items: [
      { r: 'SSR', en: 'Hanami Picnic Set', ja: 'お花見ピクニックセット', tag: 'a limited hanami picnic set, clearly special' },
      { r: 'SR', en: 'Sakura Mochi Box', ja: '桜餅の箱', tag: 'a box of sakura mochi' }, { r: 'R', en: 'Petal Charm', ja: '花びらのお守り', tag: 'a pressed-petal charm' }] },
    { id: 'summer', months: [6, 7, 8], en: 'Summer Festival', ja: '夏祭り', items: [
      { r: 'SSR', en: 'Fireworks Pass', ja: '花火大会チケット', tag: 'a pass to the best fireworks spot (an activity ticket), clearly special' },
      { r: 'SR', en: 'Goldfish Charm', ja: '金魚のお守り', tag: 'a goldfish charm' }, { r: 'R', en: 'Paper Fan', ja: 'うちわ', tag: 'a paper uchiwa fan' }] },
    { id: 'autumn', months: [9, 10, 11], en: 'Harvest Moon', ja: '中秋の名月', items: [
      { r: 'SSR', en: 'Harvest Moon Lantern', ja: '月見のランタン', tag: 'a glowing harvest-moon lantern, clearly special' },
      { r: 'SR', en: 'Maple Bookmark', ja: 'もみじのしおり', tag: 'a pressed maple-leaf bookmark' }, { r: 'R', en: 'Roasted Sweet Potato', ja: '焼き芋', tag: 'a hot roasted sweet potato' }] },
    { id: 'winter', months: [12, 1, 2], en: 'Winter Wonder', ja: '冬の贈り物', items: [
      { r: 'SSR', en: 'Hand-knit Scarf', ja: '手編みのマフラー', tag: 'a hand-knit scarf, clearly special' },
      { r: 'SR', en: 'Snow Globe', ja: 'スノードーム', tag: 'a small snow globe' }, { r: 'R', en: 'Hot Cocoa', ja: 'ホットココア', tag: 'a cup of hot cocoa' }] }
  ];
  G.BANNERS.forEach(b => b.items.forEach((it, i) => G.ITEMS.push({ ...it, id: `${b.id}_${i}`, banner: b.id })));
  G.activeBanner = () => G.BANNERS.find(b => b.months.includes(new Date().getMonth() + 1));

  // ---------- UI ----------
  const tb = $('#storyPage .toolbar');
  tb.insertAdjacentHTML('beforeend', '<button class="chip-btn" id="mapBtn" type="button"></button>');
  tb.insertAdjacentHTML('afterend', '<div class="gift-pop" id="placeBar" hidden></div><div class="gift-pop" id="mapPop" hidden></div>');
  const canRoam = () => !S.eventRun && !S.phone && ['wam', 'wpm', 'after'].includes(G.story.slot().id);
  const spend = a => { G.save(); G.renderState(); G.story.update(); G.story.director(a); };

  function travel(id) {
    if (G.story.busy()) return G.toast(t('busy'));
    S.pendingChoice = null; S.talk = null; S.loc = id; S.minute = Math.min(1439, S.minute + TRAVEL);
    const who = G.peopleAt(id).map(n => n === 'yui' ? 'Yui' : CAST[n].en);
    spend(`The player arrives at: ${G.STR.en['loc_' + id]}. ${who.length ? 'Present: ' + who.join(', ') + '.' : 'Nobody the player knows is here.'} Narrate the arrival and the place at this hour, and let anyone present notice the player.`);
  }
  function talk(id) {
    if (G.story.busy()) return G.toast(t('busy'));
    S.talk = id === 'yui' ? null : id; const n = id === 'yui' ? 'Yui' : CAST[id].en;
    spend(`The player walks up to ${n} and starts a conversation. Narrate the approach and have ${n} greet them in character.`);
  }
  function act(a) {
    if (G.story.busy()) return G.toast(t('busy'));
    if (a.cost && S.coins < a.cost) { G.sfx('error'); return G.toast(t('no_coins')); }
    const pay = a.pay ? a.pay[0] + Math.floor(Math.random() * (a.pay[1] - a.pay[0] + 1)) : 0;
    S.coins += pay - (a.cost || 0); S.minute = Math.min(1439, S.minute + (a.min || 10));
    if (pay) { G.toast(t('earned', pay)); G.sfx('chime'); }
    spend(`${typeof a.prompt === 'function' ? a.prompt() : a.prompt} (${a.min || 10} minutes pass${pay ? `; the player is paid ${pay} coins` : ''}.)`);
  }
  function buy(it) {
    if (S.coins < it.shop) { G.sfx('error'); return G.toast(t('no_coins')); }
    S.coins -= it.shop; S.inventory[it.id] = (S.inventory[it.id] || 0) + 1; G.save(); G.renderState(); G.sfx('pop'); G.toast(t('bought', G.itemName(it)));
  }
  G.openMap = () => {
    if (!canRoam()) return G.toast(t('map_cant'));
    const pop = $('#mapPop'), h = Math.floor(S.minute / 60); pop.innerHTML = `<span class="muted">${t('map_title')}</span>`;
    Object.entries(PLACES).forEach(([id, p]) => {
      const open = h >= p.open[0] && h < p.open[1], b = el('button', 'chip-btn', `${esc(t('loc_' + id))} · ${t('map_min', TRAVEL)}${open ? '' : ' · ' + t('map_closed')}`);
      b.type = 'button'; b.disabled = !open || id === S.loc; b.addEventListener('click', () => { pop.hidden = true; travel(id); }); pop.append(b);
    });
    pop.hidden = false;
  };
  function renderPlace() {
    const bar = $('#placeBar'), p = PLACES[S.loc], folks = G.peopleAt(S.loc), h = Math.floor(S.minute / 60), btns = [];
    if (!S.eventRun && !S.phone) {
      folks.forEach(id => id !== S.talk && btns.push([t('talk_to', id === 'yui' ? 'Yui' : CAST[id].en), () => talk(id)]));
      if (S.talk && G.yuiHere() && !folks.includes('yui')) btns.push([t('talk_to', 'Yui'), () => talk('yui')]);
      if (p && h >= p.open[0] && h < p.open[1]) {
        p.acts.filter(a => !a.need || G.where(a.need) === S.loc).forEach(a => btns.push([a[L()], () => act(a)]));
        if (S.loc === 'shopping' && G.where('sato') === 'shopping') G.ITEMS.filter(i => i.shop).forEach(it => btns.push([`${G.itemName(it)} (${it.shop})`, () => buy(it)]));
      }
    }
    bar.innerHTML = ''; bar.hidden = !btns.length;
    btns.forEach(([label, fn]) => { const b = el('button', 'chip-btn', esc(label)); b.type = 'button'; b.addEventListener('click', fn); bar.append(b); });
  }
  const sync = () => {
    $('#mapBtn').textContent = '🗺 ' + t('map_btn');
    const sc = $('#scene'), y = $('#yui'); $$('.npc', sc).forEach(n => n.remove());
    if (S.talk && G.where(S.talk) !== S.loc && !S.eventRun) S.talk = null;
    if (S.talk) { y.classList.add('away'); sc.insertBefore(G.npcSprite(S.talk), $('#emote')); }
    renderPlace();
  };
  $('#mapBtn').addEventListener('click', () => { const pop = $('#mapPop'); pop.hidden ? G.openMap() : (pop.hidden = true); });
  G.on('scene', sync); G.on('lang', sync);

  // ---------- tiny pixel people for NPCs ----------
  const SPR = { mika: ['#7a4a2c', '#ffd9bf', '#ff9ac8', 'long'], ren: ['#2b2b2b', '#ffd9bf', '#4a8cff', 'short'], haruka: ['#1b1f4a', '#ffe0cc', '#e8e8f4', 'tail'], sato: ['#cfcfcf', '#f0c8a8', '#8a6aa8', 'bun'] };
  G.npcSprite = id => {
    const c = document.createElement('canvas'); c.width = 32; c.height = 56; c.className = 'yui npc'; c.setAttribute('aria-hidden', 'true');
    const x = c.getContext('2d'), [hair, skin, cloth, style] = SPR[id], r = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    if (style === 'long') r(7, 8, 18, 34, hair); if (style === 'tail') { r(6, 8, 20, 14, hair); r(24, 14, 5, 24, hair); } if (style === 'bun') r(12, 0, 8, 6, hair);
    r(8, 28, 16, 18, cloth); r(9, 46, 5, 10, '#3a3f6a'); r(18, 46, 5, 10, '#3a3f6a'); r(5, 29, 4, 14, skin); r(23, 29, 4, 14, skin);
    r(9, 10, 14, 15, skin); r(9, 8, 14, 5, hair); r(8, 10, 3, 9, hair); r(21, 10, 3, 9, hair); r(12, 17, 2, 2, '#222'); r(18, 17, 2, 2, '#222'); r(14, 22, 4, 1, '#c66');
    return c;
  };
  G.story.update();
})();