import { texture } from "three/tsl";
export function createTextures(resources, noise) {
    return {
        beauty: texture(resources.beauty.texture),
        fullDepth: texture(resources.beauty.depthTexture),
        depth: texture(resources.beauty.depthTexture),
        normal: texture(resources.halfNormal.texture),
        noise: texture(noise),
        input: texture(resources.ao.texture),
        previous: texture(resources.history[0].texture),
        history: texture(resources.history[1].texture),
        transparencyOff: texture(resources.transparencyOff.texture),
        transparencyOn: texture(resources.transparencyOn.texture),
        transparencyDepth: texture(resources.transparencyOn.depthTexture),
    };
}
//# sourceMappingURL=Textures.js.map