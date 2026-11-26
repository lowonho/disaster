(() => {
  "use strict";
  // Used only when replaying saves written before version 5.
  const items = {
    battery: { name: "건전지", icon: "battery", info: "무전기와 손전등에 함께 쓰는 재료" },
    radioBody: { name: "무전기 본체", icon: "radio", info: "건전지를 넣으면 구조대와 교신할 수 있다." },
    lampBody: { name: "손전등 본체", icon: "lamp", info: "건전지를 넣으면 어두운 곳을 비출 수 있다." },
    ration: { name: "비상식량", icon: "ration", info: "먹으면 체력을 최대 28 회복한다." },
    radio: { name: "구조 무전기", icon: "radio", info: "교신 지점에서 구조를 요청해 바로 탈출한다." },
    lamp: { name: "손전등", icon: "lamp", info: "소지 중 물자를 확실히 찾고, 출구의 표지를 따라 확실히 탈출한다." }
  };
  const recipes = {
    radio: ["radioBody", "battery"],
    lamp: ["lampBody", "battery"]
  };
  globalThis.DisasterSupplies = { items, recipes, capacity: 4 };
})();
