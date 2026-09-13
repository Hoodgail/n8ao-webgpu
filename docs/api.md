# The rendering API

## N8AONode

```ts
new N8AONode(scene, camera, options?);
n8ao(scene, camera, options?);
```

Both create a node suitable for `RenderPipeline.outputNode`. The camera must be a perspective or orthographic camera. The helper returns the node with TSL method chaining enabled.

| Method                           | Behavior                                                      |
| -------------------------------- | ------------------------------------------------------------- |
| `configure(patch)`               | Apply a validated, atomic settings update. Returns this.      |
| `setQualityMode(name)`           | Apply a quality preset. Returns this.                         |
| `setDisplayMode(name)`           | Select the composite output mode. Returns this.               |
| `setSize(width, height)`         | Allocate full and internal-resolution targets. Returns this.  |
| `setInputTextures(color, depth)` | Reuse external textures from the same renderer. Returns this. |
| `clearInputTextures()`           | Resume capturing the scene. Returns this.                     |
| `getTextureNode()`               | Composited output as a TSL texture node.                      |
| `getAOTextureNode()`             | Accumulated visibility as a TSL texture node; read `.r`.      |
| `setDenoiser(denoiser)`          | Install a custom filter, or pass null for built-in behavior.  |
| `resetHistory()`                 | Restart static-camera accumulation. Returns this.             |
| `updateBefore({ renderer })`     | Render explicitly using an initialized WebGPURenderer.        |
| `dispose()`                      | Release owned resources; safe to call more than once.         |

`outputTexture` and `aoTexture` expose the corresponding Three.js textures. `width`, `height`, `internalWidth` and `internalHeight` report target dimensions. `frame` is zero-based. `beautyRenderTarget` exposes the scene capture target.

## Explicit rendering

`N8AOPass` copies its output to a native render target or the screen.

```ts
import { N8AOPass } from "n8ao-webgpu";

const effect = new N8AOPass(scene, camera, width, height);
effect.render(renderer, destination);

// Explicit passes use the dimensions you provide.
effect.setSize(width, height);
```

These adapters support Three.js WebGPURenderer. They are not plugins for WebGL EffectComposer or pmndrs postprocessing.

## External depth and color

```ts
const effect = new N8AOPass(scene, camera, width, height);
effect.setInputTextures(colorTexture, depthTexture);
effect.render(renderer, destination);
```

The textures must come from the same native renderer and camera with matching dimensions and depth conventions. Multisampled inputs must be resolved before use. External textures remain owned by the caller.

`N8AOPostPass` is the explicit input-buffer adapter:

```ts
const effect = new N8AOPostPass(scene, camera, width, height);
effect.render(renderer, destination, sceneRenderTarget);
```

The read target must contain a color texture and depth texture. Alternatively, call `setDepthTexture(depth)` and supply the color read target.

## Accumulation

Accumulation restarts when the camera, projection, dimensions, or configuration changes. Geometry and lighting changes with a static camera must call `resetHistory()` explicitly.

This is static-camera averaging, not motion-vector temporal reprojection. `firstFrame()` is an alias for `resetHistory()`.

Debug timing is CPU submission time. `enableDebugMode()` populates `lastTime`; it must not be interpreted as GPU execution time.
