import { context, uniformArray, uv, vec4 } from "three/tsl";
import { NoBlending, NodeMaterial, OrthographicCamera, Vector2, Vector3, } from "three/webgpu";
import { DepthType } from "../core/configuration.js";
import { denoiseSamples, hemisphereSamples } from "../core/sampling.js";
import { accumulationFragment } from "../tsl/accumulate.js";
import { aoFragment } from "../tsl/ao.js";
import { createGeometry } from "../tsl/common.js";
import { compositeFragment } from "../tsl/composite.js";
import { downsampleFragment } from "../tsl/downsample.js";
import { BilateralDenoiser, NeuralDenoiser, } from "./Denoiser.js";
/** Owns compiled materials while target allocation stays with RenderResources. */
export class ShaderPipeline {
    quad;
    customDenoiser;
    materials = [];
    shared = null;
    options;
    ao;
    denoise;
    neural = null;
    downDepth;
    downNormal;
    accumulate;
    composite;
    depthCopy;
    constructor(quad, customDenoiser = null) {
        this.quad = quad;
        this.customDenoiser = customDenoiser;
    }
    createMaterial(name, fragment, depthNode = null) {
        const m = new NodeMaterial();
        m.name = `N8AO.${name}`;
        m.fragmentNode = fragment;
        m.depthTest = false;
        m.depthWrite = depthNode !== null;
        m.transparent = false;
        m.blending = NoBlending;
        m.toneMapped = false;
        if (depthNode !== null)
            m.depthNode = depthNode;
        if (this.shared)
            m.contextNode = context(this.shared);
        this.materials.push(m);
        return m;
    }
    rebuild(c, camera, U, T, shared) {
        for (const m of this.materials)
            m.dispose();
        this.materials = [];
        this.shared = shared;
        this.options = {
            aoSamples: c.aoSamples,
            denoiseSamples: c.denoiseSamples,
            halfRes: c.halfRes,
            depthAwareUpsampling: c.depthAwareUpsampling,
            depthType: c.depthBufferType,
            orthographic: camera instanceof OrthographicCamera,
        };
        U.hemisphere = uniformArray(hemisphereSamples(c.aoSamples).map((p) => new Vector3(...p)), "vec3");
        U.poisson = uniformArray(denoiseSamples(c.denoiseSamples).map((p) => new Vector2(...p)), "vec2");
        const G = createGeometry(U, this.options);
        this.ao = this.createMaterial("ao", aoFragment(U, T, G, this.options));
        this.denoise = this.createMaterial("denoise", (this.customDenoiser ?? new BilateralDenoiser()).create({
            uniforms: U,
            textures: T,
            geometry: G,
            options: this.options,
        }));
        this.neural =
            !this.customDenoiser &&
                c.neuralDenoise &&
                [4, 8, 16].includes(c.denoiseSamples)
                ? this.createMaterial("neural", new NeuralDenoiser().create({
                    uniforms: U,
                    textures: T,
                    geometry: G,
                    options: this.options,
                }))
                : null;
        this.downDepth = this.createMaterial("downDepth", downsampleFragment(U, T, G, false));
        this.downNormal = this.createMaterial("downNormal", downsampleFragment(U, T, G, true));
        this.accumulate = this.createMaterial("accumulate", accumulationFragment(U, T));
        this.composite = this.createMaterial("composite", compositeFragment(U, T, G, this.options));
        const copiedDepth = T.fullDepth
            .sample(uv())
            .r.add(c.depthBufferType === DepthType.Reverse ? -0.00001 : 0.00001)
            .clamp(0, 1);
        this.depthCopy = this.createMaterial("depthCopy", vec4(0), copiedDepth);
    }
    draw(renderer, material, rt, clear = true) {
        renderer.setRenderTarget(rt);
        renderer.autoClear = clear;
        this.quad.material = material;
        this.quad.render(renderer);
    }
    dispose() {
        for (const material of this.materials)
            material.dispose();
        this.materials = [];
    }
}
//# sourceMappingURL=ShaderPipeline.js.map