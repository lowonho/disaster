(() => {
  "use strict";
  const maps = globalThis.DisasterMaps;
  const rank = { start: 0, a: 1, b: 1, mid: 2, last: 3, safe: 4 };
  const reportPlaces = {
    fire: { home: "달맞이로 18 해솔아파트 102동", work: "솔내로 24 한빛빌딩", travel: "해안길 31 솔바람숙소" },
    flood: { home: "달맞이길 12", work: "솔내역", travel: "솔바위 계곡 탐방로" },
    quake: { home: "해솔아파트 102동", work: "다온도서관", travel: "솔재역" }
  };
  function fireMode(s) {
    if (s.id !== "fire" || s.node !== "start") return "evacuate";
    if (s.opening !== "auto") return s.opening;
    if (s.venue === "home") return ["stay", "blocked", "evacuate"][s.seed % 3];
    return s.seed % 4 === 0 ? "blocked" : "evacuate";
  }
  function hasRefuge(s) { return s.id === "fire" && s.venue === "home" && Math.floor(s.seed / 3) % 2 === 0; }
  function valleyCut(s) { return s.id === "flood" && s.venue === "travel" && s.seed % 3 === 1; }
  function stranded(s) { return valleyCut(s) && s.node === "mid"; }
  function outdoors(s) { return rank[s.node] >= 2; } // Earthquake maps share outdoor assembly areas.
  function shaking(s) {
    return s.status === "playing" && s.node !== "safe" && s.id === "quake" && (s.elapsed === 0 || s.elapsed === 3 + s.seed % 3);
  }
  function hazardCost(s) {
    return s.id === "flood" ? Math.min(4, Math.floor(s.elapsed / 2)) : shaking(s) ? 4 : 0;
  }
  function currentPlace(s) {
    if (s.protection === "refuge") return "우리 집 발코니 대피공간";
    if (s.protection === "room") return { home: "우리 집 안쪽 방", work: "4층 안쪽 회의실", travel: "객실 안쪽 방" }[s.venue];
    if (s.protection === "high") return "산길 전망대의 높은 쉼터";
    return maps.of(s).nodes[s.node].place;
  }
  function statusLabel(s) {
    if (s.archived) return "이전 판 종료";
    if (s.status === "escaped") return "자력 대피 완료";
    if (s.status === "rescued") return "구조 완료";
    if (s.node === "safe") return "대피 지점 도착";
    if (s.guidance === "escorted") return "구조대 동행 중";
    if (s.guidance === "advised") return "피난로 확인";
    if (s.guidance === "delayed") return "구조대 접근 지연";
    return "대응 중";
  }
  function guidedExit(s) {
    if (s.guidance !== "advised" && s.guidance !== "escorted") return null;
    return { start: "b", b: "last", mid: "last", last: "safe" }[s.node] || null;
  }
  function routeBulletin(s) {
    if (s.id === "flood") return "현장 통제팀이 전망대와 산장 들머리를 잇는 같은 둑의 상단 산길을 확인했습니다. 잠긴 다리는 계속 통제 중입니다.";
    const path = { home: "현재 위치에서 현관과 복도를 거쳐 뒤쪽 피난계단까지", work: "4층 회의실에서 서쪽 피난계단까지", travel: "객실에서 세탁실 앞 통로를 거쳐 피난계단까지" }[s.venue];
    return "소방대가 " + path + " 불과 연기가 없는 것을 확인하고 이 경로로 대피하라고 안내합니다. 다른 통로는 계속 통제 중입니다.";
  }
  function needsFireReport(s) {
    return s.id === "fire" && s.node === "safe" && !s.reportAt && !s.guidance;
  }
  function barrier(s, to) {
    const next = guidedExit(s);
    if (next) {
      if (to === next) return "";
      return s.id === "flood" ? "물이 찬 길은 여전히 통제 중입니다." : "소방대가 확인한 피난로만 통행할 수 있습니다.";
    }
    if (s.id === "fire" && fireMode(s) !== "evacuate") return "복도에 짙은 연기가 차 있습니다.";
    if (s.protection || stranded(s)) return "물이 불어 이어지는 길이 끊겼습니다.";
    if (shaking(s)) return "흔들림이 멎을 때까지 몸을 보호하세요.";
    if (rank[to] < rank[s.node] || (rank[to] === rank[s.node] && s.visited.includes(to))) {
      return { fire: "지나온 화재 구역으로 돌아가지 않습니다.", flood: "침수 위험이 있는 낮은 쪽으로 돌아가지 않습니다.",
        quake: "이미 벗어난 건물 쪽으로 되돌아가지 않습니다." }[s.id];
    }
    if (valleyCut(s) && s.node === "b" && to === "last") return "산장으로 바로 가는 다리가 물에 잠겼습니다.";
    if ((valleyCut(s) || s.seed % 5 !== 3) && to === (valleyCut(s) ? "a" : s.seed % 2 === 0 ? "a" : "b")) {
      if (s.id === "fire") return "이쪽 통로는 짙은 연기로 앞이 보이지 않습니다.";
      if (s.id === "quake") return "떨어진 파편이 이쪽 통로를 막고 있습니다.";
      return s.venue === "travel" ? "급류가 이쪽 길을 가로지릅니다." : "이쪽으로 물이 쏟아져 통행할 수 없습니다.";
    }
    return "";
  }
  function coverText(s) {
    if (s.venue === "travel" && s.node === "last") return ["광장 통로에서 머리와 목 보호", "천장과 기둥의 부착물이 흔들립니다. 떨어질 물건을 피하고 머리를 가린 채 흔들림이 잦아들기를 기다립니다."];
    if (outdoors(s)) return ["건물과 담장에서 떨어져 머리 보호", "열린 곳에서 가방이나 팔로 머리를 가리고 흔들림이 멎을 때까지 몸을 낮춥니다."];
    if (s.node === "start" && s.venue !== "travel") return ["튼튼한 탁자 아래에서 몸 보호", "바로 옆 탁자 아래로 몸을 낮추고 탁자 다리를 붙잡습니다."];
    return ["낙하물을 피해 머리와 목 보호", "몸을 숨길 탁자가 없습니다. 유리·선반에서 떨어진 자리에서 머리와 목을 가립니다."];
  }
  function shelterAction(s) {
    if (fireMode(s) === "stay") return ["home", "현관문과 창문을 닫고 방송 듣기", "함께 있는 사람에게 알리고 연기 유입과 대피 방송을 살핍니다."];
    if (fireMode(s) === "blocked" && hasRefuge(s)) return ["refuge", "전용 대피공간으로 이동해 방화문 닫기", "실내의 연기 없는 쪽을 지나 발코니에 설치된 대피공간으로 들어갑니다. 연기가 들어오지 않게 방화문을 닫습니다."];
    if (fireMode(s) === "blocked") return ["room", "불에서 먼 방으로 가서 문 닫기", "이곳에는 전용 대피공간이 없습니다. 안쪽 방으로 이동하고 곁에 있는 젖은 수건으로 문틈을 막습니다."];
    if (stranded(s)) return ["high", "전망대 안쪽 높은 쉼터로 이동", "급류를 건너지 않고 물길과 가파른 비탈면에서 떨어진 평탄한 곳에 자리를 잡습니다."];
    return null;
  }
  function reportKey(s) { return s.node + "/" + s.protection; }
  function reportDetails(s) {
    const trapped = ["room", "refuge", "high"].includes(s.protection);
    let where = reportPlaces[s.id][s.venue] + " · " + currentPlace(s);
    if (s.id === "fire" && s.node === "start") {
      where = reportPlaces.fire[s.venue] + " " + { home: "4층 403호", work: "4층", travel: "3층 302호" }[s.venue] + " · " + currentPlace(s);
    }
    if (s.id === "fire" && s.node === "safe") {
      const building = reportPlaces.fire[s.venue];
      const fireLocation = { home: "102동 4층", work: "4층 사무실 주변", travel: "3층 객실 주변" }[s.venue];
      return { where: building + " · 현재 " + currentPlace(s), what: fireLocation + "에서 연기를 보고 건물 밖으로 대피했습니다.", who: "본인 대피 완료. 건물 안에 남은 인원은 아직 모릅니다." };
    }
    const what = s.id === "fire" ? (trapped ? "출입구가 연기로 막혔습니다. 문을 닫고 안에 있습니다." : "화재가 발생했습니다.") :
      s.id === "flood" ? (trapped ? "물이 불어 내려가는 길이 끊겼습니다. 높은 곳에 있습니다." : "물이 불어나고 있습니다.") : "지진으로 흔들림이 있었습니다.";
    return { where, what, who: trapped ? "고립된 사람 1명, 의식 있음" : "현재 이 위치에 1명" };
  }
  function reportStatus(s) {
    if (s.archived) return "이전 판 기록";
    if (s.guidance === "escorted") return s.status === "rescued" ? "구조대 인계 완료" : "구조대 현장 합류";
    if (s.reportAt) return s.reportAt === "safe/" ? "화재 위치 전달 완료" : "고립 위치 전달 완료";
    if (fireMode(s) === "stay" || s.guidance === "advised") return "관리실이 신고함";
    if (["room", "refuge", "high"].includes(s.protection)) return "119에 위치 전달 필요";
    return needsFireReport(s) ? "화재 신고 필요" : "고립 신고 없음";
  }
  function situation(s) {
    const map = maps.of(s);
    if (s.archived) return { title: "이전 판의 기록", text: "이전 규칙으로 종료한 기록입니다. 마지막 위치와 진행 턴을 보존했습니다." };
    if (s.status === "rescued") return { title: "구조대와 안전 지점에 도착했습니다", text: map.goal + "에서 담당자가 인원과 몸 상태를 확인하고 인계를 마쳤습니다." };
    if (s.status === "escaped") return { title: "안전 지점에서 대피를 마쳤습니다", text: map.success + " 현장 담당자에게 도착을 알리고 몸 상태를 확인했습니다." };
    if (needsFireReport(s)) return { title: "건물 밖에서 119에 알리세요", text: "집결지에서 확인하니 아직 화재를 신고한 사람이 없습니다. 안전한 곳에서 건물 이름과 연기를 본 층을 전하세요." };
    if (s.node === "safe") return { title: "대피 지점에 도착했습니다", text: map.goal + "의 현장 담당자가 맞이합니다. 도착한 인원과 몸 상태를 알려 주세요." };
    if (guidedExit(s)) {
      const together = s.guidance === "escorted";
      return { title: together ? "구조대원이 곁에 있습니다" : "대피 지시가 도착했습니다",
        text: s.protection ? routeBulletin(s) : (together ? "구조대원과 함께 " : "통행이 확인된 길을 따라 ") + map.nodes[guidedExit(s)].place + " 방향으로 이동하세요." };
    }
    if (s.guidance === "delayed") return { title: "구조대가 아직 접근하지 못했습니다", text: "119는 현재 위치를 알고 있습니다. 보호받는 자리에 머무르며 현장팀에 통행 가능한 다른 길이 있는지 확인하세요." };
    if (s.reportAt && s.protection) return { title: "119에 위치가 전달됐습니다", text: "현장팀이 확인한 다른 길을 문의하거나, 신고한 자리를 지키며 구조대가 접근할 수 있는지 기다릴 수 있습니다." };
    if (s.protection === "home") return { title: "집 안에는 연기가 없습니다", text: "현관문과 창문을 닫았습니다. 관리실이 이미 119에 신고했습니다. 안내 방송을 들으며 연기 유입과 대피 지시를 확인하세요." };
    if (s.protection === "refuge") return { title: "대피공간의 방화문을 닫았습니다", text: "휴대전화가 연결됩니다. 119에 아파트 동·층·호, 발코니 대피공간에 있다는 사실과 고립 인원을 전하세요." };
    if (s.protection === "room") return { title: "출구와 거리를 두었습니다", text: "안쪽 방의 문을 닫고 틈을 막았습니다. 휴대전화로 119에 건물·층·방 위치와 고립 인원을 알리세요." };
    if (s.protection === "high") return { title: "높은 곳에서 위치를 알리세요", text: "물길과 급경사지에서 떨어진 곳입니다. 휴대전화가 연결됩니다. 119에 계곡 이름·전망대 표지와 인원을 전하세요." };
    if (shaking(s)) return { title: s.elapsed === 0 ? "바닥이 크게 흔들립니다" : "다시 흔들립니다", text: coverText(s)[1] };
    if (s.id === "fire") {
      if (fireMode(s) === "stay") return { title: "다른 세대에서 불이 났습니다", text: "관리실 방송에 따르면 다른 세대에서 불이 났고 복도에 연기가 있습니다. 우리 집에는 연기나 불길이 없고 대피 지시도 없습니다." };
      if (fireMode(s) === "blocked" && hasRefuge(s)) return { title: "현관 밖 복도에 짙은 연기가 찼습니다", text: "현관 쪽에서 집 안으로 연기가 들어옵니다. 이 집 발코니에는 방화문이 달린 전용 대피공간이 있고 그곳까지 가는 길은 아직 깨끗합니다. 주변에 화재를 알렸습니다." };
      if (fireMode(s) === "blocked") return { title: "출입구를 짙은 연기가 막았습니다", text: "실내로 연기가 스며들고 모든 출구 쪽이 연기로 가득합니다. 별도 피난 시설은 없고 불에서 먼 안쪽 방과 휴대전화가 있습니다. 주변에 화재를 알렸습니다." };
      if (s.venue === "home" && ["mid", "last"].includes(s.node)) return { title: "아파트 밖 보행로가 보입니다", text: "주거동 밖까지 나왔습니다. 건물로 돌아가지 말고 단지 보행로를 따라 집결지로 이동하세요." };
      return { title: s.node === "start" ? "연기가 들어오지만 피난로가 보입니다" : "피난 유도등이 보입니다", text: s.node === "start" ? "실내로 연기가 들어옵니다. 한쪽 피난로는 연기 없이 열려 있습니다. 주변 사람에게 알리고 지나온 문을 닫으며 계단으로 대피하세요." : "밝혀진 피난 표지를 따라 남은 통로를 확인하세요. 연기가 있는 쪽으로 들어가거나 승강기를 타지 않습니다." };
    }
    if (s.id === "quake") return { title: "흔들림이 멎었습니다", text: outdoors(s) ? "머리를 보호하며 건물과 담장에서 떨어진 넓은 곳으로 이동하세요." : "나갈 수 있는 길이 보입니다. 머리를 보호하며 통행 가능한 계단을 따라 밖으로 이동하세요." };
    if (stranded(s)) return { title: "전망대 아래 길이 끊겼습니다", text: "급류가 산장 쪽 길과 돌아가는 길을 모두 가로막았습니다. 물길에서 떨어진 전망대 안쪽에 높고 평탄한 쉼터가 있습니다." };
    if (s.venue === "travel") return { title: "물가를 벗어나 높은 곳으로", text: "계곡물이 불고 있습니다. 짐을 두고 물가에서 멀어지는 같은 둑의 오르막을 따라가세요. 물이 잠긴 다리나 개울은 건너지 않습니다." };
    if (rank[s.node] >= 3 || (s.venue === "home" && s.node === "mid")) return { title: "높은 지상의 대피 지점이 보입니다", text: "물이 고인 낮은 길을 피해 안내된 높은 쪽 대피 지점으로 이동하세요." };
    if (s.venue === "home" && s.node === "b") return { title: "위층 계단참에 올랐습니다", text: "아래쪽에서 물소리가 들립니다. 창밖으로 언덕 위 학교가 보이고, 이 높이에서 바로 이어지는 높은 쪽 대피로가 열려 있습니다." };
    return { title: s.venue === "home" ? "반지하로 물이 들어옵니다" : "역사에 물이 들어옵니다", text: s.venue === "home" ? "소지품을 두고 통행 가능한 계단을 따라 지상이나 높은 층으로 바로 이동하세요. 물이 쏟아지는 길은 피하세요." : "역무 방송이 상행 대피로를 안내합니다. 물이 밀려드는 통로를 피해 아직 통행 가능한 계단으로 지상에 올라가세요." };
  }
  function finalGoal(s) {
    if (s.archived) return currentPlace(s);
    if (s.known.areas.includes("safe")) return maps.of(s).goal + " 도착 후 안전 확인";
    return s.id === "flood" ? "높은 곳의 대피처에 도착해 안전 확인" : "건물 밖 집결지에 도착해 안전 확인";
  }
  function objective(s) {
    if (s.status !== "playing") return currentPlace(s);
    if (needsFireReport(s)) return "안전한 곳에서 119에 화재 위치 전달";
    if (s.node === "safe") return "현장 담당자와 인원·몸 상태 확인";
    const next = guidedExit(s);
    if (next) return (s.guidance === "escorted" ? "구조대와 이동 · " : "확인된 대피로 · ") + maps.of(s).nodes[next].place;
    if (s.guidance === "delayed") return "현재 자리에서 대체 피난로 안내 확인";
    if (s.reportAt && s.protection) return "피난로 안내를 요청하거나 구조대 접근 확인";
    if (s.protection === "home" || fireMode(s) === "stay") return "집 안에서 연기 유입과 대피 방송 확인";
    if (s.protection || stranded(s) || fireMode(s) === "blocked") return "안전한 곳을 확보하고 119에 위치 전달";
    if (shaking(s)) return "흔들림이 멎을 때까지 몸 보호";
    if (s.known.areas.includes("safe")) return maps.of(s).goal + " 대피";
    return { fire: "피난계단을 거쳐 건물 밖으로", flood: s.venue === "travel" ? "물길과 떨어진 높은 곳으로" : "높은 층이나 지상으로", quake: "건물에서 떨어진 넓은 곳으로" }[s.id];
  }
  globalThis.DisasterResponse = { fireMode, stranded, shaking, hazardCost, currentPlace, statusLabel, guidedExit, routeBulletin, needsFireReport, barrier, coverText, shelterAction, reportKey, reportDetails, reportStatus, situation, finalGoal, objective };
})();
