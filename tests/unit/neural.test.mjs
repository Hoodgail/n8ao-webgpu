import test from "node:test";
import assert from "node:assert/strict";
import {
  MATRIX_LAYOUTS,
  validateModel,
  prepareModel,
  neuralResidual,
} from "../../dist/core/neural.js";
/** Synthetic layout fixture: exercises inference arithmetic, not a shader execution test. */
function fixture() {
  const m = {
    architecture: "attention-v3-int8",
    formatVersion: 3,
    supportedDenoiseSamples: [4, 8, 16],
    quantization: {
      scheme: "symmetric-int8-per-tensor",
      zeroPoint: 0,
      scales: {},
    },
    outputBias: 0.01,
  };
  for (const [scale, field, rows, cols] of MATRIX_LAYOUTS) {
    m.quantization.scales[scale] = 0.01;
    m[field] = Array.from(
      { length: rows * cols },
      (_, i) => ((i * 7) % 11) - 5,
    );
  }
  for (const [field, n] of [
    ["tapInputBias", 8],
    ["tapOutputBias", 8],
    ["globalBias", 8],
    ["headBias", 8],
    ["summaryQueries", 32],
  ])
    m[field] = Array.from({ length: n }, (_, i) => ((i % 3) - 1) * 0.1);
  m.tapFeatureMean = Array.from({ length: 9 }, (_, i) => i * 0.01);
  m.tapFeatureMean[8] = 1;
  m.tapFeatureInverseStandardDeviation = new Array(9).fill(2);
  m.globalFeatureMean = [0.9, -0.5, 0.03];
  m.globalFeatureInverseStandardDeviation = [2, 3, 4];
  return m;
}
function naive(m, taps, baseline, radius, falloff) {
  const s = m.quantization.scales;
  const layer = (x, w, width, bias, scale, relu = false) =>
    bias.map((b, r) => {
      const y = x.reduce((sum, v, j) => sum + v * w[r * width + j] * scale, b);
      return relu ? Math.max(0, y) : y;
    });
  const norm = (x, mean, inv) => x.map((v, i) => (v - mean[i]) * inv[i]);
  const tokens = taps.map((t) =>
    layer(
      layer(
        norm([...t, 1], m.tapFeatureMean, m.tapFeatureInverseStandardDeviation),
        m.tapInputWeights,
        9,
        m.tapInputBias,
        s.tapInputWeight,
        true,
      ),
      m.tapOutputWeights,
      8,
      m.tapOutputBias,
      s.tapOutputWeight,
      true,
    ),
  );
  tokens.push(
    layer(
      norm(
        [
          baseline,
          Math.log(Math.max(radius, 1e-6)),
          Math.log(Math.max(falloff, 1e-6)),
        ],
        m.globalFeatureMean,
        m.globalFeatureInverseStandardDeviation,
      ),
      m.globalWeights,
      3,
      m.globalBias,
      s.globalWeight,
      true,
    ),
  );
  const keys = tokens.map((t) =>
    layer(t, m.keyProjectionWeights, 8, new Array(8).fill(0), s.keyWeight),
  );
  const values = tokens.map((t) =>
    layer(t, m.valueProjectionWeights, 8, new Array(8).fill(0), s.valueWeight),
  );
  const summaries = Array.from({ length: 4 }, (_, q) => {
    const scores = keys.map(
      (k) =>
        k.reduce((sum, v, i) => sum + v * m.summaryQueries[q * 8 + i], 0) *
        Math.SQRT1_2 *
        0.5,
    );
    const maximum = Math.max(...scores),
      weights = scores.map((v) => Math.exp(v - maximum)),
      total = weights.reduce((a, b) => a + b, 0);
    return Array.from({ length: 8 }, (_, i) =>
      values.reduce((sum, v, j) => sum + (v[i] * weights[j]) / total, 0),
    );
  }).flat();
  return layer(
    layer(summaries, m.headWeights, 32, m.headBias, s.headWeight, true),
    m.outputWeights,
    8,
    [m.outputBias],
    s.outputWeight,
  )[0];
}
test("neural layout validates every tensor and scale", () => {
  assert.equal(validateModel(fixture()).formatVersion, 3);
  for (const [scale, field] of MATRIX_LAYOUTS) {
    const a = fixture();
    a[field][0] = 128;
    assert.throws(() => validateModel(a));
    const b = fixture();
    b.quantization.scales[scale] = 0;
    assert.throws(() => validateModel(b));
  }
});
test("neural malformed normalization and architecture fail early", () => {
  const a = fixture();
  a.tapFeatureMean.pop();
  assert.throws(() => validateModel(a));
  const b = fixture();
  b.architecture = "other";
  assert.throws(() => validateModel(b));
});
test("folded normalization equals explicit nine-input preprocessing", () => {
  const m = fixture(),
    p = prepareModel(m),
    raw = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1];
  for (let r = 0; r < 8; r++) {
    let expected = m.tapInputBias[r],
      actual = p.tapBias[r];
    for (let i = 0; i < 9; i++)
      expected +=
        m.tapInputWeights[r * 9 + i] *
        p.scales.tapInputWeight *
        (raw[i] - m.tapFeatureMean[i]) *
        m.tapFeatureInverseStandardDeviation[i];
    for (let i = 0; i < 8; i++)
      actual +=
        m.tapInputWeights[r * 9 + i] *
        p.scales.tapInputWeight *
        raw[i] *
        m.tapFeatureInverseStandardDeviation[i];
    assert.ok(Math.abs(actual - expected) < 1e-12);
  }
});
test("online attention matches independent batched softmax on synthetic inputs", () => {
  const m = fixture();
  for (const n of [0, 1, 4, 8, 16]) {
    const taps = Array.from({ length: n }, (_, j) =>
      Array.from({ length: 8 }, (_, i) => Math.sin(i + j) * 0.5),
    );
    const actual = neuralResidual(m, taps, 0.8, 2, 0.5),
      expected = naive(m, taps, 0.8, 2, 0.5);
    assert.ok(Math.abs(actual - expected) < 1e-12);
  }
});
test("neural invalid runtime features reject rather than produce silent NaNs", () => {
  assert.throws(() => neuralResidual(fixture(), [[NaN]], 0.8, 2, 0.5));
  assert.throws(() => neuralResidual(fixture(), [], 0.8, 0, 0.5));
});
// Verify the model bytes independently of the numerical inference tests.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
const originalModelBytes = readFileSync(
  new URL("../../dist/assets/NeuralDenoiseModel.json", import.meta.url),
);
const originalModel = JSON.parse(originalModelBytes.toString("utf8"));
test("bundled original neural model has the exact upstream Git blob SHA", () => {
  const sha = createHash("sha1")
    .update(`blob ${originalModelBytes.length}\0`)
    .update(originalModelBytes)
    .digest("hex");
  assert.equal(sha, "f36c9288faf87f2aeb5d5001b094e0bbfc3c1915");
  assert.equal(validateModel(originalModel).architecture, "attention-v3-int8");
});
test("real upstream neural weights: online attention agrees with independent batched inference", () => {
  for (const n of [0, 1, 4, 8, 16])
    for (const radius of [0.2, 1, 5]) {
      const taps = Array.from({ length: n }, (_, j) => [
        Math.sin(j) * 0.2,
        Math.cos(j) * 0.2,
        0.05 * j,
        0,
        0,
        1,
        0.5 + 0.02 * j,
        0.1 * j,
      ]);
      const actual = neuralResidual(originalModel, taps, 0.83, radius, 0.7);
      const expected = naive(originalModel, taps, 0.83, radius, 0.7);
      assert.ok(Number.isFinite(actual));
      assert.ok(
        Math.abs(actual - expected) < 1e-9,
        `${n} taps, radius ${radius}: ${actual} vs ${expected}`,
      );
    }
});
test("real upstream attention is permutation-invariant within CPU rounding tolerance", () => {
  const taps = Array.from({ length: 16 }, (_, j) => [
    Math.sin(j) * 0.1,
    Math.cos(j) * 0.1,
    0.01 * j,
    0,
    0,
    1,
    0.6 + 0.01 * j,
    0.05 * j,
  ]);
  const a = neuralResidual(originalModel, taps, 0.8, 2, 1),
    b = neuralResidual(originalModel, [...taps].reverse(), 0.8, 2, 1);
  assert.ok(Math.abs(a - b) < 1e-9);
});
