import type { ConfigurationKey, N8AOConfiguration, QualityMode, RenderDimensions } from "../types.js";
/** Pure configuration layer: no DOM, GPU, or Three.js dependency. */
export declare const DepthType: Readonly<{
    readonly Default: 1;
    readonly Log: 2;
    readonly Reverse: 3;
}>;
export declare const DISPLAY_MODES: readonly ["Combined", "AO", "No AO", "Split", "Split AO"];
export declare const QUALITY_PRESETS: Readonly<Record<QualityMode, Readonly<Partial<N8AOConfiguration>>>>;
export declare const DEFAULT_CONFIGURATION: Readonly<N8AOConfiguration>;
export declare const STRUCTURAL_KEYS: Set<string>;
export declare function validateOption(key: string, value: unknown): void;
/** Validate a batch before committing any changes; failed updates are atomic. */
export declare function mergeConfiguration(previous: N8AOConfiguration, patch: Partial<N8AOConfiguration>): N8AOConfiguration;
export declare function neuralIncompatibilities(c: N8AOConfiguration): string[];
/** Validates updates atomically and reports only changed settings. */
export declare class Configuration {
    private readonly onChange;
    readonly value: N8AOConfiguration;
    private readonly data;
    constructor(initial?: Partial<N8AOConfiguration>, onChange?: (keys: ConfigurationKey[], value: N8AOConfiguration) => void);
    update(patch: Partial<N8AOConfiguration>): void;
}
export declare function createConfiguration(initial?: Partial<N8AOConfiguration>, onChange?: (keys: ConfigurationKey[], value: N8AOConfiguration) => void): {
    configuration: N8AOConfiguration;
    update: (patch: Partial<N8AOConfiguration>) => void;
};
export declare function qualityPreset(name: QualityMode): {
    aoSamples?: number | undefined;
    aoRadius?: number | undefined;
    aoTones?: number | undefined;
    denoiseSamples?: number | undefined;
    denoiseRadius?: number | undefined;
    distanceFalloff?: number | undefined;
    intensity?: number | undefined;
    denoiseIterations?: number | undefined;
    renderMode?: 0 | 2 | 1 | 3 | 4 | undefined;
    biasOffset?: number | undefined;
    biasMultiplier?: number | undefined;
    color?: import("three").Color | {
        r: number;
        g: number;
        b: number;
    } | undefined;
    gammaCorrection?: boolean | undefined;
    depthBufferType?: 2 | 1 | 3 | undefined;
    screenSpaceRadius?: boolean | undefined;
    halfRes?: boolean | undefined;
    depthAwareUpsampling?: boolean | undefined;
    autoRenderBeauty?: boolean | undefined;
    colorMultiply?: boolean | undefined;
    transparencyAware?: boolean | undefined;
    stencil?: boolean | undefined;
    accumulate?: boolean | undefined;
    neuralDenoise?: boolean | undefined;
};
export declare function dimensions(width: number, height: number, halfRes?: boolean): RenderDimensions;
//# sourceMappingURL=configuration.d.ts.map