import type { Node } from "three/webgpu";
import { model } from "../assets/data.js";
import type { NeuralModelData } from "../core/neural.js";
import { denoiseFragment } from "../tsl/denoise.js";
import type {
  GeometryNodes,
  ShaderOptions,
  Textures,
  Uniforms,
} from "../tsl/types.js";

export interface DenoiserContext {
  readonly uniforms: Uniforms;
  readonly textures: Textures;
  readonly geometry: GeometryNodes;
  readonly options: ShaderOptions;
}

/** Builds a filtering stage. The input texture and iteration uniform update each draw. */
export interface Denoiser {
  readonly name: string;
  create(context: DenoiserContext): Node<"vec4">;
}

export class BilateralDenoiser implements Denoiser {
  readonly name = "bilateral";
  create({
    uniforms,
    textures,
    geometry,
    options,
  }: DenoiserContext): Node<"vec4"> {
    return denoiseFragment(uniforms, textures, geometry, options);
  }
}

export class NeuralDenoiser implements Denoiser {
  readonly name = "neural";
  constructor(private readonly data: NeuralModelData = model) {}
  create({
    uniforms,
    textures,
    geometry,
    options,
  }: DenoiserContext): Node<"vec4"> {
    return denoiseFragment(uniforms, textures, geometry, options, this.data);
  }
}
