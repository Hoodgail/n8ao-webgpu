import "@fontsource/dm-sans/latin-400.css";
import "@fontsource/dm-sans/latin-500.css";
import "@fontsource/dm-sans/latin-600.css";
import "@fontsource/instrument-serif/latin-400-italic.css";
import "./style.css";
import { marked } from "marked";
import { ExampleViewer } from "../examples/ExampleViewer.js";
import { examples } from "../examples/scenes.js";
import { documents } from "./docs.js";
import type { DisplayMode, QualityMode } from "../src/index.js";

function element<T extends HTMLElement = HTMLElement>(selector: string): T {
  const result = document.querySelector<T>(selector);
  if (!result) throw new Error(`Missing interface element: ${selector}`);
  return result;
}
const viewer = new ExampleViewer(element("#canvas-wrap"));
const message = element("#viewer-message");
const quality = element<HTMLSelectElement>("#quality");
const radius = element<HTMLInputElement>("#radius");
const intensity = element<HTMLInputElement>("#intensity");
const falloff = element<HTMLInputElement>("#falloff");
const half = element<HTMLInputElement>("#half");
const accumulate = element<HTMLInputElement>("#accumulate");
let currentId = "";
let currentQuality: QualityMode = "Medium";
let loadVersion = 0;
let toastTimer: ReturnType<typeof setTimeout>;

