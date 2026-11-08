// chat-ai.js: Gemini chat, language toggle, affection stages, school events, memories
(() => {
  const G = window.TsunGame;
  if (!G) return;
  const { STATE, renderState, saveState, showToast, say, burst, bumpCharacter, clamp, params } = G;

  const KEYS = ['tsun.history', 'tsun.memories', 'tsun.eventsDone', 'tsun.lang'];
  if (params.has('reset')) KEYS.forEach(k => localStorage.removeItem(k));

  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const store = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  let lang = localStorage.getItem('tsun.lang') === 'ja' ? 'ja' : 'en';
  let history = load('tsun.history', []);
  let memories = load('tsun.memories', []);
  let eventsDone = load('tsun.eventsDone', []);
  let currentEvent = null;
  let eventTurns = 0;
  let busy = false;

  const T = {
    en: {
      title: 'Chat with Yui', toggle: '日本語', placeholder: 'Say something to Yui...', send: 'Send',
      choices: { tease: 'Tease back', sincere: 'Be sincere', lesson: 'Ask about lesson' },
      preview: 'Next lesson reward: +1 rank progress', previewTag: 'Preview',
      turns: 'Turns: ', cap: 'Affection cap: 20',
      stages: ['Acquaintance', 'Classmate', 'Friend', 'Close', 'Smitten'],
      openers: [
        "...You're in my class, right? Don't expect me to chat.",
        'Oh, it\'s you again. What do you want this time?',
        "You're late. N-not that I was counting.",
        'I was just thinking about... nothing! What is it?',
        "Hey. ...Don't make that face, I'm not blushing."
      ],
      offline: "...My connection is bad. It's not your fault. Probably.",
      event: 'Event: ', cleared: 'Event cleared: ', reward: '  +10 gems, +1 affection',
      locked: (t, n) => `Locked: "${t}" needs ${n} affection`,
      allDone: 'All events cleared. More coming soon!', relationship: 'Relationship: ', affection: ' affection'
    },
    ja: {
      title: 'ユイとチャット', toggle: 'English', placeholder: 'ユイに話しかけてみよう…', send: '送信',
      choices: { tease: 'からかう', sincere: '素直になる', lesson: '授業のこと' },
      preview: '次の授業の報酬: ランク進行 +1', previewTag: 'プレビュー',
      turns: 'ターン: ', cap: '好感度の上限: 20',
      stages: ['知り合い', 'クラスメイト', '友達', '親しい仲', '特別な人'],
      openers: [
        '…同じクラスの人、だよね。べ、別におしゃべりしたいわけじゃないから。',
        'あ、また来たの？今度は何の用？',
        '遅いじゃない。べ、別に数えてたわけじゃないけど！',
        'ちょっと考え事してただけ…何でもない！で、何？',
        'ねえ。…そんな顔しないで。赤くなってなんかないから。'
      ],
      offline: '…回線の調子が悪いだけ。べ、別にあんたのせいじゃないから。',
      event: 'イベント: ', cleared: 'イベントクリア: ', reward: '  ジェム+10、好感度+1',
      locked: (t, n) => `「${t}」は好感度${n}で解放`,
      allDone: 'イベントは全部クリア！続きはお楽しみに', relationship: '関係: ', affection: ' 好感度'
    }
  };

  const JA_CHOICE_LINES = {
    tease: '今日は強気じゃない。…いいわ、気の利いた返事ひとつだけ許してあげる。',
    sincere: 'そ、そんなストレートに言わないでよ！ほら、コインあげるから、にやにやしないで。',
    lesson: '次の授業を受ければランクが上がるのよ。覚えてるのは、誰かがやらなきゃだから。'
  };

  const EVENTS = [
    { id: 'rain',      min: 2,  title: { en: 'Rainy Afternoon',       ja: '雨の放課後' },
      opener: { en: "Why are you standing there? ...Fine. One umbrella. Don't get any ideas.", ja: 'なんでそこに突っ立ってるの？…仕方ないわね、傘は一本だけ。変な勘違いしないでよ。' } },
    { id: 'library',   min: 5,  title: { en: 'Library Duty',          ja: '図書当番' },
      opener: { en: 'Of all people, the committee paired me with you. Shelve quietly, okay?', ja: 'よりによって委員会があんたとペアにするなんて。静かに片づけてよね。' } },
    { id: 'festival',  min: 9,  title: { en: 'Culture Festival',      ja: '文化祭' },
      opener: { en: "Don't laugh at the apron! One snicker and I'm throwing a tray at you.", ja: 'エプロン笑わないで！ちょっとでも笑ったらお盆投げるから。' } },
    { id: 'study',     min: 13, title: { en: 'Exam Study Session',    ja: '試験勉強会' },
      opener: { en: "Sit. Open your textbook. I'm only helping so you don't drag the class average down.", ja: '座って。教科書を開く。クラスの平均点を下げられたくないから教えるだけだからね。' } },
    { id: 'fireworks', min: 17, title: { en: 'Summer Festival Night', ja: '夏祭りの夜' },
      opener: { en: "My friends cancelled, that's all. This yukata? It was lying around. Stop staring!", ja: '友達が来れなくなっただけ。この浴衣？たまたま家にあっただけ。じろじろ見ないで！' } },
    { id: 'rooftop',   min: 20, title: { en: 'Rooftop at Sunset',     ja: '夕暮れの屋上' },
      opener: { en: "You came. G-good. There's something I... n-never mind. Just stand there.", ja: '来たのね。よ、よかった。あのね、私…な、なんでもない。そこに立ってて。' } }
  ];

  const STAGE_MAX = [3, 8, 13, 18, 20];
  const stageIdx = a => Math.max(0, STAGE_MAX.findIndex(m => a <= m));
  const stageName = a => T[lang].stages[stageIdx(a)];

  const chatView = document.getElementById('chatView');
  const chatLine = document.getElementById('chatLine');
  const chatTurns = document.getElementById('chatTurns');
  const lessonPreview = document.getElementById('lessonPreview');

  // ---- UI injection ----
  const title = chatView.querySelector('.chat-title');
  const head = document.createElement('div');
  head.className = 'chat-head';
  title.before(head);
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'lang-toggle';
  toggle.setAttribute('aria-label', 'Language');
  head.append(title, toggle);

  const banner = document.createElement('div');
  banner.className = 'chat-banner';
  head.after(banner);

  const translation = document.createElement('div');
  translation.className = 'chat-translation';
  chatLine.after(translation);

  const form = document.createElement('form');
  form.className = 'chat-form';
  form.setAttribute('data-testid', 'chat-form');
  form.innerHTML = '<input class="chat-input" maxlength="300" autocomplete="off"><button type="submit" class="chat-choice"></button>';
  chatView.querySelector('.chat-actions').after(form);
  const input = form.querySelector('input');
  const sendBtn = form.querySelector('button');

  const capSpan = chatView.querySelector('.chat-meta').lastElementChild;
  const turnsLabel = chatTurns.parentNode.firstChild; // text node "Turns: "
  const previewSpans = lessonPreview.querySelectorAll(':scope > span');

  function applyLang() {
    const t = T[lang];
    document.documentElement.lang = lang;
    title.textContent = t.title;
    toggle.textContent = t.toggle;
    input.placeholder = t.placeholder;
    sendBtn.textContent = t.send;
    chatView.querySelectorAll('[data-chat-choice]').forEach(b => { b.textContent = t.choices[b.dataset.chatChoice]; });
    previewSpans[0].textContent = t.preview;
    previewSpans[1].textContent = t.previewTag;
    turnsLabel.nodeValue = t.turns;
    capSpan.textContent = t.cap;
    renderBanner();
  }

  function renderBanner() {
    banner.textContent = stageName(STATE.affection) + (currentEvent ? ' · ' + currentEvent.title[lang] : '');
  }

  function showLine(text, tr) {
    chatLine.textContent = text;
    translation.textContent = tr || '';
    translation.classList.toggle('show', !!tr);
  }

  toggle.addEventListener('click', () => {
    lang = lang === 'en' ? 'ja' : 'en';
    localStorage.setItem('tsun.lang', lang);
    applyLang();
    const last = [...history].reverse().find(h => h.role === 'model');
    if (!last) showLine(T[lang].openers[stageIdx(STATE.affection)]);
    showToast(lang === 'ja' ? '日本語モード' : 'English mode');
  });

  // ---- events ----
  const openChatRoute = () => document.querySelector('.nav-btn[data-route="/chat"]').click();
  const nextEvent = () => EVENTS.find(e => !eventsDone.includes(e.id));

  function startEvent(ev) {
    currentEvent = ev;
    eventTurns = 0;
    history.push({ role: 'model', text: ev.opener[lang] });
    store('tsun.history', history);
    openChatRoute();
    showLine(ev.opener[lang]);
    renderBanner();
    showToast(T[lang].event + ev.title[lang]);
  }

  function finishEvent() {
    const t = T[lang];
    eventsDone.push(currentEvent.id);
    store('tsun.eventsDone', eventsDone);
    STATE.gems += 10;
    STATE.affection = clamp(STATE.affection + 1, 0, STATE.affectionMax);
    saveState(); renderState();
    showToast(t.cleared + currentEvent.title[lang] + t.reward);
    currentEvent = null;
    renderBanner();
  }

  // ---- chat ----
  async function send(text) {
    text = text.trim();
    if (busy || !text) return;
    busy = true;
    input.value = '';
    sendBtn.disabled = true;
    history.push({ role: 'user', text });
    showLine('...');

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: history.slice(-14),
          affection: STATE.affection,
          mood: STATE.mood.id,
          memories,
          event: currentEvent?.id || null,
          username: STATE.username,
          lang
        })
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) throw Object.assign(new Error(out.error || res.status), { out });

      const before = stageIdx(STATE.affection);
      STATE.affection = clamp(STATE.affection + out.affection_delta, 0, STATE.affectionMax);
      STATE.chatTurns += 1;
      history.push({ role: 'model', text: out.reply });
      history = history.slice(-40);
      if (out.memory && !memories.includes(out.memory)) {
        memories = [out.memory, ...memories].slice(0, 8);
        store('tsun.memories', memories);
      }
      store('tsun.history', history);
      saveState(); renderState();

      showLine(out.reply, lang === 'ja' ? out.translation : '');
      say(out.reply);
      bumpCharacter();
      if (out.affection_delta !== 0) {
        showToast(`${out.affection_delta > 0 ? '+' : ''}${out.affection_delta}${T[lang].affection}`);
      }
      if (out.affection_delta > 0) {
        const r = form.getBoundingClientRect();
        burst(r.left + r.width / 2, r.top, 4 + out.affection_delta * 2);
      }
      const after = stageIdx(STATE.affection);
      if (after !== before) setTimeout(() => showToast(T[lang].relationship + T[lang].stages[after]), 1700);

      if (currentEvent && ++eventTurns >= 5) finishEvent();
      renderBanner();
    } catch (e) {
      history.pop();
      input.value = text; // let the player retry without retyping
      showLine(T[lang].offline);
      console.warn('chat failed:', e.message, e.out || '');
    } finally {
      busy = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', e => { e.preventDefault(); send(input.value); });

  document.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;

    // translated reply for the quick choices (the base game script only has English)
    if (btn.dataset.action === 'chat-choice' && lang === 'ja') {
      const line = JA_CHOICE_LINES[btn.dataset.chatChoice];
      if (line) { showLine(line); say(line); }
      return;
    }

    const route = btn.dataset.route;
    if (route === '/chat') {
      const last = [...history].reverse().find(h => h.role === 'model');
      showLine(last ? last.text : T[lang].openers[stageIdx(STATE.affection)]);
      renderBanner();
    }
    if (route === '/event' || route === '/lesson/01') {
      if (currentEvent) { openChatRoute(); return; }
      const ev = nextEvent();
      if (!ev) { showToast(T[lang].allDone); return; }
      if (STATE.affection < ev.min) { showToast(T[lang].locked(ev.title[lang], ev.min)); return; }
      startEvent(ev);
    }
  });

  applyLang();
  window.TsunChat = { send, EVENTS, get history() { return history; }, get memories() { return memories; } };
})();