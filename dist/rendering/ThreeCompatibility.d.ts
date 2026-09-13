import type { Texture } from "three";
import type { Node, NodeBuilder, TextureNode } from "three/webgpu";
export type SharedContext = Record<string, unknown>;
/** r186 exposes these operations at runtime; its declarations narrow them further. */
export declare function sharedContext(builder: NodeBuilder): SharedContext;
export declare function outputTexture(owner: Node, value: Texture): TextureNode;
export declare function matrixColumn(matrix: Node<"mat4">, index: number): Node<"vec4">;
export declare const clampPixel: (pixel: Node<"ivec2">, minimum: Node<"ivec2">, maximum: Node<"ivec2">) => Node<"ivec2">;
//# sourceMappingURL=ThreeCompatibility.d.ts.map