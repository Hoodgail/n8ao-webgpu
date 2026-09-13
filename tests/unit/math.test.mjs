import test from "node:test";
import assert from "node:assert/strict";
import {
  perspectiveDepthToDistance,
  orthographicDepthToDistance,
  logarithmicDepthToDistance,
  logarithmicToDeviceDepth,
  reconstructView,
  bilateralWeight,
  compositePixel,
} from "../../dist/core/math.js";
import { DEFAULT_CONFIGURATION } from "../../dist/core/configuration.js";
const close = (x, y) => assert.ok(Math.abs(x - y) < 1e-8, `${x} != ${y}`);
test("perspective and orthographic depth endpoints agree", () => {
  for (const [near, far] of [
    [0.1, 1000],
    [1, 10],
  ]) {
    close(perspectiveDepthToDistance(0, near, far), near);
    close(perspectiveDepthToDistance(1, near, far), far);
    close(orthographicDepthToDistance(0, near, far), near);
    close(orthographicDepthToDistance(1, near, far), far);
  }
});
test("logarithmic depth conversion reproduces view distance", () => {
  const near = 0.1,
    far = 1000;
  for (const distance of [0.2, 1, 10, 100, 500]) {
    const d = Math.log2(distance + 1) / Math.log2(far + 1);
    close(logarithmicDepthToDistance(d, far), distance);
    close(
      perspectiveDepthToDistance(
        logarithmicToDeviceDepth(d, near, far),
        near,
        far,
      ),
      distance,
    );
  }
});
test("UV reconstruction flips screen Y once and treats WebGPU Z as [0,1]", () => {
  const id = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  assert.deepEqual(reconstructView([0, 0], 0.25, id, true), [-1, 1, 0.25]);
  assert.deepEqual(reconstructView([1, 1], 0.25, id, false), [1, -1, -0.5]);
});
test("bilateral weights reject backgrounds and opposing normals", () => {
  assert.equal(bilateralWeight([0, 0, 0], [0, 0, 1], [0, 0, 1], 1), 1);
  assert.equal(bilateralWeight([0, 0, 0], [0, 0, 1], [0, 0, -1], 1), 0);
  assert.equal(bilateralWeight([0, 0, 0], [0, 0, 1], [0, 0, 1], 1, true), 0);
  close(bilateralWeight([0, 0, 1], [0, 0, 1], [0, 0, 1], 1), Math.exp(-1));
});
test("intensity, AO-only and beauty-only modes have the original meaning", () => {
  const scene = [0.8, 0.4, 0.2, 0.6],
    c = { ...DEFAULT_CONFIGURATION, intensity: 2 };
  assert.deepEqual(compositePixel(scene, 0.5, c), [0.2, 0.1, 0.05, 0.6]);
  assert.deepEqual(
    compositePixel(scene, 0.5, { ...c, renderMode: 1 }),
    [0.25, 0.25, 0.25, 0.6],
  );
  assert.deepEqual(compositePixel(scene, 0.5, { ...c, renderMode: 2 }), scene);
});
test("full fog or transparency removes the AO contribution", () => {
  const scene = [0.8, 0.4, 0.2, 0.6],
    c = DEFAULT_CONFIGURATION;
  assert.deepEqual(compositePixel(scene, 0.1, c, 0.25, 512, 1, 0), scene);
  assert.deepEqual(compositePixel(scene, 0.1, c, 0.25, 512, 0, 1), scene);
});
test("split divider preserves original right-side-only white stripe", () => {
  const scene = [0.8, 0.4, 0.2, 0.6],
    c = { ...DEFAULT_CONFIGURATION, renderMode: 4, intensity: 1 };
  assert.deepEqual(compositePixel(scene, 0.5, c, 0.499, 512), scene);
  assert.deepEqual(compositePixel(scene, 0.5, c, 0.5, 512), [1, 1, 1, 1]);
  assert.deepEqual(
    compositePixel(scene, 0.5, c, 0.75, 512),
    [0.5, 0.5, 0.5, 0.6],
  );
});
test("toon quantization rounds AO visibility upward", () => {
  const c = {
    ...DEFAULT_CONFIGURATION,
    intensity: 1,
    aoTones: 4,
    renderMode: 1,
  };
  assert.deepEqual(compositePixel([1, 1, 1, 1], 0.3, c), [0.5, 0.5, 0.5, 1]);
});
import { legacyTexelToTopLeft } from "../../dist/core/math.js";
test("legacy texel addressing agrees at even-resolution pixel centers", () => {
  for (let y = 0; y < 72; y++)
    for (let x = 0; x < 96; x++)
      assert.deepEqual(
        legacyTexelToTopLeft(
          [(x + 0.5) / 96, (y + 0.5) / 72],
          [96, 72],
          [96, 72],
        ),
        [x, y],
      );
});
test("odd half-res UPSAMPLING preserves conversion after GL integer truncation", () => {
  const uv = [0.5, 0.2],
    shader = [96.5, 72.5],
    allocation = [96, 72];
  const expected = [
    Math.trunc(uv[0] * 96.5),
    71 - Math.trunc((1 - uv[1]) * 72.5),
  ];
  assert.deepEqual(legacyTexelToTopLeft(uv, shader, allocation), expected);
  assert.notEqual(expected[1], Math.trunc(uv[1] * 72.5));
});
import {
  gpuProjectionToLegacy,
  multiplyMatrixVector,
} from "../../dist/core/math.js";
test("legacy clip bridge leaves window-depth and XY projection unchanged", () => {
  const p = [
    1.7, 0, 0, 0, 0, 2.1, 0, 0, 0.03, -0.02, -1.001001001001001, -1, 0, 0,
    -0.10010010010010009, 0,
  ];
  const legacy = gpuProjectionToLegacy(p);
  for (const point of [
    [1, 2, -3, 1],
    [-2, 1, -30, 1],
    [0, 0, -0.1, 1],
  ]) {
    const a = multiplyMatrixVector(p, point),
      b = multiplyMatrixVector(legacy, point);
    close(a[0] / a[3], b[0] / b[3]);
    close(a[1] / a[3], b[1] / b[3]);
    close(a[2] / a[3], (b[2] / b[3]) * 0.5 + 0.5);
  }
});
test("projection bridge rejects non-finite or incomplete matrices", () => {
  assert.throws(() => gpuProjectionToLegacy([1]));
  const m = new Array(16).fill(0);
  m[1] = Infinity;
  assert.throws(() => gpuProjectionToLegacy(m));
});
