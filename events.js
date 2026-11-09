/* 우리 집에 온 아이: 사건과 돌아보기 해설
   원칙: 선택지는 모두 실제 보호자가 할 법한 방법이다. 바로 뜨는 결과는 짧고 담담하게.
   차이는 G.later(개월, 문장, 효과)로 몇 달 뒤 기록에 드러난다. 채점·해설은 죽은 뒤 돌아보기에서만 보인다.
   근거: research.md, research-papers-2.md. grade: 0=연구에서 덜 나았던 쪽, 1=상황에 따라, 2=연구에서 더 나았던 쪽 */
(function () {
  'use strict';
  const seasonIdx = s => { const m = s.cal.m; return m >= 2 && m <= 4 ? 0 : m >= 5 && m <= 7 ? 1 : m >= 8 && m <= 10 ? 2 : 3; };

  const EVENTS = [
    // ---------- 강아지 시절 ----------
    { id: 'firstnight', tag: '만난 날', when: [0, 60], once: 1, w: 999, cond: s => s.ticks === 0,
      text: '첫날 밤. {n:은} 낯선 집이 무서운지 밤새 낑낑거렸다.',
      choices: [
        { t: '곁에 앉아 손을 넣어 주고 달래 준다', fx: G => { G.add('bond', 6); G.add('calm', 3); G.sepGuard(.06); G.ms('night', '첫날 밤, 손가락을 입에 문 채 잠들었다.');
            G.later(5, '밤에 깨면 케이지 문 쪽으로 와서 보호자 얼굴을 확인하고 다시 잤다.'); return '새벽 세 시쯤 손가락을 문 채 잠들었다.'; } },
        { t: '스스로 진정하는 법을 배우게 기다린다', fx: G => { G.add('bond', -2); G.dogFear(.03); G.sepGuard(-.03); G.ms('night', '첫날 밤에는 한참 울다 혼자 잠들었다.');
            G.later(5, '밤에는 혼자서도 잘 잤다. 대신 낮에 보호자가 방을 나가면 꼭 따라 일어났다.'); return '한 시간쯤 울다가 혼자 잠들었다.'; } },
        { t: '침대로 데려와 같이 잔다', fx: G => { G.add('bond', 9); G.add('calm', 3); G.flag('bed', 1); G.ms('night', '첫날부터 베개 반을 차지했다.');
            G.later(7, '침대가 아니면 잠들지 못했다. 출장 가는 날 맡아 준 친구가 밤새 고생했다.'); return '첫날부터 베개 반을 내줬다.'; } },
      ] },

    // 15차: 첫날 장면은 아이마다 다르다(성격·온 곳·나이에 따라 game.js firstEvent가 고른다). w 0이라 평소엔 안 뜬다
    { id: 'first_hide', tag: '만난 날', when: [0, 999], once: 1, w: 0,
      text: '첫날. {n:은} 소파 밑에 들어가 나오지 않았다. 밥그릇에도 손을 안 댔다.',
      choices: [
        { t: '소파 앞에 간식을 하나 두고 멀찍이 앉아 기다린다', fx: G => { G.add('bond', 4); G.add('calm', 4); G.dogFear(-.02); G.ms('night', '첫날엔 소파 밑에서 나오지 않았다. 해 질 무렵 코끝부터 내밀었다.');
            G.later(4, '부르면 오기 전에 한 번 멈춰서 얼굴을 살폈다. 그래도 늘 왔다.'); return '해 질 무렵 코끝이 먼저 나왔다. 간식을 물고 다시 들어갔다.'; } },
        { t: '소파를 들어 꺼내서 품에 안아 준다', fx: G => { G.add('bond', -1); G.dogFear(.03); G.add('calm', -3); G.ms('night', '첫날 소파 밑에서 억지로 꺼냈다. 품에서 내내 떨었다.');
            G.later(4, '소파를 옮길 때마다 소파 밑으로 숨었다.'); return '품에 안긴 채 내내 떨었다. 내려놓자 다시 소파 밑으로 갔다.'; } },
        { t: '불을 끄고 오늘은 그냥 둔다', fx: G => { G.add('calm', 2); G.ms('night', '첫날 밤, 불을 끄자 소파 밑에서 나와 물을 마셨다.');
            return '불을 끄자 사박사박 발소리가 났다. 아침에 보니 밥그릇이 비어 있었다.'; } },
      ] },
    { id: 'first_explore', tag: '만난 날', when: [0, 999], once: 1, w: 0,
      text: '첫날. {n:은} 문 열자마자 온 집을 뛰어다녔다. 쓰레기통이 넘어졌다.',
      choices: [
        { t: '위험한 것만 치우고 마음껏 둘러보게 둔다', fx: G => { G.add('joy', 5); G.add('bond', 3); G.ms('night', '첫날부터 온 집을 탐험했다. 쓰레기통이 첫 희생자였다.');
            G.later(5, '새 물건이 들어오면 제일 먼저 냄새를 맡으러 왔다.'); return '구석구석 냄새를 맡더니 현관 매트 위에 대자로 뻗었다.'; } },
        { t: '"안 돼" 하고 울타리 안에 넣는다', fx: G => { G.add('joy', -3); G.style('punish'); G.ms('night', '첫날 울타리 안에서 하루를 보냈다.');
            return '울타리를 앞발로 긁다가 지쳐 잠들었다.'; } },
        { t: '같이 뛰어다니며 논다', fx: G => { G.add('joy', 7); G.add('bond', 5); G.add('calm', -2); G.ms('night', '첫날 같이 거실을 뛰어다녔다. 둘 다 숨이 찼다.');
            G.later(6, '저녁만 되면 거실을 한 바퀴 뛰는 버릇이 생겼다.'); return '둘 다 숨이 차서 바닥에 누웠다. 얼굴을 핥았다.'; } },
      ] },
    { id: 'first_door', tag: '만난 날', when: [0, 999], once: 1, w: 0,
      text: '첫날 밤. {n:은} 현관문 앞에 엎드려 밖을 보고 있었다. 전에 살던 집을 기다리는 것 같았다.',
      choices: [
        { t: '옆에 앉아 등을 천천히 쓸어 준다', fx: G => { G.add('bond', 6); G.add('calm', 3); G.sepGuard(.04); G.ms('night', '첫날 밤, 현관 앞에서 등을 쓸어 줬다. 새벽에야 방으로 들어왔다.');
            G.later(5, '어느 날부터 현관이 아니라 보호자 발밑에서 잤다.'); return '새벽이 되자 일어나서 방으로 따라 들어왔다.'; } },
        { t: '현관 앞에 방석을 깔아 준다', fx: G => { G.add('calm', 4); G.ms('night', '첫날 밤, 현관 앞에 방석을 깔아 줬다.');
            return '방석 냄새를 맡더니 그 위에 몸을 말았다.'; } },
        { t: '방으로 불러들이고 문을 닫는다', fx: G => { G.add('calm', -2); G.sepGuard(-.03); G.ms('night', '첫날 밤, 방문을 닫자 문 앞에서 한참 낑낑거렸다.');
            return '닫힌 문 앞에서 한참 낑낑거렸다.'; } },
      ] },
    { id: 'first_pee', tag: '만난 날', when: [0, 6], once: 1, w: 0,
      text: '첫날. 집에 온 지 십 분 만에 {n:이} 새 이불에 쉬를 했다.',
      choices: [
        { t: '말없이 치우고 냄새를 지운 뒤 패드 자리를 보여 준다', fx: G => { G.add('bond', 2); G.ms('night', '집에 온 지 십 분 만에 새 이불에 쉬를 했다.');
            return '패드 냄새를 맡더니 그 옆에 앉았다. 내일은 패드 위에 할지도 모른다.'; } },
        { t: '"안 돼!" 하고 혼낸다', fx: G => { G.dogFear(.02); G.style('punish'); G.ms('night', '첫날 이불에 쉬를 하고 혼났다.');
            return '귀를 눕히고 식탁 밑으로 들어갔다. 다음 실수는 식탁 밑에서 했다.'; } },
        { t: '웃으면서 사진부터 찍는다', fx: G => { G.add('bond', 3); G.add('joy', 2); G.flag('album', 1); G.ms('night', '첫날 이불에 쉬를 했다. 그 사진이 앨범 첫 장이 됐다.');
            return '그 사진이 앨범 첫 장이 됐다. 이불은 빨면 된다.'; } },
      ] },
    { id: 'social', when: [2, 4], once: 1, w: 70, cond: s => s.dog.adoptM <= 4,
      text: '수의사가 지금이 사회화 시기라고 했다. 하지만 접종은 아직 다 끝나지 않았다.',
      choices: [
        { t: '품에 안고 동네를 돌며 사람·소리를 조금씩 보여 준다', fx: G => { G.add('social', 14); G.dogFear(-.08); G.ms('social', '어릴 때 품에 안겨 동네 구경을 많이 했다.');
            G.later(10, '오토바이가 지나가도 고개만 한 번 돌리고 말았다.'); return '버스, 유모차, 비둘기. {n:은} 품에서 다 구경했다.'; } },
        { t: '수의사가 운영하는 퍼피 클래스에 등록한다', fx: G => { G.add('social', 18); G.add('manners', 5); G.dogFear(-.09); G.style('reward'); G.ms('social', '퍼피 클래스에서 친구들과 뒹굴었다.');
            G.later(10, '청소기 소리에도 자리를 옮기지 않았다. 클래스에서 들었던 소리였다.'); return '수업료가 꽤 들었다. {n:은} 다른 강아지들과 뒹굴었다.'; } },
        { t: '감염이 더 걱정이다. 접종이 끝날 때까지 집에서 지낸다', fx: G => { G.add('social', -8); G.dogFear(.1); G.ms('social', '어릴 때는 접종이 끝날 때까지 집에만 있었다.');
            G.later(4, '석 달 만의 첫 산책. 처음 듣는 오토바이 소리에 {n:은} 그 자리에 주저앉았다.'); return '집 안에서 공놀이를 많이 했다. 아무 일 없이 지나갔다.'; } },
      ] },

    { id: 'potty', when: [2, 10], once: 1, w: 55, cond: s => s.dog.adoptM <= 8,
      text: '거실 러그 위에 또 쉬를 했다. 이번 주에만 네 번째다.',
      choices: [
        { t: '패드에 쌌을 때 바로 칭찬하고 간식을 준다', fx: G => { G.style('reward'); G.add('manners', 6); G.ms('potty', '배변은 패드에 쌀 때마다 간식을 받으며 배웠다.');
            G.later(3, '패드에 볼일을 보고 나면 간식 서랍 쪽을 쳐다봤다.'); return '오늘은 두 번 성공했다.'; } },
        { t: '실수하는 순간 "안 돼" 하고 패드로 옮겨 준다', fx: G => { G.add('manners', 3); G.habit('potty', .4); G.plan('potty', 'manage'); G.ms('potty', '배변 실수를 하면 패드로 옮겨졌다.');
            G.later(3, '패드로 가는 길은 익혔다. 가끔 보호자 눈치를 보며 쌌다.'); return '패드 위에서 어리둥절한 얼굴을 했다.'; } },
        { t: '실수한 자리를 보여 주며 단호하게 혼낸다', fx: G => { G.style('punish'); G.add('bond', -3); G.dogFear(.04); G.habit('potty', .9); G.plan('potty', 'aversive'); G.ms('potty', '배변 실수를 하면 혼났다.');
            G.later(3, '거실에서는 실수가 줄었다. 대신 소파 뒤, 커튼 뒤처럼 보호자가 안 보는 곳에서 쌌다.'); return '{n:은} 귀를 납작하게 하고 구석으로 갔다.'; } },
      ] },

    { id: 'nip', when: [3, 8], once: 1, w: 50,
      text: '이갈이 중인 {n:이} 손과 발목을 자꾸 문다. 바늘 같은 이빨이다.',
      choices: [
        { t: '물면 놀이를 멈추고, 씹을 장난감을 쥐여 준다', fx: G => { G.style('reward'); G.add('manners', 5); G.plan('nip', 'reward'); G.habit('nip', .6); G.ms('nip', '이갈이 때 손 대신 장난감 무는 법을 배웠다.');
            G.later(4, '장난감 세 개가 걸레가 됐다. 손은 무사했다.'); return '{n:은} 장난감을 물고 거실을 한 바퀴 돌았다.'; } },
        { t: '물면 "아야" 하고 잠깐 방을 나간다', fx: G => { G.plan('nip', 'manage'); G.habit('nip', .7); G.ms('nip', '이갈이 때 물면 보호자가 잠깐 사라졌다.');
            G.later(4, '세게 물면 놀이가 끝난다는 걸 알았다. 무는 힘이 조금 약해졌다.'); return '문 너머에서 낑낑대는 소리가 났다.'; } },
        { t: '입을 살짝 잡고 눈을 보며 "안 돼"라고 한다', fx: G => { G.style('punish'); G.dogFear(.06); G.add('bond', -3); G.habit('nip', .5); G.plan('nip', 'aversive'); G.habit('handle', .5); G.ms('nip', '이갈이 때 입을 잡혔다.');
            G.later(6, '무는 건 줄었다. 대신 얼굴 쪽으로 손이 오면 고개를 홱 돌렸다.'); return '{n:은} 금방 입을 뗐다.'; } },
      ] },

    { id: 'alonefirst', when: [2, 14], once: 1, w: 45, cond: s => s.home.alone >= 5,
      text: '처음으로 {n:을} 혼자 두고 출근하는 날이다.',
      choices: [
        { t: '주말에 5분 외출부터 조금씩 늘려 왔다. 오늘은 그 연장이다', fx: G => { G.style('reward'); G.add('calm', 6); G.sepGuard(.3); G.ms('alone', '혼자 있는 연습을 5분부터 시작했다.');
            G.later(4, '현관문이 닫히면 방석으로 가서 누웠다. 홈캠에 찍힌 건 거의 자는 모습이었다.'); return '홈캠 속 {n:은} 현관을 잠깐 보다가 방석으로 갔다.'; } },
        { t: '간식을 숨긴 노즈워크 장난감을 두고 나간다', fx: G => { G.add('calm', 3); G.sepGuard(.12); G.ms('alone', '첫 출근 날 노즈워크 장난감과 함께 남았다.');
            G.later(4, '간식을 다 찾고 나면 현관 앞에 누워 기다렸다.'); return '처음 십 분은 간식을 찾느라 바빴다.'; } },
        { t: '출근 전에 긴 산책을 시켜 지치게 한 뒤 나간다', fx: G => { G.add('calm', 3); G.sepGuard(.14); G.routineUp('walk'); G.ms('alone', '첫 출근 날 아침, 긴 산책을 하고 혼자 남았다.');
            G.later(4, '아침 산책이 길어진 뒤로 낮에는 대부분 잤다. 비 오는 날은 달랐다.'); return '현관이 닫히자마자 곯아떨어졌다.'; } },
      ] },

    { id: 'neuter', when: [5, 14], once: 1, w: 40, cond: s => s.dog.intact,
      text: '중성화 수술을 할지, 한다면 언제 할지 정해야 한다.',
      choices: [
        { t: '권유받은 대로 6개월 무렵 한다', fx: G => { G.neuter(); G.flag('neuterAge', G.state().ageM); G.ms('neuter', '6개월 무렵 중성화 수술을 했다.'); return '하루 입원했다. 넥카라를 쓰고 벽에 자꾸 부딪혔다.'; } },
        { t: '몸이 다 클 때까지 기다렸다가 한다', fx: G => { G.flag('neuterLater', 1); G.later(8, G2 => { G2.neuter(); G2.flag('neuterAge', G2.state().ageM); G2.ms('neuter', '한 살 넘어 중성화 수술을 했다.'); return '한 살이 넘어 수술을 했다. 회복은 금방이었다.'; }); return '일단 미뤘다.'; } },
        { t: '하지 않는다', fx: G => { G.flag('intact', 1); G.ms('neuter', '중성화를 하지 않았다.'); return '수의사는 고개를 끄덕였다. 대신 관리할 것들을 적어 줬다.'; } },
      ] },

    { id: 'recall', when: [7, 20], once: 1, w: 38,
      text: '산책 중에 불러도 안 온다. 예전엔 부르면 바로 달려왔는데.',
      choices: [
        { t: '부를 때마다 제일 좋아하는 간식을 준다. 긴 줄로 연습한다', fx: G => { G.style('reward'); G.add('manners', 8); G.ms('recall', '사춘기 때 "이리 와"를 다시 배웠다.');
            G.later(5, '이름만 불러도 귀가 먼저 돌아왔다.'); return '첫날은 다섯 번 중 두 번 왔다.'; } },
        { t: '안 오면 줄을 당겨 데려오며 엄하게 "이리 와!"', fx: G => { G.style('punish'); G.habit('pull', .7); G.add('bond', -4); G.plan('pull', 'aversive');
            G.later(5, '부르면 오긴 왔다. 고개를 숙이고 아주 천천히.'); return '오늘은 다 끌고 왔다.'; } },
        { t: '울타리 있는 공원에서는 줄을 풀어 마음껏 뛰게 한다', fx: G => { G.flag('offleash', 1); G.add('joy', 6); G.add('social', 4);
            G.later(6, '공원에서는 잘 놀았다. 문제는 울타리 없는 길에서도 뛰어나가려 한다는 것이었다.'); return '{n:은} 귀가 뒤로 젖혀질 만큼 뛰었다.'; } },
      ] },

    { id: 'jump', when: [5, 60], once: 1, w: 40, cond: s => s.habits.jump >= 1,
      text: '현관문만 열리면 {n:이} 껑충 뛰어올라 사람 얼굴까지 닿으려 한다.',
      choices: [
        { t: '네 발이 바닥에 있을 때만 인사해 준다', fx: G => { G.plan('jump', 'reward'); G.style('reward'); G.ms('jump', '반가우면 뛰어오르던 버릇은 "네 발이 바닥에 있을 때만 인사"로 바꿨다.'); return '현관에서 한참 등을 돌리고 서 있었다.'; } },
        { t: '뛰어오르면 무릎으로 막는다', fx: G => { G.plan('jump', 'aversive'); G.style('punish'); G.add('bond', -2);
            G.later(4, '뛰는 건 줄었다. 반가워도 현관 앞에서 멈칫했다.'); return '두 번째부턴 덜 뛰었다.'; } },
        { t: '반가워서 그런 거니 같이 반겨 준다', fx: G => { G.plan('jump', 'ignore'); G.add('bond', 3); G.add('joy', 3);
            G.later(6, '손님 바지에 발자국이 남는 날이 많았다.'); return '{n:은} 꼬리가 빠질 듯 흔들었다.'; } },
      ] },

    // ---------- 문제 행동 ----------
    { id: 'bark', when: [6, 170], once: 1, w: 34, cond: s => s.habits.bark >= 1,
      text: '택배 기사가 초인종을 누를 때마다 {n:이} 목이 쉬도록 짖는다.',
      choices: [
        { t: '초인종이 울리면 간식이 나온다고 연습시킨다', fx: G => { G.plan('bark', 'reward'); G.style('reward'); G.ms('bark', '초인종 소리에 짖던 버릇은 간식 연습으로 바꿨다.'); return '처음엔 짖는 소리 반, 씹는 소리 반이었다.'; } },
        { t: '짖으면 "조용"이라 말하고, 멈추면 칭찬한다', fx: G => { G.plan('bark', 'manage'); return '세 번 중 한 번은 멈췄다.'; } },
        { t: '이웃에 피해가 크다. 짖음 방지 목걸이를 채운다', fx: G => { G.plan('bark', 'aversive'); G.style('punish'); G.dogFear(.06); G.ms('bark', '짖음 방지 목걸이를 찼다.');
            G.later(4, '초인종이 울리면 짖지 않았다. 대신 몸을 떨며 현관에서 가장 먼 방으로 갔다.'); return '그날부터 조용해졌다.'; } },
      ] },

    { id: 'guard', when: [5, 170], once: 1, w: 34, cond: s => s.habits.guard >= 1,
      text: '밥 먹는 {n:에게} 손을 뻗자 낮게 으르렁거렸다. 처음 듣는 소리였다.',
      choices: [
        { t: '지나갈 때마다 그릇에 더 맛있는 걸 넣어 준다', fx: G => { G.plan('guard', 'reward'); G.style('reward'); G.ms('guard', '밥그릇을 지키던 버릇은, 사람이 다가오면 좋은 게 생긴다고 가르쳐서 풀었다.'); return '{n:은} 고기 한 조각을 받고 어리둥절해했다.'; } },
        { t: '밥 먹을 땐 다른 방에서, 아무도 다가가지 않게 한다', fx: G => { G.plan('guard', 'manage'); G.ms('guard', '밥은 늘 혼자 조용한 방에서 먹었다.'); return '집이 조용해졌다.'; } },
        { t: '어릴 때 버릇을 잡아야 한다. 밥그릇을 들었다 놨다 해 본다', fx: G => { G.plan('guard', 'aversive'); G.style('punish'); G.habit('guard', .6); G.flag('grabbed', 1); G.ms('guard', '어릴 때 밥그릇을 들었다 놨다 하며 버릇을 잡으려 했다.');
            G.later(5, '{n:은} 밥을 점점 빨리, 등을 돌리고 먹었다. 그릇 근처를 지나가기만 해도 몸이 굳었다.'); return '처음엔 가만히 있었다.'; } },
      ] },

    { id: 'pull', when: [6, 120], once: 1, w: 30, cond: s => s.habits.pull >= 1,
      text: '산책만 나가면 {n:이} 앞으로 끌고 간다. 어깨가 아플 지경이다.',
      choices: [
        { t: '줄이 팽팽하면 멈추고, 느슨해지면 다시 걷는다', fx: G => { G.plan('pull', 'reward'); G.style('reward'); G.ms('pull', '줄이 느슨해야 앞으로 간다는 걸 매일 연습했다.'); return '오 분 동안 열 걸음 갔다.'; } },
        { t: '앞쪽에 고리가 달린 하네스로 바꾼다', fx: G => { G.plan('pull', 'manage'); return '당기면 몸이 옆으로 돌아갔다. 팔이 한결 편했다.'; } },
        { t: '당길 때마다 목줄을 짧게 탁 당겨 교정한다', fx: G => { G.plan('pull', 'aversive'); G.style('punish'); G.dogFear(.04);
            G.later(5, '끌지는 않게 됐다. 그런데 산책 가자는 말에 예전만큼 뛰어오지 않았다.'); return '세 번째부터는 덜 끌었다.'; } },
      ] },

    { id: 'chew', when: [4, 60], once: 1, w: 30, cond: s => s.habits.chew >= 1,
      text: '퇴근해 보니 소파 쿠션이 터져 있었다. {n:은} 솜 더미 가운데서 꼬리를 흔들었다.',
      choices: [
        { t: '산책과 놀이 시간을 늘린다', fx: G => { G.routineUp('walk'); G.plan('chew', 'manage'); return '지쳐서 자는 날이 많아졌다.'; } },
        { t: '씹어도 되는 걸 넉넉히 주고, 물건은 치워 둔다', fx: G => { G.plan('chew', 'reward'); G.ms('chew', '물어뜯던 시기엔 집에 씹을 거리를 넉넉히 뒀다.'); return '소 귀, 터그, 노즈워크 매트. 집이 장난감 가게가 됐다.'; } },
        { t: '터진 쿠션을 앞에 두고 따끔하게 혼낸다', fx: G => { G.style('punish'); G.add('bond', -4); G.plan('chew', 'ignore');
            G.later(3, '보호자가 현관에 들어서면 {n:은} 꼬리를 내리고 먼저 엎드렸다. 그날도 신발 한 짝이 망가져 있었다.'); return '{n:은} 귀를 접었다.'; } },
      ] },

    { id: 'sep', when: [6, 170], once: 1, w: 34, cond: s => s.habits.sep >= 1,
      text: '현관문에 쪽지가 붙었다. "낮에 강아지가 계속 울어요."',
      choices: [
        { t: '짧은 외출부터 다시 시작해 천천히 늘린다', fx: G => { G.plan('sep', 'reward'); G.style('reward'); G.ms('sep', '혼자 남으면 울던 시기가 있었다. 짧은 외출부터 다시 연습했다.'); return '열쇠를 들어도 나가지 않는 연습부터 했다.'; } },
        { t: '동물행동의학 수의사를 찾아간다', fx: G => { G.plan('sep', 'pro'); G.style('pro'); G.ms('sep', '혼자 남으면 울던 시기가 있었다. 행동 진료를 받았다.'); return '집에서 할 숙제를 한 장 받아 왔다.'; } },
        { t: '친구가 있으면 덜 외로울 것 같다. 둘째를 알아본다', fx: G => { G.flag('wantsub', 1); G.plan('sep', 'manage'); return '보호소 홈페이지를 밤마다 들여다봤다.'; } },
        { t: '이웃이 우선이다. 짖음 방지기를 단다', fx: G => { G.plan('sep', 'aversive'); G.style('punish'); G.dogFear(.05);
            G.later(4, '쪽지는 더 붙지 않았다. 홈캠 속 {n:은} 현관 앞에서 소리 없이 떨고 있었다.'); return '다음 날부터 조용했다.'; } },
      ] },

    { id: 'reactive', when: [6, 170], once: 1, w: 30, cond: s => s.habits.reactive >= 1,
      text: '산책길에서 다른 개를 보자 {n:이} 털을 세우고 달려들었다.',
      choices: [
        { t: '짖지 않을 만큼 거리를 두고, 다른 개가 보일 때마다 간식', fx: G => { G.plan('reactive', 'reward'); G.style('reward'); G.ms('reactive', '다른 개를 보면 달려들던 시기가 있었다. 멀찍이서 간식 받는 연습을 오래 했다.'); return '오십 미터 밖에서 시작했다.'; } },
        { t: '다른 개가 없는 시간대로 산책을 옮긴다', fx: G => { G.plan('reactive', 'manage'); G.add('social', -4); return '새벽 다섯 시 산책이 시작됐다.'; } },
        { t: '달려드는 순간 줄을 잡아채며 "안 돼!"', fx: G => { G.plan('reactive', 'aversive'); G.style('punish'); G.dogFear(.06);
            G.later(4, '그 자리에선 멈췄다. 다음 날은 더 멀리서부터 짖었다.'); return '그 자리에선 멈췄다.'; } },
      ] },

    { id: 'stranger', when: [6, 170], once: 1, w: 32, cond: s => s.habits.stranger >= 1,
      text: '손님이 오면 {n:이} 소파 밑에서 짖다가, 손님이 일어서면 발목 쪽으로 달려든다.',
      choices: [
        { t: '손님에겐 간식만 던져 달라 하고, 다가올 때까지 기다린다', fx: G => { G.plan('stranger', 'reward'); G.style('reward'); G.ms('stranger', '낯선 사람을 무서워했다. 손님들은 간식만 던져 주고 기다려 줬다.'); return '두 시간 뒤, {n:이} 손님 신발 냄새를 맡았다.'; } },
        { t: '손님 오는 날은 다른 방에 편히 있게 한다', fx: G => { G.plan('stranger', 'manage'); return '문 너머에서 몇 번 짖다 잠잠해졌다.'; } },
        { t: '익숙해지라고 손님이 직접 쓰다듬게 한다', fx: G => { G.plan('stranger', 'aversive'); G.dogFear(.05);
            G.later(4, '손님 손이 머리 위로 올라온 날, {n:이} 이를 드러냈다.'); return '{n:은} 몸을 굳히고 가만히 있었다.'; } },
      ] },

    { id: 'handle', when: [4, 170], once: 1, w: 30, cond: s => s.habits.handle >= 1,
      text: '발톱을 깎으려고 발을 잡자 {n:이} 으르렁거렸다.',
      choices: [
        { t: '발을 만지면 간식. 하루에 한 발가락씩만', fx: G => { G.plan('handle', 'reward'); G.style('reward'); G.ms('handle', '발 만지는 걸 싫어했다. 한 발가락씩 간식과 짝지어 연습했다.'); return '오늘은 발가락 하나.'; } },
        { t: '발톱은 미용실과 병원에 맡긴다', fx: G => { G.plan('handle', 'manage'); return '한 달에 한 번, 전문가 손에 맡겼다.'; } },
        { t: '여기서 지면 안 된다. 끝까지 붙잡고 깎는다', fx: G => { G.plan('handle', 'aversive'); G.style('punish'); G.dogFear(.05); G.habit('handle', .5);
            G.later(4, '그 뒤로 발 근처에 손만 가도 {n:이} 입을 갖다 댔다.'); return '다 깎긴 했다.'; } },
      ] },

    { id: 'copro', when: [4, 170], once: 1, w: 30, cond: s => s.habits.copro >= 1,
      text: '{n:이} 자기 변을 먹는 걸 봤다. 한두 번이 아니다.',
      choices: [
        { t: '볼일을 보면 바로바로 치운다', fx: G => { G.plan('copro', 'manage'); G.ms('copro', '변을 먹던 시기가 있었다. 볼일을 보면 바로 치웠다.'); return '배변 패드 옆에 집게와 봉투를 상비했다.'; } },
        { t: '사료에 섞는 식분증 보조제를 산다', fx: G => { G.plan('copro', 'ignore');
            G.later(3, '보조제 한 통을 다 먹였다. 달라진 건 없었다.'); return '맛은 이상한지 {n:은} 사료를 한 번 킁킁댔다.'; } },
        { t: '먹으려 할 때마다 "안 돼" 하고 쫓아낸다', fx: G => { G.plan('copro', 'ignore'); G.add('bond', -1);
            G.later(3, '보호자가 다가가면 {n:은} 더 빨리 먹어 치웠다.'); return '{n:은} 놀라서 물러났다.'; } },
      ] },

    { id: 'tail', when: [3, 30], once: 1, w: 34, cond: s => s.habits.tail >= 1,
      text: '{n:이} 제자리에서 빙글빙글 돌며 자기 꼬리를 쫓는다. 하루에도 여러 번이다.',
      choices: [
        { t: '시작하면 이름을 불러 멈추고 다른 놀이로 돌린다', fx: G => { G.plan('tail', 'reward'); G.ms('tail', '자기 꼬리를 쫓던 시기가 있었다. 이름을 불러 다른 놀이로 돌렸다.'); return '이름을 부르자 멈추고 쳐다봤다.'; } },
        { t: '에너지가 남아서다. 산책과 운동을 크게 늘린다', fx: G => { G.routineSet('walk', 2); G.plan('tail', 'ignore');
            G.later(4, '산책은 늘었다. 꼬리 쫓기는 그대로였다.'); return '하루 산책이 두 번이 됐다.'; } },
        { t: '수의사와 상담한다', fx: G => { G.plan('tail', 'pro'); G.style('pro'); return '피부나 꼬리 쪽 통증이 없는지부터 봤다.'; } },
      ] },

    { id: 'mount', when: [6, 60], once: 1, w: 26, cond: s => s.habits.mount >= 1,
      text: '{n:이} 쿠션과 손님 다리에 올라타는 행동을 한다.',
      choices: [
        { t: '시작하려 하면 불러서 다른 놀이로 돌린다', fx: G => { G.plan('mount', 'reward'); return '쿠션은 일단 치워 뒀다.'; } },
        { t: '중성화하면 없어질 거라 해서 수술을 고민한다', fx: G => { if (G.state().dog.intact) { G.neuter(); G.flag('neuterAge', G.state().ageM); } G.plan('mount', 'ignore'); G.later(5, '수술 뒤에도 신나는 날이면 쿠션에 올라탔다.'); return '수술 날짜를 잡았다.'; } },
        { t: '자연스러운 행동이니 크게 신경 쓰지 않는다', fx: G => { G.plan('mount', 'manage'); return '손님 올 때만 방에 들여보냈다.'; } },
      ] },

    { id: 'mark', when: [8, 140], once: 1, w: 26, cond: s => s.habits.mark >= 1,
      text: '{n:이} 집 안 모서리마다 다리를 들고 조금씩 쉬를 한다.',
      choices: [
        { t: '냄새를 효소 세정제로 지우고, 실외 배변 시간을 늘린다', fx: G => { G.plan('mark', 'reward'); return '현관 모서리에 세정제 냄새가 진동했다.'; } },
        { t: '집 안에서는 매너벨트를 채운다', fx: G => { G.plan('mark', 'manage'); return '{n:은} 매너벨트를 한 채 당당하게 걸었다.'; } },
        { t: '현장에서 잡아 크게 혼낸다', fx: G => { G.plan('mark', 'aversive'); G.style('punish'); G.later(4, '마킹은 줄었다. 대신 보호자가 없을 때 침대 위에 했다.'); return '{n:은} 다리를 내리고 도망갔다.'; } },
      ] },

    { id: 'car', when: [6, 160], once: 1, w: 22, cond: s => s.habits.car >= 1,
      text: '차만 타면 {n:이} 침을 흘리고 떨다가 결국 토한다.',
      choices: [
        { t: '시동 안 건 차에서 간식 먹기부터 다시 시작한다', fx: G => { G.plan('car', 'reward'); return '주차장에서 간식만 먹고 내렸다. {n:은} 조금 덜 떨었다.'; } },
        { t: '빈속에 태우고, 수의사에게 멀미약을 상의한다', fx: G => { G.plan('car', 'pro'); return '약을 먹고 탄 날은 한 번도 안 토했다.'; } },
        { t: '자꾸 타야 익숙해진다. 일부러 자주 태운다', fx: G => { G.plan('car', 'aversive'); G.dogFear(.03); G.later(4, '차 문 여는 소리만 나도 {n:은} 침대 밑으로 들어갔다.'); return '토하는 횟수는 그대로였다.'; } },
      ] },

    { id: 'chase', when: [8, 150], once: 1, w: 24, cond: s => s.habits.chase >= 1,
      text: '산책길에 고양이만 보면 {n:이} 튀어 나가려 한다. 줄이 손에서 빠질 뻔했다.',
      choices: [
        { t: '줄을 짧게 잡고, 쳐다보면 이름을 불러 간식으로 시선을 돌린다', fx: G => { G.plan('chase', 'reward'); return '고양이를 보고, 보호자를 봤다. 반은 성공이었다.'; } },
        { t: '마음껏 냄새 맡는 긴 산책으로 욕구를 풀어 준다', fx: G => { G.plan('chase', 'manage'); G.add('joy', 4); return '같은 길을 두 배 시간 동안 걸었다.'; } },
        { t: '튀어 나갈 때마다 줄을 세게 잡아챈다', fx: G => { G.plan('chase', 'aversive'); G.style('punish'); G.later(4, '고양이를 보면 몸을 낮추고 더 조용히 노렸다.'); return '그 자리에 멈춰 섰다.'; } },
      ] },

    { id: 'outdoor', when: [3, 40], once: 1, w: 30, cond: s => s.habits.outdoor >= 1,
      text: '현관문을 열면 {n:이} 네 발로 버티며 나가지 않으려 한다.',
      choices: [
        { t: '현관 앞에서 간식만 먹고 들어오기부터 한다', fx: G => { G.plan('outdoor', 'reward'); G.style('reward'); G.ms('outdoor', '바깥을 무서워해 현관 앞 간식부터 시작했다.'); return '오늘은 계단 세 칸.'; } },
        { t: '집 안 놀이와 노즈워크로 산책을 대신한다', fx: G => { G.plan('outdoor', 'manage'); G.routineSet('walk', 0); return '거실에서 공을 백 번 던졌다.'; } },
        { t: '안고 나가서 공원에 내려놓으면 괜찮아질 거다', fx: G => { G.plan('outdoor', 'aversive'); G.dogFear(.06); G.later(3, '공원에 내려놓은 날 이후로, 목줄만 봐도 소파 밑으로 숨었다.'); return '내려놓자마자 보호자 다리 사이로 숨었다.'; } },
      ] },

    { id: 'bite', when: [8, 180], once: 1, w: 45, cond: s => (s.habits.guard + s.habits.reactive + s.habits.stranger + s.habits.handle) >= 3.2 && s.style.punish >= 2,
      text: '집에 온 손님 손을 {n:이} 물었다. 피가 났다.',
      choices: [
        { t: '행동 전문가와 계획을 세운다', fx: G => { ['guard', 'reactive', 'stranger', 'handle'].forEach(h => G.plan(h, 'pro')); G.style('pro'); G.ms('bite', '손님을 문 일이 있었다. 그 뒤로 전문가와 오래 연습했다.'); return '전문가는 "물기 전에 개가 여러 번 신호를 보냈을 거예요"라고 했다.'; } },
        { t: '입마개에 적응시키고, 손님이 오면 공간을 나눈다', fx: G => { ['guard', 'stranger'].forEach(h => G.plan(h, 'manage')); G.ms('bite', '손님을 문 뒤로 입마개 연습을 했다.'); return '입마개 안에 간식을 넣어 주며 연습을 시작했다.'; } },
        { t: '다시는 못 하게 그 자리에서 크게 혼낸다', fx: G => { G.style('punish'); G.dogFear(.06); G.add('bond', -6); G.ms('bite', '손님을 문 날, 크게 혼났다.');
            G.later(5, '{n:은} 으르렁거리는 소리를 거의 내지 않게 됐다. 경고 없이 바로 무는 날이 생겼다.'); return '{n:은} 납작 엎드렸다.'; } },
      ] },

    { id: 'steal', when: [5, 90], once: 1, w: 16,
      text: '{n:이} 빨래 바구니에서 양말을 물고 거실을 뛰어다닌다. 잡으러 가면 더 신나서 도망간다.',
      choices: [
        { t: '더 좋은 간식을 보여 주고 바꾼다', fx: G => { G.style('reward'); G.add('manners', 3); G.later(4, '양말을 물면 보호자 앞에 와서 내려놓고 간식을 기다렸다.'); return '{n:은} 양말을 툭 떨어뜨렸다.'; } },
        { t: '쫓지 않고 등을 돌려 다른 방으로 간다', fx: G => { G.later(4, '쫓아오는 사람이 없으니 양말 놀이가 시시해졌는지 횟수가 줄었다.'); return '잠시 뒤 {n:이} 양말을 물고 따라왔다.'; } },
        { t: '끝까지 쫓아가 입에서 빼앗는다', fx: G => { G.style('punish'); G.habit('guard', .6); G.later(4, '물건을 물면 침대 밑으로 들어가 으르렁거렸다.'); return '빼앗긴 했다. 거실을 세 바퀴 돌았다.'; } },
      ] },

    { id: 'sock', tag: 'toy', when: [5, 120], once: 1, w: 8,
      text: '양말 한 짝이 없어졌다. 그날 밤부터 {n:이} 밥을 남기고 자꾸 토하려 한다.',
      choices: [
        { t: '바로 병원에 가서 엑스레이를 찍는다', fx: G => { G.add('health', -7); G.ms('sock', '양말을 삼켜 병원에서 꺼낸 적이 있다.'); return '위 속에 양말이 있었다. 내시경으로 꺼냈다.'; } },
        { t: '수의사에게 전화해 상태를 설명한다', fx: G => { G.add('health', -8); return '구토가 이어지면 바로 오라고 했다. 다음 날 아침에 갔다.'; } },
        { t: '하루 굶기고 지켜본다', fx: G => { G.add('health', -6); G.later(1, '이틀째 물도 토했다. 장이 막혀 수술했다.', G2 => { G2.add('health', -12); G2.lifeMod(-.25); G2.ms('sock', '양말을 삼켜 배를 열었다.'); }); return '밤새 구석에 엎드려 있었다.'; } },
      ] },

    { id: 'harness', when: [5, 160], once: 1, w: 26, cond: s => s.habits.handle >= .5 || s.habits.guard >= 1,
      text: '산책 가려고 하네스를 들자 {n:이} 뒷걸음질 치며 이를 드러냈다.',
      choices: [
        { t: '하네스를 바닥에 두고 냄새 맡으면 간식부터 다시 시작한다', fx: G => { G.plan('handle', 'reward'); G.style('reward'); return '오늘은 하네스 근처에서 간식 다섯 개.'; } },
        { t: '머리를 넣지 않는 다른 하네스로 바꾼다', fx: G => { G.plan('handle', 'manage'); return '옆에서 채우는 하네스는 덜 싫어했다.'; } },
        { t: '이건 지면 안 된다. 붙잡고 빨리 채운다', fx: G => { G.plan('handle', 'aversive'); G.style('punish'); G.habit('handle', .5); G.later(4, '하네스 소리만 나도 {n:은} 소파 밑으로 들어갔다. 산책 나가기가 매일 씨름이었다.'); return '채우긴 했다. 손등에 이빨 자국이 남았다.'; } },
      ] },

    { id: 'crate', when: [2, 30], once: 1, w: 14,
      text: '켄넬 교육을 해 두면 병원·이동·재난 때 좋다고 한다.',
      choices: [
        { t: '켄넬 안에 간식과 담요를 두고, 문은 열어 둔 채 시작한다', fx: G => { G.flag('crate', 2); G.add('calm', 3); G.later(6, '피곤하면 {n:은} 스스로 켄넬에 들어가 잤다.'); return '{n:은} 켄넬 안 간식만 쏙 빼 먹고 나왔다.'; } },
        { t: '말썽 피울 때 잠깐 들어가 있는 곳으로 쓴다', fx: G => { G.flag('crate', 0); G.add('calm', -2); G.later(6, '켄넬 문 소리만 나도 {n:은} 납작 엎드렸다. 병원 갈 때 넣기가 힘들었다.'); return '문을 닫자 한참 긁었다.'; } },
        { t: '굳이 필요 없을 것 같다. 하지 않는다', fx: G => { G.flag('crate', 1); return '켄넬은 베란다 창고로 들어갔다.'; } },
      ] },

    // ---------- 생활 ----------
    { id: 'treat', when: [8, 150], once: 1, w: 18,
      text: '저녁 먹을 때마다 {n:이} 식탁 밑에서 빤히 올려다본다.',
      choices: [
        { t: '양념 없는 고기만 조금씩 나눠 준다', fx: G => { G.routineSet('treat', 2); G.add('joy', 4); G.later(8, '{n:의} 허리선이 점점 사라졌다.'); return '삼겹살 한 점은 금방 한 점 반이 됐다.'; } },
        { t: '방석에 가서 엎드려 있으면 개 간식을 준다', fx: G => { G.style('reward'); G.add('manners', 5); return '저녁마다 방석에 엎드려 기다리는 버릇이 생겼다.'; } },
        { t: '식사 시간엔 다른 방에서 노즈워크를 하게 한다', fx: G => { G.add('calm', 2); return '식탁 밑은 조용해졌다.'; } },
      ] },

    { id: 'weight', when: [18, 170], once: 1, w: 50, cond: s => s.st.weight >= 68,
      text: '건강검진에서 체중을 줄여야 한다는 말을 들었다. 갈비뼈가 잘 안 만져진다고.',
      choices: [
        { t: '사료를 저울로 재서 주고 산책을 늘린다', fx: G => { G.routineSet('treat', 0); G.routineUp('walk'); G.ms('weight', '살이 쪄서 사료를 저울로 재기 시작했다.'); G.lifeMod(.2); return '{n:은} 빈 그릇 앞에서 오래 앉아 있었다.'; } },
        { t: '다이어트 사료로 바꾼다', fx: G => { G.add('weight', -6); return '사료 봉지만 바뀌었다. 간식은 그대로였다.'; } },
        { t: '간식만 조금 줄여 보고 지켜본다', fx: G => { G.add('weight', -2); G.later(6, '체중은 거의 그대로였다.'); return '간식 통이 조금 높은 곳으로 갔다.'; } },
      ] },

    { id: 'thunder', when: [6, 180], once: 1, w: 18,
      text: '천둥이 치던 밤, {n:이} 욕조 뒤로 숨어 나오지 않았다.',
      choices: [
        { t: '숨을 곳을 만들어 주고 곁에 조용히 있는다', fx: G => { G.add('bond', 5); G.add('calm', 4); return '숨소리가 조금씩 느려졌다.'; } },
        { t: '평소에 천둥 소리를 작게 틀어 두고 간식을 주는 연습을 한다', fx: G => { G.style('reward'); G.add('calm', 6); G.dogFear(-.04); G.later(8, '다음 장마엔 덜 떨었다. 그래도 욕조 뒤는 여전히 {n:의} 자리였다.'); return '아주 작은 소리부터 시작했다.'; } },
        { t: '달래 주면 겁이 커진다고 해서 모른 척한다', fx: G => { G.add('calm', -3); G.later(8, '천둥이 치면 {n:은} 혼자 욕조 뒤로 갔다. 보호자를 찾지 않았다.'); return '한 시간 뒤 스스로 나왔다.'; } },
      ] },

    { id: 'vet', when: [6, 180], once: 1, w: 14,
      text: '동물병원 문 앞에서 {n:이} 네 발로 버틴다.',
      choices: [
        { t: '진료 없는 날 들러서 간식만 받고 나온다', fx: G => { G.style('reward'); G.add('calm', 4); G.later(6, '간호사 선생님이 {n:의} 이름을 외웠다. {n:은} 병원 문 앞에서 꼬리를 흔들었다.'); return '접수대에서 간식 두 개를 받았다.'; } },
        { t: '빨리 끝내는 게 낫다. 안고 들어간다', fx: G => { return '진료대 위에서 떨었다. 십 분 만에 끝났다.'; } },
        { t: '진료 전에 먹이는 안정제를 상의한다', fx: G => { G.add('calm', 2); return '약을 먹고 간 날은 덜 떨었다.'; } },
      ] },

    { id: 'groom', when: [4, 150], once: 1, w: 14,
      text: '미용을 하고 돌아온 {n:이} 한쪽 구석에서 떨고 있다.',
      choices: [
        { t: '집에서 빗질과 발 만지기를 조금씩 연습한다', fx: G => { G.style('reward'); G.add('calm', 3); G.add('bond', 3); return '빗을 보면 다가오기 시작했다.'; } },
        { t: '다른 미용실을 찾아본다', fx: G => { return '세 번째 미용실이 마음에 들었다.'; } },
        { t: '미용 간격을 늘리고 집에서 대충 다듬는다', fx: G => { G.add('calm', 1); G.later(6, '털이 엉켜 결국 짧게 밀었다.'); return '가위질은 서툴렀다. {n:은} 개의치 않았다.'; } },
      ] },

    { id: 'move', when: [12, 170], once: 1, w: 12,
      text: '이사를 했다. {n:은} 새집 냄새에 이틀째 구석에서 나오지 않는다.',
      choices: [
        { t: '쓰던 방석을 그대로 두고, 같은 시간에 산책한다', fx: G => { G.add('calm', 4); G.ms('move', '이사한 집에도 같은 방석, 같은 산책 시간이 따라왔다.'); return '사흘째, 거실 한가운데서 배를 까고 잤다.'; } },
        { t: '새 집이니 새 방석과 장난감으로 기분을 바꿔 준다', fx: G => { G.add('joy', 3); G.add('calm', -1); G.ms('move', '이사한 날 새 방석을 받았다.'); return '새 방석 냄새를 오래 맡더니 옛 담요 위에 누웠다.'; } },
        { t: '스스로 탐색할 시간을 준다', fx: G => { G.add('calm', -2); G.ms('move', '이사하고 한동안 구석에서 지냈다.'); return '일주일쯤 걸렸다.'; } },
      ] },

    { id: 'baby', when: [18, 150], once: 1, w: 10, cond: s => ['couple', 'remote'].includes(s.home.id),
      text: '집에 아기가 생겼다. 열 달 뒤면 가족이 하나 늘어난다.',
      choices: [
        { t: '아기 울음소리를 미리 들려주고, 태어나면 천천히 소개한다', fx: G => { G.add('calm', 3); G.budget(-.6); G.ms('baby', '아기가 태어났다. {n:은} 아기 침대 옆을 지켰다.'); return '아기가 울면 {n:이} 먼저 일어나 보호자를 쳐다봤다.'; } },
        { t: '안전문을 달아 아기와 개 공간을 나누고, 늘 지켜볼 때만 함께 둔다', fx: G => { G.budget(-.6); G.ms('baby', '아기가 태어난 뒤로 안전문 너머에서 아기를 지켜봤다.'); return '{n:은} 안전문에 턱을 괴고 아기를 구경했다.'; } },
        { t: '자연스럽게 친해지도록 늘 같이 둔다', fx: G => { G.budget(-.7); G.ms('baby', '아기가 태어났다. 늘 같은 거실에 있었다.'); G.later(14, '아기가 기어 다니며 {n:의} 밥그릇에 손을 뻗은 날, {n:이} 낮게 으르렁거렸다.', G2 => { G2.habit('guard', .8); }); return '처음 몇 달은 아무 일 없었다.'; } },
      ] },

    { id: 'busy', when: [12, 170], once: 1, w: 12, cond: s => ['single', 'couple', 'student'].includes(s.home.id),
      text: '보호자가 직장을 옮겼다. 야근이 잦아졌다.',
      choices: [
        { t: '평일 낮에 산책 도우미를 부른다', fx: G => { G.alone(+1); G.ms('busy', '보호자가 바빠진 해에는 산책 도우미 선생님이 왔다.'); return '처음엔 짖었고, 나중엔 오후 두 시를 기다렸다.'; } },
        { t: '평일엔 짧게, 주말에 몰아서 길게 놀아 준다', fx: G => { G.alone(+3); G.budget(-.4); G.later(6, '주말이면 {n:은} 아침부터 현관 앞에 앉아 있었다.'); return '주말 산책이 세 시간이 됐다.'; } },
        { t: '출근 전 산책 시간을 당겨서라도 매일 지킨다', fx: G => { G.alone(+3); G.budget(-.6); G.flag('busy', 1); G.ms('busy', '보호자가 바빠진 해에도 새벽 산책은 빠지지 않았다.'); return '새벽 여섯 시, 가로등 아래를 걸었다.'; } },
      ] },

    { id: 'holiday', when: [8, 170], once: 1, w: 12,
      text: '명절이라 시골집에 같이 갔다. 마당이 넓다.',
      choices: [
        { t: '긴 줄을 매고 마당을 같이 돈다', fx: G => { G.add('joy', 4); return '닭장 앞에서 하루 종일 꼬리를 흔들었다.'; } },
        { t: '울타리가 있으니 마당에 풀어 둔다', fx: G => { G.add('joy', 7); G.risk('roadHoliday'); return '논두렁을 신나게 뛰어다녔다.'; } },
        { t: '장거리는 무리라 펫호텔에 맡긴다', fx: G => { G.add('calm', -3); return '데리러 가니 목이 쉬어 있었다.'; } },
      ] },

    { id: 'choco', tag: 'food', when: [6, 170], once: 1, w: 8,
      text: '식탁 위 초콜릿 봉지가 비어 있다. {n:의} 입가가 갈색이다.',
      choices: [
        { t: '봉지를 챙겨 바로 병원으로 간다', fx: G => { G.add('health', -3); G.ms('choco', '초콜릿을 훔쳐 먹고 응급실에 간 적이 있다.'); return '밤 열한 시 응급실이었다.'; } },
        { t: '수의사에게 전화해 먹은 양과 몸무게부터 말한다', fx: G => { G.add('health', -4); return '양을 듣더니 바로 오라고 했다.'; } },
        { t: '검색해 본 대로 소금물을 먹여 토하게 한다', fx: G => { G.add('health', -14); G.lifeMod(-.15); G.later(1, '토하긴 했다. 그날 밤 물을 계속 찾더니 다리를 떨었다. 결국 병원에 갔다.'); return '조금 토했다.'; } },
      ] },

    // ---------- 둘째·새끼 ----------
    { id: 'subdog', when: [20, 96], once: 1, w: 9, cond: s => s.subs.length === 0 || s.flags.wantsub,
      text: '{sub_intro}',
      prep: G => G.prepSub(),
      choices: [
        { t: '데려온다', fx: G => G.addSub() },
        { t: '{n} 하나에게 집중하기로 한다', fx: G => { G.flag('wantsub', 0); return '{n:은} 그날도 소파 한가운데를 차지했다.'; } },
      ] },
    { id: 'subfight', when: [24, 170], once: 1, w: 18, cond: s => s.subs.some(d => d.alive && !d.pup),
      text: '간식 하나를 두고 {n:와} {s:이} 붙었다. 털이 날렸다.',
      choices: [
        { t: '간식과 밥은 따로, 자리도 따로. 먼저 받는 순서도 정해 둔다', fx: G => { G.plan('guard', 'manage'); G.add('calm', 2); G.later(5, '둘은 각자 방석에서 각자 간식을 먹었다. 잘 때는 붙어 잤다.'); return '그날 저녁부터 그릇이 두 방으로 나뉘었다.'; } },
        { t: '서열은 개들끼리 정한다니 지켜본다', fx: G => { G.habit('guard', .6); G.add('calm', -4); G.later(4, '{n:의} 귀에 작은 상처가 남았다. 싸움은 몇 달에 한 번씩 있었다.', G2 => { G2.add('health', -3); }); return '몇 번 으르렁대다 끝났다.'; } },
        { t: '싸울 때마다 둘 다 크게 혼낸다', fx: G => { G.style('punish'); G.later(4, '보호자가 없을 때 더 크게 싸웠다.', G2 => { G2.habit('guard', .5); }); return '둘 다 납작 엎드렸다.'; } },
      ] },
    { id: 'breed', when: [18, 84], once: 1, w: 40, cond: (s, G) => G.canBreed(),
      text: '{n:와} {s:은} 같은 견종이고, 둘 다 중성화를 하지 않았다. 새끼를 볼까 하는 마음이 든다.',
      choices: [
        { t: '새끼를 본다', fx: G => G.breedPups() },
        { t: '둘 다 중성화한다', fx: G => { G.neuter(); G.neuterSubs(); return '둘 다 넥카라를 쓰고 서로를 이상하게 쳐다봤다.'; } },
      ] },
    { id: 'friend', when: [10, 150], once: 1, w: 10, cond: s => s.st.social >= 45,
      text: '산책길에 매일 마주치는 개가 생겼다. 이름은 단비, 시바견이다.',
      choices: [
        { t: '산책 시간을 단비네와 맞춘다', fx: G => { G.add('social', 8); G.add('joy', 6); G.ms('friend', '산책 친구 단비가 있었다.'); return '둘은 만나면 엉덩이 냄새부터 맡았다.'; } },
        { t: '반갑게 인사만 하고 우리 길을 간다', fx: G => { G.add('social', 2); return '{n:은} 지나온 길을 몇 번 돌아봤다.'; } },
      ] },

    // ---------- 생활 속 사고·관리 (tag = 협업 분야, 게임 안에서는 보이지 않음) ----------
    { id: 'register', tag: 'registration', when: [0, 8], once: 1, w: 40, cond: s => s.ticks <= 3,
      text: '구청에서 동물등록 안내문이 왔다. 두 달 넘은 개는 등록해야 한다고 적혀 있었다.',
      choices: [
        { t: '몸에 작은 칩을 넣어 등록한다', fx: G => { G.flag('registered', 2); return '주사 한 번이었다.'; } },
        { t: '칩은 마음에 걸린다. 등록 인식표를 달아 준다', fx: G => { G.flag('registered', 1); return '걸을 때마다 인식표가 짤랑거렸다.'; } },
        { t: '산책 때 늘 줄을 하니 천천히 알아본다', fx: G => { G.flag('registered', 0); return '안내문은 냉장고 자석 밑에 붙었다.'; } },
      ] },
    { id: 'insure', tag: 'insurance', when: [2, 40], once: 1, w: 18,
      text: '첫 진료비 영수증을 보고 한참 앉아 있었다. 펫보험을 알아볼까.',
      choices: [
        { t: '보험을 하나 든다', fx: G => { G.flag('insured', 1); return '매달 커피 몇 잔 값이 빠져나갔다.'; } },
        { t: '보험 대신 {n} 통장을 따로 만들어 모은다', fx: G => { G.flag('insured', 0); return '통장 이름을 "{n} 병원비"라고 지었다.'; } },
      ] },
    { id: 'grape', tag: 'food', when: [6, 170], once: 1, w: 9,
      text: '식탁에 둔 포도가 몇 알 비었다. 바닥에 꼭지만 남아 있다.',
      choices: [
        { t: '바로 병원으로 간다', fx: G => { G.add('health', -3); G.ms('grape', '포도를 몰래 먹고 병원에 간 적이 있다.'); return '토하게 하고 수액을 맞았다.'; } },
        { t: '몇 알인지 세어 보고 수의사에게 전화한다', fx: G => { G.add('health', -4); return '양이 적어도 오라고 했다. 개마다 다르다고.'; } },
        { t: '평소 과일을 잘 먹던 아이다. 하루 지켜본다', fx: G => { G.add('health', -6); G.later(1, '이틀 뒤부터 밥을 안 먹었다. 병원에서 신장 수치가 높다고 했다.', G2 => { G2.add('health', -10); G2.lifeMod(-.3); }); return '그날은 멀쩡해 보였다.'; } },
      ] },
    { id: 'xylitol', tag: 'food', when: [6, 170], once: 1, w: 7,
      text: '가방에서 떨어진 껌 통을 {n:이} 물어뜯어 놓았다. 자일리톨 껌이다.',
      choices: [
        { t: '껌 통을 들고 바로 병원으로 뛴다', fx: G => { G.add('health', -4); return '혈당을 재며 밤새 지켜봤다. 아침에 데려왔다.'; } },
        { t: '수의사에게 전화해 성분표를 읽어 준다', fx: G => { G.add('health', -5); return '읽자마자 지금 오라고 했다.'; } },
        { t: '껌 두어 개다. 물을 먹이고 지켜본다', fx: G => { G.add('health', -6); G.later(1, '한 시간 뒤 다리가 풀려 쓰러졌다. 병원까지 십 분이 그렇게 길 수 없었다.', G2 => { G2.add('health', -12); G2.lifeMod(-.25); }); return '처음엔 괜찮아 보였다.'; } },
      ] },
    { id: 'bone', tag: 'food', when: [5, 160], once: 1, w: 10,
      text: '산책길 풀숲에서 {n:이} 뭔가를 물고 놓지 않는다. 치킨 뼈다.',
      choices: [
        { t: '더 좋은 간식을 내밀고 바꾼다', fx: G => { G.style('reward'); G.add('manners', 4); G.ms('bone', '입에 문 걸 간식과 바꾸는 법을 알았다.'); return '{n:은} 뼈를 내려놓고 간식을 받았다.'; } },
        { t: '평소 연습한 "놔" 신호를 준다', fx: G => { if (G.state().st.manners >= 40) { G.add('manners', 3); return '{n:이} 뼈를 툭 떨어뜨렸다.'; } G.add('health', -6); return '못 들은 척 꿀꺽 삼켰다. 밤새 지켜봤다.'; } },
        { t: '삼키기 전에 입을 벌려 꺼낸다', fx: G => { G.style('punish'); G.habit('guard', .7); G.add('bond', -3); G.later(4, '그 뒤로 {n:은} 뭘 물면 고개를 돌리고 더 빨리 삼켰다.'); return '꺼내긴 했다. 손등에 이빨 자국이 남았다.'; } },
      ] },
    { id: 'onion', tag: 'food', when: [10, 170], once: 1, w: 9, cond: s => s.home.id === 'kids' || s.home.id === 'retired',
      text: s => s.home.id === 'kids' ? '저녁 먹던 아이가 짜장면 몇 가닥을 식탁 밑으로 몰래 내렸다.' : '할아버지가 찌개 속 고기를 건져 식탁 밑으로 내렸다. 양파가 붙어 있었다.',
      choices: [
        { t: '"주면 안 되는 음식" 목록을 냉장고에 붙인다', fx: G => { return '양파, 포도, 초콜릿, 자일리톨, 닭뼈. 가족이 다 같이 읽었다.'; } },
        { t: '대신 줄 개 간식을 식탁 옆에 둔다', fx: G => { G.add('weight', 1); return '아이가 개 간식을 주는 담당이 됐다.'; } },
        { t: '고기만 골라 줬으니 괜찮다', fx: G => { G.later(1, '다음 날 잇몸이 창백했다. 병원에서 양파 때문이라고 했다.', G2 => { G2.add('health', -8); }); return '{n:은} 꼬리를 흔들었다.'; } },
      ] },
    { id: 'foodswitch', tag: 'food', when: [4, 170], once: 1, w: 10,
      text: '사료를 바꿨더니 {n:이} 며칠째 설사를 한다.',
      choices: [
        { t: '예전 사료와 섞어서 일주일에 걸쳐 바꾼다', fx: G => { G.add('health', 3); return '천천히 바꾸니 금방 괜찮아졌다.'; } },
        { t: '병원에서 알레르기 검사를 받는다', fx: G => { G.add('health', 2); G.flag('allergyKnown', 1); return '닭고기 알레르기였다. 성분표 읽는 게 습관이 됐다.'; } },
        { t: '원래 사료로 바로 돌아간다', fx: G => { G.add('health', 1); return '설사는 멎었다. 새 사료 한 포대가 남았다.'; } },
      ] },
    { id: 'toy', tag: 'toy', when: [3, 140], once: 1, w: 10,
      text: '삑삑이 장난감 속 부품이 사라졌다. {n:이} 자꾸 헛구역질을 한다.',
      choices: [
        { t: '바로 병원에 간다', fx: G => { G.add('health', -6); G.flag('toySafe', 1); G.ms('toy', '장난감 부품을 삼켜 내시경으로 꺼낸 적이 있다.'); return '내시경으로 꺼냈다. 손톱만 한 플라스틱이었다.'; } },
        { t: '수의사에게 전화해 부품 크기를 말한다', fx: G => { G.add('health', -7); G.flag('toySafe', 1); return '크기를 듣더니 오늘 바로 오라고 했다.'; } },
        { t: '작은 부품이다. 변으로 나오는지 하루 지켜본다', fx: G => { G.add('health', -5); G.flag('toySafe', 1); G.later(1, '사흘째 아무것도 못 먹었다. 결국 수술했다. 배에 긴 흉터가 남았다.', G2 => { G2.add('health', -12); G2.lifeMod(-.3); G2.ms('toy', '장난감 부품을 삼켜 배를 열었다.'); }); return '그날 밤은 조용했다.'; } },
      ] },
    { id: 'leash', tag: 'gear', when: [8, 170], once: 1, w: 9,
      text: '산책하다 낡은 줄 고리가 툭 끊어졌다. {n:이} 차도 쪽으로 뛰었다.',
      choices: [
        { t: '이름을 부르고 반대쪽으로 달린다', fx: G => { if (G.state().st.manners >= 45) { G.add('bond', 4); return '{n:이} 돌아서 달려왔다. 품에 안고 주저앉았다.'; } G.risk('roadLeash'); return '{n:은} 더 뛰었다. 다행히 골목에서 멈췄다.'; } },
        { t: '그 자리에 쭈그려 앉아 간식 봉지를 흔든다', fx: G => { if (G.state().st.bond >= 50) { G.add('bond', 3); return '봉지 소리에 {n:이} 돌아왔다.'; } G.risk('roadLeash'); return '한참 뒤에야 돌아왔다. 경적이 두 번 울렸다.'; } },
        { t: '놓치면 안 된다. 뒤쫓아 뛴다', fx: G => { G.risk('roadLeash'); G.risk('roadLeash2'); return '쫓을수록 더 멀리 뛰었다. 경적 소리가 났다.'; } },
      ] },
    { id: 'lost', tag: 'registration', when: [10, 170], once: 1, w: 7,
      text: '택배를 받는 사이 현관문이 덜 닫혔다. {n:이} 보이지 않는다.',
      choices: [
        { t: '동네 커뮤니티에 올리고 전단을 붙인다', fx: G => G.lostResult('flyer') },
        { t: '유기동물 공고를 하루 종일 뒤진다', fx: G => G.lostResult('notice') },
      ] },
    { id: 'bitten', tag: 'insurance', when: [8, 170], once: 1, w: 8,
      text: '산책길에서 목줄 없는 큰 개가 달려와 {n:을} 물었다.',
      choices: [
        { t: '바로 병원에 가고, 상대 보호자와 연락처를 주고받는다', fx: G => { G.add('health', -8); G.add('calm', -6); G.habit('reactive', .5); G.ms('bitten', '산책길에서 큰 개에게 물린 적이 있다.'); return G.insured() ? '목덜미를 꿰맸다. 보험 청구서를 쓰는 동안 {n:은} 옆에서 떨면서 잤다.' : '목덜미를 꿰맸다. 상대 보호자는 사과했지만 병원비 얘기에선 말끝을 흐렸다.'; } },
        { t: '피가 안 나니 집에서 소독하고 지켜본다', fx: G => { G.add('health', -4); G.add('calm', -6); G.habit('reactive', .8); G.ms('bitten', '산책길에서 큰 개에게 물린 적이 있다.'); G.later(1, '사흘 뒤 털 속 상처가 곪았다. 결국 병원에서 째고 꿰맸다.', G2 => G2.add('health', -9)); return '겉으로는 멀쩡해 보였다.'; } },
      ] },
    { id: 'kidbite', tag: 'insurance', when: [10, 170], once: 1, w: 8, cond: s => s.home.id === 'kids' || s.home.id === 'retired',
      text: '놀러 온 꼬마가 자고 있는 {n:을} 와락 끌어안았다. {n:이} 꼬마 손을 물었다.',
      choices: [
        { t: '"자거나 먹는 개는 건드리지 않기"를 아이들과 약속한다', fx: G => { G.add('calm', 2); return '그 뒤로 {n:의} 방석은 "건드리면 안 되는 자리"가 됐다.'; } },
        { t: '다시는 그러지 못하게 {n:을} 크게 혼낸다', fx: G => { G.style('punish'); G.habit('guard', .6); G.dogFear(.05); G.later(5, '{n:은} 으르렁대는 소리를 잘 내지 않게 됐다. 아이들이 다가오면 말없이 자리를 피했다.'); return '{n:은} 침대 밑으로 들어갔다.'; } },
        { t: '아이를 병원에 데려가고 사과하러 간다', fx: G => { return G.insured() ? '치료비는 보험에서 나왔다. 과일 한 상자를 들고 갔다.' : '치료비를 물어 줬다. 과일 한 상자도 들고 갔다.'; } },
      ] },
    { id: 'heat', tag: 'gear', when: [8, 170], once: 1, w: 9, cond: s => seasonIdx(s) === 1,
      text: '한여름 오후, 산책을 나가자마자 {n:이} 혀를 길게 빼고 주저앉았다.',
      choices: [
        { t: '그늘로 안고 가서 몸을 적신다. 여름 산책은 해 진 뒤로', fx: G => { G.add('health', -2); return '그해 여름 산책은 밤 아홉 시였다.'; } },
        { t: '물을 먹이고 그늘에서 쉬었다가 마저 걷는다', fx: G => { G.add('health', G.brachy() ? -14 : -7); G.later(1, G2 => G2.brachy() ? '그날 밤 숨이 가라앉지 않아 병원에 갔다. 열사병 직전이라고 했다.' : '저녁 내내 물만 마시고 누워 있었다.'); return '조금 쉬니 일어났다.'; } },
      ] },
    { id: 'salt', tag: 'gear', when: [8, 170], once: 1, w: 8, cond: s => seasonIdx(s) === 3,
      text: '제설제가 뿌려진 길을 걷고 온 날, {n:이} 발바닥을 계속 핥는다.',
      choices: [
        { t: '산책 뒤엔 발을 씻기고 크림을 발라 준다', fx: G => { G.add('health', 1); return '발 닦는 수건이 현관에 하나 더 걸렸다.'; } },
        { t: '신발을 신겨 본다', fx: G => { G.add('joy', -2); return '세 걸음 걷고 얼음이 됐다.'; } },
        { t: '물티슈로 쓱 닦아 준다', fx: G => { G.later(1, '발가락 사이가 빨갛게 갈라졌다.', G2 => G2.add('health', -3)); return '{n:은} 그래도 계속 핥았다.'; } },
      ] },
    { id: 'tick', tag: 'vet', when: [6, 170], once: 1, w: 8, cond: s => seasonIdx(s) === 0 || seasonIdx(s) === 2,
      text: '풀숲 산책을 하고 온 날, 귀 뒤에서 진드기가 만져졌다.',
      choices: [
        { t: '병원에서 떼고 예방약을 시작한다', fx: G => { G.flag('tickPrev', 1); return '달력에 매달 예방약 날짜를 그렸다.'; } },
        { t: '진드기 핀셋으로 직접 뗀다', fx: G => { G.add('health', -2); return '잘 떼어졌는지 한참 들여다봤다.'; } },
      ] },
    { id: 'teeth', tag: 'dental', when: [24, 150], once: 1, w: 10, cond: s => !s.routine.teeth,
      text: '입 냄새가 심해졌다는 말을 들었다. 양치는 한 번도 안 해 봤다.',
      choices: [
        { t: '손가락 칫솔부터 매일 조금씩 연습한다', fx: G => { G.flag('teeth', 2); G.routineSet('teeth', 2); G.style('reward'); G.lifeMod(.15); return '처음엔 칫솔을 씹었다.'; } },
        { t: '치석 껌을 하루 하나 준다', fx: G => { G.flag('teeth', 1); G.add('weight', 1); return '껌은 3초 만에 사라졌다.'; } },
        { t: '1년에 한 번 병원 스케일링으로 관리한다', fx: G => { G.flag('teeth', 1); return '마취 전 검사부터 받았다.'; } },
      ] },
    { id: 'feeder', tag: 'gear', when: [8, 170], once: 1, w: 8, cond: s => s.home.alone + s.aloneMod >= 8,
      text: '야근이 길어진 날, {n:의} 저녁밥 시간이 세 시간 넘게 지났다.',
      choices: [
        { t: '자동 급식기와 홈캠을 들인다', fx: G => { G.add('calm', 3); return '정해진 시간에 사료가 떨어졌다.'; } },
        { t: '옆집에 열쇠를 맡겨 부탁해 둔다', fx: G => { G.add('social', 3); return '옆집 사람이 {n:을} "우리 둘째"라고 불렀다.'; } },
      ] },
    { id: 'trip', tag: 'travel', when: [12, 140], once: 1, w: 9,
      text: '처음으로 {n:와} 같이 여행을 가기로 했다. 개도 묵을 수 있는 바닷가 숙소다.',
      choices: [
        { t: '간다', fx: G => { G.add('joy', 10); G.add('bond', 5); G.ms('trip', '바다를 처음 본 날, 파도를 보고 짖었다.'); return '바다를 보더니 파도한테 짖었다. 그날 사진이 휴대폰 배경이 됐다.'; } },
        { t: '가까운 강변에서 하루 놀다 온다', fx: G => { G.add('joy', 5); return '{n:은} 비둘기에게 짖었다.'; } },
      ] },

    // ---------- 노견 ----------
    { id: 'joint', tag: 'supplement', when: [0, 999], once: 1, w: 22, cond: (s, G) => G.senior() >= .68,
      text: '거실 바닥에서 {n:의} 뒷다리가 자꾸 미끄러진다. 일어날 때 떨린다.',
      choices: [
        { t: '미끄럼 방지 매트를 온 집에 깐다', fx: G => { G.add('health', 4); return '{n:은} 다시 현관까지 마중을 나왔다.'; } },
        { t: '관절 영양제를 먹이기 시작한다', fx: G => { G.add('health', 2); return '영양제를 간식인 줄 알고 잘 먹었다.'; } },
        { t: '무리하지 않게 산책을 줄이고 쉬게 한다', fx: G => { G.routineSet('walk', 0); G.later(4, '근육이 빠져 뒷다리가 더 가늘어졌다.', G2 => G2.add('health', -4)); return '{n:은} 창가에서 오래 잤다.'; } },
      ] },
    { id: 'stairs', when: [0, 999], once: 1, w: 30, cond: (s, G) => G.senior() >= .72,
      text: '계단 앞에서 {n:이} 멈춰 섰다. 올려다보기만 한다.',
      choices: [
        { t: '안아서 올린다. 소파에는 경사로를 놓는다', fx: G => { G.add('bond', 5); G.ms('stairs', '나이가 들어 계단을 못 오르게 되자 안겨서 다녔다.'); return '안기면 {n:은} 보호자 어깨에 턱을 얹었다.'; } },
        { t: '자기 발로 오르게 천천히 기다린다', fx: G => { G.ms('stairs', '나이가 들어도 계단은 자기 발로 올랐다. 아주 천천히.'); return '한 칸 오르고 쉬고, 또 한 칸.'; } },
      ] },
    { id: 'cognitive', when: [0, 999], once: 1, w: 30, cond: (s, G) => G.senior() >= .8 && G.rand() < .55 - .1 * s.routine.play,
      text: '새벽에 {n:이} 벽을 보고 서 있었다. 이름을 부르자 한참 뒤에 돌아봤다.',
      choices: [
        { t: '낮에 짧은 산책과 냄새 놀이를 늘린다', fx: G => { G.add('calm', 4); G.ms('cog', '늙어서 밤마다 서성였다. 낮에 냄새 맡는 산책을 늘렸다.'); return '낮에 많이 맡고 온 날은 밤에 조금 더 잤다.'; } },
        { t: '병원에서 인지 저하 진단과 약을 상의한다', fx: G => { G.add('calm', 3); G.ms('cog', '늙어서 밤마다 서성였다. 병원에서 약을 받았다.'); return '약을 먹고 밤에 덜 서성였다.'; } },
        { t: '밤엔 거실에 같이 누워 곁에 있어 준다', fx: G => { G.add('bond', 4); G.add('calm', 1); G.ms('cog', '늙어서 밤마다 서성였다. 보호자가 거실에서 같이 잤다.'); return '등을 쓰다듬으면 다시 누웠다.'; } },
      ] },
    { id: 'final', when: [0, 999], once: 1, w: 0,
      text: '수의사가 조용히 말했다. "이제 남은 시간이 길지 않을 것 같아요." 진료실을 나와서 차에 한참 앉아 있었다.',
      choices: [
        { t: '집에서 마지막까지 함께 지낸다', fx: G => { G.flag('finalHome', 1); G.ms('final', '마지막 몇 주를 집에서 보냈다.'); return '집에 오자마자 {n:의} 방석 옆에 같이 누웠다. {n:이} 꼬리로 바닥을 한 번 탁 쳤다.'; } },
        { t: '아프지 않게 보내 주기로 한다', fx: G => { G.flag('finalEuth', 1); G.ms('final', '아프지 않게 보내 주기로 했다. 마지막까지 손을 잡고 있었다.'); return '그날을 정했다. 그 전까지는 하고 싶은 걸 다 하기로 했다.'; } },
        { t: '할 수 있는 치료를 다 해 본다', fx: G => { G.flag('finalTreat', 1); G.lifeMod(.25); G.ms('final', '할 수 있는 치료는 다 해 봤다.'); return '입원 가방을 쌌다. {n:의} 담요도 같이 넣었다.'; } },
      ] },
  ];

  // ---------- 돌아보기 해설 (죽은 뒤에만 보인다) ----------
  const H = 'Hiby 외 2004, Animal Welfare (364마리)', HER = 'Herron 외 2009, Appl Anim Behav Sci (140마리)', CAS = 'Casey 외 2021 / Arhant 외 2010';
  const EXPLAIN = {
    firstnight: { topic: '첫날 밤 낑낑거릴 때', grade: [2, 1, 1], why: '보호자가 개의 불안에 반응해 주는 쪽이 분리 문제와 덜 연관됐다(효과는 작다, r=0.11). 침대에서 같이 자는 건 좋고 나쁨이 연구로 갈리지 않았다.', src: 'Konok 외 2015, PLoS ONE (1,508명)' },
    social: { topic: '접종 전 사회화 시기', grade: [2, 2, 0], why: '사회화 민감기는 대략 3~12주다. 이때 사람·소리·상황을 조금씩 즐겁게 겪은 개가 덜 겁낸다. 겁은 사람을 향한 공격성의 가장 큰 위험 요인이었다(겁 많음 OR 5.18).', src: 'Howell 외 2015; McEvoy 외 2022; Mikkola 외 2021 (9,270마리)' },
    potty: { topic: '배변 실수', grade: [2, 1, 0], why: '벌을 쓴 과제가 많을수록 문제 행동이 많았고, 말을 잘 듣는 것과는 관계가 없었다. 칭찬과 간식을 쓴 쪽이 더 잘 따랐다.', src: H },
    nip: { topic: '이갈이 입질', grade: [2, 2, 0], why: '입이나 턱을 잡는 대립적 방법은 개의 공격 반응을 끌어내는 경우가 많았다(턱살 잡고 흔들기 26%).', src: HER },
    alonefirst: { topic: '처음 혼자 두는 날', grade: [2, 1, 1], why: '아주 짧은 부재부터 천천히 늘리는 연습(둔감화)이 분리 문제를 줄였다(작은 실험). 운동이 적은 개는 분리불안이 더 많았다.', src: 'Butler 외 2011(소규모); Tiira & Lohi 2015 (3,264마리)' },
    neuter: { topic: '중성화 시기', grade: [1, 1, 1], why: '중성화는 가족이나 다른 개를 향한 공격성과 관계가 없었다. 낯선 사람 공격은 조금 높았다(OR 1.22, 7~12개월 수술 1.26). 행동을 고치려는 목적이라면 근거가 없다. 건강 이유로 수의사와 정할 일이다.', src: 'Farhoody 외 2018, Front Vet Sci (1만 3천여 마리)' },
    recall: { topic: '불러도 안 올 때', grade: [2, 0, 1], why: '보상을 쓴 과제가 많을수록 말을 잘 들었고, 벌은 복종과 관계가 없었다. 줄을 푸는 건 즐겁지만 사고 위험이 따른다.', src: H },
    jump: { topic: '반가워서 뛰어오를 때', grade: [2, 0, 1], why: '"하지 마"보다 "대신 이걸 해"를 가르치는 보상 기반 훈련 쪽이 문제 행동이 적었다. 혐오 방법을 겹쳐 쓴 개는 더 비관적이었다.', src: CAS },
    bark: { topic: '초인종 짖음', grade: [2, 1, 0], why: '혐오 자극 훈련을 받은 개는 스트레스 신호가 많고 더 비관적이었다. 소리와 좋은 일을 짝짓는 방법은 그런 대가가 없다.', src: 'Vieira de Castro 외 2020; Casey 외 2021' },
    guard: { topic: '밥그릇 지키기', grade: [2, 1, 0], why: '밥 먹을 때 맛있는 걸 더해 준 쪽은 덜 심했다. 그릇을 빼앗거나 치우는 쪽은 더 심하거나 잦았다. 흔한 조언이지만 연구 결과는 반대였다.', src: 'Jacobs 외 2018, Prev Vet Med (3,589마리)' },
    pull: { topic: '줄 당김', grade: [2, 1, 0], why: '목줄을 당겨 교정하는 것 같은 혐오 방법은 공격·흥분과 연관됐다. 같은 행동에 같은 반응을 꾸준히 하는 쪽이 잘 따랐다.', src: CAS },
    chew: { topic: '물건을 물어뜯었을 때', grade: [1, 2, 0], why: '이미 지난 일을 혼내면 개는 연결하지 못하고, 벌을 많이 쓴 집일수록 문제 행동이 많았다. 씹을 거리를 주고 환경을 바꾸는 쪽이 안전하다.', src: H },
    sep: { topic: '분리불안', grade: [2, 2, 1, 0], why: '짧은 부재부터 늘리는 연습과 행동 진료가 근거 쪽이다. 다른 개가 있으면 소리 공포가 줄었다는 연관은 있지만 분리불안 치료 근거는 아니다. 짖음 방지기는 겁만 키울 수 있다.', src: 'Butler 외 2011; Hakanen 외 2020; Vieira de Castro 외 2020' },
    reactive: { topic: '다른 개에게 달려들 때', grade: [2, 1, 0], why: '산책 중 다른 개를 향한 공격은 처벌 사용과 연관됐다. 거리를 두고 좋은 일과 짝짓는 쪽이 근거 쪽이다.', src: 'Casey 외 2013' },
    stranger: { topic: '손님을 무서워할 때', grade: [2, 1, 0], why: '사람 공격성의 가장 큰 위험 요인은 겁이었다(OR 5.18). 억지로 만지게 하면 겁이 커질 수 있다. 개가 스스로 다가오게 기다리는 쪽이 낫다.', src: 'Mikkola 외 2021 (9,270마리)' },
    handle: { topic: '발 만지면 으르렁', grade: [2, 1, 0], why: '억지로 붙잡는 대립적 방법은 공격 반응을 자주 끌어냈다. 아주 조금씩 좋은 일과 짝짓는 쪽이 근거 쪽이다.', src: HER },
    copro: { topic: '변을 먹을 때', grade: [2, 0, 0], why: '먹는 변의 82~85%가 이틀 안의 신선한 변이었다. 시판 보조제·쫓아내기·후추·전자 목걸이의 성공률은 0~4%였다. 빨리 치우는 것이 현실적인 관리다.', src: 'Hart 외 2018, Vet Med Sci (약 3천 마리)' },
    tail: { topic: '꼬리를 쫓을 때', grade: [2, 0, 2], why: '운동량·혼자 있는 시간은 꼬리 쫓기와 관계가 없었다. 어미와 일찍 떨어진 개에게 더 많았다. 이름을 불러 멈추게 하는 건 61%에서 됐다. 통증 확인을 위해 진료도 권장된다.', src: 'Tiira 외 2012, PLoS ONE (368마리)' },
    mount: { topic: '마운팅', grade: [1, 0, 1], why: '중성화가 행동을 바꾼다는 근거는 약하다(공격성 연구에서 효과 없음). 다른 놀이로 돌리거나 상황을 관리하는 정도가 무난하다.', src: 'Farhoody 외 2018 (간접)' },
    bite: { topic: '사람을 물었을 때', grade: [2, 2, 0], why: '물기 전 경고(으르렁)를 벌하면 경고 없이 무는 개가 될 수 있다. 아이를 문 개의 66%는 이미 훈련 수업을 들었고, 77%는 불안 문제가 있었다. 전문가 계획과 안전 관리가 우선이다.', src: 'Reisner 외 2007; ' + HER },
    treat: { topic: '식탁 밑 구걸', grade: [0, 2, 2], why: '평생 덜 먹인 래브라도가 중앙값 기준 약 1.8년 더 살았다(수치는 후속 문헌 인용). 과체중 요크셔는 2.5년 짧았다.', src: 'Kealy 외 2002; Salt 외 2019 (5만 787마리)' },
    weight: { topic: '살을 빼야 할 때', grade: [2, 1, 1], why: '정량 급여와 마른 체형 유지가 수명과 연관됐다. 조사한 12개 견종 모두 과체중 쪽이 수명이 짧았다.', src: 'Salt 외 2019; Kealy 외 2002' },
    thunder: { topic: '천둥 칠 때', grade: [2, 2, 1], why: '숨을 곳을 허용한 개는 덜 불안했다(작은 실험). 어릴 때 작은 소리를 즐겁게 겪는 게 예방이다. 달래면 겁이 커진다는 말은 근거가 약하다.', src: 'Landsberg 외 2015(소규모); Howell 외 2015' },
    subfight: { topic: '둘이 싸울 때', grade: [2, 0, 0], why: '집 안 개끼리 싸움은 처벌 사용과 연관됐다. 자원을 나누고 먼저 받는 순서를 일관되게 정한 사례에서 69%가 나아졌다(대조군 없음).', src: 'Wrubel 외 2011; Casey 외 2013' },
    baby: { topic: '아기가 생겼을 때', grade: [2, 2, 0], why: '6세 미만 아이 물림의 44%가 개가 먹거나 지키는 물건 근처에서 일어났다. 아는 개, 집 안, 평범한 상호작용 중에 많았다. 늘 지켜보고 공간을 나누는 쪽이 근거 쪽이다.', src: 'Reisner 외 2007, 2011' },
    kidbite: { topic: '아이를 물었을 때', grade: [2, 0, 1], why: '아이 물림은 개가 쉬거나 먹을 때 아이가 먼저 다가간 상황이 많았다. 규칙과 감독이 예방이다. 경고를 벌하면 다음엔 경고 없이 물 수 있다.', src: 'Reisner 외 2007, 2011' },
    steal: { topic: '양말을 훔쳐 도망갈 때', grade: [2, 1, 0], why: '입에 문 물건을 억지로 빼앗으면 39%의 개가 공격적으로 반응했다. 바꿔 주기를 연습하면 물건 지키기도 줄어든다.', src: HER + '; Jacobs 외 2018' },
    harness: { topic: '하네스·몸 다루기 거부', grade: [2, 1, 0], why: '붙잡고 강제로 하는 대립적 처치는 공격 반응을 자주 끌어냈다. 조금씩 좋은 일과 짝짓는 쪽이 근거 쪽이다.', src: HER },
    bone: { topic: '입에 위험한 걸 물었을 때', grade: [2, 2, 0], why: '입에서 억지로 빼앗으면 39%의 개가 공격적으로 반응했다. "놔"를 가르친 개는 자원 지키기가 적었다.', src: HER + '; Jacobs 외 2018' },
  };

  window.DATA_EVENTS = EVENTS;
  window.DATA_EXPLAIN = EXPLAIN;
})();
