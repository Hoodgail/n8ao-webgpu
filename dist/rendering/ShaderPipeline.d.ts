import type { Node, QuadMesh, RenderTarget, WebGPURenderer } from "three/webgpu";
import { NodeMaterial } from "three/webgpu";
import type { Textures, Uniforms } from "../tsl/types.js";
import type { N8AOCamera, N8AOConfiguration } from "../types.js";
import { type Denoiser } from "./Denoiser.js";
import type { SharedContext } from "./ThreeCompatibility.js";
/** Owns compiled materials while target allocation stays with RenderResources. */
export declare class ShaderPipeline {
    private readonly quad;
    customDenoiser: Denoiser | null;
    private materials;
    private shared;
    private options;
    ao: NodeMaterial;
    denoise: NodeMaterial;
    neural: NodeMaterial | null;
    downDepth: NodeMaterial;
    downNormal: NodeMaterial;
    accumulate: NodeMaterial;
    composite: NodeMaterial;
    depthCopy: NodeMaterial;
    constructor(quad: QuadMesh, customDenoiser?: Denoiser | null);
    createMaterial(name: string, fragment: Node, depthNode?: Node | null): NodeMaterial;
    rebuild(c: N8AOConfiguration, camera: N8AOCamera, U: Uniforms, T: Textures, shared: SharedContext | null): void;
    draw(renderer: WebGPURenderer, material: NodeMaterial, rt: RenderTarget, clear?: boolean): void;
    dispose(): void;
}
//# sourceMappingURL=ShaderPipeline.d.ts.map