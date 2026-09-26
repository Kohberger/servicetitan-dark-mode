// Regression tests for the floating toggle's positioning and gesture logic.
// Run with: npm test   (or: node --test "tests/**/*.test.js")
const test = require("node:test");
const assert = require("node:assert/strict");
const Core = require("../toggle-core.js");

const SIZE = 44;
const M = Core.MARGIN;
const vp = (width, height) => ({ width, height });
const pos = (horizontal, vertical, offsetX, offsetY) => ({ version: 2, horizontal, vertical, offsetX, offsetY });

test("default is bottom-right with a 14px margin", () => {
  assert.equal(M, 14);
  assert.deepEqual(Core.defaultPosition(), pos("right", "bottom", 14, 14));
  assert.deepEqual(Core.positionToPixels(Core.defaultPosition(), SIZE, vp(1000, 800)),
    { left: 1000 - SIZE - 14, top: 800 - SIZE - 14 });
});

test("each corner anchors to its own edges", () => {
  const v = vp(1000, 800);
  assert.deepEqual(Core.positionToPixels(pos("left", "top", 20, 30), SIZE, v), { left: 20, top: 30 });
  assert.deepEqual(Core.positionToPixels(pos("right", "top", 20, 30), SIZE, v), { left: 1000 - SIZE - 20, top: 30 });
  assert.deepEqual(Core.positionToPixels(pos("left", "bottom", 20, 30), SIZE, v), { left: 20, top: 800 - SIZE - 30 });
});

test("positionFromRect picks the nearest horizontal and vertical edges", () => {
  const v = vp(1000, 800);
  assert.deepEqual(Core.positionFromRect(100, 50, SIZE, v), pos("left", "top", 100, 50));
  assert.deepEqual(Core.positionFromRect(900, 700, SIZE, v), pos("right", "bottom", 1000 - 900 - SIZE, 800 - 700 - SIZE));
  assert.deepEqual(Core.positionFromRect(800, 60, SIZE, v), pos("right", "top", 156, 60));
});

test("positionFromRect round-trips through positionToPixels", () => {
  const v = vp(1280, 720);
  for (const [l, t] of [[14, 14], [300, 500], [1222, 662], [640, 20], [15.6, 400.4]]) {
    const p = Core.positionFromRect(l, t, SIZE, v);
    const px = Core.positionToPixels(p, SIZE, v);
    assert.ok(Math.abs(px.left - l) <= 0.5 && Math.abs(px.top - t) <= 0.5, `${l},${t} -> ${JSON.stringify(px)}`);
  }
});

test("resizing keeps the toggle at the same offset from its anchored edges", () => {
  const p = Core.defaultPosition();
  for (const [w, h] of [[800, 600], [1920, 1080], [1200, 400]]) {
    const { left, top } = Core.positionToPixels(p, SIZE, vp(w, h));
    assert.equal(w - left - SIZE, 14);
    assert.equal(h - top - SIZE, 14);
  }
});

test("shrinking clamps the toggle into view without changing its stored offsets", () => {
  const p = pos("left", "top", 900, 700);
  const snapshot = structuredClone(p);
  const small = Core.positionToPixels(p, SIZE, vp(400, 300));
  assert.deepEqual(small, { left: 400 - SIZE - M, top: 300 - SIZE - M });
  assert.deepEqual(p, snapshot, "stored offsets must not be mutated");
  // Growing the window back restores the preferred placement.
  assert.deepEqual(Core.positionToPixels(p, SIZE, vp(1600, 1000)), { left: 900, top: 700 });
});

test("very small and degenerate windows stay on screen", () => {
  // Too small for both margins: centered.
  assert.deepEqual(Core.positionToPixels(Core.defaultPosition(), SIZE, vp(60, 50)), { left: 8, top: 3 });
  // Smaller than the toggle itself: pinned to the top-left, never negative.
  assert.deepEqual(Core.positionToPixels(Core.defaultPosition(), SIZE, vp(30, 20)), { left: 0, top: 0 });
  // Zero / missing / non-numeric viewport sizes.
  for (const v of [vp(0, 0), vp(NaN, Infinity), {}, undefined]) {
    const { left, top } = Core.positionToPixels(Core.defaultPosition(), SIZE, v);
    assert.ok(Number.isFinite(left) && left >= 0 && Number.isFinite(top) && top >= 0, JSON.stringify(v));
  }
});

test("clampAxis honours the margin on both sides", () => {
  assert.equal(Core.clampAxis(-50, SIZE, 1000), M);
  assert.equal(Core.clampAxis(5000, SIZE, 1000), 1000 - SIZE - M);
  assert.equal(Core.clampAxis(300, SIZE, 1000), 300);
});

test("normalizePosition accepts only well-formed v2 positions", () => {
  assert.deepEqual(Core.normalizePosition(pos("left", "bottom", 0, 40)), pos("left", "bottom", 0, 40));
  assert.deepEqual(Core.normalizePosition({ ...pos("right", "top", 1, 2), extra: true }), pos("right", "top", 1, 2));
  const bad = [
    null, undefined, 42, "rb", [], {},
    { x: 10, y: 10 },
    { ...pos("right", "bottom", 14, 14), version: 1 },
    { ...pos("right", "bottom", 14, 14), version: "2" },
    pos("center", "bottom", 14, 14),
    pos("right", "middle", 14, 14),
    pos("right", "bottom", -1, 14),
    pos("right", "bottom", 14, NaN),
    pos("right", "bottom", Infinity, 14),
    pos("right", "bottom", "14", 14),
  ];
  for (const b of bad) assert.equal(Core.normalizePosition(b), null, JSON.stringify(b));
});