function notify(text: string): void {
  const toast = element("#toast");
  toast.textContent = text;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2300);
}
async function copy(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    notify("Copied to clipboard");
  } catch {
    notify("Clipboard unavailable. Select the code to copy it.");
  }
}
function optionsCode(): string {
  const c = viewer.configuration;
  if (!c) return "";
  return JSON.stringify(
    {
      aoRadius: c.aoRadius,
      intensity: c.intensity,
      distanceFalloff: c.distanceFalloff,
      aoSamples: c.aoSamples,
      denoiseSamples: c.denoiseSamples,
      denoiseRadius: c.denoiseRadius,
      denoiseIterations: c.denoiseIterations,
      halfRes: c.halfRes,
      accumulate: c.accumulate,
      screenSpaceRadius: c.screenSpaceRadius,
      neuralDenoise: c.neuralDenoise,
      transparencyAware: c.transparencyAware,
      renderMode: c.renderMode,
    },
    null,
    2,
  ).replace(/"(\w+)":/g, "$1:");
}
function integrationCode(): string {
  const c = viewer.configuration;
  return `import { RenderPipeline } from 'three/webgpu';\nimport { n8ao } from 'three-n8ao-webgpu';\n\nconst ao = n8ao(scene, camera, {\n  aoRadius: ${c?.aoRadius ?? 1.5},\n  intensity: ${c?.intensity ?? 3},\n  halfRes: ${c?.halfRes ?? false},\n  accumulate: ${c?.accumulate ?? true},\n});\n\nconst pipeline = new RenderPipeline(renderer);\npipeline.outputNode = ao;\nrenderer.setAnimationLoop(() => pipeline.render());`;
}
function updateControls(): void {
  const c = viewer.configuration;
  if (!c) return;
  quality.value = currentQuality;
  radius.max = c.screenSpaceRadius ? "64" : "5";
  radius.step = c.screenSpaceRadius ? "1" : ".05";
  radius.value = String(c.aoRadius);
  intensity.value = String(c.intensity);
  falloff.value = String(c.distanceFalloff);
  half.checked = c.halfRes;
  accumulate.checked = c.accumulate;
  element("#radius-value").textContent =
    c.aoRadius.toFixed(c.screenSpaceRadius ? 0 : 2) +
    (c.screenSpaceRadius ? " px" : "");
  element("#intensity-value").textContent = c.intensity.toFixed(1);
  element("#falloff-value").textContent = c.distanceFalloff.toFixed(2);
  element("#control-note").textContent =
    `${c.halfRes ? "Half" : "Full"} resolution · ${c.neuralDenoise ? "neural" : "bilateral"} denoising`;
  const modes: DisplayMode[] = ["Combined", "AO", "No AO", "Split", "Split AO"];
  document
    .querySelectorAll<HTMLButtonElement>("[data-mode]")
    .forEach((button) => {
      const selected = button.dataset.mode === modes[c.renderMode];
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  element("#integration-code").textContent = integrationCode();
}
function displayError(error: unknown): void {
  message.hidden = false;
  message.replaceChildren();
  const title = document.createElement("strong");
  title.textContent = "WebGPU could not start";
  const detail = document.createElement("p");
  detail.textContent = error instanceof Error ? error.message : String(error);
  message.append(title, detail);
  element("#render-status").textContent = "RENDERER UNAVAILABLE";
  document
    .querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>(
      ".controls input,.controls select,.controls button",
    )
    .forEach((control) => (control.disabled = true));
}
async function selectScene(id: string): Promise<void> {
  const definition =
    examples.find((example) => example.id === id) ?? examples[0];
  if (currentId === definition.id) return;
  const request = ++loadVersion;
  currentId = definition.id;
  element("#scene-title").textContent = definition.title;
  element("#scene-description").textContent = definition.description;
  document
    .querySelectorAll<HTMLButtonElement>(".scene-card")
    .forEach((button) => {
      const active = button.dataset.scene === definition.id;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  message.hidden = false;
  message.innerHTML = '<span class="spinner"></span><p>Starting WebGPU…</p>';
  element("#canvas-wrap").dataset.state = "loading";
  document
    .querySelectorAll<HTMLInputElement | HTMLButtonElement | HTMLSelectElement>(
      ".controls input,.controls select,.controls button",
    )
    .forEach((control) => (control.disabled = true));
  try {
    const loaded = await viewer.load(definition);
    if (!loaded || request !== loadVersion) return;
    currentQuality = definition.id === "product" ? "Neural-High" : "Medium";
    message.hidden = true;
    element("#canvas-wrap").dataset.state = "ready";
    document
      .querySelectorAll<
        HTMLInputElement | HTMLButtonElement | HTMLSelectElement
      >(".controls input,.controls select,.controls button")
      .forEach((control) => (control.disabled = false));
    updateControls();
  } catch (error) {
    if (request === loadVersion) {
      currentId = "";
      displayError(error);
    }
  }
}

const cards = element("#example-strip");
for (const [index, definition] of examples.entries()) {
  const button = document.createElement("button");
  button.className = "scene-card";
  button.dataset.scene = definition.id;
  button.setAttribute("aria-pressed", "false");
  button.innerHTML = `<div class="scene-thumbnail" data-number="0${index + 1}"><img src="${import.meta.env.BASE_URL}previews/${definition.id}.webp" alt="" loading="lazy" /></div><span class="scene-card-text"><strong>${definition.title}</strong><small>${definition.category}</small></span>`;
  button.addEventListener("click", () => {
    if (location.hash.startsWith("#examples"))
      location.hash = `examples/${definition.id}`;
    else void selectScene(definition.id);
  });
  cards.append(button);
}
element("#docs-nav").innerHTML = documents
  .map(
    (doc) => `<a href="#docs/${doc.id}" data-doc="${doc.id}">${doc.title}</a>`,
  )
  .join("");
function route(): void {
  const [section = "overview", id] = location.hash.slice(1).split("/");
  const docs = section === "docs";
  element("#documentation").hidden = !docs;
  element("#showcase").hidden = docs;
  document.body.classList.toggle("examples-page", section === "examples");
  document.querySelectorAll<HTMLElement>("[data-nav]").forEach((link) => {
    const active = link.dataset.nav === section;
    link.classList.toggle("active", active);
    if (active) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  if (docs) {
    const doc = documents.find((doc) => doc.id === id) ?? documents[0];
    element("#docs-content").innerHTML = marked.parse(doc.markdown, {
      async: false,
    });
    document
      .querySelectorAll<HTMLElement>("[data-doc]")
      .forEach((link) =>
        link.classList.toggle("active", link.dataset.doc === doc.id),
      );
    document.title = `${doc.title} — N8AO WebGPU`;
    window.scrollTo({ top: 0 });
  } else {
    document.title = "N8AO WebGPU — Depth in the details";
    void selectScene(
      section === "examples" ? (id ?? "contact") : currentId || "contact",
    );
  }
}
viewer.onError = displayError;
viewer.onRender = (frame, width, height) => {
  element("#render-status").textContent =
    `WEBGPU / ${width} × ${height} / FRAME ${frame}`;
};
quality.addEventListener("change", () => {
  currentQuality = quality.value as QualityMode;
  viewer.setQuality(currentQuality);
  updateControls();
});
for (const [input, key] of [
  [radius, "aoRadius"],
  [intensity, "intensity"],
  [falloff, "distanceFalloff"],
] as const)
  input.addEventListener("input", () => {
    viewer.configure({ [key]: Number(input.value) });
    updateControls();
  });
half.addEventListener("change", () => {
  const enabled = half.checked;
  if (enabled && viewer.configuration?.neuralDenoise) {
    currentQuality = "Medium";
    viewer.setQuality("Medium");
  }
  viewer.configure({ halfRes: enabled });
  updateControls();
});
accumulate.addEventListener("change", () => {
  viewer.configure({ accumulate: accumulate.checked });
  updateControls();
});
element("#display-options").addEventListener("click", (event) => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>(
    "button[data-mode]",
  );
  if (button) {
    viewer.setDisplay(button.dataset.mode as DisplayMode);
    updateControls();
  }
});
element("#reset-camera").addEventListener("click", () => viewer.resetCamera());
element("#install-copy").addEventListener(
  "click",
  () => void copy("npm install three-n8ao-webgpu three@~0.186.0"),
);
element("#copy-settings").addEventListener(
  "click",
  () =>
    void copy(
      `import { n8ao } from 'three-n8ao-webgpu';\n\nconst ao = n8ao(scene, camera, ${optionsCode()});`,
    ),
);
element("#copy-code").addEventListener(
  "click",
  () => void copy(integrationCode()),
);
window.addEventListener("hashchange", route);
window.addEventListener("pagehide", () => viewer.dispose(), { once: true });
route();
