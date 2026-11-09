/* 우리 집에 온 아이: 엔진·화면 */
(function () {
  'use strict';
  const D = window.DATA;
  const $ = (q, el = document) => el.querySelector(q);
  const $$ = (q, el = document) => [...el.querySelectorAll(q)];
  const params = new URLSearchParams(location.search);
  const MUTE = params.get('mute') === '1';
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rand = Math.random;

  /* ---------- 난수 ---------- */
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function makeRng(seed) {
    if (typeof Math.seedrandom === 'function') return new Math.seedrandom(String(seed)); // seedrandom (GitHub davidbau/seedrandom)
    let h = 0; for (const c of String(seed)) h = Math.imul(31, h) + c.charCodeAt(0) | 0;
    return mulberry32(h);
  }
  function wpick(arr, r = rand, key = 'w') {
    const tot = arr.reduce((a, b) => a + (b[key] || 0), 0); let x = r() * tot;
    for (const it of arr) { x -= it[key] || 0; if (x <= 0) return it; } return arr[arr.length - 1];
  }
  const gauss = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const pickOne = (a, r = rand) => a[Math.floor(r() * a.length)];
  const shuffle = a => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const k = Math.floor(rand() * (i + 1)); [b[i], b[k]] = [b[k], b[i]]; } return b; };

  /* ---------- 한국어 조사 ---------- */
  function jong(word) { const c = word.charCodeAt(word.length - 1); if (c < 0xAC00 || c > 0xD7A3) return 0; return (c - 0xAC00) % 28; }
  const JOSA = { '이': ['이', '가'], '은': ['은', '는'], '을': ['을', '를'], '과': ['과', '와'], '와': ['과', '와'], '아': ['아', '야'], '이나': ['이나', '나'], '이랑': ['이랑', '랑'], '이야': ['이야', '야'], '이에요': ['이에요', '예요'] };
  function j(word, p) {
    if (p === '으로' || p === '로') { const k = jong(word); return word + (k === 0 || k === 8 ? '로' : '으로'); }
    const pair = JOSA[p]; if (!pair) return word + p;
    return word + (jong(word) ? pair[0] : pair[1]);
  }
  // 받침 있는 이름을 부를 때 "보리야", "콩이야", "단추야" / "별아"
  const callName = n => j(n, '아');

  /* ---------- 상태 ---------- */
  let S = null;
  let shared = null;

  function newDog(seed, nameOverride) {
    const r = makeRng(seed);
    const breed = wpick(D.BREEDS, r);
    const source = wpick(D.SOURCES, r);
    const adoptM = Math.round(source.age[0] + r() * (source.age[1] - source.age[0]));
    const name = nameOverride || pickOne(D.NAMES, r);
    const sex = r() < .5 ? '수컷' : '암컷';
    const fear = clamp(breed.t.fear + source.fear + (r() - .5) * .5, .03, .97);
    const energy = clamp(breed.energy + (r() - .5) * 1.6, 1, 5);
    const lifespanY = clamp(breed.life + gauss(r) * 1.9, breed.life - 6, breed.life + 4.5);
    const look = { ...breed.look };
    if (breed.id === 'mix') {
      const pal = [['#C9A27A', '#7A5A3E'], ['#2F2B28', '#E9E0D2'], ['#E8D2A8', '#B58E5E'], ['#8A6A4E', '#F1E9DD'], ['#D7C2A0', '#5A463A']];
      const p = pickOne(pal, r); look.c1 = p[0]; look.c2 = p[1];
      look.ear = pickOne(['half', 'erect', 'drop'], r); look.tail = pickOne(['straight', 'curl', 'low'], r);
      look.len = 11 + Math.floor(r() * 3); look.leg = 2 + Math.floor(r() * 3);
    }
    look.seed = Math.floor(r() * 1e6);
    return { seed, name, breed, source, adoptM, sex, fear, energy, lifespanY, look, intact: !(source.id === 'shelter' && adoptM > 10) };
  }

  function newState(dog) {
    const home = { ...wpick(D.HOMES) };
    const now = new Date();
    const z = Object.fromEntries(Object.keys(D.HABITS).map(h => [h, 0]));
    return {
      dog, home, ageM: dog.adoptM, cal: { y: now.getFullYear(), m: now.getMonth() }, start: { y: now.getFullYear(), m: now.getMonth() }, ticks: 0,
      st: { health: 86, bond: 34, calm: 62 - dog.fear * 26, manners: dog.adoptM > 12 ? 22 : 6, social: dog.adoptM > 12 ? 36 : 44 - dog.fear * 18, weight: 50, joy: 60 },
      habits: { ...z }, peak: { ...z }, firstAt: {}, resolvedAt: {}, plans: {}, planAt: {}, supp: {},
      routine: { walk: 0, play: 0, train: 0, treat: 0, check: 0, teeth: 0 }, rStage: null, rsNote: null, rOpen: {}, guideQ: [], miss: {}, missQ: [], gear: {}, gearQ: [], reg: {}, regQ: [], joint: 0, petHint: 0,
      lastAct: { pet: dog.adoptM, ball: dog.adoptM, walk: dog.adoptM, train: dog.adoptM }, nudge: null,
      style: { reward: 0, punish: 0, ignore: 0, pro: 0 }, punishRecent: 0,
      hist: { walk: 0, train: 0, treat: 0, cons: 0, n: 0 },
      cnt: { walks: 0, pets: 0, treats: 0, plays: 0, asks: 0, met: 0, beg: 0 }, tapThisTick: 0, evCool: 0, want: null,
      cons: .9, exGap: 0, sepGuard: 0, lifeMod: 0, budgetMod: 0, aloneMod: 0,
      flags: {}, done: {}, dz: {}, subs: [], log: [], ms: {}, notes: [], used: {},
      firstOwner: rand() < .45, lowStreak: 0, graceN: 0, dead: false, cause: null, finalAsked: false, risks: {}, minLife: 0, anniv: 0, quiet: 0,
      later: [], decisions: [], echoes: {},
      skills: {}, trainTick: { tick: -1, n: 0 }, walkTick: -1, trainLog: [], trend: {}, fear0: dog.fear,
    };
  }
  // 어린 강아지는 배변 실수와 입질을 안고 온다(교육으로 줄여 간다)
  function puppyStart(s) {
    if (s.dog.adoptM < 6) { s.habits.potty = 1.1 + rand() * .3; s.peak.potty = s.habits.potty; s.firstAt.potty = s.ageM; }
    if (s.dog.adoptM < 5) { s.habits.nip = .9 + rand() * .3; s.peak.nip = s.habits.nip; s.firstAt.nip = s.ageM; }
  }

  const ageY = s => s.ageM / 12;
  const effLife = s => Math.max(s.dog.lifespanY + s.lifeMod, s.minLife, (s.dog.adoptM / 12) + .5);
  const seniorFrac = s => ageY(s) / effLife(s);
  const stage = s => (s.ageM < 12 ? 'pup' : seniorFrac(s) > .75 ? 'senior' : 'adult');
  // 생활 습관 단계: 나이에 따라 칸이 열리고 이름·뜻이 바뀐다
  const rStage = s => (s.ageM < 3.5 ? 'baby' : s.ageM < 6 ? 'pup' : s.ageM < 24 ? 'teen' : stage(s) === 'senior' ? 'senior' : 'adult');
  // 하루 여유를 얼마나 쓰는지(양치는 생후 6개월부터)
  const routineLoad = s => { const R = s.routine; return R.walk * (s.ageM < 3.5 ? .5 : 1) + R.play * .5 + R.train * .8 + (s.ageM >= 6 ? R.teeth * .15 : 0) + .2; };
  const SEASONS = ['봄', '여름', '가을', '겨울'];
  const SEASON_ID = ['spring', 'summer', 'autumn', 'winter'];
  const seasonOf = m0 => { const m = Math.floor(m0); return m >= 2 && m <= 4 ? 0 : m >= 5 && m <= 7 ? 1 : m >= 8 && m <= 10 ? 2 : 3; };
  // 한 칸의 길이(개월): 6개월 전엔 1주, 두 살 전엔 1개월, 그 뒤엔 3개월
  const dtOf = s => (s.ageM < 6 ? .25 : s.ageM < 24 ? 1 : s.slow ? 1 : 3);
  const weeksOf = m => Math.round(m * 4.345);
  function ageText(m) { m = Math.round(m); if (m < 12) return `생후 ${m}개월`; const y = Math.floor(m / 12), mm = m % 12; return mm ? `${y}살 ${mm}개월` : `${y}살`; }
  function ageShort(m) { m = Math.round(m); return m < 12 ? `${m}개월` : `${Math.floor(m / 12)}살`; }
  function lifeText(m) { m = Math.round(m); const y = Math.floor(m / 12), mm = m % 12; if (!y) return `${mm}개월`; return mm ? `${y}년 ${mm}개월` : `${y}년`; }
  function ageAround(m) { return m < 12 ? `생후 ${Math.round(m)}개월 무렵` : `${Math.floor(m / 12)}살 무렵`; }

  // 같은 문장은 한 생에서 두 번 나오지 않는다. 다 쓰면 null
  function uniq(s, pool, tag = '') {
    const left = (pool || []).filter(t => t && !s.used[tag + t]);
    if (!left.length) return null;
    const t = left[Math.floor(Math.random() * left.length)]; s.used[tag + t] = 1; return t;
  }
  function fmt(str, s = S, extra = {}) {
    if (typeof str === 'function') str = str(s);
    if (!str) return '';
    return str.replace(/\{(n|s|sub_intro|k)(?::([^}]+))?\}/g, (_, who, p) => {
      if (who === 'sub_intro') return extra.subIntro || '';
      if (who === 'k') return String(extra.k || '');
      const name = who === 'n' ? s.dog.name : (extra.subName || (s.subs.length ? s.subs[s.subs.length - 1].name : '둘째'));
      return p ? j(name, p) : name;
    });
  }

  /* ---------- 사건 도우미 ---------- */
  function makeG(s, ctx) {
    const G = {
      state: () => s,
      add: (k, v) => { s.st[k] = clamp(s.st[k] + v, 0, 100); },
      habit: (h, v) => { s.habits[h] = clamp(s.habits[h] + v, 0, 3); if (s.habits[h] >= 1 && s.firstAt[h] == null) s.firstAt[h] = s.ageM; s.peak[h] = Math.max(s.peak[h], s.habits[h]); },
      plan: (h, m) => { s.plans[h] = m; s.planAt[h] = s.ageM; if (ctx.plans) ctx.plans.push(h); },
      style: k => { s.style[k]++; if (k === 'punish') s.punishRecent += 1; },
      flag: (k, v) => { s.flags[k] = v; },
      ms: (k, t) => { if (!s.ms[k]) s.ms[k] = { t: fmt(t, s), age: s.ageM }; },
      note: k => { if (!s.notes.includes(k)) s.notes.push(k); ctx.note = k; },
      dogFear: v => { s.dog.fear = clamp(s.dog.fear + v, 0, 1); },
      sepGuard: v => { s.sepGuard += v; },
      neuter: () => { s.dog.intact = false; s.flags.intact = 0; },
      neuterSubs: () => { s.subs.forEach(d => { d.intact = false; }); },
      routineUp: k => { s.routine[k] = Math.min(2, s.routine[k] + 1); s.rOpen[k] = 1; },
      routineSet: (k, v) => { s.routine[k] = v; s.rOpen[k] = 1; },
      lifeMod: v => { s.lifeMod += v; },
      budget: v => { s.budgetMod += v; },
      alone: v => { s.aloneMod += v; },
      risk: k => { s.risks[k] = 1; },
      // 몇 달 뒤에 드러나는 결과. key를 주면 돌아보기에서 그 사건의 "그 뒤"로 쓴다.
      later: (months, text, fn, key) => { if (typeof text === 'function') { fn = text; text = null; } s.later.push({ at: s.ageM + months, text, fn, key: key || ctx.evId }); },
      senior: () => seniorFrac(s),
      insured: () => !!s.flags.insured,
      brachy: () => s.dog.look.snout === 0,
      rand,
      boostPlans: () => { for (const h in s.habits) if (s.habits[h] >= .5 && (!s.plans[h] || s.plans[h] === 'ignore')) s.plans[h] = 'reward'; },
      lostResult: kind => {
        const reg = s.flags.registered || 0;
        G.add('calm', -6); G.add('bond', 4);
        if (reg === 2) { G.ms('lost', '한 번 집을 나간 적이 있다. 몸속 칩 덕분에 이틀 만에 찾았다.'); return '이틀 뒤 보호소에서 전화가 왔다. 몸속 칩을 읽고 연락했다고 했다. 데리러 간 차 안에서 {n:은} 내내 무릎에 턱을 올리고 있었다.'; }
        if (reg === 1) { G.ms('lost', '한 번 집을 나간 적이 있다. 인식표를 본 이웃이 연락을 줬다.'); return '다음 날 아침, 인식표의 번호를 본 동네 사람이 전화를 줬다. 그날 바로 칩 등록도 했다.'; }
        s.flags.registered = 2;
        if (kind === 'notice') { G.ms('lost', '한 번 집을 나가 보호소 공고에 올라간 적이 있다.'); return '공고 사진 속에서 {n:을} 찾았다. 보호 기간 열흘 가운데 여드레째였다. 그날 바로 동물등록을 했다.'; }
        G.ms('lost', '한 번 집을 나가 나흘 만에 찾았다.'); return '나흘을 찾아다녔다. 세 블록 떨어진 편의점 사장님이 데리고 있었다. 그날 바로 동물등록을 했다.';
      },
      prepSub: () => {
        const same = rand() < .3;
        const breed = same ? s.dog.breed : wpick(D.BREEDS.filter(b => b.id !== s.dog.breed.id));
        const names = D.NAMES.filter(n => n !== s.dog.name && !s.subs.some(d => d.name === n));
        const sex = rand() < .5 ? '수컷' : '암컷';
        const ageM = 2 + Math.floor(rand() * 20);
        const via = pickOne(['보호소에서', '지인 집에서', '동네 카페 입양 글에서']);
        ctx.sub = { name: pickOne(names), breed, sex, ageM, intact: ageM < 8, alive: true, since: s.ageM, life: clamp(breed.life + gauss(rand) * 1.8, 6, 18) };
        ctx.subIntro = `${via} ${breed.name} 한 마리가 갈 곳을 찾는다는 이야기를 들었다. ${ageText(ageM)}, ${sex}. 임시로 부르는 이름은 ${ctx.sub.name}.`;
      },
      addSub: () => {
        const d = ctx.sub; s.subs.push(d); ctx.subName = d.name;
        G.add('calm', 4); G.add('joy', 5); s.sepGuard += .12; s.budgetMod -= .35; s.flags.wantsub = 0;
        if (s.plans.sep === 'manage' && s.habits.sep > 0) s.habits.sep = Math.max(0, s.habits.sep - .5);
        s.ms['sub_' + d.name] = { t: `${ageAround(s.ageM)} ${j(d.name, '이')} 왔다. ${d.breed.name}였다.`, age: s.ageM };
        return `${j(d.name, '이')} 왔다. ${j(s.dog.name, '은')} 사흘 동안 ${j(d.name, '을')} 따라다니며 냄새를 맡았다.`;
      },
      canBreed: () => {
        if (s.flags.bred || !s.dog.intact || !s.flags.intact) return false;
        return s.subs.some(d => d.alive && !d.pup && d.intact && d.breed.id === s.dog.breed.id && d.sex !== s.dog.sex);
      },
      breedPups: () => {
        const mate = s.subs.find(d => d.alive && d.intact && d.breed.id === s.dog.breed.id && d.sex !== s.dog.sex);
        ctx.subName = mate.name;
        const big = s.dog.breed.size === 'L';
        const k = big ? 4 + Math.floor(rand() * 5) : 2 + Math.floor(rand() * 3);
        s.flags.bred = 1; s.pendingPups = { k, mate: mate.name, at: s.ageM };
        if (s.dog.sex === '암컷') G.add('health', -6);
        s.ms.pups = { t: `${ageAround(s.ageM)} 새끼 ${k}마리가 태어났다.`, age: s.ageM };
        return `두 달 뒤, 새끼 ${k}마리가 태어났다. ${s.dog.sex === '암컷' ? `${j(s.dog.name, '은')} 새끼들을 하나씩 핥아 줬다.` : `${j(s.dog.name, '은')} 상자 밖에서 안을 한참 들여다봤다.`}`;
      },
      keepPup: () => {
        const names = D.NAMES.filter(n => n !== s.dog.name && !s.subs.some(d => d.name === n));
        const pup = { name: pickOne(names), breed: s.dog.breed, sex: rand() < .5 ? '수컷' : '암컷', ageM: 2, intact: true, alive: true, since: s.ageM, pup: true, life: clamp(s.dog.breed.life + gauss(rand) * 1.8, 6, 18) };
        s.subs.push(pup); ctx.subName = pup.name; s.pendingPups = null; s.budgetMod -= .3; G.add('joy', 6);
        s.ms.pupKeep = { t: `그중 ${j(pup.name, '은')} 남아서 같이 살았다.`, age: s.ageM };
        return `한 마리는 남기기로 했다. 이름은 ${pup.name}. 나머지는 아는 집으로 하나씩 보냈다.`;
      },
    };
    return G;
  }

  D.EVENTS.push({ id: 'pups', when: [0, 999], once: 1, w: 999, cond: s => !!s.pendingPups,
    text: '새끼들이 두 달이 됐다. 이제 보낼 집을 정해야 한다.',
    choices: [
      { t: '한 마리는 우리가 키운다', fx: G => G.keepPup() },
      { t: '모두 좋은 집으로 보낸다', fx: G => { G.state().pendingPups = null; return '마지막 한 마리를 보낸 날, {n:은} 빈 상자 안에 들어가 누웠다.'; } },
    ] });
  D.EVENTS.push({ id: 'anniv1', when: [0, 999], once: 1, w: 0,
    text: '{n:이} 우리 집에 온 지 꼭 1년이 됐다.',
    choices: [
      { t: '처음 만난 날처럼 사진을 찍는다', fx: G => { G.add('bond', 4); G.ms('anniv', '만난 지 1년 되던 날, 처음 만난 날과 같은 자리에서 사진을 찍었다.'); return '1년 전 사진과 나란히 놓았다. 귀가 두 배는 커져 있었다.'; } },
      { t: '고구마에 초를 꽂아 준다', fx: G => { G.add('joy', 6); G.ms('anniv', '만난 지 1년 되던 날, 고구마에 초를 꽂아 줬다.'); return '초를 끄기도 전에 고구마가 사라졌다.'; } },
      { t: '평소처럼 산책을 간다', fx: G => { G.add('bond', 2); G.ms('anniv', '만난 지 1년 되던 날도 평소처럼 산책을 갔다.'); return '늘 가던 길을 늘 걷던 속도로 걸었다. 그래도 오늘은 조금 달랐다.'; } },
    ] });

  /* ---------- 한 틱 ---------- */
  function applyRoutine(s, dt) {
    const R = s.routine, H = s.home, st = s.st;
    const budget = Math.max(1.2, H.budget + s.budgetMod);
    const used = routineLoad(s), rs = rStage(s);
    let cons = used <= budget ? .93 : .93 * budget / used;
    if (s.flags.busy) cons -= .07;
    cons = clamp(cons + (rand() - .5) * .1, .25, 1); s.cons = cons;
    const sen = seniorFrac(s);
    const need = s.dog.energy * (sen > .75 ? .55 : 1);
    const ex = (R.walk * 1.5 * (rs === 'baby' ? .3 : 1) + R.play * .8) * cons + Math.min(s.tapThisTick, 3) * .1;
    // 접종 전 바깥 구경: 안고라도 세상을 보면 겁이 덜 굳는다(AVSAB 2008)
    // 겁이 많은 아이를 매일 바깥에 내보내면 오히려 겁이 쌓인다(한꺼번에 많은 노출)
    if (rs === 'baby') s.dog.fear = clamp(s.dog.fear + (R.walk === 0 ? .01 : R.walk === 2 && s.dog.fear > .6 ? .006 : -.01 * R.walk * cons) * dt, 0, 1);
    // 아기 때 너무 오래 놀리면 지쳐서 입질이 는다
    if ((rs === 'baby' || rs === 'pup') && R.play === 2 && s.habits.nip > 0) s.habits.nip = clamp(s.habits.nip + .04 * dt, 0, 3);
    // 접종을 미룬 채 바깥에 나가면 전염병 위험
    if (s.ageM < 6 && R.check === 0 && R.walk > 0 && !s.flags.parvo && rand() < .05 * R.walk * dt) {
      s.flags.parvo = 1; st.health = clamp(st.health - 18, 0, 100); s.lifeMod -= .05;
      addLog(s, `${j(s.dog.name, '이')} 피 섞인 설사로 며칠 입원했다. 예방접종이 덜 끝난 상태였다.`, 'bad');
    }
    // 관절 부담: 어린 대형견·노견의 긴 산책, 슬개골이 약한 견종의 과한 놀이. 쌓이면 관절 병이 잦아진다
    const jw = own(s, 'mat') ? .6 : 1;
    if (R.walk === 2 && ((s.dog.breed.size === 'L' && s.ageM < 12) || rs === 'senior')) s.joint = Math.min(1.5, (s.joint || 0) + .04 * dt * cons * jw);
    if (R.play === 2 && rs !== 'baby' && s.dog.breed.risks.includes('patella')) s.joint = Math.min(1.5, (s.joint || 0) + .025 * dt * cons * jw);
    const gap = ex - need * .75; s.exGap = gap;
    const sepP = clamp((H.alone + s.aloneMod - 3) / 7, 0, 1.2);
    const load = Object.values(s.habits).reduce((a, b) => a + b, 0);
    const subs = s.subs.some(d => d.alive);
    const k = Math.min(1, .22 * dt);
    const joyT = 52 + gap * 10 + R.play * 4 * cons + (R.treat - 1) * 4 + st.bond * .15 - load * 3 - (100 - st.health) * .25 - (s.ageM < 6 && R.check === 2 ? 2 : 0);
    st.joy = clamp(st.joy + (joyT - st.joy) * k, 0, 100);
    const calmT = 74 - s.dog.fear * 32 - sepP * 14 * (subs ? .7 : 1) - Math.max(0, -gap) * 6 - load * 4 - s.punishRecent * 4 + R.train * 3 * cons + (subs ? 3 : 0) + (rs === 'senior' ? R.play * 2.5 * cons : 0) - (R.check === 2 && s.dog.fear > .5 ? 3 : 0);
    st.calm = clamp(st.calm + (calmT - st.calm) * k, 0, 100);
    st.manners = clamp(st.manners + (R.train * cons * 1.6 * (1 - st.manners / 110) - (R.train === 0 ? .25 : 0)) * dt * (s.ageM < 24 ? 1.15 : .55), 0, 100);
    st.social = clamp(st.social + ((R.walk * cons * .5 + R.play * .08) * (1 - st.social / 100) * (s.ageM < 6 ? 2 : 1) - (R.walk === 0 ? .6 : .06) - s.dog.fear * .12) * dt, 0, 100);
    st.bond = clamp(st.bond + ((R.walk * .25 + R.play * .35 + R.train * .15) * cons * (1 - st.bond / 105) + .1 - s.punishRecent * .25 - (s.flags.busy ? .1 : 0)) * dt, 0, 100);
    const fatDrift = (R.treat - 1) * .9 - gap * .45 + (s.dog.breed.risks.includes('obesity') ? .25 : 0) + (traits(s.dog).food - .5) * .3 + (s.dog.intact ? 0 : .12) + (sen > .7 ? .2 : 0) - (own(s, 'cup') ? .35 : 0);
    st.weight = clamp(st.weight + fatDrift * dt * .6 + (50 - st.weight) * .015 * dt, 18, 96);
    s.punishRecent *= Math.pow(.82, dt);
    s.cnt.walks += R.walk * 30 * dt * cons; s.cnt.plays += R.play * 20 * dt * cons;
    s.hist.walk += R.walk; s.hist.train += R.train; s.hist.treat += R.treat; s.hist.cons += cons; s.hist.n++;
    s.tapThisTick = 0;
  }

  const NEWH = ['copro', 'tail', 'mount', 'mark', 'jump', 'stranger', 'handle', 'car', 'chase', 'outdoor'];
  const FOODIE = ['labrador', 'beagle', 'golden', 'pug', 'corgi'];
  const CHASER = ['border', 'beagle', 'jindo', 'shiba', 'corgi'];
  function updateHabits(s, dt) {
    const st = s.st, t = s.dog.breed.t, f = s.dog.fear, H = s.home;
    const sepP = clamp((H.alone + s.aloneMod - 3) / 7, 0, 1.2);
    const subs = s.subs.some(d => d.alive);
    const risk = {
      sep: sepP * .55 + (1 - st.calm / 100) * .35 + t.sep * .25 + s.dog.source.sep - (subs ? .12 : 0) - s.sepGuard - .52,
      bark: Math.max(0, -s.exGap) * .12 + t.bark * .35 + (1 - st.calm / 100) * .25 - st.manners / 400 - .12,
      chew: Math.max(0, -s.exGap) * .2 + (s.ageM < 18 ? .26 : 0) - st.manners / 500 + .02,
      pull: (s.dog.energy / 5) * .35 + (1 - st.manners / 100) * .35 - .3 - (own(s, 'harness') ? .08 : 0),
      reactive: (1 - st.social / 100) * .45 + f * .35 + s.punishRecent * .06 - .38,
      guard: t.guard * .35 + s.punishRecent * .05 + (s.flags.grabbed ? .15 : 0) + (subs ? .05 : 0) - .11,
      nip: -1, potty: -1,
      // 아래는 2차 연구 반영(research-papers-2.md). 발생 확률 = 위험 × 0.07 × 개월
      copro: .012 + (FOODIE.includes(s.dog.breed.id) ? .02 : 0) + (subs ? .012 : 0) - (s.ageM > 60 ? .006 : 0),
      tail: s.ageM < 30 ? .004 + (s.dog.source.id === 'petshop' ? .006 : 0) + (f > .6 ? .006 : 0) : -1,
      mount: (s.dog.sex === '수컷' && s.dog.intact ? .06 : .016) * (s.ageM > 6 && s.ageM < 36 ? 1 : .3) - st.manners / 3000,
      mark: s.ageM > 8 ? (s.dog.sex === '수컷' ? (s.dog.intact ? .035 : .008) : .004) : -1,
      jump: s.ageM < 48 ? (s.dog.energy / 5) * .09 - st.manners / 2000 : -1,
      // 낯선 사람 공격 위험 배수: 겁 5.18/1.93, 수컷 1.72, 소형 1.49, 외동견 1.23, 첫 개 1.21, 7~12개월 중성화 1.26 (Mikkola 2021; Farhoody 2018)
      stranger: s.ageM > 5 ? .004 * (f > .66 ? 5.18 : f > .33 ? 1.93 : 1) * (s.dog.sex === '수컷' ? 1.72 : 1) * (s.dog.breed.size === 'S' ? 1.49 : 1) * (subs ? 1 : 1.23) * (s.firstOwner ? 1.21 : 1) * (s.flags.neuterAge >= 7 && s.flags.neuterAge <= 12 ? 1.26 : 1) : -1,
      handle: .006 + f * .012 + s.punishRecent * .01 + (s.dog.breed.size === 'S' ? .004 : 0),
      car: s.ageM > 6 ? .004 + f * .02 : -1,
      chase: s.ageM > 8 ? (CHASER.includes(s.dog.breed.id) ? .05 : .012) : -1,
      outdoor: s.ageM < 36 ? (s.dog.source.id === 'petshop' || s.dog.source.id === 'rehome' ? .012 : 0) + (1 - st.social / 100) * .022 + f * .015 - .006 : -1,
    };
    if (seniorFrac(s) > .8) { risk.pull -= .3; risk.chew -= .3; }
    // 몸 만지기를 못 익힌 아이에게 매일 양치를 밀어붙이면 손을 피한다
    if (s.routine.teeth === 2 && s.ageM >= 6 && skillP(s, 'handle') < .3) risk.handle += .004;
    {
      const T = traits(s.dog), mulT = (k, m) => { if (risk[k] > 0) risk[k] *= m; };
      risk.sep += (T.sep - .5) * .2; risk.reactive += (T.dogAgg - .5) * .2; risk.bark += (T.excite - .5) * .1;
      mulT('stranger', .6 + .8 * T.strangerF); mulT('handle', .6 + .8 * T.touch); mulT('jump', .6 + .8 * T.excite);
      mulT('copro', .7 + .6 * T.food); mulT('car', .7 + .6 * T.fearN);
      if (risk.chase > 0) risk.chase = .008 + .05 * T.chase * T.chase;
    }
    {
      const P = k => skillP(s, k), soc = P('social');
      risk.sep -= .25 * P('alone') + .06 * P('crate');
      risk.reactive -= .18 * soc; risk.pull -= .25 * P('leash'); risk.bark -= .06 * P('sit') + .05 * soc; risk.chew -= .05 * P('sit');
      const mul = (k, m) => { if (risk[k] > 0) risk[k] *= m; };
      mul('stranger', 1.25 - .55 * soc); mul('outdoor', 1.4 - .9 * soc); mul('handle', 1.25 - .8 * P('handle'));
      mul('car', 1.2 - .6 * P('crate')); mul('jump', 1 - .6 * P('sit'));
    }
    for (const h in s.habits) {
      let v = s.habits[h]; const prev = v; const plan = s.plans[h];
      if (risk[h] > 0 && rand() < risk[h] * (NEWH.includes(h) ? .17 : .07) * dt) v += .7 + rand() * .6;
      if (v > 0) {
        const tr = s.routine.train, c = s.cons;
        if (plan === 'reward') v -= (tr > 0 ? .1 * tr : .025) * c * dt * (.7 + st.manners / 200);
        else if (plan === 'pro') v -= (.16 + .05 * tr) * c * dt;
        else if (plan === 'aversive') {
          v -= .12 * dt; s.supp[h] = (s.supp[h] || 0) + .1 * dt;
          s.dog.fear = clamp(s.dog.fear + .005 * dt, 0, 1); st.calm = clamp(st.calm - .3 * dt, 0, 100);
          if (s.supp[h] > .6 && rand() < .03 * dt) { v += s.supp[h] * .8; s.supp[h] = 0; addLog(s, `한동안 잠잠하던 ${D.HABITS[h].name} 버릇이 한꺼번에 터졌다.`, 'bad'); }
        } else if (plan === 'manage') v -= .02 * dt;
        else if (plan === 'ignore') v += risk[h] > 0 ? .01 * dt : -.005 * dt;
        else v -= .012 * dt;
        if ((h === 'nip' || h === 'chew') && s.ageM > 18) v -= .04 * dt;
        if (h === 'potty' && s.ageM > 12) v -= .03 * dt;
      }
      v = clamp(v, 0, 3);
      if (v >= 1 && s.firstAt[h] == null) s.firstAt[h] = s.ageM;
      s.peak[h] = Math.max(s.peak[h], v);
      if (s.peak[h] >= 1 && prev >= .5 && v < .5 && s.resolvedAt[h] == null) {
        s.resolvedAt[h] = s.ageM;
        if (plan === 'aversive') addLog(s, `${D.HABITS[h].name} 버릇이 겉으로는 사라졌다. ${j(s.dog.name, '은')} 전보다 자주 눈치를 봤다.`, 'mid');
        else { addLog(s, `${D.HABITS[h].name} 버릇이 거의 사라졌다. 매일 했던 연습이 쌓인 덕이었다.`, 'good'); if (!s.slow) { fx.confetti(); Snd.sfx('good'); } }
      }
      s.habits[h] = v;
    }
  }

  const SYM = {
    patella: '산책하다 뒷다리 하나를 들고 깡충거렸다.', dental: '입 냄새가 심해지고 딱딱한 간식을 피했다.', mvd: '청진기를 대던 수의사가 잠깐 말이 없었다. 심장에서 잡음이 들린다고 했다.',
    trachea: '흥분하면 거위 소리 같은 기침을 했다.', eye: '눈동자 한가운데가 뿌옇게 변했다.', boas: '조금만 걸어도 숨을 헐떡이며 주저앉았다.',
    stones: '소변 자세를 잡았다가 아무것도 못 보고 일어났다.', skin: '밤새 몸을 긁어 피가 났다.', hip: '일어날 때 뒷다리를 끌었다.',
    cancer: '배를 쓰다듬다 작은 멍울이 만져졌다.', otitis: '고개를 자꾸 털고 귀를 긁었다. 귀에서 냄새가 났다.', ivdd: '소파에서 뛰어내린 뒤 비명을 지르고 뒷다리를 못 썼다.',
    hypothy: '살이 찌고 털이 듬성듬성 빠졌다.', epilepsy: '자다가 갑자기 온몸을 떨며 경련했다.', pancreas: '기름진 걸 먹은 다음 날 계속 토했다.', kidney: '물을 유난히 많이 마시고 살이 빠졌다.',
  };
  function diseaseCheck(s, dt) {
    const y = ageY(s);
    illPlan(s);
    const P = s.illPlan;
    if (P.dz && !s.dz[P.dz.id] && s.ageM >= P.dz.at) { const id = P.dz.id; P.dz = null; return diseaseEvent(s, id); }
    if (P.pup && s.ageM >= P.pup.at) { P.pup = null; const e = illEvent(s, 'pup'); if (e) return e; }
    if (s.ageM >= 8 && (s.accN || 0) < 3 && s.ageM - (s.illAt || -99) >= 10 && rand() < (.22 + Math.min(.2, (s.care || 0) * .01)) * dt / 12) { const e = illEvent(s, 'acc'); if (e) return e; }
    const pool = new Set([...s.dog.breed.risks, 'dental', 'cancer', 'kidney']);
    for (const id of pool) {
      if (s.dz[id] || id === 'obesity') continue; const dz = D.DISEASES[id]; if (!dz || y < dz.age[0] || y > dz.age[1]) continue;
      let mult = (s.dog.breed.risks.includes(id) ? 1 : .3) * (1 + Math.min(1, (s.care || 0) * .03));
      if (id === 'dental') mult *= [1, .7, .35][Math.max(s.flags.teeth || 0, s.routine.teeth || 0)];
      if (id === 'hip' || id === 'patella' || id === 'ivdd') mult *= (1 + (s.joint || 0)) * (own(s, 'mat') ? .7 : 1);
      if (id === 'dental' && own(s, 'brush')) mult *= .7;
      if (rand() < dz.p * mult * dt / 12) return diseaseEvent(s, id);
    }
    return null;
  }
  function diseaseEvent(s, id) {
    const dz = D.DISEASES[id];
    const early = s.routine.check >= 1 && rand() < .35 + .2 * s.routine.check;
    s.dz[id] = { at: s.ageM, early, state: 'new' };
    const text = early ? `정기검진에서 ${dz.name} 소견이 나왔다. 일찍 찾은 편이라고 했다.` : `${SYM[id] || ''} 병원에서 ${dz.name} 진단을 받았다.`;
    const hit = (lm, life) => { s.lifeMod += lm; if (dz.fatal) { s.fatalCause = s.fatalCause || dz.cause; s.minLife = Math.max(s.minLife, ageY(s) + life); } };
    const pay = () => (s.flags.insured ? '보험 청구서를 쓰는 동안 {n:은} 옆에서 잤다.' : pickOne(['카드 할부를 열두 달로 끊었다.', '{n} 통장 잔고가 바닥났다. 그래도 아깝지 않았다.']));
    return {
      id: 'dz_' + id, tag: '건강', cat: 'vet', text, why: dzWhy(s, id),
      choices: [
        { t: '치료한다', fx: G => { s.dz[id].state = 'treated'; G.add('health', -4); hit(dz.fatal ? (early ? -.4 : -1.4) : 0, .6);
            if (dz.fatal && early && rand() < .5) { s.dz[id].state = 'cured'; s.fatalCause = null; s.lifeMod += .4; }
            s.ms['dz_' + id] = { t: `${ageAround(s.ageM)} ${dz.name} 진단을 받고 치료했다.`, age: s.ageM };
            return pickOne(['입원실 창문 너머로 {n:이} 꼬리를 흔들었다. ', '퇴원하는 날, 집에 오자마자 물을 한 그릇 다 마셨다. ']) + pay(); } },
        { t: '약으로 관리한다', fx: G => { s.dz[id].state = 'managed'; G.add('health', -7); hit(dz.fatal ? -1.9 : -.15, .5);
            s.ms['dz_' + id] = { t: `${ageAround(s.ageM)} ${dz.name} 진단을 받았다. 매일 약을 먹었다.`, age: s.ageM };
            return '매일 아침 약을 간식에 싸서 줬다. {n:은} 약만 골라 뱉는 법을 금방 배웠다.'; } },
        { t: '조금 지켜본다', fx: G => { careMiss(s, 2); s.dz[id].state = 'watch'; G.add('health', -14); hit(dz.fatal ? -3 : -.4, .35);
            s.ms['dz_' + id] = { t: `${ageAround(s.ageM)} ${dz.name} 진단을 받았다. 한동안 지켜보기만 했다.`, age: s.ageM };
            return '괜찮아 보이는 날이 더 많았다. 그러다 아닌 날이 왔다.'; } },
      ],
    };
  }

  /* ---------- 12차: 아기 때 병 · 생활 사고 · 원인 한 줄 ---------- */
  const TOY = ['chihuahua', 'yorkie', 'maltese', 'pomeranian', 'poodle'];
  // 원인 한 줄은 아픈 뒤에만 보인다(미리 경고하지 않는다)
  const ILL = {
    pup: {
      parvo: { name: '파보 장염', age: [2, 6], sev: 3, w: s => s.routine.check < 1 ? 3 : .6,
        sym: '피 섞인 설사를 하고 물도 안 마셨다.', why: s => s.routine.check < 1 ? '예방접종을 미루는 사이 바이러스가 옮았어요.' : '접종이 다 끝나기 전이라 막을 힘이 약했어요.' },
      kennel: { name: '켄넬코프', age: [2, 8], sev: 1, w: () => 1,
        sym: '캑캑거리는 마른기침을 며칠째 했다.', why: () => '다른 강아지에게서 옮는 기침이에요. 어릴수록 잘 걸려요.' },
      foreign: { name: '이물 삼킴', age: [3, 12], sev: 3, w: s => s.routine.play < 1 ? 1.6 : .8,
        sym: '장난감 조각이 안 보이더니 밤새 토했다.', why: s => s.routine.play < 1 ? '심심할 때 물어뜯던 조각을 삼켰어요.' : '이갈이 때는 뭐든 씹다 삼키기 쉬워요.' },
      gi: { name: '장염', age: [2, 12], sev: 1, w: s => s.routine.treat === 2 ? 2.5 : 1,
        sym: '사흘째 묽은 변을 보고 기운이 없었다.', why: s => s.routine.treat === 2 ? '간식을 많이 줘서 장이 탈 났어요.' : '사료를 갑자기 바꿔서 장이 놀랐어요.' },
      hypo: { name: '저혈당', age: [2, 4], sev: 3, w: s => TOY.includes(s.dog.breed.id) ? 2 : 0,
        sym: '아침에 축 늘어져 일어나지 못했다.', why: () => '몸이 작은 아기 강아지는 끼니가 늦으면 혈당이 뚝 떨어져요.' },
      worms: { name: '회충', age: [2, 6], sev: 1, w: s => s.routine.check < 1 ? 2 : .5,
        sym: '배만 볼록하고 변에 하얀 실 같은 게 보였다.', why: s => s.routine.check < 1 ? '구충제를 거른 사이 기생충이 늘었어요.' : '입양 전부터 몸에 있던 기생충이었어요.' },
      vac: { name: '접종 알레르기', age: [2, 5], sev: 2, w: s => s.routine.check >= 1 ? .7 : 0,
        sym: '접종 받고 몇 시간 뒤 얼굴이 퉁퉁 부었다.', why: () => '드물게 백신에 몸이 지나치게 반응해요.' },
    },
    acc: {
      choco: { name: '초콜릿 중독', sev: 3, w: () => 1, sym: '식탁 위 초콜릿 봉지가 비어 있었다. 숨이 가쁘고 안절부절못했다.', why: () => '초콜릿의 테오브로민은 개에게 독이에요.' },
      grape: { name: '포도 중독', sev: 3, w: () => .6, sym: '바닥에 떨어진 포도를 몇 알 주워 먹었다. 다음 날 토했다.', why: () => '포도는 몇 알만 먹어도 신장을 다칠 수 있어요.' },
      heat: { name: '열사병', sev: 3, w: s => seasonOf(s.cal.m) !== 1 ? 0 : (s.dog.look.snout === 0 ? 3 : 1) * (own(s, 'cool') ? .4 : 1), sym: '한낮 산책 뒤 혀가 보랏빛이 되고 주저앉았다.', why: s => s.dog.look.snout === 0 ? '코가 짧은 견종은 숨으로 열을 잘 못 식혀요.' : '한여름 낮 아스팔트는 개에게 너무 뜨거워요.' },
      tick: { name: '진드기 열병', sev: 2, w: s => seasonOf(s.cal.m) <= 1 ? (own(s, 'tickrx') ? .2 : 1.2) : 0, sym: '풀숲 산책 뒤 귀 뒤에 진드기가 붙어 있었다. 이틀 뒤 열이 났다.', why: () => '봄·여름 풀숲엔 진드기가 많아요.' },
      paw: { name: '발바닥 상처', sev: 1, w: () => .8, sym: '산책 뒤 발을 계속 핥았다. 피가 묻어났다.', why: () => '산책길에 깨진 유리가 있었어요.' },
      trash: { name: '위염', sev: 1, w: s => (s.routine.treat === 2 || traits(s.dog).food > .6 ? 1.6 : .8) * (own(s, 'bin') ? .2 : 1), sym: '쓰레기통을 뒤진 다음 날 계속 토했다.', why: () => '쓰레기통에서 상한 음식을 먹었어요.' },
      bee: { name: '벌 쏘임', sev: 2, w: s => seasonOf(s.cal.m) <= 1 ? 1 : 0, sym: '풀밭에서 뭔가를 덥석 물더니 주둥이가 부었다.', why: () => '벌을 잡으려다 쏘였어요.' },
    },
  };
  // 한 생의 병 계획: 견종 병 하나(85%)와 아기 때 병 하나(70%)를 나이 창 안 무작위 시점에 둔다
  function illPlan(s) {
    if (s.illPlan) return;
    const P = s.illPlan = { dz: null, pup: null }, b = s.dog.breed, L = b.life;
    const ids = b.risks.filter(id => id !== 'obesity' && D.DISEASES[id] && D.DISEASES[id].age[0] < L - 1);
    if (ids.length && rand() < .85) {
      const id = pickOne(ids), a = D.DISEASES[id].age, lo = Math.max(a[0], s.dog.adoptM / 12 + .5), hi = Math.min(a[1], L * .85);
      if (hi > lo) P.dz = { id, at: (lo + rand() * (hi - lo)) * 12 };
    }
    if (s.dog.adoptM < 9 && rand() < .7) P.pup = { at: Math.max(2.3, s.dog.adoptM + .4) + rand() * (10 - Math.max(2.3, s.dog.adoptM + .4)) };
  }
  function illEvent(s, kind) {
    const T = ILL[kind], cands = Object.keys(T).filter(id => !s.done['ill_' + id] && (!T[id].age || (s.ageM >= T[id].age[0] && s.ageM <= T[id].age[1]))).map(id => ({ id, w: T[id].w(s) })).filter(c => c.w > 0);
    if (!cands.length) return null;
    const id = wpick(cands).id, I = T[id]; s.done['ill_' + id] = 1; s.illAt = s.ageM; if (kind === 'acc') s.accN = (s.accN || 0) + 1;
    const pay = () => (s.flags.insured ? '보험 청구서를 쓰는 동안 {n:은} 옆에서 잤다.' : pickOne(['병원비가 생각보다 많이 나왔다.', '카드 할부를 석 달로 끊었다.']));
    return {
      id: 'ill_' + id, tag: '건강', cat: 'vet', text: `${I.sym}\n병원 진단은 ${I.name}.`, why: I.why(s),
      choices: [
        { t: '바로 병원에 간다', fx: G => { G.add('health', -2 - I.sev); G.add('bond', 1);
            G.ms('ill_' + id, `${ageAround(s.ageM)} ${j(I.name, '으로')} 병원 신세를 졌다.`);
            return pickOne(I.sev >= 3 ? ['수액을 맞고 하룻밤 입원했다. 다음 날 꼬리를 흔들며 나왔다. ', '처치를 받고 이틀 만에 밥그릇을 비웠다. '] : ['약을 받아 왔다. 사흘 만에 다시 뛰어다녔다. ', '주사 한 대에 금방 기운을 차렸다. ']) + pay(); } },
        { t: '하루 지켜본다', fx: G => { careMiss(s, 2);
            if (I.sev >= 3) {
              const neglect = s.routine.check < 1 || s.st.health < 50 || s.st.weight >= 68;
              if (rand() < (neglect ? (id === 'parvo' ? .5 : .35) : .06)) { s.pendingDie = I.name; G.ms('ill_' + id, `${ageAround(s.ageM)} ${j(I.name, '으로')} 갑자기 떠났다.`); return '밤새 더 나빠졌다. 새벽에 응급실로 달려갔지만 늦었다.'; }
              G.add('health', -18); G.add('calm', -4); s.lifeMod -= .3; G.ms('ill_' + id, `${ageAround(s.ageM)} ${j(I.name, '으로')} 크게 앓았다.`); return '밤새 더 나빠져 새벽에 응급실로 달려갔다. 며칠을 입원했다.'; }
            G.add('health', -6 - I.sev * 2); G.ms('ill_' + id, `${ageAround(s.ageM)} ${j(I.name, '으로')} 며칠 앓았다.`);
            return rand() < .5 ? '다행히 이틀 만에 나아졌다.' : '사흘째 그대로라 결국 병원에 갔다.'; } },
      ],
    };
  }
  // 견종 병 원인 한 줄: 생활에서 온 원인이 있으면 그것, 없으면 견종이나 나이
  function dzWhy(s, id) {
    const b = s.dog.breed, inB = b.risks.includes(id), heavy = s.st.weight > 62;
    if (['patella', 'hip', 'ivdd'].includes(id) && heavy) return '살이 쪄서 관절에 부담이 더 갔어요.';
    if (id === 'ivdd' && !own(s, 'mat')) return `${j(b.name, '은')} 허리가 길어 뛰어내릴 때 디스크가 다치기 쉬워요.`;
    if (id === 'dental' && !(s.routine.teeth || s.flags.teeth)) return '양치를 거의 안 해서 치석이 쌓였어요.';
    if (id === 'pancreas' && s.routine.treat === 2) return '기름진 간식이 췌장에 부담을 줬어요.';
    if (id === 'boas') return '코가 짧은 견종은 숨길이 좁게 태어나요.';
    if (id === 'stones') return inB ? `${j(b.name, '은')} 결석이 잘 생기는 체질이에요. 물을 적게 마시면 더 잘 생겨요.` : '물을 적게 마시면 결석이 생기기 쉬워요.';
    if (inB) return `${b.name}에게 흔한 유전 질환이에요.`;
    if (['cancer', 'kidney', 'mvd', 'eye'].includes(id)) return '나이가 들면 흔해지는 병이에요.';
    return '어느 개에게나 생길 수 있는 병이에요.';
  }

  function updateHealth(s, dt) {
    const st = s.st, R = s.routine; const sen = seniorFrac(s);
    let dzLoad = 0; for (const id in s.dz) { const d = s.dz[id]; dzLoad += d.state === 'cured' ? 0 : d.state === 'treated' ? .3 : d.state === 'managed' ? .6 : 1.1; }
    const target = 95 - Math.max(0, sen - .6) * 120 - Math.max(0, st.weight - 62) * .7 - Math.max(0, 36 - st.weight) * .5 - dzLoad * 9 + R.check * 2
      + (s.ageM < 6 ? (R.check - 1) * 4 : 0) // 아기 때 검진 칸 = 예방접종
      + (rStage(s) === 'senior' ? (R.walk - 1) * 3 : 0) // 노견은 짧게라도 걸어야 근육이 남는다
      - (s.joint || 0) * 3;
    st.health = clamp(st.health + (target - st.health) * Math.min(1, .16 * dt), 0, 100);
    if (st.weight > 66) s.lifeMod -= .012 * dt;
    s.lifeMod += (R.check - .8) * .008 * dt;
  }

  function addLog(s, text, kind = 'day') {
    const se = SEASONS[seasonOf(s.cal.m)];
    const key = 'l:' + fmt(text, s); if (s.used[key]) return; s.used[key] = 1;
    s.log.unshift({ age: s.ageM, when: `${ageShort(s.ageM)} · ${se}`, text: fmt(text, s), kind });
    if (s.log.length > 140) s.log.length = 140;
    if (S === s) renderLog();
  }

  function dayLine(s) {
    const st = stage(s); const pools = [[D.DAYS[st], 5], [D.DAYS.season[seasonOf(s.cal.m)], 2]];
    if (D.DAYS.breed[s.dog.breed.id]) pools.push([D.DAYS.breed[s.dog.breed.id], 3]);
    for (let i = 0; i < 8; i++) {
      const p = wpick(pools.map(([a, w]) => ({ a, w }))).a; const line = pickOne(p);
      if (!s.used[line]) { s.used[line] = 1; return line; }
    }
    return null;
  }
  function mindLine(s) {
    const pools = [D.MIND[stage(s)]];
    if (s.style.punish >= 2) pools.push(D.MIND.scared);
    if (s.home.alone + s.aloneMod >= 8) pools.push(D.MIND.alone);
    const sub = s.subs.find(d => d.alive);
    if (sub) pools.push(D.MIND.sub);
    for (let i = 0; i < 8; i++) {
      const line = pickOne(pickOne(pools));
      if (!s.used[line]) { s.used[line] = 1; return fmt(line, s, { subName: sub && sub.name }); }
    }
    return null;
  }

  function pickEvent(s) {
    const bad = s.st.health < 35 || s.st.joy < 30 || s.st.calm < 25;
    s.lowStreak = bad ? s.lowStreak + 1 : 0;
    if (s.lowStreak >= 2 && s.graceN < 4 && rand() < .45) {
      s.graceN++; s.lowStreak = 0;
      const left = D.GRACE.filter((x, i) => !s.done['g' + i]); const g = pickOne(left.length ? left : D.GRACE);
      s.done['g' + D.GRACE.indexOf(g)] = 1;
      return { id: 'grace', tag: '좋은 일', text: g.text, choices: [{ t: '다행이다', fx: G => { g.fx(G); return ''; } }] };
    }
    const dt = dtOf(s);
    const dzEv = diseaseCheck(s, dt); if (dzEv) return dzEv;
    // 사건 뒤 두 번은 쉬어 간다: 쓰다듬고 놀아 줄 시간
    if (s.evCool > 0) return null;
    const fk = forkEvent(s); if (fk) return fk;
    const rv = routeEvent(s); if (rv) return rv;
    // 사건이 너무 오래 없으면(아기 4칸, 그 뒤 3칸) 반드시 하나. 아기 때도 사건이 자주 오게(13%→30%)
    const force = s.ticks - (s.lastEvT || 0) >= (dt < 1 ? 4 : 3);
    if (!force && rand() > (dt < 1 ? .3 : dt === 1 ? .45 : .55)) return null;
    const G = makeG(s, {});
    const cands = D.EVENTS.filter(e => e.w > 0 && !(e.once && s.done[e.id]) && s.ageM >= e.when[0] && s.ageM <= e.when[1] && (!e.cond || e.cond(s, G)));
    if (!cands.length) return null;
    return wpick(cands);
  }

  /* ---------- 키우는 갈래(19차) ----------
     다마고치의 진화 갈림길처럼, 쌓인 값(산책·유대·사회성·교육·간식·겁·버릇·돌봄 놓침)으로 후보 갈래의 확률을 정하고
     갈림길(10개월쯤·3살쯤)에서 보호자가 고른다. 나쁜 쪽(기다림·겁·말썽)은 값이 크게 기울면 확률로 끌려 들어간다. */
  const RT = () => window.DATA_ROUTE || { R: {}, FORK: [''], FORK2: [''], YOUNG: ['', '', ''], TIER: {} };
  function routeW(s) {
    const T = traits(s.dog), st = s.st, R0 = s.routine || {}, mo = Math.max(1, s.ageM - s.dog.adoptM), fear = s.dog.fear;
    const sk = Object.values(s.skills || {}), skAvg = sk.length ? sk.reduce((a, x) => a + (x.p || 0), 0) / sk.length : 0;
    const hsum = Object.keys(D.HABITS).reduce((a, h) => a + (s.habits[h] >= .5 ? s.habits[h] : 0), 0);
    const alone = (s.home.alone || 0) + (s.aloneMod || 0), care = s.care || 0;
    return {
      explorer: .7 + (R0.walk || 0) * 1.4 + T.energy * 2 + (st.health > 70 ? .6 : 0),
      couch: .6 + st.bond / 35 + Math.min(2, s.cnt.pets / mo / 3) + (1 - T.energy) * 1.5,
      star: Math.max(.1, .4 + st.social / 30 + st.manners / 50 - fear * 3),
      trick: .4 + skAvg / 25 + T.train * 1.5 + (R0.train || 0) * .6,
      therapy: st.calm >= 55 && st.social >= 55 && fear < .35 && st.manners >= 45 ? 1.5 + st.calm / 50 : 0,
      foodie: .3 + (R0.treat || 0) * .6 + T.food + (st.weight >= 60 ? 1.5 : 0) + Math.min(1.5, s.cnt.treats / mo / 6),
      waiter: Math.max(0, (care - 4) / 3) + Math.max(0, (alone - 6) * .8) + (st.joy < 40 ? 1 : 0),
      shy: fear >= .45 ? (fear - .35) * 10 : 0,
      rascal: hsum >= 2 ? hsum * 1.2 + T.energy : 0,
    };
  }
  function sampleRoutes(W, n, skip) {
    const R = RT().R, pool = Object.keys(W).filter(k => R[k] && R[k].good && W[k] > 0 && k !== skip), out = [];
    while (out.length < n && pool.length) { const k = wpick(pool.map(id => ({ id, w: W[id] }))).id; out.push(k); pool.splice(pool.indexOf(k), 1); }
    return out;
  }
  function setRoute(s, id, pts, from) {
    if (s.route && s.route.id !== id) (s.routeHist = s.routeHist || []).push(s.route.id);
    s.route = { id, at: s.ageM, pts, seen: 1, ev: 0, lastEv: s.ageM, from: from || (s.route && s.route.from) || null };
  }
  function applyFx(G, fx) { for (const k in fx || {}) { if (k === 'fear') G.dogFear(fx[k]); else G.add(k, fx[k]); } }
  function forkEvent(s) {
    const D2 = RT(), R = D2.R; if (!Object.keys(R).length || s.finalAsked) return null;
    const n1 = !s.done.fork1 && s.ageM >= Math.max(10, s.dog.adoptM + 3);
    const n2 = !n1 && !!s.done.fork1 && !s.done.fork2 && !!s.route && s.ageM >= Math.max(36, s.route.at + 18) && stage(s) !== 'senior';
    if (!n1 && !n2) return null;
    const id = n1 ? 'fork1' : 'fork2', W = routeW(s), cur = s.route && s.route.id, curNeg = !!cur && !R[cur].good;
    const chipOf = () => { const r = R[s.route.id]; return { t: `갈래 · ${r.name}`, good: r.good ? true : undefined, mid: !r.good }; };
    const neg = Object.keys(R).filter(k => !R[k].good && W[k] > 0 && k !== cur).sort((a, b) => W[b] - W[a])[0];
    (s.wLog = s.wLog || []).push({ id, W, neg }); if (!curNeg && neg && W[neg] >= 2.5 && rand() < Math.min(.7, (W[neg] - 2) / 5)) {
      const r = R[neg];
      return { id, tag: '갈래', text: `${r.sign}\n${r.ask}`, chipOf,
        choices: shuffled(r.opts).map(([t, res, p, fx]) => ({ t, fx: G => { applyFx(G, fx); setRoute(s, neg, p, null); return res; } })) };
    }
    if (curNeg) {
      if (s.route.pts < 3) { s.done[id] = 1; return null; } // 아직 벗어나지 못했다. 그대로 간다
      const c = sampleRoutes(W, 3); if (!c.length) { s.done[id] = 1; return null; }
      return { id, tag: '갈래', text: `{n:이} 달라졌다. ${R[cur].name}였던 날들이 조금씩 옅어진다.\n이제 어떤 하루를 같이 보낼까?`, chipOf,
        choices: c.map(k => ({ t: `${R[k].pick} · ${R[k].name}`, fx: () => { setRoute(s, k, 1, cur); return `${R[k].sign} ${R[k].start}`; } })) };
    }
    const c = cur ? [cur, ...sampleRoutes(W, 2, cur)] : sampleRoutes(W, 3); if (!c.length) return null;
    return { id, tag: '갈래', text: pickOne(n1 ? D2.FORK : D2.FORK2), chipOf,
      choices: c.map(k => ({ t: k === cur ? `지금처럼 지낸다 · ${R[k].name}` : `${R[k].pick} · ${R[k].name}`, fx: () => {
        if (k === cur) { s.route.pts += 1; s.route.seen++; return pickOne(['{n:은} 늘 하던 대로 하루를 보냈다. 그게 제일 좋아 보였다.', '바꿀 이유가 없었다. {n}의 하루는 그대로 흘러갔다.']); }
        setRoute(s, k, 1, null); return `${R[k].sign} ${R[k].start}`; } })) };
  }
  function routeEvent(s) {
    const r = s.route; if (!r || s.finalAsked) return null; const def = RT().R[r.id]; if (!def || r.ev >= def.events.length) return null;
    const last = r.ev === def.events.length - 1, gap = s.ageM - r.lastEv;
    const ok = last ? stage(s) === 'senior' && gap >= 3 : gap >= (s.ageM < 24 ? 4 : 6);
    if (!ok || (rand() > .5 && gap < 16)) return null;
    const idx = r.ev, e = def.events[idx], eid = `rt_${r.id}_${idx}`, ch = shuffled(e.choices);
    return { id: eid, tag: '갈래', text: e.text,
      chipOf: ci => { const p = ch[ci][2]; return { t: `${def.name} ${p >= 2 ? '▲▲' : p > 0 ? '▲' : '▼'}`, good: p > 0 }; },
      choices: ch.map(([t, res, p, fx, ms]) => ({ t, fx: G => { applyFx(G, fx); r.pts += p; r.seen++; r.ev++; r.lastEv = s.ageM; if (ms) G.ms(eid, ms); return res; } })) };
  }
  // 결말: 갈래 × 꽃핌·보통·시듦. 돌봄 점수가 나쁘면 시듦, 갈래 선택이 좋고 돌봄도 괜찮으면 꽃핌
  function endingOf(s) {
    if (s._end) return s._end;
    const D2 = RT();
    if (!s.route || !D2.R[s.route.id]) return (s._end = { id: 'young', title: D2.YOUNG[0], kicker: '갈래가 정해지기 전에', lines: D2.YOUNG.slice(1).map(t => fmt(t, s)), tier: null });
    const r = D2.R[s.route.id], CG = careGrade(s), ratio = s.route.pts / Math.max(2, 2 * s.route.seen);
    const tier = CG.g === 'poor' || ratio < .25 ? 'wilt' : ratio >= .6 && (CG.g === 'good' || ratio >= .8) ? 'bloom' : 'mid';
    const E = r.end[tier], from = s.route.from && D2.R[s.route.from] ? D2.R[s.route.from].from : '';
    return (s._end = { id: `${s.route.id}_${tier}`, hid: from ? `${s.route.from}>${s.route.id}` : null, title: E[0], kicker: `${from ? from + ' ' : ''}${r.name} · ${D2.TIER[tier]}`, lines: E.slice(1).map(t => fmt(t, s)), tier, route: s.route.id });
  }
  const END_TOTAL = () => Object.keys(RT().R).length * 3 + 1;
  function endName(id) { const D2 = RT(); if (id === 'young') return D2.YOUNG[0]; const [rid, tier] = String(id).split('_'); return (D2.R[rid] && D2.R[rid].end[tier] || [''])[0]; }
  function endSave(e) {
    try {
      const k = 'dl_endings', o = JSON.parse(localStorage.getItem(k) || '{}'), isNew = !o[e.id]; o[e.id] = 1; if (e.hid) o['h:' + e.hid] = 1;
      localStorage.setItem(k, JSON.stringify(o)); const ks = Object.keys(o);
      return { isNew, base: ks.filter(x => !x.startsWith('h:')).length, hid: ks.filter(x => x.startsWith('h:')).length };
    } catch (_) { return { isNew: true, base: 1, hid: 0 }; }
  }
  // 같은 줄을 연달아 보이지 않게 카드 뭉치처럼 섞어 한 장씩 꺼낸다(다 쓰면 다시 섞되 방금 것은 맨 뒤로)
  // 판을 넘어서도 같은 장면이 이어 나오지 않게: 이 기기에서 최근에 본 것은 건너뛴다
  function xpick(key, arr) {
    let o = {}; try { o = JSON.parse(localStorage.getItem('dl_seen') || '{}'); } catch (_) { o = {}; }
    const used = o[key] || [], all = arr.map((_, i) => i); let left = all.filter(i => !used.includes(i));
    if (!left.length) { left = all.filter(i => i !== used[used.length - 1]); o[key] = []; }
    if (!left.length) left = all;
    const i = left[Math.floor(rand() * left.length)]; o[key] = [...(o[key] || []), i];
    try { localStorage.setItem('dl_seen', JSON.stringify(o)); } catch (_) { /* 저장 못 해도 판은 그대로 */ }
    return arr[i];
  }
  function deck(s, key, arr) {
    const d = (s.decks = s.decks || {});
    if (!d[key] || !d[key].length) { const a = shuffled(arr); if (a.length > 1 && a[0] === d[key + '_l']) a.push(a.shift()); d[key] = a; }
    const t = d[key].shift(); d[key + '_l'] = t; return t;
  }
  const WHYV = {
    aversive: ['혼내면 당장은 멈춰도 겁이 늘 수 있어요.', '무섭게 배우면 보호자 손을 피하게 될 수 있어요.', '벌로 멈춘 행동은 안 볼 때 다시 나와요.'],
    flood: ['한꺼번에 겪게 하면 겁이 커질 수 있어요.', '너무 많이, 너무 빨리 보여 주면 오히려 무서워해요.', '조금씩 늘려야 겁이 줄어요.'],
    late: ['시간이 지난 뒤 칭찬하면 이유를 몰라요.', '칭찬은 하는 그 순간에 해야 이어져요.', '몇 초만 늦어도 무엇을 잘했는지 몰라요.'],
    ignore: ['그냥 두면 잘 늘지 않아요.', '저절로 배우는 건 많지 않아요.', '가르쳐 주지 않으면 개는 제 방식대로 해요.'],
  };
  function whyOf(s, kind) { return WHYV[kind] ? deck(s, 'why_' + kind, WHYV[kind]) : ''; }
  // 할 일을 다 하면 넘기기 버튼이 빛나서 다음 칸으로 바로 가게 한다
  const skipLabel = s => (trainNeed(s) ? '넘기기 ▶' : '이번 칸 끝 · 넘기기 ▶');
  function skipGlow(s) {
    const b = $('#skipBtn'); if (!b) return;
    const on = !!s && !s.dead && (s.coach == null || s.coach >= 3) && !trainNeed(s) && !sheetOpen;
    b.classList.toggle('glow', on);
    if (on && !s.skipTip) { s.skipTip = 1; setTimeout(() => notice('할 일을 다 했으면 「넘기기 ▶」로 바로 다음 칸으로 가요', 'win'), 700); }
  }

  /* ---------- 견종 성향 ---------- */
  // data.js의 BREED_TRAITS(research-breeds.md)가 있으면 쓰고, 없으면 기존 값으로 대신한다. 0~1.
  // 견종 평균 + 그 아이만의 편차(표준편차 0.2). 같은 아이(같은 seed)는 늘 같은 값.
  function traits(dog) {
    if (dog._tv) return dog._tv;
    const b = dog.breed, B = (D.BREED_TRAITS || {})[b.id] || {};
    const def = { train: .5, food: .5, energy: (b.energy - 1) / 4, fearN: b.t.fear, strangerF: b.t.fear, dogAgg: .35, sep: b.t.sep, touch: .4,
      chase: CHASER.includes(b.id) ? .7 : .35, excite: .5, attach: .5, house: b.size === 'S' ? .6 : .3, heat: b.look.snout === 0 ? .9 : 0 };
    const base = { ...def, ...B }, r = makeRng('tv-' + dog.seed), tv = {};
    for (const k in base) tv[k] = k === 'energy' || k === 'heat' ? base[k] : clamp(base[k] + gauss(r) * .2, .02, .98);
    return (dog._tv = tv);
  }

  /* ---------- 교육 ---------- */
  const TR = () => (window.DATA_TRAIN || { SKILLS: {}, GRADE: {} });
  const TREATY = ['sched', 'stop', 'carry', 'class', 'kong', 'game', 'tiny', 'marker', 'lure', 'jackpot', 'longline', 'tree'];
  const SK_SENIOR = { sit: '아는 것 되짚기', leash: '천천히 걷기', handle: '몸 만지기·약 먹기', crate: '편한 자리 지키기' };
  const skName = (s, k) => (stage(s) === 'senior' && SK_SENIOR[k]) || TR().SKILLS[k].name;
  // 열린 교육: 나이 범위 안. 배변·입질은 버릇이 남아 있으면 조금 더 연다
  function skillOpen(s, k) { const v = TR().SKILLS[k]; if (s.ageM >= v.ages[0] && s.ageM <= v.ages[1]) return true; return !!(v.habit && s.ageM >= v.ages[0] && s.ageM < 30 && (s.habits[v.habit] || 0) >= .5); }
  // 다 큰 뒤(2살~)에는 새로 가르칠 게 없다. 미션이 걸렸거나, 버릇이 남았거나, 배운 게 흐려졌을 때만 교육(복습)이 뜬다
  const FIXH = { sit: 'jump' };
  function fixWhy(s, k) {
    if (!skillOpen(s, k)) return '';
    const v = TR().SKILLS[k], hb = v.habit || FIXH[k], sk = s.skills[k];
    if (hb && (s.habits[hb] || 0) >= 1) return '버릇이 남아 있다';
    if (sk && (sk.peak || 0) >= 30 && sk.p < sk.peak - 15) return `예전 ${Math.round(sk.peak)}% → 지금 ${Math.round(sk.p)}%`;
    return '';
  }
  const LES = 4; // 교육마다 수업 4개(각 1번씩)
  const lesOf = (s, k) => (s.skills[k] || {}).les || 0;
  const doneNow = (s, k) => (s.skills[k] || {}).lt === s.ticks;
  function trainable(s, k) { if (!skillOpen(s, k) || lesOf(s, k) >= LES || doneNow(s, k)) return false; if (s.ageM < 24) return true; return missionsOn(s).some(m => m.ks.includes(k)) || !!fixWhy(s, k); }
  function trainNeed(s) { const ks = Object.keys(TR().SKILLS).filter(k => trainable(s, k)); if (!ks.length) return null; return s.ageM < 24 || missionsOn(s).length ? 'main' : 'fix'; }
  // 처음 안내: ① 교육하기 ② 산책 ③ 쓰다듬기. 화면 위 말풍선과 버튼 깜빡임으로 하나씩
  const COACH = [['#trainBtn', '① 여기를 눌러 첫 교육을 해 주세요'], ['#walkBtn', '② 산책도 데려가 주세요'], ['#lifeDog', '③ 아이를 눌러 쓰다듬어 주세요']];
  function coachStep(s, to) {
    if (!s || s.coach == null || s.coach >= 3 || to !== s.coach + 1) return;
    s.coach = to; s.coachAt = s.ticks;
    if (to >= 3) toast('이제 시간이 흘러요. 나이 칸 아래 막대가 차면 한 주가 지나요.');
    renderCoach(); if (to === 1) schedule();
  }
  function renderCoach() {
    const el = $('#coach'); if (!el) return;
    $$('.coach-on').forEach(x => x.classList.remove('coach-on'));
    const s = S; if (s && s.coach === 0 && $('#trainBtn').hidden) { s.coach = 1; s.coachAt = s.ticks; }
    const st = s && !s.dead && s.coach != null && s.coach < 3 ? COACH[s.coach] : null, t = st && $(st[0]);
    if (!t || t.hidden || $('#life').hidden || !$('#sheet').hidden || !$('#result').hidden) { el.hidden = true; return; }
    t.classList.add('coach-on'); $('span', el).textContent = st[1]; el.hidden = false;
    const sc = $('#lifeScene').getBoundingClientRect(), r = t.getBoundingClientRect(), bw = el.offsetWidth;
    const cx = r.left - sc.left + r.width / 2, x = clamp(cx, bw / 2 + 8, sc.width - bw / 2 - 8);
    el.style.left = x + 'px'; el.style.top = (r.top - sc.top + (st[0] === '#lifeDog' ? r.height * .25 : 0)) + 'px';
    el.style.setProperty('--ax', (cx - x + bw / 2) + 'px');
  }
  addEventListener('resize', () => renderCoach());
  function skillOf(s, k) { return s.skills[k] || (s.skills[k] = { p: 0, n: 0, last: -9, same: 0, by: {}, early: 0, poison: 0 }); }
  const skillP = (s, k) => (s.skills[k] ? s.skills[k].p / 100 : 0);
  // 한 번 연습. 익힘 = 방법 기본값 × 견종 × 간식 동기 × 나이 × 지침 × 같은 날 반복 × 꾸준함 × 남은 몫
  // 오늘의 컨디션(한 칸에 하나). 교육 창 첫 줄과 결과 칩에 보인다
  function moodNow(s) { if (!s.moodNow || s.moodNow.tick !== s.ticks) s.moodNow = { ...wpick(TR().MOODS || [{ id: 'plain', t: '평범한 날', w: 1, m: 1 }]), tick: s.ticks }; return s.moodNow; }
  function moodMul(s, k, mid) {
    const M = moodNow(s); let x = M.food ? (TREATY.includes(mid) ? M.m : 1) : M.m;
    if (M.out && ['social', 'leash', 'recall'].includes(k)) x = M.out;
    if (M.socialUp && k === 'social') x = M.socialUp;
    return x;
  }
  const stageOf = p => Math.min(3, Math.floor(p / 25));
  const STG = (s, k) => stage(s) === 'senior' ? null : ((TR().STAGES || {})[k] || null);
  function trainOnce(s, k, mid) {
    const SK = TR().SKILLS[k], M = SK.methods.find(m => m.id === mid), T = traits(s.dog), sk = skillOf(s, k), st = s.st;
    if (s.trainTick.tick !== s.ticks) s.trainTick = { tick: s.ticks, n: 0 };
    s.trainTick.n++;
    sk.same = sk.last === s.ticks ? sk.same + 1 : 0;
    // 한 칸이 한 달이면 그 사이 연습할 날이 더 많다
    const BASE = { reward: 30, pro: 30, manage: 20, aversive: 22, flood: 13, late: 7, ignore: 6 }; // 좋은 방법 4번이면 거의 100
    const breed = .85 + .3 * T.train; // 견종 차이는 ±15% 안쪽(research-training.md 10번)
    const food = TREATY.includes(mid) ? (.9 + .2 * T.food) * [.95, 1, 1.05][s.routine.treat] : 1;
    const fear = s.dog.fear;
    let age = 1;
    // 사회화: 생후 3~12주 ×1.5, 16주까지 ×1.1, 그 뒤에도 0은 아니다(AVSAB 2008, AAHA 2015)
    if (k === 'social') age = s.ageM < 2.8 ? 1.5 : s.ageM < 3.7 ? 1.1 : s.ageM < 12 ? .6 : .4;
    // 사춘기(7~16개월)에는 이미 배운 것도 잘 안 나온다(Kinsman 2025)
    if ((k === 'sit' || k === 'recall' || k === 'leash') && s.ageM >= 7 && s.ageM <= 16) age *= .8;
    // 퍼피 클래스는 한 번으로는 효과가 작고 여러 번 다녀야 쌓인다(Kutsumi 2013)
    if (mid === 'class') age *= Math.min(1, ((sk.by.class || 0) + 1) / 4);
    if (k === 'potty') age = (s.ageM < 2 ? .5 : s.ageM < 3 ? .8 : s.ageM < 5 ? 1 : 1.15) * (1 - .25 * T.house);
    if (k === 'nip') age = s.ageM < 5 ? 1 : 1.25;
    if (k === 'handle' || k === 'crate') age = s.ageM < 4 ? 1.3 : s.ageM > 24 ? .8 : 1;
    if (stage(s) === 'senior') age *= .75;
    const base = M.gain <= 0 ? 0 : (BASE[M.kind] || 10);
    let g = base * breed * food * Math.max(.7, Math.min(1.3, age)) * (.9 + rand() * .2) * moodMul(s, k, mid);
    if (base > 0) g = Math.max(4, Math.min(35, g)); // 한 수업에 4~35%: 2~3%짜리는 없다
    if (M.kind === 'aversive') g *= (1.15 - fear * .6) * ((sk.by[mid] || 0) > 3 ? .6 : 1);
    if (M.kind === 'flood' && fear > .5) g = -Math.abs(g) * .6;
    if (k === 'recall') g *= 1 / (1 + sk.poison * .35);
    if (g > 0) g *= ({ crate: own(s, 'kennel') ? 1.25 : 1, alone: own(s, 'kong') ? 1.2 : 1, leash: own(s, 'harness') ? 1.2 : 1, social: own(s, 'class') ? 1.2 : 1 })[k] || 1;
    const b4 = snap(s);
    const les0 = sk.les || 0; sk.les = les0 + 1; sk.lt = s.ticks;
    const p0 = sk.p; sk.p = clamp(sk.p + g, 0, 100); sk.peak = Math.max(sk.peak || 0, sk.p); sk.n++; sk.by[mid] = (sk.by[mid] || 0) + 1; sk.last = s.ticks;
    if (!sk.first) sk.first = s.ageM;
    if (k === 'social' && s.ageM < 2.8 && g > 0) sk.early++;
    // 연습 자체의 영향
    const sd = M.side || {};
    if (sd.fear) s.dog.fear = clamp(s.dog.fear + sd.fear * (1 + fear) * (1 - fear * .75), 0, 1);
    if (sd.bond) st.bond = clamp(st.bond + sd.bond, 0, 100);
    if (sd.handle) s.habits.handle = clamp(s.habits.handle + sd.handle * (rand() < .5 ? 1 : 0), 0, 3);
    if (sd.reactive) s.habits.reactive = clamp(s.habits.reactive + sd.reactive * (rand() < .4 ? 1 : 0), 0, 3);
    if (sd.sepRisk) s.sepGuard -= sd.sepRisk;
    if (sd.hide) s.flags.pottyHide = (s.flags.pottyHide || 0) + 1;
    if (sd.recallPoison) sk.poison++;
    if (M.kind === 'aversive') { s.style.punish++; s.punishRecent += .6; st.calm = clamp(st.calm - 1.2, 0, 100); }
    else if (M.kind === 'reward' || M.kind === 'pro') { s.style.reward++; st.bond = clamp(st.bond + .8, 0, 100); }
    if (TREATY.includes(mid)) st.weight = clamp(st.weight + (own(s, 'cup') ? .05 : .12), 18, 96);
    const pos = Math.max(0, g);
    if (k === 'potty') s.habits.potty = clamp(s.habits.potty - pos / 38, 0, 3);
    if (k === 'nip') s.habits.nip = clamp(s.habits.nip - pos / 38, 0, 3);
    if (k === 'leash') s.habits.pull = clamp(s.habits.pull - pos / 55, 0, 3);
    if (k === 'handle') s.habits.handle = clamp(s.habits.handle - pos / 60, 0, 3);
    if (k === 'sit') { st.manners = clamp(st.manners + pos * .35, 0, 100); s.habits.jump = clamp(s.habits.jump - pos / 80, 0, 3); }
    if (k === 'recall' || k === 'leash' || k === 'crate') st.manners = clamp(st.manners + pos * .15, 0, 100);
    if (k === 'alone') s.sepGuard += g / 420;
    if (k === 'social') {
      if (mid === 'home') { st.social = clamp(st.social - .8, 0, 100); if (s.ageM < 4) s.dog.fear = clamp(s.dog.fear + .012, 0, 1); }
      else if (g > 0) { st.social = clamp(st.social + g * .45, 0, 100); s.dog.fear = clamp(s.dog.fear - g / 100 * (s.ageM < 2.8 ? .14 : s.ageM < 3.7 ? .09 : .05), 0, 1); }
      else { s.dog.fear = clamp(s.dog.fear + .03, 0, 1); st.calm = clamp(st.calm - 3, 0, 100); }
    }
    const d = diffSnap(s, b4);
    s.trainLog.push({ k, mid, age: s.ageM, g: Math.round(g * 10) / 10 });
    const good = g >= Math.max(4, base * .5);
    const pool = (good ? M.ok : M.meh) || M.ok, SG = STG(s, k), sp = SG ? SG[Math.min(3, les0)][good ? 1 : 2] : [];
    const kindOK = ['reward', 'manage', 'pro'].includes(M.kind);
    const pick = kindOK ? (uniq(s, sp, 't:') || uniq(s, pool, 't:')) : (uniq(s, pool, 't:') || (!good ? uniq(s, sp, 't:') : null));
    const md = moodNow(s), ml = md.lines && rand() < .7 ? uniq(s, md.lines, 'md:') : null, lead = ml ? ml + ' ' : '';
    s.lastAct.train = s.ageM; if (s.nudge && s.nudge.kind === 'train') s.nudge = null;
    return { g, d, p0, line: fmt(lead + (pick || trainLine(s, k, sk, good)), s), sk, mood: md, les: sk.les, base };
  }
  // 방법별 문장을 다 쓰면 그날의 연습 장면을 새로 만든다(번째 수가 들어가 겹치지 않는다)
  const TL_GOOD = ['어제보다 반 박자 빨리 따라왔다.', '신호를 듣자마자 귀가 섰다.', '간식보다 칭찬에 먼저 꼬리를 흔들었다.', '끝나고도 한 번 더 하자는 얼굴로 앉아 있었다.', '중간에 한눈을 팔다가도 이름을 부르자 돌아봤다.', '처음으로 실수 없이 끝까지 해냈다.', '연습이 끝나자 방석으로 가서 바로 잤다.'];
  const TL_MEH = ['오늘은 마음이 딴 데 가 있었다.', '두어 번 하고 나서 하품을 했다.', '밖에서 나는 소리에 자꾸 고개를 돌렸다.', '어제 되던 것이 오늘은 잘 안 됐다.', '간식만 보고 동작은 건너뛰었다.', '하다 말고 바닥 냄새를 맡으러 갔다.'];
  function trainLine(s, k, sk, good) {
    const nm = skName(s, k), c = sk.n;
    const heads = [`${nm} 연습 ${c}번째.`, `오늘로 ${c}번째 ${nm} 연습이다.`, `${c}번째로 ${nm}을 연습했다.`];
    const tails = good ? TL_GOOD : TL_MEH, all = [];
    heads.forEach(h => tails.forEach(t => all.push(h + ' ' + t)));
    return uniq(s, all, 't:') || '';
  }
  // 익힌 교육이 매 칸 버릇 위험에 주는 영향(updateHabits 뒤)
  function applySkills(s, dt) {
    const sk = k => skillP(s, k);
    // 복습을 안 하면 앉아·부르면 오기·줄 걷기는 천천히 잊는다
    // (18차) 배운 것이 저절로 흐려지던 규칙은 없앴다: 같은 수업을 되풀이하게 만들었다
    // 배변·입질은 나이가 들수록 저절로도 조금 줄지만, 익힌 만큼 더 빨리 준다
    if (s.habits.potty > 0) s.habits.potty = clamp(s.habits.potty - ((s.ageM > 6 ? .012 : .006) + sk('potty') * .06) * dt, 0, 3);
    if (s.habits.nip > 0) s.habits.nip = clamp(s.habits.nip - ((s.ageM > 7 ? .03 : .006) + sk('nip') * .06) * dt, 0, 3);
    // 사회화를 거의 못 한 채 6개월을 넘기면 겁이 조금 굳는다(사회화 민감기)
    if (s.ageM >= 6 && !s.flags.socChecked) { s.flags.socChecked = 1; const p = skillP(s, 'social'); if (p < .15) { s.dog.fear = clamp(s.dog.fear + .08, 0, 1); s.st.social = clamp(s.st.social - 6, 0, 100); } else if (p > .5) s.dog.fear = clamp(s.dog.fear - .04, 0, 1); }
    if (s.habits.jump > 0) s.habits.jump = clamp(s.habits.jump * Math.pow(.84, dt / 12), 0, 3);
    // 무서운 일이 뜸해지면 겁은 타고난 수준 쪽으로 아주 천천히 돌아온다
    if (s.punishRecent < .5) s.dog.fear = clamp(s.dog.fear - (s.dog.fear - (s.fear0 ?? s.dog.fear)) * .015 * dt, 0, 1);
    // 혼나서 숨어서 싸게 된 개는 변 먹기로 이어질 수 있다
    if ((s.flags.pottyHide || 0) >= 3 && s.ageM < 18 && rand() < .04 * dt) { s.habits.copro = clamp(s.habits.copro + .8, 0, 3); s.flags.pottyHide = 0; addLog(s, `${j(s.dog.name, '이')} 소파 뒤에서 몰래 볼일을 보고, 그걸 먹어 치웠다.`, 'echo'); }
  }


  /* ---------- 준비물: 고른 것이 나중에 '덕분에'가 되고, 안 고른 것이 '그때 ~했더라면'이 된다 ----------
     cat은 data.js PARTNERS의 분야. 브랜드는 넣지 않는다(partnership.md). 효과는 게임 속 위험을 조금 줄이는 정도. */
  const GEAR = {
    mat: { name: '미끄럼 방지 매트', cat: 'supplement', catName: '용품', short: '미끄러운 바닥에서 다리·허리를 지킨다',
      hit: '다리를 다쳤다', scene: '{n:이} 거실 바닥에서 미끄러진 뒤로 뒷다리를 들고 걷는다.', what: '그때 바닥에 매트를 깔아 뒀더라면.',
      thanks: '매트 덕분에 끝까지 소파를 혼자 오르내렸다.', buy: '오늘부터 거실이 덜 미끄럽다.',
      trig: s => ['hip', 'patella', 'ivdd'].some(k => s.dz[k]), risk: s => ['hip', 'patella', 'ivdd'].some(k => s.dog.breed.risks.includes(k)) || (s.joint || 0) > .2 },
    brush: { name: '강아지 칫솔·치약', cat: 'dental', catName: '치아', short: '하루 한 번 양치로 치석을 막는다',
      hit: '이를 뽑았다', scene: '수의사가 {n}의 입술을 들추자 누런 치석이 드러났다. 이를 세 개 뽑았다.', what: '그때 하루 한 번 양치를 시작했더라면.',
      thanks: '칫솔 덕분에 나이가 들어도 입 냄새가 거의 없었다.', buy: '첫날은 치약만 핥게 했다. 맛있는 줄 안다.',
      trig: s => !!s.dz.dental },
    kennel: { name: '켄넬(이동장)', cat: 'gear', catName: '용품', short: '나만의 방. 병원·차 타는 날이 편하다',
      hit: '이동장에서 울었다', scene: '병원 가는 날, {n:은} 이동장 앞에서 버티다 끝내 울었다.', what: '그때 켄넬을 편한 방으로 만들어 줬더라면.',
      thanks: '켄넬 덕분에 병원 가는 날에도 안에서 잠들었다.', buy: '문을 열어 두자 냄새부터 맡고 들어갔다.',
      trig: s => (s.miss.crate || {}).st === 'no' || (s.habits.car || 0) >= 1 },
    kong: { name: '간식 채우는 장난감', cat: 'toy', catName: '장난감', short: '혼자 있는 시간을 씹고 핥는 시간으로',
      hit: '혼자 남으면 울었다', scene: '현관문이 닫히자 {n:이} 울기 시작했다. 옆집에서 쪽지가 붙었다.', what: '그때 혼자 있는 시간을 채워 줄 장난감이 있었더라면.',
      thanks: '장난감 덕분에 문이 닫혀도 바닥에 엎드려 기다렸다.', buy: '간식을 채워 주자 한참을 혼자 씨름했다.',
      trig: s => (s.miss.alone || {}).st === 'no' || (s.habits.sep || 0) >= 1 },
    harness: { name: '앞고리 하네스', cat: 'gear', catName: '용품', short: '당기면 몸이 옆으로 돌아 덜 끌린다',
      hit: '줄을 끌었다', scene: '{n:이} 확 당기는 바람에 넘어질 뻔했다. 손바닥에 줄 자국이 남았다.', what: '그때 앞고리 하네스로 바꿨더라면.',
      thanks: '하네스 덕분에 산책길이 끌려가는 길이 아니었다.', buy: '처음엔 어색해서 몸을 털었다. 금방 잊었다.',
      trig: s => (s.miss.leash || {}).st === 'no' || (s.habits.pull || 0) >= 1 },
    cup: { name: '계량컵·저칼로리 간식', cat: 'food', catName: '사료·간식', short: '눈대중 대신 재서 준다',
      hit: '살이 쪘다', scene: '체중계 숫자를 보고 수의사가 말없이 고개를 저었다.', what: '그때 사료와 간식을 재서 줬더라면.',
      thanks: '계량컵 덕분에 평생 알맞은 몸무게를 지켰다.', buy: '생각보다 한 컵이 적었다. 그동안 많이 줬다.',
      trig: s => s.st.weight >= 68 || !!s.dz.obesity, risk: s => s.dog.breed.risks.includes('obesity') || traits(s.dog).food > .55 || s.routine.treat === 2 },
    class: { name: '퍼피 클래스', late: '행동 교육', cat: 'vet', catName: '교육', short: '또래 개·낯선 사람을 안전하게 만난다',
      hit: '낯선 개를 무서워했다', scene: '낯선 개가 다가오자 {n:이} 털을 세우고 짖었다. 산책길이 무서운 길이 됐다.', what: '그때 퍼피 클래스에 데려갔더라면.',
      thanks: '클래스에서 만난 친구들 덕분에 다른 개를 보면 꼬리부터 흔들었다.', buy: '첫 수업에서 구석에만 있었다. 둘째 주엔 먼저 다가갔다.',
      trig: s => (s.miss.social || {}).st === 'no' || ((s.habits.reactive || 0) >= 1 && s.ageM < 36) },
  };
  Object.assign(GEAR, {
    tickrx: { name: '진드기 예방약', cat: 'vet', catName: '동물병원', short: '봄·여름 풀숲 산책 전에 한 방울',
      hit: '진드기 열병을 앓았다', scene: '풀숲 산책 뒤 {n}의 귀 뒤에서 진드기가 나왔다. 이틀 뒤 열이 났다.', what: '그때 진드기 예방약을 발라 줬더라면.',
      thanks: '예방약 덕분에 풀숲을 다녀와도 진드기 걱정이 없었다.', buy: '목덜미에 한 방울 발라 줬다. 냄새를 맡으려고 제자리를 돌았다.',
      trig: s => !!s.done.ill_tick, risk: () => true },
    cool: { name: '쿨매트', cat: 'gear', catName: '용품', short: '한여름 더위를 바닥에서 식힌다',
      hit: '더위에 쓰러졌다', scene: '한낮 산책 뒤 {n:이} 혀를 길게 빼고 주저앉았다. 몸이 뜨거웠다.', what: '그때 한낮 산책을 피하고 시원한 자리를 만들어 줬더라면.',
      thanks: '쿨매트 덕분에 여름마다 그 위에 배를 깔고 잤다.', buy: '처음엔 차가워서 앞발로만 툭툭 건드렸다.',
      trig: s => !!s.done.ill_heat, risk: s => s.dog.look.snout === 0 || s.dog.breed.size === 'L' },
    bin: { name: '뚜껑 잠기는 쓰레기통', cat: 'gear', catName: '용품', short: '코를 들이밀어도 안 열린다',
      hit: '쓰레기통을 뒤져 탈이 났다', scene: '부엌 바닥에 쓰레기가 흩어져 있었다. {n:은} 그날 밤 내내 토했다.', what: '그때 쓰레기통 뚜껑을 잠가 뒀더라면.',
      thanks: '잠기는 쓰레기통 덕분에 부엌을 뒤지는 일이 없었다.', buy: '{n:은} 뚜껑을 코로 몇 번 밀어 보다 포기했다.',
      trig: s => !!s.done.ill_trash, risk: s => traits(s.dog).food > .5 },
  });
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const own = (s, id) => !!(s.gear && s.gear[id] != null);
  function gearBuy(s, id) {
    s.gear = s.gear || {}; if (own(s, id)) return; s.gear[id] = s.ageM;
    if (id === 'kong') s.sepGuard += .03;
    (s.catLog = s.catLog || {})[GEAR[id].cat] = (s.catLog[GEAR[id].cat] || 0) + 1;
    addLog(s, `${j(GEAR[id].name, '을')} 들였다. ${GEAR[id].buy}`, 'good');
  }
  // 준비물 고르기: 처음엔 3개, 6개월·첫 만난 날·노견이 되면 1개씩 더
  function openGear(s, left, first) {
    const n = s.dog.name, list = Object.keys(GEAR).filter(id => !own(s, id));
    if (!list.length || left <= 0) return false;
    left = Math.min(left, list.length);
    const picked = new Set(), finish = () => {
      picked.forEach(id => gearBuy(s, id)); renderLife();
      showSheet(false); showResult({ kind: '준비물', pick: [...picked].map(k => GEAR[k].name).join(' · '), text: uniq(s, ['준비가 끝났다. 쓸모는 살면서 알게 된다.', '현관에 택배 상자가 쌓였다. 하나씩 뜯어 봤다.', '새 물건 냄새를 한참 맡더니 그 옆에 누웠다.', '장바구니가 가벼워졌다. 마음은 조금 든든해졌다.', '포장을 뜯자 상자부터 차지했다.'], 'gd:') || '준비가 끝났다.', done: resume });
    };
    const head = () => `<p class="mh-top"><b>준비물</b><span>고른 것 ${picked.size}/${left}${Object.keys(s.gear || {}).length ? ' · 들인 것 ' + Object.keys(s.gear).map(k => GEAR[k].name).join(', ') : ''}</span></p>`;
    openPanel({ id: 'gear', tag: '준비물', when: s.ageM < 6 ? `생후 ${weeksOf(s.ageM)}주` : ageText(s.ageM),
      text: first ? `${n}에게 줄 준비물을 ${left}개 골라 주세요.` : (uniq(s, [`${ageText(s.ageM)}. 하나 더 들일 준비물을 골라 주세요.`, `${j(n, '이')} 자랐다. 지금 필요한 걸 하나 골라 주세요.`, '살림이 하나 늘 때가 됐다. 무엇을 들일까요?', `요즘 ${n}에게 필요한 게 보인다. 하나 골라 주세요.`], 'gq:') || '준비물을 하나 더 고를 수 있어요.'),
      head: head(),
      items: list.map(id => ({ cls: 'skill gear', html: `<span class="sk-top"><b>${GEAR[id].name}</b><em>${GEAR[id].catName}</em></span><span class="sk-m">${GEAR[id].short}</span>`, onPick: b => {
        if (picked.has(id)) { picked.delete(id); b.classList.remove('on'); b.setAttribute('aria-pressed', 'false'); }
        else if (picked.size < left) { picked.add(id); b.classList.add('on'); b.setAttribute('aria-pressed', 'true'); }
        $('#sheet .sheet-head').innerHTML = head();
        if (picked.size >= left) { $$('#sheet .choice').forEach(x => { x.disabled = true; }); setTimeout(finish, (REDUCED || window.__manual) ? 0 : 700); }
      } })), grid: true, noClose: first, closeText: '이번엔 괜찮다' });
    return true;
  }
  function openGearOld(s, left, first) {
    const n = s.dog.name, list = Object.keys(GEAR).filter(id => !own(s, id));
    if (!list.length || left <= 0) return false;
    openPanel({ id: 'gear', tag: '준비물', when: s.ageM < 6 ? `생후 ${weeksOf(s.ageM)}주` : ageText(s.ageM),
      text: first ? `${n}에게 줄 준비물을 ${left}개 골라 주세요.` : (uniq(s, [`${ageText(s.ageM)}. 하나 더 들일 준비물을 골라 주세요.`, `${j(n, '이')} 자랐다. 지금 필요한 걸 하나 골라 주세요.`, `살림이 하나 늘 때가 됐다. 무엇을 들일까요?`, `요즘 ${n}에게 필요한 게 보인다. 하나 골라 주세요.`], 'gq:') || '준비물을 하나 더 고를 수 있어요.'),
      head: `<p class="mh-top"><b>준비물</b><span>남은 ${left}개${own(s, Object.keys(GEAR)[0]) || Object.keys(s.gear || {}).length ? ' · 들인 것 ' + Object.keys(s.gear).map(k => GEAR[k].name).join(', ') : ''}</span></p>`,
      items: list.map(id => ({ cls: 'skill gear', html: `<span class="sk-top"><b>${GEAR[id].name}</b><em>${GEAR[id].catName}</em></span><span class="sk-m">${GEAR[id].short}</span>`, onPick: () => {
        gearBuy(s, id); renderLife();
        if (left > 1 && openGear(s, left - 1, first)) return;
        showSheet(false); showResult({ kind: '준비물', pick: Object.keys(s.gear).map(k => GEAR[k].name).join(' · '), text: uniq(s, ['준비가 끝났다. 쓸모는 살면서 알게 된다.', '현관에 택배 상자가 쌓였다. 하나씩 뜯어 봤다.', '새 물건 냄새를 한참 맡더니 그 옆에 누웠다.', '장바구니가 가벼워졌다. 마음은 조금 든든해졌다.', '포장을 뜯자 상자부터 차지했다.'], 'gd:') || '준비가 끝났다.', done: resume });
      } })), grid: true, noClose: first, closeText: '이번엔 괜찮다' });
    return true;
  }
  // 안 고른 준비물의 일이 터지면: 짧은 장면 + 그때 ~했더라면 + 지금이라도?
  function regretCheck(s) {
    s.reg = s.reg || {}; s.regQ = s.regQ || [];
    for (const id in GEAR) {
      if (s.reg[id] || !GEAR[id].trig(s)) continue;
      s.reg[id] = { age: s.ageM, had: own(s, id) };
      if (!own(s, id)) s.regQ.push(id);
    }
  }
  function regretEvent(s, id) {
    const it = GEAR[id], nm = s.ageM >= 12 && it.late ? it.late : it.name, P = (D.PARTNERS || {})[it.cat];
    return { id: 'reg_' + id, tag: '아쉬움', cat: it.cat, text: `${it.scene}\n${it.what}`,
      choices: [
        { t: `지금이라도 ${j(nm, '을')} 들인다`, fx: G => { gearBuy(s, id); G.add('bond', 1); s.reg[id].late = 1; return `${uniq(s, ['늦었지만 오늘부터다.', '지금이라도 해서 다행이다.', '그날 바로 주문했다. 다음 날 왔다.', '이번엔 미루지 않았다.'], 'lt:') || '늦었지만 오늘부터다.'}${P ? ` ${P.name}: ${P.line}` : ''}`; } },
        { t: '이대로 지낸다', fx: () => '그날의 아쉬움은 일기장에만 남았다.' },
      ] };
  }

  /* ---------- 미션: 나이 기한 안에 익힘 목표 ----------
     기한은 연구에서 말하는 시기를 따른다(research-training.md). 기한을 넘기면 결과가 남고, 그 뒤에도 배울 수는 있지만 더 느리다. */
  const MISSIONS = [
    { id: 'social', ks: ['social'], to: 50, by: 3.3, why: '생후 14주 무렵까지가 낯선 소리·사람·개에 익숙해지기 가장 좋은 때다.',
      ok: '낯선 소리에 귀만 한 번 세우고 다시 놀았다. 세상이 덜 무서운 곳이 됐다.', no: '세상 구경을 충분히 못 하고 14주를 넘겼다. 낯선 것에 대한 겁이 조금 굳었다. 지금부터도 할 수 있지만 더 오래 걸린다.',
      fx: (s, ok) => { s.dog.fear = clamp(s.dog.fear + (ok ? -.03 : .05), 0, 1); s.st.social = clamp(s.st.social + (ok ? 3 : -4), 0, 100); } },
    { id: 'crate', ks: ['crate'], to: 50, by: 3.7, why: '생후 16주 전에 켄넬에서 자 본 강아지는 6개월 때 혼자 있는 걸 덜 힘들어했다.',
      ok: '켄넬 문을 열어 두면 혼자 들어가서 잤다.', no: '켄넬을 익히지 못하고 16주를 넘겼다. 문을 닫으면 낑낑거린다. 차를 탈 때나 병원에 갈 때 힘들 수 있다.',
      fx: (s, ok) => { s.sepGuard += ok ? .05 : -.04; if (!ok) s.st.calm = clamp(s.st.calm - 3, 0, 100); } },
    { id: 'potty', ks: ['potty'], to: 75, by: 4.5, why: '먹고·자고·논 직후 데려가 바로 보상한 집은 배변 성공이 98%였다.',
      ok: '패드 앞에서 빙글 돌더니 그 자리에 쌌다. 처음으로 혼자 찾아갔다.', no: '배변 자리를 아직 모른다. 실수가 버릇이 돼 가고 있다. 지금부터 잡으면 몇 주가 더 걸린다.',
      fx: (s, ok) => { s.habits.potty = clamp(s.habits.potty + (ok ? -.3 : .4), 0, 3); } },
    { id: 'nip', ks: ['nip'], to: 75, by: 5, from: 2.8, why: '이갈이가 끝나기 전에 무는 힘을 조절하는 법을 배워야 한다.',
      ok: '놀다가 손을 물었다가 스스로 힘을 뺐다.', no: '무는 힘을 조절하지 못한 채 이갈이가 끝나 간다. 손님 손을 무는 일이 생길 수 있다.',
      fx: (s, ok) => { s.habits.nip = clamp(s.habits.nip + (ok ? -.3 : .4), 0, 3); if (!ok) s.habits.handle = clamp(s.habits.handle + .2, 0, 3); } },
    { id: 'sit', ks: ['sit'], to: 50, by: 6, from: 3.5, why: '짧게 자주 연습한 쪽이 몰아서 길게 한 쪽보다 적은 횟수로 익혔다.',
      ok: '밥그릇을 들자 시키지도 않았는데 앉았다.', no: '앉아·기다려를 아직 모른다. 반가우면 사람에게 뛰어오른다.',
      fx: (s, ok) => { s.st.manners = clamp(s.st.manners + (ok ? 4 : -3), 0, 100); if (!ok) s.habits.jump = clamp(s.habits.jump + .3, 0, 3); } },
    { id: 'handle', ks: ['handle'], to: 50, by: 6, from: 3.5, why: '어릴 때 짧게 만지고 보상하는 연습이 나중의 발톱 깎기·약 먹이기를 쉽게 한다.',
      ok: '발을 잡아도 가만히 있었다. 발톱을 처음으로 다 깎았다.', no: '발이나 귀를 만지면 몸을 뺀다. 병원과 미용이 힘들어질 수 있다.',
      fx: (s, ok) => { s.habits.handle = clamp(s.habits.handle + (ok ? -.2 : .35), 0, 3); } },
    { id: 'alone', ks: ['alone'], to: 50, by: 7, from: 4, why: '혼자 있는 시간은 불안해지기 전 길이부터 조금씩 늘리기를 권한다.',
      ok: '현관문이 닫혀도 방석에서 고개만 들었다가 다시 누웠다.', no: '혼자 남으면 문 앞에서 운다. 분리불안으로 이어질 수 있다.',
      fx: (s, ok) => { s.sepGuard += ok ? .08 : -.08; } },
    { id: 'recall', ks: ['recall'], to: 60, by: 12, from: 6, why: '보상으로 가르친 개는 첫 부름에 82.5%가 왔다.',
      ok: '공원 끝에서 이름을 부르자 귀를 펄럭이며 달려왔다.', no: '불러도 잘 안 온다. 줄을 풀면 위험하다.',
      fx: (s, ok) => { s.st.manners = clamp(s.st.manners + (ok ? 4 : -2), 0, 100); if (ok) s.st.bond = clamp(s.st.bond + 2, 0, 100); } },
    { id: 'leash', ks: ['leash'], to: 60, by: 12, from: 6, why: '느슨하게 걸을 때 보상하는 것이 지침의 권고다.',
      ok: '줄이 처음으로 끝까지 느슨했다. 산책이 짧게 느껴졌다.', no: '줄을 당기며 앞서 걷는다. 산책이 힘들어졌다.',
      fx: (s, ok) => { s.habits.pull = clamp(s.habits.pull + (ok ? -.3 : .5), 0, 3); } },
    { id: 'teen', ks: ['sit', 'recall', 'leash'], to: 70, by: 24, from: 12, name: '사춘기 복습', why: '7~16개월 사춘기에는 배운 것도 흐려진다. 두 살까지 붙잡아 두면 오래 간다.',
      ok: '사춘기를 넘겼다. 배운 것이 다시 또렷해졌다.', no: '사춘기 동안 배운 것이 많이 흐려졌다. 다시 쌓으려면 시간이 든다.',
      fx: (s, ok) => { s.st.manners = clamp(s.st.manners + (ok ? 5 : -4), 0, 100); s.st.calm = clamp(s.st.calm + (ok ? 2 : 0), 0, 100); } },
    // 다 큰 뒤에 데려온 아이: 새 집 적응
    { id: 'settle', ks: ['handle', 'alone'], to: 50, rel: 3, adult: 1, name: '새 집 적응', why: '데려오고 석 달은 새 집을 믿게 되는 시간이다.',
      ok: '이제 이 집이 자기 집이 됐다. 아무 데서나 배를 보이고 잔다.', no: '아직 새 집이 낯설다. 작은 소리에도 깬다.',
      fx: (s, ok) => { s.st.calm = clamp(s.st.calm + (ok ? 4 : -4), 0, 100); s.st.bond = clamp(s.st.bond + (ok ? 3 : 0), 0, 100); } },
    { id: 'settle2', ks: ['recall'], to: 75, rel: 6, adult: 1, name: '이름 듣고 오기', why: '새 이름을 좋은 일과 짝지어 주면 빨리 익힌다.',
      ok: '새 이름을 부르면 고개부터 돌린다.', no: '새 이름에 아직 반응이 늦다.',
      fx: (s, ok) => { s.st.bond = clamp(s.st.bond + (ok ? 3 : -1), 0, 100); } },
  ];
  const mBy = (s, m) => (m.rel ? s.dog.adoptM + m.rel : m.by);
  const mFrom = (s, m) => Math.max(s.dog.adoptM, m.adult ? 0 : (m.from || 0), ...m.ks.map(k => TR().SKILLS[k].ages[0]));
  const mName = (s, m) => m.name || skName(s, m.ks[0]);
  const mProg = (s, m) => Math.min(...m.ks.map(k => (s.skills[k] ? s.skills[k].p : 0)));
  // 이 아이에게 해당하는 미션(데려온 나이에 따라 다르다)
  const missionsFor = s => MISSIONS.filter(m => (m.adult ? s.dog.adoptM >= 8 : m.by - s.dog.adoptM >= 1));
  const missionsOn = s => missionsFor(s).filter(m => (s.miss[m.id] || {}).st !== 'ok' && (s.miss[m.id] || {}).st !== 'no' && s.ageM >= mFrom(s, m)).sort((a, b) => mBy(s, a) - mBy(s, b));
  function mDue(s, m) { const by = mBy(s, m); return by < 6 ? `생후 ${weeksOf(by)}주까지` : by < 12 ? `생후 ${Math.round(by)}개월까지` : `${ageText(by).replace('생후 ', '')}까지`; }
  function mLeft(s, m) { const d = mBy(s, m) - s.ageM; return d < 1.5 ? `${Math.max(1, Math.round(d * 4.345))}주 남음` : `${Math.round(d)}달 남음`; }
  // 매 칸, 그리고 교육 직후에 확인한다. 완수하거나 기한을 넘기면 결과를 남긴다
  function missionsUpdate(s, quiet) {
    const out = [];
    for (const m of missionsFor(s)) {
      const st = s.miss[m.id] || (s.miss[m.id] = { st: 'on' }); if (st.st !== 'on' || s.ageM < mFrom(s, m) - .01) continue;
      const p = mProg(s, m), ok = p >= m.to; if (!ok && s.ageM <= mBy(s, m)) continue;
      st.st = ok ? 'ok' : 'no'; st.at = s.ageM; const b4 = snap(s);
      m.fx(s, ok); if (ok) { s.st.bond = clamp(s.st.bond + 2, 0, 100); s.ms['mis_' + m.id] = { t: `${ageAround(s.ageM)} 미션 「${mName(s, m)} ${m.to}%」를 기한 안에 해냈다.`, age: s.ageM }; }
      const r = { m, ok, fx: diffSnap(s, b4) }; out.push(r); if (!quiet) s.missQ.push(r);
      addLog(s, ok ? `미션 완수: ${mName(s, m)} ${m.to}%. ${m.ok}` : `미션 놓침: ${mName(s, m)} ${m.to}%. ${m.no}`, ok ? 'good' : 'bad');
    }
    return out;
  }

  /* ---------- 산책(직접 나가기) ---------- */
  function walkOptions(s) {
    const T = traits(s.dog), summer = seasonOf(s.cal.m) === 1, sen = stage(s) === 'senior';
    if (s.ageM < 3.5) return [
      { id: 'arms', t: '안고 동네를 한 바퀴 돈다. 땅에는 내려놓지 않는다' },
      { id: 'grass', t: '집 앞 잔디에 잠깐 내려놓고 냄새를 맡게 한다' },
      { id: 'stay', t: '예방접종이 끝날 때까지는 나가지 않는다' },
    ];
    const o = [
      { id: 'block', t: '동네 한 바퀴, 15분' },
      { id: 'sniff', t: '냄새 맡고 싶은 데서 실컷 맡게 하며 천천히 40분' },
      { id: 'run', t: sen ? '공원 벤치까지 천천히 가서 바람을 쐰다' : '애견 운동장에 가서 줄 풀고 마음껏 뛰게 한다' },
    ];
    if (summer) o.push({ id: 'noon', t: '해가 쨍한 한낮이지만, 지금 시간 날 때 다녀온다' });
    return o;
  }
  function walkOnce(s, id) {
    const T = traits(s.dog), st = s.st, fear = s.dog.fear, b4 = snap(s), n = s.dog.name, sen = stage(s) === 'senior';
    s.walkTick = s.ticks; s.cnt.walks += 1; s.lastAct.walk = s.ageM; if (s.nudge && s.nudge.kind === 'walk') s.nudge = null;
    const W = pool => uniq(s, pool, 'w:') || walkGen(s);
    const add = (k, v) => { st[k] = clamp(st[k] + v, 0, 100); };
    let line = '';
    if (id === 'arms') { add('social', 3); s.dog.fear = clamp(fear - .015, 0, 1); add('bond', 1); skillOf(s, 'social').p = clamp(skillOf(s, 'social').p + 3, 0, 100); line = W([`품 안에서 ${j(n, '은')} 고개를 이리저리 돌렸다. 자전거 소리에 귀가 섰다가 내려갔다.`, '지나가던 아이가 손을 흔들었다. 코를 벌름거렸다.', '버스가 지나가자 품으로 얼굴을 묻었다가 다시 내다봤다.', '편의점 문이 열릴 때마다 귀가 움직였다.', '처음 보는 할머니가 이름을 물어봤다. 꼬리가 품 안에서 흔들렸다.']); }
    if (id === 'grass') {
      add('social', 4); add('joy', 4); s.dog.fear = clamp(fear - .02, 0, 1); skillOf(s, 'social').p = clamp(skillOf(s, 'social').p + 4, 0, 100);
      line = W(['잔디 냄새를 맡느라 코가 바빴다.', '잔디에 내려놓자 한 발짝도 못 떼고 냄새만 맡았다.', '풀잎을 앞발로 툭툭 건드렸다.']);
      if (rand() < .05) { s.later.push({ at: s.ageM + .25, text: `${j(n, '이')} 설사를 하고 밥을 거부했다. 병원에서 장염이라며 수액을 맞혔다. 다행히 사흘 만에 나았다.`, fn: G => { G.add('health', -10); }, key: 'walk' }); }
    }
    if (id === 'stay') { add('social', -1); line = W(['창밖을 지나가는 산책하는 개를 한참 내다봤다.', '현관 쪽에서 나는 발소리에 귀를 세웠다.', '창가에 턱을 괴고 바깥 소리를 들었다.']); }
    if (id === 'block') { add('joy', 3); add('social', 1.5); add('bond', 1); st.weight = clamp(st.weight - .3, 18, 96); line = W(['늘 가던 전봇대에서 한참 냄새를 맡았다.', '돌아오는 길엔 앞장서서 집 쪽으로 걸었다.']); }
    if (id === 'sniff') { add('calm', 4); add('joy', 3); add('bond', 1.5); line = W([`${j(n, '은')} 화단 하나에 오 분을 썼다. 돌아와서 깊이 잤다.`, '천천히 걷고 많이 맡았다. 집에 와서 물을 한참 마셨다.']); }
    if (id === 'run') {
      if (sen) { add('calm', 3); add('bond', 2); line = W(['벤치 옆에 엎드려 지나가는 사람들을 구경했다.', '벤치 밑 그늘에 누워 바람 냄새를 맡았다.', '지나가던 아이가 쓰다듬자 눈을 가늘게 떴다.']); }
      else {
        add('joy', 6); st.weight = clamp(st.weight - .6, 18, 96); add('social', 2);
        if (fear > .55 || s.habits.reactive >= 1) { add('calm', -5); s.dog.fear = clamp(fear + .02, 0, 1); line = '큰 개 둘이 달려오자 꼬리를 말고 보호자 다리 뒤로 숨었다. 금방 나왔다.'; }
        else if (skillP(s, 'recall') < .3 && rand() < .25) { add('calm', -2); line = '줄을 풀자 운동장 끝까지 달려가서 불러도 안 왔다. 십오 분 만에 잡았다.'; }
        else line = W(['운동장을 세 바퀴 돌고 혀를 길게 빼물었다.', '처음 보는 개와 엉덩이 냄새를 맡고 같이 뛰었다.', '물그릇 앞에서 다른 개와 순서를 기다렸다.', '공을 쫓다 흙투성이가 됐다. 목욕은 싫어했다.']);
      }
    }
    if (id === 'noon') {
      add('joy', 2);
      if (T.heat > .5 || s.dog.breed.size === 'L' || sen) { add('health', -6); line = `십 분 만에 ${j(n, '이')} 혀를 길게 빼고 그늘에 주저앉았다. 안고 돌아왔다.`; }
      else { add('health', -1); line = '아스팔트가 뜨거워 발을 자꾸 들었다. 그늘로만 다녔다.'; }
    }
    return { line, d: diffSnap(s, b4) };
  }
  // 산책 문장이 다 떨어지면 장소·장면·끝을 엮어 새로 만든다
  const WG = {
    place: ['늘 가던 전봇대', '공원 입구 화단', '편의점 앞 가로수', '놀이터 모래밭', '아파트 뒤 산책로', '개천 옆 풀숲', '빵집 앞 모퉁이', '버스 정류장 옆 화단', '학교 담장 밑', '새로 생긴 카페 앞'],
    act: ['에서 한참 냄새를 맡았다.', ' 앞에서 발을 멈추고 귀를 세웠다.', '에서 처음 보는 개와 코를 맞댔다.', '까지 앞장서서 걸었다.', '에서 떨어진 낙엽을 하나 물고 왔다.'],
    end: ['돌아와서 물을 한참 마셨다.', '집에 와서 바로 곯아떨어졌다.', '발을 닦는 동안 얌전히 서 있었다.', '돌아오는 길엔 걸음이 느려졌다.', '현관에서 한 번 더 뒤를 돌아봤다.'],
  };
  function walkGen(s) {
    const all = []; WG.place.forEach(p => WG.act.forEach(a => WG.end.forEach(e => all.push(p + a + ' ' + e))));
    return uniq(s, all, 'w:') || '';
  }

  /* ---------- 진행 ---------- */
  let timer = null, speed = 1, paused = false, sheetOpen = false;
  // 1배속 한 칸: 퍼피(1주) 28초, 청소년(1달) 24초, 성견(석 달) 20초, 마지막 몇 달(1달씩) 12초.
  // 기본 2배속으로 끝까지 가면 기다림 15~16분 + 사건 창 읽는 시간 = 20~30분(1배속이면 30~40분). 창이 뜨면 시간이 멈춘다.
  const tickMs = s => (s.ageM < 6 ? 28000 : s.ageM < 24 ? 24000 : s.slow ? 12000 : 20000) / (speed || 1);
  function tickBar(ms) {
    const el = $('#tickBar'); if (!el) return;
    if (!ms) { el.style.animationPlayState = 'paused'; return; }
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = `tickfill ${ms}ms linear forwards`;
  }

  /* ---------- 선택의 영향 기록 ---------- */
  const SNAPK = ['health', 'bond', 'calm', 'manners', 'social', 'joy', 'weight'];
  function snap(s) { return { st: { ...s.st }, fear: s.dog.fear, life: s.lifeMod, hab: { ...s.habits }, alone: s.aloneMod }; }
  function diffSnap(s, a) {
    const d = {};
    SNAPK.forEach(k => { const v = s.st[k] - a.st[k]; if (Math.abs(v) >= .5) d[k] = v; });
    const f = s.dog.fear - a.fear; if (Math.abs(f) >= .01) d.fear = f;
    const l = s.lifeMod - a.life; if (Math.abs(l) >= .01) d.life = l;
    for (const h in s.habits) { const v = s.habits[h] - a.hab[h]; if (Math.abs(v) >= .1) (d.hab = d.hab || {})[h] = v; }
    const al = s.aloneMod - a.alone; if (Math.abs(al) >= .1) d.alone = al;
    return d;
  }
  function mergeFx(a, b) {
    for (const k in b) {
      if (k === 'hab') { a.hab = a.hab || {}; for (const h in b.hab) a.hab[h] = (a.hab[h] || 0) + b.hab[h]; }
      else a[k] = (a[k] || 0) + b[k];
    }
    return a;
  }
  const STATL = { health: '건강', bond: '유대', calm: '안정감', manners: '예절', social: '사회성', joy: '기분' };
  // 게임 중 보여 주는 변화 칩. 수명은 끝의 돌아보기에서만.
  function fxChips(d, withLife) {
    const out = [];
    // 화살표 대신 말로: 초록·빨강 색과 뜻이 어긋나 보이던 것(겁 ▲가 빨강, 실수 ▼가 초록)을 없앤다
    const word = v => (v > 0 ? '늘어남' : '줄어듦');
    for (const k of Object.keys(STATL)) if (d[k]) { const v = Math.round(d[k]); if (!v) continue; out.push({ t: `${STATL[k]} ${v > 0 ? '+' : ''}${v}`, good: v > 0 }); }
    if (d.weight && Math.abs(d.weight) >= 1) out.push({ t: `체중 ${word(d.weight)}`, mid: true });
    if (d.fear && Math.abs(d.fear) >= .015) out.push({ t: `겁 ${word(d.fear)}`, good: d.fear < 0 });
    if (d.alone && Math.abs(d.alone) >= .5) out.push({ t: `혼자 있는 시간 ${word(d.alone)}`, good: d.alone < 0 });
    if (d.hab) for (const h in d.hab) { const v = d.hab[h]; if (Math.abs(v) < .15 || !D.HABITS[h]) continue; out.push({ t: `${D.HABITS[h].name} ${word(v)}`, good: v < 0 }); }
    if (withLife && d.life && Math.abs(d.life) >= .05) { const mo = Math.round(d.life * 12); if (mo) out.push({ t: `수명 ${mo > 0 ? '+' : ''}${mo}개월`, good: mo > 0 }); }
    return out;
  }
  function chipsHTML(list) { return list.map(c => `<span class="chip ${c.mid ? 'mid' : c.good === true ? 'up' : 'down'}">${c.t}</span>`).join(''); }

  /* ---------- 11차: 한 줄 알림 · 떠오르는 숫자 · 한눈 판정 ---------- */
  // 한 줄 알림(무대 맨 위 알약). 여러 개면 차례로, 한 번에 세 개까지만 쌓는다
  const noticeQ = [];
  function notice(text, tone = 'info', ms = 2600) {
    noticeQ.push({ text, tone, ms }); if (noticeQ.length > 3) noticeQ.splice(0, noticeQ.length - 3);
    if (!notice.on) notice.next();
  }
  notice.next = () => {
    const el = $('#notice'), n = noticeQ.shift();
    if (!el || !n) { notice.on = false; if (el) el.hidden = true; return; }
    notice.on = true; el.textContent = n.text; el.dataset.tone = n.tone; el.hidden = false; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
    clearTimeout(notice.t); notice.t = setTimeout(notice.next, n.ms);
  };
  // 아이 머리 위로 숫자가 떠오른다(쓰다듬기·공놀이처럼 결과 카드가 없는 활동)
  function popFx(d) {
    const box = $('#popfx'); if (!box) return;
    fxChips(d).filter(c => !c.mid).slice(0, 3).forEach((c, i) => setTimeout(() => {
      const e = document.createElement('span'); e.className = 'pf ' + (c.good === true ? 'up' : 'down'); e.textContent = c.t; box.appendChild(e); setTimeout(() => e.remove(), 1800);
    }, i * 140));
  }
  // 막대·버튼을 잠깐 깜빡여 "여기가 바뀌었다"를 가리킨다
  function pulse(q, ms = 2800) { const t = $(q); if (!t) return; t.classList.add('pulse-on'); setTimeout(() => t.classList.remove('pulse-on'), ms); }
  // 잘못된 방법 뒤에 한 줄로 이유를 말한다(결과가 나쁠 때만)
  const WHYK = { aversive: '혼내면 당장은 멈춰도 겁이 늘 수 있어요.', flood: '한꺼번에 겪게 하면 겁이 커질 수 있어요.', late: '시간이 지난 뒤 칭찬하면 이유를 몰라요.', ignore: '그냥 두면 잘 늘지 않아요.' };
  const VERD = {
    '건강': { good: '금방 나았어요', bad: '아팠어요', mixed: '고생했지만 나아지고 있어요', flat: '큰 탈은 없었어요' },
    '산책': { good: '즐거운 산책이었어요', bad: '산책이 힘들었어요', mixed: '좋은 일도 힘든 일도 있었어요', flat: '평범한 산책이었어요' },
    def: { good: '좋은 쪽으로 바뀌었어요', bad: '안 좋은 쪽으로 바뀌었어요', mixed: '좋은 점과 나쁜 점이 같이 왔어요', flat: '크게 달라진 건 없어요' },
  };
  function verdictOf(chips, kk) {
    const up = chips.filter(c => !c.mid && c.good === true).length, down = chips.filter(c => !c.mid && c.good !== true).length;
    const tone = up && !down ? 'good' : down && !up ? 'bad' : up && down ? 'mixed' : 'flat';
    return { tone, text: (VERD[kk.split(' ')[0]] || VERD.def)[tone] };
  }
  // 결과 카드: 교육·산책·사건은 한눈에(한 줄 판정 · 막대 · 칩), 이야기는 첫 문장만. 나머지는 「이야기 더 보기」
  function showResult(o) {
    const el = $('#result'); if (!el) return;
    clearTimeout(showResult.t);
    $('.rs-kind', el).textContent = o.kind || '';
    const kk = o.kind || ''; el.dataset.k = o.echo ? 'echo' : kk.startsWith('미션 완수') ? 'win' : kk.startsWith('미션') ? 'miss' : kk.startsWith('교육') ? 'train' : kk.startsWith('산책') ? 'walk' : kk.startsWith('생활') ? 'routine' : kk === '아쉬움' ? 'regret' : kk === '준비물' ? 'gear' : kk === '건강' || kk === '마지막' ? 'health' : 'event';
    const wbx = $('#wantBubble'); if (wbx) wbx.hidden = true;
    const chips = [...(o.extra || []), ...fxChips(o.fx || {})]; const fxEl = $('.rs-fx', el); fxEl.innerHTML = chipsHTML(chips); fxEl.hidden = !chips.length;
    el.classList.toggle('echo', !!o.echo);
    const compact = !o.echo && (!!o.meter || (chips.length > 0 && /^(교육|산책|그해|좋은 일|건강)/.test(kk)));
    el.classList.toggle('compact', compact); el.classList.remove('open');
    $('.rs-pick', el).textContent = o.pick || ''; $('.rs-pick', el).hidden = !o.pick;
    const tx = o.text || '', m = tx.match(/^(.+?[.!?」"])(\s+[\s\S]+)?$/);
    { const te = $('.rs-text', el); te.textContent = ''; if (m && m[2]) { const b = document.createElement('b'); b.className = 'rs-lead'; b.textContent = m[1]; const r = document.createElement('span'); r.className = 'rs-rest'; r.textContent = m[2]; te.append(b, r); } else te.textContent = tx; te.hidden = !tx; }
    // 한눈 요약: 한 줄 판정 · 막대 · 이유 · 첫 안내
    const vd = $('.rs-verdict', el), mt = $('.rs-meter', el), why = $('.rs-why', el), tip = $('.rs-tip', el), more = $('.rs-more', el);
    [vd, mt, why, tip, more].forEach(x => { x.hidden = true; });
    el.classList.toggle('nostory', compact && !!o.meter); // 교육 결과는 이야기를 접어 두고, 산책·사건은 첫 문장을 보인다
    if (compact) {
      const V = o.verdict || verdictOf(chips, kk);
      vd.textContent = V.text; vd.dataset.tone = V.tone; vd.hidden = false;
      if (o.meter) {
        const a = Math.round(o.meter.from), b = Math.round(o.meter.to), lo = Math.min(a, b), up = b >= a;
        mt.textContent = '';
        const l = document.createElement('span'); l.className = 'm-l'; l.textContent = o.meter.label;
        const v = document.createElement('span'); v.className = 'm-v'; v.textContent = b + '%';
        const em = document.createElement('em'); em.className = up ? 'up' : 'down'; em.textContent = o.meter.d != null ? o.meter.d : (up ? '+' : '') + (b - a); v.append(em);
        const bar = document.createElement('span'); bar.className = 'm-bar';
        const u1 = document.createElement('u'); u1.className = 'old'; u1.style.width = lo + '%';
        const u2 = document.createElement('u'); u2.className = 'new ' + (up ? 'up' : 'down'); u2.style.left = lo + '%'; u2.style.width = Math.abs(b - a) + '%';
        bar.append(u1, u2); mt.append(l, v, bar); mt.hidden = false;
      }
      if (o.why) { why.textContent = o.why; why.hidden = false; }
      if (o.tip) { tip.textContent = o.tip; tip.hidden = false; }
      more.textContent = '이야기 더 보기'; more.hidden = !(o.pick || (m && m[2]));
    }
    if (!o.text && !chips.length && !o.meter) { if (o.done) o.done(); return; }
    // 교육·미션 결과는 「확인」을 눌러야 닫힌다. 나머지는 글 길이만큼(한눈 결과 4.5~9초, 그 밖 5~11초) 머물고, 누르면 바로 닫힌다
    const hold = !!o.hold || /^(교육|미션)/.test(kk);
    const shown = compact ? (m ? m[1].length : tx.length) : tx.length + (o.pick || '').length * .4;
    const len = shown + chips.reduce((a, c) => a + c.t.length, 0) * .6 + (o.why || '').length * .5;
    const ms = clamp(2600 + len * 70, compact ? 4500 : 5000, compact ? 9000 : 11000);
    el.classList.toggle('hold', hold); $('.rs-x', el).textContent = hold ? (o.skip && o.more ? '다른 교육 하기' : '확인') : '닫기';
    { const sk = $('.rs-skip', el); if (sk) { sk.hidden = !o.skip; if (o.skip) sk.textContent = o.skip; } el.classList.toggle('has-skip', !!o.skip); el.classList.toggle('skip-main', !!o.skip && !!o.skipMain); }
    el.hidden = false; el._done = o.done || null; renderCoach();
    fx.anim({ targets: el, opacity: [0, 1], translateY: [14, 0], duration: 420, easing: 'easeOutExpo' });
    const bar = $('.rs-bar', el); if (bar) { bar.hidden = hold; bar.style.animation = 'none'; void bar.offsetWidth; bar.style.animation = hold ? 'none' : `rsbar ${ms}ms linear forwards`; }
    if (!hold) showResult.t = setTimeout(hideResult, ms);
  }
  function hideResult() {
    const el = $('#result'); if (!el || el.hidden) return;
    clearTimeout(showResult.t); el.hidden = true;
    const f = el._done; el._done = null; if (f) f();
    renderWant(); renderCoach();
  }
  // 막대 옆에 +3 / -2가 잠깐 떴다 사라진다
  function flashStats(d) {
    for (const k of Object.keys(STATL)) {
      const v = Math.round(d[k] || 0); if (!v) continue;
      const row = $(`#stats [data-k="${k}"]`); if (!row) continue;
      const tag = document.createElement('em'); tag.className = 'dl ' + (v > 0 ? 'up' : 'down'); tag.textContent = (v > 0 ? '+' : '') + v;
      $('.stat-l', row).appendChild(tag); setTimeout(() => tag.remove(), 2400);
    }
  }

  /* ---------- 조르기: 사건 사이 빈 시간에 개가 먼저 청한다 ---------- */
  const WANT = {
    ball: { btn: '#ballBtn', ask: ['공을 물고 와서 발 앞에 툭 놓았다.', '공을 굴려 놓고 엎드려서 기다린다.', '장난감을 물고 거실을 한 바퀴 돌았다. 이쪽을 본다.', '삑삑이 인형을 일부러 크게 씹는다.', '앞발을 쭉 펴고 엉덩이를 든 채 이쪽을 본다.', '공을 소파 밑에 넣어 놓고 낑낑거린다.', '터그 줄을 물고 와서 손에 비빈다.', '공을 굴리고 쫓아가다 이쪽을 돌아봤다.'] },
    pet: { btn: '#lifeScene .dog-wrap', ask: ['옆에 와서 손등을 코로 툭 쳤다.', '무릎에 턱을 올려놓고 눈만 굴린다.', '소파 옆에 와서 가만히 기대 섰다.', '발등 위에 엉덩이를 깔고 앉았다.', '앞발로 팔을 살짝 긁었다.', '등을 보이고 누워 이쪽을 힐끔 본다.', '책상 밑으로 와서 발에 머리를 기댔다.', '휴대폰 든 손 밑으로 머리를 밀어 넣었다.'] },
    treat: { btn: '#trainBtn', ask: ['간식 서랍 앞에 앉아서 이쪽을 본다.', '부엌에서 소리가 나자 먼저 가서 앉아 있다.', '빈 밥그릇을 코로 밀어 소리를 냈다.', '시키지도 않았는데 앉고, 엎드리고, 손을 내민다.', '냉장고 문 열리는 소리에 뛰어왔다.', '간식 봉지 쪽을 한 번, 보호자를 한 번 본다.'] },
  };
  function askWant(s) {
    const sen = stage(s) === 'senior';
    const begW = .18 + Math.min(.3, s.cnt.beg * .04); // 조를 때마다 줬다면 더 자주 조른다
    const opts = [{ k: 'pet', w: sen ? .6 : .38 + begW * .3 }, { k: 'ball', w: sen ? .1 : (s.st.joy < 50 ? .5 : .36) }];
    const k = wpick(opts).k; const line = uniq(s, WANT[k].ask, 'a:'); if (!line) return;
    s.want = { kind: k, tick: s.ticks, line }; s.cnt.asks++;
    renderWant();
  }
  // 한동안 안 쓴 활동은 버튼이 깜빡이고 왜 지금 필요한지 한 줄로 권한다(간식은 권하지 않는다)
  const NUDGE = {
    train: { btn: '#trainBtn', gap: s => s.ageM < 6 ? .7 : s.ageM < 24 ? 2 : stage(s) === 'senior' ? 8 : 6,
      line: (s, m) => s.ageM < 6 ? [`교육을 ${Math.max(1, Math.round(m * 4.3))}주째 쉬었다. 생후 ${weeksOf(s.ageM)}주, 배변과 세상 구경을 가장 잘 배우는 때다.`, `요즘 ${j(s.dog.name, '이')} 배운 게 없다. 지금은 하루 몇 분 연습이 나중의 몇 달을 아낀다.`]
        : s.ageM < 24 ? [`교육을 ${Math.round(m)}달째 쉬었다. 사춘기에는 배운 것도 금방 흐려진다.`, `${Math.round(m)}달 동안 같이 연습한 게 없다. 줄 걷기나 부르면 오기를 다시 짚어 볼 때다.`]
          : stage(s) === 'senior' ? [`요즘 같이 연습한 적이 없다. 아는 것을 되짚기만 해도 머리를 쓴다.`] : [`배운 것이 조금 흐려졌다. 짧게 다시 짚어 주면 금방 돌아온다.`, `${Math.round(m)}달째 같이 연습한 게 없다. 남은 버릇을 잡을 때다.`] },
    walk: { btn: '#walkBtn', gap: s => s.ageM < 6 ? .9 : 3,
      line: (s, m) => s.ageM < 3.5 ? [`아직 바깥 구경을 못 시켜 줬다. 접종 전이라도 안고 나가 볼 수 있다.`] : s.ageM < 6 ? [`${Math.max(1, Math.round(m * 4.3))}주째 같이 나간 적이 없다. 지금은 여러 소리와 사람을 만나 볼 때다.`]
        : [`${Math.round(m)}달째 산책길을 골라 준 적이 없다. 오늘은 어디로 가 볼까.`, `목줄이 현관에 ${Math.round(m)}달째 그대로 걸려 있다.`] },
    pet: { btn: '#lifeScene .dog-wrap', gap: () => 2.5, line: (s, m) => [`${j(s.dog.name, '을')} 쓰다듬어 준 게 언제였더라. ${Math.round(m)}달은 된 것 같다.`, `${Math.round(m)}달 동안 ${j(s.dog.name, '이')} 먼저 다가올 때만 만져 줬다.`] },
    ball: { btn: '#ballBtn', gap: s => stage(s) === 'senior' ? 8 : 3.5, line: (s, m) => [`공이 소파 밑에서 ${Math.round(m)}달째 먼지를 쓰고 있다.`, `${Math.round(m)}달째 같이 논 적이 없다. 장난감 바구니가 그대로다.`] },
  };
  function askNudge(s) {
    if (s.want || s.nudge || s.finalAsked) return false;
    s.nudgeAt = s.nudgeAt || {};
    for (const k of ['train', 'walk', 'pet', 'ball']) {
      const N = NUDGE[k], since = s.ageM - Math.max(s.lastAct[k], s.nudgeAt[k] || -99), m = s.ageM - s.lastAct[k];
      if (since < N.gap(s)) continue;
      if (k === 'train' && !trainNeed(s)) continue;
      const line = uniq(s, N.line(s, m), 'n:'); s.nudgeAt[k] = s.ageM; if (!line) continue;
      s.nudge = { kind: k, line, tick: s.ticks }; renderWant(); return true;
    }
    return false;
  }
  function renderWant() {
    const s = S; $$('.pet-actions .act, #lifeScene .dog-wrap').forEach(b => b.classList.remove('want', 'nudge'));
    const wb = $('#wantBubble'); if (!wb) return;
    if (!s || s.dead || (!s.want && !s.nudge)) { wb.hidden = true; return; }
    if (s.want) { const W = WANT[s.want.kind]; if (W) $(W.btn).classList.add('want'); wb.textContent = s.want.line; wb.classList.remove('nudge'); wb.dataset.label = s.want.kind === 'pet' ? '조르기 · 아이를 눌러 주세요' : '조르기'; }
    else { $(NUDGE[s.nudge.kind].btn).classList.add('nudge'); wb.textContent = s.nudge.line; wb.classList.add('nudge'); wb.dataset.label = '권유'; }
    const resEl = $('#result'); wb.hidden = !$('#bubble').hidden || (resEl && !resEl.hidden) || sheetOpen;
  }
  // 돌봄 실수(다마고치의 care mistake 구조): 조르기 놓침, 아픈 걸 지켜보기만, 오래 아프거나 우울하게 둠
  function careMiss(s, n = 1) { s.care = (s.care || 0) + n; s.lifeMod -= .06 * n; }
  function missWant(s) {
    careMiss(s);
    const k = s.want.kind; s.want = null; renderWant();
    s.st.joy = clamp(s.st.joy - 2, 0, 100); s.st.bond = clamp(s.st.bond - .6, 0, 100);
    notice('기다리다 지쳐 돌아갔어요 · 기분 -2', 'bad');
    if (rand() < .5) addLog(s, k === 'ball' ? `${j(s.dog.name, '은')} 공 옆에서 한참 기다리다 방석으로 돌아갔다.` : k === 'pet' ? `${j(s.dog.name, '은')} 옆에 서 있다가 조용히 자리를 떴다.` : `${j(s.dog.name, '은')} 서랍 앞에 조금 더 앉아 있었다.`, 'mind');
  }
  function schedule() {
    clearTimeout(timer);
    if (!S || S.dead || paused || sheetOpen || document.hidden || window.__manual) { tickBar(0); return; }
    if (S.coach === 0) { tickBar(0); return; } // 첫 교육을 할 때까지 시간이 멈춰 있다
    const ms = tickMs(S); timer = setTimeout(tick, ms); tickBar(ms);
  }

  // 넘기기: 기다리지 않고 바로 다음 칸으로. 연달아 누르면 그만큼 넘어간다
  function skipAhead() {
    const s = S; if (!s || s.dead || window.__manual) return;
    hideResult(); if (sheetOpen) return; clearTimeout(timer); tick();
    fx.anim({ targets: '#lifeAge', scale: [1.25, 1], duration: 450, easing: 'easeOutBack' });
  }
  // 한 칸이 지나고 나빠진 것·좋아진 것을 한 줄로 알린다(문턱을 넘을 때만, 나쁜 소식을 먼저)
  function tickAlerts(s, prev, prevHab) {
    const out = [], x = (k, th, up) => (up ? prev[k] < th && s.st[k] >= th : prev[k] >= th && s.st[k] < th);
    if (x('health', 40)) out.push(['건강이 나빠졌어요', 'bad']);
    if (x('joy', 35)) out.push(['기분이 가라앉았어요. 놀아 주세요', 'bad']);
    if (x('calm', 30)) out.push(['불안해하고 있어요', 'bad']);
    if (x('weight', 60, true)) out.push(['살이 쪘어요. 간식을 줄여 보세요', 'bad']);
    for (const h in s.habits) if (D.HABITS[h] && (prevHab[h] || 0) < .5 && s.habits[h] >= .5) out.push([`${j(D.HABITS[h].name, '이')} 생겼어요`, 'bad']);
    for (const t of [50, 70, 90]) if (x('bond', t, true)) out.push([`유대 ${t}! 한결 가까워졌어요`, 'win']);
    out.slice(0, 2).forEach(([t, tone]) => notice(t, tone));
  }
  function tick() {
    const s = S; if (!s || s.dead) return;
    if (s.pendingDie) { s.cause = 'accident'; s.accName = s.pendingDie; s.pendingDie = null; return die(s); }
    const dt = dtOf(s);
    const prevSt = { ...s.st }, prevHab = { ...s.habits };
    applyRoutine(s, dt); updateHabits(s, dt); applySkills(s, dt); updateHealth(s, dt);
    missionsUpdate(s); regretCheck(s);
    if (!s.gearAt) s.gearAt = {};
    [['m6', s.ageM >= 6], ['y1', s.ageM - s.dog.adoptM >= 12], ['sen', stage(s) === 'senior']].forEach(([k, on]) => { if (on && !s.gearAt[k] && !s.finalAsked) { s.gearAt[k] = 1; s.gearQ.push(1); } });
    for (const k in STATL) s.trend[k] = (s.st[k] - prevSt[k]) / dt;
    for (const d of s.subs) {
      if (!d.alive) continue; d.ageM += dt;
      if (d.ageM / 12 > d.life) {
        d.alive = false; s.st.calm = clamp(s.st.calm - 6, 0, 100);
        addLog(s, `${j(d.name, '이')} 먼저 떠났다. ${j(s.dog.name, '은')} 한동안 ${d.name}의 방석에서 잤다.`, 'bad');
        s.ms['subdie_' + d.name] = { t: `${ageAround(s.ageM)} ${j(d.name, '이')} 먼저 떠났다.`, age: s.ageM };
      }
    }
    let accident = false;
    for (const k of ['roadHoliday', 'roadLeash', 'roadLeash2']) if (s.risks[k]) { s.risks[k] = 0; if (rand() < .03) accident = true; }
    if (s.flags.offleash && rand() < .0012 * dt * (1.3 - skillP(s, 'recall'))) accident = true;

    const y = ageY(s), L = effLife(s);
    let ev = null;
    if (!accident) ev = endArc(s, y, L);

    const before = s.ageM - s.dog.adoptM;
    s.ageM += dt; s.cal.m += dt; while (s.cal.m > 11) { s.cal.m -= 12; s.cal.y++; }
    s.ticks++;
    const together = s.ageM - s.dog.adoptM;
    const k = Math.floor(together / 12);
    let annivToday = false;
    if (k > s.anniv && Math.floor(before / 12) < k) { s.anniv = k; annivToday = true; }

    // 늦게 드러나는 결과
    const due = s.later.filter(l => l.at <= s.ageM); s.later = s.later.filter(l => l.at > s.ageM);
    let echoShow = null;
    due.forEach(l => {
      const G2 = makeG(s, { evId: l.key }); let t = l.text;
      const b4 = snap(s);
      if (l.fn) { const r = l.fn(G2); if (typeof r === 'string') t = r; }
      const dd = diffSnap(s, b4);
      const dec = [...s.decisions].reverse().find(x => x.id === l.key);
      if (dec) mergeFx(dec.later = dec.later || {}, dd);
      if (t) {
        const txt = fmt(t, s); addLog(s, txt, 'echo'); if (l.key && !s.echoes[l.key]) s.echoes[l.key] = txt;
        if (!echoShow) echoShow = { kind: '그때 그 선택이 남긴 것', pick: dec ? `「${dec.t}」` : '', text: txt, fx: dd, echo: true };
      }
    });
    if (s.evCool > 0) s.evCool--;
    if (s.want && s.ticks - s.want.tick >= 2) missWant(s);
    if (s.nudge && s.ticks - s.nudge.tick >= 3) { s.nudge = null; renderWant(); }

    if (!ev && !accident) {
      if (annivToday && k === 1) ev = { ...D.EVENTS.find(e => e.id === 'anniv1'), tag: '만난 날' };
      else ev = pickEvent(s);
    }
    if (accident) { s.cause = 'accident'; return die(s); }
    if (!ev && (ageY(s) >= effLife(s) || s.st.health <= 1)) {
      // 사고가 아니면 갑자기 떠나지 않는다: 아직 마지막 이야기를 못 했으면 먼저 한다
      if (!s.finalAsked) { s.st.health = Math.max(s.st.health, 8); ev = endArc(s, ageY(s), ageY(s)); }
      else return die(s);
    }

    if (stageName !== stage(s)) {
      stageName = stage(s); Snd.setStage(stageName);
      if (stageName === 'senior') addLog(s, `${j(s.dog.name, '이')} 노견이 됐다. 주둥이 끝이 하얘졌다.`, 'mid');
      if (stageName === 'adult') { addLog(s, `${j(s.dog.name, '이')} 다 컸다. 그래도 자는 얼굴은 여전히 아기 같았다.`, 'mid'); if (s.ageM >= 24) toast('다 컸어요. 교육은 이제 버릇이 남거나 배운 게 흐려질 때만 「복습하기」로 떠요.'); }
    }
    { const rsNow = rStage(s); if (s.rStage && s.rStage !== rsNow) { s.rStage = rsNow; s.rsChanged = rsNow; queueGuides(s, rsNow, true); renderRoutine(); } else if (renderRoutine.at !== rsNow) renderRoutine(); }
    if (annivToday && k > 1) { const a = uniq(s, D.ANNIV, 'v:'); if (a) addLog(s, fmt(a, s, { k }), 'love'); }
    if (s.coach >= 1 && s.coach < 3 && s.ticks - (s.coachAt || 0) >= 2) coachStep(s, s.coach + 1);
    tickAlerts(s, prevSt, prevHab);
    if (s.st.health < 40 || s.st.joy < 30) careMiss(s);
    renderLife();
    if (ev) openEvent(ev);
    else {
      const back = () => { sheetOpen = false; schedule(); };
      if (echoShow) { sheetOpen = true; showResult({ ...echoShow, done: back }); }
      else if (s.missQ.length) { sheetOpen = true; showMission(s, s.missQ.shift(), back); }
      else if (s.regQ.length && !s.finalAsked) openEvent(regretEvent(s, s.regQ.shift()));
      else if (s.gearQ.length && !s.finalAsked && (() => { const n = s.gearQ.shift(); return openGear(s, n, n > 1); })()) { /* 준비물(안내보다 먼저: 처음 3개가 늦게 뜨던 것) */ }
      else if (s.guideQ.length && !s.finalAsked && openGuide(s, s.guideQ.shift())) { /* 생활 습관 안내 */ }
      else if (s.finalAsked) { if (s.want) { s.want = null; renderWant(); } }
      else if (!s.want && !s.nudge && rand() < .5 && askNudge(s)) { /* 권유 */ }
      else if (!s.want && !s.nudge && rand() < (s.evCool > 0 ? .65 : .4) * (.7 + .6 * traits(s.dog).attach)) askWant(s);
      s.quiet++;
      const talk = dt >= 1 || rand() < .35;
      if (talk && (s.quiet % 3 === 0 || rand() < .18)) { const m = mindLine(s); if (m) addLog(s, m, 'mind'); }
      else if (talk && rand() < .55) { const d = dayLine(s); if (d) addLog(s, d); }
      schedule();
    }
  }
  let stageName = 'pup';

  function chooseCause(s) {
    if (s.cause === 'accident') return s.accName || '교통사고';
    if (s.fatalCause) return s.fatalCause;
    const sz = s.dog.breed.size;
    const young = ageY(s) < s.dog.breed.life * .8;
    let opts = sz === 'S' ? [['심장병', 3], ['신장병', 2], ['노환', 4], ['암', 1.5]] : sz === 'M' ? [['노환', 4], ['암', 3], ['신장병', 1.5], ['심장병', 1]] : [['암', 5], ['노환', 3], ['신장병', 1]];
    if (young) opts = opts.filter(([c]) => c !== '노환');
    return wpick(opts.map(([c, w]) => ({ c, w }))).c;
  }

  /* ---------- 마지막은 천천히 온다 ----------
     사고가 아니면 몇 해 전부터 신호가 쌓이고(arc1~3), 수의사의 말(final) 뒤에는
     한 달씩 '남은 날들'이 이어진다. 보호자가 알아차리고 준비할 시간을 준다. */
  const ARC_AT = { arc1: 2.2, arc2: 1.4, arc3: .8 };
  function arcEvent(s, id) {
    const n = s.dog.name, dzOpen = Object.keys(s.dz).find(k => s.dz[k].state !== 'cured' && D.DISEASES[k] && D.DISEASES[k].fatal);
    if (id === 'arc1') return { id, tag: 'aging', text: uniq(s, [
      '산책길 반환점이 조금씩 집 쪽으로 당겨졌다. {n:이} 먼저 돌아서는 날이 늘었다.',
      '요즘 {n:은} 아침에 일어나는 데 시간이 걸린다. 기지개를 두 번 켜고 나서야 걸어 나온다.',
      '{n}의 주둥이에 흰 털이 부쩍 늘었다. 어릴 때 사진과 나란히 놓고 한참 봤다.'], 'x:'),
      choices: [
        { t: '산책은 짧게, 대신 자주 나간다', fx: G => { G.add('calm', 2); G.add('bond', 2); return '짧게 두 번 나갔다. 돌아오는 길에 {n:이} 걸음을 맞춰 걸었다.'; } },
        { t: '그날부터 사진을 따로 모은다', fx: G => { G.flag('album', 1); G.add('bond', 2); G.ms('album', '노견이 되고부터 사진을 따로 모았다.'); return '앨범 이름을 {n:으로} 지었다. 첫 사진은 졸린 얼굴이었다.'; } },
        { t: '노견 검진을 받아 본다', fx: G => { G.routineSet('check', 2); G.add('health', 2); return '피를 뽑을 때 {n:은} 보호자 팔에 얼굴을 묻었다. 결과는 나이만큼이라고 했다.'; } },
      ] };
    if (id === 'arc2') return { id, tag: 'aging', text: dzOpen
      ? `검진 날, 수의사가 ${D.DISEASES[dzOpen].name} 수치를 한참 들여다봤다. "이제부터는 낫게 하기보다, 나빠지는 걸 늦추는 쪽이에요."`
      : '수의사가 청진기를 내려놓고 말했다. "나이에 비해 잘 지내요. 다만 이제부터는 하루하루가 조금씩 달라질 거예요."',
      choices: [
        { t: '함께 하고 싶은 일을 종이에 적는다', fx: G => { G.flag('bucket', 1); G.add('bond', 3); G.ms('bucket', '남은 시간에 함께 할 일을 종이에 적어 냉장고에 붙였다.'); return s.ms.trip ? '첫 줄에 "바다 한 번 더"라고 적었다.' : '첫 줄에 "좋아하는 길 한 번 더 걷기"라고 적었다.'; } },
        { t: '지금처럼, 평범하게 지낸다', fx: G => { G.add('calm', 3); return '평소처럼 밥을 주고 평소처럼 산책했다. 평소처럼 하는 게 생각보다 어려웠다.'; } },
        { t: '가족과 그날 이야기를 미리 나눈다', fx: G => { G.flag('talked', 1); return '"그날이 오면 어떻게 할까." 처음으로 소리 내어 말했다. 다들 한참 말이 없었다.'; } },
      ] };
    return { id, tag: '건강', text: uniq(s, [
      '{n:이} 밥그릇 앞에서 냄새만 맡고 돌아섰다. 좋아하던 간식만 겨우 받아먹었다.',
      '안아 올리자 {n:이} 전보다 가벼웠다. 언제 이렇게 말랐는지 몰랐다.',
      '밤에 {n:이} 자다가 몇 번씩 깨서 보호자를 찾았다.'], 'x:'),
      choices: [
        { t: '밥을 데워 손으로 조금씩 먹인다', fx: G => { G.add('bond', 3); G.add('health', 1); return '세 숟가락을 먹었다. 그걸로 그날 하루가 괜찮았다.'; } },
        { t: '밤에는 거실에서 같이 잔다', fx: G => { G.add('calm', 4); G.flag('floorSleep', 1); return '바닥에 이불을 깔았다. 손을 뻗으면 {n:이} 닿는 거리였다.'; } },
        { t: '사진과 영상을 더 많이 남긴다', fx: G => { G.add('bond', 2); G.flag('album', 1); return '휴대폰 앨범이 {n:으로} 가득 찼다. 잘 나온 건 몇 장 없었다.'; } },
      ] };
  }
  const LAST = [
    { text: '오늘은 {n:이} 오랜만에 꼬리를 흔들며 현관까지 나왔다. 몸이 좀 괜찮은 날이었다.', choices: [
      ['좋아하던 길을 천천히 걷는다', '반은 걷고 반은 안겨서 갔다. 늘 가던 전봇대 앞에서 오래 냄새를 맡았다.'],
      ['창가에서 같이 낮잠을 잔다', '눈을 떠 보니 {n:이} 이쪽을 보고 있었다. 다시 눈을 감았다.']] },
    { text: '{n:은} 이제 하루 대부분을 잔다. 숨 쉴 때마다 배가 천천히 오르내린다.', choices: [
      ['곁에 앉아 등을 쓸어 준다', '손을 떼면 귀가 움직였다. 다시 쓸어 주면 가만히 있었다.'],
      ['좋아하던 장난감을 머리맡에 둔다', '{n:은} 장난감에 코를 대고 다시 잠들었다.']] },
    { text: '좋아하던 간식을 내밀자 {n:이} 한참 냄새만 맡았다. 그리고 아주 천천히 하나를 먹었다.', choices: [
      ['하나 더 준다', '두 번째는 먹지 않고 손바닥만 핥았다.'],
      ['남은 간식 봉지를 꼭 묶어 둔다', '봉지에는 아직 반이 남아 있었다.']] },
    { text: '밤에 {n:이} 낑낑거렸다. 불을 켜자 이쪽을 보고 조용해졌다.', choices: [
      ['불을 켜 둔 채 옆에 눕는다', '그날 밤은 둘 다 늦게 잠들었다.'],
      ['이름을 작게 불러 준다', '이름을 부를 때마다 꼬리 끝이 움직였다.']] },
    { text: '가족이 다 모였다. 다들 한 번씩 {n:을} 안아 봤다.', choices: [
      ['다 같이 사진을 찍는다', '{n:은} 사진 한가운데서 졸았다. 그래도 그 사진이 제일 좋다.'],
      ['한 사람씩 하고 싶은 말을 한다', '말은 달라도 끝은 다 "고마웠어"였다.']] },
    { text: '{n:이} 물을 몇 모금 마시더니 보호자 발치까지 와서 누웠다. 요즘 걸은 거리 중 제일 길었다.', choices: [
      ['발을 빼지 않고 그대로 있는다', '발등이 따뜻했다. 한 시간쯤 그렇게 있었다.'],
      ['"잘했어" 하고 쓰다듬는다', '알아들었는지 {n:이} 눈을 한 번 천천히 깜빡였다.']] },
    { text: '비가 그친 오후, 창문을 열자 {n:이} 고개를 들고 바람 냄새를 맡았다.', choices: [
      ['안고 베란다에 나가 바람을 쐰다', '코가 쉬지 않고 움직였다. 바깥 냄새를 오래 맡았다.'],
      ['창가에 방석을 옮겨 준다', '{n:은} 그 자리에서 해가 질 때까지 있었다.']] },
  ];
  const LAST_MODE = {
    finalEuth: { text: '정한 날이 다가온다. 달력의 그 칸만 보면 숨이 막혔다.', choices: [
      ['그날 아침 걸을 길을 미리 정해 둔다', '제일 좋아하던 화단이 있는 길로 정했다.'],
      ['그날 줄 간식을 미리 사 둔다', '평소엔 비싸서 못 사 주던 간식을 샀다.']] },
    finalTreat: { text: '면회 시간. 유리문 너머로 {n:이} 고개를 들었다.', choices: [
      ['집에서 가져온 담요를 덮어 준다', '담요 냄새를 맡더니 {n:이} 숨을 길게 내쉬었다.'],
      ['수의사에게 집에 데려가도 되는지 묻는다', '"며칠은 괜찮을 거예요." 그날 저녁 {n:은} 자기 방석에서 잤다.']] },
  };
  function lastDay(s) {
    if (rand() > .85) return null;
    const pool = [];
    for (const f in LAST_MODE) if (s.flags[f] && !s.done['lastm_' + f]) pool.push(['lastm_' + f, LAST_MODE[f]]);
    LAST.forEach((e, i) => { if (!s.done['last_' + i]) pool.push(['last_' + i, e]); });
    if (!pool.length) return null;
    const [id, e] = pool[0][0].startsWith('lastm_') ? pool[0] : pool[Math.floor(rand() * pool.length)];
    return { id, tag: '마지막', text: e.text, choices: e.choices.map(([t, r]) => ({ t, fx: G => { G.add('bond', 2); G.add('calm', 1); (s.lastDays = s.lastDays || []).push(fmt(r, s)); return r; } })) };
  }
  function endArc(s, y, L) {
    if (s.finalAsked) return lastDay(s);
    if (y >= L - 1.6) s.slow = true;
    if (s.arcTick === s.ticks) return null;
    for (const id of ['arc1', 'arc2', 'arc3']) {
      if (s.done[id]) continue;
      if (y < L - ARC_AT[id]) return null;
      s.arcTick = s.ticks; const e = arcEvent(s, id); if (!e.text) { s.done[id] = 1; continue; } return e;
    }
    if (y < L - .45) return null;
    s.finalAsked = true; s.slow = true; s.minLife = Math.max(s.minLife, y + (5 + rand() * 3) / 12);
    Snd.mood('farewell');
    return { ...D.EVENTS.find(e => e.id === 'final'), tag: '마지막' };
  }

  function die(s) {
    s.dead = true; clearTimeout(timer); s.want = null; renderWant(); hideResult();
    s.causeText = chooseCause(s);
    renderLife();
    setTimeout(() => startFarewell(s), REDUCED ? 200 : 1200);
  }

  /* ---------- 사건 창 ---------- */
  // 사건과 이어지는 교육: 고른 쪽(돌아보기 채점 2·1·0)에 따라 +12 / +6 / -4
  const EVSK = { firstnight: 'crate', social: 'social', potty: 'potty', nip: 'nip', alonefirst: 'alone', recall: 'recall', jump: 'sit', pull: 'leash', sep: 'alone', reactive: 'social', stranger: 'social', handle: 'handle', harness: 'handle', steal: 'recall', bone: 'handle', crate: 'crate', groom: 'handle', outdoor: 'social', first_hide: 'social', first_explore: 'social', first_door: 'alone', first_pee: 'potty' };
  const EVSKG = { first_hide: [2, 0, 1], first_explore: [2, 0, 1], first_door: [2, 1, 0], first_pee: [2, 0, 1] };
  function evSkill(s, ev, ci) {
    const k = EVSK[ev.id]; if (!k || !TR().SKILLS[k]) return null;
    const gr = (EVSKG[ev.id] || ((D.EXPLAIN || {})[ev.id] || {}).grade || [])[ci]; if (gr == null) return null;
    const add = [-4, 6, 12][gr], sk = skillOf(s, k), p0 = sk.p; sk.p = clamp(sk.p + add, 0, 100);
    const d = Math.round(sk.p - p0); if (!d) return null;
    return { t: `${skName(s, k)} ${d > 0 ? '+' : ''}${d}%`, good: d > 0 };
  }
  function openEvent(ev) {
    const s = S; sheetOpen = true; clearTimeout(timer); hideResult(); s.lastEvT = s.ticks;
    if (s.want) { s.want = null; renderWant(); }
    const ctx = { evId: ev.id }; const G = makeG(s, ctx);
    if (ev.prep) ev.prep(G);
    if (ev.id && ev.id !== 'grace' && !ev.id.startsWith('dz_')) s.done[ev.id] = 1;
    const SHOWN = ['건강', '좋은 일', '마지막', '만난 날', '아쉬움', '갈래'];
    const sheet = $('#sheet'); sheet.dataset.ev = ev.id || ''; const tag = SHOWN.includes(ev.tag) ? ev.tag : '그해 있었던 일';
    const cat0 = SHOWN.includes(ev.tag) ? ev.cat : ev.tag;
    const tg = $('.sheet-tag', sheet); tg.textContent = tag; tg.dataset.k = tag;
    $('.sheet-when', sheet).textContent = `${ageText(s.ageM)} · ${s.cal.y}년 ${SEASONS[seasonOf(s.cal.m)]}`;
    const txt = fmt(ev.text, s, ctx);
    $('.sheet-text', sheet).textContent = txt;
    { const st = $('.sheet-text', sheet); st.classList.toggle('two', txt.includes('\n')); if (txt.includes('\n')) { const [a1, ...b1] = txt.split('\n'); st.textContent = ''; const x = document.createElement('b'); x.textContent = a1; const y = document.createElement('span'); y.className = 'st-what'; y.textContent = b1.join(' '); st.append(x, y); } }
    const box = $('.choices', sheet); box.innerHTML = ''; box.classList.remove('grid2');
    ['.sheet-result', '.sheet-next', '.sheet-note', '.sheet-mind', '.sheet-head'].forEach(q => { $(q, sheet).hidden = true; });
    ev.choices.forEach((c, ci) => {
      const b = document.createElement('button'); b.className = 'choice'; b.type = 'button'; b.textContent = fmt(c.t, s, ctx);
      b.addEventListener('click', () => {
        if (b.disabled) return;
        const before = snap(s); ctx.plans = [];
        const res = fmt(c.fx(G) || '', s, ctx); const skc = evSkill(s, ev, ci); const rc = ev.chipOf ? ev.chipOf(ci) : null;
        const d = diffSnap(s, before), pick = fmt(c.t, s, ctx);
        s.decisions.push({ id: ev.id, i: ci, t: pick, q: txt, res, age: s.ageM, fx: d, plans: ctx.plans.slice(), later: {} });
        $$('.choice', box).forEach(x => { x.disabled = true; x.classList.toggle('picked', x === b); });
        if (cat0) s.cats = (s.cats || 0) + 1, (s.catLog = s.catLog || {})[cat0] = (s.catLog[cat0] || 0) + 1;
        // 연구 해설은 게임 중엔 보여 주지 않는다(정답이 드러나지 않게). 끝의 돌아보기에서 보여 준다.
        addLog(s, `${txt} ${pick}. ${res}`.trim(), tag === '건강' ? 'health' : tag === '좋은 일' ? 'good' : tag === '만난 날' ? 'love' : 'event');
        // 고른 칸이 잠깐 표시된 뒤 창이 내려가고, 결과는 무대 위 카드로 뜬다. 카드가 닫히면 시간이 다시 흐른다.
        setTimeout(() => {
          showSheet(false); renderLife(); flashStats(d);
          const kind = tag === '좋은 일' || tag === '만난 날' || tag === '마지막' || tag === '건강' || tag === '아쉬움' || tag === '갈래' ? tag : '그해 있었던 일';
          showResult({ kind, pick: tag === '좋은 일' ? '' : pick, text: res, fx: d, extra: (skc || rc) ? [skc, rc].filter(Boolean) : undefined, why: ev.why ? fmt(ev.why, s, ctx) : '', verdict: s.pendingDie ? { tone: 'bad', text: '곁을 떠났어요' } : undefined, done: () => { sheetOpen = false; s.evCool = 2; if (s.pendingDie) return tick(); renderLife(); schedule(); } });
        }, (REDUCED || window.__manual) ? 0 : 420);
      });
      box.appendChild(b);
    });
    showSheet(true);
    Snd.sfx(tag === '좋은 일' ? 'good' : 'event');
  }
  /* ---------- 교육·산책 창 (사건 창을 같이 쓴다. 열려 있는 동안 시간은 멈춘다) ---------- */
  function openPanel(o) {
    sheetOpen = true; clearTimeout(timer); hideResult();
    const sheet = $('#sheet'); sheet.dataset.ev = o.id || '';
    const tg = $('.sheet-tag', sheet); tg.textContent = o.tag; tg.dataset.k = o.tag;
    $('.sheet-when', sheet).textContent = o.when || '';
    { const st = $('.sheet-text', sheet), tx = o.text || ''; st.textContent = ''; st.classList.toggle('two', tx.includes('\n')); if (tx.includes('\n')) { const [a1, ...b1] = tx.split('\n'); const x = document.createElement('b'); x.textContent = a1; const y = document.createElement('span'); y.className = 'st-what'; y.textContent = b1.join(' '); st.append(x, y); } else st.textContent = tx; }
    const hd = $('.sheet-head', sheet); hd.innerHTML = o.head || ''; hd.hidden = !o.head;
    ['.sheet-result', '.sheet-note', '.sheet-mind'].forEach(q => { $(q, sheet).hidden = true; });
    const box = $('.choices', sheet); box.innerHTML = ''; box.classList.toggle('grid2', !!o.grid);
    o.items.forEach(it => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'choice' + (it.cls ? ' ' + it.cls : '');
      if (it.html) b.innerHTML = it.html; else b.textContent = it.t;
      b.addEventListener('click', () => { if (!b.disabled) it.onPick(b); }); box.appendChild(b);
    });
    const nx = $('.sheet-next', sheet); nx.hidden = !!o.noClose; nx.textContent = o.closeText || '그만하기'; nx.classList.add('ghost'); nx.classList.remove('primary');
    if (sheet.hidden) showSheet(true); else { sheet.scrollTop = 0; const f = $('.choice', sheet); kbd && f && f.focus({ preventScroll: true }); }
  }
  function panelPick(b, then) {
    $$('#sheet .choice').forEach(x => { x.disabled = true; x.classList.toggle('picked', x === b); });
    setTimeout(() => { showSheet(false); renderLife(); then(); }, (REDUCED || window.__manual) ? 0 : 380);
  }
  const resume = () => { sheetOpen = false; renderLife(); schedule(); };
  function shuffled(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const k = Math.floor(rand() * (i + 1)); [a[i], a[k]] = [a[k], a[i]]; } return a; }

  function openTrain() {
    const s = S; if (!s || s.dead) return; Snd.init();
    const SK = TR().SKILLS; const n = s.dog.name;
    const need = trainNeed(s);
    if (!need) { toast(Object.keys(SK).some(k => skillOpen(s, k) && doneNow(s, k)) ? '이번 칸 교육은 끝났어요. 다음 칸에 이어서 해요.' : '지금은 따로 가르칠 것이 없다. 배운 대로 잘 지낸다.'); return; }
    const list = Object.entries(SK).filter(([k]) => trainable(s, k));
    const shown = Object.entries(SK).filter(([k]) => skillOpen(s, k) && !trainable(s, k) && (lesOf(s, k) >= LES || doneNow(s, k)) && (s.ageM < 24 || lesOf(s, k) < LES));
    const soon = s.ageM >= 24 ? [] : Object.entries(SK).filter(([k, v]) => !skillOpen(s, k) && s.ageM < v.ages[0]);
    const today = s.trainTick.tick === s.ticks ? s.trainTick.n : 0, on = missionsOn(s);
    const per = dtOf(s) < 1 ? '이번 주' : dtOf(s) === 1 ? '이번 달' : '이번 철', lim = dtOf(s) >= 1 ? 4 : 3;
    const text = today ? `${per}에 ${today}가지를 연습했다. 한 가지는 한 칸에 한 번이다.` : on.length && need === 'main' ? `${n}에게 무엇을 가르칠까? 파란 칸이 지금 걸린 미션이다.` : need === 'fix' ? `다 큰 뒤에는 새로 배울 것보다 지킬 것이 남는다. 흐려졌거나 버릇이 남은 것만 다시 짚는다.` : `${n}에게 무엇을 가르칠까? 미션부터 채우면 좋다.`;
    const tgt = {}; on.forEach(m => m.ks.forEach(k => { if (!tgt[k] || mBy(s, tgt[k]) > mBy(s, m)) tgt[k] = m; }));
    const all = missionsFor(s), okN = all.filter(m => (s.miss[m.id] || {}).st === 'ok').length, noN = all.filter(m => (s.miss[m.id] || {}).st === 'no').length;
    const head = `<p class="mh-top"><b>미션</b><span>완수 ${okN} · 놓침 ${noN} · 남은 ${all.length - okN - noN}</span></p>` + (on.length ? on.slice(0, 3).map(m => { const p = Math.round(mProg(s, m)); return `<div class="mh-row${mBy(s, m) - s.ageM < .7 ? ' urgent' : ''}"><span class="mh-t"><b>${mName(s, m)} ${m.to}%</b> ${mDue(s, m)}</span><span class="mh-p">${p}% · ${mLeft(s, m)}</span><span class="mh-bar"><u style="width:${Math.min(100, p / m.to * 100)}%"></u></span></div>`; }).join('') : '<p class="mh-none">지금 걸린 미션은 없다. 배운 것을 지키는 연습을 해 두자.</p>');
    openPanel({
      id: 'train', tag: need === 'fix' ? '복습' : '교육', when: `${s.ageM < 6 ? `생후 ${weeksOf(s.ageM)}주` : ageText(s.ageM)}`, text, head,
      items: list.map(([k, v]) => {
        const p = Math.round(skillP(s, k) * 100), m = tgt[k];
        return { cls: 'skill' + (m ? ' has-m' : ''), html: `<span class="sk-top"><b>${skName(s, k)}</b><em>${p}%</em></span><span class="sk-bar"><u style="width:${p}%"></u>${m ? `<i style="left:${m.to}%"></i>` : ''}</span>${m ? `<span class="sk-m">미션 ${m.to}% · ${mLeft(s, m)}</span>` : s.ageM >= 24 && fixWhy(s, k) ? `<span class="sk-m">${fixWhy(s, k)}</span>` : ''}`, onPick: () => openMethods(k) };
      }).concat(shown.map(([k, v]) => { const p = Math.round(skillP(s, k) * 100), fin = lesOf(s, k) >= LES; return { cls: 'skill locked done', html: `<span class="sk-top"><b>${skName(s, k)}</b><em>${p}%</em></span><span class="sk-bar"><u style="width:${p}%"></u></span><span class="sk-m">${fin ? '수업 4개 끝' : `수업 ${lesOf(s, k)}/${LES} · 이번 칸 끝`}</span>`, onPick: () => {} }; })).concat(soon.map(([k, v]) => ({ cls: 'skill locked', html: `<span class="sk-top"><b>${v.name}</b><em>잠김</em></span><span class="sk-m">${v.ages[0] < 6 ? `생후 ${weeksOf(v.ages[0])}주부터` : ageText(v.ages[0]) + '부터'}</span>`, onPick: () => {} }))), grid: true,
    });
    $$('#sheet .choice.locked').forEach(b => { b.disabled = true; });
  }
  function openMethods(k) {
    const s = S, v = TR().SKILLS[k];
    const stI = Math.min(3, lesOf(s, k)), mt = m => (stI > 0 && m.ts && m.ts[stI - 1]) || m.t;
    s.mOrder = s.mOrder || {}; s.mOrderSt = s.mOrderSt || {};
    if (!s.mOrder[k] || s.mOrderSt[k] !== stI) { s.mOrder[k] = shuffled(v.methods.map(m => m.id)); s.mOrderSt[k] = stI; }
    const items = s.mOrder[k].map(id => v.methods.find(m => m.id === id)).map(m => ({ t: mt(m), onPick: b => {
      const r = trainOnce(s, k, m.id); coachStep(s, 1);
      panelPick(b, () => {
        flashStats(r.d);
        const nm = skName(s, k), good = r.g >= m.gain * .5;
        Snd.sfx(good ? 'good' : 'event'); if (r.g > 0) { wagUntil = Date.now() + 1500; }
        // 스킬 막대는 카드의 막대로 보여 주므로 칩에는 미션 소식만 둔다
        const done = missionsUpdate(s, true); renderMissionBar(s); const extra = [];
        done.forEach(x => extra.unshift({ t: x.ok ? `미션 완수 · ${mName(s, x.m)} ${x.m.to}%` : `미션 놓침 · ${mName(s, x.m)}`, good: x.ok }));
        const won = done.some(x => x.ok);
        if (won && !s.slow) { fx.confetti(); Snd.sfx('good'); }
        const SG = STG(s, k), up = -1, last = r.les >= LES;
        const tg = missionsOn(s).find(x => x.ks.includes(k));
        // 한눈 판정: 늘었는지, 대가는 없는지
        const bad = fxChips(r.d).some(c => !c.mid && c.good !== true);
        const gr = Math.abs(r.g) < 1 ? Math.round(r.g * 10) / 10 : Math.round(r.g);
        const VV = (key, arr) => deck(s, key, arr).replace(/\{nm\}/g, nm).replace(/\{g\}/g, String(Math.round(r.g)));
        const V = won ? { tone: 'good', text: VV('vw', ['미션 완수! {nm} +{g}%', '해냈어요! 미션 완수 · {nm} +{g}%', '미션 성공 · {nm} +{g}%']) }
          : r.g <= -.5 ? { tone: 'bad', text: VV('vb', [`${j(nm, '이')} 오히려 뒤로 갔어요`, '{nm} 뒷걸음질했어요', '이번엔 역효과였어요']) }
          : r.g < .5 ? { tone: 'flat', text: VV('vf', ['거의 안 늘었어요', '이번엔 제자리였어요', '반응이 거의 없었어요']) }
          : r.g < 12 ? { tone: 'flat', text: VV('vs', ['{nm} 조금만 늘었어요 +{g}%', '{nm} 살짝 움직였어요 +{g}%', '아직 반응이 약해요 · {nm} +{g}%']) }
          : bad ? { tone: 'mixed', text: VV('vm', ['늘긴 했지만 대가가 있어요', '{nm} +{g}%, 대신 잃은 게 있어요', '오르긴 했는데 표정이 어두워요']) }
          : last ? { tone: 'good', text: `${nm} 수업을 다 마쳤어요 · ${Math.round(r.sk.p)}%` }
          : { tone: 'good', text: VV('vg', ['좋아요! {nm} +{g}%', '{nm} 쑥 늘었어요 +{g}%', '잘 통했어요 · {nm} +{g}%', '이 방법이 맞았어요 +{g}%', '{nm} 눈에 띄게 좋아졌어요 +{g}%', '{nm} 한 단계 올라섰어요 +{g}%']) };
        const why = (bad || r.g < 12) ? whyOf(s, m.kind) : '';
        const first = s.trainLog.length === 1;
        showResult({ kind: won ? '미션 완수' : `교육 · ${nm}`, pick: mt(m), text: won ? `${r.line} ${done.find(x => x.ok).m.ok}` : r.line, fx: r.d, extra,
          meter: { label: `${nm} · 수업 ${r.les}/${LES}`, from: r.p0, to: r.sk.p, d: (r.g >= 0 ? '+' : '') + gr }, verdict: V, why, skip: skipLabel(s), skipMain: true, more: !!trainNeed(s),
          tip: first ? '막대가 찰수록 잘하게 돼요.' : '',
          done: () => { resume(); if (first) { notice('첫 교육을 마쳤어요', 'win'); pulse('#missionBar'); } } });
        // 25·50·75·100%를 넘기면 작은 축하(미션 완수와 겹치면 생략)
        const mile = [25, 50, 75, 100].find(t => r.p0 < t && r.sk.p >= t);
        if (mile && !won) setTimeout(() => { notice(mile >= 100 ? `${nm} 다 익혔어요!` : `${nm} ${mile}% 달성!`, 'win'); if (!s.slow) fx.confetti({ particleCount: 36 }); Snd.sfx('good'); }, 700);
      });
    } }));
    items.push({ cls: 'back', t: '← 다른 걸 가르칠래', onPick: () => openTrain() });
    const SG = STG(s, k), md = moodNow(s);
    const head = `수업 ${stI + 1}/${LES} · ${SG ? SG[stI][0] : v.goal}`;
    const firstT = !(s.trainTick && s.trainTick.tick === s.ticks && s.trainTick.n > 0);
    openPanel({ id: 'train_' + k, tag: '교육', when: skName(s, k), text: firstT && md.id !== 'plain' ? `${head}\n컨디션 · ${md.t}` : head, items });
  }
  function openWalk() {
    const s = S; if (!s || s.dead) return; Snd.init();
    if (s.walkTick === s.ticks) { const t = uniq(s, ['오늘은 벌써 다녀왔다. 현관 앞에 누워 있다.', '산책 다녀온 지 얼마 안 됐다. 발바닥이 아직 축축하다.', '오늘 산책은 끝났다. 목줄을 봐도 꼬리만 한 번 흔들었다.', '다녀온 길 냄새가 아직 털에 묻어 있다. 다음 산책은 다음에.'], 'b:'); if (t) bubble(t); else fx.anim({ targets: '#walkBtn', translateX: [0, -4, 4, 0], duration: 300 }); return; }
    const n = s.dog.name;
    openPanel({
      id: 'walk', tag: '산책', when: `${s.cal.y}년 ${SEASONS[seasonOf(s.cal.m)]}`,
      text: s.ageM < 3.5 ? `${j(n, '은')} 아직 예방접종이 다 끝나지 않았다. 바깥은 어떻게 할까?` : `목줄을 꺼내자 ${j(n, '이')} 현관으로 달려갔다. 어디로 갈까?`,
      items: walkOptions(s).map(o => ({ t: o.t, onPick: b => {
        const r = walkOnce(s, o.id); coachStep(s, 2);
        if (s.want && (s.want.kind === 'ball' || s.want.kind === 'pet')) { s.want = null; s.cnt.met++; renderWant(); }
        panelPick(b, () => { flashStats(r.d); Snd.sfx('wag'); wagUntil = Date.now() + 1500; showResult({ kind: '산책', pick: o.t, text: r.line, fx: r.d, skip: skipLabel(s), done: resume }); });
      } })),
      closeText: '오늘은 쉬자',
    });
  }

  let kbd = false;
  addEventListener('keydown', e => { if (e.key === 'Tab' || e.key.startsWith('Arrow')) kbd = true; });
  addEventListener('pointerdown', () => { kbd = false; }, true);
  function showSheet(on) {
    const sheet = $('#sheet'), bd = $('#backdrop');
    if (on) {
      sheet.hidden = false; bd.hidden = false; sheet.scrollTop = 0;
      fx.anim({ targets: sheet, translateY: [60, 0], opacity: [0, 1], duration: 480, easing: 'easeOutExpo' });
      setTimeout(() => { const f = $('.choice', sheet); kbd && f && f.focus({ preventScroll: true }); }, 60);
    } else { sheet.hidden = true; bd.hidden = true; }
    renderCoach();
  }

  /* ---------- 도트 아이콘 ---------- */
  const ICONS = {
    heart: ['#F06B8B', ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...', '.......']],
    health: ['#E36A6A', ['..XXX..', '..XXX..', 'XXXXXXX', 'XXXXXXX', 'XXXXXXX', '..XXX..', '..XXX..']],
    calm: ['#8E8CD8', ['..XXX..', '.XX....', 'XX.....', 'XX.....', 'XX.....', '.XX....', '..XXX..']],
    manners: ['#E9A92E', ['...X...', '..XXX..', 'XXXXXXX', '.XXXXX.', '..XXX..', '.XX.XX.', '.X...X.']],
    social: ['#A7795A', ['.X.X.X.', '.X.X.X.', '.......', '..XXX..', '.XXXXX.', '.XXXXX.', '..XXX..']],
    joy: ['#F59E3B', ['X..X..X', '.X.X.X.', '..XXX..', 'XXXXXXX', '..XXX..', '.X.X.X.', 'X..X..X']],
    bone: ['#C9A27A', ['.......', 'XX...XX', 'XXXXXXX', '.XXXXX.', 'XXXXXXX', 'XX...XX', '.......']],
    ball: ['#6CBF8A', ['..XXX..', '.XXXXX.', 'XX.XXXX', 'XXX.XXX', 'XXXX.XX', '.XXXXX.', '..XXX..']],
    leash: ['#E06A50', ['XX.....', 'X.X....', 'XX.X...', '....X..', '.....X.', '.....XX', '.....XX']],
    book: ['#4F86C6', ['.......', 'XXX.XXX', 'X.XXX.X', 'X.XXX.X', 'X.XXX.X', 'XXXXXXX', '...X...']],
    paw: ['#7C6BB0', ['.X.X.X.', '.X.X.X.', '.......', '..XXX..', '.XXXXX.', '.XXXXX.', '..XXX..']],
  };
  function iconSVG(name) {
    const [c, rows] = ICONS[name]; let r = '';
    rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X') r += `<rect x="${x}" y="${y}" width="1" height="1"/>`; }));
    return `<svg viewBox="0 0 7 7" fill="${c}" aria-hidden="true">${r}</svg>`;
  }

  /* ---------- 하늘 무대 ---------- */
  const PAL = {
    spring: { sky: ['#BFE3F5', '#FDE4EE'], g1: '#A8D894', g2: '#8BC67A', fx: 'petal', fc: ['#F7B6C8', '#FCD4E0'], cloud: '#FFFFFF' },
    summer: { sky: ['#86CDF3', '#D8F2FC'], g1: '#7CC46F', g2: '#5DAE58', fx: 'none', cloud: '#FFFFFF' },
    autumn: { sky: ['#F7C79A', '#FCEBD6'], g1: '#DDB065', g2: '#C9944A', fx: 'leaf', fc: ['#E0823D', '#C9562E', '#E9B44C'], cloud: '#FFF6EA' },
    winter: { sky: ['#C7D3EE', '#F0F3FA'], g1: '#F7F9FC', g2: '#DDE5F0', fx: 'snow', fc: ['#FFFFFF'], cloud: '#FFFFFF' },
    senior: { sky: ['#F6B992', '#FCE1C6'], g1: '#C9B07A', g2: '#B39A64', fx: 'none', cloud: '#FFE9D6' },
    sunset: { sky: ['#EF9277', '#FDD7B2'], g1: '#B89A6C', g2: '#9F835A', fx: 'none', cloud: '#FFD9C4' },
    night: { sky: ['#252C58', '#535E8E'], g1: '#3B4770', g2: '#303B61', fx: 'star', cloud: '#7380B0' },
    rainbow: { sky: ['#CDE7FF', '#FFF0E4'], g1: '#BFE6B0', g2: '#A4D896', fx: 'rainbow', fc: ['#FFFFFF', '#FFE7A8'], cloud: '#FFFFFF' },
  };
  const scenes = new Map();
  class Scene {
    constructor(el) { this.el = el; this.c = $('canvas.sky', el); this.ctx = this.c.getContext('2d'); this.mode = el.dataset.mode || 'spring'; this.t = 0; }
    set(mode) { if (this.mode === mode) return; this.mode = mode; this.el.dataset.mode = mode; const p = PAL[mode]; this.el.style.background = `linear-gradient(${p.sky[0]}, ${p.sky[1]})`; }
    fit() {
      const r = this.el.getBoundingClientRect(); if (!r.width) return false;
      const W = Math.max(60, Math.round(r.width / 4)), H = Math.max(40, Math.round(r.height / 4));
      if (this.c.width !== W || this.c.height !== H) { this.c.width = W; this.c.height = H; this.seed(); }
      return true;
    }
    seed() {
      const W = this.c.width, H = this.c.height;
      this.clouds = [...Array(4)].map(() => ({ x: rand() * W, y: 3 + rand() * H * .32, w: 10 + Math.floor(rand() * 14), v: .03 + rand() * .05 }));
      this.parts = [...Array(26)].map(() => ({ x: rand() * W, y: rand() * H, v: .12 + rand() * .22, s: rand() * 6, c: 0 }));
      this.bumps = [...Array(W)].map(() => (rand() < .3 ? 1 : 0));
      this.flowers = [...Array(Math.floor(W / 9))].map(() => ({ x: Math.floor(rand() * W), dy: Math.floor(rand() * 4) }));
      this.stars = [...Array(46)].map(() => ({ x: Math.floor(rand() * W), y: Math.floor(rand() * H * .62), p: rand() * 6 }));
    }
    draw() {
      if (!this.fit()) return;
      const ctx = this.ctx, W = this.c.width, H = this.c.height, p = PAL[this.mode]; this.t += 1;
      const bands = 7; const a = hex(p.sky[0]), b = hex(p.sky[1]);
      for (let i = 0; i < bands; i++) { const f = i / (bands - 1); ctx.fillStyle = rgb(a.map((v, k) => v + (b[k] - v) * f)); ctx.fillRect(0, Math.floor(i * H / bands), W, Math.ceil(H / bands) + 1); }
      if (p.fx === 'star') this.stars.forEach(s => { const on = Math.sin(this.t / 14 + s.p) > -.2; if (on) { ctx.fillStyle = '#FFF7D6'; ctx.fillRect(s.x, s.y, 1, 1); } });
      if (p.fx === 'rainbow') this.rainbow(ctx, W, H);
      ctx.globalAlpha = p.fx === 'star' ? .45 : .92; ctx.fillStyle = p.cloud;
      this.clouds.forEach(c => { c.x += c.v; if (c.x > W + 4) c.x = -c.w - 4; const x = Math.floor(c.x), y = Math.floor(c.y), w = c.w;
        ctx.fillRect(x + Math.floor(w * .3), y, Math.ceil(w * .4), 2); ctx.fillRect(x, y + 2, w, 3); ctx.fillRect(x + 1, y + 5, w - 2, 1); });
      ctx.globalAlpha = 1;
      const gh = Math.round(H * .2), y0 = H - gh;
      ctx.fillStyle = p.g1; ctx.fillRect(0, y0, W, gh);
      this.bumps.forEach((b2, x) => { if (b2) ctx.fillRect(x, y0 - 1, 1, 1); });
      ctx.fillStyle = p.g2; for (let x = 0; x < W; x += 2) ctx.fillRect(x + ((Math.floor(x / 2)) % 2), y0 + 3 + (x % 5 === 0 ? 1 : 0), 1, 1);
      ctx.fillRect(0, y0 + Math.floor(gh * .55), W, 1);
      if (this.mode === 'spring' || this.mode === 'rainbow') this.flowers.forEach((f, i) => { ctx.fillStyle = i % 3 ? '#F7B6C8' : '#FFF3A6'; ctx.fillRect(f.x, y0 + 1 + f.dy, 1, 1); });
      if (p.fc && (p.fx === 'petal' || p.fx === 'leaf' || p.fx === 'snow' || p.fx === 'rainbow')) {
        this.parts.forEach((q, i) => { q.y += q.v * (p.fx === 'rainbow' ? -.35 : 1); q.x += Math.sin((this.t + q.s * 30) / 22) * .15 + (p.fx === 'snow' ? 0 : .06);
          if (q.y > H) { q.y = -2; q.x = rand() * W; } if (q.y < -2) { q.y = H; q.x = rand() * W; } if (q.x > W) q.x = 0;
          ctx.fillStyle = p.fc[i % p.fc.length]; ctx.globalAlpha = p.fx === 'rainbow' ? (.5 + .5 * Math.sin(this.t / 10 + i)) : 1; ctx.fillRect(Math.floor(q.x), Math.floor(q.y), 1, 1); });
        ctx.globalAlpha = 1;
      }
    }
    rainbow(ctx, W, H) {
      const cx = W / 2, cy = H * .86, R = W * .46; const cols = ['#F59A9A', '#F7C08A', '#F5E08F', '#A9DDA0', '#9CCBEE', '#B9A6E6'];
      ctx.globalAlpha = .8;
      cols.forEach((c, i) => { const r = R - i * 2; ctx.fillStyle = c; for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = r * r - (x - cx) * (x - cx); if (d < 0) continue; const y = Math.floor(cy - Math.sqrt(d)); ctx.fillRect(x, y, 1, 2); } });
      ctx.globalAlpha = 1;
    }
  }
  function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16, n >> 8 & 255, n & 255]; }
  function rgb(a) { return `rgb(${a.map(v => Math.round(v)).join(',')})`; }
  function sceneOf(el) { if (!scenes.has(el)) scenes.set(el, new Scene(el)); return scenes.get(el); }
  let lastDraw = 0;
  function loop(ts) {
    if (ts - lastDraw > 70) { lastDraw = ts; scenes.forEach(sc => { if (!sc.el.closest('.screen').hidden) sc.draw(); }); }
    requestAnimationFrame(loop);
  }

  /* ---------- 도트 강아지 ---------- */
  function shade(h, amt) { return rgb(hex(h).map(v => clamp(v * (1 + amt), 0, 255))); }
  function dogPixels(look, o = {}) {
    const P = new Map(); const put = (x, y, c) => P.set(x + ',' + y, [x, y, c]); const del = (x, y) => P.delete(x + ',' + y);
    const { c1, c2 } = look; const big = o.size === 'L';
    const dark = shade(c1, -.22), white = '#F4EFE6', nose = '#1E1A17', eyeC = '#1E1A17', pink = '#E08A86';
    const legH = look.leg, bodyH = big ? 5 : 4, len = o.pup ? Math.max(8, look.len - 3) : look.len;
    const bb = 18 - legH, bt = bb - bodyH + 1, x0 = 6, x1 = x0 + len - 1;
    for (let y = bt; y <= bb; y++) for (let x = x0; x <= x1; x++) put(x, y, c1);
    del(x0, bt); del(x0, bb); del(x1, bb);
    for (let y = bb + 1; y <= 18; y++) { put(x0, y, c1); put(x0 + 1, y, c1); put(x0 + 3, y, dark); put(x1 - 3, y, dark); put(x1 - 1, y, c1); put(x1, y, c1); }
    const hw = big ? 7 : 6, hh = big ? 6 : 5;
    const hx0 = x1 - 1, hx1 = hx0 + hw - 1, hy1 = bt + 1, hy0 = hy1 - hh + 1;
    for (let y = hy0; y <= hy1; y++) for (let x = hx0; x <= hx1; x++) put(x, y, c1);
    del(hx0, hy0); del(hx1, hy0);
    const sn = look.snout;
    for (let x = hx1 + 1; x <= hx1 + sn; x++) { put(x, hy1 - 2, c1); put(x, hy1 - 1, c1); }
    const legRows = []; for (let y = bb + 1; y <= 18; y++) legRows.push(y);
    const paint = (pts, c) => pts.forEach(([x, y]) => { if (P.has(x + ',' + y)) put(x, y, c); });
    const snoutPts = []; for (let x = hx1 - (sn ? 0 : 1); x <= hx1 + sn; x++) { snoutPts.push([x, hy1 - 2], [x, hy1 - 1]); }
    const legPts = []; legRows.forEach(y => [x0, x0 + 1, x0 + 3, x1 - 3, x1 - 1, x1].forEach(x => legPts.push([x, y])));
    const chestPts = []; for (let y = bt + 1; y <= bb; y++) { chestPts.push([x1 - 1, y], [x1, y]); }
    const bellyPts = []; for (let x = x0 + 1; x < x1; x++) bellyPts.push([x, bb]);
    if (look.pat === 'tan') { paint(legPts, c2); paint(snoutPts, c2); for (let y = hy0 + 1; y <= hy1; y++) for (let x = hx0; x <= hx1; x++) paint([[x, y]], c2); }
    if (look.pat === 'tri') { const sad = []; for (let y = bt; y <= bt + 1; y++) for (let x = x0 + 1; x <= x1 - 2; x++) sad.push([x, y]); paint(sad, c2); paint(legPts, white); paint(bellyPts, white); paint(snoutPts, white); }
    if (look.pat === 'corgi' || look.pat === 'urajiro') { const w = look.pat === 'corgi' ? white : c2; paint(snoutPts, w); paint(chestPts, w); paint(bellyPts, w); paint(legPts.filter(p => p[1] >= 17), w); if (look.pat === 'urajiro') paint([[hx1 - 1, hy1], [hx1, hy1]], w); }
    if (look.pat === 'chest') paint(chestPts, c2);
    if (look.pat === 'collie') { paint(snoutPts, c2); paint([[hx1 - 1, hy0], [hx1 - 1, hy0 + 1]], c2); paint(chestPts, c2); paint(legPts.filter(p => p[1] >= 17), c2); paint([[hx0, hy1], [hx0 + 1, hy1]], c2); }
    if (look.pat === 'beard') { paint(snoutPts, c2); for (let x = hx1; x <= hx1 + sn; x++) put(x, hy1, c2); paint(legPts, c2); }
    if (look.pat === 'shih') { const m = []; for (let y = hy0; y <= hy0 + 1; y++) for (let x = hx0; x <= hx0 + 3; x++) m.push([x, y]); for (let y = bt; y <= bt + 1; y++) for (let x = x0 + 1; x <= x0 + 4; x++) m.push([x, y]); paint(m, c2); }
    if (look.pat === 'mask') { const m = []; for (let y = hy0 + 2; y <= hy1; y++) for (let x = hx1 - 2; x <= hx1 + sn; x++) m.push([x, y]); paint(m, c2); }
    if (look.pat === 'patch') { const r = mulberry32(look.seed || 7); for (let i = 0; i < 3; i++) { const px = x0 + 1 + Math.floor(r() * (len - 3)), py = bt + Math.floor(r() * (bodyH - 1)); paint([[px, py], [px + 1, py], [px, py + 1], [px + 1, py + 1]], c2); } }
    // 털 모양: short 짧은 털, feather 배·다리 장식털, long 바닥까지 늘어진 털, plush 목도리처럼 부푼 털, curly 곱슬
    let coat = look.coat || 'short'; if (o.pup && coat === 'long') coat = 'feather';
    const colAt = (x, y, dc) => P.get(x + ',' + y)?.[2] || dc;
    if (coat === 'feather') {
      for (let x = x0 + 4; x <= x1 - 4; x++) put(x, bb + 1, colAt(x, bb, c1));
      if (bb + 2 < 18) for (let x = x0 + 5; x <= x1 - 5; x += 2) put(x, bb + 2, colAt(x, bb, c1));
      put(x0 - 1, bb + 1, colAt(x0, bb + 1, c1));
    }
    if (coat === 'long') {
      for (let y = bb + 1; y <= 17; y++) for (let x = x0 - 1; x <= x1 + 1; x++) { if (y === 17 && (x + 1) % 2) continue; put(x, y, c1); }
      for (let y = bt + 1; y <= bb; y++) put(x0 - 1, y, c1);
    }
    if (coat === 'plush') {
      for (let x = x0 + 1; x <= x1 - 2; x++) put(x, bt - 1, colAt(x, bt, c1));
      for (let y = bt + 2; y <= bb; y++) { put(x1 + 1, y, colAt(x1, y, c1)); if (y < bb) put(x1 + 2, y, colAt(x1, y, c1)); }
      for (let y = hy0 + 1; y <= bt - 1; y++) put(hx0 - 1, y, c1); put(hx0 - 2, bt - 2, c1);
      for (let y = bt; y <= bb - 1; y++) put(x0 - 1, y, colAt(x0, y, c1));
      for (let x = x0 + 4; x <= x1 - 4; x += 2) put(x, bb + 1, colAt(x, bb, c1));
    }
    if (coat === 'curly') for (let y = bt - 1; y <= bb; y++) { put(x0 - 1, y === bt - 1 ? bt : y, colAt(x0, y, c1)); }
    if (coat === 'curly') for (let x = x0 + 1; x <= x1 - 2; x++) put(x, bt - 1, c1);
    if (look.top === 'knot') { const tc = look.topC || c1; [[hx0 + 2, hy0 - 1], [hx0 + 3, hy0 - 1], [hx0 + 4, hy0 - 1], [hx0 + 3, hy0 - 2], [hx0 + 2, hy0 - 2]].forEach(([x, y]) => put(x, y, tc)); }
    if (look.top === 'puff') {
      for (let x = hx0 + 1; x <= hx1 - 1; x++) put(x, hy0 - 1, c1); for (let x = hx0 + 2; x <= hx1 - 2; x++) put(x, hy0 - 2, c1);
      put(hx0, hy0, c1); put(hx1, hy0, c1); for (let y = hy0; y <= hy1 - 1; y++) put(hx0 - 1, y, c1); put(hx1 + 1, hy0 + 1, c1);
    }
    const earC = look.earC || ((look.ear === 'drop' || look.ear === 'long' || look.ear === 'half') ? (look.pat === 'tri' ? c1 : c2) : look.pat === 'tan' ? c2 : c1);
    if (look.ear === 'erect') [[hx0 + 1, hy0 - 2], [hx0 + 1, hy0 - 1], [hx0 + 2, hy0 - 1], [hx0 + 4, hy0 - 2], [hx0 + 4, hy0 - 1], [hx0 + 5, hy0 - 1]].forEach(([x, y]) => put(x, y, earC));
    if (look.ear === 'bat') { [[hx0 + 1, hy0 - 3], [hx0 + 1, hy0 - 2], [hx0 + 1, hy0 - 1], [hx0 + 2, hy0 - 2], [hx0 + 2, hy0 - 1], [hx0 + 4, hy0 - 3], [hx0 + 4, hy0 - 2], [hx0 + 4, hy0 - 1], [hx0 + 5, hy0 - 1]].forEach(([x, y]) => put(x, y, earC)); put(hx0 + 2, hy0 - 2, pink); }
    if (look.ear === 'half') [[hx0 + 1, hy0 - 1], [hx0 + 2, hy0 - 1], [hx0 + 3, hy0], [hx0 + 2, hy0]].forEach(([x, y]) => put(x, y, earC));
    if (look.ear === 'drop') for (let y = hy0; y <= hy0 + 3; y++) { put(hx0 + 1, y, earC); put(hx0 + 2, y, earC); }
    if (look.ear === 'long') for (let y = hy0 + 1; y <= hy1 + 2; y++) { put(hx0 + 1, y, earC); put(hx0 + 2, y, earC); if (y > hy0 + 1) put(hx0 + 3, y, earC); }
    const f = o.frame || 0;
    const T = {
      straight: f ? [[x0 - 1, bt], [x0 - 2, bt], [x0 - 3, bt - 1]] : [[x0 - 1, bt], [x0 - 2, bt - 1], [x0 - 2, bt - 2]],
      plume: f ? [[x0 - 1, bt], [x0 - 2, bt], [x0 - 3, bt], [x0 - 3, bt + 1], [x0 - 4, bt + 1]] : [[x0 - 1, bt], [x0 - 2, bt], [x0 - 2, bt - 1], [x0 - 3, bt - 1], [x0 - 3, bt - 2], [x0 - 4, bt - 2]],
      curl: f ? [[x0 - 1, bt - 1], [x0, bt - 2], [x0 + 1, bt - 2], [x0 + 1, bt - 1]] : [[x0 - 1, bt], [x0 - 1, bt - 1], [x0, bt - 2], [x0 + 1, bt - 2], [x0 + 1, bt - 1]],
      low: f ? [[x0 - 1, bt + 1], [x0 - 2, bt], [x0 - 3, bt]] : [[x0 - 1, bt + 1], [x0 - 2, bt + 1], [x0 - 3, bt + 2]],
      stub: f ? [[x0 - 1, bt - 1]] : [[x0 - 1, bt]],
      over: f ? [[x0 - 1, bt - 1], [x0, bt - 2], [x0, bt - 3], [x0 + 1, bt - 3], [x0 + 2, bt - 3], [x0 + 1, bt - 2], [x0 + 2, bt - 2], [x0 + 3, bt - 2], [x0 + 1, bt - 4]] : [[x0 - 1, bt], [x0 - 1, bt - 1], [x0, bt - 2], [x0 + 1, bt - 2], [x0 + 2, bt - 2], [x0 + 3, bt - 2], [x0 + 1, bt - 3], [x0 + 2, bt - 3], [x0, bt - 3]],
      pom: f ? [[x0 - 1, bt], [x0 - 2, bt - 1], [x0 - 3, bt - 2], [x0 - 2, bt - 2], [x0 - 3, bt - 3], [x0 - 2, bt - 3]] : [[x0 - 1, bt], [x0 - 1, bt - 1], [x0 - 2, bt - 2], [x0 - 1, bt - 2], [x0 - 2, bt - 3], [x0 - 1, bt - 3]],
    }[look.tail] || [];
    if (coat === 'feather' && look.tail === 'plume') T.slice(1).forEach(([x, y]) => { if (!P.has(x + ',' + (y + 1))) put(x, y + 1, c1); });
    T.forEach(([x, y], i) => put(x, y, i === T.length - 1 && (look.tail === 'plume' || look.pat === 'tri' || look.pat === 'collie') ? (look.pat === 'tri' || look.pat === 'collie' ? white : c2) : c1));
    const ex = sn === 0 ? hx1 - 2 : hx1 - 1, ey = hy0 + 2;
    if (o.sleep) { put(ex - 1, ey, dark); put(ex, ey, dark); }
    else { put(ex, ey, eyeC); if (sn === 0) put(ex + 1, ey, eyeC); }
    put(hx1 + sn, hy1 - 2, nose);
    if (look.brow && !o.sleep) { put(ex, ey - 1, c2); put(ex + 1, ey - 1, c2); put(ex - 1, ey - 1, c2); }
    if (look.pat === 'beard') for (let x = hx1 - 1; x <= hx1 + sn - 1; x++) put(x, hy1 + 1, c2);
    if (coat === 'curly') { const tx = lum(c1) > .82 ? '#ECE5D9' : shade(c1, -.1); for (const [k, v] of P) { const [x, y, c] = v; if (c === c1 && y % 2 === 1 && (x + (y >> 1)) % 3 === 0 && !(y === ey && Math.abs(x - ex) < 2)) P.set(k, [x, y, tx]); } }
    if (o.happy && sn >= 1 && !o.sleep) put(hx1 + sn - 1, hy1, pink);
    if (o.senior) { const g = '#D8D3CB'; snoutPts.forEach(([x, y]) => { if (P.has(x + ',' + y) && !(x === hx1 + sn && y === hy1 - 2)) put(x, y, g); }); }
    if (o.silhouette) for (const [k, v] of P) P.set(k, [v[0], v[1], '#4A4058']);
    if (o.halo) { for (let x = hx0 + 1; x <= hx0 + 4; x++) put(x, hy0 - 4, '#FFE27A'); put(hx0, hy0 - 3, '#FFE27A'); put(hx0 + 5, hy0 - 3, '#FFE27A'); }
    return [...P.values()];
  }
  const lum = h => { const [r, g, b] = hex(h); return (r * .299 + g * .587 + b * .114) / 255; };
  function drawDog(canvas, dog, o = {}) {
    const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height);
    const px = dogPixels(dog.look, { ...o, size: dog.breed.size });
    let mnx = 99, mxx = -99, mxy = -99, mny = 99; px.forEach(([x, y]) => { mnx = Math.min(mnx, x); mxx = Math.max(mxx, x); mxy = Math.max(mxy, y); mny = Math.min(mny, y); });
    let sc = { S: 6.5, M: 7.5, L: 8.5 }[dog.breed.size] * (canvas.width / 256); if (o.pup) sc *= .8;
    sc = Math.min(sc, (canvas.width - 16) / (mxx - mnx + 1), (canvas.height - 10) / (mxy - mny + 2));
    sc = Math.max(2, Math.floor(sc));
    const w = (mxx - mnx + 1) * sc; const ox = Math.round((canvas.width - w) / 2) - mnx * sc; const oy = canvas.height - 6 - (mxy + 1) * sc;
    ctx.fillStyle = 'rgba(40,30,50,.13)'; ctx.fillRect(ox + mnx * sc + sc, oy + (mxy + 1) * sc, w - sc * 2, Math.max(2, Math.floor(sc / 2)));
    if (!o.silhouette) {
      const has = new Set(px.map(([x, y]) => x + ',' + y)); ctx.fillStyle = lum(dog.look.c1) > .82 ? '#CBBBA4' : shade(dog.look.c1, -.38);
      px.forEach(([x, y]) => [[1, 0], [-1, 0], [0, -1]].forEach(([dx, dy]) => { if (!has.has((x + dx) + ',' + (y + dy))) ctx.fillRect(ox + (x + dx) * sc, oy + (y + dy) * sc, sc, sc); }));
    }
    px.forEach(([x, y, c]) => { ctx.fillStyle = c; ctx.fillRect(ox + x * sc, oy + y * sc, sc, sc); });
    if (o.sleep && !o.noZ) { ctx.fillStyle = '#7C6BB0'; ctx.font = `${Math.round(sc * 2.4)}px Jua`; ctx.fillText('z', ox + (mxx - 1) * sc, oy + (mny + 1) * sc); }
    if (o.heart) { const hs = Math.max(2, Math.floor(sc * .8)); const [c, rows] = ICONS.heart; ctx.fillStyle = c; rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X') ctx.fillRect(ox + (mxx - 3) * sc + x * hs, oy + (mny - 4) * sc + y * hs, hs, hs); })); }
  }

  /* ---------- 효과 ---------- */
  const fx = {
    anim(opts) { if (REDUCED || typeof window.anime !== 'function') { const ts = typeof opts.targets === 'string' ? $$(opts.targets) : [opts.targets]; ts.forEach(t => { if (t && t.style) { t.style.opacity = ''; t.style.transform = ''; } }); return; } window.anime(opts); },
    confetti(o = {}) { if (REDUCED || typeof window.confetti !== 'function') return; window.confetti({ particleCount: 60, spread: 70, origin: { y: .35 }, colors: ['#F0705A', '#F7B6C8', '#FFE27A', '#6CBF8A', '#9CCBEE'], shapes: ['square'], disableForReducedMotion: true, ...o }); },
  };

  /* ---------- 소리 (Tone.js) ---------- */
  // 배경음 네 단계: 기분 좋음(life) → 알 수 없는 불안(uneasy) → 작별(farewell/rainbow) → 멍함(blank)
  // play: 음을 칠 확률, cut: 소리 밝기(필터), wet: 울림, drone: 낮게 깔리는 음
  const PROGS = {
    life: { bpm: 72, play: .9, cut: 5200, wet: .28, vol: -10, drone: null, chords: [['C4', 'E4', 'G4', 'D5'], ['A3', 'C4', 'E4', 'B4'], ['F3', 'A3', 'C4', 'G4'], ['G3', 'B3', 'D4', 'A4']], roots: ['C2', 'A1', 'F1', 'G1'] },
    uneasy: { bpm: 54, play: .5, cut: 1300, wet: .4, vol: -13, drone: 'A1', chords: [['A3', 'C4', 'E4', 'B4'], ['F3', 'A3', 'C4', 'E4'], ['D3', 'F3', 'A3', 'C4'], ['E3', 'G#3', 'B3', 'D4']], roots: ['A1', 'F1', 'D2', 'E1'] },
    farewell: { bpm: 50, play: .75, cut: 2600, wet: .45, vol: -11, drone: null, chords: [['A3', 'C4', 'E4', 'B4'], ['F3', 'A3', 'C4', 'E4'], ['C4', 'E4', 'G4', 'D5'], ['G3', 'B3', 'D4', 'A4']], roots: ['A1', 'F1', 'C2', 'G1'] },
    rainbow: { bpm: 64, play: .85, cut: 5200, wet: .45, vol: -11, drone: null, chords: [['F4', 'A4', 'C5', 'E5'], ['G4', 'B4', 'D5', 'A5'], ['E4', 'G4', 'B4', 'D5'], ['A4', 'C5', 'E5', 'G5']], roots: ['F2', 'G2', 'E2', 'A1'] },
    blank: { bpm: 40, play: .12, cut: 900, wet: .7, vol: -15, drone: 'E2', pad: true, chords: [['E4', 'B4', 'F#5', 'A5'], ['C4', 'G4', 'D5', 'E5'], ['E4', 'B4', 'F#5', 'A5'], ['A3', 'E4', 'B4', 'C5']], roots: ['E1', 'C2', 'E1', 'A1'] },
  };
  const Snd = {
    on: !MUTE, ready: false, starting: false, prog: PROGS.life,
    async init() {
      if (!this.on || this.ready || this.starting || !window.Tone) return; this.starting = true;
      try { await Tone.start(); this.build(); this.ready = true; if (!$('#arrive').hidden || (S && !S.dead && !$('#life').hidden)) this.play(); } catch (e) { /* 소리 없이 진행 */ }
      this.starting = false;
    },
    build() {
      const T = window.Tone;
      this.vol = new T.Volume(-10).toDestination();
      const rev = this.rev = new T.Reverb({ decay: 4, wet: .28 }).connect(this.vol);
      this.lp = new T.Filter(5200, 'lowpass').connect(rev);
      this.box = new T.PolySynth(T.Synth, { oscillator: { type: 'triangle' }, envelope: { attack: .01, decay: .6, sustain: .05, release: 1.6 } }).connect(this.lp); this.box.volume.value = -16;
      this.padS = new T.PolySynth(T.Synth, { oscillator: { type: 'sine' }, envelope: { attack: 2.5, decay: 1, sustain: .6, release: 4 } }).connect(this.lp); this.padS.volume.value = -24;
      this.drone = new T.Synth({ oscillator: { type: 'sine' }, envelope: { attack: 4, decay: 0, sustain: 1, release: 4 } }).connect(rev); this.drone.volume.value = -30;
      this.droneNote = null;
      this.bass = new T.Synth({ oscillator: { type: 'sine' }, envelope: { attack: .05, decay: .8, sustain: .2, release: 1.5 } }).connect(rev); this.bass.volume.value = -20;
      this.ping = new T.Synth({ oscillator: { type: 'sine' }, envelope: { attack: .003, decay: .16, sustain: 0, release: .2 } }).connect(rev); this.ping.volume.value = -8;
      // 효과음: 배경음과 따로, 배경음 필터·볼륨 변화에 묻히지 않게 바로 출력
      const fxOut = this.fxOut = new T.Volume(-6).toDestination();
      const fxRev = new T.Reverb({ decay: 1.4, wet: .18 }).connect(fxOut);
      // 나무 실로폰(마림바) 느낌
      this.mallet = new T.PolySynth(T.FMSynth, { harmonicity: 3.01, modulationIndex: 1.6, oscillator: { type: 'sine' }, envelope: { attack: .002, decay: .45, sustain: 0, release: .4 }, modulation: { type: 'sine' }, modulationEnvelope: { attack: .002, decay: .12, sustain: 0, release: .1 } }).connect(fxRev); this.mallet.volume.value = -10;
      // 사각사각(쓰다듬기)·바삭(간식)용 잡음
      this.brushF = new T.Filter(2600, 'bandpass').connect(fxOut); this.brushF.Q.value = .8;
      this.brush = new T.NoiseSynth({ noise: { type: 'pink' }, envelope: { attack: .09, decay: .22, sustain: 0, release: .05 } }).connect(this.brushF); this.brush.volume.value = -14;
      this.crunchF = new T.Filter(1900, 'bandpass').connect(fxOut); this.crunchF.Q.value = 1.4;
      this.crunch = new T.NoiseSynth({ noise: { type: 'white' }, envelope: { attack: .001, decay: .045, sustain: 0, release: .02 } }).connect(this.crunchF); this.crunch.volume.value = -8;
      // 통통 튀는 공
      this.boing = new T.MembraneSynth({ pitchDecay: .06, octaves: 3, oscillator: { type: 'sine' }, envelope: { attack: .001, decay: .22, sustain: 0, release: .1 } }).connect(fxOut); this.boing.volume.value = -8;
      // 왈! 성대 소리(톱니파) + 입 모양(대역 필터)
      const mouth = new T.Filter(950, 'bandpass').connect(fxOut); mouth.Q.value = 2.2;
      this.woof = new T.MonoSynth({ oscillator: { type: 'sawtooth' }, filter: { type: 'lowpass', Q: 1, rolloff: -12 }, envelope: { attack: .006, decay: .09, sustain: .2, release: .05 }, filterEnvelope: { attack: .005, decay: .08, sustain: .3, baseFrequency: 500, octaves: 2.2 } }).connect(mouth); this.woof.volume.value = -6;
      let i = 0;
      // 배경음 음 고르기는 Math.random: 게임 난수(rand)를 쓰면 '같은 아이' 재현이 깨진다
      this.loop = new T.Loop(time => {
        const P = this.prog, bar = Math.floor(i / 8) % 4, ch = P.chords[bar];
        const n = ch[[0, 2, 1, 3, 2, 1, 3, 2][i % 8]];
        if (Math.random() < P.play) this.box.triggerAttackRelease(n, '8n', time, .45 + Math.random() * .2);
        if (i % 8 === 0) {
          if (P.pad) this.padS.triggerAttackRelease(ch.slice(0, 3), '2m', time, .35);
          // 휴대폰 스피커는 100Hz 밑을 거의 못 낸다. 한 옥타브 올려 친다.
          else this.bass.triggerAttackRelease(T.Frequency(P.roots[bar]).transpose(12), '1n', time, .5);
        }
        i++;
      }, '8n');
      T.Transport.bpm.value = this.prog.bpm;
      this.applyMood(0);
    },
    applyMood(sec = 4) {
      const P = this.prog, T = window.Tone;
      T.Transport.bpm.rampTo(P.bpm, sec || .01);
      this.lp.frequency.rampTo(P.cut, sec || .01);
      this.rev.wet.rampTo(P.wet, sec || .01);
      this.vol.volume.rampTo(P.vol, sec || .01);
      if (this.droneNote && this.droneNote !== P.drone) { this.drone.triggerRelease(); this.droneNote = null; }
      if (P.drone && this.droneNote !== P.drone) { this.drone.triggerAttack(P.drone); this.droneNote = P.drone; }
    },
    play() { if (!this.ready || !this.on) return; window.Tone.Transport.start(); if (this.loop.state !== 'started') this.loop.start(0); if (this.prog.drone && !this.droneNote) this.applyMood(1); },
    stop() { if (!this.ready) return; this.loop.stop(); if (this.droneNote) { this.drone.triggerRelease(); this.droneNote = null; } window.Tone.Transport.pause(); },
    moodName: 'life', moodAt: 0,
    mood(name) {
      if (this.moodName === name && this.ready) return;
      this.moodName = name; this.moodAt = Date.now(); this.prog = PROGS[name] || PROGS.life;
      if (this.ready) { this.applyMood(4); this.play(); }
    },
    // 건강에 따라 기분 좋음 ↔ 불안. 40 아래로 내려가야 들어가고 50 위로 올라와야 나온다. 한 번 바뀌면 45초는 유지.
    health(h) {
      const dwell = Date.now() - this.moodAt > 45000;
      if (this.moodName === 'life' && h < 40 && dwell) this.mood('uneasy');
      else if (this.moodName === 'uneasy' && h > 50 && dwell) this.mood('life');
    },
    setStage(st) { if (!this.ready || this.moodName !== 'life') return; window.Tone.Transport.bpm.rampTo(st === 'senior' ? 58 : st === 'pup' ? 78 : 72, 3); },
    sfx(name) {
      if (!this.on || !this.ready) return; const T = window.Tone, t = T.now();
      try {
        // 쓰다듬기: 털 쓸어 주는 사각 두 번 + 작은 실로폰
        if (name === 'wag') { this.brush.triggerAttackRelease(.28, t); this.brush.triggerAttackRelease(.24, t + .32, .7); this.mallet.triggerAttackRelease('E5', '16n', t + .5, .35); }
        // 간식: 바삭바삭 씹는 소리 세 번 + 냠
        if (name === 'treat') { [0, .11, .24, .4].forEach((d, k) => { this.crunchF.frequency.setValueAtTime(1500 + Math.random() * 1200, t + d); this.crunch.triggerAttackRelease(.04, t + d, .9 - k * .15); }); this.mallet.triggerAttackRelease(['G5', 'C6'], '16n', t + .62, .4); }
        // 공놀이: 통, 통, 통 줄어들며 튀는 공
        if (name === 'ball') { [[0, 'G3', .9], [.3, 'A3', .6], [.5, 'B3', .4], [.64, 'C4', .25], [.74, 'D4', .15]].forEach(([d, n, v]) => this.boing.triggerAttackRelease(n, '16n', t + d, v)); }
        // 반가워서 '왈! 왈!'
        if (name === 'bark') { [0, .22].forEach(d => { this.woof.triggerAttack(330, t + d); this.woof.frequency.linearRampToValueAtTime(520, t + d + .035); this.woof.frequency.exponentialRampToValueAtTime(260, t + d + .11); this.woof.triggerRelease(t + d + .11); }); }
        // 사건: 일기장 넘기는 사락 + 낮은 실로폰 두 음
        if (name === 'event') { this.brush.triggerAttackRelease(.18, t, .5); this.mallet.triggerAttackRelease('A4', '8n', t + .16, .45); this.mallet.triggerAttackRelease('E5', '8n', t + .34, .35); }
        // 좋은 일: 실로폰 올라가는 네 음
        if (name === 'good') { ['C5', 'E5', 'G5', 'C6'].forEach((n, k) => this.mallet.triggerAttackRelease(n, '16n', t + k * .09, .55 - k * .05)); }
        // 이름 불러 주기: 실로폰 세 음 + 끝음 화음
        if (name === 'name') { ['G4', 'C5', 'E5'].forEach((n, k) => this.mallet.triggerAttackRelease(n, '16n', t + k * .14, .55)); this.mallet.triggerAttackRelease(['C5', 'E5', 'G5', 'C6'], '4n', t + .44, .4); }
        if (name === 'end') { this.box.triggerAttackRelease(['A3', 'C4', 'E4', 'B4'], '1m', t + .2, .5); this.bass.triggerAttackRelease('A1', '1m', t + .2, .5); }
      } catch (e) { /* 무시 */ }
    },
    toggle() { this.on = !this.on; if (this.on) { if (this.ready) this.play(); else this.init(); } else this.stop(); renderSoundBtn(); },
  };
  function renderSoundBtn() { const b = $('#soundBtn'); b.setAttribute('aria-pressed', String(Snd.on)); b.setAttribute('aria-label', Snd.on ? '소리 끄기' : '소리 켜기'); b.classList.toggle('off', !Snd.on); }

  /* ---------- 화면 공통 ---------- */
  function show(id) { $$('.screen').forEach(el => { el.hidden = el.id !== id; }); window.scrollTo(0, 0); }
  function temperLine(d) {
    const a = d.fear > .6 ? '겁이 많은 편' : d.fear < .3 ? '대범한 편' : '조심성이 보통인 편';
    const b = d.energy > 4 ? '에너지가 넘친다' : d.energy < 2.3 ? '느긋하다' : '활동량은 보통이다';
    return `${a}이고, ${b}.`;
  }

  /* ---------- 입양·이름 ---------- */
  function startAdopt(seed, presetName) {
    const dog = newDog(seed || String(Date.now()) + Math.floor(rand() * 1e4), presetName);
    S = newState(dog); puppyStart(S); stageName = stage(S);
    show('arrive');
    sceneOf($('#arrive .scene')).set(SEASON_ID[seasonOf(S.cal.m)]);
    const cv = $('#arriveDog');
    drawDog(cv, dog, { silhouette: true, pup: dog.adoptM < 6 });
    { const src = dog.source.id, se = seasonOf(S.cal.m);
      $('#arriveTitle').textContent = pickOne([
        ...(src === 'shelter' ? ['보호소에서 온 아이', '철장 맨 끝 칸의 아이'] : src === 'rehome' ? ['다른 이름을 달고 온 아이', '두 번째 집에 온 아이'] : src === 'petshop' ? ['유리창 너머에서 온 아이'] : src === 'friend' ? ['아는 집에서 온 막내'] : ['형제들 틈에서 온 아이']),
        ['봄바람과 같이 온 아이', '한여름에 온 아이', '낙엽 밟고 온 아이', '눈 오는 날 온 아이'][se], '새 식구가 왔다', '오늘부터 우리 집 아이']); }
    const facts = $('#arriveFacts'); facts.innerHTML = '';
    const rows = [['아이', `${dog.breed.name} · ${dog.sex} · ${ageText(dog.adoptM)}`], ['우리 집', `${S.home.name} · ${S.home.alone <= 2 ? '낮에도 사람 있음' : `낮에 ${S.home.alone}시간 혼자`}`], ['성격', temperLine(dog)]];
    rows.forEach(([k, v]) => { const dt = document.createElement('dt'); dt.textContent = k; const dd = document.createElement('dd'); dd.textContent = v; facts.append(dt, dd); });
    const inp = $('#arriveName'); inp.value = presetName || ''; $('#nameBtn').disabled = !inp.value.trim();
    const chips = $('#nameChips'); chips.innerHTML = '';
    shuffle(D.NAMES).slice(0, 6).forEach(nm => { const b = document.createElement('button'); b.type = 'button'; b.textContent = nm; b.addEventListener('click', () => { inp.value = nm; $('#nameBtn').disabled = false; inp.focus(); }); chips.appendChild(b); });
    $('#arriveBubble').hidden = true;
    const reveal = () => { drawDog(cv, dog, { pup: dog.adoptM < 6, happy: true }); fx.anim({ targets: cv, scale: [.85, 1], duration: 700, easing: 'easeOutElastic(1, .6)' }); fx.confetti({ particleCount: 40, origin: { y: .3 } }); Snd.sfx('bark'); };
    fx.anim({ targets: '#arrive .reveal', opacity: [0, 1], translateY: [12, 0], delay: (window.anime ? window.anime.stagger(70, { start: 500 }) : 0), duration: 600, easing: 'easeOutExpo' });
    setTimeout(reveal, REDUCED ? 0 : 450);
  }

  function nameDog(e) {
    e.preventDefault();
    const nm = $('#arriveName').value.trim().slice(0, 8); if (!nm) return;
    S.dog.name = nm; Snd.init(); Snd.sfx('name');
    $('#nameBtn').disabled = true;
    const cv = $('#arriveDog'); drawDog(cv, S.dog, { pup: S.dog.adoptM < 6, happy: true, heart: true });
    const T0 = traits(S.dog), react = S.dog.adoptM >= 8 ? pickOne(['잠깐 멈칫했다. 옛 이름이 있었는지도 모른다.', '한참 쳐다보다가 천천히 다가왔다.', '못 들은 척하더니 꼬리 끝이 살짝 움직였다.']) : S.dog.fear > .55 ? pickOne(['귀를 납작하게 눕혔다가 조심조심 냄새를 맡으러 왔다.', '상자 구석에서 눈만 동그랗게 떴다.', '한 걸음 다가왔다가 두 걸음 물러났다.']) : T0.energy > .7 ? pickOne(['대답 대신 무릎으로 뛰어올랐다.', '이름을 듣자마자 바닥을 한 바퀴 굴렀다.', '신발 끈부터 물고 늘어졌다.']) : pickOne(['고개를 갸웃했다. 꼬리가 먼저 움직였다.', '고개를 이쪽저쪽 기울였다.', '코를 킁킁거리며 손바닥 냄새를 맡았다.', '하품을 크게 하고 발 위에 엎드렸다.']);
    const b = $('#arriveBubble'); b.textContent = `"${callName(nm)}!" ${react}`; b.hidden = false; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    $('#arriveTitle').textContent = `오늘부터 ${j(nm, '이에요')}`;
    fx.anim({ targets: cv, translateY: [0, -16, 0], duration: 600, easing: 'easeOutQuad' });
    S.ms.named = { t: `처음 "${callName(nm)}" 하고 불렀을 때, ${j(nm, '은')} ${react}`, age: S.ageM };
    setTimeout(startLife, REDUCED ? 300 : 2200);
  }

  function firstEvent(s) {
    const T0 = traits(s.dog), src = s.dog.source.id, adult = s.dog.adoptM >= 8;
    const opts = [{ id: 'firstnight', w: adult ? .3 : 1 }, { id: 'first_hide', w: s.dog.fear > .5 || src === 'shelter' ? 1.6 : .35 },
      { id: 'first_explore', w: s.dog.fear < .4 && T0.energy > .5 ? 1.4 : .3 }, { id: 'first_door', w: src === 'rehome' || (src === 'shelter' && adult) ? 2 : 0 }, { id: 'first_pee', w: s.dog.adoptM < 6 ? .9 : 0 }];
    const id = wpick(opts.filter(o => o.w > 0)).id; s.done.firstnight = 1; return D.EVENTS.find(e => e.id === id);
  }
  function startLife() {
    show('life');
    // 11차: 처음부터 2배속(기다림이 길다는 평). 다른 배속을 고르면 다음 판에도 그대로
    if (!startLife.sp) { startLife.sp = 1; speed = 2; $$('.speed button[data-speed]').forEach(x => x.setAttribute('aria-pressed', String(Number(x.dataset.speed) === 2))); }
    Snd.mood('life'); Snd.moodAt = Date.now();
    sceneOf($('#lifeScene')).set(SEASON_ID[seasonOf(S.cal.m)]);
    if (!S.guideQ.length && !Object.keys(S.rOpen).length) queueGuides(S, rStage(S), false);
    if (!S.gearAt) { S.gearAt = { start: 1 }; S.gearQ.unshift(3); }
    if (S.coach == null) { S.coach = trainNeed(S) ? 0 : 1; S.coachAt = 0; }
    S.rStage = rStage(S); renderRoutine(); renderLife(); renderLog(); selectTab('routine'); renderWant();
    Snd.play();
    setTimeout(() => { if (S.ticks === 0 && !S.done.firstnight) openEvent(firstEvent(S)); }, 600);
  }

  /* ---------- 함께 살기 화면 ---------- */
  const STATS = [['health', '건강', 'health'], ['bond', '유대', 'heart'], ['calm', '안정감', 'calm'], ['manners', '예절', 'manners'], ['social', '사회성', 'social'], ['joy', '기분', 'joy']];
  function weightWord(w) { return w < 34 ? '마름' : w < 60 ? '알맞음' : w < 70 ? '통통' : '비만'; }
  let wagFrame = 0, wagUntil = 0, heartUntil = 0;
  function renderDog() {
    if (!S) return; const s = S;
    const happy = s.st.joy > 55 || Date.now() < wagUntil;
    drawDog($('#lifeDog'), s.dog, { frame: happy ? wagFrame : 0, sleep: s.dead, senior: stage(s) === 'senior', pup: s.ageM < 6, happy, noZ: s.dead, heart: !s.dead && Date.now() < heartUntil });
  }
  setInterval(() => { if (!S || $('#life').hidden) return; const fast = Date.now() < wagUntil; wagFrame = fast ? 1 - wagFrame : (S.st.joy > 55 && rand() < .5 ? 1 - wagFrame : 0); renderDog(); }, 260);

  function renderLife() {
    const s = S; if (!s) return;
    if (!s.dead) Snd.health(s.st.health);
    const sc = sceneOf($('#lifeScene'));
    sc.set(s.dead ? 'sunset' : stage(s) === 'senior' && seasonOf(s.cal.m) !== 3 ? 'senior' : SEASON_ID[seasonOf(s.cal.m)]);
    $('#lifeName').textContent = s.dog.name;
    const subs = s.subs.filter(d => d.alive).map(d => d.name);
    $('#lifeMeta').textContent = `${s.dog.breed.name} · ${s.dog.sex}${s.route && RT().R[s.route.id] ? ` · ${RT().R[s.route.id].name}` : ''}${subs.length ? ` · ${subs.join(', ')}와 함께` : ''}`;
    skipGlow(s);
    $('#lifeAge').textContent = s.dead ? lifeText(s.ageM) : s.ageM < 6 ? `생후 ${weeksOf(s.ageM)}주` : ageText(s.ageM);
    $('#lifeWhen').textContent = `${s.cal.y}년 ${SEASONS[seasonOf(s.cal.m)]}`;
    const box = $('#stats');
    STATS.forEach(([k, label, ic]) => {
      let row = $(`[data-k="${k}"]`, box);
      if (!row) { row = document.createElement('div'); row.className = 'stat'; row.dataset.k = k; row.style.setProperty('--c', ICONS[ic][0]); row.innerHTML = `<i>${iconSVG(ic)}</i><span class="stat-l"><span>${label}<s class="tr"></s></span><b></b></span><span class="bar"><u></u></span>`; box.appendChild(row); }
      const tv = s.trend[k] || 0, tr = $('.tr', row); tr.textContent = tv > .6 ? '▲' : tv < -.6 ? '▼' : ''; tr.className = 'tr ' + (tv > .6 ? 'up' : tv < -.6 ? 'down' : '');
      const v = Math.round(s.st[k]); $('u', row).style.width = v + '%'; $('b', row).textContent = v; row.classList.toggle('low', v < 30 && (k === 'health' || k === 'calm' || k === 'joy'));
    });
    let wr = $('#weightRow');
    if (!wr) { wr = document.createElement('div'); wr.id = 'weightRow'; wr.className = 'weight-row'; wr.innerHTML = '<span>체중</span><span class="scale"><b></b><i></i></span><em></em>'; box.after(wr); }
    $('.scale i', wr).style.left = clamp(s.st.weight, 2, 98) + '%'; $('em', wr).textContent = weightWord(s.st.weight); wr.classList.toggle('low', s.st.weight >= 70 || s.st.weight < 34);
    const hb = $('#habits'); hb.innerHTML = '';
    const act = Object.entries(s.habits).filter(([, v]) => v >= .5).sort((a, b) => b[1] - a[1]);
    if (!act.length) hb.innerHTML = '<span class="habit none">눈에 띄는 문제 행동 없음</span>';
    act.forEach(([h, v]) => { const el = document.createElement('span'); el.className = 'habit'; const lv = v >= 2 ? 3 : v >= 1 ? 2 : 1; el.innerHTML = `${D.HABITS[h].name}<span class="pips" aria-label="${lv}단계">${'<i class="on"></i>'.repeat(lv)}${'<i></i>'.repeat(3 - lv)}</span>${s.plans[h] ? `<em>${({ reward: '연습 중', pro: '진료 중', aversive: '단호하게', manage: '관리 중', ignore: '지켜보는 중' })[s.plans[h]]}</em>` : ''}`; hb.appendChild(el); });
    { const tb = $('#trainBtn'), need = s.dead ? null : trainNeed(s), pupDone = !need && !s.dead && s.ageM < 24; tb.hidden = !need && !pupDone; tb.classList.toggle('act-main', need === 'main'); tb.classList.toggle('act-done', pupDone); const tl = $('span', tb); if (tl) tl.textContent = need === 'fix' ? '복습하기' : pupDone ? '이번 칸 끝' : '교육하기'; }
    renderMissionBar(s);
    const ph = $('#petHint'); if (ph) ph.hidden = s.dead || (s.petHint || 0) >= 2 || !!s.want || !!s.nudge || (s.coach != null && s.coach < 3);
    $('#consLabel').textContent = `이번 달 지킨 날 ${Math.round(s.cons * 30)}/30`;
    { const gl = $('#gearLine'); if (gl) { const ks = Object.keys(s.gear || {}); gl.hidden = !ks.length; gl.textContent = '들인 준비물 · ' + ks.map(k => GEAR[k].name).join(', '); } }
    const budget = Math.max(1.2, s.home.budget + s.budgetMod), used = routineLoad(s);
    const warn = $('#routineWarn'); warn.hidden = used <= budget; warn.textContent = '하루 여유보다 계획이 많다. 지키지 못하는 날이 늘어난다.';
    renderDog(); renderCoach();
  }

  function renderMissionBar(s) {
    const el = $('#missionBar'); if (!el) return;
    const on = missionsOn(s), all = missionsFor(s), okN = all.filter(m => (s.miss[m.id] || {}).st === 'ok').length;
    if (s.dead || !all.length) { el.hidden = true; return; }
    el.hidden = false;
    if (!on.length) { const need = trainNeed(s), done = s.ageM >= 24; el.className = 'mission-bar calm'; el.innerHTML = `<span class="mb-tag">미션</span><span class="mb-t"><b>${done ? '나이별 미션 끝' : '지금 걸린 미션 없음'}</b><em>완수 ${okN} / ${all.length}</em></span>${need ? `<span class="mb-go">${need === 'fix' ? '복습하기' : '교육하기'}</span>` : ''}`; return; }
    const m = on[0], p = Math.round(mProg(s, m)), urgent = mBy(s, m) - s.ageM < .7;
    el.className = 'mission-bar' + (urgent ? ' urgent' : '');
    el.innerHTML = `<span class="mb-tag">미션${on.length > 1 ? ` ${on.length}` : ''}</span><span class="mb-t"><b>${mDue(s, m)} ${mName(s, m)} ${m.to}%</b><em>지금 ${p}% · ${mLeft(s, m)}</em><span class="mb-bar"><u style="width:${Math.min(100, p / m.to * 100)}%"></u></span></span><span class="mb-go">교육하기</span>`;
  }
  function showMission(s, r, done) {
    const m = r.m;
    showResult({ kind: r.ok ? '미션 완수' : '미션 놓침', pick: `${mName(s, m)} ${m.to}% · ${mDue(s, m)}`, text: r.ok ? m.ok : m.no, fx: r.fx, done });
    if (r.ok && !s.slow) { fx.confetti(); Snd.sfx('good'); }
  }

  // 나이마다 생활 습관 칸이 열리고 바뀐다. 값(0·1·2)의 뜻은 같고 이름·설명·효과가 단계마다 다르다.
  const RF = {
    walk: ['기분·사회성이 내려가고 살이 붙는다.', '기분·사회성을 지킨다.', '기분·사회성·유대가 오르고 살이 빠진다. 하루 여유를 가장 많이 쓴다.'],
    play: ['기분이 덜 오른다.', '기분·유대를 지킨다.', '기분·유대가 오른다.'],
    train: ['배운 것(앉아·부르면 오기·줄 걷기)을 천천히 잊는다. 예절이 내려간다.', '예절이 천천히 오른다.', '예절·안정감이 오르고 배운 것을 지킨다. 하루 여유를 쓴다.'],
    treat: ['살이 빠지고 기분은 덜 오른다.', '기분·체중이 그대로다.', '기분이 오르지만 살이 찐다.'],
    check: ['병이 생겨도 늦게 안다.', '병을 일찍 찾을 기회가 1년에 한 번.', '병을 일찍 찾을 기회가 가장 많고, 건강이 조금씩 오른다.'],
    teeth: ['치석이 쌓여 몇 년 뒤 잇몸병이 오기 쉽다.', '잇몸병 위험이 조금 준다.', '잇몸병 위험이 가장 많이 준다.'],
  };
  const PUP_PLAY = ['심심해서 기분이 덜 오른다.', '놀고 푹 잔다. 기분·유대를 지킨다.', '기분·유대가 오르지만, 지치면 입질이 는다. 아기는 하루 대부분을 자야 한다.'];
  const PUP_TRAIN = ['예절이 오르지 않는다.', '예절이 천천히 오른다.', '예절·안정감이 오른다. 아기는 짧게 끊어서 여러 번 하는 게 맞다.'];
  const PUP_TREAT = ['살이 덜 찌고 기분은 덜 오른다.', '기분·체중이 그대로다.', '기분이 오르지만 살이 찐다. 간식은 하루 먹는 양의 10% 안쪽이 권장된다.'];
  const VAX = ['건강이 내려간다. 이 상태로 바깥에 나가면 전염병에 걸릴 수 있다.', '건강을 지킨다.', '건강이 조금 더 오른다.'];
  const R3 = (k, h, o, fx, fresh) => ({ k, h, o, fx: fx || RF[k], fresh: fresh || 0 });
  const ROUTINE_BY = {
    baby: { name: '접종 전 아기 때', next: '생후 3개월 반이 되면 짧은 산책이 열린다.', rows: [
      R3('walk', '바깥 구경', ['집 안만', '안고 가끔', '안고 매일'], ['바깥 소리와 사람을 못 보고 자란다. 겁이 조금씩 굳는다.', '안긴 채로 세상을 본다. 사회성이 오르고 겁이 조금 준다.', '안긴 채로 매일 세상을 본다. 사회성이 많이 오르고 겁이 준다.']),
      R3('play', '놀이와 낮잠', ['조금', '보통', '많이'], PUP_PLAY),
      R3('train', '이름·손길 연습', ['안 함', '가끔', '하루 여러 번'], PUP_TRAIN),
      R3('treat', '훈련 간식', ['적게', '보통', '많이'], PUP_TREAT),
      R3('check', '예방접종', ['미루기', '일정대로', '접종+구충'], VAX),
    ] },
    pup: { name: '퍼피 때', next: '생후 6개월이 되면 양치가 열린다.', rows: [
      R3('walk', '짧은 산책', ['안 함', '하루 1번', '하루 2번'], ['기분·사회성이 내려간다. 여러 소리·사람에 익숙해질 때를 놓친다.', '기분·사회성을 지킨다. 지금은 거리보다 여러 소리와 사람을 보는 게 중요하다.', '기분·사회성·유대가 오른다. 하루 여유를 많이 쓴다.'], 1),
      R3('play', '놀이와 낮잠', ['조금', '보통', '많이'], PUP_PLAY),
      R3('train', '기본 연습', ['안 함', '가끔', '하루 여러 번'], PUP_TRAIN, 1),
      R3('treat', '훈련 간식', ['적게', '보통', '많이'], PUP_TREAT),
      R3('check', '접종 마무리', ['미루기', '일정대로', '접종+구충'], VAX, 1),
    ] },
    teen: { name: '청소년기', next: '두 살이 되면 성견 생활로 바뀐다.', rows: [
      R3('walk', '산책', ['안 함', '하루 1번', '하루 2번'], null, 1),
      R3('play', '놀이', ['조금', '보통', '많이']),
      R3('train', '복습', ['안 함', '가끔', '매일 10분'], null, 1),
      R3('treat', '간식', ['적게', '보통', '많이']),
      R3('check', '건강검진', ['안 함', '1년에 1번', '6개월마다'], null, 1),
      R3('teeth', '양치', ['안 함', '주 2~3번', '매일'], null, 2),
    ] },
    adult: { name: '성견', next: '노견이 되면 산책·놀이·식단·검진이 바뀐다.', rows: [
      R3('walk', '산책', ['안 함', '하루 1번', '하루 2번']),
      R3('play', '놀이', ['조금', '보통', '많이']),
      R3('train', '복습', ['안 함', '가끔', '매일 10분']),
      R3('treat', '간식', ['적게', '보통', '많이']),
      R3('check', '건강검진', ['안 함', '1년에 1번', '6개월마다']),
      R3('teeth', '양치', ['안 함', '주 2~3번', '매일']),
    ] },
    senior: { name: '노견', next: '', rows: [
      R3('walk', '천천히 산책', ['안 함', '짧게 1번', '짧게 2번'], ['근육이 빠져 건강이 내려간다.', '근육과 기분을 지킨다.', '근육·기분을 지키고 건강이 조금 오른다. 관절이 아픈 날은 줄인다.'], 1),
      R3('play', '냄새 놀이', ['조금', '보통', '많이'], ['머리 쓸 일이 줄어든다.', '기분·안정감을 지킨다.', '안정감이 오르고 머리를 쓴다. 밤에 서성이는 일이 늦게 온다.'], 1),
      R3('train', '아는 것 되짚기', ['안 함', '가끔', '매일 조금'], ['배운 것을 천천히 잊는다.', '배운 것을 지킨다.', '배운 것을 지키고 안정감이 오른다.'], 1),
      R3('treat', '식단', ['양 줄이기', '보통', '넉넉히'], ['살이 빠진다. 관절·심장 부담이 준다.', '체중이 그대로다.', '살이 찐다. 노견은 살이 붙으면 관절·심장에 바로 무리가 간다.'], 1),
      R3('check', '노견 검진', ['안 함', '1년에 1번', '6개월마다'], ['병이 생겨도 늦게 안다.', '병을 일찍 찾을 기회가 1년에 한 번.', '노견은 6개월마다 검진이 권장된다. 병을 일찍 찾을 기회가 가장 많다.'], 1),
      R3('teeth', '양치', ['안 함', '주 2~3번', '매일']),
    ] },
  };
  const RS_NOTE = {
    pup: '접종이 거의 끝났다. "바깥 구경"이 "짧은 산책"으로 바뀌었다. 여러 소리와 사람에 익숙해지기 좋은 때가 끝나 간다.',
    teen: '이가 다 났다. 생활 습관에 양치가 생겼다. 곧 사춘기라 배운 것도 잘 안 나올 수 있다.',
    adult: '다 컸다. 산책·놀이 양을 이 아이 힘에 맞춰 다시 정해 볼 때다.',
    senior: '노견이 됐다. 산책은 천천히, 놀이는 냄새 놀이로 바뀌었다. 식단과 검진도 다시 볼 때다.',
  };
  const routineRows = s => ROUTINE_BY[rStage(s)].rows;
  // 고르는 값마다 좋아지는 것과 나빠지는 것(applyRoutine·updateHealth·diseaseCheck에 실제로 들어간 효과만 적는다)
  function optFx(s, k, i) {
    const rs = rStage(s), T = traits(s.dog), big = s.dog.breed.size === 'L' && s.ageM < 12, pat = s.dog.breed.risks.includes('patella'), G = [], B = [];
    if (k === 'walk') {
      if (rs === 'baby') { if (i === 0) { G.push('전염병 걱정 없음'); B.push('겁이 굳음', '사회성▼'); } if (i === 1) G.push('사회성▲', '겁▼'); if (i === 2) { G.push('사회성▲▲', '겁▼▼'); B.push('겁 많은 아이는 오히려 겁▲'); if (!s.routine.check) B.push('접종 미루면 전염병 위험'); } }
      else if (rs === 'senior') { if (i === 0) B.push('근육 빠짐 → 건강▼'); if (i === 1) G.push('근육·기분 유지'); if (i === 2) { G.push('건강▲'); B.push('관절 부담▲'); } }
      else { if (i === 0) { G.push('하루 여유 남음'); B.push('사회성▼', '체중▲', '짖음·물어뜯기▲'); } if (i === 1) { G.push('사회성·기분 유지'); if (T.energy > .65) B.push('활동량 많은 견종엔 모자람'); } if (i === 2) { G.push('사회성▲', '유대▲', '체중▼'); B.push('하루 여유 많이 씀'); if (big) B.push('어린 대형견 관절 부담▲'); if (T.heat > .5) B.push('여름 한낮은 숨 가쁨'); } }
    }
    if (k === 'play') { if (i === 0) { G.push('하루 여유 남음'); B.push('기분▼', rs === 'senior' ? '머리 쓸 일 줄어듦' : '유대 덜 오름'); } if (i === 1) G.push('기분·유대 유지'); if (i === 2) { G.push('기분▲', rs === 'senior' ? '안정감▲' : '유대▲'); B.push('하루 여유 씀'); if (rs === 'baby' || rs === 'pup') B.push('지치면 입질▲'); else if (pat && rs !== 'senior') B.push('슬개골 부담▲'); } }
    if (k === 'train') { if (i === 0) { G.push('하루 여유 남음'); B.push('배운 것 잊음', '예절▼'); } if (i === 1) G.push('예절 천천히▲'); if (i === 2) { G.push('예절▲', '안정감▲', '배운 것 유지'); B.push('하루 여유 많이 씀'); } }
    if (k === 'treat') { if (i === 0) { G.push('체중▼', rs === 'senior' ? '관절·심장 부담▼' : '살 걱정 없음'); B.push('기분▼', '간식 교육 효과▼'); } if (i === 1) G.push('체중·기분 유지'); if (i === 2) { G.push('기분▲', '간식 교육 효과▲'); B.push(T.food > .65 ? '먹보 견종: 체중▲▲' : '체중▲'); } }
    if (k === 'check') { if (rs === 'baby' || rs === 'pup') { if (i === 0) B.push('건강▼', '바깥에 나가면 전염병 위험'); if (i === 1) G.push('건강 유지'); if (i === 2) { G.push('건강▲'); B.push('접종 날 처짐(기분▼)'); } }
      else { if (i === 0) { G.push('병원 갈 일 없음'); B.push('병을 늦게 앎'); } if (i === 1) G.push('병 일찍 찾을 기회'); if (i === 2) { G.push('병 일찍 찾을 기회▲', '건강▲'); if (s.dog.fear > .5) B.push('겁 많은 아이: 병원 스트레스'); } } }
    if (k === 'teeth') { if (i === 0) B.push(s.dog.breed.risks.includes('dental') ? '잇몸병 위험▲▲(잦은 견종)' : '잇몸병 위험▲'); if (i === 1) G.push('잇몸병 위험▼'); if (i === 2) { G.push('잇몸병 위험▼▼'); if (skillP(s, 'handle') < .3) B.push('몸 만지기 못 익혔으면 거부감▲'); } }
    return { G, B };
  }
  const fxHTML = f => f.G.map(t => `<span class="chip up">${t}</span>`).join('') + f.B.map(t => `<span class="chip down">${t}</span>`).join('');
  // 생활 습관 안내: 칸마다 한 번, 단계가 바뀌면 바뀐 칸만 다시 묻는다
  const GUIDE_ORDER = ['check', 'walk', 'play', 'train', 'treat', 'teeth'];
  function queueGuides(s, rs, changed) {
    const rows = ROUTINE_BY[rs].rows.filter(r => (changed ? r.fresh : true)).sort((a, b) => GUIDE_ORDER.indexOf(a.k) - GUIDE_ORDER.indexOf(b.k));
    rows.forEach((r, i) => { if (!s.guideQ.some(x => x.k === r.k)) s.guideQ.push({ k: r.k, note: i === 0 ? (changed ? RS_NOTE[rs] : '매일 할 일을 하나씩 정해요.') : '' }); });
  }
  function openGuide(s, gd) {
    const row = routineRows(s).find(r => r.k === gd.k); if (!row) return false;
    const B = ROUTINE_BY[rStage(s)], left = s.guideQ.length;
    const text = `${gd.note ? gd.note + ' ' : ''}${j(row.h, '은')} 어떻게 할까요?`;
    openPanel({ id: 'guide_' + gd.k, tag: '생활 습관', when: `${B.name}${left ? ` · 남은 안내 ${left}` : ''}`, text, noClose: true,
      items: row.o.map((t, i) => ({ cls: 'opt', html: `<b>${t}</b><span class="ofx">${fxHTML(optFx(s, gd.k, i))}</span>`, onPick: b => {
        s.routine[gd.k] = i; s.rOpen[gd.k] = 1; renderRoutine(); renderLife();
        const f = optFx(s, gd.k, i);
        // 안내는 이어서 연달아 묻는다(칸마다 한 칸씩 기다리면 다 큰 아이는 몇 해가 지나 버린다). 마지막에만 결과 카드
        panelPick(b, () => { if (dtOf(s) < 1 && s.guideQ.length) { toast(`${row.h}: ${t} · 다음 안내는 다음 주에`); resume(); return; } while (s.guideQ.length) { if (openGuide(s, s.guideQ.shift())) { toast(`${row.h}: ${t}`); return; } } showResult({ kind: '생활 습관', pick: `${row.h} · ${t}`, text: s.used.gdone ? (uniq(s, ['새 습관을 정했다. 몸에 붙는 데는 몇 주가 걸린다.', '정했다. 이제 매일 하는 일이 된다.', '달력에 적어 두었다.'], 'gn:') || '정했다.') : (s.used.gdone = 1, '생활 습관을 다 정했다. 아래 생활 습관 칸에서 언제든 바꿀 수 있다.'), extra: [...f.G.map(x => ({ t: x, good: true })), ...f.B.map(x => ({ t: x, good: false }))], done: resume }); });
      } })) });
    return true;
  }
  function renderRoutine() {
    const box = $('#routine'); box.innerHTML = ''; if (!S) return;
    const rs = rStage(S), B = ROUTINE_BY[rs]; S.rStage = S.rStage || rs; renderRoutine.at = rs;
    const head = document.createElement('p'); head.className = 'rstage';
    head.innerHTML = `<b>지금은 ${B.name}</b>${B.next ? `<span>${B.next}</span>` : ''}`; box.appendChild(head);
    const bud = document.createElement('div'); bud.className = 'budget'; bud.id = 'budget'; box.appendChild(bud);
    B.rows.forEach(({ k, h, o, fresh }) => {
      const open = !!S.rOpen[k];
      const fs = document.createElement('fieldset'); fs.className = 'seg' + (open ? '' : ' locked');
      const tag = !open ? '<em class="wait">안내가 오면 정해요</em>' : !fresh || S.rsChanged !== rs ? '' : `<em class="new">${fresh === 2 ? '새로' : '바뀜'}</em>`;
      fs.innerHTML = `<legend>${h}${tag}</legend>`;
      o.forEach((t, i) => {
        const id = `r-${k}-${i}`;
        const inp = document.createElement('input'); inp.type = 'radio'; inp.name = 'r-' + k; inp.id = id; inp.value = i; inp.checked = open && S.routine[k] === i; inp.disabled = !open;
        inp.addEventListener('change', () => { S.routine[k] = i; routineFx(); renderLife(); });
        const lb = document.createElement('label'); lb.htmlFor = id; lb.textContent = t;
        fs.append(inp, lb);
      });
      const fxp = document.createElement('p'); fxp.className = 'seg-fx'; fxp.id = 'fx-' + k; fs.appendChild(fxp);
      box.appendChild(fs);
    });
    routineFx();
  }
  function routineFx() {
    if (!S) return; const T = traits(S.dog), rs = rStage(S);
    routineRows(S).forEach(({ k, fx: F }) => {
      const el = $('#fx-' + k); if (!el) return; if (!S.rOpen[k]) { el.innerHTML = ''; return; } let t = F[S.routine[k]];
      if (k === 'walk' && rs !== 'baby' && rs !== 'senior' && S.routine.walk < 2 && T.energy > .65) t += ` ${S.dog.breed.name}에게는 모자랄 수 있다. 힘이 남으면 짖음·물어뜯기가 는다.`;
      if (k === 'walk' && rs !== 'baby' && S.routine.walk === 2 && T.heat > .5) t += ' 숨이 짧은 견종이라 여름 한낮은 피해야 한다.';
      if (k === 'treat' && S.routine.treat === 2 && T.food > .65) t += ' 먹을 것에 약한 견종이라 살이 더 빨리 찐다.';
      if (k === 'train' && S.ageM >= 7 && S.ageM <= 16) t += ' 사춘기라 배운 것도 잘 안 나온다. 이때 끊으면 더 많이 잊는다.';
      if (k === 'teeth' && S.routine.teeth < 2 && S.dog.breed.risks.includes('dental')) t += ` ${j(S.dog.breed.name, '은')} 잇몸병이 잦은 견종이다.`;
      el.innerHTML = `<span class="ofx">${fxHTML(optFx(S, k, S.routine[k]))}</span>`; el.appendChild(document.createTextNode(t));
    });
    renderBudget();
  }
  // 하루 여유: 계획이 여유를 넘으면 지키는 날이 줄어 모든 습관 효과가 같이 깎인다
  function renderBudget() {
    const el = $('#budget'); if (!el || !S) return;
    const budget = Math.max(1.2, S.home.budget + S.budgetMod), used = routineLoad(S), r = used / budget;
    el.className = 'budget' + (r > 1 ? ' over' : r > .85 ? ' tight' : '');
    el.innerHTML = `<span class="b-l">하루 여유</span><span class="b-bar"><u style="width:${Math.min(100, r * 100)}%"></u></span><span class="b-v">${r > 1 ? '넘침 · 지키는 날이 준다' : r > .85 ? '빠듯함' : '여유 있음'}</span>`;
  }
  function syncRoutine() { routineRows(S).forEach(({ k }) => { const el = $(`#r-${k}-${S.routine[k]}`); if (el) el.checked = true; }); routineFx(); }

  function renderLog() {
    if (!S) return; const ol = $('#diary'); ol.innerHTML = '';
    S.log.slice(0, 70).forEach(e => {
      const li = document.createElement('li'); li.className = 'k-' + e.kind; li.innerHTML = '<time></time><p></p>';
      $('time', li).textContent = e.when;
      const p = $('p', li);
      if (e.kind === 'mind') p.innerHTML = `<i class="ico">${iconSVG('paw')}</i>`;
      if (e.kind === 'love') p.innerHTML = `<i class="ico">${iconSVG('heart')}</i>`;
      p.appendChild(document.createTextNode(e.text));
      ol.appendChild(li);
    });
    syncRoutine();
  }
  function selectTab(which) {
    const r = which === 'routine';
    $('#tabRoutine').setAttribute('aria-selected', String(r)); $('#tabDiary').setAttribute('aria-selected', String(!r));
    $('#paneRoutine').hidden = !r; $('#paneDiary').hidden = r;
  }

  function bubble(text) {
    const b = $('#bubble'); b.textContent = fmt(text); b.hidden = false; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    const wb = $('#wantBubble'); if (wb) wb.hidden = true;
    clearTimeout(bubble.t); bubble.t = setTimeout(() => { b.hidden = true; renderWant(); }, 2200);
  }
  // 손길·간식·공에 대한 반응. 같은 문장은 다시 나오지 않고, 다 쓰면 말풍선 없이 몸짓만 남는다
  const PET = {
    scared: ['손이 올라가자 잠깐 움찔했다.', '손을 보고 귀를 뒤로 눕혔다가 천천히 다가왔다.', '몸을 낮춘 채 손 냄새부터 맡았다.', '쓰다듬는 동안 꼬리 끝만 아주 조금 움직였다.', '손이 멈추자 그제야 숨을 내쉬었다.'],
    tense: ['잠깐 굳었다가 손에 기댔다.', '처음엔 뻣뻣하더니 등이 조금씩 풀렸다.', '콧김을 한 번 내뿜고 엎드렸다.', '귀 뒤를 긁어 주자 눈을 반쯤 감았다.'],
    senior: ['눈을 감고 손바닥에 얼굴을 묻었다.', '하얗게 센 주둥이를 손등에 올려놓았다.', '쓰다듬는 손을 따라 천천히 고개를 돌렸다.', '숨소리가 느려지더니 그대로 잠들었다.', '꼬리가 바닥을 두 번 쓸었다.', '손을 떼자 눈을 뜨고 다시 손 쪽으로 머리를 밀었다.', '등뼈가 손에 만져졌다. 한참 그대로 쓰다듬었다.'],
    pup: ['손가락을 장난감인 줄 알고 물려다 핥았다.', '꼬리를 흔들다 엉덩이까지 같이 흔들렸다.', '배를 만지자 네 다리를 허우적거렸다.', '쓰다듬다 보니 품 안에서 잠들었다.', '귀를 만지자 고개를 갸웃했다.', '손에 매달려 장난을 걸다가 하품을 했다.'],
    close: ['발라당 누워 배를 보여 줬다.', '손을 멈추자 앞발로 손목을 툭 쳤다.', '턱 밑을 긁어 주자 뒷다리가 저절로 움직였다.', '무릎 위로 올라와 동그랗게 몸을 말았다.', '얼굴을 손에 비비고 크게 하품했다.', '등을 쓸어 주자 몸을 길게 늘였다.', '귀를 만지자 눈을 감고 고개를 기울였다.', '혀끝으로 손가락을 한 번 핥았다.', '옆구리를 바짝 붙이고 누웠다.'],
    base: ['꼬리를 흔들었다.', '머리를 손 쪽으로 들이밀었다.', '가만히 서서 쓰다듬는 손을 받았다.', '눈을 가늘게 떴다.', '몸을 한 번 털고 옆에 앉았다.', '손 냄새를 맡고 꼬리를 두 번 흔들었다.'],
  };
  const TREATL = {
    guard: ['간식을 물고 방석 밑에 숨겼다.', '간식을 물고 구석으로 가서 등을 돌리고 먹었다.', '간식을 문 채 이쪽을 한 번 보고 소파 뒤로 갔다.'],
    senior: ['천천히 오래 씹었다.', '작게 잘라 준 간식을 하나씩 먹었다.', '받아먹고 손바닥까지 핥았다.', '냄새를 한참 맡고 나서 조심스럽게 받았다.'],
    base: ['받자마자 삼켰다.', '씹지도 않고 넘겼다.', '앉으라고 하기도 전에 앉았다.', '간식 봉지 소리에 다른 방에서 뛰어왔다.', '코로 손바닥을 샅샅이 뒤졌다. 더는 없었다.', '바닥에 떨어진 부스러기까지 핥았다.', '받아 들고 한 바퀴 돌더니 먹었다.', '입가를 핥으며 다음 것을 기다렸다.', '간식을 내려놓고 냄새부터 오래 맡았다.'],
  };
  const BALLL = {
    senior: ['굴러가는 공을 눈으로만 따라갔다.', '공을 앞발로 한 번 건드리고 엎드렸다.', '공을 물고 와서 발치에 내려놓고 누웠다.', '몇 걸음 쫓아가다 돌아왔다. 그래도 꼬리는 흔들었다.'],
    aloof: ['공을 보고 보호자를 봤다. 안 가져왔다.', '공을 물고 자기 자리로 가 버렸다.', '두 번 가져오고 세 번째는 모른 척했다.', '공을 앞에 두고 앉아서 보호자가 가져가기를 기다렸다.'],
    base: ['공을 물고 와서 놓지 않았다.', '공을 놓고 엎드려서 다음을 기다렸다.', '공이 소파 밑으로 들어가자 낑낑거렸다.', '공을 쫓다 미끄러져 벽에 부딪혔다. 바로 일어났다.', '던지는 시늉만 하자 엉뚱한 쪽으로 달려갔다.', '공을 물고 집 안을 한 바퀴 돌았다.', '공을 공중에서 받았다. 본인도 놀란 얼굴이었다.', '공을 굴려 주자 앞발로 막아 세웠다.'],
  };
  function say(pool, alt) { const s = S; const t = uniq(s, pool, 'b:') || (alt && alt !== pool ? uniq(s, alt, 'b:') : null); if (t) bubble(t); }
  function petAction(kind) {
    const s = S; if (!s || s.dead) return; Snd.init();
    const eff = s.tapThisTick < 3; s.tapThisTick++;
    const cv = $('#lifeDog'); const sen = stage(s) === 'senior';
    // 개가 먼저 청한 것에 답해 주면 더 크게 남는다. 조를 때 간식을 주면 다음에 더 조른다.
    if (s.want && s.want.kind === kind) {
      s.want = null; s.cnt.met++; renderWant();
      const n = s.dog.name;
      if (kind === 'ball') { s.st.joy = clamp(s.st.joy + 3, 0, 100); s.st.bond = clamp(s.st.bond + 1.5, 0, 100); say(sen ? ['공을 몇 번 쫓다가 옆에 털썩 누웠다. 그래도 신났다.', '공을 굴려 주자 천천히 걸어가 물어 왔다.', '한 번 물어 오고는 숨을 고르며 웃는 얼굴을 했다.'] : ['공을 물고 와서 또 놓았다. 또, 또.', '기다렸다는 듯이 튀어 나갔다.', '공을 받아 들고 신이 나서 거실을 두 바퀴 돌았다.', '던지기도 전에 이미 반쯤 달려가 있었다.', '물어 온 공을 손바닥 위에 정확히 올려놓았다.']); flashStats({ joy: 3, bond: 1.5 }); popFx({ joy: 3, bond: 1.5 }); }
      if (kind === 'pet') { heartUntil = Date.now() + 1500; s.lastAct.pet = s.ageM; s.st.bond = clamp(s.st.bond + 2.5, 0, 100); s.st.calm = clamp(s.st.calm + 1.5, 0, 100); say([`${j(n, '은')} 눈을 가늘게 뜨고 손바닥에 머리를 밀어 넣었다.`, '기다렸다는 듯이 몸을 기대 왔다.', '쓰다듬자마자 옆으로 털썩 누웠다.', '손이 닿자 꼬리가 바닥을 탁탁 쳤다.', '한숨을 길게 쉬고 눈을 감았다.']); flashStats({ bond: 2.5, calm: 1.5 }); popFx({ bond: 2.5, calm: 1.5 }); }
      if (kind === 'treat') { s.cnt.beg++; s.st.joy = clamp(s.st.joy + 2, 0, 100); s.st.weight = clamp(s.st.weight + .8, 18, 96); say(['받자마자 다시 서랍 앞에 앉았다.', '삼키고 나서 바로 다음 것을 기다렸다.', '먹고 나서 서랍을 코로 한 번 더 밀었다.', '이번엔 손까지 핥고 돌아섰다.']); flashStats({ joy: 2 }); popFx({ joy: 2 }); }
      Snd.sfx(kind === 'pet' ? 'wag' : kind); wagUntil = Date.now() + 1800;
      fx.anim({ targets: cv, translateY: [0, -14, 0], duration: 520, easing: 'easeOutQuad' });
      return;
    }
    if (kind === 'pet') {
      s.lastAct.pet = s.ageM; if (s.nudge && s.nudge.kind === 'pet') { s.nudge = null; renderWant(); }
      s.cnt.pets++; if (eff) { s.st.bond = clamp(s.st.bond + 1.2, 0, 100); s.st.calm = clamp(s.st.calm + .6, 0, 100); }
      const P = PET, pool = s.dog.fear > .65 && s.style.punish >= 2 ? P.scared : s.st.calm < 30 ? P.tense : sen ? P.senior : s.ageM < 6 ? P.pup : s.st.bond > 65 ? P.close : P.base;
      say(pool, P.base); wagUntil = Date.now() + 1600; heartUntil = Date.now() + 1300; Snd.sfx('wag'); renderDog();
      // 눌렀을 때 무엇이 오르는지 보이게. 한 칸에 세 번이 넘으면 더는 안 오른다고 알려 준다
      if (eff) popFx({ bond: 1.2, calm: .6 }); else if (s.tapThisTick === 4) notice('이번 칸은 충분히 쓰다듬었어요', 'info');
      s.petHint = (s.petHint || 0) + 1; const ph = $('#petHint'); if (ph) ph.hidden = true; coachStep(s, 3);
      fx.anim({ targets: cv, translateY: [0, -12, 0, -5, 0], rotate: [0, -3, 3, 0], duration: 620, easing: 'easeOutQuad' });
    }
    if (kind === 'treat') {
      s.cnt.treats++; if (eff) { s.st.joy = clamp(s.st.joy + 1.5, 0, 100); s.st.weight = clamp(s.st.weight + .5, 18, 96); }
      say(s.habits.guard >= 1 ? TREATL.guard : sen ? TREATL.senior : TREATL.base, TREATL.base);
      Snd.sfx('treat'); fx.anim({ targets: cv, translateY: [0, -16, 0], duration: 520, easing: 'easeOutQuad' });
      if (eff) popFx({ joy: 1.5 });
    }
    if (kind === 'ball') {
      s.lastAct.ball = s.ageM; if (s.nudge && s.nudge.kind === 'ball') { s.nudge = null; renderWant(); }
      s.cnt.plays++; if (eff) { s.st.joy = clamp(s.st.joy + (sen ? .4 : 1.8), 0, 100); s.st.bond = clamp(s.st.bond + .5, 0, 100); }
      say(sen ? BALLL.senior : s.dog.breed.id === 'shiba' || s.dog.breed.id === 'jindo' ? BALLL.aloof : BALLL.base, BALLL.base);
      Snd.sfx('ball'); wagUntil = Date.now() + 1200;
      fx.anim({ targets: cv, translateX: [0, 20, -8, 0], duration: 700, easing: 'easeOutQuad' });
      if (eff) popFx({ joy: sen ? .4 : 1.8, bond: .5 }); else if (s.tapThisTick === 4) notice('이번 칸은 충분히 놀았어요', 'info');
    }
  }

  /* ---------- 작별 ---------- */
  function coatWord(dog) { if (dog.breed.id === 'mix') return lum(dog.look.c1) > .7 ? '연한 갈색' : lum(dog.look.c1) < .3 ? '까만' : '갈색'; return D.COAT[dog.breed.id] || '보드라운'; }

  function favOf(s) {
    const c = s.cnt, all = [['walk', c.walks * .5], ['ball', c.plays], ['pet', c.pets * .7], ['treat', c.treats * .8]];
    if (s._fav) return s._fav;
    return (s._fav = wpick(all.map(([k, w]) => ({ k, w: Math.max(1, w) }))).k);
  }
  // 돌봄 점수: 놓친 돌봄·혼낸 횟수·남은 버릇·지켜보기만 한 병·비만은 깎고, 미션 성공·유대는 더한다
  function careGrade(s) {
    const watched = s.decisions.filter(d => (d.id.startsWith('ill_') && d.i === 1) || (d.id.startsWith('dz_') && d.i === 2)).length;
    const hl = HKEYS().filter(h => s.habits[h] >= 1);
    const mk = Object.values(s.miss || {}), ratio = mk.length ? mk.filter(m => m.st === 'ok').length / mk.length : .5;
    const fails = mk.filter(m => m.st === 'no').length;
    const sc = clamp(Math.round(62 - (s.care || 0) * 1.5 - fails * 1.2 - s.style.punish * 2.5 - hl.length * 6 - watched * 7 - (s.st.weight >= 66 ? 8 : 0) + ratio * 28 + (s.st.bond - 50) * .35), 0, 100);
    return { sc, g: sc >= 65 ? 'good' : sc >= 40 ? 'mixed' : 'poor', watched, hl };
  }
  function letterLines(s) {
    if (s._letter) return s._letter;
    const n = s.dog.name, L = [];
    const P = pickOne, fav = favOf(s), se = SEASONS[seasonOf(s.cal.m)], CG = careGrade(s);
    L.push(xpick('lt0', [`나야, ${n}.`, `안녕, 나 ${j(n, '이야')}.`, `이거 읽고 있지? 나 ${n}.`, `${se}에 쓰는 편지야. 나 ${n}.`]));
    const src = s.dog.source.id;
    L.push(xpick('src_' + src, src === 'rehome' ? ['다른 이름으로 불리던 나를 데려와 줬지. 처음엔 옛 이름에도 고개가 돌아갔어. 나중엔 네가 부르는 이름만 들렸어.', '내 옛날 이름은 이제 기억 안 나. 네가 불러 준 이름만 남았어.', '전에 살던 집 냄새가 몸에 남아 있었지. 그게 다 빠질 때까지 너는 기다려 줬어.']
      : src === 'shelter' ? ['철창 맨 끝 칸에서 네가 쪼그려 앉았던 날 기억나. 네 손에서 처음 맡아 보는 좋은 냄새가 났어.', '보호소 냄새가 밴 나를 너는 그냥 안았어. 그게 시작이었어.', '보호소에서 나오던 날, 차 안에서 네 무릎에 오줌 쌌잖아. 그래도 안 내려놨지.']
        : src === 'petshop' ? ['유리창 너머로 네가 손을 흔들던 날 기억나. 그때는 그게 무슨 뜻인지 몰랐어. 이제는 알아.', '작은 칸 안에서 처음 너를 봤어. 네가 나를 고른 줄 알지? 사실 내가 먼저 꼬리를 흔들었어.', '유리 칸에서 나와 처음 밟은 바닥이 너희 집 거실이었어. 미끄러웠어.']
          : ['엄마 냄새가 나던 상자에서 나를 꺼내 준 손, 그게 너였어.', '형제들 사이에서 꼼지락거리던 나를 네가 골랐지. 나는 제일 작았어.', '처음 안겼을 때 네 심장 소리가 엄청 빨랐어. 나보다 더 떨었지?']));
    if (CG.g === 'poor') L.push(P([`${n}. 그 이름은 혼날 때 제일 많이 들었어.`, `네가 ${callName(n)} 하고 부르면, 나는 먼저 네 목소리가 화났는지부터 들었어.`, `${n}. 좋은 이름이야. 좀 더 자주 다정하게 불러 줬으면 좋았을 거야.`]));
    else L.push(P([`네가 지어 준 이름, ${n}. 처음엔 무슨 소리인지 몰랐어. 그런데 그 소리가 나면 꼭 좋은 일이 생겼어.`, `${n}. 네가 부르면 귀가 먼저 움직였어. 세상에서 제일 많이 들은 말이야.`, `네가 화났을 때도 ${callName(n)} 하고 부르면 끝은 늘 부드러웠어. 그거 다 알았어.`, `${n}. 짧은 이름이라 다행이야. 네가 하루에 백 번은 불렀으니까.`, `네가 지어 준 이름 말고도 나를 부르는 말이 많았지. 강아지, 아가, 얘. 다 나였어.`]));
    if (CG.g === 'poor') L.push({ walk: '산책 가자는 말을 기다리다 현관 앞에서 잠든 날이 많았어.', ball: '공을 물고 가도 네가 안 볼 때가 많았어. 그래도 또 가져갔어.', pet: '쓰다듬어 달라고 머리를 밀어 넣으면, 너는 이따가 하자고 했어.', treat: '간식은 많이 받았어. 근데 나는 간식보다 네가 놀아 주는 게 더 좋았어.' }[fav]);
    else L.push({ walk: P(['산책 나가기 전에 네가 목줄을 집으면, 그 소리만으로 하루가 좋았어.', '같이 걷던 길, 전봇대마다 내 냄새가 남아 있을 거야.']), ball: P(['공 던져 줄 때 네가 웃는 얼굴이 좋았어. 그래서 자꾸 가져다줬어.', '소파 밑에 굴러간 공, 아직 거기 있을 거야. 꺼내 줘.']), pet: P(['네 손이 머리에 닿으면 눈이 저절로 감겼어.', '네 무릎이 내 자리였어. 다른 데는 별로였어.']), treat: P(['간식 봉지 소리, 다른 방에서도 다 들렸어. 모른 척했지만.', '네가 몰래 주던 간식, 사실 그게 제일 맛있었어.']) }[fav]);
    const walks = Math.round(s.cnt.walks / 100) * 100;
    if (walks >= 100) L.push(P([`우리 같이 ${walks.toLocaleString('ko-KR')}번쯤 나갔대. 나는 숫자는 몰라. 매번 처음 나가는 날처럼 좋았던 것만 알아.`, `${walks.toLocaleString('ko-KR')}번이나 같이 걸었대. 비 오는 날도 있었지. 그날 젖은 발 닦아 준 거 기억해.`]));
    if (s.home.alone + s.aloneMod >= 8 && CG.g === 'poor') L.push(P(['네가 없는 낮은 너무 길었어. 창밖만 보다가 해가 졌어.', '현관 앞에서 기다리다 잠들고, 깨서 또 기다렸어. 그게 내 하루였어.']));
    else if (s.home.alone + s.aloneMod >= 8) L.push(pickOne(['네가 없는 낮은 길었어. 그래도 기다리는 건 힘들지 않았어. 너는 꼭 돌아왔으니까.', '엘리베이터 서는 소리가 세상에서 제일 좋은 소리였어.', '낮에는 창밖 구경하면서 기다렸어. 네 차 소리는 멀리서도 알았어.', '혼자 있는 낮엔 네 옷 위에서 잤어. 냄새가 나서 덜 심심했어.']));
    if (s.style.punish >= 3 && s.style.punish < 5) L.push('가끔 네가 큰 소리를 내면 무서웠어. 그래도 네가 손을 내밀면 꼬리가 먼저 움직였어. 나도 어쩔 수 없었어.');
    const fixed = Object.keys(s.resolvedAt).filter(h => s.plans[h] !== 'aversive' && D.HABITS[h]);
    const DOGSAY = { copro: '내 똥 먹던 때', tail: '내 꼬리 쫓아 빙빙 돌던 때', mount: '쿠션에 자꾸 올라타던 때', mark: '집 안 구석마다 쉬 묻히던 때', jump: '반가워서 네 얼굴까지 뛰어오르던 때', stranger: '손님만 오면 무서워서 짖던 때', handle: '발 만지면 으르렁대던 때', car: '차만 타면 떨던 때', chase: '고양이만 보면 튀어 나가던 때', outdoor: '현관 밖이 무서웠던 때', sep: '혼자 남으면 무서워서 울던 때', bark: '작은 소리에도 자꾸 짖던 때', guard: '밥그릇 지킨다고 으르렁대던 때', pull: '산책만 나가면 앞만 보고 끌던 때', reactive: '다른 개만 보면 겁이 나서 짖던 때', chew: '집 안 물건을 물어뜯던 때', nip: '네 손을 자꾸 물던 때', potty: '아무 데나 쉬하던 때' };
    if (fixed.length) L.push(`${DOGSAY[fixed[0]] || '말썽부리던 때'} 기억나? 너는 매일 같은 연습을 했어. 지루했을 텐데. 덕분에 나는 덜 무서웠어.`);
    const sub = s.subs.find(d => !d.pup);
    if (sub) L.push(`${j(sub.name, '이랑')} 지낸 것도 좋았어. 내 방석은 반만 양보했어.`);
    if (s.ms.trip) L.push('바다 기억나? 파도가 자꾸 쫓아와서 짖었잖아. 그 짠 냄새, 아직 코에 있어.');
    if (s.ms.stairs) L.push('계단을 못 올라갈 때 안아 줘서 고마워. 네 어깨에 턱 얹는 거, 사실 좋아했어.');
    if (s.ms.cog) L.push('나중엔 네 얼굴이 가끔 흐릿했어. 그래도 냄새로 알았어. 너였어. 늘 너였어.');
    if (s.flags.bucket) L.push('냉장고에 붙여 둔 종이, 나도 봤어. 글씨는 못 읽어. 그래도 다 나랑 하고 싶은 거였지? 그거면 됐어.');
    if (s.flags.floorSleep) L.push('바닥에 이불 깔고 옆에서 자 준 밤들, 하나도 안 춥더라.');
    if (s.ms.night) L.push(P(['우리 첫날 기억나? ', '처음 온 날 말이야. ']) + s.ms.night.t.replace(/\.$/, '') + '. 나는 그날 네 냄새를 처음 외웠어.');
    if ((s.care || 0) >= 10 && CG.g === 'mixed') L.push(P(['네가 많이 바빴던 거 알아. 그래도 저녁엔 꼭 왔잖아.', '가끔은 많이 심심했어. 그래도 네 발소리가 들리면 다 잊었어.']));
    const sick = Object.keys(s.ms).find(k => k.startsWith('ill_') || k.startsWith('dz_'));
    if (sick && !CG.watched) L.push(P(['병원은 무서웠어. 그래도 네가 안고 가 줘서 괜찮았어.', '아팠을 때 네가 밤새 옆에 있었지. 그 손 따뜻했어.', '약 먹기 싫어서 뱉었던 거, 미안해. 사실 간식인 줄 알았어.', '수의사 선생님 손은 차가웠는데 네 손은 따뜻했어.', '아픈 날엔 네가 바닥에 같이 누워 줬지. 그게 약보다 나았어.', '병원 대기실에서 네 무릎에 턱 얹고 있던 거, 그게 제일 안심됐어.']));
    if (CG.g === 'poor') L.push(P(['나는 너를 기다리는 게 일이었어. 하루 중 제일 긴 일.', '내 세상은 거의 다 너였어. 너한테 나는 아주 작은 일부였겠지.', '나는 늘 네 쪽을 보고 있었어. 너는 가끔만 나를 봤어.']));
    else L.push(P(['내 세상은 거의 다 너였어. 너한테 나는 일부였겠지만 괜찮아. 나는 그걸로 충분했어.', '너는 바깥에 할 일이 많았지. 나는 너 하나면 됐어.', '내가 아는 좋은 건 전부 네가 알려 준 거야.']));
    if (s.flags.finalHome) L.push(xpick('fh', ['마지막에 집에 있어서 좋았어. 네 냄새가 나는 데서 잠들 수 있었으니까.', '내 방석에서 떠나서 좋았어. 창밖 소리도, 네 발소리도 다 들렸어.', '마지막 며칠, 네가 출근 안 하고 옆에 있었지. 그게 제일 좋았어.']));
    else if (s.flags.finalEuth) L.push(xpick('fe', ['마지막에 네가 손을 잡고 있었잖아. 하나도 안 무서웠어. 정말이야.', '아프지 않게 해 줘서 고마워. 마지막에 들린 게 네 목소리라서 좋았어.', '그날 네가 내 귀에 계속 뭐라고 했지. 다 들렸어. 나도 사랑해.']));
    else if (s.flags.finalTreat) L.push(xpick('ft', ['병원은 싫었지만 네가 매일 왔잖아. 문 열리는 소리만 기다렸어.', '주삿바늘은 싫었어. 그래도 네가 끝까지 해 보려고 한 거 알아. 고마워.', '병원 담요에서 네 냄새가 났어. 집에서 가져온 거지? 그거 덮고 잘 잤어.']));
    else if (s.cause === 'accident') L.push(xpick('fa', ['인사도 못 하고 와서 미안해. 너 잘못 아니야. 그러니까 너무 오래 자책하지 마.', '갑자기 와서 놀랐지. 나도 놀랐어. 그래도 아침에 쓰다듬어 준 건 기억해.', '작별 인사를 못 했네. 대신 여기 적을게. 고마웠어, 정말.']));
    { const E = endingOf(s), RD = s.route && RT().R[s.route.id]; if (RD && E.tier) L.push(fmt(RD.letter[E.tier], s)); }
    {
      const bad = [], good = [];
      if ((s.care || 0) >= 12) bad.push(P(['솔직히 말할게. 기다리는 날이 너무 많았어. 공을 물고 가도 너는 다른 걸 보고 있었어.', '불러도 안 오는 날이 더 많았어. 그래서 나중엔 조르지 않았어.', '하루 종일 너만 기다렸는데, 너는 피곤하다고 했어. 그 말 많이 들었어.']));
      if (s.style.punish >= 5) bad.push(P(['네가 손을 들면 몸이 먼저 움츠러들었어. 그건 끝까지 안 고쳐졌어.', '큰 소리가 나면 지금도 꼬리가 말려. 그건 네가 가르쳐 준 거야.']));
      if (CG.watched) bad.push(P(['아팠을 때 하루 종일 혼자 끙끙 앓았어. 병원에 갔을 땐 이미 많이 아팠어.', '아프다고 계속 핥고 낑낑댔는데, 너는 괜찮아질 거라고만 했어.']));
      if (CG.hl.includes('sep')) bad.push('혼자 남으면 무서웠어. 그 무서움은 끝까지 그대로였어. 아무도 괜찮다고 가르쳐 주지 않았어.');
      else if (CG.hl.length) bad.push(`${D.HABITS[CG.hl[0]].name} 버릇, 나도 고치고 싶었어. 근데 어떻게 하는지 아무도 안 알려 줬어.`);
      if (s.st.weight >= 66) bad.push('몸이 무거워서 계단이 힘들었어. 간식은 좋았지만, 산책이 더 좋았을 거야.');
      if (s.accName && (s.care || 0) >= 6) bad.push('조금만 더 일찍 병원에 갔더라면, 우리 조금 더 같이 있었을까.');
      const mastered = Object.keys(s.skills || {}).filter(k => s.skills[k].p >= 75 && TR().SKILLS[k]);
      if (mastered.length >= 4) good.push(P([`${skName(s, mastered[0])}, 처음 해냈을 때 네가 박수 쳤잖아. 그 소리가 좋아서 또 했어.`, `네가 가르쳐 준 거 ${mastered.length}가지, 다 기억해. 칭찬받는 게 제일 좋았어.`]));
      const mOk = Object.values(s.miss || {}).filter(m => m.st === 'ok').length;
      if (mOk >= 5) good.push(P(['어릴 때 네가 하나씩 가르쳐 준 거, 다 기억해. 그 덕에 어디 가도 칭찬받았어.', '배변도, 기다려도, 부르면 오기도 다 너한테 배웠어. 제일 좋은 선생님이었어.']));
      if (!CG.hl.length) good.push(P(['나 말썽 거의 안 부렸지? 네가 일찍 알려 줘서야.', '손님들이 순하다고 했어. 그거 다 네 덕이야.']));
      if (s.st.bond >= 85) good.push(P(['네 옆이 세상에서 제일 편한 자리였어.', '눈만 마주쳐도 네가 뭘 하려는지 알았어. 너도 그랬지?']));
      if ((s.care || 0) <= 4) good.push(P(['부르면 늘 네가 있었어. 그게 당연한 줄 알았는데, 아니었더라.', '내가 찾을 때마다 네가 있었어. 한 번도 혼자라고 느낀 적 없어.']));
      if (ageY(s) > s.dog.breed.life && s.cause !== 'accident') good.push(P(['다른 개들보다 오래 살았대. 네가 잘 챙겨 줘서야.', '오래 같이 있어서 좋았어. 그건 네가 매일 챙겨 준 덕분이야.']));
      if (!CG.watched && s.decisions.some(d => (d.id.startsWith('ill_') && d.i === 0) || (d.id.startsWith('dz_') && d.i <= 1))) good.push('아팠을 때 바로 병원에 데려가 줘서 금방 나았어. 무서웠지만 네 품이라 괜찮았어.');
      if (CG.g === 'poor') L.push(...bad.slice(0, 3), P(['그래도 너를 미워하지는 않았어. 개는 그런 걸 잘 못해.', '그래도 나는 너밖에 몰랐어. 그래서 계속 기다렸어.']));
      else if (CG.g === 'mixed') L.push(...bad.slice(0, 1), ...shuffle(good).slice(0, 1));
      else L.push(...shuffle(good).slice(0, 2));
    }
    L.push(xpick('lt7', ['울지 마. 아니, 조금은 울어도 돼. 대신 너무 오래는 말고.', '내 방석은 빨아도 돼. 냄새는 내가 기억하고 있을게.', '밥 잘 먹어. 내가 옆에서 쳐다보지 않아도.']));
    L.push(xpick('lt8', ['언젠가 또 작은 아이가 너를 보고 꼬리를 흔들면, 모른 척하지 마. 나는 하나도 안 서운해.', '다음 아이한테는 내 얘기 많이 해 줘. 나 꽤 괜찮은 개였다고.', '산책길에서 나 닮은 개 보면 한 번 웃어 줘.']));
    L.push(P(['나는 먼저 가서 기다릴게. 네가 오는 날, 제일 먼저 달려갈게.', '거기서도 현관 앞에 앉아 있을게. 엘리베이터 소리 기다리면서.', '천천히 와. 나는 기다리는 거 잘해. 네가 가르쳐 줬잖아.']));
    if (CG.g === 'poor') L[L.length - 2] = P(['다음 아이한테는 나한테 못 해 준 거 해 줘. 약속해.', '다음 아이는 혼자 오래 두지 마. 나처럼 기다리게 하지 마.', '다음 아이가 아프면 바로 병원에 데려가 줘. 꼭.']);
    L.push(xpick('lt9', ['고마웠어. 많이 사랑해.', '사랑해. 냄새로도 알지?', '고마워. 너라서 다행이었어.', '또 만나. 그땐 내가 먼저 꼬리 흔들게.', '잘 지내. 정말이야.', '안녕. 오늘 저녁엔 일찍 자.']));
    return (s._letter = L);
  }

  function farewellChapters(s) {
    const n = s.dog.name, alive = s.subs.find(d => d.alive), bondHi = s.st.bond > 60;
    const day = [];
    const P1 = pickOne, homeA = [P1([['봄비가 내리던 오후였다.', '매미 소리가 시끄러운 여름 오후였다.', '은행잎이 떨어지던 오후였다.', '첫눈이 올 것 같은 저녁이었다.'][seasonOf(s.cal.m)], '그날 오후는 유난히 조용했다.']),
      { walk: `창가 이불 위에서 ${j(n, '은')} 산책길 쪽으로 코를 두고 있었다.`, ball: `머리맡에 좋아하던 공을 놓아 주었다. ${j(n, '은')} 코끝으로 한 번 밀었다.`, pet: `손을 얹자 ${n}의 꼬리 끝이 한 번 움직였다.`, treat: `좋아하던 간식 냄새를 맡게 해 줬다. ${j(n, '은')} 코를 벌름거렸다.` }[favOf(s)],
      P1(['가끔 눈을 떠서 보호자가 있는지 보고 다시 감았다.', '숨소리가 천천히, 고르게 이어졌다.', '부르면 귀만 한 번 움직였다.'])];
    const DAYP = {
      accident: [['인사할 시간이 없었다.', `아침에 나갈 때만 해도 ${j(n, '은')} 현관에서 꼬리를 흔들었다.`],
        ['병원에서 걸려 온 전화를 받고 뛰어갔다. 이미 늦었다.', '아침에 남긴 사료가 그릇에 그대로 있었다.'],
        ['너무 갑작스러워서 한참 동안 믿기지 않았다.', `손에는 ${n}의 목줄만 남았다.`]],
      euth: [['그날 아침, 정해 둔 길을 천천히 걸었다.', `${j(n, '은')} 화단 앞에서 한참 냄새를 맡았다. 아무도 재촉하지 않았다.`, '병원에서는 내내 손을 잡고 있었다. "괜찮아, 여기 있어." 그 말만 했다.'],
        ['약속한 날 아침, 좋아하던 간식을 봉지째 내밀었다.', `${j(n, '은')} 다 먹지는 못했다. 그래도 봉지 앞을 끝까지 지켰다.`, '진료실 담요 위에서 내내 귓가에 이름을 불러 줬다.'],
        ['그날은 맑았다. 병원 가는 길에 차 창문을 조금 열어 줬다.', `${j(n, '은')} 바람에 코를 내밀고 눈을 가늘게 떴다.`, '"천천히 하셔도 돼요." 수의사 말대로 아주 천천히 인사했다.']],
      treat: [['병원 창가 자리였다.', `면회가 끝나 갈 무렵, ${j(n, '이')} 고개를 들어 이쪽을 봤다.`, '유리문 너머로 손을 흔들었다. 그게 마지막 인사였다.'],
        ['새벽 네 시에 병원에서 전화가 왔다.', `택시 안에서 내내 ${n} 이름만 불렀다.`, `도착했을 때 ${j(n, '은')} 담요 위에서 이쪽으로 고개를 돌렸다. 기다리고 있었다.`],
        [`입원 열흘째, ${j(n, '은')} 수액 줄을 단 채 면회실로 걸어 나왔다.`, '몇 걸음 걷고는 보호자 발등에 턱을 얹었다.', '"오늘은 좀 더 계셔도 돼요." 간호사가 조용히 말했다.'],
        ['퇴원을 하루 앞둔 날이었다.', `집에 가면 줄 간식을 챙겨 갔다. ${j(n, '은')} 냄새를 맡고 꼬리를 한 번 흔들었다.`, '면회 시간이 끝나도 간호사는 나가라고 하지 않았다.']],
      home: [homeA,
        ['아침에 커튼을 열자 거실 끝까지 햇빛이 들어왔다.', `${j(n, '은')} 그 빛이 닿는 자리로 몸을 조금 옮겼다.`, '오전 내내 그 자리에서 졸았다.'],
        ['가족이 다 모인 저녁이었다.', `${j(n, '은')} 한 사람씩 냄새를 맡고 나서 방석에 누웠다.`, '아무도 텔레비전을 켜지 않았다.'],
        ['밤새 옆에 누워 있었다.', `새벽녘 ${j(n, '이')} 고개를 들어 보호자 얼굴을 한 번 핥았다.`, '그러고는 다시 턱을 내려놓았다.']],
    };
    const dmode = s.cause === 'accident' ? 'accident' : s.flags.finalEuth ? 'euth' : s.flags.finalTreat ? 'treat' : 'home';
    day.push(...xpick('day_' + dmode, DAYP[dmode]));
    { const RD = s.route && RT().R[s.route.id]; if (RD && s.cause !== 'accident') day.push(fmt(RD.last, s)); }
    if (s.cause !== 'accident') day.push(bondHi ? xpick('bh', [`마지막 숨을 쉴 때까지 ${j(n, '은')} 보호자 쪽으로 코를 두고 있었다.`, `${j(n, '은')} 보호자 손바닥에 턱을 얹은 채 편안해졌다.`, `마지막으로 꼬리 끝이 한 번, 아주 작게 움직였다.`, `이름을 부르자 눈을 한 번 맞추고, 천천히 감았다.`]) : xpick('bl', [`${j(n, '은')} 조용히 숨을 고르다가, 편안해졌다.`, `창밖 빛이 옮겨 가는 사이 ${j(n, '은')} 잠든 것처럼 떠났다.`, `${j(n, '은')} 길게 한숨을 쉬고 더는 움직이지 않았다.`]));
    { const T = lifeText(s.ageM - s.dog.adoptM); day.push(xpick('tg', [`${T}. 우리가 함께한 시간이었다.`, `같이 산 시간은 ${T}. 짧지 않았는데, 짧았다.`, `함께한 날을 세어 보니 ${T}${jong(T) ? '이었다' : '였다'}.`, `${j(T, '을')} 같이 살았다. 하루도 같은 날이 없었다.`])); }

    const after = shuffle(['밥그릇을 치우는 데 일주일이 걸렸다.', '문을 열 때마다 마중 나오던 발소리가 들리는 것 같았다.', '간식 봉지를 뜯다가 손이 멈췄다.', '산책 시간이 되면 습관처럼 현관을 봤다.', '엘리베이터에서 내릴 때 열쇠를 천천히 꺼내게 됐다.', '소파 끝 자리가 비어 있는 게 익숙해지지 않았다.', '밤에 발치가 허전해서 자주 깼다.']).slice(0, 2);
    if (favOf(s) === 'ball') after.push(xpick('af_ball', ['소파 밑에서 공이 하나 나왔다. 한참 손에 쥐고 있었다.', '침대 밑을 청소하다 침 묻은 공을 찾았다. 씻지 않고 창가에 올려 두었다.', '공원에서 굴러온 남의 집 공을 주워 던져 줬다. 손이 잠깐 떨렸다.']));
    else if (favOf(s) === 'walk') after.push(xpick('af_walk', ['혼자 그 산책길을 걸었다. 전봇대마다 발이 멈췄다.', '산책길 편의점 사장님이 요즘 왜 혼자냐고 물었다. 대답을 못 했다.', '늘 돌던 길을 한 바퀴 돌았다. 혼자 걸으니 생각보다 금방 끝났다.']));
    if (alive) after.push(`${j(alive.name, '은')} 한동안 ${n}의 방석 냄새를 맡다가 그 위에서 잤다.`);
    after.push(pickOne([`청소기를 돌리면 아직도 ${coatWord(s.dog)} 털이 나온다. 그 털은 버리지 못했다.`, `겨울 외투 주머니에서 ${coatWord(s.dog)} 털 한 뭉치가 나왔다.`, `차 뒷좌석에 ${coatWord(s.dog)} 털이 아직 붙어 있다. 세차를 미뤘다.`, `이불을 털다가 ${coatWord(s.dog)} 털을 보고 한참 앉아 있었다.`]));
    after.push(s.flags.album ? xpick('af_album', [`${n} 앨범은 아직 못 열어 봤다. 언젠가는 웃으면서 볼 수 있을 것이다.`, `${n} 앨범 첫 장만 열어 봤다. 졸린 얼굴이었다. 거기서 덮었다.`, `앨범 속 ${j(n, '은')} 늘 카메라 말고 보호자를 보고 있었다.`]) : xpick('af_thing', ['목줄은 아직 그 자리에 걸려 있다.', '휴대폰 사진첩의 절반이 아직 그 얼굴이다.', '현관 신발장 위 인식표를 치우지 못했다.', '방석은 빨아서 개어 두었다. 버리지는 못했다.', '동물병원에서 정기검진 알림 문자가 왔다. 한참 화면을 봤다.']));
    after.push(xpick('af_end', [`어느 날부터는 울지 않고 ${j(n, '을')} 부를 수 있게 됐다. 그러고 나니 좋았던 날들이 먼저 떠올랐다.`, `몇 달이 지나자 ${n} 이야기를 웃으면서 할 수 있게 됐다.`, `친구가 ${n} 얘기를 꺼냈다. 이번엔 울지 않고 끝까지 들었다.`, `산책하는 개를 보면 이제 먼저 웃음이 났다. ${n}도 저렇게 걸었지.`, `${n}의 생일에 좋아하던 간식을 하나 샀다. 그건 아직 찬장에 있다.`]));

    const fv = favOf(s), bridge = [xpick('br0', ['무지개다리 너머에는 아프지 않은 개들이 산다고 한다.', '무지개다리 건너에는 늘 산책하기 좋은 날씨가 이어진다고 한다.', '무지개다리 너머 들판에는 목줄이 필요 없다고 한다.']),
      xpick('bf_' + fv, { walk: [`거기서 ${j(n, '은')} 끝없는 산책길을 걷는다. 전봇대마다 냄새를 맡는다.`, `거기서 ${j(n, '은')} 목줄 없이 들판 끝까지 걸어갔다가 돌아온다.`], ball: [`거기서 ${j(n, '은')} 공을 쫓아 들판을 달린다. 다리가 하나도 안 아프다.`, `거기서 ${j(n, '은')} 공을 물고 와서 내려놓을 사람을 찾는다. 아직은 없다.`], pet: [`거기서 ${j(n, '은')} 햇볕 드는 자리에 누워 낮잠을 잔다. 꿈속에서 누가 머리를 쓰다듬는다.`, `거기서 ${j(n, '은')} 바람이 털을 쓸어 줄 때마다 눈을 감는다. 손길 같아서.`], treat: [`거기서 ${j(n, '은')} 간식 나무 밑에 앉아 있다. 그래도 네가 주던 게 더 맛있다고 생각한다.`, `거기서 ${j(n, '은')} 먹어도 먹어도 배가 안 부르다. 그래도 가끔 네 손바닥 냄새가 그립다.`] }[fv]),
      xpick('br2', ['그래도 가끔은 다리 끝에 가서 앉아, 건너올 사람을 기다린다.', '친구들이 뛰어놀자고 해도, 하루에 한 번은 다리 끝을 보러 간다.', '다리 끝 바람이 불어오는 쪽에 귀를 세우고 앉아 있다.']),
      xpick('br3', ['아주 오랜 시간이 지난 어느 날, 바람에 익숙한 냄새가 실려 온다.', '어느 저녁, 다리 위로 낯익은 발소리가 들린다.', '그러던 어느 날, 멀리서 이름을 부르는 소리가 난다.', '수많은 계절이 지나고, 다리 끝에 누군가 서 있다.']), `${j(n, '은')} 벌떡 일어나 달려간다. ${xpick('br4', ['꼬리가 먼저 움직인다.', '귀가 뒤로 납작하게 젖혀진다.', '처음 만난 날처럼 고개를 갸웃한다.'])}`, xpick('br5', ['"왔어? 오래 기다렸어. 이제 같이 가자."', '"늦었잖아. 괜찮아, 이제 같이 걷자."', '"냄새 그대로네. 가자, 내가 길 알아."'])];
    return [
      { title: '마지막 날', mode: 'sunset', dog: { sleep: true, senior: true }, lines: day },
      { title: '그 뒤', mode: 'night', dog: null, items: true, lines: after, night: true },
      { title: `${n}의 편지`, mode: 'night', dog: null, letter: letterLines(s), night: true },
      { title: '무지개다리', mode: 'rainbow', dog: { happy: true, halo: true, frame: 1 }, lines: bridge, wag: true },
    ];
  }

  // 빈 방석, 밥그릇, 목줄 (도트)
  function drawItems(canvas, dog) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height; ctx.clearRect(0, 0, W, H);
    const sc = 7, P = [];
    const cushion = ['....XXXXXXXXXX....', '..XXOOOOOOOOOOXX..', '.XOOIIIIIIIIIIOOX.', 'XOOIIIIIIIIIIIIOOX', 'XOOIIIIIIIIIIIIOOX', '.XOOOOOOOOOOOOOOX.', '..XXXXXXXXXXXXXX..'];
    cushion.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') P.push([x + 2, y + 13, ch === 'X' ? '#8E5546' : ch === 'O' ? '#C77B6B' : '#E39A88']); }));
    const hairC = dog.look.c1; [[7, 15], [11, 16], [14, 15]].forEach(([x, y]) => P.push([x, y, hairC]));
    const bowl = ['.XXXXXX.', 'XBBBBBBX', '.XXXXXX.'];
    bowl.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== '.') P.push([x + 23, y + 17, ch === 'X' ? '#5E8FB8' : '#9CCBEE']); }));
    [[22, 9], [23, 10], [24, 11], [24, 12], [25, 13], [26, 13], [27, 12], [27, 11]].forEach(([x, y]) => P.push([x, y, '#F0705A']));
    const ox = Math.round((W - 33 * sc) / 2), oy = H - 21 * sc;
    ctx.fillStyle = 'rgba(0,0,0,.18)'; ctx.fillRect(ox + 2 * sc, oy + 20 * sc, 30 * sc, Math.floor(sc / 2));
    P.forEach(([x, y, c]) => { ctx.fillStyle = c; ctx.fillRect(ox + x * sc, oy + y * sc, sc, sc); });
  }

  let fw = null;
  function startFarewell(s) {
    show('farewell'); Snd.mood('farewell'); Snd.sfx('end');
    fw = { s, i: 0, ch: farewellChapters(s) };
    playChapter();
  }
  function playChapter() {
    const c = fw.ch[fw.i], s = fw.s;
    const sc = sceneOf($('#fwScene')); sc.set(c.mode);
    if (c.mode === 'rainbow') Snd.mood('rainbow');
    const cv = $('#fwDog'); cv.parentElement.hidden = !c.dog && !c.items;
    if (c.dog) drawDog(cv, s.dog, c.dog); else if (c.items) drawItems(cv, s.dog);
    clearInterval(fw.wag); if (c.wag) { let f = 0; fw.wag = setInterval(() => { f = 1 - f; drawDog(cv, s.dog, { ...c.dog, frame: f }); }, 280); }
    const box = $('.fw-box'); box.classList.toggle('night', !!c.night);
    $('#fwChapter').textContent = c.title;
    const lines = $('#fwLines'); lines.innerHTML = ''; lines.classList.toggle('plain', !c.letter);
    if (c.letter) {
      const paper = document.createElement('div'); paper.className = 'fw-letter';
      c.letter.forEach(t => { const p = document.createElement('p'); p.textContent = t; paper.appendChild(p); });
      const sign = document.createElement('p'); sign.className = 'sign'; sign.textContent = `너의 ${s.dog.name}`; paper.appendChild(sign);
      lines.appendChild(paper);
      fx.anim({ targets: paper, opacity: [0, 1], translateY: [20, 0], duration: 1200, easing: 'easeOutExpo' });
    } else {
      c.lines.forEach(t => { const p = document.createElement('p'); p.textContent = t; p.style.opacity = REDUCED ? 1 : 0; lines.appendChild(p); });
      fx.anim({ targets: '#fwLines p', opacity: [0, 1], translateY: [8, 0], delay: (window.anime ? window.anime.stagger(1100, { start: 400 }) : 0), duration: 1200, easing: 'easeOutQuad' });
    }
    if (c.mode === 'rainbow') setTimeout(() => fx.confetti({ particleCount: 50, spread: 100, origin: { y: .25 }, colors: ['#F59A9A', '#F7C08A', '#F5E08F', '#A9DDA0', '#9CCBEE', '#B9A6E6'], gravity: .4, scalar: .8 }), 5200);
    const btn = $('#fwNext'); btn.textContent = fw.i === fw.ch.length - 1 ? `${s.dog.name}의 일생 보기` : '계속';
    btn.style.opacity = 0; btn.disabled = true;
    const wait = REDUCED ? 200 : c.letter ? 2600 : 900 + c.lines.length * 1100;
    clearTimeout(fw.t); fw.t = setTimeout(() => { btn.disabled = false; fx.anim({ targets: btn, opacity: [0, 1], duration: 600, easing: 'easeOutQuad' }); if (!window.anime || REDUCED) btn.style.opacity = 1; }, wait);
  }
  function nextChapter() {
    if (!fw) return; fw.i++;
    if (fw.i >= fw.ch.length) { clearInterval(fw.wag); Snd.mood('blank'); showEnd(fw.s); return; }
    playChapter();
  }

  /* ---------- 끝 ---------- */
  function ownerType(s) {
    const n = Math.max(1, s.hist.n); const w = s.hist.walk / n, tr = s.hist.train / n, tt = s.hist.treat / n, c = s.hist.cons / n;
    const st = s.style;
    if (st.punish >= 3 && st.punish > st.reward) return 'strict';
    if (tt >= 1.6) return 'snack';
    if (c < .62) return 'busy';
    if (w >= 1.6 && c >= .75) return 'steady';
    if (st.reward + st.pro >= 3 && tr >= 1.4 && c >= .7) return 'principled';
    if (tr < .5) return 'free';
    return 'plain';
  }
  function habitOutcome(s, h, i = 0) {
    const n = s.dog.name, plan = s.plans[h], cur = s.habits[h], res = s.resolvedAt[h];
    if (res != null && plan !== 'aversive') {
      const yrs = Math.max(1, Math.round((res - (s.firstAt[h] ?? res)) / 12)), when = yrs === 1 ? '1년쯤' : yrs + '년쯤';
      const how = plan === 'pro' ? [`진료를 받으며 연습했고, ${when} 지나자 거의 사라졌다.`, `병원에서 받은 숙제를 ${when} 했더니 잦아들었다.`]
        : plan === 'manage' ? [`피해 가며 지내다 보니 ${when} 뒤엔 잠잠해졌다.`, `부딪히지 않게 살다 보니 ${when} 지나 옅어졌다.`]
          : [`매일 조금씩 연습했고, ${when} 지나자 거의 사라졌다.`, `같은 연습을 ${when} 되풀이했다. 어느 날 보니 없었다.`, `${when} 걸렸다. 지루한 연습이었는데 통했다.`];
      return { k: 'res', t: how[i % how.length] };
    }
    if (plan === 'aversive') return { k: 'sup', t: `혼내면 잠깐 멈췄다. 대신 ${j(n, '은')} 손이 올라가면 움찔했다.` };
    if (cur >= 1) return { k: 'stay', t: plan === 'manage' ? '고치지는 못했다. 피해 가며 살았다.' : `끝까지 남았다. 그것도 ${n}${jong(n) ? '이었다' : '였다'}.` };
    return { k: 'fade', t: '언제부턴가 잘 보이지 않았다.' };
  }
  const HKEYS = () => Object.keys(D.HABITS).filter(h => h !== 'nip' && h !== 'potty');
  function biography(s) {
    const n = s.dog.name, P = [];
    P.push(`${n}. ${s.dog.breed.name}, ${s.dog.sex}. ${s.start.y}년 ${SEASONS[seasonOf(s.start.m)]}, ${ageText(s.dog.adoptM)}에 ${s.dog.source.name}에서 왔다. ${s.home.desc} 집이었다.`);
    const early = ['named', 'night', 'social', 'potty', 'nip', 'alone', 'neuter', 'anniv'].map(k => s.ms[k]?.t).filter(Boolean);
    if (early.length) P.push(early.join(' '));
    const hs = HKEYS().filter(h => s.peak[h] >= 1).sort((a, b) => (s.firstAt[a] ?? 0) - (s.firstAt[b] ?? 0)).slice(0, 3);
    if (hs.length) P.push(hs.map((h, i) => `${ageAround(s.firstAt[h] ?? s.ageM)} ${D.HABITS[h].desc}. ${habitOutcome(s, h, i).t}`).join(' '));
    const skip = new Set(['named', 'night', 'social', 'potty', 'nip', 'alone', 'neuter', 'anniv', 'stairs', 'cog', 'final', 'recall', ...HKEYS()]);
    const mid = Object.entries(s.ms).filter(([k]) => !skip.has(k)).sort((a, b) => a[1].age - b[1].age).map(([, v]) => v.t);
    if (mid.length) P.push(mid.join(' '));
    const late = ['stairs', 'cog', 'final'].map(k => s.ms[k]?.t).filter(Boolean);
    P.push([...late, `${lifeText(s.ageM)}을 살고 ${s.cause === 'accident' ? (s.accName ? `${j(s.accName, '으로')} 갑자기 떠났다.` : '갑작스러운 사고로 떠났다.') : `${j(s.causeText, '으로')} 떠났다.`}`].join(' '));
    const walks = Math.round(s.cnt.walks / 100) * 100;
    const WK = walks.toLocaleString('ko-KR');
    const closing = [pickOne([`특별한 날은 손에 꼽았다. 나머지는 아침에 나가고 저녁에 기다리던 날이었다. 같이 나간 산책은 대략 ${WK}번이었다.`, `같이 나간 산책은 대략 ${WK}번. 대부분은 기억도 잘 안 나는 평범한 날이었고, 그게 제일 좋았다.`, `기록해 둔 날보다 기록하지 않은 날이 훨씬 많았다. 산책은 대략 ${WK}번이었다.`, `산책 ${WK}번쯤, 밥은 그보다 훨씬 많이. 숫자로 적으면 그렇다. 숫자로는 다 안 적힌다.`])];
    if (s.style.punish >= 3) closing.push(`${j(n, '은')} 보호자를 좋아했다. 조금 무서워하기도 했다.`);
    else if (s.st.bond > 70) closing.push(`마지막까지 ${j(n, '은')} 보호자 쪽으로 고개를 돌렸다.`);
    P.push(closing.join(' '));
    return P;
  }

  function payloadOf(s) {
    const hs = HKEYS().filter(h => s.peak[h] >= 1).sort((a, b) => s.peak[b] - s.peak[a]).slice(0, 3).map(h => [h, habitOutcome(s, h).k]);
    const sc = scoreOf(s);
    return { v: 2, e: endingOf(s).id, sd: s.dog.seed, n: s.dog.name, a: Math.round(s.ageM), c: s.causeText, t: ownerType(s), w: Math.round(s.cnt.walks / 100) * 100, h: hs, sb: s.subs.length, pp: s.ms.pups ? 1 : 0, sc: [sc.right, sc.total] };
  }
  const b64 = { enc: o => btoa(unescape(encodeURIComponent(JSON.stringify(o)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''), dec: t => JSON.parse(decodeURIComponent(escape(atob(t.replace(/-/g, '+').replace(/_/g, '/'))))) };
  const OUT = { res: '고쳤다', sup: '겉으로만 멈췄다', stay: '끝까지 남았다', fade: '저절로 옅어졌다' };

  function cardPic(canvas, dog) {
    const ctx = canvas.getContext('2d'), W = canvas.width, H = canvas.height;
    const off = document.createElement('canvas'); off.width = Math.round(W / 4); off.height = Math.round(H / 4);
    const fake = { el: { getBoundingClientRect: () => ({ width: W, height: H }), dataset: {}, style: {} }, c: off, ctx: off.getContext('2d'), mode: 'rainbow', t: 30 };
    Object.setPrototypeOf(fake, Scene.prototype); fake.seed(); fake.draw();
    ctx.imageSmoothingEnabled = false; ctx.clearRect(0, 0, W, H); ctx.drawImage(off, 0, 0, W, H);
    const tmp = document.createElement('canvas'); tmp.width = 256; tmp.height = 168;
    drawDog(tmp, dog, { happy: true, halo: true, frame: 1 });
    ctx.drawImage(tmp, Math.round((W - 256) / 2), H - 168 - Math.round(H * .08));
  }
  function fillCard(el, dog, p) {
    cardPic($('canvas', el), dog);
    $('.card-name', el).textContent = p.n;
    $('.card-breed', el).textContent = `${dog.breed.name} · ${dog.sex}`;
    $('.card-life', el).textContent = `${lifeText(p.a)}을 살았다`;
    $('.card-cause', el).textContent = p.c === '교통사고' ? '갑작스러운 사고로 무지개다리를 건넜다' : `${j(p.c, '으로')} 무지개다리를 건넜다`;
    { const ce = $('.card-ending', el); if (ce) { const t = p.e ? endName(p.e) : ''; ce.textContent = t ? `결말 · ${t}` : ''; ce.hidden = !t; } }
    const T = D.TYPES[p.t] || D.TYPES.plain;
    $('.card-type', el).textContent = T.name; $('.card-typeline', el).textContent = T.line;
    const ul = $('.card-habits', el); ul.innerHTML = '';
    if (!p.h.length) { const li = document.createElement('li'); li.innerHTML = '<span>큰 문제 행동 없이 지냈다</span>'; ul.appendChild(li); }
    p.h.forEach(([h, k]) => { const li = document.createElement('li'); li.innerHTML = `<span>${D.HABITS[h].name}</span><b>${OUT[k]}</b>`; ul.appendChild(li); });
    $('.card-walks', el).textContent = `산책 약 ${p.w.toLocaleString('ko-KR')}번${p.sc && p.sc[1] ? ` · 연구 채점 ${p.sc[0]}/${p.sc[1]}` : ''}`;
  }

  function showEnd(s) {
    show('end');
    const p = payloadOf(s); fillCard($('#card'), s.dog, p);
    { const E = endingOf(s), C = endSave(E); $('#endKicker').textContent = `결말 · ${E.kicker}`; $('#endTitle').textContent = E.title; const el = $('#endLines'); el.innerHTML = ''; E.lines.forEach(t => { const q = document.createElement('p'); q.textContent = t; el.appendChild(q); }); $('#endCount').textContent = `${C.isNew ? '새 결말을 찾았어요 · ' : ''}찾은 결말 ${C.base}/${END_TOTAL()}${C.hid ? ` · 숨은 결말 ${C.hid}개` : ''}`; }
    $('#letterH').textContent = `${s.dog.name}의 편지`;
    const lt = $('#letter'); lt.innerHTML = '';
    letterLines(s).forEach(t => { const el = document.createElement('p'); el.textContent = t; lt.appendChild(el); });
    const sign = document.createElement('p'); sign.className = 'sign'; sign.textContent = `너의 ${s.dog.name}`; lt.appendChild(sign);
    renderImpact(s); renderReview(s); renderNext(s);
    const bio = $('#bio'); bio.innerHTML = '';
    biography(s).forEach(t => { const el = document.createElement('p'); el.textContent = t; bio.appendChild(el); });
    const n = Math.max(1, s.hist.n); const extra = [];
    if (s.dog.source.id === 'petshop') extra.push('petshop');
    if ((s.hist.walk + s.hist.train) / n < 1.2) extra.push('active');
    if (s.ms.weight || s.st.weight >= 66) extra.push('weight');
    const notes = [...new Set(['breedpct', ...s.notes, ...extra])].filter(k => D.NOTES[k]).slice(0, 3);
    const fl = $('#facts'); fl.innerHTML = '';
    notes.forEach(k => { const nn = D.NOTES[k]; const li = document.createElement('li'); li.innerHTML = '<p></p><cite></cite>'; $('p', li).textContent = nn.t; $('cite', li).textContent = nn.src; fl.appendChild(li); });
    fx.anim({ targets: '#card', rotate: [-6, -1.2], translateY: [30, 0], opacity: [0, 1], duration: 1000, easing: 'easeOutExpo' });
    fx.anim({ targets: '#end .reveal', opacity: [0, 1], translateY: [16, 0], delay: (window.anime ? window.anime.stagger(120, { start: 300 }) : 0), duration: 800, easing: 'easeOutExpo' });
  }
  // 선택 → 결과 관계도. 바로 생긴 변화 + 몇 달 뒤 돌아온 변화 + 그 선택으로 정한 버릇 대응이 끝에 어떻게 됐는지.
  const DIMS = [['life', '수명'], ['bond', '유대'], ['mind', '마음'], ['habit', '문제 행동']];
  function impactOf(s) {
    const E = D.EXPLAIN || {};
    return s.decisions.map(d => {
      const a = mergeFx(mergeFx({}, d.fx || {}), d.later || {}); const v = {};
      v.life = (a.life || 0) * 30 + (a.health || 0) * .3;
      v.bond = a.bond || 0;
      v.mind = (a.calm || 0) - (a.fear || 0) * 80;
      let hb = 0; if (a.hab) for (const h in a.hab) hb -= a.hab[h] * 12;
      (d.plans || []).forEach(h => { const k = habitOutcome(s, h).k; hb += k === 'res' || k === 'fade' ? 8 : k === 'sup' ? -8 : -6; });
      v.habit = hb;
      const tot = DIMS.reduce((t, [k]) => t + Math.abs(v[k]), 0);
      const label = (E[d.id] && E[d.id].topic) || d.t;
      return { d, v, tot, label };
    }).concat(trainImpact(s));
  }
  // 교육도 관계도에 한 줄씩: 버릇은 익힌 만큼, 마음과 유대는 방법에 따라
  function trainImpact(s) {
    const SK = TR().SKILLS; const out = [];
    for (const k in s.skills) {
      const sk = s.skills[k]; if (!sk.n || !SK[k]) continue;
      let rew = 0, avr = 0; for (const id in sk.by) { const m = SK[k].methods.find(x => x.id === id); if (!m) continue; if (m.kind === 'reward' || m.kind === 'pro') rew += sk.by[id]; if (m.kind === 'aversive' || m.kind === 'flood') avr += sk.by[id]; }
      const v = { life: 0, bond: rew * .8 - avr * 1.3, mind: (['social', 'alone', 'crate', 'handle'].includes(k) ? sk.p / 10 : 0) - avr * 2.5, habit: ['potty', 'nip', 'leash', 'handle', 'sit', 'alone', 'social'].includes(k) ? sk.p / 8 : 0 };
      const tot = Math.abs(v.bond) + Math.abs(v.mind) + Math.abs(v.habit);
      out.push({ d: { age: sk.first ?? s.dog.adoptM, t: `${SK[k].name} 교육 ${sk.n}번` }, v, tot, label: `교육 · ${SK[k].name}` });
    }
    return out;
  }
  function renderImpact(s) {
    const rows = impactOf(s).filter(r => r.tot >= 2).sort((a, b) => b.tot - a.tot).slice(0, 7).sort((a, b) => a.d.age - b.d.age);
    const wrap = $('.impact-wrap'); wrap.hidden = !rows.length; if (!rows.length) return;
    const n = s.dog.name;
    $('#impactLead').textContent = `${n}에게 크게 남은 선택 ${rows.length}가지와, 그 선택이 어디로 이어졌는지.`;
    const W = 340, rh = 46, H = Math.max(4 * 62, rows.length * rh) + 16;
    const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    const cut = (t, k) => (t.length > k ? t.slice(0, k - 1) + '…' : t);
    const ly = i => 8 + (H - 16) / rows.length * (i + .5);
    const ry = i => 8 + (H - 16) / 4 * (i + .5);
    const brMed = s.dog.breed.life, diffY = ageY(s) - brMed;
    const left = HKEYS().filter(h => s.habits[h] >= 1).length;
    const val = { life: `${lifeText(s.ageM)}`, bond: `마지막 ${Math.round(s.st.bond)}`, mind: `안정감 ${Math.round(s.st.calm)}`, habit: left ? `${left}개 남음` : '남은 것 없음' };
    let g = '';
    rows.forEach((r, i) => DIMS.forEach(([k], o) => {
      const v = r.v[k]; if (Math.abs(v) < 1.5) return;
      const y1 = ly(i), y2 = ry(o), w = (1.2 + Math.min(4.5, Math.abs(v) / 4)).toFixed(1);
      g += `<path d="M182 ${y1.toFixed(1)} C 212 ${y1.toFixed(1)}, 212 ${y2.toFixed(1)}, 242 ${y2.toFixed(1)}" fill="none" stroke="${v > 0 ? '#3E9A62' : '#D9563F'}" stroke-width="${w}" stroke-linecap="round" opacity=".72"/>`;
    }));
    rows.forEach((r, i) => {
      const y = ly(i);
      g += `<rect x="4" y="${(y - 19).toFixed(1)}" width="178" height="38" rx="10" fill="#FFF4E6"/>`;
      g += `<text x="12" y="${(y - 4).toFixed(1)}" font-size="10.5" fill="#625868">${esc(ageShort(r.d.age))}</text>`;
      g += `<text x="12" y="${(y + 11).toFixed(1)}" font-size="13" fill="#3A3240">${esc(cut(r.label, 13))}</text>`;
    });
    DIMS.forEach(([k, name], o) => {
      const y = ry(o);
      g += `<rect x="242" y="${(y - 22).toFixed(1)}" width="94" height="44" rx="12" fill="#3A3240"/>`;
      g += `<text x="289" y="${(y - 3).toFixed(1)}" font-size="13" fill="#FFFFFF" text-anchor="middle">${name}</text>`;
      g += `<text x="289" y="${(y + 13).toFixed(1)}" font-size="10.5" fill="#E9E2EE" text-anchor="middle">${esc(val[k])}</text>`;
    });
    $('#impactMap').innerHTML = `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="선택과 결과를 잇는 관계도">${g}</svg>`;
    const ul = $('#impactSum'); ul.innerHTML = '';
    const all = impactOf(s);
    DIMS.forEach(([k, name]) => {
      const top = all.filter(r => Math.abs(r.v[k]) >= 1.5).sort((a, b) => Math.abs(b.v[k]) - Math.abs(a.v[k]))[0];
      if (!top) return;
      const li = document.createElement('li');
      li.innerHTML = `<b>${name}</b><span></span>`;
      $('span', li).textContent = `${ageShort(top.d.age)}에 「${top.d.t}」. ${top.v[k] > 0 ? '가장 크게 좋아지게 했다.' : '가장 크게 깎았다.'}`;
      ul.appendChild(li);
    });
    if (s.cnt.asks) {
      const li = document.createElement('li'); li.innerHTML = '<b>조를 때</b><span></span>';
      $('span', li).textContent = `${j(n, '이')} 먼저 청한 ${s.cnt.asks}번 중 ${s.cnt.met}번 답해 줬다.${s.cnt.beg >= 4 ? ' 간식을 조를 때 준 날이 많아서 조르는 날도 늘었다.' : ''}`;
      ul.appendChild(li);
    }
    const li = document.createElement('li'); li.innerHTML = '<b>일생</b><span></span>';
    $('span', li).textContent = `${s.dog.breed.name} 평균(${brMed}년)보다 ${Math.abs(diffY) < .3 ? '비슷하게' : `${Math.abs(diffY).toFixed(1)}년 ${diffY > 0 ? '더' : '덜'}`} 살았다.`;
    ul.prepend(li);
    { const c = s.care || 0, l2 = document.createElement('li'); l2.innerHTML = '<b>돌봄</b><span></span>';
      $('span', l2).textContent = c === 0 ? '놓친 돌봄이 한 번도 없었다.' : `놓친 돌봄 ${c}번. ${c >= 15 ? '그만큼 일찍 떠났을지도 모른다.' : c >= 6 ? '바쁜 날이 꽤 있었다.' : '그래도 대부분의 날을 곁에 있었다.'}`;
      li.after(l2); }
    { const CG = careGrade(s), l0 = document.createElement('li'); l0.className = 'cg-' + CG.g; l0.innerHTML = '<b>돌봄 결과</b><span></span>';
      $('span', l0).textContent = `${CG.sc}점. ${CG.g === 'good' ? '우여곡절이 있었지만 끝까지 잘 돌봤다.' : CG.g === 'mixed' ? '좋은 날도 아쉬운 날도 있었다.' : '많이 외로웠을 것이다. 편지에 그 마음이 남았다.'}`;
      ul.prepend(l0); }
  }
  // 준비물이 남긴 것: 아쉬움(안 들였는데 일이 났다)과 덕분에(들였고 일이 없었다)
  function careRegrets(s) {
    const out = [], n = s.dog.name, add = (cat, line) => out.push({ k: 'no', id: null, t: cat, line, cat: '기르며' });
    s.decisions.forEach(d => {
      if (d.id.startsWith('ill_') && d.i === 1) { const k = d.id.slice(4), I = ILL.pup[k] || ILL.acc[k]; if (I) add('병원', `${ageAround(d.age)} ${I.name} 때 하루를 지켜보기만 했다. 그때 바로 병원에 갔더라면.`); }
      if (d.id.startsWith('dz_') && d.i === 2) { const z = D.DISEASES[d.id.slice(3)]; if (z) add('병원', `${ageAround(d.age)} ${z.name} 진단을 받고도 지켜보기만 했다. 그때 치료를 시작했더라면.`); }
    });
    if (s.routine.check < 1) add('검진', '검진을 자주 거르고 살았다. 일 년에 한 번이라도 데려갔더라면.');
    const hk = Object.keys(s.habits).filter(h => s.habits[h] >= 1 && D.HABITS[h]);
    if (hk.length) add('교육', `${hk.slice(0, 2).map(h => D.HABITS[h].name).join('·')} 버릇이 끝까지 남았다. 어릴 때 조금 더 연습했더라면.`);
    const mNo = Object.values(s.miss || {}).filter(m => m.st === 'no').length;
    if (mNo) add('교육', `어릴 때 익힐 것 ${mNo}가지를 때를 놓쳤다. 그 나이에 가장 쉽게 배우는 것들이었다.`);
    if (s.style.punish >= 2) add('마음', `혼낸 날이 ${s.style.punish}번 있었다. 그때 한 번 더 기다려 줬더라면.`);
    if (s.st.weight >= 66) add('먹이', '살이 쪄서 걷는 걸 힘들어했다. 간식을 조금만 덜 줬더라면.');
    const hn = Math.max(1, s.hist.n); if (s.hist.walk / hn < .8) add('산책', '산책을 자주 못 나갔다. 짧게라도 매일 걸었더라면.');
    if (s.cnt.asks - s.cnt.met >= 4) add('마음', `${j(n, '이')} 먼저 다가온 ${s.cnt.asks}번 중 ${s.cnt.asks - s.cnt.met}번은 그냥 지나쳤다.`);
    if (!out.length) add('마음', '사진을 더 많이 찍어 둘 걸 그랬다. 매일 보던 얼굴이라 그럴 줄 몰랐다.');
    return out.slice(0, 3);
  }
  function nextRows(s) {
    const out = careRegrets(s);
    for (const id in GEAR) {
      const it = GEAR[id], r = (s.reg || {})[id], had = own(s, id);
      if (r && !r.had) out.push({ k: 'no', id, t: it.name, line: `${ageAround(r.age)} ${it.hit}. ${it.what}`, late: r.late, cat: it.catName });
      else if (had && !r && (!it.risk || it.risk(s))) out.push({ k: 'ok', id, t: it.name, line: it.thanks, cat: it.catName });
    }
    return out.sort((a, b) => (a.k === b.k ? 0 : a.k === 'no' ? -1 : 1)); // 정렬은 안정적이라 기르며 아쉬운 것이 맨 앞에 남는다
  }
  function renderNext(s) {
    const wrap = $('.next-wrap'); if (!wrap) return;
    const rows = nextRows(s); wrap.hidden = false;
    const nNo = rows.filter(r => r.k === 'no').length;
    $('#nextLead').textContent = nNo ? `${j(s.dog.name, '에게')} 미리 해 줬으면 좋았을 것 ${nNo}가지.` : '미리 들인 준비물이 제 몫을 했다.';
    $('#nextList').innerHTML = rows.map(r => { const P = r.id ? (D.PARTNERS || {})[GEAR[r.id].cat] : null; return `<li class="nx ${r.k}"><span class="nx-tag">${r.k === 'no' ? '그때 했더라면' : '덕분에'}</span><b>${esc(r.t)}</b><em>${esc(r.cat)}</em><p>${esc(fmt(r.line, s))}${r.late ? ' 그 뒤로 들였다.' : ''}</p>${P && P.url ? `<a class="nx-go" href="${esc(P.url)}" target="_blank" rel="noopener">${esc(P.name)} 보기</a>` : ''}</li>`; }).join('');
  }
  // 시험지 채점처럼: 내가 고른 것, 그 뒤 생긴 일, 연구가 말하는 것
  const GRADE = ['연구에서 덜 나았던 쪽', '상황에 따라', '연구에서 더 나았던 쪽'];
  function scoreOf(s) {
    const E = D.EXPLAIN || {}; const seen = new Set(); const items = [];
    s.decisions.forEach(d => { const e = E[d.id]; if (!e || seen.has(d.id)) return; seen.add(d.id); items.push({ d, e, g: (e.grade || [])[d.i] ?? 1 }); });
    const right = items.filter(x => x.g === 2).length;
    return { items, right, total: items.length };
  }
  function renderReview(s) {
    const { items, right, total } = scoreOf(s);
    $('#reviewScore').innerHTML = total ? `연구에서 더 나았던 쪽을 고른 선택 <b>${right} / ${total}</b>. 대부분 설문으로 본 연관이라 정답이 하나인 문제는 드물다. 다만 쌓이면 개가 달라진다.` : '';
    const ol = $('#review'); ol.innerHTML = '';
    items.sort((a, b) => a.d.age - b.d.age).forEach(({ d, e, g }) => {
      const li = document.createElement('li');
      li.innerHTML = '<p class="rv-q"></p><p class="rv-a"><span></span><span class="grade"></span></p><p class="rv-after"></p><p class="rv-why"></p><cite></cite>';
      $('.rv-q', li).textContent = `${ageText(d.age)} · ${e.topic}`;
      $('.rv-a span', li).textContent = d.t;
      const gr = $('.grade', li); gr.textContent = GRADE[g]; gr.classList.add('g' + g);
      const after = s.echoes[d.id] || d.res; const af = $('.rv-after', li); af.textContent = after ? `그 뒤: ${after}` : ''; af.hidden = !after;
      $('.rv-why', li).textContent = e.why; $('cite', li).textContent = e.src || '';
      const all = mergeFx(mergeFx({}, d.fx || {}), d.later || {}); const ch = fxChips(all, true);
      if (ch.length) { const fxd = document.createElement('div'); fxd.className = 'rv-fx'; fxd.innerHTML = chipsHTML(ch); af.after(fxd); }
      ol.appendChild(li);
    });
    const tr = renderTrainReview(s);
    $('.review-wrap').hidden = !total && !tr;
  }
  // 교육: 무엇을 몇 번, 주로 어떤 방법으로 했고, 연구는 그 방법을 어떻게 보나
  function trainScore(s) {
    const G = TR().GRADE, SK = TR().SKILLS; const rows = [];
    for (const k in s.skills) {
      const sk = s.skills[k]; if (!sk.n || !SK[k]) continue;
      const main = Object.entries(sk.by).sort((a, b) => b[1] - a[1])[0][0];
      const g = (G[k] || {})[main] ?? 1;
      rows.push({ k, sk, main, g, m: SK[k].methods.find(x => x.id === main) });
    }
    return { rows, right: rows.filter(r => r.g === 2).length };
  }
  function renderTrainReview(s) {
    const { rows, right } = trainScore(s), G = TR().GRADE, SK = TR().SKILLS, n = s.dog.name;
    const ol = $('#trainReview'); ol.innerHTML = '';
    $('#trainH').hidden = false;
    const soc = s.skills.social;
    const early = soc && soc.early ? ` 세상 구경은 생후 12주 전에 ${soc.early}번 했다.` : s.dog.adoptM < 2.8 ? ' 생후 12주 전, 사회화가 가장 잘 되는 때에 세상 구경을 하지 않았다.' : '';
    const mAll = missionsFor(s), mOk = mAll.filter(m => (s.miss[m.id] || {}).st === 'ok').length, mTxt = mAll.length ? ` 나이별 미션은 ${mAll.length}개 가운데 <b>${mOk}개</b>를 기한 안에 해냈다.` : '';
    $('#trainScore').innerHTML = (rows.length ? `가르친 것 ${rows.length}가지 가운데, 주로 쓴 방법이 연구에서 더 나았던 쪽인 것 <b>${right} / ${rows.length}</b>.${early}` : `${j(n, '에게')} 따로 가르친 것은 없었다.${early}`) + mTxt;
    rows.forEach(({ k, sk, main, g, m }) => {
      const li = document.createElement('li'); const e = G[k] || {};
      li.innerHTML = '<p class="rv-q"></p><p class="rv-a"><span></span><span class="grade"></span></p><p class="rv-after"></p><p class="rv-why"></p><cite></cite>';
      $('.rv-q', li).textContent = `${SK[k].name} · ${sk.n}번 연습 · 익힘 ${Math.round(sk.p)}%`;
      $('.rv-a span', li).textContent = m.t;
      const gr = $('.grade', li); gr.textContent = GRADE[g]; gr.classList.add('g' + g);
      const other = Object.keys(sk.by).filter(x => x !== main).map(x => SK[k].methods.find(y => y.id === x).t);
      const af = $('.rv-after', li); af.textContent = other.length ? `그 밖에 써 본 방법: ${other.join(' / ')}` : ''; af.hidden = !other.length;
      $('.rv-why', li).textContent = e.why || ''; $('cite', li).textContent = e.src || '';
      ol.appendChild(li);
    });
    return rows.length;
  }

  function linkFor(p) { const u = new URL(location.href); u.search = ''; u.hash = ''; u.searchParams.set('r', b64.enc(p)); return u.toString(); }

  async function shareLink() {
    const p = payloadOf(S); const url = linkFor(p);
    const T = D.TYPES[p.t] || D.TYPES.plain;
    const text = `우리 집 ${S.dog.breed.name} ${j(S.dog.name, '은')} ${lifeText(p.a)}을 살고 무지개다리를 건넜다. 나는 '${T.name}'이었다. 같은 아이를 데려가면 너는 어떻게 키울까.`;
    if (navigator.share) { try { await navigator.share({ title: '우리 집에 온 아이', text, url }); return; } catch (e) { if (e && e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); toast('링크를 복사했다. 카톡 대화창에 붙여 넣으면 된다.'); }
    catch (e) { window.prompt('이 주소를 복사해서 보내 주세요', url); }
  }
  async function saveImage() {
    if (!window.htmlToImage) { toast('사진 저장을 불러오지 못했다. 화면을 캡처해 주세요.'); return; }
    try {
      const url = await window.htmlToImage.toPng($('#card'), { pixelRatio: 2, backgroundColor: '#FFFFFF', cacheBust: true });
      const a = document.createElement('a'); a.href = url; a.download = `${S.dog.name}-일생.png`; a.click();
    } catch (e) { toast('사진을 만들지 못했다. 화면을 캡처해 주세요.'); }
  }
  function toast(t) { const el = $('#toast'); el.textContent = t; el.hidden = false; clearTimeout(toast.t); toast.t = setTimeout(() => { el.hidden = true; }, 2600); }

  function showShared(p) {
    const dog = newDog(p.sd, p.n); shared = p;
    show('shared');
    fillCard($('#sharedCard'), dog, p);
    $('#sharedTitle').textContent = `친구가 키운 ${dog.name}`;
    $('#sameBtn').textContent = `같은 아이 데려와 보기`;
    $('#sameNote').textContent = `같은 견종, 같은 타고난 성격으로 온다. 이름은 새로 지어 줄 수 있다. 달라지는 건 사는 집과 키우는 방식이다.`;
  }

  /* ---------- 연결 ---------- */
  function bind() {
    $('#soundBtn').addEventListener('click', () => { Snd.toggle(); if (Snd.on) Snd.init(); });
    $('#startBtn').addEventListener('click', () => { Snd.init(); startAdopt(); });
    $('#againBtn').addEventListener('click', () => startAdopt());
    $('#nameForm').addEventListener('submit', nameDog);
    $('#arriveName').addEventListener('input', e => { $('#nameBtn').disabled = !e.target.value.trim(); });
    $('#lifeDog').addEventListener('click', () => petAction('pet'));
    $('#missionBar').addEventListener('click', openTrain);
    $('#skipBtn').addEventListener('click', skipAhead);
    $('#ballBtn').addEventListener('click', () => petAction('ball'));
    $('#walkBtn').addEventListener('click', openWalk);
    $('#trainBtn').addEventListener('click', openTrain);
    $('#tabRoutine').addEventListener('click', () => selectTab('routine'));
    $('#tabDiary').addEventListener('click', () => selectTab('diary'));
    $('.sheet-next').addEventListener('click', () => { showSheet(false); sheetOpen = false; renderLife(); schedule(); });
    $('#result').addEventListener('click', hideResult);
    $('.rs-skip').addEventListener('click', e => { e.stopPropagation(); hideResult(); skipAhead(); });
    // 이야기 더 보기: 펼치면 저절로 닫히지 않고 「닫기」를 눌러야 닫힌다
    $('.rs-more').addEventListener('click', e => {
      e.stopPropagation();
      const el = $('#result'), open = el.classList.toggle('open');
      $('.rs-more', el).textContent = open ? '접기' : '이야기 더 보기';
      if (open) { clearTimeout(showResult.t); const bar = $('.rs-bar', el); if (bar) bar.hidden = true; }
    });
    // 넘기기 버튼도 같은 줄에 있으므로 data-speed 가 있는 버튼만(없으면 배속이 NaN 이 되어 시간이 멈추지 않고 내달린다)
    $$('.speed button[data-speed]').forEach(b => b.addEventListener('click', () => {
      speed = Number(b.dataset.speed) || 1; paused = false;
      $$('.speed button[data-speed]').forEach(x => x.setAttribute('aria-pressed', String(Number(x.dataset.speed) === speed)));
      Snd.init(); schedule();
    }));
    $('#fwNext').addEventListener('click', nextChapter);
    $('#shareBtn').addEventListener('click', shareLink);
    $('#saveBtn').addEventListener('click', saveImage);
    $('#newBtn').addEventListener('click', () => { history.replaceState(null, '', location.pathname + (MUTE ? '?mute=1' : '')); Snd.stop(); Snd.mood('life'); startAdopt(); });
    $('#sameBtn').addEventListener('click', () => { Snd.init(); history.replaceState(null, '', location.pathname + (MUTE ? '?mute=1' : '')); startAdopt(shared.sd, shared.n); });
    $('#sharedNewBtn').addEventListener('click', () => { Snd.init(); history.replaceState(null, '', location.pathname + (MUTE ? '?mute=1' : '')); startAdopt(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTimeout(timer); if (Snd.ready) window.Tone.Transport.pause(); } else { schedule(); if (Snd.ready && Snd.on && (!$('#life').hidden || !$('#farewell').hidden || !$('#end').hidden)) window.Tone.Transport.start(); } });
    $$('[data-icon]').forEach(el => { el.innerHTML = iconSVG(el.dataset.icon); });
    $$('.scene').forEach(el => sceneOf(el));
    requestAnimationFrame(loop);
    renderSoundBtn();
  }

  function boot() {
    bind();
    const r = params.get('r');
    if (r) { try { showShared(b64.dec(r)); return; } catch (e) { /* 잘못된 링크면 처음 화면 */ } }
    show('intro');
    const demo = newDog('intro-' + Math.floor(rand() * 999));
    drawDog($('#introDog'), demo, { silhouette: true });
    sceneOf($('#intro .scene')).set(SEASON_ID[seasonOf(new Date().getMonth())]);
  }

  // 검수용
  window.__dog = { get S() { return S; }, draw: (cv, dog, o) => drawDog(cv, dog, o || {}), snd: () => ({ mood: Snd.moodName, ready: Snd.ready, drone: Snd.droneNote, bpm: window.Tone && Tone.Transport.bpm.value }), ageMood: () => { Snd.moodAt = 0; }, render: () => renderLife(), tick: () => tick(), die: () => S && die(S), next: () => nextChapter(), train: (k, m) => trainOnce(S, k, m), walk: id => walkOnce(S, id), traits: () => traits(S.dog), tscore: () => trainScore(S), score: () => scoreOf(S), effLife: () => effLife(S), closeAll: () => { hideResult(); showSheet(false); sheetOpen = false; }, quick: seed => { startAdopt(seed); S.dog.name = '시험'; S.done.firstnight = 1; startLife(); }, want: () => S.want, petAct: k => petAction(k), rw: () => renderWant(), avail: k => trainable(S, k), need: () => trainNeed(S), gear: () => S.gear, reg: () => S.reg, buy: id => gearBuy(S, id), nextRows: () => nextRows(S), tickMs: () => tickMs(S), end: () => showEnd(S), grade: () => careGrade(S), letter: () => letterLines(S), ending: () => endingOf(S), route: () => S.route, routeW: () => routeW(S), fw: () => fw && fw.ch.map(c => (c.lines || c.letter || []).join(" | ")), miss: () => S.miss, missions: () => missionsFor(S).map(m => ({ id: m.id, st: (S.miss[m.id] || {}).st, p: mProg(S, m), to: m.to, by: mBy(S, m), on: missionsOn(S).includes(m) })) };
  document.addEventListener('DOMContentLoaded', boot);
})();