test("stored v2 positions load as-is without a migration write", () => {
  const stored = pos("left", "top", 50, 60);
  assert.deepEqual(Core.resolveStoredPosition(stored, "rb", SIZE, vp(1000, 800)),
    { position: stored, migrated: false });
});

test("legacy {x, y} positions migrate to nearest-edge offsets", () => {
  const v = vp(1000, 800);
  assert.deepEqual(Core.resolveStoredPosition({ x: 942, y: 742 }, undefined, SIZE, v),
    { position: pos("right", "bottom", 14, 14), migrated: true });
  assert.deepEqual(Core.resolveStoredPosition({ x: 14, y: 300 }, "rb", SIZE, v),
    { position: pos("left", "top", 14, 300), migrated: true });
  // Saved on a bigger monitor: still resolves to something on screen.
  const { position } = Core.resolveStoredPosition({ x: 2500, y: 1400 }, undefined, SIZE, v);
  const { left, top } = Core.positionToPixels(position, SIZE, v);
  assert.deepEqual({ left, top }, { left: 1000 - SIZE - M, top: 800 - SIZE - M });
});

test("legacy corner preferences migrate when no position is saved", () => {
  const v = vp(1000, 800);
  const cases = { rb: ["right", "bottom"], lb: ["left", "bottom"], rt: ["right", "top"], lt: ["left", "top"] };
  for (const [corner, [h, vv]] of Object.entries(cases)) {
    assert.deepEqual(Core.resolveStoredPosition(undefined, corner, SIZE, v),
      { position: pos(h, vv, 14, 14), migrated: true }, corner);
  }
});

test("invalid saved values fall back to the default", () => {
  const v = vp(1000, 800);
  for (const [stored, corner] of [
    [undefined, undefined],
    [null, null],
    ["garbage", "zz"],
    [{ x: "10", y: 10 }, undefined],
    [{ x: NaN, y: 5 }, 42],
    [pos("up", "down", 1, 1), "__proto__"],
    [{ version: 3, x: 10, y: 10 }, "toString"],
  ]) {
    assert.deepEqual(Core.resolveStoredPosition(stored, corner, SIZE, v),
      { position: Core.defaultPosition(), migrated: false }, JSON.stringify([stored, corner]));
  }
});

// ── Gestures ────────────────────────────────────────────────────────────────
function recorder(start = { x: 100, y: 100 }) {
  const calls = { tap: 0, dragEnd: 0, moves: [] };
  const g = Core.createGesture({
    ...start,
    onTap: () => calls.tap++,
    onDragEnd: () => calls.dragEnd++,
    onDragMove: (dx, dy) => calls.moves.push([dx, dy]),
  });
  return { g, calls };
}

test("a click toggles exactly once", () => {
  const { g, calls } = recorder();
  g.end(100, 100);
  g.end(100, 100);   // duplicate pointerup
  g.cancel();        // lostpointercapture that follows pointerup
  assert.deepEqual(calls, { tap: 1, dragEnd: 0, moves: [] });
});

test("jitter within the threshold still counts as a click", () => {
  const { g, calls } = recorder();
  g.move(103, 97);
  g.move(105, 105);
  g.end(104, 102);
  assert.equal(calls.tap, 1);
  assert.equal(calls.dragEnd, 0);
  assert.equal(calls.moves.length, 0);
});

test("dragging moves and saves but never toggles", () => {
  const { g, calls } = recorder();
  g.move(110, 100);
  g.move(150, 130);
  g.end(150, 130);
  g.cancel();
  assert.equal(calls.tap, 0);
  assert.equal(calls.dragEnd, 1);
  assert.deepEqual(calls.moves, [[10, 0], [50, 30], [50, 30]]);
});

test("a fast flick with no pointermove is a drag, not a click", () => {
  const { g, calls } = recorder();
  g.end(180, 100);
  assert.equal(calls.tap, 0);
  assert.equal(calls.dragEnd, 1);
});

test("dragging back to the start point is still a drag", () => {
  const { g, calls } = recorder();
  g.move(140, 100);
  g.move(100, 100);
  g.end(100, 100);
  assert.equal(calls.tap, 0);
  assert.equal(calls.dragEnd, 1);
});

test("a cancelled press (pointercancel / lost capture / blur) does not toggle", () => {
  const { g, calls } = recorder();
  g.cancel();
  g.end(100, 100);   // a late pointerup after cancel is ignored
  assert.deepEqual(calls, { tap: 0, dragEnd: 0, moves: [] });
});

test("a cancelled drag keeps its position but does not toggle", () => {
  const { g, calls } = recorder();
  g.move(160, 100);
  g.cancel();
  g.cancel();
  g.end(160, 100);
  assert.equal(calls.tap, 0);
  assert.equal(calls.dragEnd, 1);
});

test("moves after the gesture ends are ignored", () => {
  const { g, calls } = recorder();
  g.end(100, 100);
  g.move(300, 300);
  assert.equal(calls.moves.length, 0);
  assert.equal(g.done, true);
  assert.equal(g.dragging, false);
});
