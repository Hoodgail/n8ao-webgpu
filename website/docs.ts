import quickStart from "../docs/quick-start.md?raw";
import configuration from "../docs/configuration.md?raw";
import api from "../docs/api.md?raw";
import denoising from "../docs/denoising.md?raw";
import compatibility from "../docs/compatibility.md?raw";
import examples from "../docs/examples.md?raw";
export const documents = [
  { id: "quick-start", title: "Getting started", markdown: quickStart },
  { id: "configuration", title: "Configuration", markdown: configuration },
  { id: "api", title: "API reference", markdown: api },
  { id: "denoising", title: "Denoising & extensions", markdown: denoising },
  { id: "examples", title: "Example scenes", markdown: examples },
  {
    id: "compatibility",
    title: "Compatibility & testing",
    markdown: compatibility,
  },
];
