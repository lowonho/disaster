// Preserve journals when a browser assigns separate storage to each local HTML file.
(() => {
  "use strict";
  const target = new URL("index.html", location.href);
  if (location.protocol === "file:") {
    try {
      const read = key => {
        try { return JSON.parse(localStorage.getItem(key)); }
        catch { return null; }
      };
      const journals = {};
      for (const id of ["fire", "flood", "quake"]) {
        const saves = [3, 2, 1].map(v => read("disaster-escape.v" + v + ".run." + id))
          .filter(save => save && Array.isArray(save.steps) && save.steps.length <= (save.version === 3 ? 256 : 64));
        if (saves.length) journals[id] = saves;
      }
      const active = read("disaster-escape.v1.active"), sound = read("disaster-escape.v1.sound");
      if (Object.keys(journals).length || active || sound !== null) {
        target.hash = "resume=" + encodeURIComponent(JSON.stringify({ journals, active, sound }));
      }
    } catch { /* The main entry also works when storage is disabled. */ }
  }
  location.replace(target.href);
})();
