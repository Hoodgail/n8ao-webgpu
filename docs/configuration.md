# Tune the result

Start with a quality preset, then adjust radius and intensity for your scene's scale.

```ts
ao.setQualityMode("High");
ao.configure({ aoRadius: 1.2, intensity: 2.5, halfRes: true });
ao.configuration.distanceFalloff = 0.8;
```

Configuration updates are validated before they are applied. Invalid updates throw and leave the previous configuration intact. Changing structural settings rebuilds the affected shaders; other settings update uniforms.

## Quality presets

| Preset        | AO samples | Filter samples | Filter radius |
| ------------- | ---------: | -------------: | ------------: |
| Performance   |          8 |              4 |            12 |
| Low           |         16 |              4 |            12 |
| Medium        |         16 |              8 |            12 |
| High          |         64 |              8 |             6 |
| Ultra         |         64 |             16 |             6 |
| Neural-Low    |         16 |              4 |            12 |
| Neural-Medium |         16 |              8 |            12 |
| Neural-High   |         16 |             16 |            12 |

Neural presets select full resolution and two filter iterations. Standard presets select bilateral filtering. Additional settings remain under your control.

## Occlusion

| Setting             | Default | Meaning                                                                               |
| ------------------- | ------- | ------------------------------------------------------------------------------------- |
| `aoRadius`          | `5`     | Positive radius in world units, or pixels with screen-space radius enabled.           |
| `intensity`         | `5`     | Nonnegative exponent applied to visibility. Zero disables the visual AO contribution. |
| `distanceFalloff`   | `1`     | Positive depth falloff controlling separation between nearby surfaces.                |
| `aoSamples`         | `16`    | Hemisphere sample count, from 1 to 256.                                               |
| `aoTones`           | `0`     | Number of discrete AO bands. Zero gives continuous shading.                           |
| `screenSpaceRadius` | `false` | Interpret radius in screen pixels.                                                    |
| `color`             | black   | Occlusion tint with finite `r`, `g`, `b` components.                                  |
| `colorMultiply`     | `true`  | Multiply the tint by scene color.                                                     |
| `biasOffset`        | `0`     | Additive occlusion bias.                                                              |
| `biasMultiplier`    | `0`     | Scale the depth-derivative bias term.                                                 |

## Filtering and resolution

| Setting                | Default | Meaning                                                      |
| ---------------------- | ------- | ------------------------------------------------------------ |
| `denoiseSamples`       | `8`     | Filter samples per iteration, from 1 to 64.                  |
| `denoiseRadius`        | `12`    | Filter radius in pixels.                                     |
| `denoiseIterations`    | `2`     | Filter iteration count, from 0 to 8.                         |
| `neuralDenoise`        | `false` | Enable the bundled neural filter on the second iteration.    |
| `halfRes`              | `false` | Compute AO at half width and half height.                    |
| `depthAwareUpsampling` | `true`  | Use depth and normals to reconstruct full-resolution output. |
| `accumulate`           | `false` | Average samples while the camera remains static.             |

## Display and input

Use `setDisplayMode('Combined' | 'AO' | 'No AO' | 'Split' | 'Split AO')` rather than numeric `renderMode` values. Split modes show the unoccluded scene on the left.

`gammaCorrection` defaults to `false` because RenderPipeline applies the final display transform. Enabling both conversions applies gamma twice.

`autoRenderBeauty` defaults to `true`. Setting it to `false` requires external color and depth textures. `transparencyAware` enables additional transparency passes. `stencil` allocates a stencil-capable beauty depth texture; it does not implement legacy composer stencil masks. The active renderer determines `depthBufferType` automatically.

Constructor options also include `width`, `height`, `autoSize`, `requireWebGPU`, `autoDetectTransparency`, and a custom `denoiser`. Native WebGPU is required by default.
