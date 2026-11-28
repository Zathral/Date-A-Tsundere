// js/events2.js: vibe stats, random events, quests, Yui-led agendas
// Load AFTER js/mini.js and BEFORE js/story.js
(() => {
  const { S } = G, L = () => G.settings.lang;
  S.flags ||= {}; S.quests ||= {}; S.evtLast ||= {}; S.skips ||= 0; S.skipToday ||= 0;
  S.moveCool ||= 0; S.leadCool ||= 0; S.opening ||= ''; S.quick ||= []; S.rolledSlot ||= '';

  Object.assign(G.STR.en, {
    st_chill: 'Chill', st_nonchalant: 'Nonchalant', st_playful: 'Playful',
    quick_ask: 'How do you respond? (or just type)', vibe_fit: 'Your tone matched her mood. +1 affection',
    ev_done: (t, g, c) => `Event cleared: ${t}  +${g} gems, +${c} coins`,
    quest_new: n => `New quest: ${n}`, quest_up: n => `Quest updated: ${n}`,
    j_quests: 'Quests', q_none: 'No quests yet. Keep your eyes open...',
    skip_btn: 'Skip class', skip_ask: 'Leave class?', skip_walk: 'Slip out quietly',
    skip_sick: 'Fake a stomachache', skip_stay: 'Stay in class', lunch_skip: 'Skip the afternoon',
    slot_skip: 'Skipping school', next_skip: 'Wait for the day to end',
    moment: s => `A moment opens up! (${s})`
  });
  Object.assign(G.STR.ja, {
    st_chill: 'まったり', st_nonchalant: 'クール', st_playful: 'いたずら',
    quick_ask: 'どう返す？（自由入力もOK）', vibe_fit: '口調が彼女の機嫌に合った！好感度+1',
    ev_done: (t, g, c) => `イベントクリア: ${t}  ジェム+${g}、コイン+${c}`,
    quest_new: n => `新クエスト: ${n}`, quest_up: n => `クエスト更新: ${n}`,
    j_quests: 'クエスト', q_none: 'まだクエストはありません。周りをよく見てみよう…',
    skip_btn: 'サボる', skip_ask: '授業を抜け出す？', skip_walk: 'こっそり抜け出す',
    skip_sick: '腹痛のふりをする', skip_stay: '授業に残る', lunch_skip: '午後はサボる',
    slot_skip: 'サボり中', next_skip: '放課後まで待つ',
    moment: s => `チャンス到来！（${s}）`
  });

  // ---------- new "vibe" stats ----------
  G.VIBES = ['chill', 'nonchalant', 'playful'];
  G.STATS.push(...G.VIBES);
  Object.assign(G.POOLS, { chill: ['timing', 'memory'], nonchalant: ['timing', 'quiz'], playful: ['aim', 'scramble'] });
  G.VIBE_FIT = { tired: 'chill', annoyed: 'nonchalant', happy: 'playful' }; // which tone suits which mood

  // ---------- tiny helpers for writing events ----------
  const T = (en, ja) => ({ en, ja });
  const C = (at, en, ja, options) => ({ at, ask: T(en, ja), options });
  // option: vibe (xp stat), labels, director note, affection delta, extras
  // extras: stat (minigame roll), req {stat,lv}, loc, min, coins, flag, fact, quest [id,stage], gift, end, xp
  const O = (vibe, en, ja, note, delta = 1, x = {}) => ({ en, ja, note, delta, xp: { [vibe]: 3 }, ...x });
  const E = o => ({ rep: true, at: 'turn', ...o }); // rep:true = repeatable, rep:false = once
  const qs = id => (S.quests[id] ||= { stage: -1, day: 0 });
  const Q = (id, n) => ({ quest: [id, n] });
  const npcHere = id => G.where(id) === S.loc;
  const HOW = { walk: 'quietly slipped out', excused: 'faked a stomachache and was excused', nurse: 'faked a stomachache but the nurse saw through it', caught: 'got caught sneaking out' };

  G.addFact = f => { S.storyFacts = [f, ...(S.storyFacts || []).filter(x => x !== f)].slice(0, 12); G.save(); };
  G.hasGift = () => G.ITEMS.some(i => i.r !== 'N' && S.inventory[i.id] > 0);
  G.takeGift = () => {
    const it = G.ITEMS.filter(i => i.r !== 'N' && S.inventory[i.id] > 0).sort((a, b) => ['R', 'SR', 'SSR'].indexOf(a.r) - ['R', 'SR', 'SSR'].indexOf(b.r))[0];
    if (it) { S.inventory[it.id]--; S.flags.bday_gift = it.en; }
    return it;
  };

  // ---------- quests ----------
  G.QUESTS = {
    charm: { title: T("Yui's Lost Charm", 'ユイの失くしたお守り'), hints: [
      T("Ask Granny Sato (Shopping street) if she saw Yui's cat charm.", '商店街のサトウばあちゃんに、ユイの猫のお守りを見なかったか聞こう。'),
      T('Search the Riverside near the old bridge.', '古い橋の近くの河川敷を探そう。'),
      T('Get the charm repaired. Mika at Cafe Komorebi has a sewing kit.', 'お守りを直そう。カフェ木漏れ日のミカが裁縫道具を持ってる。'),
      T('Give the charm back to Yui.', 'お守りをユイに返そう。')] },
    bday: { title: T("Yui's Birthday", 'ユイの誕生日'), hints: [
      T('Ask Mika at Cafe Komorebi to help plan a surprise.', 'カフェ木漏れ日でミカにサプライズの相談をしよう。'),
      T("Get a gift (R rarity or better: Gacha, or Granny Sato's Cat Keychain), then show it to Granny Sato on the Shopping street.", 'プレゼント（R以上。ガチャかサトウばあちゃんのねこのキーホルダー）を用意して、商店街のサトウばあちゃんに見せよう。'),
      T('Throw the surprise! Find Yui on another day.', 'サプライズ開催！別の日にユイを探そう。')] }
  };
  G.questList = () => Object.entries(G.QUESTS).map(([id, q]) => {
    const s = (S.quests[id] || {}).stage ?? -1;
    return { id, stage: s, title: q.title[L()], done: s >= q.hints.length, hint: s >= 0 && s < q.hints.length ? q.hints[s][L()] : '' };
  }).filter(q => q.stage >= 0);
  G.questHint = () => (G.questList().find(q => !q.done) || {}).hint || '';
  G.questHtml = () => {
    const l = G.questList();
    return `<h3>${G.t('j_quests')}</h3>` + (l.length
      ? `<ul>${l.map(q => `<li>${q.done ? '✓ ' : '📜 '}<b>${q.title}</b>${q.done ? '' : `<br><span class="muted">${q.hint}</span>`}</li>`).join('')}</ul>`
      : `<p class="muted">${G.t('q_none')}</p>`);
  };

  // ---------- Yui leads: agendas she works into her replies ----------
  const TOPICS = ['the stray cat she secretly feeds near the park', 'a manga she pretends she does not read', 'her fear of failing the next exam', 'her older brother who keeps teasing her', 'baking, which she is secretly bad at', 'what she wants to do after graduation', 'her favourite ramune flavour', 'a teacher she cannot stand'];
  G.YUI_LIFE = TOPICS.join('; ');
  G.agenda = () => {
    if (S.leadCool > 0) { S.leadCool--; return ''; }
    if (S.talk || !G.story.present()) return '';
    const id = G.story.slot().id, pool = [];
    if (S.phone) pool.push('Yui texts about something that happened to her tonight and asks what the player is up to.');
    if (id === 'commute') pool.push('Yui asks whether the player finished the homework, hoping to compare answers.');
    if (id === 'am' || id === 'pm') pool.push('Yui whispers a question during class: what is the player doing after school?', 'Yui passes a note with a nosy question about the player.');
    if (id === 'lunch') pool.push('Yui asks what the player brought for lunch and eyes it.');
    if (id === 'after') pool.push('Yui asks what the player is doing after school and hints she wants to go somewhere (the cafe or the shopping street) without ever saying it.');
    if (S.affection >= 4) pool.push('Yui offers to share something she made and claims it is leftovers.');
    if (G.weekend()) pool.push('Yui acts like she just happened to be here and demands to know what the player is doing today.');
    pool.push("Yui brings up one of her own topics from YUI'S LIFE and asks what the player thinks.");
    S.leadCool = 2;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  // ---------- the event pool ----------
  const R = G.RANDOM_EVENTS = [
    // ===== school life =====
    E({ id: 'confront_mei', slots: ['am', 'lunch', 'pm'], aff: [2, 20], we: false, title: T('Classmates Close In', 'クラスメイトに囲まれて'),
      setup: 'Mei and two other classmates corner Yui at her desk and accuse her of acting stuck-up and ignoring everyone. Yui is stiff and defensive, clearly hurt under the attitude. The player is right there. Mei and the others are minor classmates: voice them in narration only, never in <s>.',
      beats: ['Mei and the others react to what the player just did; the tension shifts accordingly.', 'They back off. Yui insists she never needed help, but her hands are slightly shaking.'],
      choices: [C(0, 'Three pairs of eyes turn to you.', '三人の視線がこちらに向く。', [
        O('chill', 'Step in calmly: "Not here."', '落ち着いて割って入る', 'The player stepped in calmly and firmly to defuse the confrontation.'),
        O('nonchalant', 'Shrug it off, change the subject', '肩をすくめて話題を変える', 'The player shrugged it off and casually changed the subject.'),
        O('playful', 'Break the tension with a joke', '冗談で空気を変える', 'The player cracked a joke to break the tension.', 1, { stat: 'wit' }),
        O('chill', '★ End it with one calm sentence', '★ 落ち着いた一言で収める', 'The player ended the confrontation with a single calm, mature sentence.', 2, { req: { stat: 'chill', lv: 2 }, xp: { chill: 4 } })])],
      fact: 'The player stood up for Yui when classmates cornered her.' }),

    E({ id: 'bento_offer', slots: ['lunch'], aff: [4, 20], we: false, cd: 4, title: T("Yui's Bento", 'ユイのお弁当'),
      setup: 'At lunch Yui plops down beside the player and shoves a neatly packed bento at them, insisting she "accidentally made too much" and that it is no big deal. She leads the conversation and watches from the corner of her eye, desperate for a verdict.',
      beats: ['She hovers, pretending to read her phone while waiting for a reaction.', 'She asks, too casually, which thing on the plate the player liked best.'],
      choices: [C(0, 'The bento looks surprisingly good.', 'お弁当は意外なほど美味しそう。', [
        O('chill', 'Eat it and give an honest review', '食べて正直に感想を言う', 'The player ate the bento and gave an honest, kind review.'),
        O('playful', '"Did you make this for me?"', '「わざわざ作ってくれたの？」', 'The player teased Yui about making the bento just for them.', 1, { stat: 'wit' }),
        O('nonchalant', 'Eat it deadpan. "Thanks."', '無言で食べて「ありがと」', 'The player ate the bento deadpan and just said thanks.')])],
      fact: 'Yui made the player a bento and claimed it was an accident.' }),

    E({ id: 'pop_quiz', slots: ['am', 'pm'], we: false, cd: 4, title: T('Pop Quiz!', '抜き打ちテスト'),
      setup: 'The teacher announces a surprise oral quiz and points straight at the player. Yui, seated nearby, pretends not to care but is visibly torn about whether to whisper the answer.',
      beats: ['The class watches; the teacher reacts to how the player handled it.', "Afterwards Yui whispers a sharp comment about the player's performance."],
      choices: [C(0, 'Everyone is looking at you.', 'みんながこっちを見ている。', [
        O('nonchalant', 'Bluff with total confidence', '自信満々にはったりをかます', 'The player bluffed with total confidence.', 1, { stat: 'wit' }),
        O('chill', 'Glance at Yui for help', 'ユイにちらっと助けを求める', 'The player quietly glanced at Yui for help.'),
        O('playful', 'Joke to buy time', '冗談で時間を稼ぐ', 'The player joked to buy time.', 0)])] }),

    E({ id: 'yui_nap', slots: ['pm'], aff: [4, 20], we: false, cd: 5, title: T('Sleeping Beauty', '居眠りユイ'),
      setup: 'In the warm afternoon Yui has fallen asleep at her desk. The teacher is slowly walking down her row. The player is the only one who noticed.',
      beats: ['The teacher reacts to what the player did. Yui stirs, groggy.', 'Yui realizes how close she came to getting caught and flusters, denying she was ever asleep.'],
      choices: [C(0, 'The teacher is two desks away.', '先生はあと二列まで来ている。', [
        O('nonchalant', 'Cover for her with a smooth distraction', 'さりげなく先生の気をそらす', 'The player smoothly distracted the teacher to cover for Yui.', 1, { stat: 'wit' }),
        O('chill', 'Gently nudge her awake', 'そっと肩を叩いて起こす', 'The player gently nudged Yui awake.'),
        O('playful', 'Doodle a tiny cat on her notes', 'ノートに小さな猫を落書きする', 'The player doodled a tiny cat on her notes.', 0)])],
      fact: 'The player covered for Yui when she fell asleep in class.' }),

    E({ id: 'rumor_mill', slots: ['lunch', 'pm'], aff: [6, 20], we: false, cd: 6, title: T('The Rumor', 'うわさ話'),
      setup: 'A rumor is spreading that the player and Yui are secretly dating. Classmates snicker. Yui turns bright red, loudly denies everything, then looks to the player for backup.',
      beats: ['Classmates keep teasing; Yui sputters and keeps glancing at the player.', 'Things calm down. Yui asks, far too casually, whether the rumor bothered the player.'],
      choices: [C(0, 'Everyone is waiting for your reaction.', 'みんなが君の反応を待っている。', [
        O('chill', 'Calmly say it is just a rumor', '落ち着いて「ただの噂だよ」と言う', 'The player calmly said it was just a rumor.'),
        O('playful', 'Play along dramatically', '大げさに話に乗ってみせる', 'The player dramatically played along with the rumor.', 1, { stat: 'charm' }),
        O('nonchalant', 'Shrug. "Let them talk."', '肩をすくめて「言わせとけば」', 'The player shrugged and said to let them talk.')])],
      fact: 'A rumor spread that the player and Yui were dating; Yui denied it loudly.' }),

    // ===== Yui leads =====
    E({ id: 'yui_pull_cafe', at: 'start', slots: ['after'], aff: [5, 20], we: false, cd: 4, loc: 'school_gate', keepLoc: true, title: T("Yui's Detour", 'ユイの寄り道'),
      setup: 'At the school gate Yui blocks the way home and announces, unconvincingly, that Cafe Komorebi has a new dessert she needs a taste-tester for, and the player is the only person she can tolerate. She is leading: she is already walking.',
      beats: ['At the cafe Mika spots them and grins. Yui tries to hide her blush.', 'The dessert arrives. Yui asks a nosy question about the player, then pretends she was not curious.'],
      choices: [C(0, 'Yui is already three steps ahead of you.', 'ユイはもう三歩先を歩いている。', [
        O('chill', 'Go with her', 'ついていく', 'The player went along with Yui to the cafe.', 1, { loc: 'cafe', min: 25 }),
        O('playful', '"Is this a date?"', '「これってデート？」', 'The player teased Yui by asking if this was a date, and went along.', 0, { stat: 'wit', loc: 'cafe', min: 25 }),
        O('nonchalant', 'Rain check, walk home alone', 'また今度、と断る', 'The player declined and said maybe another time.', -1, { end: true })])],
      fact: 'Yui dragged the player to Cafe Komorebi to taste a new dessert.' }),

    E({ id: 'late_text', at: 'start', slots: ['night'], phone: true, yui: false, aff: [6, 20], cd: 3, title: T('Late Night Text', '夜更けのメッセージ'),
      setup: "It is late. The player's phone buzzes: Yui texted first. She claims it was a wrong number, then asks what the player is doing, clearly unable to sleep. She leads the whole chat.",
      beats: ["Yui keeps going with an oddly specific question about the player's day.", 'Her messages get softer and slower as it gets later.'],
      choices: [C(0, 'Your phone lights up with her message.', 'スマホにユイのメッセージが光る。', [
        O('chill', 'Reply right away, warmly', 'すぐに優しく返信する', 'The player replied right away, warmly.'),
        O('nonchalant', 'Wait a bit, then reply casually', '少し待ってから素っ気なく返す', 'The player waited a bit and then replied casually.', 0),
        O('playful', 'Send a ridiculous meme', '変なスタンプを送る', 'The player sent a ridiculous meme.', 1, { stat: 'wit' })])],
      fact: 'Yui texted the player first late at night, pretending it was a mistake.' }),

    E({ id: 'weekend_bump', at: 'arrive', we: true, aff: [2, 20], cd: 3, when: () => G.where('yui') === S.loc, title: T('Fancy Meeting You Here', '偶然ですね'),
      setup: 'On the weekend the player runs into Yui in town. She insists it is a total coincidence, then takes charge: she is running errands and decides the player will tag along and carry things.',
      beats: ['Yui drags the player from stall to stall, narrating her plans like a general.', 'She stops at something cute, pretends not to look at it, and waits to see if the player notices.'],
      choices: [C(0, 'She is already holding out a shopping bag.', '彼女はもう買い物袋を差し出している。', [
        O('chill', 'Offer to carry her bags', '荷物を持つと申し出る', "The player offered to carry Yui's bags."),
        O('playful', '"Are you stalking me?"', '「ストーカー？」', 'The player teased Yui about stalking them.', 1, { stat: 'wit' }),
        O('nonchalant', 'Say "Sure, why not."', '「いいよ、別に」と言う', 'The player agreed casually.')])],
      fact: 'On a weekend Yui "coincidentally" dragged the player along on her errands.' }),

    E({ id: 'stray_cat', at: 'arrive', where: 'park', aff: [3, 20], cd: 5, title: T('The Secret Cat', 'ひみつの猫'),
      setup: 'Yui is crouched behind a bush at the park, secretly feeding a stray cat she has visited for weeks. She freezes when she notices the player.',
      beats: ['The cat reacts to the player. Yui tries hard to keep her tough image.', 'Yui quietly admits the cat has a name and tells why she started feeding it.'],
      choices: [C(0, 'The cat stares at you. Yui stares harder.', '猫がこちらを見ている。ユイはもっと睨んでいる。', [
        O('chill', 'Crouch down quietly and let the cat come', '静かにしゃがんで猫が来るのを待つ', 'The player crouched down quietly and let the cat approach.'),
        O('playful', 'Suggest a ridiculous name for the cat', '猫に変な名前を提案する', 'The player suggested a ridiculous name for the cat.'),
        O('nonchalant', 'Pretend you saw nothing', '何も見なかったふりをする', 'The player pretended not to have seen anything.')])],
      fact: 'Yui secretly feeds a stray cat at the park.' }),

    // ===== consequences of skipping class =====
    E({ id: 'detention', at: 'start', slots: ['after'], we: false, force: true, cd: 1, loc: 'classroom', cost: 40,
      when: () => !!S.flags.detention && S.day === S.flags.detention + 1, done: () => { delete S.flags.detention; },
      title: T('Detention', '居残り掃除'),
      setup: 'The teacher caught the player skipping yesterday, so today the player must stay behind and clean the classroom. Yui is still here too, claiming she is only staying to finish class-rep paperwork. She is actually keeping the player company.',
      beats: ['Yui bosses the player around with a broom, secretly enjoying herself.', 'The sun sets. The classroom is spotless and oddly peaceful.'],
      choices: [C(0, 'The teacher hands you a bucket and leaves.', '先生はバケツを渡して出ていった。', [
        O('grit', 'Clean seriously and finish fast', '真面目にさっさと終わらせる', 'The player cleaned seriously and quickly.', 1, { stat: 'grit' }),
        O('playful', 'Turn the cleaning into a game', '掃除をゲームにする', 'The player turned the cleaning into a game with Yui.', 1, { stat: 'wit' }),
        O('nonchalant', 'Slack off against the wall', '壁にもたれてサボる', 'The player slacked off against the wall while Yui cleaned.', -1)])],
      fact: 'The player served detention after being caught skipping; Yui stayed too.' }),

    E({ id: 'haruka_warning', at: 'start', slots: ['after'], we: false, force: true, rep: false, npc: 'haruka', yui: false, loc: 'library',
      when: () => S.skips >= 3 && G.where('haruka') === 'library', done: () => { S.flags.haruka_warned = S.day; },
      title: T("Council President's Warning", '生徒会長の警告'),
      setup: 'Haruka, the composed student council president, has noticed the player skipping class repeatedly. She summons the player to the library and, in her polite deadpan way, issues a warning, but she also genuinely wants to know why.',
      beats: ['Haruka lays out the attendance record in a perfectly level voice and asks for an explanation.', 'She pours tea, softens slightly, and says she would rather help than punish.'],
      choices: [C(0, 'Haruka folds her hands and waits.', 'ハルカは手を組んで待っている。', [
        O('chill', 'Take it seriously and explain', '真剣に事情を話す', 'The player took the warning seriously and explained honestly.', 1),
        O('playful', 'Deflect with a joke', '冗談でかわす', 'The player tried to deflect with a joke.', 0, { stat: 'wit' }),
        O('nonchalant', 'Shrug it off', '肩をすくめる', 'The player shrugged off the warning.', -1)])],
      fact: 'Haruka, the student council president, warned the player about skipping class.' }),

    E({ id: 'skip_confront', at: 'start', slots: ['after'], we: false, force: true, cd: 1, loc: 'school_gate',
      when: () => S.skipToday === S.day, title: T('Where Did You Go?', 'どこ行ってたの？'),
      setup: () => `The player skipped class today (${HOW[S.skipHow] || 'left early'}). Times skipped so far: ${S.skips}.${S.skips >= 4 ? ' It is a pattern now and she is fed up.' : ''} Yui noticed the empty seat, got worried and then angry, and intercepts the player at the school gate to demand where they went. She lectures, but she obviously cares.`,
      beats: ["Yui reacts to the player's answer, scolding and worried at once.", 'She softens a little and tells the player what the teacher said about the empty seat.'],
      choices: [C(0, 'She is blocking the gate with her arms crossed.', '彼女は腕を組んで校門をふさいでいる。', [
        O('chill', 'Apologize honestly', '正直に謝る', 'The player apologized honestly for skipping.', 0),
        O('playful', '"Did you miss me?"', '「寂しかった？」', 'The player teased Yui by asking if she missed them.', 0, { stat: 'wit' }),
        O('nonchalant', 'Shrug. "Needed some air."', '肩をすくめて「息抜きしたかっただけ」', 'The player shrugged and said they just needed some air.', -1)])],
      fact: 'Yui lectured the player for skipping class.' }),

    E({ id: 'mika_truant', at: 'arrive', where: 'cafe', npc: 'mika', yui: false, cd: 1, force: true,
      when: () => S.skipToday === S.day && npcHere('mika'), title: T("Shouldn't You Be in School?", '学校は？'),
      setup: 'Mika spots the player at the cafe during school hours, raises an eyebrow, and asks, kindly but pointedly, why a kid in uniform is here instead of in class.',
      beats: ['Mika reacts to the answer with a knowing grin.', 'She slides over a drink and a piece of big-sister advice about skipping.'],
      choices: [C(0, 'Mika wipes the counter and waits.', 'ミカはカウンターを拭きながら待っている。', [
        O('chill', 'Be honest about it', '正直に打ち明ける', 'The player was honest with Mika about skipping.'),
        O('playful', 'Spin a smooth excuse', 'うまい言い訳をでっち上げる', 'The player spun a smooth excuse.', 1, { stat: 'wit' }),
        O('grit', 'Offer to work a shift to make up for it', '埋め合わせにバイトを申し出る', 'The player offered to work a shift to make up for it.', 1, { coins: 20, min: 60 })])],
      fact: 'Mika caught the player at the cafe during school hours.' }),

    // ===== quest: Yui's Lost Charm =====
    E({ id: 'q_charm_offer', slots: ['am', 'lunch', 'pm', 'after'], aff: [4, 20], we: false, cd: 5, when: () => qs('charm').stage === -1, title: T('Something Missing', '失くしもの'),
      setup: 'Yui is frantically searching her bag and desk. She lost the little cat charm her grandmother gave her. She insists it is "just a dumb keychain" and needs no help, while obviously panicking.',
      beats: ['Yui keeps pretending she is fine while checking the same pocket again.', 'She admits she last remembers having it somewhere in town after school.'],
      choices: [C(0, 'She is trying very hard not to cry.', '彼女は泣くのを必死でこらえている。', [
        O('chill', 'Offer to help find it', '探すのを手伝うと申し出る', 'The player offered to help find the charm.', 1, Q('charm', 0)),
        O('playful', 'Joke that it ran away to see the world', '「世界を見に旅に出たんだよ」と冗談を言う', 'The player joked that the charm ran away to see the world.', 0, { stat: 'wit', ...Q('charm', 0) }),
        O('nonchalant', 'Shrug. "It will turn up."', '肩をすくめて「そのうち出てくるよ」', 'The player shrugged and said it would turn up.', -1)])],
      fact: 'Yui lost the cat charm her grandmother gave her.' }),

    E({ id: 'q_charm_sato', at: 'arrive', where: 'shopping', npc: 'sato', yui: false, force: true, rep: false, when: () => qs('charm').stage === 0 && npcHere('sato'),
      title: T("Granny Sato's Tip", 'サトウばあちゃんの情報'),
      setup: 'Granny Sato squints at the player. She saw a girl in a school uniform searching the riverside near the old bridge yesterday evening. She will not share for free: she wants work, flattery, or at least good manners.',
      beats: ['Sato bargains and gossips, finally dropping the clue about the old bridge.', 'She pretends not to care, wishes the player luck, and presses a snack into their hand.'],
      choices: [C(0, 'Sato holds out one wrinkled hand, waiting.', 'サトウばあちゃんがしわしわの手を差し出して待っている。', [
        O('grit', 'Carry her crates for a while', '木箱を運ぶのを手伝う', "The player carried Granny Sato's crates for a while.", 1, { min: 30, ...Q('charm', 1) }),
        O('chill', 'Ask politely', '丁寧にお願いする', 'The player asked politely for the clue.', 1, Q('charm', 1)),
        O('playful', 'Flatter her shamelessly', '調子よくおだてる', 'The player flattered Granny Sato shamelessly.', 1, { stat: 'charm', ...Q('charm', 1) })])],
      fact: 'Granny Sato saw a girl searching the riverside near the old bridge.' }),

    E({ id: 'q_charm_river', at: 'arrive', where: 'riverside', yui: false, force: true, rep: false, when: () => qs('charm').stage === 1,
      title: T('Search by the River', '河川敷の捜索'),
      setup: "At the riverside near the old bridge, the player searches for Yui's lost cat charm. Something small and pink glints between the reeds at the waterline.",
      beats: ['The charm turns up: its string is snapped and it is slightly soggy.', 'The player turns it over in their hands. It clearly means a lot to Yui.'],
      choices: [C(0, 'Something pink glints in the reeds.', '葦の間でピンク色のものが光った。', [
        O('grit', 'Wade in after it', '川に入って取りに行く', 'The player waded into the river to fetch the charm.', 1, { stat: 'grit', ...Q('charm', 2) }),
        O('chill', 'Search carefully along the bank', '岸沿いに慎重に探す', 'The player searched carefully along the bank.', 1, { stat: 'wit', ...Q('charm', 2) })])],
      fact: "The player found Yui's broken cat charm by the river." }),

    E({ id: 'q_charm_fix', at: 'arrive', where: 'cafe', npc: 'mika', yui: false, force: true, rep: false, when: () => qs('charm').stage === 2 && npcHere('mika'),
      title: T('A Stitch in Time', '直してあげる'),
      setup: "Mika notices the broken charm in the player's hand and offers her sewing kit and a quiet corner table. She will guide, but wants the player to do the stitching themselves.",
      beats: ['Mika coaches the player through tiny, fiddly stitches, teasing gently.', 'The charm is whole again. Mika says whoever it is for is lucky.'],
      choices: [C(0, 'Mika slides a needle and thread across the table.', 'ミカが針と糸をテーブルの上に滑らせる。', [
        O('craft', 'Stitch it yourself', '自分で縫ってみる', 'The player stitched the charm back together themselves.', 1, { stat: 'craft', ...Q('charm', 3) }),
        O('chill', 'Let Mika guide you slowly', 'ミカに教わりながらゆっくり縫う', 'The player let Mika guide them step by step.', 1, Q('charm', 3))])],
      fact: 'Mika helped the player repair the charm at the cafe.' }),

    E({ id: 'q_charm_return', at: ['start', 'turn', 'arrive'], force: true, rep: false, reward: { gems: 40, coins: 30 },
      when: () => qs('charm').stage === 3, done: () => { qs('charm').stage = 4; }, title: T('The Lucky Charm', 'お守りの行方'),
      setup: 'The player gives Yui her repaired cat charm. Yui is stunned into silence. Her tsundere shell cracks: she nearly cries, tries to deny it, and fails. This is a big emotional moment, but keep it wholesome and sweet: a shy thank-you at most.',
      beats: ['Yui turns the charm over and traces the repaired stitches. She is quiet for a long time.', 'She finally thanks the player in her own awkward way and says she owes them one.'],
      choices: [C(0, 'You hold the charm out to her.', 'お守りを彼女に差し出す。', [
        O('chill', 'Hand it over gently', 'そっと手渡す', 'The player gently handed Yui the repaired charm.', 2),
        O('playful', 'Tease her first, then hand it over', 'からかってから渡す', 'The player teased Yui before handing over the charm.', 1, { stat: 'charm' }),
        O('nonchalant', 'Say you "just happened to find it"', '「たまたま見つけただけ」と言う', 'The player said they just happened to find it.', 2)])],
      fact: "The player found and repaired Yui's grandmother's cat charm. She owes them one." }),

    // ===== quest: Yui's Birthday =====
    E({ id: 'q_bday_slip', slots: ['lunch', 'pm', 'after'], aff: [9, 20], we: false, cd: 5, when: () => qs('bday').stage === -1, title: T('A Slip of the Tongue', 'うっかり発言'),
      setup: 'Yui lets slip that her birthday is in a few days, then immediately insists she does not care and that nobody should do anything. She is obviously hoping someone will.',
      beats: ['Yui scrambles to change the subject and fails.', 'She mutters that birthdays are overrated, in a very unconvincing voice.'],
      choices: [C(0, 'She just realised what she said.', '彼女は自分の失言に気づいた。', [
        O('chill', 'Ask what she would actually like', '本当は何が欲しいか聞く', 'The player gently asked what Yui would actually like.', 1, Q('bday', 0)),
        O('playful', '"So when is it again?"', '「で、いつだっけ？」', 'The player playfully asked when her birthday was again.', 1, Q('bday', 0)),
        O('nonchalant', 'Say "Noted." and change the subject', '「ふーん」とだけ言って話題を変える', 'The player said noted and changed the subject.', 0, Q('bday', 0))])],
      fact: 'Yui let slip that her birthday is coming up.' }),

    E({ id: 'q_bday_mika', at: 'arrive', where: 'cafe', npc: 'mika', yui: false, force: true, rep: false, when: () => qs('bday').stage === 0 && npcHere('mika'),
      title: T('Operation Surprise', 'サプライズ作戦'),
      setup: 'The player asks Mika to help plan a surprise for Yui. Mika lights up, ties on an apron, and proposes baking a cake together in the cafe kitchen.',
      beats: ['Flour everywhere. Mika directs the player with delighted bossiness.', 'The cake is boxed. Mika tells the player to get a proper gift and have Granny Sato wrap it.'],
      choices: [C(0, 'Mika tosses you an apron.', 'ミカがエプロンを投げてよこす。', [
        O('craft', 'Bake the cake together', '一緒にケーキを焼く', 'The player baked the cake with Mika.', 1, { stat: 'craft', ...Q('bday', 1) }),
        O('chill', 'Let Mika do most of it', 'ほとんどミカに任せる', 'The player let Mika handle most of the baking.', 1, Q('bday', 1))])],
      fact: 'Mika baked a birthday cake with the player for Yui.' }),

    E({ id: 'q_bday_gift', at: 'arrive', where: 'shopping', npc: 'sato', yui: false, force: true, rep: false,
      when: () => qs('bday').stage === 1 && npcHere('sato') && G.hasGift(), title: T('Wrapped With Care', '丁寧な包み'),
      setup: "Granny Sato spots the gift in the player's bag, clicks her tongue, and offers to wrap it properly while grilling the player about who it is for.",
      beats: ['Sato wraps and interrogates in equal measure, delighted by the gossip.', 'She ties a ribbon and says the girl had better appreciate it.'],
      choices: [C(0, 'Granny Sato eyes your gift.', 'サトウばあちゃんがプレゼントをじろりと見る。', [
        O('craft', 'Wrap it together', '一緒に包む', 'The player wrapped the gift together with Granny Sato.', 1, { stat: 'craft', gift: true, ...Q('bday', 2) }),
        O('chill', 'Pay her to do it properly', 'お金を払ってきれいに包んでもらう', 'The player paid Granny Sato to wrap the gift properly.', 1, { coins: -10, gift: true, ...Q('bday', 2) })])] }),

    E({ id: 'q_bday_party', at: ['start', 'turn'], slots: ['lunch', 'after'], we: false, force: true, rep: false, reward: { gems: 50, coins: 40 },
      when: () => qs('bday').stage === 2 && S.day > qs('bday').day, done: () => { qs('bday').stage = 3; }, title: T('Happy Birthday, Yui', 'ユイ、誕生日おめでとう'),
      setup: () => `The player throws a small surprise birthday for Yui with the cake Mika baked${S.flags.bday_gift ? ` and the wrapped gift (${S.flags.bday_gift})` : ''}. Yui is speechless, then explodes into tsundere denial while clearly overwhelmed with happiness. Keep it wholesome: blushing and a shy thank-you at most.`,
      beats: ['Yui stares at the cake, then at the player, then at the floor.', 'She opens the gift slowly, trying to look unimpressed and failing.'],
      choices: [C(0, 'You hold out the cake and the gift.', 'ケーキとプレゼントを差し出す。', [
        O('chill', 'Say happy birthday warmly', '心を込めておめでとうを言う', 'The player warmly wished Yui a happy birthday.', 2),
        O('playful', 'Make her guess what is in the box', '箱の中身を当てさせる', 'The player made Yui guess what was in the box.', 1, { stat: 'charm' }),
        O('nonchalant', '"Whatever, just take it."', '「いいから受け取れって」', 'The player gruffly told Yui to just take it.', 2)])],
      fact: 'The player threw Yui a surprise birthday party.' })
  ];

  // ---------- scheduler ----------
  G.allEvents = () => [...(G.EVENTS || []), ...(G.NPC_EVENTS || []), ...R];
  // phase: 'start' (a new part of the day begins), 'turn' (once per part of the day, after the 1st message), 'arrive' (player moves somewhere)
  G.pickEvent = phase => {
    if (S.eventRun || S.entries.length < 8) return null;
    const sl = G.story.slot(), yui = G.story.present();
    const pool = R.filter(e => {
      if (!(Array.isArray(e.at) ? e.at : [e.at]).includes(phase)) return false;
      if (e.rep ? (S.evtLast[e.id] || -99) > S.day - (e.cd || 3) : S.eventsDone.includes(e.id)) return false;
      if (e.slots && !e.slots.includes(sl.id)) return false;
      if (e.aff && (S.affection < e.aff[0] || S.affection > (e.aff[1] ?? 20))) return false;
      if (e.we != null && e.we !== G.weekend()) return false;
      if (e.where && e.where !== S.loc) return false;
      if (S.talk && e.npc !== S.talk) return false;
      if (e.yui !== false && !yui) return false;
      return !e.when || e.when();
    });
    const forced = pool.find(e => e.force);
    if (forced) return forced;
    if (Math.random() > ({ turn: .55, start: .35, arrive: .35 }[phase] ?? .3)) return null;
    const total = pool.reduce((a, e) => a + (e.w || 1), 0); let r = Math.random() * total;
    return pool.find(e => (r -= (e.w || 1)) < 0) || null;
  };
})();