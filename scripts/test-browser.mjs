import { spawnSync } from "node:child_process";

const env = { ...process.env };
if (
  !env.CHROMIUM_EXECUTABLE &&
  process.platform === "linux" &&
  process.arch === "x64"
) {
  const { default: chromium } = await import("@sparticuz/chromium");
  env.CHROMIUM_EXECUTABLE = await chromium.executablePath();
}
const result = spawnSync(
  env.PYTHON || "python",
  ["tests/browser/run.py", ...process.argv.slice(2)],
  { env, stdio: "inherit" },
);
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
