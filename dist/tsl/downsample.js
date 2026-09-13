import { Fn, If, max, min, mod, uv, vec2, vec4 } from "three/tsl";
import { legacyFragmentPixel } from "./common.js";
/** Two targets/passes avoid mixed-format MRT assumptions; both use exactly the same selection. */
export function downsampleFragment(U, T, G, writeNormal = false) {
    return Fn(() => {
        const coord = uv(), base = coord.add(vec2(-0.5, 0.5).div(U.fullResolution));
        const coordinates = [
            base,
            base.add(vec2(1, 0).div(U.fullResolution)),
            base.add(vec2(0, -1).div(U.fullResolution)),
            base.add(vec2(1, -1).div(U.fullResolution)),
        ];
        const values = coordinates.map((p) => T.fullDepth.sample(p).r.toVar());
        const low = min(min(values[0], values[1]), min(values[2], values[3]));
        const high = max(max(values[0], values[1]), max(values[2], values[3]));
        const pix = legacyFragmentPixel(U.targetResolution);
        const chosen = mod(pix.x.add(pix.y), 2)
            .greaterThan(0.5)
            .select(high, low)
            .toVar();
        const selectedUV = vec2(coordinates[0]).toVar();
        // Reverse assignment order makes the first equal sample win.
        for (let i = 3; i >= 0; i--)
            If(values[i].equal(chosen), () => {
                selectedUV.assign(coordinates[i]);
            });
        return writeNormal
            ? vec4(G.normal(T.fullDepth, selectedUV, U.fullResolution), 0)
            : vec4(chosen, 0, 0, 1);
    })();
}
//# sourceMappingURL=downsample.js.map