(() => {
  "use strict";
  const { byId, element, signed } = globalThis.DisasterUI;
  const game = globalThis.DisasterGame;
  const maps = globalThis.DisasterMaps, knowledge = globalThis.DisasterKnowledge;
  const { items } = globalThis.DisasterSupplies;
  function draw(state) {
    const canvas = byId("route-lines"), width = canvas.clientWidth, height = canvas.clientHeight;
    if (!width || !height) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    const pen = canvas.getContext("2d");
    pen.scale(ratio, ratio);
    pen.fillStyle = "#78856c12";
    pen.strokeStyle = "#84957b29";
    const footprints = state.settings.layout === "full" ? [[2, 8, 12, 17], [9, 74, 8, 18], [29, 41, 11, 15], [49, 7, 10, 19], [52, 75, 13, 16], [68, 35, 7, 16], [87, 64, 11, 21]] : [];
    for (const [x, y, w, h] of footprints) {
      pen.fillRect(x * width / 100, y * height / 100, w * width / 100, h * height / 100);
      pen.strokeRect(x * width / 100, y * height / 100, w * width / 100, h * height / 100);
    }
    const scenario = maps.of(state), points = scenario.points;
    for (const [from, to] of [...scenario.ways, ["last", "safe"]]) {
      if (!knowledge.hasRoute(state, from, to)) continue;
      const closed = [from, to].some(key => game.turnsToClose(state, key) === 0);
      const adjacent = [from, to].includes(state.node);
      pen.strokeStyle = closed ? "#aa887a" : adjacent ? "#4c725e" : "#8a9488";
      pen.lineWidth = adjacent ? 2.4 : 1.7;
      pen.setLineDash(closed || !adjacent ? [4, 4] : []);
      pen.beginPath();
      const path = [points[from]];
      if (state.venue === "work" && from === "a" && to === "last") path.push([59, 22], [73, 42]);
      path.push(points[to]);
      path.forEach(([x, y], i) => {
        if (i) pen.lineTo(x * width / 100, y * height / 100);
        else pen.moveTo(x * width / 100, y * height / 100);
      });
      pen.stroke();
    }
  }

  function statusOf(state, key) {
    const remaining = game.announcedClose(state, key);
    if (remaining === 0) return "통제";
    if (Number.isFinite(remaining)) return remaining + "턴 뒤 통제";
    if (key === "safe") return "탈출 지점";
    if (key === "mid" || key === "last") return "교신 가능";
    return "개방";
  }

  function render(state, selected) {
    const scenario = maps.of(state);
    if (!knowledge.hasArea(state, selected)) selected = state.node;
    const container = byId("map-points");
    for (const existing of Array.from(container.children)) {
      if (!knowledge.hasArea(state, existing.dataset.point)) existing.remove();
    }
    // Keep the same buttons as selection changes so a keyboard user retains focus.
    for (const key of state.known.areas) {
      const [x, y] = scenario.points[key];
      let point = container.querySelector('[data-point="' + key + '"]');
      if (!point) {
        point = element("button", "map-point");
        point.type = "button";
        point.dataset.point = key;
        point.append(element("span", "map-dot"), element("span", "point-label"));
        container.append(point);
      }
      point.style.left = x + "%";
      point.style.top = y + "%";
      point.dataset.top = String(y < 45);
      const remaining = game.announcedClose(state, key);
      point.dataset.state = key === state.node ? "current" : remaining === 0 ? "closed" : remaining <= 2 ? "warning" : state.visited.includes(key) ? "visited" : "open";
      point.setAttribute("aria-pressed", String(key === selected));
      point.setAttribute("aria-label", [scenario.nodes[key].place, key === state.node ? "현재 위치" : "", statusOf(state, key)].filter(Boolean).join(" · "));
      point.querySelector(".point-label").textContent = scenario.nodes[key].map;
    }
    const detail = byId("map-detail"), area = scenario.nodes[selected];
    const heading = element("div", "map-detail-head");
    heading.append(element("strong", "", area.place), element("span", "", (selected === state.node ? "현재 위치 · " : "") + statusOf(state, selected)));
    detail.replaceChildren(heading);
    const pile = knowledge.stock(state, selected);
    const supply = pile ? "남은 물자 · " + ([...new Set(pile)].map(key => items[key].name).join(", ") || "소진") : "물자 위치 미확인";
    detail.append(element("p", "", selected === "safe" ? "도보 탈출과 무전 구조의 도착 지점." : supply));
    if (state.status === "playing" && selected === state.node) {
      const hint = knowledge.canSurvey(state) ? "‘주변 살피기’로 통로와 이곳의 물자를 기록할 수 있습니다." : "지도에서 다른 지역을 눌러 경로를 확인하세요.";
      detail.append(element("p", "map-via", hint));
    }
    if (state.status === "playing" && selected !== state.node) {
      const action = game.choices(state).find(option => option.id === (selected === "safe" ? "escape" : "move:" + selected));
      if (action && knowledge.hasRoute(state, state.node, selected)) {
        const move = element("button", "map-move");
        move.type = "button";
        move.dataset.action = action.id;
        move.disabled = Boolean(action.unavailable);
        const target = action.check ? " · 주사위 " + action.check.target + "+" : "";
        move.textContent = action.unavailable || ((selected === "safe" ? "도보 탈출" : "이곳으로 이동") + " · 1턴 · 체력 " + signed(action.hp) + " · 노출 " + signed(action.exposure) + target);
        detail.append(move);
        if (action.warning) detail.append(element("p", "map-warning", action.warning));
      } else {
        const entrances = selected === "safe" ? ["last"] : scenario.ways.filter(pair => pair.includes(selected)).map(pair => pair.find(key => key !== selected));
        const via = entrances.filter(key => knowledge.hasRoute(state, selected, key) && game.turnsToClose(state, key) > 0).map(key => scenario.nodes[key].map);
        const hint = game.turnsToClose(state, selected) === 0 ? "통제되어 진입할 수 없다." : via.length ? "확인된 연결 지역 · " + via.join(", ") : "이곳까지 이어지는 길은 아직 미확인.";
        detail.append(element("p", "map-via", hint));
      }
    }
    draw(state);
  }
  globalThis.DisasterMap = { draw, render };
})();
