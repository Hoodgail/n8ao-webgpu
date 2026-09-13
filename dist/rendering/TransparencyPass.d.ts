import type { Scene } from "three";
import type { WebGPURenderer } from "three/webgpu";
import type { N8AOCamera } from "../types.js";
import type { RenderResources } from "./RenderResources.js";
import type { ShaderPipeline } from "./ShaderPipeline.js";
export declare class TransparencyPass {
    render(renderer: WebGPURenderer, scene: Scene, camera: N8AOCamera, resources: RenderResources, shaders: ShaderPipeline): void;
}
//# sourceMappingURL=TransparencyPass.d.ts.map