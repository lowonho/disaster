const { test } = require("node:test");
const assert = require("node:assert/strict");
require("../js/data/regions.js");
require("../js/legacy/supplies-v4.js");
require("../js/data/maps.js");
require("../js/legacy/maps-v4.js");
require("../js/legacy/knowledge-v4.js");
require("../js/legacy/scenarios-v2.js");
require("../js/legacy/engine-v2.js");
require("../js/legacy/field-v4.js");

const game = globalThis.DisasterFieldV4, maps = globalThis.DisasterMapsV4, knowledge = globalThis.DisasterKnowledgeV4;
const ids = Object.keys(globalThis.DisasterScenarios), venues = Object.keys(maps.venues);
const noRoll = () => { throw Error("unexpected die roll"); };
const take = (s, id) => assert(game.advance(s, id, () => 0.99), s.id + "/" + s.venue + " at " + s.node + " doing " + id);
const travel = s => game.choices(s).filter(a => a.section === "travel");

test("v4 save replay · each disaster has three physical maps with full, fragmentary and unknown starting geography", () => {
  for (const id of ids) {
    const [home, work, trip] = venues.map(venue => game.newRun(id, 17, venue));
    assert.equal(new Set([home, work, trip].map(s => maps.of(s).nodes.start.place)).size, 3);
    assert.equal(home.known.areas.length, 6);
    assert.equal(home.known.routes.length, maps.of(home).ways.length + 1);
    assert.equal(knowledge.canSurvey(home), false);
    assert.deepEqual(work.known.areas, ["start", maps.of(work).hintArea, "mid"]);
    assert.equal(work.known.routes.length, 1);
    assert.deepEqual(work.known.caches, [maps.of(work).hintArea]);
    assert.deepEqual(trip.known, { areas: ["start"], routes: [], caches: [] });
    assert.equal(game.announcedClose(trip, "start"), Infinity);
    assert(travel(trip).every(action => action.description.startsWith("행선지 미확인")));
    assert.equal(knowledge.stock(trip, "start"), null);
  }
});

test("v4 save replay · walking discovers the travelled connection; surveying records local supplies and neighbouring routes once", () => {
  const s = game.newRun("fire", 42, "travel");
  assert(game.advance(s, "move:b", noRoll));
  assert.deepEqual(s.known.areas, ["start", "b"]);
  assert(knowledge.hasRoute(s, "b", "start"));
  assert.equal(knowledge.stock(s, "b"), null);
  assert.equal(travel(s).find(a => a.to === "start").title, maps.of(s).nodes.start.place);
  assert(game.advance(s, "survey", noRoll));
  assert.equal(s.elapsed, 2);
  assert.equal(s.log.at(-1).exposure, 2);
  assert.equal(s.log.at(-1).roll, undefined);
  assert.deepEqual(knowledge.stock(s, "b"), s.stock.b);
  assert(knowledge.hasRoute(s, "b", "mid"));
  assert(knowledge.hasArea(s, "last"));
  assert(!knowledge.hasRoute(s, "mid", "last"));
  assert(!knowledge.hasArea(s, "safe"));
  assert.equal(game.advance(s, "survey", noRoll), false);
  assert.deepEqual(game.restore("fire", game.snapshot(s)), s);
  take(s, "move:last");
  assert(knowledge.hasRoute(s, "last", "safe"));
});

test("v4 save replay · map and supply settings combine independently and stay local to a run", () => {
  for (const layout of ["full", "partial", "none"]) for (const supplies of ["full", "partial", "none"]) {
    const s = game.newRun("fire", 7, "travel", { layout, supplies });
    assert.equal(s.known.areas.length, { full: 6, partial: 3, none: 1 }[layout]);
    const count = s.known.areas.filter(key => knowledge.stock(s, key)).length;
    assert.equal(count, supplies === "full" ? s.known.areas.filter(key => key !== "safe").length : supplies === "partial" ? 1 : 0);
    if (layout === "none") assert.equal(knowledge.stock(s, "mid"), null);
    assert.deepEqual(game.restore("fire", game.snapshot(s)), s);
  }
  const other = game.newRun("fire", 7, "travel");
  assert.deepEqual(other.known.areas, ["start"]);
  const before = game.snapshot(other);
  for (const patch of [{ venue: "missing" }, { id: "quake" }, { settings: { layout: "all", supplies: "full" } }]) {
    assert.equal(game.restore("fire", { ...before, ...patch }), null);
  }
});

test("v4 save replay · v3 replays in the original workplace with the map it showed and its recorded roll", t => {
  t.mock.method(Math, "random", noRoll);
  const previous = { version: 3, seed: 19, legacy: null, steps: ["move:a", { id: "search", face: 1 }, "search"] };
  const run = game.restore("fire", previous);
  assert.equal(run.venue, "work");
  assert.equal(run.known.areas.length, 6);
  assert.equal(run.elapsed, 3);
  assert.equal(run.node, "a");
  assert.equal(run.hp, 90);
  assert.equal(run.bag.length, 1);
  assert.deepEqual(run.log[2].roll, { face: 1, target: 2, passed: false });
  assert.deepEqual(game.restore("fire", game.snapshot(run)), run);
  const untouched = game.restore("fire", { ...previous, steps: [] });
  assert.deepEqual(untouched.settings, maps.venues.work.settings);
});

function act(s, action) {
  if (game.shaking(s)) take(s, "cover");
  take(s, action);
}
function find(s, item) {
  while (!s.bag.includes(item)) act(s, "search");
}

test("v4 save replay · all nine maps support both evacuation routes under either closure schedule", () => {
  for (const id of ids) for (const venue of venues) for (const seed of [0, 1, 0xfffffffe, 0xffffffff]) {
    const radio = game.newRun(id, seed, venue);
    if (venue === "travel") act(radio, "survey");
    if (id === "flood") find(radio, "radioBody");
    act(radio, venue === "travel" ? "move:b" : "move:a");
    if (id !== "flood") find(radio, "radioBody");
    act(radio, "move:mid"); find(radio, "battery"); act(radio, "craft:radio"); act(radio, "rescue");
    assert.equal(radio.status, "escaped");
    assert(!knowledge.hasRoute(radio, "mid", "safe"));
    assert.deepEqual(game.restore(id, game.snapshot(radio)), radio);

    const lamp = game.newRun(id, seed, venue);
    if (id === "flood") {
      act(lamp, venue === "travel" ? "move:b" : "move:a"); find(lamp, "battery");
      if (venue === "home") act(lamp, "move:mid");
      act(lamp, "move:last"); find(lamp, "lampBody");
    } else {
      find(lamp, id === "fire" ? "battery" : "lampBody");
      act(lamp, venue === "travel" ? "move:a" : "move:b");
      find(lamp, id === "fire" ? "lampBody" : "battery"); act(lamp, "move:last");
    }
    act(lamp, "craft:lamp"); act(lamp, "escape");
    assert.equal(lamp.status, "escaped");
    assert.deepEqual(game.restore(id, game.snapshot(lamp)), lamp);
  }
});
