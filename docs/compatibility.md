# Compatibility and testing

## Supported configuration

The package targets Three.js **r186** with native WebGPU, perspective and orthographic cameras, standard, logarithmic and reversed depth, full or half-resolution AO, fog, and transparent meshes. RenderPipeline and the explicit render adapters share the same implementation.

## Differences from WebGL N8AO

The algorithm and model are derived from N8AO 2.0.1. WebGPU and WebGL do not render every pixel identically. Depth precision, shader arithmetic and rasterization can differ between backends and adapters. This package does not claim bitwise equivalence to WebGL N8AO.

The original reversed-depth half-resolution initialization has a stale-shader defect. This implementation selects the correct depth convention for its downsampling stage instead of reproducing that artifact.

Color management follows RenderPipeline conventions: gamma correction is off inside the effect by default. Native logarithmic depth uses the renderer's r186 encoding. The final composition target uses float32 to preserve precision before display conversion.

## Scope

- Ambient occlusion is screen-space; offscreen geometry cannot contribute.
- Camera-static accumulation is not motion-vector reprojection.
- WebGL composers, stencil-mask composer passes and per-eye XR/ArrayCamera processing are not supported.
- Device loss requires recreating the renderer and effect.
- Debug timing measures CPU submission, not GPU duration.
- The automated visual baseline uses a software adapter. Hardware-specific differences remain possible.

## Test commands

```sh
npm ci
npm run check

# Browser tests are optional during ordinary development.
python -m pip install -r requirements-test.txt
python -m playwright install chromium  # macOS/Windows; Linux x64 uses the pinned browser
npm run test:browser
```

`npm run check` type-checks the library and website, runs the unit tests, and builds both outputs. The browser suite renders 45 native WebGPU fixtures and compares RGBA8 combined and raw-visibility output with the native regression baseline. It does not compare against WebGL or certify cross-backend identity.

The reference images were rendered with Three.js r186, Chromium 153.0.8010.0, and SwiftShader. On Linux x64, the test command extracts the pinned Chromium package automatically. Other platforms use Playwright’s installed browser. Use `CHROMIUM_EXECUTABLE` to select an installed Chromium build. `N8AO_SOFTWARE_GPU=0` requests normal hardware selection; exact image comparisons can differ on another adapter.

Results are written to `test-results/`, which is ignored by Git. Missing WebGPU support, shader errors, and image mismatches fail the run. Reference images are not updated automatically.
