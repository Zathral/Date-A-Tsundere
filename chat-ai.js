// chat-ai.js: Gemini chat, affection stages, school events, memory snippets
(() => {
  const G = window.TsunGame;
  if (!G) return;
  const { STATE, renderState, saveState, showToast, say, burst, bumpCharacter, clamp, params } = G;

  const KEYS = ['tsun.history', 'tsun.memories', 'tsun.eventsDone'];
  if (params.has('reset')) KEYS.forEach(k => localStorage.removeItem(k));

  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
  const store = (k, v) => localStorage.setItem(k, JSON.stringify(v));

  let history = load('tsun.history', []);          // [{role:'user'|'model', text}]
  let memories = load('tsun.memories', []);        // ["likes ramen", ...]
  let eventsDone = load('tsun.eventsDone', []);    // ["rain", ...]
  let currentEvent = null;
  let eventTurns = 0;
  let busy = false;

  const EVENTS = [
    { id: 'rain',      min: 2,  title: 'Rainy Afternoon',      opener: "Why are you standing there? ...Fine. One umbrella. Don't get any ideas." },
    { id: 'library',   min: 5,  title: 'Library Duty',         opener: "Of all people, the committee paired me with you. Shelve quietly, okay?" },
    { id: 'festival',  min: 9,  title: 'Culture Festival',     opener: "Don't laugh at the apron! One snicker and I'm throwing a tray at you." },
    { id: 'study',     min: 13, title: 'Exam Study Session',   opener: "Sit. Open your textbook. I'm only helping so you don't drag the class average down." },
    { id: 'fireworks', min: 17, title: 'Summer Festival Night', opener: "My friends cancelled, that's all. This yukata? It was lying around. Stop staring!" },
    { id: 'rooftop',   min: 20, title: 'Rooftop at Sunset',    opener: "You came. G-good. There's something I... n-never mind. Just stand there." }
  ];

  const STAGES = [[3, 'Acquaintance'], [8, 'Classmate'], [13, 'Friend'], [18, 'Close'], [20, 'Smitten']];
  const stageName = a => (STAGES.find(([max]) => a <= max) || STAGES[4])[1];

  const OPENERS = {
    Acquaintance: "...You're in my class, right? Don't expect me to chat.",
    Classmate: "Oh, it's you again. What do you want this time?",
    Friend: "You're late. N-not that I was counting.",
    Close: "I was just thinking about... nothing! What is it?",
    Smitten: "Hey. ...Don't make that face, I'm not blushing."
  };

  const chatView = document.getElementById('chatView');
  const chatLine = document.getElementById('chatLine');
  const chatTurns = document.getElementById('chatTurns');

  // inject free-text input under the quick choices
  const form = document.createElement('form');
  form.id = 'chatForm';
  form.setAttribute('data-testid', 'chat-form');
  form.style.cssText = 'display:flex;gap:8px';
  form.innerHTML = `
    <input id="chatInput" maxlength="300" autocomplete="off" placeholder="Say something to Yui..."
      style="flex:1;min-width:0;padding:8px 12px;border:3px solid var(--blue);border-radius:999px;font:inherit;font-weight:900;color:#284aa4">
    <button type="submit" class="chat-choice" style="min-width:64px">Send</button>`;
  chatView.querySelector('.chat-actions').after(form);
  const input = form.querySelector('input');

  // small stage/event banner in the meta row
  const meta = chatView.querySelector('.chat-meta');
  const banner = document.createElement('span');
  meta.prepend(banner);
  function renderBanner() {
    banner.textContent = `${stageName(STATE.affection)}${currentEvent ? ' · ' + currentEvent.title : ''}`;
  }

  function openChatRoute() {
    document.querySelector('.nav-btn[data-route="/chat"]').click();
  }

  function nextEvent() {
    return EVENTS.find(e => !eventsDone.includes(e.id));
  }

  function startEvent(ev) {
    currentEvent = ev;
    eventTurns = 0;
    history.push({ role: 'model', text: ev.opener });
    store('tsun.history', history);
    openChatRoute();
    chatLine.textContent = ev.opener;
    renderBanner();
    showToast(`Event: ${ev.title}`);
  }

  function finishEvent() {
    eventsDone.push(currentEvent.id);
    store('tsun.eventsDone', eventsDone);
    STATE.gems += 10;
    STATE.affection = clamp(STATE.affection + 1, 0, STATE.affectionMax);
    saveState(); renderState();
    showToast(`Event cleared: ${currentEvent.title}  +10 gems, +1 affection`);
    currentEvent = null;
    renderBanner();
  }

  async function send(text) {
    text = text.trim();
    if (busy || !text) return;
    busy = true;
    input.value = '';
    form.querySelector('button').disabled = true;
    history.push({ role: 'user', text });
    chatLine.textContent = '...';

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
          username: STATE.username
        })
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || res.status);
      const out = await res.json();

      const before = stageName(STATE.affection);
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

      chatLine.textContent = out.reply;
      say(out.reply);
      bumpCharacter();
      if (out.affection_delta !== 0) {
        showToast(`${out.affection_delta > 0 ? '+' : ''}${out.affection_delta} affection`);
      }
      const r = form.getBoundingClientRect();
      if (out.affection_delta > 0) burst(r.left + r.width / 2, r.top, 4 + out.affection_delta * 2);

      const after = stageName(STATE.affection);
      if (after !== before) setTimeout(() => showToast(`Relationship: ${after}`), 1700);

      if (currentEvent && ++eventTurns >= 5) finishEvent();
      renderBanner();
    } catch (e) {
      history.pop(); // drop the unanswered user message
      chatLine.textContent = "...My connection is bad. It's not your fault. Probably.";
      console.warn('chat failed', e);
    } finally {
      busy = false;
      form.querySelector('button').disabled = false;
      input.focus();
    }
  }

  form.addEventListener('submit', e => { e.preventDefault(); send(input.value); });

  // show opener / last line when chat opens
  document.addEventListener('click', e => {
    const btn = e.target.closest('button');
    if (!btn) return;
    const route = btn.dataset.route;

    if (route === '/chat') {
      const last = [...history].reverse().find(h => h.role === 'model');
      chatLine.textContent = last ? last.text : OPENERS[stageName(STATE.affection)];
      renderBanner();
    }

    // Event card and big Event button start the next unlocked event
    if (route === '/event' || route === '/lesson/01') {
      if (currentEvent) { openChatRoute(); return; }
      const ev = nextEvent();
      if (!ev) { showToast('All events cleared. More coming soon!'); return; }
      if (STATE.affection < ev.min) { showToast(`Locked: "${ev.title}" needs ${ev.min} affection`); return; }
      startEvent(ev);
    }
  });

  renderBanner();
  window.TsunChat = { send, EVENTS, get history() { return history; }, get memories() { return memories; } };
})();