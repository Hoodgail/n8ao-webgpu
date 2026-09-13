# Denoising and extension points

The default bilateral filter respects depth and surface normals. The neural filter uses the bundled N8AO attention model on the second filter iteration.

## Neural filtering

```ts
ao.setQualityMode("Neural-High");
```

The neural filter requires 16 AO samples, 4/8/16 filter samples, radius 12, two iterations, and full resolution. A neural preset sets those values together. Incompatible later settings fall back to bilateral filtering and issue a warning.

## Implement a custom filter

A denoiser creates a fragment node. It can read input visibility and encoded normals, depth, frame and iteration uniforms, and the current shader options.

```ts
import { uv } from "three/tsl";
import type { Node } from "three/webgpu";
import type { Denoiser, DenoiserContext } from "n8ao-webgpu";

// A minimal pass-through filter, useful as a starting point.
class PassthroughDenoiser implements Denoiser {
  readonly name = "passthrough";

  create({ textures }: DenoiserContext): Node<"vec4"> {
    return textures.input.sample(uv());
  }
}

ao.setDenoiser(new PassthroughDenoiser());
// Restore preset-driven bilateral/neural behavior:
ao.setDenoiser(null);
```

Return visibility in red and the encoded normal in the remaining channels. The built-in stages expect this layout. Do not replace those channels with color output.

The effect updates `textures.input` before each iteration and supplies ping-pong targets. The custom filter is used on each configured denoising iteration. Changing filters rebuilds the pipeline and resets history.

## Architecture

| Module             | Responsibility                                                     |
| ------------------ | ------------------------------------------------------------------ |
| `N8AONode`         | Public API, renderer lifecycle, scene capture and history updates. |
| `Configuration`    | Validation and atomic settings changes.                            |
| `RenderResources`  | Render-target ownership, resizing and disposal.                    |
| `ShaderPipeline`   | Material compilation and stage scheduling.                         |
| `TransparencyPass` | Transparent color/depth masks with renderer-state restoration.     |
| `HistoryState`     | Camera-static accumulation decisions.                              |
| `NeuralModel`      | Model validation and CPU evaluation.                               |
| `tsl/`             | Typed shader graph builders.                                       |

GPU resources are instance-owned. Caller textures and scene resources are never disposed by the effect.
