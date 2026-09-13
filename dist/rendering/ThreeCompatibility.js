import { clamp, passTexture } from "three/tsl";
/** r186 exposes these operations at runtime; its declarations narrow them further. */
export function sharedContext(builder) {
    return builder.getSharedContext();
}
export function outputTexture(owner, value) {
    return passTexture(owner, value);
}
export function matrixColumn(matrix, index) {
    return matrix.element(index);
}
export const clampPixel = clamp;
//# sourceMappingURL=ThreeCompatibility.js.map