// js/story.js: immersive story page, day cycle, event beats, gifts, streaming Gemini roleplay
(() => {
  const { $, $$, clamp, S } = G, t = (...a) => G.t(...a), L = () => G.settings.lang;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
  const EMOTES = { anger: '💢', blush: '>///<', love: '♡', note: '♪', dots: '…', sweat: '💦', spark: '✦' };
  const SPRITES = {}; // optional per-emotion art, e.g. { smug: 'assets/yui/smug.png' }
  const OUTDOOR = ['street', 'school_gate', 'park', 'rooftop'], WX = { clear: '☀️', cloudy: '☁️', rain: '🌧️' };
  const DAILY_Q = ['What did you eat for breakfast?', 'What is your favourite food?', 'What do you do when you cannot sleep?', 'Which subject do you secretly like?',
    'What is something you are bad at?', 'If you had a free weekend, where would you go?', 'What music do you listen to?', 'What is your favourite season?'];

  // ---------- day cycle ----------
  const SLOTS = [
    { id: 'wake', start: 420, end: 470, turns: 3, loc: 'bedroom', yui: false, note: 'The player wakes up at home. Yui is NOT here. Narrate the room and morning light, and that school starts soon.' },
    { id: 'commute', start: 470, end: 510, turns: 3, loc: 'street', yui: true, note: 'The player walks to school. Yui is spotted ahead on the same route or at the crossing.' },
    { id: 'am', start: 510, end: 720, turns: 5, loc: 'classroom', yui: true, note: 'Morning classes. Yui sits near the player. Whispers, passed notes, teachers droning.' },
    { id: 'lunch', start: 735, end: 795, turns: 4, loc: null, choose: 'lunch', yui: true, note: 'Lunch break.' },
    { id: 'pm', start: 795, end: 945, turns: 4, loc: 'classroom', yui: true, note: 'Afternoon classes. Sleepy warm atmosphere.' },
    { id: 'after', start: 945, end: 1110, turns: 5, loc: null, choose: 'after', yui: true, note: 'After school.' },
    { id: 'evening', start: 1110, end: 1320, turns: 3, loc: 'home', yui: false, note: 'Evening at home. Yui is NOT here. Dinner, homework, the quiet house.' },
    { id: 'night', start: 1320, end: 1380, turns: 99, loc: 'bedroom', choose: 'night', yui: false, note: 'Late night in the bedroom. Yui is NOT here unless the player texts her.' }
  ];
  const CHOICES = {
    lunch: [{ loc: 'cafeteria', k: 'lunch_cafeteria' }, { loc: 'rooftop', k: 'lunch_rooftop', minAff: 6 }, { loc: 'classroom', k: 'lunch_classroom' }],
    after: [{ loc: 'park', k: 'after_park' }, { loc: 'library', k: 'after_library' }, { skip: true, k: 'after_home' }],
    night: [{ act: 'text', k: 'night_text' }, { act: 'sleep', k: 'night_sleep' }]
  };
  const STAGE_BRIEF = [
    'You barely know the player. Guarded, curt, a bit dismissive. Tiny cracks of curiosity that you cover up immediately.',
    'You are getting used to the player. You still snap, but you ask small questions and pretend it is only to fill the silence.',
    'You consider the player a friend but will never say so. You tease, get flustered by compliments, and bring up things they told you before.',
    'You care a lot. Embarrassed easily, your harsh words are clearly softer. You slip and say sweet things, then panic.',
    'You are deeply fond of the player but still tsundere. Vulnerable moments happen, then you retreat into denial.'];
  const MOOD_BRIEF = { tired: 'Sleepy and grumpy: short sentences, yawns, low patience.', annoyed: 'Prickly and snappy, but secretly still listening.', happy: 'Secretly in a good mood; softer than usual and she hates that it shows.' };

  const slot = () => SLOTS[S.slot];
  const present = () => !!S.eventRun || S.phone || slot().yui;
  const activeEvent = () => S.eventRun && G.EVENTS.find(e => e.id === S.eventRun.id);
  let busy = false, rendered = false, lastSpeech = '';

  // ---------- DOM ----------
  const page = el('section', 'page story', `
    <div class="scene" id="scene"><div class="env" id="env"></div><img class="yui" id="yui" alt="Yui" src="assets/main-character.png"><div class="emote" id="emote" aria-hidden="true"></div>
      <div class="scene-hud"><span class="chip" id="hudLoc"></span><span class="chip" id="hudTime"></span><span class="chip" id="hudWx"></span></div></div>
    <div class="panel"><div class="panel-head"><div><h2 class="chat-title" data-t="chat_title"></h2><div class="sub" id="hudStage"></div></div>
      <div class="head-btns"><button class="chip-btn" data-route="/home" data-t="home_btn"></button><button class="chip-btn" data-route="/menu" data-t="menu_btn"></button></div></div>
      <div class="log" id="log" role="log" aria-live="polite"></div><div class="choices" id="choices" hidden></div>
      <div class="toolbar"><button class="chip-btn" id="giftBtn" type="button"></button><button class="chip-btn" id="moveBtn" type="button"></button></div>
      <div class="gift-pop" id="giftPop" hidden></div>
      <form class="composer" id="composer"><input id="said" maxlength="300" autocomplete="off" aria-label="Message"><button type="submit" class="send" id="sendBtn"></button></form></div>`);
  page.id = 'storyPage'; G.game.appendChild(page);
  const log = $('#log', page), box = $('#choices', page), said = $('#said', page);

  const labelUi = () => {
    said.placeholder = t('placeholder'); $('#sendBtn', page).textContent = t('send'); $('#giftBtn', page).textContent = '🎁 ' + t('gift');
    const nx = slot().id === 'night' ? (S.phone ? t('night_sleep') : '') : t('next_' + slot().id); const mb = $('#moveBtn', page);
    mb.textContent = nx ? '⏩ ' + nx : ''; mb.hidden = !nx;
    $('#hudStage', page).textContent = `${t('stage')[G.stageIdx(S.affection)]} · ♡ ${S.affection}/20 · ${t('slot_' + slot().id)}`;
  };
  const setBusy = b => { busy = b; said.disabled = b; $('#sendBtn', page).disabled = b; $('#moveBtn', page).disabled = b || !!S.pendingChoice || !!S.eventRun; $('#giftBtn', page).disabled = b; };

  function updateScene() {
    const hour = Math.floor(S.minute / 60), sc = $('#scene', page), loc = S.phone ? 'yui_room' : S.loc;
    $('#env', page).innerHTML = G.sceneSVG(loc, hour) + (G.USE_ENV_IMAGES ? `<img class="env-img" src="assets/env/${loc}.png" alt="" onerror="this.remove()">` : '');
    sc.dataset.wx = S.weather; sc.dataset.out = OUTDOOR.includes(S.loc) && !S.phone ? 1 : 0;
    $('#hudLoc', page).textContent = t('loc_' + loc); $('#hudTime', page).textContent = `${t('day')} ${S.day} · ${G.clock()}`; $('#hudWx', page).textContent = WX[S.weather] || '';
    $('#yui', page).classList.toggle('away', !present());
    labelUi(); G.renderState();
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
  function addStatic(e) {
    if (e.k === 'p') return addPlayer(e.text);
    if (e.k === 's') return addSep(e.text);
    if (e.k !== 'y') return;
    log.append(el('div', 'entry yui', `<p class="entry-n">${esc(e.n || '')}</p>${e.s ? `<div class="entry-s"><span class="who">Yui</span><span class="txt">${esc(e.s)}</span></div>` : ''}${e.t && L() === 'ja' && G.settings.subs ? `<p class="entry-t">${esc(e.t)}</p>` : ''}`));
  }
  const newYuiEntry = () => {
    const d = el('div', 'entry yui', `<div class="typing" aria-label="${t('thinking')}"><i></i><i></i><i></i></div><p class="entry-n"></p><div class="entry-s"><span class="who">Yui</span><span class="txt"></span></div><p class="entry-t"></p>`);
    log.append(d); scrollEnd(); return d;
  };

  // typewriter that follows a streaming transcript (narration -> speech -> translation)
  function typewriter(root) {
    const T = { n: { el: $('.entry-n', root) }, s: { el: $('.txt', root) }, t: { el: $('.entry-t', root) } }, order = ['n', 's', 't'];
    order.forEach(k => Object.assign(T[k], { target: '', pos: 0, closed: false }));
    let acc = 0, last = performance.now(), ended = false, skip = false, resolve; const done = new Promise(r => { resolve = r; });
    root.addEventListener('click', () => { skip = true; });
    const loop = now => {
      const dt = Math.min(.1, (now - last) / 1000); last = now;
      const fast = skip || G.cps() === Infinity; let budget;
      if (fast) budget = Infinity; else { acc += dt * G.cps(); budget = Math.floor(acc); acc -= budget; }
      let finished = true;
      for (const k of order) {
        const x = T[k];
        if (x.pos < x.target.length) {
          const step = Math.min(x.target.length - x.pos, budget); x.pos += step; budget -= step;
          x.el.textContent = x.target.slice(0, x.pos); root.classList.add('has-' + k, 'started');
        }
        if (x.pos < x.target.length || !(x.closed || ended)) { finished = false; break; }
      }
      scrollEnd();
      if (finished && ended) return resolve();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    return {
      feed(p) { order.forEach(k => { const show = k !== 't' || (L() === 'ja' && G.settings.subs); T[k].target = show ? p[k].text : ''; T[k].closed = p[k].closed; }); },
      end() { ended = true; root.classList.add('started'); }, done
    };
  }

  // ---------- tagged reply parser (works on partial streams) ----------
  function parseTagged(txt) {
    const get = tag => {
      const i = txt.indexOf(`<${tag}>`); if (i < 0) return { text: '', closed: false };
      const s = i + tag.length + 2, j = txt.indexOf(`</${tag}>`, s), raw = j < 0 ? txt.slice(s) : txt.slice(s, j);
      let text = raw.replace(/<[^>]*$/, '').replace(/^\s+/, ''); if (j >= 0) text = text.replace(/\s+$/, '');
      return { text, closed: j >= 0 };
    };
    const out = { n: get('n'), s: get('s'), t: get('t'), m: get('m') };
    if (!txt.includes('<n>') && !txt.includes('<s>') && txt.trim() && !/^\s*<[a-z]*$/.test(txt)) out.s = { text: txt.trim(), closed: false };
    return out;
  }
  const parseMeta = m => { try { return JSON.parse(m.text.replace(/```json|```/g, '')); } catch { return {}; } };
  G._parseTagged = parseTagged;

  // ---------- Gemini streaming with model fallback ----------
  async function streamGemini(system, contents, onText) {
    const key = G.getKey(); let full = '', err;
    for (const model of G.MODELS) {
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 25000);
      try {
        const r = await fetch(`${G.API}/${model}:streamGenerateContent?alt=sse`, {
          method: 'POST', signal: ctrl.signal, headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { temperature: 1, maxOutputTokens: 800 } })
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
      ? 'Write the narration and Yui\'s speech in natural Japanese (casual tsundere speech: べ、別に…, ばか, 〜なんだから). Put a short natural English translation of narration+speech in <t>.'
      : 'Write in English, with the occasional Japanese interjection from Yui (e.g. べ、別に, ばか). Leave <t> empty.';
    return `You are the narrator and Yui in an immersive, wholesome high-school slice-of-life dating sim. Yui is a 17-year-old Japanese classmate and a classic tsundere: proud, brash, easily flustered, quick to deny her feelings ("I-it's not like...", "b-baka"), but secretly curious about the player and caring. The player is a classmate${S.username ? ` called "${S.username}"` : ''}. Make it feel like a story, not a chatbot.

SCENE NOW: day ${S.day}, ${G.clock()} (${G.period(Math.floor(S.minute / 60))}), weather: ${S.weather}, location: ${loc}. Phase of day: ${sl.id}. ${sl.note}
${S.phone ? 'The player is TEXTING Yui from home late at night. Yui is in her own room, answering on her phone: her speech is her text messages, and the narration shows her room and reactions as the player imagines them.' : ''}
YUI PRESENT: ${present() ? 'yes' : 'NO. She is not here: leave <s> empty and narrate only the environment, the time passing and the player\'s surroundings.'}
RELATIONSHIP: ${G.tl('en', 'stage')[si]} (affection ${S.affection}/20). ${STAGE_BRIEF[si]}
MOOD: ${MOOD_BRIEF[G.moodId()]} Time-of-day matters: grumpy and half-asleep in the morning, softer and more guarded-down late at night.
${ev ? `SPECIAL EVENT: "${ev.title.en}". ${ev.setup}` : ''}${c.beat ? `\nSTORY BEAT FOR THIS REPLY (make it happen naturally): ${c.beat}` : ''}${c.note ? `\nPLAYER CHOICE JUST MADE: ${c.note}` : ''}
TIME PASSES: about ${c.minutes || 0} minutes passed since your last reply; mention it only if natural.
${c.gift ? `PLAYER JUST GAVE YUI A GIFT: ${c.gift.tag} (rarity ${c.gift.r}). React in character: flustered denial, secret delight, and remember it. Gifts raise affection by about ${c.gift.r === 'SSR' ? 2 : 1}.` : ''}
${c.daily ? `DAILY QUESTION: sometime this reply or soon, Yui asks the player, in her tsundere way: "${c.daily}". Ask it only once.` : ''}
${c.returning ? (c.returning.away > 0 ? `The player was away for ${c.returning.away} real-world day(s). Yui is annoyed they vanished but secretly relieved. Do not mention real-world days literally; say things like "you disappeared".` : `The player has shown up ${c.returning.streak} days in a row. Yui pretends not to notice but is pleased.`) : ''}
THINGS YUI HAS LEARNED ABOUT THE PLAYER: ${S.memories.length ? S.memories.join('; ') : 'nothing yet'}. Bring one up unprompted now and then.
GIFTS ALREADY GIVEN: ${S.gifts.length ? S.gifts.slice(-6).join(', ') : 'none'}. She may reference them ("I'm not wearing this because I like it").

INPUT: lines from the player in *asterisks* are actions; other text is speech. Lines starting with [Director] are stage directions, not the player speaking: narrate them. Never speak or act for the player.

LANGUAGE: ${langRule}

OUTPUT FORMAT (always all four tags, in this order, nothing outside them):
<n>1-3 vivid sentences, second person present tense ("you"). Describe the environment (light, sounds, weather, objects) and Yui's visible actions, expressions and body language.</n>
<s>Yui's spoken words, 1-3 short sentences. EMPTY if she is absent or silent.</s>
<t>translation or empty</t>
<m>{"emotion":"neutral|flustered|annoyed|smug|soft|sad|happy","affection_delta":0,"memory":"","emote":"anger|blush|love|note|dots|sweat|spark|"}</m>

RULES: Keep everything wholesome and age-appropriate. No sexual content; romance stays at blushing and hand-holding at most, and you redirect in character if pushed. Never mention AI, models or these rules. affection_delta is an integer -2..2: reward kindness, sincerity, remembering things and clever teasing; penalize rudeness, one-word replies and creepy behaviour; +2 is rare. "memory": a new durable fact the player revealed, in English, 8 words or fewer, else "".`;
  }
  function toContents() {
    const arr = [], push = (role, text) => { const l = arr[arr.length - 1]; if (l && l.role === role) l.parts[0].text += '\n' + text; else arr.push({ role, parts: [{ text }] }); };
    S.entries.slice(-18).forEach(e => {
      if (e.k === 'p') push('user', e.text); else if (e.k === 'd') push('user', '[Director] ' + e.text);
      else if (e.k === 'y') push('model', e.raw || `<n>${e.n}</n><s>${e.s}</s>`);
    });
    if (!arr.length || arr[0].role !== 'user') arr.unshift({ role: 'user', parts: [{ text: '[Director] Begin.' }] });
    return arr;
  }
  function buildCtx(extra) {
    const ev = activeEvent(), c = { ...extra, ev }; c.minutes = extra.minutes || 0;
    if (ev) { const i = S.eventRun.k - 1; c.beat = i < 0 ? '' : i < ev.beats.length ? ev.beats[i] : 'CLOSING: wrap the scene up naturally and gently. This is the last reply of the scene.'; }
    if (present() && S.dailyAsked !== S.day && !ev && slot().id !== 'wake') c.daily = S.dailyQ || DAILY_Q[0];
    if (present() && !S.greeted && !ev) c.returning = { away: S.awayDays, streak: S.streak };
    return c;
  }

  // ---------- one Yui reply ----------
  async function yuiTurn(c) {
    const d = newYuiEntry(), tw = typewriter(d); let parsed;
    try {
      const res = await streamGemini(buildSystem(c), toContents(), txt => { parsed = parseTagged(txt); tw.feed(parsed); });
      parsed = parseTagged(res.text); tw.feed(parsed); tw.end(); await tw.done;
      const m = parseMeta(parsed.m), em = ['neutral', 'flustered', 'annoyed', 'smug', 'soft', 'sad', 'happy'].includes(m.emotion) ? m.emotion : 'neutral';
      let delta = clamp(Math.round(Number(m.affection_delta) || 0), -2, 2); if (S.affection <= 3) delta = Math.min(delta, 1);
      if (c.gift) delta = Math.max(delta, 1);
      const before = G.stageIdx(S.affection); S.affection = clamp(S.affection + delta, 0, 20);
      if (m.memory && !S.memories.includes(m.memory)) S.memories = [String(m.memory).slice(0, 80), ...S.memories].slice(0, 10);
      if (c.daily) S.dailyAsked = S.day; if (c.returning) S.greeted = true;
      S.entries.push({ k: 'y', n: parsed.n.text, s: parsed.s.text, t: parsed.t.text, raw: res.text.slice(0, 1200), em });
      lastSpeech = parsed.s.text || lastSpeech;
      setEmotion(em, m.emote); G.voice(em);
      if (delta > 0) { G.sfx('chime'); G.toast(t('aff_up', delta)); const r = $('#scene', page).getBoundingClientRect(); G.burst(r.left + r.width * .6, r.top + r.height * .35, 4 + delta * 2); }
      else if (delta < 0) G.toast(t('aff_down', delta));
      else G.sfx('pop');
      const after = G.stageIdx(S.affection);
      if (after > before && !S.cgs.includes(after)) { S.cgs.push(after); S.gems += 20; G.save(); setTimeout(() => G.showCG(after), 700); }
      if (S.eventRun) S.eventRun.k++;
      G.save(); updateScene(); return true;
    } catch (e) {
      d.remove(); G.sfx('error'); console.warn('yuiTurn failed', e);
      const bad = e.status === 401 || e.status === 403 || /API key|API_KEY/i.test(e.detail || '');
      if (bad) { G.clearKey(); G.showGate('invalid'); }
      const box2 = el('div', 'entry err', `${esc(t('err'))} <button class="chip-btn" type="button">${t('retry')}</button>`); log.append(box2); scrollEnd();
      $('button', box2).addEventListener('click', async () => { if (busy) return; box2.remove(); await run(null, c); });
      return false;
    }
  }

  // ---------- turn runner ----------
  function tick() {
    const sl = slot(), per = S.eventRun ? 5 : Math.max(3, Math.round((sl.end - sl.start) / sl.turns));
    S.minute = Math.min(S.minute + per, 1439); return per;
  }
  async function run(playerText, ctxIn, direct, extra) {
    if (busy) return G.toast(t('busy'));
    setBusy(true); box.hidden = true; $('#giftPop', page).hidden = true; let ok = true;
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
  }
  const send = (text, extra) => run(text, null, undefined, extra);
  const director = (text, extra) => run(null, null, text, extra);

  async function after() {
    const sl = slot(), ev = activeEvent();
    if (ev) {
      if (S.eventRun.k === ev.choice.at + 1 && !S.eventRun.picked) { S.eventRun.picked = 'open'; G.save(); return showEventChoice(ev); }
      if (S.eventRun.k >= ev.beats.length + 2) return finishEvent(ev);
      return;
    }
    if (sl.id !== 'night' && S.minute >= sl.end && !S.pendingChoice) return advance();
    if (sl.choose === 'night' && !S.pendingChoice && !S.phone && S.entries.length) return promptChoice('night');
  }
  G.affect = d => {
    if (!d) return; const b = G.stageIdx(S.affection); S.affection = clamp(S.affection + d, 0, 20); G.toast(t('aff_up', d));
    const a = G.stageIdx(S.affection); if (a > b && !S.cgs.includes(a)) { S.cgs.push(a); S.gems += 20; setTimeout(() => G.showCG(a), 900); }
    G.save(); updateScene();
  };

  // ---------- choices ----------
  function showChoices(ask, opts) {
    box.innerHTML = `<div class="ask">${esc(ask)}</div>`;
    opts.forEach(o => {
      const b = el('button', 'choice-btn', esc(o.label) + (o.locked ? ` 🔒 ${esc(o.locked)}` : '')); b.type = 'button'; b.disabled = !!o.locked;
      b.addEventListener('click', () => { box.hidden = true; G.sfx('pop'); o.pick(); }); box.append(b);
    });
    box.hidden = false; $('#moveBtn', page).disabled = true; scrollEnd();
  }
  function showEventChoice(ev) {
    showChoices(ev.choice.ask[L()], ev.choice.options.map(o => ({ label: o[L()], pick: () => { S.eventRun.picked = 'yes'; G.affect(o.delta); send(`*${o[L()]}*`, { note: o.note }); } })));
  }
  function promptChoice(kind) {
    S.pendingChoice = kind; G.save();
    const opts = CHOICES[kind].map(o => ({
      label: t(o.k), locked: o.minAff && S.affection < o.minAff ? t('locked_aff', o.minAff) : '',
      pick: () => {
        S.pendingChoice = null;
        if (o.act === 'sleep') return endDay();
        if (o.act === 'text') { S.phone = true; S.loc = 'bedroom'; updateScene(); return director('The player picks up their phone and texts Yui. Narrate the phone lighting up in her dark room and her reaction to getting a message from the player so late.'); }
        if (o.skip) return gotoSlot(S.slot + 1, 'The player says goodbye to Yui and walks home alone. Narrate the parting and the walk.');
        S.loc = o.loc; updateScene(); director(`Arrival: ${slot().note} The player chooses to go to: ${G.STR.en['loc_' + o.loc]}. Narrate the arrival and Yui's reaction.`);
      }
    }));
    showChoices(t('ask_' + kind), opts);
  }

  // ---------- slot flow ----------
  async function gotoSlot(i, note) {
    S.slot = i; const sl = slot(); S.slotTurns = 0; S.minute = Math.max(S.minute, sl.start); S.phone = false;
    const sep = `— ${G.clock()} · ${t('slot_' + sl.id)} —`; S.entries.push({ k: 's', text: sep }); addSep(sep);
    if (sl.loc) S.loc = sl.loc; updateScene();
    if (sl.choose && sl.choose !== 'night') return promptChoice(sl.choose);
    await director(note || `Time skip. ${sl.note} Narrate the transition and the new scene.`);
  }
  const advance = () => (slot().id === 'night' ? null : gotoSlot(S.slot + 1));
  async function endDay() {
    S.day++; S.slot = 0; S.slotTurns = 0; S.minute = 420; S.loc = 'bedroom'; S.phone = false; S.dailyQ = DAILY_Q[(S.day - 1) % DAILY_Q.length];
    const r = Math.random(); S.weather = r < .6 ? 'clear' : r < .8 ? 'cloudy' : 'rain'; G.save();
    const sep = `— ${t('day')} ${S.day} · ${G.clock()} —`; S.entries.push({ k: 's', text: sep }); addSep(sep); updateScene();
    await director('A new morning. The player slept and wakes up. Narrate the new day and the weather. Yui is not here yet.');
  }

  // ---------- events ----------
  G.startNextEvent = () => {
    const ev = G.nextEvent();
    if (!ev) return G.toast(t('all_events_done'));
    if (S.affection < ev.min) return G.toast(t('event_locked', ev.title[L()], ev.min));
    if (busy) return G.toast(t('busy'));
    G.go('/chat');
    if (S.eventRun) return;
    S.eventRun = { id: ev.id, k: 0, picked: null, saved: { minute: S.minute, loc: S.loc, weather: S.weather, phone: S.phone, pending: S.pendingChoice } };
    S.loc = ev.loc; S.minute = ev.time; S.weather = ev.weather || S.weather; S.phone = false; S.pendingChoice = null; box.hidden = true;
    const sep = `— ${t('event_start')}${ev.title[L()]} —`; S.entries.push({ k: 's', text: sep }); addSep(sep); updateScene(); G.shake();
    director(`EVENT BEGINS: ${ev.setup} Narrate the opening of the scene and show Yui's first reaction.`);
  };
  function finishEvent(ev) {
    S.eventsDone.push(ev.id); S.gems += 10; S.coins += 20; const sv = S.eventRun.saved; S.eventRun = null;
    S.minute = sv.minute; S.loc = sv.loc; S.weather = sv.weather; S.phone = sv.phone; G.save();
    G.toast(t('event_clear', ev.title[L()]), 3200); G.sfx('sparkle'); G.petalBurst(20);
    const sep = `— ${ev.title[L()]} ✓ —`; S.entries.push({ k: 's', text: sep }); addSep(sep); updateScene();
    if (sv.pending) promptChoice(sv.pending);
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
        send(`*gives Yui: ${it.en}*`, { gift: it });
      }); pop.append(b);
    });
    pop.hidden = false;
  });

  // ---------- input ----------
  $('#composer', page).addEventListener('submit', e => {
    e.preventDefault(); const v = said.value.trim(); if (!v || busy) return;
    said.value = ''; S.pendingChoice = null; if (S.eventRun?.picked === 'open') S.eventRun.picked = 'skipped'; send(v);
  });
  $('#moveBtn', page).addEventListener('click', () => {
    if (busy || S.eventRun || S.pendingChoice) return;
    if (slot().id === 'night') endDay(); else advance();
  });

  // ---------- open / close ----------
  async function open() {
    updateScene(); G.applyI18n();
    if (!rendered) {
      rendered = true; log.innerHTML = ''; S.entries.slice(-14).forEach(addStatic); scrollEnd();
      const y = [...S.entries].reverse().find(e => e.k === 'y'); if (y) setEmotion(y.em || 'neutral', '');
    }
    if (!G.getKey()) return;
    if (!S.intro) { S.intro = true; G.save(); await director('FIRST MORNING (Day 1, 07:00). The player wakes up in their bedroom, a high school student. Yui is a classmate they barely know. Narrate the quiet morning and hint that school (and Yui) awaits. Yui is not here.'); return; }
    if (S.pendingChoice && box.hidden) promptChoice(S.pendingChoice);
    else if (S.eventRun?.picked === 'open') showEventChoice(activeEvent());
  }
  G.pages.story = { show: on => { page.classList.toggle('show', on); if (on) { open(); if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => said.focus(), 50); } } };
  G.on('lang', () => { labelUi(); updateScene(); });
  G.on('ready', () => { updateScene(); });
  G.on('route', r => { if (r === '/home' && lastSpeech) G.say(lastSpeech.replace(/\n/g, ' ')); });

  G.start();
})();