import { context, uniformArray, uv, vec4 } from "three/tsl";
import type {
  Node,
  QuadMesh,
  RenderTarget,
  WebGPURenderer,
} from "three/webgpu";
import {
  NoBlending,
  NodeMaterial,
  OrthographicCamera,
  Vector2,
  Vector3,
} from "three/webgpu";
import { DepthType } from "../core/configuration.js";
import { denoiseSamples, hemisphereSamples } from "../core/sampling.js";
import { accumulationFragment } from "../tsl/accumulate.js";
import { aoFragment } from "../tsl/ao.js";
import { createGeometry } from "../tsl/common.js";
import { compositeFragment } from "../tsl/composite.js";
import { downsampleFragment } from "../tsl/downsample.js";
import type { ShaderOptions, Textures, Uniforms } from "../tsl/types.js";
import type { N8AOCamera, N8AOConfiguration } from "../types.js";
import {
  BilateralDenoiser,
  NeuralDenoiser,
  type Denoiser,
} from "./Denoiser.js";
import type { SharedContext } from "./ThreeCompatibility.js";

/** Owns compiled materials while target allocation stays with RenderResources. */
export class ShaderPipeline {
  private materials: NodeMaterial[] = [];
  private shared: SharedContext | null = null;
  private options!: ShaderOptions;
  ao!: NodeMaterial;
  denoise!: NodeMaterial;
  neural: NodeMaterial | null = null;
  downDepth!: NodeMaterial;
  downNormal!: NodeMaterial;
  accumulate!: NodeMaterial;
  composite!: NodeMaterial;
  depthCopy!: NodeMaterial;
  constructor(
    private readonly quad: QuadMesh,
    public customDenoiser: Denoiser | null = null,
  ) {}
  createMaterial(name: string, fragment: Node, depthNode: Node | null = null) {
    const m = new NodeMaterial();
    m.name = `N8AO.${name}`;
    m.fragmentNode = fragment;
    m.depthTest = false;
    m.depthWrite = depthNode !== null;
    m.transparent = false;
    m.blending = NoBlending;
    m.toneMapped = false;
    if (depthNode !== null) m.depthNode = depthNode;
    if (this.shared) m.contextNode = context(this.shared);
    this.materials.push(m);
    return m;
  }
  rebuild(
    c: N8AOConfiguration,
    camera: N8AOCamera,
    U: Uniforms,
    T: Textures,
    shared: SharedContext | null,
  ): void {
    for (const m of this.materials) m.dispose();
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
    U.hemisphere = uniformArray<"vec3">(
      hemisphereSamples(c.aoSamples).map((p) => new Vector3(...p)),
      "vec3",
    );
    U.poisson = uniformArray<"vec2">(
      denoiseSamples(c.denoiseSamples).map((p) => new Vector2(...p)),
      "vec2",
    );
    const G = createGeometry(U, this.options);
    this.ao = this.createMaterial("ao", aoFragment(U, T, G, this.options));
    this.denoise = this.createMaterial(
      "denoise",
      (this.customDenoiser ?? new BilateralDenoiser()).create({
        uniforms: U,
        textures: T,
        geometry: G,
        options: this.options,
      }),
    );
    this.neural =
      !this.customDenoiser &&
      c.neuralDenoise &&
      [4, 8, 16].includes(c.denoiseSamples)
        ? this.createMaterial(
            "neural",
            new NeuralDenoiser().create({
              uniforms: U,
              textures: T,
              geometry: G,
              options: this.options,
            }),
          )
        : null;
    this.downDepth = this.createMaterial(
      "downDepth",
      downsampleFragment(U, T, G, false),
    );
    this.downNormal = this.createMaterial(
      "downNormal",
      downsampleFragment(U, T, G, true),
    );
    this.accumulate = this.createMaterial(
      "accumulate",
      accumulationFragment(U, T),
    );
    this.composite = this.createMaterial(
      "composite",
      compositeFragment(U, T, G, this.options),
    );
    const copiedDepth = T.fullDepth
      .sample(uv())
      .r.add(c.depthBufferType === DepthType.Reverse ? -0.00001 : 0.00001)
      .clamp(0, 1);
    this.depthCopy = this.createMaterial("depthCopy", vec4(0), copiedDepth);
  }
  draw(
    renderer: WebGPURenderer,
    material: NodeMaterial,
    rt: RenderTarget,
    clear = true,
  ) {
    renderer.setRenderTarget(rt);
    renderer.autoClear = clear;
    this.quad.material = material;
    this.quad.render(renderer);
  }
  dispose(): void {
    for (const material of this.materials) material.dispose();
    this.materials = [];
  }
}
