import type { Textures } from "../rendering/Textures.js";
import type { Uniforms } from "../rendering/Uniforms.js";
import type { createGeometry } from "./common.js";
export type { Textures, Uniforms };
export interface ShaderOptions {
  aoSamples: number;
  denoiseSamples: number;
  halfRes: boolean;
  depthAwareUpsampling: boolean;
  depthType: 1 | 2 | 3;
  orthographic: boolean;
}
export type GeometryNodes = ReturnType<typeof createGeometry>;
