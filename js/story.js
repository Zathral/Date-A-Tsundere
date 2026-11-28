// js/story.js: immersive story page, day cycle, events, quick replies, skipping class, streaming Gemini roleplay
(() => {
  const { $, $$, clamp, S } = G, t = (...a) => G.t(...a), L = () => G.settings.lang;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const EMOTES = { anger: '💢', blush: '>///<', love: '♡', note: '♪', dots: '…', sweat: '💦', spark: '✦' };
  const SPRITES = {}; // optional per-emotion art, e.g. { smug: 'assets/yui/smug.png' }
  const OUTDOOR = ['street', 'school_gate', 'park', 'rooftop'], WX = { clear: '☀️', cloudy: '☁️', rain: '🌧️' };
  const DAILY_Q = ['What did you eat for breakfast?', 'What is your favourite food?', 'What do you do when you cannot sleep?', 'Which subject do you secretly like?',
    'What is something you are bad at?', 'If you had a free weekend, where would you go?', 'What music do you listen to?', 'What is your favourite season?'];
  const VIBES = G.VIBES, FIT = G.VIBE_FIT;

  // ---------- day cycle ----------
  const SLOTS = [
    { id: 'wake', start: 420, end: 470, turns: 3, loc: 'bedroom', yui: false, note: 'The player wakes up at home. Yui is NOT here. Narrate the room and morning light, and that school starts soon.' },
    { id: 'commute', start: 470, end: 510, turns: 3, loc: 'street', yui: true, note: 'The player walks to school. Yui is spotted ahead on the same route or at the crossing.' },
    { id: 'am', start: 510, end: 720, turns: 5, loc: 'classroom', yui: true, note: 'Morning classes. Yui sits near the player. Whispers, passed notes, teachers droning.' },
    { id: 'lunch', start: 735, end: 795, turns: 4, loc: null, choose: 'lunch', yui: true, note: 'Lunch break.' },
    { id: 'pm', start: 795, end: 945, turns: 4, loc: 'classroom', yui: true, note: 'Afternoon classes. Sleepy warm atmosphere.' },
    { id: 'after', start: 945, end: 1110, turns: 5, loc: null, choose: 'after', yui: true, note: 'After school.' },
    { id: 'evening', start: 1110, end: 1320, turns: 3, loc: 'home', yui: false, note: 'Evening at home. Yui is NOT here. Dinner, homework, the quiet house.' },
    { id: 'night', start: 1320, end: 1380, turns: 99, loc: 'bedroom', choose: 'night', yui: false, note: 'Late night in the bedroom. Yui is NOT here unless the player texts her.' },
    // dynamic slot used when the player skips class (start time is S.skipStart)
    { id: 'skip', start: 0, end: 945, turns: 3, loc: null, choose: 'map', yui: false, next: 5, note: 'The player is skipping school and is free to wander town. Yui is NOT here; she is still at school.' }
  ];
  const CHOICES = {
    lunch: [{ loc: 'cafeteria', k: 'lunch_cafeteria' }, { loc: 'rooftop', k: 'lunch_rooftop', minAff: 6 }, { loc: 'classroom', k: 'lunch_classroom' }, { act: 'skip', k: 'lunch_skip' }],
    after: [{ loc: 'park', k: 'after_park' }, { loc: 'library', k: 'after_library' }, { act: 'map', k: 'after_map' }, { skip: true, k: 'after_home' }],
    map: [{ act: 'map', k: 'after_map' }, { skip: true, k: 'stay_home' }],
    night: [{ act: 'text', k: 'night_text' }, { act: 'sleep', k: 'night_sleep' }]
  };
  const STAGE_BRIEF = [
    'You barely know the player. Guarded, curt, a bit dismissive. Tiny cracks of curiosity that you cover up immediately.',
    'You are getting used to the player. You still snap, but you ask small questions and pretend it is only to fill the silence.',
    'You consider the player a friend but will never say so. You tease, get flustered by compliments, and bring up things they told you before.',
    'You care a lot. Embarrassed easily, your harsh words are clearly softer. You slip and say sweet things, then panic.',
    'You are deeply fond of the player but still tsundere. Vulnerable moments happen, then you retreat into denial.'];
  const MOOD_BRIEF = { tired: 'Sleepy and grumpy: short sentences, yawns, low patience.', annoyed: 'Prickly and snappy, but secretly still listening.', happy: 'Secretly in a good mood; softer than usual and she hates that it shows.' };

  const PACE = 0.5; // 1 = slow (old default was 2 = even slower). Lower = faster days (fewer turns per part of the day)
  const WE = [
    { id: 'wwake', start: 480, end: 540, turns: 3, loc: 'bedroom', yui: false, note: 'Weekend morning, no school. The player wakes up late at home. Yui is NOT here. Narrate the lazy morning and the free day ahead.' },
    { id: 'wam', start: 540, end: 780, turns: 6, loc: null, choose: 'map', yui: true, note: 'A free weekend morning in town.' },
    { id: 'wpm', start: 780, end: 1080, turns: 6, loc: null, choose: 'map', yui: true, note: 'A free weekend afternoon in town.' }];
  [...SLOTS, ...WE].forEach(s => { if (s.turns < 99) s.turns = Math.max(2, Math.round(s.turns * PACE)); });
  const WE_SLOTS = [...WE, SLOTS[6], SLOTS[7]];
  const DOW = { en: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], ja: ['月', '火', '水', '木', '金', '土', '日'] };
  G.weekend = () => (S.day - 1) % 7 >= 5;
  G.dow = () => DOW[L()][(S.day - 1) % 7];
  const slot = () => (G.weekend() ? WE_SLOTS : SLOTS)[S.slot];
  const present = () => !!S.eventRun || S.phone || !!S.talk || (slot().yui && (G.yuiHere ? G.yuiHere() : true));
  const activeEvent = () => S.eventRun && G.allEvents().find(e => e.id === S.eventRun.id);
  const evChoices = ev => ev.choices || (ev.choice ? [ev.choice] : []);
  const setupOf = ev => (typeof ev.setup === 'function' ? ev.setup() : ev.setup);
  const canSkip = () => !G.weekend() && ['commute', 'am', 'lunch', 'pm'].includes(slot().id) && !S.eventRun;
  let busy = false, rendered = false, lastSpeech = '', idleT, nudges = 0;

  // ---------- DOM ----------
  const page = el('section', 'page story', `
    <div class="scene" id="scene"><div class="env" id="env"></div><img class="yui" id="yui" alt="Yui" src="assets/main-character.png"><div class="emote" id="emote" aria-hidden="true"></div>
      <div class="scene-hud"><span class="chip" id="hudLoc"></span><span class="chip" id="hudTime"></span><span class="chip" id="hudWx"></span><span class="chip" id="hudQuest" hidden></span></div></div>
    <div class="panel"><div class="panel-head"><div><h2 class="chat-title" data-t="chat_title"></h2><div class="sub" id="hudStage"></div></div>
      <div class="head-btns"><button class="chip-btn" data-route="/home" data-t="home_btn"></button><button class="chip-btn" data-route="/menu" data-t="menu_btn"></button></div></div>
      <div class="log" id="log" role="log" aria-live="polite"></div><div class="choices" id="choices" hidden></div>
      <div class="toolbar"><button class="chip-btn" id="giftBtn" type="button"></button><button class="chip-btn" id="moveBtn" type="button"></button><button class="chip-btn" id="skipBtn" type="button"></button></div>
      <div class="gift-pop" id="giftPop" hidden></div>
      <form class="composer" id="composer"><input id="said" maxlength="300" autocomplete="off" aria-label="Message"><button type="submit" class="send" id="sendBtn"></button></form></div>`);
  page.id = 'storyPage'; G.game.appendChild(page);
  const log = $('#log', page), box = $('#choices', page), said = $('#said', page);

  const labelUi = () => {
    said.placeholder = t('placeholder'); $('#sendBtn', page).textContent = t('send'); $('#giftBtn', page).textContent = '🎁 ' + t('gift');
    const nx = slot().id === 'night' ? (S.phone ? t('night_sleep') : '') : t('next_' + slot().id); const mb = $('#moveBtn', page);
    mb.textContent = nx ? '⏩ ' + nx : ''; mb.hidden = !nx;
    const sk = $('#skipBtn', page); sk.textContent = '🚪 ' + t('skip_btn'); sk.hidden = !canSkip();
    $('#hudStage', page).textContent = `${t('stage')[G.stageIdx(S.affection)]} · ♡ ${S.affection}/20 · ${t('slot_' + slot().id)}`;
  };
  const setBusy = b => {
    busy = b; said.disabled = b; $('#sendBtn', page).disabled = b;
    $('#moveBtn', page).disabled = b || !!S.pendingChoice || !!S.eventRun; $('#skipBtn', page).disabled = b || !!S.pendingChoice || !!S.eventRun;
    $('#giftBtn', page).disabled = b;
  };

  let px;
  function updateScene() {
    const hour = Math.floor(S.minute / 60), sc = $('#scene', page), loc = S.phone ? 'yui_room' : S.loc;
    (px ||= G.pixelMount($('#env', page))).set(loc, hour, S.weather);
    sc.dataset.wx = S.weather; sc.dataset.out = OUTDOOR.includes(S.loc) && !S.phone ? 1 : 0;
    $('#hudLoc', page).textContent = t('loc_' + loc); $('#hudTime', page).textContent = `${t('day')} ${S.day} (${G.dow()}) · ${G.clock()}`; $('#hudWx', page).textContent = WX[S.weather] || '';
    const q = G.questHint?.() || '', qe = $('#hudQuest', page); qe.textContent = q ? '📜 ' + q : ''; qe.hidden = !q;
    $('#yui', page).classList.toggle('away', !present());
    labelUi(); G.renderState();
    G.emit('scene');
  }
  function setEmotion(em, emote) {
    const y = $('#yui', page); y.className = y.className.replace(/\bemo-\w+/g, '').trim() + ' emo-' + em;
    if (SPRITES[em]) y.src = SPRITES[em];
    const e = $('#emote', page); e.textContent = EMOTES[emote] || ''; e.classList.remove('pop'); void e.offsetWidth; if (emote) e.classList.add('pop');
  }

  // ---------- log rendering ----------
  const scrollEnd = () => { log.scrollTop = log.scrollHeight; };
  function addPlayer(text) { log.append(el('div', 'entry player', esc(text))); scrollEnd(); }
  function addSep(text) { log.append(el('div', 'entry sep', esc(text))); scrollEnd(); }
  const sep = text => { S.entries.push({ k: 's', text }); addSep(text); };
  function addStatic(e) {
    if (e.k === 'p') return addPlayer(e.text);
    if (e.k === 's') return addSep(e.text);
    if (e.k !== 'y') return;
    const showT = L() === 'ja' && G.settings.subs; let prev = '';
    (e.segs || []).forEach(s => {
      if (!s.text) return;
      const tr = showT && s.t ? `<p class="entry-t">${esc(s.t)}</p>` : '';
      if (s.k === 'n') log.append(el('div', 'entry yui', `<p class="entry-n">${esc(s.text)}</p>${tr}`));
      else log.append(el('div', 'entry yui' + (prev === 's' ? ' cont' : ''), `<div class="entry-s live">${prev === 's' ? '' : `<span class="who">${esc(e.who || 'Yui')}</span>`}<span class="txt">${esc(s.text)}</span></div>${tr}`));
      prev = s.k;
    });
  }
  const newYuiEntry = () => {
    const d = el('div', 'entry yui', `<div class="typing" aria-label="${t('thinking')}"><i></i><i></i><i></i></div>`);
    log.append(d); scrollEnd(); return d;
  };

  // ---------- reply parser: tolerant of wrong closing tags, stray HTML and leaked JSON ----------
  const TAGS = /<(\/?)(n|s|t|m|p|br)\s*\/?>/gi;
  const stripTags = s => s.replace(/<\/?[a-z][^>]*>/gi, '').replace(/<\/?[a-z]*$/i, '');
  function parseScript(txt) {
    const out = [], all = []; let cur = null, last = 0, meta = null, stray = '', m;
    const feed = chunk => { if (cur) cur.text += chunk; else stray += chunk; };
    TAGS.lastIndex = 0;
    while ((m = TAGS.exec(txt))) {
      feed(txt.slice(last, m.index)); last = TAGS.lastIndex;
      const tag = m[2].toLowerCase();
      if (tag === 'br') { feed('\n'); continue; }
      if (m[1]) { if (cur) { cur.closed = true; cur = null; } continue; } // any closing tag (even a wrong one like </p>) ends the open block
      if (tag === 'p') continue;
      if (cur) cur.closed = true;
      all.push(cur = { k: tag, text: '', closed: false });
    }
    feed(txt.slice(last));
    all.forEach(s => {
      if (s.k === 'm') { meta = { text: s.text.replace(/^\s+/, ''), closed: s.closed }; return; }
      const j = s.text.search(/\{\s*"(?:emotion|affection_delta|replies)"/); // JSON that leaked outside <m>
      if (j >= 0) { meta ||= { text: s.text.slice(j), closed: s.closed }; s.text = s.text.slice(0, j); }
      s.text = stripTags(s.text).replace(/^\s+/, ''); if (s.closed) s.text = s.text.trimEnd();
      if (s.k === 't') { const p = out[out.length - 1]; if (p) { p.t = s.text; p.tClosed = s.closed; } }
      else out.push({ k: s.k, text: s.text, t: '', tClosed: false, closed: s.closed });
    });
    if (!meta) { const j = stray.search(/\{\s*"(?:emotion|affection_delta|replies)"/); if (j >= 0) meta = { text: stray.slice(j), closed: false }; }
    const segs = out.filter(s => s.text);
    if (!segs.length && !meta && txt.trim() && !/^\s*<\/?[a-z]*$/i.test(txt)) { const x = stripTags(txt).trim(); if (x) segs.push({ k: 's', text: x, t: '', tClosed: false, closed: false }); }
    return { segs: segs.slice(0, 6), m: meta || { text: '', closed: false } };
  }
  const parseMeta = m => { const s = String((m && m.text) || '').replace(/```json|```/g, ''); for (const x of [s, (s.match(/\{[\s\S]*\}/) || [''])[0]]) { try { return JSON.parse(x); } catch { /* try next */ } } return {}; };
  G.parseScript = parseScript;
  // what the model sees as history: always clean, never its own raw (possibly malformed) output
  const canon = e => {
    const segs = e.segs || [{ k: 'n', text: e.n || '' }, { k: 's', text: e.s || '' }];
    return segs.filter(s => s.text).map(s => `<${s.k}>${s.text}</${s.k}>${s.t ? `<t>${s.t}</t>` : ''}`).join('') + `<m>{"emotion":"${e.em || 'neutral'}","affection_delta":0,"memory":"","emote":"","opening":"","replies":[]}</m>`;
  };
  const flat = e => (e.segs || []).map(s => (s.k === 's' ? `"${s.text}"` : s.text)).join(' ');
  // heal old saves: re-parse the stored raw text once
  const healEntry = e => {
    if (e.k !== 'y' || e.segs) return;
    const p = parseScript(e.raw || `<n>${e.n || ''}</n><s>${e.s || ''}</s>`);
    e.segs = p.segs.map(({ k, text, t }) => ({ k, text, t })); delete e.raw; delete e.n; delete e.s; delete e.t;
  };
  S.entries.forEach(healEntry);

  // ---------- typewriter: each speech bubble is its own log entry, with a "typing..." pause between them ----------
  function typewriter(root) {
    const R = [], made = [], who = esc(G.speakerName?.() || 'Yui');
    const dots = '<div class="typing" aria-hidden="true"><i></i><i></i><i></i></div>';
    let acc = 0, last = performance.now(), ended = false, skip = false, dead = false, resolve; const done = new Promise(r => { resolve = r; });
    const bind = e => e.addEventListener('click', () => { skip = true; });
    bind(root);
    const build = (s, i) => {
      s.e = i ? el('div', 'entry yui cont', dots) : root;
      if (i) { log.append(s.e); made.push(s.e); bind(s.e); G.sfx('pop'); scrollEnd(); }
      const prevS = i && R[i - 1].k === 's';
      s.main = el(s.k === 'n' ? 'p' : 'div', s.k === 'n' ? 'entry-n' : 'entry-s live', s.k === 'n' ? '' : `${prevS ? '' : `<span class="who">${who}</span>`}<span class="txt"></span>`);
      s.tEl = el('p', 'entry-t', '');
      s.e.append(s.main, s.tEl);
      s.f[0].el = s.k === 'n' ? s.main : s.main.querySelector('.txt'); s.f[1].el = s.tEl; s.built = true;
    };
    const loop = now => {
      if (dead) return;
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      const fast = skip || G.cps() === Infinity; let budget;
      if (fast) budget = Infinity; else { acc += dt * G.cps(); budget = Math.floor(acc); acc -= budget; }
      let finished = true;
      outer: for (let i = 0; i < R.length; i++) {
        const s = R[i];
        if (!s.built) {
          if (i > 0 && !fast) s.readyAt = now + Math.min(1100, 350 + R[i - 1].f[0].target.length * 14); // pause between bubbles
          build(s, i);
        }
        if (!fast && s.readyAt && now < s.readyAt) { finished = false; break; }
        for (const f of s.f) {
          if (f.pos < f.target.length) { const step = Math.min(f.target.length - f.pos, budget); f.pos += step; budget -= step; f.el.textContent = f.target.slice(0, f.pos); s.e.classList.add('started'); }
          if (f.pos < f.target.length || !(f.closed || ended)) { finished = false; break outer; }
        }
      }
      scrollEnd();
      if (finished && ended) return resolve();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return {
      feed(p) {
        const showT = L() === 'ja' && G.settings.subs;
        p.segs.forEach((g, i) => {
          const s = R[i] ||= { k: g.k, f: [{ target: '', pos: 0, closed: false }, { target: '', pos: 0, closed: false }] };
          s.f[0].target = g.text; s.f[0].closed = g.closed;
          s.f[1].target = showT ? g.t : ''; s.f[1].closed = g.tClosed || i < p.segs.length - 1;
        });
      },
      end() { ended = true; root.classList.add('started'); },
      destroy() { dead = true; made.forEach(e => e.remove()); resolve(); },
      done
    };
  }

  // ---------- Gemini streaming with model fallback ----------
  async function streamGemini(system, contents, onText) {
    const key = G.getKey(); let full = '', err;
    for (const model of G.MODELS) {
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 25000);
      try {
        const r = await fetch(`${G.API}/models/${model}:streamGenerateContent?alt=sse`, {
          method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 1, maxOutputTokens: 1400 } })
        });
        if (!r.ok) throw Object.assign(new Error('HTTP ' + r.status), { status: r.status, detail: (await r.text()).slice(0, 300) });
        const reader = r.body.getReader(), dec = new TextDecoder(); let buf = '';
        for (;;) {
          const { done, value } = await reader.read(); if (done) break;
          buf += dec.decode(value, { stream: true }); let i;
          while ((i = buf.indexOf('\n')) >= 0) {
            const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
            if (!line.startsWith('data:')) continue;
            try {
              const d = JSON.parse(line.slice(5)), tx = (d.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
              if (tx) { full += tx; onText(full); }
            } catch { /* partial json line */ }
          }
        }
        clearTimeout(timer);
        if (!full) throw new Error('Empty reply');
        return { text: full, model };
      } catch (e) {
        clearTimeout(timer); err = e; console.warn(`[${model}]`, e.message, e.detail || '');
        if (full) return { text: full, model };            // keep a partial reply
        if (e.status === 401 || e.status === 403 || /API key|API_KEY/i.test(e.detail || '')) break; // key problem: fallback model will not help
      }
    }
    throw err || new Error('All models failed');
  }

  // ---------- prompt ----------
  function buildSystem(c) {
    const lang = L(), si = G.stageIdx(S.affection), sl = slot(), ev = c.ev, loc = G.STR.en['loc_' + (S.phone ? 'yui_room' : S.loc)];
    const langRule = lang === 'ja'
      ? 'Write the narration and Yui\'s speech in natural Japanese (casual tsundere speech: べ、別に…, ばか, 〜なんだから). Translations go in <t> tags (see TRANSLATION below).'
      : 'Write in English, with the occasional Japanese interjection from Yui (e.g. べ、別に, ばか).';
    return `You are the narrator and Yui in an immersive, wholesome high-school slice-of-life dating sim. Yui is a 17-year-old Japanese classmate and a classic tsundere: proud, brash, easily flustered, quick to deny her feelings ("I-it's not like...", "b-baka"), but secretly curious about the player and caring. The player is a classmate${S.username ? ` called "${S.username}"` : ''}. Make it feel like a story, not a chatbot.

SCENE NOW: day ${S.day}, ${G.clock()} (${G.period(Math.floor(S.minute / 60))}), weather: ${S.weather}, location: ${loc}. Phase of day: ${sl.id}. ${sl.note}
${S.phone ? 'The player is TEXTING Yui from home late at night. Yui is in her own room, answering on her phone: her speech is her text messages, and the narration shows her room and reactions as the player imagines them.' : ''}
YUI PRESENT: ${present() ? 'yes' : 'NO. She is not here: leave <s> empty and narrate only the environment, the time passing and the player\'s surroundings.'}
RELATIONSHIP: ${G.tl('en', 'stage')[si]} (affection ${S.affection}/20). ${STAGE_BRIEF[si]}
MOOD: ${MOOD_BRIEF[G.moodId()]} Time-of-day matters: grumpy and half-asleep in the morning, softer and more guarded-down late at night.
${ev ? `SPECIAL EVENT: "${ev.title.en}". ${setupOf(ev)}` : ''}${c.beat ? `\nSTORY BEAT FOR THIS REPLY (make it happen naturally): ${c.beat}` : ''}${c.note ? `\nPLAYER CHOICE JUST MADE: ${c.note}` : ''}
TIME PASSES: about ${c.minutes || 0} minutes passed since your last reply; mention it only if natural.
${c.gift ? `PLAYER JUST GAVE ${(G.speakerName?.() || 'Yui').toUpperCase()} A GIFT: ${c.gift.tag} (rarity ${c.gift.r}). React in character: flustered denial, secret delight, and remember it. Gifts raise affection by about ${c.gift.r === 'SSR' ? 2 : 1}.` : ''}
${c.daily ? `DAILY QUESTION: sometime this reply or soon, Yui asks the player, in her tsundere way: "${c.daily}". Ask it only once.` : ''}
${c.returning ? (c.returning.away > 0 ? `The player was away for ${c.returning.away} real-world day(s). Yui is annoyed they vanished but secretly relieved. Do not mention real-world days literally; say things like "you disappeared".` : `The player has shown up ${c.returning.streak} days in a row. Yui pretends not to notice but is pleased.`) : ''}
THINGS YUI HAS LEARNED ABOUT THE PLAYER: ${S.memories.length ? S.memories.join('; ') : 'nothing yet'}. Bring one up unprompted now and then.
GIFTS ALREADY GIVEN: ${S.gifts.length ? S.gifts.slice(-6).join(', ') : 'none'}. She may reference them ("I'm not wearing this because I like it").
STORY SO FAR (long-term memory, treat as true): ${S.storyFacts.length ? S.storyFacts.join(' | ') : 'nothing yet'}
${G.promptExtra ? G.promptExtra(c) : ''}

INITIATIVE: the character the player is talking to (normally Yui) LEADS the scene and is not an answering machine. In most replies she should move things forward herself: ask the player something about their life, propose a plan or a place, offer something (a bento, notes, a dare), bring up a topic of her own, or call out what the player is doing. Never end two replies in a row with the same kind of question. If the player gives a lazy one-word answer, tease them and take over the conversation.
${S.talk ? '' : `YUI'S LIFE (topics she may raise): ${G.YUI_LIFE}`}
${c.agenda ? `AGENDA FOR THIS REPLY (work it in naturally, in her tsundere way): ${c.agenda}` : ''}
${c.vibe ? `PLAYER'S TONE: the player picked a ${c.vibe} response (chill = calm, steady, kind; nonchalant = unbothered, deadpan; playful = teasing, joking). React to that tone.` : ''}

INPUT: lines from the player in *asterisks* are actions; other text is speech. Lines starting with [Director] are stage directions, not the player speaking: narrate them. Never speak or act for the player.

LANGUAGE: ${langRule}

OUTPUT FORMAT (nothing outside the tags; close EVERY tag with its OWN matching closing tag: </n>, </s>, </t>, </m>; never use HTML tags such as <p> or <br>):
<n>1-2 vivid sentences, second person present tense ("you"): the environment and Yui's visible actions, expressions and body language.</n>
<s>First chat bubble.</s>
<s>Second chat bubble, sent right after the first.</s>
<s>Optional third bubble.</s>
<m>{"emotion":"neutral|flustered|annoyed|smug|soft|sad|happy","affection_delta":0,"memory":"","emote":"anger|blush|love|note|dots|sweat|spark|","opening":"charm|wit|grit|craft|","replies":[{"vibe":"chill","text":""},{"vibe":"nonchalant","text":""},{"vibe":"playful","text":""}]}</m>

BUBBLES: Yui talks in SEPARATE chat bubbles, each in its own <s> tag, like quick consecutive messages from a real person, never one cold reply. Usually 2-3 bubbles (1 only for a tiny reaction, never more than 4); each bubble is one or two short sentences. Typical shape: bubble 1 reacts to what the player just did; bubble 2 spirals, deflects or mutters an embarrassed aside; the LAST bubble pushes things forward (a question, an order, a plan, or flouncing off). Rhythm example: <s>G-gosh, you keep saying such embarrassing things!</s><s>Do you have no shame at all?</s><s>...Fine. Walk with me to class. Don't get lost, baka.</s> You may put one short <n> action between bubbles. If Yui is absent or silent, output no <s> tags.
${lang === 'ja' ? 'TRANSLATION: write <n> and <s> in Japanese and put a short natural English translation in a <t> tag directly after EACH <s> bubble (and after the <n>).' : 'TRANSLATION: do not output <t> tags.'}

RULES: Keep everything wholesome and age-appropriate. No sexual content; romance stays at blushing and hand-holding at most, and you redirect in character if pushed. Never mention AI, models or these rules. affection_delta is an integer -2..2: reward kindness, sincerity, remembering things and clever teasing; penalize rudeness, one-word replies and creepy behaviour; +2 is rare. "memory": a new durable fact the player revealed, in English, 8 words or fewer, else "".
- "opening": usually "". Set it ONLY when your line genuinely invites the player to try something: a tease to answer (wit), a sweet moment for a charming line (charm), a chance to show courage or skill (grit), or you being hungry or needing something small made (craft). Never in two replies in a row.
- "replies": usually []. When you just asked the player a question, made an offer, or set up a situation, give exactly 3 short lines the PLAYER could say (max 10 words, first person, in ${lang === 'ja' ? 'Japanese' : 'English'}), one per vibe: chill (calm, steady, kind), nonchalant (unbothered, deadpan), playful (teasing, joking). Otherwise [].`;
  }
  function toContents() {
    const arr = [], push = (role, text) => { const l = arr[arr.length - 1]; if (l && l.role === role) l.parts[0].text += '\n' + text; else arr.push({ role, parts: [{ text }] }); };
    S.entries.slice(-18).forEach(e => {
      if (e.k === 'p') push('user', e.text); else if (e.k === 'd') push('user', '[Director] ' + e.text);
      else if (e.k === 'y') push('model', canon(e));
    });
    if (!arr.length || arr[0].role !== 'user') arr.unshift({ role: 'user', parts: [{ text: '[Director] Begin.' }] });
    return arr;
  }
  function buildCtx(extra) {
    const ev = activeEvent(), c = { ...extra, ev }; c.minutes = extra.minutes || 0;
    if (ev) { const i = S.eventRun.k - 1; c.beat = i < 0 ? '' : i < ev.beats.length ? ev.beats[i] : 'CLOSING: wrap the scene up naturally and gently. This is the last reply of the scene.'; }
    if (present() && !S.talk && !ev) {
      if (S.dailyAsked !== S.day && slot().id !== 'wake') c.daily = S.dailyQ || DAILY_Q[0];
      if (!S.greeted) c.returning = { away: S.awayDays, streak: S.streak };
    }
    if (!ev && !c.gift && !c.daily && !c.returning) c.agenda = G.agenda?.() || '';
    Object.assign(c, G.ctxExtra?.(c) || {}); // outfit reactions etc. (systems.js)
    return c;
  }

  async function summarize() {
    if (!G.getKey()) return;
    const scenes = S.entries.slice(-24).map(e => e.k === 'p' ? `Player: ${e.text}` : e.k === 'y' ? `${e.who || 'Yui'}: ${flat(e)}` : e.k === 'd' ? `[Director] ${e.text}` : '').filter(Boolean).join('\n');
    const prompt = `You maintain the long-term memory of a slice-of-life dating sim.\nCurrent facts:\n${S.storyFacts.map(f => '- ' + f).join('\n') || '(none)'}\n\nRecent scenes:\n${scenes}\n\nReturn ONLY a JSON array of strings: the updated fact list. Keep still-important old facts, merge duplicates, and add 3-5 new facts from the recent scenes (promises, secrets, plot beats, relationships, things the player did or said). Max 12 facts, each under 20 words, in English.`;
    for (const model of [...G.MODELS].reverse()) { // fallback model first, to spare the main one
      try {
        const r = await fetch(`${G.API}/models/${model}:generateContent`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': G.getKey() },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: .2, maxOutputTokens: 600, responseMimeType: 'application/json' } })
        });
        if (!r.ok) continue;
        const d = await r.json(), raw = (d.candidates?.[0]?.content?.parts || []).filter(p => !p.thought).map(p => p.text || '').join('');
        const arr = JSON.parse(raw.replace(/```json|```/g, ''));
        if (Array.isArray(arr) && arr.length) { S.storyFacts = arr.slice(0, 12).map(x => String(x).slice(0, 160)); G.save(); return; }
      } catch { /* try next model */ }
    }
  }

  // ---------- one Yui reply ----------
  async function yuiTurn(c) {
    const d = newYuiEntry(), tw = typewriter(d); let parsed;
    try {
      const res = await streamGemini(buildSystem(c), toContents(), txt => { parsed = parseScript(txt); tw.feed(parsed); });
      parsed = parseScript(res.text);
      if (!parsed.segs.length) throw new Error('Unparseable reply');
      tw.feed(parsed); tw.end(); await tw.done;
      const m = parseMeta(parsed.m), em = ['neutral', 'flustered', 'annoyed', 'smug', 'soft', 'sad', 'happy'].includes(m.emotion) ? m.emotion : 'neutral';
      const speech = parsed.segs.filter(s => s.k === 's');
      let delta = clamp(Math.round(Number(m.affection_delta) || 0), -2, 2); if (S.affection <= 3) delta = Math.min(delta, 1);
      if (c.gift) delta = Math.max(delta, 1);
      if (c.minDelta) delta = Math.max(delta, c.minDelta);
      let fit = false;
      if (c.vibe) { G.addXp(c.vibe, 2); if (!S.talk && FIT[G.moodId()] === c.vibe) { delta = Math.max(delta, 1); fit = true; } }
      if (c.forceDelta != null) delta = c.forceDelta;
      if (S.talk) { G.npcRel(S.talk, delta); delta = 0; }
      const before = G.stageIdx(S.affection); S.affection = clamp(S.affection + delta, 0, 20);
      if (m.memory && !S.memories.includes(m.memory)) S.memories = [String(m.memory).slice(0, 80), ...S.memories].slice(0, 10);
      if (c.daily) S.dailyAsked = S.day; if (c.returning) S.greeted = true;
      const reps = (Array.isArray(m.replies) ? m.replies : []).filter(r => r && VIBES.includes(r.vibe) && String(r.text || '').trim()).slice(0, 3).map(r => ({ vibe: r.vibe, text: String(r.text).trim().slice(0, 80) }));
      S.quick = speech.length ? reps : [];
      S.opening = ['charm', 'wit', 'grit', 'craft'].includes(m.opening) && S.moveCool <= 0 ? m.opening : '';
      S.entries.push({ k: 'y', segs: parsed.segs.map(({ k, text, t }) => ({ k, text, t })), who: G.speakerName?.() || 'Yui', em });
      if (fit) sep(t('vibe_fit'));
      lastSpeech = speech.length ? speech[speech.length - 1].text : lastSpeech;
      setEmotion(em, m.emote); G.voice(em);
      if (delta > 0) { G.sfx('chime'); G.toast(t('aff_up', delta)); const r = $('#scene', page).getBoundingClientRect(); G.burst(r.left + r.width * .6, r.top + r.height * .35, 4 + delta * 2); }
      else if (delta < 0) G.toast(t('aff_down', delta));
      else G.sfx('pop');
      const after = G.stageIdx(S.affection);
      if (after > before && !S.cgs.includes(after)) { S.cgs.push(after); S.gems += 20; G.save(); setTimeout(() => G.showCG(after), 700); }
      if (S.eventRun) S.eventRun.k++;
      if (++S.sumTurns >= 10) { S.sumTurns = 0; summarize(); }
      G.save(); updateScene(); return true;
    } catch (e) {
      tw.destroy(); d.remove(); G.sfx('error'); console.warn('yuiTurn failed', e);
      const bad = e.status === 401 || e.status === 403 || /API key|API_KEY/i.test(e.detail || '');
      if (bad) { G.clearKey(); G.showGate('invalid'); }
      const box2 = el('div', 'entry err', `${esc(t('err'))} <button class="chip-btn" type="button">${t('retry')}</button>`); log.append(box2); scrollEnd();
      $('button', box2).addEventListener('click', async () => { if (busy) return; box2.remove(); await run(null, c); });
      return false;
    }
  }

  // ---------- turn runner ----------
  function tick() {
    const sl = slot(), st = sl.id === 'skip' ? (S.skipStart ?? S.minute) : sl.start;
    const per = S.eventRun ? 5 : Math.max(5, Math.round((sl.end - st) / sl.turns));
    S.minute = Math.min(S.minute + per, 1439); return per;
  }
  async function run(playerText, ctxIn, direct, extra) {
    if (busy) return G.toast(t('busy'));
    setBusy(true); box.hidden = true; $('#giftPop', page).hidden = true; S.quick = []; clearTimeout(idleT); let ok = true;
    if (playerText) nudges = 0;
    try {
      let c = ctxIn;
      if (!c) {
        let minutes = 0;
        if (playerText) { S.entries.push({ k: 'p', text: playerText }); addPlayer(playerText); minutes = tick(); if (!S.eventRun) S.slotTurns++; }
        if (direct) S.entries.push({ k: 'd', text: direct });
        c = buildCtx({ ...(extra || {}), minutes });
      }
      updateScene(); ok = await yuiTurn(c);
    } finally { setBusy(false); }
    if (ok) await after();
    armIdle();
  }
  const send = (text, extra) => run(text, null, undefined, extra);
  const director = (text, extra) => run(null, null, text, extra);

  // Yui speaks up by herself when the player goes quiet
  const armIdle = () => { clearTimeout(idleT); if (nudges < 2 && page.classList.contains('show')) idleT = setTimeout(nudge, 45000); };
  async function nudge() {
    if (busy || !box.hidden || S.eventRun || S.pendingChoice || document.hidden || !present() || !G.getKey() || !page.classList.contains('show')) return armIdle();
    nudges++;
    await director('The player has been silent and idle for a while. Yui notices, calls them out (staring, zoning out), and takes the lead herself: she changes the subject, asks them something, or proposes doing something together.');
  }

  async function after() {
    const sl = slot(), ev = activeEvent();
    if (S.eventRun && !ev) { S.eventRun = null; G.save(); }
    if (ev) {
      const er = S.eventRun; er.cdone ||= [];
      const ci = evChoices(ev).findIndex((ch, i) => ch.at + 1 === er.k && !er.cdone.includes(i));
      if (ci >= 0) { er.open = ci; G.save(); return showEventChoice(ev, ci); }
      if (er.k >= ev.beats.length + 2) return finishEvent(ev);
      return showQuickIfAny();
    }
    if (sl.id !== 'night' && S.minute >= sl.end && !S.pendingChoice) return advance();
    if (sl.choose === 'night' && !S.pendingChoice && !S.phone && S.entries.length) return promptChoice('night');
    const key = `${S.day}-${S.slot}`;
    if (!S.pendingChoice && S.slotTurns >= 1 && S.rolledSlot !== key) { // one random-event roll per part of the day
      S.rolledSlot = key; const nx = G.pickEvent?.('turn'); if (nx) return G.startEvent(nx);
    }
    showQuickIfAny();
  }
  G.affect = d => {
    if (!d) return; if (S.talk) { G.npcRel(S.talk, d); return G.save(); } const b = G.stageIdx(S.affection); S.affection = clamp(S.affection + d, 0, 20); G.toast(t('aff_up', d));
    const a = G.stageIdx(S.affection); if (a > b && !S.cgs.includes(a)) { S.cgs.push(a); S.gems += 20; setTimeout(() => G.showCG(a), 900); }
    G.save(); updateScene();
  };
  function arrive() { const ev = G.pickEvent?.('arrive'); if (!ev) return false; G.startEvent(ev); return true; }

  // ---------- choices ----------
  function showChoices(ask, opts) {
    box.innerHTML = `<div class="ask">${esc(ask)}</div>`;
    opts.forEach((o, i) => {
      const b = el('button', 'choice-btn', esc(o.label) + (o.locked ? ` 🔒 ${esc(o.locked)}` : '')); b.type = 'button'; b.disabled = !!o.locked;
      b.style.setProperty('--i', i);
      b.addEventListener('click', () => { box.hidden = true; G.sfx('pop'); o.pick(); }); box.append(b);
    });
    box.hidden = false; $('#moveBtn', page).disabled = true; $('#skipBtn', page).disabled = true; scrollEnd();
  }
  // tappable "how do you respond?" lines that Yui offers. Typing still works.
  function showQuick(list) {
    box.innerHTML = `<div class="ask">${esc(t('quick_ask'))}</div>`;
    list.forEach((r, i) => {
      const b = el('button', 'choice-btn vibe-' + r.vibe, `<em class="vibe">${esc(t('st_' + r.vibe))}</em> ${esc(r.text)}`); b.type = 'button'; b.style.setProperty('--i', i);
      b.addEventListener('click', () => { box.hidden = true; S.quick = []; G.sfx('pop'); send(r.text, { vibe: r.vibe }); }); box.append(b);
    });
    box.hidden = false; scrollEnd();
  }
  const showQuickIfAny = () => { if (S.quick?.length && present() && !S.pendingChoice) showQuick(S.quick); };

  function showEventChoice(ev, ci = 0) {
    const ch = evChoices(ev)[ci], name = o => o[L()] || o.en;
    showChoices(ch.ask[L()] || ch.ask.en, ch.options.map(o => ({
      label: name(o) + (o.stat ? ` [${t('st_' + o.stat)}]` : '') + (o.xp ? ` ✦${Object.keys(o.xp).map(k => t('st_' + k)).join('/')}` : ''),
      locked: o.req && G.level(o.req.stat) < o.req.lv ? `${t('st_' + o.req.stat)} Lv.${o.req.lv}` : '',
      pick: async () => {
        const er = S.eventRun; let d = o.delta ?? 0, res, note = o.note || `The player chose: ${o.en}.`;
        if (o.stat) {
          res = await G.rollAction(o.stat, { base: o.base ?? .2, bonus: o.bonus || 0, label: name(o) }); G.addXp(o.stat, 1);
          d = res.tier === 'great' ? d + 1 : res.tier === 'corny' ? Math.min(0, d - 1) : d;
          note += ` OUTCOME (decided by the game, follow it): ${G.tierNote(res.tier)}`; sep(G.chanceLine(res));
        }
        if (o.xp) Object.entries(o.xp).forEach(([k, n]) => G.addXp(k, n));
        if (o.loc) S.loc = o.loc;
        if (o.min) S.minute = Math.min(1439, S.minute + o.min);
        if (o.coins) S.coins = Math.max(0, S.coins + o.coins);
        if (o.flag) S.flags[o.flag] = S.day;
        if (o.fact) G.addFact(o.fact);
        if (o.gift) G.takeGift?.();
        if (o.quest) { const was = (S.quests[o.quest[0]] || { stage: -1 }).stage; S.quests[o.quest[0]] = { stage: o.quest[1], day: S.day }; G.toast(t(was < 0 ? 'quest_new' : 'quest_up', G.QUESTS[o.quest[0]].title[L()]), 2600); }
        if (o.fx) o.fx(res);
        er.cdone.push(ci); er.open = null;
        if (o.end) er.k = Math.max(er.k, ev.beats.length + 1);
        G.affect(d); send(`*${name(o)}*`, { note });
      }
    })));
  }
  function promptChoice(kind) {
    S.pendingChoice = kind; G.save();
    const opts = CHOICES[kind].map(o => ({
      label: t(o.k), locked: o.minAff && S.affection < o.minAff ? t('locked_aff', o.minAff) : '',
      pick: () => {
        S.pendingChoice = null;
        if (o.act === 'sleep') return endDay();
        if (o.act === 'map') return G.openMap();
        if (o.act === 'skip') return skipClass(kind);
        if (o.act === 'text') { S.phone = true; S.loc = 'bedroom'; updateScene(); return director('The player picks up their phone and texts Yui. Narrate the phone lighting up in her dark room and her reaction to getting a message from the player so late.'); }
        if (o.skip) return gotoSlot(slot().next ?? S.slot + 1, kind === 'map' ? 'The player lets the hours drift by, doing nothing in particular.' : 'The player says goodbye to Yui and walks home alone. Narrate the parting and the walk.');
        S.loc = o.loc; updateScene(); if (arrive()) return;
        director(`Arrival: ${slot().note} The player chooses to go to: ${G.STR.en['loc_' + o.loc]}. Narrate the arrival and Yui's reaction.`);
      }
    }));
    showChoices(t('ask_' + kind), opts);
  }

  // ---------- slot flow ----------
  async function gotoSlot(i, note) {
    S.slot = i; const sl = slot(); S.slotTurns = 0; S.minute = Math.max(S.minute, sl.start); S.phone = false;
    const line = `— ${G.clock()} · ${t('slot_' + sl.id)} —`; S.entries.push({ k: 's', text: line }); addSep(line);
    if (sl.loc) S.loc = sl.loc; updateScene();
    const ev = G.pickEvent?.('start');
    if (ev) { if (sl.choose && sl.choose !== 'night') S.pendingChoice = sl.choose; return G.startEvent(ev); }
    if (sl.choose && sl.choose !== 'night') return promptChoice(sl.choose);
    await director(note || `Time skip. ${sl.note} Narrate the transition and the new scene.`);
  }
  const advance = () => (slot().id === 'night' ? null : gotoSlot(slot().next ?? S.slot + 1));
  async function endDay() {
    S.day++; S.slot = 0; S.slotTurns = 0; S.minute = 420; S.loc = 'bedroom'; S.phone = false; S.dailyQ = DAILY_Q[(S.day - 1) % DAILY_Q.length]; S.talk = null;
    const r = Math.random(); S.weather = r < .6 ? 'clear' : r < .8 ? 'cloudy' : 'rain'; G.save();
    const line = `— ${t('day')} ${S.day} · ${G.clock()} —`; S.entries.push({ k: 's', text: line }); addSep(line); updateScene();
    await director('A new morning. The player slept and wakes up. Narrate the new day and the weather. Yui is not here yet.' + (G.weekend() ? ' It is the weekend, so no school: narrate a lazy morning and the free day ahead.' : ''));
  }

  // ---------- skipping class ----------
  const SKIP_NOTE = {
    walk: 'The player quietly slips out of class and leaves the school building. Narrate the escape and the strange freedom of an empty street in school hours.',
    excused: 'The player fakes a stomachache so convincingly that the teacher excuses them for the day. Narrate the performance and stepping out into daylight.',
    nurse: 'The player fakes a stomachache. The school nurse sees through it, but lets them rest a while and then go. Narrate it.',
    caught: 'The player tries to sneak out and is caught by a teacher at the gate, who writes their name down for detention tomorrow, then sends them away from class anyway. Narrate it.'
  };
  function skipClass(prev) {
    if (busy || S.eventRun) return;
    showChoices(t('skip_ask'), [
      { label: t('skip_walk'), pick: () => doSkip('walk') },
      { label: `${t('skip_sick')} [${t('st_wit')}]`, pick: async () => { const r = await G.rollAction('wit', { base: .2, label: t('skip_sick') }); G.addXp('wit', 1); sep(G.chanceLine(r)); doSkip(r.tier === 'great' ? 'excused' : r.tier === 'flustered' ? 'nurse' : 'caught'); } },
      { label: t('skip_stay'), pick: () => (prev ? promptChoice(prev) : setBusy(false)) }
    ]);
  }
  async function doSkip(how) {
    S.skips++; S.skipToday = S.day; S.skipHow = how; S.skipStart = S.minute; S.slot = SLOTS.findIndex(s => s.id === 'skip'); S.slotTurns = 0;
    S.loc = 'school_gate'; S.phone = false; S.talk = null; S.pendingChoice = null;
    if (how === 'caught') S.flags.detention = S.day;
    G.addFact(`Day ${S.day}: the player skipped class${how === 'caught' ? ' and was caught (detention)' : how === 'excused' ? ' with a fake illness' : ''}.`);
    sep(`— ${G.clock()} · ${t('slot_skip')} —`); updateScene(); G.sfx('pop');
    await director(SKIP_NOTE[how]);
    if (!S.eventRun && !S.pendingChoice && slot().id === 'skip') promptChoice('map');
  }

  // ---------- events ----------
  G.startEvent = ev => {
    if (busy) return G.toast(t('busy'));
    if (G.route !== '/chat') G.go('/chat');
    if (S.eventRun) return;
    S.talk = ev.npc || null;
    S.eventRun = { id: ev.id, k: 0, cdone: [], open: null, saved: { minute: S.minute, loc: S.loc, weather: S.weather, phone: S.phone, pending: S.pendingChoice } };
    if (ev.loc) S.loc = ev.loc; if (ev.time) S.minute = ev.time; if (ev.weather) S.weather = ev.weather;
    S.phone = !!ev.phone; S.pendingChoice = null; S.quick = []; box.hidden = true;
    const s = `— ${t('event_start')}${ev.title[L()] || ev.title.en} —`; S.entries.push({ k: 's', text: s }); addSep(s); updateScene(); G.shake();
    director(`EVENT BEGINS: ${setupOf(ev)} Narrate the opening of the scene and show ${G.speakerName?.() || 'Yui'}'s first reaction.`);
  };
  G.startNextEvent = () => {
    const ev = G.nextEvent();
    if (!ev) return G.toast(t('all_events_done'));
    if (S.affection < ev.min) return G.toast(t('event_locked', ev.title[L()], ev.min));
    G.startEvent(ev);
  };
  function finishEvent(ev) {
    const sv = S.eventRun.saved, big = !ev.rep, g = ev.reward?.gems ?? (big ? 10 : 5), c = ev.reward?.coins ?? (big ? 20 : 10);
    if (!ev.rep) S.eventsDone.push(ev.id); S.evtLast[ev.id] = S.day; S.gems += g; S.coins += c;
    if (ev.npc) G.npcRel(ev.npc, 2);
    if (ev.fact) G.addFact(ev.fact);
    try { ev.done?.(); } catch (e) { console.warn('event done hook failed', e); }
    S.talk = null; S.eventRun = null;
    const moved = ev.keepLoc && S.loc !== (ev.loc || sv.loc); // the player really went somewhere during the event
    S.minute = Math.min(1439, (moved ? S.minute : sv.minute) + (ev.cost ?? (ev.time ? 0 : 20)));
    if (!moved) S.loc = sv.loc; S.weather = sv.weather; S.phone = sv.phone; G.save();
    G.toast(t('ev_done', ev.title[L()] || ev.title.en, g, c), 3200); G.sfx('sparkle'); G.petalBurst(20);
    sep(`— ${ev.title[L()] || ev.title.en} ✓ —`); updateScene();
    if (sv.pending && !moved) return promptChoice(sv.pending);
    return after();
  }

  // ---------- gifts ----------
  $('#giftBtn', page).addEventListener('click', () => {
    const pop = $('#giftPop', page); if (!pop.hidden) { pop.hidden = true; return; }
    if (!present()) return G.toast(t('gift_away'));
    const items = G.ITEMS.filter(i => S.inventory[i.id]);
    pop.innerHTML = items.length ? '' : `<span class="muted">${t('gift_empty')}</span>`;
    items.forEach(it => {
      const b = el('button', 'chip-btn', `<b>${it.r}</b> ${esc(G.itemName(it))} x${S.inventory[it.id]}`); b.type = 'button';
      b.addEventListener('click', () => {
        if (busy) return; pop.hidden = true; S.inventory[it.id]--; S.gifts.push(it.en); G.save();
        send(`*gives ${G.speakerName?.() || 'Yui'}: ${it.en}*`, { gift: it });
      }); pop.append(b);
    });
    pop.hidden = false;
  });

  // ---------- input ----------
  $('#composer', page).addEventListener('submit', async e => {
    e.preventDefault(); const v = said.value.trim(); if (!v || busy) return;
    S.pendingChoice = null; box.hidden = true;
    const er = S.eventRun; if (er && er.open != null) { (er.cdone ||= []).push(er.open); er.open = null; }
    let extra; setBusy(true);
    try { extra = await G.tryMove?.(v); } catch (err) { console.warn('move check failed', err); } // chat-detected flirt / banter / show-off / snack
    setBusy(false); said.value = ''; send(v, extra || undefined);
  });
  $('#moveBtn', page).addEventListener('click', () => {
    if (busy || S.eventRun || S.pendingChoice) return;
    if (slot().id === 'night') endDay(); else advance();
  });
  $('#skipBtn', page).addEventListener('click', () => skipClass());

  // ---------- open / close ----------
  async function open() {
    updateScene(); G.applyI18n();
    if (!rendered) {
      rendered = true; log.innerHTML = ''; S.entries.slice(-14).forEach(addStatic); scrollEnd();
      const y = [...S.entries].reverse().find(e => e.k === 'y'); if (y) setEmotion(y.em || 'neutral', '');
    }
    if (!G.getKey()) return;
    if (!S.intro) { S.intro = true; G.save(); await director('FIRST MORNING (Day 1, 07:00). The player wakes up in their bedroom, a high school student. Yui is a classmate they barely know. Narrate the quiet morning and hint that school (and Yui) awaits. Yui is not here.'); return; }
    const er = S.eventRun, ev = activeEvent();
    if (S.pendingChoice && box.hidden) promptChoice(S.pendingChoice);
    else if (er && ev && er.open != null && box.hidden) showEventChoice(ev, er.open);
    else if (box.hidden) showQuickIfAny();
    armIdle();
  }
  G.pages.story = { show: on => { page.classList.toggle('show', on); if (on) { open(); if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => said.focus(), 50); } else clearTimeout(idleT); } };
  G.on('lang', () => { labelUi(); updateScene(); });
  G.on('ready', () => { updateScene(); });
  G.on('route', r => { if (r === '/home' && lastSpeech) G.say(lastSpeech.replace(/\n/g, ' ')); });

  G.start();
  G.story = { director, send, update: updateScene, busy: () => busy, slot, present, sep, arrive };
})();