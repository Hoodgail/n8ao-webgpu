import { DepthFormat, DepthStencilFormat, DepthTexture, FloatType, HalfFloatType, LinearFilter, NearestFilter, NoColorSpace, NodeMaterial, QuadMesh, RGBAFormat, RedFormat, RenderTarget, UnsignedByteType, UnsignedInt248Type, UnsignedIntType, } from "three/webgpu";
function target(name, type = HalfFloatType, format = RGBAFormat, nearest = false, depth = false, stencil = false) {
    const t = new RenderTarget(1, 1, {
        type,
        format,
        depthBuffer: depth,
        stencilBuffer: stencil,
        minFilter: nearest ? NearestFilter : LinearFilter,
        magFilter: nearest ? NearestFilter : LinearFilter,
        samples: 0,
    });
    t.texture.name = `N8AO.${name}`;
    t.texture.colorSpace = NoColorSpace;
    t.texture.generateMipmaps = false;
    if (depth) {
        t.depthTexture = new DepthTexture(1, 1, stencil ? UnsignedInt248Type : UnsignedIntType);
        t.depthTexture.format = stencil ? DepthStencilFormat : DepthFormat;
        t.depthTexture.minFilter = NearestFilter;
        t.depthTexture.magFilter = NearestFilter;
        t.depthTexture.name = `N8AO.${name}.depth`;
    }
    return t;
}
export class RenderResources {
    placeholder = new NodeMaterial();
    quad = new QuadMesh(this.placeholder);
    beauty;
    ao;
    blur;
    history;
    halfDepth;
    halfNormal;
    output;
    transparencyOff;
    transparencyOn;
    constructor(stencil = false) {
        this.beauty = target("beauty", HalfFloatType, RGBAFormat, false, true, stencil);
        this.ao = target("raw", UnsignedByteType);
        this.blur = [
            target("blur0", UnsignedByteType),
            target("blur1", UnsignedByteType),
        ];
        this.history = [target("history0"), target("history1")];
        this.halfDepth = target("halfDepth", FloatType, RedFormat, true);
        this.halfNormal = target("halfNormal", HalfFloatType, RGBAFormat, true);
        // Keep composition at float32 until the consumer's output conversion.
        // An extra float16 intermediate changes final RGBA8 rounding (especially sRGB).
        this.output = target("composite", FloatType, RGBAFormat, true);
        this.transparencyOff = target("transparencyOff", HalfFloatType, RGBAFormat, false, true);
        this.transparencyOn = target("transparencyOn", HalfFloatType, RGBAFormat, false, true);
    }
    resize(d) {
        for (const target of [
            this.beauty,
            this.output,
            this.transparencyOff,
            this.transparencyOn,
        ])
            target.setSize(d.width, d.height);
        for (const target of [
            this.ao,
            ...this.blur,
            ...this.history,
            this.halfDepth,
            this.halfNormal,
        ])
            target.setSize(d.internalWidth, d.internalHeight);
    }
    replaceBeauty(width, height, stencil) {
        this.beauty.dispose();
        this.beauty = target("beauty", HalfFloatType, RGBAFormat, false, true, stencil);
        this.beauty.setSize(width, height);
    }
    dispose() {
        for (const target of [
            this.beauty,
            this.ao,
            ...this.blur,
            ...this.history,
            this.halfDepth,
            this.halfNormal,
            this.output,
            this.transparencyOff,
            this.transparencyOn,
        ])
            target.dispose();
        this.placeholder.dispose();
        // QuadMesh geometry is shared by Three.js and must not be disposed here.
    }
}
//# sourceMappingURL=RenderResources.js.map