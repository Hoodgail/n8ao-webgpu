# A little more dimension

N8AO WebGPU adds screen-space ambient occlusion to a Three.js scene. It captures color and depth, estimates occlusion, filters the result and composites it through the native render pipeline.

## Install

```sh
npm install three-n8ao-webgpu three@~0.186.0
```

Use one copy of Three.js throughout your application. The package targets **Three.js r186**, an ES module build, and a browser with native WebGPU. Your application must run on HTTPS or localhost.

## Add the effect

```ts
import { WebGPURenderer, RenderPipeline } from "three/webgpu";
import { n8ao } from "three-n8ao-webgpu";

const renderer = new WebGPURenderer({ antialias: false });
renderer.setSize(window.innerWidth, window.innerHeight);
await renderer.init();
document.body.appendChild(renderer.domElement);

// Use your existing Scene and PerspectiveCamera or OrthographicCamera.
const ao = n8ao(scene, camera, {
  aoRadius: 1.5,
  intensity: 3,
  accumulate: true,
});

const pipeline = new RenderPipeline(renderer);
pipeline.outputNode = ao;
renderer.setAnimationLoop(() => pipeline.render());
```

The effect captures the scene itself. An additional scene render is unnecessary unless you are supplying external color and depth textures.

## Resize and dispose

Automatic sizing follows the renderer's drawing-buffer dimensions. Update the camera projection and renderer size when the canvas changes.

```ts
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// When the view is removed:
renderer.setAnimationLoop(null);
pipeline.dispose();
ao.dispose();
renderer.dispose();
```

`dispose()` releases the effect's resources. It does not dispose your scene geometry, materials, renderer, or external input textures.

## Run the examples locally

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. The site includes six interactive scenes, quality presets, AO-only and split views, and copyable configurations. All example geometry is procedural.

N8AO is a screen-space effect. It does not bake lightmaps or generate physically traced indirect lighting.
