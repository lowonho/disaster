(() => {
  "use strict";
  const game = globalThis.DisasterGame, art = globalThis.DisasterArt;
  const maps = globalThis.DisasterMaps, knowledge = globalThis.DisasterKnowledge;
  const { items, capacity } = globalThis.DisasterSupplies;
  const { byId, element, signed } = globalThis.DisasterUI;

  function itemTag(id, count) {
    const tag = element("span", "supply-tag");
    tag.append(art.icon(items[id].icon), document.createTextNode(items[id].name + (count > 1 ? " ×" + count : "")));
    return tag;
  }

  function bagSlots(state, options) {
    const grid = element("div", "bag-grid");
    grid.setAttribute("aria-label", "가방 " + state.bag.length + "/" + capacity + "칸");
    for (let index = 0; index < capacity; index++) {
      const id = state.bag[index], slot = element("div", "bag-slot");
      if (id) {
        slot.append(itemTag(id, 1));
        const drop = options.find(option => option.id === "drop:" + id);
        const button = element("button", "drop-item", "놓기");
        button.type = "button";
        button.dataset.action = drop.id;
        button.disabled = Boolean(drop.unavailable);
        button.setAttribute("aria-label", items[id].name + " 이곳에 놓기 · 턴 소모 없음");
        button.title = items[id].info + " 이곳에 놓기는 턴을 쓰지 않는다.";
        slot.append(button);
      } else {
        slot.classList.add("empty");
        slot.textContent = "빈 칸";
      }
      grid.append(slot);
    }
    return grid;
  }

  function cost(kind, label, glyph, value) {
    const tag = element("span", "cost " + kind);
    tag.append(art.icon(glyph), element("span", "cost-name", label), document.createTextNode(signed(value)));
    return tag;
  }

  function supplyLocations(state, item) {
    const areas = state.known.areas.filter(key => knowledge.stock(state, key)?.includes(item) && game.turnsToClose(state, key) > 0);
    return areas.map(key => maps.of(state).nodes[key].map).join(", ") || "확인된 위치 없음";
  }

  function actionButton(state, action, index) {
    const button = element("button", "action");
    button.type = "button";
    button.dataset.action = action.id;
    button.dataset.tone = action.section === "travel" ? "move" : action.id === "eat" ? "rest" : "observe";
    button.disabled = Boolean(action.unavailable);
    const header = element("span", "action-head"), symbol = element("span", "action-icon");
    symbol.append(art.icon(action.icon));
    const key = element("kbd", "", String(index + 1));
    key.setAttribute("aria-hidden", "true");
    header.append(symbol, key);
    const body = element("span", "action-body");
    body.append(element("strong", "action-title", action.title), element("span", "action-description", action.description));
    if (action.ingredients) body.append(element("span", "recipe-parts", action.ingredients.map(id => items[id].name).join(" + ")));
    for (const id of action.missing || []) {
      body.append(element("span", "ingredient-source", items[id].name + " · " + supplyLocations(state, id)));
    }
    if (action.warning) body.append(element("span", "danger-cost", action.warning));
    if (action.check && !action.unavailable) {
      const rule = element("span", "check-line"), target = element("span", "check-target");
      target.append(art.icon("die"), document.createTextNode(action.check.target + " 이상 성공"));
      rule.append(target);
      body.append(rule);
    }
    const costs = element("span", "costs");
    if (action.unavailable) costs.append(element("span", "unavailable", action.unavailable));
    else {
      if (action.hp) costs.append(cost("hp", action.check ? "성공 시 체력" : "체력", "heart", action.hp));
      costs.append(cost("risk", "노출", "alert", action.exposure));
      if (state.exposure + action.exposure >= 100) costs.append(element("span", "danger-cost", "노출 한계"));
      else if (state.hp + action.hp <= 0) costs.append(element("span", "danger-cost", "체력 소진 위험"));
      button.setAttribute("aria-keyshortcuts", String(index + 1));
    }
    button.append(header, body, costs);
    return button;
  }

  function render(state, view) {
    const live = state.status === "playing";
    byId("field-tabs").hidden = !live;
    const context = byId("field-context"), actions = byId("actions");
    context.replaceChildren();
    actions.replaceChildren();
    if (!live) return;
    const options = game.choices(state);
    const place = maps.of(state).nodes[state.node].place;
    document.querySelectorAll("[data-view]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.view === view)));
    byId("bag-count").textContent = state.bag.length + "/" + capacity;
    if (view === "field") {
      const pile = knowledge.stock(state, state.node), summary = element("div", "stock-summary");
      summary.append(element("strong", "", pile ? "남은 물자 " + pile.length : "물자 미확인"));
      for (const id of new Set(pile || [])) summary.append(itemTag(id, pile.filter(item => item === id).length));
      if (pile && !pile.length) summary.append(element("span", "", "다른 지역에서 탐색할 수 있다."));
      else if (state.bag.length === capacity) summary.append(element("span", "", "가방에서 조립하거나 물자를 내려두자."));
      else if (!pile) summary.append(element("span", "", "탐색으로 물자를 얻거나 주위를 살펴 기록할 수 있다."));
      context.append(summary);
    } else if (view === "travel") {
      const hint = element("div", "field-hint", place + "에서 한 번에 이동할 수 있는 지역");
      const showMap = element("button", "map-jump", "전체 지도");
      showMap.type = "button";
      showMap.addEventListener("click", () => {
        byId("route-heading").focus({ preventScroll: true });
        byId("route-heading").scrollIntoView({ block: "start" });
      });
      hint.append(showMap);
      context.append(hint);
    } else {
      context.append(bagSlots(state, options));
      context.append(element("p", "field-hint", "조립하면 재료 두 개가 장비 한 개로 바뀐다. 물자 놓기는 0턴."));
    }
    let visible = options.filter(action => action.section === view && !action.item);
    if (view === "field") {
      // Make a successful arrival actionable immediately, including the final exit.
      const priority = ["cover", "escape", "rescue", "search", "survey"];
      visible.sort((a, b) => Number(Boolean(a.unavailable)) - Number(Boolean(b.unavailable)) || priority.indexOf(a.id) - priority.indexOf(b.id));
    }
    if (view === "travel" && state.node === "last") visible.push(options.find(action => action.id === "escape"));
    actions.replaceChildren(...visible.map((action, index) => actionButton(state, action, index)));
  }
  globalThis.DisasterField = { render };
})();
