(() => {
  "use strict";
  const game = globalThis.DisasterGame, art = globalThis.DisasterArt;
  const maps = globalThis.DisasterMaps, guidance = globalThis.DisasterGuidance;
  const { byId, element } = globalThis.DisasterUI;

  function guide(map) {
    const info = guidance.forMap(map);
    const card = element("section", "response-guide");
    const list = element("ul", "help-rules");
    for (const rule of info.rules) list.append(element("li", "", rule));
    const links = element("div", "guide-links");
    for (const id of info.refs) {
      const [name, url] = guidance.sources[id];
      const link = element("a", "", name);
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      links.append(link);
    }
    card.append(element("h3", "", info.title), list, links);
    return card;
  }

  function actionButton(action, index) {
    const button = element("button", "action");
    button.type = "button";
    button.dataset.action = action.id;
    button.dataset.tone = action.to ? "move" : "observe";
    button.disabled = Boolean(action.unavailable);
    const header = element("span", "action-head"), symbol = element("span", "action-icon");
    symbol.append(art.icon(button.disabled ? "lock" : action.icon));
    const key = element("kbd", "", String(index + 1));
    key.setAttribute("aria-hidden", "true");
    header.append(symbol, key);
    const body = element("span", "action-body");
    body.append(element("strong", "action-title", action.title), element("span", "action-description", action.description));
    const meta = element("span", "costs");
    if (button.disabled) meta.append(element("span", "unavailable", "진입 중지"));
    else {
      button.setAttribute("aria-keyshortcuts", String(index + 1));
      const line = element("span", "cost");
      let cost = action.turns ? "1턴" : "턴 소모 없음";
      if (action.check) cost = action.check.target + (action.check.kind === "rescue" ? " 이상 · 구조대 접근 · 1턴" : " 이상 · 추가 단서");
      line.append(art.icon(action.check ? "die" : "clock"), document.createTextNode(cost));
      meta.append(line);
    }
    button.append(header, body, meta);
    return button;
  }

  function render(state, view) {
    const live = state.status === "playing";
    byId("field-tabs").hidden = !live;
    const context = byId("field-context"), actions = byId("actions");
    context.replaceChildren();
    actions.replaceChildren();
    if (!live) return;
    document.querySelectorAll("[data-view]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.view === view)));
    const map = maps.of(state);
    if (view === "guide") { context.append(guide(map)); return; }
    const options = game.choices(state);
    const hint = element("div", "field-hint");
    let visible;
    if (view === "travel") {
      const routes = options.filter(a => a.to);
      const canMove = routes.some(a => !a.unavailable);
      hint.append(document.createTextNode(canMove ? game.currentPlace(state) + "에서 이어지는 길" : state.node === "safe" ? "도착 지점에서 할 일" : "지금은 이동할 수 없습니다. 현재 위치에서 할 행동을 선택하세요."));
      const showMap = element("button", "map-jump", "지역 지도 보기");
      showMap.type = "button";
      showMap.addEventListener("click", () => { byId("route-heading").focus({ preventScroll: true }); byId("route-heading").scrollIntoView({ block: "start" }); });
      hint.append(showMap);
      visible = canMove ? routes : [...options.filter(a => !a.to && !a.unavailable), ...routes];
    } else {
      if (state.known.signs.includes(state.node) && !state.protection && !game.shaking(state)) hint.textContent = guidance.sign(map, state.node);
      visible = options.filter(a => !a.unavailable);
      // Show a visible danger beside the viable route without filling the panel with backtracking.
      const obstruction = options.find(a => a.unavailable && !state.visited.includes(a.to));
      if (obstruction && !state.protection && !game.shaking(state)) visible.push(obstruction);
    }
    if (hint.childNodes.length) context.append(hint);
    actions.replaceChildren(...visible.map(actionButton));
  }
  globalThis.DisasterField = { render, guide };
})();
