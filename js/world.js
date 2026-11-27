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
    mika: { en: 'Mika', ja: 'ミカ',
      brief: 'Mika, 26, owner of Cafe Komorebi. WARM BIG-SISTER type: unhurried, nurturing, openly affectionate and direct. Teases with a grin but never hides her feelings. Notices what people are not saying and gently draws it out. Loves feeding people, calls the player "kiddo". Knows gossip about Yui and hints at it.',
      voice: { en: 'relaxed, kind, a little playful, full sentences ("oh?", "come here, kiddo")', ja: 'ゆったり優しい姉御口調（〜だね、〜かな、あらあら）' },
      react: { great: 'Mika is delighted and openly touched; she laughs warmly, ruffles the player\'s hair and says something genuinely kind.', flustered: 'Mika is caught off guard for a second, then recovers and teases the player back with an easy laugh.', corny: 'Mika bursts out laughing kindly, pats the player, and gives a gentle, honest tip.' } },
    ren: { en: 'Ren', ja: 'レン',
      brief: 'Ren, 17, classmate and arcade regular. GENKI HYPE-MAN type: loud, endlessly upbeat, goofy and competitive in a friendly way. Says exactly what he thinks, zero shyness, never flustered or in denial. Turns everything into a game or a bet. Gets serious only when a friend is down.',
      voice: { en: 'energetic and slangy, exclamation marks, "dude", "no way!"', ja: 'ノリの良い男子口調（〜だぜ、マジで、すげえ！）' },
      react: { great: 'Ren is hyped and thrilled, shouts encouragement and throws an arm around the player.', flustered: 'Ren blinks, then grins and turns it into a big joke or a challenge.', corny: 'Ren cackles and roasts the player, unfiltered but clearly still friendly.' } },
    haruka: { en: 'Haruka', ja: 'ハルカ',
      brief: 'Haruka, 18, student council president. COOL KUUDERE type: composed, formal and deadpan, precise and polite, with dry humor. Emotion shows only in tiny actions (adjusting her glasses, pouring tea, a half-smile). Sincere and loyal, and answers honestly when asked directly. She is reserved, not tsundere: no stuttering, no insulting to hide feelings.',
      voice: { en: 'polite, measured, understated, occasionally dryly witty', ja: 'です・ます調の丁寧語で淡々と、時々ドライな冗談' },
      react: { great: 'Haruka goes quiet, a small real smile appears, and she sincerely thanks the player.', flustered: 'Haruka pauses, adjusts her glasses and calmly changes the subject, with one slightly pink ear as the only tell.', corny: 'Haruka gives a flat, deadpan assessment of why that did not work, politely.' } },
    sato: { en: 'Granny Sato', ja: 'サトウばあちゃん',
      brief: 'Granny Sato, 70s, runs the shop on the shopping street. SALTY ELDER type: blunt, shrewd and funny, folksy, haggles for sport, gossips, and hides life advice inside complaints. Softhearted underneath but never embarrassed about it.',
      voice: { en: 'folksy, cheeky, a bit grumbly ("young one", "hmph, back in my day")', ja: 'おばあちゃん口調（〜だよ、〜じゃないか、あんた）' },
      react: { great: 'Sato cackles with delight, slips the player a free treat and says "you will go far".', flustered: 'Sato snorts, swats the player with her fan and says something cheeky.', corny: 'Sato squints, tells the player that line would not fool a cat, and laughs.' } }
  };
  const YUI_REACT = {
  great: 'Yui is genuinely moved; her tsundere shell cracks and a sincere, soft reaction slips out before she panics.',
  flustered: 'Yui is flustered and goes full tsundere: blushes, denies everything, snaps "b-baka" while clearly pleased.',
  corny: 'Yui finds it corny and cringes: dry, withering, a little embarrassed for the player, though not cruel.'
  };
  G.tierNote = tier => (S.talk && CAST[S.talk] ? CAST[S.talk].react : YUI_REACT)[tier];
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
    if (S.talk && !S.eventRun && G.where(S.talk) !== S.loc) S.talk = null;
    const names = G.peopleAt(S.loc).filter(id => id !== S.talk).map(id => id === 'yui' ? 'Yui' : CAST[id].en);
    let out = `WORLD: the player has ${S.coins} coins. OTHERS HERE: ${names.join(', ') || 'nobody'} (they can be mentioned or walk into the scene, but never speak for them in <s>).`;
    out += '\nCAST RULE: ONLY Yui is a tsundere. Every other character has a clearly different personality and speech style and must NEVER use tsundere habits (stuttering "b-baka", denying obvious feelings, insulting to hide affection).';
    if (S.talk) { const c = CAST[S.talk]; out += `\nSPEAKER: the player is talking to ${c.en}, NOT Yui. ${c.brief} VOICE: ${c.voice[L()]}. Friendliness toward the player: ${S.rel[S.talk] || 0}/10. Put ${c.en}'s words in <s>; affection_delta applies to ${c.en}.`; }
    return out;
  };

  // ---------- places, jobs, shop ----------
  const PLACES = G.PLACES = {
    bedroom: { open: [0, 24], acts: [] },
    cafe: { open: [10, 20], acts: [
      { min: 120, pay: [25, 40], need: 'mika', en: 'Work a shift (2h)', ja: 'バイトをする（2時間）', prompt: 'The player works a shift at Cafe Komorebi under Mika: trays, latte art, a funny customer. Narrate the shift.' },
      { train: 'craft', min: 60, cost: 6, en: 'Bake cookies (1h, 6) · Craft', ja: 'クッキーを焼く（1時間, 6）· 器用さ', prompt: 'The player bakes cookies in the cafe kitchen as practice. Narrate the baking.' },
      { min: 30, cost: 12, en: 'Order a drink (12)', ja: 'ドリンクを頼む (12)', prompt: 'The player sits down and orders a drink at the cafe. Narrate it.' }] },
    shopping: { open: [9, 18], acts: [
      { min: 90, pay: [18, 28], need: 'sato', en: 'Help Granny Sato (90 min)', ja: 'サトウばあちゃんを手伝う（90分）', prompt: 'The player helps Granny Sato stock shelves and mind the register. Narrate the work.' }] },
    library: { open: [9, 18], acts: [
      { train: 'wit', min: 60, en: 'Study (1h) · Wit', ja: '勉強する（1時間）· 知恵', prompt: 'The player studies hard at the library. Narrate the session.' },
      { min: 60, pay: [12, 20], en: 'Shelve books (1h)', ja: '本の整理（1時間）', prompt: 'The player volunteers to shelve returned books for a small allowance. Narrate the quiet work.' }] },
    park: { open: [6, 21], acts: [
      { train: 'grit', min: 45, en: 'Jog laps (45 min) · Grit', ja: 'ジョギング（45分）· 根性', prompt: 'The player jogs laps around the park pond. Narrate the effort.' },
      { min: 30, en: 'Take a walk (30 min)', ja: '散歩する（30分）', prompt: 'The player takes a slow walk through the park. Narrate it.' }] },
    riverside: { open: [6, 21], acts: [
      { train: 'charm', min: 45, en: 'Practice lines (45 min) · Charm', ja: 'セリフの練習（45分）· 魅力', prompt: 'The player rehearses charming lines alone by the river, feeling a bit silly. Narrate it.' },
      { min: 30, en: 'Skip stones (30 min)', ja: '水切りをする（30分）', prompt: 'The player skips stones across the river. Narrate it.' }] },
    shrine: { open: [6, 20], acts: [
      { min: 10, cost: 5, en: 'Draw a fortune (5)', ja: 'おみくじ (5)', prompt: () => `The player draws an omikuji fortune: ${['great blessing', 'blessing', 'small blessing', 'a bad omen to tie to the tree'][Math.floor(Math.random() * 4)]}. Narrate it.` },
      { min: 10, en: 'Pray (10 min)', ja: 'お参りする（10分）', prompt: 'The player offers a quiet prayer at the shrine. Narrate the moment.' }] }
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
  async function act(a) {
    if (G.story.busy()) return G.toast(t('busy'));
    if (a.cost && S.coins < a.cost) { G.sfx('error'); return G.toast(t('no_coins')); }
    let extra = '';
    if (a.train) {
      const r = await G.train(a.train, a[L()]);
      extra = ` The practice went ${r.m >= .85 ? 'brilliantly' : r.m >= .65 ? 'well' : r.m >= .4 ? 'okay' : 'badly'}.`;
      G.story.sep(`${t('st_' + a.train)} +${r.gain} XP (Lv.${G.level(a.train)})`);
    }
    const pay = a.pay ? a.pay[0] + Math.floor(Math.random() * (a.pay[1] - a.pay[0] + 1)) : 0;
    S.coins += pay - (a.cost || 0); S.minute = Math.min(1439, S.minute + (a.min || 10));
    if (pay) { G.toast(t('earned', pay)); G.sfx('chime'); }
    spend(`${typeof a.prompt === 'function' ? a.prompt() : a.prompt}${extra} (${a.min || 10} minutes pass${pay ? `; the player is paid ${pay} coins` : ''}.)`);
  }
  
  // ---------- social actions: base chance + minigame + stat decide the reaction ----------
  const SOCIAL = [
    { stat: 'charm', base: .30, en: 'Flirt', ja: '口説く', note: 'The player tries to sweet-talk {n} with a smooth compliment.' },
    { stat: 'wit', base: .40, en: 'Banter', ja: '軽口を叩く', note: 'The player trades playful banter with {n}, trying to land a witty line.' },
    { stat: 'grit', base: .35, en: 'Show off', ja: 'かっこつける', note: 'The player tries to impress {n} with a show of courage or skill.' },
    { stat: 'craft', base: .40, en: 'Share a homemade snack', ja: '手作りおやつを渡す', note: 'The player offers {n} a snack they made themselves.' }
  ];
  async function social(a) {
    if (G.story.busy()) return G.toast(t('busy'));
    const who = S.talk || 'yui', name = who === 'yui' ? 'Yui' : CAST[who].en;
    const bond = (who === 'yui' ? S.affection / 20 : (S.rel[who] || 0) / 10) * .1 + (who === 'yui' ? ({ happy: .05, annoyed: -.05 }[G.moodId()] || 0) : 0);
    const res = await G.rollAction(a.stat, { base: a.base, bonus: bond, label: a[L()] });
    G.addXp(a.stat, 1);
    const delta = { great: 2, flustered: 1, corny: -1 }[res.tier], said = $('#said'), line = said.value.trim(), what = a.note.replace('{n}', name);
    said.value = ''; G.story.sep(G.chanceLine(res));
    G.story.send(line || `*${what}*`, { forceDelta: delta, note: `${what} OUTCOME (decided by the game, follow it exactly): ${G.tierNote(res.tier)}` });
  }
  const NPC_EVENTS = G.NPC_EVENTS = [
    { id: 'mika_rush', npc: 'mika', rel: 3, loc: 'cafe', time: 750, title: { en: "Mika's Lunch Rush", ja: 'ミカのランチ戦争' },
      setup: "Cafe Komorebi is slammed at lunch and Mika's part-timer called in sick. She asks the player to help on the floor.",
      beats: ['Orders pile up; Mika coaches the player through the chaos with a grin.', 'A regular teases the player; Mika lets you flounder a moment, then bails you out.', 'The rush ends; Mika slides a drink across the counter and tells why she opened the cafe.'],
      choice: { at: 1, ask: { en: 'Orders are stacking up.', ja: '注文が溜まってきた。' }, options: [
        { en: 'Take over the espresso machine', ja: 'エスプレッソ係を引き受ける', stat: 'craft', note: 'The player took over the espresso machine.', delta: 1 },
        { en: 'Ask Mika for a shortcut', ja: 'コツを教えてもらう', note: 'The player humbly asked Mika for a shortcut.', delta: 1 }] } },
    { id: 'ren_stones', npc: 'ren', rel: 3, loc: 'riverside', time: 1020, title: { en: 'Stone-Skipping Showdown', ja: '水切り対決' },
      setup: 'Ren spots the player at the river and loudly challenges them to a stone-skipping contest. Loser buys drinks.',
      beats: ['Ren trash-talks cheerfully while picking the perfect stone.', 'The contest gets tense; Ren is bad at losing but great at cheering.', 'Sunset. Ren admits he is nervous about exams, then jokes it away.'],
      choice: { at: 1, ask: { en: "Ren's stone skips six times.", ja: 'レンの石が6回跳ねた。' }, options: [
        { en: 'Go all in on the next throw', ja: '本気で投げる', stat: 'grit', note: 'The player went all in on their throw.', delta: 1 },
        { en: 'Hype him up instead', ja: '盛り上げる', note: 'The player cheered Ren on instead of competing.', delta: 1 }] } },
    { id: 'haruka_paper', npc: 'haruka', rel: 4, loc: 'library', time: 1000, title: { en: "Haruka's Paperwork", ja: 'ハルカの書類仕事' },
      setup: 'Haruka is buried in student council festival paperwork in the library, calmly pretending it is fine. The player offers help.',
      beats: ['Haruka explains the budget sheet in a perfectly level voice, then mentions the deadline is tonight.', 'A long quiet stretch of work. She pours two cups of tea without being asked.', 'The last page is signed. She says a quiet, sincere thank you.'],
      choice: { at: 1, ask: { en: 'The numbers do not add up.', ja: '数字が合わない。' }, options: [
        { en: 'Hunt for the error', ja: 'ミスを探す', stat: 'wit', note: 'The player went hunting for the error in the budget.', delta: 1 },
        { en: 'Brew her fresh tea', ja: 'お茶を淹れ直す', stat: 'craft', note: 'The player brewed fresh tea for Haruka.', delta: 1 }] } },
    { id: 'sato_parcel', npc: 'sato', rel: 3, loc: 'shopping', time: 840, title: { en: "Granny Sato's Delivery", ja: 'サトウばあちゃんの配達' },
      setup: 'Granny Sato needs a parcel delivered across the shopping street and grumbles that her knees are not what they were. She shares gossip on the way.',
      beats: ['Sato loads the player up and gives bossy directions, with gossip about half the street.', 'A shopkeeper tries to haggle the player into a bad deal; Sato glares from afar.', 'Back at the shop, Sato pretends to be unimpressed and presses a snack into the player\'s hand.'],
      choice: { at: 1, ask: { en: 'A shopkeeper pushes a hard bargain.', ja: '店主がしつこく値切ってくる。' }, options: [
        { en: 'Charm your way to a fair deal', ja: '愛想よく交渉する', stat: 'charm', note: 'The player charmed the shopkeeper into a fair price.', delta: 1 },
        { en: 'Stand firm politely', ja: '丁寧に断る', stat: 'grit', note: 'The player stood firm politely.', delta: 1 }] } }
  ];
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
      const target = S.talk || (G.story.present() ? 'yui' : null);
      folks.forEach(id => id !== S.talk && btns.push([t('talk_to', id === 'yui' ? 'Yui' : CAST[id].en), () => talk(id)]));
      if (S.talk && G.yuiHere() && !folks.includes('yui')) btns.push([t('talk_to', 'Yui'), () => talk('yui')]);
      if (target) SOCIAL.forEach(a => btns.push([`${a[L()]} · ${t('st_' + a.stat)}`, () => social(a), 'alt']));
      NPC_EVENTS.forEach(ev => { if (!S.eventsDone.includes(ev.id) && (S.rel[ev.npc] || 0) >= ev.rel && G.where(ev.npc) === S.loc) btns.push(['★ ' + ev.title[L()], () => G.startEvent(ev), 'alt']); });
      if (p && h >= p.open[0] && h < p.open[1]) {
        p.acts.filter(a => !a.need || G.where(a.need) === S.loc).forEach(a => btns.push([a[L()], () => act(a)]));
        if (S.loc === 'shopping' && G.where('sato') === 'shopping') G.ITEMS.filter(i => i.shop).forEach(it => btns.push([`${G.itemName(it)} (${it.shop})`, () => buy(it)]));
      }
    }
    const sig = btns.map(b => b[0]).join('|'); bar.hidden = !btns.length;
    if (bar.dataset.sig === sig) return; bar.dataset.sig = sig; bar.innerHTML = '';
    btns.forEach(([label, fn, cls]) => { const b = el('button', 'chip-btn' + (cls ? ' ' + cls : ''), esc(label)); b.type = 'button'; b.addEventListener('click', fn); bar.append(b); });
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