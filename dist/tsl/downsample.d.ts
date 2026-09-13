import type { Node } from "three/webgpu";
import type { GeometryNodes, Textures, Uniforms } from "./types.js";
/** Two targets/passes avoid mixed-format MRT assumptions; both use exactly the same selection. */
export declare function downsampleFragment(U: Uniforms, T: Textures, G: GeometryNodes, writeNormal?: boolean): Node<"vec4">;
//# sourceMappingURL=downsample.d.ts.map