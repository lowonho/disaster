(() => {
  "use strict";
  // Only the old journal reader uses these costs, checks and supplies.
  const maps = globalThis.DisasterMaps;
  const rules = {
    fire: { risk: "연기 노출", loss: "연기가 짙어져 다음 피난 표지를 찾기 어려워졌다.", initialExposure: 10, firstClose: 6, secondClose: 10, walkTarget: 5, walkRisk: 21, express: "b" },
    flood: { risk: "침수 노출", loss: "수위가 높아져 남은 이동 통로가 통제됐다.", initialExposure: 8, firstClose: 5, secondClose: 9, walkTarget: 4, walkRisk: 24, express: "a" },
    quake: { risk: "낙하물 노출", loss: "떨어진 물건이 쌓여 더 이동하기 어려워졌다.", initialExposure: 12, firstClose: 7, secondClose: 12, walkTarget: 5, walkRisk: 20, express: "b" },
  };
  const sites = {
    fire: {
      home: {
        start: { stock: ["battery", "ration"], searchTarget: 2 },
        a: { stock: ["radioBody", "ration"], searchTarget: 2 },
        b: { stock: ["lampBody", "ration"], searchTarget: 3 },
        mid: { stock: ["battery", "ration"], searchTarget: 2 },
        last: { stock: ["lampBody", "radioBody"], searchTarget: 3 },
      },
      work: {
        start: { stock: ["battery", "ration"], searchTarget: 2 },
        a: { stock: ["radioBody", "ration"], searchTarget: 2 },
        b: { stock: ["lampBody", "ration"], searchTarget: 3 },
        mid: { stock: ["battery", "ration"], searchTarget: 2 },
        last: { stock: ["lampBody", "radioBody"], searchTarget: 3 },
      },
      travel: {
        start: { stock: ["battery", "ration"], searchTarget: 2 },
        a: { stock: ["lampBody", "ration"], searchTarget: 3 },
        b: { stock: ["radioBody", "ration"], searchTarget: 2 },
        mid: { stock: ["battery", "ration"], searchTarget: 2 },
        last: { stock: ["lampBody", "radioBody"], searchTarget: 3 },
      },
    },
    flood: {
      home: {
        start: { stock: ["radioBody", "ration"], searchTarget: 2 },
        a: { stock: ["battery", "ration"], searchTarget: 2 },
        b: { stock: ["lampBody", "ration"], searchTarget: 3 },
        mid: { stock: ["battery", "ration"], searchTarget: 2 },
        last: { stock: ["lampBody", "radioBody"], searchTarget: 3 },
      },
      work: {
        start: { stock: ["radioBody", "ration"], searchTarget: 2 },
        a: { stock: ["battery", "ration"], searchTarget: 3 },
        b: { stock: ["lampBody", "radioBody"], searchTarget: 2 },
        mid: { stock: ["battery", "ration"], searchTarget: 2 },
        last: { stock: ["lampBody", "ration"], searchTarget: 3 },
      },
      travel: {
        start: { stock: ["radioBody", "ration"], searchTarget: 2 },
        a: { stock: ["lampBody", "ration"], searchTarget: 3 },
        b: { stock: ["battery", "ration"], searchTarget: 2 },
        mid: { stock: ["battery", "ration"], searchTarget: 2 },
        last: { stock: ["radioBody", "lampBody"], searchTarget: 3 },
      },
    },
    quake: {
      home: {
        start: { stock: ["lampBody", "ration"], searchTarget: 2 },
        a: { stock: ["radioBody", "ration"], searchTarget: 2 },
        b: { stock: ["battery", "ration"], searchTarget: 3 },
        mid: { stock: ["battery", "ration"], searchTarget: 2 },
        last: { stock: ["lampBody", "radioBody"], searchTarget: 3 },
      },
      work: {
        start: { stock: ["lampBody", "ration"], searchTarget: 2 },
        a: { stock: ["radioBody", "ration"], searchTarget: 2 },
        b: { stock: ["battery", "ration"], searchTarget: 3 },
        mid: { stock: ["battery", "ration"], searchTarget: 2 },
        last: { stock: ["radioBody", "lampBody"], searchTarget: 3 },
      },
      travel: {
        start: { stock: ["lampBody", "ration"], searchTarget: 2 },
        a: { stock: ["battery", "ration"], searchTarget: 3 },
        b: { stock: ["radioBody", "ration"], searchTarget: 2 },
        mid: { stock: ["battery", "ration"], searchTarget: 2 },
        last: { stock: ["lampBody", "radioBody"], searchTarget: 3 },
      },
    },
  };
  const catalog = {};
  for (const [id, venues] of Object.entries(sites)) {
    catalog[id] = {};
    for (const [venue, legacySites] of Object.entries(venues)) {
      const map = maps.get(id, venue);
      const nodes = Object.fromEntries(Object.entries(map.nodes).map(([key, area]) => [key, { ...area, ...legacySites[key] }]));
      const express = venue === "home" ? "b" : venue === "travel" ? "a" : rules[id].express;
      catalog[id][venue] = { ...map, ...rules[id], express, nodes };
    }
  }
  globalThis.DisasterMapsV4 = { ...maps, get: (id, venue) => catalog[id][venue], of: state => catalog[state.id][state.venue] };
})();
