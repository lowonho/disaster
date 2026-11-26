(() => {
  "use strict";
  const base = globalThis.DisasterScenarios;
  const venues = {
    home: { name: "집", level: "쉬움", settings: { layout: "full", supplies: "full" } },
    work: { name: "직장", level: "보통", settings: { layout: "partial", supplies: "partial" } },
    travel: { name: "여행지", level: "어려움", settings: { layout: "none", supplies: "none" } }
  };
  const levels = ["full", "partial", "none"];
  const layouts = {
    home: {
      points: { start: [13, 54], a: [33, 25], b: [34, 77], mid: [62, 25], last: [67, 70], safe: [87, 46] },
      ways: [["start", "a"], ["start", "b"], ["a", "b"], ["a", "mid"], ["b", "last"], ["mid", "last"]], express: "b"
    },
    work: {
      points: { start: [12, 49], a: [34, 23], b: [34, 77], mid: [58, 51], last: [75, 76], safe: [86, 23] }
    },
    travel: {
      points: { start: [50, 77], a: [73, 57], b: [24, 61], mid: [17, 24], last: [53, 29], safe: [84, 22] },
      ways: [["start", "a"], ["start", "b"], ["b", "mid"], ["b", "last"], ["a", "last"], ["mid", "last"]], express: "a"
    }
  };

  // These descriptions contain only what can be seen from the current position.
  // The original workplace scenes are still available to players who know the whole map.
  const workplaceSight = {
    fire: ["경보음에 컴퓨터 화면이 잠시 떨린다. 양쪽 방화문은 이 자리에서 보인다.", "방화문 너머에서 여러 사람의 발소리가 울린다.", "층계 벽에 비상등 불빛이 길게 드리워져 있다.", "창턱에 무전 교신 표식이 붙어 있다.", "바깥 공기가 느껴진다. 문 옆에 집결지 표지가 있다."],
    flood: ["승강장 아래 낮은 길에 빗물이 고인다. 처마 밑으로 사람들이 지나간다.", "비가 전파사의 셔터를 두드린다.", "젖은 벤치 옆에 상인회 이름표가 매달려 있다.", "난간에 교신 지점 표식이 젖은 채 붙어 있다.", "가까운 곳에서 대피소의 불빛이 비친다."],
    quake: ["무너진 책 더미 사이로 먼지가 가라앉는다.", "안내 데스크 위에 서류가 흩어져 있다.", "계단 난간이 아직 가늘게 떨린다.", "마당 바닥에 교신 지점을 그린 깃발이 서 있다.", "입구의 유도등이 운동장 쪽을 비춘다."]
  };
  function site(place, map, text, stock, searchTarget = 2) {
    return { place, map, title: place, text, stock, searchTarget };
  }
  function destination(place, map) { return { place, map }; }
  const home = {
    fire: {
      title: "우리 아파트 화재", setting: "해솔아파트 · 우리 집", opening: "익숙한 거실에서 단지의 화재 경보를 들었다.",
      success: "단지 집결지에서 이웃과 서로 이름을 확인했다.",
      nodes: {
        start: site("우리 집 거실", "거실", "식탁 위 컵이 경보음에 가늘게 떨린다. 거실 양쪽으로 문이 나 있다.", ["battery", "ration"]),
        a: site("공용 복도", "복도", "현관 밖 복도에 이웃들의 발소리가 울린다.", ["radioBody", "ration"]),
        b: site("뒤쪽 계단참", "뒤 계단", "창을 넘어온 저녁빛에 금속 난간이 반짝인다.", ["lampBody", "ration"], 3),
        mid: site("관리실 앞마당", "관리실", "관리실 창문에 구조대와 교신할 수 있다는 안내가 붙어 있다.", ["battery", "ration"]),
        last: site("단지 보행문", "보행문", "보행문 옆에 야외 집결지를 가리키는 표지가 서 있다.", ["lampBody", "radioBody"], 3),
        safe: destination("단지 집결지", "집결지")
      }
    },
    flood: {
      title: "물이 차오른 우리 동네", setting: "해솔아파트 · 우리 집", opening: "현관 너머에서 빗소리와 단지 방송이 겹쳐 들린다.",
      success: "상층 대피실에 자리를 잡았다. 창 아래로 익숙한 단지가 내려다보인다.",
      nodes: {
        start: site("우리 집 현관", "현관", "현관 바닥에 비상 방송의 파란 불빛이 비친다.", ["radioBody", "ration"]),
        a: site("공용 복도", "복도", "복도 창 아래로 물이 찬 단지 길이 내려다보인다.", ["battery", "ration"]),
        b: site("위층 계단", "위층 계단", "위층에서 누군가 접이식 의자를 옮기는 소리가 난다.", ["lampBody", "ration"], 3),
        mid: site("동 연결층", "연결층", "연결층 벽면에 교신 지점 스티커가 붙어 있다.", ["battery", "ration"]),
        last: site("대피층 입구", "층 입구", "문 옆에서 상층 대피실의 유도등이 빛난다.", ["lampBody", "radioBody"], 3),
        safe: destination("상층 대피실", "대피실")
      }
    },
    quake: {
      title: "우리 단지의 지진", setting: "해솔아파트 · 우리 집", opening: "살던 집 거실에서 낮은 울림을 느꼈다.",
      success: "단지 공터에 도착했다. 이웃들이 모여 앉아 서로의 소식을 묻는다.",
      nodes: {
        start: site("우리 집 거실", "거실", "탁자 아래로 색연필 몇 자루가 굴러갔다.", ["lampBody", "ration"]),
        a: site("세대 앞 복도", "복도", "층수 표지판이 비스듬히 걸려 있다.", ["radioBody", "ration"]),
        b: site("공용 계단", "계단", "계단 창틀에 먼지가 얇게 내려앉았다.", ["battery", "ration"], 3),
        mid: site("단지 안마당", "안마당", "안마당의 깃발에 교신 지점이라고 쓰여 있다.", ["battery", "ration"]),
        last: site("놀이터 입구", "놀이터", "공터를 가리키는 표식이 울타리에 남아 있다.", ["lampBody", "radioBody"], 3),
        safe: destination("단지 공터", "공터")
      }
    }
  };
  const travel = {
    fire: {
      title: "낯선 숙소의 화재", setting: "해안 여행 · 첫날밤", opening: "처음 묵는 숙소에서 잠결에 경보를 들었다.",
      success: "숙소 앞 광장에 도착했다. 낯익어진 통로가 이제는 건물 밖에서 보인다.",
      nodes: {
        start: site("숙소 객실", "객실", "머리맡에 풀다 만 가방이 놓여 있다. 문밖 양쪽에서 소리가 들린다.", ["battery", "ration"]),
        a: site("투숙객 라운지", "라운지", "낮은 소파들이 유리창을 향해 놓여 있다.", ["lampBody", "ration"], 3),
        b: site("세탁실 앞", "세탁실", "비어 있는 카트 바퀴가 복도에서 천천히 돈다.", ["radioBody", "ration"]),
        mid: site("직원 대기홀", "대기홀", "벽면의 작은 표식이 이곳에서 교신할 수 있다고 알린다.", ["battery", "ration"]),
        last: site("로비 출구", "로비", "유리문 너머로 숙소 앞 광장의 표지가 보인다.", ["lampBody", "radioBody"], 3),
        safe: destination("숙소 앞 광장", "광장")
      }
    },
    flood: {
      title: "물에 잠긴 여행지", setting: "강변 구시가지 · 여행 중", opening: "처음 온 강변 정류장에서 호우 경보를 들었다.",
      success: "언덕 대피소에 도착했다. 지붕을 두드리는 빗소리가 한결 멀게 들린다.",
      nodes: {
        start: site("강변 정류장", "정류장", "정류장 지붕을 두드리는 빗소리가 주변의 말을 덮는다.", ["radioBody", "ration"]),
        a: site("전시관 테라스", "테라스", "돌기둥 아래에서 기념품 진열대의 종이표가 펄럭인다.", ["lampBody", "ration"], 3),
        b: site("관광 안내소", "안내소", "셔터에 빗물이 부딪힌다. 빈 우산꽂이가 문 옆에 있다.", ["battery", "ration"]),
        mid: site("보행교 쉼터", "쉼터", "난간에 구조대가 붙인 교신 지점 표시가 보인다.", ["battery", "ration"]),
        last: site("언덕길 입구", "언덕길", "빗속에서 언덕 대피소의 안내판이 모습을 드러낸다.", ["radioBody", "lampBody"], 3),
        safe: destination("언덕 대피소", "대피소")
      }
    },
    quake: {
      title: "낯선 기차역의 지진", setting: "산간 철도역 · 환승 중", opening: "처음 내린 역에서 바닥이 크게 흔들렸다.",
      success: "역전 집결지에 닿았다. 여행객들이 가방을 내려놓고 숨을 돌린다.",
      nodes: {
        start: site("역 대합실", "대합실", "멈춘 전광판 아래로 객차 안내 종이가 흩어져 있다.", ["lampBody", "ration"]),
        a: site("매표 창구", "매표소", "유리창 너머에서 빈 의자가 조금씩 흔들린다.", ["battery", "ration"], 3),
        b: site("수하물 보관실", "보관실", "보관함 열쇠들이 서로 부딪히는 소리가 난다.", ["radioBody", "ration"]),
        mid: site("역 앞 안뜰", "안뜰", "안뜰 한가운데에 교신 지점을 알리는 깃발이 보인다.", ["battery", "ration"]),
        last: site("광장 통로", "광장 통로", "통로 입구에서 역전 집결지의 유도선을 볼 수 있다.", ["lampBody", "radioBody"], 3),
        safe: destination("역전 집결지", "집결지")
      }
    }
  };
  const catalog = {};
  for (const [id, scenario] of Object.entries(base)) {
    catalog[id] = {};
    for (const [venue, content] of Object.entries({ home: home[id], work: scenario, travel: travel[id] })) {
      const map = { ...scenario, ...content, ...layouts[venue], venue };
      map.goal = map.nodes.safe.place;
      map.hintArea = venue === "travel" || id === "flood" ? "b" : "a";
      if (venue === "work") {
        map.sight = Object.fromEntries(["start", "a", "b", "mid", "last"].map((key, i) => [key, workplaceSight[id][i]]));
      }
      catalog[id][venue] = map;
    }
  }
  function validSettings(value) {
    return value && levels.includes(value.layout) && levels.includes(value.supplies);
  }
  function sameSettings(a, b) { return a.layout === b.layout && a.supplies === b.supplies; }
  globalThis.DisasterMaps = { venues, validSettings, sameSettings, get: (id, venue) => catalog[id][venue],
    of: state => catalog[state.id][state.venue] };
})();
