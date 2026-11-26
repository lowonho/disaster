(() => {
  "use strict";
  const scenarios = globalThis.DisasterScenarios;
  const game = globalThis.DisasterGame;
  const maps = globalThis.DisasterMaps;
  const difficulty = globalThis.DisasterDifficulty;
  const art = globalThis.DisasterArt;
  const { byId, element, rollSummary, button: makeButton, progress } = globalThis.DisasterUI;
  const storage = globalThis.DisasterStorage;
  const field = globalThis.DisasterField;
  const map = globalThis.DisasterMap;
  const startMenu = globalThis.DisasterStartMenu, saveDialog = globalThis.DisasterSaveDialog;
  const ids = Object.keys(scenarios);
  let audioContext;
  let state = null;
  let soundOn = storage.readPref("sound") === true;
  let diceMotion = storage.readPref("diceMotion") !== false;
  let view = "field";
  let selectedArea = null;
  const dialog = byId("dialog");

  function tone(type) {
    if (!soundOn) return;
    try {
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return;
      audioContext ||= new Context();
      if (audioContext.state === "suspended") audioContext.resume().catch(() => {});
      const notes = type === "win" ? [392, 523, 659] : type === "loss" ? [220, 165] : [type === "blocked" ? 235 : 510];
      const start = audioContext.currentTime;
      notes.forEach((frequency, i) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const at = start + i * 0.105;
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(frequency, at);
        gain.gain.setValueAtTime(0.0001, at);
        gain.gain.exponentialRampToValueAtTime(0.055, at + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
        oscillator.start(at);
        oscillator.stop(at + 0.17);
      });
    } catch { /* Audio is optional on browsers that restrict playback. */ }
  }

  function updateSound() {
    const button = byId("sound");
    button.setAttribute("aria-pressed", String(soundOn));
    button.title = soundOn ? "효과음 끄기" : "효과음 켜기";
    button.replaceChildren(art.icon(soundOn ? "sound" : "muted"));
    if (byId("option-sound")) byId("option-sound").checked = soundOn;
  }
  function setSound(enabled) {
    soundOn = enabled;
    storage.writePref("sound", soundOn);
    updateSound();
    tone("action");
  }

  function updateScenario(scenario, shot, hazardCost) {
    document.body.dataset.scenario = scenario.id;
    document.body.dataset.venue = state.venue;
    document.querySelectorAll("[data-scenario-id]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.scenarioId === scenario.id));
    });
    document.querySelectorAll("button[data-venue]").forEach(button => {
      const venue = button.dataset.venue;
      const selected = venue === state.venue;
      button.setAttribute("aria-pressed", String(selected));
      const settings = selected ? state.settings : storage.displaySettings(state.id, venue);
      button.querySelector("span").textContent = maps.get(state.id, venue).venueLabel || maps.venues[venue].name;
      button.querySelector("small").textContent = difficulty.level(settings);
    });
    byId("scenario-title").textContent = scenario.title;
    byId("scenario-title").title = scenario.setting;
    byId("current-place").textContent = game.currentPlace(state);
    const image = byId("scene-image");
    if (image.getAttribute("src") !== shot.src) {
      image.alt = shot.alt;
      image.src = shot.src;
    }
    const weather = game.shaking(state) ? 0.8 : hazardCost / 4;
    byId("scene-view").style.setProperty("--weather-strength", state.status === "playing" ? weather : 0);
    const alert = shot.highWater ? "수위 상승" : scenario.alert;
    byId("alert-label").textContent = state.status === "playing" ? alert : game.statusLabel(state);
    const badgeIcon = byId("alert-label").previousElementSibling;
    badgeIcon.dataset.icon = state.status === "playing" ? "alert" : "check";
    art.paint(badgeIcon);
    const turn = state.elapsed + (state.status === "playing" ? 1 : 0);
    byId("turn-number").textContent = String(turn).padStart(2, "0");
    byId("turn-counter").setAttribute("aria-label", (state.status === "playing" ? "현재 " : "총 ") + turn + "턴");
    byId("goal-label").textContent = state.status === "playing" ? "현재 목표" : "마지막 위치";
    byId("objective").textContent = game.objective(state);
    byId("stage-count").textContent = state.known.areas.length;
    byId("map-origin").textContent = "출발 정보 · " + difficulty.summary(state.settings);
  }

  function updateBriefing(scenario, shot, animateRoll) {
    const scene = game.situation(state);
    const title = byId("scene-title");
    title.textContent = scene.title;
    title.hidden = scene.title === scenario.nodes[state.node].place;
    const detail = state.status === "playing" && !state.protection && !game.stranded(state) ? shot.observation : "";
    byId("scene-description").textContent = [scene.text, detail].filter(Boolean).join(" ");
    const last = state.log.at(-1);
    const feedback = byId("feedback");
    feedback.hidden = last.kind === "start" || state.status !== "playing";
    feedback.replaceChildren();
    if (feedback.hidden) return;
    feedback.classList.toggle("is-event", Boolean(last.event || last.kind === "blocked"));
    const content = element("span", "feedback-copy");
    if (last.roll) {
      feedback.dataset.verdict = last.roll.passed ? "pass" : "miss";
      content.append(element("strong", "roll-summary", rollSummary(last.roll)));
      feedback.append(art.die(last.roll.face, animateRoll && diceMotion));
    } else {
      delete feedback.dataset.verdict;
      feedback.append(art.icon("log"));
    }
    content.append(element("span", "", [last.text, last.event].filter(Boolean).join(" ")));
    feedback.append(content);
  }

  function updateStatus() {
    byId("scene-signal").textContent = game.situation(state).title;
    byId("report-state").textContent = game.reportStatus(state);
    const live = state.status === "playing", label = byId("status-label");
    label.dataset.level = live ? "warn" : "normal";
    label.textContent = game.statusLabel(state);
    const text = state.archived ? "이전 규칙으로 진행한 판입니다." : state.id === "fire" ? "연기 유입과 대피 방송을 확인하세요." :
      state.id === "quake" ? "진동이 다시 느껴지면 현재 위치에서 몸을 보호하세요." : "물살이 가로막는 길로 들어가지 마세요.";
    byId("hazard-note").replaceChildren(art.icon("alert"), document.createTextNode(text));
  }

  function actions(scenario) {
    const live = state.status === "playing";
    byId("choices-title").querySelector("span").textContent = live ? "현장 행동" : "대피 결산";
    byId("choice-note").hidden = !live;
    field.render(state, view);
    const outcome = byId("outcome");
    outcome.replaceChildren();
    outcome.hidden = live;
    if (live) return;
    const stats = element("div", "outcome-stats");
    for (const [label, value] of [["경과", state.elapsed + "턴"], ["마지막 위치", game.currentPlace(state)], ["대응 결과", game.statusLabel(state)]]) {
      const cell = element("span", "", label);
      cell.append(element("strong", "", String(value)));
      stats.append(cell);
    }
    outcome.append(stats);
    if (state.visited.length > 1) outcome.append(element("p", "", state.visited.map(key => scenario.nodes[key].place).join(" → ")));
    outcome.append(field.guide(scenario));
    const controls = element("div", "button-row");
    const nextId = ids[(ids.indexOf(state.id) + 1) % ids.length];
    controls.append(makeButton("다시 도전", "primary-button", restartRun, "restart"),
      makeButton(scenarios[nextId].short + " 시나리오", "secondary-button", () => switchScenario(nextId), scenarios[nextId].icon));
    outcome.append(controls);
  }

  function turnLabel(entry) {
    return entry.kind === "start" ? "시작" : String(entry.turn).padStart(2, "0") + "턴";
  }

  function recentLog() {
    const list = byId("recent-log");
    list.replaceChildren();
    state.log.slice(-2).reverse().forEach(entry => {
      const item = element("li");
      const message = element("p");
      if (entry.roll) message.append(element("span", "log-roll", rollSummary(entry.roll)));
      message.append(document.createTextNode(entry.text));
      item.append(element("span", "log-turn", turnLabel(entry)), message);
      list.append(item);
    });
  }

  function render(animateRoll = false) {
    const scenario = maps.of(state);
    const hazardCost = game.hazardCost(state);
    const shot = globalThis.DisasterScenes.at(scenario, state.node, hazardCost, state.protection);
    updateScenario(scenario, shot, hazardCost);
    updateBriefing(scenario, shot, animateRoll);
    updateStatus();
    actions(scenario);
    map.render(state, selectedArea);
    recentLog();
    byId("save-status").querySelector("span").textContent = storage.canSave() ? "이 기기에 자동 저장" : "현재 창에서 진행 중 · 저장소 사용 불가";
  }

  function showReport(fromMap) {
    const expected = state;
    const details = game.reportDetails(state);
    const list = element("dl", "report-fields");
    for (const [name, value] of [["현재 위치", details.where], ["어떤 상황인지", details.what], ["인원과 상태", details.who]]) {
      list.append(element("dt", "", name), element("dd", "", value));
    }
    const buttons = element("div", "button-row");
    buttons.append(makeButton("상황 전달", "primary-button", () => {
      dialog.close();
      if (state === expected) takeAction("report", fromMap, true);
    }, "phone"), makeButton("취소", "secondary-button", () => dialog.close()));
    showDialog("119 신고 연습", element("p", "dialog-copy", "게임 속 휴대전화입니다. 신고할 위치와 인원, 현재 상황을 확인하세요."), list, buttons);
  }

  function takeAction(id, fromMap = false, confirmed = false) {
    if (!state || dialog.open) return;
    if (id === "report" && !confirmed) { showReport(fromMap); return; }
    const mobile = window.matchMedia("(max-width: 799px)").matches;
    const previousNode = state.node;
    if (!game.advance(state, id)) return;
    const last = state.log.at(-1);
    view = "field";
    selectedArea = state.node;
    saveActive();
    render(Boolean(last.roll));
    tone(last.kind);
    byId("announcement").textContent = [last.title, last.roll && rollSummary(last.roll), last.text, last.event, game.situation(state).title].filter(Boolean).join(". ");
    if (state.node !== previousNode) {
      const panel = byId("scene-panel");
      panel.focus({ preventScroll: true });
      const top = panel.getBoundingClientRect().top;
      if (top < 0 || top >= window.innerHeight) panel.scrollIntoView({ block: "start", behavior: "instant" });
      return;
    }
    const next = Array.from(byId("actions").children).find(button => button.dataset.action === id && !button.disabled);
    (next || byId("choices-title")).focus({ preventScroll: true });
    if (fromMap && mobile) byId("choices-title").scrollIntoView({ block: "start" });
  }

  function saveActive() {
    storage.save(state);
    storage.writePref("active", state.id);
    storage.writePref("venue." + state.id, state.venue);
  }

  function enterRun(run) {
    if (dialog.open) dialog.close();
    state = run;
    view = "field";
    selectedArea = state.node;
    saveActive();
    byId("title-screen").hidden = true;
    byId("game-screen").hidden = false;
    byId("game-menu").hidden = false;
    byId("export-status").textContent = "";
    render();
    tone("action");
    byId("announcement").textContent = maps.of(state).title + ". " + game.situation(state).title;
    window.scrollTo({ top: 0, behavior: "instant" });
    byId("scene-panel").focus({ preventScroll: true });
  }

  function showTitle(focus = true) {
    if (dialog.open) dialog.close();
    state = null;
    selectedArea = null;
    document.body.dataset.scenario = "fire";
    delete document.body.dataset.venue;
    byId("game-screen").hidden = true;
    byId("game-menu").hidden = true;
    byId("title-screen").hidden = false;
    startMenu.refresh();
    if (focus) {
      window.scrollTo({ top: 0, behavior: "instant" });
      byId("play-buttons").firstElementChild.focus({ preventScroll: true });
    }
  }

  function openSetup(id, venue) {
    startMenu.showSetup(id, venue, showDialog, (disaster, place, settings) => {
      storage.setSettings(disaster, place, settings);
      enterRun(game.newRun(disaster, undefined, place, settings));
    }, enterRun);
  }

  function switchScenario(id, venue) {
    if (!state || !ids.includes(id)) return;
    venue ||= storage.venueFor(id, state.venue);
    if (!Object.hasOwn(maps.venues, venue) || (id === state.id && venue === state.venue)) return;
    const existing = storage.find(id, venue);
    if (existing) enterRun(existing);
    else openSetup(id, venue);
  }

  function restartRun() {
    enterRun(game.newRun(state.id, undefined, state.venue, storage.settingsFor(state.id, state.venue)));
  }

  function showDialog(title, ...contents) {
    byId("dialog-title").textContent = title;
    byId("dialog-content").replaceChildren(...contents);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    byId("close-dialog").focus({ preventScroll: true });
  }

  function showPreferences(done) {
    const options = element("div", "preference-list");
    function toggle(id, title, detail, value, change) {
      const label = element("label", "preference-row"), copy = element("span", "record-info");
      const input = element("input");
      input.type = "checkbox";
      input.id = id;
      input.checked = value;
      input.addEventListener("change", () => change(input.checked));
      copy.append(element("strong", "", title), element("small", "", detail));
      label.append(copy, input);
      options.append(label);
    }
    toggle("option-sound", "효과음", "행동과 판정 결과를 소리로 알립니다.", soundOn, setSound);
    toggle("option-motion", "빠른 주사위 모션", "0.15초 동안 굴립니다. 끄면 최종 눈을 바로 표시합니다.", diceMotion, enabled => {
      diceMotion = enabled;
      storage.writePref("diceMotion", enabled);
    });
    const row = element("div", "button-row");
    row.append(makeButton("완료", "primary-button", done));
    showDialog("환경 설정", options, row);
  }

  function showGameMenu() {
    if (!state) return;
    const info = element("p", "pause-info", maps.of(state).title + " · " + progress(state));
    const list = element("div", "session-actions"), status = element("p", "menu-status");
    status.setAttribute("role", "status");
    list.append(
      makeButton("세이브 파일 저장", "secondary-button", () => saveDialog.download(state, status), "save"),
      makeButton("세이브 파일 불러오기", "secondary-button", () => saveDialog.showLoad(showDialog, enterRun), "folder"),
      makeButton("환경 설정", "secondary-button", () => showPreferences(showGameMenu), "settings"),
      makeButton("시작 화면으로", "secondary-button", () => showTitle(), "menu")
    );
    const back = makeButton(state.status === "playing" ? "계속 플레이" : "결과로 돌아가기", "primary-button", () => dialog.close(), "play");
    showDialog("게임 메뉴", info, list, status, back);
  }

  function help() {
    const rules = element("ul", "help-rules");
    for (const text of [
      "현재 위치의 연기, 물살, 흔들림과 안내 방송을 읽고 행동을 고르세요. 지도를 보거나 선택지를 읽는 동안에는 턴이 지나지 않습니다.",
      "대피, 몸 보호, 고립 신고는 선택하면 실행됩니다. ‘눈앞의 대피 표지 읽기’에서만 주사위를 굴려 추가로 읽어 낸 길을 지도에 기록합니다.",
      "집에서는 지도를 기억하고, 직장에서는 일부를 기억합니다. 낯선 여행지는 현재 위치에서 시작합니다. 게임 시작과 난이도 설정에서 지도와 표지 단서를 조정할 수 있습니다.",
      "문을 닫고 실내에서 방송을 듣거나 고립 위치를 신고하고 구조를 기다리는 것도 상황에 맞는 훈련 결과입니다. 여기에 나오는 주소와 119 신고는 게임 속 상황입니다.",
      "게임은 장소별로 자동 저장됩니다. 메뉴에서 현재 판을 파일로 저장하거나 불러올 수 있습니다. 숫자 키로 화면의 행동 카드를 선택할 수 있습니다."
    ]) rules.append(element("li", "", text));
    const refs = element("details", "help-detail");
    refs.append(element("summary", "", "재난별 행동요령과 출처"));
    for (const [id, venue] of [["fire", "home"], ["fire", "work"], ["flood", "home"], ["flood", "travel"], ["quake", "work"]]) refs.append(field.guide(maps.get(id, venue)));
    showDialog("플레이 방법", rules, refs);
  }

  function fullLog() {
    const list = element("ol", "full-log");
    for (const entry of state.log) {
      const item = element("li");
      item.append(element("span", "log-turn", turnLabel(entry)), element("strong", "", entry.title), element("p", "", entry.text));
      if (entry.roll) item.append(element("p", "log-roll", rollSummary(entry.roll)));
      if (entry.event) item.append(element("p", "event-line", entry.event));
      list.append(item);
    }
    showDialog(maps.of(state).title + " 행동 기록", list);
  }

  function confirmRestart() {
    const next = storage.settingsFor(state.id, state.venue);
    const copy = element("p", "dialog-copy", maps.of(state).title + "의 현재 진행을 지우고 첫 턴부터 시작합니다. 다음 판의 출발 정보는 ‘" + difficulty.summary(next) + "’입니다.");
    const controls = element("div", "button-row");
    controls.append(makeButton("다시 시작", "primary-button", restartRun, "restart"), makeButton("취소", "secondary-button", () => dialog.close()));
    showDialog("처음부터 시작할까요?", copy, controls);
  }

  document.querySelectorAll("i[data-icon]").forEach(art.paint);
  byId("new-game").addEventListener("click", () => {
    const recent = storage.readPref("active");
    const id = ids.includes(recent) ? recent : "fire";
    openSetup(id, storage.venueFor(id));
  });
  byId("continue-game").addEventListener("click", () => startMenu.showRecords(showDialog, enterRun));
  byId("title-load").addEventListener("click", () => saveDialog.showLoad(showDialog, enterRun));
  byId("title-settings").addEventListener("click", () => showPreferences(() => dialog.close()));
  byId("game-menu").addEventListener("click", showGameMenu);
  byId("quick-save").addEventListener("click", () => saveDialog.download(state, byId("export-status")));
  document.querySelectorAll("[data-scenario-id]").forEach(button => button.addEventListener("click", () => switchScenario(button.dataset.scenarioId)));
  document.querySelectorAll("button[data-venue]").forEach(button => button.addEventListener("click", () => switchScenario(state.id, button.dataset.venue)));
  byId("difficulty").addEventListener("click", () => difficulty.show(state, showDialog, restartRun));
  byId("field-tabs").addEventListener("click", event => {
    const tab = event.target.closest("button[data-view]");
    if (!tab) return;
    view = tab.dataset.view;
    field.render(state, view);
  });
  byId("map-points").addEventListener("click", event => {
    const point = event.target.closest("button[data-point]");
    if (!point) return;
    selectedArea = point.dataset.point;
    map.render(state, selectedArea);
  });
  document.querySelector(".play-grid").addEventListener("click", event => {
    const button = event.target.closest("button[data-action]");
    if (button && !button.disabled) takeAction(button.dataset.action, Boolean(button.closest("#map-detail")));
  });
  byId("sound").addEventListener("click", () => setSound(!soundOn));
  byId("restart").addEventListener("click", confirmRestart);
  byId("help").addEventListener("click", help);
  byId("show-log").addEventListener("click", fullLog);
  byId("close-dialog").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  document.addEventListener("keydown", event => {
    if (!state || dialog.open || event.repeat || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || !/^[1-9]$/.test(event.key)) return;
    const button = byId("actions").children[Number(event.key) - 1];
    if (!button || button.disabled) return;
    event.preventDefault();
    takeAction(button.dataset.action);
  });
  storage.sync((id, venue) => {
    if (!state) { startMenu.refresh(); return; }
    if (id !== state.id || venue !== state.venue) return;
    state = storage.find(id, venue);
    if (!state) { showTitle(); return; }
    view = "field";
    selectedArea = state.node;
    render();
  }, () => {
    soundOn = storage.readPref("sound") === true;
    diceMotion = storage.readPref("diceMotion") !== false;
    updateSound();
    if (byId("option-motion")) byId("option-motion").checked = diceMotion;
  });
  function redrawMap() { if (state) map.draw(state); }
  if ("ResizeObserver" in window) new ResizeObserver(redrawMap).observe(byId("route-map"));
  else window.addEventListener("resize", redrawMap);
  updateSound();
  showTitle(false);
})();
