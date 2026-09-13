import type { RenderTarget, Scene } from "three";
import { texture, uv } from "three/tsl";
import type { TextureNode, WebGPURenderer } from "three/webgpu";
import {
  NoBlending,
  NodeMaterial,
  QuadMesh,
  RendererUtils,
} from "three/webgpu";
import { N8AONode } from "./N8AONode.js";
import type { N8AOCamera, N8AOOptions } from "./types.js";
/** Explicit rendering adapter for a native WebGPU target or the screen. */
export class N8AOPass extends N8AONode {
  enabled: boolean;
  needsSwap: boolean;
  clear: boolean;
  renderToScreen: boolean;
  protected readonly _copyTexture: TextureNode;
  protected readonly _copyMaterial: NodeMaterial;
  protected readonly _copyQuad: QuadMesh;
  constructor(
    scene: Scene,
    camera: N8AOCamera,
    width = 512,
    height = 512,
    options: N8AOOptions = {},
  ) {
    super(scene, camera, { ...options, width, height, autoSize: false });
    this.enabled = true;
    this.needsSwap = true;
    this.clear = true;
    this.renderToScreen = false;
    this._copyTexture = texture(this.outputTexture);
    this._copyMaterial = new NodeMaterial();
    this._copyMaterial.fragmentNode = this._copyTexture.sample(uv());
    this._copyMaterial.depthTest = false;
    this._copyMaterial.depthWrite = false;
    this._copyMaterial.toneMapped = false;
    this._copyMaterial.blending = NoBlending;
    this._copyQuad = new QuadMesh(this._copyMaterial);
  }
  render(
    renderer: WebGPURenderer,
    writeBuffer: RenderTarget | null = null,
    _readBuffer: RenderTarget | null = null,
    _deltaTime = 0,
    maskActive = false,
  ): void {
    if (!this.enabled) return;
    if (maskActive)
      throw new Error(
        "Legacy EffectComposer stencil masks are not supported by the TSL render adapter.",
      );
    this.updateBefore({ renderer });
    const state = RendererUtils.saveRendererState(renderer);
    try {
      renderer.setMRT(null);
      renderer.setRenderObjectFunction(null);
      renderer.setScissorTest(false);
      renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
      renderer.autoClear = this.clear;
      this._copyQuad.render(renderer);
    } finally {
      RendererUtils.restoreRendererState(renderer, state);
    }
  }
  dispose() {
    if (this._disposed) return;
    this._copyMaterial.dispose();
    super.dispose();
  }
}
