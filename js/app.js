(() => {
  "use strict";
  const scenarios = globalThis.DisasterScenarios;
  const game = globalThis.DisasterGame;
  const maps = globalThis.DisasterMaps, knowledge = globalThis.DisasterKnowledge;
  const difficulty = globalThis.DisasterDifficulty;
  const art = globalThis.DisasterArt;
  const { byId, element, signed, rollSummary, button: makeButton, progress } = globalThis.DisasterUI;
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

  function updateScenario(scenario) {
    document.body.dataset.scenario = scenario.id;
    document.body.dataset.venue = state.venue;
    document.querySelectorAll("[data-scenario-id]").forEach(button => {
      button.setAttribute("aria-pressed", String(button.dataset.scenarioId === scenario.id));
    });
    document.querySelectorAll("[data-art]").forEach(image => {
      image.hidden = image.dataset.art !== scenario.id;
      image.alt = image.hidden ? "" : scenario.alt;
    });
    document.querySelectorAll("button[data-venue]").forEach(button => {
      const selected = button.dataset.venue === state.venue;
      button.setAttribute("aria-pressed", String(selected));
      const settings = selected ? state.settings : storage.displaySettings(state.id, button.dataset.venue);
      button.querySelector("small").textContent = difficulty.level(settings);
    });
    byId("setting").textContent = scenario.setting;
    byId("scenario-title").textContent = scenario.title;
    byId("alert-label").textContent = state.status === "playing" ? scenario.alert : state.status === "escaped" ? "대피 완료" : "대피 종료";
    const badgeIcon = byId("alert-label").previousElementSibling;
    badgeIcon.dataset.icon = state.status === "escaped" ? "check" : "alert";
    art.paint(badgeIcon);
    const turn = state.elapsed + (state.status === "playing" ? 1 : 0);
    byId("turn-number").textContent = String(turn).padStart(2, "0");
    byId("turn-counter").setAttribute("aria-label", (state.status === "playing" ? "현재 " : "총 ") + turn + "턴");
    byId("goal-label").textContent = state.status === "escaped" ? "도착 지점" : "탈출 목표";
    byId("objective").textContent = state.status === "escaped" ? scenario.goal : knowledge.objective(state);
    byId("stage-count").textContent = state.known.areas.length;
    byId("map-origin").textContent = "출발 정보 · " + difficulty.summary(state.settings);
  }

  function updateBriefing(scenario, animateRoll) {
    const scene = game.situation(state);
    byId("scene-label").textContent = state.status === "playing" ? "현장 상황" : "대피 결과";
    const place = byId("current-place");
    place.textContent = scenario.nodes[state.node].place;
    place.hidden = scene.title === place.textContent;
    byId("scene-title").textContent = scene.title;
    byId("scene-description").textContent = scene.text;
    const last = state.log.at(-1);
    const feedback = byId("feedback");
    feedback.hidden = !last.turn || (state.status !== "playing" && !last.roll);
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

  function meters(scenario) {
    byId("risk-label").textContent = scenario.risk;
    for (const [key, value] of [["hp", state.hp], ["risk", state.exposure]]) {
      byId(key + "-number").textContent = value;
      const meter = byId(key + "-meter");
      meter.setAttribute("aria-valuenow", value);
      meter.firstElementChild.style.width = value + "%";
    }
    byId("risk-meter").setAttribute("aria-label", scenario.risk);
    const danger = state.hp <= 25 || state.exposure >= 80;
    const warning = state.hp <= 55 || state.exposure >= 55;
    const status = byId("status-label");
    status.dataset.level = state.status === "escaped" ? "normal" : danger ? "danger" : warning ? "warn" : "normal";
    status.textContent = state.status === "escaped" ? "대피 완료" : state.status !== "playing" ? "대피 중단" : danger ? "위험" : warning ? "주의" : "양호";
    const notice = game.notice(state);
    byId("hazard-note").replaceChildren(art.icon(notice.icon), document.createTextNode(notice.text));
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
    for (const [label, value] of [["소요", state.elapsed + "턴"], ["남은 체력", state.hp], [scenario.risk, state.exposure]]) {
      const cell = element("span", "", label);
      cell.append(element("strong", "", String(value)));
      stats.append(cell);
    }
    outcome.append(stats);
    if (state.status !== "escaped") {
      const hint = state.status === "exhausted" ? "비상식량으로 체력을 회복하거나 무전 구조를 시도해 보자." : "무전기는 중간 교신 지점에서 탈출할 수 있고, 손전등은 출구에서 쓰는 노출을 줄여 준다.";
      outcome.append(element("p", "", [state.log.at(-1).review, hint].filter(Boolean).join(" · ")));
    }
    else {
      outcome.append(element("p", "", state.log.at(-1).text));
      outcome.append(element("p", "", state.visited.map(key => scenario.nodes[key].place).join(" → ")));
    }
    const controls = element("div", "button-row");
    const nextId = ids[(ids.indexOf(state.id) + 1) % ids.length];
    controls.append(makeButton("다시 도전", "primary-button", restartRun, "restart"),
      makeButton(scenarios[nextId].short + " 시나리오", "secondary-button", () => switchScenario(nextId), scenarios[nextId].icon));
    outcome.append(controls);
  }

  function turnLabel(entry) {
    return entry.turn ? String(entry.turn).padStart(2, "0") + "턴" : "시작";
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
    updateScenario(scenario);
    updateBriefing(scenario, animateRoll);
    meters(scenario);
    actions(scenario);
    map.render(state, selectedArea);
    recentLog();
    byId("save-status").querySelector("span").textContent = storage.canSave() ? "이 기기에 자동 저장" : "현재 창에서 진행 중 · 저장소 사용 불가";
  }

  function takeAction(id, fromMap = false) {
    if (!state || dialog.open) return;
    const mobile = window.matchMedia("(max-width: 799px)").matches;
    const searchTop = mobile && id === "search"
      ? byId("actions").querySelector('[data-action="search"]')?.getBoundingClientRect().top : undefined;
    if (!game.advance(state, id)) return;
    const last = state.log.at(-1);
    if (game.shaking(state)) view = "field";
    else if (game.turnsToClose(state, state.node) === 0) view = "travel";
    else if (id.startsWith("move:")) view = "field";
    selectedArea = state.node;
    saveActive();
    render(Boolean(last.roll));
    tone(last.kind);
    byId("announcement").textContent = [last.title, last.roll && rollSummary(last.roll), last.text, last.event, game.situation(state).title, "체력 " + state.hp, "노출 " + state.exposure].filter(Boolean).join(". ");
    const next = Array.from(byId("actions").children).find(button => button.dataset.action === id && !button.disabled);
    (next || byId("choices-title")).focus({ preventScroll: true });
    // Keep a repeatable search under the player's finger when the roll report changes height.
    if (next && searchTop >= 0 && searchTop < window.innerHeight) {
      window.scrollBy({ top: next.getBoundingClientRect().top - searchTop, behavior: "instant" });
    }
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
    byId("briefing").focus({ preventScroll: true });
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
    const intro = element("p", "dialog-copy", "지도에서 물자가 있는 지역을 고르고, 도보 탈출이나 무전 구조에 필요한 장비를 준비하세요. 메뉴와 지도를 살피는 동안에는 시간이 흐르지 않습니다.");
    const rules = element("ul", "help-rules");
    for (const text of [
      "체력이 0이 되거나 위험 노출이 100에 닿으면 대피가 중단됩니다. 카드 아래 수치로 행동의 대가를 확인하세요.",
      "주사위 표시가 있는 행동은 6면 주사위를 한 번 굴립니다. 눈이 목표 이상이면 성공합니다. 실패해도 한 턴이 지나고 표시된 만큼 노출이 늘어납니다. 체력 비용은 성공했을 때 적용됩니다.",
      "집은 전체 지도를 알고, 직장은 통로 하나와 랜드마크 하나를 기억합니다. 여행지는 현재 위치에서 시작합니다. ‘주변 살피기’에 한 턴을 쓰면 연결된 길과 현재 지역의 물자를 기록합니다. 모르는 길도 곧장 들어갈 수 있습니다.",
      "지역 이동에 표시된 이웃 지역은 다시 오갈 수 있습니다. 탐색에 성공하면 남은 물자 하나를 가방에 넣습니다. 실패하면 그곳에 단서가 남아 다음 탐색은 확정입니다.",
      "가방은 네 칸입니다. 건전지와 본체를 조립하면 손전등 또는 구조 무전기가 됩니다. 손전등을 들면 탐색과 도보 탈출이 확정되고, 무전기는 교신 지점에서 바로 구조를 요청할 수 있습니다. 물자는 0턴에 현재 지역에 내려둘 수 있습니다.",
      "경보에 표시된 턴이 지나면 해당 지역의 재진입과 탐색이 막힙니다. 안에 있다면 연결된 지역으로 빠져나갈 수 있습니다. 화재는 첫 통제 후 노출이 2 늘고, 홍수는 두 턴마다 최대 4까지 추가 노출이 오릅니다. 지진은 첫 턴과 이후 네 턴마다 몸을 보호해야 합니다.",
      "시작 화면의 ‘게임 시작’에서 재난·장소·난이도를 고릅니다. 게임 중 ‘난이도 설정’에서 다음 판의 지도와 물자 단서를 정할 수 있습니다. PC에서는 카드의 숫자 키로 행동을 선택할 수 있습니다.",
      "게임은 맵마다 자동 저장됩니다. ‘이어하기’로 기록을 열거나, 게임 메뉴에서 현재 판을 JSON 파일로 저장해 다른 브라우저에서 불러올 수 있습니다."
    ]) rules.append(element("li", "", text));
    const references = element("details", "help-detail");
    references.append(element("summary", "", "게임과 참고 자료"));
    const note = element("p", "dialog-copy", "체력·노출·턴 수는 게임 수치입니다. 상황 묘사에는 재난별 국민행동요령을 참고했습니다.");
    const links = element("div", "guide-links");
    for (const [name, url] of [
      ["화재 행동요령", "https://www.safekorea.go.kr/safekorea-kor/acts/nacts/action-guide.do?category=fires&menuSn=4"],
      ["호우 행동요령", "https://mois.go.kr/frt/bbs/type002/commonSelectBoardArticle.do?bbsId=BBSMSTR_000000000530&nttId=117736"],
      ["지진 행동요령", "https://www.isafe.go.kr/DATA/bbs/86/20241125023111026.pdf"],
      ["Survive 공식 소개", "https://www.thesurvivegame.com/"],
      ["블랙서바이벌 지역과 물자", "https://blacksurvival.fandom.com/wiki/Areas"]
    ]) {
      const link = element("a", "", name);
      link.href = url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      links.append(link);
    }
    references.append(note, links);
    showDialog("플레이 방법", intro, rules, references);
  }

  function fullLog() {
    const list = element("ol", "full-log");
    for (const entry of state.log) {
      const item = element("li");
      item.append(element("span", "log-turn", turnLabel(entry)), element("strong", "", entry.title), element("p", "", entry.text));
      if (entry.roll) item.append(element("p", "log-roll", rollSummary(entry.roll)));
      if (entry.turn) item.append(element("p", "", "체력 " + signed(entry.hp) + " · 노출 " + signed(entry.exposure)));
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
