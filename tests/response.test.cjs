const { test } = require("node:test");
const assert = require("node:assert/strict");
for (const file of ["data/regions", "legacy/supplies-v4", "data/maps", "legacy/scenarios-v2", "legacy/engine-v2",
  "legacy/maps-v4", "legacy/knowledge-v4", "legacy/field-v4", "knowledge", "data/guidance", "response", "engine"]) require("../js/" + file + ".js");
const game = globalThis.DisasterGame, maps = globalThis.DisasterMaps, knowledge = globalThis.DisasterKnowledge;
const noDie = () => { throw Error("A protective action rolled a die"); };
const take = (s, id) => assert.equal(game.advance(s, id, noDie), true, s.id + "/" + s.venue + " at " + s.node + ": " + id);
const eligible = s => game.choices(s).filter(action => !action.unavailable);
const intact = s => assert.deepEqual(game.restore(s.id, game.snapshot(s)), s);

test("apartment fire uses smoke at the dwelling and the condition of the exit", () => {
  const staying = game.newRun("fire", 0, "home");
  assert.match(game.situation(staying).text, /다른 세대/);
  assert.equal(game.advance(staying, "move:a", noDie), false);
  take(staying, "protect"); take(staying, "monitor");
  assert.equal(staying.status, "sheltered");
  assert.equal(staying.node, "start");
  intact(staying);

  for (const venue of Object.keys(maps.venues)) {
    const trapped = game.newRun("fire", 4, venue);
    assert(eligible(trapped).every(a => a.id === "protect"));
    assert.equal(game.advance(trapped, "wait", noDie), false);
    take(trapped, "protect");
    assert.equal(trapped.protection, "room");
    assert.match(game.reportDetails(trapped).where, /층/);
    assert.match(game.reportDetails(trapped).who, /1명/);
    assert.equal(game.advance(trapped, "wait", noDie), false);
    take(trapped, "report"); intact(trapped);
    assert.equal(game.advance(trapped, "report", noDie), false);
    take(trapped, "wait");
    assert.equal(trapped.status, "awaiting");
    assert.equal(trapped.node, "start");
    assert.match(game.currentPlace(trapped), /안쪽/);
    intact(trapped);
  }

  const refuge = game.newRun("fire", 1, "home");
  assert.match(game.situation(refuge).text, /전용 대피공간/);
  take(refuge, "protect");
  assert.equal(refuge.protection, "refuge");
  assert.match(game.reportDetails(refuge).where, /403호.*발코니 대피공간/);
  assert.match(game.reportDetails(refuge).who, /고립/);
  take(refuge, "report"); take(refuge, "wait");
  assert.equal(refuge.status, "awaiting");
  intact(refuge);
  const leaving = game.newRun("fire", 2, "home");
  assert.match(game.situation(leaving).text, /계단/);
  assert.equal(game.advance(leaving, "move:a", noDie), false);
  for (const id of ["move:b", "move:last", "escape"]) take(leaving, id);
  assert.equal(leaving.node, "safe");
  assert.match(game.reportDetails(leaving).what, /4층/);
  take(leaving, "report");
  assert.equal(leaving.status, "escaped");
  intact(leaving);
});

test("flood steps start immediately and a cut-off valley ends on the same high ground", () => {
  for (const venue of ["home", "work"]) {
    const s = game.newRun("flood", 0, venue);
    assert(game.choices(s).some(a => a.to && /물/.test(a.unavailable)));
    const first = eligible(s).find(a => a.to);
    assert(first);
    take(s, first.id);
    assert.equal(game.advance(s, "move:start", noDie), false);
  }
  const isolated = game.newRun("flood", 1, "travel");
  assert.equal(game.advance(isolated, "move:a", noDie), false);
  take(isolated, "move:b");
  assert.equal(game.advance(isolated, "move:last", noDie), false);
  take(isolated, "move:mid");
  assert.equal(game.advance(isolated, "move:last", noDie), false);
  take(isolated, "protect");
  assert.match(game.reportDetails(isolated).where, /솔바위 계곡.*전망대/);
  take(isolated, "report");
  assert.equal(isolated.elapsed, 3);
  assert.equal(isolated.status, "playing");
  take(isolated, "wait");
  assert.equal(isolated.status, "awaiting");
  assert.equal(isolated.node, "mid");
  intact(isolated);
});

