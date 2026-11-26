(() => {
  "use strict";
  const maps = globalThis.DisasterMaps;
  const edge = (a, b) => [a, b].sort().join("-");
  function include(list, key) {
    if (!list.includes(key)) list.push(key);
  }
  function connect(known, a, b) {
    include(known.areas, a);
    include(known.areas, b);
    include(known.routes, edge(a, b));
  }
  function initial(map, settings) {
    const known = { areas: ["start"], routes: [], caches: [] };
    if (settings.layout === "full") {
      for (const [a, b] of [...map.ways, ["last", "safe"]]) connect(known, a, b);
    } else if (settings.layout === "partial") {
      connect(known, "start", map.hintArea);
      include(known.areas, "mid"); // A remembered landmark whose approach is still unknown.
    }
    if (settings.supplies === "full") known.caches = Object.keys(map.nodes).filter(key => map.nodes[key].stock);
    if (settings.supplies === "partial") known.caches.push(settings.layout === "none" ? "start" : map.hintArea);
    return known;
  }
  function hasArea(state, key) { return state.known.areas.includes(key); }
  function hasRoute(state, a, b) { return state.known.routes.includes(edge(a, b)); }
  function stock(state, key) {
    return hasArea(state, key) && state.known.caches.includes(key) ? state.stock[key] : null;
  }
  function exits(state) {
    return maps.of(state).ways.filter(pair => pair.includes(state.node)).map(([a, b]) => a === state.node ? b : a);
  }
  function arrive(state, from, to, rescued) {
    include(state.known.areas, to);
    if (!rescued) connect(state.known, from, to);
    if (to === "last") connect(state.known, "last", "safe");
  }
  function canSurvey(state) {
    return !state.known.caches.includes(state.node) || exits(state).some(to => !hasRoute(state, state.node, to));
  }
  function survey(state) {
    const map = maps.of(state), current = state.node, discoveries = [];
    const routes = exits(state).filter(to => !hasRoute(state, current, to));
    for (const to of routes) connect(state.known, current, to);
    if (routes.length) discoveries.push("연결 확인 · " + routes.map(to => map.nodes[to].place).join(", "));
    if (!state.known.caches.includes(current)) {
      include(state.known.caches, current);
      const names = [...new Set(state.stock[current])].map(id => globalThis.DisasterSupplies.items[id].name);
      discoveries.push("이곳의 물자 · " + (names.join(", ") || "소진"));
    }
    return discoveries.join(" / ");
  }
  function objective(state) {
    const map = maps.of(state);
    if (hasArea(state, "safe") && hasArea(state, "last")) {
      const walk = map.nodes.last.map + "에서 " + map.goal + "까지 걸으세요.";
      return hasArea(state, "mid") ? walk + " " + map.nodes.mid.map + "에서는 무전 구조도 가능합니다." : walk;
    }
    if (hasArea(state, "mid")) return map.nodes.mid.map + "에서 교신하거나, 걸어서 나갈 출구를 찾으세요.";
    return "통로를 따라 출구나 구조대와 교신할 곳을 찾으세요.";
  }
  globalThis.DisasterKnowledge = { initial, hasArea, hasRoute, stock, exits, arrive, canSurvey, survey, objective };
})();
