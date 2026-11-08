// js/core.js: state, i18n, audio, wide stage, dashboard, menu, API key gate
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const jget = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const jset = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const params = new URLSearchParams(location.search);
  const G = window.G = { $, $$, clamp, params, jget, jset, listeners: {}, pages: {}, game: $('#game') };
  G.on = (e, f) => (G.listeners[e] ||= []).push(f);
  G.emit = (e, ...a) => (G.listeners[e] || []).forEach(f => f(...a));

  // Models: main first, fallback second
  G.MODELS = ['gemini-3.5-flash-lite', 'gemini-3.1-flash-lite'];
  G.API = 'https://generativelanguage.googleapis.com/v1beta';
  // Voice clips: number of files per emotion in assets/voice/<emotion>_<n>.mp3 (same clips for EN and JA)
  const VOICE = {}; // e.g. { smug: 2, soft: 3, flustered: 2 }

  if (params.has('reset')) localStorage.removeItem('tsun.save');

  // ---------- settings ----------
  const DEFAULTS = { lang: 'en', master: 80, music: 40, sfx: 70, voice: 90, mute: false, speed: 'normal', subs: true,
    reduceMotion: matchMedia('(prefers-reduced-motion: reduce)').matches };
  G.settings = { ...DEFAULTS, ...jget('tsun.settings', {}) };
  G.cps = () => params.has('selftest') ? Infinity : ({ slow: 22, normal: 48, fast: 100, instant: Infinity })[G.settings.speed] ?? 48;
  G.setSetting = (k, v) => { G.settings[k] = v; jset('tsun.settings', G.settings); applySettings(); };

  // ---------- state ----------
  const DEF = () => ({
    username: 'mennminnmiiii', coins: 50, gems: 50, affection: 0, day: 1, minute: 420, slot: 0, slotTurns: 0,
    loc: 'bedroom', weather: 'clear', entries: [], memories: [], gifts: [], inventory: {}, pulls: 0, pity: 0,
    eventsDone: [], cgs: [], streak: 0, lastLogin: '', awayDays: 0, greeted: true, giftReady: false,
    eventRun: null, phone: false, intro: false, dailyQ: '', dailyAsked: 0, pendingChoice: null
  });
  const S = G.S = Object.assign(DEF(), jget('tsun.save', {}));
  G.save = () => { S.entries = S.entries.slice(-60); jset('tsun.save', S); };
  const STAGE_MAX = [3, 8, 13, 18, 20];
  G.stageIdx = a => { const i = STAGE_MAX.findIndex(m => a <= m); return i < 0 ? 4 : i; };
  G.clock = (m = S.minute) => `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  G.moodId = () => { const h = Math.floor(S.minute / 60); return h < 10 ? 'tired' : h < 18 ? 'annoyed' : 'happy'; };
  G.nextEvent = () => (G.EVENTS || []).find(e => !S.eventsDone.includes(e.id));

  // ---------- i18n ----------
  const STR = {
    en: {
      nav_home: 'Home', nav_story: 'Journal', nav_chat: 'Chat', nav_gacha: 'Gacha', nav_shop: 'Shop',
      stat_aff: 'Affection Lv.', stat_day: 'Day', tab_mission: 'Mission', tab_event: 'Event',
      q_menu: 'Menu', q_gift: 'Gift', q_notice: 'Notice',
      mission_next: (min, title) => `Reach affection ${min}<br>for "${title}"`,
      mission_ready: title => `Event ready!<br>"${title}"`,
      mission_done: 'All events cleared!<br>Enjoy your days with Yui', event_new: 'New event',
      mood: { tired: { label: 'Mood: sleepy', line: "It's too early to be this loud.\nTone it down, okay?" },
        annoyed: { label: 'Mood: grumpy', line: "I'm not angry.\nCan't you tell?" },
        happy: { label: 'Mood: kinda good', line: "Today's... fine.\nNot because you showed up." } },
      click: ["W-what are you staring at?\nSpeak up if you need something.", "Stop poking me.\n...But I'll react, I guess.", "You again?\nNot that I mind."],
      idle: ["You've been staring forever.\nIdiot, it's embarrassing.", "If you're going to leave me hanging,\nat least come back."],
      greet: "I'm not noticeable.\nBut somehow I'm needed anyway.",
      gift_line: "Today's present.\nD-don't get the wrong idea. It was a spare.",
      gift_got: (g, c) => `Daily present: +${g} gems, +${c} coins`, gift_done: 'Already claimed today. Come back tomorrow.',
      toast_mission: "Today's goal: spend time with Yui.", toast_notice: 'No new notices. Probably.', toast_shop: 'The shop is coming soon.',
      toast_profile: 'Tap the pencil to change your name.', name_saved: 'Name updated', event_locked: (t, n) => `Locked: "${t}" needs ${n} affection`,
      all_events_done: 'All events cleared. More coming soon!', streak: n => `Streak: ${n} day${n === 1 ? '' : 's'}`,
      menu_title: 'Menu', m_lang: 'Language', m_audio: 'Audio', m_master: 'Master', m_music: 'Music', m_sfx: 'Sound effects', m_voice: 'Voice',
      m_mute: 'Mute everything', m_text: 'Text', m_speed: 'Text speed', sp_slow: 'Slow', sp_normal: 'Normal', sp_fast: 'Fast', sp_instant: 'Instant',
      m_subs: 'Show English subtitles (Japanese mode)', m_access: 'Accessibility', m_motion: 'Reduce motion (no shake, no falling petals)',
      m_account: 'API key', m_data: 'Save data', m_change_key: 'Change key', m_reset: 'Reset progress', m_reset_ask: 'Reset ALL progress? This cannot be undone.',
      m_keyset: k => `Key in use: ${k}`, close: 'Close',
      gate_title: 'Date-A-Tsundere', gate_text: "Yui runs on Google's Gemini. Paste your own API key to play. It stays in this browser and is only sent to Google.",
      gate_link: 'Get a free key', gate_remember: 'Remember on this device', gate_go: 'Start', gate_checking: 'Checking key...',
      gate_bad: "That key didn't work. Check it and try again.", gate_invalid: 'Your key was rejected. Enter a valid key to continue.', gate_net: 'Could not reach Google. Check your connection.',
      chat_title: 'Story with Yui', home_btn: 'Home', menu_btn: 'Menu', placeholder: 'Say something, or *do* something...', send: 'Send',
      gift: 'Gift', gift_empty: 'Nothing yet. Try the Gacha!', gift_away: "Yui isn't here right now.", thinking: 'Yui is typing...',
      retry: 'Retry', err: "Yui didn't answer. Check your key or connection.", busy: 'Wait for Yui to finish.',
      day: 'Day', stage: ['Acquaintance', 'Classmate', 'Friend', 'Close', 'Smitten'],
      loc_bedroom: 'Your room', loc_home: 'Living room', loc_yui_room: "Yui's room (texting)", loc_street: 'School route', loc_classroom: 'Classroom',
      loc_cafeteria: 'Cafeteria', loc_rooftop: 'Rooftop', loc_park: 'Park', loc_library: 'Library', loc_school_gate: 'School gate',
      slot_wake: 'Morning', slot_commute: 'Commute', slot_am: 'Morning classes', slot_lunch: 'Lunch', slot_pm: 'Afternoon classes', slot_after: 'After school',
      slot_evening: 'Evening', slot_night: 'Night',
      next_wake: 'Head to school', next_commute: 'Go to class', next_am: 'Lunch break', next_lunch: 'Afternoon classes', next_pm: 'After school',
      next_after: 'Go home', next_evening: 'Get ready for bed', next_night: '',
      ask_lunch: 'Where do you eat lunch?', lunch_cafeteria: 'The cafeteria', lunch_rooftop: 'The rooftop', lunch_classroom: 'Stay in the classroom',
      ask_after: 'School is over. Where to?', after_park: 'Walk to the park', after_library: 'Study at the library', after_home: 'Head home',
      ask_night: 'It is late. What do you do?', night_text: 'Text Yui', night_sleep: 'Go to sleep', locked_aff: n => `Needs affection ${n}`,
      event_start: 'Event: ', event_clear: t => `Event cleared: ${t}  +10 gems, +20 coins`, milestone: n => `Relationship: ${n}`, aff_up: n => `+${n} affection`, aff_down: n => `${n} affection`,
      gacha_title: 'Gift Gacha', gacha_pull1: 'Pull x1 (10 gems)', gacha_pull10: 'Pull x10 (90 gems)', gacha_pity: n => `Guaranteed SSR in ${n} pulls`,
      gacha_inv: 'Your gifts', gacha_noGems: 'Not enough gems.', gacha_tip: 'Give gifts to Yui from the Story page.', gems: 'gems',
      j_title: 'Journal', j_events: 'Events', j_cgs: 'Memories (CG)', j_mem: 'Yui remembers', j_gifts: 'Gifts given', j_none: 'Nothing yet.', j_locked: 'Locked',
      cg_tap: 'Tap to continue', cg_unlock: 'New memory unlocked!'
    },
    ja: {
      nav_home: 'ホーム', nav_story: '日記', nav_chat: 'チャット', nav_gacha: 'ガチャ', nav_shop: 'ショップ',
      stat_aff: '好感度Lv.', stat_day: '日数', tab_mission: 'ミッション', tab_event: 'イベント',
      q_menu: 'メニュー', q_gift: 'プレゼント', q_notice: 'お知らせ',
      mission_next: (min, title) => `好感度${min}で<br>「${title}」`,
      mission_ready: title => `イベント解放！<br>「${title}」`,
      mission_done: '全イベントクリア！<br>ユイとの日々を楽しもう', event_new: '新しいイベント',
      mood: { tired: { label: '機嫌: ねむい', line: '朝から元気すぎ。\n少しは静かにしなさいよ。' },
        annoyed: { label: '機嫌: むすっ', line: 'べ、別に怒ってない。\n見ればわかるでしょ。' },
        happy: { label: '機嫌: ちょっと良い', line: '今日はまあまあ。\nあんたが来たからじゃないけど。' } },
      click: ['な、なに見てるのよ。\n用があるなら言いなさい。', 'クリックしすぎ。\nでも反応してあげる。', 'また来たの？\n別に嫌じゃないけど。'],
      idle: ['さっきから見すぎ。\nばか、照れるでしょ。', '放置するならするで、\nちゃんと戻ってきなさいよ。'],
      greet: '私は、目立たない。\nでも、誰より必要とされてる。',
      gift_line: '今日のプレゼント。\nか、勘違いしないで。余っただけ。',
      gift_got: (g, c) => `デイリープレゼント: ジェム+${g}、コイン+${c}`, gift_done: '今日はもう受け取り済み。また明日。',
      toast_mission: '今日の目標: ユイと過ごすこと。', toast_notice: '新しいお知らせはない。たぶん。', toast_shop: 'ショップは準備中だよ。',
      toast_profile: '鉛筆ボタンで名前を変更できるよ。', name_saved: '名前を更新しました', event_locked: (t, n) => `「${t}」は好感度${n}で解放`,
      all_events_done: 'イベントは全部クリア！続きはお楽しみに', streak: n => `連続ログイン: ${n}日`,
      menu_title: 'メニュー', m_lang: '言語', m_audio: 'サウンド', m_master: '全体', m_music: 'BGM', m_sfx: '効果音', m_voice: 'ボイス',
      m_mute: 'すべてミュート', m_text: 'テキスト', m_speed: '文字の速さ', sp_slow: 'ゆっくり', sp_normal: 'ふつう', sp_fast: 'はやい', sp_instant: '即時',
      m_subs: '英語字幕を表示（日本語モード）', m_access: 'アクセシビリティ', m_motion: 'モーションを減らす（揺れ・花びらなし）',
      m_account: 'APIキー', m_data: 'セーブデータ', m_change_key: 'キーを変更', m_reset: '進行をリセット', m_reset_ask: '進行を全部リセットしますか？元に戻せません。',
      m_keyset: k => `使用中のキー: ${k}`, close: '閉じる',
      gate_title: 'Date-A-Tsundere', gate_text: 'ユイはGoogleのGeminiで動いています。自分のAPIキーを貼って遊んでね。キーはこのブラウザ内に保存され、Googleにのみ送信されます。',
      gate_link: '無料キーを取得', gate_remember: 'この端末に保存する', gate_go: 'スタート', gate_checking: 'キーを確認中…',
      gate_bad: 'そのキーは使えませんでした。もう一度確認してね。', gate_invalid: 'キーが拒否されました。有効なキーを入力してください。', gate_net: 'Googleに接続できません。通信環境を確認してね。',
      chat_title: 'ユイとのストーリー', home_btn: 'ホーム', menu_btn: 'メニュー', placeholder: '話しかける、または *行動* してみよう…', send: '送信',
      gift: 'プレゼント', gift_empty: 'まだ何もないよ。ガチャを回そう！', gift_away: '今ユイはここにいない。', thinking: 'ユイが入力中…',
      retry: '再試行', err: 'ユイが答えてくれない。キーか通信を確認してね。', busy: 'ユイの返事を待ってね。',
      day: '日目', stage: ['知り合い', 'クラスメイト', '友達', '親しい仲', '特別な人'],
      loc_bedroom: '自分の部屋', loc_home: 'リビング', loc_yui_room: 'ユイの部屋（メッセージ）', loc_street: '通学路', loc_classroom: '教室',
      loc_cafeteria: '食堂', loc_rooftop: '屋上', loc_park: '公園', loc_library: '図書室', loc_school_gate: '校門',
      slot_wake: '朝', slot_commute: '通学', slot_am: '午前の授業', slot_lunch: '昼休み', slot_pm: '午後の授業', slot_after: '放課後', slot_evening: '夕方', slot_night: '夜',
      next_wake: '学校へ向かう', next_commute: '教室へ', next_am: '昼休みへ', next_lunch: '午後の授業へ', next_pm: '放課後へ', next_after: '家に帰る', next_evening: '寝る支度をする', next_night: '',
      ask_lunch: 'お昼はどこで食べる？', lunch_cafeteria: '食堂', lunch_rooftop: '屋上', lunch_classroom: '教室に残る',
      ask_after: '放課後。どこへ行く？', after_park: '公園へ歩く', after_library: '図書室で勉強', after_home: 'まっすぐ帰る',
      ask_night: '夜が更けた。どうする？', night_text: 'ユイにメッセージを送る', night_sleep: '眠る', locked_aff: n => `好感度${n}で解放`,
      event_start: 'イベント: ', event_clear: t => `イベントクリア: ${t}  ジェム+10、コイン+20`, milestone: n => `関係: ${n}`, aff_up: n => `好感度+${n}`, aff_down: n => `好感度${n}`,
      gacha_title: 'プレゼントガチャ', gacha_pull1: '1回 (ジェム10)', gacha_pull10: '10回 (ジェム90)', gacha_pity: n => `あと${n}回でSSR確定`,
      gacha_inv: '持ち物', gacha_noGems: 'ジェムが足りません。', gacha_tip: 'プレゼントはチャット画面でユイに渡せるよ。', gems: 'ジェム',
      j_title: '日記', j_events: 'イベント', j_cgs: '思い出 (CG)', j_mem: 'ユイが覚えていること', j_gifts: 'あげたプレゼント', j_none: 'まだありません。', j_locked: '未解放',
      cg_tap: 'タップで続ける', cg_unlock: '新しい思い出を解放！'
    }
  };
  G.STR = STR;
  G.t = (key, ...a) => { const v = (STR[G.settings.lang] || STR.en)[key] ?? STR.en[key] ?? key; return typeof v === 'function' ? v(...a) : v; };
  G.tl = (lang, key) => STR[lang][key] ?? STR.en[key] ?? key;
  const t = G.t;

  G.applyI18n = () => {
    $$('[data-t]').forEach(el => { el.textContent = t(el.dataset.t); });
    const set = (sel, key) => $$(sel).forEach(el => { el.textContent = t(key); });
    set('.nav-btn[data-route="/home"]', 'nav_home'); set('.nav-btn[data-route="/story"]', 'nav_story');
    set('.nav-btn[data-route="/chat"]', 'nav_chat'); set('.nav-btn[data-route="/gacha"]', 'nav_gacha'); set('.nav-btn[data-route="/shop"]', 'nav_shop');
    set('.stat.energy .stat-label', 'stat_aff'); set('.stat.rank .stat-label', 'stat_day');
    set('.mission-card .tab', 'tab_mission'); set('.event-card .tab', 'tab_event');
    set('[data-route="/menu"] .quick-label', 'q_menu'); set('[data-action="daily-gift"] .quick-label', 'q_gift'); set('[data-route="/notice"] .quick-label', 'q_notice');
    G.renderState(); G.emit('lang');
  };

  // ---------- audio (synth sfx + procedural bgm; optional voice files) ----------
  const A = (() => {
    let ctx, music, sfxG, timer;
    const vol = k => (G.settings.mute ? 0 : G.settings.master / 100) * G.settings[k] / 100;
    const ensure = () => {
      if (ctx) return ctx;
      const C = window.AudioContext || window.webkitAudioContext; if (!C) return null;
      ctx = new C(); music = ctx.createGain(); sfxG = ctx.createGain(); music.connect(ctx.destination); sfxG.connect(ctx.destination); refresh(); return ctx;
    };
    const refresh = () => { if (ctx) { music.gain.value = vol('music') * .5; sfxG.gain.value = vol('sfx'); } };
    const tone = (f, t0, d, type = 'sine', peak = .2, dest = sfxG) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(peak, t0 + .01); g.gain.exponentialRampToValueAtTime(.0001, t0 + d);
      o.connect(g); g.connect(dest); o.start(t0); o.stop(t0 + d + .05);
    };
    const FX = {
      click: () => tone(660, ctx.currentTime, .08, 'triangle', .22),
      pop: () => { tone(520, ctx.currentTime, .09, 'sine', .25); tone(780, ctx.currentTime + .07, .12, 'sine', .2); },
      chime: () => [784, 988, 1319].forEach((f, i) => tone(f, ctx.currentTime + i * .09, .4, 'sine', .22)),
      sparkle: () => [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, ctx.currentTime + i * .07, .3, 'triangle', .18)),
      error: () => tone(180, ctx.currentTime, .25, 'sawtooth', .15)
    };
    const sfx = n => { try { if (ensure() && vol('sfx') > 0) { ctx.resume(); FX[n]?.(); } } catch { /* audio is optional */ } };
    const musicStart = () => {
      if (!ensure() || timer) return;
      const scale = [261.63, 293.66, 329.63, 392, 440, 523.25, 587.33]; let i = 2, n = 0;
      timer = setInterval(() => {
        if (ctx.state !== 'running' || vol('music') === 0) return;
        i = clamp(i + [-2, -1, 0, 1, 2][Math.floor(Math.random() * 5)], 0, scale.length - 1);
        const t0 = ctx.currentTime; tone(scale[i], t0, 1.6, 'triangle', .1, music); if (n++ % 4 === 0) tone(scale[0] / 2, t0, 2.4, 'sine', .14, music);
      }, 520);
    };
    const voice = em => {
      const n = VOICE[em]; if (!n || vol('voice') === 0) return;
      const a = new Audio(`assets/voice/${em}_${1 + Math.floor(Math.random() * n)}.mp3`); a.volume = vol('voice'); a.play().catch(() => {});
    };
    return { sfx, voice, refresh, musicStart, resume: () => { ensure()?.resume(); musicStart(); } };
  })();
  G.sfx = A.sfx; G.voice = A.voice;

  function applySettings() {
    document.documentElement.lang = G.settings.lang;
    document.documentElement.dataset.motion = G.settings.reduceMotion ? 'reduced' : 'full';
    A.refresh(); G.applyI18n();
  }

  // ---------- stage: wide fit + layout wrapper ----------
  G.fit = () => {
    const W = clamp(Math.round(innerWidth / innerHeight * 675), 1200, 1800), r = document.documentElement.style;
    r.setProperty('--W', W + 'px'); r.setProperty('--dx', (W - 1200) + 'px'); r.setProperty('--s', Math.min(innerWidth / W, innerHeight / 675)); G.W = W;
  };
  function wrapLayout() {
    const layout = document.createElement('div'); layout.className = 'layout';
    [...G.game.children].forEach(c => { if (!c.matches('.fx-field,.toast')) layout.appendChild(c); });
    G.game.prepend(layout);
    $$('.notebook,.profile,.profile-star,.stat,.mood-chip,.mission-card,.pink-scribble,.event-card', layout).forEach(e => e.classList.add('z-left'));
    $$('.currency,.side-buttons,.lesson-cta', layout).forEach(e => e.classList.add('z-right'));
  }

  // ---------- toast, fx, bubble ----------
  G.toast = (text, ms = 1800) => {
    const el = $('#toast'); el.textContent = text; el.classList.add('show');
    clearTimeout(G.toast.t); G.toast.t = setTimeout(() => el.classList.remove('show'), ms);
  };
  G.burst = (x, y, count = 5) => {
    const f = $('#fxField'), r = f.getBoundingClientRect(), k = (r.width / f.offsetWidth) || 1, marks = ['♡', '✦', '☆'];
    for (let i = 0; i < count; i++) {
      const el = document.createElement('span'); el.className = 'fx'; el.textContent = marks[Math.floor(Math.random() * 3)];
      el.style.left = `${(x - r.left) / k + Math.random() * 42 - 21}px`; el.style.top = `${(y - r.top) / k + Math.random() * 22 - 11}px`;
      el.style.fontSize = `${18 + Math.random() * 18}px`; el.style.animationDelay = `${Math.random() * .16}s`;
      f.appendChild(el); el.addEventListener('animationend', () => el.remove(), { once: true });
    }
  };
  G.petal = () => {
    if (G.settings.reduceMotion) return;
    const f = $('#fxField'), el = document.createElement('span'); el.className = 'fx petal';
    el.style.left = `${Math.random() * f.offsetWidth}px`; el.style.top = '-18px';
    el.style.setProperty('--drift', `${38 + Math.random() * 110}px`); el.style.setProperty('--fall', `${6.5 + Math.random() * 4}s`);
    f.appendChild(el); el.addEventListener('animationend', () => el.remove(), { once: true });
  };
  G.petalBurst = n => { for (let i = 0; i < n; i++) setTimeout(G.petal, i * 60); };
  G.shake = () => { if (G.settings.reduceMotion) return; G.game.classList.remove('shake'); void G.game.offsetWidth; G.game.classList.add('shake'); };
  let typeT;
  G.say = text => {
    const el = $('#dialogue'), cps = G.cps(); clearInterval(typeT);
    if (cps === Infinity) el.textContent = text;
    else { let i = 0; el.textContent = ''; typeT = setInterval(() => { el.textContent = text.slice(0, ++i); if (i >= text.length) clearInterval(typeT); }, 1000 / cps); }
    const b = $('.bubble'); b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  };

  // ---------- daily login / streak ----------
  function dailyCheck() {
    const today = new Date().toLocaleDateString('sv-SE');
    if (S.lastLogin === today) return;
    const gap = S.lastLogin ? Math.round((Date.parse(today) - Date.parse(S.lastLogin)) / 864e5) : 0;
    S.streak = gap === 1 ? S.streak + 1 : 1; S.awayDays = gap > 1 ? gap - 1 : 0;
    S.greeted = !(S.awayDays > 0 || S.streak >= 3); S.lastLogin = today; S.giftReady = true; G.save();
  }
  function claimGift() {
    if (!S.giftReady) return G.toast(t('gift_done'));
    const gems = 10 + Math.min(S.streak, 7) * 2 + (S.streak % 7 === 0 ? 30 : 0), coins = 20;
    S.gems += gems; S.coins += coins; S.giftReady = false; G.save(); G.renderState();
    G.toast(t('gift_got', gems, coins)); G.say(t('gift_line')); G.sfx('chime');
  }

  // ---------- router ----------
  const PAGE = { '/story': 'journal', '/chat': 'story', '/gacha': 'gacha' };
  G.route = '/home';
  G.go = (route, ev) => {
    if (route === '/menu') return G.openMenu();
    if (route === '/event' || route === '/lesson/01') return G.startNextEvent?.();
    if (route === '/mission') return G.toast(t('toast_mission'));
    if (route === '/notice') return G.toast(t('toast_notice'));
    if (route === '/shop') return G.toast(t('toast_shop'));
    if (route === '/profile') return G.toast(t('toast_profile'));
    const name = PAGE[route]; G.route = name ? route : '/home';
    Object.entries(G.pages).forEach(([k, p]) => p.show(k === name));
    $$('.nav-btn').forEach(n => { const on = n.dataset.route === G.route; n.classList.toggle('active', on); on ? n.setAttribute('aria-current', 'page') : n.removeAttribute('aria-current'); });
    if (ev && ev.clientX) G.burst(ev.clientX, ev.clientY, 3);
    G.emit('route', G.route);
  };

  // ---------- render ----------
  G.renderState = () => {
    if (!G.game) return;
    $('#username').textContent = S.username; $('#usernameInput').value = S.username;
    $('#coinCount').textContent = S.coins; $('#gemCount').textContent = S.gems;
    $('#staminaNumber').textContent = G.stageIdx(S.affection) + 1; $('#staminaText').textContent = `${S.affection}/20`;
    $('.stat.energy .bar-wrap').style.setProperty('--value', S.affection / 20 * 100);
    $('#rankNumber').textContent = S.day; $('#rankText').textContent = G.clock();
    $('.stat.rank .bar-wrap').style.setProperty('--value', S.minute / 1440 * 100);
    const m = G.moodId(); G.game.dataset.mood = m; $('#moodText').textContent = t('mood')[m].label;
    const ev = G.nextEvent(), idx = (G.EVENTS || []).findIndex(e => e === ev) + 1, title = ev ? ev.title[G.settings.lang] : '';
    $('.mission-text').innerHTML = !ev ? t('mission_done') : S.affection >= ev.min ? t('mission_ready', title) : t('mission_next', ev.min, title);
    $('.event-copy').innerHTML = `${t('event_new')}<br><span>Event:0${idx || '-'}</span>`;
    $('.lesson-text').innerHTML = `Event<small>Event:0${idx || '-'}</small>`;
    $('[data-action="daily-gift"]').classList.toggle('ready', S.giftReady);
  };

  // ---------- menu ----------
  function buildMenu() {
    const el = document.createElement('div'); el.id = 'menuPanel'; el.className = 'overlay'; el.hidden = true;
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
    const vol = (k, key) => `<label class="row"><span data-t="${key}"></span><input type="range" min="0" max="100" data-vol="${k}"></label>`;
    el.innerHTML = `<div class="card menu-card"><div class="card-head"><h2 data-t="menu_title"></h2><button class="x-btn" data-close aria-label="Close">✕</button></div><div class="menu-body">
      <section><h3 data-t="m_lang"></h3><div class="seg"><button data-lang="en">English</button><button data-lang="ja">日本語</button></div></section>
      <section><h3 data-t="m_audio"></h3>${vol('master', 'm_master')}${vol('music', 'm_music')}${vol('sfx', 'm_sfx')}${vol('voice', 'm_voice')}
        <label class="chk"><input type="checkbox" data-chk="mute"><span data-t="m_mute"></span></label></section>
      <section><h3 data-t="m_text"></h3><label class="row"><span data-t="m_speed"></span><select data-sel="speed">
        <option value="slow" data-t="sp_slow"></option><option value="normal" data-t="sp_normal"></option><option value="fast" data-t="sp_fast"></option><option value="instant" data-t="sp_instant"></option></select></label>
        <label class="chk"><input type="checkbox" data-chk="subs"><span data-t="m_subs"></span></label></section>
      <section><h3 data-t="m_access"></h3><label class="chk"><input type="checkbox" data-chk="reduceMotion"><span data-t="m_motion"></span></label></section>
      <section><h3 data-t="m_account"></h3><p id="mKey"></p><button class="chip-btn" data-act="key" data-t="m_change_key"></button></section>
      <section><h3 data-t="m_data"></h3><button class="chip-btn danger" data-act="reset" data-t="m_reset"></button></section></div></div>`;
    G.game.appendChild(el);
    el.addEventListener('input', e => { const v = e.target.dataset.vol; if (v) G.setSetting(v, +e.target.value); });
    el.addEventListener('change', e => {
      const c = e.target.dataset.chk, s = e.target.dataset.sel;
      if (c) G.setSetting(c, e.target.checked); if (s) G.setSetting(s, e.target.value);
    });
    el.addEventListener('click', e => {
      if (e.target === el) return closeMenu();
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.lang) { G.setSetting('lang', b.dataset.lang); syncMenu(); }
      if (b.hasAttribute('data-close')) closeMenu();
      if (b.dataset.act === 'key') { G.clearKey(); location.reload(); }
      if (b.dataset.act === 'reset' && confirm(t('m_reset_ask'))) { localStorage.removeItem('tsun.save'); location.href = location.pathname; }
    });
    return el;
  }
  function syncMenu() {
    const el = $('#menuPanel');
    $$('[data-vol]', el).forEach(i => { i.value = G.settings[i.dataset.vol]; });
    $$('[data-chk]', el).forEach(i => { i.checked = !!G.settings[i.dataset.chk]; });
    $$('[data-sel]', el).forEach(i => { i.value = G.settings[i.dataset.sel]; });
    $$('[data-lang]', el).forEach(b => b.classList.toggle('on', b.dataset.lang === G.settings.lang));
    const k = G.getKey(); $('#mKey', el).textContent = t('m_keyset', k ? '••••' + k.slice(-4) : '—');
  }
  G.openMenu = () => { const el = $('#menuPanel') || buildMenu(); G.applyI18n(); syncMenu(); el.hidden = false; $('.x-btn', el).focus(); };
  const closeMenu = () => { const el = $('#menuPanel'); if (el) el.hidden = true; };

  // ---------- API key gate ----------
  G.getKey = () => localStorage.getItem('tsun.apiKey') || sessionStorage.getItem('tsun.apiKey') || '';
  G.clearKey = () => { localStorage.removeItem('tsun.apiKey'); sessionStorage.removeItem('tsun.apiKey'); };
  G.showGate = reason => {
    if ($('#gate')) return;
    const el = document.createElement('div'); el.id = 'gate'; el.className = 'overlay gate';
    el.innerHTML = `<div class="card gate-card"><h1 data-t="gate_title"></h1><p data-t="gate_text"></p>
      <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener" data-t="gate_link"></a>
      <input id="gateKey" type="password" placeholder="AIza..." autocomplete="off" spellcheck="false" aria-label="Gemini API key">
      <label class="chk"><input id="gateRemember" type="checkbox" checked><span data-t="gate_remember"></span></label>
      <button class="send" id="gateGo" data-t="gate_go"></button><p class="gate-msg" id="gateMsg" role="alert"></p>
      <div class="seg"><button data-lang="en">English</button><button data-lang="ja">日本語</button></div></div>`;
    G.game.appendChild(el); G.applyI18n();
    const msg = $('#gateMsg', el); if (reason === 'invalid') msg.textContent = t('gate_invalid');
    const go = async () => {
      const key = $('#gateKey', el).value.trim(); if (!key) return;
      msg.textContent = t('gate_checking');
      try {
        const r = await fetch(`${G.API}/models?pageSize=1`, { headers: { 'x-goog-api-key': key } });
        if (!r.ok) { msg.textContent = t('gate_bad'); G.sfx('error'); return; }
        (($('#gateRemember', el).checked) ? localStorage : sessionStorage).setItem('tsun.apiKey', key);
        el.remove(); G.sfx('chime'); G.emit('key');
      } catch { msg.textContent = t('gate_net'); }
    };
    $('#gateGo', el).addEventListener('click', go);
    $('#gateKey', el).addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    el.addEventListener('click', e => { const b = e.target.closest('[data-lang]'); if (b) G.setSetting('lang', b.dataset.lang); });
    $('#gateKey', el).focus();
  };

  // ---------- start ----------
  G.start = () => {
    wrapLayout(); G.fit(); addEventListener('resize', G.fit);
    dailyCheck(); applySettings(); G.say(t('greet'));
    const nameLine = $('.name-line'), input = $('#usernameInput');
    const saveName = () => {
      const v = input.value.trim(); nameLine.classList.remove('editing');
      if (!v) { input.value = S.username; return; }
      S.username = v.slice(0, 18); G.save(); G.renderState(); G.toast(t('name_saved'));
    };
    input.addEventListener('keydown', e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') { input.value = S.username; nameLine.classList.remove('editing'); } });
    input.addEventListener('blur', saveName);

    let idle; const resetIdle = () => {
      clearTimeout(idle);
      idle = setTimeout(() => {
        if (G.route !== '/home') return resetIdle();
        G.say(t('idle')[Math.floor(Math.random() * 2)]);
        const r = $('#characterBtn').getBoundingClientRect(); G.burst(r.left + r.width * .58, r.top + r.height * .45, 4);
      }, 12000);
    };
    resetIdle();
    document.addEventListener('pointerdown', () => { resetIdle(); A.resume(); }, { passive: true });
    document.addEventListener('keydown', e => { resetIdle(); if (e.key === 'Escape') closeMenu(); });

    document.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      A.sfx('click');
      const { route, action } = b.dataset;
      if (route) return G.go(route, e);
      if (action === 'daily-gift') claimGift();
      if (action === 'character') {
        G.say(t('click')[Math.floor(Math.random() * 3)]); G.voice('neutral'); G.burst(e.clientX, e.clientY, 5);
        b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
      }
      if (action === 'edit-name') { nameLine.classList.add('editing'); input.focus(); input.select(); }
    });

    G.petal(); setInterval(G.petal, 1500);
    G.on('key', () => G.emit('ready'));
    G.go('/home');
    if (!G.getKey()) G.showGate(); else G.emit('ready');
    if (params.has('selftest')) {
      const ok = !!(G.pages.story && G.pages.gacha && G.pages.journal && G.EVENTS.length === 6 && G.ITEMS.length >= 8 && STR.en.nav_home);
      window.__selftest = { passed: ok }; document.body.dataset.selftest = ok ? 'passed' : 'failed';
    }
  };
})();