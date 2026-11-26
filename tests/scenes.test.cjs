const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createHash } = require("node:crypto");
require("../js/data/regions.js");
require("../js/legacy/supplies-v4.js");
require("../js/data/maps.js");
require("../js/data/scenes.js");
require("../js/knowledge.js");
require("../js/legacy/maps-v4.js");
require("../js/legacy/knowledge-v4.js");
require("../js/legacy/field-v4.js");
require("../js/data/guidance.js");
require("../js/response.js");
require("../js/engine.js");

const maps = globalThis.DisasterMaps, scenes = globalThis.DisasterScenes, game = globalThis.DisasterGame;
const current = run => scenes.at(maps.of(run), run.node, game.hazardCost(run));

test("every location has its own PNG, with a second view for rising water outside each flood refuge", () => {
  const images = new Set();
  function check(shot) {
    const data = fs.readFileSync(path.join(__dirname, "..", shot.src));
    assert.equal(data.subarray(1, 4).toString(), "PNG");
    assert(data.readUInt32BE(16) > data.readUInt32BE(20));
    assert(shot.alt.length > 8);
    const hash = createHash("sha256").update(data).digest("hex");
    assert(!images.has(hash), shot.src);
    images.add(hash);
  }
  for (const id of Object.keys(globalThis.DisasterScenarios)) {
    for (const venue of Object.keys(maps.venues)) {
      const map = maps.get(id, venue);
      for (const node of Object.keys(map.nodes)) {
        const initial = scenes.at(map, node), late = scenes.at(map, node, 4);
        check(initial);
        if (id === "flood" && node !== "safe") {
          check(late);
          assert(late.observation);
        } else assert.deepEqual(late, initial);
      }
    }
  }
  assert.equal(images.size, 69);
});

test("rising water is visible along a real evacuation and restored at the same location", () => {
  const run = game.newRun("flood", 3, "home");
  for (const id of ["move:b", "move:a", "move:mid", "move:last"]) assert(game.advance(run, id));
  assert.equal(run.elapsed, 4);
  assert.match(current(run).src, /last-high\.png$/);
  assert.notEqual(current(run).src, scenes.at(maps.of(run), "last", 0).src);
  assert.deepEqual(current(game.restore(run.id, game.snapshot(run))), current(run));
});

test("entering a protected room changes the scene in each fire map", () => {
  for (const venue of Object.keys(maps.venues)) {
    const run = game.newRun("fire", venue === "home" ? 4 : 0, venue);
    assert(game.advance(run, "protect"));
    const shot = scenes.at(maps.of(run), run.node, 0, run.protection);
    assert.equal(shot.src, "assets/scenes/fire-" + venue + "/room.webp");
    assert.equal(fs.readFileSync(path.join(__dirname, "..", shot.src)).toString("ascii", 8, 12), "WEBP");
    assert.match(shot.alt, /닫힌 문/);
  }
});

test("the installed apartment refuge has its own illustrated fire door", () => {
  const run = game.newRun("fire", 1, "home");
  assert(game.advance(run, "protect"));
  const shot = scenes.at(maps.of(run), run.node, 0, run.protection);
  assert.match(shot.alt, /방화문/);
  assert.equal(shot.src, "assets/scenes/fire-home/refuge.webp");
  assert.equal(fs.readFileSync(path.join(__dirname, "..", shot.src)).toString("ascii", 8, 12), "WEBP");
});
