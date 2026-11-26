const { test } = require("node:test");
const assert = require("node:assert/strict");
require("../js/data/regions.js");
require("../js/data/supplies.js");
require("../js/data/maps.js");
require("../js/knowledge.js");
require("../js/legacy/scenarios-v2.js");
require("../js/legacy/engine-v2.js");
require("../js/engine.js");

const game = globalThis.DisasterGame;
const pass = () => 0.99;
const noRoll = () => { throw Error("An automatic action attempted a roll"); };
const option = (state, id) => game.choices(state).find(action => action.id === id);
const take = (state, id, rng = pass) => assert.equal(game.advance(state, id, rng), true, state.id + " at " + state.node + " doing " + id);

test("a search uses exactly one fair die, keeps missed loot and makes its clue reliable", () => {
  for (let face = 1; face <= 6; face++) {
    const s = game.newRun("fire", 19);
    const initialPile = s.stock.start.slice();
    let calls = 0;
    take(s, "search", () => { calls++; return (face - 0.5) / 6; });
    assert.equal(calls, 1);
    assert.deepEqual(s.log.at(-1).roll, { face, target: 2, passed: face >= 2 });
    assert.equal(s.elapsed, 1);
    assert.equal(s.exposure, 14);
    if (face === 1) {
      assert.deepEqual(s.stock.start, initialPile);
      assert.equal(s.bag.length, 0);
      assert.equal(option(s, "search").check, null);
      take(s, "search", noRoll);
      assert.equal(s.log.at(-1).roll, undefined);
    }
    assert.deepEqual(s.bag, [initialPile[0]]);
    assert.equal(s.stock.start.length, 1);
    take(s, "search");
    const saved = game.snapshot(s);
    assert.equal(game.advance(s, "search", noRoll), false);
    assert.deepEqual(game.snapshot(s), saved);
    assert.deepEqual(game.restore("fire", saved), s);
  }
});

test("connected areas can be revisited; closure prevents entry and search but lets an occupant leave", () => {
  const s = game.newRun("fire", 0);
  assert.equal(game.advance(s, "move:last"), false);
  for (const id of ["move:b", "move:start", "move:b", "move:mid", "move:a"]) take(s, id, noRoll);
  assert.equal(game.turnsToClose(s, "a"), 1);
  take(s, "search");
  assert.equal(s.elapsed, 6);
  assert.match(s.log.at(-1).event, /동쪽 피난계단 통제/);
  assert.equal(option(s, "search").unavailable, "지역 통제");
  take(s, "move:mid", noRoll);
  assert.equal(game.advance(s, "move:a", noRoll), false);
  take(s, "move:last", noRoll);
  assert.equal(s.node, "last");
  assert.deepEqual(game.restore("fire", game.snapshot(s)), s);
});

test("a full bag, dropping, picking back up, eating and consuming recipe materials conserve supplies", () => {
  const s = game.newRun("fire", 0);
  for (const id of ["search", "search", "move:a", "search", "search", "move:mid"]) take(s, id);
  assert.equal(s.bag.length, 4);
  assert.match(option(s, "search").unavailable, /가방/);
  assert.equal(game.advance(s, "search", noRoll), false);
  const elapsed = s.elapsed, exposure = s.exposure;
  take(s, "drop:ration", noRoll);
  assert.equal(s.elapsed, elapsed);
  assert.equal(s.exposure, exposure);
  assert.deepEqual(s.stock.mid[0], "ration");
  take(s, "search");
  assert.equal(s.bag.length, 4);
  take(s, "craft:radio", noRoll);
  assert.deepEqual(s.bag.slice().sort(), ["radio", "ration", "ration"]);
  assert.equal(game.advance(s, "craft:radio", noRoll), false);
  take(s, "eat", noRoll);
  assert.equal(s.hp, 100);
  assert.equal(game.advance(s, "eat", noRoll), false);
  assert.deepEqual(game.restore("fire", game.snapshot(s)), s);
});

