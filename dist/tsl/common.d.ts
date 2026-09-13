import type { Node, TextureNode } from "three/webgpu";
import type { ShaderOptions, Uniforms } from "./types.js";
/** Coordinate conversion is explicit: TSL screen UVs are top-left, N8AO noise is bottom-left. */
export declare const legacyUV: (uv: Node<"vec2">) => import("three/webgpu").VarNode<"vec2", import("three/webgpu").JoinNode<"vec2">>;
export declare const legacyFragmentPixel: (resolution: Node<"vec2">) => import("three/webgpu").VarNode<"vec2", import("three/webgpu").JoinNode<"vec2">>;
export declare const safeNormalize: (v: Node<"vec3">, fallback?: Node<"vec3">) => Node<"vec3">;
export declare const rotate2: (v: Node<"vec2">, c: Node<"float">, s: Node<"float">) => import("three/webgpu").VarNode<"vec2", import("three/webgpu").JoinNode<"vec2">>;
export declare function createGeometry(U: Uniforms, options: ShaderOptions): {
    background: (d: Node<"float">) => Node<"bool">;
    linearDepth: (d: Node<"float">) => Node<"float">;
    view: import("three/src/nodes/TSL.js").FnNode<[number | Node<"uint"> | Node<"float">, import("three/webgpu").Vector2 | Node<"vec2">], Node<"vec3">>;
    project: import("three/src/nodes/TSL.js").FnNode<[import("three/webgpu").Vector3 | Node<"vec3">], import("three/webgpu").VarNode<"vec3", import("three/webgpu").JoinNode<"vec3">>>;
    distance: (d: Node<"float">, uv: Node<"vec2">) => Node<"float">;
    load: (tex: TextureNode, pixel: Node<"ivec2">, size: Node<"ivec2">) => Node<"float">;
    normal: (tex: TextureNode, uv: Node<"vec2">, size: Node<"vec2">) => Node<"vec3">;
    radiusAt: (d: Node<"float">, uv: Node<"vec2">, resolution: Node<"vec2">, radius: Node<"float">) => Node<"float">;
    falloffAt: (radius: Node<"float">) => Node<"float">;
};
//# sourceMappingURL=common.d.ts.map