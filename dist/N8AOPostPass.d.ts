import type { RenderTarget, Scene, Texture } from "three";
import type { WebGPURenderer } from "three/webgpu";
import { N8AOPass } from "./N8AOPass.js";
import type { N8AOCamera, N8AOOptions } from "./types.js";
/** Explicit rendering adapter for external beauty and depth buffers. */
export declare class N8AOPostPass extends N8AOPass {
    protected _providedDepth: Texture | null;
    constructor(scene: Scene, camera: N8AOCamera, width?: number, height?: number, options?: N8AOOptions);
    setDepthTexture(depthTexture: Texture): this;
    render(renderer: WebGPURenderer, writeBuffer?: RenderTarget | null, readBuffer?: RenderTarget | null, deltaTime?: number, maskActive?: boolean): void;
}
//# sourceMappingURL=N8AOPostPass.d.ts.map