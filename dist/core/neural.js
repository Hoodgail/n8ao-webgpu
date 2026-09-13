/** Validation and CPU inference for the attention-v3 model. */
export const MATRIX_LAYOUTS = Object.freeze([
    ["tapInputWeight", "tapInputWeights", 8, 9],
    ["tapOutputWeight", "tapOutputWeights", 8, 8],
    ["globalWeight", "globalWeights", 8, 3],
    ["keyWeight", "keyProjectionWeights", 8, 8],
    ["valueWeight", "valueProjectionWeights", 8, 8],
    ["headWeight", "headWeights", 8, 32],
    ["outputWeight", "outputWeights", 1, 8],
]);
const finiteArray = (a, n) => Array.isArray(a) && a.length === n && a.every(Number.isFinite);
export function validateModel(m) {
    if (!m ||
        m.architecture !== "attention-v3-int8" ||
        m.formatVersion !== 3 ||
        m.quantization?.scheme !== "symmetric-int8-per-tensor" ||
        m.quantization?.zeroPoint !== 0 ||
        m.supportedDenoiseSamples?.join(",") !== "4,8,16")
        throw new TypeError("Unsupported N8AO neural model.");
    for (const [scale, field, rows, cols] of MATRIX_LAYOUTS) {
        if (!finiteArray(m[field], rows * cols) ||
            m[field].some((x) => !Number.isInteger(x) || x < -127 || x > 127))
            throw new TypeError(`Invalid int8 tensor: ${field}`);
        if (!(m.quantization.scales?.[scale] > 0) ||
            !Number.isFinite(m.quantization.scales[scale]))
            throw new TypeError(`Invalid scale: ${scale}`);
    }
    for (const [field, n] of [
        ["tapInputBias", 8],
        ["tapOutputBias", 8],
        ["globalBias", 8],
        ["headBias", 8],
        ["summaryQueries", 32],
        ["tapFeatureMean", 9],
        ["tapFeatureInverseStandardDeviation", 9],
        ["globalFeatureMean", 3],
        ["globalFeatureInverseStandardDeviation", 3],
    ]) {
        if (!finiteArray(m[field], n))
            throw new TypeError(`Invalid model vector: ${field}`);
    }
    if (!Number.isFinite(m.outputBias))
        throw new TypeError("Invalid output bias.");
    return m;
}
export function foldedBias(weights, bias, means, invStd, rows, cols, scale, constants = {}) {
    return Array.from({ length: rows }, (_, row) => {
        let value = bias[row];
        for (let col = 0; col < cols; col++) {
            const w = weights[row * cols + col] * scale;
            value -= w * invStd[col] * means[col];
            if (Object.hasOwn(constants, col))
                value += w * invStd[col] * constants[col];
        }
        return value;
    });
}
export function prepareModel(input) {
    const m = validateModel(input), scales = m.quantization.scales;
    return {
        model: m,
        scales,
        tapBias: foldedBias(m.tapInputWeights, m.tapInputBias, m.tapFeatureMean, m.tapFeatureInverseStandardDeviation, 8, 9, scales.tapInputWeight, { 8: 1 }),
        globalBias: foldedBias(m.globalWeights, m.globalBias, m.globalFeatureMean, m.globalFeatureInverseStandardDeviation, 8, 3, scales.globalWeight),
    };
}
function dense(x, w, width, bias, scale, relu = false) {
    return bias.map((b, row) => {
        let sum = 0;
        for (let j = 0; j < x.length; j++)
            sum += w[row * width + j] * x[j];
        const y = scale * sum + b;
        return relu ? Math.max(0, y) : y;
    });
}
/** CPU evaluation using numerically stable online softmax. */
export function neuralResidual(input, taps, baselineAO, worldRadius, distanceFalloff) {
    const { model: m, scales: s, tapBias, globalBias } = prepareModel(input);
    if (!Number.isFinite(baselineAO) ||
        !(worldRadius > 0) ||
        !(distanceFalloff > 0))
        throw new RangeError("Invalid neural global features.");
    const zeros = new Array(8).fill(0);
    const tokens = taps.map((tap) => {
        if (!finiteArray(tap, 8))
            throw new TypeError("Each neural tap must contain eight finite features.");
        const x = tap.map((v, i) => v * m.tapFeatureInverseStandardDeviation[i]);
        return dense(dense(x, m.tapInputWeights, 9, tapBias, s.tapInputWeight, true), m.tapOutputWeights, 8, m.tapOutputBias, s.tapOutputWeight, true);
    });
    const globalRaw = [
        baselineAO,
        Math.log(Math.max(worldRadius, 1e-6)),
        Math.log(Math.max(distanceFalloff, 1e-6)),
    ];
    tokens.push(dense(globalRaw.map((x, i) => x * m.globalFeatureInverseStandardDeviation[i]), m.globalWeights, 3, globalBias, s.globalWeight, true));
    const maxima = new Array(4).fill(-1e30), denom = new Array(4).fill(0), summary = Array.from({ length: 4 }, () => new Array(8).fill(0));
    for (const token of tokens) {
        const key = dense(token, m.keyProjectionWeights, 8, zeros, s.keyWeight), value = dense(token, m.valueProjectionWeights, 8, zeros, s.valueWeight);
        for (let q = 0; q < 4; q++) {
            const score = key.reduce((sum, k, i) => sum + k * m.summaryQueries[q * 8 + i], 0) *
                0.3535533905932738;
            const maximum = Math.max(maxima[q], score), oldScale = Math.exp(maxima[q] - maximum), newScale = Math.exp(score - maximum);
            for (let i = 0; i < 8; i++)
                summary[q][i] = summary[q][i] * oldScale + value[i] * newScale;
            denom[q] = denom[q] * oldScale + newScale;
            maxima[q] = maximum;
        }
    }
    const flat = summary.flatMap((row, q) => row.map((x) => x / Math.max(denom[q], 1e-12)));
    const head = dense(flat, m.headWeights, 32, m.headBias, s.headWeight, true);
    return dense(head, m.outputWeights, 8, [m.outputBias], s.outputWeight)[0];
}
/** Immutable model metadata and reusable CPU evaluation. */
export class NeuralModel {
    data;
    constructor(data) {
        this.data = validateModel(data);
    }
    evaluate(taps, visibility, radius, falloff) {
        return neuralResidual(this.data, taps, visibility, radius, falloff);
    }
}
//# sourceMappingURL=neural.js.map