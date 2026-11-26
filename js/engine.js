(() => {
  "use strict";
  const maps = globalThis.DisasterMaps, knowledge = globalThis.DisasterKnowledge;
  const response = globalThis.DisasterResponse, guidance = globalThis.DisasterGuidance;
  const maxSeed = 0x100000000;

  function newRun(id, seed = Math.floor(Math.random() * maxSeed), venue = "work", settings = maps.venues[venue].settings, opening = "auto") {
    const map = maps.get(id, venue);
    return { id, seed, venue, settings: { layout: settings.layout, supplies: settings.supplies },
      node: "start", status: "playing", elapsed: 0, visited: ["start"], observed: [], known: knowledge.initial(map, settings),
      opening, guidance: "", protection: "", reportAt: "", previous: null, archived: false, steps: [],
      log: [{ turn: 0, title: "상황 발생", text: map.opening, kind: "start" }] };
  }
  function action(id, title, description, icon, turns = 1) { return { id, title, description, icon, turns }; }

  function route(s, to) {
    const map = maps.of(s), final = to === "safe";
    const known = knowledge.hasRoute(s, s.node, to);
    const landmarks = { a: "왼쪽 통로", b: "오른쪽 통로", mid: "안내 표지가 보이는 길", last: "출구 쪽 통로", start: "지나온 길" };
    if (s.id === "flood" && s.venue === "travel") Object.assign(landmarks, { a: "안내판 옆 산길", b: "정자 옆 오르막", mid: "전망 난간 쪽 산길", last: "산장 표지가 보이는 길" });
    const label = known || final ? map.nodes[to].place : landmarks[to];
    const unavailable = response.barrier(s, to);
    const guided = response.guidedExit(s) === to;
    let description;
    if (unavailable) description = unavailable;
    else if (guided) description = s.id === "flood" ? "물길과 다리를 피해 같은 둑의 상단 대피로를 따라갑니다." : "소방대가 불과 연기가 없다고 확인한 구간을 따라갑니다.";
    else if (final) description = { fire: "밖에서 인원을 확인하고 남은 사람이 있으면 소방대에 알립니다.",
      flood: "물이 고인 곳을 피해 지정된 높은 대피 지점에 합류합니다.", quake: "건물과 담장에서 떨어진 넓은 공간에 모입니다." }[s.id];
    else if (s.id === "fire" && s.venue === "home" && s.node === "a" && to === "mid") description = "복도 끝의 연기 없는 피난계단을 내려가 관리실 앞마당으로 나갑니다.";
    else if (s.id === "fire" && s.venue === "home" && s.node === "mid") description = "건물에서 떨어진 열린 보행로를 따라 집결지 쪽으로 갑니다.";
    else if (s.id === "fire") description = s.node === "start" ? "주변에 불을 알리고 문을 닫은 뒤 연기 없는 피난로로 낮게 이동합니다." : "유도등이 보이고 통로에 연기가 없습니다. 안내된 피난로를 따라갑니다.";
    else if (s.id === "quake") description = ["mid", "last"].includes(s.node) ? "머리를 보호하며 건물에서 멀어지는 쪽으로 갑니다." : "흔들림이 멎었습니다. 머리를 보호하며 막히지 않은 지상 방향 피난로를 이용합니다.";
    else description = s.venue === "travel" ? "물길을 건너지 않고 같은 둑의 높은 길을 따라갑니다." : "물이 차지 않은 높은 쪽 대피로로 바로 이동합니다.";
    const title = guided ? (s.guidance === "escorted" ? "구조대와 이동 · " : "안내 따라 이동 · ") + label : label + (final ? " 대피" : " 방향");
    return { ...action(final ? "escape" : "move:" + to, title, description, final ? "flag" : "walk"),
      section: "travel", to, unavailable };
  }
  function choices(s) {
    if (s.status !== "playing") return [];
    if (s.node === "safe") {
      if (response.needsFireReport(s)) return [action("report", "119에 화재 위치 알리기", "안전한 집결지에서 건물과 연기를 본 층을 전달합니다.", "phone", 0)];
      return [action("settle", "도착 인원과 몸 상태 알리기", "대피 지점 담당자와 인원을 확인하고 다친 곳이 있는지 살핍니다.", "check", 0)];
    }
    const exits = knowledge.exits(s);
    if (s.node === "last") exits.push("safe");
    const routes = exits.map(to => route(s, to));
    if (response.guidedExit(s)) return routes;
    const options = [];
    if (response.shaking(s)) {
      const [title, description] = response.coverText(s);
      options.push(action("cover", title, description, "shield"));
    } else if (s.protection === "home") {
      options.push(action("monitor", "방송과 연기 유입 계속 확인", "관리실의 신고를 확인했습니다. 닫힌 문 안쪽에서 대피 지시나 상황 변화에 귀를 기울입니다.", "voice"));
    } else if (s.protection) {
      if (s.reportAt !== response.reportKey(s)) options.push(action("report", "119에 고립 위치 알리기", "휴대전화로 현재 위치와 상황, 인원을 전달하는 신고 연습입니다.", "phone", 0));
      else {
        options.push(action("wait", s.id === "flood" ? "119에 높은 쪽 우회로 문의" : "119에 다른 피난로 문의", "신고한 자리를 지키고 현장팀이 확인한 대피 지시를 듣습니다.", "voice"));
        if (s.guidance !== "delayed") options.push({ ...action("rescue-check", "신고 위치에서 구조대 기다리기", "이번 접근 기회에 구조대가 이곳까지 올 수 있는지 판정합니다. 도착이 늦어지면 119와 다른 길을 확인할 수 있습니다.", "shield"), check: { kind: "rescue", target: 4 } });
      }
    } else {
      const shelter = response.shelterAction(s);
      if (shelter) options.push(action("protect", shelter[1], shelter[2], "shield"));
      else if (knowledge.canSurvey(s)) {
        const unknown = exits.some(to => !knowledge.hasRoute(s, s.node, to));
        const survey = action("survey", "눈앞의 대피 표지 읽기", unknown ? "주사위가 3 이상이면 이어지는 다른 길까지 지도에 표시합니다." : "현재 위치에서 보이는 대피 표지를 확인합니다.", "eye", 0);
        if (unknown) survey.check = { target: 3 };
        options.push(survey);
      }
    }
    return [...options.filter(o => o.id !== "survey"), ...routes, ...options.filter(o => o.id === "survey")];
  }

  function available(s, id) { return choices(s).find(o => o.id === id && !o.unavailable); }
  function apply(s, act, face) {
    const previousSignal = response.shaking(s);
    const shelter = act.id === "protect" ? response.shelterAction(s) : null;
    s.elapsed += act.turns;
    let text = act.description, kind = "action";
    const roll = act.check ? { face, target: act.check.target, passed: face >= act.check.target } : null;
    if (act.check?.kind) roll.kind = act.check.kind;
    if (act.id === "survey") {
      knowledge.survey(s, Boolean(roll?.passed));
      text = guidance.sign(maps.of(s), s.node);
      if (roll) text += roll.passed ? " 이어지는 길도 지도에 기록했습니다." : " 가까운 표지만 읽었습니다. 눈앞의 대피로는 이용할 수 있습니다.";
    } else if (act.to) {
      knowledge.arrive(s, s.node, act.to);
      s.protection = "";
      s.node = act.to;
      s.visited.push(s.node);
      text = (s.guidance === "escorted" ? "구조대와 함께 " : "") + response.currentPlace(s) + "에 도착했습니다.";
    } else if (act.id === "cover") text = "몸을 보호한 채 기다렸습니다. 지금은 흔들림이 잦아들었습니다.";
    else if (act.id === "protect") {
      s.protection = shelter[0];
      text = { home: "현관문과 창문을 닫고 관리실 방송을 들었습니다.", refuge: "발코니 대피공간에 들어가 방화문을 닫았습니다.", room: "불에서 먼 방으로 옮겨 문을 닫고 문틈을 막았습니다.", high: "물길과 급경사지에서 떨어진 높은 쉼터에 자리를 잡았습니다." }[s.protection];
    } else if (act.id === "report") {
      const details = response.reportDetails(s);
      s.reportAt = response.reportKey(s);
      text = "119 신고 연습에서 위치와 상황을 전달했습니다. " + details.where + " · " + details.who;
    } else if (act.id === "monitor" || act.id === "wait") {
      s.guidance = "advised";
      text = act.id === "monitor" ? "우리 층에 대피 지시가 나왔습니다. 방송에서 지정한 계단을 지도에 표시했습니다." : "119가 현장팀의 회신을 전했습니다. 통행이 확인된 대체 경로를 지도에 표시했습니다.";
    } else if (act.id === "rescue-check") {
      s.guidance = roll.passed ? "escorted" : "delayed";
      text = roll.passed ? "구조대원이 신고한 자리까지 와서 함께 이동할 길을 알려줍니다." : "구조대의 접근이 지연됐다는 답을 받았습니다. 현재 위치는 접수돼 있습니다.";
    } else if (act.id === "settle") {
      s.status = s.guidance === "escorted" ? "rescued" : "escaped";
      kind = "win";
      text = response.situation(s).text;
    }
    const next = response.guidedExit(s);
    if (next) knowledge.revealRoute(s, s.node, next);
    const entry = { turn: s.elapsed, title: act.title, text, kind,
      event: !previousSignal && response.shaking(s) ? "다시 흔들립니다. 현재 위치에서 몸을 보호하세요." : "" };
    if (roll) entry.roll = roll;
    s.steps.push(roll ? { id: act.id, face } : act.id);
    s.log.push(entry);
  }
  function advance(s, id, random = Math.random) {
    const act = available(s, id);
    if (!act) return false;
    apply(s, act, act.check ? Math.floor(random() * 6) + 1 : null);
    return true;
  }

  function migrate(id, saved) {
    const old = globalThis.DisasterFieldV4.restore(id, saved);
    if (!old) return null;
    const s = newRun(id, old.seed, old.venue, old.settings);
    s.previous = globalThis.DisasterFieldV4.snapshot(old);
    s.node = old.node;
    s.visited = old.visited.slice();
    s.elapsed = old.elapsed;
    s.status = old.status;
    s.archived = old.status !== "playing";
    s.known.areas = [...new Set([...old.known.areas, ...s.visited])];
    s.known.routes = old.known.routes.slice();
    for (let i = 1; i < s.visited.length; i++) {
      const from = s.visited[i - 1], to = s.visited[i];
      if (maps.of(s).ways.some(pair => pair.includes(from) && pair.includes(to)) || (from === "last" && to === "safe")) knowledge.arrive(s, from, to);
    }
    s.log = [{ turn: s.elapsed, title: "이전 기록 불러오기", kind: "history",
      text: (s.archived ? "이전 판의 종료 기록" : "이전 판의 진행 위치와 확인한 지도") + "을 불러왔습니다." }];
    return s;
  }
  function snapshot(s) {
    return { version: 6, id: s.id, seed: s.seed, venue: s.venue, settings: { ...s.settings }, opening: s.opening, previous: s.previous, steps: s.steps.slice() };
  }
  function resumeV5Wait(s, act) {
    // The earlier wait did not roll for access or confirm an exit. Preserve that turn as played.
    s.previous = { version: 5, id: s.id, seed: s.seed, venue: s.venue, settings: { ...s.settings },
      previous: s.previous, steps: [...s.steps, act.id] };
    s.steps = [];
    s.elapsed += act.turns;
    const text = act.id === "monitor" ? "집 안에서 연기 유입을 살피며 대피 방송을 기다렸습니다." : "119에 알린 위치에서 구조 소식을 기다렸습니다.";
    s.log.push({ turn: s.elapsed, title: "이전 기록 · 대기", text, kind: "history", event: "" });
    return s;
  }
  function restore(id, saved) {
    if (!Object.hasOwn(globalThis.DisasterScenarios, id) || !saved) return null;
    if ([1, 2, 3, 4].includes(saved.version)) return migrate(id, saved);
    if (![5, 6].includes(saved.version) || saved.id !== id || !Object.hasOwn(maps.venues, saved.venue) || !maps.validSettings(saved.settings) ||
      !Number.isInteger(saved.seed) || saved.seed < 0 || saved.seed >= maxSeed || !Array.isArray(saved.steps) || saved.steps.length > 256) return null;
    const v5 = saved.version === 5;
    if (saved.previous && !(saved.previous.version === 4 || (!v5 && saved.previous.version === 5))) return null;
    const opening = v5 ? "auto" : saved.opening;
    if (opening !== "auto" && !(id === "fire" && saved.venue === "home" && ["evacuate", "stay", "blocked"].includes(opening))) return null;
    const s = saved.previous ? restore(id, saved.previous) : newRun(id, saved.seed, saved.venue, saved.settings, opening);
    if (!s || s.seed !== saved.seed || s.venue !== saved.venue || s.opening !== opening || !maps.sameSettings(s.settings, saved.settings)) return null;
    if (saved.previous?.version === 5 && s.previous?.version !== 5) return null;
    for (const [index, step] of saved.steps.entries()) {
      const recorded = typeof step === "object" && step !== null;
      const act = available(s, recorded ? step.id : step);
      if (!act || Boolean(act.check) !== recorded || (recorded && (!Number.isInteger(step.face) || step.face < 1 || step.face > 6))) return null;
      if (v5 && (act.id === "rescue-check" || act.id === "settle")) return null;
      if (v5 && (act.id === "monitor" || act.id === "wait")) return index === saved.steps.length - 1 ? resumeV5Wait(s, act) : null;
      apply(s, act, recorded ? step.face : null);
      if (v5) {
        const finishedAtDestination = s.node === "safe" && (id !== "fire" || act.id === "report");
        if (finishedAtDestination && index !== saved.steps.length - 1) return null;
        if (finishedAtDestination) apply(s, available(s, "settle"), null);
      }
    }
    return s;
  }
  globalThis.DisasterGame = { ...response, newRun, choices, advance, snapshot, restore };
})();
