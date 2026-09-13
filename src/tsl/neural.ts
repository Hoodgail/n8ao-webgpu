import { exp, float, max } from "three/tsl";
import type { Node } from "three/webgpu";
import type { NeuralModelData } from "../core/neural.js";
import { prepareModel } from "../core/neural.js";
type Scalar = Node<"float">;
interface AttentionState {
  maxima: Scalar[];
  denominators: Scalar[];
  summary: Scalar[][];
}
/** TSL inference for the quantized attention model. */
export function neuralKernel(model: NeuralModelData) {
  const { model: m, scales: s, tapBias, globalBias } = prepareModel(model);
  const zeros = new Array(8).fill(0);
  function dense(
    x: Scalar[],
    w: number[],
    width: number,
    bias: number[],
    scale: number,
    relu = false,
  ): Scalar[] {
    return bias.map((b, row) => {
      let sum: Scalar = float(0);
      x.forEach((v, j) => {
        const weight = w[row * width + j];
        if (weight !== 0) sum = sum.add(v.mul(weight));
      });
      const value = sum.mul(scale).add(b);
      return (relu ? max(value, 0) : value).toVar();
    });
  }
  function createState(): AttentionState {
    return {
      maxima: Array.from({ length: 4 }, () => float(-1e30).toVar()),
      denominators: Array.from({ length: 4 }, () => float(0).toVar()),
      summary: Array.from({ length: 4 }, () =>
        Array.from({ length: 8 }, () => float(0).toVar()),
      ),
    };
  }
  function consume(state: AttentionState, token: Scalar[]) {
    const key = dense(token, m.keyProjectionWeights, 8, zeros, s.keyWeight),
      value = dense(token, m.valueProjectionWeights, 8, zeros, s.valueWeight);
    for (let q = 0; q < 4; q++) {
      let score: Scalar = float(0);
      key.forEach((k, i) => {
        score = score.add(k.mul(m.summaryQueries[q * 8 + i]));
      });
      score = score.mul(0.3535533905932738).toVar();
      const maximum = max(state.maxima[q], score).toVar();
      const oldScale = exp(state.maxima[q].sub(maximum)).toVar(),
        newScale = exp(score.sub(maximum)).toVar();
      state.summary[q].forEach((v, i) =>
        v.assign(v.mul(oldScale).add(value[i].mul(newScale))),
      );
      state.denominators[q].assign(
        state.denominators[q].mul(oldScale).add(newScale),
      );
      state.maxima[q].assign(maximum);
    }
  }
  function tap(state: AttentionState, raw: Scalar[]) {
    const scaled = raw.map((v, i) =>
      v.mul(m.tapFeatureInverseStandardDeviation[i]),
    );
    consume(
      state,
      dense(
        dense(scaled, m.tapInputWeights, 9, tapBias, s.tapInputWeight, true),
        m.tapOutputWeights,
        8,
        m.tapOutputBias,
        s.tapOutputWeight,
        true,
      ),
    );
  }
  function finish(
    state: AttentionState,
    baseline: Scalar,
    radius: Scalar,
    falloff: Scalar,
  ) {
    const raw = [baseline, radius.max(1e-6).log(), falloff.max(1e-6).log()];
    const scaled = raw.map((v, i) =>
      v.mul(m.globalFeatureInverseStandardDeviation[i]),
    );
    consume(
      state,
      dense(scaled, m.globalWeights, 3, globalBias, s.globalWeight, true),
    );
    const flat = state.summary.flatMap((row, q) =>
      row.map((v) => v.div(state.denominators[q].max(1e-12))),
    );
    const head = dense(flat, m.headWeights, 32, m.headBias, s.headWeight, true);
    return dense(head, m.outputWeights, 8, [m.outputBias], s.outputWeight)[0];
  }
  return { createState, tap, finish };
}
