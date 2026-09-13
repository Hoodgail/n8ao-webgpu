import type { Color, OrthographicCamera, PerspectiveCamera } from "three";
import type { Denoiser } from "./rendering/Denoiser.js";
export type DisplayMode = "Combined" | "AO" | "No AO" | "Split" | "Split AO";
export type QualityMode =
  | "Performance"
  | "Low"
  | "Medium"
  | "High"
  | "Ultra"
  | "Neural-Low"
  | "Neural-Medium"
  | "Neural-High";

export interface N8AOConfiguration {
  aoSamples: number;
  aoRadius: number;
  aoTones: number;
  denoiseSamples: number;
  denoiseRadius: number;
  distanceFalloff: number;
  intensity: number;
  denoiseIterations: number;
  renderMode: 0 | 1 | 2 | 3 | 4;
  biasOffset: number;
  biasMultiplier: number;
  color:
    | Color
    | {
        r: number;
        g: number;
        b: number;
      };
  gammaCorrection: boolean;
  depthBufferType: 1 | 2 | 3;
  screenSpaceRadius: boolean;
  halfRes: boolean;
  depthAwareUpsampling: boolean;
  autoRenderBeauty: boolean;
  colorMultiply: boolean;
  transparencyAware: boolean;
  stencil: boolean;
  accumulate: boolean;
  neuralDenoise: boolean;
}
export interface N8AOOptions extends Partial<N8AOConfiguration> {
  denoiser?: Denoiser | null;
  width?: number;
  height?: number;
  autoSize?: boolean;
  requireWebGPU?: boolean;
  autoDetectTransparency?: boolean;
}

export type N8AOCamera = PerspectiveCamera | OrthographicCamera;
export type ConfigurationKey = keyof N8AOConfiguration;
export interface RenderDimensions {
  width: number;
  height: number;
  internalWidth: number;
  internalHeight: number;
}
