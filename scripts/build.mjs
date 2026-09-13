import { rm, copyFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
await rm(new URL("../dist/", import.meta.url), {
  recursive: true,
  force: true,
});
const result = spawnSync(
  process.execPath,
  ["node_modules/typescript/bin/tsc", "-p", "tsconfig.json"],
  { stdio: "inherit" },
);
process.exitCode = result.status ?? 1;

if (result.status === 0)
  await copyFile(
    new URL("../src/assets/NeuralDenoiseModel.json", import.meta.url),
    new URL("../dist/assets/NeuralDenoiseModel.json", import.meta.url),
  );
