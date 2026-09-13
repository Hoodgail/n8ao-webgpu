import blueNoise from "./BlueNoise.js";
export { blueNoise };
export declare const model: {
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
//# sourceMappingURL=data.d.ts.map