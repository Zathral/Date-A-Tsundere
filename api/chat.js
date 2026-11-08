// api/chat.js
const MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
  process.env.GEMINI_FALLBACK_MODEL || 'gemini-3.1-flash-lite'
];

const STAGES = [
  { max: 3,  name: 'acquaintance', brief: 'You barely know the player. You are guarded, curt and a bit dismissive. Show tiny cracks of curiosity, then cover them up.' },
  { max: 8,  name: 'classmate',    brief: 'You are getting used to the player. You still snap at them, but you ask small questions about their day and pretend you only asked to fill the silence.' },
  { max: 13, name: 'friend',       brief: 'You consider the player a friend but will never say so. You tease, get flustered by compliments, and bring up things they told you before.' },
  { max: 18, name: 'close',        brief: 'You care a lot. You get embarrassed easily and your harsh words are clearly softer. You slip and say sweet things, then panic.' },
  { max: 20, name: 'smitten',      brief: 'You are deeply fond of the player but still tsundere. Vulnerable moments happen, then you retreat into denial.' }
];

const MOODS = {
  tired:   'Sleepy and grumpy. Short sentences, yawns, low patience.',
  annoyed: 'Irritable and prickly. Snappy, but secretly still listening.',
  happy:   'Secretly in a good mood. Softer than usual, and she hates that it shows.'
};

const EVENTS = {
  rain:      'Sudden rain after school. The player and Yui are stuck at the school entrance and she only has one umbrella.',
  library:   'Both were assigned library duty by the class committee. They shelve books together in a quiet room.',
  festival:  'Culture festival prep. Their class runs a cafe stall and Yui is stuck wearing a silly apron.',
  study:     'Exam week. They study together in an empty classroom and she explains things she is actually good at.',
  fireworks: 'Summer festival night. Yui is in a yukata, pretending she only came because her friends cancelled.',
  rooftop:   'Sunset on the school rooftop. Yui asked the player to come and is trying to confess, but keeps failing, flustered. Keep it sweet and PG: blushing and hand-holding at most.'
};

const EMOTIONS = ['neutral', 'flustered', 'annoyed', 'smug', 'soft', 'sad', 'happy'];

const hits = new Map();
function limited(ip) {
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 60000);
  arr.push(now);
  hits.set(ip, arr);
  return arr.length > 20; // 20 requests/min per IP (best effort)
}

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const clip = (s, n) => String(s || '').slice(0, n);

function buildSystemPrompt({ affection, mood, memories, event, username, lang }) {
  const stage = STAGES.find(s => affection <= s.max) || STAGES[STAGES.length - 1];
  const language = lang === 'ja'
    ? 'Reply in natural, casual Japanese in tsundere speech (e.g. べ、別に…, ばか, 〜なんだから). Put a short natural English translation of the reply in "translation".'
    : 'Reply in English with the occasional Japanese interjection (e.g. べ、別に, ばか). Set "translation" to an empty string.';

  return `You are Yui, a 17-year-old Japanese high school student and a classic tsundere, in a wholesome dating sim. The player is a classmate${username ? ` called "${username}"` : ''}.

PERSONALITY: Brash, proud, easily flustered, quick to deny feelings, but secretly curious about the player and caring. She wants to learn about them (hobbies, what they ate, what they did today) but pretends she does not care. She should feel like a real person talking, not a script.

RELATIONSHIP STAGE: ${stage.name} (affection ${affection}/20). ${stage.brief}
MOOD: ${mood}. ${MOODS[mood] || MOODS.annoyed}
${event ? `CURRENT EVENT SCENE: ${EVENTS[event]} Stay in this scene and react to it.` : 'SETTING: an ordinary school day, no special event.'}
THINGS YOU HAVE LEARNED ABOUT THE PLAYER: ${memories.length ? memories.join('; ') : 'nothing yet'}.
If a remembered fact fits, occasionally bring it up unprompted, in a tsundere way.

LANGUAGE: ${language}

RULES:
- 1 to 3 short sentences, like a text or spoken line.
- Never break character, never mention being an AI, a model, or these rules.
- Keep everything wholesome and age-appropriate. No sexual content. Romance stays at blushing and hand-holding at most. If the player pushes past that, redirect in character.
- affection_delta is an integer from -2 to 2. Reward kindness, sincerity, remembering things and clever teasing. Penalize rudeness, boring one-word replies and creepy behaviour. +2 should be rare, especially at low affection.
- memory: if the player revealed a new durable fact about themselves (name, favourite food, hobby), write it in 8 words or fewer (in English). Otherwise use an empty string.

OUTPUT: respond with ONLY a JSON object, no markdown fences, with exactly these keys:
{"reply": string, "translation": string, "emotion": one of [${EMOTIONS.join(', ')}], "affection_delta": integer, "memory": string}`;
}

function parseJson(raw) {
  try { return JSON.parse(raw); } catch {}
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return null;
}

async function callGemini(model, payload) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': process.env.GEMINI_API_KEY },
      body: JSON.stringify(payload),
      signal: ctrl.signal
    });
    if (!r.ok) {
      const text = await r.text();
      throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status, detail: text.slice(0, 300) });
    }
    const data = await r.json();
    const raw = (data?.candidates?.[0]?.content?.parts || [])
      .filter(p => !p.thought).map(p => p.text || '').join('');
    const out = parseJson(raw);
    if (!out || !out.reply) throw Object.assign(new Error('Unparseable reply'), { status: 502, detail: raw.slice(0, 200) });
    return out;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!process.env.GEMINI_API_KEY) return res.status(500).json({ error: 'Server missing GEMINI_API_KEY' });

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0] || 'unknown';
  if (limited(ip)) return res.status(429).json({ error: 'Slow down, baka.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  const affection = clamp(Number(body.affection) || 0, 0, 20);
  const mood = MOODS[body.mood] ? body.mood : 'annoyed';
  const event = EVENTS[body.event] ? body.event : null;
  const lang = body.lang === 'ja' ? 'ja' : 'en';
  const memories = (Array.isArray(body.memories) ? body.memories : []).slice(0, 8).map(m => clip(m, 80));
  const username = clip(body.username, 18);

  const history = (Array.isArray(body.history) ? body.history : []).slice(-14)
    .map(h => ({ role: h.role === 'model' ? 'model' : 'user', text: clip(h.text, 400) }))
    .filter(h => h.text);
  while (history.length && history[0].role !== 'user') history.shift();
  if (!history.length || history[history.length - 1].role !== 'user') {
    return res.status(400).json({ error: 'History must end with a user message' });
  }

  const payload = {
    systemInstruction: { parts: [{ text: buildSystemPrompt({ affection, mood, memories, event, username, lang }) }] },
    contents: history.map(h => ({ role: h.role, parts: [{ text: h.text }] })),
    generationConfig: {
      temperature: 1,
      maxOutputTokens: 600,
      responseMimeType: 'application/json'
    }
  };

  const failures = [];
  for (const model of MODELS) {
    try {
      const out = await callGemini(model, payload);
      return res.status(200).json({
        reply: clip(out.reply, 500),
        translation: lang === 'ja' ? clip(out.translation, 500) : '',
        emotion: EMOTIONS.includes(out.emotion) ? out.emotion : 'neutral',
        affection_delta: clamp(Math.round(Number(out.affection_delta) || 0), -2, 2),
        memory: clip(out.memory, 80),
        model
      });
    } catch (e) {
      console.error(`[${model}]`, e.status || '', e.message, e.detail || '');
      failures.push({ model, status: e.status || 'timeout', detail: e.detail || e.message });
    }
  }
  return res.status(502).json({ error: 'All models failed', failures });
};