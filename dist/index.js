import { nodeObject } from "three/tsl";
import { N8AONode } from "./N8AONode.js";
export { DEFAULT_CONFIGURATION, DepthType, QUALITY_PRESETS, } from "./core/configuration.js";
export { N8AOPass } from "./N8AOPass.js";
export { N8AOPostPass } from "./N8AOPostPass.js";
export { N8AONode };
export const n8ao = (scene, camera, options = {}) => nodeObject(new N8AONode(scene, camera, options));
export { BilateralDenoiser, NeuralDenoiser } from "./rendering/Denoiser.js";
//# sourceMappingURL=index.js.map