test("earthquake cover matches the surroundings and applies again during an aftershock", () => {
  const home = game.newRun("quake", 0, "home");
  assert.match(eligible(home)[0].title, /탁자/);
  assert.equal(game.advance(home, "move:b", noDie), false);
  take(home, "cover"); take(home, "move:b"); take(home, "move:last");
  assert.equal(game.shaking(home), true);
  assert.match(eligible(home)[0].title, /담장/);
  assert.equal(game.advance(home, "escape", noDie), false);
  take(home, "cover"); take(home, "escape"); intact(home);
  const station = game.newRun("quake", 19, "travel");
  assert.match(eligible(station)[0].title, /머리와 목/);
  assert.doesNotMatch(eligible(station)[0].title, /탁자/);
});

test("a sign can reveal extra routes, but every die face leaves the same escape actions usable", () => {
  for (let face = 1; face <= 6; face++) {
    const s = game.newRun("fire", 2, "travel");
    assert.deepEqual(s.known, { areas: ["start"], routes: [], signs: [] });
    const actions = eligible(s).filter(a => a.to).map(a => a.id);
    let rolls = 0;
    assert(game.advance(s, "survey", () => { rolls++; return (face - 0.5) / 6; }));
    assert.equal(rolls, 1); assert.equal(s.elapsed, 0);
    assert.deepEqual(s.log.at(-1).roll, { face, target: 3, passed: face >= 3 });
    assert.equal(knowledge.hasRoute(s, "start", "b"), face >= 3);
    assert.deepEqual(eligible(s).filter(a => a.to).map(a => a.id), actions);
    assert.equal(game.advance(s, "survey", noDie), false);
    take(s, actions[0]); intact(s);
  }
  const familiar = game.newRun("flood", 3, "work", { layout: "full", supplies: "none" });
  take(familiar, "survey");
  assert(!familiar.log.at(-1).roll);
});

test("every available protective decision on all nine maps reaches a valid outcome without items or a lucky roll", () => {
  const statuses = new Set();
  function walk(s) {
    intact(s);
    if (s.status !== "playing") {
      statuses.add(s.status);
      assert.deepEqual(game.choices(s), []);
      if (s.status === "escaped") assert.equal(s.node, "safe");
      else assert.notEqual(s.node, "safe");
      return;
    }
    assert(s.steps.length < 13);
    const all = game.choices(s), options = eligible(s).filter(a => a.id !== "survey");
    assert(options.length);
    assert(!all.some(a => /craft|rescue|drop|eat|search/.test(a.id)));
    for (const blocked of all.filter(a => a.unavailable)) assert.equal(game.advance(s, blocked.id, noDie), false);
    for (const a of options) { const next = game.restore(s.id, game.snapshot(s)); take(next, a.id); walk(next); }
  }
  for (const id of Object.keys(globalThis.DisasterScenarios)) for (const venue of Object.keys(maps.venues)) {
    for (const seed of [0, 1, 2, 3, 4, 5, 7, 9, 18, 0xffffffff]) walk(game.newRun(id, seed, venue));
  }
  assert.deepEqual(statuses, new Set(["escaped", "awaiting", "sheltered"]));
});

test("legacy progress can continue under practical rules, old actions cannot be injected into new journals", () => {
  const old = globalThis.DisasterFieldV4.newRun("fire", 82, "travel");
  globalThis.DisasterFieldV4.advance(old, "move:b", noDie);
  globalThis.DisasterFieldV4.advance(old, "search", () => 0.99);
  const migrated = game.restore("fire", globalThis.DisasterFieldV4.snapshot(old));
  assert.equal(migrated.node, old.node);
  assert.equal(migrated.elapsed, old.elapsed);
  assert.deepEqual(migrated.known.routes, old.known.routes);
  for (const id of ["craft:radio", "rescue", "search", "eat"]) assert.equal(game.advance(migrated, id, noDie), false);
  take(migrated, "move:last"); take(migrated, "escape"); take(migrated, "report"); intact(migrated);
  const saved = game.snapshot(migrated);
  for (const change of [{ steps: ["rescue"] }, { seed: saved.seed + 1 }, { previous: { version: 5 } }]) assert.equal(game.restore("fire", { ...saved, ...change }), null);
});
