(() => {
  "use strict";
  const prefs = "disaster-escape.v1.";
  const current = "disaster-escape.v4.run.";
  const previous = ["disaster-escape.v3.run.", "disaster-escape.v2.run.", "disaster-escape.v1.run."];
  const maps = globalThis.DisasterMaps;
  const unsaved = new Map();
  function read(key) {
    if (unsaved.has(key)) return unsaved.get(key);
    try { return JSON.parse(localStorage.getItem(key)); }
    catch { return null; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); unsaved.delete(key); }
    catch { unsaved.set(key, value); }
  }
  function save(run) {
    const slot = run.id + "." + run.venue;
    write(current + slot, globalThis.DisasterGame.snapshot(run));
  }
  function venueFor(id, fallback = "home") {
    const last = read(prefs + "venue." + id);
    if (Object.hasOwn(maps.venues, last)) return last;
    if (read(current + id + ".work") || previous.some(prefix => globalThis.DisasterGame.restore(id, read(prefix + id)))) return "work";
    return fallback;
  }
  function settingsFor(id, venue) {
    const key = prefs + "difficulty." + id + "." + venue;
    const saved = read(key);
    return maps.validSettings(saved) ? saved : maps.venues[venue].settings;
  }
  function setSettings(id, venue, settings) {
    const key = prefs + "difficulty." + id + "." + venue;
    write(key, settings);
  }
  function displaySettings(id, venue) {
    const slot = id + "." + venue;
    const saved = read(current + slot);
    return maps.validSettings(saved?.settings) ? saved.settings : settingsFor(id, venue);
  }
  function find(id, venue) {
    const slot = id + "." + venue;
    const game = globalThis.DisasterGame;
    const present = game.restore(id, read(current + slot));
    if (present && present.venue === venue) return present;
    if (venue === "work") {
      for (const prefix of previous) {
        const restored = game.restore(id, read(prefix + id));
        if (!restored) continue;
        return restored;
      }
    }
    return null;
  }
  function list() {
    const saved = [];
    for (const id of Object.keys(globalThis.DisasterScenarios)) {
      for (const venue of Object.keys(maps.venues)) {
        const run = find(id, venue);
        if (run) saved.push(run);
      }
    }
    const recentId = read(prefs + "active");
    const recentVenue = recentId ? venueFor(recentId) : null;
    const rank = run => (run.status === "playing" ? 2 : 0) + Number(run.id === recentId && run.venue === recentVenue);
    return saved.sort((a, b) => rank(b) - rank(a));
  }
  function revision(run) {
    return run ? JSON.stringify(globalThis.DisasterGame.snapshot(run)) : null;
  }
  function importLocalEntry() {
    if (location.protocol !== "file:" || !location.hash.startsWith("#resume=")) return;
    try {
      const data = JSON.parse(decodeURIComponent(location.hash.slice(8)));
      const ids = Object.keys(globalThis.DisasterScenarios);
      for (const id of ids) {
        const candidates = data.journals?.[id];
        if (!Array.isArray(candidates)) continue;
        const game = globalThis.DisasterGame;
        if (game.restore(id, read(current + id + ".work")) || previous.some(prefix => game.restore(id, read(prefix + id)))) continue;
        for (const saved of candidates.slice(0, 3)) {
          if (![1, 2, 3].includes(saved?.version)) continue;
          const restored = game.restore(id, saved);
          if (restored) { save(restored); break; }
        }
      }
      if (read(prefs + "active") === null && ids.includes(data.active)) write(prefs + "active", data.active);
      if (read(prefs + "sound") === null && typeof data.sound === "boolean") write(prefs + "sound", data.sound);
    } catch { /* An incomplete fragment never replaces a local journal. */ }
    try { history.replaceState(null, "", location.href.split("#")[0]); } catch { /* File history may be read-only. */ }
  }
  function sync(refreshRun, refreshPreferences) {
    window.addEventListener("storage", event => {
      if (event.key === null) unsaved.clear();
      else unsaved.delete(event.key);
      if (event.key === prefs + "sound" || event.key === prefs + "diceMotion" || event.key === null) refreshPreferences();
      for (const id of Object.keys(globalThis.DisasterScenarios)) {
        for (const venue of Object.keys(maps.venues)) {
          const slot = id + "." + venue;
          if (event.key !== null && event.key !== current + slot) continue;
          refreshRun(id, venue);
        }
      }
    });
  }
  importLocalEntry();
  globalThis.DisasterStorage = {
    find, list, save, revision, sync, venueFor, settingsFor, setSettings, displaySettings,
    readPref: key => read(prefs + key), writePref: (key, value) => write(prefs + key, value),
    canSave: () => unsaved.size === 0
  };
})();
