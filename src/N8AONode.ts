import type { Scene, Texture } from "three";
import {
  Fog,
  FogExp2,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
} from "three";
import { NodeUpdateType } from "three/tsl";
import type { NodeBuilder, NodeFrame, TextureNode } from "three/webgpu";
import {
  DataTexture,
  NearestFilter,
  NoColorSpace,
  RGBAFormat,
  RenderTarget,
  RendererUtils,
  RepeatWrapping,
  TempNode,
  UnsignedByteType,
  Vector2,
  Vector4,
  WebGPUCoordinateSystem,
  WebGPURenderer,
} from "three/webgpu";
import { blueNoise } from "./assets/data.js";
import {
  Configuration,
  DISPLAY_MODES,
  DepthType,
  STRUCTURAL_KEYS,
  dimensions,
  neuralIncompatibilities,
  qualityPreset,
} from "./core/configuration.js";
import { HistoryState } from "./core/history.js";
import { gpuProjectionToLegacy } from "./core/math.js";
import type { Denoiser } from "./rendering/Denoiser.js";
import { RenderResources } from "./rendering/RenderResources.js";
import { ShaderPipeline } from "./rendering/ShaderPipeline.js";
import { createTextures, type Textures } from "./rendering/Textures.js";
import {
  outputTexture,
  sharedContext,
  type SharedContext,
} from "./rendering/ThreeCompatibility.js";
import { TransparencyPass } from "./rendering/TransparencyPass.js";
import { createUniforms, type Uniforms } from "./rendering/Uniforms.js";
import type {
  DisplayMode,
  N8AOCamera,
  N8AOConfiguration,
  N8AOOptions,
  QualityMode,
} from "./types.js";
/** Ambient occlusion node for Three.js RenderPipeline and explicit rendering. */
export class N8AONode extends TempNode<"vec4"> {
  scene: Scene;
  camera: N8AOCamera;
  readonly configuration: N8AOConfiguration;
  protected readonly settings: Configuration;
  width = 0;
  height = 0;
  internalWidth = 0;
  internalHeight = 0;
  autoSize: boolean;
  autoDetectTransparency: boolean;
  requireWebGPU: boolean;
  frame: number;
  lastTime: number;
  debugMode: boolean;
  timeRollingAverage: number;
  readonly isN8AONode = true;
  protected readonly resources: RenderResources;
  protected readonly U: Uniforms;
  protected readonly T: Textures;
  protected readonly bluenoise: DataTexture;
  protected readonly _history: HistoryState;
  protected _disposed: boolean;
  protected _rendering: boolean;
  protected _dirty: boolean;
  protected _detecting = false;
  protected _sizeHalfRes?: boolean;
  protected _colorFingerprint?: string;
  protected _neuralWarning?: string;
  protected _historyIndex: number;
  protected _lastCameraType: boolean;
  protected _sharedContext: SharedContext | null;
  protected _external: { color: Texture; depth: Texture } | null;
  protected readonly shaders: ShaderPipeline;
  protected readonly transparency = new TransparencyPass();
  protected readonly _textureNode: TextureNode;
  protected readonly _aoTextureNode: TextureNode;
  get beautyRenderTarget(): RenderTarget {
    return this.resources.beauty;
  }
  static get type() {
    return "N8AONode";
  }
  constructor(scene: Scene, camera: N8AOCamera, options: N8AOOptions = {}) {
    super("vec4");
    if (
      !scene?.isScene ||
      !(
        camera instanceof PerspectiveCamera ||
        camera instanceof OrthographicCamera
      )
    )
      throw new TypeError(
        "N8AO requires a Scene and a perspective or orthographic camera.",
      );
    const {
      width = 512,
      height = 512,
      autoSize = true,
      requireWebGPU = true,
      autoDetectTransparency = true,
      denoiser = null,
      ...configuration
    } = options;
    this.scene = scene;
    this.camera = camera;
    this.autoSize = autoSize;
    this.requireWebGPU = requireWebGPU;
    this.autoDetectTransparency =
      autoDetectTransparency &&
      !Object.hasOwn(configuration, "transparencyAware");
    this.updateBeforeType = NodeUpdateType.FRAME;

    this._disposed = false;
    this._rendering = false;
    this._dirty = true;
    this._history = new HistoryState();
    this.frame = 0;
    this.lastTime = 0;
    this.debugMode = false;
    this.timeRollingAverage = 0.99;
    this._sharedContext = null;
    this._lastCameraType = camera instanceof OrthographicCamera;
    this._external = null;

    this.settings = new Configuration(configuration, (keys) => {
      this.resetHistory();
      if (keys.some((k) => STRUCTURAL_KEYS.has(k))) this._dirty = true;
      if (keys.includes("halfRes")) this.setSize(this.width, this.height);
      if (keys.includes("stencil")) this._replaceBeauty();
      if (keys.includes("transparencyAware") && !this._detecting)
        this.autoDetectTransparency = false;
    });
    this.configuration = this.settings.value;

    if (blueNoise.length !== 128 * 128 * 4)
      throw new Error("Upstream blue-noise asset has an unexpected size.");
    this.bluenoise = new DataTexture(
      blueNoise,
      128,
      128,
      RGBAFormat,
      UnsignedByteType,
    );
    Object.assign(this.bluenoise, {
      wrapS: RepeatWrapping,
      wrapT: RepeatWrapping,
      minFilter: NearestFilter,
      magFilter: NearestFilter,
      colorSpace: NoColorSpace,
      generateMipmaps: false,
      flipY: false,
      needsUpdate: true,
    });
    this.resources = new RenderResources(this.configuration.stencil);
    this.U = createUniforms(camera);
    this.T = createTextures(this.resources, this.bluenoise);
    this.shaders = new ShaderPipeline(this.resources.quad, denoiser);
    this._historyIndex = 0;
    this._textureNode = outputTexture(this, this.resources.output.texture);
    this._aoTextureNode = outputTexture(
      this,
      this.resources.history[0].texture,
    );
    this.setSize(width, height);
  }
  configure(patch: Partial<N8AOConfiguration>): this {
    this._assertAlive();
    this.settings.update(patch);
    return this;
  }
  setDenoiser(denoiser: Denoiser | null): this {
    this._assertAlive();
    this.shaders.customDenoiser = denoiser;
    this._dirty = true;
    this.resetHistory();
    return this;
  }
  protected _assertAlive() {
    if (this._disposed) throw new Error("N8AO has been disposed.");
  }
  getTextureNode() {
    return this._textureNode;
  }
  /** Raw accumulated visibility in .r; half resolution when configured. No intensity/tint/fog. */
  getAOTextureNode() {
    return this._aoTextureNode;
  }
  get outputTexture() {
    return this.resources.output.texture;
  }
  get aoTexture() {
    return this.resources.history[this._historyIndex].texture;
  }
  setup(builder: NodeBuilder) {
    this._sharedContext = sharedContext(builder);
    this._dirty = true;
    return this._textureNode;
  }
  resetHistory() {
    this._history.reset();
    return this;
  }
  firstFrame() {
    return this.resetHistory();
  }
  setDisplayMode(name: DisplayMode) {
    const mode = DISPLAY_MODES.indexOf(name);
    if (mode < 0) throw new RangeError(`Unknown N8AO display mode: ${name}`);
    this.configuration.renderMode = mode as N8AOConfiguration["renderMode"];
    return this;
  }
  setQualityMode(name: QualityMode) {
    return this.configure(qualityPreset(name));
  }
  enableDebugMode() {
    this.debugMode = true;
  }
  disableDebugMode() {
    this.debugMode = false;
  }
  setSize(width: number, height: number) {
    this._assertAlive();
    const d = dimensions(width, height, this.configuration.halfRes);
    if (
      d.width === this.width &&
      d.height === this.height &&
      d.internalWidth === this.internalWidth &&
      d.internalHeight === this.internalHeight &&
      this._sizeHalfRes === this.configuration.halfRes
    )
      return this;
    this._sizeHalfRes = this.configuration.halfRes;
    Object.assign(this, d);
    this.resources.resize(d);
    this.U.fullResolution.value.set(d.width, d.height);
    // AO dimensions are integral; the upsampler retains fractional half-size coordinates.
    this.U.resolution.value.set(d.internalWidth, d.internalHeight);
    this.U.targetResolution.value.set(d.internalWidth, d.internalHeight);
    this.resetHistory();
    return this;
  }
  /** External inputs must be ordinary, non-MSAA, top-left TSL screen textures from the same renderer. */
  setInputTextures(colorTexture: Texture, depthTexture: Texture) {
    this._assertAlive();
    if (!colorTexture?.isTexture || !depthTexture?.isTexture)
      throw new TypeError(
        "setInputTextures requires color and depth textures.",
      );
    this._external = { color: colorTexture, depth: depthTexture };
    this.configuration.autoRenderBeauty = false;
    this._dirty = true;
    this.resetHistory();
    return this;
  }
  clearInputTextures() {
    this._external = null;
    this.configuration.autoRenderBeauty = true;
    this._dirty = true;
    this.resetHistory();
    return this;
  }
  protected _replaceBeauty() {
    if (!this.resources.beauty) return;
    this.resources.replaceBeauty(
      this.width,
      this.height,
      this.configuration.stencil,
    );
    this._dirty = true;
  }
  detectTransparency() {
    if (!this.autoDetectTransparency) return;
    let found = false;
    this.scene.traverse((object) => {
      if (
        object instanceof Mesh &&
        (Array.isArray(object.material)
          ? object.material.some((material) => material.transparent)
          : object.material.transparent)
      )
        found = true;
    });
    this._detecting = true;
    try {
      this.configuration.transparencyAware = found;
    } finally {
      this._detecting = false;
    }
  }
  protected _updateUniforms(renderer: WebGPURenderer) {
    const c = this.configuration,
      U = this.U,
      camera = this.camera;
    U.projection.value.copy(camera.projectionMatrix);
    // Depth textures are still native WebGPU window-depth textures. Express the AO
    // math in the reference clip convention to preserve its operation ordering.
    if (
      renderer.coordinateSystem === WebGPUCoordinateSystem &&
      c.depthBufferType !== DepthType.Reverse
    ) {
      U.projection.value.fromArray(
        gpuProjectionToLegacy(camera.projectionMatrix.elements),
      );
      U.inverseProjection.value.copy(U.projection.value).invert();
    } else U.inverseProjection.value.copy(camera.projectionMatrixInverse);
    camera.getWorldPosition(U.cameraPosition.value);
    U.near.value = camera.near;
    U.far.value = camera.far;
    U.radius.value = c.aoRadius * (c.halfRes && c.screenSpaceRadius ? 0.5 : 1);
    U.denoiseRadius.value = c.denoiseRadius * (c.halfRes ? 0.5 : 1);
    for (const key of [
      "distanceFalloff",
      "biasOffset",
      "biasMultiplier",
      "intensity",
      "aoTones",
      "renderMode",
    ] as const)
      U[key].value = c[key];
    for (const key of [
      "screenSpaceRadius",
      "colorMultiply",
      "gammaCorrection",
      "transparencyAware",
    ] as const)
      U[key].value = c[key];
    // AO tint is specified in sRGB and converted before composition.
    U.color.value.setRGB(c.color.r, c.color.g, c.color.b).convertSRGBToLinear();
    U.fog.value = !!this.scene.fog;
    U.fogExp.value = this.scene.fog instanceof FogExp2;
    if (this.scene.fog) {
      U.fogNear.value = this.scene.fog instanceof Fog ? this.scene.fog.near : 0;
      U.fogFar.value = this.scene.fog instanceof Fog ? this.scene.fog.far : 1;
      U.fogDensity.value =
        this.scene.fog instanceof FogExp2 ? this.scene.fog.density : 0;
    }
  }
  updateBefore({
    renderer,
  }: NodeFrame | { renderer: WebGPURenderer }): undefined {
    this._assertAlive();
    if (this._rendering)
      throw new Error("Recursive N8AO rendering is not supported.");
    if (!(renderer instanceof WebGPURenderer))
      throw new TypeError("N8AO TSL requires Three.js WebGPURenderer.");
    if (!renderer.hasInitialized())
      throw new Error("Call and await renderer.init() before rendering N8AO.");
    if (
      this.requireWebGPU &&
      !(
        "isWebGPUBackend" in renderer.backend &&
        renderer.backend.isWebGPUBackend === true
      )
    )
      throw new Error(
        "Native WebGPU is required; await renderer.init() and check adapter availability.",
      );
    this._rendering = true;
    const started = performance.now();
    const state = RendererUtils.saveRendererState(renderer);
    const extra = {
      viewport: renderer.getViewport(new Vector4()),
      scissor: renderer.getScissor(new Vector4()),
      autoClearDepth: renderer.autoClearDepth,
      autoClearColor: renderer.autoClearColor,
      autoClearStencil: renderer.autoClearStencil,
      xr: renderer.xr?.enabled,
    };
    try {
      renderer.setMRT(null);
      renderer.setScissorTest(false);
      renderer.autoClear = true;
      renderer.autoClearDepth = true;
      renderer.autoClearColor = true;
      renderer.autoClearStencil = true;
      if (renderer.xr) renderer.xr.enabled = false;
      if (this.autoSize) {
        const size = renderer.getDrawingBufferSize(new Vector2());
        this.setSize(size.x, size.y);
      }
      this.detectTransparency();
      const reversed = renderer.reversedDepthBuffer === true || false;
      const depthType = reversed
        ? DepthType.Reverse
        : renderer.logarithmicDepthBuffer
          ? DepthType.Log
          : DepthType.Default;
      if (this.configuration.depthBufferType !== depthType)
        this.configuration.depthBufferType = depthType;
      const ortho = this.camera instanceof OrthographicCamera;
      if (ortho !== this._lastCameraType) {
        this._lastCameraType = ortho;
        this._dirty = true;
        this.resetHistory();
      }
      if (this.configuration.autoRenderBeauty) {
        renderer.setRenderTarget(this.resources.beauty);
        renderer.render(this.scene, this.camera);
        this.T.beauty.value = this.resources.beauty.texture;
        this.T.fullDepth.value = this.resources.beauty.depthTexture!;
      } else {
        if (!this._external)
          throw new Error(
            "autoRenderBeauty=false requires setInputTextures(color, depth).",
          );
        this.T.beauty.value = this._external.color;
        this.T.fullDepth.value = this._external.depth;
        // External rendering must have updated the camera coordinate system and matrices.
      }
      this.camera.updateMatrixWorld();
      this._updateUniforms(renderer);
      const fingerprint = [
        this.configuration.color.r,
        this.configuration.color.g,
        this.configuration.color.b,
      ].join(",");
      if (fingerprint !== this._colorFingerprint) {
        this._colorFingerprint = fingerprint;
        this.resetHistory();
      }
      this.T.depth.value = this.configuration.halfRes
        ? this.resources.halfDepth.texture
        : this.T.fullDepth.value;
      if (this._dirty) {
        this.shaders.rebuild(
          this.configuration,
          this.camera,
          this.U,
          this.T,
          this._sharedContext,
        );
        this._dirty = false;
      }
      renderer.setRenderObjectFunction(null);
      renderer.setClearColor(0, 0);
      if (this.configuration.transparencyAware)
        this.transparency.render(
          renderer,
          this.scene,
          this.camera,
          this.resources,
          this.shaders,
        );
      const history = this._history.begin(
        this.camera.matrixWorldInverse.elements,
        this.camera.projectionMatrix.elements,
        this.configuration.accumulate,
        this.configuration.aoSamples,
      );
      this.frame = history.frame;
      this.U.frame.value = this.frame;
      const incompatibilities = neuralIncompatibilities(this.configuration),
        neuralKey = incompatibilities.join("; ");
      if (neuralKey && neuralKey !== this._neuralWarning)
        console.warn(`N8AO: neural denoise inactive: ${neuralKey}`);
      this._neuralWarning = neuralKey;
      if (history.render) {
        if (this.frame === 0) {
          for (const rt of this.resources.history) {
            renderer.setRenderTarget(rt);
            renderer.clear(true, false, false);
          }
          this._historyIndex = 0;
        }
        if (this.configuration.halfRes) {
          this.shaders.draw(
            renderer,
            this.shaders.downDepth,
            this.resources.halfDepth,
          );
          this.shaders.draw(
            renderer,
            this.shaders.downNormal,
            this.resources.halfNormal,
          );
        }
        this.shaders.draw(renderer, this.shaders.ao, this.resources.ao);
        let current = this.resources.ao;
        for (let i = 0; i < this.configuration.denoiseIterations; i++) {
          this.U.iteration.value = i;
          this.T.input.value = current.texture;
          const out = this.resources.blur[i % 2];
          this.shaders.draw(
            renderer,
            i === 1 && this.shaders.neural && !incompatibilities.length
              ? this.shaders.neural
              : this.shaders.denoise,
            out,
          );
          current = out;
        }
        this.T.input.value = current.texture;
        this.T.previous.value =
          this.resources.history[this._historyIndex].texture;
        const next = 1 - this._historyIndex;
        this.shaders.draw(
          renderer,
          this.shaders.accumulate,
          this.resources.history[next],
        );
        this._historyIndex = next;
      }
      this.T.history.value = this.aoTexture;
      this._aoTextureNode.value = this.aoTexture;
      this.shaders.draw(
        renderer,
        this.shaders.composite,
        this.resources.output,
      );
      if (this.debugMode) {
        const elapsed = performance.now() - started;
        this.lastTime =
          this.lastTime === 0
            ? elapsed
            : this.lastTime * this.timeRollingAverage +
              elapsed * (1 - this.timeRollingAverage);
      }
    } catch (error) {
      this.resetHistory();
      throw error;
    } finally {
      RendererUtils.restoreRendererState(renderer, state);
      renderer.setViewport(extra.viewport);
      renderer.setScissor(extra.scissor);
      renderer.autoClearDepth = extra.autoClearDepth;
      renderer.autoClearColor = extra.autoClearColor;
      renderer.autoClearStencil = extra.autoClearStencil;
      if (renderer.xr) renderer.xr.enabled = extra.xr;
      this._rendering = false;
    }
  }
  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this.shaders.dispose();
    this.resources.dispose();
    this.bluenoise.dispose();
    // QuadMesh shares a geometry in Three.js: do not dispose that shared geometry.
    this._external = null;
  }
}
