(() => {
  "use strict";
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
    const known = { areas: ["start"], routes: [], signs: [] };
    if (settings.layout === "full") {
      for (const [a, b] of [...map.ways, ["last", "safe"]]) connect(known, a, b);
    } else if (settings.layout === "partial") {
      connect(known, "start", map.hintArea);
      include(known.areas, "mid");
    }
    // The saved difficulty key predates the switch from supplies to wayfinding clues.
    if (settings.supplies === "full") known.signs = Object.keys(map.nodes).filter(key => key !== "safe");
    if (settings.supplies === "partial") include(known.signs, settings.layout === "none" ? "start" : map.hintArea);
    return known;
  }
  function hasArea(state, key) { return state.known.areas.includes(key); }
  function hasRoute(state, a, b) { return state.known.routes.includes(edge(a, b)); }
  function exits(state) {
    return globalThis.DisasterMaps.of(state).ways.filter(pair => pair.includes(state.node)).map(([a, b]) => a === state.node ? b : a);
  }
  function arrive(state, from, to) {
    connect(state.known, from, to);
    if (to === "last") connect(state.known, "last", "safe");
  }
  function revealRoute(state, from, to) { connect(state.known, from, to); }
  function canSurvey(state) {
    return !state.observed.includes(state.node) && (!state.known.signs.includes(state.node) || exits(state).some(to => !hasRoute(state, state.node, to)));
  }
  function survey(state, detailed) {
    include(state.observed, state.node);
    include(state.known.signs, state.node);
    if (detailed) for (const to of exits(state)) connect(state.known, state.node, to);
  }
  globalThis.DisasterKnowledge = { initial, hasArea, hasRoute, exits, arrive, revealRoute, canSurvey, survey };
})();
