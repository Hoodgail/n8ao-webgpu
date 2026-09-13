import type { PixelFormat, TextureDataType } from "three";
import {
  DepthFormat,
  DepthStencilFormat,
  DepthTexture,
  FloatType,
  HalfFloatType,
  LinearFilter,
  NearestFilter,
  NoColorSpace,
  NodeMaterial,
  QuadMesh,
  RGBAFormat,
  RedFormat,
  RenderTarget,
  UnsignedByteType,
  UnsignedInt248Type,
  UnsignedIntType,
} from "three/webgpu";
import type { RenderDimensions } from "../types.js";
function target(
  name: string,
  type: TextureDataType = HalfFloatType,
  format: PixelFormat = RGBAFormat,
  nearest = false,
  depth = false,
  stencil = false,
) {
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
    t.depthTexture = new DepthTexture(
      1,
      1,
      stencil ? UnsignedInt248Type : UnsignedIntType,
    );
    t.depthTexture.format = stencil ? DepthStencilFormat : DepthFormat;
    t.depthTexture.minFilter = NearestFilter;
    t.depthTexture.magFilter = NearestFilter;
    t.depthTexture.name = `N8AO.${name}.depth`;
  }
  return t;
}

export class RenderResources {
  private readonly placeholder = new NodeMaterial();
  readonly quad = new QuadMesh(this.placeholder);
  beauty: RenderTarget;
  readonly ao: RenderTarget;
  readonly blur: RenderTarget[];
  readonly history: RenderTarget[];
  readonly halfDepth: RenderTarget;
  readonly halfNormal: RenderTarget;
  readonly output: RenderTarget;
  readonly transparencyOff: RenderTarget;
  readonly transparencyOn: RenderTarget;
  constructor(stencil = false) {
    this.beauty = target(
      "beauty",
      HalfFloatType,
      RGBAFormat,
      false,
      true,
      stencil,
    );
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
    this.transparencyOff = target(
      "transparencyOff",
      HalfFloatType,
      RGBAFormat,
      false,
      true,
    );
    this.transparencyOn = target(
      "transparencyOn",
      HalfFloatType,
      RGBAFormat,
      false,
      true,
    );
  }
  resize(d: RenderDimensions): void {
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
  replaceBeauty(width: number, height: number, stencil: boolean): void {
    this.beauty.dispose();
    this.beauty = target(
      "beauty",
      HalfFloatType,
      RGBAFormat,
      false,
      true,
      stencil,
    );
    this.beauty.setSize(width, height);
  }
  dispose(): void {
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
