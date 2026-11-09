/* 우리 집에 온 아이: 데이터
   수치는 research.md 근거를 따른다. [가] 표시는 조사 확정 전 임시값. */
(function () {
  'use strict';
  const seasonIdx = s => { const m = s.cal.m; return m >= 2 && m <= 4 ? 0 : m >= 5 && m <= 7 ? 1 : m >= 8 && m <= 10 ? 2 : 3; };

  // 견종: w=국내 비중(%, 동물등록 누적 413만 마리 기준 상위 10종 확인, 나머지는 [가])
  // life=중앙 기대수명(McMillan 외 2024 Sci Rep, 영국 58만 마리). 진돗개는 자료 없음 [가]
  // size S/M/L, energy 1~5
  // t: 타고난 경향(0~1). sep 분리불안, bark 짖음, guard 자원 지키기, fear 겁, stub 고집
  // look: 도트 그림 변수
  const BREEDS = [
    { id: 'maltese', name: '말티즈', w: 17.1, size: 'S', energy: 3, life: 13.1, risks: ['patella', 'dental', 'mvd', 'trachea'],
      t: { sep: .5, bark: .6, guard: .3, fear: .4, stub: .3 },
      look: { c1: '#F7F3EC', c2: '#E2D8C8', ear: 'long', tail: 'over', snout: 1, leg: 3, len: 11, coat: 'long', pat: 'solid' } },
    { id: 'poodle', name: '토이 푸들', w: 13.3, size: 'S', energy: 4, life: 14.0, risks: ['patella', 'eye', 'dental'],
      t: { sep: .55, bark: .4, guard: .2, fear: .35, stub: .2 },
      look: { c1: '#B9773F', c2: '#8E552A', ear: 'long', tail: 'pom', snout: 2, leg: 4, len: 10, coat: 'curly', top: 'knot', pat: 'solid' } },
    { id: 'pomeranian', name: '포메라니안', w: 9.3, size: 'S', energy: 3, life: 12.2, risks: ['patella', 'trachea', 'dental'],
      t: { sep: .4, bark: .75, guard: .35, fear: .3, stub: .4 },
      look: { c1: '#E39A48', c2: '#C07A33', ear: 'erect', tail: 'over', snout: 1, leg: 2, len: 9, coat: 'plush', pat: 'solid' } },
    { id: 'mix', name: '믹스견', w: 19.9, size: 'M', energy: 3, life: 12.0, risks: ['dental', 'skin', 'cancer'],
      t: { sep: .4, bark: .45, guard: .3, fear: .45, stub: .35 },
      look: { c1: '#C9A27A', c2: '#7A5A3E', ear: 'half', tail: 'straight', snout: 2, leg: 3, len: 12, pat: 'patch' } },
    { id: 'chihuahua', name: '치와와', w: 2.9, size: 'S', energy: 3, life: 11.8, risks: ['patella', 'mvd', 'dental'],
      t: { sep: .45, bark: .7, guard: .45, fear: .55, stub: .4 },
      look: { c1: '#D9B48A', c2: '#B48C62', ear: 'bat', tail: 'curl', snout: 1, leg: 3, len: 9, pat: 'solid' } },
    { id: 'shihtzu', name: '시츄', w: 4.6, size: 'S', energy: 2, life: 12.8, risks: ['dental', 'eye', 'boas'],
      t: { sep: .35, bark: .35, guard: .35, fear: .3, stub: .5 },
      look: { c1: '#F4EEE4', c2: '#B08A5E', ear: 'long', tail: 'over', snout: 0, leg: 2, len: 11, coat: 'long', top: 'knot', topC: '#B08A5E', pat: 'shih' } },
    { id: 'bichon', name: '비숑 프리제', w: 6.1, size: 'S', energy: 3, life: 12.5, risks: ['patella', 'stones', 'skin'],
      t: { sep: .55, bark: .4, guard: .2, fear: .3, stub: .3 },
      look: { c1: '#FBF9F4', c2: '#EFE8DC', ear: 'drop', earC: '#FBF9F4', tail: 'over', snout: 1, leg: 3, len: 10, coat: 'curly', top: 'puff', pat: 'solid' } },
    { id: 'jindo', name: '진돗개', w: 3.6, size: 'M', energy: 4, life: 13.5, risks: ['skin', 'hypothy'],
      t: { sep: .3, bark: .3, guard: .5, fear: .45, stub: .7 },
      look: { c1: '#E8D2A8', c2: '#C9AE80', ear: 'erect', tail: 'curl', snout: 2, leg: 4, len: 13, pat: 'solid' } },
    { id: 'golden', name: '골든 리트리버', w: 1.5, size: 'L', energy: 4, life: 13.2, risks: ['hip', 'cancer', 'skin', 'otitis'],
      t: { sep: .4, bark: .2, guard: .15, fear: .2, stub: .15 },
      look: { c1: '#D9A456', c2: '#B9853B', ear: 'drop', tail: 'plume', snout: 3, leg: 4, len: 14, coat: 'feather', pat: 'solid' } },
    { id: 'labrador', name: '래브라도 리트리버', w: 1, size: 'L', energy: 4, life: 13.1, risks: ['hip', 'obesity', 'cancer', 'otitis'],
      t: { sep: .35, bark: .2, guard: .2, fear: .2, stub: .15 },
      look: { c1: '#E9CF98', c2: '#C9AC72', ear: 'drop', tail: 'low', snout: 3, leg: 4, len: 14, pat: 'solid' } },
    { id: 'corgi', name: '웰시코기', w: 1.5, size: 'M', energy: 4, life: 13.2, risks: ['ivdd', 'hip', 'obesity'],
      t: { sep: .35, bark: .6, guard: .35, fear: .25, stub: .45 },
      look: { c1: '#D9883E', c2: '#B86B28', ear: 'erect', tail: 'stub', snout: 2, leg: 2, len: 14, pat: 'corgi' } },
    { id: 'yorkie', name: '요크셔테리어', w: 3.5, size: 'S', energy: 3, life: 13.3, risks: ['patella', 'trachea', 'dental'],
      t: { sep: .4, bark: .7, guard: .4, fear: .35, stub: .45 },
      look: { c1: '#4F5866', c2: '#C99A5B', ear: 'erect', tail: 'straight', snout: 1, leg: 3, len: 10, coat: 'long', pat: 'tan' } },
    { id: 'dachshund', name: '닥스훈트', w: 1.2, size: 'S', energy: 3, life: 14.0, risks: ['ivdd', 'dental', 'obesity'],
      t: { sep: .45, bark: .65, guard: .5, fear: .4, stub: .6 },
      look: { c1: '#8A4A26', c2: '#5E3017', ear: 'long', tail: 'straight', snout: 3, leg: 1, len: 15, pat: 'solid' } },
    { id: 'shiba', name: '시바견', w: 1, size: 'M', energy: 3, life: 14.6, risks: ['skin', 'patella'],
      t: { sep: .25, bark: .3, guard: .6, fear: .4, stub: .8 },
      look: { c1: '#CF7A3A', c2: '#F3E4CC', ear: 'erect', tail: 'curl', snout: 2, leg: 3, len: 12, pat: 'urajiro' } },
    { id: 'cocker', name: '코카스파니엘', w: 1, size: 'M', energy: 4, life: 13.3, risks: ['otitis', 'eye', 'hypothy'],
      t: { sep: .4, bark: .4, guard: .65, fear: .35, stub: .35 },
      look: { c1: '#C68A4E', c2: '#9A6332', ear: 'long', tail: 'stub', snout: 2, leg: 3, len: 12, coat: 'feather', pat: 'solid' } },
    { id: 'frenchie', name: '프렌치 불도그', w: 1, size: 'S', energy: 2, life: 9.8, risks: ['boas', 'ivdd', 'skin'],
      t: { sep: .4, bark: .3, guard: .35, fear: .3, stub: .55 },
      look: { c1: '#3E3A37', c2: '#E9E0D2', ear: 'bat', tail: 'stub', snout: 0, leg: 2, len: 10, pat: 'chest' } },
    { id: 'border', name: '보더콜리', w: 0.6, size: 'M', energy: 5, life: 13.1, risks: ['epilepsy', 'hip', 'eye'],
      t: { sep: .4, bark: .45, guard: .3, fear: .45, stub: .15 },
      look: { c1: '#2F2D2B', c2: '#F2EDE4', ear: 'half', tail: 'plume', snout: 3, leg: 4, len: 13, coat: 'feather', pat: 'collie' } },
    { id: 'schnauzer', name: '미니어처 슈나우저', w: 1.2, size: 'S', energy: 3, life: 13.3, risks: ['pancreas', 'stones', 'eye'],
      t: { sep: .35, bark: .7, guard: .4, fear: .3, stub: .4 },
      look: { c1: '#8D8C8A', c2: '#DCD9D3', ear: 'half', tail: 'stub', snout: 2, leg: 3, len: 11, brow: 1, pat: 'beard' } },
    { id: 'beagle', name: '비글', w: 0.6, size: 'M', energy: 5, life: 12.5, risks: ['obesity', 'epilepsy', 'otitis'],
      t: { sep: .5, bark: .75, guard: .3, fear: .25, stub: .55 },
      look: { c1: '#C98A45', c2: '#2F2B28', ear: 'long', tail: 'straight', snout: 2, leg: 3, len: 12, pat: 'tri' } },
    { id: 'samoyed', name: '사모예드', w: 0.5, size: 'L', energy: 4, life: 13.1, risks: ['hip', 'eye', 'skin'],
      t: { sep: .45, bark: .5, guard: .2, fear: .2, stub: .4 },
      look: { c1: '#FBFAF6', c2: '#E4DFD4', ear: 'erect', tail: 'over', snout: 2, leg: 4, len: 13, coat: 'plush', pat: 'solid' } },
    { id: 'pug', name: '퍼그', w: 0.6, size: 'S', energy: 2, life: 11.6, risks: ['boas', 'eye', 'obesity'],
      t: { sep: .4, bark: .3, guard: .25, fear: .25, stub: .5 },
      look: { c1: '#D8C29A', c2: '#3B3632', ear: 'drop', tail: 'curl', snout: 0, leg: 2, len: 10, pat: 'mask' } },
  ];

  const NAMES = ['보리', '코코', '콩이', '두부', '몽이', '초코', '루이', '별이', '해피', '사랑이', '구름이', '토리', '밤이', '호두',
    '우유', '감자', '쿠키', '모카', '단추', '까미', '봄이', '라떼', '망고', '복실이', '누룽지', '찹쌀이', '뭉치', '하루', '설기', '똘이'];

  // 입양 경로: 월령(개월) 범위, 영향
  const SOURCES = [
    { id: 'petshop', name: '펫숍', w: 36, age: [2, 3], fear: .08, sep: .12, desc: '유리장 안에서 제일 작았다.' },
    { id: 'breeder', name: '가정 분양', w: 22, age: [2, 4], fear: 0, sep: 0, desc: '어미 개와 형제들이 있는 집에서 데려왔다.' },
    { id: 'friend', name: '지인', w: 20, age: [2, 5], fear: 0, sep: .03, desc: '아는 집에서 새끼를 낳았다고 연락이 왔다.' },
    { id: 'rehome', name: '파양견 재입양', w: 8, age: [8, 60], fear: .14, sep: .1, desc: '전 보호자가 이사를 가며 보냈다. 목줄에 다른 이름이 적혀 있었다.' },
    { id: 'shelter', name: '보호소', w: 22, age: [5, 40], fear: .12, sep: .05, desc: '유기견 보호소 철장 맨 끝 칸에 있었다.' },
  ];

  // 보호자 가정: budget=하루 돌봄 여유(단위), alone=평일 혼자 있는 시간
  const HOMES = [
    { id: 'single', name: '1인 가구 직장인', w: 26, budget: 2.6, alone: 10, desc: '혼자 사는 직장인' },
    { id: 'couple', name: '맞벌이 부부', w: 24, budget: 3.0, alone: 9, desc: '맞벌이 부부' },
    { id: 'kids', name: '아이 둘 있는 집', w: 18, budget: 3.2, alone: 5, desc: '초등학생 아이가 둘 있는' },
    { id: 'remote', name: '재택근무', w: 12, budget: 3.8, alone: 2, desc: '집에서 일하는' },
    { id: 'retired', name: '은퇴한 부부', w: 12, budget: 4.4, alone: 1, desc: '은퇴한 노부부' },
    { id: 'student', name: '자취하는 대학생', w: 8, budget: 3.0, alone: 7, desc: '자취하는 대학생' },
  ];

  // 문제 행동
  const HABITS = {
    sep: { name: '분리불안', desc: '혼자 남으면 울고 문을 긁었다' },
    bark: { name: '짖음', desc: '작은 소리에도 한참 짖었다' },
    nip: { name: '입질', desc: '손을 자꾸 물었다' },
    guard: { name: '자원 지키기', desc: '밥그릇과 장난감을 지키며 으르렁거렸다' },
    pull: { name: '줄 당김', desc: '산책만 나가면 앞으로 끌고 갔다' },
    potty: { name: '배변 실수', desc: '아무 데나 쉬를 했다' },
    reactive: { name: '다른 개에 반응', desc: '다른 개를 보면 털을 세우고 달려들었다' },
    chew: { name: '물어뜯기', desc: '집 안 물건을 물어뜯었다' },
    copro: { name: '변 먹기', desc: '자기 변을 먹었다' },
    tail: { name: '꼬리 쫓기', desc: '제자리에서 자기 꼬리를 쫓았다' },
    mount: { name: '마운팅', desc: '쿠션과 사람 다리에 올라탔다' },
    mark: { name: '마킹', desc: '집 안 모서리마다 쉬를 묻혔다' },
    jump: { name: '뛰어오르기', desc: '반가우면 사람 얼굴까지 뛰어올랐다' },
    stranger: { name: '낯선 사람 경계', desc: '손님만 오면 짖고 발목으로 달려들었다' },
    handle: { name: '만지면 으르렁', desc: '발이나 몸을 만지면 으르렁거렸다' },
    car: { name: '차 공포', desc: '차만 타면 떨고 토했다' },
    chase: { name: '쫓기 본능', desc: '고양이만 보면 튀어 나가려 했다' },
    outdoor: { name: '산책 거부', desc: '현관 밖으로 나가기를 무서워했다' },
  };

  // 질환. age=[시작,끝](년), p=해당 견종의 연간 발병 확률, fatal=사망 원인이 될 수 있음
  const DISEASES = {
    patella: { name: '슬개골 탈구', age: [1, 8], p: .012, fatal: 0 },
    dental: { name: '치주 질환', age: [3, 16], p: .018, fatal: 0 },
    mvd: { name: '이첨판 심장병', age: [7, 16], p: .035, fatal: 1, cause: '심장병' },
    trachea: { name: '기관 협착', age: [4, 14], p: .01, fatal: 0 },
    eye: { name: '백내장', age: [6, 16], p: .012, fatal: 0 },
    boas: { name: '단두종 호흡 곤란', age: [1, 12], p: .05, fatal: 1, cause: '호흡 곤란' },
    stones: { name: '방광 결석', age: [3, 12], p: .01, fatal: 0 },
    skin: { name: '피부 알레르기', age: [1, 10], p: .015, fatal: 0 },
    hip: { name: '고관절 이형성', age: [1, 10], p: .012, fatal: 0 },
    cancer: { name: '종양', age: [7, 16], p: .03, fatal: 1, cause: '암' },
    otitis: { name: '외이염', age: [1, 12], p: .03, fatal: 0 },
    ivdd: { name: '디스크(추간판 질환)', age: [3, 10], p: .025, fatal: 0 },
    obesity: { name: '비만', age: [2, 12], p: .0, fatal: 0 }, // 체중으로 처리
    hypothy: { name: '갑상선 기능 저하', age: [4, 12], p: .008, fatal: 0 },
    epilepsy: { name: '뇌전증', age: [1, 6], p: .008, fatal: 0 },
    pancreas: { name: '췌장염', age: [5, 14], p: .01, fatal: 0 },
    kidney: { name: '만성 신장병', age: [9, 18], p: .015, fatal: 1, cause: '신장병' },
  };

  // 사계절 일상 기록(선택지 없음)
  const DAYS = {
    pup: [
      '자기 꼬리를 쫓다가 넘어졌다.', '처음으로 소파에 혼자 올라갔다. 내려오지는 못했다.', '양말 한 짝을 물고 온 집을 뛰었다.',
      '하루에 열여덟 시간쯤 잤다.', '현관 매트 위가 제일 좋은 자리가 됐다.', '처음 보는 청소기 앞에서 한참 짖었다.',
      '이름을 부르면 고개를 돌리기 시작했다.', '밥그릇을 핥아 반짝반짝하게 만들었다.',
    ],
    adult: [
      '산책 코스가 정해졌다. 편의점, 놀이터, 다시 집.', '보호자 발소리를 엘리베이터 소리로 알아듣기 시작했다.',
      '창가 햇빛을 따라 하루에 세 번 자리를 옮겼다.', '간식 봉지 소리는 다른 방에서도 들었다.', '택배 상자가 오면 먼저 냄새를 맡았다.',
      '비 오는 날엔 현관에서 한참 망설이다 나갔다.', '잠꼬대를 하며 다리를 허우적거렸다.', '아무 일도 없는 한 달이었다.',
      '산책길 편의점 사장님이 이름을 외웠다.', '보호자가 아픈 날 침대 발치에서 내려오지 않았다.', '목욕하고 나서 이불에 몸을 비볐다.',
      '같은 자리에서 같은 시간에 기다렸다.', '공을 던지면 가져오지 않고 그 자리에 누웠다.',
    ],
    senior: [
      '산책이 짧아졌다. 놀이터까지만 갔다.', '자는 시간이 늘었다.', '그래도 간식 봉지 소리에는 일어났다.',
      '주둥이에 흰 털이 늘었다.', '부르면 한 박자 늦게 돌아봤다.', '현관까지 마중 나오는 날이 줄었다.',
      '햇볕 좋은 날엔 베란다에서 오래 앉아 있었다.', '계단 앞에서 잠깐 멈췄다가 올라갔다.',
    ],
    season: {
      0: ['벚꽃잎을 먹으려다 뱉었다.', '봄바람에 코를 한참 들고 있었다.'],
      1: ['에어컨 앞에 배를 깔고 누웠다.', '장마가 길어 산책을 몇 번 건너뛰었다.'],
      2: ['낙엽 더미에 코를 박고 나오지 않았다.', '가을 산책이 제일 길었다.'],
      3: ['첫눈을 핥았다.', '발바닥이 시려 한쪽 발을 들고 섰다.', '전기장판 위를 떠나지 않았다.'],
    },
    breed: {
      border: ['굴러가는 비닐봉지를 몰았다.', '할 일이 없으면 보호자를 빤히 쳐다봤다.'],
      shiba: ['목욕하자는 말에 비명을 질렀다.', '안으려고 하면 몸을 비틀어 빠져나갔다.'],
      beagle: ['냄새를 따라가다 산책이 두 배로 길어졌다.', '쓰레기통 뚜껑 여는 법을 알아냈다.'],
      golden: ['물웅덩이를 그냥 지나친 적이 없다.', '손님 신발을 물고 와 자랑했다.'],
      labrador: ['밥을 십 초 만에 먹었다.', '물웅덩이를 그냥 지나친 적이 없다.'],
      corgi: ['보호자 발뒤꿈치를 따라다니며 몰았다.', '엉덩이를 흔들며 계단을 올랐다.'],
      jindo: ['밖에서만 배변하고 집에서는 끝까지 참았다.', '가족 말고는 쉽게 곁을 주지 않았다.'],
      dachshund: ['이불 속으로 파고들어 발만 내놓고 잤다.', '두더지 구멍을 보면 땅을 팠다.'],
      poodle: ['보호자가 신발 신는 순서를 다 외웠다.', '미용 다녀오면 한동안 거울 앞을 지나다녔다.'],
      maltese: ['눈물 자국이 짙어졌다.', '보호자 무릎을 제자리로 여겼다.'],
      pomeranian: ['털갈이 철에는 청소기를 하루 두 번 돌렸다.', '산책 나가면 동네 사람들이 솜사탕이라고 불렀다.'],
      chihuahua: ['자기보다 열 배 큰 개에게 짖었다.', '담요 속에서 떨다가 잠들었다.'],
      cocker: ['밥 먹을 때마다 귀가 그릇에 빠졌다.', '귀 청소 시간이면 침대 밑으로 숨었다.'],
      frenchie: ['자면서 사람처럼 코를 골았다.', '여름 산책은 해 지고 나서만 했다.'],
      schnauzer: ['물 마시고 젖은 수염으로 다가와 무릎에 얼굴을 닦았다.', '초인종 소리에 제일 먼저 뛰어갔다.'],
      samoyed: ['웃는 얼굴로 소파를 털 범벅으로 만들었다.', '겨울을 제일 좋아했다.'],
      shihtzu: ['하루 대부분을 자기 방석에서 보냈다.', '앞머리를 묶어 주면 세상이 넓어진 얼굴이었다.'],
      bichon: ['신이 나면 거실을 미친 듯이 원을 그리며 뛰었다.', '미용 뒤에는 동그란 머리가 됐다.'],
      yorkie: ['작은 몸으로 집을 지켰다. 택배 기사에게 특히 엄했다.', '털이 길어 산책 뒤엔 풀씨가 잔뜩 붙었다.'],
      pug: ['숨소리가 커서 어디 있는지 늘 알 수 있었다.', '간식 앞에서 고개를 갸웃했다.'],
      mix: ['어떤 개가 섞였는지 아무도 몰랐다. 귀 한쪽만 섰다.', '동네 사람마다 다른 견종 이름을 댔다.'],
    },
  };

  // 사건. G = 게임 도우미. 각 선택지 fx는 결과 문장을 돌려준다.
  // when: [최소, 최대] 개월, cond(s,G): 조건, w: 가중치, once: 한 번만
  // 사건은 events.js(DATA_EVENTS)로 옮겼다.
  const EVENTS = window.DATA_EVENTS || [];
  const EXPLAIN = window.DATA_EXPLAIN || {};

  // 숨 쉴 틈: 한동안 나쁘면 가끔 온다
  const GRACE = [
    { text: '동네에 새로 생긴 동물병원 원장님이 {n:을} 유난히 예뻐했다. 진료 끝에 간식을 쥐여 줬다.', fx: G => { G.add('health', 10); G.add('calm', 4); } },
    { text: '아래층 할머니가 낮에 {n:을} 데리고 산책을 나가 주겠다고 했다.', fx: G => { G.alone(-2); G.add('joy', 8); G.add('calm', 5); } },
    { text: '보호자 회사가 일주일에 이틀 재택을 시작했다.', fx: G => { G.alone(-2); G.budget(.5); } },
    { text: '훈련사를 하는 친구가 놀러 왔다가 "칭찬은 바로, 짧게"라는 말을 남기고 갔다.', fx: G => { G.add('manners', 6); G.boostPlans(); } },
    { text: '좋은 날씨가 이어져 매일 저녁 오래 걸었다.', fx: G => { G.add('joy', 8); G.add('health', 4); G.add('weight', -4); } },
    { text: '조카가 놀러 와서 {n:과} 하루 종일 공놀이를 했다. 둘 다 녹초가 됐다.', fx: G => { G.add('joy', 10); G.add('bond', 3); } },
  ];

  // 연구 한 줄 (사건 결과 뒤, 엔딩에 쓴다). research.md 근거.
  // 출처가 확인된 문장만 둔다(research.md [확인] 항목).
  const NOTES = {
    punish: { t: '벌을 많이 쓴 집의 개일수록 문제 행동이 많았다. 말을 잘 듣는 정도와는 관계가 없었다. 칭찬과 간식을 많이 쓴 쪽이 더 잘 따랐다.', src: 'Hiby 외 2004, 364마리 보호자 설문' },
    alpha: { t: '문제 행동으로 병원에 온 개에게 때리기를 쓰면 43%, 배를 뒤집어 누르는 "알파 롤"을 쓰면 31%가 공격적으로 반응했다.', src: 'Herron 외 2009, 행동 클리닉 140마리' },
    fear: { t: '겁 많은 개는 어릴 때 사회화 경험이 적었다. 운동량이 적은 개는 소음 공포와 분리불안이 더 많았다.', src: 'Tiira & Lohi 2015, 3,264마리' },
    active: { t: '활동과 훈련이 적은 개는 낯선 상황을 두려워할 가능성이 1.7~1.8배 높았다.', src: 'Hakanen 외 2020, 핀란드 1만 3천여 마리' },
    petshop: { t: '펫숍 출신 개는 비교한 행동 14가지 중 12가지에서 브리더 출신보다 나빴다. 더 나은 항목은 없었다.', src: 'McMillan 외 2013' },
    weight: { t: '과체중이던 요크셔테리어의 수명 중앙값은 13.7년, 정상 체중은 16.2년이었다. 조사한 12개 견종 모두 과체중 쪽이 짧았다.', src: 'Salt 외 2019, 5만 787마리' },
    cog: { t: '11~12살 개의 28%, 15~16살 개의 68%에서 인지 저하 징후가 보였다. 병원에서 진단까지 받는 경우는 드물다.', src: 'Neilson 외 2001; Salvin 외 2010' },
    mouth: { t: '입에 문 물건을 억지로 빼앗았을 때 39%의 개가 공격적으로 반응했다. 바꿔 주기가 더 안전하다.', src: 'Herron 외 2009, 행동 클리닉 140마리' },
    breedpct: { t: '견종으로 설명되는 건 개 한 마리 행동 차이의 9%였다. 견종이 전부는 아니다.', src: 'Morrill 외 2022, Science (1만 8천여 마리)' },
  };

  // 보호자 유형
  const TYPES = {
    steady: { name: '한결같은 산책 동무', line: '날씨가 어떻든 같은 시간에 현관에 섰다.' },
    principled: { name: '다정한 원칙주의자', line: '칭찬은 바로, 연습은 매일. 지루할 만큼 꾸준했다.' },
    snack: { name: '간식 자판기', line: '눈만 마주치면 뭔가 나왔다. 사랑은 칼로리였다.' },
    strict: { name: '엄한 대장', line: '규칙은 분명했다. 개는 그 규칙을 무서워하면서 배웠다.' },
    busy: { name: '바쁜 짝사랑', line: '마음은 늘 집에 있었다. 몸은 자주 회사에 있었다.' },
    free: { name: '느긋한 동거인', line: '가르친 건 별로 없다. 같이 산 건 많다.' },
    plain: { name: '보통의 보호자', line: '잘한 날도 못한 날도 있었다. 대부분은 그냥 하루였다.' },
  };

  // 강아지의 속마음 (강아지 목소리, 짧게)
  const MIND = {
    pup: [
      '여기는 냄새가 너무 많다. 그중에 제일 좋은 건 이 사람 냄새다.',
      '자고 일어나도 이 사람이 있다. 좋다.',
      '이 소리가 내 이름이래. 이 소리가 나면 좋은 일이 생긴다.',
      '발이 자꾸 미끄러진다. 그래도 따라간다.',
      '처음 보는 것투성이다. 이 사람 다리 뒤에 있으면 괜찮다.',
    ],
    adult: [
      '엘리베이터가 섰다. 우리 층이다. 우리 사람이다.',
      '문이 닫히면 기다린다. 기다리는 건 내가 제일 잘한다.',
      '산책 줄 소리가 났다. 세상에서 제일 좋은 소리.',
      '이 사람이 슬픈 날은 냄새가 다르다. 그런 날은 옆에 붙어 있는다.',
      '오늘도 같은 길이다. 그래도 냄새는 매일 다르다.',
      '자는 척했지만 사실 다 듣고 있었다.',
      '이 사람이 웃으면 꼬리가 먼저 움직인다. 나도 어쩔 수 없다.',
      '손바닥에서 오늘 만난 사람들 냄새가 난다. 그래도 제일 진한 건 이 사람 냄새다.',
    ],
    senior: [
      '요즘은 귀가 잘 안 들린다. 그래도 냄새는 안다.',
      '다리가 무겁다. 그래도 현관까지는 나간다.',
      '눈이 흐리다. 손 냄새로 안다. 우리 사람이다.',
      '많이 잔다. 꿈에서는 공원을 끝까지 뛰었다.',
      '이 사람 무릎은 여전히 따뜻하다.',
      '천천히 걸어도 이 사람은 기다려 준다.',
    ],
    scared: ['큰 소리가 나면 몸이 먼저 작아진다. 그래도 이 사람이 좋다.', '손이 올라가면 눈을 감는다. 쓰다듬는 손이면 좋겠다.'],
    alone: ['낮이 길다. 현관을 보고 있으면 덜 길다.', '혼자 있는 동안 이 사람 옷에 코를 묻고 있었다.'],
    sub: ['{s:이} 내 방석에 누웠다. 반은 양보했다.', '{s:이랑} 같이 기다리니까 낮이 조금 짧다.'],
  };

  // 만난 날 기념
  const ANNIV = [
    '우리가 만난 지 {k}년. 별일 없이 지나간 하루였다. 그게 좋았다.',
    '우리가 만난 지 {k}년. 처음 데려온 날 사진을 다시 봤다. 이렇게 작았나 싶었다.',
    '우리가 만난 지 {k}년. 산책길 늘 앉던 벤치에 오래 앉아 있었다.',
    '우리가 만난 지 {k}년. 간식 하나를 더 줬다. 이유는 말하지 않았다.',
  ];

  // 털 색 (작별 장면)
  const COAT = { maltese: '하얀', poodle: '갈색', pomeranian: '주황빛', chihuahua: '베이지색', shihtzu: '하얀', bichon: '하얀', jindo: '누런', golden: '금빛',
    labrador: '누런', corgi: '주황빛', yorkie: '은빛', dachshund: '갈색', shiba: '주황빛', cocker: '갈색', frenchie: '까만', border: '까만', schnauzer: '잿빛',
    beagle: '갈색', samoyed: '하얀', pug: '베이지색', mix: '갈색' };

  // 협업 연결 자리: tag -> { name, line }. 비어 있으면 게임에 아무것도 안 보인다. partnership.md 참고.
  // 견종 성향 0~1 (research-breeds.md). 견종은 개체 차이의 일부만 설명한다(Morrill 2022: 약 9%). 진돗개는 비교 자료가 없어 평균 쪽으로 절반 당긴 추정값.
  const BREED_TRAITS = {
    maltese:    { train: .45, food: .45, energy: .50, fearN: .55, strangerF: .60, dogAgg: .45, sep: .58, touch: .62, chase: .40, excite: .55, attach: .72, house: .72, heat: .20 },
    poodle:     { train: .68, food: .40, energy: .65, fearN: .40, strangerF: .58, dogAgg: .45, sep: .58, touch: .55, chase: .45, excite: .58, attach: .72, house: .65, heat: .15 },
    pomeranian: { train: .50, food: .45, energy: .50, fearN: .58, strangerF: .60, dogAgg: .55, sep: .52, touch: .62, chase: .45, excite: .62, attach: .65, house: .75, heat: .30 },
    mix:        { train: .50, food: .50, energy: .50, fearN: .55, strangerF: .50, dogAgg: .50, sep: .55, touch: .50, chase: .50, excite: .55, attach: .50, house: .45, heat: .20 },
    chihuahua:  { train: .38, food: .45, energy: .50, fearN: .65, strangerF: .78, dogAgg: .70, sep: .55, touch: .65, chase: .45, excite: .62, attach: .72, house: .85, heat: .20 },
    shihtzu:    { train: .35, food: .50, energy: .30, fearN: .50, strangerF: .50, dogAgg: .35, sep: .48, touch: .55, chase: .30, excite: .40, attach: .70, house: .70, heat: .55 },
    bichon:     { train: .50, food: .50, energy: .50, fearN: .55, strangerF: .50, dogAgg: .40, sep: .60, touch: .58, chase: .40, excite: .58, attach: .72, house: .72, heat: .15 },
    jindo:      { train: .44, food: .47, energy: .60, fearN: .50, strangerF: .55, dogAgg: .57, sep: .41, touch: .47, chase: .65, excite: .55, attach: .42, house: .40, heat: .38 },
    golden:     { train: .75, food: .75, energy: .70, fearN: .38, strangerF: .20, dogAgg: .25, sep: .45, touch: .35, chase: .45, excite: .55, attach: .65, house: .30, heat: .20 },
    labrador:   { train: .72, food: .88, energy: .70, fearN: .30, strangerF: .15, dogAgg: .25, sep: .45, touch: .35, chase: .45, excite: .50, attach: .62, house: .30, heat: .22 },
    corgi:      { train: .70, food: .55, energy: .70, fearN: .62, strangerF: .50, dogAgg: .50, sep: .45, touch: .58, chase: .55, excite: .60, attach: .55, house: .45, heat: .30 },
    yorkie:     { train: .45, food: .45, energy: .50, fearN: .58, strangerF: .65, dogAgg: .60, sep: .52, touch: .62, chase: .65, excite: .62, attach: .68, house: .75, heat: .25 },
    dachshund:  { train: .38, food: .70, energy: .50, fearN: .55, strangerF: .75, dogAgg: .68, sep: .52, touch: .60, chase: .70, excite: .55, attach: .60, house: .75, heat: .15 },
    shiba:      { train: .30, food: .45, energy: .50, fearN: .50, strangerF: .60, dogAgg: .65, sep: .30, touch: .60, chase: .70, excite: .50, attach: .25, house: .35, heat: .30 },
    cocker:     { train: .55, food: .70, energy: .70, fearN: .50, strangerF: .58, dogAgg: .45, sep: .55, touch: .50, chase: .55, excite: .58, attach: .65, house: .45, heat: .20 },
    frenchie:   { train: .35, food: .50, energy: .30, fearN: .45, strangerF: .40, dogAgg: .45, sep: .50, touch: .50, chase: .30, excite: .45, attach: .65, house: .55, heat: .92 },
    border:     { train: .88, food: .40, energy: .88, fearN: .48, strangerF: .48, dogAgg: .45, sep: .50, touch: .45, chase: .70, excite: .65, attach: .62, house: .35, heat: .25 },
    schnauzer:  { train: .60, food: .50, energy: .50, fearN: .40, strangerF: .72, dogAgg: .60, sep: .45, touch: .50, chase: .60, excite: .48, attach: .50, house: .55, heat: .15 },
    beagle:     { train: .35, food: .78, energy: .88, fearN: .45, strangerF: .38, dogAgg: .30, sep: .60, touch: .45, chase: .75, excite: .70, attach: .55, house: .50, heat: .20 },
    samoyed:    { train: .40, food: .45, energy: .70, fearN: .45, strangerF: .35, dogAgg: .40, sep: .40, touch: .40, chase: .45, excite: .55, attach: .35, house: .35, heat: .40 },
    pug:        { train: .35, food: .68, energy: .30, fearN: .45, strangerF: .40, dogAgg: .30, sep: .50, touch: .50, chase: .25, excite: .40, attach: .68, house: .60, heat: .85 },
  };
  const PARTNERS = {};

  window.DATA = { EXPLAIN, PARTNERS, BREED_TRAITS, BREEDS, NAMES, SOURCES, HOMES, HABITS, DISEASES, DAYS, EVENTS, GRACE, NOTES, TYPES, MIND, ANNIV, COAT };
})();
