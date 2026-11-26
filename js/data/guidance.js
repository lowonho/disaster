(() => {
  "use strict";
  const sources = {
    apartment: ["소방청 · 아파트 화재 피난", "https://www.nfa.go.kr/nfa/news/pressrelease/press/?cntId=2950&mode=view&pageIdx=1"],
    fire: ["국민안전24 · 화재", "https://www.safekorea.go.kr/safekorea-kor/acts/nacts/action-guide.do?category=fires&menuSn=4"],
    flood: ["행정안전부 · 지하공간 침수", "https://www.mois.go.kr/frt/bbs/type002/commonSelectBoardArticle.do?bbsId=BBSMSTR_000000000216&nttId=111203"],
    valley: ["산림청 · 산지에서 대피하거나 고립됐을 때", "https://sansatai.forest.go.kr/mhms_pub/mhms/notice/guidelinesPage.do"],
    rain: ["기상청 · 호우 시 행동요령", "https://www.weather.go.kr/w/hazard/safety-guide.do"],
    quake: ["국민안전24 · 지진", "https://www.safekorea.go.kr/safekorea-kor/acts/nacts/action-guide.do?category=earthQuake&menuSn=4"]
  };
  const apartment = {
    title: "불이 난 곳과 연기부터 살피세요",
    rules: ["다른 세대 화재이고 집 안에 연기나 불길이 들어오지 않으면 창문을 닫고 집에서 상황과 방송을 확인합니다.",
      "집에 불이 났거나 연기가 들어오면 주변에 알립니다. 복도와 계단이 안전할 때 문을 닫고 낮은 자세로 대피합니다.",
      "출구 쪽에 연기나 불길이 가득하면 설치된 대피공간 등 피난 시설을 이용합니다. 그런 시설이 없으면 불에서 먼 방으로 가 문을 닫고 곁에 있는 젖은 수건 등으로 문틈을 막은 뒤 119에 동·층·호와 고립 상황을 전합니다."],
    refs: ["apartment", "fire"]
  };
  const building = {
    title: "연기 없는 피난계단을 찾으세요",
    rules: ["주변 사람에게 불을 알리고, 사용할 수 있는 피난계단을 따라 낮은 자세로 이동합니다. 지나온 출입문은 닫습니다.",
      "승강기나 연기가 찬 복도로 들어가지 않습니다. 모든 출구가 막히면 불과 연기로부터 분리된 곳에서 문을 닫고 119에 위치를 전합니다.",
      "신고 때문에 대피가 늦어지지 않게 합니다. 밖에 나온 뒤 인원을 확인하고, 남은 사람이 있으면 소방대에 알립니다."],
    refs: ["fire"]
  };
  const underground = {
    title: "지하로 물이 들어오면 즉시 올라가세요",
    rules: ["반지하나 지하 역사에 물이 들어오기 시작하면 소지품을 챙기느라 머물지 말고 지상이나 더 높은 층으로 이동합니다.",
      "이 게임의 대피 경로는 아직 통행 가능한 상행 계단입니다. 물살이 강해진 계단이나 침수된 낮은 통로로 들어가지 않습니다.",
      "지상에서도 물이 고인 낮은 곳을 피합니다. 고립됐다면 가능한 안전한 위치에서 119에 장소와 상황을 알립니다."],
    refs: ["flood", "rain"]
  };
  const valley = {
    title: "물길에서 떨어진 높은 곳으로 가세요",
    rules: ["야영지에 물이 불어나면 짐을 남기고 물가에서 떨어집니다. 같은 쪽의 안전한 높은 지대로 올라갑니다.",
      "급류가 가로막으면 개울이나 잠긴 다리를 건너지 않습니다. 무너질 우려가 있는 비탈면도 피합니다.",
      "고립되면 물길에서 떨어진 높은 안전지점에서 119에 계곡 이름과 가까운 이정표, 인원과 상황을 전하고 안내를 기다립니다."],
    refs: ["valley", "rain"]
  };
  const quake = {
    title: "흔들릴 때와 멎은 뒤의 행동이 다릅니다",
    rules: ["실내에서 흔들리면 가까운 튼튼한 탁자 아래에서 다리를 붙잡습니다. 몸을 숨길 곳이 없으면 떨어질 물건에서 떨어져 머리를 보호합니다.",
      "흔들림이 잦아든 뒤 출구를 확보하고 계단으로 나갑니다. 승강기는 이용하지 않습니다.",
      "밖에서는 머리를 보호하며 건물과 담장에서 거리를 두고 운동장 같은 넓은 곳으로 이동합니다. 대피 뒤에는 공식 안내를 확인합니다."],
    refs: ["quake"]
  };
  function forMap(map) {
    if (map.id === "fire") return map.venue === "home" ? apartment : building;
    if (map.id === "flood") return map.venue === "travel" ? valley : underground;
    return quake;
  }
  // Remembered landmarks describe the fictional location. Immediate hazards are always visible.
  const signs = {
    fire: {
      home: ["현관 안에 우리 동의 피난 안내도가 있다.", "복도 벽의 표지가 비상계단 쪽을 가리킨다.", "난간 옆의 층 표시를 읽을 수 있다.", "관리실 창가에서 단지 보행로가 보인다.", "보행문 밖의 집결지 표지가 보인다."],
      work: ["사무실 문 옆에 피난층 안내도가 있다.", "방화문 옆 계단 표지에 지상 방향이 표시돼 있다.", "계단 벽에 현재 층과 내려가는 방향이 적혀 있다.", "창가에 층 번호가 표시돼 있다.", "유리문 너머에 집결지 표지가 보인다."],
      travel: ["객실 문 안쪽 피난도에 두 방향의 통로가 그려져 있다.", "라운지 문 위에 피난 유도등이 있다.", "세탁실 앞 벽에 계단 화살표가 있다.", "직원 대기홀에서 지상 출구 표지가 보인다.", "로비 유리문 너머로 광장이 보인다."]
    },
    flood: {
      home: ["공동현관보다 높은 층계 쪽으로 난 출입구가 있다.", "계단 방향의 벽에 층 표시가 있다.", "층계창 너머 언덕 위 학교가 보인다.", "골목의 학교 방향 표지가 언덕 위를 가리킨다.", "정문 안쪽에 체육관 안내가 붙어 있다."],
      work: ["역무실 도면에 지상 출구 방향이 있다.", "단말기 너머에 지상 출구 화살표가 보인다.", "직원 통로 벽에 상행 계단 표식이 있다.", "역 안내방송이 통행 가능한 출구를 알린다.", "계단 위 지상 집결지 표지가 보인다."],
      travel: ["야영장 이정표가 물가 반대쪽 오르막을 가리킨다.", "안내소 지도에 같은 둑 위의 산길이 보인다.", "정자 뒤편에 산길 표시가 있다.", "전망대의 이정표 이름을 신고할 때 전할 수 있다.", "산장 문에 대피처 표시가 붙어 있다."]
    },
    quake: {
      home: ["거실에서 현관으로 이어지는 길이 보인다.", "복도 벽에 계단 표지가 있다.", "계단 난간에 층 번호가 붙어 있다.", "안마당에서 건물과 떨어진 공터 방향이 보인다.", "울타리 바깥으로 넓은 지면이 보인다."],
      work: ["열람실 배치도에서 계단 위치를 확인할 수 있다.", "안내 데스크 옆으로 지상 계단이 이어진다.", "별관 층계창에서 열린 운동장이 보인다.", "마당 바닥의 안내선이 운동장 쪽으로 이어진다.", "입구 너머로 넓은 운동장이 보인다."],
      travel: ["대합실에 지상 광장 방향 표지가 있다.", "매표 창구 옆 안내도가 역 앞길을 가리킨다.", "보관실 문 위에 출구 표지가 있다.", "안뜰에서 역전 광장 방향이 보인다.", "기둥 사이로 열린 광장이 보인다."]
    }
  };
  function sign(map, key) {
    if (key === "safe") return "이 시나리오에 지정된 대피 지점입니다.";
    return signs[map.id][map.venue][["start", "a", "b", "mid", "last"].indexOf(key)];
  }
  globalThis.DisasterGuidance = { forMap, sign, sources };
})();
