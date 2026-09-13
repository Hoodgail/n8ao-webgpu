import type { Scene } from "three";
import { Color } from "three";
import type { WebGPURenderer } from "three/webgpu";
import type { N8AOCamera } from "../types.js";
import type { RenderResources } from "./RenderResources.js";
import type { ShaderPipeline } from "./ShaderPipeline.js";
export class TransparencyPass {
  render(
    renderer: WebGPURenderer,
    scene: Scene,
    camera: N8AOCamera,
    resources: RenderResources,
    shaders: ShaderPipeline,
  ) {
    const oldBackground = scene.background,
      oldBackgroundNode = scene.backgroundNode,
      oldOverride = scene.overrideMaterial;
    const callback = renderer.getRenderObjectFunction(),
      oldClear = renderer.getClearColor(new Color()),
      oldAlpha = renderer.getClearAlpha();
    const oldAuto = renderer.autoClear,
      oldDepth = renderer.autoClearDepth;
    try {
      scene.background = null;
      scene.backgroundNode = null;
      scene.overrideMaterial = null;
      renderer.setClearColor(0, 0);
      for (const [withDepth, rt] of [
        [false, resources.transparencyOff],
        [true, resources.transparencyOn],
      ] as const) {
        renderer.setRenderObjectFunction(null);
        renderer.autoClearDepth = true;
        shaders.draw(renderer, shaders.depthCopy, rt, true);
        renderer.autoClear = false;
        renderer.autoClearDepth = false;
        renderer.setRenderObjectFunction(
          (object, sc, camera, geometry, material, group, ...rest) => {
            const special = object.userData || {};
            const accepted = withDepth
              ? material.transparent &&
                material.depthWrite &&
                !special.treatAsOpaque
              : (material.transparent &&
                  !material.depthWrite &&
                  !special.treatAsOpaque) ||
                special.cannotReceiveAO;
            if (accepted)
              renderer.renderObject(
                object,
                sc,
                camera,
                geometry,
                material,
                group,
                ...rest,
              );
          },
        );
        renderer.render(scene, camera);
      }
    } finally {
      scene.background = oldBackground;
      scene.backgroundNode = oldBackgroundNode;
      scene.overrideMaterial = oldOverride;
      renderer.setRenderObjectFunction(callback);
      renderer.setClearColor(oldClear, oldAlpha);
      renderer.autoClear = oldAuto;
      renderer.autoClearDepth = oldDepth;
    }
  }
}
