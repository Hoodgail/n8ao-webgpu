import type { Node } from "three/webgpu";
import type { NeuralModelData } from "../core/neural.js";
type Scalar = Node<"float">;
interface AttentionState {
    maxima: Scalar[];
    denominators: Scalar[];
    summary: Scalar[][];
}
/** TSL inference for the quantized attention model. */
export declare function neuralKernel(model: NeuralModelData): {
    createState: () => AttentionState;
    tap: (state: AttentionState, raw: Scalar[]) => void;
    finish: (state: AttentionState, baseline: Scalar, radius: Scalar, falloff: Scalar) => Scalar;
};
export {};
//# sourceMappingURL=neural.d.ts.map