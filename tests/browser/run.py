"""Render native WebGPU fixtures and compare with the native reference images."""

import argparse, base64, functools, http.server, json, os, threading
from pathlib import Path
from PIL import Image, ImageChops
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--case", action="append", help="Fixture ID (repeatable)")
args = parser.parse_args()
cases = json.loads((ROOT / "tests/browser/fixtures.json").read_text())
if args.case:
    unknown = set(args.case) - {c["id"] for c in cases}
    if unknown:
        parser.error("Unknown fixture: " + ", ".join(unknown))
    cases = [c for c in cases if c["id"] in args.case]


class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args):
        pass


server = http.server.ThreadingHTTPServer(
    ("127.0.0.1", 0), functools.partial(Handler, directory=str(ROOT))
)
threading.Thread(target=server.serve_forever, daemon=True).start()
out = ROOT / "test-results"
out.mkdir(exist_ok=True)
report = {
    "status": "running",
    "reference": "native WebGPU reference output, Three r186 / Chromium 153 / SwiftShader",
    "cases": [],
}
try:
    with sync_playwright() as p:
        flags = [
            "--no-sandbox",
            "--disable-dev-shm-usage",
            "--enable-unsafe-webgpu",
            "--enable-webgpu-developer-features",
        ]
        if os.getenv("N8AO_SOFTWARE_GPU", "1") == "1":
            flags += [
                "--use-angle=swiftshader",
                "--enable-features=Vulkan",
                "--use-vulkan=swiftshader",
                "--disable-vulkan-surface",
            ]
        options = {"headless": True, "args": flags}
        if os.getenv("CHROMIUM_EXECUTABLE"):
            options["executable_path"] = os.environ["CHROMIUM_EXECUTABLE"]
        browser = p.chromium.launch(**options)
        report["browser"] = browser.version
        try:
            for spec in cases:
                item = {"id": spec["id"], "status": "failed"}
                context = browser.new_context()
                page = context.new_page()
                errors = []
                page.on("pageerror", lambda error: errors.append(str(error)))
                page.on(
                    "console",
                    lambda message: (
                        errors.append(message.text) if message.type == "error" else None
                    ),
                )
                try:
                    page.goto(
                        f"http://127.0.0.1:{server.server_port}/tests/browser/index.html",
                        timeout=60000,
                    )
                    page.wait_for_function("window.ready === true", timeout=90000)
                    result = page.evaluate("spec => window.runCase(spec)", spec)
                    if errors:
                        raise RuntimeError("\n".join(errors))
                    item["adapter"] = result["adapter"]
                    item["metrics"] = {}
                    folder = out / spec["id"]
                    folder.mkdir(exist_ok=True)
                    for field, suffix in [("rgba", "combined"), ("rawRGBA", "raw-ao")]:
                        data = result[field]
                        image = Image.frombytes(
                            "RGBA",
                            (data["width"], data["height"]),
                            base64.b64decode(data["bytes"]),
                        )
                        image.save(folder / f"{suffix}.png")
                        reference = Image.open(
                            ROOT
                            / "tests/browser/reference"
                            / spec["id"]
                            / f"webgpu-{suffix}.png"
                        ).convert("RGBA")
                        if reference.size != image.size:
                            raise RuntimeError("Readback dimensions changed.")
                        a, b = reference.tobytes(), image.tobytes()
                        diff = [abs(x - y) for x, y in zip(a, b)]
                        item["metrics"][suffix] = {
                            "identical": a == b,
                            "changed_pixels": sum(
                                any(diff[i : i + 4]) for i in range(0, len(diff), 4)
                            ),
                            "mean_absolute_error": sum(diff) / len(diff),
                            "maximum_error": max(diff),
                        }
                        ImageChops.difference(reference, image).convert("RGB").point(
                            lambda x: min(255, x * 8)
                        ).save(folder / f"{suffix}-difference.png")
                    item["status"] = (
                        "passed"
                        if all(m["identical"] for m in item["metrics"].values())
                        else "failed"
                    )
                except Exception as error:
                    item["error"] = str(error)
                finally:
                    context.close()
                report["cases"].append(item)
                print(f"{item['id']}: {item['status']}", flush=True)
                (out / "browser.json").write_text(json.dumps(report, indent=2) + "\n")
            report["status"] = (
                "passed"
                if all(c["status"] == "passed" for c in report["cases"])
                else "failed"
            )
            (out / "browser.json").write_text(json.dumps(report, indent=2) + "\n")
        finally:
            browser.close()
finally:
    server.shutdown()
raise SystemExit(0 if report["status"] == "passed" else 1)
