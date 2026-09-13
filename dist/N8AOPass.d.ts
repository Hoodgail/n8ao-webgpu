import type { RenderTarget, Scene } from "three";
import type { TextureNode, WebGPURenderer } from "three/webgpu";
import { NodeMaterial, QuadMesh } from "three/webgpu";
import { N8AONode } from "./N8AONode.js";
import type { N8AOCamera, N8AOOptions } from "./types.js";
/** Explicit rendering adapter for a native WebGPU target or the screen. */
export declare class N8AOPass extends N8AONode {
    enabled: boolean;
    needsSwap: boolean;
    clear: boolean;
    renderToScreen: boolean;
    protected readonly _copyTexture: TextureNode;
    protected readonly _copyMaterial: NodeMaterial;
    protected readonly _copyQuad: QuadMesh;
    constructor(scene: Scene, camera: N8AOCamera, width?: number, height?: number, options?: N8AOOptions);
    render(renderer: WebGPURenderer, writeBuffer?: RenderTarget | null, _readBuffer?: RenderTarget | null, _deltaTime?: number, maskActive?: boolean): void;
    dispose(): void;
}
//# sourceMappingURL=N8AOPass.d.ts.map