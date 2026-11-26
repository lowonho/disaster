(() => {
  "use strict";
  const { element, selectField } = globalThis.DisasterUI;
  const maps = globalThis.DisasterMaps, storage = globalThis.DisasterStorage;
  const labels = {
    layout: { full: "전체 지도", partial: "통로 하나와 랜드마크", none: "현재 위치만" },
    supplies: { full: "확인한 지역의 대피 표지", partial: "표지 단서 한 곳", none: "표지 단서 없음" }
  };
  function summary(settings) { return labels.layout[settings.layout] + " · " + labels.supplies[settings.supplies]; }
  function preset(settings) {
    return Object.keys(maps.venues).find(key => maps.sameSettings(settings, maps.venues[key].settings)) || "custom";
  }
  function level(settings) { return maps.venues[preset(settings)]?.level || "커스텀"; }
  function addFields(parent, settings) {
    const controls = {};
    for (const [key, name] of [["layout", "시작 지도"], ["supplies", "시작 표지 단서"]]) {
      controls[key] = selectField(parent, name, key, Object.entries(labels[key]));
      controls[key].value = settings[key];
    }
    return controls;
  }
  function show(state, showDialog, restart) {
    const next = storage.settingsFor(state.id, state.venue);
    const intro = element("p", "dialog-copy", maps.of(state).title + "에서 출발할 때 알고 있는 정보를 정하세요.");
    const current = element("p", "difficulty-current", "현재 판 · " + summary(state.settings));
    const form = element("form", "difficulty-form");
    const controls = addFields(form, next);
    const reset = element("button", "text-button", "이 장소의 기본값 불러오기");
    reset.type = "button";
    const status = element("p", "difficulty-message");
    status.setAttribute("role", "status");
    const note = element("p", "dialog-copy", "‘다음 판에 저장’은 다음 도전부터 적용합니다. ‘새로 시작’은 이 맵의 진행 기록을 교체하고 첫 턴에서 시작합니다.");
    const row = element("div", "button-row");
    const later = element("button", "secondary-button", "다음 판에 저장");
    later.type = "button";
    const now = element("button", "primary-button", "이 설정으로 새로 시작");
    now.type = "submit";
    row.append(later, now);
    form.append(reset, note, row, status);
    form.addEventListener("change", () => { status.textContent = ""; });
    reset.addEventListener("click", () => {
      const defaults = maps.venues[state.venue].settings;
      for (const key of Object.keys(controls)) controls[key].value = defaults[key];
      status.textContent = "장소 기본값을 불러왔습니다. 저장하거나 새로 시작하면 적용됩니다.";
    });
    function save() {
      storage.setSettings(state.id, state.venue, { layout: controls.layout.value, supplies: controls.supplies.value });
    }
    later.addEventListener("click", () => {
      save();
      status.textContent = storage.canSave() ? "다음 판 설정을 저장했습니다. 이 맵의 ‘처음부터’를 누르면 적용됩니다." : "이 창에서 이 맵을 다시 시작하면 적용됩니다.";
    });
    form.addEventListener("submit", event => { event.preventDefault(); save(); restart(); });
    showDialog("맵 난이도 설정", intro, current, form);
  }
  globalThis.DisasterDifficulty = { show, summary, preset, level, addFields };
})();
