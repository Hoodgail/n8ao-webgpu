import type { Scene } from "three";
import { nodeObject } from "three/tsl";
import { N8AONode } from "./N8AONode.js";
import type { N8AOCamera, N8AOOptions } from "./types.js";
export {
  DEFAULT_CONFIGURATION,
  DepthType,
  QUALITY_PRESETS,
} from "./core/configuration.js";
export { N8AOPass } from "./N8AOPass.js";
export { N8AOPostPass } from "./N8AOPostPass.js";
export type * from "./types.js";
export { N8AONode };
export const n8ao = (
  scene: Scene,
  camera: N8AOCamera,
  options: N8AOOptions = {},
): N8AONode => nodeObject(new N8AONode(scene, camera, options));

export { BilateralDenoiser, NeuralDenoiser } from "./rendering/Denoiser.js";
export type { Denoiser, DenoiserContext } from "./rendering/Denoiser.js";
