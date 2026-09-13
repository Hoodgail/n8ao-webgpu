import { float, Fn, mix, uv, vec4 } from "three/tsl";
export function accumulationFragment(U, T) {
    return Fn(() => {
        const coord = uv(), current = T.input.sample(coord), previous = T.previous.sample(coord);
        // Upstream alpha blending stores alpha=1, not normal.z. This quirk is intentional.
        return vec4(mix(previous.rgb, current.rgb, float(1).div(U.frame.add(1))), 1);
    })();
}
//# sourceMappingURL=accumulate.js.map