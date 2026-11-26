(() => {
  "use strict";
  // Stocks list individual units. A connection can be used in either direction.
  const commonWays = [["start", "a"], ["start", "b"], ["a", "mid"], ["b", "mid"], ["mid", "last"]];
  function region(place, map, title, text, stock, searchTarget) {
    return { place, map, title, text, stock, searchTarget };
  }
  const fire = {
    id: "fire", short: "화재", icon: "flame", title: "도심 빌딩 화재", setting: "한빛빌딩 · 업무 지구",
    alert: "화재 경보", risk: "연기 노출", initialExposure: 10, goal: "야외 집결지",
    alt: "해 질 무렵 도심 빌딩 창문에서 불길과 검은 연기가 피어오른다.",
    opening: "한빛빌딩 4층에서 화재 경보를 들었다.", success: "야외 집결지에서 이름을 확인했다. 방금 지나온 층의 불빛이 건물 밖에서 보인다.",
    loss: "연기가 짙어져 다음 피난 표지를 찾기 어려워졌다.",
    firstClose: 6, secondClose: 10, express: "b", walkTarget: 5, walkRisk: 21,
    ways: [...commonWays, ["b", "last"]],
    nodes: {
      start: region("4층 사무실", "사무실", "경보가 울린 사무실", "책상 서랍에 비상 물자가 있다. 동쪽 계단에는 방재함이, 서쪽 계단에는 1층까지 이어지는 통로가 있다.", ["battery", "ration"], 2),
      a: region("동쪽 피난계단", "동쪽 계단", "방재함이 있는 층계", "철제 방재함 문이 반쯤 열려 있다. 아래층 계단참에 닿으면 구조대와 교신할 수 있다.", ["radioBody", "ration"], 2),
      b: region("서쪽 피난계단", "서쪽 계단", "비상등 아래 보관함", "비상등 아래에 공용 손전등 보관함이 보인다. 서쪽의 긴 계단은 1층 출입구까지 곧장 이어진다.", ["lampBody", "ration"], 3),
      mid: region("2층 계단참", "계단참", "무전 신호가 닿는 창가", "창가에 구조대의 교신 지점 표시가 붙어 있다. 아래층으로 가는 표지도 남아 있다.", ["battery", "ration"], 2),
      last: region("1층 출입구", "출입구", "집결지로 향하는 표지", "대피 인파 너머로 집결지 표지가 보인다. 손전등을 켜면 갈림길에서도 표지를 놓치지 않는다.", ["lampBody", "radioBody"], 3),
      safe: { place: "야외 집결지", map: "집결지" }
    }
  };
  const flood = {
    id: "flood", short: "홍수", icon: "water", title: "물에 잠긴 시장", setting: "솔내시장 · 하천 지구",
    alert: "홍수 경보", risk: "침수 노출", initialExposure: 8, goal: "복지관 대피소",
    alt: "빗속에서 시장의 낮은 도로에 물이 차고 높은 보행 데크에 가로등이 켜져 있다.",
    opening: "솔내시장의 높은 승강장에서 대피 방송을 들었다.", success: "복지관 안에 도착했다. 마른 의자에 앉으니 창밖에서 빗소리가 들린다.",
    loss: "수위가 높아져 남은 이동 통로가 통제됐다.",
    firstClose: 5, secondClose: 9, express: "a", walkTarget: 4, walkRisk: 24,
    ways: [...commonWays, ["a", "last"]],
    nodes: {
      start: region("시장 승강장", "승강장", "빗소리에 묻힌 방송", "상인회 무전기가 승강장 벤치 밑에 놓여 있다. 상가 전파사와 언덕 쉼터는 아직 오갈 수 있다.", ["radioBody", "ration"], 2),
      a: region("상가 2층", "상가 2층", "불이 꺼진 전파사", "전파사 진열대에 예비 건전지가 있다. 상가 뒤 높은 연결통로로 가면 데크를 거치지 않고 복지관에 닿는다.", ["battery", "ration"], 3),
      b: region("언덕길 쉼터", "언덕길", "상인들이 떠난 쉼터", "벤치 옆 상인회 상자에 휴대 장비가 보인다. 언덕에서 이어지는 데크는 무전 신호가 잘 잡힌다.", ["lampBody", "radioBody"], 2),
      mid: region("고가 보행 데크", "데크", "난간의 교신 지점 표시", "데크 위에서 대피소 지붕이 보인다. 무전기가 있으면 여기서 구조대에 위치를 전할 수 있다.", ["battery", "ration"], 2),
      last: region("복지관 진입로", "진입로", "비에 흐려진 유도선", "높은 통로 끝에 대피소 불빛이 아른거린다. 젖은 안내판에 빛을 비추면 유도선을 따라가기 쉽다.", ["lampBody", "ration"], 3),
      safe: { place: "복지관 대피소", map: "대피소" }
    }
  };
  const quake = {
    id: "quake", short: "지진", icon: "quake", title: "도서관을 덮친 지진", setting: "다온도서관 · 구시가지",
    alert: "지진 발생", risk: "낙하물 노출", initialExposure: 12, goal: "운동장 중앙",
    alt: "먼지가 피어오르는 도서관 앞에 갈라진 도로와 비상 차량이 보인다.",
    opening: "도서관 열람실의 책들이 바닥으로 떨어졌다.", success: "운동장 중앙에 도착했다. 뒤따라온 사람들과 함께 서로의 인원을 확인했다.",
    loss: "떨어진 물건이 쌓여 더 이동하기 어려워졌다.",
    firstClose: 7, secondClose: 12, express: "b", walkTarget: 5, walkRisk: 20,
    ways: [...commonWays, ["b", "last"]],
    nodes: {
      start: region("2층 열람실", "열람실", "흔들리는 열람실", "열람대 아래에 비상 상자가 있다. 진동이 멎으면 본관 안내 데스크와 별관 계단으로 움직일 수 있다.", ["lampBody", "ration"], 2),
      a: region("본관 계단", "본관 계단", "안내 데스크의 무전기", "계단 옆 안내 데스크에 직원들의 통신 장비가 남아 있다. 밖으로 난 길 끝에 마당이 보인다.", ["radioBody", "ration"], 2),
      b: region("별관 계단", "별관 계단", "운동장으로 난 별관 계단", "비상용 전지가 든 서랍이 열려 있다. 여기서 운동장 입구로 곧장 갈 수도 있다.", ["battery", "ration"], 3),
      mid: region("열린 마당", "마당", "구조대가 보이는 마당", "담장 너머로 구조대의 깃발이 보인다. 무전기를 켜면 마당까지 안내를 받을 수 있다.", ["battery", "ration"], 2),
      last: region("운동장 입구", "입구", "흙먼지 너머의 유도등", "운동장 중앙으로 가는 통로가 둘로 나뉜다. 손전등을 비추면 먼지 너머의 표식을 읽을 수 있다.", ["radioBody", "lampBody"], 3),
      safe: { place: "운동장 중앙", map: "운동장" }
    }
  };
  globalThis.DisasterScenarios = { fire, flood, quake };
})();
