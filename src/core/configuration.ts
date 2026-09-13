import type {
  ConfigurationKey,
  N8AOConfiguration,
  QualityMode,
  RenderDimensions,
} from "../types.js";
/** Pure configuration layer: no DOM, GPU, or Three.js dependency. */
export const DepthType = Object.freeze({
  Default: 1,
  Log: 2,
  Reverse: 3,
} as const);
export const DISPLAY_MODES = Object.freeze([
  "Combined",
  "AO",
  "No AO",
  "Split",
  "Split AO",
] as const);
export const QUALITY_PRESETS: Readonly<
  Record<QualityMode, Readonly<Partial<N8AOConfiguration>>>
> = Object.freeze({
  Performance: Object.freeze({
    neuralDenoise: false,
    aoSamples: 8,
    denoiseSamples: 4,
    denoiseRadius: 12,
  }),
  Low: Object.freeze({
    neuralDenoise: false,
    aoSamples: 16,
    denoiseSamples: 4,
    denoiseRadius: 12,
  }),
  Medium: Object.freeze({
    neuralDenoise: false,
    aoSamples: 16,
    denoiseSamples: 8,
    denoiseRadius: 12,
  }),
  High: Object.freeze({
    neuralDenoise: false,
    aoSamples: 64,
    denoiseSamples: 8,
    denoiseRadius: 6,
  }),
  Ultra: Object.freeze({
    neuralDenoise: false,
    aoSamples: 64,
    denoiseSamples: 16,
    denoiseRadius: 6,
  }),
  "Neural-Low": Object.freeze({
    neuralDenoise: true,
    aoSamples: 16,
    denoiseSamples: 4,
    denoiseRadius: 12,
    denoiseIterations: 2,
    halfRes: false,
  }),
  "Neural-Medium": Object.freeze({
    neuralDenoise: true,
    aoSamples: 16,
    denoiseSamples: 8,
    denoiseRadius: 12,
    denoiseIterations: 2,
    halfRes: false,
  }),
  "Neural-High": Object.freeze({
    neuralDenoise: true,
    aoSamples: 16,
    denoiseSamples: 16,
    denoiseRadius: 12,
    denoiseIterations: 2,
    halfRes: false,
  }),
});
export const DEFAULT_CONFIGURATION: Readonly<N8AOConfiguration> = Object.freeze(
  {
    aoSamples: 16,
    aoRadius: 5,
    aoTones: 0,
    denoiseSamples: 8,
    denoiseRadius: 12,
    distanceFalloff: 1,
    intensity: 5,
    denoiseIterations: 2,
    renderMode: 0,
    biasOffset: 0,
    biasMultiplier: 0,
    color: Object.freeze({ r: 0, g: 0, b: 0 }),
    // Native RenderPipeline performs the display transform exactly once.
    gammaCorrection: false,
    depthBufferType: DepthType.Default,
    screenSpaceRadius: false,
    halfRes: false,
    depthAwareUpsampling: true,
    autoRenderBeauty: true,
    colorMultiply: true,
    transparencyAware: false,
    stencil: false,
    accumulate: false,
    neuralDenoise: false,
  },
);
const booleans = new Set(
  Object.keys(DEFAULT_CONFIGURATION).filter(
    (k) => typeof DEFAULT_CONFIGURATION[k as ConfigurationKey] === "boolean",
  ),
);
const integers = new Map<string, [number, number]>([
  ["aoSamples", [1, 256]],
  ["denoiseSamples", [1, 64]],
  ["denoiseIterations", [0, 8]],
  ["renderMode", [0, 4]],
  ["depthBufferType", [1, 3]],
]);
const positive = new Set(["aoRadius", "distanceFalloff"]);
const signed = new Set(["biasOffset", "biasMultiplier"]);
export const STRUCTURAL_KEYS = new Set([
  "aoSamples",
  "denoiseSamples",
  "halfRes",
  "depthAwareUpsampling",
  "neuralDenoise",
  "depthBufferType",
  "stencil",
]);
export function validateOption(key: string, value: unknown) {
  if (!Object.hasOwn(DEFAULT_CONFIGURATION, key))
    throw new TypeError(`Unknown N8AO option: ${String(key)}`);
  if (booleans.has(key)) {
    if (typeof value !== "boolean")
      throw new TypeError(`${key} must be a boolean.`);
  } else if (key === "color") {
    if (
      !value ||
      !["r", "g", "b"].every((c) =>
        Number.isFinite((value as Record<string, unknown>)[c]),
      )
    )
      throw new TypeError(
        "color must have finite r, g, and b components (for example, THREE.Color).",
      );
  } else if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${key} must be finite.`);
  } else if (integers.has(key)) {
    const [min, max] = integers.get(key)!;
    if (!Number.isInteger(value) || value < min || value > max)
      throw new RangeError(`${key} must be an integer in [${min}, ${max}].`);
  } else if (positive.has(key) ? value <= 0 : !signed.has(key) && value < 0) {
    throw new RangeError(
      `${key} must be ${positive.has(key) ? "positive" : "nonnegative"}.`,
    );
  }
}
/** Validate a batch before committing any changes; failed updates are atomic. */
export function mergeConfiguration(
  previous: N8AOConfiguration,
  patch: Partial<N8AOConfiguration>,
): N8AOConfiguration {
  if (!patch || typeof patch !== "object" || Array.isArray(patch))
    throw new TypeError("Configuration must be an object.");
  for (const [key, value] of Object.entries(patch)) validateOption(key, value);
  const next = { ...previous, ...patch };
  if (patch.neuralDenoise === true && !previous.neuralDenoise) {
    Object.assign(next, {
      aoSamples: 16,
      denoiseRadius: 12,
      denoiseIterations: 2,
      halfRes: false,
    });
    if (![4, 8, 16].includes(next.denoiseSamples)) next.denoiseSamples = 8;
  }
  return next;
}
export function neuralIncompatibilities(c: N8AOConfiguration): string[] {
  if (!c.neuralDenoise) return [];
  return [
    c.aoSamples !== 16 && "aoSamples must be 16",
    ![4, 8, 16].includes(c.denoiseSamples) &&
      "denoiseSamples must be 4, 8, or 16",
    c.denoiseRadius !== 12 && "denoiseRadius must be 12",
    c.denoiseIterations !== 2 && "denoiseIterations must be 2",
    c.halfRes && "halfRes must be false",
  ].filter((value): value is string => typeof value === "string");
}
/** Validates updates atomically and reports only changed settings. */
export class Configuration {
  readonly value: N8AOConfiguration;
  private readonly data: N8AOConfiguration;
  constructor(
    initial: Partial<N8AOConfiguration> = {},
    private readonly onChange: (
      keys: ConfigurationKey[],
      value: N8AOConfiguration,
    ) => void = () => {},
  ) {
    this.data = mergeConfiguration(
      { ...DEFAULT_CONFIGURATION, color: { ...DEFAULT_CONFIGURATION.color } },
      initial,
    );
    this.value = new Proxy(this.data, {
      set: (_target, key, value: unknown) => {
        this.update({ [key]: value });
        return true;
      },
      deleteProperty: () => {
        throw new TypeError("Configuration properties cannot be deleted.");
      },
      defineProperty: () => {
        throw new TypeError("Use configure() to update configuration.");
      },
    });
  }
  update(patch: Partial<N8AOConfiguration>): void {
    const next = mergeConfiguration(this.data, patch);
    const changed = (Object.keys(next) as ConfigurationKey[]).filter(
      (key) => next[key] !== this.data[key],
    );
    if (changed.length === 0) return;
    Object.assign(this.data, next);
    this.onChange(changed, this.data);
  }
}
export function createConfiguration(
  initial: Partial<N8AOConfiguration> = {},
  onChange?: (keys: ConfigurationKey[], value: N8AOConfiguration) => void,
) {
  const store = new Configuration(initial, onChange);
  return {
    configuration: store.value,
    update: (patch: Partial<N8AOConfiguration>) => store.update(patch),
  };
}
export function qualityPreset(name: QualityMode) {
  if (!Object.hasOwn(QUALITY_PRESETS, name))
    throw new RangeError(`Unknown N8AO quality mode: ${name}`);
  return { ...QUALITY_PRESETS[name] };
}
export function dimensions(
  width: number,
  height: number,
  halfRes = false,
): RenderDimensions {
  if (![width, height].every((x) => Number.isFinite(x) && x >= 0))
    throw new RangeError("Dimensions must be finite and nonnegative.");
  const w = Math.max(1, Math.floor(width)),
    h = Math.max(1, Math.floor(height));
  return {
    width: w,
    height: h,
    internalWidth: Math.max(1, Math.floor(w * (halfRes ? 0.5 : 1))),
    internalHeight: Math.max(1, Math.floor(h * (halfRes ? 0.5 : 1))),
  };
}
