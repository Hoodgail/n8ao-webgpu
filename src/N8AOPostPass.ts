import type { RenderTarget, Scene, Texture } from "three";
import type { WebGPURenderer } from "three/webgpu";
import { N8AOPass } from "./N8AOPass.js";
import type { N8AOCamera, N8AOOptions } from "./types.js";
/** Explicit rendering adapter for external beauty and depth buffers. */
export class N8AOPostPass extends N8AOPass {
  protected _providedDepth: Texture | null;
  constructor(
    scene: Scene,
    camera: N8AOCamera,
    width = 512,
    height = 512,
    options: N8AOOptions = {},
  ) {
    super(scene, camera, width, height, {
      ...options,
      autoRenderBeauty: false,
    });
    this._providedDepth = null;
  }
  setDepthTexture(depthTexture: Texture) {
    if (!depthTexture?.isTexture)
      throw new TypeError("A Three.js depth texture is required.");
    this._providedDepth = depthTexture;
    return this;
  }
  render(
    renderer: WebGPURenderer,
    writeBuffer?: RenderTarget | null,
    readBuffer?: RenderTarget | null,
    deltaTime?: number,
    maskActive?: boolean,
  ): void {
    if (!this.enabled) return;
    const depth = readBuffer?.depthTexture || this._providedDepth;
    if (!readBuffer?.texture || !depth)
      throw new Error(
        "N8AOPostPass requires readBuffer.texture and readBuffer.depthTexture, or setDepthTexture().",
      );
    // Do not reset accumulation when the same externally owned targets are reused each frame.
    if (
      this._external?.color !== readBuffer.texture ||
      this._external?.depth !== depth
    )
      this.setInputTextures(readBuffer.texture, depth);
    return super.render(
      renderer,
      writeBuffer,
      readBuffer,
      deltaTime,
      maskActive,
    );
  }
}
