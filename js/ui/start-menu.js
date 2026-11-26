(() => {
  "use strict";
  const { byId, element, button, selectField, progress } = globalThis.DisasterUI;
  const storage = globalThis.DisasterStorage, maps = globalThis.DisasterMaps;
  const difficulty = globalThis.DisasterDifficulty, scenarios = globalThis.DisasterScenarios;

  function refresh() {
    const saved = storage.list(), first = saved[0];
    const resume = byId("continue-game"), start = byId("new-game");
    const playing = first?.status === "playing";
    byId("continue-label").textContent = first && !playing ? "결과 기록 보기" : "이어하기";
    let detail = "저장된 진행 없음";
    if (first) detail = maps.of(first).title + " · " + (first.elapsed + Number(playing)) + "턴" + (saved.length > 1 ? " 외 " + (saved.length - 1) + "개" : "");
    byId("continue-detail").textContent = detail;
    resume.disabled = !first;
    resume.classList.toggle("primary", playing === true);
    start.classList.toggle("primary", !playing);
    const top = playing ? resume : start;
    if (byId("play-buttons").firstElementChild !== top) byId("play-buttons").prepend(top);
  }

  function showRecords(showDialog, enter) {
    const records = storage.list();
    if (records.length === 1) { enter(records[0]); return; }
    const list = element("div", "record-list");
    for (const run of records) {
      const row = button("", "record-row", () => {
        const latest = storage.find(run.id, run.venue);
        if (latest) enter(latest);
        else showRecords(showDialog, enter);
      }, maps.of(run).icon);
      const info = element("span", "record-info");
      info.append(element("strong", "", maps.of(run).title), element("small", "", progress(run)));
      row.append(info, globalThis.DisasterArt.icon("next"));
      list.append(row);
    }
    if (!records.length) list.append(element("p", "dialog-copy", "이 기기에 저장된 진행이 없습니다."));
    showDialog("자동 저장 기록", list);
  }

  function showSetup(id, venue, showDialog, begin, enter) {
    const form = element("form", "setup-form");
    const scene = element("div", "setup-scene"), image = element("img"), title = element("strong");
    scene.append(image, title);
    const hazard = selectField(form, "재난", "scenario", Object.entries(scenarios).map(([key, data]) => [key, data.short]));
    const place = selectField(form, "장소", "venue", Object.entries(maps.venues).map(([key, data]) => [key, data.name]));
    const modes = Object.entries(maps.venues).map(([key, data]) => [key, data.level]);
    const mode = selectField(form, "난이도", "difficulty", [...modes, ["custom", "커스텀"]]);
    const summary = element("p", "setup-summary");
    const custom = element("div", "setup-custom");
    const choices = difficulty.addFields(custom, maps.venues[venue].settings);
    const notice = element("p", "slot-note");
    notice.setAttribute("role", "status");
    const actions = element("div", "button-row");
    const resume = button("기존 기록 열기", "secondary-button", () => {
      const latest = storage.find(hazard.value, place.value);
      if (latest) enter(latest);
      else updateSlot();
    });
    const submit = element("button", "primary-button");
    submit.type = "submit";
    actions.append(submit, resume);
    form.append(summary, custom, notice, actions);
    let seen;

    function updateSlot(changed = false) {
      const existing = storage.find(hazard.value, place.value);
      seen = storage.revision(existing);
      notice.hidden = !existing && !changed;
      resume.hidden = !existing;
      submit.textContent = existing ? "기록을 교체하고 시작" : "플레이 시작";
      const info = existing ? "이 맵의 자동 저장 · " + progress(existing) : "현재 이 맵에 저장된 기록이 없습니다.";
      notice.textContent = (changed ? "저장 상태가 바뀌었습니다. " : "") + info;
    }
    function updateMode() {
      const preset = maps.venues[mode.value];
      custom.hidden = Boolean(preset);
      summary.hidden = !preset;
      if (preset) {
        for (const key of Object.keys(choices)) choices[key].value = preset.settings[key];
        summary.textContent = difficulty.summary(preset.settings);
      }
    }
    function updateMap() {
      const map = maps.get(hazard.value, place.value);
      title.textContent = map.title;
      const shot = globalThis.DisasterScenes.at(map, "start");
      image.alt = shot.alt;
      image.src = shot.src;
      for (const option of place.options) {
        const venueName = maps.venues[option.value].name;
        const site = maps.get(hazard.value, option.value).venueLabel;
        option.textContent = site ? venueName + " · " + site : venueName;
      }
      const next = storage.settingsFor(hazard.value, place.value);
      for (const option of mode.options) {
        if (maps.venues[option.value]) option.textContent = maps.venues[option.value].level + (option.value === place.value ? " · 장소 기본값" : "");
      }
      for (const key of Object.keys(choices)) choices[key].value = next[key];
      mode.value = difficulty.preset(next);
      updateMode();
      updateSlot();
    }
    hazard.value = id;
    place.value = venue;
    hazard.addEventListener("change", updateMap);
    place.addEventListener("change", updateMap);
    mode.addEventListener("change", updateMode);
    form.addEventListener("submit", event => {
      event.preventDefault();
      const latest = storage.find(hazard.value, place.value);
      if (storage.revision(latest) !== seen) { updateSlot(true); return; }
      begin(hazard.value, place.value, { layout: choices.layout.value, supplies: choices.supplies.value });
    });
    updateMap();
    showDialog("새 게임 설정", scene, form);
    hazard.focus({ preventScroll: true });
  }
  globalThis.DisasterStartMenu = { refresh, showSetup, showRecords };
})();
