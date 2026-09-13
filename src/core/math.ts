import type { N8AOConfiguration } from "../types.js";
/** CPU utilities for depth reconstruction, sampling and composition. */
export const clamp = (x: number, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const dot = (a: number[], b: number[]) =>
  a.reduce((sum, x, i) => sum + x * b[i], 0);
export function perspectiveDepthToDistance(
  d: number,
  near: number,
  far: number,
) {
  return (far * near) / (far - d * (far - near));
}
export function orthographicDepthToDistance(
  d: number,
  near: number,
  far: number,
) {
  return near + (far - near) * d;
}
export function logarithmicDepthToDistance(d: number, far: number) {
  return Math.pow(2, d * Math.log2(far + 1)) - 1;
}
export function logarithmicToDeviceDepth(d: number, near: number, far: number) {
  return (
    far / (far - near) +
    (far * near) / (near - far) / logarithmicDepthToDistance(d, far)
  );
}
export function multiplyMatrixVector(m: ArrayLike<number>, v: number[]) {
  return [0, 1, 2, 3].map((row) =>
    v.reduce((sum, value, column) => sum + m[column * 4 + row] * value, 0),
  );
}
export function reconstructView(
  uv: number[],
  depth: number,
  inverseProjection: ArrayLike<number>,
  webgpu = true,
) {
  const clip = [
    uv[0] * 2 - 1,
    1 - uv[1] * 2,
    webgpu ? depth : depth * 2 - 1,
    1,
  ];
  const p = multiplyMatrixVector(inverseProjection, clip);
  return p.slice(0, 3).map((v) => v / p[3]);
}
export function bilateralWeight(
  delta: number[],
  normal: number[],
  sampleNormal: number[],
  falloff: number,
  background = false,
) {
  if (background) return 0;
  return (
    Math.exp(-Math.abs(dot(delta, normal)) / falloff) *
    Math.max(dot(normal, sampleNormal), 0)
  );
}
export function smoothstep(a: number, b: number, value: number) {
  const t = clamp((value - a) / (b - a));
  return t * t * (3 - 2 * t);
}
export function compositePixel(
  scene: number[],
  visibility: number,
  c: N8AOConfiguration,
  uvX = 0.25,
  width = 512,
  fog = 0,
  transparency = 0,
) {
  let ao = Math.pow(clamp(visibility), c.intensity);
  if (c.aoTones > 0) ao = Math.ceil(ao * c.aoTones) / c.aoTones;
  ao = ao * (1 - transparency) + transparency;
  ao = ao * (1 - fog) + fog;
  const tint = [c.color.r, c.color.g, c.color.b].map(
    (v, i) => v * (c.colorMultiply ? scene[i] : 1),
  );
  const combined = scene.slice(0, 3).map((v, i) => v * ao + tint[i] * (1 - ao));
  const only = tint.map((v) => ao + v * (1 - ao));
  let rgb =
    c.renderMode === 1
      ? only
      : c.renderMode === 2
        ? scene.slice(0, 3)
        : combined;
  let alpha = scene[3];
  if (c.renderMode === 3 || c.renderMode === 4) {
    if (uvX < 0.5) rgb = scene.slice(0, 3);
    else if (Math.abs(uvX - 0.5) < 1 / width) {
      rgb = [1, 1, 1];
      alpha = 1;
    } else rgb = c.renderMode === 4 ? only : combined;
  }
  return [...rgb, alpha];
}
/** Convert bottom-left integer texel coordinates to top-left coordinates. */
export function legacyTexelToTopLeft(
  uv: number[],
  shaderResolution: number[],
  textureDimensions: number[],
) {
  return [
    Math.trunc(uv[0] * shaderResolution[0]),
    textureDimensions[1] - 1 - Math.trunc((1 - uv[1]) * shaderResolution[1]),
  ];
}
/** Convert only the clip-Z row: [-w,+w] = 2*[0,+w] - w. X/Y/W are unchanged. */
export function gpuProjectionToLegacy(matrix: ArrayLike<number>) {
  if (matrix.length !== 16 || !Array.from(matrix).every(Number.isFinite))
    throw new TypeError("Expected a finite 4x4 projection matrix.");
  const result = Array.from(matrix);
  for (let column = 0; column < 4; column++)
    result[column * 4 + 2] =
      2 * matrix[column * 4 + 2] - matrix[column * 4 + 3];
  return result;
}
