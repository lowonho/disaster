(() => {
  "use strict";
  const scenarios = globalThis.DisasterLegacyScenarios;
  const limit = value => Math.max(0, Math.min(100, value));
  const stages = { start: 1, a: 2, b: 2, mid: 3, last: 4, safe: 5 };
  const unscoutedGate = { target: 4 };

  function newRun(id, open = Math.random() < 0.5 ? "a" : "b") {
    const scenario = scenarios[id];
    return {
      id, open, node: "start", elapsed: 0, hp: 100, exposure: scenario.initialExposure,
      scouted: false, reported: false, status: "playing", visited: ["start"], steps: [], legacyTurns: 0,
      log: [{ turn: 0, title: "대피 시작", text: scenario.opening, kind: "start" }]
    };
  }

  function shaking(state) {
    return state.id === "quake" && state.status === "playing" && state.elapsed % 4 === 0;
  }

  function extraExposure(state) {
    if (state.id === "fire") return state.elapsed >= 4 ? 3 : 0;
    if (state.id === "flood") return 2 * Math.min(3, Math.floor(state.elapsed / 2));
    return 0;
  }

  function notice(state) {
    if (state.status !== "playing") return { icon: "flag", text: "시뮬레이션 종료" };
    if (state.id === "fire") {
      return state.elapsed < 4
        ? { icon: "clock", text: "정문 통제까지 " + (4 - state.elapsed) + "턴" }
        : { icon: "lock", text: "정문 통제 중 · 행동당 추가 노출 +3" };
    }
    if (state.id === "flood") {
      const rise = extraExposure(state);
      if (state.elapsed >= 6) return { icon: "water", text: "최고 수위 · 행동당 추가 노출 +6" };
      return { icon: "water", text: "수위 상승까지 " + (2 - state.elapsed % 2) + "턴" + (rise ? " · 추가 노출 +" + rise : "") };
    }
    return shaking(state)
      ? { icon: "quake", text: (state.elapsed ? "여진" : "첫 진동") + " 진행 중 · 이동 일시 중단" }
      : { icon: "clock", text: "다음 여진까지 " + (4 - state.elapsed % 4) + "턴" };
  }

  function eventAfter(state) {
    if (state.status !== "playing") return "";
    if (state.id === "fire" && state.elapsed === 4) return "정문 통제 방송이 울렸다. 이제 행동할 때 연기 노출이 3씩 더 오른다.";
    if (state.id === "flood" && state.elapsed <= 6 && state.elapsed % 2 === 0) {
      const closure = state.elapsed === 4 ? " 복지관 정문 길이 통제됐다." : "";
      return "수위가 올랐다. 행동당 추가 노출 +" + extraExposure(state) + "." + closure;
    }
    if (shaking(state)) return "여진이 시작됐다. 이번 턴에는 현재 위치에서 몸을 보호해야 한다.";
    return "";
  }

  function coverChoices(node) {
    return [
      { id: "cover", title: node.coverTitle, description: node.cover, icon: "shield", hp: 0, exposure: 2,
        result: "몸을 보호한 채 진동이 잦아들기를 기다렸다. 다시 이동할 수 있다." },
      { id: "signal", title: "주변에도 신호 보내기", description: "몸을 보호하고 곁사람과 대피 일행을 맺는다.", icon: "voice", hp: -4, exposure: 4, report: true,
        check: { target: 2, miss: "몸은 보호했지만 진동 소리에 신호가 묻혔다. 일행과 합류하기 전에 흔들림이 멎었다." },
        result: "몸을 보호하면서 곁에 있던 사람에게도 신호를 보냈다. 흔들림이 잦아들었다." }
    ];
  }

  function choices(state) {
    if (state.status !== "playing") return [];
    const node = scenarios[state.id].nodes[state.node];
    const options = shaking(state) ? coverChoices(node) : node.choices;
    return options.map(option => {
      const action = state.reported && option.guided ? { ...option, ...option.guided } : option;
      let unavailable = "";
      if (action.scan && state.scouted) unavailable = "확인 완료";
      if (action.gate && state.scouted && action.to !== state.open) unavailable = "통행 불가";
      if (action.report && state.reported) unavailable = "전달 완료";
      if (action.rest && state.hp === 100) unavailable = "체력 가득";
      if (action.closes && state.elapsed >= 4) unavailable = "입구 통제";
      const hp = Math.min(action.hp, 100 - state.hp);
      const exposure = action.exposure + extraExposure(state);
      const check = action.gate && !state.scouted ? unscoutedGate : action.check;
      return { ...action, hp, exposure, unavailable, check };
    });
  }

  function situation(state) {
    const scenario = scenarios[state.id];
    const node = scenario.nodes[state.node];
    if (state.status === "escaped") return { title: "탈출 성공", text: scenario.success };
    if (state.status === "exhausted") return { title: "체력이 바닥났다", text: "더 움직일 체력이 남아 있지 않다. 이번 대피는 " + node.place + "에서 중단됐다." };
    if (state.status === "exposed") return { title: "위험 노출 한계 도달", text: scenario.loss };
    if (shaking(state)) return {
      title: state.elapsed ? "다시 흔들리는 바닥" : "갑자기 흔들리는 열람실",
      text: state.elapsed ? "여진이 왔다. " + node.cover : node.tremor
    };
    return { title: node.title, text: node.text };
  }

  function availableAction(state, id) {
    return choices(state).find(action => action.id === id && !action.unavailable);
  }

  function applyAction(state, action, face) {
    const scenario = scenarios[state.id];
    const roll = face === null ? null : { face, target: action.check.target, passed: face >= action.check.target };
    const missed = roll && !roll.passed;
    // Surveying reveals the preset route. Trying an unseen door resolves the same
    // fork with this single die, so an independent obstruction cannot undo a success.
    if (action.gate && roll) {
      const other = action.to === "a" ? "b" : "a";
      state.open = roll.passed ? action.to : other;
      state.scouted = true;
    }
    const blocked = action.gate && action.to !== state.open;
    const previousHp = state.hp, previousExposure = state.exposure;
    state.steps.push(action.id);
    state.elapsed += 1;
    if (!missed) state.hp = limit(state.hp + action.hp);
    state.exposure = limit(state.exposure + action.exposure);
    if (action.scan || blocked) state.scouted = true;
    if (action.report && !missed) state.reported = true;
    let text = action.result;
    if (action.scan) text = scenario.cue[state.open];
    if (blocked) text = scenario.barrier;
    else if (missed) text = action.check.miss;
    let kind = blocked || missed ? "blocked" : "action";
    if (state.hp === 0 || state.exposure === 100) {
      state.status = state.hp === 0 ? "exhausted" : "exposed";
      text = state.status === "exhausted" ? "남은 체력을 모두 써서 더 이동할 수 없었다." : scenario.risk + " 수치가 100에 닿아 대피가 중단됐다.";
      kind = "loss";
    } else if (action.to && !blocked && !missed) {
      state.node = action.to;
      state.visited.push(action.to);
      if (action.to === "safe") {
        state.status = "escaped";
        kind = "win";
      }
    }
    const entry = { turn: state.elapsed, title: action.title, text, kind, hp: state.hp - previousHp, exposure: state.exposure - previousExposure, event: eventAfter(state) };
    if (roll) entry.roll = roll;
    if (state.status === "exhausted") entry.review = "‘" + action.title + "’ 행동 전 체력은 " + previousHp + ", 필요한 체력은 " + Math.abs(action.hp) + "였다.";
    if (state.status === "exposed") entry.review = "‘" + action.title + "’ 행동 전 노출은 " + previousExposure + ", 이 행동의 노출 비용은 +" + action.exposure + "였다.";
    state.log.push(entry);
  }

  function advance(state, actionId) {
    const action = availableAction(state, actionId);
    if (!action) return false;
    const face = action.check ? Math.floor(Math.random() * 6) + 1 : null;
    applyAction(state, action, face);
    return true;
  }

  function snapshot(state) {
    const steps = state.steps.map((id, index) => {
      const roll = state.log[index + 1].roll;
      return roll ? { id, face: roll.face } : id;
    });
    return { version: 2, open: state.open, legacyTurns: state.legacyTurns, steps };
  }

  // Keep the deterministic prefix from v1. Every later check replays its recorded face.
  function restore(id, saved) {
    if (!saved || ![1, 2].includes(saved.version) || !["a", "b"].includes(saved.open) || !Array.isArray(saved.steps) || saved.steps.length > 64) return null;
    const legacyTurns = saved.version === 1 ? saved.steps.length : saved.legacyTurns;
    if (!Number.isInteger(legacyTurns) || legacyTurns < 0 || legacyTurns > saved.steps.length) return null;
    const state = newRun(id, saved.open);
    state.legacyTurns = legacyTurns;
    for (const [index, step] of saved.steps.entries()) {
      const recorded = typeof step !== "string";
      const action = availableAction(state, recorded ? step?.id : step);
      if (!action || recorded !== (index >= legacyTurns && Boolean(action.check))) return null;
      if (recorded && (!Number.isInteger(step.face) || step.face < 1 || step.face > 6)) return null;
      applyAction(state, action, recorded ? step.face : null);
    }
    return state.open === saved.open ? state : null;
  }

  globalThis.DisasterLegacyGame = Object.freeze({ newRun, choices, advance, situation, notice, shaking, snapshot, restore, stages });
})();
