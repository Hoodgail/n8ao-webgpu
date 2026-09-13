import test from "node:test";
import assert from "node:assert/strict";
import {
  hemisphereSamples,
  denoiseSamples,
  rotatedFrameNoise,
} from "../../dist/core/sampling.js";
import { HistoryState, accumulateRGBA } from "../../dist/core/history.js";
const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const near = (a, b, tol = 1e-12) =>
  assert.ok(Math.abs(a - b) < tol, `${a} != ${b}`);
test("hemisphere formula matches the pinned original JS formula exactly", () => {
  for (const n of [1, 8, 16, 64, 256]) {
    const points = hemisphereSamples(n);
    for (let k = 0; k < n; k++) {
      const theta = 2.399963 * k,
        r = Math.sqrt(k + 0.5) / Math.sqrt(n);
      const x = r * Math.cos(theta),
        y = r * Math.sin(theta),
        z = Math.sqrt(1 - (x * x + y * y));
      assert.deepEqual(points[k], [x, y, z]);
    }
  }
});
test("hemisphere vectors have unit length and a positive Z", () => {
  for (const p of hemisphereSamples(64)) {
    near(
      p.reduce((s, x) => s + x * x, 0),
      1,
    );
    assert.ok(p[2] > 0);
  }
});
test("Poisson spiral follows upstream sequential accumulation", () => {
  for (const n of [4, 8, 16, 64]) {
    let r = 1 / n,
      a = 0;
    denoiseSamples(n).forEach((p) => {
      assert.deepEqual(p, [
        Math.cos(a) * Math.pow(r, 0.75),
        Math.sin(a) * Math.pow(r, 0.75),
      ]);
      r += 1 / n;
      a += (2 * Math.PI * 11) / n;
    });
  }
});
test("sample counts are bounded and reject invalid inputs", () => {
  for (const fn of [hemisphereSamples, denoiseSamples])
    for (const count of [0, -1, NaN, 1.5, Infinity, 4097])
      assert.throws(() => fn(count));
});
test("temporal sample offsets are deterministic and wrap into [0,1)", () => {
  assert.deepEqual(rotatedFrameNoise(0.2, 0.4, 0), [0.2, 0.4]);
  for (let f = 0; f < 1000; f++) {
    const r = rotatedFrameNoise(0.2, 0.4, f);
    assert.ok(r.every((x) => x >= 0 && x < 1));
    assert.deepEqual(r, rotatedFrameNoise(0.2, 0.4, f));
  }
});
test("history renders 1024 AO samples then stops resampling", () => {
  const h = new HistoryState();
  for (let f = 0; f < 66; f++) {
    const state = h.begin(identity, identity, true, 16);
    assert.equal(state.frame, f);
    assert.equal(state.render, f < 64);
    assert.equal(state.samples, Math.min(f + 1, 64) * 16);
  }
});
test("history invalidates on view, projection, and explicit reset", () => {
  const h = new HistoryState();
  h.begin(identity, identity, true, 16);
  assert.equal(h.begin(identity, identity, true, 16).frame, 1);
  const view = [...identity];
  view[12] = 0.1;
  assert.equal(h.begin(view, identity, true, 16).frame, 0);
  const projection = [...identity];
  projection[0] = 2;
  assert.equal(h.begin(view, projection, true, 16).frame, 0);
  h.begin(view, projection, true, 16);
  h.reset();
  assert.equal(h.begin(view, projection, true, 16).frame, 0);
});
test("history retains copies rather than aliases of camera matrices", () => {
  const h = new HistoryState(),
    view = [...identity];
  h.begin(view, identity, true, 8);
  view[12] = 1;
  assert.equal(h.begin(view, identity, true, 8).frame, 0);
});
test("accumulate=false uses stable frame-zero sampling", () => {
  const h = new HistoryState();
  for (let i = 0; i < 5; i++)
    assert.equal(h.begin(identity, identity, false, 16).frame, 0);
});
test("history ceil cap also handles custom sample counts", () => {
  const h = new HistoryState();
  assert.equal(h.begin(identity, identity, true, 13).limit, 79);
  assert.throws(() => h.begin([1], identity, true, 16));
});
test("explicit history average retains upstream alpha=1 behavior", () => {
  assert.deepEqual(
    accumulateRGBA([NaN, NaN, NaN, 0], [0.4, 0.5, 0.6, 0.2], 0),
    [0.4, 0.5, 0.6, 1],
  );
  const result = accumulateRGBA([0.8, 0.7, 0.6, 1], [0.2, 0.3, 0.4, 0.1], 1);
  result.slice(0, 3).forEach((x) => near(x, 0.5));
  assert.equal(result[3], 1);
});
