(() => {
  "use strict";
  const scenarios = globalThis.DisasterScenarios;
  const maps = globalThis.DisasterMaps, knowledge = globalThis.DisasterKnowledge;
  const { items, recipes, capacity } = globalThis.DisasterSupplies;
  const clamp = n => Math.max(0, Math.min(100, n));
  const maxSeed = 0x100000000;
  const originalSettings = { layout: "full", supplies: "full" };

  function newRun(id, seed = Math.floor(Math.random() * maxSeed), venue = "work", settings = maps.venues[venue].settings) {
    const scenario = maps.get(id, venue);
    let sequence = seed;
    const stock = {};
    for (const [key, area] of Object.entries(scenario.nodes)) {
      if (!area.stock) continue;
      const pile = area.stock.slice();
      for (let i = pile.length - 1; i > 0; i--) {
        sequence = (Math.imul(sequence, 1664525) + 1013904223) >>> 0;
        const j = Math.floor(sequence / maxSeed * (i + 1));
        [pile[i], pile[j]] = [pile[j], pile[i]];
      }
      stock[key] = pile;
    }
    return {
      id, seed, venue, settings: { ...settings }, known: knowledge.initial(scenario, settings),
      node: "start", elapsed: 0, hp: 100, exposure: scenario.initialExposure, status: "playing",
      visited: ["start"], bag: [], stock, clues: {}, steps: [], legacy: null,
      log: [{ turn: 0, title: "대피 시작", text: scenario.opening, kind: "start" }]
    };
  }

  function closures(state) {
    const scenario = maps.of(state);
    return [[state.seed % 2 === 0 ? "a" : "b", scenario.firstClose], ["start", scenario.secondClose]];
  }

  function turnsToClose(state, area) {
    const deadline = closures(state).find(([key]) => key === area);
    return deadline ? Math.max(0, deadline[1] - state.elapsed) : Infinity;
  }
  function announcedClose(state, area) {
    const remaining = turnsToClose(state, area);
    if (!remaining || state.settings.layout === "full") return remaining;
    const next = closures(state).find(([, at]) => at > state.elapsed);
    return next?.[0] === area && knowledge.hasArea(state, area) ? remaining : Infinity;
  }

  function shaking(state) {
    return state.status === "playing" && state.id === "quake" && state.elapsed % 4 === 0;
  }

  function hazardCost(state) {
    if (state.id === "flood") return Math.min(4, Math.floor(state.elapsed / 2));
    if (state.id === "fire" && state.elapsed >= maps.of(state).firstClose) return 2;
    return 0;
  }

  function notice(state) {
    if (state.status !== "playing") return { icon: "flag", text: "시뮬레이션 종료" };
    const scenario = maps.of(state);
    const next = closures(state).find(([, at]) => at > state.elapsed);
    const text = [];
    if (state.id === "quake") text.push(shaking(state) ? "진동 중 · 몸을 보호할 차례" : (4 - state.elapsed % 4) + "턴 뒤 여진");
    if (turnsToClose(state, state.node) === 0) text.push("현재 지역 통제 · 이동 필요");
    if (next) text.push(knowledge.hasArea(state, next[0]) ? scenario.nodes[next[0]].map + " " + (next[1] - state.elapsed) + "턴 뒤 통제" : "통제 예고 · 위치 미확인");
    else if (!text.length) text.push("통제 지역 2곳");
    if (hazardCost(state)) text.push("추가 노출 +" + hazardCost(state));
    return { icon: shaking(state) ? "quake" : "clock", text: text.join(" · ") };
  }

  function situation(state) {
    const scenario = maps.of(state), area = scenario.nodes[state.node];
    if (state.status === "escaped") return { title: "탈출 성공", text: scenario.success };
    if (state.status === "exhausted") return { title: "체력이 바닥났다", text: area.place + "에서 대피가 중단됐다." };
    if (state.status === "exposed") return { title: "위험 노출 한계 도달", text: scenario.loss };
    if (shaking(state)) return { title: state.elapsed ? "여진이 시작됐다" : "발밑이 크게 흔들린다", text: "이번 턴은 현재 자리에서 몸을 보호한다. 진동이 멎으면 다시 움직일 수 있다." };
    if (turnsToClose(state, state.node) === 0) return { title: "이 지역이 통제됐다", text: area.place + "의 탐색이 끝났다. 지역 이동에서 연결된 다른 곳을 골라 빠져나가자." };
    if (scenario.sight && (state.settings.layout !== "full" || state.settings.supplies !== "full")) {
      return { title: area.place, text: scenario.sight[state.node] };
    }
    return area;
  }

  function choices(state) {
    if (state.status !== "playing") return [];
    const scenario = maps.of(state), area = scenario.nodes[state.node];
    const { bag } = state, pile = state.stock[state.node];
    const closed = turnsToClose(state, state.node) === 0;
    const tremor = shaking(state);
    const interruption = tremor ? "진동 중" : closed ? "지역 통제" : "";
    const lamp = bag.includes("lamp");
    const actions = [];
    function add(id, section, title, description, icon, hp, exposure, options = {}) {
      const turns = options.turns ?? 1;
      actions.push({ id, section, title, description, icon, hp: Math.min(hp, 100 - state.hp),
        exposure: exposure + (turns ? hazardCost(state) : 0), turns, ...options });
    }
    if (tremor) add("cover", "field", "몸 보호하기", "진동이 잦아들 때까지 현재 자리에서 몸을 보호한다.", "shield", 0, 2);
    add("search", "field", "이 지역 탐색", lamp ? "손전등으로 남은 물자 하나를 확실히 찾는다." : state.clues[state.node]
      ? "이곳에 남은 단서로 물자 하나를 확실히 찾는다." : "물자 하나를 찾는다. 실패하면 다음 탐색에 쓸 단서를 얻는다.",
      "eye", 0, area.searchTarget === 3 ? 5 : 4, {
        unavailable: interruption || (!pile.length ? "물자 소진" : bag.length >= capacity ? "가방 가득" : ""),
        check: lamp || state.clues[state.node] ? null : { target: area.searchTarget, miss: "물자를 바로 찾지 못했다. 이 지역에 단서가 남아 다음 탐색은 확정이다." }
      });
    if (knowledge.canSurvey(state)) {
      add("survey", "field", "주변 살피기", "표지와 보관함을 살펴 연결된 통로와 이곳의 물자를 지도에 기록한다.", "route", 0, 2,
        { unavailable: interruption });
    }
    const exits = knowledge.exits(state);
    if (exits.some(to => !knowledge.hasRoute(state, state.node, to))) {
      exits.sort((a, b) => scenario.points[a][0] - scenario.points[b][0] || scenario.points[a][1] - scenario.points[b][1]);
    }
    const directions = { 2: ["왼편 통로", "오른편 통로"], 3: ["왼편 통로", "가운데 통로", "오른편 통로"] };
    for (const [index, to] of exits.entries()) {
      const destination = scenario.nodes[to];
      const shortcut = [to, state.node].includes(scenario.express) && [to, state.node].includes("last");
      const remaining = turnsToClose(state, to);
      const mapped = knowledge.hasRoute(state, state.node, to);
      const pileAtDestination = knowledge.stock(state, to);
      const stockNames = pileAtDestination ? [...new Set(pileAtDestination)].map(item => items[item].name).join(", ") || "물자 소진" : "물자 미확인";
      const description = mapped ? (shortcut ? "직통 경로" : "연결 경로") + " · " + stockNames : "행선지 미확인 · 도착하면 지도에 기록한다.";
      const passage = directions[exits.length]?.[index] || (index + 1) + "번 통로";
      add("move:" + to, "travel", mapped ? destination.place : passage, description,
        mapped && shortcut ? "stairs" : "walk", shortcut ? -18 : -10, shortcut ? 6 : 5, {
          to, unavailable: tremor ? "진동 중" : remaining === 0 ? "지역 통제" : "",
          warning: mapped && announcedClose(state, to) === 1 ? "도착하면 즉시 통제" : ""
        });
    }
    if (state.node === "last") {
      add("escape", "field", "도보 탈출", lamp ? "손전등으로 유도 표지를 확인하고 " + scenario.goal + "까지 이동한다."
        : "유도 표지를 찾아 " + scenario.goal + "까지 이동한다. 손전등이 있으면 확정이다.", "flag", lamp ? -8 : -22, lamp ? 6 : scenario.walkRisk,
        { to: "safe", unavailable: interruption, check: lamp ? null : { target: scenario.walkTarget, miss: "표지를 놓쳐 출구에 머물렀다. 도보 탈출을 다시 시도할 수 있다." } });
    }
    if (state.node === "mid" || state.node === "last") {
      add("rescue", "field", "무전 구조 요청", knowledge.hasArea(state, "safe") ? "현재 위치를 전하고 구조대와 함께 " + scenario.goal + "까지 간다." : "현재 위치를 전하고 구조대의 안내를 받아 대피한다.", "radio", -2, 3,
        { to: "safe", unavailable: interruption || (bag.includes("radio") ? "" : "구조 무전기 필요") });
    }
    for (const [product, ingredients] of Object.entries(recipes)) {
      const missing = ingredients.filter(part => !bag.includes(part));
      add("craft:" + product, "bag", items[product].name + " 조립", items[product].info, items[product].icon, 0, 2,
        { product, ingredients, missing, unavailable: interruption || (missing.length ? "재료 부족" : "") });
    }
    if (bag.includes("ration")) {
      add("eat", "bag", "비상식량 먹기", "식량 한 개를 먹고 체력을 최대 28 회복한다.", "ration", 28, 2,
        { unavailable: interruption || (state.hp === 100 ? "체력 가득" : "") });
    }
    for (const item of new Set(bag)) {
      add("drop:" + item, "bag", items[item].name + " 내려두기", "이 지역의 물자로 돌아간다.", items[item].icon, 0, 0,
        { item, turns: 0, unavailable: interruption });
    }
    return actions;
  }

  function eventAfter(state) {
    if (state.status !== "playing") return "";
    const scenario = maps.of(state);
    const messages = closures(state).filter(([, at]) => at === state.elapsed)
      .map(([key]) => knowledge.hasArea(state, key) ? scenario.nodes[key].place + " 통제 시작." : "아직 확인하지 못한 구역에서 통제가 시작됐다.");
    if (shaking(state)) messages.push("여진이 시작됐다.");
    return messages.join(" ");
  }

  function apply(state, action, face) {
    const scenario = maps.of(state), bag = state.bag, pile = state.stock[state.node];
    const hpBefore = state.hp, riskBefore = state.exposure;
    const roll = face === null ? null : { face, target: action.check.target, passed: face >= action.check.target };
    const passed = !roll || roll.passed;
    state.steps.push(roll ? { id: action.id, face } : action.id);
    state.elapsed += action.turns;
    if (passed) state.hp = clamp(state.hp + action.hp);
    state.exposure = clamp(state.exposure + action.exposure);
    let text, kind = passed ? "action" : "blocked";
    if (state.hp === 0 || state.exposure >= 100) {
      state.status = state.hp === 0 ? "exhausted" : "exposed";
      kind = "loss";
      text = state.hp === 0 ? "남은 체력을 모두 써서 이동이 멈췄다." : scenario.loss;
    } else if (!passed) {
      text = action.check.miss;
      if (action.id === "search") state.clues[state.node] = true;
    } else if (action.id === "search") {
      const found = pile.shift();
      bag.push(found);
      delete state.clues[state.node];
      text = items[found].name + " 획득. 가방 " + bag.length + "/" + capacity + "칸.";
      if (!pile.length && !state.known.caches.includes(state.node)) state.known.caches.push(state.node);
    } else if (action.id === "survey") {
      text = knowledge.survey(state);
    } else if (action.product) {
      for (const part of recipes[action.product]) bag.splice(bag.indexOf(part), 1);
      bag.push(action.product);
      text = items[action.product].name + " 조립 완료. " + items[action.product].info;
    } else if (action.item) {
      bag.splice(bag.indexOf(action.item), 1);
      pile.unshift(action.item);
      text = items[action.item].name + " 한 개를 이곳에 두었다.";
    } else if (action.id === "eat") {
      bag.splice(bag.indexOf("ration"), 1);
      text = "비상식량을 먹어 체력을 " + (state.hp - hpBefore) + " 회복했다.";
    } else if (action.to) {
      knowledge.arrive(state, state.node, action.to, action.id === "rescue");
      state.node = action.to;
      state.visited.push(action.to);
      text = scenario.nodes[action.to].place + " 도착.";
      if (action.to === "safe") {
        state.status = "escaped";
        kind = "win";
        text = (action.id === "rescue" ? "무전으로 구조대와 합류했다. " : "유도 표지를 따라 걸었다. ") + text;
      }
    } else {
      text = "몸을 보호하며 진동이 잦아들기를 기다렸다.";
    }
    const entry = { turn: state.elapsed, title: action.title, text, kind, hp: state.hp - hpBefore,
      exposure: state.exposure - riskBefore, event: action.turns ? eventAfter(state) : "" };
    if (roll) entry.roll = roll;
    if (kind === "loss") entry.review = state.status === "exhausted"
      ? "행동 전 체력 " + hpBefore + " · 필요한 체력 " + Math.abs(action.hp)
      : "행동 전 노출 " + riskBefore + " · 행동 비용 +" + action.exposure;
    state.log.push(entry);
  }

  function available(state, id) {
    return choices(state).find(action => action.id === id && !action.unavailable);
  }

  function advance(state, id, random = Math.random) {
    const action = available(state, id);
    if (!action) return false;
    apply(state, action, action.check ? Math.floor(random() * 6) + 1 : null);
    return true;
  }

  function fromLegacy(id, saved) {
    const previous = globalThis.DisasterLegacyGame.restore(id, saved);
    if (!previous) return null;
    // Replay old journals under their original rules before continuing in the field.
    const state = newRun(id, previous.open === "a" ? 41 : 82, "work", originalSettings);
    for (const key of ["node", "elapsed", "hp", "exposure", "status", "visited", "log"]) state[key] = previous[key];
    if (previous.reported) state.bag.push("radio");
    state.legacy = globalThis.DisasterLegacyGame.snapshot(previous);
    return state;
  }

  function snapshot(state) {
    return { version: 4, id: state.id, venue: state.venue, settings: { ...state.settings }, seed: state.seed, legacy: state.legacy, steps: state.steps.slice() };
  }

  function restore(id, saved) {
    if (!Object.hasOwn(scenarios, id) || !saved) return null;
    if (saved.version === 1 || saved.version === 2) {
      const old = fromLegacy(id, saved);
      return old?.elapsed === 0 ? newRun(id, old.seed, "work") : old;
    }
    if (![3, 4].includes(saved.version) || !Number.isInteger(saved.seed) || saved.seed < 0 || saved.seed >= maxSeed
      || !Array.isArray(saved.steps) || saved.steps.length > 256) return null;
    let venue = saved.venue, settings = saved.settings;
    if (saved.version === 3) {
      venue = "work";
      // A fresh autosave has no played turns. Started journals keep the information they showed.
      settings = saved.steps.length || saved.legacy ? originalSettings : maps.venues.work.settings;
    }
    if (!Object.hasOwn(maps.venues, venue) || !maps.validSettings(settings) || (saved.version === 4 && id !== saved.id)) return null;
    if (saved.legacy && (venue !== "work" || !maps.sameSettings(settings, originalSettings))) return null;
    const state = saved.legacy ? fromLegacy(id, saved.legacy) : newRun(id, saved.seed, venue, settings);
    if (!state || state.seed !== saved.seed) return null;
    for (const step of saved.steps) {
      const recorded = typeof step === "object" && step !== null;
      const action = available(state, recorded ? step.id : step);
      if (!action || Boolean(action.check) !== recorded) return null;
      if (recorded && (!Number.isInteger(step.face) || step.face < 1 || step.face > 6)) return null;
      apply(state, action, recorded ? step.face : null);
    }
    return state;
  }

  globalThis.DisasterGame = { newRun, choices, advance, snapshot, restore, notice, situation, turnsToClose, announcedClose, neighbors: knowledge.exits, shaking };
})();