function act(s, id) {
  if (game.shaking(s)) take(s, "cover", noRoll);
  take(s, id);
}
function findItem(s, item) {
  while (!s.bag.includes(item)) act(s, "search");
}

test("every disaster supports a radio route and a lamp route across regions and closure schedules", () => {
  for (const id of ["fire", "flood", "quake"]) {
    for (const seed of [0, 1, 45, 90, 9177, 0x7fffffff, 0xffffffff]) {
      const radio = game.newRun(id, seed);
      if (id === "flood") findItem(radio, "radioBody");
      act(radio, "move:a");
      if (id !== "flood") findItem(radio, "radioBody");
      act(radio, "move:mid");
      findItem(radio, "battery");
      act(radio, "craft:radio");
      act(radio, "rescue");
      assert.equal(radio.status, "escaped");
      assert(!radio.visited.includes("last"));
      assert.deepEqual(game.restore(id, game.snapshot(radio)), radio);

      const lamp = game.newRun(id, seed);
      if (id === "fire") findItem(lamp, "battery");
      if (id === "quake") findItem(lamp, "lampBody");
      act(lamp, "move:b");
      findItem(lamp, id === "quake" ? "battery" : "lampBody");
      if (id === "flood") { act(lamp, "move:mid"); findItem(lamp, "battery"); }
      act(lamp, "move:last");
      act(lamp, "craft:lamp");
      if (game.shaking(lamp)) take(lamp, "cover", noRoll);
      assert.equal(option(lamp, "escape").check, null);
      assert.equal(option(lamp, "search").check, null);
      take(lamp, "escape", noRoll);
      assert.equal(lamp.status, "escaped");
      assert.deepEqual(game.restore(id, game.snapshot(lamp)), lamp);
    }
  }
});

test("a bare escape can fail; costs and loss take priority and a finished run is inert", () => {
  const s = game.newRun("flood", 1);
  take(s, "move:a"); take(s, "move:last");
  const health = s.hp;
  const exposure = s.exposure + option(s, "escape").exposure;
  take(s, "escape", () => 0);
  assert.equal(s.node, "last");
  assert.equal(s.hp, health);
  assert.equal(s.exposure, exposure);
  while (s.status === "playing") take(s, "escape", () => 0);
  assert.equal(s.status, "exposed");
  assert.equal(s.exposure, 100);
  assert.equal(game.advance(s, "escape"), false);
  assert.deepEqual(game.restore("flood", game.snapshot(s)), s);
});

test("a v1 or v2 journal keeps its locations, vitals, former die faces and rescue contact", () => {
  const old = globalThis.DisasterLegacyGame;
  const v1 = { version: 1, open: "a", steps: ["signal", "scan", "main"] };
  const legacy = old.newRun("fire", "b");
  old.advance(legacy, "east");
  for (const [id, saved] of [["quake", v1], ["fire", old.snapshot(legacy)]]) {
    const before = old.restore(id, saved);
    const state = game.restore(id, saved);
    for (const key of ["node", "elapsed", "hp", "exposure", "status", "log", "visited"]) assert.deepEqual(state[key], before[key]);
    assert.deepEqual(state.bag, before.reported ? ["radio"] : []);
    if (id === "quake") { act(state, "move:mid"); act(state, "rescue"); assert.equal(state.status, "escaped"); }
    else act(state, "search");
    assert.deepEqual(game.restore(id, game.snapshot(state)), state);
  }
});

test("saves reject fabricated actions and die faces; a valid replay needs no random draws", t => {
  const s = game.newRun("fire", 123);
  take(s, "search"); take(s, "move:b", noRoll);
  const saved = game.snapshot(s);
  t.mock.method(Math, "random", noRoll);
  assert.deepEqual(game.restore("fire", saved), s);
  for (const steps of [["search"], [{ id: "search", face: 0 }], [{ id: "search", face: 7 }], ["move:last"], ["craft:radio"], [{ id: "move:b", face: 6 }]]) {
    assert.equal(game.restore("fire", { ...saved, steps }), null);
  }
});
