import type { Node } from "three/webgpu";
import type { NeuralModelData } from "../core/neural.js";
import type { GeometryNodes, ShaderOptions, Textures, Uniforms } from "./types.js";
export declare function denoiseFragment(U: Uniforms, T: Textures, G: GeometryNodes, options: ShaderOptions, model?: NeuralModelData | null): Node<"vec4">;
//# sourceMappingURL=denoise.d.ts.map