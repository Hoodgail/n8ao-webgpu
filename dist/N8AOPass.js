import { texture, uv } from "three/tsl";
import { NoBlending, NodeMaterial, QuadMesh, RendererUtils, } from "three/webgpu";
import { N8AONode } from "./N8AONode.js";
/** Explicit rendering adapter for a native WebGPU target or the screen. */
export class N8AOPass extends N8AONode {
    enabled;
    needsSwap;
    clear;
    renderToScreen;
    _copyTexture;
    _copyMaterial;
    _copyQuad;
    constructor(scene, camera, width = 512, height = 512, options = {}) {
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
    render(renderer, writeBuffer = null, _readBuffer = null, _deltaTime = 0, maskActive = false) {
        if (!this.enabled)
            return;
        if (maskActive)
            throw new Error("Legacy EffectComposer stencil masks are not supported by the TSL render adapter.");
        this.updateBefore({ renderer });
        const state = RendererUtils.saveRendererState(renderer);
        try {
            renderer.setMRT(null);
            renderer.setRenderObjectFunction(null);
            renderer.setScissorTest(false);
            renderer.setRenderTarget(this.renderToScreen ? null : writeBuffer);
            renderer.autoClear = this.clear;
            this._copyQuad.render(renderer);
        }
        finally {
            RendererUtils.restoreRendererState(renderer, state);
        }
    }
    dispose() {
        if (this._disposed)
            return;
        this._copyMaterial.dispose();
        super.dispose();
    }
}
//# sourceMappingURL=N8AOPass.js.map