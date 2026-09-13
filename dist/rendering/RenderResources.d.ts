import { QuadMesh, RenderTarget } from "three/webgpu";
import type { RenderDimensions } from "../types.js";
export declare class RenderResources {
    private readonly placeholder;
    readonly quad: QuadMesh;
    beauty: RenderTarget;
    readonly ao: RenderTarget;
    readonly blur: RenderTarget[];
    readonly history: RenderTarget[];
    readonly halfDepth: RenderTarget;
    readonly halfNormal: RenderTarget;
    readonly output: RenderTarget;
    readonly transparencyOff: RenderTarget;
    readonly transparencyOn: RenderTarget;
    constructor(stencil?: boolean);
    resize(d: RenderDimensions): void;
    replaceBeauty(width: number, height: number, stencil: boolean): void;
    dispose(): void;
}
//# sourceMappingURL=RenderResources.d.ts.map