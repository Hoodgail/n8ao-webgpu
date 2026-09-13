import type modelSchema from "../assets/NeuralDenoiseModel.json";
export type NeuralModelData = typeof modelSchema;
/** Validation and CPU inference for the attention-v3 model. */
export declare const MATRIX_LAYOUTS: readonly [readonly ["tapInputWeight", "tapInputWeights", 8, 9], readonly ["tapOutputWeight", "tapOutputWeights", 8, 8], readonly ["globalWeight", "globalWeights", 8, 3], readonly ["keyWeight", "keyProjectionWeights", 8, 8], readonly ["valueWeight", "valueProjectionWeights", 8, 8], readonly ["headWeight", "headWeights", 8, 32], readonly ["outputWeight", "outputWeights", 1, 8]];
export declare function validateModel(m: NeuralModelData): NeuralModelData;
export declare function foldedBias(weights: number[], bias: number[], means: number[], invStd: number[], rows: number, cols: number, scale: number, constants?: Record<number, number>): number[];
export declare function prepareModel(input: NeuralModelData): {
    model: {
        architecture: string;
        formatVersion: number;
        globalBias: number[];
        globalFeatureInverseStandardDeviation: number[];
        globalFeatureMean: number[];
        globalWeights: number[];
        headBias: number[];
        headWeights: number[];
        keyProjectionWeights: number[];
        name: string;
        outputBias: number;
        outputWeights: number[];
        quantization: {
            scales: {
                globalWeight: number;
                headWeight: number;
                keyWeight: number;
                outputWeight: number;
                tapInputWeight: number;
                tapOutputWeight: number;
                valueWeight: number;
            };
            scheme: string;
            zeroPoint: number;
        };
        summaryQueries: number[];
        supportedDenoiseSamples: number[];
        tapFeatureInverseStandardDeviation: number[];
        tapFeatureMean: number[];
        tapInputBias: number[];
        tapInputWeights: number[];
        tapOutputBias: number[];
        tapOutputWeights: number[];
        valueProjectionWeights: number[];
    };
    scales: {
        globalWeight: number;
        headWeight: number;
        keyWeight: number;
        outputWeight: number;
        tapInputWeight: number;
        tapOutputWeight: number;
        valueWeight: number;
    };
    tapBias: number[];
    globalBias: number[];
};
/** CPU evaluation using numerically stable online softmax. */
export declare function neuralResidual(input: NeuralModelData, taps: number[][], baselineAO: number, worldRadius: number, distanceFalloff: number): number;
/** Immutable model metadata and reusable CPU evaluation. */
export declare class NeuralModel {
    readonly data: NeuralModelData;
    constructor(data: NeuralModelData);
    evaluate(taps: number[][], visibility: number, radius: number, falloff: number): number;
}
//# sourceMappingURL=neural.d.ts.map