import { Fn, If, Loop, abs, clamp, cos, cross, dot, float, floor, fract, fwidth, min, sin, smoothstep, step, uv, vec2, vec3, vec4, } from "three/tsl";
import { DepthType } from "../core/configuration.js";
import { legacyFragmentPixel, legacyUV, safeNormalize } from "./common.js";
export function aoFragment(U, T, G, options) {
    return Fn(() => {
        const coord = uv(), depth = T.depth.sample(coord).r.toVar();
        const result = vec4(1).toVar();
        If(G.background(depth).not(), () => {
            const p = G.view(depth, coord).toVar();
            const normal = (options.halfRes
                ? T.normal.sample(coord).rgb
                : G.normal(T.depth, coord, U.resolution)).toVar();
            const noise = T.noise
                .sample(legacyFragmentPixel(U.targetResolution).div(128))
                .toVar();
            const jitter = fract(noise.rg.add(vec2(1.618033988749895, 1.324717957244746).mul(U.frame))).toVar();
            const helper = dot(vec3(0, 1, 0), normal)
                .greaterThan(0.99)
                .select(vec3(1, 0, 0), vec3(0, 1, 0));
            const tangent = safeNormalize(cross(helper, normal), vec3(1, 0, 0)).toVar();
            const bitangent = cross(normal, tangent).toVar();
            const angle = jitter.x.mul(3.1415962 * 2).toVar(), c = cos(angle), s = sin(angle);
            const radius = G.radiusAt(depth, coord, U.resolution, U.radius).toVar();
            const falloff = G.falloffAt(radius).toVar();
            // The bias term follows the depth derivative relative to the camera.
            const bias = min(0.1, falloff.mul(0.1))
                .div(U.near)
                .mul(fwidth(p.distance(U.cameraPosition)))
                .div(radius)
                .mul(U.biasMultiplier)
                .add(U.biasOffset)
                .toVar();
            const move = jitter.y.toVar(), occluded = float(0).toVar(), total = float(0).toVar();
            Loop(options.aoSamples, ({ i }) => {
                const sample = U.hemisphere.element(i);
                // Match the reference matrix product before applying the sample vector.
                const basisX = tangent.mul(c).sub(bitangent.mul(s));
                const basisY = tangent.mul(s).add(bitangent.mul(c));
                const direction = basisX
                    .mul(sample.x)
                    .add(basisY.mul(sample.y))
                    .add(normal.mul(sample.z))
                    .toVar();
                const samplePosition = p
                    .add(radius.mul(fract(move)).mul(direction))
                    .toVar();
                move.addAssign(1 / options.aoSamples);
                const projected = G.project(samplePosition).toVar();
                const valid = projected
                    .greaterThan(vec3(0))
                    .all()
                    .and(projected.lessThan(vec3(1)).all());
                If(valid, () => {
                    const sampleDepth = T.depth
                        .sample(projected.xy)
                        .level(float(0))
                        .r.toVar();
                    const ds = G.distance(sampleDepth, projected.xy).toVar();
                    let dw;
                    if (options.depthType === DepthType.Reverse)
                        dw = samplePosition.z.negate();
                    else if (options.orthographic)
                        dw = U.near.add(projected.z.mul(U.far.sub(U.near)));
                    else
                        dw = U.far
                            .mul(U.near)
                            .div(U.far.sub(projected.z.mul(U.far.sub(U.near))));
                    const range = smoothstep(0, 1, falloff.div(abs(ds.sub(dw)).max(1e-20)));
                    const diff = legacyFragmentPixel(U.targetResolution).sub(floor(legacyUV(projected.xy).mul(U.resolution)));
                    const weight = range
                        .mul(float(ds.notEqual(dw)))
                        .mul(float(sampleDepth.notEqual(depth)))
                        .mul(step(ds.add(bias), dw))
                        .mul(step(1, dot(diff, diff)));
                    occluded.addAssign(weight);
                    total.addAssign(1);
                });
            });
            result.assign(vec4(clamp(float(1).sub(occluded.div(total.max(1))), 0, 1), normal.mul(0.5).add(0.5)));
        });
        return result;
    })();
}
//# sourceMappingURL=ao.js.map