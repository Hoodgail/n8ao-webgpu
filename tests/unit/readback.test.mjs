import { test } from "node:test";
import assert from "node:assert/strict";
import { encode } from "../browser/readback.js";

test("WebGPU odd-width RGBA8 readback strips padding, including a short last row", () => {
  const buffer = new Uint8Array(256 + 12).fill(99);
  buffer.set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  buffer.set([13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24], 256);
  const result = encode(buffer, 3, 2, false, true);
  assert.deepEqual(
    [...Buffer.from(result.bytes, "base64")],
    Array.from({ length: 24 }, (_, i) => i + 1),
  );
});
test("WebGL bottom-up rows become top-down without changing translucent RGB bytes", () => {
  const result = encode(
    new Uint8Array([5, 6, 7, 8, 254, 128, 1, 2]),
    1,
    2,
    true,
  );
  assert.deepEqual(
    [...Buffer.from(result.bytes, "base64")],
    [254, 128, 1, 2, 5, 6, 7, 8],
  );
});
test("Readback rejects truncated data instead of encoding a misleading image", () => {
  assert.throws(
    () => encode(new Uint8Array(12), 3, 2, false, true),
    /Readback size/,
  );
});
