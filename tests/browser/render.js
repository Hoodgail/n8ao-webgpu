import * as THREE from "three";
import * as GPU from "three/webgpu";
import { texture, uv } from "three/tsl";
import { N8AONode } from "n8ao-webgpu";
import { createScene } from "./scene.js";
import { encode } from "./readback.js";
export async function runCase(spec) {
  const width = spec.width ?? 320,
    height = spec.height ?? 240;
  const fixture = await createScene(spec);
  const renderer = new GPU.WebGPURenderer({
    antialias: false,
    alpha: true,
    logarithmicDepthBuffer: spec.depth === "log",
    reversedDepthBuffer: spec.depth === "reverse",
  });
  let pass, pipeline, output, copy, quad;
  const errors = [];
  try {
    renderer.setPixelRatio(1);
    renderer.setSize(width, height, false);
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
    await renderer.init();
    if (!renderer.backend.isWebGPUBackend)
      throw new Error("Native WebGPU is required.");
    const device = renderer.backend.device;
    device.addEventListener("uncapturederror", (event) =>
      errors.push(event.error.message),
    );
    pass = new N8AONode(fixture.scene, fixture.camera, {
      width,
      height,
      autoSize: false,
    });
    if (spec.quality) pass.setQualityMode(spec.quality);
    const config = {
      aoRadius: 1.5,
      intensity: 3,
      gammaCorrection: false,
      ...spec.configuration,
    };
    if (config.color) config.color = new THREE.Color(...config.color);
    pass.configure(config);
    output = new GPU.RenderTarget(width, height, {
      type: THREE.UnsignedByteType,
      depthBuffer: false,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    });
    copy = new GPU.NodeMaterial();
    copy.fragmentNode = texture(pass.outputTexture).sample(uv());
    copy.depthTest = false;
    copy.depthWrite = false;
    copy.toneMapped = false;
    copy.blending = THREE.NoBlending;
    quad = new GPU.QuadMesh(copy);
    if (spec.integration === "pipeline") {
      pipeline = new GPU.RenderPipeline(renderer);
      pipeline.outputNode = pass;
      pipeline.outputColorTransform = false;
    }
    const draw = async () => {
      device.pushErrorScope("validation");
      if (pipeline) {
        renderer.setRenderTarget(output);
        pipeline.render();
      } else {
        pass.updateBefore({ renderer });
        renderer.setRenderTarget(output);
        quad.render(renderer);
      }
      await device.queue.onSubmittedWorkDone();
      const error = await device.popErrorScope();
      if (error) errors.push(error.message);
      if (errors.length) throw new Error(errors.join("\n"));
    };
    for (let i = 0; i < (spec.frames ?? 1); i++) await draw();
    let w = width,
      h = height;
    if (spec.mutate === "camera") {
      fixture.camera.position.x += 0.35;
      fixture.camera.lookAt(0, 0.7, 0);
      await draw();
      if (pass.frame !== 0) throw new Error("History did not reset.");
    }
    if (spec.mutate === "resize") {
      w++;
      h += 3;
      renderer.setSize(w, h, false);
      fixture.resize(w, h);
      output.setSize(w, h);
      pass.setSize(w, h);
      await draw();
      if (pass.frame !== 0) throw new Error("History did not reset.");
    }
    const rgba = encode(
      await renderer.readRenderTargetPixelsAsync(output, 0, 0, w, h),
      w,
      h,
      false,
      true,
    );
    const rawTarget = new GPU.RenderTarget(
      pass.internalWidth,
      pass.internalHeight,
      {
        type: THREE.UnsignedByteType,
        depthBuffer: false,
        minFilter: THREE.NearestFilter,
        magFilter: THREE.NearestFilter,
      },
    );
    let rawRGBA;
    try {
      copy.fragmentNode = texture(pass.aoTexture).sample(uv()).rrrr;
      copy.needsUpdate = true;
      renderer.setRenderTarget(rawTarget);
      quad.render(renderer);
      rawRGBA = encode(
        await renderer.readRenderTargetPixelsAsync(
          rawTarget,
          0,
          0,
          rawTarget.width,
          rawTarget.height,
        ),
        rawTarget.width,
        rawTarget.height,
        false,
        true,
      );
    } finally {
      rawTarget.dispose();
    }
    if (errors.length) throw new Error(errors.join("\n"));
    return {
      rgba,
      rawRGBA,
      renderer: "native-webgpu",
      frame: pass.frame,
      adapter: {
        vendor: device.adapterInfo?.vendor,
        architecture: device.adapterInfo?.architecture,
      },
    };
  } finally {
    pipeline?.dispose();
    copy?.dispose();
    output?.dispose();
    pass?.dispose();
    fixture.dispose();
    renderer.dispose();
  }
}
