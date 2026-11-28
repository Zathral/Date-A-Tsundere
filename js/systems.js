// js/systems.js: daily goals, cafe job ladder, outfits, rival (Kaito), unlockable areas
// Load AFTER js/world.js
(() => {
  const { $, S, clamp } = G, t = (...a) => G.t(...a), L = () => G.settings.lang;
  S.unlocked ||= {}; S.rank ||= 0; S.shifts ||= 0; S.outfit ||= 'uniform'; S.wardrobe ||= ['uniform']; S.rival ||= { lead: 2 }; S.daily ||= null;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const T = (en, ja) => ({ en, ja });
  const C = (at, en, ja, options) => ({ at, ask: T(en, ja), options });
  const O = (vibe, en, ja, note, delta = 1, x = {}) => ({ en, ja, note, delta, xp: { [vibe]: 3 }, ...x });
  const E = o => ({ rep: true, at: 'turn', ...o });
  const qs = id => (S.quests[id] ||= { stage: -1, day: 0 });
  const Q = (id, n) => ({ quest: [id, n] });
  const npcHere = id => G.where(id) === S.loc;
  const lead = n => { S.rival.lead = clamp(S.rival.lead + n, 0, 10); G.save(); };
  const duel = r => lead(r && r.tier === 'great' ? -2 : r && r.tier === 'corny' ? 1 : 0);

  Object.assign(G.STR.en, {
    goals_btn: 'Goals', outfit_btn: 'Outfit', goals_title: "Today's goals",
    goal_done: n => `Goal done: ${n}  +8 gems, +10 coins`, goals_all: 'All goals cleared! +20 gems',
    wardrobe_title: 'Wardrobe', shop_title: 'Clothing stall', changed: n => `Now wearing: ${n}`, got_outfit: n => `New outfit: ${n}`, bought_o: n => `Bought: ${n}`,
    promoted: r => `Promoted to ${r}!`, area_new: n => `New area unlocked: ${n}`, prize: n => `Won: ${n}`,
    loc_arcade: 'Pixel Paradise Arcade', loc_bookstore: 'Hoshino Books', loc_aquarium: 'Seaside Aquarium',
    j_extra: 'Life', j_rank: (r, n) => `Cafe rank: ${r} (${n} shifts)`, j_rival: n => `Kaito's pull on Yui: ${n}/10`, j_outfit: o => `Wearing: ${o}`, j_areas: a => `Unlocked: ${a}`
  });
  Object.assign(G.STR.ja, {
    goals_btn: '目標', outfit_btn: '服装', goals_title: '今日の目標',
    goal_done: n => `目標達成: ${n}  ジェム+8、コイン+10`, goals_all: '全目標達成！ジェム+20',
    wardrobe_title: 'クローゼット', shop_title: '洋服の屋台', changed: n => `着替えた: ${n}`, got_outfit: n => `新しい服: ${n}`, bought_o: n => `購入: ${n}`,
    promoted: r => `昇進: ${r}！`, area_new: n => `新エリア解放: ${n}`, prize: n => `獲得: ${n}`,
    loc_arcade: 'ピクセルパラダイス', loc_bookstore: '星野書店', loc_aquarium: '海辺の水族館',
    j_extra: '生活', j_rank: (r, n) => `カフェの役職: ${r}（${n}回）`, j_rival: n => `カイトのアプローチ: ${n}/10`, j_outfit: o => `着ている服: ${o}`, j_areas: a => `解放済み: ${a}`
  });

  // ================= DAILY GOALS =================
  const vibeXp = () => G.VIBES.reduce((a, k) => a + (S.xp[k] || 0), 0), totalXp = () => G.STATS.reduce((a, k) => a + (S.xp[k] || 0), 0);
  const COMMON = ['bedroom', 'home'];
  const GOALS = [
    { id: 'lunch', wd: true, en: 'Have lunch with Yui', ja: 'ユイとお昼を食べる', test: d => !!d.c.lunch },
    { id: 'earn', en: 'Earn 30 coins', ja: 'コインを30枚稼ぐ', test: d => (d.c.earn || 0) >= 30, prog: d => [Math.min(30, d.c.earn || 0), 30] },
    { id: 'aff', en: "Raise Yui's affection", ja: 'ユイの好感度を上げる', test: d => S.affection > d.snap.aff },
    { id: 'vibe', en: 'Gain 10 Chill / Nonchalant / Playful XP', ja: 'まったり・クール・いたずらのXPを10稼ぐ', test: d => vibeXp() - d.snap.vibe >= 10, prog: d => [Math.min(10, vibeXp() - d.snap.vibe), 10] },
    { id: 'visit', en: 'Visit 4 different places', ja: '4か所を訪れる', test: d => Object.keys(d.v).length >= 4, prog: d => [Math.min(4, Object.keys(d.v).length), 4] },
    { id: 'move', en: 'Try a move in chat (flirt, banter, show off...)', ja: 'チャットで決めワザに挑戦する', test: d => !!d.c.move },
    { id: 'event', en: 'Finish an event', ja: 'イベントを1つクリアする', test: () => G.allEvents().some(e => S.evtLast[e.id] === S.day) },
    { id: 'xp', en: 'Gain 8 stat XP', ja: 'ステータスXPを8稼ぐ', test: d => totalXp() - d.snap.xp >= 8, prog: d => [Math.min(8, totalXp() - d.snap.xp), 8] },
    { id: 'gift', en: 'Give Yui a gift', ja: 'ユイにプレゼントをあげる', test: d => S.gifts.length > d.snap.gifts },
    { id: 'shift', en: 'Work a cafe shift', ja: 'カフェでバイトする', test: d => !!d.c.shift }
  ];
  function daily() {
    if (S.daily && S.daily.day === S.day) return S.daily;
    if (S.daily && S.flags.kaito_met) lead(S.affection <= S.daily.snap.aff ? 1 : S.affection - S.daily.snap.aff >= 2 ? -1 : 0); // Kaito gains ground if you ignore Yui
    let seed = S.day * 9301 + 49297; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280; // same goals if you reload
    const ids = GOALS.filter(g => g.wd == null || g.wd === !G.weekend()).map(g => g.id);
    for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    return (S.daily = { day: S.day, ids: ids.slice(0, 3), done: [], c: {}, v: {}, snap: { aff: S.affection, vibe: vibeXp(), xp: totalXp(), gifts: S.gifts.length } });
  }
  G.track = (kind, n = 1) => { const d = daily(); d.c[kind] = (d.c[kind] || 0) + n; G.save(); check(); };
  function check() {
    const d = daily(); let n = 0;
    d.ids.forEach(id => {
      const g = GOALS.find(x => x.id === id);
      if (!d.done.includes(id) && g && g.test(d)) { d.done.push(id); S.gems += 8; S.coins += 10; n++; G.toast(t('goal_done', g[L()]), 2600); G.sfx('chime'); }
    });
    if (n && d.done.length === d.ids.length) { S.gems += 20; setTimeout(() => G.toast(t('goals_all'), 3000), 2700); }
    if (n) { G.save(); G.renderState(); labels(); }
  }

  // ---------- toolbar buttons + popups ----------
  const tb = $('#storyPage .toolbar');
  tb.insertAdjacentHTML('beforeend', '<button class="chip-btn" id="goalBtn" type="button"></button><button class="chip-btn" id="outfitBtn" type="button"></button>');
  tb.insertAdjacentHTML('afterend', '<div class="gift-pop" id="goalPop" hidden></div><div class="gift-pop" id="outfitPop" hidden></div>');
  const gp = $('#goalPop'), wp = $('#outfitPop');
  function labels() {
    const b = $('#goalBtn'); if (!b) return; const d = daily();
    b.textContent = `📋 ${t('goals_btn')} ${d.done.length}/${d.ids.length}`; $('#outfitBtn').textContent = '👕 ' + t('outfit_btn');
  }
  function renderGoals() {
    const d = daily(); gp.innerHTML = `<span class="muted">${t('goals_title')}</span>`;
    d.ids.forEach(id => {
      const g = GOALS.find(x => x.id === id), ok = d.done.includes(id), p = !ok && g.prog ? g.prog(d) : null;
      gp.append(el('span', 'chip', `${ok ? '✓' : '☐'} ${esc(g[L()])}${p ? ` (${p[0]}/${p[1]})` : ''}`));
    });
    gp.hidden = false;
  }
  $('#goalBtn').addEventListener('click', () => { wp.hidden = true; if (!gp.hidden) gp.hidden = true; else renderGoals(); });
  $('#outfitBtn').addEventListener('click', () => { gp.hidden = true; if (!wp.hidden) wp.hidden = true; else renderWardrobe(false); });

  // ================= OUTFITS =================
  const OUTFITS = {
    uniform: { en: 'School Uniform', ja: '制服', tag: 'the standard school uniform' },
    hoodie: { price: 60, en: 'Comfy Hoodie', ja: 'ゆるパーカー', bonus: { chill: 1 }, fav: true, tag: 'a comfy oversized hoodie', yui: 'She eyes it with barely hidden envy; she wants to borrow it but would never admit it.' },
    jersey: { price: 80, en: 'Sport Jersey', ja: 'スポーツジャージ', bonus: { grit: 1 }, tag: 'a sporty jersey', yui: 'She teases it as try-hard, but her eyes linger on the shoulders.' },
    blazer: { price: 120, en: 'Sharp Blazer', ja: 'きちんとブレザー', bonus: { charm: 1 }, tag: 'a sharp tailored blazer', yui: 'She does a double take, flusters, and says it makes the player look like a different person.' },
    shades: { price: 150, en: 'Cool Jacket & Shades', ja: 'クールなジャケットとサングラス', bonus: { nonchalant: 1 }, tag: 'a cool jacket and sunglasses', yui: 'She snorts that it looks ridiculous, then asks where they got it.' },
    punny: { price: 50, en: 'Goofy Pun Tee', ja: 'ダジャレTシャツ', bonus: { playful: 1 }, tag: 'a goofy pun t-shirt', yui: 'She groans at the pun, tries not to laugh, and fails.' },
    apron: { en: 'Cafe Apron', ja: 'カフェのエプロン', bonus: { craft: 1 }, tag: 'a neat cafe apron', yui: 'She says it suits them and immediately looks away, regretting it.' },
    yukata: { en: 'Summer Yukata', ja: '夏の浴衣', bonus: { charm: 1, chill: 1 }, fav: true, tag: 'a navy summer yukata', yui: 'She goes quiet and red, pretending to adjust her sleeve.' }
  };
  const bonusText = o => (o.bonus ? '(+' + Object.entries(o.bonus).map(([k, v]) => `${v} ${t('st_' + k)}`).join(', ') + ')' : '');
  function grantOutfit(id) { if (S.wardrobe.includes(id)) return; S.wardrobe.push(id); G.save(); G.toast(t('got_outfit', OUTFITS[id][L()]), 3000); G.sfx('sparkle'); }
  const wear = id => { S.outfit = id; G.save(); wp.hidden = true; G.toast(t('changed', OUTFITS[id][L()])); G.story.update(); };
  function buyOutfit(id) {
    const o = OUTFITS[id]; if (S.coins < o.price) { G.sfx('error'); return G.toast(t('no_coins')); }
    S.coins -= o.price; S.wardrobe.push(id); G.save(); G.renderState(); G.sfx('pop'); G.toast(t('bought_o', o[L()])); renderWardrobe(true);
  }
  function renderWardrobe(shop) {
    wp.innerHTML = `<span class="muted">${t(shop ? 'shop_title' : 'wardrobe_title')}</span>`;
    Object.entries(OUTFITS).forEach(([id, o]) => {
      const owned = S.wardrobe.includes(id); if (shop ? owned || !o.price : !owned) return;
      const b = el('button', 'chip-btn' + (!shop && S.outfit === id ? ' alt' : ''), `${esc(o[L()])} ${bonusText(o)}${shop ? ` (${o.price})` : S.outfit === id ? ' ✓' : ''}`);
      b.type = 'button'; b.addEventListener('click', () => (shop ? buyOutfit(id) : wear(id))); wp.append(b);
    });
    wp.hidden = false;
  }
  const baseLevel = G.level; // worn outfit adds +1 to a stat (also unlocks stat-gated options)
  G.level = st => Math.min(10, baseLevel(st) + (((OUTFITS[S.outfit] || {}).bonus || {})[st] || 0));
  G.ctxExtra = () => { // first time Yui sees an outfit each day: she reacts, favourites give +1 affection
    const o = OUTFITS[S.outfit], key = S.day + ':' + S.outfit;
    if (!o || S.outfit === 'uniform' || S.talk || !G.story.present() || S.outfitSeen === key) return {};
    S.outfitSeen = key; return o.fav ? { outfitNew: true, minDelta: 1 } : { outfitNew: true };
  };
  G.PLACES.shopping.acts.push({ id: 'clothes', min: 0, need: 'sato', en: 'Browse the clothing stall', ja: '服を見る', custom: () => renderWardrobe(true) });

  // ================= CAFE JOB LADDER =================
  const RANKS = [
    { id: 'trainee', en: 'Trainee', ja: '見習い', need: 0, pay: [20, 30], pool: ['timing', 'memory'] },
    { id: 'waiter', en: 'Waiter', ja: 'ホールスタッフ', need: 4, pay: [28, 42], pool: ['timing', 'aim'] },
    { id: 'barista', en: 'Barista', ja: 'バリスタ', need: 10, pay: [38, 55], pool: ['memory', 'timing'] },
    { id: 'senior', en: 'Senior Barista', ja: 'シニアバリスタ', need: 18, pay: [50, 70], pool: ['memory', 'scramble'] },
    { id: 'manager', en: 'Assistant Manager', ja: '副店長', need: 28, pay: [65, 90], pool: ['memory', 'quiz', 'aim'] }
  ];
  function applyCafe() {
    const a = G.PLACES.cafe.acts;
    a[0] = { get en() { return `Work a shift (2h) · ${RANKS[S.rank].en}`; }, get ja() { return `バイトをする（2時間）· ${RANKS[S.rank].ja}`; }, need: 'mika', custom: workShift };
    a[2] = { min: 30, get cost() { return S.rank >= 3 ? 6 : 12; }, get en() { return `Order a drink (${this.cost})`; }, get ja() { return `ドリンクを頼む (${this.cost})`; }, prompt: 'The player sits down and orders a drink at the cafe. Narrate it.' };
    if (S.rank >= 2 && !a.some(x => x.id === 'latte')) a.push({ id: 'latte', train: 'craft', min: 60, en: 'Latte art practice (1h) · Craft', ja: 'ラテアート練習（1時間）· 器用さ', prompt: 'The player practices latte art at the cafe counter with Mika coaching. Narrate it.' });
    if (S.rank >= 4 && !a.some(x => x.id === 'close')) a.push({ id: 'close', min: 90, pay: [50, 70], need: 'mika', en: 'Close up with Mika (90 min)', ja: 'ミカと閉店作業（90分）', prompt: 'The player closes the cafe with Mika after hours: chairs up, floors mopped, a quiet heart-to-heart. Narrate it.' });
  }
  async function workShift() {
    if (G.story.busy()) return G.toast(t('busy'));
    const rk = RANKS[S.rank], m = await G.playMini(rk.pool, rk[L()]);
    const pay = Math.round(rk.pay[0] + (rk.pay[1] - rk.pay[0]) * m) + (m >= .85 ? 10 : 0);
    S.shifts++; S.coins += pay; S.minute = Math.min(1439, S.minute + 120); G.addXp('craft', 2); G.track('earn', pay); G.track('shift');
    let promo = ''; const nx = RANKS[S.rank + 1];
    if (nx && S.shifts >= nx.need) {
      S.rank++; applyCafe(); promo = ` Mika proudly promotes the player to ${nx.en}.`;
      G.toast(t('promoted', nx[L()]), 3200); G.sfx('sparkle'); G.petalBurst(20); if (S.rank === 2) grantOutfit('apron');
    } else { G.toast(t('earned', pay)); G.sfx('chime'); }
    G.save(); G.renderState(); G.story.update();
    G.story.director(`The player works a shift at Cafe Komorebi as ${rk.en} under Mika. It went ${m >= .85 ? 'excellently' : m >= .65 ? 'well' : m >= .4 ? 'shakily' : 'badly'}. Narrate the shift (trays, orders, a funny customer).${promo} (120 minutes pass; the player is paid ${pay} coins.)`);
  }

  // ================= RIVAL: KAITO =================
  G.CAST.kaito = { en: 'Kaito', ja: 'カイト',
    brief: "Kaito Mori, 17, basketball-club ace and popular classmate. SMOOTH, FRIENDLY type: easygoing, charming, a little too self-assured, genuinely kind underneath. He openly enjoys Yui's company and says so lightly, but respects the player and loves friendly competition. Not a villain: never rude, pushy or creepy.",
    voice: { en: 'easygoing and warm, light teasing ("hey you two", "not bad")', ja: 'さわやかな男子口調（〜だよな、いいね、ナイス）' },
    react: { great: 'Kaito grins, genuinely impressed, and says so out loud with a fist bump.', flustered: 'Kaito laughs, caught slightly off guard, then returns serve with an easy joke.', corny: 'Kaito laughs kindly, ruffles his own hair and gives a friendly, honest thumbs-up for effort.' } };
  const spriteK = () => {
    const c = document.createElement('canvas'); c.width = 32; c.height = 56; c.className = 'yui npc'; c.setAttribute('aria-hidden', 'true');
    const x = c.getContext('2d'), r = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
    r(8, 28, 16, 18, '#ff8a3d'); r(9, 46, 5, 10, '#3a3f6a'); r(18, 46, 5, 10, '#3a3f6a'); r(5, 29, 4, 14, '#ffd9bf'); r(23, 29, 4, 14, '#ffd9bf');
    r(9, 10, 14, 15, '#ffd9bf'); r(9, 8, 14, 5, '#3a2a1a'); r(8, 10, 3, 9, '#3a2a1a'); r(21, 10, 3, 9, '#3a2a1a'); r(12, 17, 2, 2, '#222'); r(18, 17, 2, 2, '#222'); r(14, 22, 4, 1, '#c66');
    return c;
  };
  const ns0 = G.npcSprite; G.npcSprite = id => (id === 'kaito' ? spriteK() : ns0(id));
  const pa0 = G.peopleAt; G.peopleAt = loc => { const l = pa0(loc); return !l.includes('kaito') && G.where('kaito') === loc ? [...l, 'kaito'] : l; };
  const where0 = G.where; // schedules for Kaito and for people who moved into the new areas
  G.where = id => {
    const h = Math.floor(S.minute / 60), we = G.weekend();
    if (id === 'kaito') return !S.flags.kaito_met ? null : we ? (h >= 10 && h < 18 ? (h < 13 ? 'shopping' : 'park') : null) : (h >= 15 && h < 18 ? 'park' : null);
    if (id === 'yui' && S.unlocked.aquarium && we && h >= 11 && h < 17 && S.day % 2 === 0) return 'aquarium';
    if (id === 'ren' && S.unlocked.arcade && h >= 14 && h < 21 && (we || h >= 16)) return 'arcade';
    if (id === 'haruka' && S.unlocked.bookstore && we && h >= 13 && h < 18) return 'bookstore';
    return where0(id);
  };

  // ================= UNLOCKABLE AREAS =================
  G.ITEMS.push(
    { id: 'clawN', r: 'N', banner: 'prize', en: 'Capsule Toy', ja: 'カプセルトイ', tag: 'a small capsule toy from the arcade' },
    { id: 'clawR', r: 'R', banner: 'prize', en: 'Mini Plush', ja: 'ミニぬいぐるみ', tag: 'a mini arcade plush' },
    { id: 'clawSR', r: 'SR', banner: 'prize', en: 'Giant Cat Plush', ja: '巨大ねこぬいぐるみ', tag: 'a giant cat plushie won from the claw machine' },
    { id: 'novel', r: 'R', banner: 'prize', keep: true, en: 'Secondhand Novel', ja: '古本の小説', tag: 'a well-loved secondhand mystery novel' },
    { id: 'jelly', r: 'R', banner: 'prize', en: 'Jellyfish Plush', ja: 'クラゲのぬいぐるみ', tag: 'a soft jellyfish plushie from the aquarium' });
  async function claw() {
    if (G.story.busy()) return G.toast(t('busy'));
    S.coins -= 15; const m = await G.playMini(['aim', 'timing'], t('loc_arcade'));
    const tier = m >= .85 ? 'SR' : m >= .5 ? 'R' : 'N', pool = G.ITEMS.filter(i => i.id.startsWith('claw') && i.r === tier), it = pool[Math.floor(Math.random() * pool.length)];
    S.inventory[it.id] = (S.inventory[it.id] || 0) + 1; S.minute = Math.min(1439, S.minute + 20);
    G.save(); G.renderState(); G.sfx('chime'); G.toast(t('prize', G.itemName(it)), 2600); G.story.update();
    G.story.director(`The player plays the claw machine at the arcade and wins ${it.tag}. Narrate the tense grab. (20 minutes pass.)`);
  }
  function buyNovel() {
    if (G.story.busy()) return G.toast(t('busy'));
    S.coins -= 30; S.inventory.novel = (S.inventory.novel || 0) + 1; S.minute = Math.min(1439, S.minute + 30);
    if (qs('books').stage === 1) { S.quests.books = { stage: 2, day: S.day }; G.toast(t('quest_up', G.QUESTS.books.title[L()]), 2600); }
    G.save(); G.renderState(); G.sfx('pop'); G.story.update();
    G.story.director('The player buys a well-loved secondhand mystery novel at Hoshino Books. Narrate the dusty shelves and the sleepy shopkeeper. (30 minutes pass.)');
  }
  function buyPlush() {
    if (G.story.busy()) return G.toast(t('busy'));
    S.coins -= 35; S.inventory.jelly = (S.inventory.jelly || 0) + 1; S.minute = Math.min(1439, S.minute + 30);
    G.save(); G.renderState(); G.sfx('pop'); G.story.update();
    G.story.director('The player buys a soft jellyfish plushie at the aquarium gift shop. Narrate it. (30 minutes pass.)');
  }
  const AREAS = {
    arcade: () => ({ open: [10, 22], acts: [
      { id: 'claw', min: 20, cost: 15, en: 'Claw machine (15)', ja: 'クレーンゲーム (15)', custom: claw },
      { train: 'grit', min: 40, en: 'Rhythm cabinet (40 min) · Grit', ja: 'リズムゲーム（40分）· 根性', prompt: 'The player battles a rhythm cabinet at the arcade. Narrate it.' },
      { train: 'playful', min: 40, en: 'Photo booth antics (40 min) · Playful', ja: 'プリクラで悪ふざけ（40分）· いたずら', prompt: 'The player makes silly faces in the arcade photo booth. Narrate it.' }] }),
    bookstore: () => ({ open: [10, 19], acts: [
      { train: 'wit', min: 60, en: 'Browse and read (1h) · Wit', ja: '立ち読み（1時間）· 知恵', prompt: 'The player browses and reads in the cramped, cozy bookstore. Narrate it.' },
      { min: 30, cost: 30, en: 'Buy a secondhand novel (30)', ja: '古本の小説を買う (30)', custom: buyNovel },
      { min: 90, pay: [18, 28], en: 'Mind the register (90 min)', ja: 'レジ番をする（90分）', prompt: 'The player minds the register at the sleepy bookstore. Narrate it.' }] }),
    aquarium: () => ({ open: [10, 18], acts: [
      { train: 'chill', min: 45, en: 'Watch the jellyfish (45 min) · Chill', ja: 'クラゲを眺める（45分）· まったり', prompt: 'The player watches the jellyfish drift in the dim blue light. Narrate the calm.' },
      { min: 30, cost: 35, en: 'Buy a jellyfish plush (35)', ja: 'クラゲのぬいぐるみを買う (35)', custom: buyPlush }] })
  };
  const addPlace = id => { if (!G.PLACES[id]) G.PLACES[id] = AREAS[id](); }; // a place only exists on the map once unlocked
  function unlock(id) {
    if (S.unlocked[id]) return; S.unlocked[id] = 1; addPlace(id);
    G.save(); G.toast(t('area_new', t('loc_' + id)), 3500); G.sfx('sparkle'); G.petalBurst(24);
  }
  // pixel art for the new places (needs the one-line patch in pixel.js)
  G.SCENES = {
    arcade: h => { const { r, glow, f } = h;
      r(0, 0, 200, 112, '#2a1f55'); r(0, 112, 200, 57, '#3b2f70'); for (let i = 0; i < 14; i++) r(i * 14, 112 + (i % 2) * 10, 14, 10, '#4a3d85');
      for (let i = 0; i < 5; i++) { const x = 10 + i * 38; r(x, 50, 30, 70, '#14122e'); r(x + 3, 56, 24, 24, ['#47efc3', '#ff55ad', '#ffd36e', '#7cc4ff', '#b39bff'][(i + Math.floor(f / 20)) % 5]); r(x + 3, 86, 24, 4, '#555'); r(x + 8, 94, 4, 4, '#ff4d4d'); r(x + 18, 94, 4, 4, '#4dff7a'); glow(x + 15, 68, 24, '#9a7bff', .12 + .04 * Math.sin(f / 8 + i)); }
      r(60, 14, 80, 16, '#ff55ad'); r(63, 17, 74, 10, '#14122e'); r(70, 20, ((f / 6) % 60) + 8, 4, '#47efc3'); },
    bookstore: h => { const { r, glow, f } = h;
      r(0, 0, 200, 112, '#e8cfa4'); r(0, 112, 200, 57, '#8a5a3c');
      for (let k = 0; k < 3; k++) { const x = 6 + k * 66; r(x, 10, 58, 100, '#6a4529'); for (let i = 0; i < 4; i++) { r(x + 2, 14 + i * 24, 54, 2, '#4a2f1c'); for (let j = 0; j < 9; j++) r(x + 4 + j * 6, 16 + i * 24, 5, 18 - (j % 3) * 2, ['#ff9ac8', '#7cc4ff', '#ffd36e', '#8ad69a', '#b39bff', '#e8e8f4'][(i * 3 + j + k) % 6]); } }
      r(96, 0, 1, 26, '#333'); r(88, 26, 17, 7, '#ffd36e'); glow(97, 38, 28, '#ffd36e', .14 + .03 * Math.sin(f / 10)); r(150, 120, 34, 22, '#a8794a'); r(156, 112, 22, 8, '#fff'); },
    aquarium: h => { const { r, disc, glow, f } = h;
      ['#123a7a', '#164689', '#1b529a', '#1f5eab', '#2369b8', '#2b76c4', '#2f80cf', '#3a8fdb'].forEach((c, i) => r(0, i * 21, 200, 22, c));
      for (let i = 0; i < 6; i++) r((i * 41 + f * .5) % 220 - 10, 30 + (i * 23) % 90, 9, 3, i % 2 ? '#ffb21e' : '#ff7a5c');
      for (let i = 0; i < 3; i++) { const x = 40 + i * 55, y = 50 + Math.sin(f / 14 + i) * 10; disc(x, y, 9, '#ffb3d1'); for (let k = 0; k < 4; k++) r(x - 6 + k * 4, y + 3, 1, 10 + Math.sin(f / 6 + k) * 2, '#ffc6dc'); glow(x, y, 18, '#ffb3d1', .15); }
      r(0, 130, 200, 39, '#0a1d45'); for (let i = 0; i < 10; i++) r(i * 22 + ((f / 9) % 6), 124 - (i % 3) * 3, 3, 3, 'rgba(255,255,255,.5)'); }
  };

  // ================= QUESTS + EVENTS =================
  Object.assign(G.QUESTS, {
    arcade: { title: T("Ren's Secret Arcade", 'レンの秘密のゲーセン'), hints: [
      T('Save 40 coins, then visit the Shopping street to pay the membership fee.', '40コインを貯めて、商店街で会費を払おう。'),
      T('Meet Ren at the park for the grand-opening duel.', '公園でレンと開店記念の勝負をしよう。')] },
    books: { title: T("Haruka's Missing Book", 'ハルカの探し本'), hints: [
      T('Ask around the Hilltop shrine for an out-of-print book.', '丘の神社で絶版本の手がかりを探そう。'),
      T('Find Hoshino Books (behind the shrine) and buy the novel (30 coins).', '神社の裏の星野書店で小説を買おう（30コイン）。'),
      T('Bring the book to Haruka at the library.', '本を図書室のハルカに届けよう。')] }
  });
  G.questHint = () => { const l = G.questList().filter(q => !q.done); return l.length ? l[0].hint + (l.length > 1 ? ` (+${l.length - 1})` : '') : ''; };
  const q0 = G.questHtml;
  G.questHtml = () => q0() + `<h3>${t('j_extra')}</h3><ul><li>${t('j_rank', RANKS[S.rank][L()], S.shifts)}</li>${S.flags.kaito_met ? `<li>${t('j_rival', S.rival.lead)}</li>` : ''}<li>${t('j_outfit', OUTFITS[S.outfit][L()])}</li>${Object.keys(S.unlocked).length ? `<li>${t('j_areas', Object.keys(S.unlocked).map(k => t('loc_' + k)).join(', '))}</li>` : ''}</ul>`;

  G.RANDOM_EVENTS.push(
    // ----- rival -----
    E({ id: 'rival_intro', rep: false, slots: ['lunch', 'pm', 'after'], aff: [3, 20], we: false, title: T('A New Face', 'ライバル登場？'),
      setup: "Kaito Mori, the popular basketball-club classmate, strolls up to Yui's desk and asks her to explain the homework in front of the player. Yui flusters. Kaito notices the player and introduces himself with an easy grin. He is NOT a villain: friendly, confident, a little too smooth, and clearly enjoys Yui's company. Voice Kaito in narration only, never in <s>.",
      beats: ['Kaito chats easily with Yui; she gets visibly flustered and keeps glancing at the player.', 'Kaito leaves with a cheerful wave and a promise to see them around. Yui pretends she did not care.'],
      choices: [C(0, 'Kaito turns his friendly grin on you.', 'カイトが人懐っこい笑顔をこちらに向ける。', [
        O('chill', 'Greet him warmly', 'にこやかに挨拶する', 'The player greeted Kaito warmly.'),
        O('playful', 'Smile: "Careful, she bites."', '笑って「噛みつくから気をつけて」', 'The player joked that Yui bites.', 1, { stat: 'wit' }),
        O('nonchalant', 'Nod and look away', '軽くうなずいて目をそらす', 'The player gave a casual nod and looked away.', 0)])],
      done: () => { S.flags.kaito_met = S.day; }, fact: 'Kaito Mori, a popular basketball-club classmate, is friendly with Yui and the player.' }),
    E({ id: 'rival_lunch', slots: ['lunch'], aff: [4, 20], we: false, cd: 5, when: () => !!S.flags.kaito_met, title: T('Lunch Invitation', 'ランチのお誘い'),
      setup: 'At lunch Kaito invites Yui to eat with the basketball club. Yui hesitates and looks at the player. Kaito is cheerful and sincere, not pushy. Voice Kaito in narration only.',
      beats: ['Kaito reacts to the player. Yui looks between them, flustered and pleased and annoyed all at once.', 'The lunch bell fades. Yui mutters something about boys being impossible.'],
      choices: [C(0, 'Yui is looking at you, not at Kaito.', 'ユイはカイトではなく君を見ている。', [
        O('chill', 'Suggest eating all together', 'みんなで一緒に食べようと提案する', 'The player suggested everyone eat together.', 1, { fx: () => lead(-1) }),
        O('playful', 'Bet him a drink over the best seat', '席取りで飲み物を賭けようと挑む', 'The player bet Kaito a drink over who gets the better seat.', 0, { stat: 'charm', fx: duel }),
        O('nonchalant', 'Say "Have fun."', '「楽しんで」と言う', 'The player shrugged and said have fun.', -1, { fx: () => lead(1) })])],
      fact: 'Kaito invited Yui to lunch in front of the player.' }),
    E({ id: 'rival_contest', at: 'arrive', where: 'park', aff: [5, 20], cd: 4, when: () => !!S.flags.kaito_met && npcHere('kaito'), title: T('One-on-One', '一対一の勝負'),
      setup: 'Kaito is shooting hoops at the park. He spots the player and Yui and cheerfully challenges the player to a friendly one-on-one with Yui as referee. Yui insists she is only here by coincidence. Voice Kaito in narration only.',
      beats: ['The match gets loud and silly; Yui keeps score and pretends not to cheer.', 'Kaito offers a handshake, sweaty and grinning. Yui hands over water without a word.'],
      choices: [C(0, 'Kaito spins the ball on one finger.', 'カイトが指先でボールを回している。', [
        O('grit', 'Accept the challenge', '勝負を受ける', 'The player accepted Kaito\'s one-on-one challenge.', 1, { stat: 'grit', fx: duel }),
        O('playful', 'Counter-offer a quiz duel', 'クイズ対決を逆提案する', 'The player counter-offered a quiz duel.', 1, { stat: 'wit', fx: duel }),
        O('chill', 'Pass the ball to Yui', 'ユイにボールを回す', 'The player passed the ball to Yui and made it a team game.', 1, { fx: () => lead(-1) })])],
      fact: 'The player had a friendly one-on-one with Kaito while Yui watched.' }),
    E({ id: 'rival_festival', at: ['start', 'turn'], slots: ['lunch', 'after'], we: false, force: true, rep: false, aff: [10, 20], reward: { gems: 25, coins: 20 },
      when: () => !!S.flags.kaito_met && S.rival.lead >= 4, title: T('Festival Invitation', '花火大会の誘い'),
      setup: 'Kaito asks Yui to go to the summer festival with him, right in front of the player. He is sincere and cheerful, not pushy; Yui is cornered and flustered, glancing at the player. Keep it wholesome. Voice Kaito in narration only.',
      beats: ['Everyone waits. Yui twists her sleeve, unable to answer.', 'Yui makes her decision in her own awkward way, and Kaito takes it with good grace.'],
      choices: [C(0, 'Yui is stuck. Kaito is smiling. The clock is ticking.', 'ユイは固まっている。カイトは笑顔のまま。', [
        O('chill', 'Sincerely invite Yui yourself, first', '先に自分からユイを誘う', 'The player sincerely invited Yui to the festival before Kaito could.', 2, { fx: () => lead(-3) }),
        O('grit', 'Propose a friendly duel for the right', '誘う権利を賭けて勝負を申し込む', 'The player proposed a friendly duel with Kaito for the right to ask.', 1, { stat: 'grit', fx: duel }),
        O('nonchalant', 'Say "It is her call."', '「ユイが決めることだよ」と言う', "The player said it was Yui's call.", 0, { fx: () => lead(1) })])],
      done: () => { S.flags.kaito_festival = S.day; }, fact: 'Kaito invited Yui to the summer festival; the player stepped in.' }),
    // ----- quest: Ren's secret arcade (unlocks the Arcade) -----
    E({ id: 'q_arcade_offer', at: 'arrive', npc: 'ren', yui: false, force: true, cd: 4, when: () => qs('arcade').stage === -1 && (S.rel.ren || 0) >= 2 && npcHere('ren'), title: T("Ren's Secret", 'レンの秘密基地'),
      setup: 'Ren drags the player aside and whispers that he found a hidden arcade behind the shopping street. The owner only lets people in who pay a 40-coin membership fee, and Ren wants a partner. He is loud and hyped even when whispering.',
      beats: ['Ren sketches the map on his hand and rambles about high scores.', 'He swears the player to secrecy, badly.'],
      choices: [C(0, 'Ren is vibrating with excitement.', 'レンは興奮で震えている。', [
        O('chill', 'Say yes', '乗る', 'The player agreed to join Ren.', 1, Q('arcade', 0)),
        O('playful', 'Haggle: "Free token?"', '「トークンおまけは？」と値切る', 'The player haggled with Ren for a free token.', 1, { stat: 'charm', ...Q('arcade', 0) }),
        O('nonchalant', 'Laugh it off', '笑って流す', 'The player laughed it off.', 0)])],
      fact: 'Ren told the player about a hidden arcade.' }),
    E({ id: 'q_arcade_fee', at: 'arrive', where: 'shopping', yui: false, force: true, rep: false, when: () => qs('arcade').stage === 0 && S.coins >= 40, title: T('The Membership Fee', '会費の支払い'),
      setup: 'Behind the shopping street, the arcade owner, a sleepy man with a soldering iron behind his ear, looks the player over and holds out a hand for the 40-coin membership fee.',
      beats: ['The owner counts the coins twice and grunts approval.', 'He hands over a token card and tells the player to come back with Ren for the opening.'],
      choices: [C(0, 'The owner taps his open palm.', 'オーナーが手のひらをとんとん叩く。', [
        O('chill', 'Pay the full fee', '満額を払う', 'The player paid the full membership fee.', 1, { coins: -40, ...Q('arcade', 1) }),
        O('playful', 'Try: "Student discount?"', '「学割ありますか？」と聞く', 'The player tried to get a student discount.', 1, { stat: 'charm', coins: -30, ...Q('arcade', 1) })])] }),
    E({ id: 'q_arcade_duel', at: 'arrive', where: 'park', npc: 'ren', yui: false, force: true, rep: false, reward: { gems: 25, coins: 20 }, when: () => qs('arcade').stage === 1 && npcHere('ren'),
      done: () => { qs('arcade').stage = 2; unlock('arcade'); }, title: T('Grand Opening Duel', '開店記念デュエル'),
      setup: 'Ren leads the player through a hidden door into the arcade for the grand-opening high-score duel, bouncing off the walls with joy. Even if the player loses he is delighted: he finally has a partner.',
      beats: ['Neon, beeping cabinets and Ren narrating the duel like a sports commentator.', 'Ren hands over a membership card and swears the arcade is theirs now.'],
      choices: [C(0, 'Two joysticks. One high score.', 'ジョイスティックが二つ。ハイスコアは一つ。', [
        O('grit', 'Go all out', '全力で挑む', 'The player went all out in the duel.', 1, { stat: 'grit' }),
        O('nonchalant', 'Play it cool and read his patterns', 'クールに癖を読む', 'The player stayed cool and read Ren\'s patterns.', 1, { stat: 'wit' }),
        O('playful', 'Cheer for the machine instead', 'あえて筐体を応援する', 'The player cheered for the machine instead of themselves.', 1)])],
      fact: 'The player and Ren opened a secret arcade together.' }),
    // ----- quest: Haruka's missing book (unlocks the Bookstore) -----
    E({ id: 'q_books_offer', at: 'arrive', where: 'library', npc: 'haruka', yui: false, force: true, cd: 4, when: () => qs('books').stage === -1 && (S.rel.haruka || 0) >= 2 && npcHere('haruka'), title: T('An Out-of-Print Request', '絶版本の依頼'),
      setup: 'Haruka quietly asks the player for a favor: the student council library is missing one out-of-print volume. She heard the old caretaker of the hilltop shrine knows where old books end up. She asks politely, deadpan, but clearly it matters to her.',
      beats: ['Haruka writes the title on a slip of paper in neat handwriting.', 'She says thank you with a very small bow and a half-smile.'],
      choices: [C(0, 'Haruka holds out the slip of paper.', 'ハルカがメモを差し出す。', [
        O('chill', 'Accept the request', '引き受ける', 'The player accepted Haruka\'s request.', 1, Q('books', 0)),
        O('playful', 'Accept with a mock salute', '敬礼して引き受ける', 'The player accepted with a mock salute.', 1, Q('books', 0)),
        O('nonchalant', '"I will think about it."', '「考えておくよ」', 'The player said they would think about it.', 0)])],
      fact: 'Haruka asked the player to find an out-of-print book.' }),
    E({ id: 'q_books_shrine', at: 'arrive', where: 'shrine', yui: false, force: true, rep: false, when: () => qs('books').stage === 0, title: T("The Caretaker's Hint", '宮司さんのヒント'),
      setup: 'At the hilltop shrine the elderly caretaker sweeps leaves and, after some cryptic grumbling, points to a mossy path behind the shrine steps: a tiny secondhand bookshop called Hoshino Books hides there. He wants the player to promise to buy something.',
      beats: ['The path winds past stone lanterns to a crooked little shop front.', 'The caretaker chuckles that very few people ever find it.'],
      choices: [C(0, 'The caretaker leans on his broom, waiting.', '宮司さんはほうきにもたれて待っている。', [
        O('chill', 'Thank him and promise to buy something', 'お礼を言って、何か買うと約束する', 'The player thanked the caretaker and promised to buy something.', 1, { fx: () => unlock('bookstore'), ...Q('books', 1) }),
        O('playful', 'Haggle for a directions discount', '道案内の割引を交渉する', 'The player jokingly haggled for a directions discount.', 1, { stat: 'charm', fx: () => unlock('bookstore'), ...Q('books', 1) }),
        O('grit', 'Help sweep leaves first', '先に落ち葉掃きを手伝う', 'The player helped sweep leaves first.', 1, { min: 30, fx: () => unlock('bookstore'), ...Q('books', 1) })])],
      fact: 'The shrine caretaker revealed a hidden bookshop behind the shrine.' }),
    E({ id: 'q_books_return', at: 'arrive', where: 'library', npc: 'haruka', yui: false, force: true, rep: false, reward: { gems: 30, coins: 25 },
      when: () => qs('books').stage === 2 && (S.inventory.novel || 0) > 0 && npcHere('haruka'), done: () => grantOutfit('blazer'), title: T('Mission Complete', '依頼完了'),
      setup: 'The player hands Haruka the out-of-print novel. For once her composure slips: a wide-eyed pause, then a rare real smile. She insists on paying the player back in tea, politely, and quietly declares the player a friend of the library.',
      beats: ['Haruka turns the book over reverently and checks the spine twice.', 'She gives the player a small gift in return and says it suits them.'],
      choices: [C(0, 'Haruka is holding the book very carefully.', 'ハルカは本をそっと抱えている。', [
        O('chill', 'Hand it over with a smile', '笑顔で手渡す', 'The player handed over the book with a smile.', 2, { fx: () => { S.inventory.novel = Math.max(0, (S.inventory.novel || 1) - 1); }, ...Q('books', 3) }),
        O('nonchalant', 'Slide it across: "Found it."', '「見つけたよ」と滑らせて渡す', 'The player casually slid the book across and said found it.', 1, { fx: () => { S.inventory.novel = Math.max(0, (S.inventory.novel || 1) - 1); }, ...Q('books', 3) })])],
      fact: 'The player found the missing book for Haruka and earned the council library\'s trust.' }),
    // ----- aquarium (unlocked by finishing the charm quest) -----
    E({ id: 'aquarium_date', at: 'arrive', where: 'aquarium', aff: [8, 20], force: true, rep: false, reward: { gems: 25, coins: 15 }, when: () => G.where('yui') === 'aquarium', title: T('Jellyfish Hour', 'クラゲの時間'),
      setup: 'Yui is at the aquarium, standing in front of the jellyfish tank in the blue dimness, pretending she only came for a school report. She goes quiet and unusually soft here. Keep it wholesome and gentle.',
      beats: ['Yui watches the jellyfish drift and asks the player in a low voice what they think the jellyfish are thinking about.', 'She admits, almost to the glass, that she likes how quiet it is here.'],
      choices: [C(0, 'The tank glows blue across her face.', '水槽の青い光が彼女の横顔を照らす。', [
        O('chill', 'Stand beside her in silence', '黙って隣に立つ', 'The player stood quietly beside Yui.', 2),
        O('playful', 'Narrate what the jellyfish is thinking', 'クラゲの気持ちを勝手にアテレコする', 'The player voiced what the jellyfish was thinking.', 1, { stat: 'wit' }),
        O('nonchalant', 'Point at a fish: "That one is you."', '魚を指して「あれ、君に似てる」', 'The player pointed at a fish and said that one is Yui.', 1)])],
      fact: 'Yui showed a quiet, soft side at the aquarium.' })
  );
  const qc = G.RANDOM_EVENTS.find(e => e.id === 'q_charm_return'); // finishing the charm quest unlocks the aquarium
  if (qc) { const d0 = qc.done; qc.done = () => { if (d0) d0(); unlock('aquarium'); }; }

  // ================= prompt additions + hooks =================
  const pe0 = G.promptExtra;
  G.promptExtra = c => {
    let out = pe0 ? pe0(c) : ''; const o = OUTFITS[S.outfit];
    if (o && S.outfit !== 'uniform') out += `\nOUTFIT: the player is wearing ${o.tag}. ${c.outfitNew ? `Yui sees it for the first time today: she reacts to it in THIS reply (guide: ${o.yui})` : 'Do not mention it again unless it fits naturally.'}`;
    if (S.flags.kaito_met) out += `\nRIVAL: Kaito Mori (popular, friendly basketball-club classmate, NOT a villain) keeps inviting Yui places. His pull on Yui is ${S.rival.lead}/10. At 5 or more, Yui occasionally mentions his invitations to tease the player and secretly test their reaction.`;
    if (S.shifts) out += `\nJOB: the player works part-time at Cafe Komorebi as ${RANKS[S.rank].en} (${S.shifts} shifts).`;
    return out;
  };
  G.on('scene', () => {
    const d = daily(), sl = G.story.slot();
    if (!COMMON.includes(S.loc)) d.v[S.loc] = 1;
    if (sl.id === 'lunch' && G.story.present() && !S.talk && !S.phone && !S.pendingChoice) d.c.lunch = 1;
    if (S.eventsDone.includes('fireworks')) grantOutfit('yukata');
    check(); labels();
  });
  G.on('lang', labels);
  Object.keys(S.unlocked).forEach(addPlace); applyCafe(); labels();
})();