# Contributing

Use Node.js 22 or newer and Python 3.10 or newer for browser tests.

```sh
npm ci
npm run dev
npm run check
```

## Architecture

| Module                       | Responsibility                                               |
| ---------------------------- | ------------------------------------------------------------ |
| `N8AONode`                   | RenderPipeline node, public controls and frame orchestration |
| `N8AOPass`, `N8AOPostPass`   | Explicit rendering adapters                                  |
| `core/Configuration`         | Validated, atomic configuration changes                      |
| `core/HistoryState`          | Accumulation invalidation and frame state                    |
| `rendering/RenderResources`  | Render-target allocation, resizing and disposal              |
| `rendering/ShaderPipeline`   | Material construction and fullscreen stages                  |
| `rendering/TransparencyPass` | Scene visibility and transparency masks                      |
| `rendering/Denoiser`         | Extension interface and built-in filter classes              |
| `tsl/`                       | Typed shader graphs for each rendering stage                 |
| `examples/`                  | Procedural scene classes and reusable viewer                 |
| `website/`, `docs/`          | Website UI and shared Markdown documentation                 |

Core modules use lowercase filenames; the table names their principal classes. Three.js declaration compatibility bridges are isolated in `rendering/ThreeCompatibility.ts`.

## Changes

Keep the public API typed. Dispose resources in the class that owns them. Restore renderer and scene state after temporary changes, including when rendering throws. Avoid introducing another copy of Three.js.

Run `npm run format` before submitting a pull request. Include a focused test for changes to configuration, history, resource ownership or public behavior. For shader changes, run the [browser suite](docs/compatibility.md) and inspect raw visibility, composition and difference images. Do not regenerate references solely to make a failing comparison pass.

Explain the problem, resulting behavior, and verification in the pull request. Report browser, adapter, Three.js version and a minimal scene when filing a rendering issue.
