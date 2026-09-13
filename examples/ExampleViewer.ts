import {
  WebGPURenderer,
  RenderPipeline,
  ACESFilmicToneMapping,
} from "three/webgpu";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { N8AONode } from "../src/index.js";
import type {
  N8AOConfiguration,
  QualityMode,
  DisplayMode,
  Denoiser,
} from "../src/index.js";
import type { ExampleDefinition, ExampleScene } from "./scenes.js";

export class ExampleViewer {
  private renderer: WebGPURenderer | null = null;
  private pipeline: RenderPipeline | null = null;
  private controls: OrbitControls | null = null;
  private example: ExampleScene | null = null;
  private effect: N8AONode | null = null;
  private generation = 0;
  private dirty = true;
  private readonly observer: ResizeObserver;
  onError: (error: unknown) => void = () => {};
  onRender: (frame: number, width: number, height: number) => void = () => {};

  constructor(private readonly host: HTMLElement) {
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(host);
  }

  get configuration(): N8AOConfiguration | null {
    return this.effect?.configuration ?? null;
  }

  async load(definition: ExampleDefinition): Promise<boolean> {
    const generation = ++this.generation;
    this.release();
    const example = definition.create();
    const renderer = new WebGPURenderer({
      antialias: false,
      logarithmicDepthBuffer: definition.depth === "log",
      reversedDepthBuffer: definition.depth === "reverse",
    });
    try {
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      renderer.toneMapping = ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      await renderer.init();
      if (
        !("isWebGPUBackend" in renderer.backend) ||
        !renderer.backend.isWebGPUBackend
      )
        throw new Error(
          "This browser does not provide native WebGPU. Try a current Chrome, Edge, or Safari with WebGPU enabled.",
        );
      if (generation !== this.generation) {
        renderer.dispose();
        example.dispose();
        return false;
      }
      this.renderer = renderer;
      this.example = example;
      this.effect = new N8AONode(
        example.scene,
        example.camera,
        example.options,
      );
      this.pipeline = new RenderPipeline(renderer);
      this.pipeline.outputNode = this.effect;
      this.host.prepend(renderer.domElement);
      renderer.domElement.setAttribute(
        "aria-label",
        `${definition.title}, interactive 3D ambient occlusion example`,
      );
      this.controls = new OrbitControls(example.camera, renderer.domElement);
      this.controls.target.copy(example.target);
      this.controls.enableDamping = true;
      this.controls.minDistance = 2;
      this.controls.maxDistance = 35;
      this.controls.addEventListener("change", () => {
        this.dirty = true;
      });
      this.controls.update();
      this.controls.saveState();
      this.resize();
      renderer.setAnimationLoop(() => {
        try {
          this.render();
        } catch (error) {
          renderer.setAnimationLoop(null);
          this.onError(error);
        }
      });
      return true;
    } catch (error) {
      if (this.renderer !== renderer) {
        renderer.dispose();
        example.dispose();
      } else this.release();
      throw error;
    }
  }

  configure(settings: Partial<N8AOConfiguration>): void {
    this.effect?.configure(settings);
    this.dirty = true;
  }
  setQuality(quality: QualityMode): void {
    this.effect?.setQualityMode(quality);
    this.dirty = true;
  }
  setDisplay(mode: DisplayMode): void {
    this.effect?.setDisplayMode(mode);
    this.dirty = true;
  }
  setDenoiser(denoiser: Denoiser | null): void {
    this.effect?.setDenoiser(denoiser);
    this.dirty = true;
  }
  resetCamera(): void {
    if (!this.example || !this.controls) return;
    this.controls.reset();
    this.dirty = true;
  }
  private resize(): void {
    if (!this.renderer || !this.example) return;
    const width = Math.max(1, this.host.clientWidth),
      height = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(width, height);
    this.example.resize(width, height);
    this.dirty = true;
  }
  private render(): void {
    this.controls?.update();
    if (!this.effect || !this.pipeline) return;
    const accumulating =
      this.effect.configuration.accumulate &&
      this.effect.frame < Math.ceil(1024 / this.effect.configuration.aoSamples);
    if (this.dirty || accumulating) {
      this.pipeline.render();
      this.dirty = false;
      this.onRender(
        this.effect.frame + 1,
        this.effect.width,
        this.effect.height,
      );
    }
  }
  private release(): void {
    this.renderer?.setAnimationLoop(null);
    this.controls?.dispose();
    this.pipeline?.dispose();
    this.effect?.dispose();
    this.example?.dispose();
    this.renderer?.domElement.remove();
    this.renderer?.dispose();
    this.renderer = null;
    this.pipeline = null;
    this.controls = null;
    this.effect = null;
    this.example = null;
  }
  dispose(): void {
    this.generation++;
    this.observer.disconnect();
    this.release();
  }
}
