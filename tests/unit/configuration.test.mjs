import test from "node:test";
import assert from "node:assert/strict";
import {
  createConfiguration,
  dimensions,
  qualityPreset,
  neuralIncompatibilities,
  DEFAULT_CONFIGURATION,
  mergeConfiguration,
} from "../../dist/core/configuration.js";
test("configuration preserves upstream sampling defaults, with linear native output", () => {
  const { configuration: c } = createConfiguration();
  assert.equal(c.aoSamples, 16);
  assert.equal(c.denoiseSamples, 8);
  assert.equal(c.intensity, 5);
  assert.equal(c.gammaCorrection, false);
});
test("configuration updates notify only changed keys", () => {
  const calls = [];
  const { configuration: c } = createConfiguration({}, (keys) =>
    calls.push(keys),
  );
  c.intensity = 5;
  c.intensity = 3;
  assert.deepEqual(calls, [["intensity"]]);
});
test("failed batch update is atomic", () => {
  const { configuration: c, update } = createConfiguration();
  assert.throws(() => update({ intensity: 8, aoSamples: 0 }));
  assert.equal(c.intensity, 5);
  assert.equal(c.aoSamples, 16);
});
test("all invalid scalar settings reject early", () => {
  const { configuration: c } = createConfiguration();
  for (const [key, value] of [
    ["aoSamples", 1.2],
    ["denoiseSamples", 65],
    ["denoiseIterations", -1],
    ["renderMode", 5],
    ["depthBufferType", 4],
    ["aoRadius", 0],
    ["distanceFalloff", 0],
    ["intensity", NaN],
    ["halfRes", 1],
    ["unknown", 2],
  ])
    assert.throws(() => {
      c[key] = value;
    });
});
test("negative finite bias is permitted", () => {
  const { configuration: c } = createConfiguration({
    biasOffset: -0.01,
    biasMultiplier: -0.2,
  });
  assert.equal(c.biasOffset, -0.01);
});
test("configuration is not deletable or re-definable", () => {
  const { configuration: c } = createConfiguration();
  assert.throws(() => delete c.aoSamples);
  assert.throws(() => Object.defineProperty(c, "intensity", { value: 1 }));
});
test("colors are per-instance and checked for finite components", () => {
  const a = createConfiguration().configuration,
    b = createConfiguration().configuration;
  a.color.r = 0.2;
  assert.equal(b.color.r, 0);
  assert.throws(() => {
    a.color = { r: 1, g: 0, b: Infinity };
  });
});
test("enabling neural denoise selects supported full-resolution settings", () => {
  const { configuration: c } = createConfiguration({
    halfRes: true,
    aoSamples: 8,
    denoiseSamples: 3,
  });
  c.neuralDenoise = true;
  assert.equal(c.halfRes, false);
  assert.equal(c.aoSamples, 16);
  assert.equal(c.denoiseSamples, 8);
  assert.equal(c.denoiseIterations, 2);
  assert.deepEqual(neuralIncompatibilities(c), []);
});
test("unsupported later neural settings return explicit reasons", () => {
  const { configuration: c } = createConfiguration({ neuralDenoise: true });
  c.aoSamples = 64;
  c.halfRes = true;
  assert.deepEqual(neuralIncompatibilities(c), [
    "aoSamples must be 16",
    "halfRes must be false",
  ]);
});
test("all eight quality presets are independently copyable", () => {
  for (const name of [
    "Performance",
    "Low",
    "Medium",
    "High",
    "Ultra",
    "Neural-Low",
    "Neural-Medium",
    "Neural-High",
  ]) {
    const first = qualityPreset(name),
      second = qualityPreset(name);
    first.aoSamples = 1;
    assert.notEqual(first.aoSamples, second.aoSamples);
  }
  assert.throws(() => qualityPreset("Unknown"));
});
test("odd and tiny half-res targets cannot allocate zero-sized textures", () => {
  assert.deepEqual(dimensions(641, 359, true), {
    width: 641,
    height: 359,
    internalWidth: 320,
    internalHeight: 179,
  });
  assert.deepEqual(dimensions(0, 0, true), {
    width: 1,
    height: 1,
    internalWidth: 1,
    internalHeight: 1,
  });
  assert.throws(() => dimensions(-1, 2));
  assert.throws(() => dimensions(Infinity, 2));
});
test("normal high quality does not silently override unrelated settings", () => {
  const c = mergeConfiguration(
    { ...DEFAULT_CONFIGURATION, halfRes: true },
    qualityPreset("High"),
  );
  assert.equal(c.aoSamples, 64);
  assert.equal(c.denoiseRadius, 6);
  assert.equal(c.halfRes, true);
});
