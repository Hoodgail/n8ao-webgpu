import type { N8AOConfiguration } from "../types.js";
/** CPU utilities for depth reconstruction, sampling and composition. */
export declare const clamp: (x: number, a?: number, b?: number) => number;
export declare const dot: (a: number[], b: number[]) => number;
export declare function perspectiveDepthToDistance(d: number, near: number, far: number): number;
export declare function orthographicDepthToDistance(d: number, near: number, far: number): number;
export declare function logarithmicDepthToDistance(d: number, far: number): number;
export declare function logarithmicToDeviceDepth(d: number, near: number, far: number): number;
export declare function multiplyMatrixVector(m: ArrayLike<number>, v: number[]): number[];
export declare function reconstructView(uv: number[], depth: number, inverseProjection: ArrayLike<number>, webgpu?: boolean): number[];
export declare function bilateralWeight(delta: number[], normal: number[], sampleNormal: number[], falloff: number, background?: boolean): number;
export declare function smoothstep(a: number, b: number, value: number): number;
export declare function compositePixel(scene: number[], visibility: number, c: N8AOConfiguration, uvX?: number, width?: number, fog?: number, transparency?: number): number[];
/** Convert bottom-left integer texel coordinates to top-left coordinates. */
export declare function legacyTexelToTopLeft(uv: number[], shaderResolution: number[], textureDimensions: number[]): number[];
/** Convert only the clip-Z row: [-w,+w] = 2*[0,+w] - w. X/Y/W are unchanged. */
export declare function gpuProjectionToLegacy(matrix: ArrayLike<number>): number[];
//# sourceMappingURL=math.d.ts.map