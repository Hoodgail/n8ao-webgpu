import { Fn, If, Loop, abs, clamp, cos, cross, dot, exp, float, sin, uv, vec2, vec3, vec4, } from "three/tsl";
import { legacyFragmentPixel, rotate2, safeNormalize } from "./common.js";
import { neuralKernel } from "./neural.js";
export function denoiseFragment(U, T, G, options, model = null) {
    const neural = model ? neuralKernel(model) : null;
    return Fn(() => {
        const coord = uv(), data = T.input.sample(coord).toVar(), depth = T.depth.sample(coord).r.toVar();
        const result = vec4(data).toVar();
        If(G.background(depth).not(), () => {
            const normal = data.gba.mul(2).sub(1).toVar(), p = G.view(depth, coord).toVar();
            const noise = T.noise
                .sample(legacyFragmentPixel(U.targetResolution).div(128))
                .toVar();
            const channel = neural
                ? noise.b
                : U.iteration
                    .equal(0)
                    .select(noise.a, U.iteration
                    .equal(1)
                    .select(noise.b, U.iteration.equal(2).select(noise.g, noise.r)));
            const angle = channel.mul(Math.PI * 2).toVar(), c = cos(angle), s = sin(angle);
            const radius = G.radiusAt(depth, coord, U.resolution, U.radius).toVar(), falloff = G.falloffAt(radius).toVar();
            const occlusion = float(data.r).toVar(), count = float(1).toVar();
            let state;
            let frameNormal, tangent, bitangent;
            if (neural) {
                state = neural.createState();
                frameNormal = safeNormalize(normal).toVar();
                const helper = abs(frameNormal.z)
                    .lessThan(0.999)
                    .select(vec3(0, 0, 1), vec3(0, 1, 0));
                tangent = safeNormalize(cross(helper, frameNormal), vec3(1, 0, 0)).toVar();
                bitangent = cross(frameNormal, tangent).toVar();
            }
            Loop(options.denoiseSamples, ({ i }) => {
                const rotated = rotate2(U.poisson.element(i), c, s);
                const offset = vec2(rotated.x, rotated.y.negate())
                    .mul(vec2(1).div(U.resolution))
                    .mul(U.denoiseRadius);
                const sampleUV = coord.add(offset).toVar(), sample = T.input.sample(sampleUV).toVar();
                const dn = T.depth.sample(sampleUV).r.toVar(), nn = sample.gba.mul(2).sub(1).toVar();
                const delta = G.view(dn, sampleUV).sub(p).toVar(), planeDistance = abs(dot(delta, normal)).toVar();
                const weight = float(G.background(dn).not())
                    .mul(exp(planeDistance.negate().mul(float(1).div(falloff))))
                    .mul(dot(normal, nn).max(0));
                occlusion.addAssign(sample.r.mul(weight));
                count.addAssign(weight);
                if (neural)
                    If(G.background(dn).not(), () => {
                        const localDelta = vec3(dot(tangent, delta), dot(bitangent, delta), dot(frameNormal, delta))
                            .div(radius.max(1e-6))
                            .toVar();
                        const safeN = safeNormalize(nn).toVar();
                        const localNormal = vec3(dot(tangent, safeN), dot(bitangent, safeN), dot(frameNormal, safeN)).toVar();
                        neural.tap(state, [
                            localDelta.x,
                            localDelta.y,
                            localDelta.z,
                            localNormal.x,
                            localNormal.y,
                            localNormal.z,
                            sample.r,
                            planeDistance.div(falloff.max(1e-6)),
                        ]);
                    });
            });
            occlusion.assign(clamp(occlusion.div(count.max(1e-12)), 0, 1));
            If(occlusion.equal(0), () => {
                occlusion.assign(1);
            });
            if (neural)
                occlusion.assign(clamp(occlusion.add(neural.finish(state, occlusion, U.radius, U.distanceFalloff)), 0, 1));
            result.assign(vec4(occlusion, normal.mul(0.5).add(0.5)));
        });
        return result;
    })();
}
//# sourceMappingURL=denoise.js.map