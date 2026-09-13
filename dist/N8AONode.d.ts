import type { Scene, Texture } from "three";
import type { NodeBuilder, NodeFrame, TextureNode } from "three/webgpu";
import { DataTexture, RenderTarget, TempNode, WebGPURenderer } from "three/webgpu";
import { Configuration } from "./core/configuration.js";
import { HistoryState } from "./core/history.js";
import type { Denoiser } from "./rendering/Denoiser.js";
import { RenderResources } from "./rendering/RenderResources.js";
import { ShaderPipeline } from "./rendering/ShaderPipeline.js";
import { type Textures } from "./rendering/Textures.js";
import { type SharedContext } from "./rendering/ThreeCompatibility.js";
import { TransparencyPass } from "./rendering/TransparencyPass.js";
import { type Uniforms } from "./rendering/Uniforms.js";
import type { DisplayMode, N8AOCamera, N8AOConfiguration, N8AOOptions, QualityMode } from "./types.js";
/** Ambient occlusion node for Three.js RenderPipeline and explicit rendering. */
export declare class N8AONode extends TempNode<"vec4"> {
    scene: Scene;
    camera: N8AOCamera;
    readonly configuration: N8AOConfiguration;
    protected readonly settings: Configuration;
    width: number;
    height: number;
    internalWidth: number;
    internalHeight: number;
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
    protected _detecting: boolean;
    protected _sizeHalfRes?: boolean;
    protected _colorFingerprint?: string;
    protected _neuralWarning?: string;
    protected _historyIndex: number;
    protected _lastCameraType: boolean;
    protected _sharedContext: SharedContext | null;
    protected _external: {
        color: Texture;
        depth: Texture;
    } | null;
    protected readonly shaders: ShaderPipeline;
    protected readonly transparency: TransparencyPass;
    protected readonly _textureNode: TextureNode;
    protected readonly _aoTextureNode: TextureNode;
    get beautyRenderTarget(): RenderTarget;
    static get type(): string;
    constructor(scene: Scene, camera: N8AOCamera, options?: N8AOOptions);
    configure(patch: Partial<N8AOConfiguration>): this;
    setDenoiser(denoiser: Denoiser | null): this;
    protected _assertAlive(): void;
    getTextureNode(): TextureNode;
    /** Raw accumulated visibility in .r; half resolution when configured. No intensity/tint/fog. */
    getAOTextureNode(): TextureNode;
    get outputTexture(): Texture<unknown, import("three").TextureEventMap>;
    get aoTexture(): Texture<unknown, import("three").TextureEventMap>;
    setup(builder: NodeBuilder): TextureNode;
    resetHistory(): this;
    firstFrame(): this;
    setDisplayMode(name: DisplayMode): this;
    setQualityMode(name: QualityMode): this;
    enableDebugMode(): void;
    disableDebugMode(): void;
    setSize(width: number, height: number): this;
    /** External inputs must be ordinary, non-MSAA, top-left TSL screen textures from the same renderer. */
    setInputTextures(colorTexture: Texture, depthTexture: Texture): this;
    clearInputTextures(): this;
    protected _replaceBeauty(): void;
    detectTransparency(): void;
    protected _updateUniforms(renderer: WebGPURenderer): void;
    updateBefore({ renderer, }: NodeFrame | {
        renderer: WebGPURenderer;
    }): undefined;
    dispose(): void;
}
//# sourceMappingURL=N8AONode.d.ts.map