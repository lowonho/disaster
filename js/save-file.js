(() => {
  "use strict";
  const game = globalThis.DisasterGame, maps = globalThis.DisasterMaps;
  const format = "disaster-escape-save";
  const maxBytes = 256 * 1024;

  function encode(run, date = new Date(), nextSettings = run.settings) {
    return JSON.stringify({ format, version: 1, savedAt: date.toISOString(), run: game.snapshot(run), nextSettings }, null, 2);
  }

  function decode(text) {
    let file;
    try {
      file = JSON.parse(text.trimStart());
    } catch {
      throw new Error("파일 내용을 읽을 수 없습니다. 저장한 JSON 파일을 선택하세요.");
    }
    if (file?.format !== format) throw new Error("재난 시뮬레이터에서 저장한 파일을 선택하세요.");
    if (file.version !== 1 || (file.run?.version > 4)) throw new Error("이 게임 버전에서 지원하지 않는 세이브 파일입니다.");
    const saved = file.run;
    if (saved?.version !== 4 || typeof saved.id !== "string" || typeof saved.venue !== "string" || !maps.validSettings(saved.settings)) {
      throw new Error("세이브 파일의 맵 또는 난이도 정보를 확인할 수 없습니다.");
    }
    // Vitals, inventory, map knowledge and roll results all come from the same replay.
    const run = game.restore(saved.id, { ...saved, settings: { layout: saved.settings.layout, supplies: saved.settings.supplies } });
    if (!run) throw new Error("행동 기록이 손상되어 이 파일을 불러올 수 없습니다.");
    const next = file.nextSettings === undefined ? run.settings : file.nextSettings;
    if (!maps.validSettings(next)) throw new Error("다음 판의 난이도 설정을 읽을 수 없습니다.");
    const date = typeof file.savedAt === "string" ? new Date(file.savedAt) : null;
    return { run, nextSettings: { layout: next.layout, supplies: next.supplies }, date: date && Number.isFinite(date.getTime()) ? date : null };
  }

  function download(run) {
    const date = new Date(), pad = n => String(n).padStart(2, "0");
    const day = [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join("-");
    const time = [date.getHours(), date.getMinutes(), date.getSeconds()].map(pad).join("");
    const turn = run.elapsed + Number(run.status === "playing");
    const filename = ["재난시뮬레이터", maps.of(run).short, maps.venues[run.venue].name, turn + "턴", day, time].join("_") + ".json";
    const next = globalThis.DisasterStorage.settingsFor(run.id, run.venue);
    const url = URL.createObjectURL(new Blob([encode(run, date, next)], { type: "application/json;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    try { link.click(); }
    finally {
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
    }
    return filename;
  }
  globalThis.DisasterSaveFile = { encode, decode, download, maxBytes };
})();
