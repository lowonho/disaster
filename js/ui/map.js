(() => {
  "use strict";
  const { byId, element } = globalThis.DisasterUI;
  const game = globalThis.DisasterGame;
  const maps = globalThis.DisasterMaps, knowledge = globalThis.DisasterKnowledge;
  function localRoutes(state) { return globalThis.DisasterGame.choices(state).filter(a => a.to); }
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
    const scenario = maps.of(state), points = scenario.points, routes = localRoutes(state);
    for (const [from, to] of [...scenario.ways, ["last", "safe"]]) {
      if (!knowledge.hasRoute(state, from, to)) continue;
      const adjacent = [from, to].includes(state.node);
      const destination = from === state.node ? to : from;
      const closed = adjacent && routes.some(a => a.to === destination && a.unavailable);
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

  function statusOf(state, key, routes) {
    if (key === state.node) return "현재 위치";
    if (routes.some(a => a.to === key && a.unavailable)) return "지금 진입 불가";
    if (key === "safe") return "지정 대피 지점";
    return state.visited.includes(key) ? "지나온 곳" : "지도에 표시됨";
  }

  function render(state, selected) {
    const scenario = maps.of(state), routes = localRoutes(state);
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
      const closed = routes.some(a => a.to === key && a.unavailable);
      point.dataset.state = key === state.node ? "current" : closed ? "closed" : state.visited.includes(key) ? "visited" : "open";
      point.setAttribute("aria-pressed", String(key === selected));
      point.setAttribute("aria-label", [scenario.nodes[key].place, statusOf(state, key, routes)].filter(Boolean).join(" · "));
      point.querySelector(".point-label").textContent = scenario.nodes[key].map;
    }
    const detail = byId("map-detail"), area = scenario.nodes[selected];
    const heading = element("div", "map-detail-head");
    heading.append(element("strong", "", selected === state.node ? game.currentPlace(state) : area.place), element("span", "", statusOf(state, selected, routes)));
    detail.replaceChildren(heading);
    if (state.known.signs.includes(selected) || selected === "safe") detail.append(element("p", "", globalThis.DisasterGuidance.sign(scenario, selected)));
    if (state.status === "playing" && selected !== state.node) {
      const action = routes.find(option => option.to === selected);
      if (action && knowledge.hasRoute(state, state.node, selected)) {
        const move = element("button", "map-move");
        move.type = "button";
        move.dataset.action = action.id;
        move.disabled = Boolean(action.unavailable);
        move.textContent = action.unavailable || action.title + " · 1턴";
        detail.append(move);
      } else {
        const entrances = [...scenario.ways, ["last", "safe"]].filter(pair => pair.includes(selected)).map(pair => pair.find(key => key !== selected));
        const via = entrances.filter(key => knowledge.hasRoute(state, selected, key)).map(key => scenario.nodes[key].map);
        detail.append(element("p", "map-via", via.length ? "확인한 연결 지역 · " + via.join(", ") : "이어지는 길은 아직 확인하지 못했습니다."));
      }
    }
    draw(state);
  }
  globalThis.DisasterMap = { draw, render };
})();
