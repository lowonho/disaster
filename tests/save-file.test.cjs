const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
require("../js/data/regions.js");
require("../js/legacy/supplies-v4.js");
require("../js/data/maps.js");
require("../js/knowledge.js");
require("../js/legacy/scenarios-v2.js");
require("../js/legacy/engine-v2.js");
require("../js/legacy/maps-v4.js");
require("../js/legacy/knowledge-v4.js");
require("../js/legacy/field-v4.js");
require("../js/data/guidance.js");
require("../js/response.js");
require("../js/engine.js");
require("../js/save-file.js");

const game = globalThis.DisasterGame, files = globalThis.DisasterSaveFile;
const noRoll = () => { throw Error("unexpected roll"); };

test("portable JSON restores map discoveries, failed and successful sign readings and queued difficulty", t => {
  const run = game.newRun("fire", 829, "travel", { layout: "none", supplies: "partial" });
  assert(game.advance(run, "survey", () => 0));
  assert(game.advance(run, "move:a", noRoll));
  assert(game.advance(run, "survey", () => 0.99));
  assert.deepEqual(run.log.filter(entry => entry.roll).map(entry => entry.roll.face), [1, 6]);
  const next = { layout: "full", supplies: "none" }, date = new Date("2026-11-26T04:50:12Z");
  const json = files.encode(run, date, next);
  t.mock.method(Math, "random", noRoll);
  const saved = files.decode("\uFEFF" + json);
  assert.deepEqual(saved.run, run);
  assert.deepEqual(saved.nextSettings, next);
  assert.equal(saved.date.toISOString(), date.toISOString());
});

test("completed and migrated journals can be opened as portable files", t => {
  const archive = globalThis.DisasterFieldV4;
  const recordV4 = archive.restore("quake", { version: 1, open: "a", steps: ["signal", "scan", "main"] });
  for (const id of ["move:mid", "cover", "rescue"]) assert(archive.advance(recordV4, id, noRoll));
  const old = files.decode(JSON.stringify({ format: "disaster-escape-save", version: 1, run: archive.snapshot(recordV4) })).run;
  assert.equal(old.status, "escaped");
  assert.equal(old.archived, true);
  assert.equal(game.statusLabel(old), "이전 판 종료");
  t.mock.method(Math, "random", noRoll);
  const record = JSON.parse(files.encode(old));
  delete record.nextSettings;
  const loaded = files.decode(JSON.stringify(record));
  assert.deepEqual(loaded.run, old);
  assert.deepEqual(loaded.nextSettings, old.settings);
  assert.equal(game.advance(loaded.run, "search"), false);
});

test("wrong formats, unsupported versions and impossible journals cannot replace a run", () => {
  const run = game.newRun("flood", 7, "home");
  const json = files.encode(run);
  const original = game.snapshot(run);
  for (const mutate of [
    data => { data.format = "different-game"; },
    data => { data.version = 2; },
    data => { data.run.id = "missing"; },
    data => { data.run.version = 6; },
    data => { data.run.seed = -7; },
    data => { data.run.venue = "missing"; },
    data => { data.run.steps = [{ id: "search", face: 7 }]; },
    data => { data.run.steps = ["escape"]; },
    data => { data.nextSettings.layout = "invalid"; }
  ]) {
    const file = JSON.parse(json);
    mutate(file);
    assert.throws(() => files.decode(JSON.stringify(file)));
  }
  assert.throws(() => files.decode("{"));
  assert.deepEqual(game.snapshot(run), original);
});

function storageFixture() {
  const values = new Map();
  const localStorage = {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value)
  };
  const context = { DisasterGame: game, DisasterMaps: globalThis.DisasterMaps, DisasterScenarios: globalThis.DisasterScenarios,
    location: { protocol: "https:" }, localStorage };
  const source = fs.readFileSync(path.join(__dirname, "../js/storage.js"), "utf8");
  vm.runInNewContext(source, context);
  return { store: context.DisasterStorage, values, localStorage };
}

test("browsing the menu never creates autosaves or resets existing and legacy slots", () => {
  const { store, values } = storageFixture();
  assert.equal(store.list().length, 0);
  assert.equal(store.find("fire", "travel"), null);
  assert.equal(values.size, 0);
  values.set("disaster-escape.v3.run.fire", JSON.stringify({ version: 3, seed: 17, legacy: null, steps: ["move:a"] }));
  assert.equal(store.list()[0].node, "a");
  assert.equal(store.list()[0].venue, "work");
  assert.equal(values.size, 1);
  const fresh = game.newRun("fire", 31, "travel");
  store.save(fresh);
  store.writePref("active", "fire");
  store.writePref("venue.fire", "travel");
  assert.equal(store.list().length, 2);
  assert.equal(store.list()[0].venue, "travel");
  assert.deepEqual(store.find("fire", "travel"), fresh);
});

test("a failed autosave stays available for file export even when smaller settings still fit", () => {
  const { store, localStorage, values } = storageFixture();
  localStorage.setItem = (key, value) => {
    if (key.includes(".run.")) throw Error("quota");
    values.set(key, value);
  };
  const run = game.newRun("quake", 5, "work");
  assert(game.advance(run, "cover", noRoll));
  store.save(run);
  store.writePref("active", "quake");
  assert.equal(store.canSave(), false);
  assert.deepEqual(files.decode(files.encode(store.find("quake", "work"))).run, run);
});

test("continuing a v4 slot writes a v5 journal without replacing the original save", () => {
  const { store, values } = storageFixture();
  const archive = globalThis.DisasterFieldV4;
  const old = archive.newRun("fire", 2, "travel");
  assert(archive.advance(old, "move:b", noRoll));
  const key = "disaster-escape.v4.run.fire.travel", data = JSON.stringify(archive.snapshot(old));
  values.set(key, data);
  const continued = store.find("fire", "travel");
  assert.equal(continued.node, "b");
  assert.equal(values.size, 1);
  assert(game.advance(continued, "move:last", noRoll));
  store.save(continued);
  assert.equal(values.get(key), data);
  assert.equal(store.find("fire", "travel").node, "last");
  assert.equal(JSON.parse(values.get("disaster-escape.v5.run.fire.travel")).version, 5);
});
