function count(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 4096)
    throw new RangeError("Sample count must be an integer in [1, 4096].");
}
/** Golden-angle hemisphere sequence. The rounded angle preserves sampling behavior. */
export function hemisphereSamples(n: number): [number, number, number][] {
  count(n);
  return Array.from({ length: n }, (_, k) => {
    const theta = 2.399963 * k;
    const r = Math.sqrt(k + 0.5) / Math.sqrt(n);
    const x = r * Math.cos(theta),
      y = r * Math.sin(theta);
    return [x, y, Math.sqrt(Math.max(0, 1 - (x * x + y * y)))];
  });
}
export function denoiseSamples(n: number, rings = 11): [number, number][] {
  count(n);
  if (!Number.isFinite(rings) || rings <= 0)
    throw new RangeError("rings must be positive.");
  const angleStep = (2 * Math.PI * rings) / n,
    radiusStep = 1 / n;
  let radius = radiusStep,
    angle = 0;
  return Array.from({ length: n }, () => {
    const r = Math.pow(radius, 0.75);
    const result: [number, number] = [Math.cos(angle) * r, Math.sin(angle) * r];
    radius += radiusStep;
    angle += angleStep;
    return result;
  });
}
export function rotatedFrameNoise(red: number, green: number, frame: number) {
  const fract = (x: number) => x - Math.floor(x);
  return [
    fract(red + 1.618033988749895 * frame),
    fract(green + 1.324717957244746 * frame),
  ];
}
