import test from "node:test";
import assert from "node:assert/strict";
import { PerspectiveCamera, Scene, Texture } from "three";
import { vec4 } from "three/tsl";
import { N8AONode } from "../../dist/index.js";

test("disposing an effect twice releases owned resources once and preserves external textures", () => {
  const effect = new N8AONode(new Scene(), new PerspectiveCamera());
  const color = new Texture(),
    depth = new Texture();
  let externalDisposals = 0,
    ownedDisposals = 0;
  color.addEventListener("dispose", () => externalDisposals++);
  depth.addEventListener("dispose", () => externalDisposals++);
  effect.beautyRenderTarget.addEventListener("dispose", () => ownedDisposals++);
  effect.setInputTextures(color, depth);
  effect.dispose();
  effect.dispose();
  assert.equal(ownedDisposals, 1);
  assert.equal(externalDisposals, 0);
});

test("a custom denoiser builds with the current context and replacing it resets history", () => {
  let context;
  const effect = new N8AONode(new Scene(), new PerspectiveCamera(), {
    denoiser: {
      name: "constant",
      create(value) {
        context = value;
        return vec4(1);
      },
    },
  });
  effect.shaders.rebuild(
    effect.configuration,
    effect.camera,
    effect.U,
    effect.T,
    null,
  );
  assert.equal(context.textures, effect.T);
  assert.equal(context.options.aoSamples, effect.configuration.aoSamples);
  assert.equal(effect.shaders.neural, null);
  effect._history.dirty = false;
  assert.equal(effect.setDenoiser(null), effect);
  assert.equal(effect._history.dirty, true);
  assert.equal(effect.shaders.customDenoiser, null);
  effect.dispose();
});
