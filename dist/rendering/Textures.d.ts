import type { Texture } from "three";
import type { RenderResources } from "./RenderResources.js";
export declare function createTextures(resources: RenderResources, noise: Texture): {
    beauty: import("three/webgpu").TextureNode<"vec4">;
    fullDepth: import("three/webgpu").TextureNode<"vec4">;
    depth: import("three/webgpu").TextureNode<"vec4">;
    normal: import("three/webgpu").TextureNode<"vec4">;
    noise: import("three/webgpu").TextureNode<"vec4">;
    input: import("three/webgpu").TextureNode<"vec4">;
    previous: import("three/webgpu").TextureNode<"vec4">;
    history: import("three/webgpu").TextureNode<"vec4">;
    transparencyOff: import("three/webgpu").TextureNode<"vec4">;
    transparencyOn: import("three/webgpu").TextureNode<"vec4">;
    transparencyDepth: import("three/webgpu").TextureNode<"vec4">;
};
export type Textures = ReturnType<typeof createTextures>;
//# sourceMappingURL=Textures.d.ts.map