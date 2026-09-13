# Explore the scenes

Run `npm run dev` from the repository, then open the local URL. The Overview and Examples tabs share the interactive viewer. Drag to orbit, scroll to zoom, and use Reset camera to restore the initial view.

| Scene             | What it demonstrates                                               |
| ----------------- | ------------------------------------------------------------------ |
| Contact study     | World-space radius, object contact and fine silhouettes.           |
| Quiet courtyard   | Half-resolution AO and depth-aware upsampling across architecture. |
| Objects in light  | Neural denoising on curved product geometry.                       |
| Through the glass | Transparent materials with both depth-write modes.                 |
| Small details     | Pixel-sized AO radius on closely spaced geometry.                  |
| A longer view     | Logarithmic depth and fog through repeated archways.               |

Each example is a TypeScript class in `examples/scenes.ts` extending `ExampleScene`. Geometry is procedural, and the shared lifecycle disposes materials, geometry and GPU resources when switching scenes.

`examples/ExampleViewer.ts` demonstrates renderer initialization, OrbitControls, responsive sizing, accumulation, filter changes and cleanup. The Copy configuration button exports the current settings as executable TypeScript.

## Build the documentation site

```sh
npm run build:docs
npm run preview
```

The static output is written to `site-dist/`. The supplied GitHub Pages workflow builds and deploys it when enabled in a fork. Relative asset paths support project subdirectories.
