/** Camera-static accumulation, as in N8AO. This is NOT motion-vector reprojection. */
export class HistoryState {
  frame: number;
  dirty: boolean;
  view: number[] | null;
  projection: number[] | null;
  constructor() {
    this.frame = -1;
    this.dirty = true;
    this.view = null;
    this.projection = null;
  }
  reset() {
    this.dirty = true;
  }
  begin(
    view: ArrayLike<number>,
    projection: ArrayLike<number>,
    accumulate: boolean,
    samples: number,
  ) {
    if (view.length !== 16 || projection.length !== 16)
      throw new TypeError("Camera matrices must contain 16 elements.");
    if (!Number.isInteger(samples) || samples <= 0)
      throw new RangeError("samples must be positive.");
    const equal = (a: number[] | null, b: ArrayLike<number>) =>
      a && a.every((v, i) => v === b[i]);
    this.frame =
      accumulate &&
      !this.dirty &&
      equal(this.view, view) &&
      equal(this.projection, projection)
        ? this.frame + 1
        : 0;
    this.view = Array.from(view);
    this.projection = Array.from(projection);
    this.dirty = false;
    const limit = Math.ceil(1024 / samples);
    return {
      frame: this.frame,
      render: this.frame < limit,
      limit,
      samples: Math.min(this.frame + 1, limit) * samples,
    };
  }
}
/** The original blend stores normal X/Y in G/B, but sets history alpha to 1. */
export function accumulateRGBA(
  previous: number[],
  current: number[],
  frame: number,
) {
  if (!Number.isInteger(frame) || frame < 0)
    throw new RangeError("frame must be nonnegative.");
  const weight = 1 / (frame + 1);
  return [
    ...current
      .slice(0, 3)
      .map((v, i) =>
        frame === 0 ? v : previous[i] * (1 - weight) + v * weight,
      ),
    1,
  ];
}
