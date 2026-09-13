import type { Node } from "three/webgpu";
import type { NeuralModelData } from "../core/neural.js";
import type { GeometryNodes, ShaderOptions, Textures, Uniforms } from "../tsl/types.js";
export interface DenoiserContext {
    readonly uniforms: Uniforms;
    readonly textures: Textures;
    readonly geometry: GeometryNodes;
    readonly options: ShaderOptions;
}
/** Builds a filtering stage. The input texture and iteration uniform update each draw. */
export interface Denoiser {
    readonly name: string;
    create(context: DenoiserContext): Node<"vec4">;
}
export declare class BilateralDenoiser implements Denoiser {
    readonly name = "bilateral";
    create({ uniforms, textures, geometry, options, }: DenoiserContext): Node<"vec4">;
}
export declare class NeuralDenoiser implements Denoiser {
    private readonly data;
    readonly name = "neural";
    constructor(data?: NeuralModelData);
    create({ uniforms, textures, geometry, options, }: DenoiserContext): Node<"vec4">;
}
//# sourceMappingURL=Denoiser.d.ts.map