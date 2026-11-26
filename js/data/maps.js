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
      ways: [["start", "a"], ["start", "b"], ["a", "b"], ["a", "mid"], ["b", "last"], ["mid", "last"]]
    },
    work: {
      points: { start: [12, 49], a: [34, 23], b: [34, 77], mid: [58, 51], last: [75, 76], safe: [86, 23] }
    },
    travel: {
      points: { start: [50, 77], a: [73, 57], b: [24, 61], mid: [17, 24], last: [53, 29], safe: [84, 22] },
      ways: [["start", "a"], ["start", "b"], ["b", "mid"], ["b", "last"], ["a", "last"], ["mid", "last"]]
    }
  };

  // These descriptions contain only what can be seen from the current position.
  // The original workplace scenes are still available to players who know the whole map.
  const workplaceSight = {
    fire: ["경보음에 컴퓨터 화면이 잠시 떨린다. 양쪽 방화문은 이 자리에서 보인다.", "방화문 너머에서 여러 사람의 발소리가 울린다.", "층계 벽에 비상등 불빛이 길게 드리워져 있다.", "창가의 층 번호 아래에 지상 피난층 방향이 적혀 있다.", "바깥 공기가 느껴진다. 문 옆에 집결지 표지가 있다."],
    flood: ["역무실 유리창 너머로 물이 번진 타일 바닥이 보인다. 스피커에서 대피 방송이 흘러나온다.", "개찰구의 초록 불빛이 젖은 바닥에 길게 비친다.", "천장의 배관을 타고 떨어진 물이 철제 보관함을 두드린다.", "난간 옆 비상 통화기에 전원이 들어와 있다. 아래층에서 물소리가 울려 올라온다.", "계단 위로 회색 하늘이 보인다. 빗소리가 가까워진다."],
    quake: ["무너진 책 더미 사이로 먼지가 가라앉는다.", "안내 데스크 위에 서류가 흩어져 있다.", "계단 난간이 아직 가늘게 떨린다.", "마당 가장자리에 운동장 방향을 알리는 깃발이 서 있다.", "입구의 유도등이 운동장 쪽을 비춘다."]
  };
  function site(place, map, text) {
    return { place, map, title: place, text };
  }
  function destination(place, map) { return { place, map }; }
  const home = {
    fire: {
      title: "우리 아파트 화재", setting: "해솔아파트 · 우리 집", opening: "익숙한 거실에서 단지의 화재 경보를 들었다.",
      success: "단지 집결지에서 이웃과 서로 이름을 확인했다.",
      nodes: {
        start: site("우리 집 거실", "거실", "식탁 위 컵이 경보음에 가늘게 떨린다. 거실 양쪽으로 문이 나 있다."),
        a: site("공용 복도", "복도", "현관 밖 복도에 이웃들의 발소리가 울린다."),
        b: site("뒤쪽 계단참", "뒤 계단", "창을 넘어온 저녁빛에 금속 난간이 반짝인다."),
        mid: site("관리실 앞마당", "관리실", "관리실 창문 옆에서 단지 보행로가 보인다."),
        last: site("단지 보행문", "보행문", "보행문 옆에 야외 집결지를 가리키는 표지가 서 있다."),
        safe: destination("단지 집결지", "집결지")
      }
    },
    flood: {
      title: "반지하에 차오르는 물", venueLabel: "반지하 집", setting: "달맞이길 · 우리 집", opening: "반지하 방의 높은 창에 빗물이 튄다. 문턱 아래로 물 한 줄기가 들어온다.",
      success: "학교 체육관의 마른 매트에 앉았다. 지붕에 닿는 빗소리가 아까보다 멀게 들린다.",
      nodes: {
        start: site("반지하 방", "반지하", "골목 높이에 난 창이 빗물로 흐려졌다. 낮은 밥상 아래로 문턱에서 스민 물이 번진다."),
        a: site("공동현관 복도", "현관 복도", "우편함 아래 타일 위에서 물방울이 튄다. 바깥쪽 문틈으로 잿빛 빛이 들어온다."),
        b: site("위층 계단참", "위층 계단", "콘크리트 계단이 난간을 끼고 꺾인다. 층계창 너머로 익숙한 골목이 보인다."),
        mid: site("언덕 골목 모퉁이", "언덕 골목", "가게 처마 밑으로 빗물이 쏟아진다. 전봇대의 스피커에서 구조대 목소리가 들려온다."),
        last: site("학교 정문", "학교 정문", "열린 철문 너머로 불이 켜진 체육관이 보인다. 경사로 바닥에는 젖은 신발 자국이 이어진다."),
        safe: destination("학교 체육관", "체육관")
      }
    },
    quake: {
      title: "우리 단지의 지진", setting: "해솔아파트 · 우리 집", opening: "살던 집 거실에서 낮은 울림을 느꼈다.",
      success: "단지 공터에 도착했다. 이웃들이 모여 앉아 서로의 소식을 묻는다.",
      nodes: {
        start: site("우리 집 거실", "거실", "탁자 아래로 색연필 몇 자루가 굴러갔다."),
        a: site("세대 앞 복도", "복도", "층수 표지판이 비스듬히 걸려 있다."),
        b: site("공용 계단", "계단", "계단 창틀에 먼지가 얇게 내려앉았다."),
        mid: site("단지 안마당", "안마당", "안마당의 깃발 뒤로 단지 공터가 보인다."),
        last: site("놀이터 입구", "놀이터", "공터를 가리키는 표식이 울타리에 남아 있다."),
        safe: destination("단지 공터", "공터")
      }
    }
  };
  const travel = {
    fire: {
      title: "낯선 숙소의 화재", setting: "해안 여행 · 첫날밤", opening: "처음 묵는 숙소에서 잠결에 경보를 들었다.",
      success: "숙소 앞 광장에 도착했다. 낯익어진 통로가 이제는 건물 밖에서 보인다.",
      nodes: {
        start: site("숙소 객실", "객실", "머리맡에 풀다 만 가방이 놓여 있다. 문밖 양쪽에서 소리가 들린다."),
        a: site("투숙객 라운지", "라운지", "낮은 소파들이 유리창을 향해 놓여 있다."),
        b: site("세탁실 앞", "세탁실", "비어 있는 카트 바퀴가 복도에서 천천히 돈다."),
        mid: site("직원 대기홀", "대기홀", "벽면의 피난 유도등이 로비 방향을 비춘다."),
        last: site("로비 출구", "로비", "유리문 너머로 숙소 앞 광장의 표지가 보인다."),
        safe: destination("숙소 앞 광장", "광장")
      }
    },
    flood: {
      title: "불어난 계곡", venueLabel: "계곡", setting: "솔바위 계곡 · 여름 여행", opening: "텐트 밖에서 들리던 계곡물이 굵은 돌 구르는 소리를 내기 시작했다.",
      success: "산장 창 너머로 계곡이 내려다보인다. 마른 담요를 두르고 나서야 어깨에서 힘이 풀린다.",
      nodes: {
        start: site("물가 야영지", "야영지", "텐트 자락 너머로 계곡이 보인다. 아까 앉았던 넓적한 바위가 흰 물살에 가려졌다."),
        a: site("탐방 안내소", "안내소", "나무 처마 끝에서 빗줄기가 떨어진다. 안내 창구 너머로 굽은 산길이 보인다."),
        b: site("계곡 정자", "정자", "난간 아래 바위에 물살이 부딪친다. 젖은 평상 위로 지붕을 때리는 소리가 울린다."),
        mid: site("산길 전망대", "전망대", "나무 사이로 물길이 한참 아래에 보인다. 난간 옆 이정표에 전망대 이름이 표시돼 있다."),
        last: site("산장 들머리", "산장 입구", "돌계단 끝에서 불빛이 새어 나온다. 처마 아래 문이 열려 있다."),
        safe: destination("능선 산장", "산장")
      }
    },
    quake: {
      title: "낯선 기차역의 지진", setting: "산간 철도역 · 환승 중", opening: "처음 내린 역에서 바닥이 크게 흔들렸다.",
      success: "역전 집결지에 닿았다. 여행객들이 가방을 내려놓고 숨을 돌린다.",
      nodes: {
        start: site("역 대합실", "대합실", "멈춘 전광판 아래로 객차 안내 종이가 흩어져 있다."),
        a: site("매표 창구", "매표소", "유리창 너머에서 빈 의자가 조금씩 흔들린다."),
        b: site("수하물 보관실", "보관실", "보관함 열쇠들이 서로 부딪히는 소리가 난다."),
        mid: site("역 앞 안뜰", "안뜰", "안뜰 가장자리의 표지가 역전 광장 방향을 가리킨다."),
        last: site("광장 통로", "광장 통로", "통로 입구에서 역전 집결지의 유도선을 볼 수 있다."),
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
