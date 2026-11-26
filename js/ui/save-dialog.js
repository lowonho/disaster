(() => {
  "use strict";
  const { byId, element, button, progress } = globalThis.DisasterUI;
  const files = globalThis.DisasterSaveFile, storage = globalThis.DisasterStorage;
  const maps = globalThis.DisasterMaps, difficulty = globalThis.DisasterDifficulty;

  function download(run, status) {
    try {
      const filename = files.download(run);
      status.textContent = "다운로드를 시작했습니다. " + filename;
    } catch {
      status.textContent = "세이브 파일을 다운로드하지 못했습니다. 다시 시도하세요.";
    }
  }

  function showLoad(showDialog, enter) {
    const form = element("form", "load-form");
    const picker = element("label", "file-picker");
    const input = element("input");
    input.type = "file";
    input.accept = ".json,application/json";
    picker.append(globalThis.DisasterArt.icon("folder"), document.createTextNode("JSON 세이브 파일 선택"), input);
    const name = element("p", "file-name");
    const preview = element("div", "file-preview");
    const conflict = element("p", "slot-note");
    const status = element("p", "menu-status");
    status.setAttribute("role", "status");
    const actions = element("div", "button-row");
    const submit = element("button", "primary-button", "불러오기");
    submit.type = "submit";
    const cancel = button("취소", "secondary-button", () => byId("dialog").close());
    const keep = button("기존 기록 파일로 저장", "text-button", () => {
      const existing = prepared && storage.find(prepared.run.id, prepared.run.venue);
      if (existing) download(existing, status);
    });
    actions.append(submit, cancel);
    form.append(picker, name, preview, conflict, keep, status, actions);
    let prepared = null, seen, readNumber = 0;

    function clearPreview() {
      prepared = null;
      preview.hidden = conflict.hidden = keep.hidden = true;
      preview.replaceChildren();
      submit.disabled = true;
      submit.textContent = "불러오기";
      status.textContent = "";
    }
    function checkSlot() {
      const { run, nextSettings } = prepared;
      const existing = storage.find(run.id, run.venue);
      seen = storage.revision(existing);
      const replacing = existing && (seen !== storage.revision(run) || !maps.sameSettings(storage.settingsFor(run.id, run.venue), nextSettings));
      conflict.hidden = keep.hidden = !replacing;
      if (replacing) conflict.textContent = "이 맵의 현재 자동 저장 · " + progress(existing);
      submit.textContent = replacing ? "이 맵 기록을 교체하고 불러오기" : "이 기록 불러오기";
    }
    function showPreview() {
      const { run, date, nextSettings } = prepared;
      const map = maps.of(run);
      preview.append(element("strong", "", map.title), element("p", "", progress(run)),
        element("p", "", "체력 " + run.hp + " · " + map.risk + " " + run.exposure + " · 가방 " + run.bag.length + "/" + globalThis.DisasterSupplies.capacity),
        element("p", "", "난이도 " + difficulty.level(run.settings) + " · " + difficulty.summary(run.settings)));
      if (!maps.sameSettings(nextSettings, run.settings)) preview.append(element("p", "", "다음 판 · " + difficulty.summary(nextSettings)));
      if (date) preview.append(element("small", "", date.toLocaleString("ko-KR") + " 저장"));
      preview.hidden = false;
      submit.disabled = false;
      checkSlot();
    }
    input.addEventListener("change", async () => {
      const sequence = ++readNumber;
      const file = input.files[0];
      input.value = "";
      clearPreview();
      name.textContent = file?.name || "";
      if (!file) return;
      if (file.size > files.maxBytes) { status.textContent = "파일이 너무 큽니다. 게임에서 내려받은 JSON 파일을 선택하세요."; return; }
      status.textContent = "파일을 읽는 중입니다.";
      let text;
      try { text = await file.text(); }
      catch { if (sequence === readNumber) status.textContent = "파일을 열 수 없습니다. 다시 선택하세요."; return; }
      if (sequence !== readNumber || !form.isConnected || !byId("dialog").open) return;
      try {
        prepared = files.decode(text);
        status.textContent = "";
        showPreview();
      } catch (error) {
        clearPreview();
        status.textContent = error.message;
      }
    });
    form.addEventListener("submit", event => {
      event.preventDefault();
      if (!prepared) return;
      const { run, nextSettings } = prepared;
      if (storage.revision(storage.find(run.id, run.venue)) !== seen) {
        checkSlot();
        status.textContent = "이 맵의 자동 저장이 바뀌었습니다. 기록을 확인하고 불러오세요.";
        return;
      }
      storage.setSettings(run.id, run.venue, nextSettings);
      enter(run);
    });
    clearPreview();
    showDialog("세이브 파일 불러오기", form);
    input.focus({ preventScroll: true });
  }
  globalThis.DisasterSaveDialog = { download, showLoad };
})();
