import type { Texture } from "three";
import { clamp, passTexture } from "three/tsl";
import type { Node, NodeBuilder, PassNode, TextureNode } from "three/webgpu";

export type SharedContext = Record<string, unknown>;

/** r186 exposes these operations at runtime; its declarations narrow them further. */
export function sharedContext(builder: NodeBuilder): SharedContext {
  return (
    builder as NodeBuilder & { getSharedContext(): SharedContext }
  ).getSharedContext();
}
export function outputTexture(owner: Node, value: Texture): TextureNode {
  return passTexture(owner as unknown as PassNode, value);
}
export function matrixColumn(
  matrix: Node<"mat4">,
  index: number,
): Node<"vec4"> {
  return (
    matrix as Node<"mat4"> & { element(index: number): Node<"vec4"> }
  ).element(index);
}
export const clampPixel = clamp as unknown as (
  pixel: Node<"ivec2">,
  minimum: Node<"ivec2">,
  maximum: Node<"ivec2">,
) => Node<"ivec2">;
