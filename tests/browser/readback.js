export function encode(bytes, width, height, bottomUp, padded = false) {
  const rowBytes = width * 4;
  const stride = padded ? Math.ceil(rowBytes / 256) * 256 : rowBytes;
  const expected = (height - 1) * stride + rowBytes;
  if (bytes.byteLength !== expected)
    throw new Error(`Readback size ${bytes.byteLength}; expected ${expected}`);
  const data = new Uint8Array(rowBytes * height);
  for (let y = 0; y < height; y++) {
    const sourceRow = bottomUp ? height - 1 - y : y;
    data.set(
      bytes.subarray(sourceRow * stride, sourceRow * stride + rowBytes),
      y * rowBytes,
    );
  }
  // Transfer raw bytes. Canvas PNG encoding can change RGB through alpha premultiplication.
  let binary = "";
  for (let i = 0; i < data.length; i += 8192)
    binary += String.fromCharCode(...data.subarray(i, i + 8192));
  return { bytes: btoa(binary), width, height };
}
