import {
  Fn,
  abs,
  cross,
  dot,
  float,
  ivec2,
  log2,
  pow,
  screenCoordinate,
  vec2,
  vec3,
  vec4,
} from "three/tsl";
import type { Node, TextureNode } from "three/webgpu";
import { DepthType } from "../core/configuration.js";
import { clampPixel, matrixColumn } from "../rendering/ThreeCompatibility.js";
import type { ShaderOptions, Uniforms } from "./types.js";
/** Coordinate conversion is explicit: TSL screen UVs are top-left, N8AO noise is bottom-left. */
export const legacyUV = (uv: Node<"vec2">) => vec2(uv.x, uv.y.oneMinus());
// Fragment centers are exact half-integers. Interpolated UV * size can cross
// a checkerboard boundary through rounding, selecting the wrong depth sample.
export const legacyFragmentPixel = (resolution: Node<"vec2">) =>
  vec2(screenCoordinate.x, resolution.y.sub(screenCoordinate.y));
export const safeNormalize = (
  v: Node<"vec3">,
  fallback: Node<"vec3"> = vec3(0, 0, 1),
) =>
  dot(v, v)
    .greaterThan(1e-12)
    .select(v.mul(dot(v, v).max(1e-12).inverseSqrt()), fallback);
export const rotate2 = (v: Node<"vec2">, c: Node<"float">, s: Node<"float">) =>
  vec2(c.mul(v.x).add(s.mul(v.y)), s.negate().mul(v.x).add(c.mul(v.y)));
export function createGeometry(U: Uniforms, options: ShaderOptions) {
  const { depthType, orthographic } = options;
  const background = (d: Node<"float">) =>
    d.equal(depthType === DepthType.Reverse ? 0 : 1);
  const linearDepth = (d: Node<"float">) => {
    if (depthType !== DepthType.Log || orthographic) return d;
    // r186 WebGPURenderer encodes log2(-viewZ / near) / log2(far / near),
    // unlike the WebGL log2(1 - viewZ) / log2(1 + far) convention.
    const distance = U.near.mul(pow(2, d.mul(log2(U.far.div(U.near)))));
    return U.far
      .div(U.far.sub(U.near))
      .add(U.far.mul(U.near).div(U.near.sub(U.far)).div(distance.max(1e-20)));
  };
  const view = Fn(([depth, uv]: [Node<"float">, Node<"vec2">]) => {
    const d = linearDepth(depth);
    const z = depthType === DepthType.Reverse ? d : d.mul(2).sub(1);
    const clip = vec4(uv.x.mul(2).sub(1), uv.y.oneMinus().mul(2).sub(1), z, 1);
    if (!orthographic && depthType !== DepthType.Log) {
      const Q = U.inverseProjection;
      const p = vec3(
        matrixColumn(Q, 0).x.mul(clip.x).add(matrixColumn(Q, 3).x),
        matrixColumn(Q, 1).y.mul(clip.y).add(matrixColumn(Q, 3).y),
        matrixColumn(Q, 3).z,
      );
      return p.mul(
        float(1).div(matrixColumn(Q, 2).w.mul(z).add(matrixColumn(Q, 3).w)),
      );
    }
    const p = U.inverseProjection.mul(clip).toVar();
    return p.xyz.div(p.w);
  });
  const project = Fn(([p]: [Node<"vec3">]) => {
    const clip = U.projection.mul(vec4(p, 1)).toVar();
    const ndc = clip.xyz.div(clip.w).toVar();
    const z = depthType === DepthType.Reverse ? ndc.z : ndc.z.mul(0.5).add(0.5);
    return vec3(ndc.x.mul(0.5).add(0.5), ndc.y.mul(-0.5).add(0.5), z);
  });
  const distance = (d: Node<"float">, uv: Node<"vec2">) => {
    if (depthType === DepthType.Reverse) return view(d, uv).z.negate();
    if (orthographic) return U.near.add(d.mul(U.far.sub(U.near)));
    if (depthType === DepthType.Log) {
      // Keep the reference's round trip through conventional device depth;
      // algebraically simplifying it changes float32 rounding at long range.
      return U.far
        .mul(U.near)
        .div(U.far.sub(linearDepth(d).mul(U.far.sub(U.near))));
    }
    return U.far.mul(U.near).div(U.far.sub(d.mul(U.far.sub(U.near))));
  };
  // A color texture is used for half-resolution depth; .r works for both scalar depth and RGBA nodes.
  const load = (tex: TextureNode, pixel: Node<"ivec2">, size: Node<"ivec2">) =>
    tex.load(ivec2(clampPixel(pixel, ivec2(0), size.sub(1)))).r;
  const normal = (tex: TextureNode, uv: Node<"vec2">, size: Node<"vec2">) =>
    Fn(() => {
      // Legacy texelFetch addresses are bottom-left. Convert AFTER integer truncation;
      // merely flipping UV before truncation differs for odd half-resolution targets.
      const actualSize = ivec2(tex.size(float(0)) as Node<"vec2">).toVar();
      const p = ivec2(legacyUV(uv).mul(size)).toVar();
      const fetchGL = (x: number, y: number) =>
        load(
          tex,
          ivec2(p.x.add(x), actualSize.y.sub(1).sub(p.y.add(y))),
          actualSize,
        );
      const c = fetchGL(0, 0).toVar();
      const l1 = fetchGL(-1, 0).toVar(),
        l2 = fetchGL(-2, 0).toVar();
      const r1 = fetchGL(1, 0).toVar(),
        r2 = fetchGL(2, 0).toVar();
      const b1 = fetchGL(0, -1).toVar(),
        b2 = fetchGL(0, -2).toVar();
      const t1 = fetchGL(0, 1).toVar(),
        t2 = fetchGL(0, 2).toVar();
      const ce = view(c, uv).toVar(),
        dx = vec2(float(1).div(size.x), 0),
        dy = vec2(0, float(1).div(size.y));
      const dl = abs(l1.mul(2).sub(l2).sub(c)),
        dr = abs(r1.mul(2).sub(r2).sub(c));
      const db = abs(b1.mul(2).sub(b2).sub(c)),
        dt = abs(t1.mul(2).sub(t2).sub(c));
      const dpdx = dl
        .lessThan(dr)
        .select(ce.sub(view(l1, uv.sub(dx))), view(r1, uv.add(dx)).sub(ce));
      const dpdy = db
        .lessThan(dt)
        .select(ce.sub(view(b1, uv.add(dy))), view(t1, uv.sub(dy)).sub(ce));
      return safeNormalize(cross(dpdx, dpdy));
    })();
  const radiusAt = (
    d: Node<"float">,
    uv: Node<"vec2">,
    resolution: Node<"vec2">,
    radius: Node<"float">,
  ) =>
    U.screenSpaceRadius.select(
      view(d, uv).distance(view(d, uv.add(vec2(radius, 0).div(resolution)))),
      radius,
    );
  const falloffAt = (radius: Node<"float">) =>
    radius.mul(U.distanceFalloff).mul(U.screenSpaceRadius.select(1, 0.2));
  return {
    background,
    linearDepth,
    view,
    project,
    distance,
    load,
    normal,
    radiusAt,
    falloffAt,
  };
}
