const { test } = require("node:test");
const assert = require("node:assert/strict");
require("../js/legacy/scenarios-v2.js");
require("../js/legacy/engine-v2.js");
const game = globalThis.DisasterLegacyGame;

test("an unseen exit uses one die; the revealed exit is then certain", t => {
  let face;
  const random = t.mock.method(Math, "random", () => (face - 0.5) / 6);
  for (face = 1; face <= 6; face++) {
    const state = game.newRun("fire", "b");
    const before = random.mock.callCount();
    assert.equal(game.advance(state, "east"), true);
    const last = state.log.at(-1);
    assert.deepEqual(last.roll, { face, target: 4, passed: face >= 4 });
    assert.equal(state.node, face >= 4 ? "a" : "start");
    assert.equal(state.hp, face >= 4 ? 90 : 100);
    assert.equal(state.exposure, 18);
    if (face < 4) {
      assert.equal(game.advance(state, "east"), false);
      assert.equal(game.advance(state, "west"), true);
      assert.equal(state.node, "b");
      assert.equal(state.log.at(-1).roll, undefined);
    }
    assert.equal(random.mock.callCount() - before, 1);
  }
});

test("a failed shortcut advances the hazard clock and leaves the alternative usable", t => {
  const state = game.restore("fire", { version: 1, open: "a", steps: ["scan", "east", "outside"] });
  t.mock.method(Math, "random", () => 0);
  const before = game.snapshot(state);
  const exposure = state.exposure;
  assert(game.advance(state, "direct"));
  assert.equal(state.elapsed, 4);
  assert.equal(state.node, "mid");
  assert.equal(state.log.at(-1).hp, 0);
  assert.equal(state.exposure, exposure + 6);
  assert(state.log.at(-1).event);
  assert(game.advance(state, "detour"));
  assert.equal(state.node, "last");
  assert(game.choices(state).find(action => action.id === "front").unavailable);
  assert.deepEqual(game.snapshot(state).steps.slice(0, 3), before.steps);
});

test("v1 outcomes and new recorded faces replay together without randomness", t => {
  const state = game.restore("quake", { version: 1, open: "a", steps: ["signal", "scan", "main"] });
  assert.equal(state.reported, true);
  assert.equal(state.log[1].roll, undefined);
  const random = t.mock.method(Math, "random", () => 0.5);
  assert(game.advance(state, "short"));
  assert.deepEqual(state.log.at(-1).roll, { face: 4, target: 3, passed: true });
  const saved = game.snapshot(state);
  const calls = random.mock.callCount();
  assert.deepEqual(game.restore("quake", saved), state);
  assert.equal(random.mock.callCount(), calls);
  for (const invalid of ["short", { id: "short", face: 0 }, { id: "short", face: 7 }]) {
    const damaged = structuredClone(saved);
    damaged.steps[3] = invalid;
    assert.equal(game.restore("quake", damaged), null);
  }
});
