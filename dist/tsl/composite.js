import { Fn, If, abs, ceil, clamp, dot, exp, float, ivec2, mix, pow, smoothstep, uv, vec2, vec3, vec4, } from "three/tsl";
import { DepthType } from "../core/configuration.js";
import { clampPixel } from "../rendering/ThreeCompatibility.js";
import { legacyUV } from "./common.js";
export function compositeFragment(U, T, G, options) {
    return Fn(() => {
        const coord = uv(), scene = T.beauty.sample(coord).toVar(), depth = T.fullDepth.sample(coord).r.toVar();
        const info = vec4(T.history.sample(coord)).toVar();
        if (options.halfRes && options.depthAwareUpsampling) {
            If(G.background(depth), () => {
                info.assign(vec4(1, 0, 0, 1));
            }).Else(() => {
                const p = G.view(depth, coord).toVar(), normal = G.normal(T.fullDepth, coord, U.fullResolution).toVar();
                const radius = G.radiusAt(depth, coord, U.fullResolution, U.radius).toVar();
                const falloff = U.screenSpaceRadius
                    .select(radius.mul(U.distanceFalloff), U.distanceFalloff)
                    .toVar();
                const sum = vec4(0).toVar(), total = float(0).toVar();
                for (let x = -1; x <= 1; x++)
                    for (let y = -1; y <= 1; y++) {
                        // Sample the integer texel corner for depth-aware reconstruction.
                        const pGL = ivec2(legacyUV(coord).mul(U.fullResolution).mul(0.5).add(vec2(x, y))).toVar();
                        const pTop = ivec2(pGL.x, ivec2(U.targetResolution).y.sub(1).sub(pGL.y)).toVar();
                        const pixel = ivec2(clampPixel(pTop, ivec2(0), ivec2(U.targetResolution).sub(1)));
                        const sampleDepth = T.depth.load(pixel).r.toVar(), sample = T.history.load(pixel).toVar();
                        const sampleUV = legacyUV(vec2(pGL).div(U.fullResolution.mul(0.5)));
                        const sampleNormal = sample.gba.mul(2).sub(1);
                        const planeDistance = abs(dot(G.view(sampleDepth, sampleUV).sub(p), normal));
                        const weight = exp(planeDistance.negate().mul(float(1).div(falloff))).mul(dot(normal, sampleNormal).max(0));
                        total.addAssign(weight);
                        sum.addAssign(sample.mul(weight));
                    }
                If(total.greaterThan(0), () => {
                    info.assign(sum.div(total));
                });
            });
        }
        if (options.depthType === DepthType.Log) {
            info.r.assign(clamp(info.r, 0, 1));
            If(info.r.equal(0), () => {
                info.r.assign(1);
            });
        }
        const ao = pow(info.r.max(0), U.intensity).toVar();
        If(U.aoTones.greaterThan(0), () => {
            ao.assign(ceil(ao.mul(U.aoTones)).div(U.aoTones));
        });
        If(U.transparencyAware, () => {
            const off = T.transparencyOff.sample(coord).a;
            const on = T.transparencyOn.sample(coord).a;
            const sameDepth = T.transparencyDepth.sample(coord).r.equal(depth);
            const adjustment = off.max(on.oneMinus().mul(float(sameDepth)));
            ao.assign(mix(ao, 1, adjustment));
        });
        If(U.fog, () => {
            const distance = G.view(depth, coord).z.negate();
            const f = U.fogExp.select(float(1).sub(exp(U.fogDensity.mul(U.fogDensity).mul(distance.mul(distance)).negate())), smoothstep(U.fogNear, U.fogFar, distance));
            ao.assign(mix(ao, 1, f));
        });
        const tint = U.color
            .mul(U.colorMultiply.select(scene.rgb, vec3(1)))
            .toVar();
        const combined = vec4(mix(scene.rgb, tint, ao.oneMinus()), scene.a);
        const onlyAO = vec4(mix(vec3(1), tint, ao.oneMinus()), scene.a);
        const output = vec4(combined).toVar();
        If(U.renderMode.equal(1), () => {
            output.assign(onlyAO);
        });
        If(U.renderMode.equal(2), () => {
            output.assign(scene);
        });
        If(U.renderMode.greaterThanEqual(3), () => {
            If(coord.x.lessThan(0.5), () => {
                output.assign(scene);
            })
                .ElseIf(abs(coord.x.sub(0.5)).lessThan(float(1).div(U.fullResolution.x)), () => {
                output.assign(vec4(1));
            })
                .Else(() => {
                output.assign(U.renderMode.equal(3).select(combined, onlyAO));
            });
        });
        If(U.gammaCorrection, () => {
            const rgb = output.rgb.max(0).toVar();
            const low = rgb.mul(12.92), high = pow(rgb, vec3(0.41666)).mul(1.055).sub(0.055);
            output.rgb.assign(vec3(rgb.r.lessThanEqual(0.0031308).select(low.r, high.r), rgb.g.lessThanEqual(0.0031308).select(low.g, high.g), rgb.b.lessThanEqual(0.0031308).select(low.b, high.b)));
        });
        return output;
    })();
}
//# sourceMappingURL=composite.js.map